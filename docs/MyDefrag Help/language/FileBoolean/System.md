# FileBoolean - System

Select all the items that have the "system" attribute set (yes) or not set (no).
  This attribute is used by Windows to indicate items that are part of Windows, or
  that are used exclusively by Windows. This definition includes files such as the
  pagefile, "desktop.ini" files, just about everything in the Windows folder (including
  infrequently used stuff), temporary files, files in the recycle bin, and lot's of
  other stuff.

### Syntax

```mydfrg
System(yes)
System(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have the "System" attribute.
  System(yes)
FileActions
  ....
FileEnd
```

**Tip:** You can get a list of all the system files on the C: disk with the following Windows commandline:

| `dir /A:S /S c:` |
| --- |

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
