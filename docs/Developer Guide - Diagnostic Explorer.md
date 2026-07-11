# Diagnostic Widget Requirements

## Task: Add diagnostic navigation widget/module

Add a module to `mydefrag-syntax` that maintains diagnostic navigation state alongside the existing diagnostic JSON/log workflow.

### Goal

Create a navigation widget/module that reads existing diagnostic data from:

```text
C:\Users\david\AppData\Roaming\VSCodium\User\globalStorage\macrodm.mydefrag-syntax\log\diagnostics-latest.json
```

and dismissed-file state from:

```text
D:\Script\MyDefrag-syntax\.user\logs\session_dismissed.json
```

The new module must not replace the existing log or diagnostic system. It should operate beside it.

### Required behavior

Ignore diagnostics where:

* `severity === 3`
* the diagnostic file path is listed in `session_dismissed.json`

Support these navigation actions:

* `get next`: return the next non-Information diagnostic.
* `get next file`: skip the remainder of the current file and return the first diagnostic from the next eligible file.
* `fixed`: same as `get next`.
* `skip`: add the current file to `session_dismissed.json`, then perform `get next file`.
* `reset`: clear `session_dismissed.json` and restart from the first eligible diagnostic.
* `valid syntax`: mark the current diagnostic as likely parser-related for investigation; do not dismiss it automatically.
* `repair`: developer action only; no automatic parser edit required from the widget.

### Per-diagnostic display fields

For the current diagnostic, show:

* File path
* Line/column
* Severity
* Diagnostic message
* Keyword/token involved, if available or extractable
* Is the keyword/token found in the Language reference: `D:\Script\MyDefrag-syntax\doc\MyDefrag Help`
* Whether the keyword exists in project/MyDefrag keyword data

### Suggested module structure

```text
src/
  diagnostics/
    diagnosticNavigator.js
    diagnosticStore.js
    dismissedDiagnostics.js
    keywordLookup.js

Revised data structure:

.user/
│
├── diagnostics/
│   diagnostics-latest.json
│   session_dismissed.json
│   navigator-state.json       ← current index, filters, etc.
│
├── logs/
│   extension.log
│   parser.log
│   tokenizer.log
│
├── cache/
│
└── settings.json
```

### Responsibilities

`diagnosticStore.js`

* Load `diagnostics-latest.json`.
* Normalize diagnostics into a stable list.
* Preserve file order and diagnostic order.

`dismissedDiagnostics.js`

* Load/save `session_dismissed.json`.
* Add dismissed file paths.
* Reset dismissed file paths.

`keywordLookup.js`

* Check keyword/token against existing syntax/project keyword data.
* Reuse `languageData.js` or the existing keyword source rather than duplicating keyword lists.

`diagnosticNavigator.js`

* Maintain current diagnostic index.
* Apply filters.
* Implement `next`, `nextFile`, `skip`, `reset`, and `current`.
* Return display-friendly diagnostic objects.

### Integration notes

Register VSCodium commands such as:

```text
mydfrg.diagnostics.next
mydfrg.diagnostics.nextFile
mydfrg.diagnostics.skipFile
mydfrg.diagnostics.reset
mydfrg.diagnostics.current
```

Optionally expose the current diagnostic in:

* a TreeView
* a WebView panel
* a status-bar item with command links

### Important project rules

* Preserve existing logging and diagnostics.
* Do not remove comments.
* Keep changes additive and minimal.
* Do not rename public APIs unless necessary.
* Use CommonJS unless the file already uses ESM.
* Reuse existing parser/language data where possible.
* Do not treat dismissed diagnostics as fixed; they are session-navigation skips only.

### Before using the widget

Reload/restart the extension so `diagnostics-latest.json` reflects the latest parser code.
