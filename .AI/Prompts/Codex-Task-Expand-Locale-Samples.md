# Codex Task — Expand Locale Samples

## Task Identity

- Project: MyDefrag Syntax Extension
- Project root: `D:\Script\MyDefrag-syntax`
- Project plan: `D:\Script\MyDefrag-syntax\docs\MyDefrag-Multilingual-Feature-Project.md`
- Working notes: `D:\Script\MyDefrag-syntax\docs\MyDefrag-Multilingual-Feature-Project-Notes.md`
- Roadmap phase: Phase 2 — Locale Expansion and Translation Supply Tables
- To-do item: Expand Locale Samples
- Execution mode: Implement, validate, document, and stop
- Scope: This task only

## Current Baseline

Phase 1 established the repository-owned multilingual foundation, including:

- Language schemas
- Canonical catalogs
- Locale registry
- English catalog
- Mandarin sample catalog
- Component-specific generated catalogs
- Bidirectional keyword maps
- Translation completeness and collision reports
- Runtime catalog loading
- Language build and validation scripts
- Thirteen generated locale catalogs
- Twenty-six generated keyword maps

Codex previously inspected the project and confirmed that:

- English is complete.
- Mandarin has limited sample coverage.
- The other selected locales currently rely mainly on English fallback.
- The multilingual architecture is sound.
- No implementation changes were made during that analysis.

Do not repeat a full-project architectural analysis. Read the working notes first, inspect the current repository-owned language definitions, and read only the sections of the project plan needed to execute this task accurately.

## Objective

Expand the controlled locale sample data so the existing multilingual foundation is exercised across every registered project locale and across materially different writing systems.

The result must demonstrate that the schemas, catalogs, generators, reports, runtime loader, fallback rules, review metadata, Unicode handling, placeholder handling, and deterministic build process work with representative translated content.

This is sample expansion, not complete localization.

## Architectural Invariants

Preserve these project rules:

- English remains the canonical execution language.
- The parser continues to consume canonical MyDefrag syntax.
- Repository-owned language definitions remain authoritative.
- Runtime catalogs remain declarative.
- Behavioral semantics remain in code.
- Catalogs remain component-specific.
- Existing parser, tokenizer, server, extension, preview, diagnostic, and packaging behavior must not change.
- Existing English fallback behavior must remain available for untranslated entries.
- Machine-generated translations must never be represented as reviewed or approved.
- MyDefrag, TaylorDo, and MCP remain separate products.
- The extension and TaylorDo must remain usable offline and without MCP or AI services.
- Windows 8 and later compatibility and low-resource operation must be preserved.

## Scope Boundaries

### In Scope

- Inspect the existing locale registry, schemas, canonical catalogs, locale catalogs, generated outputs, and language validation scripts.
- Identify the exact locale identifiers already registered by the repository.
- Define a small shared sample set of existing semantic keys.
- Add representative translated sample values for all registered non-English locales.
- Expand Mandarin sample coverage beyond its current minimal state.
- Exercise multiple components and message shapes.
- Use existing review-status and translation metadata structures.
- Add or refine narrowly scoped validation tests only when necessary to prove the samples are handled correctly.
- Regenerate deterministic language outputs and reports.
- Update the multilingual project notes with the implementation result.
- Produce the standard execution record.

### Out of Scope

- Full translation supply tables
- Broad online terminology research
- Source-evidence gathering
- Native-speaker approval
- Complete Mandarin keyword translation
- Complete translation of any locale
- Canonical keyword translation runtime behavior
- Source-language detection or directives
- Variable-name translation
- Symbol harvesting or project symbol indexing
- Preview workbench modes
- Code actions or Fix All
- Main project-plan cleanup
- Fixing the duplicate `Implementation To-Do List` heading
- Removing the editorial text previously observed near the duplicated heading
- VSIX installation or VSCodium restart testing
- Unrelated refactoring or cleanup

Record any discovered issue outside this scope in the notes document, but do not implement it.

## Registered Locale Rule

Do not invent locale identifiers or rename existing locale files.

Derive the exact locale list, locale IDs, display names, writing direction, and fallback relationships from the repository's locale registry and schemas.

The intended language coverage described by the project includes:

- English
- Simplified Chinese or the repository's registered Mandarin locale
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

Use the repository's actual identifiers as the source of truth.

## Required Sample Coverage

Create one explicit, shared sample-key set that can be compared across locales.

The set must use existing semantic keys and include at least:

- One extension command or UI label
- One server diagnostic without placeholders
- One server diagnostic with one or more placeholders
- One preview annotation containing placeholders
- One Diagnostic Explorer action or state label
- One translator or canonical-keyword sample
- One short enum, status, or unit-like value where supported by the current catalogs

The sample set should be large enough to exercise the architecture but small enough to remain clearly non-production sample data.

### Mandarin Coverage

Mandarin is the priority locale.

Expand Mandarin samples across every existing component catalog that can be populated without inventing new product behavior. Reuse the shared sample set and add a limited number of additional entries where needed to exercise component-specific catalogs.

Do not attempt complete Mandarin translation.

### Other Locale Coverage

For every other registered non-English locale:

- Populate the shared sample-key set.
- Preserve English fallback for all non-sample keys.
- Use valid native-script or locale-appropriate candidate text.
- Mark candidate translations using the repository's existing machine-generated and native-review-required metadata conventions.
- Do not mark any new translation as reviewed or approved.
- Do not claim linguistic correctness beyond sample and validation purposes.

If the current schema cannot represent the required review state, do not redesign the schema in this task. Record the limitation in the notes and use the safest valid existing status.

## Unicode and Text Requirements

The expanded samples must intentionally exercise the repository's Unicode path.

Include representative coverage for:

- Simplified Chinese characters
- Amharic Ethiopic script
- Arabic right-to-left text
- Yoruba or another registered locale that uses combining marks or substantial diacritics
- French and Portuguese accented characters
- Latin-script African languages
- Locale-specific punctuation where appropriate

Requirements:

- Store source files as UTF-8 using the repository's existing file conventions.
- Prefer normalized Unicode text consistent with existing validation rules.
- Do not insert invisible bidirectional-control characters unless the existing schema or documented project convention explicitly requires them.
- Preserve placeholders exactly.
- Preserve semantic keys exactly.
- Preserve catalog ordering rules.
- Preserve deterministic output ordering.

## Translation Candidate Rules

Candidate translations may be produced for this controlled sample task, but they must be treated as unreviewed data.

For every new non-English sample:

- Retain the canonical English meaning as the reference.
- Use the existing context metadata where available.
- Preserve placeholders without translation or mutation.
- Mark the entry as machine-generated or the closest existing equivalent.
- Mark it as requiring native review where the current model supports that state.
- Do not fabricate reviewer names, review dates, source evidence, or approval records.
- Do not add broad terminology sources; source evidence is a later Phase 2 task.
- Add a brief note for ambiguous technical terms when the current catalog format supports notes.

## Implementation Method

### Repository Inspection

Inspect at minimum:

- `language/`
- `build/language/`
- The locale registry
- Locale and catalog schemas
- Canonical English catalogs
- Existing Mandarin samples
- Existing generated locale catalogs
- Existing keyword maps
- Translation completeness reports
- Keyword collision reports
- `scripts/build-language.js`
- `scripts/test-language-runtime.js`
- `src/shared/languageCatalog.js`
- `docs/MULTILINGUAL_ARCHITECTURE.md`
- `docs/TRANSLATION_CONTRIBUTING.md`

Use actual repository structure and naming. Do not create parallel structures when the Phase 1 architecture already provides the required location.

### Baseline Capture

Before editing:

- Record the current Git status.
- Record the current locale registry entries.
- Record current per-locale completeness or fallback counts.
- Record the current generated-output count.
- Record any unrelated pre-existing changes and leave them untouched.

### Sample-Set Definition

Create or use the most appropriate existing repository-owned definition for the shared sample-key set.

Do not add executable behavior to catalogs.

If no persistent sample-set definition is necessary, document the selected keys in the notes and tests rather than introducing a new abstraction solely for this task.

### Locale Updates

Update the repository-owned locale source files, not only generated outputs.

Do not manually edit generated files unless the existing project architecture explicitly treats them as source.

Regenerate outputs using the established build scripts.

### Validation Adjustments

Only modify validation or test code when existing checks cannot verify one of these required properties:

- All registered locales have the shared sample entries.
- Placeholder names and counts match the canonical entries.
- Review metadata is valid.
- Unicode content survives build and runtime loading.
- Arabic locale metadata retains its configured direction.
- No keyword collisions are introduced.
- Generated output remains deterministic.
- English fallback remains functional for non-sample entries.

Keep any validation changes general and repository-owned rather than hardcoding fragile file counts where the architecture already provides semantic validation.

## Required Validation

Run the established language commands:

```powershell
npm run language:validate
npm run language:build
npm run language:report
npm run test:language
```

Also perform:

- Syntax checks for every modified JavaScript file.
- A runtime-load test for at least one sample from each registered locale.
- Placeholder-preservation checks for every placeholder-bearing sample.
- Keyword collision validation.
- Locale completeness reporting.
- UTF-8 and Unicode round-trip verification.
- English fallback verification for at least one intentionally untranslated key in every non-English locale.
- A second language build to confirm that rerunning generation produces no additional changes.

Do not perform VSIX installation testing as part of this task.

If a standard command fails because of environment permissions or locked files:

- Record the exact command.
- Record the exact failure.
- Distinguish environment failure from content failure.
- Continue with all other safe validation.
- Do not claim the failed validation passed.

## Acceptance Criteria

The task is complete only when all of the following are true:

- Every locale in the repository registry is represented in the controlled sample matrix.
- Every registered non-English locale contains the shared sample-key set or the repository's equivalent source representation.
- Mandarin has broader component coverage than before the task.
- English remains complete and unchanged as the canonical language except for strictly necessary metadata corrections.
- Untranslated entries continue to fall back to English.
- All new non-English entries are clearly unreviewed and require native review under the existing metadata model.
- Placeholder-bearing translations preserve every canonical placeholder exactly.
- Unicode samples survive source loading, generation, report generation, and runtime catalog loading.
- Arabic or another registered right-to-left locale retains correct direction metadata.
- No semantic IDs are changed.
- No ambiguous keyword mapping or keyword collision is introduced.
- Generated outputs remain deterministic.
- Existing runtime behavior is unchanged.
- The established language validation and tests pass, except for any explicitly documented environment-only failure.
- The working notes and execution record are updated.
- No unrelated files are modified.

## Notes Document Update

Append a new uniquely named section to:

`D:\Script\MyDefrag-syntax\docs\MyDefrag-Multilingual-Feature-Project-Notes.md`

Use a heading similar to:

`## Expand Locale Samples — Execution Result — <timestamp>`

Include:

- Scope completed
- Locale registry discovered
- Shared sample keys selected
- Per-locale sample coverage matrix
- Review statuses used
- Unicode cases exercised
- Files created or modified
- Generated outputs refreshed
- Validation commands and results
- Completeness changes before and after
- Collision results
- Unresolved linguistic review needs
- Out-of-scope issues discovered
- Recommended next to-do item

Do not rewrite or simplify the existing notes. Append the new section while preserving all prior content.

## Execution Record

Create the normal run execution record under the repository's established run-history structure.

The execution record must include:

- Execution identity and timestamp
- Task and scope
- Source documents read
- Baseline state
- Decisions
- Files created
- Files modified
- Generated files refreshed
- Commands executed
- Validation evidence
- Failures or blocked checks
- Unresolved issues
- Final status

## Final Response Format

Return a concise implementation report containing these uniquely named sections:

- `## Result`
- `## Locale Sample Coverage`
- `## Validation Evidence`
- `## Files Changed`
- `## Notes and Execution Records`
- `## Remaining Review Gaps`
- `## Revision Log`

Under `Files Changed`, list every created or modified file by repository-relative and absolute path.

Under `Revision Log`, state what changed during this task and identify any pre-existing unrelated changes that were intentionally left untouched.

Do not merely provide a plan. Execute the repository changes, run validation, update the notes, create the execution record, and report the result.
