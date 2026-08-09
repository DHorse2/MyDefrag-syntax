# Taylor2 Code Review Prompt

You are reviewing the Taylor2 codebase.

Perform a structured code review focused on correctness, maintainability, architecture, diagnostics, and integration quality.

Taylor2 is related to the MyDefrag/TaylorDo ecosystem. When useful, consult your knowledge of the existing MyDefrag language extension and its parser, diagnostics, preview, include handling, and VSCodium workflow. Use that knowledge as context, but do not assume Taylor2 must copy the extension design exactly.

## Review Goals

Review the repository for:

- Functional bugs
- Design flaws
- Inconsistent architecture
- Fragile parsing or scripting logic
- Poor error handling
- Missing diagnostics
- Unsafe filesystem or process behavior
- Windows path, CMD, PowerShell, or scheduler issues
- Inconsistent naming, layout, or documentation
- Places where Taylor2 should better align with the MyDefrag language tooling

## Output Requirements

## Summary

Briefly describe the overall state of the code.

## High Priority Findings

| Severity | Area | Finding | Evidence | Recommended Fix |
|---|---|---|---|---|

## Medium Priority Findings

| Severity | Area | Finding | Evidence | Recommended Fix |
|---|---|---|---|---|

## Low Priority Findings

| Severity | Area | Finding | Evidence | Recommended Fix |
|---|---|---|---|---|

## Architecture Notes

Identify any larger design or structure concerns.

## Relationship To MyDefrag Language Extension

Explain where Taylor2 can reuse, align with, or intentionally differ from the MyDefrag language extension.

## Suggested Revisions

List concrete files or areas that should be changed.

## Created Or Updated Files

If you create or modify files, list each relative file path.

## Revision Log

Record what was changed, why it was changed, and which files were affected.

## Standard Diagnostics

At the end of the review, generate the standard diagnostics in machine-readable form.

- Generate `code-review-diagnostics.jsonl` containing one JSON object per diagnostic.
- Generate `code-review-todo.md` containing prioritized actionable work items with clickable file paths for VSCodium where possible.
- Include:
  - Severity
  - Rule or category
  - File
  - Line
  - Column (if available)
  - End line/column (if available)
  - Message
  - Suggested fix
  - Confidence
  - Related symbol(s)
- Include summary counts by severity.
- Ensure the JSONL is deterministic and suitable for ingestion by external tooling.

## Rules

- Do not remove existing comments.
- Preserve existing formatting unless a change is necessary.
- Prefer additive changes.
- Minimize diffs.
- Do not rename public APIs unless clearly justified.
- Do not make broad unrelated refactors.
- Use Markdown.
- Use one `#` title at the top only.
- Use unique headings.
- Use `-` for unordered lists, not `*`.
- Prefer tables where useful.
- Cite file paths and line numbers whenever possible.
