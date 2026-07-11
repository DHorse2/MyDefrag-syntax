# FileBoolean - SelectNtfsSystemFiles

Select all the NTFS system files. These files are usually not visible, but
  they exist on all NTFS disks. The function selects all the files that are in the
  root directory of the volume and have a name that begins with "$" (dollar sign),
  except for "$RECYCLE.BIN", and all files in the $Extend folder and it's
  subfolders.

- This function is intended to be used together with the     [**PlaceNtfsSystemFiles**](../FileActions/PlaceNtfsSystemFiles.md) fileaction.

| **Inode** | **Filename** | **Description** |
| --- | --- | --- |
| 0 | $MFT | Master File Table - An index of every file. |
| 1 | $MFTMirr | A backup copy of the first 4 records of the MFT. |
| 2 | $LogFile | Transactional logging file. |
| 3 | $Volume | Serial number, creation time, dirty flag. |
| 4 | $AttrDef | Attribute definitions. |
| 6 | $Bitmap | Contains volume's cluster map (in-use vs. free). |
| 7 | $Boot | Boot record of the volume. |
| 8 | $BadClus | Lists bad clusters on the volume. |
| 9 | $Quota | [Windows NT only] Quota information. |
| 9 | $Secure | Security descriptors used by the volume. |
| 10 | $UpCase | Table of uppercase characters used for collating. |
| 11 | $Extend | A directory for: $ObjId, $Quota, $Reparse, $UsnJrnl. |
|  | $Extend\$ObjId | Unique Ids given to every file. |
|  | $Extend\$Quota | Quota information. |
|  | $Extend\$Reparse | Reparse point information. |
|  | $Extend\$UsnJrnl | USN Journal. |
|  | $Extend\$RmMetadata | Transactional data. |

### Syntax

```mydfrg
SelectNtfsSystemFiles(yes)
SelectNtfsSystemFiles(no)
```

### Example

```mydfrg
FileSelect
  # Select all the NTFS system files.
  SelectNtfsSystemFiles(yes)
FileActions
  # Place the selected files, sorted by their full path.
  PlaceNtfsSystemFiles(Ascending,MftSize * 0.1)
FileEnd
```

### See also:

[**PlaceNtfsSystemFiles**](../FileActions/PlaceNtfsSystemFiles.md)

[**ReclaimNtfsReservedAreas**](../VolumeActions/ReclaimNtfsReservedAreas.md)
