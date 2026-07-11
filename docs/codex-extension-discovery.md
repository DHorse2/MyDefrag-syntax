# Codex Extension Discovery

<!-- markdownlint-disable MD013 -->

## Summary

The installed Codex extension is `openai.chatgpt` version `26.623.61825`, installed at `C:\Users\david\.vscode-oss\extensions\openai.chatgpt-26.623.61825-win32-x64`.

The extension exposes several public VS Code commands for opening Codex UI and adding editor context, but no discovered command accepts an arbitrary prompt string or directly submits a prompt. The safest integration path for `mydefrag-syntax` is therefore a layered provider design:

- Prefer Codex commands for opening/focusing Codex and adding current editor context.
- Use clipboard or a Markdown handoff file for diagnostic prompt payloads.
- Use Codex CLI only as an explicit, separate non-interactive workflow.
- Avoid UI/webview DOM automation unless a later Codex extension version exposes a supported command or API.

## Environment

| Item | Value |
| --- | --- |
| Repository | `D:\Script\MyDefrag-syntax` |
| Editor | VSCodium `1.121.03429` |
| Extension root inspected | `C:\Users\david\.vscode-oss\extensions` |
| Codex extension package | `C:\Users\david\.vscode-oss\extensions\openai.chatgpt-26.623.61825-win32-x64` |
| Codex CLI executable bundled with extension | `C:\Users\david\.vscode-oss\extensions\openai.chatgpt-26.623.61825-win32-x64\bin\windows-x86_64\codex.exe` |
| Local Codex global storage | No `C:\Users\david\AppData\Roaming\VSCodium\User\globalStorage\openai.chatgpt` directory was found during this inspection. |
| Primary evidence files | `package.json`, `out\extension.js`, `readme.md`, bundled `codex.exe --help` output |

External API references used:

- VS Code API reference: `https://code.visualstudio.com/api/references/vscode-api`
- VS Code command guide: `https://code.visualstudio.com/api/extension-guides/command`
- VS Code webview guide: `https://code.visualstudio.com/api/extension-guides/webview`
- VS Code webview UX guide: `https://code.visualstudio.com/api/ux-guidelines/webviews`

## Codex Extension Identity

| Field | Value | Evidence |
| --- | --- | --- |
| Extension ID | `openai.chatgpt` | `C:\Users\david\.vscode-oss\extensions\openai.chatgpt-26.623.61825-win32-x64\package.json` |
| Display name | `Codex - OpenAI's coding agent` | `package.json` |
| Version | `26.623.61825` | `package.json` |
| Publisher | `openai` | `package.json` |
| Main entry point | `./out/extension.js` | `package.json` |
| VS Code engine | `^1.96.2` | `package.json` |
| Enabled proposed APIs | `chatSessionsProvider`, `languageModelProxy` | `package.json` |
| Activation events | `onStartupFinished`, `onUri` | `package.json` |

Contributed UI and integration points:

| Contribution | Values | Evidence |
| --- | --- | --- |
| Commands | `chatgpt.implementTodo`, `chatgpt.openSidebar`, `chatgpt.openCommandMenu`, `chatgpt.newCodexPanel`, `chatgpt.addToThread`, `chatgpt.addFileToThread`, `chatgpt.newChat`, `chatgpt.showLspMcpCliArgs`, `chatgpt.dumpNuxState`, `chatgpt.resetNuxState` | `package.json` |
| Keybindings | `chatgpt.newChat` on `ctrl+n`, `cmd+n` when `chatgpt.supportsNewChatKeyShortcut` | `package.json` |
| Configuration | `chatgpt.commentCodeLensEnabled`, `chatgpt.cliExecutable`, `chatgpt.openOnStartup`, `chatgpt.followUpQueueMode`, `chatgpt.composerEnterBehavior`, `chatgpt.reviewDelivery`, `chatgpt.localeOverride`, `chatgpt.runCodexInWindowsSubsystemForLinux` | `package.json` |
| Activity bar view container | `codexViewContainer` | `package.json` |
| Secondary sidebar view container | `codexSecondaryViewContainer` | `package.json` |
| Webview views | `chatgpt.sidebarView`, `chatgpt.sidebarSecondaryView` | `package.json`, `out\extension.js` |
| Custom editor | `chatgpt.conversationEditor` for `openai-codex:/**/*` | `package.json`, `out\extension.js` |
| Menus | `editor/title`, `editor/context`, `editor/title/context`, `webview/context`, `commandPalette`, `chatSessions/newSession` | `package.json` |
| Chat sessions | `openai-codex` named `Codex`, display name `OpenAI Codex` | `package.json` |
| Language contribution | `codex-rules` for `.rules` | `package.json` |
| Grammar contribution | `source.codex-rules` using `syntaxes\starlark.tmLanguage.json` | `package.json` |

Runtime registrations observed in `out\extension.js`:

- `vscode.window.registerWebviewViewProvider(Wl.viewType, ...)`
- `vscode.window.registerWebviewViewProvider(Wl.secondaryViewType, ...)`
- `vscode.window.registerCustomEditorProvider(Wl.customEditorViewType, ...)`
- `vscode.window.registerUriHandler(...)`
- `vscode.commands.registerCommand("chatgpt.openSidebar", ...)`
- `vscode.commands.registerCommand("chatgpt.openCommandMenu", ...)`
- `vscode.commands.registerCommand("chatgpt.newCodexPanel", ...)`
- `vscode.commands.registerCommand("chatgpt.addToThread", ...)`
- `vscode.commands.registerCommand("chatgpt.addFileToThread", ...)`
- `vscode.commands.registerCommand("chatgpt.showLspMcpCliArgs", ...)`
- `vscode.commands.registerCommand("chatgpt.newChat", ...)`
- `vscode.commands.registerCommand("chatgpt.dumpNuxState", ...)`
- `vscode.commands.registerCommand("chatgpt.resetNuxState", ...)`

## Discovered Commands

The VS Code API supports command discovery through `vscode.commands.getCommands(filterInternal?)`, and commands from other extensions can be invoked with `vscode.commands.executeCommand(...)`. The official API notes that commands starting with `_` are treated as internal. It also notes that contributed extension commands do not have the same argument restrictions as editor commands.

This discovery used package and runtime inspection instead of launching a separate extension-host probe. The static evidence is strong for contributed and registered command IDs, titles, menus, and some argument shapes.

| Command ID | Title | Source extension | Public or internal | Accepts arguments | Evidence |
| --- | --- | --- | --- | --- | --- |
| `chatgpt.implementTodo` | `Implement with Codex` | `openai.chatgpt` | Public contribution, but disabled in command UI with `enablement: false`; used by CodeLens | Yes. CodeLens supplies `{ fileName, line, comment }`. No direct handler registration was found in the inspected runtime registration block. | `package.json`; `out\extension.js` CodeLens creation |
| `chatgpt.openSidebar` | `Open Codex Sidebar` | `openai.chatgpt` | Public | No observed arguments | `package.json`; `out\extension.js` registration |
| `chatgpt.openCommandMenu` | `Open Codex Command Menu` | `openai.chatgpt` | Public | No observed arguments | `package.json`; `out\extension.js` registration |
| `chatgpt.newCodexPanel` | `New Codex Agent` | `openai.chatgpt` | Public | Optional object observed; runtime checks `arg?.source === "sessionsViewPromotion"` | `package.json`; `out\extension.js` registration |
| `chatgpt.addToThread` | `Add to Codex Thread` | `openai.chatgpt` | Public | No observed arguments; handler calls an internal helper using current editor/UI state | `package.json`; `out\extension.js` registration |
| `chatgpt.addFileToThread` | `Add File to Codex Thread` | `openai.chatgpt` | Public | Yes. One argument is accepted by the handler; likely the file URI supplied by editor title/context menu | `package.json`; `out\extension.js` registration |
| `chatgpt.newChat` | `New Thread in Codex Sidebar` | `openai.chatgpt` | Public | No observed arguments | `package.json`; `out\extension.js` registration |
| `chatgpt.showLspMcpCliArgs` | `Copy Codex CLI args for LSP MCP` | `openai.chatgpt` | Public but gated by `chatgpt.lspMcpEnabled` in command palette | No observed arguments | `package.json`; `out\extension.js` registration |
| `chatgpt.dumpNuxState` | `Debug: print NUX state to console` | `openai.chatgpt` | Public contribution, debug-oriented | No observed arguments | `package.json`; `out\extension.js` registration |
| `chatgpt.resetNuxState` | `Debug: reset NUX state` | `openai.chatgpt` | Public contribution, debug-oriented | No observed arguments | `package.json`; `out\extension.js` registration |

Command capability mapping:

| Capability | Result | Evidence |
| --- | --- | --- |
| Open or focus Codex sidebar | Supported via `chatgpt.openSidebar` | `package.json`; `out\extension.js` |
| Open a new Codex chat/thread/sidebar thread | Supported via `chatgpt.newChat` | `package.json`; `out\extension.js` |
| Open a new Codex panel/agent | Supported via `chatgpt.newCodexPanel` | `package.json`; `out\extension.js` |
| Add current selection or editor context to Codex | Likely supported via `chatgpt.addToThread`; menu contribution is editor context and runtime handler ignores explicit args | `package.json`; `out\extension.js`; `readme.md` says Codex uses selected code and opened files as context |
| Add current file to Codex context | Supported via `chatgpt.addFileToThread`; handler accepts one argument | `package.json`; `out\extension.js` |
| Add diagnostics/problems to Codex context | No direct public command found | `package.json`; `out\extension.js` |
| Accept a prompt string programmatically | No direct public command found | `package.json`; `out\extension.js` |
| Submit/send a prompt programmatically | No direct public command found | `package.json`; `out\extension.js` |

## Detectable VSCodium State

| State | Supported API status | Feasibility from `mydefrag-syntax` | Notes |
| --- | --- | --- | --- |
| Active editor file path | Officially supported VS Code API | High | Use `vscode.window.activeTextEditor?.document.uri.fsPath`. |
| Current selection | Officially supported VS Code API | High | Use `vscode.window.activeTextEditor.selection` and document text extraction. |
| Visible editors | Officially supported VS Code API | High | Use `vscode.window.visibleTextEditors`. |
| Diagnostics for active file | Officially supported VS Code API | High | Use `vscode.languages.getDiagnostics(uri)`. Codex itself also contains an LSP MCP tool using `vscode.languages.getDiagnostics()` in `out\extension.js`. |
| Workspace folders | Officially supported VS Code API | High | Use `vscode.workspace.workspaceFolders`. |
| Open terminals | Officially supported VS Code API | Medium | Use `vscode.window.terminals` and `activeTerminal`; content/output is not generally readable. |
| Output channels | Limited official API | Low for other extensions | An extension can create and write its own output channels with `createOutputChannel`, but the public API does not expose reading another extension's output channel contents. |
| Problems panel state | Not directly accessible as UI state | Low | Diagnostics are accessible through `languages.getDiagnostics`; Problems panel visibility/focus is not exposed as a stable public state API. |
| Codex panel/sidebar visibility | Possible but limited | Medium | `chatgpt.sidebarView.visible` is used as a when-clause context in Codex contributions. Another extension can inspect open tabs via the tab API for webview panels, but arbitrary when-clause state is not generally readable. |
| Codex webview state | Not accessible from another extension | Low | Another extension may identify a `TabInputWebview` view type for a webview tab, but cannot read the webview DOM or internal React state. |
| Focus state | Officially supported only at window level | Medium | Use `vscode.window.state.focused` and `onDidChangeWindowState`. Fine-grained focus inside another extension's webview is not exposed. |

Official API evidence:

- `vscode.commands.executeCommand` and `getCommands` are documented in the VS Code API reference.
- `vscode.window.activeTextEditor`, `visibleTextEditors`, `terminals`, and `onDidChangeWindowState` are part of the `window` namespace.
- `vscode.languages.getDiagnostics` is the supported diagnostics access point.
- `vscode.workspace.workspaceFolders` is the supported workspace-folder access point.
- `TabInputWebview` exposes only the webview `viewType`, not DOM or internal state.
- `OutputChannel` is a container created through `createOutputChannel`; the public API exposes methods for an extension's own channel, not a registry for reading other channels.

## Webview and UI Automation Limits

VS Code webviews are isolated HTML surfaces owned by their provider extension. The webview guide documents that webviews have their own resource loading restrictions through `localResourceRoots`, use message passing with their owning extension, and expose `acquireVsCodeApi()` to scripts inside the webview. That API is for the webview content to communicate with its owning extension, not for unrelated extensions to inspect or mutate another extension's webview.

| Question | Answer | Basis |
| --- | --- | --- |
| Can `mydefrag-syntax` read Codex webview HTML? | No supported API found. | Codex registers its own `WebviewViewProvider` and `CustomEditorProvider`; other extensions do not receive the `Webview` object or its `html` property. |
| Can it set text inside the Codex prompt composer? | No supported API found. | No discovered `chatgpt.*` command accepts a prompt string, and another extension cannot access the Codex webview DOM. |
| Can it detect whether the Codex prompt box is focused? | No supported API found. | `window.state.focused` reports window focus, not focus inside another extension's webview DOM. |
| Can it click Codex UI buttons? | Not through supported extension API. | A webview's DOM is not exposed to other extensions. OS-level or DevTools automation would be fragile and outside VS Code extension API boundaries. |
| Can it submit a prompt without user interaction? | No supported extension command found. | Bundled CLI can run non-interactively, but that starts a Codex CLI workflow rather than submitting to the current Codex sidebar thread. |

Possible but fragile workarounds:

- UI automation through external Windows tools, accessibility APIs, or Chromium DevTools attachment could potentially interact with visible UI, but this would depend on screen layout, focus, timing, internal DOM, and extension implementation details.
- Webview tab detection using `TabInputWebview.viewType` can identify some webview tabs, but it does not grant DOM, prompt, or internal state access.

Recommendation: treat UI automation as unsupported for production integration.

## Handoff Strategies

| Strategy | Feasibility | Reliability | User interaction required | Complexity | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Copy prompt to clipboard | High | High | User pastes/submits in Codex | Low | 1 | Use `vscode.env.clipboard.writeText(prompt)`, then `chatgpt.openSidebar`. Least invasive and predictable. |
| Open/focus Codex command | High | High | User may need to paste/submit | Low | 1 | Use `vscode.commands.executeCommand("chatgpt.openSidebar")` or `chatgpt.newChat`. |
| Add file/current selection to thread | Medium to high | Medium | User may need to confirm context or submit prompt | Medium | 2 | Use `chatgpt.addFileToThread` for file URI or `chatgpt.addToThread` for selected context. Exact behavior should be verified with a small extension-host probe before production use. |
| Write prompt to known Markdown handoff file | High | High | User asks Codex to read it or adds file to context | Low | 2 | Good for large diagnostic payloads. Suggested repo-local path: `.user\codex-handoff\diagnostic-prompt.md` or `docs\diagnostic-handoff.md` depending on persistence preference. |
| Use Codex CLI | High for separate non-interactive run | Medium for IDE integration | No for CLI execution, yes for review/approval depending on mode | Medium | 3 | Bundled `codex.exe` supports `codex exec [PROMPT]`, `codex exec -`, `--cd`, `--json`, and `--output-last-message`. This does not target the open Codex sidebar thread. |
| Custom Codex prompt files | Unverified | Unknown | Likely user-driven | Medium | 4 | The installed package contributes `codex-rules` for `.rules`, but this inspection did not find a public prompt-file ingestion command. |
| MCP/file-system handoff | Medium | Medium | Depends on Codex session and MCP setup | Medium to high | 3 | Codex has an experimental LSP MCP path and an internal `vscodeDiagnostics` tool. Useful if Codex can read workspace files or an MCP server exposes diagnostic context. |
| Experimental UI automation | Low | Low | Possibly none, but brittle | High | Avoid | Not recommended unless a disposable prototype is explicitly requested. |

Codex CLI evidence:

- `codex.exe --help` reports an optional `[PROMPT]` argument and subcommands including `exec`, `review`, `mcp`, `mcp-server`, `resume`, and `doctor`.
- `codex.exe exec --help` reports non-interactive execution, stdin prompt support with `-`, `--cd <DIR>`, `--json`, and `--output-last-message <FILE>`.

## Recommended Diagnostic Send Design

Proposed provider shape:

```text
sendDiagnosticToCodex(diagnosticContext)
```

Recommended data contract:

```text
diagnosticContext:
  source: "mydefrag-syntax"
  workspaceFolder: string
  activeFile: string
  selection?: { startLine, startCharacter, endLine, endCharacter, text }
  diagnostics: array of { message, severity, source, code, range }
  parserEvidence?: { parserLogPath, serverLogPath, clientLogPath, latestSnapshotPath }
  prompt: string
```

Provider order:

| Provider | Role | Implementation sketch | Priority |
| --- | --- | --- | --- |
| Codex command provider | Focus Codex and attach file/editor context where possible | Execute `chatgpt.openSidebar`; optionally execute `chatgpt.addFileToThread` with the active file URI; optionally execute `chatgpt.addToThread` if a selection exists | 1 |
| Clipboard provider | Transfer the actual diagnostic prompt | Write `diagnosticContext.prompt` to `vscode.env.clipboard`; show an information message that it is ready to paste | 1 |
| File handoff provider | Preserve large or repeatable diagnostic context | Write Markdown to a repo-local handoff file, then optionally call `chatgpt.addFileToThread` with that file URI | 2 |
| Terminal/CLI provider | Start a separate Codex run for explicit non-interactive workflows | Create a terminal or task running bundled or configured `codex exec --cd <workspace> -`; pass prompt via stdin only if implemented safely | 3 |
| Experimental UI automation provider | Prototype only | External automation, guarded by feature flag and disabled by default | Avoid by default |

Suggested behavior:

1. Build a complete diagnostic Markdown prompt from active editor, selection, and `vscode.languages.getDiagnostics(activeUri)`.
2. Write the prompt to clipboard.
3. Open Codex with `chatgpt.openSidebar`.
4. If a handoff file is enabled, write the prompt to a known file and optionally call `chatgpt.addFileToThread` for that file.
5. Show a concise notification: prompt copied, Codex opened, handoff file path if created.

Do not attempt to type into or submit the Codex composer unless a future Codex extension version exposes a supported command.

## Risks and Open Questions

- A live `vscode.commands.getCommands(false)` probe was not run in an activated VSCodium extension host during this pass. Static manifest and runtime inspection found the commands above, but a probe should be used before production implementation to confirm command availability after activation.
- `chatgpt.addToThread` behavior should be verified with active selection, no selection, untitled documents, and non-file schemes.
- `chatgpt.addFileToThread` accepts one runtime argument, but the exact accepted shapes should be verified. The menu path likely passes a `vscode.Uri`.
- No public prompt-submit command was found. This could change in later Codex extension versions.
- Codex uses proposed APIs `chatSessionsProvider` and `languageModelProxy`; VSCodium/Open VSX compatibility and proposed API availability should be checked before depending on those surfaces.
- Codex's internal LSP MCP support is gated by `chatgpt.lspMcpEnabled` and appears experimental. It should not be the first integration dependency.
- Clipboard handoff may overwrite user clipboard content. Consider a setting and a short notification before or after writing.
- File handoff can leak diagnostic context into the workspace if stored under tracked paths. Prefer `.user\` or another ignored local folder for sensitive diagnostics.

## Created or Updated Files

- `D:\Script\MyDefrag-syntax\docs\codex-extension-discovery.md`

## Revision Log

| Date | Change |
| --- | --- |
| 2026-07-04 | Initial discovery document created from local VSCodium extension inspection and VS Code API reference checks. |
