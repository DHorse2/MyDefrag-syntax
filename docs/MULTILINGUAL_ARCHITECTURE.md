# Declarative Multilingual Architecture

## Purpose

MyDefrag Syntax now has a repository-owned multilingual foundation. The first phase is intentionally additive: it defines language metadata, catalog schemas, semantic keyword identities, generated runtime catalogs, and validation reports without changing current extension, server, parser, preview, diagnostic, or packaging behavior.

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

## Canonical Versus Localized Source

The parser continues to consume canonical MyDefrag syntax. This phase does not make the parser multilingual.

The intended future pipeline is:

```text
localized source
-> source-language translator
-> canonical MyDefrag source
-> tokenizer
-> parser
-> diagnostics
```

User string literals and user-authored comments remain unchanged by keyword translation.

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

Input aliases are a future feature. They should not change generated output determinism.

## Generated And User-Authored Comments

User-authored comments remain unchanged by default and are not converted into catalog keys.

Generated comments and annotations should use catalog keys and placeholder arguments where practical, so they can be rerendered in another locale later. Preview include annotations are represented in the initial catalog as:

```text
preview.annotation.includeBegin.text
preview.annotation.includeEnd.text
```

## Preview Mode Model

The current annotated expanded preview remains the default mode.

The declarative mode inventory is in:

```text
language/canonical/preview-modes.json
```

Planned modes include annotated expanded preview, code-only expanded preview, canonical preview, localized preview, bilingual preview, semantic review preview, and translation difference preview. This phase records the mode model; it does not replace preview generation.

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
