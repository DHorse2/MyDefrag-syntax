## FileActions - Defragment

Defragment all the selected items. Items that are not fragmented are ignored, they are not moved.

- Fragmented files are moved to somewhere above the beginning of the zone, possibly outside the zone.
- Defragment() will not optimize the zone, it does not move all files to the zone. To do that you need to use another fileaction, for example FastFill(). But not a SortBy fileaction, because those will already defragment all items and Defragment() would then do double work.
- There are 2 defragmentation algorithms to choose from. The [![ \* ](../img/Bullit.gif) **Fast**](../Defragment/Defragment-Fast.md) algorithm will only defragment a file if it can find a gap big enough for the entire file. It will skip files that are too big for any gap. The default defragmentation algorithm will not give up so easily, if it encounters a big file and cannot find a big gap then it will try to make a big gap by shuffling other files around. This can take a lot of time.
- If the [![ \* ](../img/Bullit.gif) **IgnoreWrapAroundFragmentation**](../Settings/Settings-IgnoreWrapAroundFragmentation.md) setting is active (the default) then wrap-around fragmentation is not defragmented.

### Syntax

|                       |
|-----------------------|
| `Defragment(OPTIONS)` |

### Options:

|                                                                                   |
|-----------------------------------------------------------------------------------|
| [![ \* ](../img/Bullit.gif) **Fast**](../Defragment/Defragment-Fast.md)           |
| [![ \* ](../img/Bullit.gif) **ChunkSize**](../Defragment/Defragment-ChunkSize.md) |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **IgnoreWrapAroundFragmentation**](../Settings/Settings-IgnoreWrapAroundFragmentation.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileActions-Defragment.html`_
