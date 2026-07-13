## Settings - AppendLogfile

Append a text to a logfile (see [![ \* ](../img/Bullit.gif) **WriteLogfile**](Settings-WriteLogfile.md) to replace the text in the logfile). The first STRING is the name of the logfile, for example "C:\Program Files\MyDefrag\MyDefrag.log". The second STRING is the text to be appended to the logfile.

- See the [![ \* ](../img/Bullit.gif) **Variables**](../Scripts/Scripts-Variables.md) for a list of variables that can be used in the text.
- The standard MyDefrag scripts create a logfile in the MyDefrag installation folder, default is "C:\Program Files\MyDefrag v4.3.1\MyDefrag.log".  
  **Note:** Windows 7 is configured by default to deny regular users write-access to the "C:\Program Files" folder, so MyDefrag cannot create a logfile there.

### Syntax

|                                                                                                          |
|----------------------------------------------------------------------------------------------------------|
| `AppendLogfile(`[`STRING`](../Scripts/Scripts-STRING.md)` , `[`STRING`](../Scripts/Scripts-STRING.md)`)` |

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **Variables**](../Scripts/Scripts-Variables.md)  
[![ \* ](../img/Bullit.gif) **WriteLogfile**](Settings-WriteLogfile.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-AppendLogfile.html`_
