# FileActions - MoveToEndOfDisk

Move the selected files to the end of the disk. More specifically:
  for every selected file try to find a gap above that file big enough
  to hold the file, and move the file to the end of that gap. If no gap is
  found then skip the file.

- Files are automatically defragmented when they are moved.
- This action is relatively slow, best to be used for big files only. It's     because the Microsoft defragmentation API is not very efficient in finding the     last gap suitable for a file.
- The end of the disk is the slowest part of the disk. Many people want to     move the spacehogs zone (with less important files that take up a lot of     space) to the end of the disk, leaving a huge empty gap between the regular     files and the spacehogs. In my opinion this is a waste of perfectly good     harddisk space and makes the spacehogs slower than they need to be.     This is why the standard MyDefrag scripts do not move the spacehogs to     the end of the disk.

### Syntax

```mydfrg
MoveToEndOfDisk()
```

### Example

```mydfrg
FileSelect
  ....
FileActions
  # Move files to the end of the disk.
  MoveToEndOfDisk()
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
