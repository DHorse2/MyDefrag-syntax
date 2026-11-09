# Translation Contribution Guide

## Scope

Translations are repository assets. External tools may assist, but this project
does not depend on external schemas, cloud services, export formats, ordering
behavior, or validation limits.

Machine-generated translations are never automatically approved. Mark them as
`machine-generated` or `native-review-required` until reviewed.

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

3. Use MyDefrag Locale Maintenance to create permanent component files at
   `language/locales/<locale>/<component>.json`.
4. Create or update the complete authored keyword file:

   ```text
   language/locales/<locale>/keywords.json
   ```

   Keep all 243 canonical semantic IDs. Use the canonical English text with
   `fallbackLocale: "en"` and `status: "draft"` until a spelling is translated.
   The 29 internal entries remain hidden and non-translatable.
5. Add only translated keys or keyword spellings that have actually been reviewed or
   clearly marked. Accepted API translations are stored with
   `machine-generated` status and remain reviewable source assets.
6. Run validation:

   ```text
   npm run language:validate
   npm run test:language
   ```

7. Run the build to generate any missing locale directories:

   ```text
   npm run language:build
   ```

   The broad builder preserves every existing generated entry and adds only
   missing canonical keys. Before updating output, it additively persists
   non-fallback generated translations under `language/locales/`. MyDefrag
   Locale Maintenance uses the non-destructive targeted component action after
   each accepted component save; neither action deletes generated directories.

Do not put keyword spellings back into `catalogOverrides.json`; that aggregate
is no longer a keyword authority.

## Catalog Entries

Catalog keys must already exist in:

```text
language/canonical/component-catalog.json
```

Do not invent runtime behavior in a catalog. Catalog values are text only.
Control flow, severity, parser behavior, recovery, filtering, and validation
remain in code.

## Keyword Entries

Keyword translations map stable semantic IDs to one preferred generated spelling:

```json
{
  "id": "structure.volumeSelect",
  "text": "VolumeSelect",
  "status": "approved"
}
```

Every locale must have exactly one generated spelling for each semantic keyword.
Duplicate spellings are build errors.

Input aliases may be added in a later phase, but generated output must stay
deterministic.

## Placeholder Rules

Named placeholders use braces:

```text
Expected {expected} but found {actual}
```

Translated text must preserve the same placeholder names. Validation enforces
placeholder parity for canonical, authored, and newly generated translated
values.

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

Incomplete locales are acceptable when clearly marked. Do not claim production
readiness for placeholder or machine-generated locale content.

## Translation Issues

Use `.github/ISSUE_TEMPLATE/translation.yml` to report:

- Incorrect translation.
- Missing catalog entry.
- Placeholder mismatch.
- Keyword collision.
- Locale metadata problem.
- Native review request.

Include the locale ID, catalog key or keyword ID, current text, proposed text,
and review status.

## User Comments And Strings

User-authored comments and user string literals are not translated automatically.
Any future comment or string translation must be an explicit user action.

## Low-Resource Operation

Keep contributions compact. Do not add fallback-only English values to permanent
locale sources, external service requirements, or runtime-only validation work
that would slow editor startup on low-end Windows systems. Durable component
sources should contain real translated values, including clearly marked
machine-generated translations awaiting review.
