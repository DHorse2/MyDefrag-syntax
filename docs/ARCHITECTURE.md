# Extension Architecture

MyDefrag Syntax is a CommonJS VSCodium and Visual Studio Code extension with a
separate Node language-server process and a client-side preview processor.

## Runtime Components

<!-- markdownlint-disable MD013 -->

| Component | Primary files | Responsibility |
| --- | --- | --- |
| Extension host | `src/extension.js` | Activation, settings, links, variable navigation, inline completion, preview registration, status items, and language-client startup. |
| Language server | `src/server/server.js` | Document synchronization, workspace refresh, parsing, diagnostics, standard completion, code actions, snapshots, and server notifications. |
| Tokenizer and parser | `src/server/tokenizer.js`, `src/server/parser.js` | Convert source text into tokens and validate full-script or fragment structure. |
| Language data | `src/server/languageData.js` | Canonical keywords, parent relationships, and metadata shared by parsing and editor assistance. |
| Preview processor | `src/preprocess/mydefrag-preprocess.js` | Recursively expand includes and produce annotated merged output. |
| Translation preview | `src/shared/sourceTranslation.js`, `src/shared/translationPreview.js` | Translate source through canonical syntax, expand translated includes, validate canonical output, and retain source mappings. |
| Translation review | `src/shared/translationReview.js` | Render bilingual, semantic, difference, terminology, untranslated-token, and completeness views from the translation preview and keyword catalogs. |
| Diagnostic navigation | `src/diagnostics/` | Load diagnostic snapshots, track review state, render the Explorer tree, and generate investigation prompts. |
| Shared services | `src/shared/` | Resolve paths, load configuration, write logs, and load generated language catalogs. |
| Completion modules | `src/completion/` | Build shared context and candidates for client inline and server standard completion. |

<!-- markdownlint-enable MD013 -->

## Process Flow

```text
VSCodium or VS Code
  -> extension host
     -> client-side links, navigation, inline completion, preview, and review
     -> LanguageClient over IPC
        -> language server
           -> tokenizer
           -> parser and language data
           -> diagnostics, standard completion, code actions, and compact snapshot
     -> Diagnostic Explorer reads the snapshot
```

The extension and server are separate Node processes. Only serializable data,
LSP messages, notifications, and files cross that process boundary.

## Document Lifecycle

1. Opening a MyDefrag file activates the extension and starts the language
   client.
2. The client starts `src/server/server.js` over IPC.
3. Open, change, save, watched-file, and configuration events schedule
   validation.
4. The server tokenizes and parses eligible documents.
5. Diagnostics are published to the editor and written to a compact snapshot.
6. The Diagnostic Explorer refreshes when the server announces a snapshot
   change.

## Configuration Flow

`package.json` defines the public `mydfrg.*` settings. The extension normalizes
them and sends configuration plus exclusion data to the server. Shared path and
logging modules are used by the client, server, parser, preview, and diagnostic
tools.

Generated multilingual catalogs under `build/language/` are derived from
repository-owned definitions under `language/`. They are additive and do not
make the parser accept localized source keywords. See
[Multilingual Architecture](multilingual-architecture.md).

## Product Boundaries

- The extension does not execute or distribute MyDefrag.
- Preview expansion is separate from language-server validation.
- Review documents are editable untitled plain text and cannot overwrite source
  unless the developer explicitly saves a separate copy.
- Diagnostic navigation does not replace or mutate the server's diagnostics.
- MyDefrag Help and the BNF are reference inputs; runtime behavior belongs to
  the extension source and generated assets.
