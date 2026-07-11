# Settings - WindowSize

Change the size of the MyDefrag window.

- If the WindowSize setting is "invisible" then the program will ignore the     [**WhenFinished**](WhenFinished.md) "wait" setting, and will always "exit".

### Syntax

```mydfrg
WindowSize(PARAMETER)
```

### Parameters

| **restore** |  | Make the size and position of the MyDefrag window the same as the     last time the program was run with this option. |
| --- | --- | --- |
| **minimized** |  | Minimized. MyDefrag is only visible in the taskbar. |
| **maximized** |  | Maximized, using the entire screen. |
| **invisible** |  | Hide the MyDefrag window. |
| **fixed** |  | Change the size of the MyDefrag window to 600x400. |

### Example

```mydfrg
WindowSize(restore)
```

### See also:

[**Settings**](../Scripts/Settings.md)
