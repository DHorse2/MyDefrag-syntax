# VolumeBoolean - NumberBetween

Select the volume if NUMBER1 is between NUMBER2 and NUMBER3
  (greater-equal than NUMBER2 and smaller than NUMBER3).
  If NUMBER2 is zero then select the volume if NUMBER1 is less than NUMBER3.
  If NUMBER3 is zero then select the volume if NUMBER1 is greater-equal than NUMBER2.

- See the [**Variables**](../Scripts/Variables.md) for lot's of numbers that     can be used.

### Syntax

```mydfrg
NumberBetween(
NUMBER1
 ,
NUMBER2
 ,
NUMBER3
)
```

### Example

```mydfrg
VolumeSelect
  # Select the volume if there are between 100 and 1000 gaps.
  NumberBetween(GAP01N,100,1000)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
