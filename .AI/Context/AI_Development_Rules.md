# AI Development Rules

## Purpose

This document defines the working conventions used when collaborating with AI assistants on this project.

These rules are intended to produce consistent, maintainable documentation, prompts, software, and engineering reviews. Unless explicitly overridden by the user, these rules should be treated as the preferred way of working.

---

## Documentation Rules

### Markdown Structure

When generating new Markdown documents:

- Use exactly one Level 1 heading (`#`) for the document title.
- All remaining headings must be nested beneath it using `##`, `###`, etc.
- Do not create multiple Level 1 headings.

### Unordered Lists

When generating Markdown documents:

- Always use `-` for unordered lists.
- Never use `*` for unordered lists.

This avoids unnecessary diagnostics within VSCodium.

### Document Revisions

When revising an existing document:

- Treat the current version of the document as authoritative.
- Modify only the sections requested by the user.
- Do not remove sections, examples, or detail unless explicitly requested.
- Preserve the document's overall organization and writing style.
- Return the complete revised document rather than only the modified sections.

---

## Prompt Library Rules

### Prompt Organization

Task-specific prompts belong in:

```text
.AI/Prompts/
```

Supporting documents such as project context, standards, and engineering procedures should not be duplicated inside individual prompts unless there is a specific reason to do so.

### Prompt Design

Prompts should:

- Describe the requested work.
- Remain focused on a single objective.
- Reference reusable supporting documentation whenever practical.
- Avoid duplicating engineering standards.

---

## Project Context

Project knowledge belongs in:

```text
.AI/context/
```

Examples include:

- architecture
- coding standards
- development rules
- parser documentation
- installation guides
- project organization
- key source files
- workflows

These documents provide reusable context for many prompts.

---

## Engineering Reviews

Engineering reviews should generally consist of two phases.

### Phase 1 — Information Gathering

- Read every relevant source file completely.
- Read large files to the final line.
- Record observations.
- Do not form conclusions.
- Do not make recommendations.

### Phase 2 — Engineering Analysis

Only after the complete project has been examined should the AI:

- evaluate architecture
- identify technical debt
- assess maintainability
- rank engineering improvements
- produce the requested report

---

## Reading Requirements

When reviewing software projects:

- Read every source file completely.
- Do not stop after the first few hundred lines.
- Continue reading large files until the final line.
- Do not summarize a file before it has been completely read.
- Do not assume the beginning of a file fully represents its design.

---

## Revision Philosophy

When revising documentation:

- Preserve existing content whenever possible.
- Make targeted changes.
- Avoid redesigning documents unless specifically requested.
- Preserve detail rather than simplifying it.
- Maintain consistency with the existing document.

---

## Conversation Rules

### Debugging Sessions

Use one conversation per debugging objective.

Begin a fresh conversation for each new debugging session to reduce context drift and simplify problem isolation.

### Project Phases

When instructed to stop at the end of a phase, preserve that boundary and continue subsequent phases in a new conversation unless instructed otherwise.

---

## Project Design Philosophy

Development should favor:

- incremental progress
- reusable engineering standards
- modular organization
- single sources of truth
- architecture-driven design
- long-term maintainability

Engineering decisions should prioritize correctness, maintainability, and clarity over cosmetic style changes.

---

## Evolution

This document is expected to evolve over time as additional working conventions are established.

New long-term collaboration rules should be added here rather than duplicated across individual prompts whenever possible.
