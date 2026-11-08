# Tag Index: MdmMydefragSyntax

Shared tag meanings are defined in `D:\AI\.AI\Standards\Shared_Tag_Index.md`.
This project index is seeded from the canonical component catalogs, extension
configuration, source tree, documentation, and August run evidence.

## Project Identity

- Project ID: `mdm-mydefrag-syntax`
- Project root: `D:\Script\MyDefrag-syntax`
- Project tag: `project/mdm-mydefrag-syntax`

## Component Tags

<!-- markdownlint-disable MD013 -->

| Tag | Description | Cardinality and applicability | Indexed artifacts |
| --- | --- | --- | --- |
| `project/mdm-mydefrag-syntax` | Validated MyDefrag-syntax identity. | Exactly one on project artifacts. | `.codex\ai-project.json`; `Status\` |
| `component/extension` | VSCodium extension host commands, settings, status, and messages. | One or more components where applicable. | `package.json`; `src\extension.js` |
| `component/server` | Language-server diagnostics and workspace validation. | One or more components where applicable. | `src\server\` |
| `component/parser` | Parser behavior and stable diagnostic identities. | One or more components where applicable. | `src\server\parser.js`; `syntaxes\` |
| `component/preview` | Preview generation and report annotations. | One or more components where applicable. | `src\preprocess\mydefrag-preprocess.js`; `language\canonical\component-catalog.json` |
| `component/diagnostic-explorer` | Diagnostic navigation tree, status, and UI. | One or more components where applicable. | `src\diagnostics\` |
| `component/translator` | Language-maintenance app and catalog migration. | One or more components where applicable. | `build\mdl-language-app\` |
| `component/locales` | Locale-maintenance app and targeted catalog rebuilds. | One or more components where applicable. | `build\mdl-locale-app\` |
| `component/docs` | Documentation and contribution workflow strings. | One or more components where applicable. | `docs\`; `language\canonical\components.json` |
| `component/tooling` | Build, validation, reporting, and migration tools. | One or more components where applicable. | `build\scripts\`; `scripts\` |
| `component/package` | Extension package and project metadata. | One or more components where applicable. | `package.json`; `.vscodeignore` |

## Area And Language-Feature Tags

| Tag | Description | Cardinality and applicability | Indexed artifacts |
| --- | --- | --- | --- |
| `area/catalogs` | Canonical and locale component catalogs. | One or more classifications where applicable. | `language\canonical\`; `language\locales\` |
| `area/localization` | Translation, locale, and fallback behavior. | Shared meaning; index when used locally. | `language\locales\`; `build\language\translation\` |
| `area/migration` | Source-string discovery and catalog migration. | One or more classifications where applicable. | `build\mdl-language-app\services\migration-source-transform.js`; `build\language\reports\migration-report.json` |
| `area/help` | MyDefrag Help corpus and editor integration. | Shared meaning; index when used locally. | `docs\MyDefrag Help\`; `src\server\hoverProvider.js` |
| `area/testing` | Extension, server, app, and report validation. | One or more classifications where applicable. | `src\**\*.test.js`; `build\mdl-language-app\tests\` |
| `area/project-status` | Monthly MyDefrag-syntax reporting. | One on monthly reports. | `Status\*.md` |
| `language-feature/hover` | Help-backed editor hover. | One or more language features where applicable. | `src\server\hoverProvider.js` |
| `language-feature/diagnostics` | Parser, server, and navigation diagnostics. | One or more language features where applicable. | `src\diagnostics\`; `src\server\` |
| `language-feature/inline-completion` | Inline keyword prediction and completion points. | One or more language features where applicable. | `src\completion\` |
| `language-feature/include-directive` | Include directive parsing, hover, and diagnostics. | One or more language features where applicable. | `src\server\`; `docs\MyDefrag Help\` |

## Conditional And Workflow Index

| Tag | Local applicability | Indexed artifacts |
| --- | --- | --- |
| `diagnostic/startup-hang` | Language-app startup delay evidence. | `runs\2026-08-11\`; `runs\2026-08-12\` |
| `constraint/non-destructive` | Catalog and candidate workflows that preserve records and status. | `build\mdl-language-app\`; `runs\2026-08-12\20260812-1448_3bbac6e7_make-language-catalog-updates-nondestructive` |
| `risk/data-loss` | Destructive rebuild or catalog-corruption risk. | `runs\2026-08-12\20260812-1427_49e7dcd3_diagnose-destructive-language-rebuilds` |
| `workflow/migration` | Candidate and source-string migration. | `build\language\reports\migration-report.json` |
| `workflow/translation` | API and human translation workflow. | `build\language\translation\`; `language\locales\` |
| `workflow/validation` | Layered tests and machine-readable reports. | `build\scripts\test-language-report.js`; `runs\2026-08-12\20260812-1644_c06a97f5_Implement-layered-extension-function-tests-and-portable-reporting` |

## Aliases And Deprecations

| Alias or deprecated tag | Replacement | Rule |
| --- | --- | --- |
| `component/language-maintenance-app` | `component/translator` | Preserve legacy use; canonical component ID is translator. |
| `component/locale-maintenance-app` | `component/locales` | Preserve legacy use; canonical component ID is locales. |
| `area/catagories` | `area/catalogs` | Preserve the evidenced source misspelling only where quoted; use catalogs for tags. |

<!-- markdownlint-enable MD013 -->

## Cardinality And Index Maintenance

- Milestones normally include exactly one project, status, and phase tag plus
  at least one component, area, or language-feature tag.
- Conditional tags are omitted when no diagnostic, constraint, risk, or
  workflow dimension applies.
- Add new component values from `language\canonical\components.json` and
  record aliases rather than redefining older values.
- Keep tags on indexed objects; this file provides project-wide discovery and definitions.
