# Default Search Filter

## Purpose

This document defines the default AI discovery input filter for the `.AI` workspace and related project work.

It is similar in role to `.gitignore`, but it is intended for AI-assisted discovery, review, indexing, and context loading rather than source-control exclusion.

The filter should be human-readable and deterministic enough for scripts, MCP tools, and discovery agents to apply consistently.

## Include File Patterns

- `*.md`

## Exclude File Patterns

- `*.html`
- `*.csproj`
- `*.Log`

## Include Object Types

- Authored documentation.
- Project instructions.
- Standards.
- Context documents.
- Reusable prompts.
- Search policy and discovery guidance.

## Exclude Object Types

- Generated file trees unless specifically requested.
- Run results unless specifically requested.
- Temporary workspace drafts unless specifically requested.
- Build output.
- Tool-generated logs.

## Discovery Notes

- Prefer authored source context over generated artifacts.
- Prefer `Start_Here.md` and `Instructions.md` as bootstrap documents.
- Follow explicit references from bootstrap and context documents.
- Do not silently ignore uncertain files when they may affect the task.
- Record important exclusions when they materially affect the result.
