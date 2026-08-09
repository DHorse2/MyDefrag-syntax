# Codex Prompt --- Extract Row-Oriented TODO List From Code Review Report

You are working in the **mydefrag-syntax** repository.

## Objective

Read the completed code review report and extract a durable,
machine-readable TODO list suitable for use by the MyDefrag Syntax
Diagnostic Navigator.

The TODO list is a work queue, not prose documentation.

## Output Files

Create:

-   `D:\Script\MyDefrag-syntax\.user\todo\code-review-todo.jsonl`
-   `D:\Script\MyDefrag-syntax\.user\todo\code-review-todo.md`

The JSONL file is the authoritative source. The Markdown file is a
generated human-readable report.

## Extraction Rules

-   Every actionable finding becomes at least one TODO row.
-   If a finding affects multiple files, generate one TODO row **per
    affected file**.
-   Related rows must share a common `groupId`.
-   Set `groupCount` to the total number of rows in the group.
-   Merge duplicate findings into a single logical issue.
-   Ignore compliments, vague observations, and non-actionable comments.
-   Do not invent findings.

## Required JSONL Fields

Every row shall contain:

-   id
-   groupId
-   groupCount
-   priority
-   source
-   type
-   status
-   severity
-   file
-   line
-   column
-   message
-   token
-   keywordExists
-   category
-   action
-   notes
-   vscodiumUri
-   createdUtc

## Priority

Assign exactly one:

-   critical
-   high
-   medium
-   low
-   deferred

Guidelines:

-   critical --- crashes, activation failures, data corruption, broken
    parser logic, major diagnostic failures.
-   high --- significant bug or missing functionality.
-   medium --- normal development task.
-   low --- cleanup, documentation, refactoring.
-   deferred --- intentionally postponed.

## Severity

Use one of:

-   error
-   warning
-   information
-   hint

## Categories

Use stable categories such as:

-   parser-false-positive
-   parser-classification
-   fragment-mode
-   diagnostic-navigation
-   extension-command
-   tree-view
-   status-bar
-   logging
-   test-coverage
-   documentation
-   code-quality
-   configuration
-   safety
-   unknown

## Example

``` json
{
  "id":"CR-0042-02",
  "groupId":"CR-0042",
  "groupCount":3,
  "priority":"critical",
  "source":"codex-review",
  "type":"diagnostic",
  "status":"open",
  "severity":"warning",
  "file":"src/server/parser.js",
  "line":312,
  "column":9,
  "message":"Fragment mode rejects valid SetVariable syntax.",
  "token":"SetVariable",
  "keywordExists":true,
  "category":"parser-false-positive",
  "action":"Inspect parser classification and repair if valid.",
  "notes":"",
  "vscodiumUri":"vscode://file/D:/Script/MyDefrag-syntax/src/server/parser.js:312:9",
  "createdUtc":"2026-07-04T00:00:00Z"
}
```

## Sorting

Sort the JSONL output by:

1.  Priority
2.  Severity
3.  Group ID
4.  File
5.  Line

## Markdown Report

Generate a companion report using:

-   One H1 title.
-   Unique headings.
-   '-' for unordered lists.

For each item include:

-   ID
-   Priority
-   Status
-   Severity
-   File
-   Line/Column
-   Token
-   Category
-   Action
-   VSCodium URI

## Final Report

Report:

-   Files created.
-   Number of TODO rows.
-   Counts by priority.
-   Counts by severity.
-   Duplicate findings merged.
-   Assumptions made.

Do not modify source code. Only extract the TODO list.
