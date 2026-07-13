# Current Task

## Title

Revise AI documentation for project-scoped execution contexts and run database objects.

## Objective

Review and update the AI-side documentation so it reflects the next architectural step in the AI execution model.

The system is moving toward an implementation where a **Run is a first-class database object**, developed incrementally in steps. The current file-based execution records and run folders remain valid transitional evidence packages, but the documentation should now describe how they map toward a future persisted run model.

A project-scoped queue and runtime architecture document has already been saved locally in the AI workspace. Use that document as source architecture material.

Reference architecture document:

```text
D:\AI\MCP\Architecture\Project-Scoped-Queue-and-Runtime-Architecture.md
```

If that exact path is not present, search the AI workspace for:

```text
Project-Scoped-Queue-and-Runtime-Architecture.md
```

Also use the prior run evidence from:

```text
D:\AI\runs\2026-07-07\20260707-1944-ai-doc-queue-execution
```

## Current Implementation Context

The current implementation still uses:

```text
D:\AI\.AI\Prompts\currentTask.md
```

as the loaded execution handoff.

Do **not** replace the current workflow during this task.

Do **not** implement queues yet.

Do **not** create runtime controller code yet.

This task is documentation alignment and architecture preparation.

## Architecture To Apply

Update the AI documentation so it consistently reflects these principles.

### Project-Scoped Ownership

Each project owns its own AI execution state.

A project owns:

- Its local to-do list.
- Its local diagnostic queue.
- Its local task queue.
- Its local prompt handoff artifacts.
- Its local `currentTask.md`.
- Its local execution records.
- Its local run evidence.
- Its local artifacts.

There is no single global to-do list that all projects write to directly.

### VSCodium Windows And Codex Runtimes

A VSCodium window can host a Codex runtime.

Multiple VSCodium windows can exist at the same time.

Therefore, multiple Codex runtimes can exist concurrently.

Each runtime is associated with an execution context, usually tied to a project.

### Singleton Controller

The controller is a singleton coordinator, not the owner of all project state.

The singleton controller:

- Discovers or registers active runtimes.
- Knows the active project or active projects.
- Tracks execution contexts.
- Coordinates work assignment.
- Prevents conflicting operations.
- Routes work to the correct project runtime.
- Maintains global awareness of active runs.

The controller does **not** own every project's `currentTask.md`.

The controller does **not** maintain a single global active task file.

### Execution Context

Introduce or strengthen the concept of an **Execution Context**.

An Execution Context should connect:

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

Run Control should eventually manage execution contexts, not just isolated task files.

### currentTask.md Lifecycle

`currentTask.md` is a project-owned runtime handoff and restart checkpoint.

It is not the authoritative source of work.

It should eventually have explicit lifecycle state, such as:

- Created
- Active
- Suspended
- Completed
- Cancelled
- Archived

The existence of `currentTask.md` alone should not imply that it is active.

Run Control should determine whether a task is executable based on explicit state.

Use the wording:

```text
currentTask.md is the runtime execution handoff and restart checkpoint generated immediately before execution. It is not the authoritative source of work.
```

### Queue Items And Prompts

Queue items are project-scoped work objects.

Reusable prompts are versioned execution procedures.

Queue items may reference prompts, but should not embed full execution procedures.

Use the wording:

```text
Reusable prompts are versioned execution procedures that may be associated with one or more queue item types. Queue items reference prompts; they do not embed execution procedures.
```

However, individual to-do items may still carry concise task-specific prompts or instructions so Codex does not need to ask the user what to do.

The distinction is:

- Queue item concise prompt: what to do for this item.
- Reusable prompt/procedure: how to execute that kind of work.

### Run As Database Object

A Run is a first-class object.

The current file-based run folder is a transitional evidence package.

Future implementation should persist a Run as a database object with relationships to:

- Project
- Execution Context
- Agent
- Runtime
- Queue item
- Prompt
- Current task artifact
- Commands
- Tool calls
- Files read
- Files changed
- Validation checks
- Diagnostics
- Metrics
- Approvals
- User conversation evidence
- Git diff
- Generated artifacts
- Follow-up recommendations

The Git diff is deterministic and should be treated as authoritative evidence of repository changes when available.

When Git is unavailable, the execution record should explicitly state that limitation and use filesystem evidence instead.

### Execution Evidence Package

The run folder should be documented as an Execution Evidence Package.

A target run evidence folder may eventually include:

```text
runs/<date>/<run-id>/
├── execution-record.md
├── execution-metrics.md
├── conversation.md
├── currentTask.md
├── approvals.md
├── commands.log
├── tool-calls.jsonl
├── diagnostics.json
├── metadata.json
├── artifacts/
│   ├── modified-files.txt
│   ├── patch.diff
│   └── outputs/
└── validation/
    ├── markdownlint.txt
    ├── checks.md
    └── results.json
```

This is not necessarily implemented yet. Clearly mark it as planned architecture or target model.

### Execution Policy Versioning

Documentation updates do not change the workflow governing the current execution.

A run should use the workflow loaded at run start.

New or revised workflows become active only in later executions after they are loaded.

Document the principle:

```text
Execution policy is fixed at run start.
Documentation may describe the next policy.
Future runs may adopt the revised policy.
```

## Files To Review

Start by reviewing these files if they exist:

```text
D:\AI\.AI\Start_Here.md
D:\AI\.AI\AI_Execution_Separation_Of_Concerns.md
D:\AI\.AI\Prompts\RunControl.md
D:\AI\.AI\Procedures\Run Control, Execution Workflow, and Project Files.md
D:\AI\.AI\Procedures\TODO_List_Maintenance.proc.md
D:\AI\.AI\Procedures\Execution_Record.proc.md
D:\AI\.AI\Procedures\Execution_Record_Metrics.md
D:\AI\.AI\AI_Directive_Vocabulary.md
D:\AI\.AI\AI Prompt Library.md
D:\AI\.AI\Readme.md
```

Also inspect the prior execution evidence directory:

```text
D:\AI\runs\2026-07-07\20260707-1944-ai-doc-queue-execution
```

## Required Approval Gate

Before editing more than one file, produce an impact analysis and ask for approval.

The impact analysis must include:

- Files proposed for modification.
- Why each file needs revision.
- Architectural themes affected.
- Whether each edit is current implementation, planned enhancement, or future architecture.
- Any files that should be left untouched.
- Any new documentation files recommended.

Do not edit more than one file until approval is granted.

## Documentation Goals

Revise the AI-side documentation to distinguish:

- Current implementation
- Transitional file-based run evidence
- Planned project-scoped execution contexts
- Future queue-driven execution
- Future database-backed Run objects

Keep current behavior and future architecture clearly separated.

Do not describe planned functionality as already implemented.

Prefer headings such as:

- Current Implementation
- Transitional Model
- Planned Enhancement
- Future Architecture
- Migration Path

## Specific Output Expectations

The documentation should support these future implementation steps:

1. Define Execution Context model.
2. Define Run database object model.
3. Define currentTask lifecycle state.
4. Define project-scoped queue item schema.
5. Define prompt reference and concise item prompt rules.
6. Define execution evidence package structure.
7. Define controller/runtime ownership boundaries.
8. Define migration from file-based records to database-backed run records.

## Constraints

- Preserve existing terminology where practical.
- Keep edits additive unless a correction is clearly required.
- Do not remove historical execution evidence.
- Do not rename files unless explicitly approved.
- Do not create queue folders as implementation.
- Do not implement code in this task.
- Maintain Markdown formatting standards.
- Use `-` for unordered lists, not `*`.
- Ensure every Markdown document has a single H1.
- Use unique headings within each document.
- Insert a blank line before horizontal rule / line ruler syntax.
- Prefer tables where they clarify ownership, lifecycle, or schema.
- Record any unavailable metrics rather than inventing values.

## Validation

After approved edits:

- Run targeted content searches for required terminology.
- Validate Markdown structure.
- Run markdownlint if available.
- Verify cross-references.
- If Git is available, capture `git status` and `git diff --stat`.
- If Git is unavailable, explicitly record that in the execution record.

## Execution Record

Create an execution record for this run.

The execution record must include:

- Run identity.
- Input context.
- Files reviewed.
- Files modified.
- Approval gates.
- Decisions.
- Commands executed.
- Validation results.
- Diagnostics and warnings.
- Follow-up recommendations.
- Metrics where observable.
- Whether Git diff evidence was available.

## Important Architectural Reminder

The purpose of this task is to prepare the AI-side documentation for incremental implementation.

Do not attempt to implement the full system in one step.

A Run is a database object, but the current filesystem evidence package remains a valid transitional representation until the database layer exists.
