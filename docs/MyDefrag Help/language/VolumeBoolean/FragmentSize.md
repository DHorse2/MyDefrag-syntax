# VolumeBoolean - FragmentSize

Select the volume if the average size per fragment is between the
  minimum (first number) and maximum (second number) of bytes. If a file has 2 fragments and
  is 100 bytes in size, then the average size per fragment is 50 bytes.
  If the second number is zero then the maximum is infinity.

NOTE: MyDefrag has to open the disk and analyze all the files so it can calculate the average size per fragment. This will take some time.

### Syntax

```mydfrg
FragmentSize(
NUMBER
 ,
NUMBER
)
```

### Example

```mydfrg
VolumeSelect
  # Select all volumes that have an average size per fragment 100000 and 1000000 bytes.
  FragmentSize(100000,1000000)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**FragmentCount**](FragmentCount.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
