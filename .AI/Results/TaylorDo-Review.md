# TaylorDo Startup Review

## Summary

The shared `D:\AI\.AI` workspace has a workable startup model: `Start_Here.md` defines a minimal load sequence, roles define authority, procedures define workflows, standards define output requirements, and `currentTask.md` drives the active review.

The main issues are deterministic startup risks rather than source-code defects. The highest-impact problems are workspace-resolution ambiguity, stale or duplicate current-task prompts, procedure references that name files that do not exist, and result artifact naming drift.

## Review Scope

| Area | Included |
| --- | --- |
| Startup workflow | Yes |
| Roles | Yes |
| Procedures | Yes |
| Standards | Yes |
| Prompt loading | Yes |
| Execution-record behavior | Yes |
| Overall organization | Yes |
| Project source code outside `.AI` | No |

## Loaded Evidence

| Evidence | Observation |
| --- | --- |
| `D:\AI\.AI\Start_Here.md` | Defines startup load order and Execution Cut-Off. |
| `D:\AI\.AI\Prompts\currentTask.md` | Active task requires `Results/TaylorDo-Review.md`, `Results/TaylorDo-TODO.md`, and a verbose execution record. |
| `D:\AI\.AI\Prompts\currentTask_AI.md` | Stale task variant requires `AI-Startup-*` outputs. |
| `D:\AI\.AI\Prompts\currentTask copy.md` | Duplicate stale task variant also requires `AI-Startup-*` outputs. |
| `D:\AI\.AI\Procedures\Code_Review.proc.md` | Invoked procedures reference `Validation.md` and `Execution_Record.md`. |
| `D:\AI\.AI\Procedures\Validation.proc.md` | Defines validation workflow. |
| `D:\AI\.AI\Procedures\Execution_Record.proc.md` | Requires numeric metrics in every execution record. |
| `D:\AI\.AI\Standards\Execution_Record_Standard.md` | Standard allows metrics to be optional, creating tension with the procedure. |
| `D:\AI\.AI\Standards\Global Markdown Documentation Standard.md` | Requires one H1, unique headings, hyphen list markers, balanced fences, and validation before delivery. |
| `D:\AI\.AI\File Tree - .AI.md` | Stale file tree lists 5 folders and 26 files, while current discovery found more folders and files. |
| `D:\MdmTaylorDo\MdmDefrag\.AI` | Local `.AI` became empty during the run; shared workspace is now the unambiguous startup source. |

## Findings

| Rank | Finding | Evidence | Impact | Recommendation |
| --- | --- | --- | --- | --- |
| Critical | Workspace resolution is ambiguous when a project-local `.AI` exists without `Start_Here.md`. | The local project `.AI` had no startup entry point and later became empty; the required startup entry point exists at `D:\AI\.AI\Start_Here.md`. | Agents can block before startup or use different fallback behavior. | Define explicit fallback precedence: use local `.AI` only when it contains `Start_Here.md`; otherwise use shared `D:\AI\.AI` and record an informational diagnostic. |
| High | Active task selection is not deterministic because multiple current-task files coexist. | `currentTask.md` requests `TaylorDo-*` outputs; `currentTask_AI.md` and `currentTask copy.md` request `AI-Startup-*` outputs. | Agents may select stale task files or generate differently named artifacts. | Keep one active task file, move old variants to an archive folder, or add a manifest field that identifies the active task. |
| High | Procedure references do not match actual procedure filenames. | Procedure files refer to `Validation.md` and `Execution_Record.md`, but actual files are `Validation.proc.md` and `Execution_Record.proc.md`. | Agents may search for nonexistent files or load inconsistent substitutes. | Update invoked-procedure references to exact filenames or define a canonical alias table. |
| High | Execution-record metric requirements conflict between procedure and standard. | `Execution_Record.proc.md` says every execution record must include a numeric metrics table; `Execution_Record_Standard.md` says Metrics are optional. | Agents can satisfy one document while violating another. | Make metrics mandatory in the standard when the execution-record procedure is active, or make the procedure conditional on selected mode. |
| Medium | Result artifact naming has drifted. | Existing `Results` contains `AI-Startup-*`; active task requires `TaylorDo-*`. | Review history becomes fragmented and future agents may update the wrong artifact set. | Add a naming rule for task-scoped result files and state whether older result names are superseded. |
| Medium | The file tree document is stale and not Markdown-standard compliant. | `File Tree - .AI.md` lists old root contents and uses non-ASCII symbols plus an asterisk unordered marker in the generator footer. | Agents using it as a source of truth may miss Roles, Procedures, Tests, Modes, and current prompts. | Regenerate the file tree after structural changes and normalize it to the Markdown standard. |
| Medium | Startup performance depends on broad discovery when task paths are missing or stale. | Missing local startup material and duplicate task files required extra discovery commands during this run. | Startup becomes slower and less reproducible. | Add a startup resolver checklist with exact fallback rules and expected diagnostics. |
| Low | Role documents are clear but use example-driven procedure names rather than exact load contracts. | Roles list examples such as Architecture Review, Documentation Review, and Execution Record. | Agent choice is flexible but may be inconsistent for borderline tasks. | Add a short role-selection matrix or task-to-role mapping in `Roles\README.md`. |

## Startup Sequence Assessment

| Step | Result | Notes |
| --- | --- | --- |
| Resolve AI workspace | Partial | Local `.AI` did not provide `Start_Here.md`; shared startup was used. |
| Load task | Pass | `D:\AI\.AI\Prompts\currentTask.md` was found and loaded. |
| Load instructions | Pass | `D:\AI\.AI\Instructions.md` was loaded. |
| Select role | Pass | `Code_Reviewer.role.md` was selected for a structured framework review. |
| Load procedures | Pass with diagnostics | Required procedures loaded, but invoked-procedure references contain filename drift. |
| Load standards | Pass with recovery | Standards loaded; paths with spaces required 8.3 short-name recovery in this environment. |
| Reach Execution Cut-Off | Pass | Task execution began only after role, procedures, and standards were loaded. |

## Redundant Or Orphaned Documents

| Document | Status | Reason |
| --- | --- | --- |
| `Prompts\currentTask_AI.md` | Redundant or stale | Same task shape as old AI startup validation with old output names. |
| `Prompts\currentTask copy.md` | Redundant or stale | Duplicate of the stale AI startup task. |
| `Results\AI-Startup-Review.md` | Historical result | Existing artifact does not match active `TaylorDo-*` output names. |
| `Results\AI-Startup-TODO.md` | Historical result | Existing artifact does not match active `TaylorDo-*` output names. |
| `Results\AI-Startup-Execution-Record.md` | Historical result | Existing artifact does not match active `TaylorDo-*` output names. |
| `File Tree - .AI.md` | Stale index | Current directory contents exceed the recorded tree. |

## Determinism Improvements

- Add a workspace resolver rule that treats a local `.AI` without `Start_Here.md` as incomplete and falls back to shared startup.
- Keep only one active `Prompts\currentTask.md` file, with archived task files outside the active prompt path.
- Use exact procedure filenames in invoked-procedure lists.
- Define whether output paths are relative to the resolved AI workspace or the current project root.
- Add a result naming convention that binds task identity to output artifact names.
- Add a startup self-check that verifies required files before task execution.

## Validation Summary

| Check | Result |
| --- | --- |
| Startup framework reviewed | Pass |
| Findings supported by observed files or command output | Pass |
| Observations separated from recommendations | Pass |
| Priorities assigned | Pass |
| Project source code excluded | Pass |
| Markdown standard applied to this report | Pass |

## Conclusion

The startup framework is usable and structurally sound, but it needs stricter deterministic rules around workspace resolution, active task selection, exact procedure references, and result naming.
