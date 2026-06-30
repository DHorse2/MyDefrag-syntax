# MyDefrag Script Extension for VSCodium

A VSCodium extension providing language support for MyDefrag scripting files (***.MyDc*** / ***.MyD***).

**MyDefrag** is a powerful disk optimization and defragmentation tool for Windows that gives users precise control over how files are organized on a storage device. Unlike traditional defragmenters that use a fixed optimization strategy, MyDefrag uses a flexible scripting language that allows administrators, power users, and developers to define custom file-selection, placement, consolidation, and optimization rules.

Scripts can target specific file types, directories, free space, or usage patterns, making it possible to create highly specialized optimization strategies ranging from simple defragmentation to advanced file-placement schemes. This extension provides language support for MyDefrag scripts and script fragments, including syntax highlighting, validation, navigation, and other development tools to make creating and maintaining MyDefrag automation scripts easier.

---

## Table of Contents

- [Features](#features)
  - [Syntax Highlighting](#syntax-highlighting)
  - [Go to Definition — F12](#go-to-definition--f12)
  - [Find All References — Shift+F12](#find-all-references--shiftf12)
  - [Include Navigation — Ctrl+Click](#include-navigation--ctrlclick)
  - [Language Server](#language-server)
  - [Snippets](#snippets)
  - [Open Preview](#open-preview)
- [Design](#design)
  - [Language Summary](#language-summary)
  - [Use Cases](#use-cases)
  - [Solution](#solution)
- [The Preprocessor (mydefrag-preprocess.js)](#the-preprocessor-mydefrag-preprocessjs)
  - [CLI Usage](#cli-usage)
- [Installation](#installation)
  - [Quick Start using downloaded Setup executable](#quick-start-using-downloaded-setup-executable)
  - [Installation using source code download](#installation-using-source-code-download)
  - [Project Files](#project-files)
- [File Types](#file-types)
- [DEVELOPER settings](#developer-settings)
  - [Open design](#open-design)
  - [Inline ini customization](#inline-ini-customization)
  - [Standard INI file usage](#standard-ini-file-usage)
  - [Configuration variables](#configuration-variables)
  - [Logger features](#logger-features)
  - [VERBOSE](#verbose)
  - [Debug On/Off](#debug-onoff)
  - [verboseLevel](#verboselevel)
  - [isLogOn](#islogon)
  - [referenceRelativePathLevel](#referencerelativepathlevel)
  - [referenceContainsMacros](#referencecontainsmacros)
  - [referenceFileFoundLevel](#referencefilefoundlevel)
  - [referenceFileNotFoundLevel](#referencefilenotfoundlevel)
  - [iniErrors](#inierrors)
  - [initialize](#initialize)
  - [readIni](#readini)
- [Comments in scripts](#comments-in-scripts)
  - [What are the colors on the diskmap?](#what-are-the-colors-on-the-diskmap)

---

## Features

The MyDefrag Syntax Extension has the expected features:

- Syntax Highlighting
- Go to Definition — F12
- Find All References — Shift+F12
- Include and Command Link Navigation — Ctrl+Click
- Snippets for common MyDefrag structures, conditions, and actions
- Open Preview - create a merged preprocessed script
- Language Server - fully integrated with standard functionality

### Syntax Highlighting

MyDefrag script files are recognized and colored automatically. Token colors can be customized via ***editor.tokenColorCustomizations*** in your user settings (the update script applies defaults for macros and variables).

### Go to Definition — F12

Places the cursor on the ***SetVariable(VarName, ...)*** declaration for the variable name under the cursor. Works across all ***.MyDc*** / ***.MyD*** files in the workspace.

### Find All References — Shift+F12

Lists every occurrence of the word under the cursor across the entire workspace.

### Include Navigation — Ctrl+Click

Detects !include ***"relative\path"!*** directives and turns the path into a clickable link that opens the referenced file directly.

### Language Server

The extension includes a custom MyDefrag Language Server that performs real-time parsing and validation of both complete scripts (**.MyD**) and script fragments (**.MyDc**). Validation occurs as you type and reports errors, warnings, and informational messages directly through the editor and the **Problems** panel.

Current capabilities include:

- **Incremental validation** while editing
- **Script state detection** based on file type and completeness

  - **.MyD** → Full scripts
  - **.MyDc** → Script fragments, includes, and work-in-progress
  - **.bat** → Batch command link detection
- **Fragment validation** for reusable script components and work-in-progress
- **Parser document state tracking** displayed in the status bar
- **Intelligent link detection** links such as !include ???! are validated and searched for and can be followed
- **Extended link detection** run command links such as RunProcess(???), commands, and batch files are validated too.
- **Syntax error reporting** with accurate line and column locations
- **Unexpected token detection**
- **Workspace-wide navigation support** through integration with Definition and Reference providers

The language server uses the same parser infrastructure as the extension's validation tools, allowing script authors to identify problems before running MyDefrag. Validation results appear in:

- Editor squiggles
- Hover diagnostics
- The **Problems** panel
- Status bar parser state indicators

Parser modes may automatically change during validation when the detected content does not match the expected file type, allowing more accurate diagnostics for partially written or incomplete scripts.

---

### Snippets

The extension contributes snippets for common MyDefrag script structures, volume and file conditions, file actions, script settings, variables, date/time expressions, and math helpers. Snippets are available in `.MyD` and `.MyDc` files through the editor's normal completion list.

Common prefixes include:

- `md-script` — complete script scaffold
- `md-volume` — `VolumeSelect` / `VolumeActions` / `VolumeEnd` block
- `md-file` — `FileSelect` / `FileActions` / `FileEnd` block
- `md-defragment`, `md-fast-fill`, `md-sort-name` — common file actions
- `md-set-variable-number`, `md-set-variable-string` — variable declarations

---

### Open Preview

****IMPORTANTLY, the PREVIEW WILL MATCH WHAT MYDEFRAG REPORTS for error line numbers.****

Open Preview will run the preprocessor on the current file and attempt to create a preview of what MyDefrag will assemble and execute. If successful it opens the merged output beside current tab, similar to the Markdown preview workflow. However, there are two columns for line number. First the current total line processed. Then the current line number within the include directive.

This is used in debugging MyDefrag scripts. Critically, when a script runs, the include directives are inserted into the script recursively creating a merged script. Errors reported use the total (merged) line number, and not the actual (script) line number.

Trigger via either:

- Right-click the ***editor tab*** → ***Open Preview***
- The toolbar icon in the editor title bar
- Via the command line. Usage: node mydefrag-preprocess.js \<entryFile\> [outputFile]

If outputFile is omitted, output is written alongside the entry file with a .merged.MyDc extension. The preview file is written alongside the source with a ***.merged*** infix, e.g. ***MyScript.merged.MyDc***.

Preview processing recursively resolves !include "..."! directives in MyDefrag scripts, producing a merged output file with:

- Two line-number columns on every content line
- Single-line BEGIN / END annotations (not numbered) at each include boundary

---

## Design

### Language Summary

The scripting language has serious limitations. MyDefrag scripts use a declarative, rule-based domain-specific language (DSL) with no conditional control flow (no if/else statements). Disk optimization behavior is defined through structured selection and action rules that can also be built using included in-line components.

### Use Cases

This extension was developed for (and used to maintain) the TaylorDo Disk Optimizer application. The system is implemented using MyDefrag scripts and consists of over 800 script fragments organized using a hierarchical, science-based methodology designed around the constraints of a declarative, feature-limited scripting language.

Whereas custom scripts created by users tend to number from 1 to several these are all very small, manageable code bases. MyDefrag is extremely hard to debug making agile development methodology extremely useful in tracking down errors. This is similarly true of Git change tracking.

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

To build and install the extension into VSCodium, download the project and run (from the project folder):

```powershell
.\scripts\build-and-deploy.ps1
```

The script:

1. Locates your VSCodium installation and extensions folder automatically
2. Packages the extension with `vsce`
3. Creates / updates ***macrodm.mydefrag-syntax-0.4.0*** in the extensions folder

After running, restart VSCodium for changes to take effect.

For a direct source-copy update without VSIX packaging, run:

```powershell
.\scripts\update-live-MyDefrag.ps1
```

### Project Files

| File | Purpose |
| --- | --- |
| src/extension.js | Extension entry point — registers providers, commands, links, and the language client |
| src/server/server.js | Language server entry point — validation, diagnostics, and workspace scanning |
| src/server/parser.js | MyDefrag parser |
| src/server/tokenizer.js | MyDefrag tokenizer |
| src/server/languageData.js | Keyword and predefined identifier data |
| src/preprocess/mydefrag-preprocess.js | Preprocessor — resolves includes and produces merged output |
| src/shared/ini.js | INI and diagnostic severity configuration |
| src/shared/logger.js | Extension and server logging |
| src/language-configuration.json | Bracket, comment, and autoclosing rules |
| syntaxes/mydfrg.tmLanguage.json | TextMate grammar for syntax highlighting |
| snippets/mydfrg.code-snippets | MyDefrag snippets |
| scripts/build-and-deploy.ps1 | Builds a VSIX and optionally installs it into VSCodium |
| scripts/update-live-MyDefrag.ps1 | Copies source files directly into a local VSCodium extension folder |

---

## File Types

| Extension | Recognized as |
| --- | --- |
| .MyD | MyDefrag Script |
| .myd | MyDefrag Script |
| .MyDc | MyDefrag Script Include |
| .mydc | MyDefrag Script Include |
| .MYD | MyDefrag Script |
| .MYDC | MyDefrag Script Include |

---

## DEVELOPER settings

### Open design

These values are important depending on the project context and methodology (paradigm/design pattern).
With reasonable defaults the usage and meaning of relative paths varies.
***Defaults:***

| Key | Value |
| --- | --- |
| referenceRelativePathLevel | Error |
| referenceContainsMacros | Information |
| referenceFileFoundLevel | Information |
| referenceFileNotFoundLevel | Error |
| fragmentParentLevel | Information |

The ambiguous presence of macros (variables) in paths might have different importance.
File found/Not found can be independently handled. The regular defaults can be overridden by *mode="strict"*.
***Strict mode has these defaults:***

| Key | Value |
| --- | --- |
| referenceRelativePathLevel | severity.Error |
| referenceContainsMacros | severity.Warning |
| referenceFileFoundLevel | severity.Information |
| referenceFileNotFoundLevel | severity.Error |

### Inline ini customization

***Topic 1 - Using the generic readIni in this and other projects. In the project you can edit the "ini.js" file.***

There are two ways to add to built in .ini file. The quickest way is directly (inline) in the file.

```json
// place your ini value substitution mappings here (quick)
// const inlineIniMap = {
    // maxVerbose is a synonym for 7 (it isn't)
    maxVerbose: 7,
    // allow 12 to be used
    // 12: "12"
// };
```

### Standard INI file usage

#### Overview

A more robust, standardized approach is to edit the "channelName+`Map.ini`" (so the MyDefrag LanguageMap.ini) file and add your ini settings there. channelName (in OUTPUT) is passed to initialization and used throughout the language server.

The "ini.js" readIni function is a general purpose tool. It takes these inputs:
function initialize(

| Value | Purpose | Optional |
| --- | --- | --- |
| iniPath | Path to the extension INI configuration file | NO |
| channelName | Logger/output channel name | NO |
| debugEnabled | Enables debug logging | Yes |
| verbose | Verbosity level from 0 to 10 | Yes |
| logEnabled | Enables log output | Yes |
| useStrict | Enables strict reference diagnostics | Yes |
| referenceRelativePath | Severity for references found by walking parent folders | Yes |
| referenceContainsMacros | Severity for references containing execution-time macros | Yes |
| referenceFound | Severity for references whose target file is found | Yes |
| referenceNotFound | Severity for references whose target file is not found | Yes |

### Configuration variables

Initialization provides several outputs:

| Variable | Purpose |
| --- | --- |
| ini | Parsed INI/configuration data |
| debugOn | Whether debug logging is enabled |
| verboseLevel | Active verbosity level |
| isLogOn | Whether logging is enabled |
| iniErrors | INI parsing or configuration warnings |

#### Reporting and Analysis Options

These settings control how file references are analyzed and reported. The most appropriate values depend on the project's structure, coding standards, and development methodology.

The default configuration provides a balanced set of diagnostics suitable for both basic and complex projects:

| Setting                        | Default Severity |
| ------------------------------ | ---------------- |
| `referenceRelativePathLevel`   | Error            |
| `referenceContainsMacros`      | Information      |
| `referenceFileFoundLevel`      | Information      |
| `referenceFileNotFoundLevel`   | Error            |
| `fragmentParentLevel`          | Information      |

**`referenceRelativePathLevel`**
Controls the severity reported when a relative path is encountered. Some projects encourage relative paths, while others require fully qualified paths.

**`referenceContainsMacros`**
Controls the severity reported when a file reference contains macros or variables. Depending on the project, macro-based paths may be expected, discouraged, or prohibited.

**`referenceFileFoundLevel`**
Controls the severity reported when a referenced file is successfully located. This can be useful for informational diagnostics and troubleshooting.

**`referenceFileNotFoundLevel`**
Controls the severity reported when a referenced file cannot be found. In most cases, this should remain set to **Error**.

These settings can be customized independently. For example, a project may treat unresolved file references as errors while only reporting the use of macros or relative paths as informational messages.

When `mode=strict` is enabled, these settings are overridden with a predefined set of strict validation rules:

| Setting                        | Strict Mode Severity |
| ------------------------------ | -------------------- |
| `referenceRelativePathLevel`   | Error                |
| `referenceContainsMacros`      | Warning              |
| `referenceFileFoundLevel`      | Information          |
| `referenceFileNotFoundLevel`   | Error                |

Strict mode is recommended when all file references must be fully validated and potential path ambiguities should be treated as diagnostic issues.

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
    message
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

Controls logging verbosity from 0 (silent) through 10 (most detailed). Debug messages require `debugOn` to be enabled.

### isLogOn

Controls whether logger output is emitted.

### referenceRelativePathLevel

Controls diagnostics for references found only by walking up parent folders.

### referenceContainsMacros

Controls diagnostics for references that contain execution-time macros or variables.

### referenceFileFoundLevel

Controls diagnostics for references whose target file is found.

### referenceFileNotFoundLevel

Controls diagnostics for references whose target file is not found.

### iniErrors

Contains warnings or errors collected while reading INI configuration.

### initialize

Initializes INI-backed configuration and returns normalized logging and diagnostic settings.

### readIni

Reads the INI file and returns parsed configuration values.

## Comments in scripts

| Value | Meaning |
| --- | --- |
| Line comment | # |
| Block comment | /\* ... /*/ |
| Auto-closing brackets | ( ) |
| Auto-closing quotes | " " and ' ' |

---

### What are the colors on the diskmap?

The default colors are listed below. Note that colors can be customized per script, and even per section of a script, so your colors may differ.

| Color | Meaning |
| --- | --- |
| Black | Empty space of the disk |
| Dark-blue | Allocated. This can be NTFS reserved areas, or space that is in use on the disk but MyDefrag does not know by which file |
| Blue | Unfragmented files |
| Light-blue | Currently selected unfragmented files |
| Yellow | Fragmented files |
| Light-yellow | Currently selected fragmented files |
| Red | Unmovable. Files that could not be moved by the Windows defragmentation API. All files are initially "movable"; a file only becomes red after MyDefrag has unsuccessfully tried to move or defragment it |
| Light-red | Currently selected unmovable files |
| Green | Finished files |
| White | The file currently being read |
| White | The file currently being written |
