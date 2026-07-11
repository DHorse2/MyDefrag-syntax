## FileBoolean - LastAccessEnabled

Select the items if Windows is configured to record (update) the last access times. This fileboolean is designed to be used together with the [![ \* ](../img/Bullit.gif) **LastAccess**](FileBoolean-LastAccess.md) fileboolean.

Windows XP and Vista have a setting to enable/disable the recording (updating) of the last access times of files. On Vista the default setting is not to record the last access times. You can enable or disable the Windows setting from a commandline with the "fsutil" command:

|                                        |                                         |
|----------------------------------------|-----------------------------------------|
| See current setting:                   | fsutil behavior query disablelastaccess |
| Enable recording of last access time:  | fsutil behavior set disablelastaccess 0 |
| Disable recording of last access time: | fsutil behavior set disablelastaccess 1 |

### Syntax

[TABLE]

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **LastAccess**](FileBoolean-LastAccess.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileBoolean-LastAccessEnabled.html`_
