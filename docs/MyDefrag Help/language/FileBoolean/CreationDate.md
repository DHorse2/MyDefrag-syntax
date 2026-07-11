# FileBoolean - CreationDate

Select all the items that were created
  between the minimum time (first parameter) and the maximum time (second parameter).
  If the first parameter is empty then the minimum time is the beginning of time.
  If the second parameter is empty then the maximum time is infinity.

- The creation date can be newer than the last-changed date, for example when     a file was downloaded, or unpacked from an archive (such as zip or arj).

### Syntax

```mydfrg
CreationDate(
DATETIME
 ,
DATETIME
)
```

### Example

```mydfrg
FileSelect
  # Select all the items that were created less than 10 days ago.
  CreationDate(10 days ago,now)
FileActions
  ....
FileEnd
```

### See also:

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
