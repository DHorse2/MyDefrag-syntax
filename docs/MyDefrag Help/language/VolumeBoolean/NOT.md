# VolumeBoolean - NOT

Logically negate (invert) a volume boolean. If the boolean is true then the
  result is false, and if the boolean is false then the result is true.

### Syntax

```mydfrg
not (
VOLUMEBOOLEAN
 )
```

### Example

```mydfrg
VolumeSelect
  not ( Name("c:") or Name("d:") )
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
