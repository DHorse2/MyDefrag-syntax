# VolumeActions - DismountVolume

Dismount (and remount) the volume. This will prompt Windows to do all the normal
  housekeeping tasks that are done when mounting a volume, usually only done when booting
  the computer, such as a quick scan for errors, and on NTFS volumes to re-allocate the
  NTFS reserved zones.

- **Warning:** This command can cause other programs to crash if they have open     files on the volume.
- It is only useful to use this command after MyDefrag has finished processing the     volume, so it should be placed at the end of a script just before "VolumeEnd".
- The actual action performed is only to dismount the volume. Windows will automatically     remount the volume as soon as an attempt is made to access it.
- Volumes can only be dismounted if not locked. Volumes are usually only locked by     special utilities that need access to the entire disk, for example to format the volume.
- MyDefrag will continue regardless, even if the volume could not be dismounted.

### Syntax

```mydfrg
DismountVolume()
```

### Example

```mydfrg
VolumeSelect
  ...
VolumeActions
  ...
  # Dismount and remount the volume.
  DismountVolume()
VolumeEnd
```

### See also:

[**PlaceNtfsSystemFiles**](../FileActions/PlaceNtfsSystemFiles.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
