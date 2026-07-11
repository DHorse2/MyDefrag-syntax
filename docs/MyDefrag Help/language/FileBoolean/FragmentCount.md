# FileBoolean - FragmentCount

Select all the items that have a number of fragments between the minimum
  (first number) and the maximum (second number).
  If the second number is zero then the maximum is infinity.

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
FileSelect
  # Select all the items that have at least 3 fragments and at most 10 fragments.
  FragmentCount(3,10)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
