# AI Workspace

<!-- markdownlint-disable MD013 -->

## Purpose

This directory contains shared AI guidance, standards, context, prompts, workspace state, and result artifacts used across AI-assisted development.

It is intended for both human developers and AI tools. AI tools should normally begin with `Start_Here.md`.

## Directory Overview

| Path | Purpose |
| --- | --- |
| `Start_Here.md` | Primary AI bootstrap document and load-order manifest. |
| `Instructions.md` | Global operating instructions for AI assistants. |
| `Readme.md` | Human-readable overview of the `.AI` workspace. |
| `Session_Template.md` | Template for capturing session-level notes. |
| `Default_Search_Filter.md` | Default AI discovery input filter, similar in role to an AI-facing `.gitignore`. |
| `Standards` | Durable standards, formatting rules, schemas, and interoperability contracts. |
| `Context` | Durable project or domain knowledge. |
| `Prompts` | Reusable task prompts. |
| `Workspace` | Mutable working state, drafts, active filters, and temporary context. |
| `Results` | Generated outputs, execution records, diagnostics, reviews, and reports. |

## Current Implementation

The current implementation validates `<PROJECT_ROOT>\.vscode\ai-project.json`
before task loading, selects the active AI root once, and uses
`Prompts\currentTask.md` as the loaded runtime handoff unless the user supplies
another task path that passes project validation.

`currentTask.md` is the runtime execution handoff and restart checkpoint
generated immediately before execution. It is not the authoritative source of
work.

Use `Scripts\Add-AiTodoPrompt.ps1` to add reusable prompt files to the local
AI todo or run-control list for later autodetection. Every executable queue
entry must include a project identity:

```powershell
pwsh .AI\Scripts\Add-AiTodoPrompt.ps1 -PromptPath ".AI\Prompts\Codex-Task-Change-Run-Journal-Storage.md" -ProjectId "ai-workspace"
pwsh .AI\Scripts\Add-AiTodoPrompt.ps1 -PromptPath ".AI\Prompts\Codex-Task-Change-Run-Journal-Storage.md" -ProjectId "ai-workspace" -Top
pwsh .AI\Scripts\Add-AiTodoPrompt.ps1 -PromptPath "D:\AI\.AI\Prompts\SomeTask.md" -ProjectId "ai-workspace" -TodoPath "D:\AI\.AI\Todo.md"
```

Prompt files intended for queue insertion must declare front matter with
`taskId`, `projectId`, and `projectRoot`. Queue entries for other projects and
legacy projectless entries are preserved but are not eligible for active-project
`LOAD TASK` selection.

Reusable prompts are versioned execution procedures that may be associated with
one or more queue item types. Queue items reference prompts; they do not embed
execution procedures.

## Transitional Model

File-based execution records and run folders remain valid transitional
evidence packages.

An execution evidence package may include the prompt or current task, execution
record, metrics, command logs, tool-call logs, diagnostics, validation output,
modified-file inventories, patch output, and generated artifacts.

When Git is available, the Git diff is authoritative evidence of repository
changes. When Git is unavailable, execution records should state that
limitation and use filesystem evidence instead.

## Planned Enhancement

Future Run Control should manage project-scoped Execution Context objects.

An Execution Context connects:

- Project
- Runtime
- Window
- Agent
- Queue item
- Prompt reference
- Generated current task
- Run
- Artifacts
- Execution record
- Validation results
- Evidence package

Each project owns its own execution state, queues, prompt handoff artifacts,
execution records, run evidence, and artifacts. A singleton controller may
coordinate multiple VSCodium windows and Codex runtimes, but it does not own a
single global active task file for every project.

## Future Architecture

A Run should become a first-class database object.

Future persistence should relate the Run to the project, execution context,
agent, runtime, queue item, prompt, current task artifact, commands, tool
calls, files read, files changed, validation checks, diagnostics, metrics,
approvals, conversation evidence, Git diff, generated artifacts, and follow-up
recommendations.

Execution policy is fixed at run start.
Documentation may describe the next policy.
Future runs may adopt the revised policy.

## Folder Responsibilities

### Standards

`Standards` contains durable rules and specifications that can apply broadly across AI tools or projects.

Examples include:

- Markdown documentation standards.
- Output formatting rules.
- Execution record standards.
- Diagnostic interchange formats.
- Run Control conventions.

### Context

`Context` contains durable knowledge used to understand a project or domain.

Examples include:

- Project overview and objectives.
- Development rules.
- Coding standards.
- Architecture documentation.
- Key project files.
- Parser and subsystem documentation.
- Debugging workflows.

### Prompts

`Prompts` contains reusable instructions for common AI-assisted work.

Examples include:

- Code reviews.
- Feature implementation.
- Bug investigation.
- Documentation generation.
- Testing.
- Refactoring.
- Architecture analysis.

### Workspace

`Workspace` contains mutable working state and task-local material.

Examples include:

- Active task notes.
- Draft context.
- Temporary search filters.
- Working sets.
- Scratch files.

### Results

`Results` contains generated artifacts and evidence produced by agent runs.

Examples include:

- Execution records.
- Diagnostics.
- Review reports.
- File trees.
- Index summaries.
- Validation output.

## Design Philosophy

The `.AI` directory is intended to become a centralized knowledge and coordination workspace for AI-assisted development.

Rather than repeatedly supplying the same context in every conversation, durable knowledge is organized into reusable documents that can be selectively loaded as needed.

This approach provides:

- Consistent guidance across AI tools.
- Reduced prompt size.
- Easier maintenance of project knowledge.
- Separation between standards, context, prompts, workspace state, and generated results.
- A filesystem projection of future Run Control and MCP execution evidence.

## For AI Systems

AI assistants should begin with `Start_Here.md`, which specifies the required loading order for project documentation and standards.

When performing meaningful work, AI assistants should provide a structured response and, when practical, produce or describe an execution record according to `Standards/Execution_Record_Standard.md`.
