# FileBoolean - SmallestFragmentSize

Select all the items that have a smallest fragment with a size (in bytes)
  between the minimum (first number) and the maximum (second number).
  If the second number is zero then the maximum is infinity.

### Syntax

```mydfrg
SmallestFragmentSize(
NUMBER
 ,
NUMBER
)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have a smallest fragment between 100 and 1000 bytes in size.
  SmallestFragmentSize(100,1000)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
