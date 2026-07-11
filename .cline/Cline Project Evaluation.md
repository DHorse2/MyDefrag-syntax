# Report

## Initial Project Assessment

When first opening a project with Cline, the recommended approach is to perform a read-only assessment before making any modifications.

The goal is to understand the architecture, build process, configuration, and current state of the project before proposing changes.

### Initial Assessment Prompt

Use the following prompt:

```text
Analyze this entire workspace and provide a comprehensive project review.

Do not modify any files.

Please report:

1. Project Overview
   - Purpose of the project
   - Main technologies used
   - Overall architecture
   - Important entry points

2. Source Layout
   - Describe the purpose of each major folder.
   - Identify files that appear to be primary entry points.
   - Identify generated files, build artifacts, and configuration files.

3. VS Code Extension Analysis
   - Explain how the extension activates.
   - Explain how extension.js and server.js interact.
   - Describe the Language Server Protocol architecture.
   - Identify activation events and client/server communication paths.

4. Build and Packaging
   - Explain the build process.
   - Explain npm scripts.
   - Explain VSIX packaging.
   - Identify any missing or questionable build configuration.

5. Configuration Analysis
   - package.json
   - launch.json
   - tasks.json
   - language configuration
   - TextMate grammars
   - any custom configuration files

6. Code Quality Review
   - Potential bugs
   - Error handling concerns
   - Maintainability concerns
   - Performance concerns
   - Security concerns

7. Project Risks
   - Files that appear unfinished
   - Dead code
   - Duplicate code
   - Architectural weaknesses
   - Technical debt

8. Recommendations
   - Top 10 improvements
   - Ranked by impact
   - Include estimated effort and risk

9. Questions
   - List anything that appears ambiguous or requires clarification.

Do not propose code changes yet.
First produce a detailed assessment report.
```

### Prioritization Review

After the initial assessment has been completed, use the following prompt to identify the most valuable improvements:

```text
Based on your assessment report, identify the three highest-value improvements.

For each improvement:

- Explain why it matters.
- Explain the risks.
- Estimate effort.
- Show affected files.

Do not make changes yet.
```

### Implementation Planning

After selecting an improvement, request a detailed implementation plan before making changes:

```text
Create an implementation plan for Improvement #1.

List:

- Files to modify
- Functions affected
- Tests required
- Potential side effects

Do not make changes yet.
```

### Recommended Workflow

```text
Open Workspace
      |
      v
Initial Assessment
      |
      v
Prioritize Improvements
      |
      v
Create Implementation Plan
      |
      v
Review Plan
      |
      v
Implement Changes
      |
      v
Test and Validate
```

### Why This Approach Works

Large projects often contain:

- Legacy code
- Hidden dependencies
- Build system assumptions
- Packaging requirements
- Language server interactions
- Extension activation logic
- Tooling-specific constraints

Allowing the AI to modify code before it understands the project can lead to unnecessary or incorrect changes.

Performing a structured assessment first produces:

- Better architectural understanding
- More accurate recommendations
- Fewer unintended modifications
- Higher quality implementation plans

This workflow is particularly effective for VS Code extensions, Language Server Protocol (LSP) projects, compiler/parser development, and multi-component development environments.
