# FileBoolean - Hidden

Select all the items that have the "hidden" attribute set (yes) or not set (no).
  Hidden items are not included by Windows in an ordinary directory listing.

### Syntax

```mydfrg
Hidden(yes)
Hidden(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have the "hidden" attribute.
  Hidden(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
