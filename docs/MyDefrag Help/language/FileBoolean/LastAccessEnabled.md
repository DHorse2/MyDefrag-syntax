# FileBoolean - LastAccessEnabled

Select the items if Windows is configured to record (update) the last
  access times. This fileboolean is designed to be used together with the

[**LastAccess**](LastAccess.md)

fileboolean.

Windows XP and Vista have a setting to enable/disable the recording (updating) of the last access times of files. On Vista the default setting is not to record the last access times. You can enable or disable the Windows setting from a commandline with the "fsutil" command:

| See current setting: | fsutil behavior query disablelastaccess |
| --- | --- |
| Enable recording of last access time: | fsutil behavior set disablelastaccess 0 |
| Disable recording of last access time: | fsutil behavior set disablelastaccess 1 |

### Syntax

```mydfrg
LastAccessEnabled(yes)
LastAccessEnabled(no)
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

[**LastAccess**](LastAccess.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
