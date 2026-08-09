# Codex Task — Establish Declarative Multilingual Architecture for MyDefrag Syntax

## Task Status

Ad hoc implementation task.

## Objective

Establish the first implementation phase of a declarative multilingual architecture for the MyDefrag Syntax VSCodium extension.

This phase must create the architecture, schemas, loaders, build outputs, and initial English source definitions while preserving all current extension, server, parser, preview, diagnostic, and runtime behavior.

The implementation must prepare the project for:

- Localized extension UI
- Localized language-server diagnostics
- Localized preview output
- Canonical keyword translation
- Source-to-source translation
- Project-scoped variable-name translation
- Mandarin and selected African-language support
- Community-reviewed translation contributions
- Component-specific language catalog loading
- Low-resource operation on Windows 8 and later

Do not attempt to complete all translations in this task.

## Product Boundaries

The MyDefrag Syntax extension is a standalone product.

It may integrate with TaylorDo, AI tools, and the broader MCP platform, but it must not depend on TaylorDo, MCP, Rust services, cloud services, or AI services for ordinary operation.

The extension must remain useful for general MyDefrag users outside TaylorDo.

## Compatibility Requirements

- Preserve compatibility with VSCodium and the existing Node.js extension architecture.
- Preserve Windows 8 and later as the minimum TaylorDo execution target.
- Do not introduce a Rust build requirement.
- Do not require a cloud localization platform.
- Do not require an online translation service.
- Preserve batch-oriented workflows and compatibility.
- Use UTF-8 consistently.
- Keep runtime catalogs compact and load only required component chunks.
- Avoid unnecessary memory retention and workspace-wide duplication.

## Core Architectural Rules

### Repository-Owned Language Definitions

Language definitions must be first-class, reviewed, version-controlled project assets.

The repository is the authoritative source.

External tools may assist translation work, but the project must not depend on their schemas, availability, export formats, licensing, ordering behavior, or validation limitations.

### Structured Flat Keys

Runtime catalogs may use ordered flat key/value entries, but keys must preserve structure and category.

Use a pattern comparable to:

```ini
extension.command.openPreview.title=Open Preview
server.diagnostic.expectedYesNo.message=Expected 'yes' or 'no'
preview.annotation.includeBegin.text=BEGIN [{depth}] {path}
language.keyword.volumeSelect.text=VolumeSelect
```

Keys must identify:

- Component
- Category
- Semantic identity
- Presentation role

### Semantics Stay in Code

Control flow, exception handling, catches, parser behavior, severity, recovery, state changes, and validation logic must remain explicit in code.

Human-readable messages may be keyed.

Do not move behavioral semantics into catalogs.

Code should remain understandable without opening a translation file.

### Component Catalogs

Components must load only the language chunks they require.

Initial component boundaries:

- Extension
- Server
- Parser diagnostics
- Preview
- Diagnostic Explorer
- Translator
- Documentation and validation tooling

### Canonical Parser Input

The parser must continue to consume canonical MyDefrag syntax.

Future localized source processing will follow this pipeline:

```text
Localized source
→ source-language translator
→ canonical MyDefrag source
→ tokenizer
→ parser
→ diagnostics
```

Do not make the parser multilingual in this phase.

Strings and user-authored comments must remain unchanged by keyword translation.

### Stable Semantic IDs

Prepare language elements to have stable semantic identities separate from rendered spelling.

For example:

```json
{
  "id": "structure.volumeSelect",
  "canonical": "VolumeSelect",
  "category": "structure.volume",
  "parent": "script"
}
```

The existing English keyword spelling must no longer be treated as the only possible semantic identity in the new declarative model.

Do not break existing keyword lookup in this phase.

### Unique Keyword Mapping

Each locale must have exactly one preferred generated spelling for each semantic keyword.

The architecture must detect duplicate or ambiguous mappings.

Input aliases may be designed for later support, but generated output must always be deterministic.

### User and Generated Comments

User-authored comments:

- Remain unchanged by default
- Are not converted into catalog keys
- May be translated later only through an explicit user action

Generated comments and annotations:

- Must use language keys
- Must retain message key and arguments where practical
- Must be rerenderable into another locale

Examples include preview annotations, generated-file notices, and build comments.

### Project-Scoped Variable Translation

Prepare for variable-name translation as a project-scoped feature.

Variable translation must eventually use symbol identity and reference resolution, not text replacement.

The architecture must anticipate:

- Declaration mapping
- Reference mapping
- Include-spanning references
- Collision detection
- Canonical names
- Locale-specific names
- Project-specific translation maps

Do not implement full variable translation unless it is naturally required by the foundation work.

### Preview Modes

Prepare the preview architecture for multiple modes.

Required design targets:

- Existing annotated expanded preview
- Code-only expanded preview
- Canonical preview
- Localized preview
- Bilingual preview
- Semantic review preview
- Translation difference preview

This task should introduce the mode model and isolate annotation rendering from code generation.

Preserve the existing preview behavior as the default.

### Language Directives

Prepare for an extension-owned source-language directive such as:

```text
; @mydfrg-language zh-Hans
```

The directive must not conflict with canonical MyDefrag runtime syntax.

Design for future code actions:

- Add missing directive
- Correct invalid directive
- Normalize localized keywords
- Convert document to canonical source
- Convert document to another supported language
- Apply Fix All where supported

Do not implement every code action in this phase unless the architecture makes a small initial implementation safe.

## Initial Locale Test Set

Create locale metadata entries or placeholders for:

- `en`
- `zh-Hans`
- `sw`
- `am`
- `ha`
- `yo`
- `ig`
- `zu`
- `xh`
- `af`
- `ar`
- `fr`
- `pt`

English is the canonical initial catalog.

Non-English catalogs may contain placeholders, review status, or a minimal representative sample, but they must not pretend to be complete or approved translations.

Mark unreviewed translations clearly.

## Required Repository Structure

Create a clean structure comparable to:

```text
language/
├── schema/
├── canonical/
├── locales/
├── tooling/
└── generated/

build/
└── language/
    ├── catalogs/
    ├── keyword-maps/
    ├── variable-maps/
    └── reports/
```

Adapt paths to the current repository conventions when necessary.

Do not place authored language definitions under generated output.

## Required Schemas

Create and validate schemas for at least:

- Locale metadata
- Component catalog entries
- Semantic keyword definitions
- Diagnostic/message definitions
- Translation status metadata
- Placeholder arguments
- Future project variable mappings

Schemas must support review states such as:

- Draft
- Machine-generated
- Native-review-required
- Reviewed
- Approved
- Deprecated

## Required Build Tooling

Add a Node.js build or validation tool that:

- Reads canonical definitions
- Reads locale definitions
- Validates schemas
- Preserves deterministic ordering
- Produces component-specific runtime catalogs
- Produces canonical-to-locale keyword maps
- Produces locale-to-canonical keyword maps
- Detects duplicate keyword mappings
- Detects placeholder mismatches
- Detects missing required keys
- Detects extra unknown keys
- Detects malformed locale metadata
- Produces translation-completeness reports
- Produces collision reports
- Exits nonzero for unsafe build errors

Add appropriate `npm` scripts.

Suggested script names may include:

```json
{
  "language:validate": "...",
  "language:build": "...",
  "language:report": "..."
}
```

Use project naming conventions where better names already exist.

## Initial English Extraction

Create initial English declarative definitions for representative and important existing strings from:

- `package.json`
- `src/extension.js`
- `src/server/server.js`
- `src/server/parser.js`
- `src/preprocess/mydefrag-preprocess.js`
- Diagnostic navigation modules
- Existing keyword data

Do not attempt a risky all-at-once replacement.

The first phase should prove the architecture by migrating a controlled set of strings from each component.

Record remaining hard-coded human-facing strings in a generated or authored migration report.

## Runtime Loader

Create a small locale/catalog loader that:

- Defaults safely to English
- Loads only requested components
- Supports fallback to English
- Handles missing keys deterministically
- Preserves message-key visibility for diagnostics and debugging
- Does not silently substitute unrelated text
- Does not require network access
- Works in extension-host, language-server, and standalone preview contexts

Avoid coupling the loader directly to VSCodium APIs so it can run in the server and preview processes.

## Message Formatting

Implement safe placeholder formatting.

Requirements:

- Named placeholders are preferred.
- Placeholder names must be validated across locales.
- Missing arguments must be detectable.
- Extra arguments should be reportable in validation.
- Formatting must not evaluate code.
- Formatting must not allow catalog values to alter control flow.

Example:

```text
server.diagnostic.unexpectedStatement.message=Unexpected statement '{statement}'
```

## Diagnostic Identity

Introduce or formalize stable diagnostic codes for a representative set of parser and server diagnostics.

A diagnostic should eventually carry:

- Stable code
- Severity
- Message key
- Message arguments
- Rendered message
- Source
- Range

Preserve compatibility with standard LSP diagnostics.

Do not require the extension client to translate server messages in this phase unless that design is clearly superior and fully compatible.

## Preview Refactoring

Refactor preview generation enough to separate:

- Code expansion
- Annotation generation
- Locale rendering
- Output mode selection

The existing annotated preview must remain the default and must continue to work.

Add at least one code-only mode if it can be implemented safely without broad unrelated changes.

Do not translate user string literals.

Do not translate user comments.

## Low-Resource Requirements

The implementation must be appropriate for low-end Windows hardware.

- No Rust dependency
- No database dependency
- No always-running translation service
- No loading every locale at startup
- No duplicated full-project translated trees in memory
- No mandatory workspace-wide AI processing
- Prefer streaming or per-file processing where practical
- Keep generated maps compact
- Cache only when useful and bounded
- Make expensive reports build-time operations rather than editor-startup operations

## Community Contribution Support

Add documentation and templates for community translation contributions.

Include:

- How to add or update a locale
- How to run validation
- How to interpret completeness reports
- How to mark review status
- How to report a translation issue
- How keyword uniqueness is enforced
- How placeholders are validated
- Why machine translations are not automatically approved
- How to identify native-review-required entries

Add a translation issue template if the repository already uses GitHub issue templates or if adding one is appropriate.

## Required Documentation

Create or update documentation covering:

- Architecture overview
- Canonical versus localized source
- Component catalog loading
- Keyword translation model
- Generated versus user-authored comments
- Preview mode model
- Project-scoped variable translation design
- Locale contribution workflow
- Build and validation commands
- Low-resource and Windows 8+ constraints
- Product separation from TaylorDo and MCP

## Non-Goals for This Phase

Do not:

- Fully translate TaylorDo into Mandarin
- Claim any machine-generated locale is production-ready
- Implement every planned locale
- Rewrite the parser
- Replace canonical MyDefrag syntax
- Add a Rust component
- Add an MCP dependency
- Add a cloud dependency
- Remove batch compatibility
- Change the current minimum runtime assumptions
- Break existing extension commands, diagnostics, previews, or packaging
- Translate user strings or comments automatically
- Perform blind project-wide variable replacement

## Validation Requirements

Run and record:

- Existing project build
- Existing packaging command where practical
- Language schema validation
- Language catalog build
- Duplicate mapping checks
- Placeholder checks
- English fallback tests
- Component loading tests
- Preview regression test
- Code-only preview test if implemented
- Existing parser smoke tests or representative script validation
- Windows path handling checks

If an existing test harness is unavailable, add focused Node-based tests for the new language infrastructure.

## Required Output

At completion, provide:

- Summary of architecture implemented
- Current behavior preserved
- New commands and build scripts
- Validation results
- Known limitations
- Recommended next phase
- Complete list of created files by path
- Complete list of modified files by path
- Revision log
- Any unresolved design decisions
- Any translation content that still requires native review

## Recommended Next Phase

After this foundation is complete, recommend a second Codex task focused on:

- Full English string extraction
- Mandarin catalog generation marked for review
- Keyword translator implementation
- Source-language directive and code actions
- Canonical and bilingual preview modes
- Project variable symbol indexing
- Translation review workflow

Do not begin the second phase during this task unless explicitly instructed.
