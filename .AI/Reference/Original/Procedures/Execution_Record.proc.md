# Procedure - Execution Record

## Purpose

Create a structured, accurate, and auditable record of an execution, preserving evidence, traceability, reproducibility, numeric metrics, and applicable standards.

Execution recording begins during startup planning and continues through task completion. The final execution record is produced or updated at completion.

## Applicability

Use this procedure whenever a task produces meaningful work, including:

- File creation or modification.
- Code reviews.
- Documentation updates.
- Debugging investigations.
- Test execution.
- Command execution.
- Code generation.
- Diagnostics.
- Architecture analysis.
- Project review.
- Prompt execution.

## Record Modes

Execution records are incremental by mode. Higher modes include the requirements of lower modes.

| Mode | Purpose | Required When |
| --- | --- | --- |
| Minimal | Record only essential run identity, objective, outputs, completion status, and basic numeric metrics. | Small tasks, answers, or no-file-change work. |
| Standard | Record normal execution evidence, artifacts, validation, notable diagnostics, and standard numeric metrics. | Default for meaningful work. |
| Detailed | Record expanded planning, loaded context, decisions, files inspected, rationale summaries, and detailed numeric metrics. | Reviews, debugging, architecture, generation, or project-wide work. |
| Verbose | Record comprehensive observable execution history, step logs, command logs, tool calls, diagnostics, artifacts, validation, and full numeric metrics. | Explicitly requested detailed history, audit work, benchmarking, MCP development, or AI evaluation. |

When the user requests detailed history, full audit, benchmarking evidence, resource usage, command history, or numeric metrics, use **Verbose** mode.

## Mode Selection

Select the lowest mode that satisfies the task.

The mode may be selected from:

- User instruction.
- Loaded task requirements.
- Active role.
- Active procedure.
- Project policy.
- Risk level.
- Scope of change.

If no mode is specified:

- Use `Minimal` for simple responses.
- Use `Standard` for normal meaningful work.
- Use `Detailed` for reviews, debugging, architecture, generation, or project-wide analysis.
- Use `Verbose` when the task explicitly asks for detailed execution history, resource usage, command history, numeric metrics, or audit evidence.

Record the selected mode and why it was selected.

## Prerequisites

Before using this procedure:

- The task objective must be known.
- The active role must have authority to produce or maintain an execution record.
- Observable execution evidence should be captured as work proceeds.
- Applicable execution record standards must be identified.
- The execution record mode must be selected.

## Inputs

Typical inputs include:

- User instructions.
- Loaded task.
- Selected role.
- Selected procedures.
- Selected standards.
- Execution evidence.
- Commands executed.
- Diagnostics and logs.
- Generated artifacts.
- Validation results.
- Numeric metrics.
- Resource usage, when available.
- Relevant project context.

## Required Standards

Load only the standards required for the current task, for example:

- Execution Record Standard.
- Output Document Formatting Rules.
- Documentation standards.

## Invoked Procedures

This procedure may invoke:

- `Validation.md`

Load invoked procedures only when required by the task and only once per run.

Do not recursively load procedures beyond one level unless explicitly instructed.

## Steps

1. Assign or obtain the execution identity when available.
2. Select the execution record mode.
3. Record the task objective.
4. Record the loaded task source, when applicable.
5. Record the selected role, procedures, and standards.
6. Begin tracking execution evidence before task execution starts.
7. Record commands, diagnostics, tool calls, and significant events according to the selected mode.
8. Record created, modified, and affected artifacts.
9. Record validation results.
10. Record warnings, errors, recoveries, and unresolved issues.
11. Record numeric metrics using the selected mode requirements.
12. Record resource usage when available, clearly distinguishing measured, estimated, and unavailable values.
13. Produce or update the execution record using the applicable standard.

## Required Numeric Metrics

Every execution record must include a numeric metrics table.

If a value is unknown, record it as `Unavailable`, not blank.

If a value is inferred, mark it as `Estimated`.

If a value is directly observed or reported, mark it as `Measured`.

Required numeric metrics include:

| Metric | Required In | Measurement Rule |
| --- | --- | --- |
| Prompt tokens | All modes | Measured if reported by environment; otherwise `Unavailable`. |
| Completion tokens | All modes | Measured if reported by environment; otherwise `Unavailable`. |
| Total tokens | All modes | Measured if reported by environment; otherwise `Unavailable`. |
| Estimated cost | All modes | Measured if reported by environment; estimated only if pricing and token counts are known; otherwise `Unavailable`. |
| Start time | All modes | Measured when available. |
| End time | All modes | Measured when available. |
| Elapsed time | All modes | Measured or estimated from start/end timestamps. |
| Files created | All modes | Count created artifacts. |
| Files modified | All modes | Count modified existing files. |
| Files deleted | All modes | Count deleted files. |
| Files read or inspected | Standard and above | Count when observable. |
| Commands executed | Standard and above | Count command log entries. |
| Commands failed | Standard and above | Count failed commands. |
| Validation checks performed | Standard and above | Count validation checks. |
| Validation checks failed | Standard and above | Count failed validation checks. |
| Diagnostics recorded | Detailed and above | Count warnings, errors, and notable diagnostics. |
| Tool calls recorded | Verbose | Count observable tool calls. |
| Recovery actions | Verbose | Count recorded recovery actions. |

## Numeric Metrics Table Format

Use this format:

| Metric | Value | Status | Source |
| --- | --- | --- | --- |
| Prompt tokens | Unavailable | Unavailable | Environment did not report token usage. |
| Completion tokens | Unavailable | Unavailable | Environment did not report token usage. |
| Total tokens | Unavailable | Unavailable | Environment did not report token usage. |
| Estimated cost | Unavailable | Unavailable | Token usage and pricing were not available. |
| Files created | 0 | Measured | Artifact inventory. |
| Files modified | 0 | Measured | Artifact inventory. |
| Files deleted | 0 | Measured | Artifact inventory. |
| Commands executed | 0 | Measured | Command log. |

## Minimal Mode Requirements

A Minimal execution record should include:

- Execution identity, when available.
- Date and agent.
- Task objective.
- Selected mode.
- Completion status.
- Created or modified artifacts.
- Required numeric metrics.
- Final validation status, when applicable.

## Standard Mode Requirements

A Standard execution record includes Minimal mode plus:

- Loaded task source, when applicable.
- Selected role.
- Selected procedures.
- Selected standards.
- Summary of actions performed.
- Artifact inventory.
- Diagnostics, warnings, and errors.
- Validation summary.
- Standard numeric metrics.

## Detailed Mode Requirements

A Detailed execution record includes Standard mode plus:

- Planning summary.
- Context loaded.
- Files inspected.
- Important decisions.
- Evidence supporting conclusions.
- Risks and unresolved issues.
- Rationale summaries for recommendations or changes.
- Detailed numeric metrics.

Detailed mode should summarize reasoning without exposing private chain-of-thought.

## Verbose Mode Requirements

A Verbose execution record includes Detailed mode plus comprehensive observable history.

Verbose records should include:

- Step-by-step execution log.
- Chronological command log.
- Tool call log, when available.
- File read/write log, when available.
- Diagnostics and recovery log.
- Artifact inventory with paths and purposes.
- Validation commands and results.
- Full numeric metrics table.
- Resource usage details.
- Explicit distinction between measured, estimated, and unavailable metrics.
- Prompt or task snapshot when available.
- Record of assumptions, constraints, and unresolved questions.
- Final outcome.

Verbose mode should record observable actions and concise decision summaries. It should not fabricate missing data and should not present reconstructed events as observed events.

## Resource Usage Rules

Record resource usage using these categories:

| Category | Meaning |
| --- | --- |
| Measured | Directly reported or observed by the environment. |
| Estimated | Reasonably inferred but not directly measured. |
| Unavailable | Not reported and not safely inferable. |

Do not leave resource fields ambiguous. If a value is not available, record it as `Unavailable`.

## Reconstruction Rules

If an execution record is created after the fact:

- Mark it as reconstructed.
- Identify the source of reconstruction.
- Distinguish observed events from inferred or summarized events.
- Do not claim reconstructed steps were captured live.
- Prefer concise uncertainty over false precision.

## Expected Outputs

Typical outputs include:

- Execution record.
- Step summary.
- Artifact inventory.
- Validation summary.
- Numeric metrics table.
- Resource usage summary.
- Audit information.
- Chronological event history, when using Verbose mode.

## Validation

Validation should confirm that:

- The execution record accurately reflects the completed work.
- The selected mode is recorded.
- The numeric metrics table is present.
- Unknown numeric values are recorded as `Unavailable`.
- Recorded observations are supported by evidence.
- Commands, artifacts, and affected files are identified according to the selected mode.
- Validation results are included.
- Resource usage is categorized as measured, estimated, or unavailable.
- Reconstructed records are clearly marked when applicable.
- Applicable standards were followed.

## Completion Criteria

This procedure is complete when:

- The execution record has been created or updated.
- The selected mode has been recorded.
- The numeric metrics table has been included.
- Required evidence has been documented according to the selected mode.
- Required validation has been completed or explicitly reported as unavailable.
- The execution record is ready for storage or publication.

## Notes

This procedure defines **how** execution evidence is recorded. It does not define **who** performs the work. The active role defines authority and responsibility, while standards define the rules this procedure must satisfy.

Execution records are projections of execution evidence. When possible, prefer live event capture over after-the-fact narrative reconstruction.
