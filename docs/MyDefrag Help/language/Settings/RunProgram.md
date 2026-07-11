# Settings - RunProgram

Run an external program.

### Syntax

```mydfrg
RunProgram(
STRING
 [, STRINGS])
```

### Parameters

| MyDefrag will give the strings to Windows as a single commandline     to be executed. The first string is usually the path of an executable program,     the other strings are it's parameters. |
| --- |

### Example

```mydfrg
/* Run backup program. */
RunProgram("backup","c:\","d:\")
/* Show the MyDefrag logfile. */
RunProgram("Notepad.exe","c:\Program Files\MyDefrag v4.3.1\MyDefrag.log")
/* Disable the Windows hibernation facility. */
RunProgram("powercfg","/hibernate","off")
/* Hibernate the computer. */
RunProgram("%windir%\system32\rundll32.exe",
  "powrprof.dll,SetSuspendState","Hibernate")
```

### See also:

[**Settings**](../Scripts/Settings.md)
