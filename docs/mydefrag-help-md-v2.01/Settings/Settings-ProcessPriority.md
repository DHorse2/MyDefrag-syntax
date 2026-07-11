## Settings - ProcessPriority

This setting controls the CPU and the resource (I/O) priority of MyDefrag.

- You can see the CPU priority of a program in the Task Manager. Click right on a program, then Set Priority.

### Syntax

|                             |
|-----------------------------|
| `ProcessPriority(ARGUMENT)` |

where ARGUMENT is one of the following:

|             |                                                                                                                                                                                                                                                                             |
|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| High        | High CPU priority. It is not advised to use this for MyDefrag, because it will use nearly all available CPU time.                                                                                                                                                           |
| AboveNormal | CPU priority above the Normal and below the High priorities                                                                                                                                                                                                                 |
| Normal      | The standard CPU priority of all Windows programs. This is the default for MyDefrag.                                                                                                                                                                                        |
| BelowNormal | CPU priority below the Normal and above the Low priorities.                                                                                                                                                                                                                 |
| Low         | Low CPU priority. With this setting MyDefrag will only run when the system is idle. This is the default for the MyDefrag screensaver (Windows automatically runs all screensavers in this priority class).                                                                  |
| Background  | Background processing priority. This setting will lower the resource (I/O) scheduling priority and the CPU priority to "Low". The result of this setting is that other programs will get faster access to the disks. This setting is not supported on Windows 2000/2003/XP. |

### Example

|                           |
|---------------------------|
| `ProcessPriority(Normal)` |

### See also:

[![ \* ](../img/Bullit.gif) **Slowdown**](Settings-Slowdown.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-ProcessPriority.html`_
