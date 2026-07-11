# FileBoolean - AverageFragmentSize

Select all the items that have an average number of bytes per fragment
  between the minimum (first number) and the maximum (second number).
  If the second number is zero then the maximum is infinity.
  For example, if an item is 300 bytes in size and has 3 fragments then it has an
  average fragment size of 100 bytes.

### Syntax

```mydfrg
AverageFragmentSize(
NUMBER
 ,
NUMBER
)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have an average fragment size between 100 and 1000 bytes.
  AverageFragmentSize(100,1000)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
