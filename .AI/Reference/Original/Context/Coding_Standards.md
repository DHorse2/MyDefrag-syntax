# Coding Standards

This document defines coding standards for the MyDefrag Syntax extension project.

These standards apply to all AI-assisted and human-written code changes unless the user explicitly instructs otherwise.

---

## 1. General Principles

Code changes must be conservative, readable, and easy to review.

Prefer small, focused changes over broad rewrites.

Do not change unrelated code while working on a specific issue.

Preserve existing project structure unless a restructuring task has been explicitly requested.

When fixing bugs, explain the root cause before proposing or applying changes.

When uncertain, inspect existing project patterns and follow them.

---

## 2. Comment Preservation

Existing comments must be preserved.

Do not delete comments unless the user explicitly requests it.

Do not rewrite comments merely for style.

When adding code, add comments only where they clarify intent, non-obvious behavior, parser state, diagnostic behavior, or compatibility concerns.

Avoid noisy comments that simply repeat the code.

---

## 3. JavaScript Standards

This project uses Node.js JavaScript.

Use CommonJS module syntax unless the file already uses ES modules.

Preferred:

```js
const fs = require('fs');
module.exports = { Parser };
```

Avoid converting files to ES module syntax unless specifically requested.

Do not introduce TypeScript unless explicitly requested.

Use `const` by default.

Use `let` only when reassignment is required.

Avoid `var`.

Prefer clear function names over clever compact code.

Avoid large anonymous inline functions when a named helper would improve readability.

---

## 4. Parser Code Standards

Parser behavior must be changed carefully and minimally.

Do not rewrite parser flow unless explicitly requested.

Preserve existing parser states, diagnostic patterns, and logging patterns where possible.

When modifying parser behavior:

1. Identify the affected parse path.
2. Explain the current behavior.
3. Explain the failure mode.
4. Propose the smallest safe change.
5. Preserve backward compatibility where practical.

Parser changes should avoid introducing cascading diagnostics.

When handling fragments, prefer graceful recovery and helpful diagnostics over hard failure where appropriate.

---

## 5. Tokenizer Standards

Tokenizer changes must be isolated.

Do not change token types, token naming, or token shape unless required.

If token behavior changes, explain which parser paths are affected.

Preserve support for existing MyDefrag syntax, comments, strings, macros, identifiers, keywords, numbers, and block comments.

---

## 6. Diagnostics Standards

Diagnostics should be useful to the user.

Prefer diagnostics that explain:

- what was found
- why it is invalid
- what parent context or block is expected
- where the fragment or statement may be valid

Avoid vague messages such as “invalid syntax” when a more specific message is possible.

Do not throw exceptions for normal syntax errors.

Unexpected internal failures may be caught and reported through existing diagnostic and logging mechanisms.

---

## 7. Logging Standards

Use the existing logger patterns.

Do not replace the logging system unless explicitly requested.

Verbose debugging should use existing verbose levels.

Recommended usage:

- Low-level normal flow: minimal or no logging
- Parser decisions: verbose level 3
- Detailed token or keyword tracing: verbose level 5
- Unexpected failures: error logging

Do not leave excessive temporary debug output in final code unless the user asks for diagnostic instrumentation.

---

## 8. PowerShell Standards

PowerShell scripts should target PowerShell 7 unless compatibility with Windows PowerShell 5 is explicitly required.

Use approved PowerShell verbs for function names.

Avoid using `$args` for custom argument handling.

Prefer named parameters.

Use clear parameter validation where practical.

Preserve comment-based help when present.

Do not remove existing script comments.

Avoid destructive operations unless explicitly requested and clearly documented.

---

## 9. Markdown Standards

Markdown files should use clear headings and dash-based unordered lists.

Use `-` for unordered lists, not `*`.

Use fenced code blocks with language labels where useful.

Example:

````markdown
```js
const value = true;
````

````

Keep documentation practical and maintainable.

Avoid overly long paragraphs.

Prefer documents that can be skimmed by both humans and AI assistants.

---

## 10. JSON and package.json Standards

Preserve existing `package.json` contribution structure.

Do not remove activation events, language contributions, commands, configuration defaults, or scripts unless explicitly requested.

When adding configuration:

- use clear names
- provide safe defaults
- avoid interfering with user settings
- document the setting purpose

Do not reorder large JSON sections unless the task is specifically cleanup or formatting.

---

## 11. VSCodium / VS Code Extension Standards

Maintain compatibility with VSCodium and Open VSX.

Do not introduce Microsoft-only assumptions unless explicitly required.

Preserve language id:

```text
mydfrg
````

Preserve supported file extensions unless explicitly changed:

```text
.MyDc
.MyD
```

Preserve the existing client/server language extension architecture.

Do not alter activation behavior without explaining the impact.

---

## 12. File and Folder Standards

Do not place generated logs, temporary build files, or local user data in `src/`.

Generated, temporary, backup, archive, and user-local files should remain outside source folders.

Respect project exclude patterns for:

- Backup
- Archive
- Compile*
- Log
- Logs
- artifacts
- .user
- node_modules
- dist
- temporary MyDefrag files

---

## 13. Error Handling Standards

Normal parser errors should become diagnostics, not thrown exceptions.

Unexpected internal failures should be caught near the validation boundary.

When catching errors, preserve useful details such as:

- file or module name
- function name
- error message
- affected document or parse state when available

Do not silently swallow errors.

---

## 14. Public API and Naming Standards

Do not rename public functions, exported functions, command identifiers, configuration keys, or file names unless explicitly requested.

If a rename is necessary, explain:

- what is being renamed
- why it is necessary
- what references must be updated

Prefer additive helper functions over disruptive renaming.

---

## 15. Formatting Standards

Follow the surrounding file style.

Do not reformat unrelated code.

Avoid large whitespace-only diffs.

Keep indentation consistent with the existing file.

Prefer readability over compactness.

---

## 16. AI Change Procedure

Before proposing code changes, an AI assistant should:

1. Identify the affected files.
2. Explain the suspected root cause.
3. Describe the minimal change.
4. Point out any risks.
5. Then provide the patch or replacement code.

For debugging tasks, do not jump directly to implementation.

Diagnosis comes first.

---

## 17. Compatibility Rule

This project supports legacy MyDefrag script behavior.

Do not modernize syntax handling in a way that breaks valid existing MyDefrag scripts.

When unsure whether a construct is valid MyDefrag syntax, treat it as domain knowledge that must be checked before changing parser behavior.

---

## 18. Final Review Checklist

Before considering a change complete, verify:

- Existing comments were preserved.
- The change is limited to the requested issue.
- Parser behavior was not broadened accidentally.
- Diagnostics are understandable.
- Logging is not excessive.
- No unrelated formatting changes were introduced.
- VSCodium/Open VSX compatibility was preserved.
- Markdown uses dash-based unordered lists.
