# FileActions - SortByLastAccess

Place the selected items and sort by their LastAccess time from oldest to newest
  ("ascending") or from newest to oldest ("descending").

- Sorting by LastAccess date/time may seem like a good idea at first, but is far     from perfect. The theory is that the LastAccess times will be the same on all the     files that are used by an application, so sorting by LastAccess will put all the files     of the application together on disk. But the LastAccess time is also updated in many     other cases, not only when you run an application.     In my view sorting by LastAccess can be useful in certain situations, but is     essentially random and should not be used for the bulk of the data on regular disks.
- Sorting in "Ascending" order will put the oldest (never accessed) files at the     beginning of the zone. So, the files that you use the most are placed at the     end of the zone, which is a slower part of the harddisk and (usually) further     away from the MFT and the directories.
- Sorting in "Descending" order will put the last accessed files at the     beginning of the zone. So, the files that are accessed first when you start     a program are placed behind files that are accessed later. Your harddisk will be     working backwards.
- Vista by default does not update the LastAccess time.     For more information see [**What is "NtfsDisableLastAccessUpdate"?**](../../faq/FAQ.md#faqusing-whatisntfsdisablelastaccessupdate)
- On FAT volumes the resolution of the LastAccess time is 1 day.     NTFS delays updates to the LastAccess time by up to one hour.
- Some improperly programmed utilities cause a change in the LastAccess time of     all items on the disk when they scan the disk. Examples are virus scanners,     backup programs, text indexers.
- This action will also defragment. It is therefore not necessary to combine it     with the [**Defragment**](Defragment.md) action.
- This action will create "wrap around" fragments. For more information see the     [**IgnoreWrapAroundFragmentation**](../Settings/IgnoreWrapAroundFragmentation.md) setting.

### Syntax

```mydfrg
SortByLastAccess(OPTIONS)
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
  # Sort the items by LastAccess time, most recently accesses items first.
  SortByLastAccess(Descending)
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
