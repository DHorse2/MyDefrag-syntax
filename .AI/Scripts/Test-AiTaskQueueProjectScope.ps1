# Test-AiTaskQueueProjectScope.ps1
<#
.SYNOPSIS
Reports project-scoping defects in an AI Todo.md queue.

.DESCRIPTION
Reads the active project identity, selects the active AI root once, and reports
queue entries that are projectless, missing task IDs, assigned to another
project, or structurally invalid. The script is read-only and does not migrate,
delete, reorder, or assign legacy entries.

.PARAMETER ProjectRoot
Project root containing .vscode\ai-project.json.

.PARAMETER ProjectId
Optional expected project ID. When supplied, it must match the project identity.

.PARAMETER AiRoot
Optional explicit AI root. When supplied, it must match the selected active AI
root for the project.

.PARAMETER TodoPath
Optional explicit Todo.md path.

.PARAMETER Json
Emit JSON instead of a table.
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [ValidateNotNullOrEmpty()]
    [string]$ProjectRoot = (Get-Location).ProviderPath,

    [ValidateNotNullOrEmpty()]
    [string]$ProjectId,

    [ValidateNotNullOrEmpty()]
    [string]$AiRoot,

    [ValidateNotNullOrEmpty()]
    [string]$TodoPath,

    [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
. (Join-Path -Path $scriptDirectory -ChildPath 'AiProjectIdentity.ps1')

$identity = Read-AiProjectIdentity -ProjectRoot $ProjectRoot
if (-not [string]::IsNullOrWhiteSpace($ProjectId) -and $ProjectId -ne $identity.ProjectId) {
    throw "Fatal project identity error: supplied ProjectId '$ProjectId' does not match active project '$($identity.ProjectId)'."
}

$activeAiRoot = Resolve-AiActiveRoot -ProjectRoot $identity.ProjectRoot -ExplicitAiRoot $AiRoot
$resolvedTodoPath = if (-not [string]::IsNullOrWhiteSpace($TodoPath)) {
    ConvertTo-AiFullPath -PathValue $TodoPath -BasePath $identity.ProjectRoot
} else {
    Join-Path -Path $activeAiRoot -ChildPath 'Todo.md'
}

$content = if (Test-Path -LiteralPath $resolvedTodoPath -PathType Leaf) {
    @(Get-Content -LiteralPath $resolvedTodoPath -Encoding UTF8)
} else {
    @()
}

$entries = @()
for ($index = 0; $index -lt $content.Count; $index++) {
    $line = $content[$index]
    if ($line -match '^\s*-\s+\[(?<check>[ xX])\]\s+(?:\[projectId:\s*(?<projectId>[^\]]+)\]\s+)?(?:\[taskId:\s*(?<taskId>[^\]]+)\]\s+)?`(?<path>[^`]+)`\s+-\s*(?<status>.+?)\s*$') {
        $entryProjectId = if ($Matches['projectId']) { $Matches['projectId'].Trim() } else { '' }
        $entryTaskId = if ($Matches['taskId']) { $Matches['taskId'].Trim() } else { '' }
        $defects = @()

        if ([string]::IsNullOrWhiteSpace($entryProjectId)) {
            $defects += 'Missing projectId'
        } elseif ($entryProjectId -ne $identity.ProjectId) {
            $defects += "Assigned to other project: $entryProjectId"
        }

        if ([string]::IsNullOrWhiteSpace($entryTaskId)) {
            $defects += 'Missing taskId'
        }

        $entries += [pscustomobject]@{
            Line = $index + 1
            Checked = $Matches['check']
            ProjectId = $entryProjectId
            TaskId = $entryTaskId
            PromptPath = $Matches['path']
            Status = $Matches['status'].Trim()
            Defect = if ($defects.Count -eq 0) { '' } else { $defects -join '; ' }
        }
    }
}

$result = [pscustomobject]@{
    projectId = $identity.ProjectId
    projectRoot = $identity.ProjectRoot
    aiRoot = $activeAiRoot
    todoPath = $resolvedTodoPath
    queueEntries = $entries.Count
    unresolvedEntries = @($entries | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Defect) }).Count
    entries = $entries
}

if ($Json) {
    $result | ConvertTo-Json -Depth 5
} else {
    $entries | Format-Table -AutoSize
    Write-Host "Project ID: $($result.projectId)"
    Write-Host "Todo path: $($result.todoPath)"
    Write-Host "Queue entries: $($result.queueEntries)"
    Write-Host "Unresolved entries: $($result.unresolvedEntries)"
}
