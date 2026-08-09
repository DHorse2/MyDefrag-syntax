# Snippets

The extension contributes 118 MyDefrag snippets. Every prefix starts with
`md-`, which keeps the suggestions grouped in completion lists.

## Use A Snippet

1. Open a `.MyD` or `.MyDc` document.
2. Type a prefix such as `md-script`.
3. Accept the completion.
4. Press Tab to move through placeholders and choices.

## Snippet Groups

<!-- markdownlint-disable MD013 -->

| Group | Example prefixes | Content |
| --- | --- | --- |
| Script structure | `md-script`, `md-volume`, `md-file` | Complete script, volume, and file blocks. |
| Volume conditions | `md-v-all`, `md-v-mounted`, `md-v-size` | Volume selection expressions. |
| File conditions | `md-f-name`, `md-f-fragmented`, `md-f-last-access` | File selection expressions and attributes. |
| File actions | `md-defragment`, `md-fast-fill`, `md-sort-name` | Defragmenting, moving, filling, and sorting actions. |
| Settings | `md-description`, `md-language`, `md-process-priority` | MyDefrag script settings and messages. |
| Values and functions | `md-datetime-ago`, `md-round-down`, `md-maximum` | Date/time values and numeric functions. |

<!-- markdownlint-enable MD013 -->

The source of truth is
[`snippets/mydfrg.code-snippets`](../snippets/mydfrg.code-snippets). The file
contains each prefix, inserted body, placeholders, choices, and description.

Snippets insert syntax but do not bypass validation. Consult the
[converted MyDefrag Help](MyDefrag%20Help/index.md) when choosing values or
combining actions.
