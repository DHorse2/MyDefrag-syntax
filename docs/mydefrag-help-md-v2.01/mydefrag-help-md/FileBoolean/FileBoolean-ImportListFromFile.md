## FileBoolean - ImportListFromFile

Select the items (files, directories) that are listed in the listfile.

- The STRING is the full path to an item on disk.
- The listfile is a flat text file, Unicode, UTF-8, or ASCII.
- The listfile must contain a list of full paths, 1 path per text line. For example:
  [TABLE]
- Paths that do not exist (or invalid paths) are quietly ignored.
- Folders are entities by themselves. If the listfile contains the name of a folder then only the folder will be selected, not the items in that folder or subfolders.
- If the listfile contains the name of an item that has already been processed (placed in a previous zone) then the item will not be selected (ignored).
- This is a fileboolean function and it only selects items. The FileActions will process the selected items, for example sort by name. The [![ \* ](../img/Bullit.gif) **SortByImportSequence**](../FileActions/FileActions-SortByImportSequence.md) fileaction will order the items in the same sequence in which they are listed in the listfile.

### Syntax

|                                                                  |
|------------------------------------------------------------------|
| `ImportListFromFile(`[`STRING`](../Scripts/Scripts-STRING.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **SortByImportSequence**](../FileActions/FileActions-SortByImportSequence.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileBoolean-ImportListFromFile.html`_
