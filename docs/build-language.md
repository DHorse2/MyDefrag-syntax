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
  or invalid, writes nothing, and exits nonzero on errors.
- `build` (`npm run language:build`) validates, creates missing locale and
  component outputs, and additively updates existing component files. Existing
  entry keys are never replaced or removed. When DeepL is configured, only
  missing generated entry keys receive API translations.
  The terminal also states whether DeepL is configured in the current process,
  which locales are eligible, how many suggestions were accepted, and how many
  warnings occurred. If every canonical key already exists in its generated
  component file, it explicitly reports that the API was not requested.
- `build --UseNormalized` (or
  `npm run language:build -- --UseNormalized`) follows the same additive rules
  but bypasses DeepL. Missing generated entries use lossless normalized English
  in `text`, retain `draft` status, and record `fallbackLocale: "en"`. Existing
  entry keys remain unchanged. This supports complete exports and incremental
  analyst workflows in which only newly introduced canonical keys are added.
  The standalone `--` is the preferred npm argument-forwarding form. For npm 11
  compatibility, the builder also recognizes the npm configuration environment
  value produced by `npm run language:build --UseNormalized`, although npm
  warns that this non-forwarding form will stop working in a future major
  version.
- `report` (`npm run language:report`) runs the same validation and full output
  generation as `build`, then prints a structured plain-text report and writes
  the same content to `build/language/reports/language-report.txt`. The report
  includes translation completeness, validation warnings, keyword collisions,
  and the full migration-candidate inventory. It also accepts
  `--UseNormalized` and uses the same normalized generation mode as `build`.
  Language Maintenance can edit this human-readable artifact directly, but the
  next `report`, `build`, or applicable rebuild operation may replace those
  manual changes.
- `build-component <locale> <component>` validates all authored inputs,
  overwrites only the explicitly selected generated component catalog, and then
  refreshes aggregate maps and reports. MyDefrag Locale Maintenance invokes this
  action after an accepted component-source save. Missing entry values may use
  DeepL while authored values remain unchanged.

An unknown action is an error. Every writing action stops before generation when
validation reports an error.

## Electron App Catalog Extraction

`npm run language:catalogs:apps` runs
`build/scripts/generate-electron-component-catalogs.js`. It scans production
JavaScript and HTML under these roots:

- `build/mdl-language-app` -> `translator`
- `build/mdl-locale-app` -> `locales`

Tests, styles, and packaging metadata are excluded. The command updates only
the authored entries in `language/canonical/component-catalog.json`, the two
component descriptions, and their production source-file assignments in
`language/canonical/components.json`.

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

The builder and MyDefrag Locale Maintenance share
`build/language/translation/deepl-translation-service.js`. Configure it with the
environment-only `DeeplApi` (or `DEEPL_API_KEY`); optional `DEEPL_API_URL` and
`DEEPL_TIMEOUT_MS` values are documented in `locale-maintenance-app.md`. The key
is never read from or written to repository JSON.

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
as translatable content. Immediately before each API request, the builder uses
the shared text normalizer to expand identifier separators and apply the ordered,
case-insensitive `input`/`output` rules in
`language/canonical/normalized-words.json`. The normalized request text is not
written back to the canonical catalog. JavaScript template interpolation
expressions such as `${uri.toString()}` are preserved exactly by the default
`preserveTemplateExpressions` option. Build calls also enable
`preserveRuntimeSyntax`, which keeps codicons, placeholders, file extensions,
URLs, `/`, `\`, and meaningful multi-character separators exact. These tokens
are shielded with ignored XML tags for DeepL and must each be restored exactly;
a missing or duplicated marker makes the API result unusable.

For every entry considered by broad `build` and `report` actions, the precedence
order is:

1. Existing generated component entry, preserved as a complete entry object.
2. Existing authored locale value for a missing generated key.
3. Usable API translation with `machine-generated` status.
4. Canonical English text with `fallbackLocale: "en"`.

`--UseNormalized` replaces the API step for `build` and `report`; it never
constructs or calls the DeepL service. Existing authored locale values still
have first precedence. For missing values, the lossless normalized canonical
English is written as a `draft` with `fallbackLocale: "en"`, so reports and the
maintenance UI do not misrepresent it as a completed translation. Existing
generated entry keys remain untouched; only absent keys are added. The flag is
rejected for `validate` and `build-component`.

Missing configuration, unsupported languages, HTTP errors, empty results, and
placeholder mismatches produce warnings and select canonical fallback. These
translation-only failures never fail the build. Invalid canonical input,
output-path conflicts, and write failures retain their existing failure
behavior. API translations are generated output only; the builder never writes
them into `language/locales/`.

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
  reports/translation-completeness.json
```

Before either generation action, the builder checks every registered locale
below `build/language/catalogs/`:

- A missing locale directory is created and receives a complete component
  catalog set.
- A missing component file inside an existing locale is created.
- An existing component file is parsed and receives only canonical entry keys
  absent from its `entries` object. Existing entry objects and unrelated
  top-level fields are preserved.
- Invalid JSON, mismatched locale/component metadata, a non-object `entries`
  value, or a non-file component path fails the action before catalog writes.
- Missing values use API translation when configured and usable, normalized
  English under `--UseNormalized`, or canonical English fallback.
- A locale path that exists but is not a directory is a validation error.

The shared `catalogs/` directory and its locale directories are never deleted.
The build and human-readable reports list every registered locale as
`generated`, `updated-existing`, or `unchanged-existing`, with machine-readable
counts for entries added and component files created or updated.

`build-component <locale> <component>` is the narrow replacement action. It
validates both identifiers against their registries and overwrites only
`build/language/catalogs/<locale>/<component>.json` before refreshing aggregate
maps and reports. Other existing locale component files retain the historical
skip behavior during this targeted action.

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
5. For translator component changes, use MyDefrag Locale Maintenance or run
   `build-component <locale> <component>` to refresh only that component.
6. Use `npm run language:build` to generate complete catalogs only for missing
   locale directories.
7. Run `npm run test:language` when catalog fallback, keyword maps, or runtime
   loading behavior could be affected.

Keep semantic identities stable. Localized display text and keyword spellings may
change, but catalog keys, diagnostic codes, keyword IDs, and variable symbol IDs
are the cross-file references that make regeneration deterministic.
