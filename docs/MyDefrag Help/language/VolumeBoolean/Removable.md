# VolumeBoolean - Removable

Select the volume if it has Removable(yes) or not Removable(no) media,
for example, a floppy drive, thumb drive, or flash card reader.

Note: memory sticks are usually seen by Windows as removable disks, but it depends on the driver that comes with the memory stick.

### Syntax

```mydfrg
Removable(yes)
Removable(no)
```

### Example

```mydfrg
VolumeSelect
  Removable(yes)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**Fixed**](Fixed.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
