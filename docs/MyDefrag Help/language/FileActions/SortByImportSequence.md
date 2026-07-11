# FileActions - SortByImportSequence

Place the selected items and sort by the sequence in which they were imported
  ("ascending") or in reversed order ("descending").

- This function is designed to be used in combination with the      [**ImportListFromBootOptimize**](../FileBoolean/ImportListFromBootOptimize.md)      or the      [**ImportListFromFile**](../FileBoolean/ImportListFromFile.md)      file boolean.
- This action will also defragment. It is therefore not necessary to combine it     with the [**Defragment**](Defragment.md) action.
- This action will create "wrap around" fragments. For more information see the     [**IgnoreWrapAroundFragmentation**](../Settings/IgnoreWrapAroundFragmentation.md) setting.

### Syntax

```mydfrg
SortByImportSequence(OPTIONS)
```

| The OPTIONS are a space-separated list of these keywords:[**Ascending**](../Misc/SortByName-Ascending.md) [**Descending**](../Misc/SortByName-Descending.md) [**SkipBlock**](../Misc/SortByName-SkipBlock.md) | [**Ascending**](../Misc/SortByName-Ascending.md) | [**Descending**](../Misc/SortByName-Descending.md) | [**SkipBlock**](../Misc/SortByName-SkipBlock.md) |
| --- | --- | --- | --- |
| [**Ascending**](../Misc/SortByName-Ascending.md) |  |  |  |
| [**Descending**](../Misc/SortByName-Descending.md) |  |  |  |
| [**SkipBlock**](../Misc/SortByName-SkipBlock.md) |  |  |  |

### Example

```mydfrg
# Optimize the system disk for faster booting.
FileSelect
  ImportListFromBootOptimize()
FileActions
  SortByImportSequence(Ascending)
FileEnd
```

### See also:

[**ImportListFromBootOptimize**](../FileBoolean/ImportListFromBootOptimize.md)

[**ImportListFromFile**](../FileBoolean/ImportListFromFile.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
