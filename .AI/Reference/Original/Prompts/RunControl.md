# Run Control

<!-- markdownlint-disable MD013 -->

## Purpose

This document defines the standard execution policy for AI agents
operating within this project.

Run Control specifies **how work is performed**, while the current task
specifies **what work is to be performed**.

The objectives of Run Control are to provide consistent execution,
deterministic evidence collection, reproducibility, auditing, and safe
recovery.

## Primary Responsibilities

Every execution should:

- Load the current execution context.
- Load the current task.
- Determine the requested objective.
- Execute work according to project policies.
- Record significant execution history.
- Produce reproducible execution evidence.
- Update execution status.
- Save generated artifacts.
- Prepare the environment for the next execution.

In the current implementation, loading the current task means validating
project identity, resolving the project-scoped queue state, and loading the
documented task handoff file. Run Control now selects only queue entries whose
`projectId` matches the active project identity before materializing an item
into the current task handoff.

Run Control should eventually manage execution contexts. An execution context
binds a project, runtime, window, agent, queue item, prompt reference,
generated current task, run, artifacts, validation results, and evidence
package into one auditable execution scope.

## Execution Sequence

The normal execution sequence is:

1. Load Run Control.
2. Load the current task.
3. Load required context documents.
4. Evaluate the task before execution.
5. Determine dependencies and prerequisites.
6. Execute the work.
7. Record execution history.
8. Generate diagnostics and validation results.
9. Save artifacts and logs.
10. Update task status.
11. Prepare the next task.

## Current Implementation - Current Task

Unless otherwise directed, the active task is loaded from:

```text
.AI\Prompts\currentTask.md
```

Alternative task files may be specified explicitly by the user.

The current task file is a compatibility handoff. It should not be treated as
the permanent source of all work. Reusable prompts under `Prompts` are assets,
while `currentTask.md` is the runtime execution handoff and restart checkpoint
generated immediately before execution. It is not the authoritative source of
work.

```text
currentTask.md is the runtime execution handoff and restart checkpoint generated immediately before execution. It is not the authoritative source of work.
```

Restarted execution reloads `currentTask.md` unless the user supplies another
task source or Run Control is explicitly placed into ad hoc mode. The current
task metadata must include a project ID matching the active project.

The `currentTask.md` lifecycle includes explicit state such as Loaded, In
Progress, Blocked, Failed, Completed, Skipped, Cancelled, and Idle. The
existence of `currentTask.md` alone should not imply that it is active.

## Current Implementation - Ad Hoc Execution

Ad hoc user requests may bypass queue selection when the user explicitly
instructs the agent to do so, but explicit prompt paths must still declare
metadata matching the active project.

When switching from current-task execution to ad hoc execution, clear or ignore
the current task handoff according to the user's instruction. This prevents
stale `currentTask.md` content from continuing to control later work.

## Future Architecture - Queue-Driven Execution

A future Run Control implementation may introduce queue items for TODOs,
diagnostics, project tasks, research items, and graph-backed work objects.

A singleton controller may coordinate multiple active VSCodium windows and
Codex runtimes. The controller discovers or registers runtimes, tracks active
execution contexts, routes work, and prevents conflicting operations. It does
not own every project's `currentTask.md` and does not maintain a single global
active task file.

In that model:

- Queue items represent work objects.
- Queue items are project-scoped.
- Queue items may include concise execution prompts.
- Reusable prompts are versioned execution procedures that may be associated
  with one or more queue item types.
- Queue items reference prompts; they do not embed execution procedures.
- Run Control selects a queue item before execution, determines execution mode,
  and manages restart and recovery.
- `currentTask.md` may be generated from the selected queue item and referenced
  prompt or procedure for compatibility.
- Execution history links the queue item to the run record, artifacts,
  diagnostics, and validation results.

Example queue item:

```json
{
  "id": "TODO-001",
  "type": "todo",
  "status": "ready",
  "execution_prompt": "Update the README section that describes startup task loading.",
  "prompt_ref": "Prompts/Documentation Update.md"
}
```

The `prompt_ref` value associates a reusable prompt with the queue item. The
reusable prompt is a versioned execution procedure. The queue item references
that procedure; it does not embed it.

## Planned Enhancement - Migration Path

The migration path should preserve compatibility while moving selection
authority into Run Control:

1. Continue loading `Prompts\currentTask.md` as the runtime execution handoff
   and restart checkpoint.
2. Add queue state only after Run Control can distinguish queue mode from ad hoc
   mode.
3. Add queue items for TODO, Diagnostic, Task, and related work objects.
4. Treat reusable prompts as versioned execution procedures shared by TODO,
   Diagnostic, Task, research, requirement, and graph work items.
5. Make queue items reference prompts instead of embedding execution procedures.
6. Generate `currentTask.md` from the selected queue item during queue-driven
   execution.
7. Clear the handoff or switch mode when execution returns to ad hoc work.
8. Persist completed runs as first-class database objects while preserving
   file-based evidence package export compatibility.

## Context

Context documents provide additional information required to perform a
task correctly.

Typical context includes:

- Project standards
- Coding standards
- Documentation standards
- Workflow descriptions
- Architecture documents
- Reference material

Only the context required for the current task should be loaded.

## Execution Workflow

Execution should proceed incrementally.

Major changes should produce intermediate checkpoints whenever
practical.

Long-running operations should periodically update execution history.

If execution cannot safely continue, stop and report the reason.

## Logging

Execution should produce sufficient evidence to reconstruct what
occurred.

Typical information includes:

- Time of execution
- Agent performing the work
- Prompt(s) used
- Context loaded
- Commands executed
- Files read
- Files modified
- Files created
- Diagnostics generated
- Decisions made
- Validation performed
- Artifacts produced
- Final execution status

Logging should be detailed enough to support replay, auditing,
debugging, and future AI analysis.

## Diagnostics

Errors, warnings, informational messages, hints, recommendations, and
validation results should be generated using the project's diagnostic
schema whenever available.

Diagnostics should identify:

- Source component
- Severity
- Category
- Related files
- Suggested corrective actions

## Artifacts

Generated documents, reports, source files, configuration files, and
other outputs should be treated as execution artifacts.

Artifacts should be referenced by the execution history whenever
practical.

## Recovery

Execution should favor resumable workflows.

Where appropriate:

- Create checkpoints.
- Save intermediate work.
- Preserve execution history.
- Avoid repeating completed work.
- Support rollback when available.

## Completion

When execution completes:

- Record the final outcome.
- Update task status.
- Save all required artifacts.
- Ensure execution history is complete.
- Prepare the environment for the next task.

## Guiding Principles

Execution should strive to be:

- Deterministic where possible.
- Evidence based.
- Reproducible.
- Auditable.
- Incremental.
- Safe.
- Efficient.
- Well documented.

Future MDM MCP implementations may automate portions of this policy
while preserving the same execution model and evidence requirements.

- [ ] `.AI\Prompts\Codex-Refine-Journaling-Architecture.md` - Ready
