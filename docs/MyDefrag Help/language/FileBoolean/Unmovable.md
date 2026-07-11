# FileBoolean - Unmovable

Select all the items that MyDefrag could not move.
  MyDefrag initially assumes that all items on disk are movable. Only after
  the Windows defragmentation API has refused to move an item will an item
  be "unmovable".

### Syntax

```mydfrg
Unmovable(yes)
Unmovable(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have the "Unmovable" attribute.
  Unmovable(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
