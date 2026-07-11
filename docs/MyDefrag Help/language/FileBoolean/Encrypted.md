# FileBoolean - Encrypted

Select all the items that have the "encrypted" attribute set (yes) or not set (no).
  For a file the attribute indicates if the file is encrypted by the build-in Windows encryption.
  For directories the attribute is the default for new files (directories by themselves
  cannot be encrypted).

### Syntax

```mydfrg
Encrypted(yes)
Encrypted(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have the "encrypted" attribute.
  Encrypted(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
