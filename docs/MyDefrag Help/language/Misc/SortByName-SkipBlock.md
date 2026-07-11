# SortByName - SkipBlock

This option will look for blocks of
  items that are already sorted, and will skip those blocks. This is a huge timesaver
  in cases where there has been only a small change in the zone, for
  example a single file that was added or deleted. Without this option the SortBy*
  fileaction would move all the items "above" the change. With this option it
  will not move the already sorted items and only busy itself with whatever is
  not sorted anymore.

- The first NUMBER argment is the minimum number of files in a block, for the block to     be skipped.
- The second NUMBER argument is the minimum number of bytes that a block     has to occupy for the block to be skipped.
- The two arguments are logically AND'ed, in words: the block must have     at least argument1 files AND at least argument2 bytes.

### Syntax

```mydfrg
SkipBlock(
NUMBER
 ,
NUMBER
)
```

### Example

```mydfrg
# Sort the files by name, but skip blocks of files that are already sorted and
# contain at least 10% of the files in the zone and at least 10% of the size of
# the zone.
SortByName(Ascending SkipBlock(ZONE220N * 0.10,ZONE222N * 0.10))
```
