# Codex Task: Repair Deterministic Queue Handoff

## Context

The AI task queue accepts new prompt entries, and task execution records appear to mark the active task as completed. However, Codex remains bound to the existing `Prompts\currentTask.md` and does not advance to the next queued task.

The likely contract defect is that completion recording and queue advancement are separate operations, with no mandatory handoff transition connecting them. Startup also appears to treat the existence of `currentTask.md` as authoritative without first checking whether its task has already reached a terminal status.

## Objective

Repair the shared `.AI` workflow so that Codex deterministically resolves the current task, detects completed current tasks, finalizes them, and promotes the next eligible queued task.

The repair must work both immediately after task completion and during startup recovery after an interrupted handoff.

## Required Inputs

Resolve and inspect the actual local files before editing. At minimum, inspect:

- Project-local `.AI` override rules.
- `D:\AI\.AI\Instructions.md` or the actual shared startup definition.
- `D:\AI\.AI\AI_Directive_Vocabulary.md`.
- `D:\AI\.AI\Todo.md`.
- `D:\AI\.AI\Prompts\currentTask.md`.
- `D:\AI\.AI\Scripts\Add-AiTodoPrompt.ps1`.
- Existing queue, current-task, startup, completion, journaling, and execution-record procedures or scripts.
- The actual format used by queue entries and current-task status records.

Use project-local equivalents when the project-local `.AI` directory exists.

## Supplied Definition Files

Use the supplied replacement and procedure documents as normative input:

- `AI_Directive_Vocabulary.md`
- `Task_Queue_Workflow.proc.md`

Preserve unrelated existing vocabulary and procedures. Integrate the new lifecycle semantics without deleting valid local rules.

## Required Behavior

### Startup Resolution

Before loading or pre-evaluating `currentTask.md`, Codex must:

1. Resolve `PROJECT_ROOT` and `AI_ROOT` using the established project-local override rule.
2. Read the canonical current-task status.
3. Keep `Ready`, `Loaded`, or `In Progress` as the active current task.
4. Keep `Blocked` or `Failed` as current and require intervention.
5. Treat `Completed`, `Skipped`, and `Cancelled` as terminal auto-advance states.
6. When the current task is terminal, missing, empty, or explicitly `Idle`, promote the next eligible queue entry.
7. Load and pre-evaluate the resulting task without automatically executing it.
8. Stop at the existing execution cutoff unless an execution directive authorizes execution.

### Completion Handoff

After successful validation and execution recording, Codex must:

1. Persist the current task as `Completed` using canonical machine-readable state.
2. Persist the execution identifier and completion timestamp.
3. Finalize only the matching queue entry by stable task identity or normalized prompt path.
4. Promote the next eligible queue item into `Prompts\currentTask.md`.
5. Report the next task as loaded or ready, without executing it automatically.
6. Write `Idle` when no eligible queued task remains.

The ordering must support crash recovery. If execution stops after status becomes `Completed` but before the next task is promoted, the next startup must complete the handoff.

### Deterministic Resolver

Implement or extend a deterministic PowerShell helper for current-task resolution and advancement. Prefer a focused new script such as:

`<AI_ROOT>\Scripts\Resolve-AiTaskQueue.ps1`

Use an existing queue-control script instead when it already owns this responsibility cleanly.

The resolver must:

- Support project-local `.AI` before the shared fallback.
- Read the existing queue format rather than inventing an incompatible parallel queue.
- Use stable task or queue-entry identity.
- Be idempotent.
- Avoid consuming two tasks when run twice.
- Use temporary files and same-directory replacement for critical writes.
- Preserve backups according to existing workspace policy.
- Support `-WhatIf` where practical.
- Return a clear structured or parseable result identifying current status, promoted task, queue state, and any blocking defect.

### Current-Task State

If `currentTask.md` lacks reliable machine-readable state, add the smallest compatible control representation. Preserve its human-readable restart and prompt content.

Required fields:

- `schemaVersion`
- `taskId`
- `status`
- `promptPath`
- `queueEntryId`
- `source`
- `executionId`
- `updatedAt`

Do not infer completion by searching arbitrary prose in an execution summary.

### Definition Updates

Update the actual shared `.AI` definitions so the behavior is mandatory, including:

- Redefine `LOAD TASK` to resolve task state and promote when necessary.
- Define `COMPLETE TASK` and `ADVANCE TASK` semantics.
- Load or reference the task queue workflow procedure from the startup instructions.
- Insert current-task resolution before task pre-evaluation.
- Insert completion handoff after validation and execution-record finalization.
- Keep `Blocked` and `Failed` from silently advancing.

### Queue Insertion Compatibility

Do not break `Add-AiTodoPrompt.ps1` or its current parameters:

- `-PromptPath`
- `-TodoPath`
- `-Position`
- `-Top`
- `-Force`
- `-WhatIf`
- `-Confirm`

Queue insertion and queue promotion may use separate scripts, but their task identity and queue format must be compatible.

## Acceptance Tests

Create deterministic tests or a disposable test harness covering at least:

| Scenario | Expected Result |
|---|---|
| Active current task plus queued tasks | Current task remains active; queue is unchanged. |
| Completed current task plus two queued tasks | Exactly the first queued task becomes current; second remains queued. |
| Resolver run twice after the same completion | No additional task is consumed. |
| Completed current task with empty queue | Current task becomes `Idle`; completed task is not loaded again. |
| Blocked current task plus queued task | Blocked task remains current; queued task is not promoted. |
| Failed current task plus queued task | Failed task remains current; queued task is not promoted. |
| Missing current-task file plus queued task | First queued task is promoted. |
| Missing prompt referenced by next queue entry | State becomes `Blocked`; queue evidence is preserved. |
| Ad hoc current task plus queued task | Ad hoc task runs independently; queued task is promoted only after ad hoc completion. |
| Crash window after marking `Completed` but before promotion | Next startup completes the handoff exactly once. |
| `-WhatIf` resolver run | Planned changes are reported without mutating files. |

Use temporary test data. Do not consume the user's real queue during tests.

## Scope Constraints

- Preserve existing paths, filenames, task entries, and execution history.
- Do not broadly redesign the queue format unless the current format cannot support stable identity or status.
- Do not remove current startup approval or execution-cutoff behavior.
- Do not auto-execute a newly promoted task merely because advancement succeeded.
- Do not silently skip malformed, missing, blocked, or failed tasks.
- Keep changes focused on task lifecycle, startup resolution, completion handoff, and deterministic queue mutation.

## Validation

Validate:

- PowerShell syntax for every modified or added script.
- Markdown compliance for every modified definition.
- All unordered and task-list bullets use `-`, never `*`.
- Queue insertion behavior remains compatible.
- All acceptance scenarios pass against disposable data.
- The real queue and current-task files remain unchanged during testing unless this task explicitly performs the final controlled migration.

## Execution Record

Produce or update the required execution record and include:

- Root cause.
- Definitions changed.
- Scripts changed or added.
- Current-task state representation.
- Queue mutation algorithm.
- Validation commands and results.
- Migration or recovery action applied to the currently stuck task.
- The task promoted after repair, if one is safely promoted.
- Remaining risks or follow-up work.

## Expected Result

Codex no longer remains stuck on a completed `currentTask.md`. Completion and startup both converge on the same idempotent resolver, which either retains a genuinely active/intervention task, promotes exactly one eligible queued task, or enters `Idle` when the queue is empty.
