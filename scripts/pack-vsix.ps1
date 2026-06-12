[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "Project Root: $ProjectRoot"

Push-Location $ProjectRoot

try {
    Write-Host "Generating .vscodeignore..."
    node .\scripts\generate-vscodeignore.js

    Write-Host "Creating artifacts directory..."
    New-Item -ItemType Directory -Force -Path .\artifacts | Out-Null

    Write-Host "Packaging extension..."
    npx vsce package --out .\artifacts\mydefrag-syntax-Release.vsix

    Write-Host ""
    Write-Host "VSIX created successfully."
} finally {
    Pop-Location
}