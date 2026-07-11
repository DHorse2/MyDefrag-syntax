# VolumeBoolean - Name

Select the volume if it's name matches the STRING. The string may
  contain wildcard characters "*" (zero or more characters) or "?" (a single character).

- The function compares the STRING with the full volume mountpoint (for example     "C:\"), short volume mountpoint (for example "C" and "C:"), with     the volume name (for example "\\?\Volume{08439462-3004-11da-bbca-806d6172696f}"),     and with the device name (for example "\Device\HarddiskVolume1").
- The mountpoint of a volume can be a folder on another volume,     for example "C:\Users\".
- To get a list of all volumes on the computer enter "mountvol" in a command     prompt window.
- See the [**Label**](Label.md) volumeboolean to select volumes by     their label.

### Syntax

```mydfrg
Name(
STRING
)
```

### Example

```mydfrg
VolumeSelect
  Name("c:") or Name("d:")
VolumeActions
  ...
VolumeEnd
```

### See also:

[**Label**](Label.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
