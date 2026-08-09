# Diagnostics

MyDefrag Syntax reports parser and reference diagnostics in the editor and
maintains a compact snapshot for its Diagnostic Explorer.

## Diagnostic Sources

- The language server tokenizes and parses `.MyD` and `.MyDc` documents.
- The extension analyzes include and file links.
- Workspace validation observes supported MyDefrag files and exclusion rules.
- Parser classification distinguishes complete scripts, fragments, and
  unknown document shapes.

Diagnostics appear in the Problems view and as editor markers. Link diagnostic
severity is configurable in [Settings](settings.md).

## Diagnostic Explorer

Open **MyDefrag Diagnostics** in the Explorer. The view shows the current
diagnostic, its location, severity, message, parser state, and keyword lookup
information when available.

The status-bar item displays the current position as `MyDefrag n/total` and
opens the selected diagnostic.

Navigation actions can:

- Move to the next diagnostic or the next or previous file.
- Mark an item fixed, ignored, or skipped in navigation state.
- Return to the first item or reset recorded states.
- Mark a diagnostic as valid syntax for parser investigation.
- Generate and open an AI investigation prompt.

Navigation states do not edit source code and do not suppress the language
server's underlying diagnostic. A later validation snapshot can add, remove,
or replace items.

## Files And State

The resolved `mydfrg.logDir` contains diagnostic and log artifacts such as:

```text
diagnostics-latest.json
diagnostic-ai-prompt.md
diagnostic-ai-item.json
client.log
server.log
parser.log
preview.log
```

When a workspace is open, diagnostic navigation state is stored in:

```text
.vscode/session_dismissed.json
```

Do not treat these generated files as the source of syntax truth. The parser,
canonical language data, BNF, and converted MyDefrag Help remain the evidence
for investigating a diagnostic.

## Troubleshooting

1. Save the document and allow validation to complete.
2. Run **MyDefrag: Reset Diagnostic Navigation** if the Explorer state is
   stale.
3. Check `mydfrg.exclude`, `files.exclude`, and `search.exclude` if a file was
   not scanned.
4. Temporarily raise `mydfrg.verboseLevel` and inspect the resolved log
   directory.
5. Use **Diagnostic points to Valid Syntax** when the reference proves that a
   parser result is incorrect.
