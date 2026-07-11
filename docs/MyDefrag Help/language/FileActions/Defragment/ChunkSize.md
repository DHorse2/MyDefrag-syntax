# Defragment - ChunkSize

This is an option for the

[**Defragment**](../Defragment.md)

fileaction.
  It will only defragment fragments that are smaller than the specified number of
  megabytes. If the NUMBER is zero then defragment all fragments (the default).

- The ChunkSize() option automatically selects the [**Fast**](Fast.md) option.
- Fragmentation causes speed degradation because the harddisk heads have to physically     move from the end of a fragment to the beginning of the next fragment.     For small files this time can be more than reading the data, so it     is advantageous to defragment the file. For large files however, the time to move the     harddisk heads is negligeable compared to the time it takes to read the data.     Some people prefer not to defragment these huge fragments, so that MyDefrag will     finish sooner.
- The build-in defragmenter that comes with Vista does a chunk defragment, ignoring     fragments larger than 64 megabytes.

### Syntax

```mydfrg
ChunkSize(
NUMBER
)
```

### Example

```mydfrg
FileSelect
  ....
FileActions
  # Defragment files so that all fragments are at least 100 megabytes.
  Defragment(ChunkSize(100))
FileEnd
```

### See also:

[**Defragment**](../Defragment.md)

[**FileSelect**](../../Scripts/FileSelect.md)

[**FileBoolean**](../../Scripts/FileBoolean.md)

[**FileActions**](../../Scripts/FileActions.md)
