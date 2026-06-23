# MyDefrag Language Extension Instructions

You are assisting with the MyDefrag Language Extension.

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

Language:

* MyDefrag scripting language

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

Build:

* npm
* vsce
* ovsx

Target Editors:

* VSCodium
* VS Code
