<#
.SYNOPSIS
Builds the extension VSIX and optionally installs it into the editor extensions folder.

.DESCRIPTION
Runs dependency install and build, packages a .vsix using vsce, and (unless -SkipInstall)
extracts the VSIX into the target VSCodium/VS Code extensions directory. Suitable for local
use and CI (use -SkipInstall in CI to produce only the VSIX).

.PARAMETER Configuration
Build configuration label used in the output VSIX filename. Default: 'Release'.

.PARAMETER VsixOut
Path or filename to write the created .vsix. If empty, the script derives a name from package.json
(publisher/name-version-Configuration.vsix).

.PARAMETER ExtensionFolderName
Explicit extension folder name to use when installing (e.g., 'local.mydefrag-syntax-0.4.0').
If not provided, the script computes publisher.name-version from package.json.

.PARAMETER SkipInstall
When set, the script will only perform build and VSIX packaging and will NOT attempt to
install or extract the VSIX into a local editor extensions folder.

.EXAMPLE
.\scripts\build-and-deploy.ps1 -Configuration Debug -VsixOut .\artifacts\myext.vsix -SkipInstall
.\scripts\build-and-deploy.ps1 -Configuration Debug -VsixOut .\artifacts\mydefrag-syntax-0.4.0-Release.vsix
.\scripts\build-and-deploy.ps1 -Configuration Debug -VsixOut .\artifacts\mydefrag-syntax-0.4.0-Release.vsix -SkipInstall

Build a debug VSIX and place it in artifacts, but do not install locally.

#>

# build-and-deploy.ps1
# ---------------------------------------------------------------------------
# Then use an explicit param block with attribute hints:
param(
    [Parameter(Mandatory = $false)]
    [ValidateSet('Release', 'Debug')]
    [string]$Configuration = 'Release',

    [Parameter(Mandatory = $false)]
    [string]$VsixOut = '',

    [Parameter(Mandatory = $false)]
    [string]$ExtensionFolderName = '',

    [Parameter(Mandatory = $false)]
    [switch]$SkipInstall
)
# This provides Get-Help support, tab-completion metadata, and clearer documentation for users.

# ---------------------------------------------------------------------------
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
# at top of script (adjust path)
if (-not (Get-Variable -Name projectRootPath -Scope Global -ErrorAction SilentlyContinue)) {
    $global:projectRootPath = (Split-Path -Path $MyInvocation.MyCommand.Path -Parent)
}
$projRoot = if ($global:projectRootPath) { $global:projectRootPath } 
else { (Split-Path -Path $MyInvocation.MyCommand.Path -Parent) }
$global:developerMode = Test-Path -Path (Join-Path $projRoot 'IsDevMode')

# build-and-deploy.ps1
#   runs npm install and npm run build (if present),
#   packages a .vsix with vsce,
#   extracts the extension into your VsCodium extensions folder (replacing your existing MyDefragUpdateLive.ps1 copy steps),
#   preserves your current backup behavior,
#   has basic error handling and configurable parameters.
# Run from the repo root.
# ---------------------------------------------------------------------------
# Helpers
function Ensure-Command($cmd, $installHint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Throw "build-and-deploy: Required command '$cmd' not found. $installHint"
    }
}
# Ensure Node & npm
Ensure-Command node "build-and-deploy: Install Node.js from https://nodejs.org/"
Ensure-Command npm "build-and-deploy: Install npm (comes with Node.js) or use yarn"

# ---------------------------------------------------------------------------
# Set location
Push-Location (Split-Path -Path $MyInvocation.MyCommand.Path -Parent) | Out-Null
# Move to repo root (assumes script in scripts\)
Set-Location (Join-Path (Get-Location) '..') 

# Ensure vsce (packager). Prefer global, otherwise use local dev dependency
$VsceCmd = $null
if (Get-Command vsce -ErrorAction SilentlyContinue) {
    $VsceCmd = (Get-Command vsce).Source
} else {
    if (-not (Test-Path "node_modules\.bin\vsce")) {
        Write-Host "Installing @vscode/vsce locally..."
        npm install --no-audit --no-fund @vscode/vsce --save-dev
    }
    $VsceCmd = Join-Path (Get-Location) "node_modules\.bin\vsce"
}

# ---------------------------------------------------------------------------
# Install deps & build (if scripts exist)
if (-not $SkipInstall) {
    $pkg = $null
    if (Test-Path package.json) {
        Write-Host "Running npm install..."
        npm install
        try {
            $pkg = Get-Content package.json -Raw | ConvertFrom-Json
        } catch {
            Write-Warning "Failed to parse package.json: $($_.Exception.Message)"
            $pkg = $null
        }
        if ($pkg -and $pkg.PSObject.Properties.Name -contains 'scripts' -and $pkg.scripts.build) {
            Write-Host "Running npm run build..."
            npm run build
        } else {
            Write-Host "No build script found in package.json; skipping npm run build."
        }
    } else {
        Write-Warning "package.json not found; skipping npm steps."
    }
}

# ---------------------------------------------------------------------------
# Determine vsix output name
if (-not $VsixOut) {
    if (Test-Path package.json) {
        $pkg = Get-Content package.json -Raw | ConvertFrom-Json
        $name = ($pkg.name -replace '[^a-zA-Z0-9_.-]', '')
        $ver = ($pkg.version -replace '[^0-9a-zA-Z+.-]', '')
        $VsixOut = "$name-$ver-$Configuration.vsix"
    } else {
        $VsixOut = "extension-$Configuration.vsix"
    }
}

# ---------------------------------------------------------------------------
# Create vsix
Write-Host "Packaging VSIX -> $($VsixOut)"
try {
    # Determine executable and arguments
    $vsceCmd = Resolve-Path 'node_modules\.bin\vsce.cmd' -ErrorAction SilentlyContinue
    if ($vsceCmd) {
        $exe = $vsceCmd.Path
        $exeArgs = @('package', '--out', $VsixOut)
    } else {
        # fallback to running the script with node (rare)
        $node = (Get-Command node -ErrorAction Stop).Source
        $vsceScript = Resolve-Path 'node_modules\.bin\vsce'  # this is a shell script; donC:\Users\david\.vscode-oss\extensions't pass to node
        $exe = $node
        $exeArgs = @($vsceScript.Path, 'package', '--out', $VsixOut)
    }

    # Start and wait, capture exit code
    $proc = Start-Process -FilePath $exe -ArgumentList $exeArgs -NoNewWindow -PassThru -Wait
    if ($null -eq $proc) {
        Throw "build-and-deploy: Failed to start process for packaging VSIX."
    }

    if ($proc.ExitCode -ne 0) {
        Throw "build-and-deploy: vsce package failed (exit $($proc.ExitCode))."
    }

    # If user requested only build, finish here
    if ($SkipInstall) {
        Write-Host "Build complete. VSIX at: $VsixOut"
        Pop-Location | Out-Null
        return
    }
} catch {
    $errResult = $_
    $message = "build-and-deploy: Unexpected error building vsix file: $($errResult.Exception.Message)"
    Write-Error $message
    throw $message
}

# ---------------------------------------------------------------------------
# Installation: extract VSIX to VSCodium/VS Code extensions directory
# ---------------------------------------------------------------------------
# Locate VSCodium (reuse logic from your script)
$Cmd = Get-Command codium -ErrorAction SilentlyContinue
if ($Cmd) { $VsCodiumExe = $Cmd.Source } else {
    $Candidates = @(
        "$env:ProgramFiles\VSCodium\VSCodium.exe",
        "${env:ProgramFiles(x86)}\VSCodium\VSCodium.exe",
        "$env:LOCALAPPDATA\Programs\VSCodium\VSCodium.exe"
    )
    $VsCodiumExe = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $VsCodiumExe) {
    Write-Warning "VSCodium executable not found. Falling back to VS Code extensions path."
}

# Determine extensions path (portable vs user)
$PortablePath = Join-Path $PSScriptRoot "data\extensions"
if (Test-Path $PortablePath) {
    $ExtensionsPath = $PortablePath
} else {
    $ExtensionsPath = Join-Path $env:USERPROFILE ".vscode-oss\extensions"
}
Write-Host "Extensions path: $ExtensionsPath"

# Determine extension folder name
if (-not $ExtensionFolderName) {
    # try to compute from package.json: publisher.name-version
    if (Test-Path package.json) {
        $pkg = Get-Content package.json -Raw | ConvertFrom-Json
        $publisher = if ($pkg.publisher) { $pkg.publisher } else { 'local' }
        $ExtensionFolderName = "$publisher.$($pkg.name)-$($pkg.version)"
    } else {
        # fallback
        $ExtensionFolderName = "local.mydefrag-syntax-$Configuration"
    }
}

# ---------------------------------------------------------------------------
$TargetPath = Join-Path $ExtensionsPath $ExtensionFolderName

# Backup existing user config files (same as your script)
$SettingsFile = "$env:APPDATA\VSCodium\User\settings.json"
if (Test-Path $SettingsFile) { Copy-Item $SettingsFile "$SettingsFile.bak" -Force }

# Backup extension-specific files
$IniMapFile = Join-Path $TargetPath "common\iniMap.ini"
if (Test-Path $IniMapFile) { Copy-Item $IniMapFile "$IniMapFile.bak" -Force }
$ConfigurationFile = Join-Path $TargetPath "mydefrag-syntax.ini"
if (Test-Path $ConfigurationFile) { Copy-Item $ConfigurationFile "$ConfigurationFile.bak" -Force }

# Remove target dir then recreate
if (Test-Path $TargetPath) {
    Write-Host "Removing existing extension folder: $TargetPath"
    Remove-Item $TargetPath -Recurse -Force
}
New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null

# ---------------------------------------------------------------------------
# Extract VSIX (which is just a ZIP)
Write-Host "Extracting VSIX into: $TargetPath"
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory((Resolve-Path $VsixOut).Path, $TargetPath)

# Post-install: restore user settings backup already created (script can leave as-is)
Write-Host "Extension installed to: $TargetPath"
Pop-Location | Out-Null
