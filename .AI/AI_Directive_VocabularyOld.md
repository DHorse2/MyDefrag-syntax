# AI Directive Vocabulary

## Purpose

This document defines a compact, standardized vocabulary for directing
AI execution, workflow, and organizational operations.

The directives are intended to be understandable by both humans and AI
systems while remaining suitable for future deterministic parsing by the
MDM MCP.

## Design Principles

- Keep the vocabulary small and stable.
- Prefer semantic operations over implementation details.
- Separate execution, workflow, organization, and storage concerns.
- Allow different execution environments to implement the same
    directive appropriately.

## Execution Control

  Directive   Purpose
  ----------- ---------

| `DO NOW`  | Execute the **Active Task** immediately. Management operations are never re-executed by `DO NOW`. |

| `DO LATER` \| Record the work for future execution. \|

| `DO BY STEPS` \| Execute as an ordered sequence of steps. \|

| `PAUSE NOW` \| Complete the current work and wait. \|

| `STOP NOW` \| Complete the current work and wait. \|

| `CONTINUE NOW` \| Resume from the previous stopping point. \|

| `VERIFY NOW` \| Perform deterministic validation before continuing. \|

| `LOG THIS` \| Record execution evidence and results. \|

## Management Operations

### Queue

| Directive           | Purpose                                                                                                         |
| ---------------------| -----------------------------------------------------------------------------------------------------------------|
| `ADD QUEUE`         | Add a work item to the execution queue. The work item becomes **Queued**. It is **not executed**.               |
| `REMOVE QUEUE`      | Remove a queued work item. Does not affect the Active Task unless it was selected.                              |
| `UPDATE QUEUE`      | Modify an existing queued work item without changing its execution state.                                       |
| `PRIORITIZE QUEUE`  | Change queue ordering or priority. Does not execute work.                                                       |
| `SELECT QUEUE ITEM` | Select a queued work item and make it the candidate for loading. Selection alone does not execute the task.     |

### Execution Operations

| Directive         | Purpose                                                                                                         |
| -------------------| -----------------------------------------------------------------------------------------------------------------|
| `LOAD TASK`       | Load a work item into the Active Task. The task is analyzed and prepared for execution but is **not executed**. |
| `UNLOAD TASK`     | Remove the Active Task while preserving its state.                                                              |
| `CLEAR TASK`      | Clear the current Active Task.                                                                                  |
| `SET ACTIVE TASK` | Explicitly replace the current Active Task with another work item.                                              |

## Workflow Navigation

  Directive   Purpose
  ----------- ---------

| `SHOW CHATGPT TODO` \| Display ChatGPT prompt queue planning backlog. \|

| `PHASE` \| Identify the current execution phase. \|

| `STEP` \| Identify the current workflow step. \|

| `NEXT STEP` \| Proceed to the next logical step. \|

| `PREVIOUS STEP` \| Return to the previous step. \|

| `FIRST STEP` \| Navigate to the first step. \|

| `LAST STEP` \| Navigate to the final step. \|

| `GOTO STEP` \| Navigate directly to a named step. \|

| `GOTO PARENT` \| Navigate to the parent item in the current hierarchy.
  \|

| `RETURN` \| Return to the previous execution context. \|

## Block Structure

A block groups multiple user inputs into a single logical prompt.

After `BEGIN BLOCK` is issued, all subsequent user messages, directives,
file references, and UI submissions are considered part of the same
prompt.

The AI should:

- Continue accepting input without responding.
- Preserve the order of supplied information.
- Treat all content as belonging to a single task.
- Remain on the current topic.
- Suspend execution until instructed.

The current block ends when either:

- `DO NOW` is issued (implicitly ending the prompt block and beginning
    execution), or
- `END BLOCK` is issued.

  Directive   Purpose
  ----------- ---------

| `BEGIN BLOCK` \| PAUSE responses. Begin a logical block of related prompts. \|

| `END BLOCK` \| End the current logical block and process it. \|

| `BEGIN PHASE` \| Begin a major execution phase. \|

| `END PHASE` \| End the current execution phase. \|

## Dependencies

  Directive   Purpose
  ----------- ---------

| `REQUIRES` \| Required prerequisites, inputs, or context. \|

| `OPTIONAL` \| Optional supporting information. \|

| `DEPENDS ON` \| Indicates work that must be completed first. \|

## Outputs

  Directive   Purpose
  ----------- ---------

| `OUTPUT` \| Required deliverables. \|

| `ARTIFACTS` \| Files or other artifacts to create or modify. \|

| `RESULT` \| Expected outcome. \|

## Organizational Directives

These directives operate on conversations, tasks, prompts, documents,
execution records, or other managed artifacts.

The underlying implementation may involve files, databases, graph nodes,
or other storage mechanisms.

  Directive   Purpose
  ----------- ---------

| `SAVE` \| Persist the current work using the current storage policy.
  \|

| `SAVE TO` \| Persist the current work to the specified project,
  domain, or destination. \|

| `SAVE AS` \| Persist the current work using a new name or destination.
  \|

| `COPY TO` \| Duplicate the current work into another project, domain,
  or destination. \|

| `MOVE TO` \| Relocate ownership of the current work to another
  project, domain, or destination. \|

| `DELETE` \| Remove the current work according to the applicable
  deletion policy. \|

| `ARCHIVE` \| Move the current work into long-term storage according to
  the applicable archival policy. \|

## Future Work

  Directive   Purpose
  ----------- ---------

| `TODO` \| Work intentionally left for the future. \|

| `FOLLOW-UP` \| Recommended future activity. \|

| `DEFERRED` \| Work postponed by design. \|
