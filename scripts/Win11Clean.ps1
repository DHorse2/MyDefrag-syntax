# Win11Clean.ps1 - Windows 11 maintenance script
# Run an elevated PowerShell (Run as Administrator).
# This script:
# - Backs up and removes NVIDIA ota-artifacts (safe-to-remove cache/install files)
# - Cleans Visual Studio ProgramData\VisualStudio\Packages contents
# - Attempts a repair of Visual Studio instances
# - Analyzes and performs conservative WinSxS cleanup and runs Disk Cleanup
# Keep comments. Progress output is shown for each major step.

# Fail fast for unexpected errors, but handle known non-fatal operations
$ErrorActionPreference = 'Stop'

# -------------------------------
# Configuration / paths
# -------------------------------
# Source for NVIDIA ota-artifacts (variants may exist)
$src = 'C:\ProgramData\NVIDIA Corporation\Downloader\ota-artifacts'
# Where to store backups on D: (will create timestamped subfolder)
$backupRoot = 'D:\Backup\ota-artifacts-backup'
$timestamp = (Get-Date).ToString('yyyyMMdd_HHmmss')
$backup = Join-Path $backupRoot $timestamp

# Visual Studio packages path
$vsPkg = 'C:\ProgramData\VisualStudio\Packages'

# vswhere path (used to find VS instances)
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'

# -------------------------------
# Logging: transcript to file (minimal additions)
# -------------------------------
$logDir = Join-Path $backupRoot 'logs'
New-Item -Path $logDir -ItemType Directory -Force | Out-Null
$logFile = Join-Path $logDir ("Win11Clean_{0}.log" -f $timestamp)

# Start transcript to capture all console output (stdout/stderr)
Start-Transcript -Path $logFile -Force

# -------------------------------
# Helper: Write progress header
# -------------------------------
function Write-Step {
    param([string]$Text)
    $line = ('-' * 80)
    Write-Host $line -ForegroundColor DarkGray
    Write-Host $Text -ForegroundColor Cyan
    Write-Host $line -ForegroundColor DarkGray
}

# -------------------------------
# NVIDIA ota-artifacts: backup then delete (safe, reversible)
# -------------------------------
# NVIDIA App foler in programData had 8GB of ota-artifacts. 
# Safe to remove if they’re old cache/install files; Visual Studio keeps package caches under ProgramData\VisualStudio\Packages which can grow large. Recommended safe steps:
Write-Step "Step: NVIDIA ota-artifacts backup and removal"

# Ensure source exists
if (-not (Test-Path $src)) {
    Write-Host "Source not found: $src" -ForegroundColor Yellow
} else {
    Write-Host "Source found: $src" -ForegroundColor Green
    Write-Host "Creating backup destination: $backup" -ForegroundColor Cyan
    New-Item -Path $backup -ItemType Directory -Force | Out-Null

    # Stop common NVIDIA services that may lock files (best-effort; ignore failures)
    Write-Host "Stopping common NVIDIA services (best-effort)..." -ForegroundColor Cyan
    $svcNames = 'NvContainerLocalSystem', 'NvContainerNetworkService', 'NvidiaTelemetryContainer', 'NvContainer'
    foreach ($s in $svcNames) {
        Try {
            $svc = Get-Service -Name $s -ErrorAction SilentlyContinue
            if ($svc -and $svc.Status -ne 'Stopped') {
                # -------------------------------
                # Stop Service
                Write-Host "Stopping service: $s" -ForegroundColor Gray
                Stop-Service -Name $s -Force -ErrorAction SilentlyContinue
            }
        } Catch { }
    }

    # -------------------------------
    # Use Robocopy for robust copy/preserve attributes/retries
    Write-Host "Copying (robocopy)..." -ForegroundColor Cyan
    $robocopyLog = Join-Path $backup 'robocopy.log'
    $srcQuoted = $src
    $backupQuoted = $backup
    $roboArgs = @($srcQuoted, $backupQuoted, '/E', '/COPYALL', '/R:3', '/W:5', '/V', '/NFL', '/NDL', '/NP', '/LOG:' + $robocopyLog)
    # robocopy writes its own log; still show output to console and transcript
    & robocopy @roboArgs | ForEach-Object { Write-Host $_ }

    # Verify backup size > 0 and roughly matches source
    Write-Host "Verifying backup sizes..." -ForegroundColor Cyan
    $srcSize = (Get-ChildItem -Path $src -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $backupSize = (Get-ChildItem -Path $backup -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum

    Write-Host ("Source size: {0:N2} MB" -f ($srcSize / 1MB)) -ForegroundColor Gray
    Write-Host ("Backup size: {0:N2} MB" -f ($backupSize / 1MB)) -ForegroundColor Gray

    if ($backupSize -gt 0 -and $backupSize -ge ($srcSize * 0.9)) {
        Write-Host "Backup looks good. Proceeding to delete source..." -ForegroundColor Green
        Try {
            # -------------------------------
            # Use LiteralPath to avoid accidental wildcard expansion; remove folder entirely
            Remove-Item -LiteralPath $src -Recurse -Force -ErrorAction Stop
            Write-Host "Deleted source: $src" -ForegroundColor Green
        } Catch {
            Write-Warning "Failed to delete $(src): $($_.Exception.Message)"
            Write-Host "If files are in use, reboot to Safe Mode and remove manually." -ForegroundColor Yellow
        }
    } else {
        Write-Warning "Backup verification failed (source: $srcSize bytes, backup: $backupSize bytes). Source not deleted."
        Write-Host "Check robocopy log at $robocopyLog for details." -ForegroundColor Yellow
    }
}

# -------------------------------
# Visual Studio: clear Packages contents
# -------------------------------
Write-Step "Step: Clear contents of ProgramData\VisualStudio\Packages"

if (-not (Test-Path $vsPkg)) {
    Write-Host "Visual Studio packages path not found: $vsPkg" -ForegroundColor Yellow
} else {
    Write-Host "Stopping Visual Studio processes (devenv)..." -ForegroundColor Cyan
    Stop-Process -Name devenv -ErrorAction SilentlyContinue

    Write-Host "Taking ownership and granting Administrators full control (takeown/icacls)..." -ForegroundColor Cyan
    cmd.exe /c "takeown /F `"$vsPkg`" /R /D Y" | Out-Null
    cmd.exe /c "icacls `"$vsPkg`" /grant Administrators:F /T" | Out-Null

    Write-Host "Removing contents of $vsPkg but preserving the root folder..." -ForegroundColor Cyan
    # -------------------------------
    # Enumerate children and delete each to avoid removing the parent folder
    $children = Get-ChildItem -LiteralPath $vsPkg -Force -ErrorAction SilentlyContinue
    if (-not $children) {
        Write-Host "No items found in $vsPkg" -ForegroundColor Yellow
    } else {
        $count = $children.Count
        $i = 0
        foreach ($child in $children) {
            $i++
            Write-Progress -Activity "Removing VisualStudio Packages" -Status "Removing $($child.Name) ($i of $count)" -PercentComplete ([int](($i / $count) * 100))
            Try {
                # -------------------------------
                # Remove Package Item
                Remove-Item -LiteralPath $child.FullName -Recurse -Force -ErrorAction Stop
                Write-Host "Removed: $($child.FullName)" -ForegroundColor Gray
            } Catch {
                Write-Warning "Could not remove $($child.FullName): $($_.Exception.Message)"
            }
        }
        Write-Progress -Activity "Removing VisualStudio Packages" -Completed
        Write-Host "Finished clearing contents of $vsPkg" -ForegroundColor Green
    }
}

# -------------------------------
# Visual Studio: repair installed instances (vswhere + vs_installer)
# -------------------------------
Write-Step "Step: Repair Visual Studio instances (vswhere)"

if (-not (Test-Path $vswhere)) {
    Write-Warning "vswhere not found at $vswhere; open Visual Studio Installer manually to repair if needed."
} else {
    Write-Host "Enumerating Visual Studio instances via vswhere..." -ForegroundColor Cyan
    $instancesJson = & $vswhere -all -products * -format json 2>$null
    if (-not $instancesJson) {
        Write-Host "No Visual Studio instances found." -ForegroundColor Yellow
    } else {
        $instances = $instancesJson | ConvertFrom-Json
        $total = $instances.Count
        $index = 0
        foreach ($inst in $instances) {
            $index++
            $display = $inst.displayName
            $instanceId = $inst.instanceId
            Write-Progress -Activity "Repairing Visual Studio" -Status "$display ($index of $total)" -PercentComplete ([int](($index / $total) * 100))
            Write-Host "Repairing instance: $display ($instanceId)" -ForegroundColor Cyan
            # -------------------------------
            # Locate installer executable for this instance, fallback to global installer
            $installerPath = Join-Path $inst.installationPath 'Installer\vs_installer.exe'
            if (-not (Test-Path $installerPath)) {
                $installerPath = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vs_installer.exe'
            }

            if (Test-Path $installerPath) {
                Write-Host "Running repair (passive) via: $installerPath" -ForegroundColor Gray
                # -------------------------------
                # Run Visual Studio Repair Step
                # Use passive (non-interactive). Output is captured and shown.
                # Also write the output to a per-instance log file for easier review
                $vsLog = Join-Path $logDir ("vs_repair_{0}.log" -f $instanceId)
                & $installerPath repair --passive --installPath $inst.installationPath 2>&1 | Tee-Object -FilePath $vsLog | ForEach-Object { Write-Host $_ }
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning "Repair command returned exit code $LASTEXITCODE for instance $instanceId"
                } else {
                    Write-Host "Repair completed for $display" -ForegroundColor Green
                }
            } else {
                Write-Warning "Installer executable not found for instance $instanceId"
            }
        }
        Write-Progress -Activity "Repairing Visual Studio" -Completed
    }
}

# -------------------------------
# WinSxS: analyze and cleanup (safe)
# -------------------------------
Write-Step "Step: WinSxS component store analysis and cleanup"

Write-Host "Analyzing component store (DISM)..." -ForegroundColor Cyan
# This shows current size and reclaimable size
DISM.exe /Online /Cleanup-Image /AnalyzeComponentStore

Write-Host "Running conservative component store cleanup (StartComponentCleanup)..." -ForegroundColor Cyan
# Conservative cleanup: removes superseded component versions but keeps uninstall ability for updates
DISM.exe /Online /Cleanup-Image /StartComponentCleanup

# Optional aggressive cleanup (uncomment to run). This removes ability to uninstall superseded updates (irreversible).
# Write-Host "Running aggressive cleanup (ResetBase) - IRREVERSIBLE ..." -ForegroundColor Yellow
# DISM.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase
Write-Host "Running legacy Disk Cleanup (cleanmgr) with previously configured options..." -ForegroundColor Cyan
# If you haven't configured sageset, you can run cleanmgr.exe /sageset:1 first and then sagerun.
cleanmgr.exe /sagerun:1

Write-Step "Completed: Win11 maintenance script"
Write-Host "Review output above for any warnings or errors." -ForegroundColor Green

# Stop transcript and flush log
Stop-Transcript
