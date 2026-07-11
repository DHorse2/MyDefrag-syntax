# FileActions - AddGap

Set the position of the beginning of the next zone. This command is commonly
  used to create a gap at the end of the zone, making the zone bigger than necessary
  for the files in the zone, but the command can also be used to position a zone
  anywhere on disk.

- The command will be skipped (not executed) if the zone is empty (no files are     selected by the FileBoolean).
- The NUMBER specifies the beginning of the next zone, an absolute position on     the disk. Usually it will be the ZoneEnd plus a number of bytes, but you can     specify a different formula.
- The command will do nothing if the NUMBER is negative. It is an absolute     position on disk, and a negative number would be before the beginning of the     disk.
- The program will automatically vacate the gap between the current end of the     zone and the NUMBER. It will not vacate if the DoNotVacate option is specified,     or if the NUMBER is lower than current end of the zone (negative gap).
- If all the next zones are sorted zones (using one of the SortBy fileactions)     then DoNotVacate can be used, it will save some unnecessary data movements.
- The [**FastFill**](FastFill.md) and [**MoveDownFill**](MoveDownFill.md)     fileactions will only move files down, never up, so files that are in a     DoNotVacate gap will be left in the gap.

### Syntax

```mydfrg
AddGap(
NUMBER
 [, DoNotVacate])
```

### Example

```mydfrg
# Add a gap of 1% of the free size of the volume.
AddGap(ZoneEnd + VolumeFree * 0.01)
# Same, but do not vacate.
AddGap(ZoneEnd + VolumeFree * 0.01 , DoNotVacate)
# Add a gap 1% of the volume size:
AddGap(ZoneEnd + VolumeSize * 0.01)
# Add a gap of 1000 clusters.
AddGap(ZoneEnd + 1000 * BytesPerCluster)
# Add a gap 10% of the size of the MFT.
AddGap(ZoneEnd + MftSize * 0.1)
```

### See also:

[**MakeGap**](../VolumeActions/MakeGap.md)

[**FileActions**](../Scripts/FileActions.md)
