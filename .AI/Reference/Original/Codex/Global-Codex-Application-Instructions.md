# Global Codex Application Instructions

## GCAI-001 — Keep User-Visible Progress Brief

Report to the user only:

- Major progress.
- Material findings.
- Blocking errors.
- Validation results.
- Final outcome.

Do not display routine commands, file reads, directory listings, startup steps, role loading, procedure loading, standard loading, path probes, or journal writes in user-visible progress.

Continue recording all required execution detail in the applicable machine journal, task journal, run journal, and execution record.

## GCAI-002 — Record Complete Execution Detail

Record required execution activity even when it is omitted from user-visible progress.

Include:

- Commands executed.
- Files read.
- Directories inspected.
- Startup steps.
- Roles, procedures, and standards loaded.
- Path resolution attempts.
- Timestamps.
- Exit codes.
- Relevant output.
- Failures.
- Fallbacks.
- Validation evidence.
- Journal and execution-record updates.

User-visible brevity must never reduce journal completeness.

## GCAI-003 — Test Prerequisites First

Validate a required prerequisite before running dependent command batches.

Stop dependent commands after a decisive prerequisite failure.

## GCAI-004 — Avoid Redundant Probing

Do not repeat equivalent command, path, quoting, or shell attempts.

Retry only when testing a different cause.

## GCAI-005 — Stop When Blocked

When a required prerequisite is unavailable:

- Record the blocker.
- Perform minimal confirmation.
- Produce the supported partial result.
- Stop.

Do not repair unless repair is explicitly requested.

## GCAI-006 — Stop When Complete

After the requested result is obtained and validated:

- Write the execution record.
- Return the result.
- Stop execution.

## GCAI-007 — Load Minimal Context

Load only the task, roles, procedures, and standards required for the current execution.

Do not continue context discovery after execution requirements are satisfied.

## GCAI-008 — Do Not Bypass Task Validation

`DO NOW` applies only to a successfully loaded and validated task.

Do not execute rejected, blocked, stale, malformed, or unclaimed tasks.

Do not use conversation context to bypass task validation.
