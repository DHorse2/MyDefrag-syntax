## Scripts - STRING

A string is sequence of characters, enclosed by single-quotes or by double-quotes.

- You can use [![ \* ](../img/Bullit.gif) **Variables**](Scripts-Variables.md) and [![ \* ](../img/Bullit.gif) **Macros**](Scripts-Macros.md) in a string by enclosing their name with exclamation marks, for example "using the !date! in a string". If they contain a number then the number will be automatically formatted according to the Windows locale settings. For example, the value "36272891" will be formatted as "36.272.891" if your computer is configured to use a dot as the thousands-separator.
- Strings may span multiple lines.
- There are no "escape" characters that are common in programming languages, such as the backslash. To use a single-quote inside a string you have to enclose the string in double-quotes, and to use a double-quote inside a string you have to enclose the string in single-quotes.
- **Warning:** Do not use forward quotes, as in \`hello' (the quote before hello is a forward quote, not the same as the back-quote just after hello). This will cause an error. Always use the single-quote (also known as back-quote) at both the beginning and end of the string, for example 'hello'.

### Syntax

[TABLE]

### Example

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md)

---

_Source HTML: `Scripts-STRING.html`_
