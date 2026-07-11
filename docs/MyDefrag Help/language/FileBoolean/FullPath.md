# FileBoolean - FullPath

Select all the directories that have a full path which matches the first
  STRING, and in these selected directories and their subdirectories select all
  the files that match the second STRING.
  The strings may contain wildcard characters "*" (zero or more characters)
  or "?" (a single character).

- Make sure that the directory mask also matches the drive letter. A directory     path looks like this: "c:\windows\System32". Note that there is no trailing     backslash, only the root folder (for example "c:\") has a backslash.
- The "*" (star) wildcard will also match the "\" (backslash) character, so it     span's directories.
- Files in subdirectories are also selected. For example, the     "FullPath("c:\Windows","*.exe")" command not only selects .exe files in the     "Windows" folder, but also in the "Windows\System32" folder, and all other     subfolders in the "Windows" folder.
- The function looks at all the hard link filenames of an item (an item may     have 2 or more names, totally different and even in different directories, but     all referring to the same data).     The logfile will show whatever name happens to be first, so it may appear as     if the function has selected some wrong items.     The function does not follow soft links.

### Syntax

```mydfrg
FullPath(
STRING
 ,
STRING
)
```

### Example

```mydfrg
FileSelect
  // Select all *.mp3 files in all "music" folders and subfolders.
  FullPath("*\music","*.mp3")
FileActions
  ....
FileEnd
// How to include files in a directory but not it's subdirectories.
FullPath("c:\windows","*") and not (FullPath("c:\windows\*","*"))
```

### See also:

[**FileName**](FileName.md)

[**DirectoryName**](DirectoryName.md)

[**DirectoryPath**](DirectoryPath.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
