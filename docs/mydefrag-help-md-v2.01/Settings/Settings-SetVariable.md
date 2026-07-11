## Settings - SetVariable

Variables are little storage areas inside MyDefrag that have a name and a value. They can contain numbers or strings, and can be used in places such as [![ \* ](../img/Bullit.gif) **NUMBER**](../Scripts/Scripts-NUMBER.md) expressions and [![ \* ](../img/Bullit.gif) **STRING**](../Scripts/Scripts-STRING.md)'s.

### Syntax

|                             |
|-----------------------------|
| `SetVariable(NAME , VALUE)` |

- The NAME of a variable is a character a-z plus any number of characters a-z and/or numbers 0-9. Some examples: "abc", "x3", "month", "jha56ii7p".
- The VALUE of a variable can be a number or a string, MyDefrag will automatically convert as needed.
- Variables can be used inside a string by enclosing the name of the variable in exclamation marks. This is the same as with [![ \* ](../img/Bullit.gif) **Macros**](../Scripts/Scripts-Macros.md).
- [![ \* ](../img/Bullit.gif) **Macros**](../Scripts/Scripts-Macros.md) can be used like variables. MyDefrag automatically copies all the macros to the variables just before the script is executed.
- If you define a variable with the same name as a pre-defined variable then the pre-defined variable is overruled.
- There are no limits to the size, the number, or the contents of variables.

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **Variables**](../Scripts/Scripts-Variables.md)  
[![ \* ](../img/Bullit.gif) **Macros**](../Scripts/Scripts-Macros.md)  
[![ \* ](../img/Bullit.gif) **NUMBER**](../Scripts/Scripts-NUMBER.md)  
[![ \* ](../img/Bullit.gif) **STRING**](../Scripts/Scripts-STRING.md)  
[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-SetVariable.html`_
