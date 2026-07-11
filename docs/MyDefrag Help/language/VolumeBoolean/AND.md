# VolumeBoolean - AND

Logical AND of two volume booleans. The result is true if all the booleans
  are true.

### Syntax

```mydfrg
VOLUMEBOOLEAN
 and
VOLUMEBOOLEAN
VOLUMEBOOLEAN
 &
VOLUMEBOOLEAN
VOLUMEBOOLEAN
 &&
VOLUMEBOOLEAN
```

### Example

```mydfrg
VolumeSelect
  Mounted(yes) and Writable(yes)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
