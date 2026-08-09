# Settings

Run **MyDefrag: Open Settings** and search for `mydfrg`, or edit workspace
settings directly.

## Available Settings

<!-- markdownlint-disable MD013 -->

| Setting | Default | Purpose |
| --- | --- | --- |
| `mydfrg.userDir` | `.user` | Directory for extension-owned user data. Relative values resolve from the extension project root. |
| `mydfrg.logDir` | `.user/logs` | Directory for client, server, parser, preview, and diagnostic files. |
| `mydfrg.debugOn` | `true` | Enables extension debug logging. |
| `mydfrg.verboseLevel` | `5` | Controls log detail from `0` through `10`; debug logging also requires `debugOn`. |
| `mydfrg.referenceRelativePathLevel` | `Error` | Severity when a reference is found only by walking up parent folders. |
| `mydfrg.referenceContainsMacros` | `Information` | Severity for references containing execution-time macros. |
| `mydfrg.referenceFileFoundLevel` | `Information` | Severity for a resolved reference. |
| `mydfrg.referenceFileNotFoundLevel` | `Error` | Severity for a missing reference target. |
| `mydfrg.fragmentParentLevel` | `Information` | Severity for inferred fragment-parent messages. |
| `mydfrg.exclude` | Project glob list | Glob patterns excluded from MyDefrag validation and link analysis. |

<!-- markdownlint-enable MD013 -->

The package stores some severity defaults numerically. The editor accepts the
names or numbers below.

| Number | Name | Effect |
| --- | --- | --- |
| `0` | `None` | Suppress the configured diagnostic category. |
| `1` | `Error` | Report an error. |
| `2` | `Warning` | Report a warning. |
| `3` | `Information` | Report informational output. |
| `4` | `Hint` | Report a hint. |

## Workspace Example

```json
{
  "mydfrg.debugOn": false,
  "mydfrg.verboseLevel": 2,
  "mydfrg.referenceFileNotFoundLevel": "Error",
  "mydfrg.fragmentParentLevel": "Hint",
  "mydfrg.exclude": [
    "**/Archive/**",
    "**/.user/**",
    "**/node_modules/**"
  ]
}
```

Changes to `mydfrg`, `files.exclude`, or `search.exclude` cause the extension
and language server to reload their configuration and refresh diagnostics.

## Folder Selection

**MyDefrag: Configure Folders** lets you choose `userDir` or `logDir` with a
folder picker. The selected absolute path is written to workspace settings.
Use workspace-specific folders when several projects must keep logs separate.
