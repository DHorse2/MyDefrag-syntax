# English Fallback Locale Report

The following 2 registered locales have no durable catalog-entry or keyword
translations and use English fallback for every active value:

- `am` - Amharic
- `yo` - Yoruba

## Result Summary

- Project ID: `mdm-mydefrag-syntax`
- Evidence date: 2026-08-12
- Registered locales: 18
- Non-English locales: 17
- Locales with no durable translations: 2
- Locales with durable catalog translations: 15
- Non-English locales with a catalog-entry English fallback: 5
- Non-English locales with a keyword English fallback: 17
- Non-English locales with no catalog-entry English fallback: 12
- Active canonical catalog entries per locale: 623
- Canonical keywords per locale: 20
- English base locale: `en` (excluded from fallback lists)

This result follows a one-time additive migration that promoted 3,638 active
generated translations into 125 permanent files under
`language/locales/<locale>/<component>.json`. Existing authored entries won,
English fallback values were not promoted, and historical generated keys no
longer present in the canonical catalog remained preserved only in generated
output.

A subsequent DeepL recovery persisted 5,688 additional catalog entries across
its canary, interrupted, and final throttled runs. The complete one-line request
audit, executive summary, and final rejected-item list are in
[`deepl-catalog-entry-calls.md`](deepl-catalog-entry-calls.md).

## Current Active Fallback Coverage

The counts below come directly from the current generated component catalogs
and are restricted to keys in the current canonical catalog. A translated value
is an active entry whose `fallbackLocale` is not `en`.

| Locale | English name | Translated | Fallback | Keywords | Keyword fallback |
| --- | --- | ---: | ---: | ---: | ---: |
| `zh-Hans` | Simplified Chinese | 623/623 | 0/623 | 3/20 | 17/20 |
| `sw` | Swahili | 618/623 | 5/623 | 0/20 | 20/20 |
| `am` | Amharic | 0/623 | 623/623 | 0/20 | 20/20 |
| `ha` | Hausa | 619/623 | 4/623 | 0/20 | 20/20 |
| `yo` | Yoruba | 0/623 | 623/623 | 0/20 | 20/20 |
| `ig` | Igbo | 623/623 | 0/623 | 0/20 | 20/20 |
| `zu` | Zulu | 623/623 | 0/623 | 0/20 | 20/20 |
| `xh` | Xhosa | 620/623 | 3/623 | 0/20 | 20/20 |
| `af` | Afrikaans | 623/623 | 0/623 | 0/20 | 20/20 |
| `ar` | Arabic | 623/623 | 0/623 | 0/20 | 20/20 |
| `fr-CA` | French (Canada) | 623/623 | 0/623 | 0/20 | 20/20 |
| `pt` | Portuguese | 623/623 | 0/623 | 0/20 | 20/20 |
| `fa` | Persian | 623/623 | 0/623 | 0/20 | 20/20 |
| `ru` | Russian | 623/623 | 0/623 | 0/20 | 20/20 |
| `de` | German | 623/623 | 0/623 | 0/20 | 20/20 |
| `fr` | French | 623/623 | 0/623 | 0/20 | 20/20 |
| `es` | Spanish | 623/623 | 0/623 | 0/20 | 20/20 |

All active catalog keys are present in every generated locale catalog. The
generated files contain 17 additional historical keys per locale; those keys
are preserved non-destructively but excluded from active completeness because
they are absent from the current canonical catalog.

## Durability and Rebuild Behavior

Every current non-fallback generated translation now has a permanent source
counterpart unless it belongs to a historical key that is no longer canonical.
Writing builds additively persist future API translations before updating
generated output.

Broad `build` and `report` actions preserve existing generated entries and add
only missing canonical keys. Targeted `build-component` now preserves unrelated
generated entries, overlays authoritative values, refreshes canonical metadata,
and adds missing keys. Replacing a translated value with English fallback
requires an exact-key `--AllowFallbackReplacement` command-line approval.

Locale Maintenance Save and Rebuild snapshot both generated output and durable
locale sources. A failed or cancelled build restores both sets. A successful
Rebuild reloads the promoted authoritative state into the application.

## Generated Report Status

`translation-completeness.json` and `language-report.txt` have not been
regenerated in this run because `migration-report.json` already contained
unrelated local edits, and `language:report` would overwrite it. The next
authorized writing build or report will calculate completeness from the actual
post-build component catalogs and keyword maps, including preserved
machine-generated values and explicit missing counts.

## Validation

- One-time durable-source migration: 3,638 entries across 125 component files.
- DeepL recovery: 5,688 additional active translations persisted; 12 protected-
  marker rejections remain in supported locales.
- `npm run language:validate`: passed with 0 errors and 0 warnings.
- Active generated-output scan: all 17 non-English locales contain all 623
  canonical catalog keys; missing count is 0 for every locale.
- Destructive-transition regression: targeted rebuilding preserved an unrelated
  generated translation and promoted it into permanent source.
- Exact approval regression: only a specifically approved catalog key could be
  changed from translated content to English fallback.
- Locale Maintenance regression: Save and Rebuild preserved and durably
  promoted unrelated generated translations through a real child process.
- Rollback regression: a failed rebuild restored generated files and durable
  locale sources.

## Evidence Sources

- `language/locales/locales.json`
- `language/locales/<locale>/<component>.json`
- `build/scripts/build-language.js`
- `build/language/catalogs/<locale>/<component>.json`
- `build/language/keyword-maps/<locale>-canonical-to-locale.json`
- `build/mdl-locale-app/services/locale-maintenance-service.js`
- `build/mdl-language-app/services/build-integration.js`
- `docs/build-language.md`
- `docs/locale-maintenance-app.md`
