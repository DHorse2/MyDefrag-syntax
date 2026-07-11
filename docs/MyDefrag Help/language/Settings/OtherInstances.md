# Settings - OtherInstances

This setting controls what MyDefrag will do when it detects that it is already
  running. The default setting is to "ask".

### Syntax

```mydfrg
OtherInstances(PARAMETER)
```

### Parameter

| **ask** |  | Ask the user what to do. The user will be presented with a pop-up window with "exit",     "continue", and "kill the other" buttons. The screensaver version of MyDefrag cannot     popup the window and this selection will behave the same as "kill". |
| --- | --- | --- |
| **allow** |  | MyDefrag will continue. |
| **exit** |  | MyDefrag will exit. |
| **kill** |  | MyDefrag will try to kill the other instance. |

### Example

```mydfrg
OtherInstances(ask)
```

### See also:

[**Settings**](../Scripts/Settings.md)
