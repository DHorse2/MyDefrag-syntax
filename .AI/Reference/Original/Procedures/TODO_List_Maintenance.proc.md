# Procedure - TODO List Maintenance

<!-- markdownlint-disable MD013 -->

## Purpose

Walk a TODO list as a managed work queue. Select actionable items, maintain item status, record progress, identify blockers, and preserve execution evidence.

## Applicability

Use this procedure when the task asks an AI agent to review, process, update, execute, or maintain a TODO list.

This procedure is especially applicable to:

- Project TODO lists.
- AI-generated TODO lists.
- Review TODO lists.
- Test framework TODO lists.
- Cleanup TODO lists.
- Backlog-style Markdown task documents.

## Prerequisites

Before using this procedure:

- A TODO list path must be provided or discoverable.
- The active role must have authority to inspect and update the TODO list.
- The expected output behavior must be known:
  - update the existing TODO list,
  - create a task from the next item,
  - execute the next item,
  - or report recommended next actions.
- Applicable standards must be identified.

## Inputs

Typical inputs include:

- User instructions.
- TODO list document.
- Current task.
- Applicable procedures.
- Applicable standards.
- Relevant project context.
- Prior execution records, when available.

## Required Standards

Load only the standards required for the current task, for example:

- Global Markdown Documentation Standard.
- Output Document Formatting Rules.
- Execution Record Standard, when execution recording is required.

## Invoked Procedures

This procedure may invoke:

- `Validation.proc.md`
- `Execution_Record.proc.md`
- `Execution_Record_Metrics.md`

Load invoked procedures only when required by the task and only once per run.

Do not recursively load procedures beyond one level unless explicitly instructed.

## Status Values

Use these status values consistently.

| Status | Meaning |
| --- | --- |
| Created | Item has been newly created and has not yet been triaged. |
| Open | Item is known and available for future work. |
| Ready | Item is actionable now and has no known blocker. |
| In Progress | Work has started but is not complete. |
| Blocked | Work cannot continue until a dependency, decision, or missing resource is resolved. |
| Deferred | Item is intentionally postponed. |
| Completed | Work is complete and validated. |
| Cancelled | Item will not be performed. |
| Duplicate | Item is covered by another TODO item. |
| Needs Review | Work appears complete but needs review or approval. |
| Closed | Item is closed. |
| Archive | Archive this data. |

Use `Completed` as the preferred final success status.
Use `Closed` as the expected final state aside from archiving.
Alias word like `Done` are normalized to the TODO list vocabulary.

## Required TODO Fields

When creating or normalizing TODO items, prefer these fields:

| Field | Purpose |
| --- | --- |
| ID | Stable unique item identifier. |
| Priority | Critical, High, Medium, Low. |
| Status | Current lifecycle status. |
| Area | Functional area or component. |
| Title | Short action-oriented summary. |
| Description | What needs to be done. |
| Rationale | Why the item exists. |
| Execution Prompt | Concise instruction that lets an AI agent execute the item without asking what to do next. |
| Prompt Reference | Optional reference to a reusable prompt, procedure, or named workflow used to execute the item. |
| Affected Files Or Components | Paths or components affected. |
| Dependencies | Blocking or prerequisite items. |
| Suggested Order | Recommended execution order. |
| Created | Creation date when available. |
| Updated | Last update date when available. |
| Result | Outcome or link to completion evidence. |

Do not require every legacy TODO list to already contain every field. Normalize only when requested or when safely possible.

## Planned Enhancement - Queue-Oriented TODO Items

TODO lists are lightweight work queues in the current implementation. They are
not yet first-class queue files, but TODO items should be written so they can be
promoted into future queue items.

A TODO item intended for AI execution should include either:

- A concise `Execution Prompt` that directly states the work to perform.
- A `Prompt Reference` that points to a reusable prompt procedure plus enough
  item-specific input to run it.

Reusable prompts are versioned execution procedures that may be associated with
one or more queue item types. Queue items reference prompts; they do not embed
execution procedures.

Example TODO item with an execution prompt:

| Field | Value |
| --- | --- |
| ID | TODO-001 |
| Priority | High |
| Status | Ready |
| Area | Documentation |
| Title | Document current-task clearing behavior. |
| Execution Prompt | Update `Start_Here.md` to explain that clearing `currentTask.md` returns the system to ad hoc mode. |
| Affected Files Or Components | `.AI/Start_Here.md` |

Example TODO item with a reusable prompt reference:

| Field | Value |
| --- | --- |
| ID | TODO-002 |
| Priority | Medium |
| Status | Ready |
| Area | Review |
| Title | Review prompt library for stale task assumptions. |
| Prompt Reference | `.AI/Prompts/Detailed Project Review Prompt.md` |
| Execution Prompt | Use the referenced review prompt against `.AI/Prompts` and report current-task assumptions separately from reusable prompt assets. |

The reusable prompt remains a versioned execution procedure. The TODO item
should reference it and provide item-specific input rather than embedding the
execution procedure.

## Selection Rules

When selecting the next actionable item:

1. Exclude items with status `Completed`, `Cancelled`, or `Duplicate`.
2. Exclude `Blocked` items unless the current task is to resolve blockers.
3. Prefer `In Progress` items before starting new work.
4. Prefer `Ready` items over `Open` or `Created` items.
5. Sort by priority:
   - Critical
   - High
   - Medium
   - Low
6. Respect dependencies and suggested order.
7. If multiple items remain tied, choose the item with the lowest stable ID or earliest creation date.

Record the selection rationale in the execution record when execution recording is enabled.

## Steps

1. Identify the TODO list path.
2. Load the TODO list.
3. Validate that the file is a TODO-style document or backlog.
4. Identify status vocabulary used by the existing file.
5. Normalize status interpretation without rewriting the file unless requested.
6. Identify all TODO items and their current status.
7. Determine whether the task is to:
   - create TODO items,
   - update TODO status,
   - select the next item,
   - execute the next item,
   - or summarize the queue.
8. Select the next actionable item when required.
9. If executing work, mark the selected item `In Progress` before execution when file modification is allowed.
10. Perform or delegate the selected work according to the active role and procedures.
11. Validate the result.
12. Update TODO status:

    - `Completed` when work is complete and validated.
    - `Needs Review` when work is complete but requires approval.
    - `Blocked` when work cannot proceed.
    - `Deferred` when intentionally postponed.

13. Record result evidence, affected files, artifacts, and unresolved issues.
14. Produce or update the execution record when required.

## Output Requirements

Typical outputs include:

- Updated TODO list.
- Queue summary.
- Selected next item.
- Status changes.
- Blocker report.
- Completion evidence.
- Execution record, when required.

When updating a TODO list, preserve existing structure and style unless a normalization task explicitly requests restructuring.

## Validation

Validation should confirm that:

- The TODO list was loaded from the resolved path.
- Status values are valid or explicitly mapped.
- Selected items are actionable.
- Completed items include evidence or rationale.
- Blocked items identify the blocker.
- Modified TODO lists remain valid Markdown.
- Created or modified artifacts are identified.
- Execution record requirements were satisfied when applicable.

## Completion Criteria

This procedure is complete when:

- The requested TODO maintenance action is complete.
- The TODO list status accurately reflects the current state.
- Any selected or completed item has supporting evidence.
- Validation has been completed or explicitly reported as unavailable.
- The execution record has been produced or updated when required.

## Notes

This procedure defines **how** TODO list maintenance is performed.

It does not define **who** performs the work. The active role defines authority and responsibility, while standards define the rules this procedure must satisfy.

TODO lists should be treated as lightweight work queues. Future Run Control implementations may map TODO items to run requests, run logs, artifacts, metrics, and graph updates.
