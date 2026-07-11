# Settings - SetColor

Change the colors that are used on the display.

- It is possible to change the colors more than once, for example using different     colors for every zone.
- See [**SetFileColor**](SetFileColor.md) for more color settings.

### Syntax

```mydfrg
SetColor(COLORNAME ,
NUMBER
 ,
NUMBER
 ,
NUMBER
)
```

### Parameters

| Possible values for COLORNAME:  **Empty** Empty space of the disk.  **Allocated** Space that is in use on the disk by the NTFS reserved areas, or by unknown files.  **BusyRead** The file that is currently being read.  **BusyWrite** The file that is currently being written.  **Text** The color of the text in the information lines above and below the diskmap.      The three NUMBER's are the Red, Green, and Blue component of the color. Each NUMBER     must be from 0 to 255. | **Empty** | Empty space of the disk. | **Allocated** | Space that is in use on the disk by the NTFS reserved areas, or by unknown files. | **BusyRead** | The file that is currently being read. | **BusyWrite** | The file that is currently being written. | **Text** | The color of the text in the information lines above and below the diskmap. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Empty** | Empty space of the disk. |  |  |  |  |  |  |  |  |  |
| **Allocated** | Space that is in use on the disk by the NTFS reserved areas, or by unknown files. |  |  |  |  |  |  |  |  |  |
| **BusyRead** | The file that is currently being read. |  |  |  |  |  |  |  |  |  |
| **BusyWrite** | The file that is currently being written. |  |  |  |  |  |  |  |  |  |
| **Text** | The color of the text in the information lines above and below the diskmap. |  |  |  |  |  |  |  |  |  |

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

[**SetFileColor**](SetFileColor.md)

[**Settings**](../Scripts/Settings.md)
