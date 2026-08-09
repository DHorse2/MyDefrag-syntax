# AI Startup Review

## Review Scope

This review covers the `.AI` startup framework only:

- Startup workflow
- Roles
- Procedures
- Standards
- Prompt loading
- Execution-record behavior
- Overall organization

Unrelated project source code was excluded.

## Startup Result

The startup workflow is usable and reached the Execution Cut-Off. The required startup path resolved to `D:\AI\.AI`, loaded `.AI\Prompts\currentTask.md`, loaded `.AI\Instructions.md`, selected `Code Reviewer`, loaded the required procedures, and loaded the required standards.

The framework already supports selective loading and gives agents a clear boundary between startup and task execution. The main risks are broken internal procedure references, inconsistent file naming, stale prompt material, and duplicated review prompt locations.

## Findings Summary

| Priority | Count | Summary |
| --- | ---: | --- |
| Critical | 0 | No startup-blocking defect was observed. |
| High | 1 | Procedure files reference non-existent invoked procedure filenames. |
| Medium | 5 | Naming, prompt, and organization issues can reduce deterministic behavior. |
| Low | 3 | Documentation and operational cleanup would improve maintainability. |

## Critical Findings

None observed.

## High Finding Procedure References

Observed fact: procedure files list invoked procedures using filenames that do not exist in the current `Procedures` directory.

Evidence:

| File | Evidence |
| --- | --- |
| `.AI\Procedures\Code_Review.proc.md` | Line 55 references `Validation.md`; line 56 references `Execution_Record.md`. |
| `.AI\Procedures\Debugging_Run.proc.md` | Line 56 references `Validation.md`; line 57 references `Execution_Record.md`. |
| `.AI\Procedures\Markdown_Document_Update.proc.md` | Line 54 references `Validation.md`; line 55 references `Execution_Record.md`. |
| `.AI\Procedures\Execution_Record.proc.md` | Line 100 references `Validation.md`. |

Actual files:

```text
.AI\Procedures\Validation.proc.md
.AI\Procedures\Execution_Record.proc.md
```

Impact: agents following invoked-procedure references literally may fail to load required procedures or may waste time searching for missing files.

Recommendation: update invoked-procedure references to the actual filenames or define an explicit alias rule in `Start_Here.md`.

## Medium Finding Session Template Case

Observed fact: `.AI\Session_Template.md` line 5 instructs agents to read `D:\AI\.AI\START_HERE.md`, while the actual file is `Start_Here.md`.

Impact: this works on Windows but is not portable and can fail in case-sensitive tooling, archives, containers, or future MCP file resolvers.

Recommendation: change the template path to `D:\AI\.AI\Start_Here.md`.

## Medium Finding Prompt Duplication

Observed fact: a detailed project review prompt exists in two locations:

```text
.AI\Detailed Project Review Prompt.md
.AI\Prompts\Detailed Project Review Prompt.md
```

Observed fact: `fc` reported the files are too different to synchronize. The root version is substantially richer, includes dependency and output-location rules, and says generated reports should not be written into `.AI`. The prompt-folder version is short and contains malformed emphasis.

Impact: agents can load different instructions for the same task depending on which file they find first.

Recommendation: keep one canonical detailed review prompt in `.AI\Prompts` and either remove, redirect, or clearly mark the root-level file as deprecated.

## Medium Finding Prompt Markdown Corruption

Observed fact: existing prompt files contain malformed emphasis markers:

| File | Evidence |
| --- | --- |
| `.AI\Prompts\Detailed Project Review Prompt.md` | Lines 3, 5, and 9 contain double-star text followed by star-hyphen. |
| `.AI\Prompts\Review Instructions.md` | Lines 9, 11, 12, 13, and 29 contain double-star text followed by star-hyphen. |

Impact: the affected text is still readable to a human, but it violates the workspace Markdown standard and can confuse automated prompt processing.

Recommendation: repair the malformed emphasis and validate the prompt folder against the Markdown standard.

## Medium Finding Shared Instructions Are Project Specific

Observed fact: `.AI\Instructions.md` says the assistant is developing the MyDefrag Language Extension and includes MyDefrag-specific key files, parser rules, VSCodium rules, and build targets.

Impact: the shared workspace is intended to be reused across projects, but global instructions can bias role selection and task behavior toward one project when the current task is about the `.AI` workspace itself or another repository.

Recommendation: split universal AI operating rules from project-specific MyDefrag context. Keep global rules in `.AI\Instructions.md` and move project-specific content into a context file or project-local `.AI` override.

## Medium Finding Execution Record Destination Is Underspecified

Observed fact: `Execution_Record.proc.md` defines how to record execution evidence but does not define a deterministic output filename for the current shared workspace. `Execution_Record_Standard.md` gives recommended run-folder patterns, while the current task asks only for an execution record appropriate to the mode.

Impact: different agents may create different execution-record names or locations inside `Results`, making later automation harder.

Recommendation: add a shared naming policy such as `.AI\Results\<task-slug>-Execution-Record.md` or `.AI\Results\runs\<yyyy-mm-dd>\<run-id>\execution-record.md`.

## Medium Finding Prompt Output Policy Conflict

Observed fact: `.AI\Prompts\currentTask.md` requires outputs in `Results/AI-Startup-Review.md` and `Results/AI-Startup-TODO.md`. The root `.AI\Detailed Project Review Prompt.md` says generated AI review reports should not be written into `.AI` and should go under `.user/.ai-output`.

Impact: prompt-specific output rules can conflict with workspace output policy unless precedence is explicit.

Recommendation: define output precedence in `Start_Here.md` or `Instructions.md`, with direct task instructions taking precedence over reusable prompt defaults.

## Low Finding Space-Heavy Filenames Add Tooling Friction

Observed fact: files such as `Global Markdown Documentation Standard.md`, `Output Document Formatting Rules.md`, and `Detailed Project Review Prompt.md` required short-name fallbacks in this Windows shell environment.

Impact: the framework still works, but scripts and command wrappers need more path handling care.

Recommendation: either retain human-readable names and document the quoting requirement, or standardize machine-facing filenames while keeping readable titles inside the documents.

## Low Finding Markdown Standard Violations In Existing Documents

Observed fact: several existing documents use three-space indented list markers, malformed table-like text, or malformed emphasis. Examples include prompt files and `.AI\AI_Directive_Vocabulary.md`.

Impact: this weakens the claim that generated Markdown must pass the global standard before completion.

Recommendation: run a one-time Markdown normalization pass on authored `.AI` documents, then add a lightweight validation script.

## Low Finding Results Folder Has No Manifest

Observed fact: `Results` exists and was empty before this run, but no manifest or README defines artifact types, retention, or naming.

Impact: generated artifacts can accumulate without a predictable index.

Recommendation: add `.AI\Results\README.md` or a run index after the core startup defects are fixed.

## Circular Reference Review

No direct circular load loop was observed in the startup chain. `Start_Here.md` points to the task, instructions, selected role, selected procedures, and selected standards. `Ai_Bootstrap.md` points back to `Start_Here.md`, but `Start_Here.md` only says to load `Ai_Bootstrap.md` after startup when required, so this is not an active startup loop.

## Orphan And Redundancy Review

Observed redundant or ambiguous items:

| Item | Observation |
| --- | --- |
| `.AI\Detailed Project Review Prompt.md` | Overlaps with `.AI\Prompts\Detailed Project Review Prompt.md` but differs materially. |
| `.AI\File Tree - .AI.md` | Generated tree-like artifact appears in the root while `Default_Search_Filter.md` says generated file trees should be excluded unless requested. |
| `.AI\AI Prompt Library.md` | Useful index, but not part of minimal startup and may drift unless maintained. |

No orphaned role, procedure, or standard file was conclusively identified.

## Startup Performance Review

Observed startup load for this task:

- `Execution_Record.proc.md`
- `Start_Here.md`
- `currentTask.md`
- `Instructions.md`
- Candidate role files for role selection
- Selected role file
- Required procedure files
- Required standard files

The design supports minimal loading, but the role-selection step currently requires either reading candidate role files or relying on filenames. A short role index with selection criteria would reduce startup cost and variance.

## Determinism Review

Strengths:

- `Start_Here.md` defines a clear minimal load order.
- The Execution Cut-Off prevents open-ended context loading.
- Roles, procedures, and standards have consistent document structure.
- `currentTask.md` explicitly states scope and required outputs.

Risks:

- Missing alias rules for `.proc.md` filenames.
- Duplicate prompt locations.
- Shared instructions include project-specific assumptions.
- Output path precedence is not fully defined.

## Recommendations Ranked

| Priority | Recommendation | Rationale |
| --- | --- | --- |
| High | Fix invoked-procedure filenames in procedure documents. | Prevents failed or inconsistent procedure loading. |
| Medium | Canonicalize `Start_Here.md` casing everywhere. | Improves portability and deterministic path resolution. |
| Medium | Consolidate the detailed project review prompt. | Removes ambiguous task authority. |
| Medium | Repair malformed Markdown in prompt files. | Aligns authored prompts with the workspace standard. |
| Medium | Split global instructions from MyDefrag-specific context. | Makes the shared workspace safer for non-MyDefrag tasks. |
| Medium | Define execution-record output naming. | Improves automation and artifact discovery. |
| Medium | Define output-location precedence. | Prevents conflicts between task prompts and reusable prompts. |
| Low | Add a `Results` manifest. | Improves artifact organization. |
| Low | Add a small role-selection index. | Reduces startup loading cost. |
| Low | Normalize authored Markdown across `.AI`. | Improves parser and renderer consistency. |

## Validation Summary

Validation performed:

- Resolved workspace as `D:\AI\.AI`.
- Loaded startup documents according to `Start_Here.md`.
- Inspected roles, procedures, standards, prompts, and root workspace documents relevant to startup behavior.
- Checked file inventory with `rg --files .AI`.
- Checked evidence for stale invoked-procedure references with targeted `rg`.
- Checked duplicate prompt content with `fc`.
- Recorded failed command attempts and recovery paths in the execution record.

Limitations:

- No framework files were modified.
- Validation focused on authored Markdown and startup structure, not unrelated project source code.
