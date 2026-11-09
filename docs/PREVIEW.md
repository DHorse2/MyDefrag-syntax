# Preview And Translation Review

MyDefrag Syntax 0.8.0 provides thirteen preview and review commands from one
**Preview** submenu. Every editor command creates a fresh, editable, unsaved
document. No preview or review command writes to the source or included files.

## Table of Contents

- [Open A Preview Or Review](#open-a-preview-or-review)
- [Preview Inventory](#preview-inventory)
- [Executable Translation Previews](#executable-translation-previews)
- [Translation Review Workbench](#translation-review-workbench)
- [Source Tracing And Diagnostics](#source-tracing-and-diagnostics)
- [Standalone Include Processor](#standalone-include-processor)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Open A Preview Or Review

1. Open or select a `.MyD` or `.MyDc` document.
2. Right-click in the editor or Explorer and select **Preview**.
3. Select the required include, translation, or review view.
4. For localized and review views, select one of the 18 registered locales.
5. Edit the untitled result if needed. Use **Save As** only when a separate
   copy is intentionally required.

The editor-title **Open Preview** button retains the legacy default:
annotations with line numbers and no file headers. The locale picker remembers
the last workspace selection.

## Preview Inventory

<!-- markdownlint-disable MD013 -->

| Submenu item | Output purpose | Language mode | Executable |
| --- | --- | --- | ---: |
| Raw (Executable) | Include-expanded source without generated text | MyDefrag | Yes |
| Annotations | Include expansion with boundaries and diagnostics | Plain text | No |
| Annotations + File Headers | Annotated expansion with source headers | Plain text | No |
| Annotations + Line Numbers | Annotated expansion with output/source lines | Plain text | No |
| Annotations + Line Numbers + File Headers | Complete include review | Plain text | No |
| Canonical | Validated canonical English MyDefrag source | MyDefrag | Yes |
| Localized | Validated source rendered in the selected locale | MyDefrag | Yes |
| Bilingual | Localized and canonical lines together | Plain text | No |
| Semantic IDs | Localized lines paired with stable keyword IDs | Plain text | No |
| Differences | Only localized/canonical line differences | Plain text | No |
| Terminology | Full visible keyword catalog plus source usage | Plain text | No |
| Untranslated Tokens | Unchanged or fallback keyword entries | Plain text | No |
| Completeness | Catalog status and expanded-source coverage totals | Plain text | No |

<!-- markdownlint-enable MD013 -->

Raw previews retain `.myd` or `.mydc`. The four original annotated views use
`.mydd` or `.mydcd` so the language server does not parse report text. Review
workbench documents use `.txt` for the same reason.

## Executable Translation Previews

Canonical and localized previews use the same translation service as the
review workbench. Each source file is translated before include expansion.
The launched entry directory remains the include root, child files inherit the
root locale unless they declare one valid override, and the result contains one
target-language directive.

Executable output contains no generated annotations. A missing or circular
include remains as its original `!include` directive and produces a visible
warning; it is never replaced with generated comment text. Canonical output is
parsed before display. A conversion or parse failure returns no partial
translated document.

## Translation Review Workbench

- **Bilingual** pairs every localized line with its canonical line.
- **Semantic IDs** replaces recognized localized keywords with stable semantic
  IDs while retaining the localized line for comparison.
- **Differences** emits only lines whose localized and canonical forms differ.
- **Terminology** lists all 214 visible, translatable catalog entries with
  status, fallback locale, occurrence count, and first source location.
- **Untranslated Tokens** filters that catalog to unchanged or fallback entries.
- **Completeness** summarizes catalog translation, fallback, review-status, and
  source-usage counts.

These are diagnostic views. They are intentionally editable and non-executable.
Edits affect only that unsaved review document.

## Source Tracing And Diagnostics

Bilingual, semantic, and difference output identifies the source file, line,
and column for each expanded line where a mapping exists. Terminology rows add
the first source occurrence when the keyword is used. Generated-only report
content is labeled as such.

Missing and circular includes are retained in output and reported with stable
diagnostic codes. Conversion errors, duplicate or invalid source-language
directives, ambiguous keyword maps, and canonical parse failures stop the
operation without changing source.

## Standalone Include Processor

The original include processor remains available from the project root:

```powershell
node .\src\preprocess\mydefrag-preprocess.js --help
node .\src\preprocess\mydefrag-preprocess.js .\script.myd --mode raw
```

The default is in-memory output. Review the help before supplying an explicit
output path because write mode creates that requested file.

## Validation

Run the focused review and manifest tests:

```powershell
node --test .\src\shared\translationPreview.test.js .\src\shared\translationReview.test.js .\src\extensionManifest.test.js
```

Run the complete source gate and language-data validation:

```powershell
npm run test:all
npm run language:validate
```

Expected results are zero failed checks, zero failed named tests, and zero
language-validation errors. The known normalized-input audit warning is
reported separately by the language validator.

## Troubleshooting

- If a command reports no active document, open the `.MyD` or `.MyDc` source
  and run the command again.
- If translation fails, correct the reported source-language directive or map
  diagnostic before retrying; partial output is deliberately withheld.
- If an include warning appears, open the retained directive target relative to
  the launched entry directory and correct the missing path or cycle.
- If a locale is absent, run `npm run language:validate`; the locale registry
  and both generated keyword maps must be valid before the locale is offered.
