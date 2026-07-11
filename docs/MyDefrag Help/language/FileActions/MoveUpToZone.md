# FileActions - MoveUpToZone

Move the selected files to above the beginning of the zone. Files that are
  already above the beginning of the zone are not moved. If there is no gap above
  the beginning of the zone that is big enough for a particular file, then the file
  is not moved.

- Files are automatically defragmented when they are moved.
- This action is designed to be used in cases where the beginning of the zone     has been moved upwards by a [**MakeGap**](../VolumeActions/MakeGap.md) volumeaction     and the other fileactions would not move all the files. An example is the     [**FastFill**](FastFill.md) fileaction, which only moves files down,     never up, so files could stay before the beginning of the zone.     MoveUpToZone() is not needed in zones that use a SortBy fileaction, because     those actions will already move all files to the zone, even files that are before     the beginning of the zone.

### Syntax

```mydfrg
MoveUpToZone()
```

### Example

```mydfrg
# Place the next zone at 50% of the volume.
MakeGap(VolumeSize * 0.5, DoNotVacate)
# Select files for the zone.
FileSelect
  ....
FileActions
  # Make sure all files are above the beginning of the zone.
  MoveUpToZone()
  # FastFill gaps in the zone with files from above the zone.
  FastFill()
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
