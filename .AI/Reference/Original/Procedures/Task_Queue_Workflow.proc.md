# Task Queue Workflow Procedure

<!-- markdownlint-disable MD013 MD060 -->

| Field | Value |
|---|---|
| Status | Active Definition |
| Scope | Shared and project-local `.AI` task queues |
| Purpose | Define deterministic project-scoped current-task resolution, completion, recovery, and queue advancement. |

## Core Invariant

At most one task may be active for a project window at a time.

Every executable queue item belongs to exactly one project. Codex must resolve
and validate `<PROJECT_ROOT>\.vscode\ai-project.json` before it reads
`Prompts\currentTask.md`, reads `Todo.md`, claims a task, or promotes a queue
entry. A missing, malformed, unsupported, ambiguous, or inconsistent project
identity is fatal and must halt startup before queue access.

`Prompts\currentTask.md` is a restart and handoff artifact, not a permanently authoritative prompt. Its state must be checked before it is loaded. A task with an auto-advance terminal status must never remain the active task merely because the file still exists.

## Canonical Artifacts

| Artifact | Role |
|---|---|
| `<ACTIVE_AI_ROOT>\Todo.md` | Ordered queue of tasks that have not yet been promoted. |
| `<ACTIVE_AI_ROOT>\Prompts\currentTask.md` | Current task restart artifact and task-state record. |
| `<ACTIVE_AI_ROOT>\Prompts\<prompt>.md` | Durable source prompt referenced by the queue or current task. |
| Run manifest and journal | Durable execution evidence, validation result, and outcome. |

Resolve `ACTIVE_AI_ROOT` once per run after project identity succeeds. If
`<PROJECT_ROOT>\.AI` exists, it is the complete active AI root. Otherwise,
`D:\AI\.AI` is the active AI root. Do not perform file-by-file fallback from a
selected project-local `.AI` root to the shared root.

## Required Current-Task Metadata

The current-task artifact must expose machine-readable values for at least:

| Field | Requirement |
|---|---|
| `schemaVersion` | Version of the task-state record. |
| `taskId` | Stable identifier for idempotent queue operations. |
| `projectId` | Stable project identity that must match `ACTIVE_PROJECT_ID`. |
| `projectRoot` | Normalized project root used for validation and diagnostics. |
| `status` | One of the canonical task statuses. |
| `promptPath` | Absolute or AI-root-relative path to the durable prompt. |
| `queueEntryId` | Stable queue-entry identity when the task came from the queue. |
| `source` | One of `Queue`, `AdHoc`, `ExplicitPath`, or `Recovery`. |
| `executionId` | Current or most recent execution identifier, when available. |
| `updatedAt` | Timestamp of the most recent state transition. |
| `claimedByAgent` | Agent that claimed or materialized the task. |
| `claimedByComputer` | Computer that claimed or materialized the task. |
| `claimedWorkspaceRoot` | Workspace root used by the claiming runtime. |

Existing task files may retain human-readable content. If the current format
lacks reliable machine-readable project metadata, preserve it, report it as a
legacy migration defect, and do not consume another queue item until the state
is corrected.

## Status Classes

### Active Statuses

- `Ready`
- `Loaded`
- `In Progress`

An active task remains current and must not consume another queue item.

### Intervention Statuses

- `Blocked`
- `Failed`

An intervention task remains current. It requires `RETRY TASK`, `SKIP TASK`, `CANCEL TASK`, or an explicit corrective action. Startup must not silently advance past it.

### Auto-Advance Terminal Statuses

- `Completed`
- `Skipped`
- `Cancelled`

A task in one of these states must be finalized and replaced by the next eligible queued task.

### Empty Status

- `Idle`

`Idle` means there is no active task and no eligible queue item.

## Deterministic Resolver

The current file-based implementation uses:

```text
<AI_ROOT>\Scripts\Resolve-AiTaskQueue.ps1
```

The resolver is the mandatory implementation point for `LOAD TASK`,
`COMPLETE TASK`, startup recovery, and manual handoff repair. It must support
project-local `.AI` resolution before the shared fallback, `-WhatIf` planning,
and a structured result that identifies current status, promoted task, queue
state, mutations, backups, and blocking defects.

The current Markdown queue format is:

```md
- [ ] [projectId: ai-workspace] [taskId: some-task] `.AI\Prompts\SomeTask.md` - Ready
```

The `projectId` and `taskId` fields are mandatory for executable entries.
Legacy checklist entries without project metadata are preserved as evidence but
are not eligible for promotion. Until explicit queue-entry identifiers exist,
the normalized prompt path plus project ID is the stable queue-entry identity.
A promoted matching entry is marked as checked with status `Loaded`; a
completed matching entry is marked as checked with status `Completed`. Checked
entries are not eligible for promotion.

## Startup Resolution Procedure

Every startup and every `LOAD TASK` operation must perform the following sequence before task pre-evaluation:

1. Resolve `PROJECT_ROOT`.
2. Read and validate `<PROJECT_ROOT>\.vscode\ai-project.json`.
3. Halt on any project identity error before reading `currentTask.md` or
   `Todo.md`.
4. Cache `ACTIVE_PROJECT_ID`.
5. Resolve and cache `ACTIVE_AI_ROOT` once using the complete-root rule.
6. Read the current-task control state if `Prompts\currentTask.md` exists.
7. Reject a current task whose `projectId` or prompt metadata conflicts with
   `ACTIVE_PROJECT_ID`.
8. Classify the current task by status.
9. If the status is active for the active project, load that task and do not
   modify the queue.
10. If the status is `Blocked` or `Failed`, retain it as current and report the intervention state.
11. If the status is `Completed`, `Skipped`, or `Cancelled`, finalize its matching active-project queue identity and invoke task advancement.
12. If the current-task artifact is malformed, preserve it, report the defect,
   and avoid consuming a queue item.
13. If the current-task artifact is missing, empty, or `Idle`, invoke task
   advancement.
14. Load and pre-evaluate the resulting current task, if any.
15. Stop at the normal execution cutoff. Promotion does not imply execution.

## Completion Procedure

A task is not complete merely because implementation work stopped. `COMPLETE TASK` requires the following ordered transition:

1. Finish the requested work.
2. Perform required validation.
3. Produce or update the execution record and machine journal.
4. Persist the result status as `Completed` in the canonical current-task state.
5. Persist the final execution identifier and timestamp.
6. Finalize the matching queue entry by stable task or queue-entry identity.
7. Invoke `ADVANCE TASK`.
8. Promote the next eligible task into `Prompts\currentTask.md`, or write an `Idle` state when the queue is empty.
9. Report the promoted task without executing it unless a separate execution directive authorizes execution.

The status write must occur before advancement. If the process stops after marking completion but before promotion, the next startup must detect the terminal state and finish the handoff.

For the current file-based implementation, completion handoff is performed by
the resolver:

```text
<AI_ROOT>\Scripts\Resolve-AiTaskQueue.ps1 -Action Complete -ExecutionId <executionId>
```

## Advancement Procedure

`ADVANCE TASK` must be deterministic, idempotent, and atomic at the file-operation level.

1. Acquire the available queue mutation guard or use a single-process critical section.
2. Re-read the current-task state and queue from disk.
3. Confirm that the current task is absent, `Idle`, or in an auto-advance terminal status.
4. Finalize only the queue entry matching the stable `taskId` or `queueEntryId`.
5. Select the first eligible queued task assigned to `ACTIVE_PROJECT_ID`
   according to queue order.
6. Build the replacement current-task artifact using the selected task metadata and prompt path.
7. Write the replacement to a temporary file in the same directory.
8. Atomically replace `Prompts\currentTask.md`.
9. Update `Todo.md` so the promoted entry is no longer queued.
10. Persist the queue mutation result in the journal or run record.
11. Release the queue mutation guard.

Repeated advancement against the same completed task must not consume more than one queue item.

## Queue Entry Rules

- Queue entries require a stable identity or a uniquely normalized prompt path.
- Queue entries require `projectId` and `taskId` fields.
- A task is eligible only when `queueEntry.projectId == ACTIVE_PROJECT_ID`.
- Queue entries for other projects must be skipped without mutation or
  reordering.
- Projectless legacy entries must be preserved but must never be treated as
  globally eligible.
- Prompt metadata must declare `taskId`, `projectId`, and `projectRoot`, and it
  must agree with queue metadata before loading.
- A promoted task must be removed from the queued set or marked as active in one atomic logical operation.
- Completed entries must not be selected again.
- Missing prompt files must not be silently discarded. Mark the task `Blocked` and preserve the queue evidence.
- Duplicate prompt paths must not cause duplicate promotion unless they represent distinct task identities intentionally.

## Ad Hoc Task Rules

An ad hoc task supplied by the user may temporarily become the current task, but
it must not accidentally consume or delete the next queued task. Explicit prompt
paths still require prompt metadata matching `ACTIVE_PROJECT_ID`; they are not
cross-project overrides.

The current-task record must identify its source as one of:

- `Queue`
- `AdHoc`
- `ExplicitPath`
- `Recovery`

Completing an ad hoc task invokes normal advancement afterward. The next queued task is then promoted.

## Failure and Recovery Rules

| Condition | Required Behavior |
|---|---|
| Current task is completed but still present after restart | Finalize and advance automatically. |
| Queue is empty | Write or retain `Idle`; do not reuse the completed task. |
| Current-task metadata is malformed | Preserve the file, report the defect, and avoid consuming a queue item. |
| Current-task project ID conflicts with active project | Preserve the file, report a fatal task validation defect, and avoid consuming a queue item. |
| Queue entry is projectless | Preserve it, report migration required, and skip it for task loading. |
| Queue entry belongs to another project | Leave it untouched and continue looking for the first eligible active-project entry. |
| Prompt metadata conflicts with queue metadata | Preserve the queue entry, write or report a blocked state, and do not execute it. |
| Queue entry references a missing prompt | Set `Blocked`, record the missing path, and stop advancement. |
| Process stops during replacement | Recover from the temporary or backup file and re-run idempotent resolution. |
| `Todo.md` and `currentTask.md` disagree | Prefer stable task identity and journal evidence; do not consume another entry until reconciled. |

## Required Integration Points

- Shared `.AI` startup instructions must invoke this procedure before pre-evaluating a task.
- `LOAD TASK` must include current-task resolution and promotion semantics.
- `LOAD TASK` must filter queue selection by `ACTIVE_PROJECT_ID`.
- Task completion must invoke the completion procedure rather than only writing an execution result.
- Queue scripts must support safe promotion, not only insertion.
- Queue insertion must reject missing project identity and write structured
  project metadata.
- The execution record must identify the task status transition and the next promoted task, when present.

## Acceptance Conditions

The workflow is correct when all of the following are true:

- An active task survives restart without consuming another queue entry.
- Project identity is validated before task or queue access.
- Only the active project's queue entries are eligible for loading.
- Other projects' queue entries remain untouched.
- Projectless legacy entries are reported but never loaded.
- A completed task is replaced by the next queued task on completion or the next startup.
- Re-running startup is idempotent and does not skip tasks.
- `Blocked` and `Failed` tasks remain visible for intervention.
- An empty queue results in `Idle`, not reuse of the previous task.
- Ad hoc work does not remove a queued task.
- Queue and current-task mutations leave durable evidence.
