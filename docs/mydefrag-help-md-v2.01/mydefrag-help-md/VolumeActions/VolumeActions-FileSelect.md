## VolumeActions - FileSelect

The "FileSelect" keyword is the beginning of a FileSelect-FileActions-FileEnd structure, and is used inside the [![ \* ](../img/Bullit.gif) **VolumeActions**](../Scripts/Scripts-VolumeActions.md) to select one or more items (files, directories) with the [![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md), create a zone for those items, and then perform the [![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md) on the items.

- There will usually be more than one FileSelect-FileActions-FileEnd structure inside a VolumeAction. This will create multiple zones, each zone with it's own items. Items will be placed in the first possible zone, in other words, if an item has been selected by a FileBoolean then it will automatically not be selected by the next FileBooleans.
- Files that are selected with the global [![ \* ](../img/Bullit.gif) **ExcludeFiles**](../Settings/Settings-ExcludeFiles.md) setting are automatically excluded and will not be processed by FileSelect statements.

### Syntax

[TABLE]

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **VolumeActions**](../Scripts/Scripts-VolumeActions.md)  
[![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)  
[![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)  
[![ \* ](../img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md)

---

_Source HTML: `VolumeActions-FileSelect.html`_
