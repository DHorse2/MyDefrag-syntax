## Settings - Debug

Set a debug level, controlling the amount of information that is written to the ".debuglog" file. The NUMBER is constructed by adding values from the following table.

- See the [![ \* ](../img/Bullit.gif) **WriteLogfile**](Settings-WriteLogfile.md) and [![ \* ](../img/Bullit.gif) **AppendLogfile**](Settings-AppendLogfile.md) script commands to create a logfile for users.
- The debug logfile is highly technical and not documented. You are welcome to look at it and it can be useful when debugging a script, but please do not jump to any conclusions from what you see. For example, the file will show many messages that may look like severe error messages to you, but are in fact simply informational messages.
- The debug logfile is created in the MyDefrag installation folder, default is "C:\Program Files\MyDefrag v4.3.1\MyDefrag.debuglog". It is not possible to change the name or location of the logfile.
- Make sure your userid has write permissions to the MyDefrag installation folder, or MyDefrag cannot create the logfile. Windows 7 is configured by default to deny regular users write-access to the "C:\Program Files" folder.
- The numbers used by the "-d" commandline option are different than the numbers used by the "Debug()" script setting.
- The "-d" commandline option will set a debug level before script interpretation. The "Debug()" script setting is executed much later.
- **Tip:** Put a Debug() line just before the FileSelect that you are interested in.

|     |                                                   |
|-----|---------------------------------------------------|
| 1   | Fatal error messages.                             |
| 2   | Warning messages.                                 |
| 4   | Basic information messages.                       |
| 8   | Scripting information messages.                   |
| 16  | Scripting high-detail information messages.       |
| 32  | Volume analysis information messages.             |
| 64  | Volume analysis high-detail information messages. |
| 128 | Moving items information messages.                |
| 256 | Moving items high-detail information messages.    |

### Syntax

|                                                     |
|-----------------------------------------------------|
| `Debug(`[`NUMBER`](../Scripts/Scripts-NUMBER.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **WriteLogfile**](Settings-WriteLogfile.md)  
[![ \* ](../img/Bullit.gif) **AppendLogfile**](Settings-AppendLogfile.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-Debug.html`_
