## Settings - StatusBar

This setting controls which information areas are displayed above and below the diskmap.

- Default is "all".
- If no textlines are selected then the diskmap will fill the window.
- This setting is ignored by the screensaver. It has it's own setting, see the "Settings" button when selecting a Windows screensaver.

### Syntax

|                        |
|------------------------|
| `StatusBar(PARAMETER)` |

### Parameter

The PARAMETER is a space-separated list of zero or more of the following keywords:

|               |      |                                                                                                                                                   |
|---------------|------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| **Status**    |      | The status line at the top, with information such as the zone number, percentage complete, the action currently performed, and other information. |
| **Path**      |      | The second status line, just above the diskmap. It shows the path that is currently being processed.                                              |
| **MouseOver** |      | The textlines below the diskmap, with details about the file under the cursor.                                                                    |
| **All**       |      | The same as "Status Path MouseOver".                                                                                                              |

### Example

|                                    |
|------------------------------------|
| `StatusBar(Status Path MouseOver)` |

### See also:

[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-StatusBar.html`_
