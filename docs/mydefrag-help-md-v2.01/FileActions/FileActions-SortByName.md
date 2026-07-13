## FileActions - SortByName

Place the selected items and sort alphabetically by their full pathname, ascending from A to Z or descending from Z to A.

- Items are not just sorted by their filename (for example "explorer.exe"), but by their full pathname including all the folder names (for excample "c:\windows\explorer.exe"). The result is that all items that are in the same folder are placed in a block together on disk, and inside that block they're sorted by their filename.
- If a file has multiple names (hard links) then the file is sorted by the first name that happens to be mentioned in the FAT/MFT.
- This action will also defragment. It is therefore not necessary to combine it with the [![ \* ](../img/Bullit.gif) **Defragment**](FileActions-Defragment.md) action.
- This action will create "wrap around" fragments. For more information see the [![ \* ](../img/Bullit.gif) **IgnoreWrapAroundFragmentation**](../Settings/Settings-IgnoreWrapAroundFragmentation.md) setting.

### Syntax

|                       |
|-----------------------|
| `SortByName(OPTIONS)` |

[TABLE]

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileActions-SortByName.html`_
