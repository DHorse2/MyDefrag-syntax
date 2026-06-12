[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path $PSScriptRoot -Parent

Push-Location $ProjectRoot

try {

    if (-not $env:OVSX_PAT) {
        throw "Environment variable OVSX_PAT is not set."
    }

    $Vsix = Get-ChildItem .\artifacts\*.vsix |
        Sort-Object LastWriteTime -Descending |
            Select-Object -First 1

    if (-not $Vsix) {
        throw "No VSIX file found in artifacts."
    }

    Write-Host "Publishing $($Vsix.Name)..."

    npx ovsx publish $Vsix.FullName -p $env:OVSX_PAT

    Write-Host ""
    Write-Host "Publish completed."
} finally {
    Pop-Location
}
