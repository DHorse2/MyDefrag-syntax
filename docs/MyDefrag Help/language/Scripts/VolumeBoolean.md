# Scripts - VolumeBoolean

Select volumes for processing. There are several functions to choose from,
  and they can be combined in expressions with AND, OR, NOT, and parenthesis.

- Volumes that are selected with the VolumeBoolean of the global     [**ExcludeVolumes**](../Settings/ExcludeVolumes.md) setting are automatically excluded in     the VolumeBoolean of [**VolumeSelect**](VolumeSelect.md) statements.

### Example

```mydfrg
# Select all volumes that are fixed, writable, and mounted.
VolumeSelect
  Removable(no)
  and Writable(yes)
  and Mounted(yes)
VolumeActions
  ....
VolumeEnd
```

### Actions

| [**(...)**](../VolumeBoolean/....md) |
| --- |
| [**All**](../VolumeBoolean/All.md) |
| [**AND**](../VolumeBoolean/AND.md) |
| [**Cdrom**](../VolumeBoolean/Cdrom.md) |
| [**CheckVolume**](../VolumeBoolean/CheckVolume.md) |
| [**CommandlineVolumes**](../VolumeBoolean/CommandlineVolumes.md) |
| [**FileSystemType**](../VolumeBoolean/FileSystemType.md) |
| [**Fixed**](../VolumeBoolean/Fixed.md) |
| [**FragmentCount**](../VolumeBoolean/FragmentCount.md) |
| [**FragmentSize**](../VolumeBoolean/FragmentSize.md) |
| [**Label**](../VolumeBoolean/Label.md) |
| [**Mounted**](../VolumeBoolean/Mounted.md) |
| [**Name**](../VolumeBoolean/Name.md) |
| [**NOT**](../VolumeBoolean/NOT.md) |
| [**NumberBetween**](../VolumeBoolean/NumberBetween.md) |
| [**OR**](../VolumeBoolean/OR.md) |
| [**Ramdisk**](../VolumeBoolean/Ramdisk.md) |
| [**Remote**](../VolumeBoolean/Remote.md) |
| [**Removable**](../VolumeBoolean/Removable.md) |
| [**Size**](../VolumeBoolean/Size.md) |
| [**Writable**](../VolumeBoolean/Writable.md) |

### See also:

[**VolumeSelect**](VolumeSelect.md)

[**VolumeActions**](VolumeActions.md)

[**ExcludeVolumes**](../Settings/ExcludeVolumes.md)

[**Scripts**](../../manual/Scripts.md)
