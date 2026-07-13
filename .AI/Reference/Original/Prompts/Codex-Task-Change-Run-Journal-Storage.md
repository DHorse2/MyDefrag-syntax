# Codex Task — Change Run Journal Storage

You are working in the AI workspace run-control system.

Goal:

Change the current run archive so each execution stores machine-readable metadata and journal evidence separately from the human-readable execution summary.

Current pattern:

```text
D:\AI\runs\
  YYYY-MM-DD\
    <execution-folder>\
      execution-record.md
```

Target pattern:

```text
D:\AI\runs\
  YYYY-MM-DD\
    YYYYMMDD-HHMM_<executionId>\
      execution.json
      execution-record.md
      journal.jsonl
```

Do not remove or break the existing `execution-record.md` behavior. It remains the human-readable summary.

Add or update journal storage so:

- `execution.json` is the authoritative execution manifest.
- `journal.jsonl` is the append-only machine-readable event timeline.
- `execution-record.md` is the readable report generated during or after execution.
- The folder name uses timestamp plus a short unique execution id.
- Do not put computer name or agent name in the folder name.
- Store computer name, agent names, project names, task names, prompt paths, outputs, artifacts, parent execution, and child executions in `execution.json`.

Minimum `execution.json` fields:

```json
{
  "schemaVersion": "1.0",
  "executionId": "",
  "startedAt": "",
  "finishedAt": null,
  "status": "running",
  "computerName": "",
  "initiatingAgent": "",
  "agents": [],
  "projects": [],
  "tasks": [],
  "promptPaths": [],
  "outputs": [],
  "artifacts": [],
  "parentExecutionId": null,
  "childExecutionIds": [],
  "journalPath": "journal.jsonl",
  "summaryPath": "execution-record.md"
}
```

Minimum `journal.jsonl` entry shape:

```json
{
  "sequence": 1,
  "timestamp": "",
  "executionId": "",
  "agent": "",
  "actorType": "",
  "eventType": "",
  "message": "",
  "command": null,
  "input": null,
  "output": null,
  "filesRead": [],
  "filesWritten": [],
  "artifacts": [],
  "diagnostics": [],
  "status": null
}
```

Implementation requirements:

- Preserve existing files and comments.
- Keep changes additive and minimal.
- Use PowerShell 7 syntax if editing PowerShell.
- Use CommonJS if editing Node.js.
- Do not rename public APIs unless required.
- Add migration-safe behavior: old folders containing only `execution-record.md` must still be readable.
- New executions should create `execution.json` and `journal.jsonl`.
- Journal writes must append one JSON object per line.
- Include sequence numbering.
- Prefer ISO 8601 timestamps.
- Use the local machine name from environment/system APIs.
- Make the execution id short but collision-resistant, such as 8 hex characters.
- If two executions start in the same minute, they must still create different folders.
- Update any documentation or examples that describe run storage.

After implementation:

- Show changed files.
- Explain the new folder structure.
- Show one example `execution.json`.
- Show three example `journal.jsonl` lines.
- Confirm old execution folders are still supported.
