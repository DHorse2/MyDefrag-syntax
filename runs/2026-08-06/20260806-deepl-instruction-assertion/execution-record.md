# Execution Record: DeepL Instruction Assertion

## Identity

- Run: `20260806-deepl-instruction-assertion`
- Project: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Agent: Codex, primary agent
- Completed: 2026-08-06T19:17:33-07:00

## Scope and Authority

The user requested that the DeepL request-body regression assertion be retested
and corrected if necessary after editing the custom instruction array.

This task continued in the initialized run after the Execution Cut-Off. No live
DeepL request, application build, locale write, package, commit, or publication
was in scope.

## Evidence and Change

- The focused test initially failed one of eight cases.
- The serialized request contained both current instructions, while the test
  expected only the quotation-mark instruction.
- Updated the exact request-body assertion to require both current strings in
  order.
- Updated the matching Locale Maintenance documentation from a singular custom
  instruction to the two current instructions.
- The DeepL request implementation itself was not changed.

## Files Changed

- `build/language/locale-app/tests/deepl-translation-service.test.js`
- `docs/locale-maintenance-app.md`
- This execution record.

## Validation

- JavaScript syntax check: exit 0.
- Focused DeepL request suite: 8 passed, 0 failed.
- `npm run test:locale-app`: 35 passed, 0 failed.
- Live DeepL API calls: 0.

## Outcome

The regression assertion now matches the current two-instruction JSON contract
and will fail if either instruction is removed or changed unexpectedly.

