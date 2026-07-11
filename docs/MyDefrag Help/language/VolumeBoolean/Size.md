# VolumeBoolean - Size

Select the volume if it's size in bytes is between the minimum
  (first number) and maximum (second number). If the second number is zero then the maximum
  is infinity.

### Syntax

```mydfrg
Size(
NUMBER
 ,
NUMBER
)
```

### Example

```mydfrg
VolumeSelect
  # Select all volumes with a size up to 10 gigabyte.
  Size(0,10000000000)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
