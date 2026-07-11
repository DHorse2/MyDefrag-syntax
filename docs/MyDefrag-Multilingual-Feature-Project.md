# MyDefrag Multilingual Feature Project

## Table of Contents

- [Purpose](#purpose)
- [Product Context](#product-context)
  - [MyDefrag Syntax Extension](#mydefrag-syntax-extension)
  - [TaylorDo](#taylordo)
  - [MCP and AI Systems](#mcp-and-ai-systems)
- [Strategic Principles](#strategic-principles)
  - [Repository-Owned Language Definitions](#repository-owned-language-definitions)
  - [Structured Flat Catalogs](#structured-flat-catalogs)
  - [Semantics Remain in Code](#semantics-remain-in-code)
  - [Canonical Execution Language](#canonical-execution-language)
  - [Component-Specific Catalog Loading](#component-specific-catalog-loading)
  - [Unique Keyword Mapping](#unique-keyword-mapping)
  - [Comments](#comments)
  - [Variable-Name Translation](#variable-name-translation)
  - [Preview as a Language Workbench](#preview-as-a-language-workbench)
  - [Source-Language Directives](#source-language-directives)
  - [Translation Between Languages](#translation-between-languages)
- [Initial Language Strategy](#initial-language-strategy)
  - [Canonical Language](#canonical-language)
  - [Mandarin Objective](#mandarin-objective)
  - [African-Language Test Set](#african-language-test-set)
- [Translation Research and AI Assistance](#translation-research-and-ai-assistance)
- [Community Contribution Model](#community-contribution-model)
- [Compatibility and Resource Strategy](#compatibility-and-resource-strategy)
  - [Windows Compatibility](#windows-compatibility)
  - [Low-Resource Operation](#low-resource-operation)
  - [Modern Interface Strategy](#modern-interface-strategy)
- [Product Separation Strategy](#product-separation-strategy)
- [Roadmap](#roadmap)
  - [Phase 1 — Declarative Multilingual Foundation](#phase-1-—-declarative-multilingual-foundation)
  - [Phase 2 — Locale Expansion and Translation Supply Tables](#phase-2-—-locale-expansion-and-translation-supply-tables)
  - [Phase 3 — Canonical Keyword Translation](#phase-3-—-canonical-keyword-translation)
  - [Phase 4 — Preview Language Workbench](#phase-4-—-preview-language-workbench)
  - [Phase 5 — Code Actions and Fix All](#phase-5-—-code-actions-and-fix-all)
  - [Phase 6 — Variable Translation and Symbol Harvesting](#phase-6-—-variable-translation-and-symbol-harvesting)
  - [Phase 7 — Fully Mandarin TaylorDo](#phase-7-—-fully-mandarin-taylordo)
  - [Phase 8 — African-Language Validation](#phase-8-—-african-language-validation)
  - [Phase 9 — Community Translation Program](#phase-9-—-community-translation-program)
  - [Phase 10 — Low-Resource and Windows Compatibility Validation](#phase-10-—-low-resource-and-windows-compatibility-validation)
- [Implementation To-Do List](#implementation-to-do-list)
- [Phase 1 Implementation Summary](#phase-1-implementation-summary)
  - [Completion Status](#completion-status)
  - [Key Changes](#key-changes)
  - [Main Files](#main-files)
  - [Generated Outputs](#generated-outputs)
  - [Validation Results](#validation-results)
  - [Packaging Result](#packaging-result)
  - [Markdown Lint Result](#markdown-lint-result)
  - [Existing Pending Changes](#existing-pending-changes)
  - [Phase 1 Outcome](#phase-1-outcome)

## Purpose

This document consolidates the design, strategy, roadmap, implementation plan, and current status for multilingual support in the MyDefrag Syntax VSCodium extension and its use with TaylorDo.

The goal is not limited to localizing interface text. The project is intended to become a declarative multilingual language front end for MyDefrag that supports:

- Localized extension user interfaces
- Localized diagnostics and preview output
- Translated MyDefrag keywords
- Translation between supported source languages
- Project-scoped variable-name translation
- Canonical MyDefrag build output
- Community-reviewed translation contributions
- Offline and low-resource operation
- Windows 8 and later compatibility
- Optional modern AI-assisted authoring and review

The central architectural invariant is:

```text
Many human languages
→ one canonical semantic model
→ one validated MyDefrag execution language
```

## Product Context

### MyDefrag Syntax Extension

The MyDefrag Syntax extension is a standalone language product.

Its responsibilities include:

- Syntax highlighting
- Parsing and validation
- Diagnostics
- Navigation
- Preview generation
- Translation support
- Localized authoring
- Canonical build generation

It may integrate with TaylorDo, AI tools, and the broader MCP platform, but it must not depend on them for ordinary operation.

### TaylorDo

TaylorDo is a separate product that uses MyDefrag as its execution foundation.

TaylorDo is intended both for advanced storage-management use and for helping users in lower-resource countries extend the usefulness of existing Windows computers and storage devices.

TaylorDo is designed to run on Windows 8 and later. Its extensive batch-oriented implementation is a deliberate compatibility choice, not merely historical residue.

### MCP and AI Systems

The MCP and AI systems are separate products and optional enhancement layers.

They may provide:

- Translation assistance
- Terminology research
- Project-wide semantic analysis
- Documentation generation
- Advanced dashboards
- Community contribution support
- Large-scale indexing and validation

They must not increase the minimum requirements of the MyDefrag extension or TaylorDo runtime.

## Strategic Principles

### Repository-Owned Language Definitions

Language definitions are first-class project assets.

They must be:

- Reviewed
- Version controlled
- Declarative
- Buildable
- Validated
- Auditable
- Independent of external localization systems

External tools may assist translation work, but the repository remains authoritative.

This avoids inheriting deficiencies from external tools, including:

- Schema limitations
- Export limitations
- Ordering loss
- Context loss
- Metadata loss
- Availability risks
- Licensing constraints
- Workflow constraints
- Incomplete validation
- Unsupported project-specific semantics

### Structured Flat Catalogs

Runtime catalogs may use ordered flat key/value storage.

Flat storage does not mean structureless storage.

Keys must preserve component, category, semantic identity, and role.

Example:

```ini
extension.command.openPreview.title=Open Preview
server.diagnostic.expectedYesNo.message=Expected 'yes' or 'no'
preview.annotation.includeBegin.text=BEGIN [{depth}] {path}
language.keyword.volumeSelect.text=VolumeSelect
```

The key structure should support:

- Direct lookup
- Category browsing
- Component loading
- Validation
- Documentation generation
- Translation review
- Completeness reporting

### Semantics Remain in Code

Behavioral semantics must remain explicit in source code.

The following remain in code:

- Control flow
- Parser behavior
- Exception handling
- Catch blocks
- Severity selection
- Recovery behavior
- State transitions
- Validation rules
- Error classification

Human-readable text may be keyed, but catalogs must not become hidden executable logic.

A diagnostic may carry:

- Stable code
- Severity
- Message key
- Message arguments
- Rendered message
- Source
- Range

Example:

```javascript
reportInternalFailure({
    code: 'parser.unexpectedFailure',
    messageKey: 'server.internal.unexpectedParserFailure',
    severity: Severity.Error,
    cause: error
});
```

### Canonical Execution Language

The parser should consume canonical MyDefrag syntax.

Localized source processing should follow this pipeline:

```text
Localized source
→ source-language translation
→ canonical MyDefrag source
→ tokenizer
→ parser
→ diagnostics
```

The parser should not need separate branches for every language.

Strings remain in the user's native language.

User-authored comments remain unchanged by default.

### Component-Specific Catalog Loading

Components should load only the language chunks they require.

Initial component boundaries are:

| Component | Language responsibility |
| --- | --- |
| Extension | Commands, views, settings, notifications, status bars |
| Server | Diagnostics, hover text, completion descriptions |
| Parser support | Diagnostic presentation keys and codes |
| Preview | Headers, annotations, modes, translation display |
| Diagnostic Explorer | Actions, state labels, categories |
| Translator | Keyword maps, source-language metadata, variable maps |
| Documentation tooling | Complete reviewed definitions |
| Validation tooling | Schemas, completeness, collisions, placeholders |

This supports low-memory operation and preserves clean process boundaries.

### Unique Keyword Mapping

Each semantic keyword has one stable identity.

Each locale has exactly one preferred generated spelling for that semantic keyword.

Example:

```json
{
  "id": "structure.volumeSelect",
  "canonical": "VolumeSelect",
  "category": "structure.volume",
  "parent": "script",
  "translations": {
    "zh-Hans": "卷选择"
  }
}
```

Generated output must always be deterministic.

Aliases may be accepted later, but must never create ambiguity.

### Comments

Comments are divided into two classes.

#### User-Authored Comments

User comments:

- Remain unchanged by default
- Are not converted into catalog keys
- Are not automatically translated
- May be translated later through an explicit command
- May support bilingual review modes

#### Generated Comments and Annotations

Generated comments must be keyed.

Examples include:

- Preview annotations
- Generated-file notices
- Build comments
- Translation metadata
- Canonicalization notes

Generated comments should retain their message key and arguments where practical so they can be rerendered into another language.

### Variable-Name Translation

Variable translation is valid and desirable.

It is more complex than fixed keyword translation because variable meaning is project-scoped.

The intended model is:

```text
Project source
→ symbol discovery
→ declaration/reference graph
→ stable project symbol identities
→ locale-specific variable names
→ canonical variable names
```

Variable translation must not use blind text replacement.

It must account for:

- Declaration sites
- References
- Includes
- Macros
- Scope
- Collision detection
- Definition navigation
- Reference navigation
- Completion
- Diagnostics
- Canonical output

The tokenizer and parser may already provide much of the required foundation by recognizing unique project variable names. Dedicated project-language data may not be required until symbol harvesting and lookup prove otherwise.

### Preview as a Language Workbench

Translation and preview may remain separate internal components, but preview should become the primary review and transformation surface.

Required preview modes include:

| Mode | Purpose |
| --- | --- |
| Annotated Expanded | Existing include-expanded preview with annotations |
| Code Only | Expanded executable code without annotations |
| Canonical | Canonical MyDefrag output |
| Localized | Generated source in a selected language |
| Bilingual | Localized and canonical representations together |
| Semantic | Code with semantic IDs or translation metadata |
| Difference | Source compared with translated or canonical output |

The existing annotated mode remains useful, but some modes must open code only.

This enables additional linguistic features:

- Terminology inspection
- Untranslated-token detection
- Bilingual hover
- Glossary lookup
- Keyword normalization
- Reverse translation
- Translation completeness
- Preferred-term enforcement
- Language-aware documentation
- Community review views

### Source-Language Directives

Documents may declare their source language using an extension-owned directive.

Example:

```text
; @mydfrg-language zh-Hans
```

The directive must not conflict with MyDefrag runtime syntax.

Future code actions should include:

- Add missing directive
- Correct invalid directive
- Normalize translated keywords
- Convert to canonical source
- Convert to another language
- Apply Fix All where supported

### Translation Between Languages

Translation must be syntax-aware.

The safe pipeline is:

```text
Source language
→ tokenization and symbol discovery
→ canonical semantic representation
→ target-language rendering
```

The translator must preserve:

- String literals
- File paths
- Comments unless explicitly translated
- Formatting
- Include relationships
- Macros
- Variable identity
- Line mappings where practical

Translation must not be implemented as global search and replace.

## Initial Language Strategy

### Canonical Language

English is initially the canonical MyDefrag language.

Canonical English source is the execution target expected by MyDefrag.

### Mandarin Objective

A major project goal is a fully Mandarin TaylorDo source tree.

The intended build flow is:

```text
Mandarin TaylorDo source
→ translation and canonicalization
→ canonical MyDefrag source
→ validation
→ execution
```

This includes:

- Mandarin UI
- Mandarin diagnostics
- Mandarin preview
- Mandarin keywords
- Mandarin variables
- Native strings
- Native comments
- Canonical build output

### African-Language Test Set

The selected African-language and regionally important test set is:

- Swahili
- Amharic
- Hausa
- Yoruba
- Igbo
- Zulu
- Xhosa
- Afrikaans
- Arabic
- French
- Portuguese

These languages provide a useful technical test matrix for:

- Latin and non-Latin scripts
- Right-to-left text
- Unicode normalization
- Combining marks
- Capitalization differences
- Locale-specific punctuation
- Long and short word forms
- Regional terminology differences
- Multilingual-country use

The project must not treat Africa as one localization market.

Support should be locale-based, community-reviewed, and culturally aware.

## Translation Research and AI Assistance

AI tools can be used to populate translation supply tables.

A recommended translation table includes:

| Field | Purpose |
| --- | --- |
| Semantic ID | Stable language-independent identity |
| Canonical English | Existing spelling or message |
| Category | Keyword, diagnostic, preview, UI, variable, unit, enum |
| Context | Usage and intended meaning |
| Locale columns | Proposed translation per language |
| Status | Machine-generated, reviewed, approved, disputed |
| Sources | Terminology evidence |
| Notes | Ambiguity, alternatives, regional considerations |

AI can assist with:

- Initial translation lookup
- Terminology comparison
- Collision detection
- Source gathering
- Context explanations
- Candidate ranking
- Completeness analysis
- Table population

Native speakers or knowledgeable community reviewers should approve production wording.

Machine-generated translations must never be silently treated as approved.

## Community Contribution Model

Community translations should be maintained through repository issues and pull requests.

Each translation entry should have sufficient context for review.

Recommended metadata includes:

- Semantic key
- Component
- Category
- Canonical text
- Context
- Placeholders
- Review status
- Source evidence
- Reviewer notes

Review states should include:

- Draft
- Machine-generated
- Native-review-required
- Reviewed
- Approved
- Deprecated

Generated reports should identify:

- Missing translations
- Placeholder mismatches
- Unknown keys
- Stale entries
- Keyword collisions
- Variable collisions
- Unsupported characters
- Untranslated English
- Invalid locale metadata
- Source files lacking directives
- Native-review-required entries

## Compatibility and Resource Strategy

### Windows Compatibility

TaylorDo is designed for Windows 8 and later.

The multilingual architecture must preserve:

- Batch compatibility
- Conservative PowerShell usage
- Offline operation
- UTF-8 file handling
- No Windows 10 or Windows 11-only dependency
- No recent Windows API requirement
- Canonical generated scripts
- Existing launcher and batch workflows

### Low-Resource Operation

The MyDefrag extension should remain practical on low-end hardware.

The extension currently uses:

- JavaScript
- Node.js
- A language-server process
- Text parsing
- File scanning
- Compact catalogs
- On-demand preview generation

It should not require:

- Rust compilation
- Large native toolchains
- Databases
- Cloud translation services
- Always-running AI services
- Full-project translated copies held in memory

Low-resource design should favor:

- Component-only catalog loading
- Per-file processing
- Bounded caches
- On-demand preview
- Deferred reports
- Limited background scanning
- Open-file-first validation
- Optional low-memory operating profiles

### Modern Interface Strategy

Modern AI tools may be used to build an attractive interface for capable systems.

The modern interface is an optional presentation layer over a conservative execution core.

```text
Modern UI and AI assistance
→ declarative adapters and generated assets
→ stable Windows 8+ compatible runtime
```

Modern systems may receive:

- Rich diagnostics
- Visual configuration
- Translation review interfaces
- Dashboards
- AI-assisted terminology
- Semantic previews
- Guided fixes
- Project visualization

These must remain enhancements rather than minimum runtime requirements.

## Product Separation Strategy

The MyDefrag extension, TaylorDo, and MCP remain separate products because they have different:

- Product identities
- User groups
- Responsibilities
- Release cycles
- Failure domains
- Installation choices
- Host environments
- Resource requirements
- Long-term evolution paths

The MyDefrag extension must remain usable:

- Without TaylorDo
- Without MCP
- Without AI services
- By general MyDefrag users

TaylorDo must remain usable:

- Without VSCodium
- Without MCP
- On older Windows hardware
- Through canonical generated source and batch workflows

MCP and AI integration remain optional enhancements.

## Roadmap

### Phase 1 — Declarative Multilingual Foundation

Status: Completed.

Goals:

- Establish repository-owned language definitions
- Add schemas
- Add canonical catalogs
- Add locale registry
- Add component catalog outputs
- Add keyword maps
- Add validation and reporting
- Add runtime catalog loading
- Preserve all existing behavior

### Phase 2 — Locale Expansion and Translation Supply Tables

Goals:

- Expand locale samples
- Confirm review status metadata
- Build translation supply tables
- Begin AI-assisted terminology harvesting
- Add source evidence
- Add native-review workflow
- Populate Mandarin first
- Populate selected African-language test entries
- Keep project variable maps optional until symbol behavior is proven

### Phase 3 — Canonical Keyword Translation

Goals:

- Translate localized keywords to canonical MyDefrag
- Generate canonical-to-locale maps
- Generate locale-to-canonical maps
- Enforce unique keyword mapping
- Preserve strings
- Preserve comments
- Preserve formatting
- Add source-language detection
- Add source-language directive support

### Phase 4 — Preview Language Workbench

Goals:

- Add code-only preview
- Add canonical preview
- Add localized preview
- Add bilingual preview
- Add semantic preview
- Add difference preview
- Separate code generation from annotation rendering
- Add linguistic review features

### Phase 5 — Code Actions and Fix All

Goals:

- Add missing language directive
- Correct invalid directive
- Normalize localized keywords
- Convert file to canonical source
- Convert file to selected language
- Apply workspace-level fixes
- Support Fix All where safe

### Phase 6 — Variable Translation and Symbol Harvesting

Goals:

- Confirm tokenizer and parser handling of project variables
- Build declaration/reference indexing
- Assign stable symbol identities
- Harvest project variable names
- Generate translation supply tables
- Populate translations using AI-assisted lookup
- Detect collisions
- Translate declarations and references safely
- Preserve macros and include relationships

### Phase 7 — Fully Mandarin TaylorDo

Goals:

- Translate TaylorDo keywords
- Translate project variables
- Translate interface text
- Translate diagnostics
- Translate preview output
- Preserve native strings
- Preserve or explicitly translate comments
- Generate canonical MyDefrag output
- Validate complete project execution

### Phase 8 — African-Language Validation

Goals:

- Test selected African-language catalogs
- Validate Unicode behavior
- Validate right-to-left behavior
- Validate terminology
- Validate keyword uniqueness
- Validate preview rendering
- Validate source translation
- Record native review gaps

### Phase 9 — Community Translation Program

Goals:

- Publish contribution guidance
- Improve issue templates
- Add translation review reports
- Add contributor recognition
- Add locale status dashboards
- Support community corrections
- Maintain approved terminology

### Phase 10 — Low-Resource and Windows Compatibility Validation

Goals:

- Test Windows 8+ runtime workflows
- Test low-memory VSCodium operation
- Test batch workflows
- Test offline catalogs
- Test component loading
- Test preview on modest hardware
- Ensure modern UI remains optional
- Document minimum and enhanced profiles

## Implementation To-Do List

Correct. That section is a **requirements list**, not an implementation to-do list.

A real to-do list should contain discrete, actionable, sequenced work items with a clear completion state. The document should use:

## Requirements

Keep the renamed section largely as-is because it defines enduring architectural and product constraints.

## Implementation To-Do List

Replace it with phase-oriented tasks such as:

- [x] Establish repository-owned multilingual definitions.
- [x] Add language schemas and canonical catalogs.
- [x] Add locale registry and component catalog generation.
- [x] Add deterministic keyword-map generation.
- [x] Add collision, placeholder, and completeness reporting.
- [x] Add runtime component catalog loader.
- [x] Add translation contribution documentation and issue template.
- [ ] Expand the locale sample set and review metadata.
- [ ] Create the translation supply-table format.
- [ ] Populate initial Mandarin terminology candidates.
- [ ] Populate initial African-language test terminology.
- [ ] Record evidence and review status for each translation.
- [ ] Implement canonical keyword translation.
- [ ] Add source-language directive detection.
- [ ] Add locale-to-canonical source conversion.
- [ ] Add canonical-to-locale source rendering.
- [ ] Add code-only preview mode.
- [ ] Add canonical preview mode.
- [ ] Add localized preview mode.
- [ ] Add bilingual preview mode.
- [ ] Add semantic and difference preview modes.
- [ ] Add language-aware code actions.
- [ ] Add safe Fix All operations.
- [ ] Verify tokenizer handling of localized variable names.
- [ ] Verify parser behavior after variable-name canonicalization.
- [ ] Build project symbol indexing.
- [ ] Implement project-scoped variable translation.
- [ ] Translate declarations and references safely.
- [ ] Generate a fully Mandarin TaylorDo source tree.
- [ ] Generate canonical MyDefrag output from localized TaylorDo.
- [ ] Validate the complete canonical output.
- [ ] Run African-language compatibility tests.
- [ ] Run Windows 8+ compatibility tests.
- [ ] Run low-memory VSCodium tests.
- [ ] Validate batch and offline workflows.
- [ ] Establish native review and approval workflow.
- [ ] Publish locale status and completeness reports.

That gives the document both:

- **Requirements** — what must remain true
- **Implementation To-Do List** — what work remains and what is already complete

## Phase 1 Implementation Summary

### Completion Status

The declarative multilingual architecture foundation has been implemented.

### Key Changes

The implementation added:

- Language schemas
- Canonical catalogs
- Locale registry
- English catalog
- Mandarin sample catalog
- Component-specific generated catalogs
- Bidirectional keyword maps
- Translation reports
- Runtime catalog loader
- Package scripts
- Documentation
- Translation issue template
- Execution record

### Main Files

Key implementation files include:

```text
language/
build/language/
scripts/build-language.js
scripts/test-language-runtime.js
src/shared/languageCatalog.js
docs/MULTILINGUAL_ARCHITECTURE.md
docs/TRANSLATION_CONTRIBUTING.md
.github/ISSUE_TEMPLATE/translation.yml
```

### Generated Outputs

The first phase generated:

- 13 locale outputs
- 8 component catalogs
- 26 keyword maps
- Translation completeness reports
- Keyword collision reports
- Migration reports
- Variable-map example output

### Validation Results

The following commands passed:

```text
npm run language:validate
npm run language:build
npm run language:report
npm run test:language
```

Additional validation:

- New scripts passed `node --check`
- Existing parser passed `node --check`
- Existing preprocessor passed `node --check`
- Keyword collisions: 0
- VSIX package creation succeeded

### Packaging Result

The build created:

```text
artifacts/mydefrag-syntax-0.4.0.vsix
```

Installation or reinstall validation was blocked because VSCodium profile and extension files were locked.

VSCodium must be restarted or closed before install validation is repeated.

### Markdown Lint Result

Markdown lint was attempted, but `npx` failed with `EACCES` before linting began.

This was an environment or permissions failure, not a reported Markdown content failure.

### Existing Pending Changes

`package.json` already contained unrelated pending edits.

The intended multilingual change was the addition of the language-related script block.

The existing build process also modified:

```text
artifacts/mydefrag-syntax-0.4.0-Release.vsix
```

### Phase 1 Outcome

The first phase successfully established the multilingual foundation without changing current parser, server, extension, preview, diagnostic, or packaging behavior.

The next phase is now able to focus on locale expansion, translation supply tables, AI-assisted terminology harvesting, and preparation for canonical keyword translation.
