# Add-AiTodoPrompt.Tests.ps1
<#
.SYNOPSIS
Disposable acceptance tests for Add-AiTodoPrompt.ps1.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:RepoRoot = [System.IO.Path]::GetFullPath((Join-Path -Path $PSScriptRoot -ChildPath '..\..'))
$script:ScriptUnderTest = Join-Path -Path $script:RepoRoot -ChildPath '.AI\Scripts\Add-AiTodoPrompt.ps1'
$script:TempRoot = Join-Path -Path $PSScriptRoot -ChildPath '.tmp-add'
$script:Failures = New-Object System.Collections.Generic.List[string]
$script:Results = New-Object System.Collections.Generic.List[object]

function Assert-True {
    param(
        [Parameter(Mandatory)]
        [bool]$Condition,

        [Parameter(Mandatory)]
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function New-TestWorkspace {
    param(
        [Parameter(Mandatory)]
        [string]$Name,

        [string]$ProjectId = 'test-project'
    )

    $root = Join-Path -Path $script:TempRoot -ChildPath ($Name + '-' + [System.Guid]::NewGuid().ToString('N'))
    $vscodeRoot = Join-Path -Path $root -ChildPath '.vscode'
    $promptRoot = Join-Path -Path $root -ChildPath '.AI\Prompts'
    New-Item -Path $vscodeRoot, $promptRoot -ItemType Directory -Force | Out-Null
    Set-Content -LiteralPath (Join-Path -Path $vscodeRoot -ChildPath 'ai-project.json') -Value @"
{
  "schemaVersion": "1.0",
  "projectId": "$ProjectId",
  "projectName": "Test Project",
  "projectRoot": "$($root.Replace('\', '\\'))"
}
"@ -Encoding UTF8

    return [pscustomobject]@{
        Root = $root
        ProjectId = $ProjectId
        PromptRoot = $promptRoot
        TodoPath = Join-Path -Path $root -ChildPath '.AI\Todo.md'
    }
}

function Add-Prompt {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Workspace,

        [Parameter(Mandatory)]
        [string]$Name,

        [string]$TaskId = 'task-test',

        [string]$ProjectId,

        [string]$ProjectRoot
    )

    if ([string]::IsNullOrWhiteSpace($ProjectId)) {
        $ProjectId = $Workspace.ProjectId
    }

    if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
        $ProjectRoot = $Workspace.Root
    }

    $path = Join-Path -Path $Workspace.PromptRoot -ChildPath $Name
    Set-Content -LiteralPath $path -Value @(
        '---'
        "taskId: $TaskId"
        "projectId: $ProjectId"
        "projectRoot: $ProjectRoot"
        '---'
        ''
        "# $Name"
    ) -Encoding UTF8

    return [pscustomobject]@{
        FullPath = $path
        TaskId = $TaskId
    }
}

function Invoke-AddPrompt {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments,

        [switch]$ExpectFailure
    )

    try {
        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $script:ScriptUnderTest @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } catch {
        $output = @($_.Exception.Message)
        $exitCode = 1
    }

    if ($ExpectFailure) {
        Assert-True -Condition ($exitCode -ne 0) -Message "Add script unexpectedly succeeded. Output: $output"
        return ($output -join [Environment]::NewLine)
    }

    if ($exitCode -ne 0) {
        throw "Add script exited with $exitCode. Output: $output"
    }

    return ($output -join [Environment]::NewLine)
}

function Invoke-TestCase {
    param(
        [Parameter(Mandatory)]
        [string]$Name,

        [Parameter(Mandatory)]
        [scriptblock]$Body
    )

    try {
        & $Body
        $script:Results.Add([pscustomobject]@{ Name = $Name; Status = 'Passed'; Message = '' }) | Out-Null
    } catch {
        $message = $_.Exception.Message
        $script:Failures.Add("${Name}: $message") | Out-Null
        $script:Results.Add([pscustomobject]@{ Name = $Name; Status = 'Failed'; Message = $message }) | Out-Null
    }
}

if (Test-Path -LiteralPath $script:TempRoot -PathType Container) {
    $fullTempRoot = [System.IO.Path]::GetFullPath($script:TempRoot)
    $expectedPrefix = [System.IO.Path]::GetFullPath((Join-Path -Path $PSScriptRoot -ChildPath '.tmp-add'))
    Assert-True -Condition ($fullTempRoot -eq $expectedPrefix) -Message "Unexpected temp root: $fullTempRoot"
    Remove-Item -LiteralPath $script:TempRoot -Recurse -Force
}
New-Item -Path $script:TempRoot -ItemType Directory -Force | Out-Null

try {
    Invoke-TestCase -Name 'Queue insertion with valid ProjectId' -Body {
        $workspace = New-TestWorkspace -Name 'valid'
        $prompt = Add-Prompt -Workspace $workspace -Name 'Task.md' -TaskId 'task-valid'

        Invoke-AddPrompt -Arguments @(
            '-PromptPath', $prompt.FullPath,
            '-TodoPath', $workspace.TodoPath,
            '-ProjectId', $workspace.ProjectId,
            '-ProjectRoot', $workspace.Root
        ) | Out-Null

        $todo = Get-Content -LiteralPath $workspace.TodoPath -Raw
        Assert-True -Condition ($todo.Contains('[projectId: test-project] [taskId: task-valid]')) -Message 'Project metadata was not written to queue.'
    }

    Invoke-TestCase -Name 'Queue insertion without project identity fails' -Body {
        $workspace = New-TestWorkspace -Name 'missing-identity'
        $prompt = Add-Prompt -Workspace $workspace -Name 'Task.md' -TaskId 'task-valid'

        $output = Invoke-AddPrompt -Arguments @(
            '-PromptPath', $prompt.FullPath,
            '-TodoPath', $workspace.TodoPath
        ) -ExpectFailure

        Assert-True -Condition ($output -match 'ProjectId is required') -Message 'Missing project identity did not produce migration error.'
    }

    Invoke-TestCase -Name 'ProjectId and ProjectRoot disagreement fails' -Body {
        $workspace = New-TestWorkspace -Name 'disagreement'
        $prompt = Add-Prompt -Workspace $workspace -Name 'Task.md' -TaskId 'task-valid'

        $output = Invoke-AddPrompt -Arguments @(
            '-PromptPath', $prompt.FullPath,
            '-TodoPath', $workspace.TodoPath,
            '-ProjectId', 'other-project',
            '-ProjectRoot', $workspace.Root
        ) -ExpectFailure

        Assert-True -Condition ($output -match 'does not match') -Message 'Project disagreement did not fail clearly.'
    }

    Invoke-TestCase -Name 'Prompt metadata mismatch fails' -Body {
        $workspace = New-TestWorkspace -Name 'prompt-mismatch'
        $prompt = Add-Prompt -Workspace $workspace -Name 'Task.md' -TaskId 'task-valid' -ProjectId 'other-project'

        $output = Invoke-AddPrompt -Arguments @(
            '-PromptPath', $prompt.FullPath,
            '-TodoPath', $workspace.TodoPath,
            '-ProjectId', $workspace.ProjectId,
            '-ProjectRoot', $workspace.Root
        ) -ExpectFailure

        Assert-True -Condition ($output -match 'prompt projectId') -Message 'Prompt metadata mismatch did not fail clearly.'
    }

    Invoke-TestCase -Name 'WhatIf makes no changes' -Body {
        $workspace = New-TestWorkspace -Name 'what-if'
        $prompt = Add-Prompt -Workspace $workspace -Name 'Task.md' -TaskId 'task-valid'
        Set-Content -LiteralPath $workspace.TodoPath -Value @('# AI Todo', '') -Encoding UTF8
        $before = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Invoke-AddPrompt -Arguments @(
            '-PromptPath', $prompt.FullPath,
            '-TodoPath', $workspace.TodoPath,
            '-ProjectId', $workspace.ProjectId,
            '-ProjectRoot', $workspace.Root,
            '-WhatIf'
        ) | Out-Null

        $after = Get-Content -LiteralPath $workspace.TodoPath -Raw
        $backups = @(Get-ChildItem -LiteralPath (Split-Path -Path $workspace.TodoPath -Parent) -Filter 'Todo.md.*.bak')
        Assert-True -Condition ($before -eq $after) -Message 'WhatIf changed Todo.md.'
        Assert-True -Condition ($backups.Count -eq 0) -Message 'WhatIf created a backup.'
    }

    Invoke-TestCase -Name 'Backup is created on real modification' -Body {
        $workspace = New-TestWorkspace -Name 'backup'
        $prompt = Add-Prompt -Workspace $workspace -Name 'Task.md' -TaskId 'task-valid'
        Set-Content -LiteralPath $workspace.TodoPath -Value @('# AI Todo', '') -Encoding UTF8

        Invoke-AddPrompt -Arguments @(
            '-PromptPath', $prompt.FullPath,
            '-TodoPath', $workspace.TodoPath,
            '-ProjectId', $workspace.ProjectId,
            '-ProjectRoot', $workspace.Root
        ) | Out-Null

        $backups = @(Get-ChildItem -LiteralPath (Split-Path -Path $workspace.TodoPath -Parent) -Filter 'Todo.md.*.bak')
        Assert-True -Condition ($backups.Count -eq 1) -Message 'Expected one backup for real modification.'
    }
} finally {
    if (Test-Path -LiteralPath $script:TempRoot -PathType Container) {
        Remove-Item -LiteralPath $script:TempRoot -Recurse -Force
    }
}

$script:Results | Format-Table -AutoSize

if ($script:Failures.Count -gt 0) {
    Write-Error "Add-AiTodoPrompt acceptance tests failed: $($script:Failures -join '; ')"
    exit 1
}

Write-Host "Add-AiTodoPrompt acceptance tests passed: $($script:Results.Count)"
