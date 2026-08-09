# Move Language Tooling Directories

## Identity

- Run: `20260807-025234-move-language-tools`
- Date: 2026-08-07
- Project: `D:\Script\MyDefrag-syntax`
- Agent: Codex
- Request: Move the language scripts, language maintenance app, and locale
  maintenance app directly under `build`, then correct their references.
- Authorization: User supplied `Do now` with the request.

## Inputs and Scope

- Source directories:
  - `build\language\scripts`
  - `build\language\app`
  - `build\language\locale-app`
- Destination directories:
  - `build\scripts`
  - `build\app`
  - `build\locale-app`
- Generated catalogs, translations, and reports remained under
  `build\language`.
- The existing dirty worktree was preserved; unrelated changes were not
  modified or reverted.

## Startup and Planning

- Loaded the machine process-launcher policy before shell discovery.
- Loaded the shared AI startup chain, role, procedures, and standards once.
- Reached the execution cut-off before beginning this task.
- Began execution-record tracking before task execution.

## Actions

1. Verified all three source directories existed and all three destination
   directories were absent.
2. Resolved each path inside the project workspace before moving it.
3. Counted 48 source files totaling 431,479 bytes.
4. Moved the directories with native PowerShell `Move-Item`, using explicit
   literal paths and no overwrite option.
5. Updated path-depth and module references inside the moved JavaScript,
   test, HTML, and Electron Builder files.
6. Updated package scripts, VS Code task text, canonical metadata, project
   roadmap, and language-tooling documentation.
7. Regenerated the language reports through the relocated build script.
8. Audited the repository for slash and backslash forms of every old path.

## Changed Artifacts

- `build\scripts` contains 3 files.
- `build\app` contains 26 files.
- `build\locale-app` contains 19 files.
- `package.json` and `.vscode\tasks.json` reference the new locations.
- `language\canonical\component-catalog.json` references `build\scripts`.
- Language app and locale app code, tests, and packaging configurations use
  their new root depths and sibling paths.
- Language documentation and the multilingual project roadmap use the new
  paths.
- `build\language\reports` was regenerated from current project state.

## Commands and Results

- Initial parallel preflight formatting command: failed with a PowerShell
  parser error caused by an empty pipe element; no mutation occurred.
- Corrected preflight and path resolution: passed.
- Directory move: passed; 3 directories and 48 files moved.
- JavaScript `node --check` sweep across all moved files: passed.
- JSON parsing for package, task, and canonical catalog files: passed.
- Project-root and fixture-path assertions: passed.
- `npm run test:language-app`: passed, 45 tests and 0 failures.
- `npm run test:locale-app`: passed, 35 tests and 0 failures.
- `npm run test:language-report`: passed.
- `npm run test:language`: reached the relocated script, then failed an
  unrelated existing string assertion: actual `[depth 2]`, expected
  `[depth:2]`.
- `npm run language:report`: passed and regenerated reports.
- `npm run language:validate`: passed with 0 errors and 1 existing warning
  that `fr-CA` is metadata-only and uses English fallback output.
- `markdownlint-cli2` on four changed Markdown documents: passed with
  0 issues.
- A later `npx` lint invocation for this record could not access the npm
  registry or cache (`EACCES`); the stalled process was stopped.
- Record fallback checks found one H1, no lines over 80 characters, and no
  trailing whitespace.
- Scoped `git diff --check`: passed.

## Final Validation

- Old source directories: absent.
- New destination file counts: 3 + 26 + 19 = 48.
- Repository-wide old-path audit, excluding `.git`, dependencies, artifacts,
  and historical run records: no references found.
- Language report output shows commands under `build\scripts`, app commands
  under `build\app`, and locale app commands under `build\locale-app`.
- No destination collision or overwrite occurred.

## Outcome

Completed. The three tool directories now live directly under `build`, active
references have been corrected, generated reports have been refreshed, and
all path-sensitive validation passed. The separate runtime translation-string
assertion remains outside the directory-move scope.
