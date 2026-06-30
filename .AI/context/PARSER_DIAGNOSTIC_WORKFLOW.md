# Parser Diagnostic Workflow

## Table of Contents

- [Purpose](#purpose)
- [Diagnostic Architecture](#diagnostic-architecture)
- [Overall Validation Flow](#overall-validation-flow)
- [Client–Server Interaction](#clientserver-interaction)
- [Parser Workflow](#parser-workflow)
- [Tokenizer Workflow](#tokenizer-workflow)
- [Fragment Parsing](#fragment-parsing)
- [Diagnostic Generation](#diagnostic-generation)
- [Diagnostic Logging](#diagnostic-logging)
- [Parser State Machine](#parser-state-machine)
- [Common Failure Modes](#common-failure-modes)
- [Debugging Procedure](#debugging-procedure)
- [Recommended Investigation Order](#recommended-investigation-order)
- [Related Files](#related-files)

This document explains how parser diagnostics are produced, inspected, and debugged in the `mydefrag-syntax` VSCodium extension.

It is intended for use by David, Codex, Cline, and future AI coding assistants working on the MyDefrag language server.

## Purpose

The goal of this workflow is to make parser failures traceable from the visible editor diagnostic back to the exact tokenizer, parser, fragment, or language-data decision that produced it.

The extension is under active development, and parser behavior must be changed carefully. Many bugs appear as a diagnostic in the editor, but the true source may be one or more layers earlier in the flow.

## Diagnostic Flow Overview

```text
VSCodium editor
    │
    ▼
extension.js
    │
    ▼
LanguageClient
    │
    ▼
server.js validateDocument()
    │
    ▼
tokenizer.js
    │
    ▼
parser.js
    │
    ├── parseStatements()
    ├── parseStatement()
    ├── parseFragment()
    ├── parseFragmentKeywordBackward()
    └── helper parse functions
    │
    ▼
parser errors / warnings / hints
    │
    ▼
server.js diagnostics conversion
    │
    ▼
connection.sendDiagnostics()
    │
    ▼
VSCodium editor squiggles / Problems panel
```

## Primary Debugging Principle

Always diagnose the cause before changing parser behavior.

A visible diagnostic may be correct, incorrect, duplicated, misplaced, or a side effect of an earlier parser state error. Do not assume the highlighted line is the real source of the bug.

## Key Diagnostic Sources

Diagnostics may originate from several places:

- tokenizer errors
- parser syntax errors
- parser fragment-mode errors
- parser warnings
- parser hints placed at document start
- server-side catch blocks
- document-line range failures
- language-data mismatch
- incomplete keyword parent mapping

When debugging, identify which source produced the diagnostic before editing code.

## `server.js` Validation Flow

The central entry point is usually:

```js
validateDocument(textDocument)
```

Expected responsibilities:

- Read the current document text.
- Tokenize the text.
- Create or invoke the parser.
- Run full-script parsing first when appropriate.
- Fall back to fragment parsing when needed.
- Convert parser errors and warnings into LSP diagnostics.
- Send diagnostics back to the client.
- Log unexpected failures without crashing the language server.

The catch block around validation is important. It should report unexpected parser failures through all available channels:

```js
} catch (errResult) {
    const message = `server.js:validateDocument: Unexpected parser failure: ${errResult.message}`;
    console?.error?.(message);
    logger?.err?.(errResult, message);
    bestParser?.warningAtStart?.(message);
}
```

This pattern allows the same failure to be visible in:

- debugger console
- output channel
- document diagnostics

## Editor Diagnostic Safety

Diagnostics must not assume line numbers are always valid.

If a helper such as `docLine()` receives an out-of-range line number, it should not throw unless the failure is intentionally fatal. Prefer producing a safe diagnostic or clamping/falling back to a valid range.

Parser bugs often produce invalid ranges during development. The diagnostic layer should help expose those bugs, not hide the original failure behind a secondary exception.

## Parser Modes

The parser uses script-state concepts similar to:

```js
SCRIPT_FULL = 0
SCRIPT_FRAGMENT = 1
SCRIPT_UNKNOWN = 2
```

The distinction matters because the same keyword may be valid in one context and invalid in another.

A file may be:

- a complete MyDefrag script
- a fragment intended to be included elsewhere
- an unknown or partially valid script while the user is typing

Diagnostics must be careful not to over-report errors in fragment files.

## Full Script Parsing

The normal parser path should attempt full-document parsing first.

Typical flow:

```text
parseStatements()
    ├── parseStatement()
    ├── repeat until EOF or failure
    └── return true only when valid statement parsing reaches EOF
```

Important rule:

If `parseStatements()` succeeds but does not reach EOF, that is not necessarily a fully valid document. The parser should either continue parsing or produce a clear diagnostic explaining what stopped parsing.

This issue previously caused valid first statements to appear as syntax errors and created cascading parser confusion.

## Fragment Parsing

Fragment parsing is required because many `.MyDc` files are script fragments, not full scripts.

A primitive valid fragment may contain a single line such as:

```text
FastBoot
```

Fragment parsing should:

- Try normal statement parsing first.
- If full parsing fails, reset state as needed.
- Parse fragment keywords until EOF.
- Use the first real keyword to establish fragment kind and parent context.
- Continue validating later keywords against that established context.
- Allow nuanced handling of `script`, `any`, and incomplete contexts.
- Add a hint at the start of the file indicating where the fragment can be inserted.

## Fragment Parent Hints

When a fragment is valid only inside certain parent blocks, the parser should add a hint at `(0,0)`.

Example purpose:

```text
This fragment can be inserted into: volume_block
```

or

```text
This fragment can be inserted into: file_block
```

The hint should help the user understand whether a fragment belongs at script level, inside a `VolumeSelect` block, or inside a `FileSelect` block.

Do not treat `script` as always mandatory for fragment validation. Script-level usage may be optional or nuanced.

## Keyword Parent Handling

The language structure is approximately:

```text
script
    └── volume_block
            └── file_block
```

Examples:

```text
script-level:
    Description
    Title
    WhenFinished
    AppendLogFile
    WriteLogFile
    Message
    SetVariable
    BatteryPower

volume-level:
    VolumeSelect
    VolumeActions
    VolumeEnd
    ExcludeVolumes

file-level:
    FileSelect
    FileActions
    FileEnd
    ExcludeFiles
    FileSortBy
```

Diagnostics that report an invalid parent should include the expected parent when possible.

## `parseFragmentKeywordBackward()`

`parseFragmentKeywordBackward()` is used to infer the valid parent context of a keyword or fragment.

It must handle the full vocabulary because script fragments can start at almost any token.

This function should usually be organized as a switch statement grouped by parent or behavior:

```js
case 'or':
case 'and':
case 'not':
case 'all':
    // Operators
    return this.backwardOperator(ctx);

case 'yes':
case 'no':
    // Literals
    return this.backwardLiteral(ctx);
```

The default case should carefully distinguish between:

- known settings
- unknown keywords
- identifiers
- macros
- incomplete user input

## Settings Recognition

Settings should be detected from the language data source, not from a hardcoded duplicate list when practical.

Expected source:

```js
KEYWORDS_SETTINGS
```

Examples include:

```text
MaxRunTime
Message
Language
Title
WindowSize
DiskmapFlip
StatusBar
ZoomLevel
SetColor
Slowdown
Pause
WhenFinished
OtherInstances
RunScript
RunProgram
BatteryPower
SetScreenSaver
SetScreenPowerSaver
FileMoveChunkSize
Debug
SetStatisticsWindowText
WriteLogFile
AppendLogFile
IgnoreWrapAroundFragmentation
ProcessPriority
ExitIfTimeout
RememberUnmovables
SetVariable
```

If a setting is missing from language data, the parser may incorrectly report it as an unknown keyword.

## Logging Strategy

Use logging to expose parser state rather than guessing.

Useful logging levels already used in this project include:

```text
level 3: normal debugging detail
level 5: detailed parser and keyword tracing
```

Useful parser logging includes:

- current token text
- token type
- token position
- keyword lowercase value
- keyword data record
- keyword parent
- fragment kind
- fragment parent kind
- parser mode
- parse function entered
- parse function returned

Example logging intent:

```text
parseFragment: keyword=FastBoot parent=file_block kind=file_action
parseFragmentKeywordBackward: keyword=or parent=operator
```

## Output Channels to Check

When debugging with Codex or Cline, check multiple evidence sources:

1. VSCodium editor squiggles
2. Problems panel
3. MyDefrag Issues output channel
4. Debug console
5. Language server console output
6. Logger output
7. Current parser state variables

Do not rely only on the visible squiggle.

## Common Failure Patterns

### First valid statement marked as invalid

Likely causes:

- `parseStatements()` succeeds partially but EOF handling is wrong.
- Parser position is not reset before fragment fallback.
- A valid top-level keyword is missing from language data.
- Parser state is changed too early.

### Cascading errors after one valid line

Likely causes:

- Parser did not consume a token.
- Parser consumed too much.
- Block start/end state is wrong.
- EOF was treated as an error too early.

### Fragment file reports full-script errors

Likely causes:

- Fragment fallback did not run.
- Parser mode stayed `SCRIPT_FULL`.
- Fragment parent was inferred as `script` too aggressively.
- First keyword did not establish fragment context.

### Unknown keyword diagnostic on a real keyword

Likely causes:

- Missing entry in `languageData.js`.
- Case normalization mismatch.
- Keyword exists in completion data but not parser data.
- Setting keyword not included in `KEYWORDS_SETTINGS`.

### Diagnostic range exception

Likely causes:

- Out-of-range line number.
- Token has missing or invalid location.
- Diagnostic helper throws before original parser error is shown.

## Codex Debugging Method

When using Codex to debug this extension, use a diagnosis-first prompt.

Example:

```text
Check parser.js and server.js for the source of this diagnostic.
Do not rewrite the parser.
First explain the root cause.
Preserve comments and formatting.
Make the smallest additive change possible.
```

For parser work, Codex should be asked to identify:

- affected files
- suspected function
- exact control-flow problem
- whether token position is reset correctly
- whether parser mode is correct
- whether language data is missing
- minimal patch

Codex should not be allowed to perform broad rewrites unless explicitly requested.

## Required Development Rules

When editing diagnostic or parser code:

- Do not remove comments.
- Preserve existing comment style.
- Prefer additive changes.
- Minimize diffs.
- Do not rename public APIs unless requested.
- Do not change unrelated formatting.
- Preserve existing error handling patterns.
- Preserve logger calls unless deliberately replacing them.
- Use CommonJS unless the file already uses ESM.
- Add JSDoc for new functions.
- Explain activation-path changes.
- Explain parser behavior changes.

## Recommended Debugging Checklist

Before changing code:

- Reproduce the diagnostic with a minimal `.MyDc` file.
- Identify whether the file is full script or fragment.
- Identify the exact visible diagnostic message.
- Check output channel logs.
- Check whether tokenizer output is correct.
- Check parser mode.
- Check parser position before and after the failing function.
- Check whether the keyword exists in `languageData.js`.
- Check whether the parent context is correct.
- Check whether EOF handling is correct.

After changing code:

- Test a full valid script.
- Test a one-line fragment.
- Test a volume-level fragment.
- Test a file-level fragment.
- Test an unknown keyword.
- Test incomplete typing.
- Confirm diagnostics appear on the correct line.
- Confirm no secondary diagnostic-range exception occurs.
- Confirm output channel logging still works.

## Minimal Test Fragments

Use these small files to isolate parser behavior.

### Single keyword fragment

```text
FastBoot
```

Expected: valid fragment or useful parent hint, not a generic syntax failure.

### Top-level statement

```text
Description("Test script")
```

Expected: valid top-level statement.

### Volume block skeleton

```text
VolumeSelect
VolumeActions
VolumeEnd
```

Expected: volume-level structure recognized.

### File block skeleton

```text
FileSelect
FileActions
FileEnd
```

Expected: file-level structure recognized when context allows it.

### Unknown keyword

```text
DefinitelyNotAKeyword
```

Expected: clear unknown keyword diagnostic.

## What Good Diagnostics Should Do

A good diagnostic should tell the user:

- what is wrong
- where it is wrong
- what parent context was expected, when known
- whether the file may be a fragment
- whether the fragment has a valid insertion context

Diagnostics should help the user fix the script rather than merely report that parsing failed.

## Current Project Bias

During active development, diagnostics are also a debugging tool.

It is acceptable for diagnostics to be slightly verbose if they reveal parser state, parent context, or fragment expectations. Once the parser stabilizes, messages can be simplified for end users.

## Related Files

| File | Purpose |
| ------ | --------- |
| extension.js | VS Code client entry point |
| server.js | Language server entry point and document validation |
| parser.js | Recursive-descent parser and diagnostics |
| tokenizer.js | Lexical scanner |
| languageData.js | Language definitions, keywords, metadata |
| KEY_FILES.md | Important project files |
| PARSER_CALL_TREE.md | Parser execution flow |
| CLINE_PROJECT_CONTEXT.md | Overall project context |
