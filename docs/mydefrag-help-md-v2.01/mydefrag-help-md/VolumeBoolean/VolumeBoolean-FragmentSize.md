## VolumeBoolean - FragmentSize

Select the volume if the average size per fragment is between the minimum (first number) and maximum (second number) of bytes. If a file has 2 fragments and is 100 bytes in size, then the average size per fragment is 50 bytes. If the second number is zero then the maximum is infinity.

NOTE: MyDefrag has to open the disk and analyze all the files so it can calculate the average size per fragment. This will take some time.

### Syntax

|                                                                                                         |
|---------------------------------------------------------------------------------------------------------|
| `FragmentSize(`[`NUMBER`](../Scripts/Scripts-NUMBER.md)` , `[`NUMBER`](../Scripts/Scripts-NUMBER.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **FragmentCount**](VolumeBoolean-FragmentCount.md)  
[![ \* ](../img/Bullit.gif) **VolumeSelect**](../Scripts/Scripts-VolumeSelect.md)  
[![ \* ](../img/Bullit.gif) **VolumeBoolean**](../Scripts/Scripts-VolumeBoolean.md)  
[![ \* ](../img/Bullit.gif) **VolumeActions**](../Scripts/Scripts-VolumeActions.md)

---

_Source HTML: `VolumeBoolean-FragmentSize.html`_
