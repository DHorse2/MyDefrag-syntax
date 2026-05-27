# MyDefrag Script Extension for VSCodium

A VSCodium extension providing language support for MyDefrag scripting files (`.MyDc` / `.MyD`).

---

## Features

### Syntax Highlighting

MyDefrag script files are recognised and coloured automatically. Token colours can be customised via `editor.tokenColorCustomizations` in your user settings (the update script applies defaults for macros and variables).

### Go to Definition — `F12`

Places the cursor on the `SetVariable(VarName, ...)` declaration for the variable name under the cursor. Works across all `.MyDc` / `.MyD` files in the workspace.

### Find All References — `Shift+F12`

Lists every occurrence of the word under the cursor across the entire workspace.

### Include Navigation — `Ctrl+Click`

Detects `!include "relative\path"!` directives and turns the path into a clickable link that opens the referenced file directly.

### Open Preview

***IMPORTANTLY, the PREVIEW WILL MATCH WHAT MYDEFRAG REPORTS for error line numbers.***

Runs the preprocessor on the current file and opens the merged output beside it, similar to the Markdown preview workflow. However, there are two columns for line number. First the current total line processed. Then the current line number within the include directive.

This is used in debugging MyDefrag scripts. Critically, when a script runs the include directives are inserted into the script recursively creating a merged script. Errors reported use the total (merged) line number, and not the actual (script) line number.

Trigger via either:

- Right-click the **editor tab** → **Open Preview**
- The toolbar icon in the editor title bar

The preview file is written alongside the source with a `.merged` infix, e.g. `MyScript.merged.MyDc`.

---

## The Preprocessor (`mydefrag-preprocess.js`)

The preprocessor recursively resolves `!include "..."!` directives and produces a single merged output file. Every content line is annotated with two line-number columns:

```text
<outLine> <srcLine> <content>
```

| Column | Meaning |
| --- | --- |
| `outLine` | Running line number in the merged output |
| `srcLine` | Line number within the originating source file |

Include boundaries are marked with unnumbered `BEGIN` / `END` annotations that show the depth, file path, source line count, and output line range:

```mydc
      ; >>> BEGIN [d:1] C:\Scripts\Includes\Passes.MyDc  src:42  out:10-51
   10    1 ; --- Passes ---
   11    2 FastDisk
   ...
      ; <<< END   [d:1] C:\Scripts\Includes\Passes.MyDc  src:42  out:10-51
```

A header and include map are written at the top and bottom of the output file listing every file processed.

### CLI Usage

```text
node mydefrag-preprocess.js <entryFile> [outputFile]
```

If `outputFile` is omitted the result is written next to the entry file with a `.merged` infix.

---

## Installation

Node.js is required (for the preprocessor). Download the LTS release from [nodejs.org](https://nodejs.org).

To install or update the extension into VSCodium, run from the project folder:

```powershell
.\MyDefragUpdateLive.ps1
```

The script:

1. Locates your VSCodium installation and extensions folder automatically
2. Creates / updates `local.mydc-syntax-0.1.0` in the extensions folder
3. Backs up and patches your user `settings.json` with the default token colour rules

After running, restart VSCodium for changes to take effect.

---

## File Types

| Extension | Recognised as |
| --- | --- |
| `.MyDc` | MyDefrag Script |
| `.MyD` | MyDefrag Script |
| `.mydc` | MyDefrag Script |
| `.myd` | MyDefrag Script |

---

## Language Configuration

| Feature | Value |
| --- | --- |
| Line comment | `//` |
| Block comment | `/* ... */` |
| Auto-closing brackets | `( )` |
| Auto-closing quotes | `" "` and `' '` |

---

## Project Files

| File | Purpose |
| --- | --- |
| `extension.js` | Extension entry point — registers all providers and commands |
| `mydefrag-preprocess.js` | Preprocessor — resolves includes and produces merged output |
| `mydefrag-preprocess.ps1` | PowerShell wrapper for the preprocessor |
| `mydc.tmLanguage.json` | TextMate grammar for syntax highlighting |
| `language-configuration.json` | Bracket / comment / autoclosing rules |
| `package.json` | Extension manifest |
| `MyDefragUpdateLive.ps1` | Deploy script — copies extension into VSCodium |
| `AddVsCodiumToExplorer.ps1` | Adds VSCodium to the Windows Explorer right-click menu |
