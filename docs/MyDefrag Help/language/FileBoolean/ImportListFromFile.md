# FileBoolean - ImportListFromFile

Select the items (files, directories) that are listed in the listfile.

- The STRING is the full path to an item on disk.
- The listfile is a flat text file, Unicode, UTF-8, or ASCII.
- The listfile must contain a list of full paths, 1 path per text line. For example:     C:\WINDOWS\SYSTEM32\NTOSKRNL.EXE    C:\WINDOWS\SYSTEM32\PSHED.DLL    C:\WINDOWS\SYSTEM32\KDCOM.DLL    C:\WINDOWS\SYSTEM32\CLFS.SYS
- Paths that do not exist (or invalid paths) are quietly ignored.
- Folders are entities by themselves. If the listfile contains the name of a folder     then only the folder will be selected, not the items in that folder or subfolders.
- If the listfile contains the name of an item that has already been processed (placed     in a previous zone) then the item will not be selected (ignored).
- This is a fileboolean function and it only selects items. The FileActions will process     the selected items, for example sort by name. The [**SortByImportSequence**](../FileActions/SortByImportSequence.md)     fileaction will order the items in the same sequence in which they are listed in     the listfile.

### Syntax

```mydfrg
ImportListFromFile(
STRING
)
```

### Example

```mydfrg
# Select and sort items exactly how I want it.
FileSelect
  ImportListFromFile("c:\users\jeroen\MyOptimizeList.txt")
FileActions
  SortByImportSequence(Ascending)
FileEnd
```

### See also:

[**SortByImportSequence**](../FileActions/SortByImportSequence.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
