## Settings - MaxRunTime

Run until a maximum DATETIME. When the time expires MyDefrag will stop processing and jump to the next MaxRunTime, or to the end of the block in which the MaxRunTime occurs, whichever comes first.

- If MaxRunTime() is placed inside a FileActions-FileEnd then it will jump to the next MaxRunTime() or to the FileEnd, whichever comes first. For example:
  [TABLE]
- If MaxRunTime() is placed inside a VolumeActions-VolumeEnd then it will jump to the next MaxRunTime() at the same level (ignoring MaxRunTime() inside FileActions-FileEnd), or to the VolumeEnd, whichever comes first. For example:
  [TABLE]
- If MaxRunTime() is placed outside a VolumeActions-VolumeEnd then it will jump to the next outside MaxRunTime(), and if there is none then to the end of the script. For example:
  [TABLE]

### Syntax

|                                                              |
|--------------------------------------------------------------|
| `MaxRunTime(`[`DATETIME`](../Scripts/Scripts-DATETIME.md)`)` |

### Parameters

|                                                                                                                                                                                                               |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| The date/time until when MyDefrag is allowed to run. When the time expires MyDefrag will stop execution and jump to the end of the block. If the parameter is empty then MyDefrag will run until completion.. |

### Example

|                      |
|----------------------|
| `MaxRunTime(1 hour)` |

### See also:

[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-MaxRunTime.html`_
