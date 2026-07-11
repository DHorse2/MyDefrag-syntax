# VolumeBoolean - Label

Select the volume if it's label matches the STRING. The string may
  contain wildcard characters "*" (zero or more characters) or "?" (a single character).

- The label of a volume is a small text that you have attached to the volume. The     drive-letter is not a label, but the name of a volume, see the     [**Name**](Name.md) volumeboolean.
- Unmounted volumes (for example floppies and cdroms) do not have a label.

### Syntax

```mydfrg
Label(
STRING
)
```

### Example

```mydfrg
VolumeSelect
  Label("Data")
VolumeActions
  ...
VolumeEnd
```

### See also:

[**Name**](Name.md)

[**VolumeSelect**](../Scripts/VolumeSelect.md)

[**VolumeBoolean**](../Scripts/VolumeBoolean.md)

[**VolumeActions**](../Scripts/VolumeActions.md)
