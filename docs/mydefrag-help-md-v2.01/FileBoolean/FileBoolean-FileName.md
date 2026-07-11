## FileBoolean - FileName

Select all the items (files, directories) that have a filename that matches the STRING. The string may contain wildcard characters "\*" (zero or more characters) or "?" (a single character).

- The STRING should not contains slashes or backslashes. It is compared with the filename of all the items, and filenames do not contain slashes or backslashes.
- The function looks at all the hard link filenames of an item (an item may have 2 or more names, totally different and even in different directories, but all referring to the same data). The logfile will show whatever name happens to be first, so it may appear as if the function has selected some wrong items. The function does not follow soft links.

### Syntax

|                                                        |
|--------------------------------------------------------|
| `FileName(`[`STRING`](../Scripts/Scripts-STRING.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **DirectoryPath**](FileBoolean-DirectoryPath.md)  
[![ \* ](../img/Bullit.gif) **DirectoryName**](FileBoolean-DirectoryName.md)  
[![ \* ](../img/Bullit.gif) **FullPath**](FileBoolean-FullPath.md)  
[![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)

---

_Source HTML: `FileBoolean-FileName.html`_
