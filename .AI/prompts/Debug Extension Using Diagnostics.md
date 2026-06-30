# Current diagnostic procedure

1. Load `diagnostics-latest.json` from:
   `C:\Users\david\AppData\Roaming\VSCodium\User\globalStorage\macrodm.mydefrag-syntax\log\diagnostics-latest.json`

2. Load the dismissed diagnostics list:
   `D:\Script\MyDefrag-syntax\.user\logs\session_dismissed.json`

3. Ignore:

   * Severity `3` (Information) diagnostics.
   * Files listed in the dismissed diagnostics list.

4. Command meanings:

   * **get next file**: Skip the remainder of the current file and return the first non-Information diagnostic from the next file.
   * **get next**: Return the next non-Information diagnostic in sequence.
   * **valid syntax**: Treat the diagnostic as a likely parser bug, inspect why valid MyDefrag syntax fails, then repair when instructed.
   * **repair**: Implement the parser fix, run syntax checks, and usually smoke-test the specific construct.
   * **fixed**: Indicates the user has fixed the issue in the editor. Return the next non-Information diagnostic in sequence.
   * **reset**: Clear the dismissed diagnostics list and restart from the first diagnostic.
   * **skip**: Add the current file to the dismissed diagnostics list, then perform **get next file**.

5. For each diagnostic, report:

   * File path
   * Line/column
   * Severity
   * Diagnostic message
   * Keyword/token involved
   * Whether that keyword exists in the MyDefrag syntax/project keyword data

6. Current triage rules:

   * If the keyword does not exist, it is likely test data or genuine invalid syntax.
   * If the keyword exists and the user confirms it is valid, inspect parser classification and grammar.
   * Many false positives are fragment-mode classification issues rather than invalid MyDefrag scripts.

## Recent repairs

* `SetVariable(...)` fragment warning fixed by parsing `settingInline` as a statement.
* `SetFileColor(...)` fragment classification repaired for outside/inside `VolumeSelect` forms.
* `SetStatisticsWindowText(...)` repaired as parent `any`.
* `fragmentAllows()` repaired so parent `any` is allowed inside established fragments.

Before resuming diagnostics, restart or reload the extension so `diagnostics-latest.json` reflects the latest parser code.
