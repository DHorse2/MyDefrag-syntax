# Features

MyDefrag Syntax supplies editor tooling for MyDefrag scripts without running
the MyDefrag program.

## Editing

- Syntax highlighting for `.MyD` and `.MyDc` files.
- Line comments, block comments, bracket matching, and automatic quote and
  parenthesis closing.
- 118 snippets with `md-` prefixes for script structures, conditions,
  actions, settings, values, and functions.
- Context-aware inline completion based on the extension's canonical language
  data.

## Navigation

- Ctrl+select links for `!include` directives and recognized file references.
- Go to Definition for a variable's `SetVariable(...)` declaration.
- Find All References for whole-word occurrences across the workspace.
- File-and-position links generated for supported batch-file references.

## Validation

- A Node-based language server tokenizes and parses MyDefrag documents.
- Full scripts and fragments are classified separately so `.MyDc` content can
  be checked without requiring a complete enclosing script.
- Validation runs when a document is opened, changed, or saved and when
  watched MyDefrag files or relevant settings change.
- Workspace, search, and extension exclusion patterns reduce unnecessary
  scanning.
- Link diagnostics have configurable severity for missing targets, targets
  found through parent folders, execution-time macros, and successful links.

## Preview

- A read-only preview recursively expands `!include` directives.
- Source and merged line columns help trace expanded content.
- Include boundaries, missing files, circular includes, and include maps are
  represented as annotations.

## Diagnostic Navigation

- The **MyDefrag Diagnostics** Explorer view shows the current diagnostic and
  navigation actions.
- A status-bar item shows the current position and opens the selected issue.
- Fixed, ignored, skipped, and valid-syntax review states can be recorded
  without changing the source document.
- A diagnostic can be formatted as an AI investigation prompt and opened for
  review.

## Current Boundaries

- The extension does not install, configure, or execute MyDefrag itself.
- LSP hover and list-completion handlers currently return no content. Snippets
  and the client-side inline completion provider supply completion assistance.
- Preview is an editor document; it does not replace the source or write a
  merged script unless the standalone preprocessor is run with its write
  option.
- Converted MyDefrag Help is reference material and may describe behavior of
  the original MyDefrag application rather than the extension.
