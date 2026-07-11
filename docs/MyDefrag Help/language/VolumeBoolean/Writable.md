# VolumeBoolean - Writable

Select the volume if it is Writable(yes) or not Writable(no).

Note: Windows 2000 does not have the capability to make volumes read-only, all volumes are always writable.

### Syntax

```mydfrg
Writable(yes)
Writable(no)
```

### Example

```mydfrg
VolumeSelect
  Writable(yes)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
