# Scripts - VolumeSelect

The "VolumeSelect" keyword is the start of a VolumeSelect-VolumeActions-VolumeEnd structure.
The structure will select one or more volumes (disks) with the

[**VolumeBoolean**](VolumeBoolean.md)

and then perform the

[**VolumeActions**](VolumeActions.md)

on the selected volumes.

- The VolumeSelect structure can appear multiple times in a script.
- Volumes are processed only once in a script. If a volume has been processed   by a VolumeSelect, then it will not be processed again by a subsequent VolumeSelect.
- The VolumeSelect-VolumeActions-VolumeEnd structure cannot be nested, that is,   the structure cannot be used inside itself.
- Volumes that are selected with the global [**ExcludeVolumes**](../Settings/ExcludeVolumes.md)   setting are automatically excluded and will not be selected and/or processed by   VolumeSelect statements.

### Syntax

```mydfrg
VolumeSelect
  ....
VolumeActions
  ....
VolumeEnd
```

See: [VolumeBoolean](VolumeBoolean.md)
See: [VolumeActions](VolumeActions.md)

### Example

```mydfrg
# Select all volumes, all files on those volumes, and defragment those files.
VolumeSelect
  All
VolumeActions
  FileSelect
    All
  FileActions
    Defragment()
  FileEnd
VolumeEnd
```

### See also:

[**VolumeBoolean**](VolumeBoolean.md)

[**VolumeActions**](VolumeActions.md)

[**Scripts**](../../manual/Scripts.md)
