## FileBoolean - LastAccess

Select all the items that have a last access time between the minimum time (first parameter) and the maximum time (second parameter). If the first parameter is empty then the minimum time is the beginning of time. If the second parameter is empty then the maximum time is infinity.

- See the [![ \* ](../img/Bullit.gif) **LastAccessEnabled**](FileBoolean-LastAccessEnabled.md) fileboolean to test if Windows is configured to record (update) the last access times.
- Some improperly programmed utilities cause a change in the last access time of all items on the disk when they scan the disk. Examples are virus scanners, backup programs, text indexers.
- On FAT volumes the resolution of the last access time is 1 day. NTFS delays updates to the last access time by up to one hour.

### Syntax

|                                                                                                               |
|---------------------------------------------------------------------------------------------------------------|
| `LastAccess(`[`DATETIME`](../Scripts/Scripts-DATETIME.md)` , `[`DATETIME`](../Scripts/Scripts-DATETIME.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **LastAccessEnabled**](FileBoolean-LastAccessEnabled.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileBoolean-LastAccess.html`_
