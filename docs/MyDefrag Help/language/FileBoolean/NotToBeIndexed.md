# FileBoolean - NotToBeIndexed

Select all the items that have the "NotToBeIndexed" attribute set (yes) or not set (no).
  This attribute is used by the Windows content indexing service and indicates
  that the item is not to be indexed.

### Syntax

```mydfrg
NotToBeIndexed(yes)
NotToBeIndexed(no)
```

### Example

```mydfrg
FileSelect
  # Select all the items that have the "NotToBeIndexed" attribute.
  NotToBeIndexed(yes)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
