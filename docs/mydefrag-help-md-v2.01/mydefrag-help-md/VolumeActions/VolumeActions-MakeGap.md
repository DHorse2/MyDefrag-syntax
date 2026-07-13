## VolumeActions - MakeGap

Set the position of the beginning of the next zone. This command is commonly used to create a gap between zones, but the command can also be used to position a zone anywhere on disk.

- The NUMBER specifies the beginning of the next zone, an absolute position on the disk. Usually it will be the ZoneBegin plus a number of bytes, but you can specify a different formula.
- The command will do nothing if the NUMBER is negative. It is an absolute position on disk, and a negative number would be before the beginning of the disk.
- The program will automatically vacate the gap between the current end of the zone and the NUMBER. It will not vacate if the DoNotVacate option is specified, or if the NUMBER is lower than current beginning of the zone (negative gap).
- If all the next zones are sorted zones (using one of the SortBy fileactions) then DoNotVacate can be used, it will save some unnecessary data movements.
- The [![ \* ](../img/Bullit.gif) **FastFill**](../FileActions/FileActions-FastFill.md) and [![ \* ](../img/Bullit.gif) **MoveDownFill**](../FileActions/FileActions-MoveDownFill.md) fileactions will only move files down, never up, so files that are in a DoNotVacate gap will be left in the gap.
- The pre-defined ZoneEnd and ZoneSize numbers cannot be used in calculations. MakeGap is outside a FileSelect, no files are selected, so ZoneSize is always zero and ZoneEnd is always equal to ZoneBegin.

### Syntax

|                                                                       |
|-----------------------------------------------------------------------|
| `MakeGap(`[`NUMBER`](../Scripts/Scripts-NUMBER.md)` [, DoNotVacate])` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **AddGap**](../FileActions/FileActions-AddGap.md)  
[![ \* ](../img/Bullit.gif) **VolumeActions**](../Scripts/Scripts-VolumeActions.md)

---

_Source HTML: `VolumeActions-MakeGap.html`_
