# FileBoolean - Smallest

Select the smallest items (size in bytes). The argument is the number of items
  to be selected.

### Syntax

```mydfrg
Smallest(
NUMBER
)
```

### Example

```mydfrg
FileSelect
  # Select the 10 smallest files on the disk.
  Smallest(10)
FileActions
  ....
FileEnd
```

### See also:

[**Largest**](Largest.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
