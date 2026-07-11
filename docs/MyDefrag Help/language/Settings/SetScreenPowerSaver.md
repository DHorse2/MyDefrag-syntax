# Settings - SetScreenPowerSaver

Instruct Windows to turn the screen power saving off, so the screen will not
  power-off while MyDefrag is running, or re-activate screen power saving. This
  MyDefrag setting will do nothing if screen power saving is not configured in Windows.

- This setting will not work on all computers. Windows does not have a reliable     method to turn off screen power saving.
- MyDefrag will do an automatic SetScreenPowerSaver(reset) when it finishes, in case     there is only a SetScreenPowerSaver(off) without the accompanying SetScreenPowerSaver(reset).

### Syntax

```mydfrg
SetScreenPowerSaver(off)
SetScreenPowerSaver(reset)
```

### Example

```mydfrg
# Turn screen power saving off.
SetScreenPowerSaver(off)
....
# Turn screen power saving back on.
SetScreenPowerSaver(reset)
```

### See also:

[**SetScreenSaver**](SetScreenSaver.md)

[**Settings**](../Scripts/Settings.md)
