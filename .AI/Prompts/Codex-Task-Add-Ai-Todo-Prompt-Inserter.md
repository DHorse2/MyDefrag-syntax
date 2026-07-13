# Codex Task: PowerShell AI Todo Inserter

Write a PowerShell 7 script that inserts a prompt file reference into the AI todo list so Codex can autodetect the next task.

## Goal

Create a script that can add a prompt file to either the bottom or top of the AI todo list.

This supports the existing AI/MCP run-control workflow where prompt/task files are durable workflow artifacts and Codex detects ready tasks from local files.

## Context

The AI/MCP project uses local prompt files and run-control todo files. Prompt files are durable workflow/history artifacts, not just temporary instructions.

Codex should inspect the local repository and existing `.AI`, `Prompt`, `Todo`, `RunControl`, or task-list files before choosing final paths.

## Requirements

Create a PowerShell script named:

`Add-AiTodoPrompt.ps1`

The script must:

- Accept a prompt file path.
- Add that prompt file to the AI todo list.
- Default to adding at the bottom.
- Support `-Top` to insert at the top.
- Validate that the prompt file exists.
- Preserve existing todo-list content.
- Avoid duplicate entries unless `-Force` is supplied.
- Use PowerShell 7-compatible syntax.
- Use approved verbs and clear parameter names.
- Include comment-based help.
- Use safe filesystem operations.
- Create a timestamped backup of the todo list before modifying it.
- Write clear status output showing:
  - prompt file inserted
  - todo list modified
  - insertion position
  - backup path

## Suggested Parameters

```powershell
param(
    [Parameter(Mandatory)]
    [string]$PromptPath,

    [string]$TodoPath,

    [switch]$Top,

    [switch]$Force
)
```

## Path Behavior

If `-TodoPath` is omitted, autodetect the todo file from likely project locations such as:

- `.AI\Todo.md`
- `.AI\Prompt\Todo.md`
- `.AI\Prompt\RunControl.md`
- `.AI\Prompt\currentTask.md`
- any existing local run-control/todo file already used by this project

Do not invent a new standard if an existing one is present. Prefer the current project convention.

## Entry Format

Use the existing todo-list format if one is found.

If no obvious format exists, use a simple Markdown task entry:

```markdown
- [ ] `<relative-or-absolute-prompt-path>` - Ready
```

Prefer relative paths when the prompt file is under the project root.

## Safety Rules

- Do not delete todo-list content.
- Do not reorder existing entries except when inserting with `-Top`.
- Do not modify the prompt file itself.
- Do not execute the prompt.
- This script only queues the prompt for later autodetection.

## Deliverables

- Add `Add-AiTodoPrompt.ps1` in the appropriate scripts/tools location.
- If the repository has a docs or README section for AI run control, add a short usage note.
- Provide examples:

```powershell
.\Add-AiTodoPrompt.ps1 -PromptPath ".AI\Prompt\Codex-Task-Change-Run-Journal-Storage.md"

.\Add-AiTodoPrompt.ps1 -PromptPath ".AI\Prompt\Codex-Task-Change-Run-Journal-Storage.md" -Top

.\Add-AiTodoPrompt.ps1 -PromptPath "D:\AI\.AI\Prompt\SomeTask.md" -TodoPath "D:\AI\.AI\Todo.md"
```

## Final Response

Report:

- files changed
- detected todo path
- backup created
- example command to add a prompt at the bottom
- example command to add a prompt at the top
