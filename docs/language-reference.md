# Language Reference

MyDefrag Syntax recognizes the original MyDefrag scripting language and adds
editor tooling around it. The language reference is maintained separately from
the extension feature documentation.

## Document Types

| Extension | Intended shape |
| --- | --- |
| `.MyD` | A complete MyDefrag script. |
| `.MyDc` | A reusable or incomplete MyDefrag script fragment. |

Uppercase and lowercase filename variants activate the same `mydfrg` language.
The parser may also classify content from its structure when the filename and
content disagree.

## Primary References

- [Converted MyDefrag Help](MyDefrag%20Help/index.md) contains the converted
  manual, script structure, settings, conditions, functions, and actions.
- [MyDefrag GOLD Parser BNF](MyDefrag%20GOLD%20Parser%20BNF%20(Backus-Naur%20Form)%20syntax.bnf)
  preserves the local grammar reference.
- [`src/server/languageData.js`](../src/server/languageData.js) is the
  extension's canonical parser and completion data.
- [`syntaxes/mydfrg.tmLanguage.json`](../syntaxes/mydfrg.tmLanguage.json)
  defines editor token highlighting.

## Editor Conventions

- Line comments use `//`.
- Block comments use `/*` and `*/`.
- Parentheses and single or double quotes auto-close in the editor.
- `!include "relative/path"!` directives are linkable and are expanded by the
  preview processor.

## Validation Model

The tokenizer produces tokens and the parser validates them against canonical
keyword and parent relationships. Complete scripts are parsed as full scripts.
Fragments are evaluated with fragment-aware parent inference so a reusable
`.MyDc` file does not require every enclosing block.

If extension diagnostics and the converted reference disagree, preserve the
source and report the diagnostic as valid syntax for investigation. Do not
change a script solely to silence a suspected parser defect.
