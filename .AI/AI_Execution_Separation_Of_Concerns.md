# AI Execution Separation Of Concerns

<!-- markdownlint-disable MD013 -->

## Purpose

This document defines the core separation of concerns used by the `.AI` workspace and future Run Control implementation.

The goal is to make AI-assisted work deterministic, composable, auditable, and easier to automate.

## Core Concepts

| Concern | Question Answered | Description |
| --- | --- | --- |
| Task | What needs to be accomplished? | The loaded work request, usually from `Prompts\currentTask.md` or an explicitly supplied task path. |
| Role | Who performs the work? | The operating identity selected for the task, such as Documentation Editor, Code Reviewer, Debugger, Architect, Test Engineer, or Run Recorder. |
| Procedure | How is the work performed? | The workflow used to execute the task. Procedures are composable and should be loaded only when required. |
| Standards | What rules govern the work? | Durable rules, schemas, formatting requirements, and output requirements that procedures must satisfy. |
| Execution Mode | How much evidence and detail is required? | The required level of execution recording: Minimal, Standard, Detailed, or Verbose. |
| Capabilities | What tools or services are required? | Required execution services such as filesystem, shell, Git, web, database, test runner, validators, or document generators. |
| Execution Context | What binds this run to a project and runtime? | The relationship among project, runtime, window, agent, queue item, prompt reference, generated current task, run, computer-scoped state, journal records, artifacts, validation, and evidence. |
| Execution Record | What evidence was produced? | The human-readable or machine-readable record of actions, artifacts, metrics, validation, diagnostics, and outcome. |
| Run Control | What manages the lifecycle? | The deterministic lifecycle for task loading, planning, execution, validation, evidence capture, and completion. |

## Domain Boundary Model

Every domain has a single responsibility. Domains should reference each other
by identifiers instead of containing each other.

| Domain | Responsibility | Ownership Rule |
| --- | --- | --- |
| Projects | Define what exists and hold durable project knowledge, documentation, research, decisions, and procedures. | Project structures must not be scoped by computer name. |
| ToDo | Define work objects. | TODO state is independent of project directory ownership, though items may reference projects. |
| Requirements | Define required behavior and traceability. | Requirements remain project-neutral or project-referenced, not computer-local. |
| Procedures | Define reusable workflows. | Procedures are durable shared assets. |
| Run Control | Coordinates execution lifecycle and references related domains. | Run Control is not the Journal and does not own raw evidence. |
| Journal | Stores immutable execution evidence. | Journal records are append-only and computer-scoped. |
| State | Stores the current mutable execution condition. | State is computer-scoped and may change continuously. |
| Knowledge | Stores reviewed information promoted from evidence. | Knowledge is not raw execution history. |
| Configuration | Controls behavior. | Local configuration is computer-scoped; shared policy remains project-neutral. |
| Cache | Stores disposable derived data. | Cache is computer-scoped and rebuildable. |
| Prompt History | Stores prompt snapshots for reproducibility. | Prompt history is computer-scoped and separate from mutable state. |

Computer names apply only to machine-local information:

- Journal
- State
- Cache
- Prompt History
- Logs
- Local Configuration
- Temporary files

Computer names do not apply to project-owned Projects, ToDo, Requirements,
Procedures, or Knowledge structures.

## Consistency Review - Work Source Concepts

The current implementation and the future queue-driven architecture use related
but separate work-source concepts.

| Concept | Current Implementation | Future Recommendation |
| --- | --- | --- |
| Queue Item | Implemented as project-scoped `Todo.md` Markdown entries with `projectId`, `taskId`, prompt path, and status. | A structured work object selected by Run Control. |
| Prompt | Reusable prompt files live under `Prompts`. `Prompts\currentTask.md` is the active handoff prompt. | Reusable prompts are versioned execution procedures that may be associated with one or more queue item types. Queue items reference prompts; they do not embed execution procedures. |
| Current Task | `Prompts\currentTask.md` is loaded by `LOAD TASK` only after project identity validation. It includes project and claim metadata and remains the runtime execution handoff and restart checkpoint, not the authoritative source of work. | Generated from the selected queue item and associated execution procedure, or kept only as a compatibility handoff. |
| Run Control | Startup, planning, execution, validation, and evidence capture are document-driven. | Run Control selects work, determines execution mode, manages restart and recovery, materializes task context, records state, and updates queue status. |
| Execution History | Execution records and results are written as files under the current documented output locations. | Queue items link to run records, command logs, artifacts, diagnostics, and validation results. |
| Ad Hoc Execution | User instructions may bypass queue selection when explicitly stated, but explicit prompt paths must still match the active project identity. | Ad hoc requests bypass queue mode, and clearing the current task returns execution to ad hoc mode. |

The future queue model should not be documented as implemented until the queue
files, state transitions, and Run Control behavior exist.

## Planned Enhancement - Execution Context

An Execution Context should become the architectural object that connects a
selected work item to the runtime that executes it and the evidence produced by
that execution.

| Relationship | Purpose |
| --- | --- |
| Project | Owns the local execution state, queues, prompt handoff artifacts, run evidence, and artifacts. |
| Runtime | Identifies the Codex or agent runtime that performs the work. |
| Window | Identifies the VSCodium or host window associated with the runtime when available. |
| Agent | Identifies the AI, deterministic script, MCP agent, or human-operated run. |
| Queue Item | Identifies the project-scoped work object selected for execution when queue mode exists. |
| Prompt Reference | Identifies the reusable prompt or versioned execution procedure associated with the work. |
| Generated Current Task | Captures the runtime handoff and restart checkpoint generated immediately before execution. |
| Run | Identifies the execution instance and links it to database records or file-based evidence. |
| State Record | Identifies the mutable current condition for the execution on the current computer. |
| Journal Records | Identify immutable append-only evidence records produced during execution on the current computer. |
| Prompt Snapshot | Identifies the prompt copy captured under computer-scoped prompt history. |
| Artifacts | Links generated outputs and modified files to the execution. |
| Validation Results | Links checks, diagnostics, and validation outputs to the execution. |
| Evidence Package | Links the filesystem export or transitional run folder to the future persisted run object. |

Run Control should eventually manage execution contexts directly. The current
file-based startup flow remains valid until the context and queue state model is
implemented.

## Future Architecture - Run Database Object

A Run should become a first-class database object.

The current file-based execution record and run folder are transitional
evidence packages. Future persistence should link a Run to:

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

When Git is available, the Git diff should be treated as authoritative evidence
of repository changes. When Git is unavailable, the execution record should
state that limitation and use filesystem evidence instead.

## Lifecycle Mapping

| Lifecycle Stage | Primary Concern | Evidence To Record |
| --- | --- | --- |
| Workspace Resolution | Run Control | Workspace path and fallback behavior. |
| `LOAD TASK` | Task | Active project ID, task source path, task identifier, and queue-entry identity when available. |
| Pre-Evaluation | Task, Run Control | Scope, risk, deliverables, expected artifacts, and missing information. |
| Role Selection | Role | Selected roles and rationale. |
| Procedure Selection | Procedure | Loaded procedures and invoked procedures. |
| Standard Selection | Standards | Loaded standards. |
| Execution Mode Selection | Execution Mode | Selected mode and reason. |
| Capability Selection | Capabilities | Required tools, services, and adapters. |
| Execution Planning | Run Control | Strategy, validation plan, approval requirements, risks, and constraints. |
| Execution Cut-Off | Run Control | Startup complete and execution begins. |
| Task Execution | Procedure, Capabilities | Commands, file reads/writes, tool calls, diagnostics, and artifacts. |
| Validation | Standards, Procedure | Validation checks, results, failures, and limitations. |
| Execution Recording | Execution Record | Metrics, artifacts, decisions, diagnostics, final outcome, and unresolved issues. |

## Implementation Guidance

The `.AI` workspace should keep these concerns separate in files and directories:

| Directory Or File | Primary Concern |
| --- | --- |
| `Prompts\currentTask.md` | Task |
| `.vscode\ai-project.json` | Project identity |
| `Todo.md` | Project-scoped queue |
| `Roles` | Role |
| `Procedures` | Procedure |
| `Standards` | Standards |
| `Procedures\Execution_Record.proc.md` | Execution Record |
| `Procedures\Execution_Record_Metrics.md` | Execution metrics |
| `Start_Here.md` | Startup and Run Control bootstrap |
| `Context` | Optional supporting knowledge |
| `Results` | Artifacts and execution evidence |
| `Tests` | Test tasks and test-type descriptions |
| `Computers\<ComputerName>\Configuration` | Local configuration |
| `Computers\<ComputerName>\State` | Mutable current execution state |
| `Computers\<ComputerName>\Journal` | Append-only execution evidence |
| `Computers\<ComputerName>\Prompt` | Prompt history snapshots |
| `Computers\<ComputerName>\Cache` | Disposable derived data |
| `Computers\<ComputerName>\Logs` | Machine-local operational logs |
| `Computers\<ComputerName>\Temp` | Temporary files |
| `Tools\Run_Journal.cjs` | Initial computer-scoped journal, state, and prompt snapshot helper |

Every journal record should include at least:

- `executionId`
- `parentExecutionId`
- `timestamp`
- `computerName`
- `userName`
- `agent`
- `action`
- `projectIds`
- `todoIds`
- `requirementIds`
- `procedureIds`
- `projectRoot`
- `workingDirectory`
- `summary`
- `details`

## Current Implementation - Workflow Limitations

The current `currentTask.md` handoff is simple and compatible with existing AI
tools, but it has important limitations:

- Only one active handoff file is available by convention.
- Stale task content can continue to drive execution after the user switches to
  ad hoc work.
- TODO items, diagnostics, research items, and project tasks cannot yet carry a
  first-class executable prompt in a queue structure.
- Reusable prompts and active task handoffs are easy to confuse because both
  live under `Prompts`.

## Planned Enhancement - Migration Path

Queue-driven execution should be introduced as an extension of Run Control:

1. Preserve `Prompts\currentTask.md` as the runtime execution handoff and
   restart checkpoint.
2. Define queue item records for TODO, Diagnostic, Task, research, and future
   graph-backed work objects.
3. Store concise item-specific execution prompts in queue items.
4. Treat reusable prompts as versioned execution procedures shared by TODO,
   Diagnostic, Task, research, requirement, and graph work items.
5. Make queue items reference prompts instead of embedding execution procedures.
6. Let Run Control select the queue item, determine execution mode, manage
   restart and recovery, and generate the runtime handoff.
7. Keep ad hoc execution as a separate mode that bypasses queue selection.

## Schema Impact

No immediate SQL schema change is required.

For now, represent the expanded startup model using existing Run Control JSON and event structures:

| Concept | Recommended Storage |
| --- | --- |
| Task | `run_request.request_json` and/or task artifact. |
| Roles | `run_request.request_json.required_roles` and role-selection events. |
| Procedures | `run_request.request_json.required_procedures` and procedure-load events. |
| Standards | `run_request.request_json.required_standards` and standard-load events. |
| Execution Mode | `run_request.request_json.execution_record_mode` and execution-record metadata. |
| Capabilities | `run_request.request_json.required_capabilities` or `run_request_capability`. |
| Execution Planning | `run_log_event` with event type `EXECUTION_PLAN`. |
| Execution Cut-Off | `run_log_event` with event type `EXECUTION_CUTOFF`. |
| Metrics | `run_log_metric`. |
| Artifacts | `run_log_artifact`. |

Schema changes should wait until repeated runs prove which fields deserve first-class columns or tables.

## Possible Future Schema Extensions

Future schema changes may be useful after the model stabilizes:

- `role_definition`
- `procedure_definition`
- `standard_definition`
- `execution_mode_definition`
- `capability_definition`
- `run_selected_role`
- `run_selected_procedure`
- `run_selected_standard`
- `run_execution_plan`

These should extend Run Control rather than replace it.
