# AI Prompt Library

## Overview

The `D:\AI\.AI` workspace contains shared AI guidance, reusable prompts,
standards, context, working state, and result artifacts used across
AI-assisted development.

It is the shared startup and prompt location for AI tools when a project does
not provide a local `.AI` tree or when the user explicitly directs work to this
shared workspace.

The library is intended to make AI-assisted engineering more consistent,
repeatable, and evidence based. Individual prompts can stay focused on a task
while common instructions, standards, and durable context are maintained in one
place.

## Current Directory Structure

```text
.AI/
|-- Context/
|   |-- AI_Development_Rules.md
|   |-- Architecture.md
|   |-- Coding_Standards.md
|   |-- Debugging_Workflow.md
|   |-- Development_Rules.md
|   |-- Installation_Guide.md
|   |-- Key_Files.md
|   |-- Parser_Call_Tree.md
|   |-- Parser_Diagnostic_Workflow.md
|   `-- Project_Context.md
|-- Prompts/
|   |-- Codex-Extract-Code-Review-TODO-Prompt-v2.md
|   |-- Debug Extension Using Diagnostics.md
|   |-- Detailed Project Review Prompt.md
|   |-- Review Checklist.md
|   |-- Review Instructions.md
|   |-- Start Codex Diagnostic.md
|   `-- Update AI Standards Directory Location.md
|-- Results/
|-- Standards/
|   |-- Execution_Record_Standard.md
|   |-- Global Markdown Documentation Standard.md
|   `-- Output Document Formatting Rules.md
|-- Workspace/
|-- AI Prompt Library.md
|-- Default_Search_Filter.md
|-- Detailed Project Review Prompt.md
|-- File Tree - .AI.md
|-- Instructions.md
|-- Readme.md
|-- Session_Template.md
`-- Start_Here.md
```

## Root Documents

| Document | Purpose |
| --- | --- |
| `Start_Here.md` | AI bootstrap and required load-order manifest. |
| `Session_Template.md` | Session startup procedure. |
| `Instructions.md` | Core operating rules for AI assistants. |
| `Readme.md` | Human-facing overview of the `.AI` workspace. |
| `AI Prompt Library.md` | This library overview. |
| `Default_Search_Filter.md` | Default discovery filter. |
| `Detailed Project Review Prompt.md` | Root compatibility copy. |
| `File Tree - .AI.md` | Generated artifact showing a prior tree snapshot. |

## Folder Responsibilities

### Project-Scoped Execution

The shared `.AI` workspace provides fallback guidance and reusable assets. When
a project has its own `.AI` tree, the project owns its local execution state.

A project should own:

- Its local to-do list.
- Its local diagnostic queue.
- Its local task queue.
- Its local prompt handoff artifacts.
- Its local `currentTask.md`.
- Its local execution records.
- Its local run evidence.
- Its local artifacts.

There is no single global to-do list that all projects write to directly.

### Standards

`Standards` contains durable rules, schemas, formatting standards, and
interoperability contracts that can apply across tools or projects.

Current standards include:

- `Execution_Record_Standard.md`
- `Global Markdown Documentation Standard.md`
- `Output Document Formatting Rules.md`

### Context

`Context` contains durable project or domain knowledge used to understand
current work.

Examples include:

- project overview and objectives
- development rules
- coding standards
- architecture documentation
- key project files
- parser documentation
- diagnostic and debugging workflows

### Prompts

`Prompts` contains reusable task prompts for common AI-assisted work.

The current implementation also uses `Prompts\currentTask.md` as a runtime
execution handoff and restart checkpoint. `currentTask.md` is the runtime
execution handoff and restart checkpoint generated immediately before
execution. It is not the authoritative source of work.

Reusable prompts are versioned execution procedures that may be associated with
one or more queue item types. Queue items reference prompts; they do not embed
execution procedures.

Examples include:

- detailed project reviews
- diagnostic debugging
- code-review extraction
- standards-location migration
- reusable review instructions and checklists

### Workspace

`Workspace` contains mutable task-local state, drafts, active filters, scratch
context, and temporary inputs.

### Results

`Results` contains generated outputs from agent runs, including execution
records, diagnostics, review reports, validation evidence, and other result
artifacts.

## Planned Enhancement - Execution Contexts

Future Run Control should manage project-scoped Execution Context objects.

An Execution Context connects project, runtime, window, agent, queue item,
prompt reference, generated current task, run, artifacts, execution record,
validation results, and evidence package.

A singleton controller may coordinate multiple active VSCodium windows and
Codex runtimes, but the controller does not own every project's queue or
`currentTask.md`.

## Future Architecture - Run Database Object

A Run should become a first-class database object.

The current file-based run folder remains a transitional Execution Evidence
Package until database persistence exists. Future Run objects should link to
commands, tool calls, files read, files changed, validation checks,
diagnostics, metrics, approvals, conversation evidence, Git diff evidence,
generated artifacts, and follow-up recommendations.

## Startup Workflow

A typical AI workflow is:

1. Read `Session_Template.md`.
2. Read `Start_Here.md`.
3. Load the required files listed in `Start_Here.md`.
4. Load any relevant prompt from `Prompts`.
5. Summarize the task and loaded context.
6. Perform the requested work using the applicable standards.
7. Validate the result.
8. Create or describe an execution record when meaningful work was performed.

## Design Philosophy

The `.AI` workspace separates durable guidance from task-specific prompts and
generated artifacts.

This supports:

- consistent AI startup behavior
- reusable engineering standards
- reusable project knowledge
- smaller task prompts
- clearer separation between instructions, context, work state, and results
- easier maintenance of shared AI configuration

## Review Strategy

Engineering review prompts normally use two phases.

### Phase 1: Information Gathering

- Read relevant source and context files completely.
- Record observations.
- Avoid recommendations until evidence has been gathered.

### Phase 2: Engineering Analysis

- Evaluate architecture and behavior.
- Identify defects, omissions, and technical debt.
- Rank findings by impact.
- Produce the requested deliverable.

## Maintenance Notes

- Keep `Start_Here.md` as the AI entry point.
- Keep `Readme.md` human-facing.
- Keep reusable standards in `Standards`.
- Keep durable project knowledge in `Context`.
- Keep task prompts in `Prompts`.
- Keep generated outputs in `Results`.
- Treat generated tree snapshots as artifacts rather than authoritative manifests.
- Keep current implementation, transitional evidence packages, planned
  enhancements, and future database-backed architecture clearly separated.
