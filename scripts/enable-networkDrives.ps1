<#
.SYNOPSIS
  Enable-NetworkDrives.ps1 — Ensure mapped network drives are visible to both elevated and non-elevated sessions and optionally (re)map specified drives.

.DESCRIPTION
  This script performs three main tasks:
    1) Reconnects persistent mapped drives found under HKCU:\Network (and via Win32_NetworkConnection) using net use so they are visible to the current session (including elevated processes).
    2) Installs a one-time scheduled task (runs at each logon) that reconnects persistent drives at user logon with highest privileges to address the elevated/non-elevated drive isolation on Windows.
    3) Optionally remaps drives from the $Mappings array when -RemapMissing is supplied.

  Important notes:
    - Run this script as the interactive user (not elevated) to register the scheduled task for your account.
    - The script uses "net use" to create mappings because net use mappings are visible across privilege boundaries when created this way.
    - Do not store plaintext passwords in $Mappings. Leave Password empty to use current credentials or be prompted.
    - This script does not modify system-wide registry keys; it operates in the current user's context and creates a scheduled task registered to your user account.
    - ExecutionPolicy may prevent running; use: powershell -ExecutionPolicy Bypass -File .\Enable-NetworkDrives.ps1

.PARAMETER RemapMissing
  If set, remaps drives defined in the $Mappings array when they are missing.

.PARAMETER TaskName
  Name for the scheduled task created to restore drives at logon. Default: "DDG_RestoreNetDrives"

.EXAMPLE
  # Reconnect persistent drives and create scheduled task (default)
  powershell -ExecutionPolicy Bypass -File .\Enable-NetworkDrives.ps1

  # Additionally remap drives listed in the $Mappings array
  powershell -ExecutionPolicy Bypass -File .\Enable-NetworkDrives.ps1 -RemapMissing

.LINK
  No external links included.

#>
# ```powershell

<#
  ============================
  Configuration section
  ============================
  Edit the $Mappings array below to add drives you want the script to (re)map when -RemapMissing is used.
  Each mapping is a hashtable with:
    - Drive    : e.g. 'Z:'
    - Path     : UNC path e.g. '\\server\share'
    - User     : optional 'DOMAIN\User' or 'server\user' (leave '' to use current credentials)
    - Password : optional plain password (NOT recommended). Leave '' to prompt or use current credentials.
#>
param(
    [switch]$RemapMissing,                               # If set, remap any drives listed in $Mappings that are missing
    [string]$TaskName = "DDG_RestoreNetDrives"           # Scheduled task name (runs at logon, elevated)
)

# Default mappings — edit as needed. Leave Password empty for safety.
$Mappings = @(
    @{ Drive = 'Z:'; Path = '\\fileserver\shared'; User = ''; Password = '' }
)

# -----------------------
# Helper: Get-PersistentMappedDrives
# -----------------------
# Reads persistent mapped drives from:
#  - HKCU:\Network (standard Windows persistent mappings)
#  - Win32_NetworkConnection (WMI query for existing connections)
# Returns array of objects: @{ Drive = 'Z:'; RemotePath = '\\server\share' }
function Get-PersistentMappedDrives {
    $netKey = 'HKCU:\Network'
    $drives = @()

    # Read the HKCU\Network registry keys (persistent mappings created by Explorer/net use)
    if (Test-Path $netKey) {
        Get-ChildItem $netKey | ForEach-Object {
            $d = $_.PSChildName + ':'
            try {
                # RemotePath value holds the UNC path
                $remotePath = (Get-ItemProperty -Path $_.PSPath -Name RemotePath -ErrorAction Stop).RemotePath
            } catch {
                $remotePath = $null
            }
            $drives += [PSCustomObject]@{ Drive = $d; RemotePath = $remotePath }
        }
    }

    # Also query WMI for active network connections (may catch mappings created differently)
    try {
        Get-WmiObject -Class Win32_NetworkConnection -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.LocalName -and $_.RemoteName) {
                $drives += [PSCustomObject]@{ Drive = $_.LocalName; RemotePath = $_.RemoteName }
            }
        }
    } catch {
        # Non-fatal: ignore WMI errors
    }

    return ($drives | Sort-Object Drive -Unique)
}

# -----------------------
# Helper: Restore-DriveVisibilityForElevated
# -----------------------
# Creates a scheduled task that runs at each user logon with highest privileges.
# The task executes a small PowerShell script located in %TEMP%\ddg_netrestore\restore_net_drives.ps1
# That script enumerates HKCU:\Network and runs "net use" for each mapping to ensure elevated processes see the drives.
function Restore-DriveVisibilityForElevated {
    # Determine current interactive user account name (e.g., DOMAIN\User or MACHINE\User)
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name

    # Prefer pwsh.exe if available; otherwise fall back to powershell.exe
    $psPath = (Get-Command pwsh.exe -ErrorAction SilentlyContinue).Source
    if (-not $psPath) { $psPath = (Get-Command powershell.exe -ErrorAction SilentlyContinue).Source }

    # Build the inline script that the scheduled task will run at logon.
    # Keep it small and robust: sleep briefly to let network services start, then call net use for each stored mapping.
    $scriptContent = @'
# restore_net_drives.ps1 - temporary script created by Enable-NetworkDrives.ps1
# Sleep briefly to allow network stack and credential providers to initialize
Start-Sleep -Seconds 3

$netKey = "HKCU:\Network"
if (Test-Path $netKey) {
    Get-ChildItem $netKey | ForEach-Object {
        $drive = $_.PSChildName + ":"
        try {
            $remote = (Get-ItemProperty -Path $_.PSPath -Name RemotePath -ErrorAction Stop).RemotePath
            if ($remote) {
                # Use cmd /c net use so the mapping is created in a way visible to elevated processes
                cmd /c "net use $drive `"$remote`" /persistent:yes" | Out-Null
            }
        } catch {}
    }
}
'@

    # Write temporary script to a folder in %TEMP%
    $tmpDir = Join-Path $env:TEMP "ddg_netrestore"
    New-Item -Path $tmpDir -ItemType Directory -Force | Out-Null
    $tmpScript = Join-Path $tmpDir "restore_net_drives.ps1"
    $scriptContent | Out-File -FilePath $tmpScript -Encoding UTF8 -Force

    # Build scheduled task components
    try {
        $action = New-ScheduledTaskAction -Execute $psPath -Argument "-NoProfile -WindowStyle Hidden -File `"$tmpScript`""
        $trigger = New-ScheduledTaskTrigger -AtLogOn
        $principal = New-ScheduledTaskPrincipal -UserId $currentUser -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -AllowStartIfOnBatteries

        $task = New-ScheduledTask -Action $action -Trigger $trigger -Principal $principal -Settings $settings

        # Register the scheduled task under the provided TaskName (overwrites existing)
        Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force -ErrorAction Stop

        Write-Output "Scheduled task '$TaskName' registered to restore drives at logon."
    } catch {
        Write-Warning "Failed to register scheduled task '$TaskName': $_"
    }
}

# -----------------------
# Helper: Reconnect-PersistentDrives
# -----------------------
# Enumerates persistent mappings and uses "net use" to reconnect any mapping not currently accessible.
# Using "net use" helps ensure mappings are visible to both elevated and non-elevated processes.
function Reconnect-PersistentDrives {
    $drives = Get-PersistentMappedDrives
    foreach ($d in $drives) {
        # Test-Path on drive root checks whether the mapping is currently accessible
        if ($d.RemotePath -and -not (Test-Path ($d.Drive + "\"))) {
            Write-Output "Reconnecting $($d.Drive) -> $($d.RemotePath)"
            # Use cmd /c to run net use; Out-Null to suppress output
            cmd /c "net use $($d.Drive) `"$($d.RemotePath)`" /persistent:yes" | Out-Null
        }
    }
}

# -----------------------
# Helper: Remap-FromList
# -----------------------
# Remaps drives defined in the $Mappings array when they are missing.
# Supports optional credentials. For security, prefer leaving Password empty.
function Remap-FromList {
    param($list)
    foreach ($m in $list) {
        $drive = $m.Drive
        $path = $m.Path
        $user = $m.User
        $pwd  = $m.Password

        # Skip invalid entries
        if (-not $drive -or -not $path) {
            Write-Warning "Invalid mapping entry: Drive or Path missing."
            continue
        }

        # If drive letter is already present and accessible, skip
        if (Test-Path ($drive + "\")) {
            Write-Output "$drive already exists and is accessible."
            continue
        }

        Write-Output "Mapping $drive -> $path"

        if ($user -and $pwd) {
            # Credentials supplied (insecure if plaintext). Use net use with provided creds.
            cmd /c "net use $drive `"$path`" /user:`"$user`" `"$pwd`" /persistent:yes" | Out-Null
        } elseif ($user -and -not $pwd) {
            # Username supplied but no password — prompt securely
            $secure = Read-Host -AsSecureString "Password for $user"
            $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
            cmd /c "net use $drive `"$path`" /user:`"$user`" `"$plain`" /persistent:yes" | Out-Null
            # Zero-out plaintext variable for minimal safety
            $plain = $null
        } else {
            # No credentials provided — use current logged-in credentials
            cmd /c "net use $drive `"$path`" /persistent:yes" | Out-Null
        }
    }
}

# -----------------------
# Main script flow
# -----------------------
# 1) Reconnect persistent drives so current session (and elevated processes) can see them
Reconnect-PersistentDrives

# 2) Create a scheduled task that will reconnect drives at logon with highest privileges
Restore-DriveVisibilityForElevated

# 3) Optionally remap drives from $Mappings if -RemapMissing was specified
if ($RemapMissing) {
    Remap-FromList -list $Mappings
}

Write-Output "Enable-NetworkDrives script completed."
# ```
# Ensures the Explorer network provider is available for elevated sessions
#       (creates a scheduled task that runs once at logon to restore drive mappings for elevated processes).
# Reimports existing persistent mapped drives so cmd/PowerShell sees them.
# Optionally remaps drives from a provided list.
#
