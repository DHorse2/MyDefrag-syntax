# VolumeBoolean - CheckVolume

Call the Windows "chkdsk" utility for the volume and if it does not return an error code
  then select the volume.

NOTE: The "chkdsk" utility can only process mounted volumes.

### Syntax

```mydfrg
CheckVolume
```

### Example

```mydfrg
VolumeSelect
  Mounted(yes) and CheckVolume
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
