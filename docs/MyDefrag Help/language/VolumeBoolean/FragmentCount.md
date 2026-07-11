# VolumeBoolean - FragmentCount

Select the volume if the total count of excessive fragments is between the
  minimum (first number) and maximum (second number). If a file has 2 fragments then
  it has 1 excessive fragment.
  If the second number is zero then the maximum is infinity.

NOTE: MyDefrag has to open the disk and analyze all the files to determine the number of excessive fragments. This will take some time.

### Syntax

```mydfrg
FragmentCount(
NUMBER
 ,
NUMBER
)
```

### Example

```mydfrg
VolumeSelect
  # Select all volumes that have between 10 and 100 excessive fragments.
  FragmentCount(10,100)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**FragmentSize**](FragmentSize.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
