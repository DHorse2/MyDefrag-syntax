# FileActions - SortByCreationDate

Place the selected items and sort by the time they were created, from oldest to newest
  ("ascending") or from newest to oldest ("descending").

- The creation date can be newer than the last-changed date, for example when     a file was downloaded, or unpacked from an archive (such as zip or arj).
- This action will also defragment. It is therefore not necessary to combine it     with the [**Defragment**](Defragment.md) action.
- This action will create "wrap around" fragments. For more information see the     [**IgnoreWrapAroundFragmentation**](../Settings/IgnoreWrapAroundFragmentation.md) setting.

### Syntax

```mydfrg
SortByCreationDate(OPTIONS)
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
  # Sort the items by CreationDate time, most recently accesses items first.
  SortByCreationDate(Descending)
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
