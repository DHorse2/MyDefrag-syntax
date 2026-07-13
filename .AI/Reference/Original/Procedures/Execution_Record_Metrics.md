# Procedure - Execution Record Metrics

## Purpose

Define the recommended execution metrics that AI agents should collect and include in execution records whenever the information is observable or reported by the execution environment.

## Applicability

Use this procedure with `Execution_Record.proc.md`.

Collect metrics throughout the execution lifecycle rather than reconstructing them after the run whenever practical.

## Action Timing

Where possible, collect timing for the following execution phases:

- Planning Time
- Execution Time
- Validation Time
- Documentation Time

These values should be:

- Measured when directly observable.
- Estimated only when measurement is not possible.
- Recorded as `Unavailable` when neither measurement nor estimation is appropriate.

## Execution Metrics

Provide any of the following metrics that are available.

Do not invent values.

| Metric               | Value    | Status    | Source       |
| ----------------------| ---------:| -----------| --------------|
| Prompt tokens        | 12,341  | Measured  | Codex API    |
| Completion tokens    | 8,215   | Measured  | Codex API    |
| Total tokens         | 20,556  | Measured  | Codex API    |
| Prompt cache hits    | 7        | Measured  | Runtime      |
| Prompt cache misses  | 2        | Measured  | Runtime      |
| Commands executed    | 45       | Measured  | Command Log  |
| Commands failed      | 4        | Measured  | Command Log  |
| Files read           | 37       | Measured  | File Log     |
| Files created        | 3        | Measured  | Artifact Log |
| Files modified       | 3        | Measured  | Artifact Log |
| Files searched       | 91       | Measured  | Search Log   |
| Tool calls           | 18       | Measured  | Tool Log     |
| Validation checks    | 8        | Measured  | Validation   |
| Validation failures  | 1        | Measured  | Validation   |
| Warnings             | 6        | Measured  | Diagnostics  |
| Errors               | 0        | Measured  | Diagnostics  |
| Start time           | 04:45:13 | Measured  | Runtime      |
| End time             | 04:53:02 | Measured  | Runtime      |
| Wall time            | 469 s    | Measured  | Runtime      |
| Active AI time       | 317 s    | Estimated | Runtime      |
| Idle / approval wait | 152 s    | Estimated | Runtime      |

## Metric Status

Use the following status values consistently:

| Status | Meaning |
| --- | --- |
| Measured | Directly observed or reported by the execution environment. |
| Estimated | Reasonably inferred from observable evidence. |
| Unavailable | Not reported and not safely inferable. |

Never leave metric values blank.

## Notes

This procedure defines recommended execution metrics only.

It complements `Execution_Record.proc.md` and should be invoked whenever execution metrics are required.
