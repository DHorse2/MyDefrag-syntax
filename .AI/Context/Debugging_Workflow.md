# AI Debugging Workflow

## Purpose

This document defines the standard debugging methodology expected during AI-assisted development.

The objective is to identify the root cause of a problem before proposing changes, minimize unintended side effects, and support recommendations with evidence.

## Guiding Principles

- Understand the problem before attempting to solve it.
- Gather evidence before forming conclusions.
- Prefer deterministic investigation over speculation.
- Preserve existing behaviour unless change is required.
- Make the smallest change that fully resolves the problem.
- Explain the reasoning behind significant modifications.

## Investigation Process

### 1. Understand the Problem

Determine:

- Expected behaviour.
- Actual behaviour.
- Steps to reproduce.
- Error messages or diagnostics.
- Environment and configuration.

If important information is missing, identify what additional evidence is required.

### 2. Collect Evidence

Gather relevant information before proposing changes.

Evidence may include:

- Source code.
- Compiler diagnostics.
- Runtime logs.
- Stack traces.
- Test results.
- Configuration.
- Input data.
- Version information.

Avoid modifying code until sufficient evidence has been collected.

### 3. Identify the Root Cause

Determine:

- Where the failure originates.
- Why it occurs.
- Whether it is reproducible.
- Whether multiple symptoms share the same cause.

Prefer fixing the underlying cause rather than downstream symptoms.

### 4. Evaluate Existing Design

Before introducing new code, determine whether the existing architecture already provides an appropriate solution.

Prefer extending established mechanisms over creating parallel implementations.

## Implementing Changes

When modifications are required:

- Limit changes to the affected components.
- Preserve public interfaces unless explicitly requested.
- Preserve comments where practical.
- Avoid unrelated refactoring during debugging.

## Validation

After implementing a fix:

- Verify the reported issue is resolved.
- Check for regressions.
- Run relevant tests.
- Review diagnostics.
- Confirm expected behaviour.

## Reporting

Summaries should include:

- Root cause.
- Files modified.
- Changes made.
- Validation performed.
- Remaining risks or limitations.

## Uncertainty

When multiple explanations remain possible:

- State each hypothesis.
- Describe supporting evidence.
- Describe conflicting evidence.
- Recommend the next deterministic investigation step.

Do not present speculation as fact.