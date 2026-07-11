# Settings - AppendLogfile

Append a text to a logfile (see

[**WriteLogfile**](WriteLogfile.md)

to replace the text
  in the logfile). The first STRING is the name of the logfile, for
  example "C:\Program Files\MyDefrag\MyDefrag.log".
  The second STRING is the text to be appended to the logfile.

- See the [**Variables**](../Scripts/Variables.md) for a list of variables that can be     used in the text.
- The standard MyDefrag scripts create a logfile in the MyDefrag installation folder,     default is "C:\Program Files\MyDefrag v4.3.1\MyDefrag.log".  **Note:** Windows 7 is configured by default to deny regular users write-access to     the "C:\Program Files" folder, so MyDefrag cannot create a logfile there.

### Syntax

```mydfrg
AppendLogfile(
STRING
 ,
STRING
)
```

### Example

```mydfrg
# Append a line to a comma-separated logfile.
AppendLogfile("MyDefrag.log",
  "'!Date!','!Time!','!MountPoint!',!FILES200N!,!FILES210N!,!FILES202N!,!FILES212N!")
```

### See also:

[**Variables**](../Scripts/Variables.md)

[**WriteLogfile**](WriteLogfile.md)

[**Settings**](../Scripts/Settings.md)
