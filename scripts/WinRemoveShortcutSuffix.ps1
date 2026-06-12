param(
    [string]$Path = ".",
    [switch]$Recurse,
    [switch]$WhatIf
)
# WinRemoveShortcutSuffix.ps1
#   Params:
#     Path (string)
#         Description: Directory to scan for .lnk files.
#         Default: Current directory (".").
#         Example: -Path "C:\Users\Me\Desktop"
#     Recurse (switch)
#         Description: When present, include subdirectories recursively.
#         Default: Not present (only the specified directory is scanned).
#         Example: -Recurse
#     WhatIf (switch)
#         Description: Do a dry run — outputs what would be renamed without performing changes.
#         Default: Not present (script performs actual renames).
#         Example: -WhatIf
#   Usage examples:
#     Dry-run in current folder: .\Remove-ShortcutSuffix.ps1 -WhatIf
#     Rename in specific folder: .\Remove-ShortcutSuffix.ps1 -Path "C:\Users\Me\Desktop"
#     Rename recursively with dry-run: .\Remove-ShortcutSuffix.ps1 -Path "C:\Users\Me\Desktop" -Recurse -WhatIf

# Normalize path
$targetPath = Resolve-Path -Path $Path

# Build Get-ChildItem parameters
$gciParams = @{
    Path   = $targetPath
    Filter = "*.lnk"
}
if ($Recurse) { $gciParams.Recurse = $true }

Get-ChildItem @gciParams | ForEach-Object {
    $file = $_
    $name = $file.BaseName        # filename without extension
    $ext = $file.Extension        # includes the leading dot, e.g. ".lnk"
    $suffix = " - Shortcut"

    if ($name.EndsWith($suffix, [System.StringComparison]::OrdinalIgnoreCase)) {
        $newBase = $name.Substring(0, $name.Length - $suffix.Length).TrimEnd()
        if ([string]::IsNullOrWhiteSpace($newBase)) {
            Write-Warning "Skipping '$($file.FullName)' because resulting name would be empty."
            return
        }

        $newName = $newBase + $ext
        $newFullPath = Join-Path -Path $file.DirectoryName -ChildPath $newName

        if (Test-Path $newFullPath) {
            Write-Warning "Target already exists, skipping rename: '$newFullPath'"
            return
        }

        if ($WhatIf) {
            Write-Output "Would rename: '$($file.FullName)' -> '$newFullPath'"
        } else {
            Rename-Item -LiteralPath $file.FullName -NewName $newName
            Write-Output "Renamed: '$($file.FullName)' -> '$newFullPath'"
        }
    }
}
