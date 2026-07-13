# Task - Codex Self TODO Test

## Objective

Review the current `.AI\Tests` framework and create a TODO list for improving Codex's own AI test workflow.

The goal is to test whether Codex can use the startup chain, inspect the test framework, identify work for itself, and produce a prioritized TODO list without modifying existing framework files.

## Scope

Review only:

```text
D:\AI\.AI\Tests
```

Current files include:

```text
AI_Test_Run_Control_Mapping.md
AI_Test_Types.md
Execution_Metrics_Test.md
Minimal_Startup_Test.md
Procedure_Composition_Test.md
Role_Selection_Test.md
Startup_Compliance_Test.md
```

Do not review unrelated `.AI` folders unless required by the startup chain, selected role, or selected procedure.

## Required Behavior

Codex should:

- Follow `Start_Here.md`.
- Use AI file resolution rules.
- Load this task using `LOAD TASK`.
- Pre-evaluate the task before execution.
- Determine the appropriate role or roles.
- Determine required procedures and standards.
- Determine execution mode.
- Determine required capabilities.
- Complete execution planning before the Execution Cut-Off.
- Execute only after the Execution Cut-Off.
- Produce or update the execution record.

## Execution Mode

Use `Verbose` execution-record mode.

## Review Requirements

Evaluate the test framework for:

- Missing test types.
- Weak or underspecified test prompts.
- Missing pass/fail criteria.
- Missing expected artifacts.
- Missing metrics requirements.
- Missing postconditions.
- Duplicate or overlapping material.
- Gaps in Run Control mapping.
- Improvements needed before MCP automation can execute tests deterministically.

## Output Requirements

Create:

```text
D:\AI\.AI\Results\Codex-Self-TODO.md
D:\AI\.AI\Results\Codex-Self-TODO-Execution-Record.md
```

Do not modify existing test framework files during this run.

## TODO List Requirements

The TODO list must include:

- Unique ID.
- Priority.
- Status.
- Area.
- Description.
- Rationale.
- Affected file or component.
- Suggested implementation order.
- Dependencies, if known.

Priorities:

- Critical
- High
- Medium
- Low

## Validation Requirements

Validate that:

- Required output files exist.
- Each generated Markdown file has exactly one level-1 heading.
- Headings are unique.
- Unordered lists use `-`, not `*`.
- Fenced code blocks are balanced.
- The execution record includes numeric metrics.
- Unavailable metrics are explicitly marked as `Unavailable`.

## Completion Criteria

The task is complete when:

- The `.AI\Tests` framework has been reviewed.
- `Codex-Self-TODO.md` has been created.
- `Codex-Self-TODO-Execution-Record.md` has been created.
- Validation results are recorded.
- No existing test framework files were modified.
