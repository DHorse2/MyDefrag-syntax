# Commands

Commands are available from the Command Palette. Some also appear in editor or
diagnostic-view menus. The extension does not define default keyboard shortcuts.

## User Commands

<!-- markdownlint-disable MD013 -->

| Command title | Command ID | Behavior |
| --- | --- | --- |
| Open Preview | `mydfrg.openPreview` | Opens a read-only expanded preview for the active MyDefrag document. |
| Open File at Position | `mdm.openFileAtPosition` | Opens a file, line, and column supplied by a generated link. It is normally invoked from a document link. |
| MyDefrag: Open Settings | `mydfrg.openSettings` | Opens editor settings filtered to this extension. |
| MyDefrag: Configure Folders | `mydfrg.configureFolders` | Selects the user or log directory and saves the absolute path in workspace settings. |

<!-- markdownlint-enable MD013 -->

**Open Preview** is also available from the editor title and editor context
menus for supported MyDefrag filename extensions.

## Diagnostic Commands

<!-- markdownlint-disable MD013 -->

| Command title | Command ID | Behavior |
| --- | --- | --- |
| Get Next Diagnostic | `mydfrg.diagnostics.next` | Opens the next visible diagnostic. |
| Get Next File Diagnostic | `mydfrg.diagnostics.nextFile` | Opens the first visible diagnostic in the next file. |
| Get Previous File Diagnostic | `mydfrg.diagnostics.prevFile` | Opens the first visible diagnostic in the previous file. |
| File Diagnostic is Fixed | `mydfrg.diagnostics.fixedItem` | Marks the current item fixed in navigation state and advances. |
| Ignore File Diagnostic | `mydfrg.diagnostics.ignoreItem` | Marks the current item ignored in navigation state and advances. |
| Skip Current File | `mydfrg.diagnostics.skipItem` | Marks the current diagnostic skipped in navigation state and advances. It does not edit the file. |
| Diagnostic points to Valid Syntax | `mydfrg.diagnostics.validSyntax` | Records the item as reviewed and reports it as a likely parser or classification issue. |
| Send Invalid to Agent | `mydfrg.diagnostics.sendIt` | Writes and opens an AI investigation prompt for the current diagnostic. |
| Go to Top of Diagnostic list | `mydfrg.diagnostics.top` | Returns to the first visible diagnostic. |
| Reset Diagnostic Navigation | `mydfrg.diagnostics.reset` | Clears recorded navigation states and returns to the first visible diagnostic. |

<!-- markdownlint-enable MD013 -->

The Diagnostic Explorer also uses internal refresh, current-item, open-item,
and copy-item commands. Use the view buttons rather than invoking those IDs
directly.
