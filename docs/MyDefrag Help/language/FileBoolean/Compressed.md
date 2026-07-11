# FileBoolean - Compressed

Select all the items that have the "compressed" attribute set (yes) or not set (no).
  For a file the attribute indicates if the file is compressed by the build-in Windows compression.
  For directories the attribute is the default for new files (directories by themselves
  cannot be compressed).

### Syntax

```mydfrg
Compressed(yes)
Compressed(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that are compressed with the built-in Windows compression.
  Compressed(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
