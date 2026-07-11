# VolumeBoolean - Ramdisk

Select the volume if it is a RAM disk(yes) or not a RAM disk(no).
  RAM disks are virtual disks in memory, not on a physical disk.

### Syntax

```mydfrg
Ramdisk(yes)
Ramdisk(no)
```

### Example

```mydfrg
VolumeSelect
  Ramdisk(yes)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
