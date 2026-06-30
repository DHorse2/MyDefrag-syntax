$dirs = @(
    "src",
    "src\diagnostics"
)

$files = @(
    "src\extension.js",
    "src\diagnostics\diagnosticNavigator.js",
    "src\diagnostics\diagnosticTreeProvider.js",
    "src\diagnostics\DiagState.js",
    "src\diagnostics\keywordLookup.js"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir | Out-Null
    }
}

foreach ($file in $files) {
    if (-not (Test-Path -LiteralPath $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "Created $file"
    }
    else {
        Write-Host "Exists   $file"
    }
}
