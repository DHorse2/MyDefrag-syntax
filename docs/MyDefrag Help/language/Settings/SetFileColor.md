# Settings - SetFileColor

Change the colors that are used to draw files in the diskmap window.

- **Note:** There are 2 versions of this command. One can only be used outside     a VolumeSelect (for example in the Settings.MyD file), and the other can only     be used inside a VolumeSelect. MyDefrag will popup a syntax error if you try to use     wrong one.
- Files can be in one of 16 different states and each state has it's own color.     The FILESTATE parameter selects one or more of these states.
- The color is specified by the three NUMBER's, the red, green, and blue component     of the color. Each NUMBER must be from 0 to 255.
- Inside a VolumeSelect it is possible to select a set of files with the FILEBOOLEAN.     The new color is only applied to the selected files. It is for example possible to set     the color of all the "*.mp3" files, or the files in a specific folder, or even a single     file. The boolean will only select files that have not yet been processed, just like     the fileboolean of a fileselect, so you cannot change the colors of files that have     already been placed in a zone.
- The new color is applied immediately, the diskmap is refreshed.
- It is possible to change the colors more than once, for example using different     colors for every zone.
- It is not possible to use SetFileColor as a FileAction. The state of files     will change because of the FileActions, for example files will become unfragmented     while the Defragment() fileaction is working. The colors therefore have to be set     before (outside) the FileActions.
- Files go through the following states as they are being processed:     from "not(Selected) and not(Processed)", to     "Selected and not(Processed)", to "Selected and Processed", to "not(Selected) and Processed".
- See [**SetColor**](SetColor.md) for other color settings.

### Syntax

```mydfrg
// Outside a VolumeSelect:
SetFileColor(FILESTATE ,
NUMBER
 ,
NUMBER
 ,
NUMBER
)
// Inside a VolumeSelect:
SetFileColor(
FILEBOOLEAN
 , FILESTATE ,
NUMBER
 ,
NUMBER
 ,
NUMBER
)
```

### Parameters

| Files can be in one of 16 different states and each state has it's own color.     The FILESTATE parameter selects one or more of these colors.     There are 4 selectors to choose from (which combine into 16 different colors),     and they can be combined with AND, OR, NOT, and parenthesis, to select more     than 1 color simultaneously:  **Fragmented** Fragmented files.         Also see the [**Fragmented**](../FileBoolean/Fragmented.md) fileboolean.  **Movable** Files that could not be moved by the Windows defragmentation API.         All files are initially thought to be Movable and a file will only change into not Movable         after MyDefrag has failed to move it.         Also see the [**Unmovable**](../FileBoolean/Unmovable.md) fileboolean.  **Selected** Files that are selected for the current zone by FileSelect.  **Processed** Files that have been processed. Some FileActions will set a file to Processed         immediately after the file has been placed in a zone (for example the SortBy         actions), other FileActions (for example FastFill) will set all files together         to Processed when the entire zone has finished processing.  **All** All files.  **AND** Combine 2 selectors, for example "Fragmented and Movable".  **OR** Combine 2 selectors, for example "Fragmented or Movable".  **NOT** Negate a selector, for example "not(Movable)".  **(...)** Combine selectors, for example "Fragmented or (Movable and Selected)". | **Fragmented** | Fragmented files.         Also see the [**Fragmented**](../FileBoolean/Fragmented.md) fileboolean. | **Movable** | Files that could not be moved by the Windows defragmentation API.         All files are initially thought to be Movable and a file will only change into not Movable         after MyDefrag has failed to move it.         Also see the [**Unmovable**](../FileBoolean/Unmovable.md) fileboolean. | **Selected** | Files that are selected for the current zone by FileSelect. | **Processed** | Files that have been processed. Some FileActions will set a file to Processed         immediately after the file has been placed in a zone (for example the SortBy         actions), other FileActions (for example FastFill) will set all files together         to Processed when the entire zone has finished processing. | **All** | All files. | **AND** | Combine 2 selectors, for example "Fragmented and Movable". | **OR** | Combine 2 selectors, for example "Fragmented or Movable". | **NOT** | Negate a selector, for example "not(Movable)". | **(...)** | Combine selectors, for example "Fragmented or (Movable and Selected)". |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Fragmented** | Fragmented files.         Also see the [**Fragmented**](../FileBoolean/Fragmented.md) fileboolean. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **Movable** | Files that could not be moved by the Windows defragmentation API.         All files are initially thought to be Movable and a file will only change into not Movable         after MyDefrag has failed to move it.         Also see the [**Unmovable**](../FileBoolean/Unmovable.md) fileboolean. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **Selected** | Files that are selected for the current zone by FileSelect. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **Processed** | Files that have been processed. Some FileActions will set a file to Processed         immediately after the file has been placed in a zone (for example the SortBy         actions), other FileActions (for example FastFill) will set all files together         to Processed when the entire zone has finished processing. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **All** | All files. |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **AND** | Combine 2 selectors, for example "Fragmented and Movable". |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **OR** | Combine 2 selectors, for example "Fragmented or Movable". |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **NOT** | Negate a selector, for example "not(Movable)". |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| **(...)** | Combine selectors, for example "Fragmented or (Movable and Selected)". |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

### Example

```mydfrg
# JkDefrag v3 palette.
SetColor(Empty,0,0,0)
SetColor(Allocated,160,160,160)
SetColor(BusyRead,255,255,255)
SetColor(BusyWrite,255,255,255)
SetFileColor(All,0,255,0)
SetFileColor(Fragmented,255,255,0)
SetFileColor(not(Movable),255,0,0)
# MyDefrag v4 palette.
SetColor(Empty,0,0,0)                                   // Black
SetColor(Allocated,45,72,128)                           // Dark-blue
SetColor(BusyRead,255,255,255)                          // White
SetColor(BusyWrite,255,255,255)                         // White
SetFileColor(All,139,158,198)                           // Blue
SetFileColor(Processed,139,198,139)                     // Green
SetFileColor(Fragmented,229,229,0)                      // Yellow
SetFileColor(not(Movable),204,92,92)                    // Red
SetFileColor(Selected,175,198,247)                      // Light-blue
SetFileColor(Selected and Fragmented,255,255,0)         // Light-yellow
SetFileColor(Selected and not(Movable),255,115,115)     // Light-red
```

### See also:

[**SetColor**](SetColor.md)

[**Settings**](../Scripts/Settings.md)
