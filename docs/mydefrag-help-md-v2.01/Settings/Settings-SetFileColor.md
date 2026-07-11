## Settings - SetFileColor

Change the colors that are used to draw files in the diskmap window.

- **Note:** There are 2 versions of this command. One can only be used outside a VolumeSelect (for example in the Settings.MyD file), and the other can only be used inside a VolumeSelect. MyDefrag will popup a syntax error if you try to use wrong one.
- Files can be in one of 16 different states and each state has it's own color. The FILESTATE parameter selects one or more of these states.
- The color is specified by the three NUMBER's, the red, green, and blue component of the color. Each NUMBER must be from 0 to 255.
- Inside a VolumeSelect it is possible to select a set of files with the FILEBOOLEAN. The new color is only applied to the selected files. It is for example possible to set the color of all the "\*.mp3" files, or the files in a specific folder, or even a single file. The boolean will only select files that have not yet been processed, just like the fileboolean of a fileselect, so you cannot change the colors of files that have already been placed in a zone.
- The new color is applied immediately, the diskmap is refreshed.
- It is possible to change the colors more than once, for example using different colors for every zone.
- It is not possible to use SetFileColor as a FileAction. The state of files will change because of the FileActions, for example files will become unfragmented while the Defragment() fileaction is working. The colors therefore have to be set before (outside) the FileActions.
- Files go through the following states as they are being processed: from "not(Selected) and not(Processed)", to "Selected and not(Processed)", to "Selected and Processed", to "not(Selected) and Processed".
- See [![ \* ](../img/Bullit.gif) **SetColor**](Settings-SetColor.md) for other color settings.

### Syntax

[TABLE]

### Parameters

[TABLE]

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **SetColor**](Settings-SetColor.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-SetFileColor.html`_
