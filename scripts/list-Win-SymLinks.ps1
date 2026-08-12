param($Path = 'C:\', $OutFile = (Join-Path (Get-Location).Path 'ListOfSymlinks.txt'), [ValidateSet('Table', 'Csv')][string]$Format = 'Csv')

try { $scanPath = (Resolve-Path $Path -ErrorAction Stop).Path } catch { Write-Error "Invalid Path: $Path"; exit 1 }
if ([string]::IsNullOrWhiteSpace($OutFile)) { $OutFile = Join-Path (Get-Location).Path 'ListOfSymlinks.txt' } else { try { $OutFile = [IO.Path]::GetFullPath($OutFile) } catch { $OutFile = Join-Path (Get-Location).Path 'ListOfSymlinks.txt' } }

# Write a single-line directory status. Truncates long paths to fit console width and overwrites the same line.
function Write-DirStatus {
    param([string]$Text)

    # Get console width; default to 80 if unavailable
    $width = 80
    try { $width = $Host.UI.RawUI.WindowSize.Width } catch { $width = 80 }

    $prefix = 'Scanning directory '
    $msg = "$prefix$Text"

    # If too long, truncate middle
    if ($msg.Length -gt ($width - 1)) {
        $keep = [int](($width - 5) / 2)
        $msg = $msg.Substring(0, $keep) + '...' + $msg.Substring($msg.Length - $keep)
    }

    # Pad to full width so leftover chars are cleared
    if ($msg.Length -lt $width) { $msg = $msg + (' ' * ($width - $msg.Length)) }

    # try {
    #     $raw = $Host.UI.RawUI
    #     $pos = $raw.CursorPosition
    #     $pos.X = 0
    #     $raw.CursorPosition = $pos
    #     Write-Host -NoNewline $msg
    # } catch {
    #     # Fallback: write truncated padded string without carriage returns
    #     Write-Host -NoNewline $msg.Substring(0, [Math]::Min($msg.Length, $width))
    # }
    # safe write to single console line without newline; ensures no wrapping
    try {
        $width = 80
        try { $width = $Host.UI.RawUI.WindowSize.Width } catch { $width = 80 }
        # ensure we write at most width-1 chars to avoid automatic wrap
        if ($msg.Length -ge $width) {
            # truncate middle to preserve start and end context
            $keep = [int](($width - 5) / 2)
            $msg = $msg.Substring(0, $keep) + '...' + $msg.Substring($msg.Length - $keep)
        }
        # pad to exactly width to clear previous content
        if ($msg.Length -lt $width) { $msg = $msg + (' ' * ($width - $msg.Length)) }

        # try to move cursor to column 0 on current row; ignore if not supported
        try {
            $raw = $Host.UI.RawUI
            $pos = $raw.CursorPosition
            $pos.X = 0
            $raw.CursorPosition = $pos
        } catch { }

        # write the prepared, fixed-width string without newline
        Write-Host -NoNewline $msg
    } catch {
        # ultimate fallback: write a safely truncated substring
        Write-Host -NoNewline ($msg.Substring(0, [Math]::Min($msg.Length, 80)))
    }
}

$results = @()
# enumerate directories first to show progress by directory
Get-ChildItem -Path $scanPath -Directory -Recurse -Force -ErrorAction SilentlyContinue |
    ForEach-Object -Begin { $count = 0 } -Process {
        $count++
        Write-DirStatus "Scanning directory $count : $($_.FullName)"
        # scan items in this directory only (avoids a single global Get-ChildItem that can hang)
        Get-ChildItem -Path $_.FullName -Force -ErrorAction SilentlyContinue |
            ForEach-Object {
                try {
                    if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                        $full = $_.FullName; $target = $null; $linkType = 'ReparsePoint'
                        try { $item = Get-Item -LiteralPath $full -Force -ErrorAction Stop; $target = $item.Target; if ($target) { $linkType = if ($item.PSIsContainer) { 'DirectorySymbolicLink' }else { 'FileSymbolicLink' } } }
                        catch { $fs = (fsutil reparsepoint query $full 2>$null) -join "`n"; if ($fs) { $target = $fs; if ($fs -match 'JUNCTION') { $linkType = 'Junction' } } }
                        $results += [PSCustomObject]@{ FullName = $full; Mode = $_.Mode; LinkType = $linkType; Target = ($target -as [string]) }
                    }
                } catch {}
            }
        } -End { Write-DirStatus "$count : $($_.FullName)" }

if ($Format -eq 'Csv') { $results | Export-Csv -Path $OutFile -NoTypeInformation -Encoding UTF8 } else {
    $table = $results | Format-Table FullName, Mode, LinkType, @{Name = 'Target'; Expression = { ($_.Target -as [string]) -replace "`r`n", " | " } } -AutoSize | Out-String -Width 4096
    Set-Content -Path $OutFile -Value $table -Encoding UTF8
}
Write-Output "Wrote $($results.Count) reparse points to: $OutFile"
