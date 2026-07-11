# Settings - SetVariable

Variables are little storage areas inside MyDefrag that have a name and a value.
  They can contain numbers or strings, and can be used in places such as

[**NUMBER**](../Scripts/NUMBER.md)

expressions and

[**STRING**](../Scripts/STRING.md)

's.

### Syntax

```mydfrg
SetVariable(NAME , VALUE)
```

- The NAME of a variable is a character a-z plus any number of characters a-z and/or numbers 0-9.     Some examples: "abc", "x3", "month", "jha56ii7p".
- The VALUE of a variable can be a number or a string, MyDefrag will automatically     convert as needed.
- Variables can be used inside a string by enclosing the name of the variable in     exclamation marks. This is the same as with [**Macros**](../Scripts/Macros.md).
- [**Macros**](../Scripts/Macros.md) can be used like variables. MyDefrag automatically     copies all the macros to the variables just before the script is executed.
- If you define a variable with the same name as a pre-defined variable then the     pre-defined variable is overruled.
- There are no limits to the size, the number, or the contents of variables.

### Example

```mydfrg
# Create a variable named "MyNumber" and store the number "1" in it.
SetVariable(MyCounter,1)
# Create a variable named "TheMonth" and store the string "januari" in it.
SetVariable(TheMonth,"januari")
# Using variables inside a string.
SetVariable(Color,"blue")
SetVariable(Message,"The month is !TheMonth! and the color is !Color!.")
```

### See also:

[**Variables**](../Scripts/Variables.md)

[**Macros**](../Scripts/Macros.md)

[**NUMBER**](../Scripts/NUMBER.md)

[**STRING**](../Scripts/STRING.md)

[**Settings**](../Scripts/Settings.md)
