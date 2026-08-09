# Codex Task: Refine Journaling Architecture - Separate Responsibilities

This task supersedes the previous journaling organization where necessary.

Do not discard completed work. Refactor the implementation to match the architecture below before additional features are built on top of it.

## Fundamental Principle

Every subsystem has a single responsibility.

Do not combine unrelated concerns simply because they are all AI data.

The architecture deliberately separates:

- Projects
- ToDo
- Requirements
- Procedures
- Run Control
- Journal
- State
- Knowledge
- Configuration
- Cache
- Prompt History

## Projects Domain

Projects define what exists.

Projects contain durable knowledge and documentation.

A project is not computer-specific.

Example:

```text
Projects/
    MdmMcp/
        Requirements/
        Design/
        Documentation/
        Research/
        Knowledge/
        Decisions/
        Procedures/
```

Never place computer names inside project structures.

## ToDo Domain

ToDo defines work.

It is independent of Projects.

A task may reference one or more projects, but it does not belong inside a project directory.

Projects never own ToDo state.

## Run Control Domain

Run Control defines execution.

A run has:

- executionId
- start time
- end time
- initiating agent
- current status
- parent execution, when applicable
- associated projects
- associated ToDo items
- associated requirements
- associated procedures

Run Control coordinates work.

It is not the Journal.

## Journal Domain

Journal is immutable execution evidence.

It records:

- prompts
- commands
- decisions
- diagnostics
- outputs
- files written
- warnings
- errors
- observations

Journal entries are append-only.

Never rewrite history.

## State Domain

State represents the current mutable condition.

Examples:

- active execution
- current checkpoint
- loaded prompt
- navigation position
- current AI mode
- temporary selections

State changes continuously.

It is not historical evidence.

## Knowledge Domain

Knowledge is distilled information promoted from journals after review.

Knowledge is not raw execution history.

## Configuration Domain

Configuration controls behavior.

Examples:

- enabled features
- logging level
- MCP servers
- local preferences
- cache limits

Configuration is not execution state.

## Cache Domain

Cache contains disposable derived information.

It can always be rebuilt.

Examples:

- indexes
- parsed trees
- embeddings
- temporary exports
- search databases

## Prompt History Domain

Prompt history is its own domain.

Prompt snapshots are useful for reproducibility, but they are not mutable state.

Maintain prompt history independently.

## Computer Scoping Rule

Computer names apply only to machine-local information.

Never scope Projects, Requirements, ToDo, Procedures, or Knowledge by computer.

Computer names apply to:

- Journal
- State
- Cache
- Prompt History
- Logs
- Local Configuration
- Temporary files

Recommended layout:

```text
.AI/
    Computers/
        <ComputerName>/
            Configuration/
            State/
            Journal/
            Prompt/
            Cache/
            Logs/
            Temp/
```

## Execution Identity Rule

Every execution must have a globally unique executionId.

This identifier is the primary key for everything produced during that execution.

Every journal record must include:

- executionId
- computerName
- timestamp
- agent
- action type

Additional fields should be included where available:

- projectIds
- todoIds
- requirementIds
- procedureIds
- parentExecutionId
- workingDirectory
- projectRoot

## Cross-Reference Rule

Subdomains should reference each other instead of containing each other.

Examples:

- Journal references an execution.
- Execution references Projects.
- Execution references ToDo items.
- Execution references Procedures.
- Knowledge references Journal entries that produced it.

Avoid duplication.

## Migration Requirements

If existing work places computer-specific data under project folders or mixes mutable state with immutable journals:

- preserve existing data
- migrate incrementally
- provide compatibility where practical
- minimize breaking changes
- document every migration decision

## Implementation Requirements

Update or create code that:

- detects the current computer name
- creates the machine-local folder structure when needed
- generates a unique executionId for each run
- writes prompt snapshots under the computer-scoped Prompt domain
- appends immutable journal records under the computer-scoped Journal domain
- writes mutable current state under the computer-scoped State domain
- keeps Projects, ToDo, Requirements, Procedures, and Knowledge independent from computer-specific storage
- uses references rather than ownership across domains

## Minimum Journal Record Shape

```json
{
  "executionId": "00000000-0000-0000-0000-000000000000",
  "parentExecutionId": null,
  "timestamp": "2026-07-07T00:00:00.000Z",
  "computerName": "MACHINE-NAME",
  "userName": "david",
  "agent": "codex",
  "action": "command",
  "projectIds": [],
  "todoIds": [],
  "requirementIds": [],
  "procedureIds": [],
  "projectRoot": "D:\\MdmMcp\\code\\vs\\MdmMcpVs0_0_0",
  "workingDirectory": "D:\\MdmMcp\\code\\vs\\MdmMcpVs0_0_0",
  "summary": "",
  "details": {}
}
```

## Project Rules

- Markdown documents must use `-` for unordered lists, not `*`.
- Markdown documents must begin with a single level-1 title.
- Markdown headings must be unique.
- Horizontal rules must be preceded by a blank line.
- Preserve comments.
- Prefer PowerShell 7 compatible syntax.
- Use CommonJS for Node.js unless an existing file already uses ESM.
- Keep write actions explicit and traceable.
- Do not rename public APIs unless necessary.
- Make additive changes and minimize diffs.

## Future Direction

This architecture is intended to become the foundation of the broader AI and MCP operating environment.

Future agents, local models, Codex, ChatGPT, MCP servers, PowerShell tools, diagnostics, benchmark systems, and execution pipelines should integrate with these architectural principles.

Optimize for:

- determinism
- traceability
- reproducibility
- composability
- scalability
- minimal coupling
- clear ownership of responsibility

When in doubt, add explicit references between domains rather than merging their responsibilities.
