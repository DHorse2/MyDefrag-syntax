# Detailed Project Review Prompt

## Purpose

Produce a comprehensive engineering review of the entire project.

This prompt is intended for Codex or another AI engineering assistant working inside the project repository.

The review should evaluate the project as software, not merely as JavaScript source code.

---

## Dependencies

Before beginning the review, load and follow the supporting documents referenced by this prompt.

### Required Prompt Support

- `.AI/Prompts/Review Instructions.md`
- `.AI/Prompts/Review Checklist.md`

### Recommended Project Context

- `.AI/context/Project_Context.md`
- `.AI/context/Architecture.md`
- `.AI/context/Coding_Standards.md`
- `.AI/context/Development_Rules.md`
- `.AI/context/Key_Files.md`

### Optional Project Context

Use these if they are relevant to the review:

- `.AI/context/Parser_Call_Tree.md`
- `.AI/context/Parser_Diagnostic_Workflow.md`
- `.AI/context/Installation_Guide.md`
- `.AI/context/Organization and Structure Tree.md`

If any referenced document is missing, continue the review and list the missing document in the report.

---

## Precedence

If conflicting instructions are encountered, use the following precedence:

1. Direct user instructions
2. This prompt
3. `.AI/Prompts/Review Instructions.md`
4. `.AI/Prompts/Review Checklist.md`
5. `.AI/context/` documents
6. General model assumptions

---

## Output Location

Write the final review report to:

```text
.user/.ai-output/reviews/YYYY-MM-DD Detailed Project Review.md
```

Use the current date in `YYYY-MM-DD` format.

If direct file writing is unavailable, return the complete report in the response so the user can save it to that location manually.

Do not write generated AI review reports into `.AI/`.

The `.AI/` directory is for reusable prompts, context, instructions, standards, and templates. Generated reports belong under `.user/.ai-output/`.

---

## Output File Tracking

At the end of the report, include a section named:

```markdown
## Revisions Log
```

The **Revisions Log** must list every file created, updated, or recommended for creation.

Use this format:

```markdown
## Revisions Log

### Files Created

- `.user/.ai-output/reviews/YYYY-MM-DD Detailed Project Review.md`

### Files Updated

- None

### Files Recommended for Future Creation

- `path/to/recommended/file.md` — reason

### Files Recommended for Future Update

- `path/to/existing/file.js` — reason
```

If no files were created, updated, or recommended, explicitly write `None`.

Because this prompt asks for a review only, source files should normally not be modified.

---

## Task

Perform a comprehensive engineering review of this entire project.

This is **not** a request to rewrite code or make style changes.

Your job is to understand the architecture, evaluate the implementation, identify risks, and produce a detailed technical report.

The project is a Visual Studio Code / VSCodium language extension for the MyDefrag scripting language.

The extension currently contains:

- Extension client
- Language Server
- Tokenizer
- Recursive parser
- Language data
- Diagnostic system
- Document link provider
- Include preprocessor
- Logging subsystem
- Configuration subsystem
- Diagnostic navigator
- Preview generator
- Supporting utilities

Read the **entire** project before writing your report.

Do not stop after the first files.

Do not stop after the first few hundred lines of large files.

Several important implementation details may appear near the end of large files.

---

## Review Philosophy

Treat this as an engineering design review, not a style review.

Do not recommend changes merely because they match common JavaScript conventions.

Do not recommend cosmetic changes unless they directly improve maintainability, correctness, reliability, or user experience.

Only recommend changes that improve:

- Correctness
- Reliability
- Maintainability
- Performance
- Extensibility
- Architecture
- User experience
- Production readiness

Focus on high-value engineering improvements.

---

## Required Report Sections

Use the following sections in the final report.

---

## 1. Executive Summary

Summarize the project.

Describe its overall maturity.

Describe what it does well.

Describe what makes it unusual compared to typical VS Code language extensions.

Estimate:

- Overall code quality
- Maintainability
- Architectural quality
- Production readiness

---

## 2. Architecture Review

Describe the architecture in detail.

Include:

- `extension.js` responsibilities
- `server.js` responsibilities
- tokenizer
- parser
- `languageData`
- diagnostics
- preview processor
- logging
- configuration
- navigation

Explain whether responsibilities are separated appropriately.

Identify:

- coupling
- hidden dependencies
- circular dependencies
- overly large modules
- modules that should be split
- modules that are especially well designed

---

## 3. Parsing System Review

Review the parser in depth.

Discuss:

- tokenizer
- parser
- grammar
- fragment parsing
- backward reasoning
- error recovery
- parser state management

Look for:

- incorrect assumptions
- ambiguities
- places where parsing may fail
- error cascades
- unnecessary complexity
- state bugs
- parser recovery opportunities
- grammar extensibility concerns

---

## 4. Language Server Review

Review the LSP implementation.

Evaluate:

- initialization
- workspace scanning
- document synchronization
- diagnostic publication
- notifications
- configuration handling
- performance
- resource usage
- incremental parsing
- caching opportunities
- threading assumptions
- possible race conditions

---

## 5. Diagnostics Review

Evaluate the diagnostics system.

Discuss:

- quality
- consistency
- severity handling
- navigation
- diagnostic persistence
- false positives
- false negatives
- error wording
- user experience
- determinism

Identify missing diagnostic categories.

---

## 6. Extension Review

Review `extension.js`.

Evaluate:

- activation
- providers
- commands
- document links
- definition provider
- reference provider
- preview provider
- status bar
- configuration
- organization
- complexity
- maintainability

---

## 7. Logging System

Review the logging subsystem.

Evaluate:

- design
- verbosity
- performance
- configuration
- code duplication
- API quality
- thread safety assumptions
- production suitability

---

## 8. Configuration System

Review:

- `ini.js`
- configuration loading
- severity handling
- configuration normalization
- strict mode
- interaction with VS Code settings

Determine whether the configuration design is scalable.

---

## 9. Performance Review

Identify:

- expensive algorithms
- O(n²) algorithms
- O(n³) algorithms
- workspace scans
- memory usage
- duplicate parsing
- duplicate filesystem operations
- repeated allocations
- startup costs
- parser optimizations
- caching opportunities

Do **not** recommend premature optimization.

Recommend only improvements likely to have measurable benefit.

---

## 10. Code Quality

Evaluate:

- naming
- organization
- readability
- comments
- documentation
- function length
- class design
- module boundaries
- error handling
- exception safety
- testability
- maintainability

---

## 11. Security Review

Look for:

- unsafe file operations
- unsafe path handling
- URI issues
- command injection
- LSP vulnerabilities
- directory traversal
- workspace trust assumptions
- denial-of-service risks
- resource exhaustion

---

## 12. Reliability Review

Identify:

- possible crashes
- null dereferences
- infinite loops
- parser lockups
- unexpected recursion
- filesystem assumptions
- startup failures
- shutdown issues
- synchronization issues

---

## 13. Technical Debt

List all technical debt.

Classify each item as:

- Critical
- High
- Medium
- Low

Estimate the effort required to address each item.

---

## 14. Refactoring Opportunities

Recommend architectural improvements.

Do **not** rewrite code.

Focus on:

- modularity
- maintainability
- clarity
- extensibility
- future language features
- future IDE features

---

## 15. Future Features

Based on the architecture, recommend future features that naturally fit the design.

Avoid speculative AI features unless directly related to the existing project architecture.

Focus on realistic language-extension capabilities.

---

## 16. Positive Design Decisions

Identify the strongest parts of the project.

Describe why they are good.

Describe what should definitely **not** be changed.

---

## 17. Output and Workspace Design Review

Review the `.AI` and `.user/.ai-output` workflow design.

Evaluate:

- whether generated AI outputs are stored in the correct location
- whether `.AI` is being used only for reusable framework inputs
- whether `.user/.ai-output` is appropriate for local generated reports
- whether logs and AI-generated reports are separated clearly
- whether the structure supports future MCP orchestration
- whether output paths are deterministic
- whether provenance, audit, or revision tracking should be added

Identify any design flaws or risks in this workflow structure.

Do not redesign the structure unless there is a clear engineering reason.

---

## 18. Overall Assessment

Provide an overall engineering assessment.

Estimate:

- Architecture quality (1–10)
- Code quality (1–10)
- Maintainability (1–10)
- Parser quality (1–10)
- Language server quality (1–10)
- Extensibility (1–10)
- Documentation quality (1–10)
- Production readiness (1–10)

Finally, list the **Top 25 improvements**, ranked by engineering value.

---

## 19. Revisions Log

Include the required Revisions Log at the end of the report.

The log must list:

- files created
- files updated
- files recommended for future creation
- files recommended for future update

This section is required even if no files were changed.

---

## Constraints

Do **not** generate patches.

Do **not** rewrite source files.

Do **not** make code changes.

Do **not** perform style-only review.

Produce only the engineering review unless direct file writing is available, in which case write the report to the specified output location and summarize the saved path.
