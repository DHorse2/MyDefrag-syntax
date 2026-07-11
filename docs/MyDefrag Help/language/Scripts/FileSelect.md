# Scripts - FileSelect

The "FileSelect" keyword is the beginning of a FileSelect-FileActions-FileEnd
structure, and is used inside the

[**VolumeActions**](VolumeActions.md)

to select one or more items (files, directories) with the

[**FileBoolean**](FileBoolean.md)

,
create a zone for those items, and then perform the

[**FileActions**](FileActions.md)

on the items.

- There will usually be more than one FileSelect-FileActions-FileEnd structure   inside a VolumeAction. This will create multiple zones, each zone with it's own   items. Items will be placed in the first possible zone, in other words,   if an item has been selected by a FileBoolean then it will automatically   not be selected by the next FileBooleans.
- Files that are selected with the global [**ExcludeFiles**](../Settings/ExcludeFiles.md)   setting are automatically excluded and will not be processed by FileSelect statements.

### Syntax

```mydfrg
FileSelect
  ....
FileActions
  ....
FileEnd
```

See: [FileBoolean](FileBoolean.md)
See: [FileActions](FileActions.md)

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

[**VolumeActions**](VolumeActions.md)

[**FileBoolean**](FileBoolean.md)

[**FileActions**](FileActions.md)

[**Scripts**](../../manual/Scripts.md)
