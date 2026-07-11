# Settings - Debug

Set a debug level, controlling the amount of information that is written to the
  ".debuglog" file. The NUMBER is constructed by adding values from the following table.

- See the [**WriteLogfile**](WriteLogfile.md) and [**AppendLogfile**](AppendLogfile.md)     script commands to create a logfile for users.
- The debug logfile is highly technical and not documented. You are welcome to look     at it and it can be useful when debugging a script, but please do not jump to any     conclusions from what you see. For example, the file will show many messages that     may look like severe error messages to you, but are in fact simply informational     messages.
- The debug logfile is created in the MyDefrag installation folder, default is     "C:\Program Files\MyDefrag v4.3.1\MyDefrag.debuglog".     It is not possible to change the name or location of the logfile.
- Make sure your userid has write permissions to the MyDefrag installation     folder, or MyDefrag cannot create the logfile. Windows 7 is configured by default to     deny regular users write-access to the "C:\Program Files" folder.
- The numbers used by the "-d" commandline option are different than the numbers     used by the "Debug()" script setting.
- The "-d" commandline option will set a debug level before script interpretation.     The "Debug()" script setting is executed much later.
- **Tip:** Put a Debug() line just before the FileSelect that you are interested     in.

| 1 | Fatal error messages. |
| --- | --- |
| 2 | Warning messages. |
| 4 | Basic information messages. |
| 8 | Scripting information messages. |
| 16 | Scripting high-detail information messages. |
| 32 | Volume analysis information messages. |
| 64 | Volume analysis high-detail information messages. |
| 128 | Moving items information messages. |
| 256 | Moving items high-detail information messages. |

### Syntax

```mydfrg
Debug(
NUMBER
)
```

### Example

```mydfrg
Debug(1)              /* Fatal errors. Equivalent to "-d 0" */
Debug(7)              /* Same as 1 plus warning messages and basic information messages. Equivalent to "-d 1" */
Debug(47)             /* Same as 7 plus scripting and volume analysis information messages. Equivalent to "-d 2" */
Debug(447)            /* Same as 431 plus scripting high-detail information messages. Equivalent to "-d 3" */
Debug(175)            /* Same as 47 plus moving items information messages. Equivalent to "-d 4" */
Debug(431)            /* Same as 175 plus moving items high-detail information messages. Equivalent to "-d 5" */
Debug(495)            /* Same as 431 plus volume analysis high-detail information messages. Equivalent to "-d 6" */
```

### See also:

[**WriteLogfile**](WriteLogfile.md)

[**AppendLogfile**](AppendLogfile.md)

[**Settings**](../Scripts/Settings.md)
