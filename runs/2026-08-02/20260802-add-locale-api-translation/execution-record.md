# Execution Record: Add Locale API Translation

## Run Identity

- Execution ID: `20260802-add-locale-api-translation`
- Project ID: `mdm-mydefrag-syntax`
- Task ID: `mdm-mydefrag-syntax-add-locale-api-translation`
- Project root: `D:\Script\MyDefrag-syntax`
- Started: 2026-08-02
- Completed: 2026-08-02
- Outcome: Completed with noted external-validation and cleanup limitations

## Objective

Extend the MyDefrag Locale Maintenance Electron application with DeepL-backed,
per-field translation suggestions and an explicit replacement action. Reuse the
same translation boundary to fill only missing generated locale values while
preserving authored values. API, configuration, and placeholder failures must
warn and fall back to canonical English without failing the build or exposing
credentials.

## Loaded Instructions and Inputs

- Machine launcher policy:
  `D:\AI\.AI\Computers\MDM-TJ9DTHV\Configuration\Process-Launcher.md`
- Startup authority: `D:\AI\.AI\Start_Here.md`
- Project identity: `.codex\ai-project.json`
- Current task: `D:\AI\.AI\Prompts\currentTask.md`
- Project instructions: `.AI\Instructions.md`
- Role: shared Software Engineer role
- Skill: shared Software Implementation skill
- Procedures: Validation and Execution Record
- Standards: Execution Record standard
- User supplied configuration fact: `DeeplApi` now contains the API key
- Prior locale-app implementation and generated-catalog preservation evidence
  were consulted from the configured memory store.

No API key value was read into command output, source code, tests, artifacts, or
this record.

## Architecture and Decisions

- Added a provider boundary at
  `build/language/translation/deepl-translation-service.js`.
- Load `DeeplApi`, with `DEEPL_API_KEY` compatibility, only in the trusted main
  or build process. The renderer receives only whether translation is
  configured.
- Protect `{placeholder}` tokens with ignored XML tags before submission and
  require the translated result to restore the exact placeholder inventory.
- Keep generated suggestions separate from the editable draft. Requesting a
  suggestion does not make the draft dirty; only **Replace current value**
  changes the field.
- Preserve entry metadata when replacing existing text. New translated entries
  receive `machine-generated` status.
- During generation, request translations only for missing values. Existing
  authored locale values remain authoritative.
- Convert missing configuration, request failures, malformed responses, empty
  results, and placeholder mismatches into warnings plus canonical-English
  fallback. Validation and write failures remain fatal.
- Preserve the existing per-locale create-only output policy. No generated
  translation tree was deleted or overwritten.

## Implementation

### Translation service

- Added JSON `POST /v2/translate` integration with header authentication,
  source language `EN`, mapped target locales, request timeout handling, and
  placeholder shielding/restoration.
- Selects the DeepL Free endpoint for free-key suffixes and the Pro endpoint
  otherwise; an explicit `DEEPL_API_URL` override remains available.
- Returns structured, non-secret failure information for safe warnings.

### Locale Maintenance application

- Added secure IPC contracts for translation configuration, suggestion
  generation, and explicit replacement.
- Added a side-by-side editor showing the current locale value and the DeepL
  suggestion.
- Added **Generate API translation** and **Replace current value** controls.
- Kept Electron renderer isolation, sandboxing, CSP, and the narrow preload
  bridge intact.
- Included the shared translation module in application packaging.

### Language builder

- Made build and report command handling asynchronous where translation calls
  are required.
- Uses the shared provider only for missing generated values.
- Reports translation warnings and machine-generated counts.
- Retains canonical fallback and successful build completion on provider
  failures or unusable translations.

### Tests and documentation

- Added provider tests for environment loading, target mapping, authentication,
  placeholder preservation, corruption rejection, and missing configuration.
- Added locale-service tests proving suggestion-only behavior, explicit
  replacement, failure isolation, and placeholder revalidation.
- Added builder tests proving existing-value preservation, missing-value
  translation, warning/fallback behavior, and unusable-result exclusion.
- Updated UI security and fixture coverage.
- Updated `docs/locale-maintenance-app.md` and `docs/build-language.md` with
  configuration, safety, behavior, development, test, and packaging guidance.

## Files Added or Updated

- `build/language/translation/deepl-translation-service.js`
- `build/language/scripts/build-language.js`
- `build/language/scripts/test-language-report.js`
- `build/language/locale-app/shared/contracts.js`
- `build/language/locale-app/services/locale-maintenance-service.js`
- `build/language/locale-app/main/ipc-handlers.js`
- `build/language/locale-app/preload/preload.js`
- `build/language/locale-app/renderer/index.html`
- `build/language/locale-app/renderer/styles.css`
- `build/language/locale-app/renderer/app.js`
- `build/language/locale-app/electron-builder.yml`
- `build/language/locale-app/tests/helpers.js`
- `build/language/locale-app/tests/deepl-translation-service.test.js`
- `build/language/locale-app/tests/locale-maintenance-service.test.js`
- `build/language/locale-app/tests/repository-builder.test.js`
- `build/language/locale-app/tests/ui-security.test.js`
- `build/language/app/tests/helpers.js`
- `docs/locale-maintenance-app.md`
- `docs/build-language.md`

## Validation Evidence

| Check | Result |
| --- | --- |
| Modified JavaScript syntax checks | Passed |
| `npm run test:language-app` | 22 passed, 0 failed |
| `npm run test:language` | Passed |
| `npm run test:language-report` | Passed |
| `npm run test:locale-app` | 26 passed, 0 failed |
| `npm run language:validate` | Passed, 0 errors, 0 warnings |
| Focused documentation Markdown lint | Passed, 0 issues |
| Electron directory packaging | Passed |
| Packaged `app.asar` inspection | Required implementation files present |
| Packaged Windows graphical launch | Passed |
| Side-by-side translation UI inspection | Passed |
| Real outbound DeepL translation | Not performed; see limitations |

The packaged application was launched against the repository. It loaded a real
locale component, displayed a valid unchanged draft, and exposed the expected
current-value, suggestion, generate, and replace controls. The application was
then closed without saving.

## Artifact

- Executable: `artifacts\locale-maintenance-api-translation-packaged\`
  `win-unpacked\MyDefrag Locale Maintenance.exe`
- Size: 225,614,336 bytes
- Packaging method: Electron Builder Windows directory target, using a verified
  local Electron distribution after staged directories became locked.

## Diagnostics, Fallbacks, and Limitations

- The report fixture initially omitted the new shared translation module. The
  fixture helper was corrected and the report suite then passed.
- Initial Electron packaging encountered sandbox network denial. Later staged
  rebuilds encountered Windows `EPERM` or `EBUSY` locks. Packaging completed in
  a fresh output using a verified local Electron distribution.
- Cleanup of three failed packaging staging roots was only partial because
  Windows retained locks on `app.asar` or `default_app.asar`:
  `locale-maintenance-api-translation-verify`,
  `locale-maintenance-api-translation-final`, and
  `locale-maintenance-api-translation-release`. The successful packaged artifact
  is separate and intact.
- `DeeplApi` was detected at machine scope without reading or logging its value.
  The already-running graphical-control helper had not inherited that new
  environment value, so the launched application correctly displayed its
  not-configured warning.
- A live DeepL request was not completed. The sandbox blocked the request, and
  escalation was not authorized because it would transmit an exact
  repository-derived test string to an external service. Mocked provider tests,
  placeholder-integrity tests, failure/fallback tests, packaged UI validation,
  and configuration detection all passed.

## Queue Completion

The shared task resolver completed the task at
`2026-08-02 19:34:16 -07:00`. It finalized the prompt and queue entry as
Completed, wrote the project current-task state to Idle, and reported zero
remaining queue items. A read-only resolution check returned Idle with no
blocking defect, and `Todo.md` contains the checked task entry.

## Final Assessment

The requested implementation is complete. The UI changes a locale value only
through the explicit replacement action, the builder preserves existing values
and translates only missing ones, all provider failures degrade to warnings and
canonical fallback, credentials remain outside renderer and artifacts, focused
and regression tests pass, documentation is updated, and a verified packaged
Windows application is available.

The lack of one live outbound translation is an external-validation limitation,
not an implementation or test failure. The locked failed staging remnants are
non-authoritative artifacts and do not affect the verified package.

## Follow-up: Compact Editor Layout

The user reported that the translation editor required vertical scrolling and
requested the actions and review fields to the right of the record fields. The
follow-up changed only renderer structure and styling:

- Moved API generation, replacement, review status, translator notes, apply,
  and fallback controls into a right-hand control column.
- Kept catalog key, canonical English, placeholders, current locale value,
  DeepL suggestion, and suggestion status in the left-hand detail column.
- Reduced textarea row counts, panel gaps, padding, and action-bar spacing.
- Reworked the application header into one compact line containing the tool
  label, title, project path, and status badges.
- Widened the editor relative to the catalog while retaining a responsive
  two-column editor structure.
- Added renderer structure assertions for the compact header and editor columns.

Validation evidence:

- `npm run test:locale-app`: 26 passed, 0 failed.
- Renderer JavaScript syntax check: passed.
- HTML control uniqueness inventory: passed.
- Scoped Git whitespace check: passed.
- Fresh Electron directory packaging: passed.
- Live Windows launch and screenshot inspection: passed at 1466 by 913 pixels.
- Populated editor inspection confirmed all requested controls were visible
  without scrolling and the application remained in `No unsaved changes` state.

The verified follow-up artifact is
`artifacts\locale-maintenance-layout-verify\win-unpacked\`
`MyDefrag Locale Maintenance.exe` (225,614,336 bytes). Refreshing the earlier
primary package was attempted, but Windows retained a lock on its
`resources\app.asar`; the fresh follow-up artifact is complete and unaffected.

## Follow-up: Compact Language Maintenance Layout

The user requested the same compact treatment for MyDefrag Language
Maintenance, with both the application header and Component Catalog controls on
single lines. The follow-up changed the canonical-maintenance renderer:

- Consolidated the tool label, application title, project path, and validation
  badges into one compact header line.
- Consolidated the data-view title, component filter description, search label,
  search field, and Add record button into one toolbar line.
- Positioned the Add record editor immediately below that toolbar and aligned it
  with the top of the catalog table.
- Reduced workspace top padding and updated the shell height for the smaller
  header.
- Retained responsive wrapping below the existing narrow-window breakpoint.
- Added structural tests for the compact header and toolbar.

Packaged launch validation initially exposed an existing packaging omission:
`build-language.js` now imports the shared translation service, but the Language
Maintenance package did not include `build/language/translation`. The packaging
manifest and focused test were updated to include and require that dependency.

Validation evidence:

- `npm run test:language-app`: 22 passed, 0 failed after all changes.
- Renderer JavaScript syntax check: passed.
- Layout structure inventory: passed.
- Scoped Git whitespace check: passed.
- Corrected fresh Electron directory packaging: passed.
- Live Windows launch and screenshot inspection: passed at 1426 by 893 pixels.
- The extension Component Catalog showed the complete compact toolbar on one
  line and the Add record editor directly beneath it without an initial scroll.
- The verification window remained unchanged and was closed after inspection.

The corrected follow-up artifact is
`artifacts\language-maintenance-layout-verify-2\win-unpacked\`
`MyDefrag Language Maintenance.exe`. The first verification directory remains
locked by Windows and contains the package that exposed the missing dependency;
it is not the corrected artifact.

## Follow-up: Builder Translation Visibility

The user reported that `build-language.js` did not appear to use DeepL while
recreating `fr-CA`, and that the terminal did not show a warning or error. The
trace found two relevant conditions:

- Full builds intentionally request translations only for missing generated
  locale directories. Existing locale directories remain create-only and are
  skipped before any API request.
- `DeeplApi` was available at machine scope but was not inherited by the current
  long-running terminal process.
- The prior build summary did not state whether the API was configured, which
  locales were eligible, or whether no API request was needed.
- Ordinary validation warnings were printed by `validate` but were omitted from
  successful `build`, `report`, and `build-component` terminal output.

The builder now prints:

- Whether DeepL is configured in the current process.
- The credential variable name without printing its value.
- The eligible missing locales or targeted locale/component.
- An explicit no-request message when all locale directories already exist.
- Accepted suggestion and warning counts after translation.
- Validation warnings for every successful writing/reporting action.
- Existing per-locale and per-key API failures through the established warning
  output.

The report test now removes API credentials from its disposable child process
and verifies both the not-configured warning for missing `fr-CA` and the
no-request message after all generated locale directories exist. Documentation
now explains terminal inheritance and the safe PowerShell import command.

Validation evidence:

- Builder JavaScript syntax check: passed.
- `npm run test:language-report`: passed in a disposable fixture.
- `npm run test:locale-app`: 26 passed, 0 failed.
- `npm run language:validate`: passed with 0 errors and 0 warnings; `fr-CA` was
  reported as missing.
- Documentation Markdown lint: 0 issues.
- Scoped Git whitespace check: passed.
- `npm run test:language` was not expected to pass while the user intentionally
  kept the live generated `fr-CA` directory absent; it resolved `en` instead of
  the runtime test's expected `fr-CA` catalog.

No live build or API request was run after the user clarified that `fr-CA` had
been deleted again for the next test. The requested missing state was preserved.

## Follow-up: Expose Generated Translations in Locale Maintenance

After the user's live build accepted 22 DeepL suggestions, the generated
`fr-CA` catalogs contained valid text with `status: "machine-generated"` and
`fallbackLocale: null`, but Locale Maintenance displayed English fallback. The
trace found the hidden-data boundary:

- The repository loaded only authored files under `language/locales`.
- Generated runtime catalogs under `build/language/catalogs` were never read by
  the application.
- The service treated every key absent from authored data as English fallback,
  even when the generated runtime catalog contained a usable translation.
- Completeness and table status were calculated from the authored draft alone.
- The runtime test still required the former English-fallback `fr-CA` behavior.

The correction adds a generated translation layer beneath authored data:

1. Authored component or aggregate entries remain authoritative.
2. Generated entries with `fallbackLocale: null` supply visible translated text
   and status when no authored entry exists.
3. Generated entries with `fallbackLocale: "en"` remain English fallback.

Generated values do not dirty the authored draft merely by being displayed.
Applying an edit promotes that key into the authoritative locale component file.
Generated-only entries cannot be removed as though they were authored, and the
fallback button is disabled until an authored value exists. The service also
validates the normalized generated overlay before exposing it.

Validation evidence:

- `npm run test:locale-app`: 28 passed, 0 failed, including generated hydration,
  fallback exclusion, clean draft state, promotion, and authored precedence.
- `npm run test:language-app`: 22 passed, 0 failed.
- `npm run test:language-report`: passed.
- `npm run test:language`: passed after replacing its stale `fr-CA` fallback
  assertion with generated-catalog consistency checks.
- `npm run language:validate`: passed with 0 errors and 0 warnings.
- Modified JavaScript syntax checks, documentation lint, and scoped whitespace
  checks passed.
- Fresh Electron directory packaging passed.
- Live Windows inspection of `fr-CA/extension` showed 8 translated, 0 English
  fallback, and 8 total entries while the draft remained unchanged.
- `extension.command.openSettings.title` displayed
  `MyDefrag : Ouvrir les paramètres` with `machine-generated` review status.

The verified artifact is
`artifacts\locale-maintenance-generated-overlay-verify\win-unpacked\`
`MyDefrag Locale Maintenance.exe` (225,614,336 bytes). The verification window
was closed without saving or changing locale source data.

## Follow-up: Component Definitions and Migration Assignments

The Language Maintenance component inventory previously exposed component
definitions as read-only metadata and stored migration sources as bare path
strings. Consequently, a source file could not have a component assignment and
neither the service nor the builder could validate or report one.

The authoritative `components.json` contract now stores every migration source
as an object with `path` and `component`. The existing sources were assigned to
`extension`, `server`, `parser`, `preview`, or `diagnosticExplorer` according to
their owning subsystem. Builder validation now rejects malformed entries,
duplicate or escaping paths, unknown component references, malformed component
identifiers, and invalid component field types. Migration JSON and text reports
carry the assigned component.

The Migration Inventory page now owns source assignment maintenance:

- New file selection requires a real component assignment.
- Every existing source row has a component selector for reassignment.
- Search matches both paths and component IDs.
- Add, reassign, and remove remain in memory until the established Save flow.

The Components page now provides Add component and Edit component forms.
Description and runtime state are editable. Existing identifiers remain
read-only and are rejected by the service if a caller attempts a rename, which
prevents orphaning catalog, diagnostic, locale, or migration references. The
All components sentinel remains display-only.

Validation evidence:

- `npm run test:language-app`: 23 passed, 0 failed, including component add and
  edit, immutable IDs, assigned migration add/reassign/remove, persistence, and
  IPC coverage.
- `npm run test:language-report`: passed in its disposable fixture.
- `npm run test:language`: passed.
- `npm run language:validate`: passed with 0 errors and 0 warnings.
- `npm run language:build`: passed; 15 existing catalog directories were
  preserved and no translation API request was needed.
- Modified JavaScript syntax checks and scoped Git whitespace check passed.
- Generated migration reports contain a component for all eight scanned files.
- Live Windows inspection verified the Components Add and Edit forms and the
  Migration Inventory add-assignment and per-row assignment selectors.
- The live app was closed without applying or saving a test change.

Directory packaging could not complete because Windows retained locks on the
Electron extraction file `resources\default_app.asar`, first in the ordinary
pack output and then in the isolated verification output. The live check used
the repository's Electron development entry instead. Temporary launcher files
were removed. The two locked `default_app.asar` remnants remain under
`artifacts\language-maintenance\win-unpacked.tmp` and
`artifacts\language-maintenance-components-verify\win-unpacked.tmp`; all other
files in those failed temporary outputs were removed.

## Follow-up: Migration Candidate Catalog Handoff

The generated migration report previously retained only a candidate's
one-based line number and normalized string text. It did not retain the full
physical source line, and Language Maintenance had no report-reader boundary or
candidate-to-catalog workflow. Component Catalog records also supported a
`source` path but no source line number.

The builder now adds `fullLine` to every JSON migration candidate using the
exact physical line read from the candidate file. The Component Catalog schema
now supports an optional positive integer `sourceLine`; builder validation
rejects an invalid line or a line without `source`.

Language Maintenance now provides **View candidates** for every Migration
Inventory source. The service reads the selected file from the generated
`build/language/reports/migration-report.json`, verifies that it still belongs
to the current inventory and component, and rejects missing or legacy candidate
data with a rebuild instruction. It does not silently rescan a different source
snapshot.

The modal candidate window displays each candidate's line number, normalized
text, and full source line. It includes Component Catalog Add Record. Selecting
a candidate populates the reliable fields: component, text, detected
placeholders, draft status, source path, and `sourceLine`. Key, category, and
role remain reviewer decisions. Applying the form uses the existing in-memory
catalog validation and then opens the Component Catalog view.

Validation evidence:

- `npm run test:language-app`: 24 passed, 0 failed, including report loading,
  inventory scoping, full-line requirements, `sourceLine` schema validation,
  IPC coverage, and renderer contract checks.
- `npm run test:language-report`: passed and verified `fullLine` exactly equals
  the reported physical line from the copied source file.
- `npm run test:language`: passed.
- `npm run language:validate`: passed with 0 errors and 0 warnings.
- `npm run language:build`: passed; no locale output directory was overwritten
  and no translation API request was needed.
- JavaScript syntax checks and scoped Git whitespace checks passed.
- Live Windows inspection verified all eight View candidates buttons, the
  parser candidate window, and the included catalog form.
- Selecting parser line 69 visibly populated `Expected 'yes' or 'no'`,
  `source = src/server/parser.js`, and `sourceLine = 69`.
- The candidate window and application were closed without applying or saving
  the verification record. The temporary UI launcher was removed.

## Follow-up: Open Migration Candidate Source

Migration candidate rows previously identified the originating file and line
but offered no way to navigate back to that location. Language Maintenance now
adds **Open source** beside every reported candidate.

The main process resolves the requested file through the current Migration
Inventory and the generated migration report before launching anything. The
requested line must still be a candidate for that inventoried file, the
resolved path must remain inside the project root, and the source file must
exist. The renderer cannot provide an arbitrary filesystem path.

The source opener discovers VSCodium or Visual Studio Code, including an
optional `MYDEFRAG_LANGUAGE_EDITOR` override, and launches the editor with
`--reuse-window --goto <path>:<line>:1`. If no line-aware editor is available,
it uses Electron's default file opener and reports that the file was opened
without line positioning. Opener failures are returned visibly to the user.

Validation evidence:

- `npm run test:language-app`: 27 passed, 0 failed, including safe source-target
  resolution, invalid-line rejection, VSCodium `--goto`, default-file fallback,
  fallback failure reporting, preload exposure, and IPC registration.
- JavaScript syntax checks passed for the source opener, main process, IPC
  handlers, service, and renderer.
- Live Windows inspection showed **Open source** beside each migration
  candidate. Selecting parser line 69 launched VSCodium.
- After the automated UI snapshot stream failed with `Cannot call write after
  a stream was destroyed`, no further automated UI input was sent. The user
  independently confirmed that VSCodium opened and that `goto` positioning
  works.
- A final focused regression run after that confirmation again passed all 27
  Language Maintenance tests and all modified JavaScript syntax checks.

The exact temporary launcher directory
`artifacts\language-maintenance-source-ui-launcher` remains. It was verified to
be inside the workspace with no matching launcher process, but recursive
cleanup was denied because explicit deletion approval was not available. No
other artifact or process was targeted.

## Follow-up: Translation-Oriented Text Normalization

Migration candidate text could previously be copied into a catalog record only
in its detected form. Identifier casing and structural separators could leave
API translation providers with tokens such as `MyDefrag`, `js`, camelCase,
kebab-case, snake_case, and dotted or colon-bound code paths that do not carry
useful universal-language meaning.

A shared text normalizer now performs Unicode compatibility normalization,
camel-case and acronym-boundary expansion, letter/number separation, structural
separator expansion, whitespace cleanup, and translation-oriented canonical
substitution. Catalog placeholders remain unchanged. Human punctuation already
followed by whitespace is preserved, while tightly bound punctuation is treated
as an identifier boundary.

The ordered, canonical substitution table is
`language/canonical/normalized-words.json`. It uses a simple `input`/`output`
array and is seeded with the user-specified mappings `MyDefrag` to
`My Defragment` and `js` to `JavaScript`. Matching is case-insensitive. Direct
replacement output is protected from further camel-case processing, and a
second pass permits future rules to match tokens generated during splitting.
Validation rejects malformed rules, empty fields, unsupported fields, and
case-insensitive duplicate inputs.

Every Component Catalog editor, including the form embedded in Migration
Candidates, now places a read-only **Normalized text** preview immediately after
**Text**. **Apply normalized text** copies the preview into the editable Text
control. The existing **Apply to in-memory draft** action remains the only
catalog draft mutation boundary.

The language builder uses the same normalizer immediately before requesting
missing-value translations. Only the provider request text is normalized;
authored canonical English is not rewritten. Existing placeholder shielding,
restoration, result validation, generated `machine-generated` status, and
fallback behavior remain in force.

Validation evidence:

- `npm run test:language-app`: 32 passed, 0 failed, including exact sample
  normalization, substitutions, separator and camel-case expansion,
  placeholder preservation, rule validation, and renderer integration.
- `npm run test:locale-app`: 28 passed, 0 failed. Its captured provider request
  exactly contained
  `server JavaScript connection on Initialize: SERVER loading configuration My Defragment`.
- `npm run test:language-report`: passed.
- `npm run test:language`: passed.
- `npm run language:validate`: passed with 0 errors and 0 warnings across 15
  existing locale output directories.
- JavaScript syntax checks passed for the normalizer, translation service,
  builder, and renderer.
- Both normalization JSON files parsed successfully and the scoped Git
  whitespace check passed. The repository has no local `markdownlint-cli2`
  executable; its bounded `npx --no-install` documentation-lint attempt
  produced no output and was terminated.
- An initial isolated report fixture exposed that the normalizer was owned by
  the application directory. It was moved to `build/language/translation` so
  isolated builders, packaged applications, and the renderer load the same
  module. The report and application suites passed after that correction.
- No live DeepL request was made; the provider boundary was verified with a
  captured test translator, avoiding API usage while proving request content.

## Follow-up: Preserve JavaScript Template Interpolation

`normalizeText()` now accepts a third `options` argument with
`preserveTemplateExpressions`. The option defaults to `true`, so complete
JavaScript `${...}` interpolation expressions are protected before placeholder,
substitution, casing, separator, or punctuation processing. A boolean third
argument is also accepted for compact programmatic calls.

The interpolation scanner balances nested braces and ignores braces inside
single-quoted, double-quoted, and backtick-quoted expression content. An
unterminated `${...}` sequence is left for ordinary normalization rather than
silently consuming the remainder of the text. Callers can explicitly pass
`{ preserveTemplateExpressions: false }` or `false` to normalize expression
contents.

The requested source:

`searchWorkspace: Unable to read ${uri.toString()}: ${errResult.message}.`

now produces by default:

`search Workspace: Unable to read ${uri.toString()}: ${errResult.message}.`

Validation evidence:

- `npm run test:language-app`: 34 passed, 0 failed, including default
  preservation, nested object-expression preservation, object-option opt-out,
  and boolean opt-out.
- `npm run test:locale-app`: 28 passed, 0 failed. The captured build-provider
  request retained `${uri.toString()}` exactly while normalizing surrounding
  identifier text and canonical substitutions.
- `npm run test:language-report`: passed.
- `npm run test:language`: passed.
- `npm run language:validate`: passed with 0 errors and 0 warnings.
- JavaScript syntax checks and the scoped Git whitespace check passed.
- An ad hoc PowerShell probe initially expanded `${...}` before Node received
  it. A rerun constructed the dollar character inside Node and confirmed the
  exact expected default output above.

## Follow-up: fr-CA Translation Consistency Diagnosis

This was a read-only troubleshooting pass. No source, generated catalog, or
translation configuration was changed, and no live DeepL request was made.

The generated `fr-CA` catalogs were correlated entry-by-entry with canonical
English and the exact local normalized/provider input. Every occurrence of
`MyDefrag` was deterministically sent as `My Defragment`, but DeepL returned
different interpretations according to each independently translated string:

- `My Defragment: No current diagnostic.` became
  `My Defragment : Aucun diagnostic en cours.`
- `$(check) My Defragment 0 diagnostics` became
  `$(check) Diagnostic « My Defragment 0 »`.
- `$(warning) My Defragment {index} {total}` became
  `$(warning) Mon défragmenteur {index} {total}`.
- `My Defragment Script ( myd)` became
  `Mon script de défragmentation (myd)`.

The request construction is consistent: one JSON `text` array, explicit
English source language, `FR-CA` target mapping, XML tag handling, formatting
preservation, and ignored `x` tags for canonical placeholders. DeepL documents
that array items are translated independently and do not share context. The
integration sends neither `context` nor `glossary_id`.

Three local root causes were identified:

1. `My Defragment` is an unnatural, capitalized English noun phrase. It can be
   classified as a product name, a quoted label, or the semantic concept of a
   defragmenter depending on the short string around it. The substitution table
   supplies source-language clarification only; it does not enforce target
   terminology.
2. Build-time normalization is lossy. It changed `{index}/{total}` to
   `{index} {total}` and `(.MyDc / .MyD)` to `( My Dc My D)` before DeepL saw
   either string. Conversely, code-like `$(warning)` and `$(check)` were left
   exposed to DeepL rather than protected and restored.
3. Result validation checks only non-empty text and canonical `{placeholder}`
   membership. It does not verify codicons, separators, file extensions,
   template interpolation, or terminology consistency. Consequently, all of
   these malformed results were accepted as `machine-generated` with no build
   warning.

Trailing colons are not the root cause. They influence the isolated phrase's
context and DeepL correctly adds French spacing before a colon, but entries
without a leading colon also retained `My Defragment`, while other entries with
code prefixes translated it.

Recommended repair order, not applied in this diagnostic pass:

1. Make build translation preparation lossless by protecting and restoring all
   runtime tokens and punctuation invariants before normalization and DeepL.
2. Reject or warn on translated results that do not preserve those invariants.
3. Replace the ambiguous source substitution with a grammatical semantic phrase
   and add consistent translation context for short UI strings.
4. Add locale-specific terminology enforcement. DeepL glossaries are intended
   for source-to-target term mappings, but current official glossary language
   documentation lists base `fr`, so compatibility with the repository's
   `FR-CA` request mapping must be verified before selecting that mechanism.

## Follow-up: Lossless Translation Preparation

General text normalization no longer treats `/`, `\`, or `|` as disposable
structural separators. Camel-case, kebab-case, snake_case, middot, and tightly
bound punctuation normalization remain active.

Build translation now enables a separate `preserveRuntimeSyntax` mode. Before
normalization it protects codicons, canonical placeholders, JavaScript template
interpolation, complete URLs, dotted runtime tokens and extensions, `/`, `\`,
`|`, `::`, `=>`, and `->`. The normalized build request restores those tokens
unchanged, then the DeepL transport wraps each one in an ignored XML `x` tag.

The response path requires every protected marker exactly once. A missing,
duplicated, or unexpected marker makes the DeepL result unusable, so the build
warns and uses canonical English fallback instead of accepting corrupted
runtime syntax. Existing canonical placeholder-set validation remains active
after all protected tokens are restored.

Observed request preparation now includes:

- `$(warning) MyDefrag {index}/{total}` -> normalized
  `$(warning) My Defragmenter {index}/{total}`, with codicon, both placeholders,
  and `/` separately shielded from DeepL.
- `MyDefrag Script (.MyDc / .MyD)` -> normalized
  `My Defragmenter Script (.MyDc / .MyD)`, with both dotted extensions and `/`
  shielded.
- Template interpolation expressions and complete URLs are each shielded as a
  single unit.

The user concurrently changed the canonical substitution from `My Defragment`
to `My Defragmenter` while handling the separate semantic-phrase recommendation.
That authored change was preserved; current tests and documentation were
aligned with it rather than reverting it.

Validation evidence:

- `npm run test:language-app`: 35 passed, 0 failed.
- `npm run test:locale-app`: 30 passed, 0 failed, including runtime-token XML
  protection, exact restoration, and rejection when a codicon marker is lost.
- `npm run test:language-report`: passed.
- `npm run language:validate`: passed with 0 errors and 0 warnings; it reported
  the currently deleted `fr-CA` generated catalog as missing.
- JavaScript syntax checks and the scoped Git whitespace check passed.
- `npm run test:language` could not run its `fr-CA` assertions because
  `build/language/catalogs/fr-CA/extension.json` is currently absent. The
  missing generated output was not recreated and no live DeepL request was
  made, preserving the user's apparent next-test state and API quota.

## Follow-up: Normalized-English Locale Generation

`build/language/scripts/build-language.js` now accepts `--UseNormalized` for
the `build` and `report` actions. In this mode, the create-only missing-locale
workflow does not construct or call the DeepL service. It writes the shared
lossless normalized canonical English into missing generated entry `text`
fields while retaining `status: "draft"` and `fallbackLocale: "en"` so the
values remain visibly untranslated.

Existing authored locale entries retain precedence, and existing generated
locale directories remain untouched. Translation-completeness reporting counts
only suggestions with `machine-generated` status as translated; normalized
English drafts remain fallback values. The flag is rejected for `validate` and
`build-component`, where its meaning would conflict with those action scopes.

Documentation now includes both direct and npm forms:

```powershell
node .\build\language\scripts\build-language.js build --UseNormalized
npm run language:build -- --UseNormalized
```

Validation evidence:

- `node build/language/scripts/test-language-report.js`: passed. A temporary
  repository fixture supplied a fake configured DeepL key and an unreachable
  endpoint; `--UseNormalized` completed with no API warning or request result,
  generated `My Defragmenter Script (.MyDc / .MyD)`, preserved codicons,
  placeholders, and `/`, marked all `fr-CA` entries as fallback drafts, and
  preserved every generated directory on a second run.
- `npm run test:locale-app`: 30 passed, 0 failed.
- `npm run language:validate`: passed with 0 errors and 0 warnings against all
  15 currently existing generated locale directories.
- `npm run test:language-app`: 34 passed, 1 failed. The unrelated fixture
  expectation still lists only the original two normalized-word rules, while
  the concurrently authored `normalized-words.json` now contains seven
  additional rules (`char`, `pos`, `desc`, `prev`, `Eof`, `dbg`, and `kw`). The
  authored rules and unrelated test were not changed by this task.
- No live DeepL request was made and no repository-generated locale catalog was
  rebuilt by this task; generation coverage used temporary directories.

## Follow-up: npm Flag Forwarding Verification

The reported command was reproduced at the npm argument boundary:

```powershell
npm run language:build --project-root --UseNormalized
```

With npm 11.13.0, neither option is forwarded in the child process argument
list because there is no standalone `--`. npm consumes them as unknown CLI
configuration and exposes `npm_config_project_root=true` and
`npm_config_usenormalized=true` to the script. Consequently, the initial
implementation did not see `--UseNormalized` and could enter the normal DeepL
path when a generated locale directory was missing.

The command parser now recognizes the true-valued
`npm_config_usenormalized` child environment setting as well as the direct
argument. This makes the reported npm 11 command select normalized mode, while
the preferred future-safe command remains:

```powershell
npm run language:build -- --UseNormalized
```

Verification used a temporary repository and invoked the reported command
verbatim with a fake configured DeepL key and an unreachable local endpoint.
The build generated normalized `fr-CA` draft values, emitted the explicit API
bypass message, emitted no DeepL request or API-translation warning, and
preserved `fallbackLocale: "en"`. `npm run test:language-report` and the
JavaScript syntax check passed. No live DeepL request or repository catalog
generation occurred during verification.
