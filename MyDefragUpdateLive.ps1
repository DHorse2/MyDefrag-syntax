# Locate VSCodium executable
# ------------------------------------------------------

$Cmd = Get-Command codium -ErrorAction SilentlyContinue

if ($Cmd) {
    $VsCodiumExe = $Cmd.Source
}
else {
    $Candidates = @(
        "$env:ProgramFiles\VSCodium\VSCodium.exe",
        "${env:ProgramFiles(x86)}\VSCodium\VSCodium.exe",
        "$env:LOCALAPPDATA\Programs\VSCodium\VSCodium.exe"
    )

    $VsCodiumExe = $Candidates |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1
}

if (-not $VsCodiumExe) {
    Write-Error "VSCodium.exe not found."
    Pause
    exit 1
}

Write-Host "VSCodium: $VsCodiumExe"
Write-Host

# ------------------------------------------------------
# Locate extensions folder
# ------------------------------------------------------

$PortablePath = Join-Path $PSScriptRoot "data\extensions"

if (Test-Path $PortablePath) {
    $ExtensionsPath = $PortablePath
}
else {
    $ExtensionsPath = Join-Path $env:USERPROFILE ".vscode-oss\extensions"
}

Write-Host "Extensions: $ExtensionsPath"
Write-Host

Copy-Item "$env:APPDATA\VSCodium\User\settings.json" "$env:APPDATA\VSCodium\User\settings.json.bak" -Force
New-Item -ItemType Directory -Path "$ExtensionsPath\local.mydc-syntax-0.1.0" -Force | Out-Null
# Copy-Item -Path "$PSScriptRoot\*" -Destination "$ExtensionsPath\local.mydc-syntax-0.1.0" -Recurse -Force
Copy-Item -Path "$PSScriptRoot\*" -Destination "$ExtensionsPath\local.mydc-syntax-0.1.0" -Recurse -Force -Exclude "Preferences Open User Settings (JSON)", "*.ps1", "*.bat", "temp.txt"

# Read, parse, update, write back
$settings = Get-Content "$env:APPDATA\VSCodium\User\settings.json" -Raw | ConvertFrom-Json
$settings | Add-Member -Force -NotePropertyName "editor.tokenColorCustomizations" -NotePropertyValue @{
    textMateRules = @(
        @{ scope = "constant.other.macro.mydc"; settings = @{ foreground = "#C2EDE7" } },
        @{ scope = "variable.other.mydc"; settings = @{ foreground = "#4EC9B0" } }
    )
}

$json = $settings | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText("$env:APPDATA\VSCodium\User\settings.json", $json, [System.Text.UTF8Encoding]::new($false))

Write-Host
Write-Host "Extensions: mydc-syntax (local.mydc-syntax-0.1.0) updated to $ExtensionsPath"
Write-Host