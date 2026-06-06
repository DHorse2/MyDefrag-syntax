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
* Via the command line. Usage: node mydefrag-preprocess.js \<entryFile\> [outputFile]

If outputFile is omitted, output is written alongside the entry file with a .merged.MyDc extension. The preview file is written alongside the source with a ***.merged*** infix, e.g. ***MyScript.merged.MyDc***.

Preview processing recursively resolves !include "..."! directives in MyDefrag scripts, producing a merged output file with:

* Two line-number columns on every content line
* Single-line BEGIN / END annotations (not numbered) at each include boundary

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

```mydfrg
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
2. Creates / updates ***local.mydfrg-0.1.0*** in the extensions folder
3. Backs up and patches your user ***settings.json*** with the default token colour rules

After running, restart VSCodium for changes to take effect.

### Project Files

| File | Purpose |
| --- | --- |
| extension.js | Extension entry point — registers all providers and commands |
| mydefrag-preprocess.js | Preprocessor — resolves includes and produces merged output |
| syntaxes | Grammar for mydfrg scripts and bat links |
| mydfrg.tmLanguage.json | TextMate grammar for syntax highlighting |
| common | Extension common or shared |
| logger.js | Extension logging of diagnostics, errors, warnings and information. |
| configuration | Extension configuration and package |
| package.json | Extension manifest |
| language-configuration.json | Bracket / comment / autoclosing rules |
| scripts | Commands for mydfrg scripts and bat links |
| mydefrag-preprocess.ps1 | PowerShell wrapper for the preprocessor |
| MyDefragUpdateLive.ps1 | Deploy script — copies extension into VSCodium |
| AddVsCodiumToExplorer.ps1 | Adds VSCodium to the Windows Explorer right-click menu |
| MyDefragUpdateLive.ps1 | Deploy script — copies extension into VSCodium |
| AddVsCodiumToExplorer.ps1 | Adds VSCodium to the Windows Explorer right-click menu |

---

## File Types

| Extension | Recognised as |
| --- | --- |
| .MyD | MyDefrag Script |
| .myd | MyDefrag Script |
| .MyDc | MyDefrag Script Include |
| .mydc | MyDefrag Script Include |

---

## DEVELOPER settings

### Open design

These values are important depending on the project context and methodology (paradigm/desigh pattern).
With resonable defaults the usage and meaning of realitve paths varies.
***Defaults:***

| Key | Value |
| --- | --- |
| referenceRelativePathLevel | Warning |
| referenceContainsMacrosLevel | Hint |
| fileReferenceFoundLevel | Information |
| fileReferenceNotFoundLevel | Error |

The ambiguos presence of macros (variables) in paths might have different importance.
File found/Not found can be independently handled. The regular defaults can be overriden by *mode="strict"*.
***Strict mode has these defaults:***

| Key | Value |
| --- | --- |
| referenceRelativePathLevel | severity.Error |
| referenceContainsMacrosLevel | severity.Warning |
| fileReferenceFoundLevel | severity.Information |
| fileReferenceNotFoundLevel | severity.Error |

### Inline ini customization

***Topic 1 - Using the generic readIni in this and other projects. In the project you can edit the "ini.js" file.***

There are two ways to add to built in .ini file. The quickest way is directly (inline) in the file.

```json
// place your ini value substitution mappings here (quick)
// const inlineIniMap = {
    // maxVerbose is a synonym fo 7 (it isn't)
    maxVerbose: 7,
    // allow 12 to be used
    // 12: "12"
// };
```

### Starndard INI file usage

A more robust, standardized approach is to edit the "channelName+`Map.ini`" (so the MyDefrag LanguageMap.ini) file and add your ini settings there. channelName (in OUTPUT) is passed to initialization and used throughout the language server.

The "ini.js" readIni function is a general purpose tool. It takes these inputs:
function initialize(

| Value | Purpose | Optional |
| --- | --- | --- |
| iniPath | ToDo | NO |
| channelName | ToDo | NO |
| debugEnabled | ToDo | Yes |
| verbose | ToDo | Yes |
| logEnabled | ToDo | Yes |
| useStrict | ToDo | Yes |
| referenceRelativePath | ToDo | Yes |
| referenceContainsMacros | ToDo | Yes |
| referenceFound | ToDo | Yes |
| referenceNotFound | ToDo | Yes |

### Configuration variables

Initialization provides several outputs:

| Variable | Purpose |
| --- | --- |
| ini | ToDo |
| debugOn | ToDo |
| verboseLevel | ToDo |
| logOn | ToDo |
| referenceRelativePathLevel | ToDo |
| referenceContainsMacrosLevel | ToDo |
| fileReferenceFoundLevel | ToDo |
| fileReferenceNotFoundLevel | ToDo |
| iniErrors | ToDo |

### Logger features

The logger exports the following intuitive functions:

```json
module.exports = {
    initialize,
    logToConsole,
    dbg,
    warn,
    info,
    err,
    msg
};
```

### VERBOSE

verboseLevel:

| Value | Meaning |
| --- | --- |
| 0 | silent |
| 1 | errors |
| 2 | warnings |
| 3 | information |
| 4 | hint |
| 5... | debug basic with higher values (currently < 10). Default value |

### Debug On/Off

Debug (debugOn) must be on or logger.dbg messages will be ignored. It is a true/false value.

### verboseLevel

ToDo

### logOn

ToDo

### referenceRelativePathLevel

ToDo

### referenceContainsMacrosLevel

ToDo

### fileReferenceFoundLevel

ToDo

### fileReferenceNotFoundLevel

ToDo

### iniErrors

ToDo

### initialize

ToDo

### readIni

ToDo

## Comments in scripts

| Value | Meaning |
| --- | --- |
| Line comment | # |
| Block comment | /\* ... /*/ |
| Auto-closing brackets | ( ) |
| Auto-closing quotes | " " and ' ' |

---
