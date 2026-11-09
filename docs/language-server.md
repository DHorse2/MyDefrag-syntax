# Language Server

MyDefrag Syntax starts a Node language server from `src/server/server.js` and
connects to it with `vscode-languageclient` over IPC.

## Synchronization

The client selects file-scheme `mydfrg` documents and watches these filename
extensions:

```text
.MyD  .myd  .MYD  .MyDc  .mydc  .MYDC
```

Text synchronization is incremental. Validation is scheduled when a document
is opened, changed, or saved. Closing a document clears its published
diagnostics. Watched-file and configuration changes schedule broader refreshes.

## Validation Pipeline

```text
document text
  -> tokenizer
  -> initial full-script or fragment classification
  -> parser
  -> best parse result
  -> LSP diagnostics
  -> diagnostics-latest.json snapshot
```

The server can retry content as a fragment when fragment parsing provides a
better result. Remaining tokens are reported differently for incomplete
fragments and complete scripts.

## Configuration

The client sends normalized `mydfrg.*` settings, extension exclusion patterns,
`files.exclude`, and `search.exclude`. A configuration update rebuilds the
server logger and parser configuration before diagnostics refresh.

See [Settings](settings.md) for public options.

## Capabilities

The server advertises incremental synchronization, completion, hover,
definition, and references. Hover resolves contextual entries from the
converted MyDefrag Help corpus and returns Markdown with an **Open full
MyDefrag Help** command link. It returns `null` when hover is disabled or no
mapped Help entry exists. Server completion remains a stub that returns an
empty list.

The extension host separately supplies:

- Context-aware inline completion.
- Go to Definition for `SetVariable(...)` declarations.
- Workspace Find All References.
- Document links and preview.

Do not assume every editor feature is implemented by an LSP request merely
because the server advertises the capability.

## Diagnostic Snapshot

After validation, the server writes a compact snapshot and sends
`mydfrg/diagnosticsSnapshotChanged`. The extension uses that notification to
refresh the Diagnostic Explorer. Closing a file writes an empty entry and
clears editor diagnostics for its URI.

## Debugging

Use the **Extension + Server** compound debug configuration. The language
server debug transport listens on port `6009`. Server and parser logs are
written under the resolved `mydfrg.logDir`.

See [Language Server Protocol notes](Developer%20Guide%20-%20Language%20Server%20Protocol.md)
for the JSON-RPC lifecycle and process-boundary model.
