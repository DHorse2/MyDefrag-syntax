# Run Control, Execution Workflow, and Project Files

<!-- markdownlint-disable MD003 MD013 MD023 MD026 MD030 MD035 -->

## Purpose

The AI execution environment separates **execution policy** from
**project work**, **mutable state**, and **immutable evidence**.

- **Run Control** defines how work is performed.
- **Current Task** defines the active task handoff for the current
  implementation. It is the runtime execution handoff and restart checkpoint,
  not the authoritative source of work.
- **Queue Items** are project-scoped work references in the current Markdown
  queue and future structured work objects.
- **State** records the current mutable execution condition.
- **Journal** records immutable append-only execution evidence.
- **Prompt History** stores prompt snapshots for reproducibility.
- **Diagnostic Explorer** provides the operational view of execution.

This separation allows the same tasks to be executed by different AI
agents while maintaining consistent logging, auditing, and workflow.

## Core Runtime Files

| Component | Typical Location | Purpose |
| --- | --- | --- |
| Run Control | `.AI\Prompts\RunControl.md` | Defines execution policy, workflow, logging, checkpoints, and execution behavior. |
| Current Task | `.AI\Prompts\currentTask.md` | Runtime execution handoff and restart checkpoint generated immediately before execution. It is not the authoritative source of work. |
| Project Identity | `.vscode\ai-project.json` | Required project identity used to filter queue loading and validate prompt metadata. |
| Prompt Library | `.AI\Prompts\` | Reusable prompts, templates, procedures, and execution policies. |
| Context Library | `.AI\Context\` | Shared AI reference documentation and operational knowledge. |
| AI Documentation | `.AI\` | Human and AI documentation describing the execution environment. |
| Run Evidence | `runs\<date>\<timestamp>_<executionId>\` | Transitional file-based execution evidence package for a completed or in-progress run. |
| Computer-Local Domains | `.AI\Computers\<ComputerName>\` | Machine-local configuration, state, journal, prompt history, cache, logs, and temporary files. |

`currentTask.md` is a runtime handoff file and restart checkpoint. It is not the
authoritative source of work and is not intended to remain the permanent source
of all work once queue-driven Run Control exists.

## Computer-Scoped Runtime Domains

Machine-local runtime information belongs under the current computer, not under
project-neutral structures.

Recommended structure:

```text
.AI/
|-- Computers/
|   `-- <ComputerName>/
|       |-- Configuration/
|       |-- State/
|       |-- Journal/
|       |-- Prompt/
|       |-- Cache/
|       |-- Logs/
|       `-- Temp/
```

| Component | Typical Location | Purpose |
| --- | --- | --- |
| Local Configuration | `.AI\Computers\<ComputerName>\Configuration\` | Machine-local preferences and runtime settings. |
| Current State | `.AI\Computers\<ComputerName>\State\` | Mutable execution condition such as active execution, checkpoint, loaded prompt, or navigation position. |
| Journal | `.AI\Computers\<ComputerName>\Journal\` | Append-only immutable evidence records for prompts, commands, decisions, diagnostics, outputs, warnings, errors, and observations. |
| Prompt History | `.AI\Computers\<ComputerName>\Prompt\` | Prompt snapshots captured for reproducibility. |
| Cache | `.AI\Computers\<ComputerName>\Cache\` | Disposable derived data such as indexes, parsed trees, embeddings, exports, and search databases. |
| Logs | `.AI\Computers\<ComputerName>\Logs\` | Machine-local operational logs that are not canonical project knowledge. |
| Temporary Files | `.AI\Computers\<ComputerName>\Temp\` | Temporary files that may be deleted without data loss. |

The top-level `runs\<date>\<run-id>\` evidence package remains valid as a
portable export of execution evidence. It should reference computer-scoped
journal and prompt records when those records exist.

## Domain Ownership Rules

| Domain | Responsibility | Computer Scoped |
| --- | --- | --- |
| Projects | Durable project knowledge, documentation, research, decisions, and procedures. | No |
| ToDo | Work objects and task queues. | No |
| Requirements | Durable requirements and requirement traceability. | No |
| Procedures | Reusable workflows and execution procedures. | No |
| Run Control | Execution lifecycle and coordination. | No |
| Journal | Immutable execution evidence. | Yes |
| State | Mutable current condition. | Yes |
| Knowledge | Reviewed, promoted information distilled from evidence. | No |
| Configuration | Behavior controls and preferences. | Yes for local settings |
| Cache | Disposable derived data. | Yes |
| Prompt History | Prompt snapshots for reproducibility. | Yes |

Domains reference each other by identifiers instead of containing each other.
For example, a journal entry references an execution, a run references projects
and TODO items, and promoted knowledge references the journal evidence that
produced it.

## Current Implementation - Workflow Constraints

The current workflow remains file-based and task-handoff driven:

- `Scripts\Resolve-AiTaskQueue.ps1` resolves current-task state before startup
  reads `Prompts\currentTask.md`.
- `Scripts\Resolve-AiTaskQueue.ps1` validates
  `<PROJECT_ROOT>\.vscode\ai-project.json` before reading current-task or
  queue state.
- `Todo.md` is the current Markdown checklist queue used by the resolver. Each
  executable entry must include `projectId` and `taskId` metadata.
- `Prompts\currentTask.md` is the default entry point loaded by startup after
  resolution.
- `Prompts\currentTask.md` is the runtime execution handoff and restart
  checkpoint generated immediately before execution and contains compact
  machine-readable task state, including project identity and claim metadata.
- `LOAD TASK` selects only the first eligible queue entry whose `projectId`
  matches the active project identity.
- Queue entries for other projects and projectless legacy entries are preserved
  but are not consumed, modified, claimed, or reordered by the active project.
- Alternative task files or ad hoc user requests may override queue selection
  when explicitly supplied, but they must still declare prompt metadata matching
  the active project.
- Terminal `currentTask.md` states such as `Completed`, `Skipped`, and
  `Cancelled` are auto-advance states; `Blocked` and `Failed` require
  intervention and must not silently advance.
- Completion handoff writes the terminal current-task state, finalizes only the
  matching queue entry by stable identity or normalized prompt path, then
  promotes exactly one eligible queued task or writes `Idle`.
- Reusable prompt files are assets, not automatically active tasks.
- Clearing or ignoring `currentTask.md` is required when switching to ad hoc
  mode so stale task content does not continue to control execution.
- Computer-local state, journals, prompt snapshots, caches, logs, and temporary
  files belong under `.AI\Computers\<ComputerName>\`.
- `runs\<date>\<run-id>\` remains a transitional evidence package and should
  not become the owner of mutable state.

The structured Queue directory described below remains recommended future
architecture. The implemented queue contract today is the project-scoped
`Todo.md` Markdown checklist plus deterministic resolver.

## Planned Enhancement - Execution Context

Run Control should eventually manage Execution Context records that reference
project-neutral domains and computer-scoped runtime domains without merging
their responsibilities.

An Execution Context connects:

- Project
- Runtime
- Window
- Agent
- Queue item
- Prompt reference
- Generated current task
- Run
- State record
- Journal records
- Prompt snapshot
- Artifacts
- Execution record
- Validation results
- Evidence package

The singleton controller coordinates execution contexts across active runtimes.
It does not own every project's queue, `currentTask.md`, run folder, or
artifacts, and it does not place computer names inside project-owned
structures.

## Future Architecture - Recommended Queue-Driven Evolution

A future queue-driven architecture should separate work selection from prompt
assets and runtime handoff files.

Recommended future structure:

```text
.AI/
|-- Prompts/
|   |-- currentTask.md
|   |-- currentTask.clear.md
|   `-- ...
|-- Queue/
|   |-- currentItem.json
|   |-- Todo/
|   |   |-- ready.jsonl
|   |   |-- open.jsonl
|   |   `-- completed.jsonl
|   |-- Diagnostic/
|   |   |-- ready.jsonl
|   |   |-- skipped.jsonl
|   |   `-- completed.jsonl
|   `-- Task/
|       |-- ready.jsonl
|       |-- open.jsonl
|       `-- completed.jsonl
`-- RunControl/
    `-- mode.json
```

In this model, queue items represent work objects. A queue item may include a
concise item-specific execution prompt. Reusable prompts are versioned execution
procedures that may be associated with one or more queue item types, including
TODO items, diagnostics, research items, requirements, project tasks, and future
graph work objects. Queue items reference prompts; they do not embed execution
procedures.

Example TODO queue item with an inline execution prompt:

```json
{
  "id": "TODO-042",
  "projectId": "ai-workspace",
  "type": "todo",
  "status": "ready",
  "title": "Document current task clearing behavior",
  "execution_prompt": "Update the startup documentation to explain that clearing currentTask.md returns the system to ad hoc mode.",
  "affected_files": [
    ".AI/Start_Here.md"
  ]
}
```

Example queue item referencing a reusable prompt:

```json
{
  "id": "DOC-007",
  "projectId": "ai-workspace",
  "type": "task",
  "status": "ready",
  "prompt_ref": ".AI/Prompts/Detailed Project Review Prompt.md",
  "procedure_refs": [
    ".AI/Procedures/Markdown_Document_Update.proc.md"
  ],
  "input": {
    "target": ".AI/Readme.md",
    "objective": "Review the AI workspace overview for stale current-task assumptions."
  }
}
```

In a future implementation, Run Control should select a queue item, resolve its
inline item-specific prompt or associated prompt reference, determine execution
mode, manage restart and recovery, generate the runtime handoff, execute the
work, and link the completed queue item to execution history.

## Transitional Model - Execution Evidence Package

The current file-based run folder should be treated as an Execution Evidence
Package. It is a filesystem representation of run evidence until database
persistence exists.

A target evidence package may eventually include:

```text
runs/<date>/<YYYYMMDD-HHMM_executionId>/
|-- execution.json
|-- execution-record.md
`-- journal.jsonl
```

`execution.json` is the authoritative execution manifest. `journal.jsonl` is
the append-only machine-readable event timeline. `execution-record.md` remains
the human-readable execution summary generated during or after execution.

The run folder name uses a local timestamp plus a short unique execution ID,
for example `20260708-2315_a1b2c3d4`. Do not include computer names or agent
names in the folder name. Store computer name, agent names, project names, task
names, prompt paths, outputs, artifacts, parent execution, and child executions
inside `execution.json`.

Existing execution records and run folders remain valid transitional evidence
packages. Old folders containing only `execution-record.md` should still be
readable as legacy summary-only packages. Mutable state should be written under
the computer-scoped State domain, and immutable computer-scoped journal records
may still be appended under the computer-scoped Journal domain when local
runtime evidence is needed.

## Future Architecture - Run Database Object

A Run should become a first-class database object.

The persisted Run should have relationships to:

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

The Git diff is deterministic and should be treated as authoritative evidence
of repository changes when available. When Git is unavailable, the execution
record should explicitly state that limitation and use filesystem evidence
instead.

## Planned Enhancement - Migration Path

The recommended migration path is:

1. Preserve `Prompts\currentTask.md` as the runtime execution handoff and
   restart checkpoint.
2. Define queue mode and ad hoc mode in Run Control before adding queue files.
3. Introduce queue item records for TODO, Diagnostic, Task, research, and future
   graph-backed work objects.
4. Store concise item-specific execution prompts on queue items.
5. Treat reusable prompts as versioned execution procedures shared by TODO,
   Diagnostic, Task, research, requirement, and graph work items.
6. Make queue items reference prompts instead of embedding execution procedures.
7. Generate `currentTask.md` from the selected queue item during queue-driven
   execution.
8. Link queue status changes to execution records, diagnostics, artifacts, and
   validation results.
9. Persist Run objects in the database while continuing to export file-based
   evidence packages for audit and portability.

## Diagnostic Explorer

The Diagnostic Explorer is the primary operational dashboard of the AI
Management and MDM MCP architecture.

Rather than reading numerous log files directly, users and AI agents
interact with the Diagnostic Explorer to review execution state,
diagnostics, workflow progress, and generated evidence.

The explorer consumes standardized execution records produced by
deterministic tools and AI agents.

### Diagnostic Explorer Files

  -----------------------------------------------------------------------
  Component            Typical Location                  Purpose
  -------------------- --------------------------------- ----------------
  Diagnostic Database  `.AI\Diagnostics\`                Structured
                                                         diagnostic
                                                         records
                                                         generated during
                                                         execution.

  Diagnostic Schemas   `.AI\Schema\Diagnostics\`         Common
                                                         diagnostic
                                                         interchange
                                                         schemas used by
                                                         all tools.

  Diagnostic History   `.AI\Diagnostics\History\`        Historical
                                                         diagnostic
                                                         records from
                                                         previous
                                                         executions.

  Diagnostic Views     `.AI\Diagnostics\View\`           Cached or
                                                         generated views
                                                         presented by the
                                                         Diagnostic
                                                         Explorer.

  Diagnostic Reports   `.AI\Artifacts\Diagnostics\`      Exported reports
                                                         and summaries.
  -----------------------------------------------------------------------

### Information Displayed

  -----------------------------------------------------------------------
  Category                            Examples
  ----------------------------------- -----------------------------------
  Diagnostics                         Errors, warnings, hints,
                                      informational messages

  Workflow                            Current phase, task, step,
                                      execution state

  AI Activity                         Active prompts, reasoning
                                      summaries, agent status

  Execution                           Commands executed, files modified,
                                      execution timing

  Validation                          Test results, benchmarks, code
                                      reviews

  Evidence                            Execution records, logs, snapshots,
                                      artifacts

  Navigation                          Related files, source locations,
                                      documentation, references
  -----------------------------------------------------------------------

## Reference Implementation

The first implementation of this architecture exists within the
**mydefrag-syntax** project.

### Current Prototype Files

  -----------------------------------------------------------------------
  Component            Typical Location                  Purpose
  -------------------- --------------------------------- ----------------
  Tokenizer            `src/server/tokenizer.js`         Converts source
                                                         text into
                                                         tokens.

  Parser               `src/server/parser.js`            Builds the
                                                         language model
                                                         and generates
                                                         diagnostics.

  Language Metadata    `src/server/languageData.js`      Defines language
                                                         keywords,
                                                         hierarchy, and
                                                         metadata.

  Logger               `src/server/logger.js`            Records parser
                                                         activity and
                                                         execution
                                                         details.

  Preview Generator    `mydefrag-preprocess.js`          Produces merged
                                                         preview files
                                                         and source
                                                         mapping.

  Include Processing   `mydefrag-preprocess.js`          Resolves include
                                                         directives and
                                                         tracks source
                                                         origins.

  Language Server      `src/server/server.js`            Integrates
                                                         diagnostics with
                                                         VSCodium.

  Extension Client     `extension.js`                    Presents
                                                         diagnostics
                                                         through the
                                                         editor
                                                         interface.
  -----------------------------------------------------------------------

Although project-specific, this implementation serves as the prototype
for the language-independent Diagnostic Explorer that will be
incorporated into the MDM MCP platform.

## Future MCP Architecture

  -----------------------------------------------------------------------------
  Component            Planned Location                  Purpose
  -------------------- --------------------------------- ----------------------
  Execution Schema     `.AI\Schema\Execution\`           Common execution
                                                         record definitions.

  Workflow Schema      `.AI\Schema\Workflow\`            Standard workflow and
                                                         state definitions.

  Agent Schema         `.AI\Schema\Agents\`              Common representation
                                                         of AI and
                                                         deterministic agents.

  Diagnostic Schema    `.AI\Schema\Diagnostics\`         Language-independent
                                                         diagnostic interchange
                                                         format.

  Execution Database   `.AI\Execution\`                  Canonical execution
                                                         records produced by
                                                         all agents.

  Workflow Database    `.AI\Workflow\`                   Task, phase, and
                                                         execution state
                                                         information.

  Diagnostic Explorer  MCP User Interface                Operational dashboard
                                                         for execution,
                                                         diagnostics, workflow,
                                                         testing, auditing, and
                                                         evidence review.
  -----------------------------------------------------------------------------

Queue-driven execution should extend this future architecture by connecting
queue items to Run Control records, execution databases, diagnostic records, and
generated artifacts. It should not replace the existing execution evidence
model.
