# Add-AiTodoPrompt.ps1
<#
.SYNOPSIS
Wrapper for the shared Add-AiTodoPromptDo.ps1 script.

.DESCRIPTION
Delegates to D:\AI\.AI\Scripts\Add-AiTodoPromptDo.ps1 while preserving the
public command parameters.

.PARAMETER PromptPath
Path to the prompt file to add to the AI todo list.

.PARAMETER TodoPath
Optional path to the todo list.

.PARAMETER ProjectId
Project identity assigned to the queued task.

.PARAMETER ProjectRoot
Optional project root used to validate ProjectId through
<ProjectRoot>\.vscode\ai-project.json.

.PARAMETER Position
Insert the prompt entry at the top or bottom. Valid values are top and bottom.
The default is bottom.

.PARAMETER Top
Backward-compatible switch that inserts the prompt entry at the top.

.PARAMETER Force
Add the prompt entry even when the todo list already references the prompt.

.EXAMPLE
Add-AiTodoPrompt.ps1 -PromptPath "D:\AI\.AI\Prompts\SomeTask.md" -ProjectId "ai-workspace"

.EXAMPLE
Add-AiTodoPrompt.ps1 -PromptPath ".AI\Prompts\SomeTask.md" -ProjectId "ai-workspace" -Position top -WhatIf

.EXAMPLE
Add-AiTodoPrompt.ps1 -PromptPath ".AI\Prompts\SomeTask.md" -ProjectId "ai-workspace" -Top -WhatIf
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

if ($Top -and $PSBoundParameters.ContainsKey('Position') -and $Position -eq 'bottom') {
    throw "Parameters -Top and -Position bottom cannot be used together."
}

$targetScript = 'D:\AI\.AI\Scripts\Add-AiTodoPromptDo.ps1'

if (-not (Test-Path -LiteralPath $targetScript -PathType Leaf)) {
    throw "Target script does not exist: $targetScript"
}

$forwardedParameters = @{
    PromptPath = $PromptPath
}

if ($PSBoundParameters.ContainsKey('TodoPath')) {
    $forwardedParameters.TodoPath = $TodoPath
}

if ($PSBoundParameters.ContainsKey('ProjectId')) {
    $forwardedParameters.ProjectId = $ProjectId
}

if ($PSBoundParameters.ContainsKey('ProjectRoot')) {
    $forwardedParameters.ProjectRoot = $ProjectRoot
}

if ($PSBoundParameters.ContainsKey('Position')) {
    $forwardedParameters.Position = $Position
}

if ($Top) {
    $forwardedParameters.Top = $true
}

if ($Force) {
    $forwardedParameters.Force = $true
}

if ($WhatIfPreference) {
    $forwardedParameters.WhatIf = $true
}

& $targetScript @forwardedParameters
