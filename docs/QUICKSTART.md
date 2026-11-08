# Quick Start

This guide gets a MyDefrag script open with language support, validation,
snippets, and preview.

## Open A MyDefrag Workspace

1. Install MyDefrag Syntax in VSCodium or Visual Studio Code.
2. Open the folder containing the scripts and included fragments.
3. Open or create a file using one of these extensions:

   - `.MyD` for a complete MyDefrag script.
   - `.MyDc` for a reusable script fragment.

   Uppercase and lowercase variants are recognized.

The editor selects the `mydfrg` language automatically. The status bar and
Problems view update after the language server validates the document.

## Create A First Script

In an empty MyDefrag document, type `md-script` and accept the snippet. It
inserts a structure similar to this:

```text
Description("MyDefrag script")

VolumeSelect
    All
VolumeActions
    FileSelect
        All
    FileActions
        Defragment(Fast)
    FileEnd
VolumeEnd
```

Tab through the snippet fields and replace the example values. Save the file
to run immediate validation.

## Work With Includes And Variables

- Hold Ctrl and select a detected include or file link to open its target.
- Put the cursor on a variable and use **Go to Definition** to find its
  `SetVariable(...)` declaration.
- Use **Find All References** to search the workspace for the selected word.
- Start a completion prefix such as `md-volume` or `md-defragment` to insert a
  larger MyDefrag construct.

## Open The Expanded Preview

With a MyDefrag document active, run **MyDefrag: Open Preview** from the
Command Palette. The editable, unsaved preview recursively expands `!include`
files and displays source and merged line numbers. Use the right-click
**Preview** submenu to choose the raw or another annotated variation.

Missing or circular includes appear as annotations in the preview instead of
being executed. Preview edits do not change the source files; use **Save As**
to keep added tags, comments, or metadata.

## Review Diagnostics

Open **MyDefrag Diagnostics** in the Explorer. Select a diagnostic or use the
status-bar item to open its source location. The view provides actions for
moving between diagnostics and recording navigation state.

Diagnostic behavior and severity are controlled by the `mydfrg.*` settings.
Run **MyDefrag: Open Settings** to view them.

## Next Steps

- Read [Features](features.md) for the supported editor capabilities.
- Read [Settings](settings.md) before changing severity or exclusion rules.
- Use the [language reference](language-reference.md) for MyDefrag syntax.
