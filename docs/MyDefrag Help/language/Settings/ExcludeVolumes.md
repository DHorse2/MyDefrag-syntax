# Settings - ExcludeVolumes

Exclude a selection of volumes.

- The parameter is a [**VolumeBoolean**](../Scripts/VolumeBoolean.md) expression.     If the expression is TRUE then the disk will be skipped (ignored).
- Using the setting will replace any previous value. In other words, the setting     is valid from the point in the script where it is defined until the next ExcludeVolumes()     setting.

### Syntax

```mydfrg
ExcludeVolumes(
VOLUMEBOOLEAN
)
```

### Example

```mydfrg
# Exclude all cdroms.
ExcludeVolumes(Cdrom(yes))
# Exclude a volume by name.
ExcludeVolumes(Name("F:"))
# Exclude 2 volumes by name.
ExcludeVolumes(Name("F:") or Name("G:"))
```

### See also:

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**Settings**](../Scripts/Settings.md)
