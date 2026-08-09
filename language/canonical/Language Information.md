# Information

## Sources

ISO 639-1 language package metadata

https://www.loc.gov/standards/iso639-2/?utm_source=chatgpt.com

https://cldr.unicode.org/index/cldr-spec/picking-the-right-language-code?utm_source=chatgpt.com

* All 183 official ISO 639-1 language IDs
* English and native names
* `ltr` or `rtl` direction
* `"status": "draft"`
* Schema-compatible `locales` array

The IDs were cross-checked against the [Library of Congress ISO 639 registry](https://www.loc.gov/standards/iso639-2/), using language identifiers consistent with [Unicode locale conventions](https://cldr.unicode.org/index/cldr-spec/picking-the-right-language-code).

## File

language\canonical\language-locales.json

## Schema

{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MyDefrag locale metadata",
  "type": "object",
  "required": [
    "locales"
  ],
  "properties": {
    "locales": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "englishName",
          "nativeName",
          "direction",
          "status"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "englishName": {
            "type": "string"
          },
          "nativeName": {
            "type": "string"
          },
          "direction": {
            "enum": [
              "ltr",
              "rtl"
            ]
          },
          "status": {
            "$ref": "translation-status.schema.json#/definitions/reviewState"
          },
          "notes": {
            "type": "string"
          }
        }
      }
    }
  }
}

## Notes

Warning: Locale fr-CA contains metadata only and will use English fallback output.
Warning: API translation sw: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation am: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation ha: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation yo: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation ig: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation zu: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation xh: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation af: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.
Warning: API translation fa: DeepL request failed with HTTP 400. 432 missing value(s) use canonical English fallback.

Language build: validation passed.
Translation API: DeepL configured via DeeplApi; requesting missing values for 17 locale(s) with missing entries: zh-Hans, sw, am, ha, yo, ig, zu, xh, af, ar, fr-CA, pt, fa, ru, de, fr, es.
Language build: translating 432 missing value(s) for zh-Hans.
Language build: translating 432 missing value(s) for sw.
Language build: translating 432 missing value(s) for am.
Language build: translating 432 missing value(s) for ha.
Language build: translating 432 missing value(s) for yo.
Language build: translating 432 missing value(s) for ig.
Language build: translating 432 missing value(s) for zu.
Language build: translating 432 missing value(s) for xh.
Language build: translating 432 missing value(s) for af.
Language build: translating 432 missing value(s) for ar.
Language build: translating 432 missing value(s) for fr-CA.
Language build: translating 432 missing value(s) for pt.
Language build: translating 432 missing value(s) for fa.
Language build: translating 432 missing value(s) for ru.
Language build: translating 455 missing value(s) for de.
Language build: translating 455 missing value(s) for fr.
Language build: translating 455 missing value(s) for es.
Language build: generating catalogs, maps, and reports.
Translation API result: 3525 suggestion(s), 9 warning(s).
DeepL API usage: 17 call(s), 232470 source character(s) passed.
Language build complete: 18 locale(s), 10 component(s)
Catalog locales: 3 generated, 15 updated existing, 0 unchanged existing, 0 skipped existing
Catalog entries added: 7845
Keyword collisions: 0

