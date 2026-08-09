# Scripts - Variables

<!-- markdownlint-disable MD013 MD033 -->

Variables are little storage areas inside MyDefrag that have a name and a value. They can contain numbers or strings, and can be used in places such as [**NUMBER**](NUMBER.md) expressions and [**STRING**](STRING.md)'s.

## Creating and changing variables

See [**SetVariable**](../Settings/SetVariable.md) to create and change variables.

## Pre-defined variables

MyDefrag has a long list of pre-defined variables that you can use. They are dynamic variables; that is, they are automatically recalculated when they are used.

### Program and script

| Variable | Units | Description |
| --- | --- | --- |
| **MyDefragVersion** | String | MyDefrag version (for example "MyDefrag v4.0b4") |
| **WindowsVersion** | String | Windows version (for example "v6.0 build 6000") |
| **Commandline** | String | Commandline (for example "MyDefrag.exe -r Weekly.MyD") |
| **ExecutableDirectory** | String | Executable directory, the directory where the currently running MyDefrag interpreter is located (for example `C:\Program Files\MyDefrag v4.3.1`) |
| **WorkingDirectory** | String | Working directory (for example `C:\Program Files\MyDefrag v4.3.1`) |
| **ScriptDirectory** | String | Script directory, the directory where the currently running script is located (for example `C:\Program Files\MyDefrag v4.3.1\Scripts`) |
| **InstallDirectory** | String | Install directory, where MyDefrag was installed (for example `C:\Program Files\MyDefrag v4.3.1`) |
| **ProcessID** | Number | Program ID (PID), for example "5816" |
| **ScriptTitle** | String | Script title (see [**Title**](../Settings/Title.md)) |
| **ScriptDescription** | String | Script description (see [**Description**](../Settings/Description.md)) |
| **Date** | String | Date "year-month-day", for example "2010-12-31". |
| **Time** | String | Time "hours-minutes-seconds", for example "12:27:01". |
| **RunTime** | String | Elapsed real time (wall-time) since the program started, for example "2:05:18". |

### Current volume

| Variable | Units | Description |
| --- | --- | --- |
| **MountPoint** | String | Mountpoint (for example "c:") |
| **VolumeName** | String | VolumeName (for example `\?\Volume{08439462-3004-11da-bbca-806d6172696f}`) |
| **VolumeType** | String | VolumeType (for example "NTFS") |
| **VolumeSize** | bytes | The size of the volume. |
| **VolumeSizeG** | Gigabytes | The size of the volume. |
| **VolumeFree** | bytes | The amount of free space on the volume. |
| **VolumeFreeG** | Gigabytes | The amount of free space on the volume. |
| **VolumeFreeP** | Percentage | The amount of free space on the volume. |
| **VolumeUsed** | bytes | The amount of used space on the volume. |
| **VolumeUsedG** | Gigabytes | The amount of used space on the volume. |
| **VolumeUsedP** | Percentage | The amount of used space on the volume. |
| **MftSize** | bytes | The size of the $MFT. |
| **BytesPerCluster** | bytes | The size of a cluster.<br>• Windows uses disks in blocks called "clusters".<br>• Harddisks split the data in even smaller blocks, called "sectors". A clusters is 1 or more whole sectors, which is set by Windows when it formats the disk.<br>• The minimum size that a file will occupy is 1 cluster.<br>• Very small files on NTFS disks are stored in the MFT, and are then reported as occupying zero clusters. |
| **AverageBeginEndDistance** | Clusters | Average end-begin distance.<br>• When Windows has finished reading a file then the harddisk heads will have to move to the beginning of whatever file is needed next. MyDefrag calculates the average distance from the end of every file to the beginning of every other file.<br>• A lower number means that the files are better packed together and can be accessed more quickly.<br>• The lowest possible average distance can be achieved by sorting by filesize.<br>• The formula does not take the disk geometry into account. Harddisks have circular tracks with varying numbers of sectors, but the formula calculates as if the harddisk is a linear list of sectors. |
| **AverageBeginEndDistanceP** | Percentage | Average end-begin distance.<br>• When Windows has finished reading a file then the harddisk heads will have to move to the beginning of whatever file is needed next. MyDefrag calculates the average distance from the end of every file to the beginning of every other file.<br>• A lower number means that the files are better packed together and can be accessed more quickly.<br>• The lowest possible average distance can be achieved by sorting by filesize.<br>• The formula does not take the disk geometry into account. Harddisks have circular tracks with varying numbers of sectors, but the formula calculates as if the harddisk is a linear list of sectors. |

### Volume: Files and directories by count

The number of files and directories, fragmented and unfragmented. The percentages are the same number, but as the percentage of the total files and directories on the volume.

| Variable | Units | Description |
| --- | --- | --- |
| **FILES000N** | Number | The number of unfragmented files on the volume. |
| **FILES000P** | Percentage | The number of unfragmented files on the volume. |
| **FILES010N** | Number | The number of fragmented files on the volume. |
| **FILES010P** | Percentage | The number of fragmented files on the volume. |
| **FILES020N** | Number | The number of files on the volume (fragmented + unfragmented). |
| **FILES020P** | Percentage | The number of files on the volume (fragmented + unfragmented). |
| **FILES100N** | Number | The number of unfragmented directories on the volume. |
| **FILES100P** | Percentage | The number of unfragmented directories on the volume. |
| **FILES110N** | Number | The number of fragmented directories on the volume. |
| **FILES110P** | Percentage | The number of fragmented directories on the volume. |
| **FILES120N** | Number | The number of directories on the volume (fragmented + unfragmented). |
| **FILES120P** | Percentage | The number of directories on the volume (fragmented + unfragmented). |
| **FILES200N** | Number | The number of unfragmented files and directories on the volume. |
| **FILES200P** | Percentage | The number of unfragmented files and directories on the volume. |
| **FILES210N** | Number | The number of fragmented files and directories on the volume. |
| **FILES210P** | Percentage | The number of fragmented files and directories on the volume. |
| **FILES220N** | Number | The number of files and directories on the volume (fragmented + unfragmented). |
| **FILES220P** | Percentage | The number of files and directories on the volume (fragmented + unfragmented). |

### Volume: Files and directories by occupied size

The size of files without sparse space, in other words the space that files are actually occupying on disk. The percentages are the same number, but as the percentage of the total files and directories on the volume.

| Variable | Units | Description |
| --- | --- | --- |
| **FILES002N** | Bytes | The size of unfragmented files on the volume. |
| **FILES002G** | Gigabytes | The size of unfragmented files on the volume. |
| **FILES002P** | Percentage | The size of unfragmented files on the volume. |
| **FILES012N** | Bytes | The size of fragmented files on the volume. |
| **FILES012G** | Gigabytes | The size of fragmented files on the volume. |
| **FILES012P** | Percentage | The size of fragmented files on the volume. |
| **FILES022N** | Bytes | The size of all the fragmented + unfragmented files on the volume. |
| **FILES022G** | Gigabytes | The size of all the fragmented + unfragmented files on the volume. |
| **FILES022P** | Percentage | The size of all the fragmented + unfragmented files on the volume. |
| **FILES102N** | Bytes | The size of all the unfragmented folders on the volume. |
| **FILES102G** | Gigabytes | The size of all the unfragmented folders on the volume. |
| **FILES102P** | Percentage | The size of all the unfragmented folders on the volume. |
| **FILES112N** | Bytes | The size of all the fragmented folders on the volume. |
| **FILES112G** | Gigabytes | The size of all the fragmented folders on the volume. |
| **FILES112P** | Percentage | The size of all the fragmented folders on the volume. |
| **FILES122N** | Bytes | The size of all the fragmented + unfragmented folders on the volume. |
| **FILES122G** | Gigabytes | The size of all the fragmented + unfragmented folders on the volume. |
| **FILES122P** | Percentage | The size of all the fragmented + unfragmented folders on the volume. |
| **FILES202N** | Bytes | The size of all the fragmented files + folders on the volume. |
| **FILES202G** | Gigabytes | The size of all the fragmented files + folders on the volume. |
| **FILES202P** | Percentage | The size of all the fragmented files + folders on the volume. |
| **FILES212N** | Bytes | The size of all the unfragmented files + folders on the volume. |
| **FILES212G** | Gigabytes | The size of all the unfragmented files + folders on the volume. |
| **FILES212P** | Percentage | The size of all the unfragmented files + folders on the volume. |
| **FILES222N** | Bytes | The size of all the files + folders on the volume (fragmented + unfragmented). |
| **FILES222G** | Gigabytes | The size of all the files + folders on the volume (fragmented + unfragmented). |
| **FILES222P** | Percentage | The size of all the files + folders on the volume (fragmented + unfragmented). |

### Volume: Files and directories by sparse size

The size of files including sparse space. This is the size of files normally reported by Windows. It includes the space for empty (unused) blocks of data (in the files) that do not occupy space on disk. The percentages are the same number, but as the percentage of the total files and directories on the volume.

| Variable | Units | Description |
| --- | --- | --- |
| **FILES001N** | Bytes | The size of unfragmented files on the volume. |
| **FILES001G** | Gigabytes | The size of unfragmented files on the volume. |
| **FILES001P** | Percentage | The size of unfragmented files on the volume. |
| **FILES011N** | Bytes | The size of fragmented files on the volume. |
| **FILES011G** | Gigabytes | The size of fragmented files on the volume. |
| **FILES011P** | Percentage | The size of fragmented files on the volume. |
| **FILES021N** | Bytes | The size of all files on the volume (fragmented + unfragmented). |
| **FILES021G** | Gigabytes | The size of all files on the volume (fragmented + unfragmented). |
| **FILES021P** | Percentage | The size of all files on the volume (fragmented + unfragmented). |
| **FILES101N** | Bytes | The size of all unfragmented folders on the volume. |
| **FILES101G** | Gigabytes | The size of all unfragmented folders on the volume. |
| **FILES101P** | Percentage | The size of all unfragmented folders on the volume. |
| **FILES111N** | Bytes | The size of all fragmented folders on the volume. |
| **FILES111G** | Gigabytes | The size of all fragmented folders on the volume. |
| **FILES111P** | Percentage | The size of all fragmented folders on the volume. |
| **FILES121N** | Bytes | The size of all folders on the volume (fragmented + unfragmented). |
| **FILES121G** | Gigabytes | The size of all folders on the volume (fragmented + unfragmented). |
| **FILES121P** | Percentage | The size of all folders on the volume (fragmented + unfragmented). |
| **FILES201N** | Bytes | The size of all unfragmented files + folders on the volume. |
| **FILES201G** | Gigabytes | The size of all unfragmented files + folders on the volume. |
| **FILES201P** | Percentage | The size of all unfragmented files + folders on the volume. |
| **FILES211N** | Bytes | The size of all fragmented files + folders on the volume. |
| **FILES211G** | Gigabytes | The size of all fragmented files + folders on the volume. |
| **FILES211P** | Percentage | The size of all fragmented files + folders on the volume. |
| **FILES221N** | Bytes | The size of all files + folders on the volume (fragmented + unfragmented). |
| **FILES221G** | Gigabytes | The size of all files + folders on the volume (fragmented + unfragmented). |
| **FILES221P** | Percentage | The size of all files + folders on the volume (fragmented + unfragmented). |

### Zone

| Variable | Units | Description |
| --- | --- | --- |
| **ZoneNumber** | Count | The current zone number (for example "3"). |
| **ZoneCount** | Count | The number of zones (for example "6"). |
| **ProgressPercentage** | Number | The percentage as shown in the status bar, which is the progress percentage from 0,0000 to 100,0000 for the current zone (floating-point number with 4 decimal digits). |
| **ZoneBegin** | Bytes | The beginning of the zone, the number of bytes from the beginning of the disk. |
| **ZoneEnd** | Bytes | The end of the zone, the number of bytes from the beginning of the disk. |
| **ZoneSize** | Bytes | The size of the zone, the number of bytes occupied by all the items in the zone. Note: this includes unmovable items. |
| **MaxNextZoneBegin** | Bytes | The maximum beginning of the next zone. This is basically the end of the disk minus the number of bytes in items that have not yet been placed. |

### Zone: Files and directories by count

The number of files and directories in the zone, fragmented and unfragmented. The percentages are the same number, but as the percentage of the total files and directories on the volume.

| Variable | Units | Description |
| --- | --- | --- |
| **ZONE000N** | Number | The number of unfragmented files in the zone. |
| **ZONE000P** | Percentage | The number of unfragmented files in the zone. |
| **ZONE010N** | Number | The number of fragmented files in the zone. |
| **ZONE010P** | Percentage | The number of fragmented files in the zone. |
| **ZONE020N** | Number | The number of files in the zone (fragmented + unfragmented). |
| **ZONE020P** | Percentage | The number of files in the zone (fragmented + unfragmented). |
| **ZONE100N** | Number | The number of unfragmented folders in the zone. |
| **ZONE100P** | Percentage | The number of unfragmented folders in the zone. |
| **ZONE110N** | Number | The number of fragmented folders in the zone. |
| **ZONE110P** | Percentage | The number of fragmented folders in the zone. |
| **ZONE120N** | Number | The number of folders in the zone (fragmented + unfragmented). |
| **ZONE120P** | Percentage | The number of folders in the zone (fragmented + unfragmented). |
| **ZONE200N** | Number | The number of unfragmented files + folders in the zone. |
| **ZONE200P** | Percentage | The number of unfragmented files + folders in the zone. |
| **ZONE210N** | Number | The number of fragmented files + folders in the zone. |
| **ZONE210P** | Percentage | The number of fragmented files + folders in the zone. |
| **ZONE220N** | Number | The number of files + folders in the zone (fragmented + unfragmented). |
| **ZONE220P** | Percentage | The number of files + folders in the zone (fragmented + unfragmented). |

### Zone: Files and directories by occupied size

The size of files in the zone without sparse space, in other words the space that files are actually occupying on disk. The percentages are the same number, but as the percentage of the total files and directories on the volume.

| Variable | Units | Description |
| --- | --- | --- |
| **ZONE002N** | Bytes | The size of unfragmented files in the zone. |
| **ZONE002G** | Gigabytes | The size of unfragmented files in the zone. |
| **ZONE002P** | Percentage | The size of unfragmented files in the zone. |
| **ZONE012N** | Bytes | The size of fragmented files in the zone. |
| **ZONE012G** | Gigabytes | The size of fragmented files in the zone. |
| **ZONE012P** | Percentage | The size of fragmented files in the zone. |
| **ZONE022N** | Bytes | The size of all files in the zone (fragmented + unfragmented). |
| **ZONE022G** | Gigabytes | The size of all files in the zone (fragmented + unfragmented). |
| **ZONE022P** | Percentage | The size of all files in the zone (fragmented + unfragmented). |
| **ZONE102N** | Bytes | The size of unfragmented folders in the zone. |
| **ZONE102G** | Gigabytes | The size of unfragmented folders in the zone. |
| **ZONE102P** | Percentage | The size of unfragmented folders in the zone. |
| **ZONE112N** | Bytes | The size of fragmented folders in the zone. |
| **ZONE112G** | Gigabytes | The size of fragmented folders in the zone. |
| **ZONE112P** | Percentage | The size of fragmented folders in the zone. |
| **ZONE122N** | Bytes | The size of all folders in the zone (fragmented + unfragmented). |
| **ZONE122G** | Gigabytes | The size of all folders in the zone (fragmented + unfragmented). |
| **ZONE122P** | Percentage | The size of all folders in the zone (fragmented + unfragmented). |
| **ZONE202N** | Bytes | The size of unfragmented files + folders in the zone. |
| **ZONE202G** | Gigabytes | The size of unfragmented files + folders in the zone. |
| **ZONE202P** | Percentage | The size of unfragmented files + folders in the zone. |
| **ZONE212N** | Bytes | The size of fragmented files + folders in the zone. |
| **ZONE212G** | Gigabytes | The size of fragmented files + folders in the zone. |
| **ZONE212P** | Percentage | The size of fragmented files + folders in the zone. |
| **ZONE222N** | Bytes | The size of all files + folders in the zone (fragmented + unfragmented). |
| **ZONE222G** | Gigabytes | The size of all files + folders in the zone (fragmented + unfragmented). |
| **ZONE222P** | Percentage | The size of all files + folders in the zone (fragmented + unfragmented). |

### Zone: Files and directories by sparse size

The size of files in the zone including sparse space. This is the size of files normally reported by Windows. It includes the space for empty (unused) blocks of data (in the files) that do not occupy space on disk. The percentages are the same number, but as the percentage of the total files and directories on the volume.

| Variable | Units | Description |
| --- | --- | --- |
| **ZONE001N** | Bytes | The size of unfragmented files in the zone. |
| **ZONE001G** | Gigabytes | The size of unfragmented files in the zone. |
| **ZONE001P** | Percentage | The size of unfragmented files in the zone. |
| **ZONE011N** | Bytes | The size of fragmented files in the zone. |
| **ZONE011G** | Gigabytes | The size of fragmented files in the zone. |
| **ZONE011P** | Percentage | The size of fragmented files in the zone. |
| **ZONE021N** | Bytes | The size of all files in the zone (fragmented + unfragmented). |
| **ZONE021G** | Gigabytes | The size of all files in the zone (fragmented + unfragmented). |
| **ZONE021P** | Percentage | The size of all files in the zone (fragmented + unfragmented). |
| **ZONE101N** | Bytes | The size of unfragmented folders in the zone. |
| **ZONE101G** | Gigabytes | The size of unfragmented folders in the zone. |
| **ZONE101P** | Percentage | The size of unfragmented folders in the zone. |
| **ZONE111N** | Bytes | The size of fragmented folders in the zone. |
| **ZONE111G** | Gigabytes | The size of fragmented folders in the zone. |
| **ZONE111P** | Percentage | The size of fragmented folders in the zone. |
| **ZONE121N** | Bytes | The size of all folders in the zone (fragmented + unfragmented). |
| **ZONE121G** | Gigabytes | The size of all folders in the zone (fragmented + unfragmented). |
| **ZONE121P** | Percentage | The size of all folders in the zone (fragmented + unfragmented). |
| **ZONE201N** | Bytes | The size of unfragmented files + folders in the zone. |
| **ZONE201G** | Gigabytes | The size of unfragmented files + folders in the zone. |
| **ZONE201P** | Percentage | The size of unfragmented files + folders in the zone. |
| **ZONE211N** | Bytes | The size of fragmented files + folders in the zone. |
| **ZONE211G** | Gigabytes | The size of fragmented files + folders in the zone. |
| **ZONE211P** | Percentage | The size of fragmented files + folders in the zone. |
| **ZONE221N** | Bytes | The size of all files + folders in the zone (fragmented + unfragmented). |
| **ZONE221G** | Gigabytes | The size of all files + folders in the zone (fragmented + unfragmented). |
| **ZONE221P** | Percentage | The size of all files + folders in the zone (fragmented + unfragmented). |

### Gaps by count

The number of gaps on the volume. The percentages are the same number, but as the percentage of the total gaps on the volume.

- The less gaps the better. More gaps will cause more fragmentation.
- The gap count will increase while defragmenting.
- The gap count will decrease while optimizing.

| Variable | Units | Description |
| --- | --- | --- |
| **GAP01N** | Count | The number of small gaps. Small gaps are gaps that are smaller than the average gap size (GAP13N). |
| **GAP01P** | Percentage | The number of small gaps. Small gaps are gaps that are smaller than the average gap size (GAP13N). |
| **GAP02N** | Count | The number of big gaps. Big gaps are gaps that are bigger than the average gap size (GAP13N). |
| **GAP02P** | Percentage | The number of big gaps. Big gaps are gaps that are bigger than the average gap size (GAP13N). |
| **GAP00N** | Count | All gaps. |
| **GAP00P** | Percentage | All gaps. |

### Gaps by size

Statistics about the size of the gaps on the volume. The percentages are the same number, but as the percentage of the total gaps on the volume.

| Variable | Units | Description |
| --- | --- | --- |
| **GAP11N** | Bytes | The size of the small gaps. Small gaps are gaps that are smaller than the average gap size (GAP13N). |
| **GAP11G** | Gigabytes | The size of the small gaps. Small gaps are gaps that are smaller than the average gap size (GAP13N). |
| **GAP11P** | Percentage | The size of the small gaps. Small gaps are gaps that are smaller than the average gap size (GAP13N). |
| **GAP12N** | Bytes | The size of the big gaps. Big gaps are gaps that are bigger than the average gap size (GAP13N). |
| **GAP12G** | Gigabytes | The size of the big gaps. Big gaps are gaps that are bigger than the average gap size (GAP13N). |
| **GAP12P** | Percentage | The size of the big gaps. Big gaps are gaps that are bigger than the average gap size (GAP13N). |
| **GAP10N** | Bytes | The size of all the gaps. |
| **GAP10G** | Gigabytes | The size of all the gaps. |
| **GAP10P** | Percentage | The size of all the gaps. |
| **GAP13N** | Bytes | The average gap size. |
| **GAP13G** | Gigabytes | The average gap size. |
| **GAP13P** | Percentage | The average gap size. |
| **GAP14N** | Bytes | The median gap size. This is the size of the gap in the middle of the list of sorted gap sizes. Half the gaps are smaller than this number, and the other half is bigger. |
| **GAP14G** | Gigabytes | The median gap size. This is the size of the gap in the middle of the list of sorted gap sizes. Half the gaps are smaller than this number, and the other half is bigger. |
| **GAP14P** | Percentage | The median gap size. This is the size of the gap in the middle of the list of sorted gap sizes. Half the gaps are smaller than this number, and the other half is bigger. |
| **GAP15N** | Bytes | The size of the biggest gap. |
| **GAP15G** | Gigabytes | The size of the biggest gap. |
| **GAP15P** | Percentage | The size of the biggest gap. |

### Unmovable items

MyDefrag initially treats all files as movable, and will only mark an item as unmovable after the Microsoft defragmentation API has refused to move it.

| Variable | Units | Description |
| --- | --- | --- |
| **UnmovablesList** | List | List of unmovable items. The format of the list is fixed and cannot be changed. It contains 1 line per item (file, folder) with the number of fragments, the number of sparse bytes, the number of occupied clusters, and the full path of the item. |
| **UnmovablesTotalFragments** | Count | Total of the "fragments" column. |
| **UnmovablesTotalBytes** | Bytes | Total of the "bytes" column. |
| **UnmovablesTotalClusters** | Clusters | Total of the "clusters" column. |

### Fragmented items

| Variable | Units | Description |
| --- | --- | --- |
| **FragmentedList** | List | List of fragmented items. The format of the list is fixed and cannot be changed. It contains 1 line per item (file, folder) with the number of fragments, the number of sparse bytes, the number of occupied clusters, and the full path of the item. |
| **FragmentedTotalFragments** | Count | Total of the "fragments" column. |
| **FragmentedTotalBytes** | Bytes | Total of the "bytes" column. |
| **FragmentedTotalClusters** | Clusters | Total of the "clusters" column. |

### The 25 largest items

| Variable | Units | Description |
| --- | --- | --- |
| **LargestItemsList** | List | List of the 25 largest items on the volume. The format of the list is fixed and cannot be changed. It contains 1 line per item (file, folder) with the number of fragments, the number of sparse bytes, the number of occupied clusters, and the full path of the item. |
| **LargestItemsTotalFragments** | Count | Total of the "fragments" column. |
| **LargestItemsTotalBytes** | Bytes | Total of the "bytes" column. |
| **LargestItemsTotalClusters** | Clusters | Total of the "clusters" column. |

### Bad cluster list

Windows will add disk clusters to the "$BadClus:$Bad:$DATA" system file when it detects a hardware error. If the list begins to grow then you should immediately replace the disk.

| Variable | Units | Description |
| --- | --- | --- |
| **BadClusterList** | List | List of bad clusters. The format of the list is fixed and cannot be changed. It contains 1 line per block of clusters with the number of clusters and the LCN (Logical Cluster Number) on the disk. |
| **BadClusterTotal** | Count | Total of the "clusters" column. |

### Memory usage

Statistics about the memory in use by the program.

| Variable | Units | Description |
| --- | --- | --- |
| **MemoryHeapBytes** | Bytes | Heap memory |
| **MemoryHeapItems** | Count | Heap items |
| **MemoryVolumes** | Bytes | Volumes |
| **MemoryItems** | Bytes | Items (files, directories) |
| **MemoryFileNames** | Bytes | Filenames |
| **MemoryFullPaths** | Bytes | FullPaths |
| **MemoryExtends** | Bytes | Extends (fragments) |
| **MemoryContext** | Bytes | Context |

### Example

```mydfrg
# Set very basic statistics.
SetStatisticsWindowText("
  Total disk space:   !VolumeSize! bytes
  Bytes per cluster:  !BytesPerCluster! bytes
  Unfragmented Items: !FILES200N!
  Fragmented Items:   !FILES210N!
  Unfragmented Data:  !FILES202N! bytes
  Fragmented Data:    !FILES212N! bytes
  All Gaps:           !GAP00N!
  All gaps:           !GAP10N! bytes
  Average gap:        !GAP13N! bytes
  Median gap:         !GAP14N! bytes
  Biggest gap:        !GAP15N! bytes
  ")
```

### See also

- [**SetVariable**](../Settings/SetVariable.md)
- [**Macros**](Macros.md)
- [**Settings**](Settings.md)
