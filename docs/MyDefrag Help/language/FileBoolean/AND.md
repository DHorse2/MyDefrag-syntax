# FileBoolean - AND

Logical AND of two file booleans. The result is true if all the booleans
  are true.

### Syntax

```mydfrg
FILEBOOLEAN
 and
FILEBOOLEAN
FILEBOOLEAN
 &
FILEBOOLEAN
FILEBOOLEAN
 &&
FILEBOOLEAN
```

### Example

```mydfrg
FileSelect
  Size(10000000,0) and LastAccess("","1 month ago")
FileActions
  ...
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
