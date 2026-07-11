# FileActions - SortByNewestDate

Place the selected items and sort by creation, last access, or last change
  date/time, whichever is newest, from oldest to newest ("ascending") or from newest
  to oldest ("descending").

- Sorting by newest date/time may seem like a good idea at first, but is far     from perfect. The theory is that the newest date/times will be the same on all the     files that are used by an application, so sorting by the newest time will put     all the files of the application together on disk. But the date/times are also     updated in many other cases, not only when you run an application.     In my view sorting by newest date/time can be useful in certain situations, but is     essentially random and should not be used for the bulk of the data on regular disks.
- Sorting in "Ascending" order will put the oldest files at the beginning of     the zone. So, the files that you use the most are placed at the end of the zone,     which is a slower part of the harddisk and (usually) further away from the MFT     and the directories.
- Sorting in "Descending" order will put the newest files at the beginning of     the zone. So, the files that are accessed first when you start a program are     placed behind files that are accessed later. Your harddisk will be working     backwards.
- The creation date can be newer than the last-changed date, for example when     a file was downloaded, or unpacked from an archive (such as zip or arj).
- This action will also defragment. It is therefore not necessary to combine it     with the [**Defragment**](Defragment.md) action.
- This action will create "wrap around" fragments. For more information see the     [**IgnoreWrapAroundFragmentation**](../Settings/IgnoreWrapAroundFragmentation.md) setting.

### Syntax

```mydfrg
SortByNewestDate(OPTIONS)
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
  # Sort the items by newest time.
  SortByNewestDate(Descending)
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
