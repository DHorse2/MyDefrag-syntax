## Scripts - VolumeSelect

The "VolumeSelect" keyword is the start of a VolumeSelect-VolumeActions-VolumeEnd structure. The structure will select one or more volumes (disks) with the [![ \* ](../img/Bullit.gif) **VolumeBoolean**](Scripts-VolumeBoolean.md) and then perform the [![ \* ](../img/Bullit.gif) **VolumeActions**](Scripts-VolumeActions.md) on the selected volumes.

- The VolumeSelect structure can appear multiple times in a script.
- Volumes are processed only once in a script. If a volume has been processed by a VolumeSelect, then it will not be processed again by a subsequent VolumeSelect.
- The VolumeSelect-VolumeActions-VolumeEnd structure cannot be nested, that is, the structure cannot be used inside itself.
- Volumes that are selected with the global [![ \* ](../img/Bullit.gif) **ExcludeVolumes**](../Settings/Settings-ExcludeVolumes.md) setting are automatically excluded and will not be selected and/or processed by VolumeSelect statements.

### Syntax

[TABLE]

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **VolumeBoolean**](Scripts-VolumeBoolean.md)  
[![ \* ](../img/Bullit.gif) **VolumeActions**](Scripts-VolumeActions.md)  
[![ \* ](../img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md)

---

_Source HTML: `Scripts-VolumeSelect.html`_
