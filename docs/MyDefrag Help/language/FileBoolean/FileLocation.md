# FileBoolean - FileLocation

Select the items (files, directories) that are located in a specified
  area on the disk. The ARGUMENT specifies one of several options to choose
  from, the first NUMBER is the beginning of the area and the second NUMBER
  the end, both in LCN (Logical Cluster Number). If the first NUMBER is zero
  then the area begins at the beginning of the disk. If the second NUMBER is zero
  then the area ends at the end of the disk.

### Syntax

```mydfrg
FileLocation(ARGUMENT ,
NUMBER
 ,
NUMBER
)
```

### Argument

| Possible values for ARGUMENT:  **BeginOfFile** Select files if the beginning of the file is inside the area.  **EndOfFile** Select files if the end of the file is inside the area.  **EntireFile** Select files that have all their data inside the area.  **AnyPart** Select files if any of their data is inside the area.  **AnyCompleteFragment** Select files if at least 1 complete fragment is inside the area. | **BeginOfFile** | Select files if the beginning of the file is inside the area. | **EndOfFile** | Select files if the end of the file is inside the area. | **EntireFile** | Select files that have all their data inside the area. | **AnyPart** | Select files if any of their data is inside the area. | **AnyCompleteFragment** | Select files if at least 1 complete fragment is inside the area. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **BeginOfFile** | Select files if the beginning of the file is inside the area. |  |  |  |  |  |  |  |  |  |
| **EndOfFile** | Select files if the end of the file is inside the area. |  |  |  |  |  |  |  |  |  |
| **EntireFile** | Select files that have all their data inside the area. |  |  |  |  |  |  |  |  |  |
| **AnyPart** | Select files if any of their data is inside the area. |  |  |  |  |  |  |  |  |  |
| **AnyCompleteFragment** | Select files if at least 1 complete fragment is inside the area. |  |  |  |  |  |  |  |  |  |

### Example

```mydfrg
# Highlight files from the beginning of the disk up to LCN=10000.
SetFileColor(FileLocation(EntireFile,0,10000),all,255,255,255)
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
