# Procedure - Task Queue

```yaml
identity: <PROJECT_ROOT>\.vscode\ai-project.json
queue: <ACTIVE_AI_ROOT>\Todo.md
current: <ACTIVE_AI_ROOT>\Prompts\currentTask.md
resolver: <ACTIVE_AI_ROOT>\Scripts\Resolve-AiTaskQueue.ps1
eligible: projectId == ACTIVE_PROJECT_ID
required: [taskId, projectId, projectRoot, status, promptPath]
active: [Ready, Loaded, In Progress, Blocked, Failed]
terminal: [Completed, Skipped, Cancelled]
missingOrMismatch: HALT
otherProject: IGNORE_WITHOUT_MUTATION
projectless: PRESERVE_INELIGIBLE
adHoc: VALIDATE_PROJECT; DO_NOT_CONSUME_QUEUE
```
