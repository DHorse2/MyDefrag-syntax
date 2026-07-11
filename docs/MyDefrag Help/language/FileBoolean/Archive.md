# FileBoolean - Archive

Select all the items that have the "archive" attribute set (yes) or not set (no).
  Applications use this attribute to mark files for backup or removal.

### Syntax

```mydfrg
Archive(yes)
Archive(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have the "archive" attribute.
  Archive(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
