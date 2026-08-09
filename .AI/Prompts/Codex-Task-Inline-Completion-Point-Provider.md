# Codex Task: Refactor Inline Completion Into a Completion Point Provider

## Objective

Implement a thin client-side inline completion provider for the MyDefrag VSCodium extension, then move the language-assistance logic into reusable helper modules. The inline provider must act only as a fast trigger/adapter. The richer behavior must live outside `extension.js`.

This task should prepare the extension for future context-aware language assistance without adding heavy processing to the inline completion callback.

## Current Context

The extension currently uses:

- `src/extension.js` as the main VSCodium client entry point.
- `src/server/languageData.js` as the central keyword and predefined identifier source.
- `src/server/server.js` as the language server. It advertises LSP completion support, but `connection.onCompletion()` currently returns an empty list.
- `src/server/tokenizer.js` and `src/server/parser.js` for existing tokenization, parsing, and fragment reasoning.

This task is client-side inline completion work. Do not move this into `server.js` yet.

## Design Direction

The inline completion registration in `extension.js` must be small and should delegate immediately:

```js
provideInlineCompletionItems(document, position, context, token) {
    return completionPointProvider.provide({
        document,
        position,
        context,
        token
    });
}
```

The provider class should own the following logical steps:

```js
const suggestion = buildInlineCompletion(keyword, typed, document, position);
const contextInfo = getCompletionContext(document, position);
```

Implement the following helpers now as real, testable functions/classes, even if the first version uses conservative/simple logic:

- `buildInlineCompletion()`
- `getCompletionContext()`
- `getParameterTemplate()`
- `getNextLikelyKeywords()`

The provider should be deterministic, fast, and safe to call frequently while the user types.

## Required File Changes

Create a new folder:

```text
src/completion/
```

Create these new files:

```text
src/completion/completionPointProvider.js
src/completion/inlineCompletionBuilder.js
src/completion/completionContext.js
src/completion/parameterTemplates.js
src/completion/nextKeywordProvider.js
```

Modify:

```text
src/extension.js
```

Do not modify parser behavior unless strictly necessary.
Do not modify `server.js` completion behavior in this task.
Do not duplicate the MyDefrag keyword list.

## Implementation Requirements

### 1. `completionPointProvider.js`

Create a `CompletionPointProvider` class.

It should:

- Accept `vscode`, language data, and optional logger/config dependencies through the constructor.
- Expose a `provide(request)` method.
- Extract the current typed word at the cursor.
- Ignore requests when:
  - The document is not `mydfrg`.
  - There is no active word fragment.
  - The typed fragment is shorter than 2 characters.
  - The cancellation token is already cancelled.
- Call `getCompletionContext(document, position)`.
- Call `buildInlineCompletion(...)`.
- Return an array of `vscode.InlineCompletionItem` objects or an empty array.
- Avoid filesystem scans, workspace searches, child processes, or full-document parser calls.

The class should keep `extension.js` registration thin.

### 2. `inlineCompletionBuilder.js`

Implement `buildInlineCompletion({ typed, contextInfo, keywords, vscode, position })`.

First version behavior:

- Find the best keyword whose text starts with the typed fragment.
- Matching must be case-insensitive.
- The inserted text should be only the remaining ghost text, not the full word.
- Prefer context-appropriate keywords when `contextInfo.parentHint` or `contextInfo.allowedParents` is available.
- Fall back to global keyword matching if context is unknown.
- Return `null` if there is no safe match.

Example:

```mydefrag
Mou
```

should ghost-complete to:

```mydefrag
Mounted
```

by returning only:

```text
nted
```

### 3. `completionContext.js`

Implement `getCompletionContext(document, position)`.

First version should be lightweight and line/local-context based.

It should return an object similar to:

```js
{
    lineText,
    linePrefix,
    typed,
    wordStartCharacter,
    parentHint,
    allowedParents,
    isInsideString,
    isInsideComment,
    precedingKeyword,
    precedingText
}
```

Use simple heuristics only:

- Detect line comments beginning with `#`, `//`, `--`, or `REM`.
- Detect whether the cursor is inside a quoted string on the current line.
- Detect obvious block context from nearby text where practical:
  - `VolumeSelect` before `VolumeActions` means volume condition context.
  - `VolumeActions` before `VolumeEnd` means volume action context.
  - `FileSelect` before `FileActions` means file condition context.
  - `FileActions` before `FileEnd` means file action context.
- Return `parentHint` values that map to existing languageData parents, such as:
  - `script`
  - `volume_condition`
  - `volume_action`
  - `file_condition`
  - `file_action`
  - `sort`
  - `settingInline`

This should be intentionally conservative. Wrong context is worse than unknown context.

### 4. `parameterTemplates.js`

Implement `getParameterTemplate(keyword, contextInfo)`.

First version should return optional suffixes for selected keywords. Keep the list small and high-confidence.

Examples:

```js
mounted -> '(yes)'
writable -> '(yes)'
remote -> '(no)'
name -> '("C:")'
label -> '("")'
commandlinevolumes -> '()'
defragment -> '(Fast)'
fastfill -> '()'
sortbyname -> '(Ascending)'
whenfinished -> '(Wait)'
batterypower -> '(Ask)'
windowsize -> '(Restore)'
```

Do not force parameter templates for every keyword.

The first implementation may use these templates only when it is safe to append them, for example when the user has typed a complete keyword and the next character is not already `(`.

### 5. `nextKeywordProvider.js`

Implement `getNextLikelyKeywords(contextInfo, keywords)`.

First version should:

- Return context-filtered keywords by parent.
- Prefer `KEYWORDS_BY_PARENT` when available.
- Fall back to filtering `KEYWORDS` by `parent`.
- Return an empty array when context is unknown.

This is for future behavior and logging/diagnostics support. It does not need to show UI yet.

### 6. `extension.js` integration

In `src/extension.js`:

- Import the new `CompletionPointProvider`.
- Import language data from `./server/languageData`.
- Instantiate the provider once during activation.
- Register `vscode.languages.registerInlineCompletionItemProvider({ language: 'mydfrg' }, ...)`.
- Add the registration to `context.subscriptions`.
- Keep the registration function small.

Do not duplicate keyword arrays in `extension.js`.

### 7. Logging

Logging should be minimal.

If using the existing logger:

- Log provider registration at debug level.
- Do not log on every keystroke unless verbosity is very high.
- Never show user-facing warnings for normal no-match cases.

### 8. Safety and Performance

The provider must not:

- Read or write files.
- Spawn child processes.
- Scan the workspace.
- Run the full parser on every keystroke.
- Trigger diagnostics directly.
- Modify documents.

It may:

- Inspect the current line.
- Inspect a bounded number of nearby lines, for example up to 100 lines above the cursor.
- Use existing in-memory language data.
- Return ghost-text inline completion items.

## Acceptance Criteria

After the task is complete:

1. `extension.js` contains only thin inline completion registration logic.
2. Inline completion works for at least basic keyword continuation.
3. The logic is organized under `src/completion/`.
4. The implementation uses existing `languageData.js` keyword data.
5. The provider does not perform heavy work during typing.
6. No existing diagnostics, document links, preview, language server startup, or diagnostic navigator functionality is broken.
7. `npm run build` completes successfully, or any build failure is documented with the exact error.
8. The response lists all created and modified files by path.
9. The response includes a short revision log.

## Expected Created Files

```text
src/completion/completionPointProvider.js
src/completion/inlineCompletionBuilder.js
src/completion/completionContext.js
src/completion/parameterTemplates.js
src/completion/nextKeywordProvider.js
```

## Expected Modified Files

```text
src/extension.js
```

## Validation Steps

Run:

```powershell
npm run build
```

Then manually test in a `.MyDc` or `.MyD` file:

```mydefrag
Mou
```

Expected inline ghost text should complete toward:

```mydefrag
Mounted
```

Also test at least:

```mydefrag
Def
Sor
Vol
Fil
```

## Constraints

- Use CommonJS modules.
- Preserve existing comments and formatting style where practical.
- Keep changes additive and low-risk.
- Do not rename public APIs unless necessary.
- Do not remove existing providers or commands.
- Do not change package activation events unless necessary.
- Do not alter parser semantics in this task.

## Response Format Required From Codex

Codex should finish with:

```text
Summary:
- ...

Created files:
- path

Modified files:
- path

Validation:
- command run
- result

Revision log:
- ...

Notes / follow-up:
- ...
```
