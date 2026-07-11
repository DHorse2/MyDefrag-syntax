# FileActions - ForcedFill

Move all data as fast as possible to the beginning of the zone.
  The function will take the highest data on disk and split it into
  fragments that perfectly fill the gaps at the beginning of the zone,
  until the first gap is after the last data.

### Syntax

```mydfrg
ForcedFill()
```

### Example

```mydfrg
FileSelect
  ....
FileActions
  # Fill gaps with items from above.
  ForcedFill()
FileEnd
```

### See also:

[**MoveDownFill**](MoveDownFill.md)

[**FastFill**](FastFill.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
