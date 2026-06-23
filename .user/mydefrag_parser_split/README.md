# MyDefrag Server Parser Split

Generated from the uploaded single-file server/parser source.

## Files

- `server.js` — LSP wiring, document lifecycle, validation, workspace scanning, completion/hover stubs.
- `tokenizer.js` — token types and `tokenize(text)`.
- `parser.js` — `Parser`, `parseStates`, full/fragment parsing, diagnostics.
- `languageData.js` — keyword tables, keyword lookup maps, predefined identifiers, language-data helpers.

## Integration

Copy these files into your server folder, usually:

```text
src/server/
```

The relative imports assume all four files sit beside each other:

```javascript
require('./tokenizer')
require('./parser')
require('./languageData')
```

## Intentional small fixes

- `tokenizer.js`: changed `const type` to `let type`, because the tokenizer later reassigns it for predefined identifiers.
- `parser.js`: changed `hintAtStart()` to use an LSP-compatible range object.
- `parser.js`: changed `if (this.atEof)` to `if (this.atEof())`.

Comments were preserved.
