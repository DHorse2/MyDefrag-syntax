# Settings - WriteLogfile

Write a text to a logfile. The contents of the logfile is completely replaced
  with the text (see

[**AppendLogfile**](AppendLogfile.md)

to append a text to a logfile).
  The first STRING is the name of the logfile, for
  example "C:\Program Files\MyDefrag v4.3.1\MyDefrag.log".
  The second STRING is the text to write to the logfile.

- See the [**Variables**](../Scripts/Variables.md) for a list of variables that can be used     in the text.
- The standard MyDefrag scripts create a logfile in the MyDefrag installation folder,     default is "C:\Program Files\MyDefrag v4.3.1\MyDefrag.log".  **Note:** Windows 7 is configured by default to deny regular users write-access to     the "C:\Program Files" folder, so MyDefrag cannot create a logfile there.

### Syntax

```mydfrg
WriteLogfile(
STRING
 ,
STRING
)
```

### Example

```mydfrg
# Write some basic information to the logfile.
WriteLogfile("MyDefrag.log","
  Total disk space:   !VolumeSize! bytes
  Bytes per cluster:  !BytesPerCluster! bytes
  Unfragmented Items: !FILES200N!
  Fragmented Items:   !FILES210N!
  Unfragmented Data:  !FILES202N! bytes
  Fragmented Data:    !FILES212N! bytes
  All Gaps:           !GAP00N!
  All gaps:           !GAP10N! bytes
  Average gap:        !GAP13N! bytes
  Median gap:         !GAP14N! bytes
  Biggest gap:        !GAP15N! bytes
  ")
```

### See also:

[**Variables**](../Scripts/Variables.md)

[**AppendLogfile**](AppendLogfile.md)

[**Settings**](../Scripts/Settings.md)
