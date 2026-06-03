# MyDefrag Script Extension for VSCodium

A VSCodium extension providing language support for MyDefrag scripting files (***.MyDc*** / ***.MyD***).

**MyDefrag** is a powerful disk optimization and defragmentation tool for Windows that gives users precise control over how files are organized on a storage device. Unlike traditional defragmenters that use a fixed optimization strategy, MyDefrag uses a flexible scripting language that allows administrators, power users, and developers to define custom file-selection, placement, consolidation, and optimization rules.

Scripts can target specific file types, directories, free space, or usage patterns, making it possible to create highly specialized optimization strategies ranging from simple defragmentation to advanced file-placement schemes. This extension provides language support for MyDefrag scripts and script fragments, including syntax highlighting, validation, navigation, and other development tools to make creating and maintaining MyDefrag automation scripts easier.

---

## Features

The MyDefrag Syntax Extension has the expected features:

* Syntax Highlighting
* Go to Definition — F12
* Find All References — Shift+F12
* Include and Command Link Navigation — Ctrl+Click
* Open Preview - create a merged preprocessed script
* Language Server - fully integrated with standard functionality

### Syntax Highlighting

MyDefrag script files are recognised and coloured automatically. Token colours can be customised via ***editor.tokenColorCustomizations*** in your user settings (the update script applies defaults for macros and variables).

### Go to Definition — F12

Places the cursor on the ***SetVariable(VarName, ...)*** declaration for the variable name under the cursor. Works across all ***.MyDc*** / ***.MyD*** files in the workspace.

### Find All References — Shift+F12

Lists every occurrence of the word under the cursor across the entire workspace.

### Include Navigation — Ctrl+Click

Detects !include ***"relative\path"!*** directives and turns the path into a clickable link that opens the referenced file directly.

A good place for the new language server section would be immediately after **Features** and before **Open Preview**, since it is now one of the extension's major capabilities.

You could add:

### Language Server

The extension includes a custom MyDefrag Language Server that performs real-time parsing and validation of both complete scripts (**.MyDc**) and script fragments (**.MyD**). Validation occurs as you type and reports errors, warnings, and informational messages directly through the editor and the **Problems** panel.

Current capabilities include:

* **Incremental validation** while editing
* **Script state detection** based on file type and completeness

  * **.MyD** → Full Scripts that MyDefrag can
  * **.MyDc** → Script Fragments - includes and work-in-progress
  * **.bat, .ps1** → BATCH and Command Script's Extended Links.
* **Fragment validation** for reusable script components and work-in-progress
* **Parser document state tracking** displayed in the status bar
* **Intelligent link detection** links such as !include ???! are validated and searched for and can be followed
* **Extended link detection** run command links such as RunProcess(???), commands, and BATCH files (and contents) are validated too.
* **Syntax error reporting** with accurate line and column locations
* **Unexpected token detection**
* **Workspace-wide navigation support** through integration with Definition and Reference providers

The language server uses the same parser infrastructure as the extension's validation tools, allowing script authors to identify problems before running MyDefrag. Validation results appear in:

* Editor squiggles
* Hover diagnostics
* The **Problems** panel
* Status bar parser state indicators

Parser modes may automatically change during validation when the detected content does not match the expected file type, allowing more accurate diagnostics for partially written or incomplete scripts.

---

### Open Preview

****IMPORTANTLY, the PREVIEW WILL MATCH WHAT MYDEFRAG REPORTS for error line numbers.****

Open Preview will run the preprocessor on the current file and attempt to create a preview of what MyDefrag will assemble and execute. If successful it opens the merged output beside current tab, similar to the Markdown preview workflow. However, there are two columns for line number. First the current total line processed. Then the current line number within the include directive.

This is used in debugging MyDefrag scripts. Critically, when a script runs the include directives are inserted into the script recursively creating a merged script. Errors reported use the total (merged) line number, and not the actual (script) line number.

Trigger via either:

* Right-click the ***editor tab*** → ***Open Preview***
* The toolbar icon in the editor title bar

The preview file is written alongside the source with a ***.merged*** infix, e.g. ***MyScript.merged.MyDc***.

---

## Design

### Language Summary

The scripting language has serious limitations. MyDefrag scripts use a declarative, rule-based domain-specific language (DSL) with no conditional control flow (no if/else statements). Disk optimization behavior is defined through structured selection and action rules that can also be built using included in-line components.

### Use Cases

This extension was developed for (and used to maintain) the TaylorDo Disk Optimizer application. The system is implemented using MyDefrag scripts and consists of over 800 script fragments organized using a hierarchical, science-based methodology designed around the constraints of a declarative, feature-limited scripting language.

Whereas custom scripts created by users tend to number from 1 to several these are all very small, managable code bases. MyDefrag is extremely hard to debug making agile development methodology extremely useful in tracking down errors. This is similarly true of Git change tracking.

### Solution

With complex script design or large applications (800 fragments) working with the scripts and executable quickly become difficult; often to the point of discouraging further development. The MyDefrag-Syntax extension solves most of these problems while provide robust validation and a fully integrated language server.

Contains both client-side extension code (`extension.js`) and server-side language analysis (`server.js`).

---

## The Preprocessor (mydefrag-preprocess.js)

The preprocessor recursively resolves ***!include "..."!*** directives and produces a single merged output file. Every content line is annotated with two line-number columns:

```text
<outLine> <srcLine> <content>
```

| Column | Meaning |
| --- | --- |
| outLine | Running line number in the merged output |
| srcLine | Line number within the originating source file |

Include boundaries are marked with unnumbered ***BEGIN*** / ***END*** annotations that show the depth, file path, source line count, and output line range:

```mydc
      ; >>> BEGIN [d:1] C:\Scripts\Includes\Passes.MyDc  src:42  out:10-51
   10    1 ; --- Passes ---
   11    2 FastDisk
   ...
      ; <<< END   [d:1] C:\Scripts\Includes\Passes.MyDc  src:42  out:10-51
```

A header, include map, and missing files map are written at the bottom of the output file listing every file processed.

### CLI Usage

```text
node mydefrag-preprocess.js <entryFile> [outputFile]
```

If ***outputFile*** is omitted the result is written next to the entry file with a ***.merged*** infix.

---

## Installation

Node.js is required (for the preprocessor). Download the LTS release from [nodejs.org](https://nodejs.org).

### Quick Start using downloaded Setup executable

Click the download button. Run the MyDefragInstall.exe and select "Full" + [install].

### Installation using source code download

To install or update the extension into VSCodium, download the project and run (from the project folder):

```powershell
.\scripts\MyDefragUpdateLive.ps1
```

The script:

1. Locates your VSCodium installation and extensions folder automatically
2. Creates / updates ***local.mydc-0.1.0*** in the extensions folder
3. Backs up and patches your user ***settings.json*** with the default token colour rules

After running, restart VSCodium for changes to take effect.

### Project Files

| File                   | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| extension.js           | Extension entry point — registers all providers and commands |
| server.js              | Language Server Protocol (LSP) host and Lexical analyzer     |
| parser.js              | MyDefrag parser and validation engine                        |
| mydefrag-preprocess.js | Preprocessor — resolves includes and produces merged output  |
| logger.js              | Common logging and error reporting                           |
| mydc.tmLanguage.json   | Grammar definition for the language server                   |
| ini.js                 | Initialization for the language server                       |
| package.json           | for the extension                                            |
| setting.json           | User Settings (Json) to store highlight colors               |
| setting.json           | User Setting (.vscode) has ignores in "mydc.batLink.exclude"[|
| readme.md              | for the language server                                      |

---

## File Types

| Extension | Recognised as |
| --- | --- |
| .MyD | MyDefrag Script |
| .myd | MyDefrag Script |
| .MyDc | MyDefrag Script Include |
| .mydc | MyDefrag Script Include |

---

## Language Configuration

| Feature | Value |
| --- | --- |
| Line comment | # |
| Block comment | /\* ... /*/ |
| Auto-closing brackets | ( ) |
| Auto-closing quotes | " " and ' ' |

---

## Project Files

| File | Purpose |
| --- | --- |
| extension.js | Extension entry point — registers all providers and commands |
| mydefrag-preprocess.js | Preprocessor — resolves includes and produces merged output |
| syntaxes | Grammar for mydc scripts and bat links |
| mydc.tmLanguage.json | TextMate grammar for syntax highlighting |
| common | Extension common or shared |
| logger.js | Extension logging of diagnostics, errors, warnings and information. |
| configuration | Extension configuration and package |
| package.json | Extension manifest |
| language-configuration.json | Bracket / comment / autoclosing rules |
| scripts | Commands for mydc scripts and bat links |
| mydefrag-preprocess.ps1 | PowerShell wrapper for the preprocessor |
| MyDefragUpdateLive.ps1 | Deploy script — copies extension into VSCodium |
| AddVsCodiumToExplorer.ps1 | Adds VSCodium to the Windows Explorer right-click menu |
| MyDefragUpdateLive.ps1 | Deploy script — copies extension into VSCodium |
| AddVsCodiumToExplorer.ps1 | Adds VSCodium to the Windows Explorer right-click menu |
