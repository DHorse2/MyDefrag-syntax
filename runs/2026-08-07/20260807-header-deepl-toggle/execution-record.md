# Execution Record: Header DeepL Toggle

## Summary

Moved the Language Maintenance DeepL permission checkbox from the Components
view into the persistent application header and shortened its visible label to
**Allow DeepL calls**.

## Startup continuity

- Continued the initialized ad hoc Language Maintenance run after its recorded
  Execution Cut-Off.
- The user explicitly authorized immediate execution with **Do now**.
- Preserved the existing dirty and untracked workspace state.

## Observable actions

1. Traced the existing view-local checkbox and the shared Save and Rebuild
   request state.
2. Added one static header checkbox beside the dirty and validation badges.
3. Removed the dynamically recreated Components-view checkbox.
4. Bound the header checkbox to the existing shared in-memory permission used
   when Save or Rebuild starts.
5. Added structure and regression assertions and documented the global toggle
   behavior.

## Files changed

- `build/language/app/renderer/index.html`
- `build/language/app/renderer/app.js`
- `build/language/app/renderer/styles.css`
- `build/language/app/tests/ui-security.test.js`
- `docs/language-maintenance-app.md`

## Validation

- `node --check build/language/app/renderer/app.js`: passed.
- `npm run test:language-app`: passed, 45 tests, 0 failures.

## Behavior and write boundaries

- The toggle defaults to off and is not persisted to project files.
- Navigation, Revert, Reload, and renderer view changes do not reset it.
- Save and Rebuild snapshot its current value when the operation starts.
- No API call, language build, report regeneration, catalog write, package
  build, install, or live GUI launch was performed.
