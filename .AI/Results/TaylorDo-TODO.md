# TaylorDo Startup TODO

## Summary

This TODO list converts the startup framework review into ranked follow-up work. Priorities match the review rankings and focus on deterministic startup, exact document references, and reproducible execution records.

## Critical Items

| ID | Task | Target | Acceptance Criteria |
| --- | --- | --- | --- |
| TD-AI-001 | Define explicit workspace fallback behavior when project-local `.AI` exists but lacks `Start_Here.md`. | `Start_Here.md`, `Ai_Bootstrap.md`, or startup instructions | A local incomplete `.AI` falls back to `D:\AI\.AI`; the agent records an informational diagnostic; startup does not block. |

## High Items

| ID | Task | Target | Acceptance Criteria |
| --- | --- | --- | --- |
| TD-AI-002 | Remove or archive duplicate active-task prompt files. | `Prompts\currentTask_AI.md`, `Prompts\currentTask copy.md` | Only one active `currentTask.md` remains in the active prompt path, or a manifest unambiguously selects the active task. |
| TD-AI-003 | Update invoked-procedure references to exact filenames. | `Procedures\Code_Review.proc.md`, `Procedures\Debugging_Run.proc.md`, `Procedures\Markdown_Document_Update.proc.md` | References use `Validation.proc.md` and `Execution_Record.proc.md`, or a documented alias table exists. |
| TD-AI-004 | Resolve metrics requirement conflict. | `Procedures\Execution_Record.proc.md`, `Standards\Execution_Record_Standard.md` | Both documents agree when metrics are mandatory and how unavailable metrics are represented. |

## Medium Items

| ID | Task | Target | Acceptance Criteria |
| --- | --- | --- | --- |
| TD-AI-005 | Define result artifact naming rules. | `Readme.md`, `Start_Here.md`, or a standards document | Task outputs clearly state whether paths are relative to shared `.AI`, project-local `.AI`, or project root. |
| TD-AI-006 | Regenerate and normalize the `.AI` file tree. | `File Tree - .AI.md` | Tree reflects current folders and files and satisfies the Markdown standard. |
| TD-AI-007 | Add a startup self-check. | `Start_Here.md` or a procedure document | Startup verifies task file, instructions, selected role, required procedures, standards, and output root before execution. |

## Low Items

| ID | Task | Target | Acceptance Criteria |
| --- | --- | --- | --- |
| TD-AI-008 | Add a concise role-selection matrix. | `Roles\README.md` | Common task types map to recommended roles with short selection guidance. |
| TD-AI-009 | Preserve current folder responsibility separation. | `Readme.md` | Future changes keep roles, procedures, standards, prompts, context, workspace, and results clearly separated. |

## Suggested Order

1. Fix workspace fallback behavior.
2. Remove duplicate active-task prompts.
3. Correct procedure filename references.
4. Align execution-record metric requirements.
5. Clarify output path and result naming rules.
6. Regenerate the file tree.
7. Add startup self-checks and role-selection guidance.

## Validation Checklist

| Requirement | Status |
| --- | --- |
| Ranked recommendations included | Pass |
| Review findings converted into actionable tasks | Pass |
| Targets identified | Pass |
| Acceptance criteria included | Pass |
| Markdown standard applied | Pass |
