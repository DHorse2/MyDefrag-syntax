## Defragment - ChunkSize

This is an option for the [![ \* ](../img/Bullit.gif) **Defragment**](../FileActions/FileActions-Defragment.md) fileaction. It will only defragment fragments that are smaller than the specified number of megabytes. If the NUMBER is zero then defragment all fragments (the default).

- The ChunkSize() option automatically selects the [![ \* ](../img/Bullit.gif) **Fast**](Defragment-Fast.md) option.
- Fragmentation causes speed degradation because the harddisk heads have to physically move from the end of a fragment to the beginning of the next fragment. For small files this time can be more than reading the data, so it is advantageous to defragment the file. For large files however, the time to move the harddisk heads is negligeable compared to the time it takes to read the data. Some people prefer not to defragment these huge fragments, so that MyDefrag will finish sooner.
- The build-in defragmenter that comes with Vista does a chunk defragment, ignoring fragments larger than 64 megabytes.

### Syntax

|                                                         |
|---------------------------------------------------------|
| `ChunkSize(`[`NUMBER`](../Scripts/Scripts-NUMBER.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **Defragment**](../FileActions/FileActions-Defragment.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `Defragment-ChunkSize.html`_
