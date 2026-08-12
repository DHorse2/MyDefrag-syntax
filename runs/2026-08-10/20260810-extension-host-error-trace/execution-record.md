# Execution Record - Extension Host Error Trace

## Table of Contents

- [Run](#run)
- [Task](#task)
- [Inputs and Scope](#inputs-and-scope)
- [Actions](#actions)
- [Commands and Results](#commands-and-results)
- [Files Read](#files-read)
- [Files Changed](#files-changed)
- [Decisions](#decisions)
- [Diagnostics and Fallbacks](#diagnostics-and-fallbacks)
- [Validation](#validation)
- [Artifacts and Outcome](#artifacts-and-outcome)
- [Metrics](#metrics)

## Run

- Execution ID: `20260810-extension-host-error-trace`
- Date: `2026-08-10`
- Agent: Codex, Debugger role
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root used for startup: `D:\AI\.AI`

## Task

Trace newly reported VSCodium Extension Host and renderer errors without
changing extension source.

## Inputs and Scope

- User-provided Extension Host, grammar, and snippet log excerpts.
- Live VSCodium logs under the user's roaming profile.
- Current diagnostics source, manifest, focused tests, Git history, and the
  installed 0.4.0 extension.
- Scope was diagnosis and validation only; no repair, deployment, or GUI action.

## Actions

- Applied the machine launcher policy and completed the required startup chain.
- Traced the TreeView error through the provider, registration code, and the
  installed VSCodium extension-host implementation.
- Reproduced stale tree-element identity after a provider rebuild with an
  in-memory Node harness.
- Traced grammar and snippet manifest paths through the working tree, Git
  history, and installed extension.
- Located the implementation that reads `files.watcherExclude` without a
  resource and separated third-party warnings from this extension.

## Commands and Results

- Startup reads through `cmd.exe /d /s /c`: passed.
- Project task resolver: reached Idle and wrote the normal project-scoped Idle
  artifact and backup.
- `git status --short`: confirmed a substantially dirty pre-existing worktree.
- Focused source and log searches: found six identical TreeView failures at
  `2026-08-09 21:18:07.614`.
- Tree identity harness: an item retained from before `refresh()` was absent
  from the new roots and its child no longer had a parent mapping.
- Manifest relative-path validator: two failures, the grammar and snippet.
- `node --test src/diagnostics/*.test.js`: passed, 6 of 6 tests.
- Git history: commit `2df08808fac9a416439d67e2eac91cfec813f930`
  deleted both missing assets.
- Installed-extension comparison: both installed 0.4.0 assets exactly matched
  the pre-deletion Git blobs.

## Files Read

- `package.json`
- `src\extension.js`
- `src\diagnostics\diagnosticNavigator.js`
- `src\diagnostics\diagnosticTreeProvider.js`
- `src\diagnostics\registerDiagnosticNavigation.js`
- Focused diagnostics tests and the prior diagnostic-explorer execution record.
- VSCodium Extension Host and renderer logs for the reported session.
- Installed VSCodium TypeScript-language-feature and tree-host code.

## Files Changed

- Added only this execution record.
- The startup resolver independently wrote its normal Idle current-task state
  and backup; no extension source or manifest asset was changed.

## Decisions

- Preserved all existing user changes and diagnosed before proposing repair.
- Classified the TreeView cause as an asynchronous model-generation race:
  full rebuilds invalidate item identity while concurrent reveals resolve it.
- Classified the missing grammar and snippet as deleted tracked assets with
  stale manifest references, not a path encoding problem.
- Classified `files.watcherExclude` as bundled VSCodium TypeScript extension
  behavior, not the adjacent OpenAPI activation or this extension.

## Diagnostics and Fallbacks

- One combined startup document read mishandled a path containing spaces; the
  exact short path was read successfully with no file effect.
- Several broad read-only searches exited nonzero for absent optional paths or
  timed out on minified bundles; narrower searches supplied the evidence.
- Current TreeView tests stub `reveal()` and do not exercise concurrent refresh
  or extension-host node resolution.

## Validation

- Tree race: supported by source order, VSCodium failure semantics, identical
  same-millisecond errors, and the stale-element harness.
- Missing assets: confirmed absent, referenced by the manifest, deleted in one
  named commit, and recoverable byte-for-byte from Git or installed 0.4.0.
- Manifest scan found no other missing `./` relative path.
- Focused tests pass but do not invalidate the uncovered race.

## Artifacts and Outcome

- Artifact: this execution record.
- Outcome: root causes identified; no repair applied.
- Follow-up: restore the two deleted assets and serialize or coalesce diagnostic
  refreshes, reserving reveal for explicit navigation or guarded stable state.

## Metrics

- Reported TreeView failures traced: 6.
- Missing manifest assets: 2.
- Focused tests: 6 passed, 0 failed.
- Source repairs: 0.
- Elapsed time: Unavailable.
