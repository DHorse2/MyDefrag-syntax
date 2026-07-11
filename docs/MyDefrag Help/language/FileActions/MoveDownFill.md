# FileActions - MoveDownFill

Fill all the gaps by moving (shifting) items to the beginning of the zone.
  This will perfectly fill all the gaps and will preserve the sorting order of the files.

- A tiny little gap somewhere at the beginning of the zone will cause all items     above the gap to be moved (shifted). In this case MoveDownFill() is only a little     faster than a full SortBy***(). However, if the gap happens to be further into     the zone then MoveDownFill() will save time.

### Syntax

```mydfrg
MoveDownFill()
```

### Example

```mydfrg
FileSelect
  ....
FileActions
  # Fill gaps with items from above.
  MoveDownFill()
FileEnd
```

### See also:

[**FastFill**](FastFill.md)

[**ForcedFill**](ForcedFill.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
