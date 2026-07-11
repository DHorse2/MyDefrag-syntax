# FileActions - PlaceNtfsSystemFiles

Place the selected items and sort alphabetically by their full pathname,
  ascending from A to Z or descending from Z to A.
  This function is intended to be used together with the

[**SelectNtfsSystemFiles**](../FileBoolean/SelectNtfsSystemFiles.md)

fileboolean.
  It is basically the same as the

[**SortByName**](SortByName.md)

fileaction, except that files can be placed inside the NTFS reserved area.

- MyDefrag does not (cannot) change the size or location of the NTFS reserved area.     The NUMBER parameter is only used to create a gap after the MFT.     When Windows is booted it will automatically re-allocate the NTFS area. First     it tries to place the area just after the MFT, using whatever free gap is there     up to a maximum of 12.5% of the size of the volume. If there is no gap after the     MFT then Windows places the area elsewhere on disk. Windows will also reset the     area when the disk is mounted, see the MyDefrag     [**DismountVolume**](../VolumeActions/DismountVolume.md) action.     So, to move the NTFS reserved area you have to immediately boot the computer     after using MyDefrag, and even then it is not guaranteed that the NTFS     reserved area will have the size and place that you want.
- If the MFT is not selected then the NUMBER is ignored.
- It is useless to combine this fileaction with other fileactions, such as "Defragment()"     or "FastFill()", because it moves all the files in the zone. Another     fileaction would either needlessly move files, or would destroy the sorted     order of the files.

### Syntax

```mydfrg
PlaceNtfsSystemFiles(OPTIONS ,
NUMBER
)
```

| The OPTIONS are a space-separated list of these keywords:[**Ascending**](../Misc/SortByName-Ascending.md) [**Descending**](../Misc/SortByName-Descending.md) [**SkipBlock**](../Misc/SortByName-SkipBlock.md) The NUMBER parameter is a hint, specifying a desired size for the NTFS reserved   area. | [**Ascending**](../Misc/SortByName-Ascending.md) | [**Descending**](../Misc/SortByName-Descending.md) | [**SkipBlock**](../Misc/SortByName-SkipBlock.md) |
| --- | --- | --- | --- |
| [**Ascending**](../Misc/SortByName-Ascending.md) |  |  |  |
| [**Descending**](../Misc/SortByName-Descending.md) |  |  |  |
| [**SkipBlock**](../Misc/SortByName-SkipBlock.md) |  |  |  |

### Example

```mydfrg
FileSelect
  # Select all the NTFS system files.
  SelectNtfsSystemFiles(yes)
FileActions
  # Place the NTFS system files, NTFS reserved area is 10% of the MFT.
  PlaceNtfsSystemFiles(Ascending,MftSize * 0.1)
FileEnd
```

### See also:

[**SelectNtfsSystemFiles**](../FileBoolean/SelectNtfsSystemFiles.md)

[**DismountVolume**](../VolumeActions/DismountVolume.md)

[**ReclaimNtfsReservedAreas**](../VolumeActions/ReclaimNtfsReservedAreas.md)
