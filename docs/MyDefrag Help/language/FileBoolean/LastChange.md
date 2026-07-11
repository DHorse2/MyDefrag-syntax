# FileBoolean - LastChange

Select all the items that were changed
  between the minimum time (first parameter) and the maximum time (second parameter).
  If the first parameter is empty then the minimum time is the beginning of time.
  If the second parameter is empty then the maximum time is infinity.

- The last-changed date can be older than the creation date, for example when     a file was downloaded, or unpacked from an archive (such as zip or arj).

### Syntax

```mydfrg
LastChange(
DATETIME
 ,
DATETIME
)
```

### Example

```mydfrg
FileSelect
  # Select all the items that were changed less than 10 days ago.
  LastChange(10 days ago,now)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
