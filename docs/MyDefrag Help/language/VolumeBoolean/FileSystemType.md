# VolumeBoolean - FileSystemType

Select volumes that have a filesystem type that matches the ARGUMENT.

### Syntax

```mydfrg
FileSystemType(ARGUMENT)
```

### Argument

| Possible values for ARGUMENT:  **NTSF** NTFS disks.  **FAT** FAT disks (FAT12, FAT16, or FAT32).  **FAT12** FAT12 disks.  **FAT16** FAT16 disks.  **FAT32** FAT32 disks. | **NTSF** | NTFS disks. | **FAT** | FAT disks (FAT12, FAT16, or FAT32). | **FAT12** | FAT12 disks. | **FAT16** | FAT16 disks. | **FAT32** | FAT32 disks. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **NTSF** | NTFS disks. |  |  |  |  |  |  |  |  |  |
| **FAT** | FAT disks (FAT12, FAT16, or FAT32). |  |  |  |  |  |  |  |  |  |
| **FAT12** | FAT12 disks. |  |  |  |  |  |  |  |  |  |
| **FAT16** | FAT16 disks. |  |  |  |  |  |  |  |  |  |
| **FAT32** | FAT32 disks. |  |  |  |  |  |  |  |  |  |

### Example

```mydfrg
VolumeSelect
  # Select only NTFS volumes.
  FileSystemType(NTFS)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
