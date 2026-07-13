# Add-AiTodoPromptDo.ps1
<#
.SYNOPSIS
Adds a prompt file reference to an AI todo list.

.DESCRIPTION
Adds a project-scoped prompt file reference to the top or bottom of an AI todo
list so a later AI or run-control workflow can detect the task. The script
validates that the prompt file exists, validates project identity and prompt
metadata, preserves existing todo-list content, avoids duplicate entries unless
-Force is supplied, and creates a timestamped backup before modifying an
existing todo file.

.PARAMETER PromptPath
Path to the prompt file to add to the AI todo list.

.PARAMETER TodoPath
Optional path to the todo list. When omitted, the script writes to
<ACTIVE_AI_ROOT>\Todo.md after project identity and active AI root resolution.

.PARAMETER ProjectId
Project identity assigned to the queued task. This value must match
<ProjectRoot>\.vscode\ai-project.json and the prompt metadata.

.PARAMETER ProjectRoot
Optional project root used to resolve .vscode\ai-project.json. When omitted,
the script tries to resolve the supplied ProjectId from the prompt path and
current directory. If the identity cannot be resolved deterministically, the
task is not queued.

.PARAMETER Position
Insert the prompt entry at the top or bottom. Valid values are top and bottom.
The default is bottom.

.PARAMETER Top
Backward-compatible switch that inserts the prompt entry at the top.

.PARAMETER Force
Add the prompt entry even when the todo list already references the prompt.

.EXAMPLE
./Add-AiTodoPromptDo.ps1 -PromptPath ".AI\Prompts\Codex-Task-Change-Run-Journal-Storage.md" -ProjectId "ai-workspace"

.EXAMPLE
./Add-AiTodoPromptDo.ps1 -PromptPath ".AI\Prompts\Codex-Task-Change-Run-Journal-Storage.md" -ProjectId "ai-workspace" -Position top

.EXAMPLE
./Add-AiTodoPromptDo.ps1 -PromptPath ".AI\Prompts\Codex-Task-Change-Run-Journal-Storage.md" -ProjectId "ai-workspace" -Top

.EXAMPLE
./Add-AiTodoPromptDo.ps1 -PromptPath "D:\AI\.AI\Prompts\SomeTask.md" -ProjectId "ai-workspace" -TodoPath "D:\AI\.AI\Todo.md"
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$PromptPath,

    [ValidateNotNullOrEmpty()]
    [string]$TodoPath,

    [ValidateNotNullOrEmpty()]
    [string]$ProjectId,

    [ValidateNotNullOrEmpty()]
    [string]$ProjectRoot,

    [ValidateSet('top', 'bottom')]
    [string]$Position = 'bottom',

    [switch]$Top,

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
. (Join-Path -Path $scriptDirectory -ChildPath 'AiProjectIdentity.ps1')

if ($Top -and $PSBoundParameters.ContainsKey('Position') -and $Position -eq 'bottom') {
    throw "Parameters -Top and -Position bottom cannot be used together."
}

function Resolve-PathForProject {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue,

        [Parameter(Mandatory)]
        [string]$ProjectRoot
    )

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path -Path $ProjectRoot -ChildPath $PathValue))
}

function ConvertTo-QueuePath {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue,

        [Parameter(Mandatory)]
        [string]$ProjectRoot
    )

    $normalizedRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
    if (-not $normalizedRoot.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $normalizedRoot = "$normalizedRoot$([System.IO.Path]::DirectorySeparatorChar)"
    }

    $rootUri = [System.Uri]::new($normalizedRoot)
    $pathUri = [System.Uri]::new([System.IO.Path]::GetFullPath($PathValue))

    if ($rootUri.Scheme -ne $pathUri.Scheme -or $rootUri.Host -ne $pathUri.Host) {
        return $PathValue
    }

    $relative = [System.Uri]::UnescapeDataString(
        $rootUri.MakeRelativeUri($pathUri).ToString()
    ).Replace('/', [System.IO.Path]::DirectorySeparatorChar)

    if ($relative.StartsWith('..')) {
        return $PathValue
    }

    return $relative
}

function New-PromptEntry {
    param(
        [Parameter(Mandatory)]
        [string]$QueuePath,

        [Parameter(Mandatory)]
        [string]$ProjectId,

        [Parameter(Mandatory)]
        [string]$TaskId
    )

    return "- [ ] [projectId: $ProjectId] [taskId: $TaskId] ``$QueuePath`` - Ready"
}

function Add-EntryToContent {
    param(
        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string[]]$Content,

        [Parameter(Mandatory)]
        [string]$Entry,

        [Parameter(Mandatory)]
        [bool]$InsertAtTop
    )

    if ($Content.Count -eq 0) {
        return @('# AI Todo', '', $Entry)
    }

    if (-not $InsertAtTop) {
        return @($Content + $Entry)
    }

    $headingIndex = -1
    for ($index = 0; $index -lt $Content.Count; $index++) {
        if ($Content[$index] -match '^#\s+') {
            $headingIndex = $index
            break
        }
    }

    if ($headingIndex -lt 0) {
        return @($Entry) + $Content
    }

    $insertIndex = $headingIndex + 1
    if ($insertIndex -lt $Content.Count -and [string]::IsNullOrWhiteSpace($Content[$insertIndex])) {
        $insertIndex++
    }

    $before = if ($insertIndex -gt 0) {
        @($Content[0..($insertIndex - 1)])
    } else {
        @()
    }

    $after = if ($insertIndex -lt $Content.Count) {
        @($Content[$insertIndex..($Content.Count - 1)])
    } else {
        @()
    }

    return @($before + $Entry + '' + $after)
}

$identityStartPaths = @(
    $PromptPath
    (Get-Location).ProviderPath
)
$identity = Resolve-AiProjectContext -ProjectRoot $ProjectRoot -ProjectId $ProjectId -StartPaths $identityStartPaths
$projectRoot = $identity.ProjectRoot
$activeAiRoot = Resolve-AiActiveRoot -ProjectRoot $projectRoot
$resolvedPromptPath = Resolve-PathForProject -PathValue $PromptPath -ProjectRoot $projectRoot

if (-not (Test-Path -LiteralPath $resolvedPromptPath -PathType Leaf)) {
    throw "Prompt file does not exist: $resolvedPromptPath"
}

$promptValidation = Test-AiPromptProjectMetadata -PromptPath $resolvedPromptPath -Identity $identity -RequireTaskId
$taskId = [string]$promptValidation.Metadata['taskId']

if ($PSBoundParameters.ContainsKey('TodoPath')) {
    $resolvedTodoPath = Resolve-PathForProject -PathValue $TodoPath -ProjectRoot $projectRoot
} else {
    $resolvedTodoPath = Join-Path -Path $activeAiRoot -ChildPath 'Todo.md'
}

$todoDirectory = Split-Path -Path $resolvedTodoPath -Parent
if (-not (Test-Path -LiteralPath $todoDirectory -PathType Container)) {
    New-Item -Path $todoDirectory -ItemType Directory -Force | Out-Null
}

$queuePath = ConvertTo-QueuePath -PathValue $resolvedPromptPath -ProjectRoot $projectRoot
$entry = New-PromptEntry -QueuePath $queuePath -ProjectId $identity.ProjectId -TaskId $taskId
$content = if (Test-Path -LiteralPath $resolvedTodoPath -PathType Leaf) {
    @(Get-Content -LiteralPath $resolvedTodoPath)
} else {
    @('# AI Todo', '')
}

if (-not $Force -and ($content -match [regex]::Escape($queuePath))) {
    Write-Host "Prompt file already queued: $queuePath"
    Write-Host "Project ID: $($identity.ProjectId)"
    Write-Host "Todo list unchanged: $resolvedTodoPath"
    Write-Host "Insertion position: none"
    Write-Host "Backup path: none"
    return
}

$backupPath = 'none'
$insertAtTop = $Top -or $Position -eq 'top'
$position = if ($insertAtTop) { 'top' } else { 'bottom' }
$updatedContent = Add-EntryToContent -Content $content -Entry $entry -InsertAtTop ([bool]$insertAtTop)

if ($PSCmdlet.ShouldProcess($resolvedTodoPath, "Insert prompt file at $position")) {
    if (Test-Path -LiteralPath $resolvedTodoPath -PathType Leaf) {
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $backupPath = "$resolvedTodoPath.$timestamp.bak"
        Copy-Item -LiteralPath $resolvedTodoPath -Destination $backupPath -Force
    }

    Set-Content -LiteralPath $resolvedTodoPath -Value $updatedContent -Encoding UTF8
}

Write-Host "Prompt file inserted: $queuePath"
Write-Host "Project ID: $($identity.ProjectId)"
Write-Host "Task ID: $taskId"
$todoAction = if ($WhatIfPreference) { 'planned' } else { 'modified' }
Write-Host "Todo list ${todoAction}: $resolvedTodoPath"
Write-Host "Insertion position: $position"
Write-Host "Backup path: $backupPath"
