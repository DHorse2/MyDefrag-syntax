# Codex Task: Revise VSCodium Environment Snapshot Exporter

## Table of Contents

- [Task Summary](#task-summary)
- [Execution Context](#execution-context)
- [Source File](#source-file)
- [Primary Goal](#primary-goal)
- [Safety and Ownership Requirements](#safety-and-ownership-requirements)
- [Required Changes](#required-changes)
- [Implementation Notes](#implementation-notes)
- [Validation Requirements](#validation-requirements)
- [Expected Deliverables](#expected-deliverables)
- [Suggested Test Commands](#suggested-test-commands)
- [Completion Report](#completion-report)

## Task Summary

Revise `Export-VSCodiumEnvironment.ps1` so it becomes a stronger MCP-owned local configuration-state snapshot tool for comparing the Abbotsford PC against the Nanaimo installation.

This is not a generic AI backup task. It is a local MCP configuration-state capture and comparison-support task.

## Execution Context

- Current machine role: Abbotsford source machine.
- Comparison target: Nanaimo installation.
- Script purpose: capture local VSCodium, extension, configuration, app, and tool state in a safe, non-destructive, repeatable form.
- Ownership: MCP configuration-state evidence, not AI-owned export data.
- Expected output domain: `D:\AI\MCP\StateSnapshots\Machines\...`

Before editing, load the available `.AI` startup context and execution-record procedure for this workspace. Record the run in the workspace execution-record format if the procedure is available.

## Source File

Primary file to revise:

```text
Export-VSCodiumEnvironment.ps1
```

If the file is not in the current directory, search the current workspace for that exact filename and use the active/local copy.

## Primary Goal

Improve the script so its output can be used to:

1. Capture Abbotsford local configuration state.
2. Compare Abbotsford state against Nanaimo state.
3. Support safe, reviewable, dry-run import/replay preparation on Nanaimo.
4. Preserve enough evidence for comparison without copying secret-bearing data by default.

## Safety and Ownership Requirements

Follow these requirements strictly:

- Work locally only.
- Do not upload anything.
- Do not delete source configuration.
- Do not modify existing VSCodium, VS Code, app, or tool configuration while exporting.
- Do not create a destructive restore script.
- Do not copy likely secret-bearing state by default.
- Inventory likely secret-bearing state by existence, path, size, timestamp, and classification.
- Redact sensitive values in manifests, logs, summaries, transcripts, and command output reports.
- Preserve existing comments and coding style where practical.
- Prefer additive changes over rewrites.
- Keep public parameters backward compatible where practical.
- Use PowerShell 5.1-compatible syntax unless the existing script has already committed to PowerShell 7-only behavior.
- Do not use `$args` for custom parameter handling.

## Required Changes

### 1. Fix external command capture fidelity

Fix `Invoke-ExternalCommandCapture` so `.cmd` and `.bat` command shims reliably capture stdout, stderr, and exit code.

This specifically affects tools such as:

- `npm.cmd`
- `npx.cmd`
- `pnpm.cmd`
- `yarn.cmd`
- package manager shims
- other Windows command wrappers

The current `.cmd` / `.bat` branch is too fragile. Make the quoting robust for paths with spaces and arguments.

Use a safer `cmd.exe` invocation pattern such as:

```powershell
$process.StartInfo.FileName = $shellPath
$process.StartInfo.Arguments = '/d /s /c ""' + $commandSource + '" ' + (ConvertTo-ProcessArgumentString -ArgumentList $ArgumentList) + '"'
```

Validate the exact quoting locally. If this pattern is insufficient, implement and document a tested quoting helper. The result must reliably capture non-empty output for installed shim tools that actually produce output.

Also verify PowerShell 7 capture. If `pwsh` is detected, `pwsh --version` or the script's selected PowerShell 7 version command must produce captured stdout or a clear diagnostic explaining why it did not.

### 2. Add machine identity and comparison-target parameters

Add parameters:

```powershell
[string]$MachineName = 'Abbotsford'
[string]$ComparisonTarget = 'Nanaimo'
```

Use these in:

- Manifest metadata.
- Validation summary.
- Folder naming.
- Compare/import readiness notes.
- Any generated restore/import plan files.

### 3. Change the default output root to MCP state snapshots

Change the default output root from a generic export path to an MCP-owned machine snapshot path.

Recommended default:

```powershell
D:\AI\MCP\StateSnapshots\Machines\$MachineName\VSCodium
```

Keep the output timestamped beneath that root.

If backward compatibility requires preserving the old default, add a clear compatibility note and a new preferred default path mechanism. The final behavior must clearly identify the output as an MCP-owned configuration-state snapshot.

### 4. Add relative artifact paths to manifests

Wherever the script records exported files, logs, command outputs, inventories, summaries, or copied config artifacts, include both:

- Absolute path.
- Path relative to the snapshot root.

This is required so Abbotsford and Nanaimo snapshots can be compared even when their absolute roots differ.

### 5. Make non-sensitive hashing comparison-ready

Ensure the snapshot includes SHA256 hashes for non-sensitive exported files by default, or strongly default the normal Abbotsford baseline workflow to include them.

Requirements:

- Hash copied non-sensitive files.
- Do not hash skipped secret-bearing files unless explicitly safe and non-sensitive.
- Include hash status/classification in the file inventory.
- Preserve compatibility with the existing `-HashFiles` switch where practical.
- Add a clear opt-out switch only if needed, such as `-NoHashFiles` or equivalent.

### 6. Add safe extension-state capture instead of all-or-nothing secrets

The current secret handling skips broad VSCodium state such as `globalStorage`, which is safe but too coarse for comparison.

Add a middle mode that can copy allowlisted, known-safe extension state without enabling full secret capture.

Recommended parameters:

```powershell
[switch]$IncludeSafeExtensionState
[string[]]$SafeGlobalStorageExtensionIds = @(
    'valentjn.vscode-ltex',
    'macrodm.mydefrag-syntax'
)
```

Behavior:

- If `-IncludeSafeExtensionState` is not used, continue to skip high-risk state and inventory it only.
- If `-IncludeSafeExtensionState` is used, copy only allowlisted globalStorage extension folders.
- Keep broad `-IncludePotentialSecrets` as an explicit private-backup override, not the normal comparison path.
- For copied allowlisted extension state, still redact sensitive values from manifests/logs.
- For non-allowlisted globalStorage folders, record inventory-only metadata.
- Classification should distinguish:
  - copied non-sensitive config,
  - copied allowlisted extension state,
  - skipped sensitive state,
  - skipped cache-heavy state,
  - missing expected path.

### 7. Generate compare/import readiness material

Create a `compare-import-readiness` or similarly named folder in each snapshot.

It should include reviewable, non-destructive materials such as:

```text
compare-import-readiness/
  00-compare-only.md
  01-install-vscodium-extensions.ps1
  02-restore-vscodium-user-config.ps1
  03-restore-safe-extension-state.ps1
  DO-NOT-RUN-DESTRUCTIVE-RESTORE.md
```

Requirements:

- Generated restore/import scripts must default to dry-run.
- Any actual write behavior must require an explicit `-Apply` switch.
- The generated scripts must not overwrite Nanaimo files without creating a timestamped backup first.
- The generated scripts must clearly identify source machine, target machine, and snapshot path.
- The extension install script should use captured extension IDs and versions where possible.
- The restore notes should distinguish comparison, copy, and apply phases.

### 8. Improve VSCodium extension inventory

Generate parsed extension inventory in both JSON and CSV.

Use at least these sources:

1. `codium --list-extensions --show-versions`
2. copied extension folder `package.json` files, where present

Recommended fields:

| Field | Notes |
|---|---|
| ExtensionId | Normalized publisher.name if available |
| Version | Installed version |
| Source | Command output, package.json, or both |
| ExtensionPath | Absolute and relative where relevant |
| Publisher | From package.json if present |
| Name | From package.json if present |
| DisplayName | From package.json if present |
| EnginesVscode | From package.json if present |
| Main | From package.json if present |
| Browser | From package.json if present |
| ActivationEventsCount | Count only; avoid bloating manifest |
| ContributesKeys | Top-level contributes keys only |
| IsAllowlistedState | True when included in safe extension-state copy |

### 9. Add package-manager replay inventory

Add replay-oriented package manager inventory where available.

For `winget`, attempt an export such as:

```powershell
winget export --output <snapshot-package-folder>\winget-export.json
```

If exact arguments vary on this installation, detect failure and fall back to `winget list` capture with a clear diagnostic.

Also keep existing inventory for tools such as Node.js, npm, npx, Git, PowerShell, Python, .NET, Java, Rust, Go, `vsce`, `ovsx`, `choco`, and `scoop` where available.

### 10. Add validation for blank command outputs

The validation summary must warn when an expected command is found but its version stdout is blank.

Examples requiring warning if detected but blank:

- VSCodium
- Node.js
- npm
- npx
- Corepack
- Git
- PowerShell 7

Distinguish these cases:

| Case | Required validation result |
|---|---|
| Command not found | Warning or informational missing-tool diagnostic |
| Command found and stdout non-empty | Pass |
| Command found but stdout blank and stderr blank | Warning: capture problem or command returned no output |
| Command found but stderr indicates not found | Warning: shim/path problem |
| Command timed out | Warning or error depending on importance |
| Command exited non-zero | Warning with exit code and stderr summary |

## Implementation Notes

### Command quoting

Be especially careful with command shims resolved by `Get-Command`.

The command source may be a path such as:

```text
C:\Program Files\nodejs\npm.cmd
C:\Users\david\AppData\Local\Microsoft\WindowsApps\pwsh.exe
```

The invocation must survive spaces in paths and arguments.

### Redaction

Do not redact structural evidence needed for comparison, such as:

- File existence.
- File name.
- File size.
- Last write time.
- Extension ID.
- Package/tool version.
- Non-sensitive hash.

Do redact or skip:

- Tokens.
- Passwords.
- API keys.
- Credential values.
- Session values.
- Secret-bearing file contents unless explicitly requested through existing private-backup behavior.

### Snapshot structure

Prefer a structure similar to:

```text
D:\AI\MCP\StateSnapshots\Machines\Abbotsford\VSCodium\<timestamp>\
  copied-state\
  inventories\
  command-output\
  manifests\
  validation\
  compare-import-readiness\
  transcript\
```

Use the existing script's structure where reasonable, but ensure the MCP ownership and comparison purpose are clear.

## Validation Requirements

After editing, run static and functional validation.

Required validation:

1. PowerShell parse check.
2. PSScriptAnalyzer if available; do not install it just for this task.
3. Fast dry inventory run if supported.
4. Normal snapshot run using Abbotsford/Nanaimo parameters.
5. Verify command outputs for VSCodium, Node.js, npm, npx, Corepack, Git, and PowerShell 7.
6. Verify generated JSON and CSV files are parseable.
7. Verify compare/import readiness files are created.
8. Verify secret-bearing paths remain inventory-only by default.
9. Verify allowlisted globalStorage state is copied only when `-IncludeSafeExtensionState` is supplied.
10. Verify no source configuration files were modified.

## Expected Deliverables

Return a concise completion report with:

| Deliverable | Required |
|---|---|
| Modified script path | Yes |
| Summary of changes | Yes |
| Validation commands run | Yes |
| Validation results | Yes |
| Snapshot test output path | Yes, if generated |
| Any skipped sensitive paths | Summary only |
| Any unresolved issues | Yes |
| Recommended command for Abbotsford baseline | Yes |
| Recommended command for Nanaimo comparison capture | Yes |

## Suggested Test Commands

Use paths appropriate to the local checkout.

### Parse check

```powershell
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path .\Export-VSCodiumEnvironment.ps1), [ref]$tokens, [ref]$errors) | Out-Null
$errors | Format-List *
if ($errors.Count -gt 0) { throw 'PowerShell parse errors found.' }
```

### Fast inventory-only run

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Export-VSCodiumEnvironment.ps1 `
  -MachineName Abbotsford `
  -ComparisonTarget Nanaimo `
  -OutputRoot 'D:\AI\MCP\StateSnapshots\Machines\Abbotsford\VSCodium' `
  -NoFileCopy `
  -NoArchive `
  -SkipPackageManagerInventory
```

### Baseline Abbotsford snapshot run

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Export-VSCodiumEnvironment.ps1 `
  -MachineName Abbotsford `
  -ComparisonTarget Nanaimo `
  -OutputRoot 'D:\AI\MCP\StateSnapshots\Machines\Abbotsford\VSCodium' `
  -IncludeSafeExtensionState `
  -NoArchive
```

Do not use `-IncludePotentialSecrets` for the normal baseline.

## Completion Report

When finished, report:

- Whether the script is now export-ready.
- Whether it is comparison-ready.
- Whether it is import-plan-ready.
- Whether it remains non-destructive by default.
- Which command-capture issues were fixed.
- Which generated files Nanaimo should use first for comparison.
