# Preview Processor

The preview processor shows a MyDefrag document with its `!include` directives
expanded. It is intended for review and navigation; it does not execute the
script.

## Open A Preview

1. Open a `.MyD` or `.MyDc` document.
2. Run **MyDefrag: Open Preview**, or use **Open Preview** from the editor menu.
3. Review the virtual document in the active editor column.

The preview uses the `mydfrg-preview` document scheme. Its display name is
derived from the source with `.merged` inserted before the extension, but the
command does not write that virtual document to disk.

## Output Format

Each source line includes two numeric columns:

- The logical line in the merged output.
- The line number in the current source file.

Nested includes receive `BEGIN` and `END` annotations with their depth, file
URI, source range, and output range. The footer summarizes included files and
missing targets.

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

The standalone processor supports an explicit write mode. Review its help
before supplying an output path; the editor command itself remains read-only.
