# FileBoolean - Temporary

Select all the items that have the "temporary" attribute set (yes) or not set (no).
  This attribute is used by Windows to indicate temporary items.
  The file system will attempt to keep all of the data in memory for quick access,
  rather than flushing it back to mass storage.

### Syntax

```mydfrg
Temporary(yes)
Temporary(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have the "Temporary" attribute.
  Temporary(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
