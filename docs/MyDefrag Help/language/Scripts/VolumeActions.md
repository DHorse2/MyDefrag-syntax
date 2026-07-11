# Scripts - VolumeActions

The VolumeActions keyword is part of the

[**VolumeSelect**](VolumeSelect.md)

structure and
  specifies the actions to be done on the selected volumes.
  There are several actions to choose from, but the basic
  workhorse is the

[**FileSelect**](../VolumeActions/FileSelect.md)

structure.

### Example

```mydfrg
VolumeSelect
  ....
VolumeActions
  ....
VolumeEnd
```

### Actions

| [**DeleteJournal**](../VolumeActions/DeleteJournal.md) |
| --- |
| [**DismountVolume**](../VolumeActions/DismountVolume.md) |
| [**FileSelect**](../VolumeActions/FileSelect.md) |
| [**MakeGap**](../VolumeActions/MakeGap.md) |
| [**ReclaimNtfsReservedAreas**](../VolumeActions/ReclaimNtfsReservedAreas.md) |
| [**Settings**](../VolumeActions/Settings.md) |

### See also:

[**VolumeSelect**](VolumeSelect.md)

[**VolumeBoolean**](VolumeBoolean.md)

[**Scripts**](../../manual/Scripts.md)
