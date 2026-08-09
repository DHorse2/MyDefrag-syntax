# Resolve-AiTaskQueue.ps1
<#
.SYNOPSIS
Resolves the project-scoped AI current task and Markdown todo queue.

.DESCRIPTION
Validates project identity before queue access, resolves
`Prompts\currentTask.md` before startup loads it, completes terminal handoffs,
and promotes the next eligible active-project `Todo.md` queue entry. The script
preserves a Markdown checklist queue while requiring structured project fields
for executable queue entries and compact machine-readable front matter in the
current-task artifact.

.PARAMETER ProjectRoot
Project root used for project-local `.AI` resolution. Defaults to the current
directory.

.PARAMETER ProjectId
Optional expected project ID. When supplied, it must match
<ProjectRoot>\.vscode\ai-project.json.

.PARAMETER AiRoot
Optional explicit AI root. When omitted, `<ProjectRoot>\.AI` is preferred and
`D:\AI\.AI` is used as the shared fallback.

.PARAMETER TodoPath
Optional explicit todo queue path.

.PARAMETER CurrentTaskPath
Optional explicit current-task path.

.PARAMETER ExplicitPromptPath
Optional explicit task prompt path. The prompt must declare metadata matching
the active project and does not consume the queue.

.PARAMETER Action
Resolve the current state, complete the current task before resolving, or force
an advancement check.

.PARAMETER CompletionStatus
Terminal status to write when Action is Complete.

.PARAMETER ExecutionId
Execution identifier to persist when completing a task.

.PARAMETER LegacyPromptPath
Prompt path to record when completing a legacy currentTask.md file that lacks
front matter.

.PARAMETER LegacySource
Source value to record when completing a legacy currentTask.md file.

.PARAMETER LegacyQueueEntryId
Queue entry identity to record when completing a legacy currentTask.md file.

.PARAMETER LegacyTaskId
Task identity to record when completing a legacy currentTask.md file.

.PARAMETER Json
Emit a JSON result instead of a PowerShell object.
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

    [ValidateNotNullOrEmpty()]
    [string]$CurrentTaskPath,

    [ValidateNotNullOrEmpty()]
    [string]$ExplicitPromptPath,

    [ValidateSet('Resolve', 'Complete', 'Advance')]
    [string]$Action = 'Resolve',

    [ValidateSet('Completed', 'Skipped', 'Cancelled')]
    [string]$CompletionStatus = 'Completed',

    [string]$ExecutionId,

    [string]$LegacyPromptPath,

    [ValidateSet('Queue', 'AdHoc', 'ExplicitPath', 'Recovery')]
    [string]$LegacySource = 'Recovery',

    [string]$LegacyQueueEntryId,

    [string]$LegacyTaskId,

    [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Path $MyInvocation.MyCommand.Path -Parent
. (Join-Path -Path $scriptDirectory -ChildPath 'AiProjectIdentity.ps1')

$script:QueueResolverCmdlet = $PSCmdlet
$script:ActiveStatuses = @('Ready', 'Loaded', 'In Progress')
$script:InterventionStatuses = @('Blocked', 'Failed')
$script:TerminalStatuses = @('Completed', 'Skipped', 'Cancelled')
$script:AllStatuses = @('Ready', 'Loaded', 'In Progress', 'Blocked', 'Failed', 'Completed', 'Skipped', 'Cancelled', 'Idle')
$script:MetadataKeys = @(
    'schemaVersion',
    'taskId',
    'projectId',
    'projectRoot',
    'status',
    'promptPath',
    'queueEntryId',
    'source',
    'executionId',
    'updatedAt',
    'claimedByAgent',
    'claimedByComputer',
    'claimedWorkspaceRoot'
)

function Resolve-FullPath {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue,

        [Parameter(Mandatory)]
        [string]$BasePath
    )

    if ([System.IO.Path]::IsPathRooted($PathValue)) {
        return [System.IO.Path]::GetFullPath($PathValue)
    }

    return [System.IO.Path]::GetFullPath((Join-Path -Path $BasePath -ChildPath $PathValue))
}

function ConvertTo-RelativePath {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue,

        [Parameter(Mandatory)]
        [string]$BasePath
    )

    $fullBase = [System.IO.Path]::GetFullPath($BasePath)
    if (-not $fullBase.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $fullBase = "$fullBase$([System.IO.Path]::DirectorySeparatorChar)"
    }

    $fullPath = [System.IO.Path]::GetFullPath($PathValue)
    $baseUri = [System.Uri]::new($fullBase)
    $pathUri = [System.Uri]::new($fullPath)

    if ($baseUri.Scheme -ne $pathUri.Scheme -or $baseUri.Host -ne $pathUri.Host) {
        return $PathValue
    }

    $relative = [System.Uri]::UnescapeDataString(
        $baseUri.MakeRelativeUri($pathUri).ToString()
    ).Replace('/', [System.IO.Path]::DirectorySeparatorChar)

    if ($relative.StartsWith('..')) {
        return $PathValue
    }

    return $relative
}

function ConvertTo-NormalizedQueuePath {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath
    )

    $cleanPath = $PathValue.Trim().Trim('`').Replace('/', '\')
    if ([System.IO.Path]::IsPathRooted($cleanPath)) {
        return (ConvertTo-RelativePath -PathValue $cleanPath -BasePath $ProjectRootPath).Replace('/', '\')
    }

    while ($cleanPath.StartsWith('.\')) {
        $cleanPath = $cleanPath.Substring(2)
    }

    return $cleanPath
}

function Get-QueueComparisonKey {
    param(
        [Parameter(Mandatory)]
        [string]$PathValue,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath
    )

    return (ConvertTo-NormalizedQueuePath -PathValue $PathValue -ProjectRootPath $ProjectRootPath).ToLowerInvariant()
}

function New-TaskId {
    param(
        [Parameter(Mandatory)]
        [string]$Seed
    )

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Seed.ToLowerInvariant())
        $hash = $sha.ComputeHash($bytes)
        $hex = [System.BitConverter]::ToString($hash).Replace('-', '').ToLowerInvariant()
        return "task-$($hex.Substring(0, 16))"
    } finally {
        $sha.Dispose()
    }
}

function Resolve-PromptFullPath {
    param(
        [Parameter(Mandatory)]
        [string]$PromptPath,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath,

        [Parameter(Mandatory)]
        [string]$AiRootPath
    )

    $cleanPath = $PromptPath.Trim().Trim('`').Replace('/', '\')
    if ([System.IO.Path]::IsPathRooted($cleanPath)) {
        return [System.IO.Path]::GetFullPath($cleanPath)
    }

    if ($cleanPath.StartsWith('.AI\', [System.StringComparison]::OrdinalIgnoreCase)) {
        return [System.IO.Path]::GetFullPath((Join-Path -Path $ProjectRootPath -ChildPath $cleanPath))
    }

    return [System.IO.Path]::GetFullPath((Join-Path -Path $AiRootPath -ChildPath $cleanPath))
}

function Read-CurrentTaskState {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return [pscustomobject]@{
            Exists = $false
            IsEmpty = $true
            HasMetadata = $false
            IsValid = $false
            Metadata = [ordered]@{}
            Body = @()
            Defect = 'Current task file is missing.'
        }
    }

    $content = @(Get-Content -LiteralPath $Path -Encoding UTF8)
    $isEmpty = $content.Count -eq 0 -or (($content | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }).Count -eq 0)
    if ($isEmpty) {
        return [pscustomobject]@{
            Exists = $true
            IsEmpty = $true
            HasMetadata = $false
            IsValid = $false
            Metadata = [ordered]@{}
            Body = @()
            Defect = 'Current task file is empty.'
        }
    }

    if ($content[0] -ne '---') {
        return [pscustomobject]@{
            Exists = $true
            IsEmpty = $false
            HasMetadata = $false
            IsValid = $false
            Metadata = [ordered]@{}
            Body = $content
            Defect = 'Current task file has no machine-readable front matter.'
        }
    }

    $endIndex = -1
    for ($index = 1; $index -lt $content.Count; $index++) {
        if ($content[$index] -eq '---') {
            $endIndex = $index
            break
        }
    }

    if ($endIndex -lt 0) {
        return [pscustomobject]@{
            Exists = $true
            IsEmpty = $false
            HasMetadata = $false
            IsValid = $false
            Metadata = [ordered]@{}
            Body = $content
            Defect = 'Current task front matter is not closed.'
        }
    }

    $metadata = [ordered]@{}
    for ($index = 1; $index -lt $endIndex; $index++) {
        if ($content[$index] -match '^\s*([^:#]+)\s*:\s*(.*)\s*$') {
            $key = $Matches[1].Trim()
            $value = $Matches[2].Trim()
            $metadata[$key] = $value
        }
    }

    $body = if (($endIndex + 1) -lt $content.Count) {
        @($content[($endIndex + 1)..($content.Count - 1)])
    } else {
        @()
    }

    $missingKeys = @($script:MetadataKeys | Where-Object { -not $metadata.Contains($_) })
    if ($missingKeys.Count -gt 0) {
        return [pscustomobject]@{
            Exists = $true
            IsEmpty = $false
            HasMetadata = $true
            IsValid = $false
            Metadata = $metadata
            Body = $body
            Defect = "Current task front matter is missing required field(s): $($missingKeys -join ', ')."
        }
    }

    if ($script:AllStatuses -notcontains $metadata['status']) {
        return [pscustomobject]@{
            Exists = $true
            IsEmpty = $false
            HasMetadata = $true
            IsValid = $false
            Metadata = $metadata
            Body = $body
            Defect = "Current task status is not canonical: $($metadata['status'])."
        }
    }

    return [pscustomobject]@{
        Exists = $true
        IsEmpty = $false
        HasMetadata = $true
        IsValid = $true
        Metadata = $metadata
        Body = $body
        Defect = ''
    }
}

function New-CurrentTaskLines {
    param(
        [Parameter(Mandatory)]
        [System.Collections.IDictionary]$Metadata,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Body
    )

    $lines = @('---')
    foreach ($key in $script:MetadataKeys) {
        $value = if ($Metadata.Contains($key) -and $null -ne $Metadata[$key]) {
            [string]$Metadata[$key]
        } else {
            ''
        }

        $lines += "${key}: $value"
    }

    $lines += '---'
    $lines += ''

    if ($Body.Count -gt 0) {
        $lines += $Body
    } else {
        $lines += '# Current Task'
        $lines += ''
        $lines += "Status: $($Metadata['status'])"
    }

    return $lines
}

function Save-AtomicLines {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Lines,

        [Parameter(Mandatory)]
        [string]$Operation
    )

    $directory = Split-Path -Path $Path -Parent
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) {
        if ($script:QueueResolverCmdlet.ShouldProcess($directory, 'Create directory')) {
            New-Item -Path $directory -ItemType Directory -Force | Out-Null
        }
    }

    $backupPath = 'none'
    $tempPath = Join-Path -Path $directory -ChildPath ('.' + [System.IO.Path]::GetFileName($Path) + '.' + [System.Guid]::NewGuid().ToString('N') + '.tmp')
    if ($script:QueueResolverCmdlet.ShouldProcess($Path, $Operation)) {
        if (Test-Path -LiteralPath $Path -PathType Leaf) {
            $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss-fffffff'
            $backupPath = "$Path.$timestamp.bak"
            Copy-Item -LiteralPath $Path -Destination $backupPath -Force
        }

        Set-Content -LiteralPath $tempPath -Value $Lines -Encoding UTF8
        Move-Item -LiteralPath $tempPath -Destination $Path -Force
    }

    return [pscustomobject]@{
        Path = $Path
        BackupPath = $backupPath
        TempPath = $tempPath
        Operation = $Operation
    }
}

function Read-TodoQueue {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath
    )

    $content = if (Test-Path -LiteralPath $Path -PathType Leaf) {
        @(Get-Content -LiteralPath $Path -Encoding UTF8)
    } else {
        @('# AI Todo', '')
    }

    return ConvertTo-TodoSnapshot -Path $Path -Content $content -ProjectRootPath $ProjectRootPath
}

function ConvertTo-TodoSnapshot {
    param(
        [Parameter(Mandatory)]
        [string]$Path,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [AllowEmptyString()]
        [string[]]$Content,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath
    )

    $entries = @()
    for ($index = 0; $index -lt $Content.Count; $index++) {
        $line = $Content[$index]
        if ($line -match '^\s*-\s+\[(?<check>[ xX])\]\s+(?:\[projectId:\s*(?<projectId>[^\]]+)\]\s+)?(?:\[taskId:\s*(?<taskId>[^\]]+)\]\s+)?`(?<path>[^`]+)`\s+-\s*(?<status>.+?)\s*$') {
            $queuePath = ConvertTo-NormalizedQueuePath -PathValue $Matches['path'] -ProjectRootPath $ProjectRootPath
            $entryProjectId = if ($Matches['projectId']) { $Matches['projectId'].Trim() } else { '' }
            $entryTaskId = if ($Matches['taskId']) { $Matches['taskId'].Trim() } else { '' }
            $entries += [pscustomobject]@{
                Index = $index
                Checked = $Matches['check']
                ProjectId = $entryProjectId
                TaskId = $entryTaskId
                QueuePath = $queuePath
                Status = $Matches['status'].Trim()
                ComparisonKey = Get-QueueComparisonKey -PathValue $queuePath -ProjectRootPath $ProjectRootPath
                IsProjectScoped = -not [string]::IsNullOrWhiteSpace($entryProjectId)
                IsStructurallyValid = (-not [string]::IsNullOrWhiteSpace($entryProjectId)) -and (-not [string]::IsNullOrWhiteSpace($entryTaskId))
                OriginalLine = $line
            }
        }
    }

    return [pscustomobject]@{
        Path = $Path
        Content = $Content
        Entries = $entries
    }
}

function New-TodoLine {
    param(
        [Parameter(Mandatory)]
        [string]$QueuePath,

        [AllowEmptyString()]
        [string]$ProjectId,

        [AllowEmptyString()]
        [string]$TaskId,

        [Parameter(Mandatory)]
        [ValidateSet(' ', 'x')]
        [string]$Checked,

        [Parameter(Mandatory)]
        [string]$Status
    )

    $metadataPrefix = ''
    if (-not [string]::IsNullOrWhiteSpace($ProjectId)) {
        $metadataPrefix += "[projectId: $ProjectId] "
    }

    if (-not [string]::IsNullOrWhiteSpace($TaskId)) {
        $metadataPrefix += "[taskId: $TaskId] "
    }

    return '- [' + $Checked + '] ' + $metadataPrefix + '`' + $QueuePath + '` - ' + $Status
}

function Set-TodoEntryStatus {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Todo,

        [Parameter(Mandatory)]
        [pscustomobject]$Entry,

        [Parameter(Mandatory)]
        [string]$Status,

        [Parameter(Mandatory)]
        [ValidateSet(' ', 'x')]
        [string]$Checked
    )

    $updatedContent = @($Todo.Content)
    $updatedContent[$Entry.Index] = New-TodoLine -QueuePath $Entry.QueuePath -ProjectId $Entry.ProjectId -TaskId $Entry.TaskId -Checked $Checked -Status $Status
    return $updatedContent
}

function Find-TodoEntryByPath {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Todo,

        [Parameter(Mandatory)]
        [string]$PathValue,

        [Parameter(Mandatory)]
        [string]$ActiveProjectId,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath
    )

    $key = Get-QueueComparisonKey -PathValue $PathValue -ProjectRootPath $ProjectRootPath
    return @($Todo.Entries | Where-Object { $_.ComparisonKey -eq $key -and $_.ProjectId -eq $ActiveProjectId } | Select-Object -First 1)
}

function Get-EligibleQueueEntry {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Todo,

        [Parameter(Mandatory)]
        [string]$ActiveProjectId
    )

    return @(
        $Todo.Entries |
            Where-Object {
                $_.Checked -ne 'x' -and
                $_.Checked -ne 'X' -and
                $_.IsStructurallyValid -and
                $_.ProjectId -eq $ActiveProjectId -and
                @('Ready', 'Queued') -contains $_.Status
            } |
            Select-Object -First 1
    )
}

function New-Metadata {
    param(
        [Parameter(Mandatory)]
        [string]$Status,

        [Parameter(Mandatory)]
        [string]$TaskId,

        [Parameter(Mandatory)]
        [pscustomobject]$ProjectIdentity,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$PromptPath,

        [Parameter(Mandatory)]
        [AllowEmptyString()]
        [string]$QueueEntryId,

        [Parameter(Mandatory)]
        [string]$Source,

        [AllowEmptyString()]
        [string]$ExecutionIdValue
    )

    $metadata = [ordered]@{}
    $metadata['schemaVersion'] = '1'
    $metadata['taskId'] = $TaskId
    $metadata['projectId'] = $ProjectIdentity.ProjectId
    $metadata['projectRoot'] = $ProjectIdentity.ProjectRoot
    $metadata['status'] = $Status
    $metadata['promptPath'] = $PromptPath
    $metadata['queueEntryId'] = $QueueEntryId
    $metadata['source'] = $Source
    $metadata['executionId'] = if ($null -eq $ExecutionIdValue) { '' } else { $ExecutionIdValue }
    $metadata['updatedAt'] = (Get-Date).ToUniversalTime().ToString('o')
    $metadata['claimedByAgent'] = 'codex'
    $metadata['claimedByComputer'] = if ([string]::IsNullOrWhiteSpace($env:COMPUTERNAME)) { '' } else { $env:COMPUTERNAME }
    $metadata['claimedWorkspaceRoot'] = $ProjectIdentity.ProjectRoot
    return $metadata
}

function New-CurrentTaskFromPrompt {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Entry,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath,

        [Parameter(Mandatory)]
        [string]$AiRootPath,

        [Parameter(Mandatory)]
        [pscustomobject]$ProjectIdentity
    )

    $promptFullPath = Resolve-PromptFullPath -PromptPath $Entry.QueuePath -ProjectRootPath $ProjectRootPath -AiRootPath $AiRootPath
    if (-not (Test-Path -LiteralPath $promptFullPath -PathType Leaf)) {
        return [pscustomobject]@{
            Exists = $false
            PromptFullPath = $promptFullPath
            Metadata = New-Metadata -Status 'Blocked' -TaskId $Entry.TaskId -ProjectIdentity $ProjectIdentity -PromptPath $Entry.QueuePath -QueueEntryId $Entry.QueuePath -Source 'Queue' -ExecutionIdValue ''
            Body = @(
                '# Current Task'
                ''
                'Status: Blocked'
                ''
                "Blocking defect: queued prompt file is missing."
                ''
                "Missing prompt path: $promptFullPath"
            )
        }
    }

    try {
        $promptValidation = Test-AiPromptProjectMetadata -PromptPath $promptFullPath -Identity $ProjectIdentity -RequireTaskId
        $promptTaskId = [string]$promptValidation.Metadata['taskId']
        if ($promptTaskId -ne $Entry.TaskId) {
            throw "Fatal task validation error: prompt taskId '$promptTaskId' does not match queue taskId '$($Entry.TaskId)'."
        }
    } catch {
        return [pscustomobject]@{
            Exists = $false
            PromptFullPath = $promptFullPath
            Metadata = New-Metadata -Status 'Blocked' -TaskId $Entry.TaskId -ProjectIdentity $ProjectIdentity -PromptPath $Entry.QueuePath -QueueEntryId $Entry.QueuePath -Source 'Queue' -ExecutionIdValue ''
            Body = @(
                '# Current Task'
                ''
                'Status: Blocked'
                ''
                "Blocking defect: $($_.Exception.Message)"
            )
            BlockingDefect = $_.Exception.Message
        }
    }

    return [pscustomobject]@{
        Exists = $true
        PromptFullPath = $promptFullPath
        Metadata = New-Metadata -Status 'Loaded' -TaskId $Entry.TaskId -ProjectIdentity $ProjectIdentity -PromptPath $Entry.QueuePath -QueueEntryId $Entry.QueuePath -Source 'Queue' -ExecutionIdValue ''
        Body = @(Get-Content -LiteralPath $promptFullPath -Encoding UTF8)
    }
}

function Enter-QueueLock {
    param(
        [Parameter(Mandatory)]
        [string]$AiRootPath
    )

    if ($WhatIfPreference) {
        return $null
    }

    $lockPath = Join-Path -Path $AiRootPath -ChildPath '.task-queue.lock'
    if (-not $script:QueueResolverCmdlet.ShouldProcess($lockPath, 'Acquire queue mutation lock')) {
        return $null
    }

    try {
        $stream = [System.IO.File]::Open($lockPath, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
        $writer = [System.IO.StreamWriter]::new($stream)
        $writer.WriteLine("pid=$PID")
        $writer.WriteLine("acquiredAt=$((Get-Date).ToUniversalTime().ToString('o'))")
        $writer.Flush()
        return [pscustomobject]@{
            Path = $lockPath
            Stream = $stream
            Writer = $writer
        }
    } catch {
        throw "Unable to acquire queue mutation lock: $lockPath. $($_.Exception.Message)"
    }
}

function Exit-QueueLock {
    param(
        [AllowNull()]
        [pscustomobject]$Lock
    )

    if ($null -eq $Lock) {
        return
    }

    $Lock.Writer.Dispose()
    $Lock.Stream.Dispose()
    if (Test-Path -LiteralPath $Lock.Path -PathType Leaf) {
        Remove-Item -LiteralPath $Lock.Path -Force
    }
}

function New-Result {
    param(
        [Parameter(Mandatory)]
        [string]$ResolvedAction,

        [Parameter(Mandatory)]
        [string]$CurrentStatus,

        [string]$PromotedPromptPath,

        [string]$PromotedTaskId,

        [string]$BlockingDefect,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [string[]]$Mutations,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [string[]]$Backups,

        [Parameter(Mandatory)]
        [pscustomobject]$Todo,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath,

        [Parameter(Mandatory)]
        [string]$ActiveProjectId,

        [Parameter(Mandatory)]
        [string]$AiRootPath,

        [Parameter(Mandatory)]
        [string]$ResolvedTodoPath,

        [Parameter(Mandatory)]
        [string]$ResolvedCurrentTaskPath
    )

    $remaining = @($Todo.Entries | Where-Object {
        $_.Checked -ne 'x' -and
        $_.Checked -ne 'X' -and
        $_.IsStructurallyValid -and
        $_.ProjectId -eq $ActiveProjectId -and
        @('Ready', 'Queued') -contains $_.Status
    }).Count

    $projectless = @($Todo.Entries | Where-Object {
        $_.Checked -ne 'x' -and
        $_.Checked -ne 'X' -and
        -not $_.IsProjectScoped
    }).Count

    $otherProject = @($Todo.Entries | Where-Object {
        $_.Checked -ne 'x' -and
        $_.Checked -ne 'X' -and
        $_.IsProjectScoped -and
        $_.ProjectId -ne $ActiveProjectId
    }).Count

    return [pscustomobject]@{
        action = $ResolvedAction
        requestedAction = $Action
        projectId = $ActiveProjectId
        projectRoot = $ProjectRootPath
        aiRoot = $AiRootPath
        todoPath = $ResolvedTodoPath
        currentTaskPath = $ResolvedCurrentTaskPath
        currentStatus = $CurrentStatus
        promotedPromptPath = if ($null -eq $PromotedPromptPath) { '' } else { $PromotedPromptPath }
        promotedTaskId = if ($null -eq $PromotedTaskId) { '' } else { $PromotedTaskId }
        queueRemaining = $remaining
        queueEntries = $Todo.Entries.Count
        queueProjectlessEntries = $projectless
        queueOtherProjectEntries = $otherProject
        blockingDefect = if ($null -eq $BlockingDefect) { '' } else { $BlockingDefect }
        mutations = $Mutations
        backups = $Backups
        timestamp = (Get-Date).ToUniversalTime().ToString('o')
    }
}

function Complete-CurrentTask {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Current,

        [Parameter(Mandatory)]
        [pscustomobject]$ProjectIdentity,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath,

        [Parameter(Mandatory)]
        [string]$ResolvedCurrentTaskPath
    )

    $metadata = [ordered]@{}
    $body = @($Current.Body)

    if ($Current.HasMetadata -and $Current.Metadata.Count -gt 0) {
        foreach ($key in $script:MetadataKeys) {
            $metadata[$key] = if ($Current.Metadata.Contains($key)) { $Current.Metadata[$key] } else { '' }
        }
    } else {
        $promptPathValue = if (-not [string]::IsNullOrWhiteSpace($LegacyPromptPath)) {
            ConvertTo-NormalizedQueuePath -PathValue $LegacyPromptPath -ProjectRootPath $ProjectRootPath
        } else {
            ConvertTo-RelativePath -PathValue $ResolvedCurrentTaskPath -BasePath $ProjectRootPath
        }

        $queueEntryValue = if (-not [string]::IsNullOrWhiteSpace($LegacyQueueEntryId)) {
            ConvertTo-NormalizedQueuePath -PathValue $LegacyQueueEntryId -ProjectRootPath $ProjectRootPath
        } else {
            ''
        }

        $taskIdValue = if (-not [string]::IsNullOrWhiteSpace($LegacyTaskId)) {
            $LegacyTaskId
        } else {
            New-TaskId -Seed $promptPathValue
        }

        $metadata = New-Metadata -Status $CompletionStatus -TaskId $taskIdValue -ProjectIdentity $ProjectIdentity -PromptPath $promptPathValue -QueueEntryId $queueEntryValue -Source $LegacySource -ExecutionIdValue $ExecutionId
    }

    $metadata['projectId'] = $ProjectIdentity.ProjectId
    $metadata['projectRoot'] = $ProjectIdentity.ProjectRoot
    $metadata['status'] = $CompletionStatus
    $metadata['executionId'] = if ($null -eq $ExecutionId) { '' } else { $ExecutionId }
    $metadata['updatedAt'] = (Get-Date).ToUniversalTime().ToString('o')
    $metadata['claimedByAgent'] = 'codex'
    $metadata['claimedByComputer'] = if ([string]::IsNullOrWhiteSpace($env:COMPUTERNAME)) { '' } else { $env:COMPUTERNAME }
    $metadata['claimedWorkspaceRoot'] = $ProjectIdentity.ProjectRoot

    $lines = New-CurrentTaskLines -Metadata $metadata -Body $body
    $writeResult = Save-AtomicLines -Path $ResolvedCurrentTaskPath -Lines $lines -Operation "Persist current task as $CompletionStatus"

    return [pscustomobject]@{
        Current = [pscustomobject]@{
            Exists = $true
            IsEmpty = $false
            HasMetadata = $true
            IsValid = $true
            Metadata = $metadata
            Body = $body
            Defect = ''
        }
        WriteResult = $writeResult
    }
}

function Invoke-AdvanceTask {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Current,

        [Parameter(Mandatory)]
        [pscustomobject]$ProjectIdentity,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath,

        [Parameter(Mandatory)]
        [string]$AiRootPath,

        [Parameter(Mandatory)]
        [string]$ResolvedTodoPath,

        [Parameter(Mandatory)]
        [string]$ResolvedCurrentTaskPath,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [string[]]$InitialMutations,

        [Parameter(Mandatory)]
        [AllowEmptyCollection()]
        [string[]]$InitialBackups
    )

    $mutations = @($InitialMutations)
    $backups = @($InitialBackups)
    $todo = Read-TodoQueue -Path $ResolvedTodoPath -ProjectRootPath $ProjectRootPath
    $todoContent = @($todo.Content)
    $todoChanged = $false

    if ($Current.HasMetadata -and $Current.Metadata.Count -gt 0 -and $script:TerminalStatuses -contains $Current.Metadata['status']) {
        $matchPath = if (-not [string]::IsNullOrWhiteSpace($Current.Metadata['queueEntryId'])) {
            $Current.Metadata['queueEntryId']
        } else {
            $Current.Metadata['promptPath']
        }

        if (-not [string]::IsNullOrWhiteSpace($matchPath)) {
            $matchingEntry = @(Find-TodoEntryByPath -Todo $todo -PathValue $matchPath -ActiveProjectId $ProjectIdentity.ProjectId -ProjectRootPath $ProjectRootPath)
            if ($matchingEntry.Count -gt 0 -and $matchingEntry[0].Status -ne $Current.Metadata['status']) {
                $todoContent = Set-TodoEntryStatus -Todo $todo -Entry $matchingEntry[0] -Status $Current.Metadata['status'] -Checked 'x'
                $todoChanged = $true
                $mutations += "Finalized queue entry $($matchingEntry[0].QueuePath) as $($Current.Metadata['status'])."
                $todo = ConvertTo-TodoSnapshot -Path $ResolvedTodoPath -Content $todoContent -ProjectRootPath $ProjectRootPath
            }
        }
    }

    $eligibleEntry = @(Get-EligibleQueueEntry -Todo $todo -ActiveProjectId $ProjectIdentity.ProjectId)
    if ($eligibleEntry.Count -eq 0) {
        $idleMetadata = New-Metadata -Status 'Idle' -TaskId 'idle' -ProjectIdentity $ProjectIdentity -PromptPath '' -QueueEntryId '' -Source 'Recovery' -ExecutionIdValue ''
        $idleLines = New-CurrentTaskLines -Metadata $idleMetadata -Body @('# Current Task', '', 'Status: Idle')
        $writeResult = Save-AtomicLines -Path $ResolvedCurrentTaskPath -Lines $idleLines -Operation 'Write Idle current task state'
        $backups += $writeResult.BackupPath
        $mutations += 'Wrote Idle current task state.'

        if ($todoChanged) {
            $todoWrite = Save-AtomicLines -Path $ResolvedTodoPath -Lines $todoContent -Operation 'Finalize completed queue entry'
            $backups += $todoWrite.BackupPath
            $todo = ConvertTo-TodoSnapshot -Path $ResolvedTodoPath -Content $todoContent -ProjectRootPath $ProjectRootPath
        }

        return New-Result -ResolvedAction 'Idle' -CurrentStatus 'Idle' -Mutations $mutations -Backups $backups -Todo $todo -ProjectRootPath $ProjectRootPath -ActiveProjectId $ProjectIdentity.ProjectId -AiRootPath $AiRootPath -ResolvedTodoPath $ResolvedTodoPath -ResolvedCurrentTaskPath $ResolvedCurrentTaskPath
    }

    $selectedEntry = $eligibleEntry[0]
    $currentFromPrompt = New-CurrentTaskFromPrompt -Entry $selectedEntry -ProjectRootPath $ProjectRootPath -AiRootPath $AiRootPath -ProjectIdentity $ProjectIdentity
    $currentLines = New-CurrentTaskLines -Metadata $currentFromPrompt.Metadata -Body $currentFromPrompt.Body

    if (-not $currentFromPrompt.Exists) {
        $writeResult = Save-AtomicLines -Path $ResolvedCurrentTaskPath -Lines $currentLines -Operation 'Write Blocked current task state for missing queued prompt'
        $backups += $writeResult.BackupPath
        $mutations += "Wrote Blocked current task state for missing prompt $($selectedEntry.QueuePath)."

        if ($todoChanged) {
            $todoWrite = Save-AtomicLines -Path $ResolvedTodoPath -Lines $todoContent -Operation 'Finalize completed queue entry'
            $backups += $todoWrite.BackupPath
            $todo = ConvertTo-TodoSnapshot -Path $ResolvedTodoPath -Content $todoContent -ProjectRootPath $ProjectRootPath
        }

        $blockingDefect = if ($currentFromPrompt.PSObject.Properties.Name.Contains('BlockingDefect') -and -not [string]::IsNullOrWhiteSpace($currentFromPrompt.BlockingDefect)) {
            $currentFromPrompt.BlockingDefect
        } else {
            "Queued prompt file is missing: $($currentFromPrompt.PromptFullPath)"
        }

        return New-Result -ResolvedAction 'Blocked' -CurrentStatus 'Blocked' -PromotedPromptPath $selectedEntry.QueuePath -PromotedTaskId $currentFromPrompt.Metadata['taskId'] -BlockingDefect $blockingDefect -Mutations $mutations -Backups $backups -Todo $todo -ProjectRootPath $ProjectRootPath -ActiveProjectId $ProjectIdentity.ProjectId -AiRootPath $AiRootPath -ResolvedTodoPath $ResolvedTodoPath -ResolvedCurrentTaskPath $ResolvedCurrentTaskPath
    }

    $currentWrite = Save-AtomicLines -Path $ResolvedCurrentTaskPath -Lines $currentLines -Operation "Promote queued task $($selectedEntry.QueuePath)"
    $backups += $currentWrite.BackupPath
    $mutations += "Promoted queued task $($selectedEntry.QueuePath)."

    $todoContent = Set-TodoEntryStatus -Todo $todo -Entry $selectedEntry -Status 'Loaded' -Checked 'x'
    $todoWrite = Save-AtomicLines -Path $ResolvedTodoPath -Lines $todoContent -Operation "Mark queued task $($selectedEntry.QueuePath) as Loaded"
    $backups += $todoWrite.BackupPath
    $todo = ConvertTo-TodoSnapshot -Path $ResolvedTodoPath -Content $todoContent -ProjectRootPath $ProjectRootPath

    return New-Result -ResolvedAction 'Promoted' -CurrentStatus 'Loaded' -PromotedPromptPath $selectedEntry.QueuePath -PromotedTaskId $currentFromPrompt.Metadata['taskId'] -Mutations $mutations -Backups $backups -Todo $todo -ProjectRootPath $ProjectRootPath -ActiveProjectId $ProjectIdentity.ProjectId -AiRootPath $AiRootPath -ResolvedTodoPath $ResolvedTodoPath -ResolvedCurrentTaskPath $ResolvedCurrentTaskPath
}

function Test-CurrentTaskProjectState {
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Current,

        [Parameter(Mandatory)]
        [pscustomobject]$ProjectIdentity,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath,

        [Parameter(Mandatory)]
        [string]$AiRootPath
    )

    if (-not $Current.HasMetadata -or -not $Current.IsValid) {
        return ''
    }

    if ($Current.Metadata['status'] -eq 'Idle') {
        return ''
    }

    if ($Current.Metadata['projectId'] -ne $ProjectIdentity.ProjectId) {
        return "Current task projectId '$($Current.Metadata['projectId'])' does not match active project '$($ProjectIdentity.ProjectId)'."
    }

    if ((ConvertTo-AiComparablePath -PathValue $Current.Metadata['projectRoot']) -ne (ConvertTo-AiComparablePath -PathValue $ProjectIdentity.ProjectRoot)) {
        return "Current task projectRoot '$($Current.Metadata['projectRoot'])' does not match active project root '$($ProjectIdentity.ProjectRoot)'."
    }

    if ($script:ActiveStatuses -notcontains $Current.Metadata['status']) {
        return ''
    }

    if ([string]::IsNullOrWhiteSpace($Current.Metadata['promptPath'])) {
        return ''
    }

    $promptFullPath = Resolve-PromptFullPath -PromptPath $Current.Metadata['promptPath'] -ProjectRootPath $ProjectRootPath -AiRootPath $AiRootPath
    if (-not (Test-Path -LiteralPath $promptFullPath -PathType Leaf)) {
        return "Current task prompt file is missing: $promptFullPath."
    }

    try {
        $promptValidation = Test-AiPromptProjectMetadata -PromptPath $promptFullPath -Identity $ProjectIdentity -RequireTaskId
        $promptTaskId = [string]$promptValidation.Metadata['taskId']
        if ($promptTaskId -ne $Current.Metadata['taskId']) {
            return "Current task taskId '$($Current.Metadata['taskId'])' does not match prompt taskId '$promptTaskId'."
        }
    } catch {
        return $_.Exception.Message
    }

    return ''
}

function New-CurrentTaskFromExplicitPrompt {
    param(
        [Parameter(Mandatory)]
        [string]$PromptPath,

        [Parameter(Mandatory)]
        [pscustomobject]$ProjectIdentity,

        [Parameter(Mandatory)]
        [string]$ProjectRootPath,

        [Parameter(Mandatory)]
        [string]$AiRootPath
    )

    $promptFullPath = Resolve-PromptFullPath -PromptPath $PromptPath -ProjectRootPath $ProjectRootPath -AiRootPath $AiRootPath
    $promptValidation = Test-AiPromptProjectMetadata -PromptPath $promptFullPath -Identity $ProjectIdentity -RequireTaskId
    $queuePath = ConvertTo-NormalizedQueuePath -PathValue $promptFullPath -ProjectRootPath $ProjectRootPath
    $taskId = [string]$promptValidation.Metadata['taskId']

    return [pscustomobject]@{
        PromptFullPath = $promptFullPath
        QueuePath = $queuePath
        TaskId = $taskId
        Metadata = New-Metadata -Status 'Loaded' -TaskId $taskId -ProjectIdentity $ProjectIdentity -PromptPath $queuePath -QueueEntryId '' -Source 'ExplicitPath' -ExecutionIdValue ''
        Body = @(Get-Content -LiteralPath $promptFullPath -Encoding UTF8)
    }
}

$projectIdentity = Read-AiProjectIdentity -ProjectRoot $ProjectRoot
if (-not [string]::IsNullOrWhiteSpace($ProjectId) -and $ProjectId -ne $projectIdentity.ProjectId) {
    throw "Fatal project identity error: supplied ProjectId '$ProjectId' does not match active project '$($projectIdentity.ProjectId)'."
}

$resolvedProjectRoot = $projectIdentity.ProjectRoot
$resolvedAiRoot = Resolve-AiActiveRoot -ProjectRoot $resolvedProjectRoot -ExplicitAiRoot $AiRoot
$resolvedTodoPath = if (-not [string]::IsNullOrWhiteSpace($TodoPath)) {
    Resolve-FullPath -PathValue $TodoPath -BasePath $resolvedProjectRoot
} else {
    Join-Path -Path $resolvedAiRoot -ChildPath 'Todo.md'
}
$resolvedCurrentTaskPath = if (-not [string]::IsNullOrWhiteSpace($CurrentTaskPath)) {
    Resolve-FullPath -PathValue $CurrentTaskPath -BasePath $resolvedProjectRoot
} else {
    Join-Path -Path $resolvedAiRoot -ChildPath 'Prompts\currentTask.md'
}

$lock = Enter-QueueLock -AiRootPath $resolvedAiRoot
try {
    $mutations = @()
    $backups = @()
    $todoSnapshot = Read-TodoQueue -Path $resolvedTodoPath -ProjectRootPath $resolvedProjectRoot

    if (-not [string]::IsNullOrWhiteSpace($ExplicitPromptPath)) {
        try {
            $explicitTask = New-CurrentTaskFromExplicitPrompt -PromptPath $ExplicitPromptPath -ProjectIdentity $projectIdentity -ProjectRootPath $resolvedProjectRoot -AiRootPath $resolvedAiRoot
            $explicitLines = New-CurrentTaskLines -Metadata $explicitTask.Metadata -Body $explicitTask.Body
            $writeResult = Save-AtomicLines -Path $resolvedCurrentTaskPath -Lines $explicitLines -Operation "Load explicit prompt $($explicitTask.QueuePath)"
            $backups += $writeResult.BackupPath
            $mutations += "Loaded explicit prompt $($explicitTask.QueuePath) for project $($projectIdentity.ProjectId)."
            $result = New-Result -ResolvedAction 'ExplicitPathLoaded' -CurrentStatus 'Loaded' -PromotedPromptPath $explicitTask.QueuePath -PromotedTaskId $explicitTask.TaskId -Mutations $mutations -Backups $backups -Todo $todoSnapshot -ProjectRootPath $resolvedProjectRoot -ActiveProjectId $projectIdentity.ProjectId -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
        } catch {
            $result = New-Result -ResolvedAction 'Blocked' -CurrentStatus 'Blocked' -BlockingDefect $_.Exception.Message -Mutations $mutations -Backups $backups -Todo $todoSnapshot -ProjectRootPath $resolvedProjectRoot -ActiveProjectId $projectIdentity.ProjectId -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
        }
    } else {
        $current = Read-CurrentTaskState -Path $resolvedCurrentTaskPath

        if ($Action -eq 'Complete') {
            $completed = Complete-CurrentTask -Current $current -ProjectIdentity $projectIdentity -ProjectRootPath $resolvedProjectRoot -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
            $current = $completed.Current
            $mutations += "Persisted current task as $CompletionStatus."
            $backups += $completed.WriteResult.BackupPath
        }

        $projectDefect = Test-CurrentTaskProjectState -Current $current -ProjectIdentity $projectIdentity -ProjectRootPath $resolvedProjectRoot -AiRootPath $resolvedAiRoot

        if ($current.IsEmpty -or -not $current.Exists) {
            $result = Invoke-AdvanceTask -Current $current -ProjectIdentity $projectIdentity -ProjectRootPath $resolvedProjectRoot -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath -InitialMutations $mutations -InitialBackups $backups
        } elseif (-not $current.HasMetadata -or -not $current.IsValid) {
            $result = New-Result -ResolvedAction 'Blocked' -CurrentStatus 'Blocked' -BlockingDefect $current.Defect -Mutations $mutations -Backups $backups -Todo $todoSnapshot -ProjectRootPath $resolvedProjectRoot -ActiveProjectId $projectIdentity.ProjectId -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
        } elseif (-not [string]::IsNullOrWhiteSpace($projectDefect)) {
            $result = New-Result -ResolvedAction 'Blocked' -CurrentStatus 'Blocked' -BlockingDefect $projectDefect -Mutations $mutations -Backups $backups -Todo $todoSnapshot -ProjectRootPath $resolvedProjectRoot -ActiveProjectId $projectIdentity.ProjectId -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
        } elseif ($script:ActiveStatuses -contains $current.Metadata['status']) {
            $result = New-Result -ResolvedAction 'Retained' -CurrentStatus $current.Metadata['status'] -Mutations $mutations -Backups $backups -Todo $todoSnapshot -ProjectRootPath $resolvedProjectRoot -ActiveProjectId $projectIdentity.ProjectId -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
        } elseif ($script:InterventionStatuses -contains $current.Metadata['status']) {
            $result = New-Result -ResolvedAction 'InterventionRequired' -CurrentStatus $current.Metadata['status'] -BlockingDefect "Current task requires intervention: $($current.Metadata['status'])." -Mutations $mutations -Backups $backups -Todo $todoSnapshot -ProjectRootPath $resolvedProjectRoot -ActiveProjectId $projectIdentity.ProjectId -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
        } elseif ($current.Metadata['status'] -eq 'Idle' -or $script:TerminalStatuses -contains $current.Metadata['status'] -or $Action -eq 'Advance') {
            $result = Invoke-AdvanceTask -Current $current -ProjectIdentity $projectIdentity -ProjectRootPath $resolvedProjectRoot -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath -InitialMutations $mutations -InitialBackups $backups
        } else {
            $result = New-Result -ResolvedAction 'Blocked' -CurrentStatus 'Blocked' -BlockingDefect "Unhandled current task status: $($current.Metadata['status'])." -Mutations $mutations -Backups $backups -Todo $todoSnapshot -ProjectRootPath $resolvedProjectRoot -ActiveProjectId $projectIdentity.ProjectId -AiRootPath $resolvedAiRoot -ResolvedTodoPath $resolvedTodoPath -ResolvedCurrentTaskPath $resolvedCurrentTaskPath
        }
    }
} finally {
    Exit-QueueLock -Lock $lock
}

if ($Json) {
    $result | ConvertTo-Json -Depth 6
} else {
    $result
}
