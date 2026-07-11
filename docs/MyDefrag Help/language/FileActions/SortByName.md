# FileActions - SortByName

Place the selected items and sort alphabetically by their full pathname,
  ascending from A to Z or descending from Z to A.

- Items are not just sorted by their filename (for example "explorer.exe"), but     by their full pathname including all the folder names     (for excample "c:\windows\explorer.exe"). The result     is that all items that are in the same folder are placed in a block together     on disk, and inside that block they're sorted by their filename.
- If a file has multiple names (hard links) then the file is sorted     by the first name that happens to be mentioned in the FAT/MFT.
- This action will also defragment. It is therefore not necessary to combine it     with the [**Defragment**](Defragment.md) action.
- This action will create "wrap around" fragments. For more information see the     [**IgnoreWrapAroundFragmentation**](../Settings/IgnoreWrapAroundFragmentation.md) setting.

### Syntax

```mydfrg
SortByName(OPTIONS)
```

| The OPTIONS are a space-separated list of these keywords:[**Ascending**](../Misc/SortByName-Ascending.md) [**Descending**](../Misc/SortByName-Descending.md) [**SkipBlock**](../Misc/SortByName-SkipBlock.md) | [**Ascending**](../Misc/SortByName-Ascending.md) | [**Descending**](../Misc/SortByName-Descending.md) | [**SkipBlock**](../Misc/SortByName-SkipBlock.md) |
| --- | --- | --- | --- |
| [**Ascending**](../Misc/SortByName-Ascending.md) |  |  |  |
| [**Descending**](../Misc/SortByName-Descending.md) |  |  |  |
| [**SkipBlock**](../Misc/SortByName-SkipBlock.md) |  |  |  |

### Example

```mydfrg
FileSelect
  ....
FileActions
  # Sort the items by their full path.
  SortByName(Ascending)
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
