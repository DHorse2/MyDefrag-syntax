# ---------------------------------------------------------------------------
# Remove stale extension registry entry
# ---------------------------------------------------------------------------
function Remove-ExtensionFromExtensionsJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ExtensionId,

        [Parameter(Mandatory = $false)]
        [string]$ExtensionsJsonPath = (Join-Path $env:USERPROFILE ".vscode-oss\extensions\extensions.json")
    )

    Write-Host "STEP: Removing stale extension registry entry..."
    Write-Host "  Extension ID: $ExtensionId"
    Write-Host "  Registry:     $ExtensionsJsonPath"

    if (-not (Test-Path $ExtensionsJsonPath)) {
        Write-Host "  extensions.json not found. Skipping."
        return
    }

    Copy-Item $ExtensionsJsonPath "$ExtensionsJsonPath.bak" -Force

    $items = Get-Content $ExtensionsJsonPath -Raw | ConvertFrom-Json

    $filtered = @(
        $items | Where-Object {
            $_.identifier.id -ne $ExtensionId
        }
    )

    $filtered |
    ConvertTo-Json -Depth 20 |
    Set-Content $ExtensionsJsonPath -Encoding UTF8

    Write-Host "  Removed stale registry entries."
}

# ---------------------------------------------------------------------------
# Locate VSCodium.
# ---------------------------------------------------------------------------

Write-Host
Write-Host "STEP 1: Locating VSCodium..."

$Cmd = Get-Command codium -ErrorAction SilentlyContinue

if ($Cmd) {

    $VsCodiumExe = $Cmd.Source
    Write-Host "  Found on PATH."

}
else {

    Write-Host "  Searching common installation folders..."

    $Candidates = @(
        "$env:ProgramFiles\VSCodium\bin\codium.cmd",
        "$env:ProgramFiles\VSCodium\VSCodium.exe",
        "${env:ProgramFiles(x86)}\VSCodium\VSCodium.exe",
        "$env:LOCALAPPDATA\Programs\VSCodium\VSCodium.exe"
    )

    $VsCodiumExe = $Candidates |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1
}

if (-not $VsCodiumExe) {
    throw "Unable to locate VSCodium."
}

Write-Host "  Using:"
Write-Host "    $VsCodiumExe"

# ---------------------------------------------------------------------------
# Remove previously installed versions of this extension.
# ---------------------------------------------------------------------------

Write-Host
Write-Host "STEP 2: Removing previously installed versions..."

$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$ExtensionId = "$($pkg.publisher).$($pkg.name)"
$ExtensionsDir = Join-Path $env:USERPROFILE ".vscode-oss\extensions"

Get-ChildItem $ExtensionsDir -Directory -ErrorAction SilentlyContinue |
Where-Object { $_.Name -like "$ExtensionId-*" } |
ForEach-Object {
    Write-Host "  Checking $($_.Name)..."

    try {
        Remove-Item $_.FullName -Recurse -Force
        Write-Host "    Removed."
    }
    catch {
        Write-Warning "    Folder is locked."
    }
}

Write-Host "STEP 3: Removing stale versions..."
Remove-ExtensionFromExtensionsJson -ExtensionId $ExtensionId

Write-Host
Write-Host "STEP 4: Restarting VSCodium extension host..."
& $VsCodiumExe --command workbench.action.restartExtensionHost
Write-Host "  Restart extension host command sent."
    
# ---------------------------------------------------------------------------
# Package the extension.
# ---------------------------------------------------------------------------

Write-Host
Write-Host "STEP 5: Packaging VSIX..."

$VsixOut = Join-Path (Get-Location) "artifacts\$($pkg.name)-$($pkg.version).vsix"

New-Item `
    -ItemType Directory `
    -Path (Split-Path $VsixOut) `
    -Force | Out-Null

npx @vscode/vsce package --out $VsixOut

if ($LASTEXITCODE -ne 0) {
    throw "VSCE packaging failed."
}

Write-Host "  Package created:"
Write-Host "    $VsixOut"

# ---------------------------------------------------------------------------
# Install the VSIX.
# ---------------------------------------------------------------------------

Write-Host
Write-Host "STEP 6: Installing extension..."

$ResolvedVsix = (Resolve-Path $VsixOut).Path

Write-Host "  VSIX:"
Write-Host "    $ResolvedVsix"

& $VsCodiumExe --install-extension $ResolvedVsix --force

if ($LASTEXITCODE -ne 0) {

    Write-Warning ""
    Write-Warning "Installation failed."
    Write-Warning ""
    Write-Warning "The VSIX was created successfully."
    Write-Warning "The installed extension is currently in use."
    Write-Warning ""
    Write-Warning "Restart VSCodium and rerun this script."
    Write-Warning ""

    return
}

Write-Host
Write-Host "STEP 7: Deployment complete."
Write-Host
Write-Host "Extension installed successfully."
