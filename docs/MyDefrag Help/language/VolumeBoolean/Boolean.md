# VolumeBoolean - (...)

Combine volume booleans into a single boolean.

### Syntax

```mydfrg
(
VOLUMEBOOLEAN
 )
```

### Example

```mydfrg
VolumeSelect
  Mounted(yes) and ( Name("c:") or Name("d:") )
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
