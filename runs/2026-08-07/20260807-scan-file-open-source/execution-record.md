# Execution Record: Scan File Open Source

## Summary

Added the existing **Open source** workflow to every result in the Migration
Inventory Scan source file window.

## Startup continuity

- Continued the initialized ad hoc Language Maintenance run after its recorded
  Execution Cut-Off.
- Preserved the existing dirty and untracked workspace state.

## Observable actions

1. Traced the scan-result renderer and existing inventoried-candidate source
   opening path.
2. Factored the Open source button into one shared renderer helper used by both
   candidate windows.
3. Added a narrow scanned-source IPC operation across shared contracts,
   sandboxed preload, main handlers, and the maintenance service.
4. Revalidated the selected line and text with the builder's exported
   `extractStringCandidates` before resolving the file and opening it.
5. Added service, IPC, preload-contract, and renderer-structure regression
   assertions and updated the application documentation.

## Files changed

- `build/language/app/shared/contracts.js`
- `build/language/app/preload/preload.js`
- `build/language/app/main/ipc-handlers.js`
- `build/language/app/services/language-maintenance-service.js`
- `build/language/app/renderer/app.js`
- `build/language/app/tests/language-maintenance-service.test.js`
- `build/language/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`

## Validation

- JavaScript syntax checks passed for the renderer and maintenance service.
- `npm run test:language-app`: passed, 45 tests, 0 failures.

## Write boundaries

- Opening a scanned source file does not add it to the migration inventory or
  modify draft, authoritative, generated, or catalog data.
- No language build, report regeneration, package build, install, or live GUI
  launch was performed.
