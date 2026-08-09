# TJ9DTHV-Mdm Codex Machine Instructions

## TJM-001 — Launcher Policy

Use:

```text
D:\AI\.AI\Computers\TJ9DTHV-Mdm\Configuration\Process-Launcher.md
```

Resolve it once per run.

Do not report it missing after only one failed quoted-path probe.

## TJM-002 — Quoted Path Failure

Quoted absolute Windows paths may fail through the current launcher.

When that occurs, use a different path form once.

Do not repeat equivalent quoting tests.

## TJM-003 — Paths With Spaces

Paths containing spaces may fail through the current launcher.

Use one verified fallback.

Use DOS short names only when required for execution.

Record canonical long paths in outputs and journals.

## TJM-004 — PowerShell Launcher Failure

When this occurs:

```text
CreateProcessAsUserW failed: 1312
```

Use direct `cmd.exe` or `cmd.exe`-launched PowerShell.

Do not repeat the failing launcher call.

## TJM-005 — Git Repository Check

Before multiple Git commands, run:

```text
git rev-parse --is-inside-work-tree
```

If it fails, inspect:

```text
D:\AI\.git
```

once.

Do not run further Git commands that require a valid repository.

## TJM-006 — Machine Fallback Reporting

Write launcher, quoting, shell, and path fallback details to the machine journal.

Report them to the user only when they block execution, change the result, or require user action.
