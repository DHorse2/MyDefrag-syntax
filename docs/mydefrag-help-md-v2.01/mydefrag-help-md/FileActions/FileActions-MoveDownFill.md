## FileActions - MoveDownFill

Fill all the gaps by moving (shifting) items to the beginning of the zone. This will perfectly fill all the gaps and will preserve the sorting order of the files.

- A tiny little gap somewhere at the beginning of the zone will cause all items above the gap to be moved (shifted). In this case MoveDownFill() is only a little faster than a full SortBy\*\*\*(). However, if the gap happens to be further into the zone then MoveDownFill() will save time.

### Syntax

|                  |
|------------------|
| `MoveDownFill()` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **FastFill**](FileActions-FastFill.md)  
[![ \* ](../img/Bullit.gif) **ForcedFill**](FileActions-ForcedFill.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileActions-MoveDownFill.html`_
