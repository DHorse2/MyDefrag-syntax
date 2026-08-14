# Execution Record

<!-- markdownlint-disable MD013 -->

## Run

| Field | Value |
| --- | --- |
| Schema version | 1.0 |
| Execution ID | 49e7dcd3 |
| Status | completed |
| Execution-record mode | Detailed |
| Started | 2026-08-12T21:27:00.717Z |
| Finished | 2026-08-12T21:37:06.356Z |
| Computer | Mdm-TJ9DTHV |
| Initiating agent | codex |
| Agents | codex |
| Project root | D:\Script\MyDefrag-syntax |
| Working directory | D:\Script\MyDefrag-syntax |

## Inputs

- Prompt path: chat-user-request

## Scope

| Field | Value |
| --- | --- |
| Projects | mdm-mydefrag-syntax |
| Tasks | diagnose-destructive-language-rebuilds |
| Prompt paths | chat-user-request |

## Actions

| Sequence | Timestamp | Event Type | Status | Summary |
| --- | --- | --- | --- | --- |
| 1 | 2026-08-12T21:27:00.747Z | execution_initialized | running | Initialized portable run archive. |
| 2 | 2026-08-12T21:36:50.803Z | analysis | succeeded | Traced full build, report, targeted build-component, Locale Maintenance save/rebuild, authoritative source loading, generated snapshots, and rollback paths. |
| 3 | 2026-08-12T21:36:51.418Z | diagnostic | succeeded | Confirmed destructive targeted behavior in a disposable fixture: a pre-existing machine-generated translation was replaced by canonical English with fallbackLocale en. |
| 4 | 2026-08-12T21:36:52.025Z | history | succeeded | Compared reachable catalog snapshots and reflog-era commits. No existing entry was removed or transitioned from non-fallback to fallback in committed history; fallback increases were newly added keys. |
| 5 | 2026-08-12T21:36:52.560Z | finding | succeeded | Identified a reporting defect and durability gap. Completeness counts authored overrides plus translations generated in the current invocation, but ignores preserved machine-generated catalog entries. Most machine translations are not persisted under language/locales. |
| 6 | 2026-08-12T21:36:53.200Z | validation | succeeded | Focused automated suites passed and diagnostic commands left language source/generated paths unchanged. |
| 7 | 2026-08-12T21:37:06.462Z | execution_finished | completed | Diagnosed language catalog replacement risk without editing the system. Broad rebuilds are additive, targeted build-component is destructive, current committed history shows additions rather than translation loss, and completeness reporting ignores preserved generated translations. |

## Commands

| Sequence | Timestamp | Command or Tool Call | Exit Code | Status |
| --- | --- | --- | --- | --- |
| 3 | 2026-08-12T21:36:51.418Z | Disposable Node fixture invoking buildLocaleComponentOutput without DeepL | Unavailable | succeeded |
| 4 | 2026-08-12T21:36:52.025Z | git log, git reflog, git blame, and JSON blob comparisons across 3b661150, 4262ec9a, 8bf9d27c, e64e7342, reflog commits, and HEAD | Unavailable | succeeded |
| 6 | 2026-08-12T21:36:53.200Z | npm run test:locale-app; npm run test:language-report; git status --short -- scoped language paths | Unavailable | succeeded |

## Files

### Read

- build/scripts/build-language.js;build/language/translation/deepl-translation-service.js;build/mdl-locale-app/services/locale-maintenance-service.js;build/mdl-locale-app/repositories/locale-catalog-repository.js;build/mdl-language-app/services/build-integration.js;language/schema/locale-component-catalog.schema.json;language/schema/translation-status.schema.json;docs/build-language.md

### Changed

None recorded.

## Decisions

None recorded.

## Diagnostics

- Broad builds merge missing entries and preserve existing objects. build-component writes a complete replacement for one selected generated component.
- Uncommitted translations lost during the recent filesystem/reset incident cannot be recovered or proven from Git history.
- Saved report can state zero translated while current generated catalogs contain 3775 preserved machine-generated entries.
- diagnostic: Confirmed destructive targeted behavior in a disposable fixture: a pre-existing machine-generated translation was replaced by canonical English with fallbackLocale en.

## Validation

| Sequence | Timestamp | Check | Status |
| --- | --- | --- | --- |
| 6 | 2026-08-12T21:36:53.200Z | Focused automated suites passed and diagnostic commands left language source/generated paths unchanged. | succeeded |

## Artifacts

None recorded.

## Outcome

| Field | Value |
| --- | --- |
| Status | completed |
| Finished | 2026-08-12T21:37:06.356Z |
| Summary | Diagnosed language catalog replacement risk without editing the system. Broad rebuilds are additive, targeted build-component is destructive, current committed history shows additions rather than translation loss, and completeness reporting ignores preserved generated translations. |

## Follow-up

None recorded.

## Metrics

| Metric | Value |
| --- | --- |
| elapsedMilliseconds | 605639 |
| journalEvents | 7 |
| commands | 3 |
| failures | 0 |
| retries | 0 |
| fallbacks | 0 |
| filesRead | 1 |
| filesChanged | 0 |
| scans | 0 |
| duplicateWork | 0 |
| validationEvents | 1 |
| artifacts | 0 |
| tokens | Unavailable |
| cost | Unavailable |

<!-- markdownlint-enable MD013 -->
