# Procedure - Debugging Run

## Purpose

Perform a structured debugging investigation to identify, isolate, analyze, and help resolve defects while preserving technical accuracy, project intent, and applicable standards.

## Applicability

Use this procedure when diagnosing incorrect behavior, failures, unexpected results, regressions, or performance issues.

This procedure is especially applicable to:

- Functional defects.
- Runtime failures.
- Build failures.
- Integration issues.
- Performance investigations.
- Regression analysis.

## Prerequisites

Before using this procedure:

- The reported problem or investigation scope must be defined.
- The active role must have authority to perform debugging.
- Relevant diagnostics, logs, or execution evidence should be available when possible.
- Applicable debugging standards must be identified.

## Inputs

Typical inputs include:

- User instructions.
- Source code.
- Project files.
- Diagnostics.
- Logs.
- Test results.
- Execution records.
- Applicable standards.
- Relevant project context.

## Required Standards

Load only the standards required for the current task, for example:

- Project coding standards.
- Diagnostic standards.
- Documentation standards.
- Execution Record Standard, when an execution record is required.

## Invoked Procedures

This procedure may invoke:

- `Validation.md`
- `Execution_Record.md`

Load invoked procedures only when required by the task and only once per run.

Do not recursively load procedures beyond one level unless explicitly instructed.

## Steps

1. Define the debugging scope.
2. Collect available evidence.
3. Reproduce the problem when possible.
4. Analyze diagnostics, logs, and execution evidence.
5. Distinguish observed facts from hypotheses.
6. Isolate the probable root cause.
7. Recommend corrective actions.
8. Record affected files and components.
9. Run or describe validation appropriate to the investigation.
10. Produce an execution record when required.

## Expected Outputs

Typical outputs include:

- Debugging report.
- Root cause analysis.
- Supporting evidence.
- Recommended corrective actions.
- Validation summary.
- Execution record, when required.

## Validation

Validation should confirm that:

- The requested investigation has been completed.
- Findings are supported by evidence.
- Observations are clearly separated from hypotheses.
- Root causes or remaining uncertainties are documented.
- Affected files are identified.
- Applicable standards were followed.

## Completion Criteria

This procedure is complete when:

- The requested debugging investigation has been completed.
- Findings and recommendations have been documented.
- Required validation has been completed or explicitly reported as unavailable.
- Any required execution record has been created or described.

## Notes

This procedure defines **how** a debugging investigation is performed. It does not define **who** performs the work. The active role defines authority and responsibility, while standards define the rules this procedure must satisfy.
