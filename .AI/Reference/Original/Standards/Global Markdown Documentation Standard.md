# Global Markdown Documentation Standard

## Purpose

This document defines the mandatory Markdown conformance requirements for all
generated project documentation.

Unless explicitly instructed otherwise, every generated Markdown document shall
conform to this specification before it is presented or written to disk.

## Generation Workflow

Markdown generation shall be treated as a multi-stage process.

The stages are:

1. Compose the complete document.
2. Normalize the generated Markdown.
3. Validate the completed document against this standard.
4. Repair any violations.
5. Repeat validation until no violations remain.
6. Present or save the final document.

No document shall be considered complete until it passes validation.

## Validation Requirements

Validation shall occur after document composition.

Validation shall examine the completed document rather than attempting to
enforce formatting rules during generation.

If validation fails, the document shall be repaired and validated again before delivery.

## Document Structure

The document shall contain exactly one level-1 heading.

The level-1 heading shall be the first line of the document.

No content shall appear before the level-1 heading.

## Heading Requirements

Every heading shall be unique.

Heading text shall never be duplicated anywhere in the document.

Unique headings shall produce unique Markdown anchors.

## Unordered List Requirements

Only the hyphen (`-`) character may be used as an unordered list marker.

The asterisk (`*`) character is prohibited as an unordered list marker anywhere
in the document.

Nested unordered lists shall also use the hyphen (`-`) character.

Mixed unordered list markers are prohibited.

## Ordered Lists

Ordered lists shall use numeric list markers.

## Tables

Tables should be preferred whenever they improve readability.

Typical uses include:

- Comparisons
- Capability matrices
- Requirements
- Status reporting
- Configuration summaries
- Benchmark results
- Design trade-offs

## Code Blocks

Use fenced code blocks for:

- Source code
- Commands
- JSON
- XML
- SQL
- Configuration
- Console output
- Directory layouts

Specify the language whenever practical.

## File and Directory Paths

Multiple file paths should be presented inside fenced code blocks.

Preserve exact filenames and capitalization.

Do not invent filenames or directory structures.

## Markdown Links

- Use relative links for documents within the project.
- If a filename or directory name contains spaces, encode each space as `%20`.
- Do not rely on renderer-specific handling of literal spaces.
- Verify that every generated relative link resolves correctly in VSCodium
  Markdown Preview.

Examples:

```md
[Global Markdown Documentation Standard](Global%20Markdown%20Documentation%20Standard.md)

[Diagnostic Interchange Format](docs/Diagnostic%20Interchange%20Format.md)
```

## Revision Rules

Modify only the requested content.

Preserve comments whenever practical.

Preserve examples unless instructed otherwise.

Do not remove sections without explicit instruction.

Maintain the existing section hierarchy whenever practical.

## Documentation Quality

Documentation should:

- Be deterministic.
- Be implementation-ready.
- Avoid unnecessary repetition.
- Prefer concrete examples.
- Include rationale where appropriate.

## Downloadable Documents

Unless another format is explicitly requested, generated documents shall be
provided as downloadable Markdown files.

## Required Validation Checklist

Every generated Markdown document shall satisfy all of the following before delivery.

| Requirement                                                  | Pass |
| ------------------------------------------------------------ | ---- |
| Exactly one level-1 heading                                  | □    |
| Level-1 heading is the first line                            | □    |
| No content precedes the level-1 heading                      | □    |
| Every heading is unique                                      | □    |
| No `*` unordered list markers exist anywhere in the document | □    |
| Every unordered list uses `-`                                | □    |
| Nested unordered lists use `-`                               | □    |
| Markdown syntax is valid                                     | □    |
| Tables are correctly formatted                               | □    |
| Fenced code blocks are balanced                              | □    |
| Languages are specified for code blocks whenever practical   | □    |
| Requested project formatting rules are satisfied             | □    |

## Long-Term Philosophy

Project documentation is a long-lived engineering asset.

Documentation should:

- Be suitable for version control.
- Be implementation-independent where practical.
- Separate architecture, implementation, future work, and design rationale.
- Be readable by both humans and AI systems.
