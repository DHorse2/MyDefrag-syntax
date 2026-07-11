# Settings - Slowdown

Change the speed of MyDefrag.

### Syntax

```mydfrg
Slowdown(
NUMBER
)
```

### Parameters

| Slow down to NUMBER percent (floating point 1...100) of maximum speed at which     MyDefrag normally performs.     Default is 100. Please note that maximum speed is not 100% of the computer.     Even if MyDefrag is running at maximum speed     (NUMBER is 100) then other programs will still be able to run, albeit slower     than normal. |
| --- |

### Example

```mydfrg
# Slowdown to 80% of normal speed.
Slowdown(80)
```

### See also:

[**ProcessPriority**](ProcessPriority.md)

[**Pause**](Pause.md)

[**Settings**](../Scripts/Settings.md)
