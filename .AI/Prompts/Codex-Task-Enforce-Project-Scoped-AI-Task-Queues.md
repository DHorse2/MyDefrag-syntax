# Codex Task: Enforce Project-Scoped AI Task Queues

## Task Metadata

| Field | Value |
|------|-------|
| Task ID | `enforce-project-scoped-ai-task-queues` |
| Project ID | `ai-workspace` |
| Project Name | AI Operating Environment |
| Project Root | `D:\AI` |
| Execution Mode | Detailed |
| Status | Ready |
| Primary Objective | Ensure every queued task is assigned to one specific project and Codex loads only tasks assigned to its active project. |

## Context

The current AI task workflow permits prompts to be added to a shared queue, but the documented and implemented workflow does not yet reliably enforce project ownership.

The required model is:

- Every executable queue item belongs to exactly one project.
- Each Codex workspace resolves its active project identity once.
- `LOAD TASK` loads only an eligible task assigned to that active project.
- Queue items belonging to other projects are not consumed, modified, claimed, or reordered.
- Project identity is stored under the target project's `.vscode` directory.
- A project-local `.AI` directory is not the normal location for project identity.
- A project-local `.AI` directory replaces the shared `D:\AI\.AI` root when present.
- The active AI root is selected once and cached for the run.
- Codex must not perform repeated file-by-file probes for local overrides.
- Missing, malformed, ambiguous, or inconsistent project identity is a fatal Codex error.
- On a fatal project identity error, Codex must halt before loading, claiming, or executing any task.

The current ChatGPT bootstrap source is under:

```text
D:\AI\ChatGPT
```

The shared AI workflow root is:

```text
D:\AI\.AI
```

The queue script is expected at:

```text
D:\AI\.AI\Scripts\Add-AiTodoPrompt.ps1
```

Inspect the live implementation and all related queue, task-loading, startup, run-control, project-context, and documentation files before making changes. Do not assume that the documentation completely describes the implementation.

## Required Project Identity Location

Use a project identity file at:

```text
<PROJECT_ROOT>\.vscode\ai-project.json
```

Use an explicit schema similar to:

```json
{
  "schemaVersion": "1.0",
  "projectId": "mydefrag-syntax",
  "projectName": "MyDefrag Language Extension",
  "projectRoot": "D:\\Script\\MyDefrag-syntax"
}
```

Requirements:

- `projectId` is the stable queue-matching identity.
- `projectName` is descriptive metadata.
- `projectRoot` is operational metadata used for validation and diagnostics.
- Project identity must not be inferred only from a prompt filename, directory name, current working directory, repository name, or free-form prompt content.
- Project identity must not normally be stored in `<PROJECT_ROOT>\.AI`.
- Define a deliberate project ID for workspace-administration tasks, such as `ai-workspace`.
- Preserve compatibility with existing projects only where it does not weaken project isolation.

## Fatal Project Identity Policy

Project identity is mandatory.

Codex must halt when any of the following is true:

- `<PROJECT_ROOT>\.vscode\ai-project.json` is missing.
- The identity file cannot be read.
- The JSON is malformed.
- `schemaVersion` is missing or unsupported.
- `projectId` is missing, empty, invalid, or ambiguous.
- `projectRoot` is missing or does not match the resolved project root according to the defined normalization policy.
- Multiple conflicting project identities are discovered.
- A supplied queue command uses a `ProjectId` that conflicts with the identity resolved from `ProjectRoot`.
- A task prompt or queue item contains a project identity conflicting with the active project.
- The active project cannot be resolved deterministically.

On this error:

- Do not fall back to a global project.
- Do not infer a project identity.
- Do not load `currentTask.md`.
- Do not scan for an arbitrary eligible task.
- Do not claim, dequeue, reorder, alter, or execute any queue item.
- Emit a clear fatal diagnostic identifying the missing or invalid file and the corrective action.
- Record the failure in the execution journal when journaling is available without requiring task execution.
- Exit or return a non-success status suitable for deterministic automation.

The required behavior is conceptually:

```text
resolve PROJECT_ROOT
read <PROJECT_ROOT>\.vscode\ai-project.json

if project identity is invalid:
    report fatal project identity error
    HALT

continue startup only after identity validation succeeds
```

## Required AI Root Resolution Model

After project identity succeeds, resolve the active AI root once:

```text
PROJECT_AI_ROOT = <PROJECT_ROOT>\.AI
SHARED_AI_ROOT = D:\AI\.AI

if PROJECT_AI_ROOT exists:
    ACTIVE_AI_ROOT = PROJECT_AI_ROOT
else:
    ACTIVE_AI_ROOT = SHARED_AI_ROOT
```

Requirements:

- Treat `<PROJECT_ROOT>\.AI` as a complete replacement for `D:\AI\.AI`.
- Do not treat it as a file-by-file overlay.
- Do not silently fall back to an individual shared file when the selected project-local root is missing that file.
- Apply the existing required-versus-optional resource policy after selecting `ACTIVE_AI_ROOT`.
- Cache `PROJECT_ROOT`, `ACTIVE_PROJECT_ID`, and `ACTIVE_AI_ROOT` for the current Codex run.
- Subsequent resource loads must use the cached resolution.
- Avoid repeated filesystem checks during normal task loading and execution.
- Preserve any explicit refresh or restart behavior required after project configuration changes.

## Required Startup Order

Implement or document this order:

1. Resolve `PROJECT_ROOT`.
2. Read and validate `<PROJECT_ROOT>\.vscode\ai-project.json`.
3. Halt on any project identity error.
4. Set and cache `ACTIVE_PROJECT_ID`.
5. Test once whether `<PROJECT_ROOT>\.AI` exists.
6. Select and cache `ACTIVE_AI_ROOT`.
7. Load startup resources only from `ACTIVE_AI_ROOT`.
8. Initialize project-filtered queue access.
9. Permit `LOAD TASK` only after all preceding steps succeed.

Project identity validation must occur before queue selection.

## Required Queue Insertion Behavior

Update `Add-AiTodoPrompt.ps1` and any related queue-writing implementation so every newly queued task has a project identity.

Preferred command contract:

```powershell
& "D:\AI\.AI\Scripts\Add-AiTodoPrompt.ps1" `
    -PromptPath "D:\AI\.AI\Prompts\Example-Task.md" `
    -ProjectId "mydefrag-syntax" `
    -Position bottom
```

Requirements:

- Add a mandatory or deterministically resolvable `ProjectId`.
- Support `-ProjectRoot` only when it resolves `.vscode\ai-project.json` deterministically.
- If both `-ProjectId` and `-ProjectRoot` are supplied, validate that they agree.
- Missing project identity is an error. Do not queue the task.
- Invalid project identity is an error. Do not queue the task.
- Do not infer the project from the prompt filename.
- Do not add an executable queue item without a valid project assignment.
- Preserve existing `-Top`, `-Position`, `-Force`, `-WhatIf`, `-Confirm`, backup, and reporting behavior.
- Preserve compatibility where safe, but do not retain unsafe projectless insertion.
- Provide a clear migration error for older invocations that omit project identity.
- Ensure `-WhatIf` reports the project assignment and intended queue operation without modifying files.
- Update comment-based help, examples, parameter documentation, and output messages.

## Required Queue Item Model

Each queue item must contain or reference at least:

```yaml
projectId: mydefrag-syntax
taskId: expand-locale-samples
promptPath: D:\AI\.AI\Prompts\Codex-Task-Expand-Locale-Samples.md
status: queued
```

Where the current queue format cannot represent structured metadata directly, introduce the smallest durable format change that supports deterministic parsing.

Requirements:

- Do not rely on display-text parsing when a structured field is practical.
- Preserve queue ordering.
- Preserve existing backups.
- Preserve existing prompt artifacts.
- Preserve completed task history.
- Preserve task status where it can be migrated safely.
- Identify projectless legacy queue entries as invalid or migration-required.
- Do not silently assign legacy entries to the active project.

## Required Prompt Metadata

Every generated Codex task prompt intended for the queue must explicitly declare:

```yaml
taskId: expand-locale-samples
projectId: mydefrag-syntax
projectRoot: D:\Script\MyDefrag-syntax
```

Requirements:

- Queue metadata is authoritative for queue selection.
- Prompt metadata must agree with queue metadata.
- A mismatch is a fatal task validation error.
- Do not execute a mismatched task.
- Keep prompt files as durable artifacts.
- Do not derive project identity from the prompt filename.

## Required `LOAD TASK` Behavior

Redefine and implement `LOAD TASK` as:

> Load the next eligible queued task assigned to the active project, pre-evaluate it, and do not execute it.

A task is eligible only when:

```text
queueItem.projectId == ACTIVE_PROJECT_ID
```

Also exclude tasks that are:

- Assigned to another project.
- Missing a project ID.
- Assigned to an unknown project.
- Already claimed by another active execution.
- Blocked by dependencies.
- Completed.
- Cancelled.
- Archived.
- Structurally invalid.
- In conflict with prompt metadata.

Requirements:

- Skip other projects' tasks without consuming, modifying, or reordering them.
- Do not treat a projectless task as globally eligible.
- An explicitly supplied prompt path must still pass project validation.
- An explicit path is not a cross-project override.
- If no eligible task exists for the active project, report that result without loading another project's task.
- If the active project identity is unavailable, halt rather than searching the queue.
- Pre-evaluation must not begin until project matching succeeds.

## Required Task Claim Behavior

When Codex loads a task, record a deterministic claim containing at least:

```yaml
projectId: mydefrag-syntax
taskId: expand-locale-samples
claimedBy:
  agent: codex
  computer: Nanaimo
  workspaceRoot: D:\Script\MyDefrag-syntax
status: loaded
```

Requirements:

- Claim operations must be atomic or otherwise protected against concurrent Codex windows.
- A claim must include the active project identity.
- Another project must never claim the task.
- Another Codex instance must not load the same claimed task unless the existing claim is explicitly released, expired, or recovered under defined policy.
- Preserve evidence of claim, release, completion, failure, and cancellation.

## Required `currentTask.md` Behavior

Review the compatibility behavior around:

```text
D:\AI\.AI\Prompts\currentTask.md
```

Requirements:

- Prefer project-scoped current-task state where the existing architecture supports it.
- Any shared `currentTask.md` must include a project ID.
- Codex must reject a shared current task whose project ID does not match `ACTIVE_PROJECT_ID`.
- Missing active project identity must halt before reading `currentTask.md`.
- An explicit task path must not bypass project validation.
- Document whether `currentTask.md` remains compatibility-only and how it relates to the queue.

## Required Documentation Changes

Review and update the actual source files that define or describe:

- Bootstrap startup.
- Active project resolution.
- AI root resolution.
- Queue insertion.
- Queue item format.
- `LOAD TASK`.
- `DO NOW`.
- Prompt generation.
- Project context.
- Run control.
- Current-task compatibility.
- Fatal startup and validation errors.

Likely files include, but are not limited to:

```text
D:\AI\ChatGPT\ChatGPT-Developer-Bootstrap.md
D:\AI\ChatGPT\Bootstrap\
D:\AI\ChatGPT\Rules\
D:\AI\ChatGPT\Vocabulary\
D:\AI\ChatGPT\Projects\
D:\AI\ChatGPT\Context-Loader.md
D:\AI\.AI\Instructions.md
D:\AI\.AI\AI_Directive_Vocabulary.md
D:\AI\.AI\Scripts\Add-AiTodoPrompt.ps1
```

Find the actual files before editing. Do not create duplicate competing definitions when an authoritative document already exists.

Update the definition of `LOAD TASK` so that it explicitly means the next eligible task for the active project.

## Performance Requirements

The implementation must avoid repeated project and AI-root discovery.

Requirements:

- Resolve project identity once during startup.
- Resolve `ACTIVE_AI_ROOT` once during startup.
- Cache both for the run.
- Use normalized cached values for task matching.
- Do not repeatedly search parent directories during each resource access.
- Do not repeatedly test both local and shared paths for every file.
- Do not reread the project identity for every queue item.
- Permit an explicit refresh only when configuration changes or a new run begins.
- Add instrumentation or tests sufficient to detect accidental repeated resolution where practical.

## Migration Requirements

Inspect existing queue entries, prompt files, `currentTask.md`, and run-control files.

Create a safe migration approach that:

- Identifies projectless legacy tasks.
- Does not silently assign them.
- Allows an operator to assign a project explicitly.
- Preserves ordering and history.
- Backs up modified queue files.
- Is compatible with `-WhatIf`.
- Reports unresolved entries clearly.
- Does not load unresolved entries.

Do not delete legacy tasks merely because they lack project metadata.

## Validation Requirements

Add or update deterministic tests for at least:

- Valid project identity file.
- Missing project identity file causes a fatal halt.
- Malformed project identity JSON causes a fatal halt.
- Missing `projectId` causes a fatal halt.
- Mismatched `projectRoot` causes a fatal halt.
- Local `.AI` selected once when present.
- Shared `D:\AI\.AI` selected once when local `.AI` is absent.
- No file-by-file fallback from local `.AI` to shared `.AI`.
- Queue insertion with valid `ProjectId`.
- Queue insertion without project identity fails.
- `ProjectId` and `ProjectRoot` disagreement fails.
- `-WhatIf` makes no changes.
- `LOAD TASK` selects the first eligible task for the active project.
- `LOAD TASK` skips another project's earlier queue item without altering it.
- Projectless queue items are not loaded.
- Explicit task paths cannot bypass project matching.
- Prompt metadata mismatch prevents loading or execution.
- No eligible task produces a non-destructive result.
- Concurrent claims do not load the same task twice.
- Existing script parameters and backup behavior remain functional.

Run the relevant PowerShell, parser, schema, unit, and integration tests available in the workspace.

## Implementation Constraints

- Preserve existing functionality unless it conflicts with project isolation.
- Prefer additive, minimal changes.
- Do not make unrelated formatting or architectural changes.
- Do not rename established files without a demonstrated need.
- Preserve provenance and execution evidence.
- Use deterministic parsing and validation.
- Separate project identity policy from queue storage mechanics where practical.
- Maintain Windows path handling and PowerShell compatibility.
- Follow existing Markdown standards.
- Use `-` for all unordered-list and task-list items.
- Perform a final Markdown compliance check before completion.

## Required Deliverables

- Updated project identity schema and resolution behavior.
- Fatal startup behavior for missing or invalid project identity.
- Updated queue insertion script and help.
- Updated structured queue representation or the minimal equivalent.
- Project-filtered `LOAD TASK` implementation.
- Task claim protection.
- Legacy queue migration support or a documented migration utility.
- Updated ChatGPT and shared AI workflow documentation.
- Automated validation covering the required cases.
- Execution record containing:
  - Files inspected.
  - Files changed.
  - Architectural decisions.
  - Migration decisions.
  - Tests run.
  - Test results.
  - Remaining risks or deferred work.

## Completion Criteria

This task is complete only when:

- A task cannot enter the executable queue without a valid project identity.
- Codex cannot continue startup without a valid `.vscode\ai-project.json`.
- Codex halts before queue access when project identity is missing or invalid.
- Codex resolves project identity and the active AI root once per run.
- A project-local `.AI` acts as a complete replacement, not an overlay.
- `LOAD TASK` selects only tasks matching the active project ID.
- Cross-project tasks remain untouched.
- Explicit paths cannot bypass project matching.
- Legacy projectless tasks are preserved but never silently loaded.
- Queue insertion, loading, claiming, and documentation agree on the same project identity model.
- Deterministic tests pass.
- The final Markdown compliance check finds no `*` unordered-list bullets.
