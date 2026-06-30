# Close Codex first.

$newCodexHome = 'G:\Ide\Codex\Users'

New-Item -ItemType Directory -Path $newCodexHome -Force

robocopy "$env:USERPROFILE\.codex" $newCodexHome /MIR /XD ".sandbox" ".tmp" "tmp"

setx CODEX_HOME $newCodexHome
