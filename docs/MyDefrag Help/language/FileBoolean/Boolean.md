# FileBoolean - (...)

Combine file booleans into a single boolean.

### Syntax

```mydfrg
(
FILEBOOLEAN
 )
```

### Example

```mydfrg
FileSelect
  Size(10000000,0) and ( Name("*.zip") or Name("*.arj") )
FileActions
  ...
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
