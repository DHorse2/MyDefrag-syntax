# Settings - RunScript

Run another script from inside this script. The script must be a full
  script, that is, it cannot be a partial script and for example only contain a
  fileboolean. See the

[**Macros**](../Scripts/Macros.md)

to include partial
  scripts.

- The STRING is the filename of the script.
- The interpreter will look for the STRING in the following directories. If not     found then it will try again with ".MyD" appended, and then with "Scripts\" prepended.
  - As a full path.
  - In the current folder.
  - In the same directory as the main script.
  - In the same directory as the executable (MyDefrag.exe, MyDefragScreenSaver.exe).
  - In the installation directory (default is "c:\Program Files\MyDefrag v4.3.1\").
  - In the "!ProgramFiles!\MyDefrag v4.3.1" directory.
  - In the "!ProgramW6432!\MyDefrag v4.3.1" directory.
  - In the "!ProgramFiles(x86)!\MyDefrag v4.3.1" directory.
  - In the PATH environment (this usually includes the current directory).
  - In the "!SystemRoot!" directory.
- The extension ".MyD" is optional and not required unless the script has a     different extension such as "*.txt".
- The script runs in the same window and the same process as the current script.

### Syntax

```mydfrg
RunScript(
STRING
)
```

### Example

```mydfrg
# Run a script called "myscript".
RunScript("C:\Program Files\MyDefrag v4.3.1\Scripts\MyScript.MyD")
# This works if the script is in one of the standard directories and is called ".MyD":
RunScript("MyScript")
```

### See also:

[**Macros**](../Scripts/Macros.md)

[**RunProgram**](RunProgram.md)

[**Settings**](../Scripts/Settings.md)
