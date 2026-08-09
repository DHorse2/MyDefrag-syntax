# MyDefrag Language Maintenance Application

## Table of Contents

- [Purpose](#purpose)
- [Technology and Rationale](#technology-and-rationale)
- [Architecture](#architecture)
- [Source and Generated Data Boundary](#source-and-generated-data-boundary)
- [Installation](#installation)
- [Development Launch](#development-launch)
- [Windows Build and Packaging](#windows-build-and-packaging)
- [Views and Workflow](#views-and-workflow)
  - [Resizable Panels](#resizable-panels)
  - [Component Selection](#component-selection)
  - [Component Catalog](#component-catalog)
  - [Categories](#categories)
  - [Roles](#roles)
  - [Language Report](#language-report)
  - [Diagnostic Messages](#diagnostic-messages)
  - [Semantic Keywords](#semantic-keywords)
  - [Preview Modes](#preview-modes)
  - [Migration Inventory](#migration-inventory)
  - [Locales](#locales)
- [Save, Revert, Reload, and Rebuild](#save-revert-reload-and-rebuild)
- [Validation and Tests](#validation-and-tests)
- [Troubleshooting](#troubleshooting)
  - [The application rejects the repository](#the-application-rejects-the-repository)
  - [A record cannot be applied](#a-record-cannot-be-applied)
  - [A migration file cannot be added](#a-migration-file-cannot-be-added)
  - [Save fails during the build](#save-fails-during-the-build)
  - [Packaging cannot download tool assets](#packaging-cannot-download-tool-assets)
- [Intentionally Deferred](#intentionally-deferred)

## Purpose

MyDefrag Language Maintenance is a standalone graphical desktop application for
displaying, validating, and maintaining the repository-owned canonical language
definitions. It runs independently of VSCodium and does not start the extension
host or language server.

The application maintains these authored documents:

```text
language/canonical/component-catalog.json
language/canonical/catalog-categories.json
language/canonical/catalog-roles.json
language/canonical/diagnostic-messages.json
language/canonical/semantic-keywords.json
language/canonical/preview-modes.json
language/canonical/components.json
```

## Technology and Rationale

The application uses Electron with plain CommonJS, HTML, CSS, and JavaScript.
Electron matches the repository's existing Node.js/CommonJS toolchain and
provides native windows, dialogs, tables, forms, and Windows packaging without
introducing another implementation language or coupling the tool to VSCodium.

The renderer is sandboxed and has Node.js integration disabled. Context
isolation is enabled, and a preload script exposes one method for each permitted
operation. The renderer cannot directly access the filesystem, child processes,
or arbitrary Electron IPC.

## Architecture

```text
Sandboxed renderer
        |
        v
Restricted preload bridge
        |
        v
Electron main-process handlers
        |
        v
LanguageMaintenanceService
        |
        +-- CanonicalDataRepository
        +-- SchemaValidator (AJV)
        +-- existing language-builder validation
        +-- BuildIntegration
        +-- transactional source and generated-output recovery
```

Responsibilities are separated as follows:

- `renderer/` owns display state, tables, structured forms, searching, filtering,
  and user confirmation flow. It does not read or write files.
- `preload/` exposes the fixed operation list through `contextBridge`.
- `main/` owns the desktop window, native dialogs, repository selection, exit
  protection, navigation restrictions, and IPC registration.
- `services/` owns in-memory drafts, validation orchestration, save and rebuild
  workflow, build output capture, changed-file reporting, and rollback.
- `repositories/` owns canonical JSON serialization and transactional writes.
- `validation/` evaluates the applicable JSON schemas through AJV. Cross-file
  rules are evaluated by the existing language builder.

The service layer is ordinary CommonJS and can be tested without opening an
Electron window.

## Source and Generated Data Boundary

Authoritative data is under `language/`. Generated output is never presented as
authoritative source. The Language Report view is an explicit utility exception:
it can edit one fixed human-readable artifact while clearly retaining its
generated and replaceable status.

Applicable schemas are:

- `component-catalog.schema.json`
- `catalog-categories.schema.json`
- `catalog-roles.schema.json`
- `diagnostic-messages.schema.json`
- `semantic-keywords.schema.json`
- `preview-modes.schema.json`

The component selector and migration scan-file inventory are read from
`components.json`; they are not reconstructed from catalog or diagnostic
records. The Components page adds component definitions and edits their
description and runtime flag. Existing component identifiers are immutable so
catalog, diagnostic, locale, and migration references cannot be orphaned. The
Migration Inventory page maintains source-file paths and their component
assignments under `migrationInventory.scanFiles`. Durable candidate review
decisions are stored in `migrationInventory.candidateStatuses` by file path and
candidate text.
The Locales page maintains `language/locales/locales.json`. Existing locale
identifiers are immutable, and canonical English (`en`) cannot be deleted.
The existing builder remains authoritative for component references, identifier
uniqueness, placeholder parity, semantic keyword collisions, preview default
references, locale contracts, and other cross-file rules.

A successful save invokes the existing builder and may regenerate:

```text
build/language/catalogs/
build/language/keyword-maps/
build/language/variable-maps/
build/language/reports/
```

Catalog generation is additive per component entry key. Save and Rebuild create
missing locale/component outputs and add canonical keys that are absent from an
existing component file. Existing entry objects are never replaced or removed,
so analyst translations can accumulate across repeated builds. The application
never deletes locale directories or component files automatically.

## Installation

From the repository root:

```powershell
npm install
```

AJV is a production dependency because packaged builds validate schemas.
Electron and electron-builder are development dependencies.

## Development Launch

Launch the graphical application from the repository root:

```powershell
npm run language:app
```

During development the script passes the current repository as the project root.
A packaged executable accepts either argument form:

```powershell
MyDefrag-Language-Maintenance.exe --project-root D:\Script\MyDefrag-syntax
MyDefrag-Language-Maintenance.exe --project-root=D:\Script\MyDefrag-syntax
```

If a packaged application cannot validate the supplied or current directory, it
opens a folder-selection dialog. It refuses a directory that does not contain
the required canonical files and language builder.

## Windows Build and Packaging

Create an unpacked Windows application for local verification:

```powershell
npm run language:app:pack
```

Create a x64 NSIS Windows installer:

```powershell
npm run language:app:package
```

Outputs are written under:

```text
artifacts/language-maintenance/
```

The unpacked executable is normally located under
`artifacts/language-maintenance/win-unpacked/`. The installer filename follows
`MyDefrag-Language-Maintenance-<version>-x64.exe`.

## Views and Workflow

Selecting a row in a scrollable maintenance list updates only the adjacent
details editor. The list remains mounted, preserving its scroll position and
preventing selection from jumping back to the first row. List positions are
also retained across an edit's in-memory Apply or Clear render, keyed by view,
component scope, and search text. The list and editor panes fill the available
desktop height and scroll independently; responsive single-column layouts keep
their bounded list height.

### Resizable Panels

Component Catalog, Diagnostic Messages, Semantic Keywords, Categories, Roles,
Preview Modes, Locales, and All Candidates use a draggable vertical separator
between their list and editor panes. Operation results use a horizontal
separator below the workspace, so validation and preview details do not cover
the editor.

Drag a separator with the mouse to resize its adjacent panes. A focused
separator also supports the arrow keys, Shift+arrow for a larger step, Home and
End for the enforced minimum sizes, and double-click to restore its default.
Each position is retained in renderer storage and restored in later application
sessions. Narrow layouts return to the existing stacked presentation.

Every table also provides a narrow draggable handle at the right edge of each
column heading. Dragging an interior handle reallocates width between adjacent
columns; dragging the final handle can widen the table and expose horizontal
scrolling. Focused handles support Left, Right, Shift+arrow, Home, and End.
Double-clicking any column handle restores that table's automatic layout.
Column widths are remembered separately for every maintenance view.

### Component Selection

The main view provides a searchable component selector sourced from
`components.json`. It displays the selected component's identifier,
description, runtime status, and the repository migration scan inventory.
Buttons open each maintenance view. Component-catalog and diagnostic-message
views always use this selected component as their scope.

The compact left navigation orders the maintenance views as Components,
Component Catalog, Diagnostic Messages, Migration Inventory, Semantic Keywords,
Locales, Categories, Roles, Preview Modes, and Language Report. The shared Save,
Revert, Validate, Rebuild, Reload data, and Exit actions follow the view list.

**Add component** creates a component definition in the in-memory draft.
**Edit component** changes the selected component's description and runtime
flag. The identifier is read-only after creation because it is referenced by
other canonical records.

Selecting **All components** removes the display filter from the component
catalog and diagnostic-message views. It is a display scope only: Add record is
disabled for those views until a specific component is selected, and no
all-components sentinel can be stored as a component ID.

### Component Catalog

The component-catalog view filters records by selected component and searches
all record fields. Add and edit forms are generated from the catalog schema.
Catalog key uniqueness, component references, field shapes, and placeholder
parity are validated before a record enters the in-memory draft. A catalog
record can retain both its repository-relative `source` path and the optional
one-based `sourceLine` where the string was found.

The Category field is a grouped dropdown. **Existing Categories** contains
registry values currently referenced by at least one catalog record.
**Recommended Categories** contains maintained values that are not yet in use.
A recommended value automatically moves to Existing after a catalog record uses
it.

The Role field follows the same model. **Existing Roles** contains registry
values referenced by catalog records, while **Recommended Roles** contains
maintained values available for new records. Roles describe the string's
linguistic or interface function; categories describe its domain or context.

### Categories

The Categories view maintains
`language/canonical/catalog-categories.json`. It shows each category's ID,
description, and computed classification. The initial registry contains the 20
values discovered in the canonical catalog and 18 recommended values covering
application operations, correctly spelled category lists, confirmation, empty
states, errors, fields, filters, help, menus, navigation, notifications,
prompts, settings, summaries, tables, tooltips, validation, and windows.

**Add category** creates a recommended category in the in-memory draft. Editing
a description is allowed. Renaming an in-use category is rejected until its
catalog references are migrated, preventing orphaned catalog records. Save,
Revert, Reload data, and Validate use the same transaction and validation flow
as the other canonical maintenance views. The legacy `catagories` value remains
registered because it is currently referenced; `categories` is its recommended
replacement for new records.

### Roles

The Roles view maintains `language/canonical/catalog-roles.json`. It shows each
role's ID, description, and computed Existing or Recommended classification.
The initial registry preserves the 13 roles found in the canonical catalog:
`displayName`, `heading`, `info`, `label`, `list`, `message`, `notice`,
`placeholder`, `status`, `syntax`, `text`, `title`, and `warning`.

The 22 recommendations cover access keys, accessible names, alternative text,
announcements, captions, descriptions, details, errors, examples, help, hints,
instructions, collection items, links, options, plural-sensitive content,
prompts, questions, shortcuts, summaries, tooltips, and displayed values.
**Add role** creates a recommendation in the in-memory draft. Descriptions are
editable; renaming an in-use role is rejected until catalog references are
migrated. Save, Revert, Reload data, and Validate use the shared transaction and
validation flow.

### Language Report

The Language Report view displays and edits the fixed generated artifact at
`build/language/reports/language-report.txt`. **Save report artifact** writes
only that file; it does not enter the authoritative canonical transaction and
does not run a language build. **Reload report from disk** discards the view's
draft after confirmation.

The editor warns that a future report build can replace manual changes. It
records the loaded content version and rejects Save if another process or build
changed the file on disk. Unsaved report edits participate in the application's
dirty-state protections: canonical Save and Rebuild are blocked, while Revert,
Reload data, and Exit require their normal discard confirmation. The report is
reloaded after a successful canonical Save or Rebuild because either operation
may regenerate it.

### Diagnostic Messages

The diagnostic view filters by component and searches diagnostic fields plus the
referenced catalog text and category. The message-key selector shows canonical
catalog keys. Expected placeholders are displayed from the selected message and
cannot be edited independently, preventing accidental placeholder drift.

### Semantic Keywords

The semantic-keyword view is not component-filtered. It supports searching,
adding, and editing schema-defined fields. Duplicate semantic IDs and normalized
canonical keyword collisions are rejected by the builder validation.

### Preview Modes

The preview-mode view is not component-filtered. It supports structured add and
edit forms and a separate default-mode selector. Duplicate IDs and a default
that does not reference a declared mode are rejected.

### Migration Inventory

The migration-inventory view edits the repository-relative source file list and
component assignment in `components.json` at `migrationInventory.scanFiles`.
Each entry has a `path` and a real component `id`. Add files opens a native
multi-file chooser rooted at the selected repository and assigns all selected
files to the component chosen beside the button. Each existing row also has a
component selector for reassignment. Paths are converted to forward-slash
repository-relative paths, duplicates are ignored, and files outside the
repository are rejected. Remove and reassignment change only the in-memory
draft, so Revert restores the original inventory until Save is confirmed.

**Scan file** opens a separate resizable modal window without changing the
inventory. **Select file** uses the same repository-rooted native chooser as
Add files, but accepts one file and immediately runs the builder's exported
`extractStringCandidates` function against its current contents. The window
shows every accepted string in source order, including its line, complete
physical source line, **Open source** action, and current candidate status.
Single words, filenames, and path-like strings are retained for review because
they may contain user-facing document names. String literals used directly as
`require(...)` arguments are excluded by checking the source before the opening
quote; the module-name value is not inspected. Open source revalidates the scanned
text
against the current file before opening its line. Catalog status is calculated
against the current in-memory catalog, so the preview does not require a report
rebuild. **Add to source files** then
adds the scanned repository-relative path to the in-memory inventory under the
selected component. Scanning alone is non-mutating, and Save is still required
to persist an added source file.

**Scan folder** opens a companion bulk-import window. **Select folder**
recursively inspects the selected repository folder and lists only files for
which `extractStringCandidates` found at least one string. New files are selected
by default; paths already in the inventory remain visible with their assigned
component but cannot be selected again. **Select all new**, **Clear**, and
**Add selected files** allow the chosen paths to be added to one component in a
single validated in-memory draft update. The scan remains non-mutating until
Add selected files is pressed.

Folder scans skip symbolic links, binary files, files larger than 2 MB,
dependency and version-control folders (`node_modules`, `.git`, `.hg`, `.svn`),
coverage data, and generated `build/language/catalogs` data. A scan stops after
inspecting 5,000 files and reports when that safety limit was reached.

The Add files, Scan file, and Scan folder choosers share their last selected
folder for the current application session. The first chooser starts at the
project root; after a successful file selection, a chooser reopens in that
file's folder. After a folder selection, it reopens at that folder.

Each Migration Inventory row loads a one-call report summary and displays its
current `non-catalog` and `found in catalog` counts. Missing or stale report data
is shown on that row as unavailable with a rebuild instruction. The path and
counts occupy one compact line beside text-sized row controls. Long paths use an
ellipsis instead of increasing row height, with the complete path available as
hover text. The compact controls are ordered component assignment, **View**, and
**Remove**; the component selector has a bounded width so the final button stays
inside the row.

**View** reads that file's candidate entry from
`build/language/reports/migration-report.json` and opens a candidate window.
The window presents one source-ordered **All Candidates** list. Every row shows
its line number, status, and detected text together on one compact first line,
followed by the complete physical source line and **Open source** action. The
four statuses are **In Catalog**, **Potential Candidate**, **Rejected**, and
**Review**. The status filter can display any one of those groups. In Catalog
rows place every matching catalog key and component left-aligned to the left of
the complete physical source line. Candidate lists are not truncated.

Selecting a non-catalog candidate populates the included Component Catalog Add
Record form with the reliable fields: component, text, detected placeholders,
draft status, source path, and source line. The catalog key, category, and role
remain explicit reviewer decisions. The Add Record pane provides a candidate
status dropdown and a **Reject** shortcut. Potential, Review, and Rejected
decisions update the in-memory migration inventory; Save persists them in
`language/canonical/components.json`. The catalog record's translation review
status remains a separate schema-backed dropdown. Compact **Previous (line)**
and **Next (line)** buttons are top-aligned at the right of the **Component
Catalog Add Record** heading, with Previous directly above Next to match Catalog
Matches. They move through source-ordered rows matching the active filter.
Reject remains beside the candidate-status dropdown. Selecting a catalog category
inserts that category immediately after the component in the Suggested key;
changing category regenerates the suggestion without altering a manually typed
Key until **Use suggested key** is pressed. Matching is recalculated against the
current in-memory catalog whenever the window opens, so a newly applied record
moves from Potential Candidate to In Catalog before Save. Selecting an In
Catalog row shows its matching catalog records instead of an Add Record form.
Each match has **Edit Record**, which embeds the existing schema-backed Component
Catalog editor inside All Candidates without changing views. Apply retains the
original catalog key as the change guard, updates only the in-memory draft, and
reclassifies every candidate against the updated catalog. Key, component,
category, role, or text changes therefore appear immediately; Save remains
required for persistence. **Back to catalog matches** returns to the match list.
The Catalog Matches pane places compact **Previous (line)** directly above
**Next (line)** at the upper right; Close candidates remains on the same row as
Next. Its header is a two-column layout: all match heading, status, source text,
and help text remain together on the left while the button group occupies the
right. The buttons therefore do not push the text down. Both directions use
source order and the active status filter without wrapping. A successful
**Reject** action, a change to Rejected status, or
**Apply to in-memory draft** selects the next source-ordered row that matches
the active status filter. Repeated occurrences of the same candidate text share
one decision and are skipped together; selection does not wrap at the end of the
list. A report that predates catalog-found strings is rejected with a rebuild
instruction rather than silently rescanning different source content.

The catalog form places **Normalized text** immediately after **Text**. This
translation-oriented preview separates camelCase, kebab-case, snake_case,
middot-separated text, and tightly bound punctuation into words while
preserving ordinary human punctuation, `/` and `\`, and catalog placeholders.
It applies case-insensitive substitutions from
`language/canonical/normalized-words.json` both before and after identifier
splitting. Direct matches are protected from further splitting, so the seeded
rules produce `MyDefrag` → `My Defragmenter` and `js` → `JavaScript` exactly.
JavaScript template interpolation expressions such as `${uri.toString()}` are
preserved exactly by default. Programmatic callers can pass
`{ preserveTemplateExpressions: false }` as the third `normalizeText` argument
when expression contents should also be normalized.
**Apply normalized text** copies the preview into Text; it does not change the
in-memory catalog draft until **Apply to in-memory draft** is used.

The language build uses this same function on missing canonical values
immediately before it calls the translation API. Normalization changes only the
API request text; it does not rewrite canonical catalog entries. Placeholders
remain protected and are validated against the returned translation as before.
Build normalization additionally preserves codicons, JavaScript template
expressions, placeholders, extensions, URLs, and meaningful separators. Those
tokens are wrapped in ignored XML tags for DeepL, restored exactly afterward,
and cause the suggestion to be rejected if any marker is lost or duplicated.

Each candidate also has **Open source**. The main process verifies that the
requested line is still a reported candidate in an inventoried repository file.
It then opens VSCodium or VS Code with `--goto <file>:<line>:1`. The optional
`MYDEFRAG_LANGUAGE_EDITOR` environment variable can name another compatible
editor executable. If no line-aware editor is available, the application opens
the file with its normal Windows-associated application and reports that the
line position was unavailable.

### Locales

The Locales view adds, edits, and deletes locale registry entries. It maintains
the locale ID, English and native names, text direction, review status, and
optional notes. Existing IDs cannot be renamed because locale directories and
generated outputs use them as stable identities.

**Add locale** begins with a required template selector sourced from
`language/canonical/language-locales.json`. The selector mirrors the locale
table fields in each option: ID, English name, native name, direction, and
status. Already registered locales remain visible and are disabled. Selecting
an available template fills the editable metadata fields; the locale ID remains
read-only so it stays aligned with the canonical template. When every canonical
template is registered, the Add locale action remains unavailable until a
template is added to the canonical file or a locale is removed from the active
registry.

Deleting a locale opens a native three-choice prompt. **Keep catalog
(recommended)** is the default and removes only the registry entry after Save.
**Delete catalog on Save** also schedules that locale's generated
`build/language/catalogs/<locale>/` directory for transactional removal.
**Cancel** changes nothing. Authored files under `language/locales/<locale>/`
are always preserved; when their registry entry is absent, the builder reports
the directory as preserved but inactive.

## Save, Revert, Reload, and Rebuild

Edits remain in main-process memory until Save is confirmed. Changing views
shows a warning while a draft is dirty, but does not discard the draft.

The header-level **Allow DeepL calls** checkbox is visible across every main
panel and controls subsequent Save and Rebuild operations from one shared
in-memory setting. It defaults to off. When it is off, those operations use
normalized English without DeepL; when it is on, they may make usage-based
DeepL API calls. Changing panels, opening candidate windows, reverting, or
reloading data does not reset the checkbox.

Save performs this sequence:

1. Validate every schema-backed maintained document with its JSON schema.
2. Validate the complete draft, including `components.json`, through the
   existing language builder.
3. Preview every authoritative file that will change.
4. Obtain confirmation through a native dialog.
5. Stage all changed source files beside their targets.
6. Stage any explicitly approved generated-catalog deletion by renaming its
   locale directory to a private backup outside the generated catalog tree.
7. Activate the source transaction using backup-and-rename operations.
8. Run the established language builder and capture its status and output.
9. Report every authoritative and generated file changed or deleted.
10. Commit source changes and approved catalog deletions only after the build
    succeeds.

If a write or build fails, prior authoritative content is restored. Generated
catalogs, maps, and reports are snapshotted before the build and restored after
a failed build. Temporary files are removed. A backup that cannot be removed is
reported as a recovery file and is never given a `.json` extension.

Other actions:

- Revert discards the in-memory draft after confirmation. A modal progress
  window remains visible while the original draft is restored and fully
  validated, then the clean and validation badges are refreshed.
- Reload data rereads repository files and warns before discarding a dirty draft.
- Rebuild is blocked while edits are unsaved. Otherwise, it runs the builder and
  restores generated output if the build fails.
- Language Report edits use their dedicated artifact Save action and are never
  included in an authoritative Save transaction.
- Exit uses a native unsaved-change warning with **Exit without saving** and
  **Cancel** choices. Discarding is allowed when no build or rollback is active;
  a running build must first be stopped and allowed to finish rollback.

## Validation and Tests

Run focused application tests:

```powershell
npm run test:language-app
```

Run the established language checks:

```powershell
npm run language:validate
npm run language:build
npm run test:language
npm run test:language-report
```

Application tests use temporary repositories. They do not modify the live
canonical language files.

## Troubleshooting

### The application rejects the repository

Select the repository root, not `language/` or `build/language/`. The selected
directory must contain the canonical component files and
`build/scripts/build-language.js`.

### A record cannot be applied

Review the operation-result panel. Schema errors include a document path.
Builder errors describe duplicate identifiers, unknown references,
placeholder mismatches, or keyword collisions. Rejected records do not change
the in-memory draft.

### A migration file cannot be added

The inventory stores repository-relative paths because the migration report
scans files below the selected project root. Choose a file inside that
repository. Files outside it are rejected, and files already present in the
inventory are ignored.

### Save fails during the build

The application reports failure and restores both source and generated output.
Review captured stdout and stderr, correct the underlying source or environment
problem, and retry. A reported recovery path indicates that cleanup could not
remove a backup and a maintainer should inspect it manually.

If validation reports that a locale output path is not a directory, move or
remove that conflicting file before retrying. Existing locale directories are
not errors: Save and Rebuild add only missing component entry keys and report
whether each locale was updated or unchanged. Invalid existing component JSON,
mismatched locale/component metadata, or a non-object `entries` value fails
closed so the application cannot replace analyst-maintained values.

### Packaging cannot download tool assets

electron-builder may download Electron or Windows packaging tools on first use.
Restore network access and rerun the packaging command. A successful automated
test run does not by itself prove that an installer was produced.

## Intentionally Deferred

The application does not implement Phase 2 runtime localization, locale
translation supply tables, parser/tokenizer changes, source conversion,
language-server integration, or VSCodium UI. It maintains only the named
canonical definitions and invokes the existing generation pipeline.
