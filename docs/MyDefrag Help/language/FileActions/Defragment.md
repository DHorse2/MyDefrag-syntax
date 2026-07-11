# FileActions - Defragment

Defragment all the selected items. Items that are not fragmented are ignored,
  they are not moved.

- Fragmented files are moved to somewhere above the beginning of the zone, possibly     outside the zone.
- Defragment() will not optimize the zone, it does not move all files to the zone.     To do that you need to use another     fileaction, for example FastFill(). But not a SortBy fileaction, because those     will already defragment all items and Defragment() would then do double work.
- There are 2 defragmentation algorithms to choose from.     The [**Fast**](Defragment/Fast.md) algorithm will only defragment a file     if it can find a gap big enough for the entire file. It will skip files that     are too big for any gap. The default defragmentation algorithm will not give     up so easily, if it encounters a big file and cannot find a big gap then it     will try to make a big gap by shuffling other files around. This can take a     lot of time.
- If the [**IgnoreWrapAroundFragmentation**](../Settings/IgnoreWrapAroundFragmentation.md) setting is     active (the default) then wrap-around fragmentation is not defragmented.

### Syntax

```mydfrg
Defragment(OPTIONS)
```

### Options:

| [**Fast**](Defragment/Fast.md) |
| --- |
| [**ChunkSize**](Defragment/ChunkSize.md) |

### Example

```mydfrg
FileSelect
  ....
FileActions
  Defragment()
FileEnd
```

### See also:

[**IgnoreWrapAroundFragmentation**](../Settings/IgnoreWrapAroundFragmentation.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
