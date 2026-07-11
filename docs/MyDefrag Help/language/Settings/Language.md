# Settings - Language

Select a language. After this setting the program will display all texts in the
  selected language. If there is no translation available then the english message
  will be used.
  If the Language() setting is followed by Message() settings then those messages
  will be saved as translations for the selected Language.

### Syntax

```mydfrg
Language(
STRING
)
```

### Parameters

| A text string (see [STRING](../Scripts/STRING.md)) that describes the language. For example "english". |
| --- |

### Example

```mydfrg
Language("english")
```

### See also:

[**Message**](Message.md)

[**Settings**](../Scripts/Settings.md)
