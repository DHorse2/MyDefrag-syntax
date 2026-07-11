# VolumeBoolean - Mounted

Select the volume if it is mounted(yes) or not mounted(no).

- This function is primarily intended for volumes with a removable medium,     such as floppies.
- Windows will (try to) open the volume to test if it's mounted.
- A harddisk volume that has no mountpoint is treated by MyDefrag as "not mounted".
- To dismount a volume remove all mountpoints (drive letters and/or directories)     with the "mountvol /p" command on a command prompt, or with "Disk Management" in     the "Computer Management" administrator tool.
- Please note that the "fsutil volume dismount d:" commandline does not permanently     dismount a volume. The volume is automatically and transparently remounted by Windows,     and MyDefrag does not get a chance to see that the volume was dismounted.
- To get a list of all volumes and mountpoints enter the "mountvol" command    on a DOS commandline.

### Syntax

```mydfrg
Mounted(yes)
Mounted(no)
```

### Example

```mydfrg
VolumeSelect
  Mounted(yes)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
