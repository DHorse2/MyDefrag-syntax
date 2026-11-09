# Declarative Multilingual Architecture

## Table of Contents

- [Purpose](#purpose)
- [Repository-Owned Definitions](#repository-owned-definitions)
- [Canonical Versus Localized Source](#canonical-versus-localized-source)
- [Component Catalog Loading](#component-catalog-loading)
- [Keyword Translation Model](#keyword-translation-model)
- [Generated And User-Authored Comments](#generated-and-user-authored-comments)
- [Preview Mode Model](#preview-mode-model)
- [Project-Scoped Variable Translation](#project-scoped-variable-translation)
- [Diagnostics](#diagnostics)
- [Commands](#commands)
- [Low-Resource Constraints](#low-resource-constraints)
- [Product Boundary](#product-boundary)

## Purpose

MyDefrag Syntax has a repository-owned multilingual foundation and a
non-destructive keyword translation runtime. The parser still consumes
canonical syntax; localized files are translated only in memory for hover and
generated preview documents.

The extension remains a standalone VSCodium and VS Code product. It does not require TaylorDo, MCP, Rust services, cloud localization services, online translation APIs, or a database for ordinary operation.

## Repository-Owned Definitions

Authored language definitions live under:

```text
language/
  schema/
  canonical/
  locales/
```

Generated runtime outputs live under:

```text
build/language/
  catalogs/
  keyword-maps/
  variable-maps/
  reports/
```

Authored definitions are the source of truth. Generated outputs can be rebuilt with:

```text
npm run language:build
```

Translator-owned component overrides are permanent sparse files at
`language/locales/<locale>/<component>.json`. MyDefrag Locale Maintenance edits
those files and uses the targeted `build-component` action to refresh the
corresponding generated runtime catalog. Before a writing build changes output,
existing non-fallback generated translations and accepted API translations are
merged additively into these permanent component sources. Generated files under
`build/language/catalogs/` remain derived and must not be hand-edited; they are
never the sole durable copy of a translation.

Keyword spellings are separate authored assets:

```text
language/canonical/semantic-keywords.json
language/locales/<locale>/keywords.json
```

Every file contains the same 243 semantic IDs. The 214 source-visible entries
are translatable; 29 parser-only grammar labels are retained for identity
completeness with `translatable: false` and `visible: false`.

## Canonical Versus Localized Source

The parser continues to consume canonical MyDefrag syntax. This phase does not make the parser multilingual.

The implemented preview pipeline is:

```text
localized source
-> source-language translator
-> canonical MyDefrag source
-> tokenizer
-> parser
-> diagnostics
```

User string literals and user-authored comments remain unchanged by keyword translation.
Paths, macros, include expressions, project variables, whitespace, and line
endings are also protected. Translation returns text, diagnostics, source
mappings, and statistics; a failed conversion returns the original text.

## Component Catalog Loading

Catalog keys are structured flat keys:

```text
extension.command.openPreview.title
parser.diagnostic.expectedToken.message
preview.annotation.includeBegin.text
language.keyword.volumeSelect.text
```

Keys encode component, category, semantic identity, and presentation role. Runtime code should load only the component catalogs it needs.

The standalone loader is:

```text
src/shared/languageCatalog.js
```

It has no VSCodium dependency, so it can run in the extension host, language server, preview process, or Node-based tooling.

## Keyword Translation Model

Canonical keyword definitions live in:

```text
language/canonical/semantic-keywords.json
```

Each keyword has a stable semantic ID separate from rendered spelling:

```json
{
  "id": "structure.volumeSelect",
  "canonical": "VolumeSelect",
  "category": "structure.volume",
  "parent": "volume_block"
}
```

Generated keyword maps enforce one preferred generated spelling per semantic keyword per locale. Duplicate locale spellings are build errors because generated output must be deterministic.

The standalone runtime is `src/shared/sourceTranslation.js`. It matches Unicode
and multiword spellings longest-first after NFC and locale-aware case
normalization. Locale-to-locale conversion always passes through canonical
English.

Input aliases are a future feature. They should not change generated output determinism.

## Generated And User-Authored Comments

User-authored comments remain unchanged by default and are not converted into catalog keys.

Generated comments and annotations should use catalog keys and placeholder arguments where practical, so they can be rerendered in another locale later. Preview include annotations are represented in the initial catalog as:

```text
preview.annotation.includeBegin.text
preview.annotation.includeEnd.text
```

## Preview Mode Model

The annotated expanded preview with line numbers remains the default original
mode. Version 0.7 added two independent commands:

- `MyDefrag: Preview Canonical`
- `MyDefrag: Preview Localized`

Both open editable untitled documents and never save, apply, or overwrite the
source. Localized preview offers all 18 registered locales and remembers the
last workspace selection. Each included file is translated before expansion;
root locale inheritance and child overrides are preserved, while expanded
output contains one target-language directive.

The declarative mode inventory is in:

```text
language/canonical/preview-modes.json
```

The inventory defines the five original preview variations: raw executable
output and four annotated combinations with optional line numbers and file
headers. The raw view keeps an executable extension for language-server
diagnostics; annotated views use `.mydd` or `.mydcd`.

Version 0.8 adds six non-executable review views:

- Bilingual localized and canonical lines.
- Semantic IDs paired with localized source.
- Localized and canonical differences.
- Full terminology with source-use evidence.
- Untranslated and fallback tokens.
- Catalog and source completeness.

All six reuse `src/shared/translationPreview.js` and therefore share the same
canonical translation, include expansion, validation, diagnostics, and source
mappings. `src/shared/translationReview.js` only renders review text. Review
documents use editable untitled plain text and cannot be sent to the MyDefrag
language server as executable code.

## Project-Scoped Variable Translation

Variable translation is a future project-scoped feature. It must use symbol identity and reference resolution rather than blind text replacement.

The placeholder map shape is:

```text
language/canonical/project-variable-map.example.json
language/schema/project-variable-map.schema.json
```

Future implementations should track declarations, references, canonical names, localized names, include-spanning references, and collision detection.

## Diagnostics

Stable diagnostic identities are introduced in:

```text
language/canonical/diagnostic-messages.json
```

A diagnostic can eventually carry a code, severity, message key, message arguments, rendered message, source, and range while remaining compatible with standard LSP diagnostics.

This phase does not require the extension client to translate server messages.

## Commands

```text
npm run language:validate
npm run language:build
npm run language:report
npm run test:language
```

Validation checks include malformed metadata, unknown keys, placeholder mismatches, duplicate keyword mappings, incomplete locale coverage, and generated report output.

## Low-Resource Constraints

The architecture is designed for Windows 8 and later and low-end systems:

- No Rust dependency.
- No database dependency.
- No always-running translation service.
- No cloud localization platform.
- No online translation API.
- Component catalogs are loaded on demand.
- Reports are build-time artifacts, not editor-startup work.
- Generated maps are compact JSON files.

## Product Boundary

MyDefrag Syntax may integrate with TaylorDo, AI tools, and MCP workflows, but its multilingual foundation is repository-owned and standalone. Ordinary extension operation must not depend on TaylorDo, MCP, Rust services, cloud services, or AI services.
