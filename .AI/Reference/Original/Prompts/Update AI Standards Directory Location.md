# Update AI Standards Directory Location

The project's shared AI standards directory has been relocated.

## Previous Location

``` text
D:\Script\MyDefrag-syntax\.AI
```

## New Location

``` text
D:\AI\.AI
```

## Objective

Locate every reference within the repository to the previous `.AI`
directory and update it to use the new shared location.

## Scope

Search for:

-   Hard-coded paths
-   Relative paths
-   Configuration files
-   Documentation
-   Prompt files
-   Build scripts
-   PowerShell scripts
-   Batch files
-   JavaScript
-   TypeScript
-   JSON
-   Markdown
-   Settings files
-   Test files

Update references only where they refer to the shared AI standards
directory.

Do not modify unrelated paths.

## Validation

After completing the updates:

-   Verify every remaining reference to `D:\Script\MyDefrag-syntax\.AI`.
-   Report any references intentionally left unchanged.
-   Verify all new paths resolve correctly.

## Required Output

Provide:

-   Summary of changes.
-   Table of modified files.
-   Original path.
-   Updated path.
-   Any assumptions made.
-   Any references requiring manual review.

## Revision Rules

-   Make the minimum necessary changes.
-   Preserve comments whenever practical.
-   Preserve formatting.
-   Do not perform unrelated refactoring.
-   Do not rename files unless required.
-   Do not change program behavior beyond updating the directory
    location.
