# Rules

## **Quick Navigation**

Read these documents in order:

1. CLINE_PROJECT_CONTEXT.md
2. KEY_FILES.md
3. PARSER_CALL_TREE.md
4. PARSER_DIAGNOSTIC_WORKFLOW.md

## Cline Project Rules

### General Rules

- Investigate before editing.
- Explain the diagnosis before proposing changes.
- Do not modify files until explicitly instructed. Ask for approval.
- Preserve existing comments.
- Preserve existing formatting unless a requested change requires otherwise.
- Minimize diffs.
- Do not rename public APIs, exported functions, files, commands, settings, or identifiers unless explicitly requested.
- Do not remove code or documentation unless explicitly requested or directly required by the fix.
- When asked to revise a document or program, provide the complete revised document or source file.
- If the revised file is too long for a single response, provide it as a downloadable file.

### Search and File Reading Rules

- Do not assume a function, method, keyword, parser branch, diagnostic source, or symbol is absent because it was not found in the first 1000 lines.
- When locating a function, method, keyword, parser branch, diagnostic source, or symbol, search the workspace first.
- If a file is large, search by symbol name, diagnostic text, keyword, or nearby call sites before concluding that something is missing.
- Prefer targeted search before broad file reading.
- Confirm findings with the relevant source code before making claims.

### Parser Diagnostic Workflow

When investigating a MyDefrag parser diagnostic:

1. Display the file path, line, column, severity, diagnostic message, and keyword or token involved.
2. Determine whether the keyword exists in MyDefrag syntax or project keyword data.
3. If the syntax is invalid, report that clearly and do not modify parser code.
4. If the syntax is valid, treat the diagnostic as a likely parser bug.
5. Trace the execution path:
   - Tokenizer
   - Keyword classification
   - Fragment classifier
   - Parser dispatch
   - Statement parser
   - Diagnostic generation
6. Search for the diagnostic text, keyword, classifier, parse function, and dispatch function.
7. Do not infer that a parser function is missing until workspace search confirms it.
8. Report the root cause and affected parser area before editing.
9. Modify only the affected file or files after approval.
10. Preserve comments and minimize the diff.
11. Run syntax validation where applicable.

### Diagnostic Triage Commands

When the user says `get next`:

- Return the next non-Information diagnostic in sequence.
- Display:
  - File path
  - Line and column
  - Severity
  - Diagnostic message
  - Keyword or token involved, when identifiable
  - Whether the keyword exists in MyDefrag syntax or project keyword data

When the user says `get next file`:

- Skip remaining diagnostics in the current file.
- Return the first non-Information diagnostic from the next file.

When the user says `valid syntax`:

- Treat the current diagnostic as a likely parser bug.
- Inspect the parser path for why the valid syntax fails.
- Report the root cause and affected parser area before editing.
- Do not modify files until explicitly instructed.

### Model Use Guidance

- Use the default local Ollama model for ordinary investigation and coding.
- Use `qwen2.5-coder:14b` for most parser work.
- Use a larger model such as `qwen3-coder:30b` only for deep parser analysis, repository-wide reasoning, or complex multi-file debugging.
- Do not use a larger model merely because the task is routine.

### Markdown Documentation Rules

- Use standard GitHub Flavored Markdown.
- Use exactly one level-1 heading (`#`) per document.
- Use `##` for major sections and `###` for subsections.
- Do not skip heading levels.
- Use dashes (`-`) for unordered lists.
- Use standard fenced code blocks with language identifiers only.
- Do not add custom heading IDs or code-block attributes.
- Use human-readable headings.
- Put exact filenames, commands, model names, and identifiers in inline code, not headings.
