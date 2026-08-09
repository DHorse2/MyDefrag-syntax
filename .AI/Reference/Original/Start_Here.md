# AI Workspace Start Here

<!-- markdownlint-disable MD013 -->

## Purpose

This document is the authoritative startup entry point for AI agents working in this workspace.

Its purpose is to initialize the minimum shared context required to begin work, then stop loading startup material and begin execution.

## Startup Chain

### AI root and project identity resolution

Resolve project identity before loading tasks or accessing the queue.

1. Resolve `PROJECT_ROOT`.
2. Read and validate `<PROJECT_ROOT>\.vscode\ai-project.json`.
3. If project identity is missing, unreadable, malformed, unsupported, or
   inconsistent with `PROJECT_ROOT`, report a fatal project identity error and
   halt before reading `currentTask.md` or `Todo.md`.
4. Cache `ACTIVE_PROJECT_ID` from the validated identity for the current run.
5. Test once whether `<PROJECT_ROOT>\.AI` exists.
6. If it exists, set `ACTIVE_AI_ROOT` to `<PROJECT_ROOT>\.AI`; otherwise set it
   to `D:\AI\.AI`.
7. Treat `ACTIVE_AI_ROOT` as the complete AI root for the run. Do not perform
   file-by-file fallback from a selected project-local `.AI` root to the shared
   root.
8. Load `.AI` resources only from the cached `ACTIVE_AI_ROOT`.
9. Record the resolved project identity and active AI root when execution
   recording is enabled.

### Follow this startup chain in order

(Do not change this without approval)

1. Before performing any shell-based startup operation, read and apply `D:\AI\.AI\Computers\<COMPUTERNAME>\Configuration\Process-Launcher.md` if it exists. Use a direct filesystem-read capability when available; otherwise use `cmd.exe` to read this bootstrap policy without first invoking PowerShell.
2. Resolve `PROJECT_ROOT` from `.codex\config.toml` or the explicit execution
   workspace when config is unavailable.
3. Read and validate `<PROJECT_ROOT>\.vscode\ai-project.json`.
4. Cache `ACTIVE_PROJECT_ID`.
5. Resolve and cache `ACTIVE_AI_ROOT` using the AI root and project identity
   resolution rules.
6. Read `<ACTIVE_AI_ROOT>\AI_Directive_Vocabulary.md`.
7. `LOAD TASK`.
8. Display the loaded task information to the user and pause for explicit
   approval to proceed.
9. Read `<ACTIVE_AI_ROOT>\Instructions.md`.
10. Pre-evaluate the loaded task.
11. Determine the required role or roles.
12. Load the required procedures.
13. Load the required standards.
14. Determine the execution mode.
15. Determine the required capabilities.
16. Complete execution planning.
17. Reach the Execution Cut-Off.
18. Execute the task.
19. Validate the results.
20. Produce or update the execution record.

Load each document at most once per run.

## Load Task

Use the `LOAD TASK` directive.

The current implementation uses `currentTask.md` as the active task handoff
file and `Todo.md` as the Markdown queue. `currentTask.md` is a runtime handoff
mechanism and task-state record, not a permanent statement that all work must
originate from one task file.

When no explicit task path is supplied, run current-task resolution before
reading or pre-evaluating `currentTask.md`:

```text
<ACTIVE_AI_ROOT>\Scripts\Resolve-AiTaskQueue.ps1 -ProjectRoot <PROJECT_ROOT>
```

The resolver follows:

```text
<ACTIVE_AI_ROOT>\Procedures\Task_Queue_Workflow.proc.md
```

It must validate project identity before queue access, retain active, blocked,
and failed tasks for the active project, finalize terminal tasks for the active
project, and promote the next eligible matching `Todo.md` entry into
`Prompts\currentTask.md` without executing it.

Load the next task prompt from:

```text
.AI\Prompts\currentTask.md
```

or from an optionally supplied path. An explicitly supplied task path is loaded
as the requested task source and must not consume the queue merely because it
was supplied.

Preload the task as input to startup planning.

Do not execute the task during this step.

After loading the task, display the task source, task objective, active project
ID, expected artifacts or outputs, and any explicit constraints or approval
requirements to the user. Then pause before continuing startup planning. Resume
only after the user explicitly instructs the agent to proceed, for example with
`DO NOW`, `CONTINUE NOW`, or an equivalent approval.

### Current Implementation - Current Task Compatibility

`Prompts\currentTask.md` remains the default task entry point for this startup
procedure after the resolver has checked its state. It is the runtime execution
handoff and restart checkpoint generated immediately before execution. It is not
the authoritative source of work. When an agent or workflow restarts under the
current model, startup resolves this handoff unless the user supplies a
different task source or explicitly enters ad hoc mode.

Ad hoc user requests may explicitly bypass queue selection, but they do not
bypass project validation. An explicit ad hoc prompt path must declare project
metadata matching `ACTIVE_PROJECT_ID`. When an ad hoc request should replace
queued or current-task work, record the ad hoc source or clear or ignore
`currentTask.md` according to the user's instruction so stale task state does
not continue to drive execution.

### Completion Handoff

After task execution, required validation, and execution-record finalization,
invoke the task queue resolver with completion intent so the current task is
persisted as `Completed` and the next eligible task is promoted:

```text
<ACTIVE_AI_ROOT>\Scripts\Resolve-AiTaskQueue.ps1 -ProjectRoot <PROJECT_ROOT> -Action Complete -ExecutionId <executionId>
```

If the completed task came from an explicit path or ad hoc source that did not
already have current-task metadata, provide the source and prompt identity when
invoking the resolver. The resolver must report the promoted task or `Idle` and
must not execute the promoted task without a separate execution directive.

### Future Architecture - Queue-Driven Task Loading

A future Run Control implementation may select a queue item first, then generate
or populate `Prompts\currentTask.md` from that queue item and its associated
execution procedure, reusable prompt, or recovery state.

In that model:

- Queue items represent work objects.
- A queue item may contain a concise execution prompt.
- Reusable prompts are versioned execution procedures that may be associated
  with one or more queue item types.
- Queue items reference prompts; they do not embed execution procedures.
- `currentTask.md` remains a compatibility handoff file unless replaced by a
  newer runtime interface.
- Ad hoc execution bypasses queue mode and should not be forced through a queue
  item.

### Planned Enhancement - Migration Path

The recommended migration path is:

1. Keep `Prompts\currentTask.md` as the runtime execution handoff and restart
   checkpoint.
2. Add queue item definitions only after Run Control can select and track them.
3. Treat reusable prompts as versioned execution procedures that can be shared
   by TODO, Diagnostic, Task, research, requirement, and graph work items.
4. Make queue items reference prompts instead of embedding execution procedures.
5. Generate or refresh `currentTask.md` from the selected queue item during
   queue-driven runs.
6. Clear `currentTask.md` or switch Run Control mode when returning to ad hoc
   execution.

### Future Architecture - Execution Contexts

Future Run Control should manage execution contexts, not only isolated task
files.

An execution context connects:

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

The singleton controller may coordinate active execution contexts across
multiple Codex runtimes, but each project remains the owner of its local
queues, `currentTask.md`, execution records, run evidence, and artifacts.

### Execution Policy Versioning

Execution policy is fixed at run start.
Documentation may describe the next policy.
Future runs may adopt the revised policy.

## Read Instructions

Read `Instructions.md` after the task has been loaded.

Use the loaded task to interpret which instructions are relevant.

Instructions should provide general operating rules. Project-specific context should be loaded only when required by the task, role, or procedure.

## Pre-Evaluate Task

Pre-evaluate the task, but do not execute it.

Determine:

- Task objective.
- Scope.
- Deliverables.
- Risk level.
- Required role or roles.
- Required procedures.
- Required standards.
- Required execution mode.
- Required capabilities.
- Expected artifacts.
- Approval requirements.
- Missing information, if any.

## Role Selection

Select the smallest role set required by the task.

Roles define who performs the work.

Prefer one primary role. Add supporting roles only when required.

Record selected roles and the reason for selection in the execution record when an execution record is required.

## Procedure Selection

Load only the procedures required by the selected role or roles and the loaded task.

Procedures define how the work is performed.

Do not recursively load procedures beyond one level unless explicitly instructed.

Load invoked procedures only when required and only once per run.

## Standard Selection

Load only the standards required by the selected procedures and task outputs.

Standards define the rules that govern the work.

Do not load unrelated standards.

## Execution Mode Selection

Select the lowest execution mode that satisfies the task.

Execution Mode defines the required level of evidence and detail.

Supported modes:

| Mode | Use |
| --- | --- |
| Minimal | Simple answers or small tasks with little or no artifact output. |
| Standard | Normal meaningful work. |
| Detailed | Reviews, debugging, architecture, generation, or project-wide analysis. |
| Verbose | Audit work, benchmarking, MCP development, AI evaluation, detailed history, command history, or required numeric metrics. |

Record the selected mode and the reason for selection when an execution record is required.

## Capability Selection

Select the capabilities required to perform the task.

Capabilities describe services, tools, adapters, or execution resources needed by the run.

Examples:

- Filesystem
- Shell
- Git
- Search
- Database
- Web
- Calendar
- Email
- Test runner
- Markdown validator
- Document generator

Load or request only the minimum capabilities required by the task.

Record required capabilities when an execution record is required.

## Execution Planning

Before the Execution Cut-Off, create a concise execution plan.

The execution plan should identify:

- Task objective.
- Selected roles.
- Selected procedures.
- Selected standards.
- Selected execution mode.
- Required capabilities.
- Expected artifacts.
- Validation approach.
- Approval requirements.
- Known risks or constraints.

Do not perform implementation work during execution planning.

## Execution Cut-Off

The bootstrap and planning process ends here.

Begin performing the requested work.

Do not continue loading `.AI` documents unless:

- The active role explicitly requires additional context.
- An active procedure explicitly requires additional context.
- The user explicitly requests additional context.
- Required information is unavailable.

When additional context is required, load only the minimum necessary documents, then immediately resume the current task.

## Validation

Validate the result according to the selected procedures and standards.

At minimum, report:

- What was validated.
- How it was validated.
- Whether validation passed, failed, or was unavailable.
- Any warnings, errors, or limitations.

## Execution Record

Produce or update an execution record when required by the task, selected procedure, selected role, or execution mode.

The execution record is the evidence produced by the run.

Use:

```text
Procedures\Execution_Record.proc.md
Procedures\Execution_Record_Metrics.md
```

when execution recording or metrics are required.

## Separation Of Concerns

| Concern | Meaning |
| --- | --- |
| Task | What needs to be accomplished. |
| Role | Who performs the work. |
| Procedure | How the work is performed. |
| Standards | The rules governing the work. |
| Execution Mode | The required level of evidence and detail. |
| Capabilities | The tools, services, and resources required. |
| Execution Record | The evidence produced. |
| Run Control | The deterministic lifecycle managing execution. |

## Authority

This document governs startup and planning only.

After the Execution Cut-Off:

- Roles define who performs the work.
- Procedures define how the work is performed.
- Standards define the rules that apply.
- Prompts define task-specific instructions.
- Context provides additional knowledge only when required.
- Execution records preserve evidence.
- Run Control manages the lifecycle.
