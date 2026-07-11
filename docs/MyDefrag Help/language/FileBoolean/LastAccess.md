# FileBoolean - LastAccess

Select all the items that have a last access time
  between the minimum time (first parameter) and the maximum time (second parameter).
  If the first parameter is empty then the minimum time is the beginning of time.
  If the second parameter is empty then the maximum time is infinity.

- See the [**LastAccessEnabled**](LastAccessEnabled.md) fileboolean to test     if Windows is configured to record (update) the last access times.
- Some improperly programmed utilities cause a change in the last access time of     all items on the disk when they scan the disk. Examples are virus scanners,     backup programs, text indexers.
- On FAT volumes the resolution of the last access time is 1 day.     NTFS delays updates to the last access time by up to one hour.

### Syntax

```mydfrg
LastAccess(
DATETIME
 ,
DATETIME
)
```

### Example

```mydfrg
FileSelect
  # Select all the items that were accessed less than 10 days ago.
  LastAccessEnabled(yes) and LastAccess(10 days ago,now)
FileActions
  ....
FileEnd
```

### See also:

[**LastAccessEnabled**](LastAccessEnabled.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
