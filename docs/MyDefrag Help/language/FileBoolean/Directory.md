# FileBoolean - Directory

Select all the directories (yes) or all the other files (no).

- Please note that this boolean does not select the files in a directory,     but the directory itself. Directories and files are separate entities.
- Directories cannot be moved (defragmented, optimized) on FAT32 volumes.     This is a known limitation of the Windows defragmentation API and not a bug in     MyDefrag.
- Moving directories is slower than moving files of the same size, presumably     because Windows has to update indexes and links in the MFT.

### Syntax

```mydfrg
Directory(yes)
Directory(no)
```

### Example

```mydfrg
FileSelect
  # Select all the directories.
  Directory(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
