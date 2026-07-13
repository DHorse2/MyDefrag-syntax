## FileActions - MoveUpToZone

Move the selected files to above the beginning of the zone. Files that are already above the beginning of the zone are not moved. If there is no gap above the beginning of the zone that is big enough for a particular file, then the file is not moved.

- Files are automatically defragmented when they are moved.
- This action is designed to be used in cases where the beginning of the zone has been moved upwards by a [![ \* ](../img/Bullit.gif) **MakeGap**](../VolumeActions/VolumeActions-MakeGap.md) volumeaction and the other fileactions would not move all the files. An example is the [![ \* ](../img/Bullit.gif) **FastFill**](FileActions-FastFill.md) fileaction, which only moves files down, never up, so files could stay before the beginning of the zone. MoveUpToZone() is not needed in zones that use a SortBy fileaction, because those actions will already move all files to the zone, even files that are before the beginning of the zone.

### Syntax

|                  |
|------------------|
| `MoveUpToZone()` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileActions-MoveUpToZone.html`_
