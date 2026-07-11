# FastFill - WithShuffling

This is an option for the

[**FastFill**](../FastFill.md)

fileaction.
  With this option the program will be able to fill more gaps, but will take more
  datamovement and more time to complete.

- When FastFill encounters a gap that cannot be perfectly filled, and WithShuffling     is active, then MyDefrag will move the file just above the gap away and try again     to perfectly fill the gap.

### Syntax

```mydfrg
FastFill(WithShuffling)
```

### Example

```mydfrg
FileSelect
  ....
FileActions
  FastFill(WithShuffling)
FileEnd
```

### See also:

[**FastFill**](../FastFill.md)

[**FileSelect**](../../Scripts/FileSelect.md)

[**FileBoolean**](../../Scripts/FileBoolean.md)

[**FileActions**](../../Scripts/FileActions.md)
