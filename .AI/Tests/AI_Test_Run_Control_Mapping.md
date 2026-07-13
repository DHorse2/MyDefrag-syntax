# AI Test Implementation Using Run Control Schema

## Purpose

This document explains how AI tests should be implemented using the existing MDM MCP Core Run Control schema instead of creating a separate test-only schema.

AI tests are treated as specialized run-controlled executions. The test definition is an input artifact, the test execution is a run, test observations are run events, test measurements are run metrics, and test outputs are run artifacts.

## Design Principle

Do not duplicate schema concepts for tests.

Use the existing Run Control tables:

- `run_request`
- `run_request_capability`
- `run_log`
- `run_log_event`
- `run_log_metric`
- `run_log_artifact`

A test is therefore not a separate database object by default. It is a run request with test-specific metadata and artifacts.

## Core Mapping

| Test Concept | Core Schema Mapping | Notes |
| --- | --- | --- |
| Test definition | `run_request.request_json` or `run_log_artifact` | Store structured definition in JSON or reference the test Markdown file as an artifact. |
| Test task | `run_request.request_title`, `run_request.request_description`, `command_line`, `request_json` | The task may be human-readable Markdown plus structured metadata. |
| Test category | `run_request.request_json.test_category` | Examples: startup compliance, metrics, role selection. |
| Test ID | `run_request.request_json.test_id` | Stable ID for comparing repeated runs. |
| Test version | `run_request.request_json.test_version` | Supports prompt and procedure regression testing. |
| Execution mode | `run_request.request_json.execution_record_mode` or `run_policy.policy_mode` | Examples: Minimal, Standard, Detailed, Verbose. |
| Required role | `run_request.request_json.required_roles` | Can contain one or more roles. |
| Required procedures | `run_request.request_json.required_procedures` | Procedures selected by startup or required by the test. |
| Required standards | `run_request.request_json.required_standards` | Standards loaded for the test. |
| Prerequisites | `run_request.request_json.prerequisites` | Conditions required before execution. |
| Test data | `run_request.request_json.test_data` or `run_log_artifact` | Input files can be artifacts. |
| Expected artifacts | `run_request.request_json.expected_artifacts` | Used later for validation. |
| Pass criteria | `run_request.request_json.pass_criteria` | Validation rules for success. |
| Fail criteria | `run_request.request_json.fail_criteria` | Validation rules for failure. |
| Regression baseline | `run_request.request_json.regression_baseline` | Prior run IDs, hashes, metrics, or artifact references. |
| Postconditions | `run_request.request_json.postconditions` | Required final state after cleanup. |
| Test execution | `run_log` | One run log per execution attempt. |
| Test steps | `run_log_event` | Use event types such as `LOAD_TASK`, `SELECT_ROLE`, `VALIDATE`, and `WRITE_ARTIFACT`. |
| Test metrics | `run_log_metric` | Store numeric values such as commands executed, files read, elapsed time, and token counts. |
| Test outputs | `run_log_artifact` | Reports, TODO lists, execution records, logs, generated documents, and snapshots. |

## Recommended Run Request JSON

Use `run_request.request_json` for structured test metadata.

Example:

```json
{
  "run_type": "ai_test",
  "test_id": "AI-TEST-STARTUP-001",
  "test_name": "Startup Compliance Test",
  "test_category": "startup_compliance",
  "test_version": "1.0.0",
  "execution_record_mode": "Verbose",
  "required_roles": ["Code Reviewer", "Run Recorder"],
  "required_procedures": [
    "Code_Review.proc.md",
    "Validation.proc.md",
    "Execution_Record.proc.md",
    "Execution_Record_Metrics.md"
  ],
  "required_standards": [
    "Global Markdown Documentation Standard.md",
    "Output Document Formatting Rules.md",
    "Execution_Record_Standard.md"
  ],
  "task_source": "D:\\AI\\.AI\\Tests\\Startup_Compliance_Test.md",
  "expected_artifacts": [
    "AI-Startup-Review.md",
    "AI-Startup-TODO.md",
    "AI-Startup-Execution-Record.md"
  ],
  "pass_criteria": [
    "Startup reaches Execution Cut-Off",
    "Selected role is recorded",
    "Procedures and standards are recorded",
    "Execution metrics table is present"
  ],
  "postconditions": [
    "Required artifacts exist",
    "Execution record is written",
    "Validation results are recorded"
  ]
}
```

## Recommended Event Types

Use `run_log_event.event_type` for observable execution events.

Recommended values:

| Event Type | Meaning |
| --- | --- |
| `RUN_START` | Run execution started. |
| `LOAD_TASK` | Task prompt or task definition loaded. |
| `PRE_EVALUATE_TASK` | Task was analyzed before execution. |
| `READ_START_HERE` | Startup entry point loaded. |
| `SELECT_ROLE` | Role or roles selected. |
| `LOAD_PROCEDURE` | Procedure loaded. |
| `LOAD_STANDARD` | Standard loaded. |
| `EXECUTION_CUTOFF` | Startup ended and execution began. |
| `COMMAND` | Shell or tool command executed. |
| `READ_FILE` | File inspected or consumed. |
| `WRITE_ARTIFACT` | Output artifact created or modified. |
| `VALIDATION` | Validation check performed. |
| `DIAGNOSTIC` | Warning, error, or notable diagnostic recorded. |
| `RECOVERY` | Recovery action performed after failure. |
| `RUN_COMPLETE` | Run completed. |

## Recommended Metrics

Store numeric values in `run_log_metric`.

Examples:

| Metric Name | Unit | Notes |
| --- | --- | --- |
| `prompt_tokens` | tokens | Use only when reported by the environment. |
| `completion_tokens` | tokens | Use only when reported by the environment. |
| `total_tokens` | tokens | Use only when reported by the environment. |
| `commands_executed` | count | Count command events. |
| `commands_failed` | count | Count failed command events. |
| `files_read` | count | Count observable file reads. |
| `files_created` | count | Count created artifacts. |
| `files_modified` | count | Count modified artifacts. |
| `files_searched` | count | Count searched files when observable. |
| `tool_calls` | count | Count observable tool calls. |
| `validation_checks` | count | Count validation events. |
| `validation_failures` | count | Count failed validation checks. |
| `warnings` | count | Count warning diagnostics. |
| `errors` | count | Count error diagnostics. |
| `planning_time_seconds` | seconds | Measured or estimated. |
| `execution_time_seconds` | seconds | Measured or estimated. |
| `validation_time_seconds` | seconds | Measured or estimated. |
| `documentation_time_seconds` | seconds | Measured or estimated. |
| `wall_time_seconds` | seconds | Measured from start and end times. |

Because `run_log_metric.metric_value` is numeric, non-numeric metric status values such as `Measured`, `Estimated`, and `Unavailable` should be stored in the event JSON, artifact metadata, or a future metric metadata extension.

## Recommended Artifacts

Store test outputs in `run_log_artifact`.

Examples:

| Artifact Kind | Example Path | Notes |
| --- | --- | --- |
| `test_definition` | `.AI\Tests\Startup_Compliance_Test.md` | The source test prompt or definition. |
| `review_report` | `.AI\Results\AI-Startup-Review.md` | Human-readable findings. |
| `todo_list` | `.AI\Results\AI-Startup-TODO.md` | Follow-up work queue. |
| `execution_record` | `.AI\Results\AI-Startup-Execution-Record.md` | Human-readable execution record. |
| `validation_report` | `.AI\Results\Validation.md` | Optional validation details. |
| `log_snapshot` | `.AI\Results\logs\run.log` | Optional raw log evidence. |

Use `metadata_json` for artifact purpose, role, procedure, source hash, validation status, and whether the artifact is primary or supporting evidence.

## Pass And Fail Evaluation

Pass and fail criteria should be stored in `run_request.request_json`.

Actual pass/fail observations should be stored as:

- `run_log_event` records with event type `VALIDATION`.
- `run_log_metric` values for counts.
- `run_log.run_status` for final state.
- `run_log.evidence_summary` for final human-readable summary.

Recommended `run_log.run_status` values for tests:

- `created`
- `running`
- `passed`
- `failed`
- `partial`
- `blocked`
- `cancelled`

These can initially be stored as text values and later formalized through `enum_lookup`.

## Postconditions

Postconditions should be stored in `run_request.request_json.postconditions`.

Verification results should be emitted as `run_log_event` records.

Example event JSON:

```json
{
  "postcondition": "Required artifacts exist",
  "status": "passed",
  "evidence": [
    ".AI\\Results\\AI-Startup-Review.md",
    ".AI\\Results\\AI-Startup-TODO.md",
    ".AI\\Results\\AI-Startup-Execution-Record.md"
  ]
}
```

## Why This Avoids Duplication

This approach avoids a separate AI test schema because:

- Test identity and request metadata already fit `run_request`.
- Execution attempts already fit `run_log`.
- Steps and observations already fit `run_log_event`.
- Numeric evidence already fits `run_log_metric`.
- Documents and outputs already fit `run_log_artifact`.
- Test-specific details can live in JSON until they justify first-class tables.

## Future Extension Point

If tests become central enough to require first-class relational queries, add small extension tables later.

Possible future tables:

- `ai_test_definition`
- `ai_test_suite`
- `ai_test_suite_item`
- `ai_test_baseline`

These should reference `run_request` and `run_log` rather than replacing Run Control.
