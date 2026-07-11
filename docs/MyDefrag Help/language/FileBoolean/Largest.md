# FileBoolean - Largest

Select the largests items (size in bytes). The argument is the number of items
  to be selected.

### Syntax

```mydfrg
Largest(
NUMBER
)
```

### Example

```mydfrg
FileSelect
  # Select the 10 largest files on the disk.
  Largest(10)
FileActions
  ....
FileEnd
```

### See also:

[**Smallest**](Smallest.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
