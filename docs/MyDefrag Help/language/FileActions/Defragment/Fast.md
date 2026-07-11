# Defragment - Fast

This is an option for the

[**Defragment**](../Defragment.md)

fileaction.
  It will select a different algorithm that will only defragment an item if there is a
  gap somewhere that is big enough for the item. Otherwise the item will be left
  fragmented. This is much faster than a regular defragment, because data will not be
  shuffled around to try and make a big enough gap, but can leave some files fragmented.

- The [**ChunkSize**](ChunkSize.md) option automatically selects the     Fast option.

### Syntax

```mydfrg
Defragment(Fast)
```

### Example

```mydfrg
FileSelect
  ....
FileActions
  Defragment(Fast)
FileEnd
```

### See also:

[**Defragment**](../Defragment.md)

[**FileSelect**](../../Scripts/FileSelect.md)

[**FileBoolean**](../../Scripts/FileBoolean.md)

[**FileActions**](../../Scripts/FileActions.md)
