# Settings - MaxRunTime

Run until a maximum DATETIME. When the time expires MyDefrag will stop
  processing and jump to the next MaxRunTime, or to the end of the block in which
  the MaxRunTime occurs, whichever comes first.

- If MaxRunTime() is placed inside a FileActions-FileEnd then it will jump     to the next MaxRunTime() or to the FileEnd, whichever comes first. For example:    FileSelect     ....   FileActions     ....     MaxRunTime(1 hour)       /* From here until next MaxRunTime(). */     ....     MaxRunTime(1 hour)       /* From here until FileEnd. */     ....   FileEnd
- If MaxRunTime() is placed inside a VolumeActions-VolumeEnd then it will jump     to the next MaxRunTime() at the same level (ignoring MaxRunTime() inside     FileActions-FileEnd), or to the VolumeEnd, whichever comes first. For example:    VolumeSelect     ....   VolumeActions     ....     MaxRunTime(1 hour)       /* From here until next MaxRunTime(). */     ....     FileSelect       ....     FileActions       ....                /* MaxRunTime's in here are independent. */     FileEnd     ....     MaxRunTime(1 hour)       /* From here until VolumeEnd. */     ....   VolumeEnd
- If MaxRunTime() is placed outside a VolumeActions-VolumeEnd then it will jump     to the next outside MaxRunTime(), and if there is none then to the end of the     script. For example:    MaxRunTime(1 hour)         /* From here until end of the script. */   ...   VolumeSelect     ....   VolumeActions     ....                  /* MaxRunTime's in here are independent. */   VolumeEnd   ...

### Syntax

```mydfrg
MaxRunTime(
DATETIME
)
```

### Parameters

| The date/time until when MyDefrag is allowed to run. When the time expires     MyDefrag will stop execution and jump to the end of the block.     If the parameter is empty then MyDefrag will run until completion.. |
| --- |

### Example

```mydfrg
MaxRunTime(1 hour)
```

### See also:

[**Settings**](../Scripts/Settings.md)
