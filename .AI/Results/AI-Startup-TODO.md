# AI Startup TODO

## TODO Summary

| ID | Priority | Status | Area | Action |
| --- | --- | --- | --- | --- |
| AI-STARTUP-001 | High | Open | Procedures | Update invoked-procedure references to actual `.proc.md` filenames. |
| AI-STARTUP-002 | Medium | Open | Startup | Replace `START_HERE.md` with `Start_Here.md` in `Session_Template.md`. |
| AI-STARTUP-003 | Medium | Open | Prompts | Consolidate duplicate detailed project review prompts into one canonical prompt. |
| AI-STARTUP-004 | Medium | Open | Prompts | Repair malformed Markdown emphasis in review prompt files. |
| AI-STARTUP-005 | Medium | Open | Instructions | Split global AI rules from MyDefrag-specific project context. |
| AI-STARTUP-006 | Medium | Open | Execution Records | Define deterministic execution-record output naming for `.AI\Results`. |
| AI-STARTUP-007 | Medium | Open | Output Policy | Define precedence for task-specific output paths versus reusable prompt defaults. |
| AI-STARTUP-008 | Low | Open | Results | Add a `Results` manifest or README. |
| AI-STARTUP-009 | Low | Open | Roles | Add a concise role-selection index. |
| AI-STARTUP-010 | Low | Open | Markdown | Normalize authored `.AI` Markdown against the global standard. |

## AI-STARTUP-001 Procedure Filename References

Priority: High

Status: Open

Files:

```text
.AI\Procedures\Code_Review.proc.md
.AI\Procedures\Debugging_Run.proc.md
.AI\Procedures\Markdown_Document_Update.proc.md
.AI\Procedures\Execution_Record.proc.md
```

Action: replace `Validation.md` and `Execution_Record.md` references with `Validation.proc.md` and `Execution_Record.proc.md`, or define an explicit alias rule.

## AI-STARTUP-002 Start Here Casing

Priority: Medium

Status: Open

File:

```text
.AI\Session_Template.md
```

Action: replace `D:\AI\.AI\START_HERE.md` with `D:\AI\.AI\Start_Here.md`.

## AI-STARTUP-003 Canonical Review Prompt

Priority: Medium

Status: Open

Files:

```text
.AI\Detailed Project Review Prompt.md
.AI\Prompts\Detailed Project Review Prompt.md
```

Action: select the canonical prompt location, preserve any needed content from the richer root prompt, and mark or remove the duplicate.

## AI-STARTUP-004 Prompt Markdown Repair

Priority: Medium

Status: Open

Files:

```text
.AI\Prompts\Detailed Project Review Prompt.md
.AI\Prompts\Review Instructions.md
```

Action: repair malformed double-star text followed by star-hyphen sequences and
validate the prompt files.

## AI-STARTUP-005 Global Instruction Split

Priority: Medium

Status: Open

File:

```text
.AI\Instructions.md
```

Action: keep universal AI operating rules in `Instructions.md` and move MyDefrag-specific content to project context or a project-local override.

## AI-STARTUP-006 Execution Record Naming

Priority: Medium

Status: Open

Files:

```text
.AI\Procedures\Execution_Record.proc.md
.AI\Standards\Execution_Record_Standard.md
```

Action: define a deterministic filename or run-folder convention for execution records created in the shared `.AI` workspace.

## AI-STARTUP-007 Output Policy Precedence

Priority: Medium

Status: Open

Files:

```text
.AI\Start_Here.md
.AI\Instructions.md
.AI\Prompts\currentTask.md
.AI\Detailed Project Review Prompt.md
```

Action: state which output-location rule wins when a current task conflicts with a reusable prompt.

## AI-STARTUP-008 Results Manifest

Priority: Low

Status: Open

Folder:

```text
.AI\Results
```

Action: add a manifest or README describing generated artifact types, naming, and retention expectations.

## AI-STARTUP-009 Role Selection Index

Priority: Low

Status: Open

Folder:

```text
.AI\Roles
```

Action: add a concise role-selection matrix so agents can choose roles without reading every role file.

## AI-STARTUP-010 Markdown Normalization

Priority: Low

Status: Open

Folder:

```text
.AI
```

Action: run a controlled Markdown cleanup pass on authored `.AI` documents and add a validation command for future generated documentation.
