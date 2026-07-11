# Settings - SetScreenSaver

Instruct Windows to turn the screensaver off, so the screensaver will not
  start while MyDefrag is running, or re-activate the screensaver. This MyDefrag
  setting will do nothing if no screensaver is configured in Windows.

- This setting will not work on all computers. Windows does not have a reliable     method to block the screensaver.
- MyDefrag will do an automatic SetScreenSaver(reset) when it finishes, in case     there is only a SetScreenSaver(off) without the accompanying SetScreenSaver(reset).

### Syntax

```mydfrg
SetScreenSaver(off)
SetScreenSaver(reset)
```

### Example

```mydfrg
# Turn screensaver off.
SetScreenSaver(off)
....
# Turn screensaver back on.
SetScreenSaver(reset)
```

### See also:

[**SetScreenPowerSaver**](SetScreenPowerSaver.md)

[**Settings**](../Scripts/Settings.md)
