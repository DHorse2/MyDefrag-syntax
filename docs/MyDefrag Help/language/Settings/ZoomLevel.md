# Settings - ZoomLevel

Set the zoom level of the MyDefrag diskmap display.

- If NUMBER is not a number in the zoomlevel pull-down menu, then the     menu will not show a selected zoomlevel.
- Setting the zoomlevel works best after the first [**VolumeSelect**](../Scripts/VolumeSelect.md)     or after [**WindowSize**](WindowSize.md).

### Syntax

```mydfrg
ZoomLevel(
NUMBER
)
```

### Parameters

| The zoom level, a positive integer number greater than zero. Default zoomlevel is 1. |
| --- |

### Example

```mydfrg
ZoomLevel(1024)
```

### See also:

[**Settings**](../Scripts/Settings.md)
