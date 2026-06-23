# ---------------------------------------------------------------------------
# Locate VSCodium executable
#
# Search in PATH first, then common installation locations.
# ---------------------------------------------------------------------------

$Cmd = Get-Command codium -ErrorAction SilentlyContinue

if ($Cmd) {
    $VsCodiumExe = $Cmd.Source
} else {
    # Search System
    $Candidates = @(
        "$env:ProgramFiles\VSCodium\VSCodium.exe",
        "${env:ProgramFiles(x86)}\VSCodium\VSCodium.exe",
        "$env:LOCALAPPDATA\Programs\VSCodium\VSCodium.exe"
    )
    ```
    $VsCodiumExe = $Candidates |
        Where-Object { Test-Path $_ } |
            Select-Object -First 1
    ```
}

if (-not $VsCodiumExe) {
    Write-Error "VSCodium.exe not found."
    Pause
    exit 1
}
Write-Host "VSCodium: $VsCodiumExe"
Write-Host

# ---------------------------------------------------------------------------
# Locate extension installation directory
#
# Portable installations use:
# .\data\extensions
#
# Standard installations use:
# %USERPROFILE%.vscode-oss\extensions
# ---------------------------------------------------------------------------
$PortablePath = Join-Path $PSScriptRoot "data\extensions"

if (Test-Path $PortablePath) {
    $ExtensionsPath = $PortablePath
} else {
    $ExtensionsPath = Join-Path $env:USERPROFILE ".vscode-oss\extensions"
}

Write-Host "Extensions: $ExtensionsPath"
Write-Host

# ---------------------------------------------------------------------------
# Extension information
# ---------------------------------------------------------------------------
$ExtensionFolder = "local.mydefrag-syntax-0.2.0"
$TargetPath = Join-Path $ExtensionsPath $ExtensionFolder

# Source root = parent of deployment script
$ParentDir = Split-Path $PSScriptRoot -Parent

# ---------------------------------------------------------------------------
# Create extension target directory
# ---------------------------------------------------------------------------
Write-Host "TargetPath      = [$TargetPath]"
Write-Host "ExtensionsPath  = [$ExtensionsPath]"
Write-Host "ExtensionFolder = [$ExtensionFolder]"
Write-Host "TargetPath      = [$TargetPath]"
New-Item -ItemType Directory `
    -Path $TargetPath `
    -Force | Out-Null

# ---------------------------------------------------------------------------
# Backup user settings
# ---------------------------------------------------------------------------
# settings.json
$SettingsFile = "$env:APPDATA\VSCodium\User\settings.json"
if (Test-Path $SettingsFile) {
    Copy-Item $SettingsFile `
        "$SettingsFile.bak" `
        -Force
}
# iniMap.ini
$IniMapFile = "$TargetPath\common\iniMap.ini"
if (Test-Path $IniMapFile) {
    Copy-Item $IniMapFile `
        "$IniMapFile.bak" `
        -Force
}
# mydefrag-syntax.ini
$ConfigurationFile = "$TargetPath\mydefrag-syntax.ini"
if (Test-Path $ConfigurationFile) {
    Copy-Item $ConfigurationFile `
        "$ConfigurationFile.bak" `
        -Force
}
# ---------------------------------------------------------------------------
# Copy extension files
#
# Exclude:
# Source control folders
# IDE folders
# Build artifacts
# Deployment scripts
# Temporary files
# ---------------------------------------------------------------------------
$ExcludeDirs = @(
    "doc",
    ".user",
    ".git",
    ".github",
    ".vscode",
    ".vs",
    ".idea",
    "node_modules",
    "dist",
    "out",
    "tmp",
    "temp"
)

$ExcludeFiles = @(
    "*.bat",
    "*.cmd",
    "*.bak",
    "*.tmp",
    "temp.txt",
    "package-lock.json"
)

foreach ($item in Get-ChildItem $ParentDir -Force) {

    if ($item.Name -in $ExcludeDirs) {
        continue
    }

    if ($ExcludeFiles.Where({ $item.Name -like $_ }).Count -gt 0) {
        continue
    }

    Copy-Item `
        $item.FullName `
        $TargetPath `
        -Recurse `
        -Force
}

# ---------------------------------------------------------------------------
# Update syntax highlighting colours
# ---------------------------------------------------------------------------
$settings = Get-Content $SettingsFile -Raw | ConvertFrom-Json

$settings."editor.tokenColorCustomizations" = @{
    textMateRules = @(
        @{
            scope = "constant.other.macro.mydfrg"
            settings = @{
                foreground = "#C2EDE7"
            }
        }
        @{
            scope = "variable.other.mydfrg"
            settings = @{
                foreground = "#4EC9B0"
            }
        }
    )
}

$json = $settings | ConvertTo-Json -Depth 10

# Write to disk
[System.IO.File]::WriteAllText(
    $SettingsFile,
    $json,
    [System.Text.UTF8Encoding]::new($false)
)

# ---------------------------------------------------------------------------

# Complete

# ---------------------------------------------------------------------------

Write-Host
Write-Host "Extension updated:"
Write-Host "  $TargetPath"
Write-Host
