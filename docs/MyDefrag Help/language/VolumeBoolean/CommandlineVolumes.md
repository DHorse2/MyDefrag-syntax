# VolumeBoolean - CommandlineVolumes

Select the volume if it's name or mountpoint matches a string that
  was specified on the MyDefrag.exe

[](../../manual/Scripts.md)

[**commandline.**](../../manual/Scripts.md)

The strings may contain wildcard characters "*" (zero or more characters) or "?"
  (a single character). If no volumes were specified on the commandline then
  this function returns TRUE.

- In Windows terminology the mountpoint of a volume is a string that looks like     "C:", and the volume name is a string that looks like     "\?\Volume{08439462-3004-11da-bbca-806d6172696f}".

### Syntax

```mydfrg
CommandlineVolumes()
```

### Example

```mydfrg
VolumeSelect
  CommandlineVolumes()
  and Removable(no)
  and Writable(yes)
  and Mounted(yes)
VolumeActions
  ...
VolumeEnd
```

### See also:

[**Name**](Name.md)

[**Label**](Label.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
