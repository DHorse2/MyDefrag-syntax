# VolumeBoolean - OR

Logical OR of two volume booleans. The result is true if at least 1 of the booleans
  is true.

### Syntax

```mydfrg
VOLUMEBOOLEAN
 or
VOLUMEBOOLEAN
VOLUMEBOOLEAN
 |
VOLUMEBOOLEAN
VOLUMEBOOLEAN
 ||
VOLUMEBOOLEAN
```

### Example

```mydfrg
VolumeSelect
  Mounted(yes) or Writable(yes)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
