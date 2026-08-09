# Execution Record - Require Candidate Context

## Run

- Execution ID: `20260808-1717-codex-require-candidate-context`
- Date: `2026-08-08`
- Agent: Codex, Debugger role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Repair string-candidate extraction so module strings passed directly to
`require(...)` are excluded based on source context rather than string contents.

## Startup

- Reused the startup documents already loaded once for this run, including the
  launcher policy, Debugger role, validation guidance, and execution record
  procedure.
- Used the direct implementation request as the active task after the execution
  cut-off.

## Root Cause

The previous check used `value.startsWith('require(')`, but `value` is
`match[2]`: only the text inside the quotes. For `require('fs')`, the value is
`fs`, while `require(` occurs immediately before `match.index`, the opening
quote. The check therefore retained module identifiers and could reject a real
user-facing value that happened to begin with `require(`.

## Actions and Decisions

- Added a bounded backward lexical check from the opening quote offset.
- Skipped whitespace, required an opening parenthesis, and read only the
  preceding JavaScript identifier token.
- Excluded the literal only when that token is exactly `require`.
- Did not inspect or special-case the captured module-name value.
- Covered normal, spaced, multiline, and member `require` calls.
- Added negative coverage proving `prerequire(...)` is not mistaken for
  `require(...)` and user-facing text beginning with `require(` remains eligible.
- Updated the Language Maintenance guide.
- Preserved unrelated working-tree changes and generated catalog data.

## Commands and Results

- Builder JavaScript syntax check: exit `0`.
- Focused Language Maintenance service tests: exit `0`, 30 passed and 0 failed.
- Initial ad-hoc Node probe: shell quoting failure before execution; no files or
  application state changed.
- Corrected ad-hoc Node probe: exit `0`; returned only the user-facing
  `require(module) now` value and excluded `require("fs")`.
- `npm run test:language-app`: exit `0`, 60 passed and 0 failed.
- `npm run test:language-report`: exit `0`.
- `npm run language:validate`: exit `0`, 0 errors and 1 existing warning for
  metadata-only `fr-CA` fallback.
- Markdown lint for the updated guide and this record: exit `0`, 0 issues.
- A redundant repeat lint stalled in `npx` and was terminated; direct-local and
  offline fallbacks were unavailable. The prior successful lint result stands.

## Files Changed

- `build/scripts/build-language.js`
- `build/app/tests/language-maintenance-service.test.js`
- `docs/language-maintenance-app.md`
- This execution record.

## Validation

- `require('fs')` module identifier excluded: pass.
- Spaced and multiline direct require arguments excluded: pass.
- Member `.require('module')` argument excluded: pass.
- Similar identifier `prerequire('text')` remains eligible: pass.
- User-facing value beginning with `require(` remains eligible: pass.
- Full Language Maintenance regression suite: pass.

## Outcome and Metrics

- Outcome: require-call candidate classification repaired.
- Automated application tests: 60 passed, 0 failed.
