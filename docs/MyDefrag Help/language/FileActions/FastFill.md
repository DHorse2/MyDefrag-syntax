# FileActions - FastFill

Fill gaps as best as possible with items from above the gap, in other words,
  consolidate free space. FastFill is a very fast and effective way to reduce the number
  of gaps on the disk, and at the same time move files as far to the beginning of the
  disk as possible.

- FastFill tries to perfectly fill gaps by looking for combinations of files.     If no combination can be found and without the [**WithShuffling**](FastFill/WithShuffling.md)     option then the largest file that fits in the gap will be used, leaving a smaller     gap. If all files above the gap are larger than the gap then the gap cannot be filled     and will be skipped.     If the WithShuffling option is specified then the file just above the gap will be     moved away, making the gap bigger. The program will then try again to find a perfect     fit.
- When looking for a combination of perfectly fitting files the program does not     test all combinations of all files. It has to limit itself because the number of     permutations for even a small set of files is astronomical.
- There is a tendency for small files to migrate to the beginning of the zone     and large files to the end. This is because small files have a better chance     to fit into a gap and are therefore more likely to move down.
- FastFill will destroy the ordering of the files. If the zone was optimized earlier     (in another MyDefrag session, running another script)     by one of the SortBy actions, then consider using [**MoveDownFill**](MoveDownFill.md)     instead. It is slower but it will preserve the ordering.

### Syntax

```mydfrg
FastFill()
```

### Options:

| [**WithShuffling**](FastFill/WithShuffling.md) |
| --- |

### Example

```mydfrg
FileSelect
  ....
FileActions
  # Fill gaps with items from above.
  FastFill()
FileEnd
```

### See also:

[**WithShuffling**](FastFill/WithShuffling.md)

[**MoveDownFill**](MoveDownFill.md)

[**ForcedFill**](ForcedFill.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
