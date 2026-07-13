# Execution Feature Status

## Purpose

This document records the current implementation status of the Execution
Provenance System. It intentionally focuses only on the execution
subsystem and its immediate roadmap.

------------------------------------------------------------------------

## Current Status

  --------------------------------------------------------------------------------
  Phase           Feature               Status             Notes
  --------------- --------------------- ------------------ -----------------------
  1               Execution Identity    ✅ Completed       Every execution has a
                                                           timestamp, unique
                                                           execution ID, and
                                                           human-readable slug.

  1               Execution Manifest    ✅ Completed       `execution.json` is the
                                                           canonical
                                                           machine-readable
                                                           metadata file.

  1               Machine Journal       ✅ Completed       `journal.jsonl`
                                                           provides append-only
                                                           execution evidence.

  1               Human Summary         ✅ Completed       `execution-record.md`
                                                           provides a readable
                                                           execution summary.
  --------------------------------------------------------------------------------

------------------------------------------------------------------------

## Phase 2 --- Execution Entity

**Status:** Planned

The execution becomes a graph entity rather than simply a filesystem
folder.

### Goals

-   Introduce a stable schema version.
-   Reference related objects by ID.
-   Support parent/child execution relationships.
-   Reference artifacts rather than embedding file knowledge.

### Example

``` json
{
  "executionId": "abc123ef",
  "schemaVersion": "1.0",
  "status": "Completed",

  "projectIds": [],
  "taskIds": [],
  "procedureIds": [],
  "promptIds": [],

  "parentExecutionId": null,
  "childExecutionIds": [],

  "artifacts": [],
  "journal": "journal.jsonl",
  "summary": "execution-record.md"
}
```

------------------------------------------------------------------------

## Phase 3 --- Artifact Catalog

**Status:** Planned

Replace scattered file references with a structured artifact catalog.

### Example

``` json
"artifacts": [
  {
    "artifactId": "...",
    "type": "Prompt",
    "path": "...",
    "role": "Input"
  },
  {
    "artifactId": "...",
    "type": "ExecutionRecord",
    "path": "...",
    "role": "Summary"
  }
]
```

### Benefits

-   Enumerate artifacts by type.
-   Locate execution outputs without scanning directories.
-   Maintain stable references between executions and generated files.

------------------------------------------------------------------------

## Phase 4 --- Journal Events

**Status:** Planned

Replace generic log entries with strongly typed execution events.

### Initial Event Types

-   ExecutionStarted
-   PromptLoaded
-   PromptSaved
-   ToolInvoked
-   CommandExecuted
-   FileRead
-   FileWritten
-   ArtifactCreated
-   DecisionRecorded
-   Warning
-   Error
-   ExecutionCompleted

### Benefits

-   Deterministic replay
-   Rich execution analysis
-   Better provenance
-   Stronger graph relationships

------------------------------------------------------------------------

## Overall Architecture

The subsystem should now be viewed as an **Execution Provenance System**
rather than a logging system.

Every AI, script, MCP tool, PowerShell command, Rust executable, Node.js
program, or other deterministic tool should emit standardized execution
evidence through the same model.

The execution becomes the primary provenance entity, with artifacts and
journal events providing the evidence that describes what occurred
during the run.

------------------------------------------------------------------------

## Summary

  Phase   Name                 Status
  ------- -------------------- --------------
  1       Execution Identity   ✅ Completed
  1       Execution Manifest   ✅ Completed
  1       Machine Journal      ✅ Completed
  1       Human Summary        ✅ Completed
  2       Execution Entity     Planned
  3       Artifact Catalog     Planned
  4       Journal Events       Planned
