# Settings - FileMoveChunkSize

Set the file-move chunk size. Minimum chunk size is the number of bytes per cluster
  (depends on how the harddisk was formatted), maximum chunk size is 1 gigabyte (imposed by
  the Microsoft defragmentation API).

MyDefrag is build on top of the Microsoft defragmentation API and basically all it does is send "move this file to that location" commands to the API. The API can only move a maximum of 1 gigabyte at a time, so MyDefrag has to split up the commands into chunks.

- Do not set a very low chunk size. It will not only make MyDefrag slower (moving     big chunks is far more efficient), but more importantly will cause the MFT to become     bigger and will make all disk access slower (for all applications, not just MyDefrag).     Files are stored in the MFT in "extends".     Contiguous extends (back-to-front on the disk) form fragments. The number of extends     is not listed by MyDefrag (or any other defragmentation program) but should be as low     as possible, just like the number of fragments should be as low as possible.     Decreasing the chunk size will increase the number of extends.
- MyDefrag has to read-only lock a file when it is defragmenting or moving that file.     This can sometimes cause problems for very big files if the file is actively     used (for example a database, or the Exchange mail repository). MyDefrag will     release the read-lock between chunks. Lowering the chunk size will give     other applications a chance to access the file.
- To make MyDefrag respond quicker to kill commands you can change the chunk size     to a smaller value. Once the Microsoft defragmentation API has been instructed by     MyDefrag to move a chunk it will finish moving the chunk in the background even if     MyDefrag is killed, but the API will finish faster if the chunksize is lower.
- The Microsoft defragmentation API does not provide any information to MyDefrag     about how far a move has progressed. MyDefrag can only update the display and the     percentage counter between moving the chunks, not while a chunk is being moved.     Lowering the chunksize will make the percentage counter update more often.

### Syntax

```mydfrg
FileMoveChunkSize(
NUMBER
)
```

### Example

```mydfrg
# Set the chunk size to 1 gigabyte.
FileMoveChunkSize(1073741824)
```

### See also:

[**Settings**](../Scripts/Settings.md)
