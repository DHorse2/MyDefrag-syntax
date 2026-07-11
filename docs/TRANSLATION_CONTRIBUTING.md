# Translation Contribution Guide

## Scope

Translations are repository assets. External tools may assist, but this project does not depend on external schemas, cloud services, export formats, ordering behavior, or validation limits.

Machine-generated translations are never automatically approved. Mark them as `machine-generated` or `native-review-required` until reviewed.

## Review States

Allowed review states are:

- `draft`
- `machine-generated`
- `native-review-required`
- `reviewed`
- `approved`
- `deprecated`

## Add Or Update A Locale

1. Add or update locale metadata in:

   ```text
   language/locales/locales.json
   ```

2. Create a locale folder:

   ```text
   language/locales/<locale>/
   ```

3. Add `catalog.json` for reviewed locale work or `catalog.sample.json` for representative samples.
4. Add only translated keys or keywords that have actually been reviewed or clearly marked.
5. Run validation:

   ```text
   npm run language:validate
   npm run language:build
   npm run test:language
   ```

## Catalog Entries

Catalog keys must already exist in:

```text
language/canonical/component-catalog.json
```

Do not invent runtime behavior in a catalog. Catalog values are text only. Control flow, severity, parser behavior, recovery, filtering, and validation remain in code.

## Keyword Entries

Keyword translations map stable semantic IDs to one preferred generated spelling:

```json
{
  "id": "structure.volumeSelect",
  "text": "VolumeSelect",
  "status": "approved"
}
```

Every locale must have exactly one generated spelling for each semantic keyword. Duplicate spellings are build errors.

Input aliases may be added in a later phase, but generated output must stay deterministic.

## Placeholder Rules

Named placeholders use braces:

```text
Expected {expected} but found {actual}
```

Translated text must preserve the same placeholder names. The build detects missing, extra, or renamed placeholders.

## Completeness Reports

Run:

```text
npm run language:report
```

Then inspect:

```text
build/language/reports/translation-completeness.json
build/language/reports/keyword-collisions.json
build/language/reports/migration-report.json
```

Incomplete locales are acceptable when clearly marked. Do not claim production readiness for placeholder or machine-generated locale content.

## Translation Issues

Use `.github/ISSUE_TEMPLATE/translation.yml` to report:

- Incorrect translation.
- Missing catalog entry.
- Placeholder mismatch.
- Keyword collision.
- Locale metadata problem.
- Native review request.

Include the locale ID, catalog key or keyword ID, current text, proposed text, and review status.

## User Comments And Strings

User-authored comments and user string literals are not translated automatically. Any future comment or string translation must be an explicit user action.

## Low-Resource Operation

Keep contributions compact. Do not add generated full-project translated trees, external service requirements, or runtime-only validation work that would slow editor startup on low-end Windows systems.
