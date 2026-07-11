# Settings - Pause

Pause MyDefrag for a specified amount of time.

**Note:** This action is ignored (no pause) by the screen saver.

### Syntax

```mydfrg
Pause(
DATETIME
)
```

### Parameters

| Pause MyDefrag for a specified amount of time, or until the user presses space or     clicks the "continue" button on the MyDefrag display.     If the parameter is empty then the amount of time is infinite. |
| --- |

### Example

```mydfrg
# Pause for 5 seconds.
Pause(5)
# Pause until user clicks "continue".
Pause()
```

### See also:

[**Slowdown**](Slowdown.md)

[**Settings**](../Scripts/Settings.md)
