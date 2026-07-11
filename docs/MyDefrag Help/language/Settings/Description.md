# Settings - Description

The description of the script. This string is displayed by MyDefrag in the script
  chooser, together with the script

[**Title**](Title.md)

. If a script does not
  have a description then it will not be listed in the script chooser.

- This setting can only be used outside a VolumeSelect structure.

### Syntax

```mydfrg
Description(
STRING
)
```

### Example

```mydfrg
Description("Perform a fast defragmentation and optimization of all the fixed, mounted,
writable disks on the computer. This script is designed for every day use.
It moves a minimum of data on the harddisk and finishes very quickly, but
will not fill all the gaps on the disk.
The script will first reclaim the NTFS reserved areas. It then defragments and fast-
fill the following zones: the MFT, all the directories, a free space, the
files used when booting, regular files, another free space, and the
spacehogs (not defragmented).
")
```

### See also:

[**Title**](Title.md)

[**Settings**](../Scripts/Settings.md)
