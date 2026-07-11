## FAQ Using - What are the colors on the diskmap?

The default colors are the following. Please note that it is possible to customize the colors per script and even per section of the script, so in your case the colors may be different.

|      |              |                                                                                                                                                                                                              |
|------|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|      | Black        | Empty space of the disk.                                                                                                                                                                                     |
|      | Dark-blue    | Allocated. This can be the NTFS reserved areas, or space that is in use on the disk but MyDefrag does not know by which file.                                                                                |
|      | Blue         | Unfragmented files.                                                                                                                                                                                          |
|      | Light-blue   | Currently selected unfragmented files.                                                                                                                                                                       |
|      | Yellow       | Fragmented files.                                                                                                                                                                                            |
|      | Light-yellow | Currently selected fragmented files.                                                                                                                                                                         |
|      | Red          | Unmovable. Files that could not be moved by the Windows defragmentation API. All files are initially "movable", a file will only become red after MyDefrag has unsuccesfully tried to move or defragment it. |
|      | Light-red    | Currently selected unmovable files.                                                                                                                                                                          |
|      | Green        | Finished files.                                                                                                                                                                                              |
|      | White        | The file that is currently being read.                                                                                                                                                                       |
|      | White        | The file that is currently being written.                                                                                                                                                                    |

**Tip:** Move the mouse crosshairs over the diskmap and you will see details about the file in text just below the diskmap.

### See also:

[![ \* ](img/Bullit.gif) **SetColor**](../Settings/Settings-SetColor.md)  
[![ \* ](img/Bullit.gif) **SetFileColor**](../Settings/Settings-SetFileColor.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-WhatAreTheColorsOnTheDiskmap.html`_
