# FileBoolean - OR

Logical OR of two file booleans. The result is true if at least 1 of the booleans
  is true.

### Syntax

```mydfrg
FILEBOOLEAN
 or
FILEBOOLEAN
FILEBOOLEAN
 |
FILEBOOLEAN
FILEBOOLEAN
 ||
FILEBOOLEAN
```

### Example

```mydfrg
FileSelect
  Size(10000000,0) or LastAccess("","1 month ago")
FileActions
  ...
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
