# Resolve-AiTaskQueue.Tests.ps1
<#
.SYNOPSIS
Disposable acceptance tests for Resolve-AiTaskQueue.ps1.

.DESCRIPTION
Creates isolated project roots under .AI\Tests\.tmp, writes project identity
files and prompt metadata, exercises the resolver, and removes temporary test
data after completion.
#>
[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:RepoRoot = [System.IO.Path]::GetFullPath((Join-Path -Path $PSScriptRoot -ChildPath '..\..'))
$script:ScriptUnderTest = Join-Path -Path $script:RepoRoot -ChildPath '.AI\Scripts\Resolve-AiTaskQueue.ps1'
$script:TempRoot = Join-Path -Path $PSScriptRoot -ChildPath '.tmp'
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

        [string]$ProjectId = 'test-project',

        [switch]$NoLocalAi,

        [switch]$NoIdentity,

        [string]$IdentityJson
    )

    $root = Join-Path -Path $script:TempRoot -ChildPath ($Name + '-' + [System.Guid]::NewGuid().ToString('N'))
    $vscodeRoot = Join-Path -Path $root -ChildPath '.vscode'
    New-Item -Path $vscodeRoot -ItemType Directory -Force | Out-Null

    if (-not $NoIdentity) {
        $identityPath = Join-Path -Path $vscodeRoot -ChildPath 'ai-project.json'
        if ([string]::IsNullOrWhiteSpace($IdentityJson)) {
            $IdentityJson = @"
{
  "schemaVersion": "1.0",
  "projectId": "$ProjectId",
  "projectName": "Test Project",
  "projectRoot": "$($root.Replace('\', '\\'))"
}
"@
        }

        Set-Content -LiteralPath $identityPath -Value $IdentityJson -Encoding UTF8
    }

    $aiRoot = Join-Path -Path $root -ChildPath '.AI'
    $promptRoot = Join-Path -Path $aiRoot -ChildPath 'Prompts'
    if (-not $NoLocalAi) {
        New-Item -Path $promptRoot -ItemType Directory -Force | Out-Null
    }

    return [pscustomobject]@{
        Root = $root
        AiRoot = $aiRoot
        PromptRoot = $promptRoot
        ProjectId = $ProjectId
        TodoPath = Join-Path -Path $aiRoot -ChildPath 'Todo.md'
        CurrentTaskPath = Join-Path -Path $promptRoot -ChildPath 'currentTask.md'
        ExternalTodoPath = Join-Path -Path $root -ChildPath 'Todo.test.md'
        ExternalCurrentTaskPath = Join-Path -Path $root -ChildPath 'currentTask.test.md'
    }
}

function Add-Prompt {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Workspace,

        [Parameter(Mandatory)]
        [string]$Name,

        [string]$TaskId,

        [string]$ProjectId,

        [string]$ProjectRoot
    )

    if ([string]::IsNullOrWhiteSpace($TaskId)) {
        $TaskId = 'task-' + ([System.IO.Path]::GetFileNameWithoutExtension($Name).ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
    }

    if ([string]::IsNullOrWhiteSpace($ProjectId)) {
        $ProjectId = $Workspace.ProjectId
    }

    if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
        $ProjectRoot = $Workspace.Root
    }

    New-Item -Path $Workspace.PromptRoot -ItemType Directory -Force | Out-Null
    $path = Join-Path -Path $Workspace.PromptRoot -ChildPath $Name
    Set-Content -LiteralPath $path -Value @(
        '---'
        "taskId: $TaskId"
        "projectId: $ProjectId"
        "projectRoot: $ProjectRoot"
        '---'
        ''
        "# $Name"
        ''
        "Execute $Name."
    ) -Encoding UTF8

    return [pscustomobject]@{
        QueuePath = ".AI\Prompts\$Name"
        TaskId = $TaskId
        FullPath = $path
    }
}

function Set-Todo {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Workspace,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [string[]]$Lines
    )

    New-Item -Path (Split-Path -Path $Workspace.TodoPath -Parent) -ItemType Directory -Force | Out-Null
    Set-Content -LiteralPath $Workspace.TodoPath -Value @('# AI Todo', '') -Encoding UTF8
    Add-Content -LiteralPath $Workspace.TodoPath -Value $Lines -Encoding UTF8
}

function New-TodoLine {
    param(
        [Parameter(Mandatory)]
        [string]$QueuePath,

        [string]$ProjectId = 'test-project',

        [string]$TaskId = 'task-test',

        [ValidateSet(' ', 'x')]
        [string]$Checked = ' ',

        [string]$Status = 'Ready',

        [switch]$LegacyProjectless
    )

    if ($LegacyProjectless) {
        return '- [' + $Checked + '] `' + $QueuePath + '` - ' + $Status
    }

    return '- [' + $Checked + '] [projectId: ' + $ProjectId + '] [taskId: ' + $TaskId + '] `' + $QueuePath + '` - ' + $Status
}

function New-CurrentMetadataLines {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Workspace,

        [Parameter(Mandatory)]
        [string]$Status,

        [Parameter(Mandatory)]
        [string]$PromptPath,

        [string]$QueueEntryId = '',

        [ValidateSet('Queue', 'AdHoc', 'ExplicitPath', 'Recovery')]
        [string]$Source = 'Queue',

        [string]$TaskId = 'task-test'
    )

    return @(
        '---'
        'schemaVersion: 1'
        "taskId: $TaskId"
        "projectId: $($Workspace.ProjectId)"
        "projectRoot: $($Workspace.Root)"
        "status: $Status"
        "promptPath: $PromptPath"
        "queueEntryId: $QueueEntryId"
        "source: $Source"
        'executionId: '
        "updatedAt: $((Get-Date).ToUniversalTime().ToString('o'))"
        'claimedByAgent: codex'
        'claimedByComputer: test-computer'
        "claimedWorkspaceRoot: $($Workspace.Root)"
        '---'
        ''
        '# Current Task'
        ''
        "Status: $Status"
    )
}

function Set-CurrentTask {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Workspace,

        [Parameter(Mandatory)]
        [string]$Status,

        [Parameter(Mandatory)]
        [string]$PromptPath,

        [string]$QueueEntryId = '',

        [ValidateSet('Queue', 'AdHoc', 'ExplicitPath', 'Recovery')]
        [string]$Source = 'Queue',

        [string]$TaskId = 'task-test'
    )

    New-Item -Path (Split-Path -Path $Workspace.CurrentTaskPath -Parent) -ItemType Directory -Force | Out-Null
    Set-Content -LiteralPath $Workspace.CurrentTaskPath -Value (New-CurrentMetadataLines -Workspace $Workspace -Status $Status -PromptPath $PromptPath -QueueEntryId $QueueEntryId -Source $Source -TaskId $TaskId) -Encoding UTF8
}

function Invoke-Resolver {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Workspace,

        [string[]]$ExtraArguments = @(),

        [switch]$ExpectFailure,

        [switch]$UseExternalStatePaths
    )

    $arguments = @(
        '-NoProfile'
        '-ExecutionPolicy'
        'Bypass'
        '-File'
        $script:ScriptUnderTest
        '-ProjectRoot'
        $Workspace.Root
        '-Json'
    )

    if (-not $UseExternalStatePaths) {
        $arguments += @('-AiRoot', $Workspace.AiRoot)
    } else {
        $arguments += @('-TodoPath', $Workspace.ExternalTodoPath, '-CurrentTaskPath', $Workspace.ExternalCurrentTaskPath)
    }

    $arguments += $ExtraArguments
    try {
        $output = & powershell.exe @arguments 2>&1
        $exitCode = $LASTEXITCODE
    } catch {
        $output = @($_.Exception.Message)
        $exitCode = 1
    }

    if ($ExpectFailure) {
        Assert-True -Condition ($exitCode -ne 0) -Message "Resolver unexpectedly succeeded. Output: $output"
        return ($output -join [Environment]::NewLine)
    }

    if ($exitCode -ne 0) {
        throw "Resolver exited with $exitCode. Output: $output"
    }

    $text = ($output -join [Environment]::NewLine)
    $jsonStart = $text.IndexOf('{')
    if ($jsonStart -lt 0) {
        throw "Resolver did not emit JSON. Output: $text"
    }

    return ($text.Substring($jsonStart) | ConvertFrom-Json)
}

function Get-CurrentMetadata {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Workspace
    )

    $content = @(Get-Content -LiteralPath $Workspace.CurrentTaskPath -Encoding UTF8)
    $metadata = @{}
    for ($index = 1; $index -lt $content.Count; $index++) {
        if ($content[$index] -eq '---') {
            break
        }

        if ($content[$index] -match '^\s*([^:#]+)\s*:\s*(.*)\s*$') {
            $metadata[$Matches[1].Trim()] = $Matches[2].Trim()
        }
    }

    return $metadata
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
    $expectedPrefix = [System.IO.Path]::GetFullPath((Join-Path -Path $PSScriptRoot -ChildPath '.tmp'))
    Assert-True -Condition ($fullTempRoot -eq $expectedPrefix) -Message "Unexpected temp root: $fullTempRoot"
    Remove-Item -LiteralPath $script:TempRoot -Recurse -Force
}
New-Item -Path $script:TempRoot -ItemType Directory -Force | Out-Null

try {
    Invoke-TestCase -Name 'Missing project identity is fatal' -Body {
        $workspace = New-TestWorkspace -Name 'missing-identity' -NoIdentity
        Invoke-Resolver -Workspace $workspace -ExpectFailure | Out-Null
    }

    Invoke-TestCase -Name 'Malformed project identity is fatal' -Body {
        $workspace = New-TestWorkspace -Name 'malformed-identity' -IdentityJson '{ not json'
        Invoke-Resolver -Workspace $workspace -ExpectFailure | Out-Null
    }

    Invoke-TestCase -Name 'Missing projectId is fatal' -Body {
        $workspace = New-TestWorkspace -Name 'missing-project-id' -IdentityJson '{"schemaVersion":"1.0","projectName":"Bad","projectRoot":"D:\\AI"}'
        Invoke-Resolver -Workspace $workspace -ExpectFailure | Out-Null
    }

    Invoke-TestCase -Name 'Mismatched projectRoot is fatal' -Body {
        $workspace = New-TestWorkspace -Name 'mismatched-root' -IdentityJson '{"schemaVersion":"1.0","projectId":"test-project","projectName":"Bad","projectRoot":"D:\\Elsewhere"}'
        Invoke-Resolver -Workspace $workspace -ExpectFailure | Out-Null
    }

    Invoke-TestCase -Name 'Local AI root is selected once when present' -Body {
        $workspace = New-TestWorkspace -Name 'local-root'
        Set-Todo -Workspace $workspace -Lines @()

        $result = Invoke-Resolver -Workspace $workspace

        Assert-True -Condition ($result.aiRoot -eq $workspace.AiRoot) -Message 'Local .AI root was not selected.'
        Assert-True -Condition ($result.currentTaskPath -eq $workspace.CurrentTaskPath) -Message 'Current task path did not use local .AI.'
    }

    Invoke-TestCase -Name 'Shared AI root is selected once when local AI is absent' -Body {
        $workspace = New-TestWorkspace -Name 'shared-root' -NoLocalAi
        Set-Content -LiteralPath $workspace.ExternalTodoPath -Value @('# AI Todo', '') -Encoding UTF8

        $result = Invoke-Resolver -Workspace $workspace -UseExternalStatePaths -ExtraArguments @('-WhatIf')

        Assert-True -Condition ($result.aiRoot -eq 'D:\AI\.AI') -Message 'Shared AI root was not selected.'
    }

    Invoke-TestCase -Name 'No file-by-file fallback from local AI to shared AI' -Body {
        $workspace = New-TestWorkspace -Name 'no-overlay'
        Set-Todo -Workspace $workspace -Lines @()
        if (Test-Path -LiteralPath $workspace.CurrentTaskPath -PathType Leaf) {
            Remove-Item -LiteralPath $workspace.CurrentTaskPath -Force
        }

        $result = Invoke-Resolver -Workspace $workspace

        Assert-True -Condition ($result.aiRoot -eq $workspace.AiRoot) -Message 'Resolver did not keep local .AI as active root.'
        Assert-True -Condition ($result.currentTaskPath -eq $workspace.CurrentTaskPath) -Message 'Resolver fell back to a shared currentTask path.'
    }

    Invoke-TestCase -Name 'Active current task plus queued tasks' -Body {
        $workspace = New-TestWorkspace -Name 'active-current'
        $active = Add-Prompt -Workspace $workspace -Name 'Active.md' -TaskId 'task-active'
        $queued = Add-Prompt -Workspace $workspace -Name 'Queued.md' -TaskId 'task-queued'
        Set-CurrentTask -Workspace $workspace -Status 'Loaded' -PromptPath $active.QueuePath -Source 'AdHoc' -TaskId $active.TaskId
        Set-Todo -Workspace $workspace -Lines @(New-TodoLine -QueuePath $queued.QueuePath -TaskId $queued.TaskId)

        $beforeTodo = Get-Content -LiteralPath $workspace.TodoPath -Raw
        $result = Invoke-Resolver -Workspace $workspace
        $afterTodo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($result.action -eq 'Retained') -Message 'Expected active task to be retained.'
        Assert-True -Condition ($beforeTodo -eq $afterTodo) -Message 'Queue changed while active task was retained.'
    }

    Invoke-TestCase -Name 'Completed current task plus two queued tasks' -Body {
        $workspace = New-TestWorkspace -Name 'completed-two'
        $first = Add-Prompt -Workspace $workspace -Name 'First.md' -TaskId 'task-first'
        $second = Add-Prompt -Workspace $workspace -Name 'Second.md' -TaskId 'task-second'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        Set-Todo -Workspace $workspace -Lines @(
            New-TodoLine -QueuePath $first.QueuePath -TaskId $first.TaskId
            New-TodoLine -QueuePath $second.QueuePath -TaskId $second.TaskId
        )

        $result = Invoke-Resolver -Workspace $workspace
        $metadata = Get-CurrentMetadata -Workspace $workspace
        $todo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($result.action -eq 'Promoted') -Message 'Expected first queued task to be promoted.'
        Assert-True -Condition ($metadata['promptPath'] -eq $first.QueuePath) -Message 'First queued task was not current.'
        Assert-True -Condition ($todo.Contains((New-TodoLine -QueuePath $first.QueuePath -TaskId $first.TaskId -Checked 'x' -Status 'Loaded'))) -Message 'First queued task was not marked Loaded.'
        Assert-True -Condition ($todo.Contains((New-TodoLine -QueuePath $second.QueuePath -TaskId $second.TaskId))) -Message 'Second queued task did not remain queued.'
    }

    Invoke-TestCase -Name 'Resolver run twice after same completion' -Body {
        $workspace = New-TestWorkspace -Name 'idempotent'
        $first = Add-Prompt -Workspace $workspace -Name 'First.md' -TaskId 'task-first'
        $second = Add-Prompt -Workspace $workspace -Name 'Second.md' -TaskId 'task-second'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        Set-Todo -Workspace $workspace -Lines @(
            New-TodoLine -QueuePath $first.QueuePath -TaskId $first.TaskId
            New-TodoLine -QueuePath $second.QueuePath -TaskId $second.TaskId
        )

        $firstResult = Invoke-Resolver -Workspace $workspace
        $secondResult = Invoke-Resolver -Workspace $workspace
        $metadata = Get-CurrentMetadata -Workspace $workspace
        $todo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($firstResult.action -eq 'Promoted') -Message 'First run did not promote.'
        Assert-True -Condition ($secondResult.action -eq 'Retained') -Message 'Second run did not retain the promoted task.'
        Assert-True -Condition ($metadata['promptPath'] -eq $first.QueuePath) -Message 'Current task changed on second run.'
        Assert-True -Condition ($todo.Contains((New-TodoLine -QueuePath $second.QueuePath -TaskId $second.TaskId))) -Message 'Second queued task was consumed.'
    }

    Invoke-TestCase -Name 'Completed current task with empty project queue' -Body {
        $workspace = New-TestWorkspace -Name 'empty-queue'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        Set-Todo -Workspace $workspace -Lines @()

        $result = Invoke-Resolver -Workspace $workspace
        $metadata = Get-CurrentMetadata -Workspace $workspace

        Assert-True -Condition ($result.action -eq 'Idle') -Message 'Expected resolver to write Idle.'
        Assert-True -Condition ($metadata['status'] -eq 'Idle') -Message 'Current task status is not Idle.'
    }

    Invoke-TestCase -Name 'Blocked current task plus queued task' -Body {
        $workspace = New-TestWorkspace -Name 'blocked-current'
        $queued = Add-Prompt -Workspace $workspace -Name 'Queued.md' -TaskId 'task-queued'
        Set-CurrentTask -Workspace $workspace -Status 'Blocked' -PromptPath '.AI\Prompts\Blocked.md' -Source 'AdHoc' -TaskId 'task-blocked'
        Set-Todo -Workspace $workspace -Lines @(New-TodoLine -QueuePath $queued.QueuePath -TaskId $queued.TaskId)

        $result = Invoke-Resolver -Workspace $workspace
        $metadata = Get-CurrentMetadata -Workspace $workspace

        Assert-True -Condition ($result.action -eq 'InterventionRequired') -Message 'Blocked task did not require intervention.'
        Assert-True -Condition ($metadata['status'] -eq 'Blocked') -Message 'Blocked task was not retained.'
    }

    Invoke-TestCase -Name 'Missing current-task file plus queued task' -Body {
        $workspace = New-TestWorkspace -Name 'missing-current'
        $queued = Add-Prompt -Workspace $workspace -Name 'Queued.md' -TaskId 'task-queued'
        Set-Todo -Workspace $workspace -Lines @(New-TodoLine -QueuePath $queued.QueuePath -TaskId $queued.TaskId)

        $result = Invoke-Resolver -Workspace $workspace
        $metadata = Get-CurrentMetadata -Workspace $workspace

        Assert-True -Condition ($result.action -eq 'Promoted') -Message 'Missing current task did not promote.'
        Assert-True -Condition ($metadata['promptPath'] -eq $queued.QueuePath) -Message 'Queued prompt was not promoted.'
    }

    Invoke-TestCase -Name 'Missing prompt referenced by next queue entry' -Body {
        $workspace = New-TestWorkspace -Name 'missing-prompt'
        $missing = '.AI\Prompts\Missing.md'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        Set-Todo -Workspace $workspace -Lines @(New-TodoLine -QueuePath $missing -TaskId 'task-missing')

        $result = Invoke-Resolver -Workspace $workspace
        $metadata = Get-CurrentMetadata -Workspace $workspace
        $todo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($result.action -eq 'Blocked') -Message 'Missing prompt did not block.'
        Assert-True -Condition ($metadata['status'] -eq 'Blocked') -Message 'Current task was not marked Blocked.'
        Assert-True -Condition ($todo.Contains((New-TodoLine -QueuePath $missing -TaskId 'task-missing'))) -Message 'Missing prompt queue evidence was not preserved.'
    }

    Invoke-TestCase -Name 'LOAD TASK skips another project without altering it' -Body {
        $workspace = New-TestWorkspace -Name 'skip-other'
        $active = Add-Prompt -Workspace $workspace -Name 'Active.md' -TaskId 'task-active'
        $otherLine = New-TodoLine -QueuePath '.AI\Prompts\Other.md' -ProjectId 'other-project' -TaskId 'task-other'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        Set-Todo -Workspace $workspace -Lines @(
            $otherLine
            New-TodoLine -QueuePath $active.QueuePath -TaskId $active.TaskId
        )

        $result = Invoke-Resolver -Workspace $workspace
        $todo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($result.action -eq 'Promoted') -Message 'Expected active project task to be promoted.'
        Assert-True -Condition ($result.promotedPromptPath -eq $active.QueuePath) -Message 'Wrong project task was promoted.'
        Assert-True -Condition ($todo.Contains($otherLine)) -Message 'Other project queue line was altered.'
    }

    Invoke-TestCase -Name 'Projectless queue items are preserved but not loaded' -Body {
        $workspace = New-TestWorkspace -Name 'projectless'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        $legacyLine = New-TodoLine -QueuePath '.AI\Prompts\Legacy.md' -LegacyProjectless
        Set-Todo -Workspace $workspace -Lines @($legacyLine)

        $result = Invoke-Resolver -Workspace $workspace
        $todo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($result.action -eq 'Idle') -Message 'Projectless item should not be eligible.'
        Assert-True -Condition ($result.queueProjectlessEntries -eq 1) -Message 'Projectless item was not reported.'
        Assert-True -Condition ($todo.Contains($legacyLine)) -Message 'Projectless item was altered.'
    }

    Invoke-TestCase -Name 'Prompt metadata mismatch prevents loading' -Body {
        $workspace = New-TestWorkspace -Name 'prompt-mismatch'
        $prompt = Add-Prompt -Workspace $workspace -Name 'Mismatch.md' -TaskId 'task-prompt'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        Set-Todo -Workspace $workspace -Lines @(New-TodoLine -QueuePath $prompt.QueuePath -TaskId 'task-queue')

        $result = Invoke-Resolver -Workspace $workspace
        $todo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($result.action -eq 'Blocked') -Message 'Mismatch did not block.'
        Assert-True -Condition ($result.blockingDefect -match 'taskId') -Message 'Mismatch reason did not mention taskId.'
        Assert-True -Condition ($todo.Contains((New-TodoLine -QueuePath $prompt.QueuePath -TaskId 'task-queue'))) -Message 'Mismatched queue item was consumed.'
    }

    Invoke-TestCase -Name 'Explicit task path cannot bypass project matching' -Body {
        $workspace = New-TestWorkspace -Name 'explicit-mismatch'
        $prompt = Add-Prompt -Workspace $workspace -Name 'OtherProject.md' -TaskId 'task-other' -ProjectId 'other-project'
        Set-Todo -Workspace $workspace -Lines @()

        $result = Invoke-Resolver -Workspace $workspace -ExtraArguments @('-ExplicitPromptPath', $prompt.FullPath)

        Assert-True -Condition ($result.action -eq 'Blocked') -Message 'Explicit mismatched prompt did not block.'
        Assert-True -Condition ($result.blockingDefect -match 'projectId') -Message 'Mismatch reason did not mention projectId.'
    }

    Invoke-TestCase -Name 'WhatIf resolver run makes no changes' -Body {
        $workspace = New-TestWorkspace -Name 'what-if'
        $queued = Add-Prompt -Workspace $workspace -Name 'Queued.md' -TaskId 'task-queued'
        Set-CurrentTask -Workspace $workspace -Status 'Completed' -PromptPath '.AI\Prompts\Done.md' -Source 'Recovery' -TaskId 'task-done'
        Set-Todo -Workspace $workspace -Lines @(New-TodoLine -QueuePath $queued.QueuePath -TaskId $queued.TaskId)

        $beforeCurrent = Get-Content -LiteralPath $workspace.CurrentTaskPath -Raw
        $beforeTodo = Get-Content -LiteralPath $workspace.TodoPath -Raw
        $result = Invoke-Resolver -Workspace $workspace -ExtraArguments @('-WhatIf')
        $afterCurrent = Get-Content -LiteralPath $workspace.CurrentTaskPath -Raw
        $afterTodo = Get-Content -LiteralPath $workspace.TodoPath -Raw

        Assert-True -Condition ($result.action -eq 'Promoted') -Message 'WhatIf did not report planned promotion.'
        Assert-True -Condition ($beforeCurrent -eq $afterCurrent) -Message 'WhatIf mutated currentTask.md.'
        Assert-True -Condition ($beforeTodo -eq $afterTodo) -Message 'WhatIf mutated Todo.md.'
    }
} finally {
    if (Test-Path -LiteralPath $script:TempRoot -PathType Container) {
        Remove-Item -LiteralPath $script:TempRoot -Recurse -Force
    }
}

$script:Results | Format-Table -AutoSize

if ($script:Failures.Count -gt 0) {
    Write-Error "Resolve-AiTaskQueue acceptance tests failed: $($script:Failures -join '; ')"
    exit 1
}

Write-Host "Resolve-AiTaskQueue acceptance tests passed: $($script:Results.Count)"
