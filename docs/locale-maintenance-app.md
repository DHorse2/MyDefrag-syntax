# MyDefrag Locale Maintenance Application

## Table of Contents

- [Purpose](#purpose)
- [Authoritative and Generated Files](#authoritative-and-generated-files)
- [Technology and Security](#technology-and-security)
- [Architecture](#architecture)
- [Development Launch](#development-launch)
- [DeepL API Configuration](#deepl-api-configuration)
- [Windows Packaging](#windows-packaging)
- [Translator Workflow](#translator-workflow)
- [Resizable Panels](#resizable-panels)
- [Legacy Aggregate Migration](#legacy-aggregate-migration)
- [Validation, Save, and Recovery](#validation-save-and-recovery)
- [Validation Commands](#validation-commands)
- [Troubleshooting](#troubleshooting)
  - [A Translation Is Rejected](#a-translation-is-rejected)
  - [The API Uses an Earlier Current Value](#the-api-uses-an-earlier-current-value)
  - [Save Fails During the Build](#save-fails-during-the-build)
  - [Save or Rebuild Takes Longer Than Expected](#save-or-rebuild-takes-longer-than-expected)
  - [A Generated Catalog Still Shows English](#a-generated-catalog-still-shows-english)
- [Intentionally Deferred](#intentionally-deferred)

## Purpose

MyDefrag Locale Maintenance is the standalone translator application for
per-locale, per-component text. It is separate from MyDefrag Language
Maintenance, which maintains the canonical English definitions and component
inventory.

The application runs in its own Electron window, independently of VSCodium. A
translator selects a registered locale and a canonical component, searches the
component catalog, and edits translations through labeled fields rather than a
raw JSON editor.

## Authoritative and Generated Files

Permanent translator-owned component files use this path:

```text
language/locales/<locale>/<component>.json
```

For example, the permanent source corresponding to the generated parser catalog
is:

```text
language/locales/zh-Hans/parser.json
```

The builder derives the runtime file at:

```text
build/language/catalogs/zh-Hans/parser.json
```

Never edit the generated file. Generated catalogs contain canonical metadata,
English fallback entries, placeholder declarations, and build fields that do
not belong in translator-owned source.

Component source files are sparse. They store only translations that should
override canonical English text:

```json
{
  "locale": "zh-Hans",
  "component": "parser",
  "entries": {
    "parser.diagnostic.unexpectedToken.message": {
      "text": "意外的标记“{token}”",
      "status": "native-review-required",
      "notes": "Initial translator draft."
    }
  }
}
```

The schema is `language/schema/locale-component-catalog.schema.json`. Locale
identifiers come only from `language/locales/locales.json`, component
identifiers come only from `language/canonical/components.json`, and entry keys
come only from `language/canonical/component-catalog.json`.

## Technology and Security

The application uses Electron with the repository's existing Node.js and
CommonJS toolchain. Its renderer is sandboxed, context isolation is enabled,
Node.js integration is disabled, navigation is restricted, and the preload
bridge exposes only named locale-maintenance operations. Renderer code cannot
read files, write files, launch child processes, or invoke arbitrary IPC.

## Architecture

```text
Sandboxed translator UI
        |
        v
Restricted preload bridge
        |
        v
Electron main-process handlers
        |
        v
LocaleMaintenanceService
        |
        +-- LocaleCatalogRepository
        +-- LocaleCatalogValidator and AJV schema validation
        +-- canonical cross-file and placeholder validation
        +-- shared BuildIntegration
        +-- targeted build-language component generation
```

The service layer is ordinary CommonJS and is tested without opening Electron.
UI handlers do not directly access JSON or run the builder.

The same `DeepLTranslationService` is used by the Electron main process and the
language builder. It shields `{placeholder}` tokens with ignored XML tags,
restores them after translation, and rejects any result whose placeholder set
does not exactly match the canonical entry.

## Development Launch

Install repository dependencies, then launch the app:

```powershell
npm install
npm run locale:app
```

A packaged executable accepts either project-root form:

```powershell
MyDefrag-Locale-Maintenance.exe --project-root D:\Script\MyDefrag-syntax
MyDefrag-Locale-Maintenance.exe --project-root=D:\Script\MyDefrag-syntax
```

If the supplied directory is invalid, the app opens a repository chooser.

## DeepL API Configuration

Set the API key in the environment that launches the application or builder:

```powershell
$env:DeeplApi = '<your DeepL API key>'
npm run locale:app
```

Do not add the key to repository files. It remains in the Electron main process
and is sent only in DeepL's `Authorization: DeepL-Auth-Key ...` header. The
sandboxed renderer receives only a Boolean configured state and never receives
the credential.

Free API keys ending in `:fx` automatically use
`https://api-free.deepl.com/v2/translate`; other keys use
`https://api.deepl.com/v2/translate`. Advanced local configurations may set
`DeeplApi` is the established project variable; `DEEPL_API_KEY` is accepted as
an alternative for standard CI environments. `DEEPL_API_URL` may select a
different DeepL-compatible API base URL and
`DEEPL_TIMEOUT_MS` to a value from 1000 through 120000 milliseconds.

The integration uses DeepL's JSON `POST /v2/translate` contract and XML tag
handling. Repository locale IDs are used as target language codes with explicit
mappings for `fr-CA`, `zh-Hans`, and `pt`.

## Windows Packaging

Create an unpacked Windows application:

```powershell
npm run locale:app:pack
```

Create a x64 NSIS installer:

```powershell
npm run locale:app:package
```

Outputs are written under:

```text
artifacts/locale-maintenance/
```

The unpacked executable is normally
`artifacts/locale-maintenance/win-unpacked/MyDefrag Locale Maintenance.exe`.

## Translator Workflow

The editor layers locale data in this order:

1. Authored component or aggregate locale values.
2. Generated catalog entries whose `fallbackLocale` is `null`, including DeepL
   entries with `machine-generated` status.
3. Canonical English fallback.

Generated translations are displayed without marking the authored draft dirty.
Editing and applying one promotes it immediately into the authoritative
`language/locales/<locale>/<component>.json` draft. Save and Rebuild also
promote every existing non-fallback translation in the selected generated
component before regenerating output, so generated output is never its only
durable copy. Authored values always take precedence over generated output.
Generated entries that explicitly use `fallbackLocale: "en"` remain displayed
as English fallback and are not promoted as translations.

1. Select a locale from the registry-backed Locale selector.
2. Select a component from the canonical Component selector.
3. Search by key, English source, translation, category, or review status.
4. Review **Canonical English** and the lossless **Normalized English** directly
   below it.
5. Enter translated text, review status, and optional notes, or use **Use
   English fallback** or **Use Normalized English** to populate **Current locale
   value**.
6. Optionally choose **Generate API translation**. DeepL receives the current
   locale field and replaces that field with its result. The separate latest
   result display retains the returned text for comparison.
7. Preserve every placeholder displayed in Required placeholders.
8. Choose **Apply in memory** to accept the current field into the draft.
9. Validate the complete selected component.
10. Preview and confirm every authoritative file that Save will change.
11. Save and review the targeted build result and changed generated files.

Rows without an authored translation display **English fallback**. The English
and normalized buttons populate only the editor field; **Apply in memory** is
still required to change the draft. English definitions remain read-only
because canonical English belongs in MyDefrag Language Maintenance.

Changing the locale or component, reloading, or exiting prompts before dirty
data is discarded. Revert restores the last loaded source without writing. The
native main-process confirmation is the sole exit guard, so accepting **Exit
without saving** is not vetoed again by the renderer.

API requests submit only **Current locale value** and required formatting
tokens. They never submit JSON keys, component IDs, locale IDs as content, enum
values, paths, or other structural fields. An empty current value is rejected
locally. The main process returns the exact source text it translated; the
renderer verifies that it matches the submitted current value before replacing
the field. A request failure, source mismatch, or unusable placeholder result
leaves the current value unchanged.

Every DeepL `/v2/translate` request includes custom instructions to translate
words enclosed in quotation marks and parentheses. These direct DeepL to
translate normalized product-name wording such as `My Defragmenter` instead of
retaining it as a product name when DeepL supports custom instructions for the
selected target language.

## Resizable Panels

A draggable vertical separator controls the boundary between the component
catalog and structured translation editor. Inside the editor, a horizontal
separator controls the space assigned to **Current locale value** and the
latest DeepL result. Pane minimums keep both sides usable.

Separators support pointer dragging, arrow keys, Shift+arrow for a larger step,
Home and End for minimum-size navigation, and double-click to restore the
default. Positions are stored by the renderer and restored between application
sessions. Narrow layouts continue to stack the catalog and editor.

Every catalog-table heading also has a draggable column handle. Interior
handles redistribute space between neighboring columns, while the final handle
can widen the table and use horizontal scrolling. The handles support Left,
Right, Shift+arrow, Home, End, and double-click reset, and the selected widths
are restored in later sessions.

## Legacy Aggregate Migration

`catalogOverrides.json` and `catalogOverrides.sample.json` remain supported for
existing translations and keyword overrides. The app displays matching legacy
component entries. On the first saved edit for that component, it atomically:

1. Writes `language/locales/<locale>/<component>.json`.
2. Removes that component's entries from the legacy aggregate.
3. Preserves unrelated component entries, keyword overrides, and other fields.

This prevents one translation from existing in two authoritative locations.
Keyword overrides remain in the aggregate format until a separate permanent
keyword-file workflow is defined.

## Validation, Save, and Recovery

Before Save, the app checks:

- The locale-component JSON schema.
- Registered locale and component references.
- Canonical key ownership.
- Required translation status.
- Exact placeholder parity with canonical English.
- Deterministic component-file serialization.

Save stages all source changes beside their targets, activates them by rename,
and invokes:

```text
node build/scripts/build-language.js build-component <locale> <component>
```

The builder runs as an asynchronous child process. A modal progress window
shows elapsed time, transaction phases, the exact command, and streamed standard
output/error so a slow DeepL request or component build is not mistaken for a
frozen application. **Stop build** terminates the child process and keeps the
progress window open until rollback finishes. The main window cannot close
while a build or rollback is active.

The targeted builder action merges the selected runtime component
non-destructively. It preserves existing translated and historical entries,
overlays authoritative values, refreshes canonical metadata, and adds new
canonical keys. A translated value can become English fallback only through the
builder's exact-key `--AllowFallbackReplacement` command-line approval. The
ordinary `language:build` command retains its additive locale-directory
protection.

When DeepL is configured, generated default component tables use it only for
canonical entries that have no authored locale value. Existing aggregate or
per-component values always win. A usable API result is written only to the
generated table with `machine-generated` status and is also transactionally
merged into permanent translator source. Missing configuration, HTTP failure,
empty output, or a placeholder mismatch emits a warning, uses canonical English
fallback, and does not fail the build. Independent canonical validation and
write failures remain build failures.

If writing or building fails, authoritative sources and generated outputs are
restored. The app reports failure rather than claiming a partial save. A backup
that cannot be removed is reported as a recovery path and does not use a JSON
extension.

## Validation Commands

```powershell
npm run test:locale-app
npm run language:validate
npm run test:language-app
npm run test:language
npm run test:language-report
```

To exercise one targeted generated catalog directly:

```powershell
node .\build\scripts\build-language.js build-component zh-Hans parser
```

Tests use temporary fixture repositories and never edit live translator source.

## Troubleshooting

### A Translation Is Rejected

Review the operation result. A translation must contain exactly the canonical
placeholder set. Placeholder names are case-sensitive, and extra placeholders
are rejected as well as missing placeholders.

### The API Uses an Earlier Current Value

Exit Locale Maintenance completely and start it again. Reloading only the
renderer can leave an older main process active. The renderer now rejects a
translation unless the main process confirms that it translated the exact
**Current locale value** captured when **Generate API translation** was chosen.

### Save Fails During the Build

The app restores durable locale sources as well as generated output. Review
captured standard output and error text, correct the reported validation or
environment problem, and retry.

### Save or Rebuild Takes Longer Than Expected

Keep the progress window open and review its current phase and elapsed time.
When DeepL is configured, the targeted build may wait for the translation API.
Use **Stop build** to cancel; wait for rollback to complete before retrying or
closing the application. Cancellation first requests normal termination, then
uses a bounded force-stop fallback if the child never reports that it closed;
rollback therefore cannot wait indefinitely on a missing close event.

### A Generated Catalog Still Shows English

Confirm that the permanent component file contains the key, then run the
targeted component build. An absent source entry intentionally uses canonical
English fallback.

## Intentionally Deferred

The app does not maintain canonical definitions, locale metadata, semantic
keyword translations, variable maps, parser behavior, extension runtime
localization, translation memory, approval queues, or review-state workflows.
Those are separate contracts.
