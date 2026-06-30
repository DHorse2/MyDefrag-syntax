# MyDefrag Language Extension Instructions

## Required AI Load Order

Before starting work, AI tools must read project guidance in this order:

1. this document
2. `.AI/INSTRUCTIONS.md`
3. `.AI/context/PROJECT_CONTEXT.md`
4. `.AI/context/DEVELOPMENT_RULES.md`
5. `.AI/context/CODING_STANDARDS.md`
6. `.AI/context/ARCHITECTURE.md`
7. `.AI/context/KEY_FILES.md`
8. `.AI/context/PARSER_CALL_TREE.md`
9. `.AI/context/PARSER_DIAGNOSTIC_WORKFLOW.md`
10. `.AI/context/DEBUGGING_WORKFLOW.md`
11. Any relevant task prompt from `.AI/prompts/`
12. `.AI/README.md`

If files disagree, later task-specific instructions may narrow the task, but they must not override `.AI/INSTRUCTIONS.md` or `.AI/context/DEVELOPMENT_RULES.md` unless the user explicitly says so.
