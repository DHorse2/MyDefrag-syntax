# VolumeActions - ReclaimNtfsReservedAreas

Move files from the NTFS reserved area to normal disk space.

Windows reserves a percentage of the volume for the MFT (Master File Table) and some other special NTFS files, so that they can grow without getting fragmented. The default is 12.5% of the size of the volume. Windows can place normal files in this area if the rest of the volume is full. The files will remain there, even when there is enough space again. The ReclaimNtfsReservedAreas() function looks for files in this area and moves them to normal disk space, making the reserved area available again for the MFT and the other special NTFS files.

- This function does not create a zone. The files are not marked as processed     and next actions can again select the files.
- The function accepts settings as parameters, for example to change the color     palette.
- The NTFS system files are skipped and will stay in the NTFS reserved area.     See the [**SelectNtfsSystemFiles**](../FileBoolean/SelectNtfsSystemFiles.md) filebooelan for the     list.

### Syntax

```mydfrg
ReclaimNtfsReservedAreas(
SETTINGS
)
```

### Example

```mydfrg
# Reclaim the NTFS reserved areas on all volumes.
VolumeSelect
  All
VolumeActions
  ReclaimNtfsReservedAreas()
VolumeEnd
```

### See also:

[**SelectNtfsSystemFiles**](../FileBoolean/SelectNtfsSystemFiles.md)

[**PlaceNtfsSystemFiles**](../FileActions/PlaceNtfsSystemFiles.md)

[**DismountVolume**](DismountVolume.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
