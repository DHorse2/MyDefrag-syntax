# Settings - BatteryPower

This setting controls what MyDefrag will do when it detects that the
  computer is running on battery power. The default setting for the regular MyDefrag
  is to "ask", the default for the screensaver MyDefrag is to "exit".

### Syntax

```mydfrg
BatteryPower(PARAMETER)
```

### Parameter

| **ask** |  | Ask the user what to do. The user will be presented with a pop-up window with "Stop MyDefrag"     and "Continue" buttons.  **Note:** the screensaver version of MyDefrag will treat this option the       same as "exit". |
| --- | --- | --- |
| **allow** |  | MyDefrag will not check if the computer is running on battery power. |
| **exit** |  | MyDefrag will quietly exit (no popup message). |

### Example

```mydfrg
BatteryPower(ask)
```

### See also:

[**Settings**](../Scripts/Settings.md)
