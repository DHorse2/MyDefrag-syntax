# FileBoolean - NOT

Logically negate (invert) a file boolean. If the boolean is true then the
  result is false, and if the boolean is false then the result is true.

### Syntax

```mydfrg
not (
FILEBOOLEAN
 )
```

### Example

```mydfrg
FileSelect
  not ( Name("*.zip") or Name("*.arj") )
FileActions
  ...
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
