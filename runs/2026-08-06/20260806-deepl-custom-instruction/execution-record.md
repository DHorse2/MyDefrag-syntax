# Execution Record: DeepL Custom Translation Instruction

## Identity

- Run: `20260806-deepl-custom-instruction`
- Project: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Agent: Codex, primary agent
- Completed: 2026-08-06T18:29:26-07:00

## Input and Scope

The user requested that every constructed DeepL `/v2/translate` JSON request
include this per-request instruction:

```json
"custom_instructions": [
  "Translate every word, including words enclosed in quotation marks."
]
```

The purpose is to make normalized English product wording, including
`My Defragmenter`, translation input rather than an assumed product name.

No live API call, locale-source edit, generated-catalog write, packaging,
commit, or publication was authorized.

## Startup and Authority

- This task continued in the same initialized run, so startup documents were
  not loaded a second time.
- The prior startup reached the Execution Cut-Off, and the user's explicit
  **DO NOW** authorized this task.
- The current official DeepL translation request reference was checked. It
  defines `custom_instructions` as a string array with up to 10 instructions
  and 300 characters per instruction. DeepL limits the currently supported
  target-language families for this parameter.

## Diagnosis and Decision

- The sole request-construction point is
  `build/language/translation/deepl-translation-service.js`.
- The service is shared by Locale Maintenance and batch language generation,
  so one request-body change covers both callers.
- The requested instruction is serialized alongside `text`, `source_lang`,
  `target_lang`, and the existing XML placeholder controls.

## Changes

- Added the exact requested `custom_instructions` array to the shared DeepL
  request JSON.
- Added a parsed-request-body assertion for the exact array and sentence.
- Documented how the instruction relates to normalized product-name wording.

## Files Changed

- `build/language/translation/deepl-translation-service.js`
- `build/language/locale-app/tests/deepl-translation-service.test.js`
- `docs/locale-maintenance-app.md`
- This execution record.

## Commands and Validation

- JavaScript syntax check for the shared service: exit 0.
- `npm run test:locale-app`: exit 0, 35 passed and 0 failed. The request-body
  test parsed the serialized JSON and matched the exact custom instruction.
- `npm run test:language-app`: exit 0, 43 passed and 0 failed.
- `npm run language:validate`: exit 0, 0 errors and the established
  metadata-only `fr-CA` warning.
- `npm run test:language-report`: exit 0.
- `npm run test:language`: exit 1 on a pre-existing runtime assertion expecting
  `BEGIN [depth:2]` while the current catalog returns `BEGIN [depth 2]`. This
  path does not construct or inspect DeepL requests and was not changed.
- Live DeepL calls and source/catalog writes: 0.

## Outcome and Boundaries

The shared JSON request now carries the exact instruction requested by the
user. The source change requires a full Locale Maintenance process restart; a
packaged application requires rebuilding. DeepL itself determines whether a
specific target language supports custom instructions.

