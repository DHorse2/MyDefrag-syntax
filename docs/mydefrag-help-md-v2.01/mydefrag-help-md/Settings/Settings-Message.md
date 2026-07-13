## Settings - Message

Change a build-in English message (the first STRING) into another message (the second STRING). This setting works in combination with the [![ \* ](../img/Bullit.gif) **Language**](Settings-Language.md) setting and will store the new message in memory for the currently selected language. The message is only changed for the current instance of the program, it is not a permanent change.

Arguments in messages begin with a percent-sign "%", followed by a number, followed by "u" for an unsigned number or "s" for a string. The arguments may be reorganised based on the number. For example:

Message("I have found %1n files, containing %2n bytes.","Ik heb %2n bytes gevonden in %1n bestanden.")

Strings must be enclosed in single-quotes or double quotes, for example:

"......"

'......'

If enclosed by single-quotes then the string may not contain a single-quote.  
If enclosed by double-quotes then the string may not contain a double-quote.

### Syntax

|                                                                                                    |
|----------------------------------------------------------------------------------------------------|
| `Message(`[`STRING`](../Scripts/Scripts-STRING.md)` , `[`STRING`](../Scripts/Scripts-STRING.md)`)` |

### Example

|                                                          |
|----------------------------------------------------------|
| `Message("Finished with disk %1s","Klaar met disk %1s")` |

### See also:

[![ \* ](../img/Bullit.gif) **Language**](Settings-Language.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-Message.html`_
