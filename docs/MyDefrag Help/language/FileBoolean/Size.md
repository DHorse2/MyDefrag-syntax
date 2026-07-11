# FileBoolean - Size

Select all the items that have a size in bytes between the minimum
  (first number) and maximum (second number). If the second number is zero
  then the maximum is infinity.

- Sparse files can have a larger size than what they are actually using on the disk.

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
FileSelect
  # Select all files with a size up to 10 gigabyte.
  Size(0,10000000000)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
