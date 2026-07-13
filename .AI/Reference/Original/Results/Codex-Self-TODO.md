# Codex Self TODO

## Scope

Reviewed `D:\AI\.AI\Tests` for deterministic Codex AI test workflow readiness. Existing test framework files were inspected only and were not modified.

## Summary

The framework has a useful Run Control mapping and a declared common test schema, but most individual test prompts are still underspecified. The highest-priority work is to normalize every test into a deterministic definition with machine-readable metadata, explicit pass and fail criteria, expected artifacts, metrics, and postconditions.

## TODO Items

| ID | Priority | Status | Area | Description | Rationale | Affected File Or Component | Suggested Implementation Order | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CST-001 | Critical | Open | Test schema | Convert each individual test prompt to the complete schema declared in `AI_Test_Types.md`. | `Execution_Metrics_Test.md`, `Minimal_Startup_Test.md`, `Procedure_Composition_Test.md`, `Role_Selection_Test.md`, and `Startup_Compliance_Test.md` are short prompts, so an automated runner must infer prerequisites, inputs, expected behavior, artifacts, and validation rules. | `D:\AI\.AI\Tests\*_Test.md` | 1 | None |
| CST-002 | Critical | Open | Pass and fail criteria | Add explicit pass criteria and fail criteria to every test definition. | Deterministic MCP automation needs objective success and failure conditions instead of broad instructions such as validate startup or derive roles. | Individual test files and future run request JSON | 2 | CST-001 |
| CST-003 | Critical | Open | Expected artifacts | Define exact expected artifacts, names, locations, and required contents for each test. | The current tests do not consistently identify output files, making post-run validation dependent on agent judgment. | Individual test files and `run_request.request_json.expected_artifacts` | 3 | CST-001 |
| CST-004 | High | Open | Metrics | Define required and optional metrics per test, including unavailable-metric handling. | `Execution_Metrics_Test.md` mentions numeric metrics, but other tests do not say which metrics must be captured or how missing values should be represented. | `Execution_Metrics_Test.md`, all other test definitions, `Execution_Record_Metrics.md` references | 4 | CST-001 |
| CST-005 | High | Open | Postconditions | Add postconditions and cleanup expectations to every test. | Tests that create artifacts or load context need final-state checks, including required artifact existence and confirmation that source test files were not modified unless explicitly allowed. | Individual test files and Run Control validation events | 5 | CST-002, CST-003 |
| CST-006 | High | Open | Role selection | Replace the ambiguous Role Selection prompt with concrete role-selection scenarios and expected role outcomes. | The current instruction says to present an ambiguous task, which leaves the test authoring to the agent under test and prevents deterministic evaluation. | `Role_Selection_Test.md` | 6 | CST-001 |
| CST-007 | High | Open | Procedure composition | Define expected procedure graphs for procedure-composition cases. | The test asks agents to verify only required procedures are loaded, but it does not state the expected procedures, allowed shared procedures, or disallowed extras. | `Procedure_Composition_Test.md`, procedure selection rules | 7 | CST-001 |
| CST-008 | Medium | Open | Minimal startup | Specify a concrete trivial question and the maximum allowed startup context. | Minimal startup cannot be judged reliably unless the prompt, allowed files, and prohibited extra context are defined. | `Minimal_Startup_Test.md` | 8 | CST-001 |
| CST-009 | Medium | Open | Startup compliance | Expand startup compliance into ordered observable checkpoints. | `Startup_Compliance_Test.md` names the startup sequence and Execution Cut-Off but does not enumerate required evidence such as workspace resolution, task load, role selection, procedure load, standard load, planning, and cutoff event. | `Startup_Compliance_Test.md`, execution record template | 9 | CST-001 |
| CST-010 | Medium | Open | Run Control mapping | Add a canonical JSON test-definition example for each existing test. | `AI_Test_Run_Control_Mapping.md` provides a strong generic mapping, but each test still needs structured metadata suitable for `run_request.request_json`. | `AI_Test_Run_Control_Mapping.md`, generated test JSON artifacts | 10 | CST-001, CST-002, CST-003 |
| CST-011 | Medium | Open | Regression baselines | Define baseline capture and comparison rules. | `AI_Test_Types.md` names regression baselines, but no test defines baseline artifact hashes, previous run IDs, expected metric ranges, or comparison tolerances. | Test definitions, `run_log_metric`, `run_log_artifact` | 11 | CST-003, CST-004 |
| CST-012 | Medium | Open | Test catalog | Reconcile the test inventory with generated tree artifacts. | The task listed seven current files, while the directory also contains `File Tree - Tests.md`; the tree says there are seven files and excludes itself, which can confuse automation. | `D:\AI\.AI\Tests\File Tree - Tests.md`, test inventory documentation | 12 | None |
| CST-013 | Low | Open | Markdown conformance | Normalize generated test-support documentation to the shared Markdown standard. | `File Tree - Tests.md` contains non-ASCII symbols and an asterisk-generated footer, which would fail the current generated Markdown rules if treated as a maintained artifact. | `D:\AI\.AI\Tests\File Tree - Tests.md`, TreeScope output settings | 13 | CST-012 |
| CST-014 | Low | Open | Negative tests | Add tests for deliberate startup and validation failures. | The suite mainly checks expected happy-path behavior; MCP automation also needs deterministic failure cases for missing task files, extra context loading, malformed Markdown, missing metrics, and artifact write failures. | New negative test definitions under `D:\AI\.AI\Tests` | 14 | CST-001, CST-002 |

## Suggested Execution Sequence

1. Normalize all individual tests to the common schema.
2. Add deterministic pass, fail, artifact, metric, and postcondition sections.
3. Add per-test Run Control JSON metadata examples.
4. Add regression baseline rules and negative tests.
5. Reconcile generated inventory artifacts and Markdown conformance.

## Validation Notes

- Existing test framework files were reviewed read-only.
- No existing files under `D:\AI\.AI\Tests` were modified.
- This TODO list intentionally uses `Open` for all items because it identifies future work rather than completing framework changes.
