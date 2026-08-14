# Testing

The repository uses `scripts/Test-MyDefragSyntax.ps1` as its Windows test
orchestrator. The npm commands are the stable public interface; Node remains the
test runner for JavaScript assertions.

## Common commands

<!-- markdownlint-disable MD013 MD060 -->

| Command | Scope |
|---|---|
| `npm test` | Fast developer gate |
| `npm run test:all` | Syntax, extension functions, language tooling, both apps, and coverage |
| `npm run test:extension` | All function-oriented extension and language-server module tests |
| `npm run test:server` | Language data, parser, and tokenizer |
| `npm run test:parser` | Parser only |
| `npm run test:tokenizer` | Tokenizer only |
| `npm run test:language-data` | Language keyword data only |
| `npm run test:completion` | Completion context, selection, templates, and provider |
| `npm run test:diagnostics` | Diagnostic state, navigation, tree, and keyword lookup |
| `npm run test:manifest` | Extension manifest, language, grammar, command, menu, and setting references |
| `npm run test:apps` | Language Maintenance and Locale Maintenance apps |
| `npm run test:language:all` | Language validation, runtime, and report checks |
| `npm run test:scripts` | JavaScript and PowerShell syntax checks |
| `npm run test:coverage` | Extension function tests with Node source coverage |
| `npm run test:list` | Available harness checks |

<!-- markdownlint-enable MD013 MD060 -->

## Results

Each run creates the following files under `artifacts/test-results`:

- A Markdown report for people.
- A versioned JSON report as the canonical machine-readable result.
- JUnit-compatible XML for CI tools, generated with built-in PowerShell/.NET
  XML support. It does not add a JUnit library or npm dependency.
- Per-execution JSONL event streams in a run-specific directory.

`MyDefragSyntax-TestReport-latest.md`, `.json`, and `.xml` point to the most
recent completed run.

Every named test records both forms of its source path:

- `testExecutable`: the absolute path used on the current computer.
- `testExecutableRepositoryPath`: the portable repository-relative path.

The stable test ID is formed from the repository-relative test path and the
test name. Reports also include the source line and column supplied by Node.

The Markdown table of contents and the detailed execution and inventory
sections are grouped by tested domain. The domain links provide direct access
to scripts and syntax, the language server, the extension, language tooling,
the Language Maintenance app, the Locale Maintenance app, and coverage.

## Coverage boundary

Node's built-in coverage totals include modules loaded by the function tests.
The report explicitly lists production modules that were not loaded and does
not silently count them as covered. At present, process-hosted entry points need
separate integration seams and Extension Host tests:

- `src/extension.js`
- `src/server/server.js`
- `src/preprocess/mydefrag-preprocess.js`

Real Extension Host and packaged VSCodium smoke lanes are the next testing
layer; the current suite does not claim that coverage.
