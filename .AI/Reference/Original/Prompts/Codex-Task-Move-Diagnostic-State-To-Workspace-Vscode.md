# Codex Task: Move Persistent Diagnostic State to the Target Project `.vscode` Folder

## Task Status

- Status: Ready
- Project: `D:\Script\MyDefrag-syntax`
- Agent: Codex
- Task type: Small, targeted implementation
- Execution mode: Detailed
- Risk: Low to moderate because persisted user state must remain reliable

## Objective

Change only the storage location of the MyDefrag diagnostic-navigation state.

Persist the state in the target project's standard VSCodium workspace folder:

```text
<target-project>\.vscode\session_dismissed.json
```

Do not change diagnostic-navigation functionality, state meanings, commands, filtering, ordering, serialization format, or language-server behavior.

## Current Implementation Context

Inspect the current repository before editing. The relevant implementation is expected to include:

- `src/shared/path.js`
  - Defines the current default diagnostic state path under `.user\logs`.
- `src/diagnostics/diagnosticsState.js`
  - Implements `DiagnosticStateStore`.
  - Accepts an explicit state-file path.
  - Loads and saves the existing JSON state format.
- `src/diagnostics/diagnosticNavigator.js`
  - Accepts `options.stateFile`.
  - Currently falls back to `paths.diagnosticsStateFile`.
- `src/diagnostics/registerDiagnosticNavigation.js`
  - Creates `DiagnosticNavigator`.
  - Contains older commented workspace-root path-resolution code that may be useful as implementation evidence.
- `src/extension.js`
  - Registers diagnostic navigation through `registerDiagnosticNavigation(context)`.

Confirm the actual current code before making changes. Do not assume the supplied description is newer than the repository.

## Required Behavior

### Workspace State Location

For a normal single-folder workspace, resolve the diagnostic state file to:

```text
<first-workspace-folder>\.vscode\session_dismissed.json
```

Use the target workspace folder exposed by the VSCodium workspace API. Do not derive the target project from the extension installation directory or the extension source directory.

### No-Workspace Fallback

When no workspace folder is open:

- Do not throw.
- Preserve the existing fallback behavior and existing usable state location.
- Do not create a fake project root.

### Directory Creation

- The `.vscode` directory may not exist.
- Create the parent directory safely when the state is first saved.
- Do not require the user to create the folder manually.
- Do not modify the target project's `.gitignore`.
- Do not create a new project-specific `.user` folder for diagnostic state.

### Existing State Compatibility

Preserve the existing JSON schema and key normalization.

Preferred compatibility behavior:

- Read the new `.vscode\session_dismissed.json` file when it exists.
- When the new file does not exist, allow the existing legacy state file to be read as a fallback so the user's prior state is not abruptly lost.
- After the next state-changing operation, save state to the new `.vscode` location.
- Do not delete the legacy file automatically.
- Do not continue writing new state to the legacy location after a target workspace state file has been resolved.

Implement this only with a small, clear change. Do not introduce a general migration framework.

### Multi-Root Workspaces

Do not redesign diagnostic state into multiple stores in this task.

Preserve the current single-store diagnostic-navigation model and use the first workspace folder as the target project unless the current repository already has a more specific established workspace-selection rule.

Document this limitation in the completion report.

## Strict Non-Goals

Do not change any of the following:

- Diagnostic generation or publication.
- `diagnostics-latest.json` storage.
- Client, server, parser, or preview log locations.
- Diagnostic key construction.
- Diagnostic sorting or navigation order.
- Fixed, ignored, skipped, sent, or reset semantics.
- Diagnostic severity filtering.
- Tree view contents.
- Status bar behavior.
- Command names or command behavior.
- Language-server startup, validation, rescanning, or configuration handling.
- Package version.
- Extension activation events.
- README or other documentation unless an existing statement explicitly names the old state-file location.
- `.gitignore`, `files.exclude`, `search.exclude`, or `mydfrg.exclude`.
- Unrelated defects, stale comments, naming problems, or cleanup opportunities.

In particular, do not fix unrelated state-validation behavior or refactor the diagnostic subsystem as part of this task.

## Implementation Constraints

- Preserve all existing comments.
- Preserve CommonJS module style.
- Keep the diff minimal.
- Do not rename public classes, commands, exports, or existing APIs.
- Prefer passing the resolved state path into the existing `DiagnosticNavigator` and `DiagnosticStateStore` interfaces instead of adding global mutable state.
- Keep filesystem path construction in the extension process where the VSCodium workspace API is available.
- Use `path.join`.
- Use `fs.mkdirSync(..., { recursive: true })` only through existing state-save behavior or an equally narrow existing helper.
- Do not add a dependency.
- Do not add a test framework if the repository does not already have one.

## Likely Minimal Change Shape

The existing design appears to support a minimal dependency-injection change:

1. Resolve the first workspace folder in `registerDiagnosticNavigation(context)`.
2. Build `<workspaceRoot>\.vscode\session_dismissed.json`.
3. Pass the resolved path into `new DiagnosticNavigator({ stateFile, ... })`.
4. Retain a safe legacy/fallback path for no-workspace operation and optional compatibility loading.
5. Leave the diagnostics snapshot and log paths unchanged.

This is guidance, not permission to edit before confirming the actual current code.

## Required Inspection Before Editing

Before changing files:

1. Run `git status --short`.
2. Inspect the relevant files listed above.
3. Search for every use of:
   - `diagnosticsStateFile`
   - `session_dismissed.json`
   - `stateFile`
   - `dismissedFile`
   - `new DiagnosticNavigator`
4. Identify the exact files you expect to modify.
5. Report the planned file changes before editing.
6. Preserve unrelated uncommitted work.

## Validation

Run the repository's existing relevant validation commands. At minimum, perform syntax checks or the existing build if available.

Do not claim an interactive VSCodium test passed unless it was actually performed.

### Required Static Checks

Verify that:

- The state path is derived from `vscode.workspace.workspaceFolders`.
- The first workspace folder resolves to `.vscode\session_dismissed.json`.
- The no-workspace path remains valid.
- Existing state JSON format remains unchanged.
- Parent-directory creation remains recursive and safe.
- No language-server or diagnostic-snapshot path was moved.
- No `.gitignore` or package exclusion setting was changed.

### Required Manual Test Statements

Provide these or equivalent precise test instructions in the completion report:

1. Open a target MyDefrag project in VSCodium.
2. Confirm that no project-specific `.user` folder is created solely for diagnostic state.
3. Use **MyDefrag: Ignore File Diagnostic** or **MyDefrag: File Diagnostic is Fixed**.
4. Verify this file is created or updated:

   ```text
   <target-project>\.vscode\session_dismissed.json
   ```

5. Reload the VSCodium window.
6. Confirm the ignored or fixed diagnostic remains excluded.
7. Run **MyDefrag: Reset Diagnostic Navigation**.
8. Confirm the state file is updated and the diagnostic becomes eligible again.
9. Open VSCodium without a workspace folder and confirm diagnostic navigation does not crash.
10. Confirm `diagnostics-latest.json` and log output still use their existing locations.

## Acceptance Criteria

The task is complete only when all of the following are true:

- Persistent diagnostic-navigation state is stored under the target project's `.vscode` folder.
- The exact runtime path is `<target-project>\.vscode\session_dismissed.json`.
- Diagnostic state survives a VSCodium reload.
- Existing diagnostic commands behave as before.
- Existing state serialization remains compatible.
- No-workspace operation remains safe.
- Diagnostic snapshots and logs remain in their prior locations.
- No target-project `.gitignore` change is required or made.
- No unrelated functionality is changed.
- The repository builds or passes its existing relevant checks.
- The final report lists every created or modified file by full repository-relative path.

## Completion Report

Provide a detailed completion report containing:

### Summary

- What changed.
- Why the change was needed.
- The resolved runtime state-file path.

### Files Changed

Use a table:

| File | Action | Purpose |
| --- | --- | --- |
| `path` | Modified/Created | Reason |

### Implementation Notes

- Workspace-folder resolution.
- No-workspace fallback.
- Legacy-state compatibility behavior.
- Multi-root behavior.
- Confirmation that diagnostics snapshots and logs were not moved.

### Validation Results

Use a table:

| Check or command | Result |
| --- | --- |
| Command | Pass/Fail and evidence |

### Design Findings

List any design flaws or risks discovered during the task, but do not fix unrelated issues. Clearly distinguish:

- Fixed within scope.
- Observed but intentionally left unchanged.

### Revision Log

List each material revision made during the task.

### Git Diff Summary

Include:

```powershell
git status --short
git diff --stat
```

Summarize the resulting changes without committing unless separately instructed.

## Queue Instruction

Save this prompt as:

```text
D:\AI\.AI\Prompts\Codex-Task-Move-Diagnostic-State-To-Workspace-Vscode.md
```

Add it to the AI queue using the standard queue entry script:

```powershell
& 'D:\AI\.AI\Scripts\Add-AiTodoPrompt.ps1' `
    -PromptPath 'D:\AI\.AI\Prompts\Codex-Task-Move-Diagnostic-State-To-Workspace-Vscode.md'
```

Use the script's established queue and duplicate-handling behavior. Do not manually duplicate the prompt content in the queue.