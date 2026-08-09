# Execution Record - Resizable Maintenance Panels

## Run

- Execution ID: `20260808-2212-codex-resizable-maintenance-panels`
- Date: `2026-08-08`
- Agent: Codex, Debugger role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Add standard renderer-side draggable splitters to Language Maintenance and
Locale Maintenance list, editor, result, and translation-comparison panes, with
minimum sizes and persistent positions.

## Startup

- Reused the startup documents already loaded once for this run, including the
  launcher policy, Debugger role, validation guidance, and execution record
  procedure.
- Used the direct implementation request as the active task after the execution
  cut-off.

## Actions and Decisions

- Added one shared HTML/CSS/JavaScript splitter implementation used by both
  Electron renderers.
- Used renderer pointer events and CSS Grid; no Electron window or main-process
  API was added.
- Added pointer capture, row and column orientations, enforced pane minimums,
  persisted fractional positions, and double-click reset.
- Made separators keyboard accessible with separator roles, orientation and
  value metadata, arrow-key resizing, Shift+arrow larger steps, Home, and End.
- Added vertical list/editor splitters to the Language Maintenance data views,
  Locales view, and All Candidates dialog.
- Docked Language Maintenance operation results below the workspace behind a
  horizontal splitter.
- Added Locale Maintenance splitters between the catalog and editor and between
  Current locale value and the latest API result.
- Preserved responsive stacked layouts by hiding column separators at the
  existing narrow-width breakpoints.
- Included the shared splitter assets in both Electron Builder packages.
- Updated the application guides and canonical app-string catalog.
- Corrected the app-catalog inventory refresh to retain permanent candidate
  statuses before running the documented canonical-only extraction command.
- Preserved unrelated dirty or untracked workspace content.

## Commands and Results

- JavaScript syntax checks: exit `0`.
- `npm run language:catalogs:apps`: exit `0`, 437 translator strings and 130
  locale strings extracted.
- Generated locale catalog preservation: pass, all 180 files retained the same
  aggregate SHA-256 hash.
- Candidate-status preservation: pass, all 21 decisions retained the same
  aggregate SHA-256 hash.
- `npm run test:language-app`: exit `0`, 64 passed and 0 failed.
- `npm run test:locale-app`: exit `0`, 35 passed and 0 failed.
- `npm run test:language-report`: exit `0`.
- `npm run language:validate`: exit `0`, 0 errors and 1 existing warning for
  metadata-only `fr-CA` fallback.
- App-catalog generator dry run: exit `0` and matched the written counts.
- Electron Builder YAML and shared-asset path checks: pass for both apps.
- Markdown lint: 0 issues in the two guides and this execution record.
- Task-scoped trailing-whitespace check: pass.
- Windows app discovery succeeded, but neither maintenance app was running.
  The app-control path could not supply the development launch arguments, so no
  unsupported launcher fallback was used and live interaction remains
  unverified.

## Files Changed

- `build/shared/renderer-splitter.js`
- `build/shared/renderer-splitter.css`
- `build/mdl-language-app/renderer/index.html`
- `build/mdl-language-app/renderer/app.js`
- `build/mdl-language-app/renderer/styles.css`
- `build/mdl-language-app/electron-builder.yml`
- `build/mdl-language-app/tests/splitter.test.js`
- `build/mdl-language-app/tests/app-catalog-generator.test.js`
- `build/mdl-language-app/tests/ui-security.test.js`
- `build/mdl-locale-app/renderer/index.html`
- `build/mdl-locale-app/renderer/app.js`
- `build/mdl-locale-app/renderer/styles.css`
- `build/mdl-locale-app/electron-builder.yml`
- `build/mdl-locale-app/tests/ui-security.test.js`
- `build/scripts/generate-electron-component-catalogs.js`
- `language/canonical/component-catalog.json`
- `language/canonical/components.json`
- `docs/language-maintenance-app.md`
- `docs/locale-maintenance-app.md`
- This execution record.

## Validation

- Shared code supports both horizontal and vertical splitters: pass.
- Pointer and keyboard resizing contracts are covered: pass.
- Minimum-size clamping and persistent-position code are covered: pass.
- Component Catalog, Diagnostic Messages, Semantic Keywords, Categories, Roles,
  Preview Modes, Locales, and All Candidates use list/editor splitters: pass.
- Language operation results use a workspace/result splitter: pass.
- Locale catalog/editor and current/API comparison splitters are present: pass.
- Both package configurations contain the shared assets: pass.
- Permanent candidate decisions and generated locale data were preserved: pass.
- Live visual interaction: not verified because no targetable app window was
  running and the safe app-control launcher cannot pass the required arguments.

## Outcome and Metrics

- Outcome: requested persistent, bounded renderer splitters implemented.
- Automated application tests: 99 passed, 0 failed.
