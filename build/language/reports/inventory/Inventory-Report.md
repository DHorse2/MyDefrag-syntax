# Source Text Inventory

> Refresh this index with `npm run inventory:master` after running a primary inventory.

<!-- markdownlint-disable MD013 -->

## Primary inventory commands

| Area | Command | Short report | Detailed evidence | Status |
| --- | --- | --- | --- | --- |
| Logging | `npm run inventory:logger` | [Report](Logger-Report.md) | [Strings](Logger-Strings.md) | Implemented |
| Code comments | `npm run inventory:comments` | [Report](Comment-Report.md) | [Comments](Comment-Strings.md) | Implemented |
| Documentation | `npm run inventory:documentation` | [Report](Documentation-Report.md) | [Files](Documentation-Files.md) | Implemented |

Each implemented primary command regenerates its short report and complete evidence
list.

## 1. Logging

181 translatable logging literals contain 8,132 source characters. See
[Logger-Report.md](Logger-Report.md).

## 2. Code comments

1,321 comments containing letters hold 81,003 source characters. See
[Comment-Report.md](Comment-Report.md).

## 3. Documentation

| Measure | Total |
| --- | ---: |
| Files | 880 |
| Text files | 816 |
| Binary files | 64 |
| Raw words | 258,232 |
| All-file bytes | 4,517,668 |
| Text bytes | 2,213,736 |
| Binary bytes | 2,303,932 |
| Text characters | 2,211,401 |
| Exact duplicate text files | 204 |
| Unique-content words | 215,003 |
| Unique-content text bytes | 1,774,592 |

Per-file evidence: [Documentation-Files.md](Documentation-Files.md).

## Aggregate localization scale

| Area | Inventory measure | Source characters | Target locales | DeepL upper bound |
| --- | ---: | ---: | ---: | ---: |
| Logging | 181 strings | 8,132 | 17 | 138,244 |
| Code comments | 1,321 comments | 81,003 | 17 | 1,377,051 |
| Documentation | 258,232 words | 2,211,401 | 17 | 37,593,817 |
| Total | Mixed units | 2,300,536 | 17 | 39,109,112 |

<!-- markdownlint-enable MD013 -->

These are conservative raw-source estimates. Documentation includes Markdown,
HTML, code samples, navigation, and metadata; binary formats contribute bytes
but no words or characters. Translation suitability requires review.

## Refresh sequence

```powershell
npm run inventory:logger
npm run inventory:comments
npm run inventory:documentation
npm run inventory:master
```
