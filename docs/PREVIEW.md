# Preview Processor

The preview processor expands a MyDefrag document's `!include` directives into
one of five editable views. Raw output remains executable MyDefrag source; the
four annotated views are for review, navigation, and developer-added tags,
comments, or other metadata.

## Open A Preview

1. Open a `.MyD` or `.MyDc` document.
2. Right-click the document in the editor or Explorer and open the **Preview**
   submenu.
3. Select one of the five preview variations.
4. Review or edit the unsaved document in the active editor column.

Each command creates a fresh, editable, unsaved document whose suggested name
is derived from the source and selected mode. Editing it never changes the
source or included files. Use **Save As** if the modified preview should be
kept. The editor-title **Open Preview** button retains the previous default:
annotations with line numbers and no file headers.

## Preview Variations

| Submenu item | Annotations | Line numbers | File headers | Executable |
| --- | ---: | ---: | ---: | ---: |
| Raw (Executable) | No | No | No | Yes |
| Annotations | Yes | No | No | No |
| Annotations + File Headers | Yes | No | Yes | No |
| Annotations + Line Numbers | Yes | Yes | No | No |
| Annotations + Line Numbers + File Headers | Yes | Yes | Yes | No |

Line numbers are opt-in except for the legacy default command. File headers
identify the owning source before each expanded file and add physical lines to
the preview, so they change the physical line positions shown by the editor.

Raw previews retain `.myd` or `.mydc`. They contain only merged MyDefrag source,
without the original include directives or generated report text, and are sent
to the language server for error checking. Non-executable previews use `.mydd`
or `.mydcd`; those extensions deliberately keep them out of the language
server.

## Output Format

When line numbers are enabled, each source line includes two numeric columns:

- The logical line in the merged output.
- The line number in the current source file.

Annotated views give nested includes `BEGIN` and `END` annotations with their
depth, file URI, source range, and output range. The footer summarizes included
files and missing targets. File-header variants also insert a `FILE` annotation
before each source file.

## Error Handling

- A missing include becomes a warning annotation and is added to the missing
  file map.
- A circular include becomes an error annotation and recursion stops for that
  branch.
- Included content is read recursively relative to the file containing the
  directive.

These annotations are preview output, not edits to the original files.

## Standalone Processor

Developers can inspect the command-line usage with:

```text
node src/preprocess/mydefrag-preprocess.js --help
```

Select a mode with `--mode`, for example:

```text
node src/preprocess/mydefrag-preprocess.js script.myd --mode raw
```

The standalone processor supports an explicit write mode. Its default output
extension follows the selected mode. Review its help before supplying an output
path. Editor previews remain unsaved until the developer chooses **Save As**.
