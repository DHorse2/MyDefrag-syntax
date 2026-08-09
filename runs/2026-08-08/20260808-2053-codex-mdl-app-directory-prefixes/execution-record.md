# Execution Record - MDL App Directory Prefixes

## Run

- Execution ID: `20260808-2053-codex-mdl-app-directory-prefixes`
- Date: `2026-08-08`
- Agent: Codex, Debugger role
- Computer: `MDM-TJ9DTHV`
- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- AI root: `D:\AI\.AI`

## Task

Rename the Language Maintenance and Locale Maintenance Electron application
directories to `build/mdl-language-app` and `build/mdl-locale-app`, then migrate
all relevant active references.

## Startup

- Reused the startup documents already loaded once for this run, including the
  launcher policy, Debugger role, validation guidance, and execution record
  procedure.
- Used the direct implementation request as the active task after the execution
  cut-off.

## Actions and Decisions

- Verified both source directories existed and both destination directories
  were absent before moving them.
- Renamed `build/app` to `build/mdl-language-app` and `build/locale-app` to
  `build/mdl-locale-app`.
- Updated package launch, test, unpacked-build, and installer-build commands.
- Updated Electron Builder file inventories, entry points, and the locale app's
  packaged dependency on the language app build integration service.
- Updated the locale service and its test to import the renamed sibling app.
- Updated the app-catalog generator, canonical migration inventory, canonical
  component source paths, generated reports, and active documentation.
- Preserved historical execution-record references and unrelated dirty or
  untracked workspace content.
- Did not rebuild or delete generated locale catalog data.

## Commands and Results

- JavaScript syntax checks: exit `0`, 37 files checked.
- App-catalog generator dry run: exit `0`, both renamed source roots scanned.
- `npm run test:language-app`: exit `0`, 60 passed and 0 failed.
- `npm run test:locale-app`: exit `0`, 35 passed and 0 failed.
- `npm run test:language-report`: exit `0`.
- `npm run language:validate`: exit `0`, 0 errors and 1 existing warning for
  metadata-only `fr-CA` fallback.
- JSON parsing: package, canonical component documents, and migration report
  passed.
- Active old-path search: no references found outside excluded historical and
  generated locale-output areas.
- Initial Markdown lint launch inside the sandbox could not access the npm
  registry/cache (`EACCES`); the approved out-of-sandbox retry completed with
  0 issues in 2 files.
- `git diff --check`: reported only pre-existing trailing whitespace in files
  outside this task's change set.

## Files Changed

- `build/mdl-language-app/` (renamed from `build/app/`)
- `build/mdl-locale-app/` (renamed from `build/locale-app/`)
- `build/scripts/generate-electron-component-catalogs.js`
- `language/canonical/components.json`
- `language/canonical/component-catalog.json`
- `build/language/reports/migration-report.json`
- `build/language/reports/language-report.txt`
- `docs/build-language.md`
- `package.json`
- This execution record.

## Validation

- Both new application directories exist: pass.
- Both old application directories are absent: pass.
- Package commands resolve to the renamed entry points and test suites: pass.
- Locale-to-language app dependency resolves after the sibling rename: pass.
- Canonical metadata and reports use the renamed source paths: pass.
- Active project references contain no old directory names: pass.
- Language and locale application regression suites: pass.

## Outcome and Metrics

- Outcome: requested app directory prefix migration completed.
- Automated application tests: 95 passed, 0 failed.
