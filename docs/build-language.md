# `build-language.js` Internal Reference

## Table of Contents

- [Purpose](#purpose)
- [Command Interface](#command-interface)
- [Electron App Catalog Extraction](#electron-app-catalog-extraction)
- [Processing Model](#processing-model)
- [Language State](#language-state)
  - [`schemas`](#schemas)
  - [`components`](#components)
  - [`catalog`](#catalog)
  - [`keywords`](#keywords)
  - [`diagnostics`](#diagnostics)
  - [`previewModes`](#previewmodes)
  - [`variableMapExample`](#variablemapexample)
  - [`locales`](#locales)
  - [`localeCatalogs`](#localecatalogs)
- [API-Assisted Missing Values](#api-assisted-missing-values)
- [Fallback Translation Runner](#fallback-translation-runner)
- [Cross-File Contracts](#cross-file-contracts)
- [Generated Outputs](#generated-outputs)
- [Maintenance Guidance](#maintenance-guidance)

## Purpose

`build/scripts/build-language.js` is the authoritative build-time
loader, validator, and generator for the repository-owned language definitions
under `language/`.
It does not change parser or extension runtime behavior. It reads authored JSON,
checks the relationships the generated files depend on, and writes deterministic
runtime catalogs, keyword maps, variable-map data, and reports under
`build/language/`.

The script is synchronous by design. Each invocation loads one in-memory
snapshot, validates that snapshot, and only writes output if validation has no
errors.

## Command Interface

The first command-line argument selects the action. With no argument, the action
defaults to `build`.

- `validate` (`npm run language:validate`) loads and validates all inputs,
  reports whether each registered locale output directory is existing, missing,
  or invalid, writes nothing, and exits nonzero on errors. It also prints the
  normalized-input audit status and every affected locale source file. Audit
  findings are warnings because protected syntax and reviewed exceptions may
  require human classification.
- `audit-normalized-inputs` (`npm run language:audit-normalized-inputs`) runs the
  same validation and writes the current file list to
  `build/language/reports/normalized-input-audit.md`, with entry-level evidence
  in `normalized-input-audit.json`. A `partial` result means that one or more
  canonical normalization inputs remain in non-English locale text.
- `build` (`npm run language:build`) validates, creates missing locale and
  component outputs, and additively updates existing component files. Existing
  translations and historical entries are never replaced or removed. Generated
  English fallback entries are refreshed from the selected English source.
  Before generated output is changed,
  every current non-fallback generated translation is transactionally merged
  into its permanent `language/locales/<locale>/<component>.json` source. When
  the selected translator is configured, only missing generated entry keys
  receive API translations, and accepted translations are persisted through
  the same source path. DeepL remains the command-line default. The terminal
  states which provider is selected and configured, which locales are eligible,
  how many suggestions were accepted, and how many warnings occurred. If every
  canonical key already exists in its generated component file, it explicitly
  reports that the API was not requested. Normalized English is the default
  source for both translator API requests and English fallback entries.
- `--UseNormalized` selects lossless normalized English; `--UseCanonical`
  selects canonical English. These source-selection flags are independent of
  `--TranslationProvider`. In both modes, generated fallback entries retain
  `draft` status and record `fallbackLocale: "en"`. The standalone `--` is the
  preferred npm argument-forwarding form, for example
  `npm run language:build -- --UseCanonical`.
- `report` (`npm run language:report`) runs the same validation and full output
  generation as `build`, then prints a structured plain-text report and writes
  the same content to `build/language/reports/language-report.txt`. The report
  includes translation completeness, validation warnings, keyword collisions,
  and the full migration-candidate inventory. It accepts the same English-source
  and translation-provider options as `build`.
  Language Maintenance can edit this human-readable artifact directly, but the
  next `report`, `build`, or applicable rebuild operation may replace those
  manual changes.
- `build-component <locale> <component>` validates all authored inputs, merges
  the explicitly selected generated component catalog non-destructively, and
  then refreshes aggregate maps and reports. Existing translations are persisted
  and preserved, authored values are overlaid, and newly introduced canonical
  keys are added. MyDefrag Locale Maintenance invokes this action after an
  accepted component-source save. Missing entry values may use the selected
  translator API while authored and unrelated generated values remain
  unchanged.
- `--TranslationProvider=deepl|google|none` selects DeepL, Google Cloud
  Translation Basic v2, or no translator API for `build`, `report`, and
  `build-component`. The two-argument form, such as
  `--TranslationProvider google`, is also accepted. `none` makes no translator
  request and uses the selected normalized or canonical English fallback.
  MyDefrag Locale Maintenance always passes one of these three values explicitly.
- `--AllowFallbackReplacement=<exact-catalog-key>` can be added to
  `build-component` as the explicit opt-in for replacing one named translation
  with English fallback. The option is rejected by other actions and when the
  key does not belong to the selected component.

An unknown action is an error. Every writing action stops before generation when
validation reports an error.

## Fallback Translation Runner

`npm run language:translate-fallbacks` runs the reusable
`build/scripts/translate-language-fallbacks.js` workflow. It queries DeepL's
current target-language inventory and character usage before translating,
skips unsupported locales, and submits one catalog entry per API request.

Each usable response is checked for protected runtime syntax and placeholders,
then immediately written to both the permanent locale component source and its
generated component catalog. HTTP 429 responses use bounded exponential retry.
HTTP 456 or a preflight quota shortfall pauses cleanly, so rerunning the command
continues from the remaining generated English fallback entries.

The default resumable audit is
`build/language/reports/deepl-catalog-entry-calls.md`. It contains one physical
table row per API request, ends with a summary of entries that remain rejected,
records start and end quota usage, and never records the credential. A
repository-wide runner lock rejects a second concurrent process; an abandoned
lock is recovered only after its recorded process is no longer running.
Supported options are `--UseNormalized` (the default), `--UseCanonical`,
`--PreflightOnly`, repeated `--Locale=<id>`, `--MaxCalls=<count>`,
`--RetryLimit=<count>`, `--RetryBaseMs=<milliseconds>`, and
`--SystemicFailureLimit=<count>`, `--CallsPerMinute=<count>`, and
`--Report=<path>`. Translation calls default to 30 per minute and honor a
provider `Retry-After` response. The systemic-failure circuit breaker stops a
run after repeated non-retryable HTTP request errors.

## Electron App Catalog Extraction

`npm run language:catalogs:apps` runs
`build/scripts/generate-electron-component-catalogs.js`. It scans production
JavaScript and HTML under this project-owned root:

- `build/mdl-locale-app` -> `locales`

The `translator` application moved to the independent `D:\MdmLocalize`
project. Existing translator catalog and locale entries remain preserved here
so the active translation work is not discarded by this extractor.

Tests, styles, and packaging metadata are excluded. The command updates only
the authored entries in `language/canonical/component-catalog.json`, the two
component descriptions, and their production source-file assignments in
`language/canonical/components.json`.

If a previously extracted app string is no longer present in source, its
catalog entry is retained when a durable authored locale component still uses
that key. This keeps additive locale sources valid until that translated key is
retired through an explicit catalog-and-locale migration. Source-removed keys
with no authored locale use are dropped from the canonical catalog.

This command does not generate any locale catalog. Locale outputs remain the
responsibility of `language:build`, `language:report`, or `build-component`.
Run the extractor without `--write` for a count-only dry run.

## Processing Model

The top-level flow is:

```text
loadLanguageState()
-> validateLanguageState(state)
-> stop on validation errors
-> buildLanguageOutputs(state, validationResult)
-> print the action-specific summary
```

`loadLanguageState()` returns parsed source data, not generated runtime data.
Locale overrides are deliberately left separate from canonical entries until
`buildLanguageOutputs()` merges them.

The module also exports `loadLanguageState()`, `validateLanguageState()`,
`buildLanguageOutputs()`, and `buildLocaleComponentOutput()` for the two
maintenance applications' service layers. Each exported loader or builder
accepts an optional repository root so automated tests and packaged maintenance
applications can operate on an explicit repository without changing the
process working directory.

## Language State

The object returned by `loadLanguageState()` is the complete authored input
snapshot for one invocation.

- `schemas` <- `language/schema/*.json`
- `components` <- `language/canonical/components.json`
- `localeTemplates` <- `language/canonical/language-locales.json`
- `normalizedWords` <- `language/canonical/normalized-words.json`
- `catalog` <- `language/canonical/component-catalog.json`
- `categories` <- `language/canonical/catalog-categories.json`
- `roles` <- `language/canonical/catalog-roles.json`
- `keywords` <- `language/canonical/semantic-keywords.json`
- `diagnostics` <- `language/canonical/diagnostic-messages.json`
- `previewModes` <- `language/canonical/preview-modes.json`
- `variableMapExample` <-
  `language/canonical/project-variable-map.example.json`
- `locales` <- `language/locales/locales.json`
- `localeCatalogs` <- locale subdirectories under `language/locales/`
- `localeComponentCatalogs` <- permanent sparse component files under
  `language/locales/<locale>/<component>.json`

### `schemas`

`readJsonFiles()` reads only JSON files directly inside `language/schema/`, sorts
them by filename, parses each file, and preserves its filename alongside the
data. The schemas describe intended document shapes for tooling and maintainers.

The build script currently performs custom validation instead of evaluating
source documents against these schemas. Adding a field to a schema therefore
does not add a build-time rule by itself; the corresponding explicit validator
must also be updated when enforcement is required.

### `categories`

`categories.categories` is the authoritative catalog-category vocabulary. Each
entry has a stable `id` and a maintainer-facing `description`. Every
`catalog.entries[].category` value must reference a registered category.
Registry entries with catalog references are existing categories; unused
entries are recommendations available to the Language Maintenance dropdown.
This computed classification lets a newly used recommendation become existing
without rewriting category metadata.

### `roles`

`roles.roles` is the authoritative catalog-role vocabulary. Each entry has a
stable camel-case `id` and a maintainer-facing `description`. Every
`catalog.entries[].role` value must reference a registered role. Registry
entries with catalog references are existing roles; unused entries are
recommendations available to the Language Maintenance dropdown. Role describes
the string's linguistic or interface function; category independently describes
its domain or context.

### `components`

`components.components` is the ownership inventory. Every canonical catalog
entry must reference one declared component. During generation, the component
IDs become filenames such as:

```text
build/language/catalogs/en/extension.json
build/language/catalogs/en/parser.json
```

The `runtime` flag records whether a component is intended for runtime use, but
the current builder does not filter generation by that flag.

`components.migrationInventory.scanFiles` is a separate concern in the same
document. Each entry assigns a repository-relative `path` to a declared
`component`. `components.migrationInventory.candidateStatuses` permanently
records Potential, Review, or Rejected decisions by repository-relative path
and candidate text. `buildMigrationReport()` scans those files for likely
hard-coded human-facing strings and carries the component assignment and
candidate status into its reports. Single-token and path-like strings remain
eligible because they may contain translatable user-facing names.
Each JSON candidate includes the one-based `line`, normalized candidate `text`,
exact physical `fullLine` read from the source file, and its `status`. Catalog
matches receive the computed `in-catalog` status. Candidate lists are not
truncated.

The standalone language-maintenance application provides a Migration Inventory
view that adds files through a native file chooser, assigns or reassigns every
file to a component, and removes existing entries. Those changes remain in its
in-memory draft until Save writes `components.json` and runs this builder.
The same view can open a file's generated candidates and populate a Component
Catalog Add Record draft with its source path and `sourceLine`. Its status
filter covers In Catalog, Potential Candidate, Rejected, and Review; changing a
candidate decision remains an in-memory draft until Save writes
`components.json`.

### `catalog`

`catalog.entries` is the canonical source of human-facing text. Its keys must be
unique structured flat keys. Each key's `component` must exist in `components`,
and every `{placeholder}` found in `text` must exactly match the declared
`placeholders` array. `sourceLine`, when present, is a positive one-based
integer and requires a `source` path.

For non-English locale output, a matching locale entry overrides the canonical
text and status. Without an override, the generated entry uses canonical text,
records `fallbackLocale: "en"`, and receives `draft` status. English output uses
the canonical entry directly unless an English override is present.

### `keywords`

`keywords.keywords` separates semantic identity from rendered spelling:

- `id` is the stable identity used by locale overrides.
- `canonical` is the canonical MyDefrag token.
- `category` and `parent` describe its structural role.
- `status` records its review state.

IDs and normalized canonical spellings must be unique. For each registered
locale, the builder combines these definitions with locale keyword overrides and
creates both mapping directions. If two rendered spellings normalize to the
same value in one locale, validation fails because the reverse map would be
ambiguous.

### `diagnostics`

`diagnostics.diagnostics` is a stable identity layer for messages that originate
in the parser or language server. `messageKey` points into `catalog.entries`, so
message text can be localized without changing the diagnostic code. The
diagnostic's placeholder list must exactly match the referenced catalog entry's
placeholder list.

The current validator requires diagnostic fields and validates the catalog link,
placeholders, and status. It does not yet verify that the diagnostic component is
declared or that the severity is one of the values expressed by the schema.

### `previewModes`

`previewModes.defaultMode` names one entry in `previewModes.modes`. The inventory
includes current and planned renderings. Loading this data does not activate a
mode in the extension; the file is a declarative contract for future consumers.

### `variableMapExample`

The variable-map input is explicitly an example, not live project state. Each
variable uses `symbolId` for identity and keeps canonical/localized names plus
optional declaration and reference locations. The build copies the validated
example into generated output; it does not resolve symbols or translate source.

### `locales`

`locales.locales` is the set the generator iterates. Each locale produces
component catalogs, two keyword maps, and a completeness record. Locale status
is copied into the completeness report. Text direction and names remain source
metadata for consumers; the builder does not transform output based on them.

`EXPECTED_LOCALES` is the code-owned minimum set and currently contains only
canonical English (`en`). Other locales are registry-owned and may be added or
removed through MyDefrag Language Maintenance.

### `localeCatalogs`

`loadLocaleCatalogs()` inspects each registered subdirectory of
`language/locales/` and starts its compatibility aggregate in this order:

1. Use `catalogOverrides.json` when present.
2. Otherwise, use `catalogOverrides.sample.json` when present.
3. Otherwise, synthesize an empty catalog for that directory.

An authored locale directory whose ID is absent from `locales.json` is
preserved but inactive. Validation reports a warning and the builder does not
merge that directory until the locale is registered again.

It then loads every known permanent component file at
`language/locales/<locale>/<component>.json` and merges its sparse entries into
the in-memory locale catalog used by validation and generation. The original
component documents remain available in `localeComponentCatalogs` for
maintenance tooling and metadata validation.

The legacy names `catalog.json` and `catalog.sample.json` are rejected. This
prevents an authored override from being silently ignored after the naming
contract changed.

The returned catalogs contain overrides only; they are not fully rendered
locales. A component entry uses a canonical catalog key, while a compatibility
keyword override uses a semantic keyword ID. Duplicate component keys across
aggregate and permanent sources are rejected. MyDefrag Locale Maintenance
removes migrated component entries from the aggregate during the same atomic
save that creates the permanent component file.

A locale directory that is absent from `locales.json` is preserved, ignored by
the active build, and reported as a warning. A registered locale with no
directory is allowed and receives an empty catalog at build time, so its
generated output falls back to English. A non-English empty catalog discovered
from an active directory also produces a warning.

## API-Assisted Missing Values

The builder and MyDefrag Locale Maintenance share the provider interfaces in
`build/language/translation/deepl-translation-service.js` and
`build/language/translation/google-translation-service.js`. Configure DeepL
with the environment-only `DeeplApi` (or `DEEPL_API_KEY`). Configure Google
Cloud Translation Basic v2 with `GoogleTranslateApi` (or
`GOOGLE_TRANSLATE_API_KEY`). Optional provider endpoint and timeout variables
are documented in `locale-maintenance-app.md`. Keys are never read from or
written to repository JSON.

Environment variables are inherited when the terminal process starts. After
adding a machine-level `DeeplApi`, open a new terminal before building, or import
it into the current PowerShell process without printing the value:

```powershell
$env:DeeplApi = [Environment]::GetEnvironmentVariable('DeeplApi', 'Machine')
npm run language:build
```

Translation applies only to canonical `text` values whose selected locale has
no aggregate or permanent component override. Keys, identifiers, components,
statuses, enum values, paths, placeholders, and syntax tokens are not submitted
as translatable content. By default, immediately before each API request, the
builder uses the shared text normalizer to expand identifier separators and
apply the ordered, case-insensitive `input`/`output` rules in
`language/canonical/normalized-words.json`. `--UseCanonical` sends the original
canonical text instead. Neither source selection rewrites the canonical catalog.
JavaScript template interpolation
expressions such as `${uri.toString()}` are preserved exactly by the default
`preserveTemplateExpressions` option. Build calls also enable
`preserveRuntimeSyntax`, which keeps codicons, placeholders, file extensions,
URLs, `/`, `\`, and meaningful multi-character separators exact. These tokens
are shielded with ignored XML tags for DeepL or no-translate HTML spans for
Google Translate and must each be restored exactly; a missing or duplicated
marker makes the API result unusable.

For every entry considered by broad `build` and `report` actions, the precedence
and durability order is:

1. Existing non-fallback generated translations are transactionally persisted
   into permanent per-locale component sources when they are not already
   authored.
2. Existing generated component entries are preserved as complete entry
   objects.
3. Existing authored locale values supply missing generated keys and overlay
   the selected component during a targeted build.
4. Usable API translations receive `machine-generated` status and are persisted
   into permanent per-locale component sources.
5. The selected normalized or canonical English source uses
   `fallbackLocale: "en"` and remains generated-only.

English source and translation provider are separate choices. `--UseNormalized`
is the default and supplies normalized text to translator APIs and generated
fallback entries. `--UseCanonical` supplies canonical text to both. Use
`--TranslationProvider=none` with either choice to avoid every translator API.
Existing authored and generated translations still have first precedence;
generated English fallback entries may be refreshed when the selected source
changes.

Missing configuration, unsupported languages, HTTP errors, empty results, and
placeholder mismatches produce warnings and select the chosen English fallback.
These
translation-only failures never fail the build. Invalid canonical input,
output-path conflicts, and write failures retain their existing failure
behavior. Accepted API translations and existing non-fallback generated
translations are durable source data under `language/locales/`. English fallback
values are not promoted as translations.

## Cross-File Contracts

The main relationships enforced by the script are:

- Catalog component IDs must exist in `components.components`.
- Catalog keys, component IDs, keyword IDs, keyword canonical spellings, and
  locale IDs must be unique where checked.
- Diagnostic message keys must exist in the canonical catalog.
- Diagnostic and canonical-message placeholder sets must match exactly.
- Locale entry keys must exist in the canonical catalog.
- Locale component metadata must match its directory and filename.
- Locale component entries must belong to the selected canonical component.
- Locale translation placeholders must exactly match canonical placeholders.
- Locale keyword IDs must exist in the semantic keyword inventory.
- Review statuses must belong to `VALID_STATUSES`.
- Normalized-word rules must be an array of non-empty `input` and `output`
  strings with case-insensitively unique inputs and no unsupported fields.
- Non-English authored locale entry and keyword text is checked for normalized
  input words. URLs, placeholders, codicons, file extensions, template
  expressions, and other protected runtime syntax are excluded from matching.
- Every `EXPECTED_LOCALES` ID must exist in the locale registry.
- Each locale's rendered keyword spellings must be collision-free after trimming
  and locale-aware lowercasing.
- The preview default must name a declared preview mode.

These are explicit JavaScript checks. The JSON Schema files may express
additional constraints that the current script does not enforce.

## Generated Outputs

Successful `build` and `report` actions regenerate:

```text
build/language/
  catalogs/<locale>/<component>.json
  keyword-maps/<locale>-canonical-to-locale.json
  keyword-maps/<locale>-locale-to-canonical.json
  variable-maps/project-variable-map.example.json
  reports/keyword-collisions.json
  reports/language-build-report.json
  reports/migration-report.json
  reports/normalized-input-audit.json
  reports/normalized-input-audit.md
  reports/translation-completeness.json
```

Before either generation action, the builder checks every registered locale
below `build/language/catalogs/`:

- Existing non-fallback translations are first copied additively into permanent
  per-locale component sources using staged temporary files and rollback
  backups. Existing source entries always win.
- A missing locale directory is created and receives a complete component
  catalog set.
- A missing component file inside an existing locale is created.
- An existing component file is parsed and receives missing canonical entry keys.
  Existing translations, historical entries, and unrelated top-level fields are
  preserved; existing English fallback entries are refreshed from the selected
  English source.
- Invalid JSON, mismatched locale/component metadata, a non-object `entries`
  value, or a non-file component path fails the action before catalog writes.
- Missing values use API translation when configured and usable. API failures
  and provider-free builds use normalized English by default or canonical
  English under `--UseCanonical`.
- A locale path that exists but is not a directory is a validation error.

The shared `catalogs/` directory and its locale directories are never deleted.
The build and human-readable reports list every registered locale as
`generated`, `updated-existing`, or `unchanged-existing`, with machine-readable
counts for entries added and component files created or updated. Translation
completeness is calculated from the actual post-build component catalogs and
keyword maps; it includes explicit missing counts and does not discard preserved
machine-generated values from its totals.

`build-component <locale> <component>` is the narrow selected-component action.
It validates both identifiers against their registries, persists existing
translations, overlays authoritative values, refreshes canonical metadata, adds
missing keys, and preserves unrelated or historical entry objects. A
translated-to-English-fallback transition is permitted only for an exact key
named with `--AllowFallbackReplacement`. Other existing locale component files
retain the historical skip behavior during this targeted action.

The `report` action also writes:

```text
build/language/reports/language-report.txt
```

The plain-text report is intended for people. The JSON reports remain the
stable machine-readable inputs for automation and runtime tooling. The Language
Maintenance editor treats this text file as a generated artifact, saves it
separately from canonical data, and warns that regeneration can overwrite it.

`writeJson()` recursively sorts object properties, preserves array order, uses
two-space indentation, and appends one newline. Generated timestamps use the Unix
epoch so unchanged source produces stable output.

## Maintenance Guidance

When adding or changing language data:

1. Update the authored file under `language/`; do not hand-edit generated output.
2. Update the relevant schema for the documented shape.
3. Update the explicit JavaScript validator if the rule must be enforced during
   the build.
4. Run `npm run language:validate` before generation.
5. Run `npm run language:audit-normalized-inputs` when a durable per-file list
   of normalized inputs remaining in translated text is required.
6. For translator component changes, use MyDefrag Locale Maintenance or run
   `build-component <locale> <component>` to refresh only that component.
7. Use `npm run language:build` to generate complete catalogs only for missing
   locale directories.
8. Run `npm run test:language` when catalog fallback, keyword maps, or runtime
   loading behavior could be affected.

Keep semantic identities stable. Localized display text and keyword spellings may
change, but catalog keys, diagnostic codes, keyword IDs, and variable symbol IDs
are the cross-file references that make regeneration deterministic.

## Language Project Manifest and Source Roots

`language/language-project.json` is the integration contract for MdmLocalize.
It explicitly declares this project's ID, authored/generated roots, protocol-2
adapter, and logical source roots. Migration inventory entries may include a
`rootId`; an omitted value means `project` for backward compatibility.

External machine paths are not stored in this repository. MdmLocalize passes
the user's explicit mappings to the validator/build process in
`MDM_LOCALIZE_SOURCE_ROOTS`. The build resolves every migration source as
`(rootId, relative path)`, rejects absolute and escaping paths, and verifies the
final real path before reading it. Candidate Status V2 records are unique by
occurrence ID. The legacy report parser intentionally ignores a status when
multiple V2 decisions share the same root/path/text identity, preventing one
decision from being fanned out to duplicate occurrences.
