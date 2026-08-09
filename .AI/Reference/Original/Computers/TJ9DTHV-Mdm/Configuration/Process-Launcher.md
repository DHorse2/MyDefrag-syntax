# Codex Process Launcher Policy

<!-- markdownlint-disable MD013 -->

## Purpose

This machine-specific policy defines how Codex launches Windows command
processes during workspace startup and normal execution.

It is read immediately after `AI_ROOT` is resolved and before any other `.AI`
files are read.

## Machine Scope

| Field | Value |
| --- | --- |
| Computer name | `TJ9DTHV-Mdm` |
| Platform | Windows |
| Applies to | Codex |
| Policy status | Active |

## Launcher Policy

### Bootstrap Reads

Use `cmd.exe` for startup discovery and startup file reads on this machine.

Use the following launcher form:

```text
cmd.exe /d /s /c
```

The bootstrap-read scope includes:

- Directory existence and accessibility checks.
- File existence checks.
- Reading `AI_Directive_Vocabulary.md`.
- Reading `currentTask.md`.
- Reading `Instructions.md`.
- Reading startup-required role, procedure, and standard files.
- Other read-only discovery required before the Execution Cut-Off.

The `/d` option is required so Command Processor AutoRun commands do not alter
bootstrap behavior.

### Normal Execution

PowerShell remains the preferred launcher for commands and scripts that require
PowerShell semantics after startup has established the execution context.

Use `-NoLogo`, `-NoProfile`, and `-NonInteractive` when practical.

### PowerShell Launcher Failure

Treat the following condition as a launcher or Windows-session failure:

```text
CreateProcessAsUserW failed: 1312
```

When this condition occurs:

- Do not classify the task as failed.
- Do not mark the current task `Failed`, `Blocked`, or `Completed` solely because
  of the launcher error.
- Do not repeatedly retry the same direct PowerShell launch path.
- Continue read-only discovery and startup reads through `cmd.exe`.
- When PowerShell semantics are required, launch PowerShell through `cmd.exe`
  rather than through the failing direct launcher.
- Record the original launcher, error code, fallback launcher, attempted
  operation, and result when execution recording is enabled.

For a PowerShell command, use the conceptual form:

```text
cmd.exe /d /s /c "powershell.exe -NoLogo -NoProfile -NonInteractive -Command <command>"
```

For a PowerShell script, use the conceptual form:

```text
cmd.exe /d /s /c "powershell.exe -NoLogo -NoProfile -NonInteractive -File <script-path> <arguments>"
```

Apply normal Windows quoting and escaping rules to the actual command.

## Fallback Boundaries

The launcher fallback changes only the process-launch mechanism.

It must not:

- Change task identity or task status.
- Advance, reorder, or consume the task queue.
- Modify `currentTask.md`.
- Create an execution record merely because fallback was used.
- Bypass approval requirements.
- Bypass the Execution Cut-Off.
- Change the meaning or order of the startup chain.

## Missing Policy Behavior

This document is machine-specific.

If it is absent during a future startup, Codex follows the normal inherited
launcher behavior and records that no machine-specific process-launcher policy
was found when execution recording is enabled.

## Validation

A safe policy test must:

1. Read this file after resolving `AI_ROOT`.
2. Use `cmd.exe /d /s /c` to list the resolved `AI_ROOT` directory.
3. Use `cmd.exe /d /s /c` to read
   `<AI_ROOT>\AI_Directive_Vocabulary.md`.
4. Report the selected bootstrap launcher and the result of both operations.
5. Stop before `LOAD TASK`.
6. Make no file changes and make no queue changes.
