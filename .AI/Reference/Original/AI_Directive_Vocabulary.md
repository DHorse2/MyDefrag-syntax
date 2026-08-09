# AI Directive Vocabulary

<!-- markdownlint-disable MD013 MD060 -->

## Purpose

This document defines a compact, standardized vocabulary for directing AI execution, workflow, task lifecycle, and organizational operations.

The directives are intended to be understandable by humans and AI systems while remaining suitable for future deterministic parsing by the MDM MCP.

## Design Principles

- Keep the vocabulary small and stable.
- Prefer semantic operations over implementation details.
- Separate execution, workflow, organization, and storage concerns.
- Make task state transitions explicit and recoverable.
- Allow different execution environments to implement the same directive appropriately.

## Execution Control

| Directive | Purpose |
|---|---|
| `DO NOW` | Execute the accumulated or loaded work immediately after required startup evaluation and approval gates are satisfied. |
| `DO LATER` | Record the work for future execution. |
| `DO BY STEPS` | Execute as an ordered sequence of steps. |
| `PAUSE NOW` | Complete the current safe operation, persist resumable state, and wait. |
| `STOP NOW` | Stop execution at the current safe boundary, persist state, and wait. |
| `CONTINUE NOW` | Resume from the previous stopping point. |
| `VERIFY NOW` | Perform deterministic validation before continuing. |
| `LOG THIS` | Record execution evidence and results. |

## Task Lifecycle

| Directive | Purpose |
|---|---|
| `LOAD TASK` | Validate active project identity, resolve current task state, and load only an eligible queued task assigned to `ACTIVE_PROJECT_ID`. If no active task exists for the active project, or the active project task has a terminal auto-advance status, promote the next matching queued task into `Prompts\currentTask.md`. Other projects' tasks and projectless legacy tasks are not consumed, modified, claimed, or reordered. Load and pre-evaluate the resulting active task without executing it. |
| `COMPLETE TASK` | After required validation and execution recording, mark the current task `Completed`, finalize its queue entry, and invoke `ADVANCE TASK`. |
| `ADVANCE TASK` | Atomically finalize the current queue entry and promote the next eligible queued task into `Prompts\currentTask.md`. Do not execute the promoted task. |
| `SKIP TASK` | Mark the current task `Skipped`, record the reason, and invoke `ADVANCE TASK`. |
| `RETRY TASK` | Return a `Failed` or `Blocked` task to an executable state without consuming another queue entry. |

## Task Status Terms

| Status | Meaning | Startup Behavior |
|---|---|---|
| `Queued` | Task is waiting in the queue and is not the current task. | Eligible for promotion. |
| `Ready` | Task has been promoted and is ready for pre-evaluation or execution. | Load as current task. |
| `Loaded` | Task has been loaded and pre-evaluated but execution has not begun. | Resume as current task. |
| `In Progress` | Task execution has started and resumable state exists. | Resume as current task. |
| `Blocked` | Task cannot continue without intervention or missing input. | Keep as current task; do not auto-advance. |
| `Failed` | Task execution failed and requires retry, repair, skip, or cancellation. | Keep as current task; do not auto-advance. |
| `Completed` | Task completed and required validation and records were produced. | Finalize and auto-advance. |
| `Skipped` | Task was intentionally bypassed with a recorded reason. | Finalize and auto-advance. |
| `Cancelled` | Task was intentionally terminated and will not resume. | Finalize and auto-advance. |
| `Idle` | No active task and no eligible queued task exist. | Remain idle. |

## Workflow Navigation

| Directive | Purpose |
|---|---|
| `SHOW CHATGPT TODO` | Display the ChatGPT prompt queue planning backlog. |
| `PHASE` | Identify the current execution phase. |
| `STEP` | Identify the current workflow step. |
| `NEXT STEP` | Proceed to the next logical step within the current task. |
| `PREVIOUS STEP` | Return to the previous step within the current task. |
| `FIRST STEP` | Navigate to the first step within the current task. |
| `LAST STEP` | Navigate to the final step within the current task. |
| `GOTO STEP` | Navigate directly to a named step within the current task. |
| `GOTO PARENT` | Navigate to the parent item in the current hierarchy. |
| `RETURN` | Return to the previous execution context. |

## Block Structure

A block groups multiple user inputs into a single logical prompt.

After `BEGIN BLOCK` is issued, all subsequent user messages, directives, file references, and UI submissions are considered part of the same prompt.

The AI should:

- Continue accepting input without responding.
- Preserve the order of supplied information.
- Treat all content as belonging to a single task.
- Remain on the current topic.
- Suspend execution until instructed.

The current block ends when either:

- `DO NOW` is issued, implicitly ending the prompt block and beginning execution.
- `END BLOCK` is issued.

| Directive | Purpose |
|---|---|
| `BEGIN BLOCK` | Pause responses and begin a logical block of related prompts. |
| `END BLOCK` | End the current logical block and process it. |
| `BEGIN PHASE` | Begin a major execution phase. |
| `END PHASE` | End the current execution phase. |

## Dependencies

| Directive | Purpose |
|---|---|
| `REQUIRES` | Identify required prerequisites, inputs, or context. |
| `OPTIONAL` | Identify optional supporting information. |
| `DEPENDS ON` | Identify work that must be completed first. |

## Outputs

| Directive | Purpose |
|---|---|
| `OUTPUT` | Identify required deliverables. |
| `ARTIFACTS` | Identify files or other artifacts to create or modify. |
| `RESULT` | Identify the expected outcome. |

## Organizational Directives

These directives operate on conversations, tasks, prompts, documents, execution records, or other managed artifacts.

The underlying implementation may involve files, databases, graph nodes, or other storage mechanisms.

| Directive | Purpose |
|---|---|
| `SAVE` | Persist the current work using the current storage policy. |
| `SAVE TO` | Persist the current work to the specified project, domain, or destination. |
| `SAVE AS` | Persist the current work using a new name or destination. |
| `COPY TO` | Duplicate the current work into another project, domain, or destination. |
| `MOVE TO` | Relocate ownership of the current work to another project, domain, or destination. |
| `DELETE` | Remove the current work according to the applicable deletion policy. |
| `ARCHIVE` | Move the current work into long-term storage according to the applicable archival policy. |

## Future Work

| Directive | Purpose |
|---|---|
| `TODO` | Identify work intentionally left for the future. |
| `FOLLOW-UP` | Identify recommended future activity. |
| `DEFERRED` | Identify work postponed by design. |
