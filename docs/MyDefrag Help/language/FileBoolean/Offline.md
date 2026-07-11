# FileBoolean - Offline

Select all the items that have the "offline" attribute set (yes) or not set (no).
  This attribute is used by the Windows Remote Storage service and indicates that the
  file data is physically moved to offline storage.

### Syntax

```mydfrg
Offline(yes)
Offline(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that do not have the "Offline" attribute.
  Offline(no)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
