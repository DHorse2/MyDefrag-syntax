# Project Context

> **Read this document before making any changes to the project.**

---

## Quick Navigation

Read the project documentation in this order:

1. Project_Context.md
2. Key_Files.md
3. Parser_Call_Tree.md
4. Parser_Diagnostic_Workflow.md

---

## Project Overview

This project implements a VSCodium language extension for the MyDefrag scripting language.

The extension provides:

- syntax highlighting
- semantic diagnostics
- parser validation
- fragment recognition
- language intelligence
- document links
- preview generation

The project is under active development and parser correctness is the highest priority.

---

## Primary Objective

The objective is **correct parsing**, not simply eliminating diagnostics.

Every diagnostic should accurately reflect the parser state and help users understand how to fix the script.

---

## Development Philosophy

The parser is developed scientifically.

Changes are based on:

- observation
- repeatable testing
- diagnosis
- evidence

Avoid speculative rewrites.

Always determine the root cause before proposing code changes.

---

## Project Priorities

Highest priority:

1. Parser correctness
2. Accurate diagnostics
3. Stable tokenizer
4. Language correctness
5. Maintainable code
6. Performance

---

## Preferred Development Style

Prefer:

- additive changes
- minimal diffs
- preserving comments
- preserving formatting
- preserving public APIs

Avoid:

- large refactors
- unnecessary renaming
- rewriting working code

---

## Language and Coding Standards

Project language:

- JavaScript
- CommonJS modules

Development environment:

- Windows
- VSCodium
- Node.js

PowerShell scripts target PowerShell 7.

---

## Parser Design

The parser is primarily a recursive-descent validator.

It is not intended to construct a complete abstract syntax tree.

Primary responsibilities include:

- syntax validation
- fragment recognition
- parent inference
- diagnostic generation

---

## Fragment Philosophy

Many `.MyDc` files are intentionally fragments.

A fragment may consist of a single valid statement.

Fragment parsing is a first-class feature and must not be treated as an error condition.

---

## Diagnostics Philosophy

Good diagnostics should:

- identify the problem
- identify the location
- explain the expected context
- provide useful fragment hints where appropriate

---

## Debugging Philosophy

When debugging:

1. Reproduce the issue.
2. Identify the failing parser state.
3. Trace the control flow.
4. Determine the root cause.
5. Propose the smallest reasonable fix.

Do not begin by rewriting code.

---

## Logging

Multiple evidence sources are available:

- parser.log
- server.log
- client.log
- extension output
- VSCodium Problems panel

Always use the logs before drawing conclusions.

---

## AI Assistant Rules

Before editing code:

- Read this document.
- Read Key_Files.md.
- Read Parser_Call_Tree.md.
- Read Parser_Diagnostic_Workflow.md.

When making changes:

- Explain the diagnosis first.
- Explain why the change is needed.
- Make the smallest practical change.
- Preserve comments.
- Preserve formatting.
- Preserve existing logging.

After changes:

- Explain what changed.
- Explain why it fixes the problem.
- Describe possible side effects.
- Recommend tests.

---

## Success Criteria

Successful work on this project demonstrates:

- correct parser behaviour
- improved diagnostics
- minimal code changes
- preserved architecture
- evidence-based reasoning

## AI Hallucination Policy

- Never infer project architecture from general knowledge.
- Only describe functions, classes, modules, and execution paths that have been verified from the project source code.
- If information is uncertain, explicitly state that it could not be verified.
- Do not invent code examples to illustrate the architecture.
