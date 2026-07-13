## Settings - ExcludeFiles

Exclude a selection of files.

- The files will not be touched in any way, are automatically excluded from selection with the [![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md) of [![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md) statements, and will be marked in red on the diskmap.
- This is a global setting that can only be used outside [![ \* ](../img/Bullit.gif) **VolumeSelect**](../Scripts/Scripts-VolumeSelect.md) statements.
- Using the setting will replace any previous setting. In other words, the setting is valid from the point in the script where it is defined until the next ExcludeFiles setting.

### Syntax

|                                                                      |
|----------------------------------------------------------------------|
| `ExcludeFiles(`[`FILEBOOLEAN`](../Scripts/Scripts-FileBoolean.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../VolumeActions/VolumeActions-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **VolumeSelect**](../Scripts/Scripts-VolumeSelect.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-ExcludeFiles.html`_
