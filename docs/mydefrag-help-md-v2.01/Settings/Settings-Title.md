## Settings - Title

The title of the script. This string will be displayed in the script chooser (together with the [![ \* ](../img/Bullit.gif) **Description**](Settings-Description.md)) and in the top bar of the MyDefrag window. If a script does not have a title then it will not be listed in the script chooser.

- If you add translations of your STRING text to the "Settings.MyD" file (or if you choose a text that is already there) then the translation will be displayed.
- If you use a variable in the STRING then the title will not change when the variable changes. For example, if you use the ZoneNumber variable in the STRING then the title will be set to the current zone number, and will not change later when the zone number changes.
- MyDefrag will always show it's name and version number in the top bar, before the script title.

### Syntax

|                                                     |
|-----------------------------------------------------|
| `Title(`[`STRING`](../Scripts/Scripts-STRING.md)`)` |

### Example

|                            |
|----------------------------|
| `Title("Optimize Weekly")` |

### See also:

[![ \* ](../img/Bullit.gif) **Description**](Settings-Description.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-Title.html`_
