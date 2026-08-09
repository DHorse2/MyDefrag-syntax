# AI Startup

```yaml
project: <PROJECT_ROOT>\.vscode\ai-project.json
onProjectError: HALT
aiRoot: <PROJECT_ROOT>\.AI ?? D:\AI\.AI
launcher: D:\AI\.AI\Computers\<COMPUTERNAME>\Configuration\Process-Launcher.md
load: [AI_Directive_Vocabulary.md]
task: Scripts\Resolve-AiTaskQueue.ps1 -ProjectRoot <PROJECT_ROOT>
afterLoad: SHOW_TASK_AND_PAUSE
onApproval: [Instructions.md, required roles, required procedures, required standards]
then: [PLAN, EXECUTE, VALIDATE, RECORD, COMPLETE_TASK]
cache: [PROJECT_ROOT, ACTIVE_PROJECT_ID, ACTIVE_AI_ROOT]
maxLoadPerFile: 1
```
