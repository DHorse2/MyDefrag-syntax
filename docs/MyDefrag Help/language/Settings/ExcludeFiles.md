# Settings - ExcludeFiles

Exclude a selection of files.

- The files will not be touched in any way, are     automatically excluded from selection with the [**FileBoolean**](../Scripts/FileBoolean.md)     of [**FileSelect**](../Scripts/FileSelect.md) statements,     and will be marked in red on the diskmap.
- This is a global setting that can only be used     outside [**VolumeSelect**](../Scripts/VolumeSelect.md) statements.
- Using the setting will replace any previous setting.     In other words, the setting is valid from the point in the script where it is     defined until the next ExcludeFiles setting.

### Syntax

```mydfrg
ExcludeFiles(
FILEBOOLEAN
)
```

### Example

```mydfrg
# Exclude all files larger than 10 gigabytes.
ExcludeFiles(Size(10000000000,0))
# Exclude some folders.
ExcludeFiles(FullPath("C:\STAR WARS","*")
  or FullPath("C:\SCREENSHOT","*")
  or FullPath("D:\Cinema","*")
  or FullPath("D:\Bc_Up","*")
  or FullPath("D:\FireFox_DLHelper","*")
  )
```

### See also:

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileSelect**](../VolumeActions/FileSelect.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**Settings**](../Scripts/Settings.md)
