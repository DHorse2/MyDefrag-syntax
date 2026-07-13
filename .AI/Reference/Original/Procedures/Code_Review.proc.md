# Procedure - Code Review

## Purpose

Perform a structured review of source code, configuration, documentation, and related project artifacts to identify defects, risks, inconsistencies, technical debt, and opportunities for improvement while preserving technical accuracy and project intent.

## Applicability

Use this procedure when evaluating existing work without making implementation changes unless explicitly instructed.

This procedure is especially applicable to:

- Source code reviews.
- Pull request reviews.
- Architecture reviews.
- Documentation reviews.
- Design reviews.
- Pre-release quality reviews.

## Prerequisites

Before using this procedure:

- The review scope must be defined.
- The active role must have authority to perform a review.
- Relevant project artifacts must be available.
- Applicable review standards must be identified.

## Inputs

Typical inputs include:

- User instructions.
- Source code.
- Configuration files.
- Documentation.
- Diagnostics and logs.
- Applicable standards.
- Relevant project context.
- Previous execution records.

## Required Standards

Load only the standards required for the current task, for example:

- Project coding standards.
- Documentation standards.
- Review standards.
- Execution Record Standard, when an execution record is required.

## Invoked Procedures

This procedure may invoke:

- `Validation.md`
- `Execution_Record.md`

Load invoked procedures only when required by the task and only once per run.

Do not recursively load procedures beyond one level unless explicitly instructed.

## Steps

1. Define the review scope.
2. Gather the required project artifacts.
3. Review the implementation for correctness, consistency, maintainability, and compliance.
4. Distinguish observed facts from recommendations.
5. Support findings with evidence.
6. Classify findings by severity or priority where appropriate.
7. Record affected files and locations.
8. Prepare recommendations without changing implementation unless requested.
9. Run or describe validation appropriate to the review.
10. Produce an execution record when required.

## Expected Outputs

Typical outputs include:

- Structured review report.
- Ranked findings.
- Supporting evidence.
- Recommendations.
- TODO list, when requested.
- Validation summary.
- Execution record, when required.

## Validation

Validation should confirm that:

- The requested review scope has been completed.
- Findings are supported by evidence.
- Observations are clearly separated from recommendations.
- Affected files are identified.
- Applicable standards were followed.

## Completion Criteria

This procedure is complete when:

- The requested review has been completed.
- Findings and recommendations have been documented.
- Required validation has been completed or explicitly reported as unavailable.
- Any required execution record has been created or described.

## Notes

This procedure defines **how** a code review is performed. It does not define **who** performs the work. The active role defines authority and responsibility, while standards define the rules this procedure must satisfy.
