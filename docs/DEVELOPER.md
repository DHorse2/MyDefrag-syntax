# Developer Guide

This page is the entry point for maintaining the extension. Start with
[Extension Architecture](architecture.md) for component ownership.

## Repository Layout

```text
src/
  completion/       inline completion analysis and builders
  diagnostics/      diagnostic navigation and Explorer view
  preprocess/       include-expanding preview processor
  server/           LSP server, tokenizer, parser, and language data
  shared/           configuration, paths, logging, and catalogs
snippets/            contributed MyDefrag snippets
syntaxes/            TextMate grammar
language/            authored multilingual definitions
build/language/      generated multilingual assets and reports
scripts/             build, packaging, deployment, and validation tools
docs/                extension and converted MyDefrag documentation
```

## Development Setup

```text
npm install
```

Open the repository in VSCodium or Visual Studio Code and run **Run Extension**.
The **Extension + Server** compound configuration also attaches the Node
debugger to the language server on port `6009`.

## Main Entry Points

- `src/extension.js` activates editor features and starts the language client.
- `src/server/server.js` registers LSP lifecycle handlers and validation.
- `src/server/parser.js` implements full-script and fragment parsing.
- `src/server/tokenizer.js` produces parser tokens.
- `src/server/languageData.js` owns canonical keyword metadata.
- `src/preprocess/mydefrag-preprocess.js` implements preview expansion.
- `src/diagnostics/registerDiagnosticNavigation.js` registers the diagnostic
  view and commands.

## Focused Validation

For JavaScript changes, start with syntax checks on the files modified:

```text
node --check src/extension.js
node --check src/server/server.js
node --check src/server/parser.js
```

For multilingual definitions and generated catalogs, run:

```text
npm run language:validate
npm run language:build
npm run test:language
```

For documentation, run Markdown lint and verify every relative link. For a
release, separately inspect the VSIX contents; repository tests do not prove
packaging completeness.

## Debugging

Public settings control debug logging and verbosity. Logs are resolved from
`mydfrg.logDir`. The parser trace fields and event shapes are documented in
[Parser Debug Trace Information](Parser%20Debug%20Trace%20Information.md).

The extension and language server are separate processes. Objects such as
logger instances cannot cross the LSP transport; send JSON-serializable data or
use server notifications instead.

## Related Guides

- [Language server](language-server.md)
- [Diagnostics](diagnostics.md)
- [Preview processor](preview.md)
- [Diagnostic Explorer notes](Developer%20Guide%20-%20Diagnostic%20Explorer.md)
- [Language Server Protocol notes](Developer%20Guide%20-%20Language%20Server%20Protocol.md)
- [Extension folder structure](ExtensionStdFolderStruct.md)
