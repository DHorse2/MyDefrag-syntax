# Instructions

You are assisting with developing the MyDefrag Language Extension.

## General Rules

* Never remove comments.
* Preserve existing comment style.
* Prefer additive changes over rewrites.
* Minimize diffs.
* Do not rename public APIs unless explicitly requested.
* Do not change formatting unrelated to the task.

## Code Generation

* Use PowerShell 7 syntax.
* Use Node.js CommonJS unless the file already uses ESM.
* Follow existing project conventions.
* Generate JSDoc comments for new functions.
* Preserve existing error handling patterns.
* When creating scripts or programs to show the script name as a comment as close to line 1 as is possible.

## Debugging

* Explain root cause before proposing fixes.
* Prefer diagnosis over speculative changes.
* Show affected files before editing.

## PowerShell

* Never use PowerShell automatic variables such as `$args` for custom purposes.
* Preserve help comments.
* Preserve existing comments.
* Use approved PowerShell verbs.

## VS Code Extension Development

* Assume VSCodium compatibility is required.
* Preserve Open VSX compatibility.
* Preserve existing package.json contributions.
* Explain activation-path changes before implementing them.

## Parser Development

* Minimize parser behavior changes.
* Explain syntax changes before implementing them.
* Preserve backwards compatibility whenever possible.

## Output Format

When reviewing code:

1. Root Cause
2. Proposed Solution
3. Risks
4. Files Affected

When generating code:

1. Summary
2. Code
3. Notes

## Chat History

Keep raw chats in `.codex/chats/history/topic.md`.

## Codex Manual

The local copy of the Codex manual is at `D:\Script\MyDefrag-syntax\doc\Codex\codex-manual.md`.

## Update Automation Control

Never automatically run:

* git commit
* git push
* ovsx publish
* vsce publish
* npm publish

without explicit approval.

Before modifying more than one file:

1. Explain the plan.
2. List files to be modified.
3. Wait for approval.

## Project Context Overview

Technologies:

* Node.js
* JavaScript
* VS Code Extension API
* Language Server Protocol
* TextMate Grammar
* PowerShell 7

Key Files:

* extension.js
* server.js
* parser.js
* tokenizer.js
* languageData.js

MyDefrag scripting language:

* Language reference: "D:\Script\MyDefrag-syntax\doc\MyDefrag Help"
* BNF language definition: "D:\Script\MyDefrag-syntax\doc\MyDefrag GOLD Parser BNF (Backus-Naur Form) syntax.bnf"
* Client, Server, Parser and Diagnostic session log: C:\Users\david\AppData\Roaming\VSCodium\User\globalStorage\macrodm.mydefrag-syntax\log

Build:

* npm
* vsce
* ovsx

Target Editors:

* VSCodium
* VS Code

Agreed. This aligns with preferences you've already established for code revisions. I'll treat it as a standing rule.

## Rules

### Revision Rule

When asked to revise a document or program:

* **Provide the complete revised document or source file**, suitable for copy/paste or replacement.
* **Do not provide partial patches or snippets** unless explicitly requested.
* **Make only the requested changes.**
* **Do not make unnecessary changes** to formatting, wording, structure, or style.
* **Preserve all existing comments.**
* **Preserve existing formatting** unless the requested change requires otherwise.
* **Minimize the diff** so changes are easy to review.
* **Do not rename public identifiers, files, or APIs** unless explicitly requested.
* **Do not remove content** unless explicitly requested or it is demonstrably incorrect and directly related to the requested revision.
* When multiple files are involved, **identify the affected files before making changes**, consistent with your existing workflow.
