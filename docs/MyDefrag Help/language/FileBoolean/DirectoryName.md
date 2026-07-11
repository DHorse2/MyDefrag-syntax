# FileBoolean - DirectoryName

Select all the directories that have a name which matches the
  STRING, and in these selected directories select all files and all subdirectories.
  The string may contain wildcard characters "*" (zero or more characters)
  or "?" (a single character).

- This boolean is similar to the [**DirectoryPath**](DirectoryPath.md)     boolean, but is somewhat faster because it only looks at directory names, not their     full paths.
- The STRING should not contains slashes or backslashes. It is compared     with the name of all the directories, and directory names do not contain slashes or     backslashes.
- The function looks at all the hard link filenames of items (an item may     have 2 or more names, totally different and even in different directories, but     all referring to the same data).     The logfile will show whatever name happens to be first, so it may appear as     if the function has selected some wrong items.     The function does not follow soft links.

### Syntax

```mydfrg
DirectoryName(
STRING
)
```

### Example

```mydfrg
FileSelect
  # Select everything in the "Program Files" directory.
  DirectoryName("Program Files")
FileActions
  ....
FileEnd
```

### See also:

[**DirectoryPath**](DirectoryPath.md)

[**FileName**](FileName.md)

[**FullPath**](FullPath.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
