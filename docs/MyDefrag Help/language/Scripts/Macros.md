# Scripts - Macros

Macros are constants that contain a string. They are defined
  outside MyDefrag and can be used to pass anything into a script. MyDefrag will
  load a script from disk into memory, look in the script for strings enclosed in
  exclamation marks and replace them (including the exclamation marks) with the value
  of the macro, and will then execute the script. Macros can therefore
  contain literal script code, and anything else such as strings or numbers.

There are 2 ways to define macros for MyDefrag. The first is with the "-m" commandline parameter, see the "Commandline" chapter on the [**Scripts**](../../manual/Scripts.md) manual page. The second way is with the Windows environment settings. All environment settings are automatically loaded by MyDefrag as a macro. Environment strings can be manipulated with the Windows "set" command (enter "set" in a Command Prompt window) or via "Control Panel -> System -> Advanced -> Environment Variables". Enviroment strings are commonly used to define permanent MyDefrag macros used by many scripts, the "-m" commandline option is more useful for macros that need to be changed per script.

- Unknown or undefined macros will not be replaced and will usually generate a     syntax error. This is by design, so you will get a warning when you forget     to start a script with a macro.
- Macros may be nested, that is, the value of a macro may contain another     macro.
- There are no limits to the size, the number, or the content of macros.
- Macros that are specified with the "-m" commandline parameter will overrule     (replace) the environment macros.
- It is possible to define a variable (see [**Variables**](Variables.md))     with the same name as a macro. Please note that macros are replaced immediately     after loading a script and before the script is executed, so defining a variable     will not alter the behavior of the macro.

### Example

```mydfrg
# This commandline defines a macro called "WHENFINISHED":
#     MyDefrag.exe -m "WHENFINISHED=exit"
# The macro is used in a script by enclosing it's name with exclamation marks:
WhenFinished(!WHENFINISHED!)
```

## The "!include PATH!" macro

MyDefrag can use (include) the contents of another file as if it is part of the
script. When MyDefrag encounters "!include PATH!" in a script then it will replace
it (including the exclamation marks) by the contents of the file specified
by PATH. The PATH is handled exactly the same as the parameter of the

[**RunScript**](../Settings/RunScript.md)

command.

### Example

```mydfrg
# The "snippet.txt" file contains a big fileboolean:
FileSelect
  !include "snippet.txt"!
FileActions
  ....
FileEnd
```

### See also:

[**Variables**](Variables.md)

[**Settings**](Settings.md)
