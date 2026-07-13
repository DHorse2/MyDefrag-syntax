# AI Execution Record Standard

<!-- markdownlint-disable MD013 MD060 -->

## Purpose

This document defines the AI Execution Record standard for AI Management and MDM MCP work.

An AI Execution Record is a run-controlled evidence artifact created by an agent while performing a task. It is not merely a text log. It is a structured record of the prompt, task, agent, actions, files, commands, diagnostics, decisions, outputs, and unresolved issues associated with a run.

The standard is intended to apply across Codex, ChatGPT, Cline, local models, MCP agents, deterministic scripts, execution harnesses, and future AI or non-AI agents.

## Design Principle

Execution records must map onto Run Control.

A Codex task, ChatGPT task, MCP function, deterministic script, test harness, or local model invocation is a kind of agent run. The agent may be probabilistic or deterministic, but the work should be captured in a consistent run-controlled format.

The execution record should answer:

- What run was performed?
- Which agent performed it?
- What prompt, instruction, or procedure started it?
- What files, commands, tools, and data were used?
- What changed?
- What evidence was produced?
- What diagnostics or failures occurred?
- What decisions were made?
- What remains unresolved?
- What resources were consumed or reported during the run?

## Transitional And Future Run Model

The current file-based execution record and run folder are transitional
evidence packages. They remain valid evidence until database-backed Run
persistence exists.

A future Run should be a first-class database object. The database object should
link the execution to:

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

File-based execution records should remain exportable views of the database
Run, not competing sources of truth.

When Git is available, the Git diff is deterministic and should be treated as
authoritative evidence of repository changes. When Git is unavailable, the
execution record must state that limitation and use filesystem evidence,
artifact inventories, and validation output instead.

## Resource Usage

When available, record any resource usage reported by the execution environment.

Do not estimate, infer, or invent resource values. Record only information provided by the execution environment or execution tools.

Examples include:

- Prompt tokens
- Completion tokens
- Total tokens
- Files read
- Files created
- Files modified
- Commands executed
- Tool calls
- Elapsed time
- Estimated cost
- Other resource metrics reported by the execution environment

If a metric is unavailable, omit it or indicate that it was not reported.

## Relationship To Run Control

Run Control is the parent execution model. AI Execution Records are specialized run records for agent-driven work.

| Run Control Concept | AI Execution Record Mapping                                                                                       |
| ---------------------| -------------------------------------------------------------------------------------------------------------------|
| Run                 | One prompt execution, task execution, script execution, or agent operation                                        |
| Run ID              | Stable identifier for the execution instance                                                                      |
| Execution Context   | Project-scoped binding among runtime, window, agent, queue item, prompt, run, artifacts, validation, and evidence |
| Agent               | Codex, ChatGPT, Cline, MCP agent, script, harness, local model, or tool                                           |
| Procedure           | Prompt, workflow, script, task definition, or command plan                                                        |
| Inputs              | Prompt text, target paths, configuration, context files, user instruction                                         |
| Steps               | Commands, tool calls, file reads, file edits, tests, validations                                                  |
| Evidence            | Logs, diagnostics, diffs, outputs, reports, command results                                                       |
| Artifacts           | Files created, files modified, generated reports, exported data                                                   |
| Outcome             | Success, partial success, failure, blocked, reverted, or needs review                                             |
| Follow-Up           | TODOs, questions, unresolved issues, recommended next actions                                                     |

## Agent Types

Execution records should support multiple agent types.

| Agent Type           | Description                                                                               |
| ----------------------| -------------------------------------------------------------------------------------------|
| AI interactive agent | ChatGPT, Codex, Cline, or other interactive AI assistant                                  |
| AI coding agent      | Agent that reads, edits, tests, and reports on code                                       |
| Local model agent    | Locally hosted model invoked for reasoning, classification, extraction, or transformation |
| MCP agent            | MCP-controlled function, subsystem, adapter, or orchestrated tool                         |
| Deterministic script | PowerShell, Node.js, Python, batch, or compiled utility run under control                 |
| Test harness         | Temporary or reusable execution harness used to validate functions or modules             |
| Indexing agent       | File, metadata, document, vector, graph, or search indexing task                          |
| Web adapter agent    | Browser/session/navigation/content extraction workflow                                    |
| Human-operated run   | Human-driven procedure recorded into the same run model                                   |

## Required Record Sections

Each execution record should include the following sections where available.

| Section        | Required    | Purpose                                                                          |
| ----------------| -------------| ----------------------------------------------------------------------------------|
| Run Identity   | Yes         | Identifies the run, task, project, timestamp, and run controller                 |
| Agent Identity | Yes         | Identifies the agent, model, tool, script, or subsystem                          |
| Input Context  | Yes         | Captures prompt, instruction, paths, configuration, and relevant context         |
| Scope          | Yes         | Defines the files, folders, systems, or data included in the run                 |
| Plan           | Recommended | Captures the intended approach without requiring hidden reasoning                |
| Actions        | Yes         | Lists commands, tool calls, file reads, file writes, and major steps             |
| Decisions      | Recommended | Records explicit engineering or procedural decisions                             |
| Diagnostics    | Yes         | Captures errors, warnings, failed commands, test failures, and recovery attempts |
| Artifacts      | Yes         | Lists files created, modified, deleted, or generated                             |
| Validation     | Yes         | Captures tests, checks, commands, manual verification, and results               |
| Outcome        | Yes         | States whether the run succeeded, partially succeeded, failed, or was blocked    |
| Follow-Up      | Yes         | Captures unresolved issues, TODOs, questions, and recommended next work          |
| Metrics        | Optional    | Captures elapsed time, token use, command count, file count, or resource use     |
| Provenance     | Recommended | Links evidence back to prompts, files, outputs, and source material              |

## Recommended File Layout

The AI shared context should define the standard, while individual projects should store run records near the relevant project or run-control store.

Recommended shared standard location:

```text
D:\AI\.AI\Standards\Execution_Record_Standard.md
```

Recommended prompt location:

```text
D:\AI\.AI\Prompts\Investigate Codex Execution Logging.md
```

Recommended project run output pattern:

```text
<project-root>\runs\<yyyy-mm-dd>\<yyyymmdd-hhmm>_<executionId>\
    execution.json
    execution-record.md
    journal.jsonl
```

For the MDM MCP project, a likely initial location is:

```text
D:\MdmMcp\runs\<yyyy-mm-dd>\<yyyymmdd-hhmm>_<executionId>\
```

A later implementation may move these records into a database or graph-backed Run Control store while preserving file export compatibility.

The file layout should be treated as an Execution Evidence Package. Future
database-backed Run records should be able to export this package for audit,
review, portability, and recovery.

`execution.json` is the authoritative machine-readable execution manifest.
`journal.jsonl` is the append-only machine-readable event timeline.
`execution-record.md` remains the human-readable summary. Existing legacy
folders that contain only `execution-record.md` remain readable as summary-only
evidence packages.

## Default Artifact Names

| Artifact              | Purpose                                                            |
| -----------------------| --------------------------------------------------------------------|
| execution.json        | Authoritative execution manifest                                  |
| journal.jsonl         | Append-only machine-readable execution event timeline             |
| execution-record.md   | Human-readable run-controlled execution summary                   |
| prompt.md             | Optional original prompt, instruction, or task request snapshot   |
| files.md              | Files inspected, created, modified, moved, or deleted              |
| diagnostics.md        | Errors, warnings, exceptions, failed checks, and recovery attempts |
| validation.md         | Tests, checks, and verification evidence                           |
| final-response.md     | Final agent response or summary                                    |
| artifacts.md          | Links or paths to generated outputs                                |

## Minimum Markdown Template

```md
# Execution Record

## Run Identity

| Field | Value |
| --- | --- |
| Run ID |  |
| Project |  |
| Task |  |
| Timestamp |  |
| Run Controller |  |
| Parent Run ID |  |

## Agent Identity

| Field | Value |
| --- | --- |
| Agent |  |
| Agent Type |  |
| Model Or Tool |  |
| Version |  |
| Execution Mode |  |

## Input Context

- Prompt:
- Target paths:
- Configuration:
- Context files:
- Constraints:

## Scope

- Included:
- Excluded:
- Assumptions:

## Plan

- Step 1:
- Step 2:
- Step 3:

## Actions

| Step | Action | Target | Result |
| --- | --- | --- | --- |
| 1 |  |  |  |

## Commands And Tool Calls

| Step | Command Or Tool | Working Directory | Exit Code | Result |
| --- | --- | --- | --- | --- |
| 1 |  |  |  |  |

## Files

| Path | Action | Reason |
| --- | --- | --- |
|  | Read |  |

## Decisions

| Decision | Reason | Alternatives Considered |
| --- | --- | --- |
|  |  |  |

## Diagnostics

| Severity | Source | Message | Resolution |
| --- | --- | --- | --- |
|  |  |  |  |

## Validation

| Check | Method | Result |
| --- | --- | --- |
|  |  |  |

## Artifacts

| Artifact | Path | Purpose |
| --- | --- | --- |
|  |  |  |

## Outcome

- Status:
- Summary:
- Confidence:
- Limitations:

## Follow-Up

- TODO:
- Questions:
- Recommended next run:
```

## JSON Shape

A machine-readable execution record should eventually be emitted alongside the Markdown report.

```json
{
  "run": {
    "run_id": "",
    "parent_run_id": "",
    "project": "",
    "task": "",
    "timestamp": "",
    "run_controller": ""
  },
  "agent": {
    "name": "",
    "type": "",
    "model_or_tool": "",
    "version": "",
    "execution_mode": ""
  },
  "input": {
    "prompt_path": "",
    "target_paths": [],
    "context_files": [],
    "configuration": {},
    "constraints": []
  },
  "scope": {
    "included": [],
    "excluded": [],
    "assumptions": []
  },
  "actions": [],
  "commands": [],
  "files": [],
  "decisions": [],
  "diagnostics": [],
  "validation": [],
  "artifacts": [],
  "outcome": {
    "status": "",
    "summary": "",
    "confidence": "",
    "limitations": []
  },
  "follow_up": {
    "todos": [],
    "questions": [],
    "recommended_next_runs": []
  }
}
```

## Prompt Requirements For AI Agents

When a prompt asks an AI agent to perform work, the prompt should require an execution record.

The prompt should instruct the agent to:

- Record the run ID or create one if none exists.
- Record the working directory and target paths.
- List files read, created, modified, deleted, or moved.
- List commands and tool calls executed.
- Include command exit codes when available.
- Record failures and recovery attempts.
- Record explicit decisions and assumptions.
- Record tests and validation steps.
- List generated artifacts by path.
- State unresolved issues and recommended next steps.
- Write the execution record after task completion.
- Avoid exposing hidden chain-of-thought or private model reasoning.

## Chain-Of-Thought Boundary

The execution record must not require hidden chain-of-thought.

It should capture observable and shareable engineering evidence:

- Decisions made
- Reasons stated
- Alternatives considered at a summary level
- Commands executed
- Files changed
- Diagnostics encountered
- Tests performed
- Results produced

This distinction allows AI systems to provide useful auditability without exposing private reasoning internals.

## Codex-Specific Notes

Codex should be treated as one agent implementation, not as the definition of the standard.

When using Codex, prompts should ask it to:

- Identify whether native Codex logs exist for the current environment.
- Explain what information those logs contain.
- Explain whether those logs are stable enough to rely on.
- Produce a portable execution record regardless of native logging.
- Write the record to the project run folder or requested output location.
- Include a final summary that lists all changed files and generated artifacts.

## Integration With MDM MCP

In MDM MCP, execution records should become graph-addressable entities.

They should connect to:

- Projects
- Tasks
- Agents
- Prompts
- Files
- Commands
- Diagnostics
- Tests
- Artifacts
- Decisions
- Evidence
- Follow-up tasks
- Source authority metadata
- Run Control records

This allows the system to compare agent performance, detect recurring failures, route future work more intelligently, and build evidence-based capability profiles.

## Future Work

Future versions should define:

- Canonical run ID format
- Database schema
- JSON schema
- JSONL command/event schema
- Integration with diagnostic interchange format
- Integration with test harness records
- Integration with graph update transactions
- File retention and archival policy
- Privacy and redaction rules
- Agent capability scoring
- Cross-agent comparison reports
