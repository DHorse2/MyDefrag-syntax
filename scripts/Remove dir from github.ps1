
$targets = @(
    'node_modules'
    '.vscode'
)

$ignoreRules = $targets | ForEach-Object { "/$_/" }
$currentRules = @(Get-Content -LiteralPath '.gitignore')

$ignoreRules |
    Where-Object { $_ -notin $currentRules } |
    Add-Content -LiteralPath '.gitignore'

git add -- .gitignore
git rm -r --cached --ignore-unmatch -- $targets

# Confirm every local directory still exists.
$targets | ForEach-Object {
    [pscustomobject]@{
        Directory = $_
        LocalCopyPreserved = Test-Path -LiteralPath $_
    }
}

# Review exactly what Git will remove.
git status --short
git diff --cached --stat


// type q

git commit -m "Stop tracking local workspace directories"
git push origin main

