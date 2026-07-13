# AI Test Types

## Table of Contents

1. Startup Compliance
2. Execution Metrics
3. Role Selection
4. Procedure Composition
5. Minimal Startup
6. Test Execution Guidelines

## Startup Compliance

Verify workspace resolution, task loading, role selection, procedure loading, standards loading, Execution Cut-Off compliance, and execution record generation.

## Execution Metrics

Validate `Execution_Record_Metrics.md`. Ensure numeric metrics exist and every metric is Measured, Estimated, or Unavailable.

## Role Selection

Verify correct role or role combination is derived from the task.

## Procedure Composition

Verify only required procedures are loaded, and shared procedures are invoked rather than duplicated.

## Minimal Startup

Verify trivial tasks do not load unnecessary context.

## Test Execution Guidelines

- Run one test at a time.
- Save artifacts and execution records.
- Compare with previous runs.
- Record regressions and improvements.

## Initial Test Suite

Under `D:\AI\.AI\Tests`.

It contains:

- **AI_Test_Types.md** – a summary document with a table of contents describing the initial AI test categories.
- Individual test task documents:

  - `Startup_Compliance_Test.md`
  - `Execution_Metrics_Test.md`
  - `Role_Selection_Test.md`
  - `Procedure_Composition_Test.md`
  - `Minimal_Startup_Test.md`

## Test Definition Schema

Each AI test should eventually follow a common structure to support deterministic execution, repeatability, automated validation, benchmarking, and future MCP execution.

Each test should define:

- `Test Definition` (metadata)
- `Task`
- `Expected Behavior`
- `Expected Artifacts`
- `Pass Criteria`
- `Fail Criteria`
- `Metrics Collected`
- `Regression Baseline`

This common structure allows tests to become deterministic, repeatable, comparable across AI models, and eventually executable by the MCP without manual interpretation.

## Complete Schema

Each AI test should contain the following sections:

- Test Definition
- Prerequisites
- Test Data
- Task
- Expected Behavior
- Expected Artifacts
- Pass Criteria
- Fail Criteria
- Metrics Collected
- Regression Baseline
