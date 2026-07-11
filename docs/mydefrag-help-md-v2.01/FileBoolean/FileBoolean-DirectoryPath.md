## FileBoolean - DirectoryPath

Select all the directories that have a full path which matches the STRING, and in these selected directories select all files and all subdirectories. The string may contain wildcard characters "\*" (zero or more characters) or "?" (a single character).

- This boolean is similar to the [![ \* ](../img/Bullit.gif) **DirectoryName**](FileBoolean-DirectoryName.md) boolean, but is somewhat slower because it looks at the full directory paths, not just the directory names.
- The STRING is compared with and must match the full path of the directories. Make sure that the mask also matches the drive letter. A directory path looks like this: "c:\windows\System32". Note that there is no trailing backslash.
- The function looks at all the hard link filenames of items (an item may have 2 or more names, totally different and even in different directories, but all referring to the same data). The logfile will show whatever name happens to be first, so it may appear as if the function has selected some wrong items. The function does not follow soft links.

### Syntax

|                                                             |
|-------------------------------------------------------------|
| `DirectoryPath(`[`STRING`](../Scripts/Scripts-STRING.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **DirectoryName**](FileBoolean-DirectoryName.md)  
[![ \* ](../img/Bullit.gif) **FileName**](FileBoolean-FileName.md)  
[![ \* ](../img/Bullit.gif) **FullPath**](FileBoolean-FullPath.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileBoolean-DirectoryPath.html`_
