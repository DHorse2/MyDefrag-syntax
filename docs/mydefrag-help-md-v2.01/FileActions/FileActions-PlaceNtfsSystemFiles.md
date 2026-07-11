## FileActions - PlaceNtfsSystemFiles

Place the selected items and sort alphabetically by their full pathname, ascending from A to Z or descending from Z to A. This function is intended to be used together with the [![ \* ](../img/Bullit.gif) **SelectNtfsSystemFiles**](../FileBoolean/FileBoolean-SelectNtfsSystemFiles.md) fileboolean. It is basically the same as the [![ \* ](../img/Bullit.gif) **SortByName**](FileActions-SortByName.md) fileaction, except that files can be placed inside the NTFS reserved area.

- MyDefrag does not (cannot) change the size or location of the NTFS reserved area. The NUMBER parameter is only used to create a gap after the MFT. When Windows is booted it will automatically re-allocate the NTFS area. First it tries to place the area just after the MFT, using whatever free gap is there up to a maximum of 12.5% of the size of the volume. If there is no gap after the MFT then Windows places the area elsewhere on disk. Windows will also reset the area when the disk is mounted, see the MyDefrag [![ \* ](../img/Bullit.gif) **DismountVolume**](../VolumeActions/VolumeActions-DismountVolume.md) action. So, to move the NTFS reserved area you have to immediately boot the computer after using MyDefrag, and even then it is not guaranteed that the NTFS reserved area will have the size and place that you want.
- If the MFT is not selected then the NUMBER is ignored.
- It is useless to combine this fileaction with other fileactions, such as "Defragment()" or "FastFill()", because it moves all the files in the zone. Another fileaction would either needlessly move files, or would destroy the sorted order of the files.

### Syntax

|                                                                              |
|------------------------------------------------------------------------------|
| `PlaceNtfsSystemFiles(OPTIONS , `[`NUMBER`](../Scripts/Scripts-NUMBER.md)`)` |

[TABLE]

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **SelectNtfsSystemFiles**](../FileBoolean/FileBoolean-SelectNtfsSystemFiles.md)  
[![ \* ](../img/Bullit.gif) **DismountVolume**](../VolumeActions/VolumeActions-DismountVolume.md)  
[![ \* ](../img/Bullit.gif) **ReclaimNtfsReservedAreas**](../VolumeActions/VolumeActions-ReclaimNtfsReservedAreas.md)

---

_Source HTML: `FileActions-PlaceNtfsSystemFiles.html`_
