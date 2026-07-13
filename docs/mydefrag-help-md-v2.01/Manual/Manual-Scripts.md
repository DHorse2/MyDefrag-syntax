## Scripts

MyDefrag comes with a collection of completely automatic scripts that cover the needs of most users, see the [![ \* ](../img/Bullit.gif) **Using MyDefrag**](Manual-UsingMyDefrag.md) chapter. You will only have to look at scripting if you have special wishes.

[![ \* ](../img/Bullit.gif)](#Script%20language%20reference) [**Script language reference**](#Script%20language%20reference)  
[![ \* ](../img/Bullit.gif)](#A%20simple%20script) [**A simple script**](#A%20simple%20script)  
[![ \* ](../img/Bullit.gif)](#Zones) [**Zones**](#Zones)  
[![ \* ](../img/Bullit.gif)](#Running%20a%20script) [**Running a script**](#Running%20a%20script)  
[![ \* ](../img/Bullit.gif)](#Commandline) [**Commandline**](#Commandline)  
[![ \* ](../img/Bullit.gif)](#The%20Settings.MyD%20script) [**The "Settings.MyD" script**](#The%20Settings.MyD%20script)  
[![ \* ](../img/Bullit.gif)](#Other%20things%20to%20know%20about%20scripts) [**Other things to know about scripts**](#Other%20things%20to%20know%20about%20scripts)  

## Script language reference

The MyDefrag scripting language was specially designed for defragmentation and optimization purposes. It is not a programming language, but a parameter passing language, and is therefore very straightforward and easy to use yet allows for some very complex and sophisticated disk optimizations. The program checks every script before running it, there is absolutely no way that you can damage your disks by making a mistake in a script.

|                                                                                                   |
|---------------------------------------------------------------------------------------------------|
| [![ \* ](../img/Bullit.gif) **VolumeSelect**](../Scripts/Scripts-VolumeSelect.md)                 |
| [![ \* ](../img/Bullit.gif) **VolumeBoolean**](../Scripts/Scripts-VolumeBoolean.md)               |
| [![ \* ](../img/Bullit.gif) **VolumeActions**](../Scripts/Scripts-VolumeActions.md)               |
| [![ \* ](../img/Bullit.gif) **FileSelect**](../Scripts/Scripts-FileSelect.md)                     |
| [![ \* ](../img/Bullit.gif) **FileBoolean**](../Scripts/Scripts-FileBoolean.md)                   |
| [![ \* ](../img/Bullit.gif) **FileActions**](../Scripts/Scripts-FileActions.md)                   |
| [![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)                         |
| [![ \* ](../img/Bullit.gif) **Variables**](../Scripts/Scripts-Variables.md)                       |
| [![ \* ](../img/Bullit.gif) **Macros**](../Scripts/Scripts-Macros.md)                             |
| [![ \* ](../img/Bullit.gif) **STRING**](../Scripts/Scripts-STRING.md)                             |
| [![ \* ](../img/Bullit.gif) **NUMBER**](../Scripts/Scripts-NUMBER.md)                             |
| [![ \* ](../img/Bullit.gif) **DATETIME**](../Scripts/Scripts-DATETIME.md)                         |
| [![ \* ](../img/Bullit.gif) **Formal script grammar**](../Scripts/Scripts-FormalScriptGrammar.md) |

## A simple script

Scripts are text files that tell MyDefrag what to do. The lines in the text file are executed one by one, from top to bottom. Here is a small example of a script:

[TABLE]

This example script begins with a setting, in this case the Slowdown() setting. After the setting there is a VolumeSelect-VolumeActions-VolumeEnd statement. There can be more than 1 of these in a script, but most scripts will have only 1. The VolumeSelect statement is the basic workhorse in a script, it specifies which volumes (disks) are to be processed (in this case "All") and the actions to perform on those volumes.

Inside the VolumeSelect statement is a FileSelect-FileActions-FileEnd statement. Most VolumeSelect statements will have more than 1 FileSelect statements, this is just a basic example. The FileSelect specifies which files are to be processed (in this case "All") and what to do with them (in this case "Defragment").

So, this small example script will set the Slowdown setting, and will Defragment all the files on all the volumes.

## Zones

MyDefrag organizes all the files on a volume into "zones". The first zone is placed at the beginning of the volume, the second zone after the first zone, the third zone after that, etcetera. In the script you select the files that go into each zone and what actions are performed on those files.

[TABLE]

This script defines 2 zones, first a zone with all the mp3 files, and then a zone with all the other stuff on the volume. The first zone will be sorted by name by the SortByName() function, the second zone will FastFill the gaps.

Items (files, directories) are placed in the first possible zone. In the above example we select "All" files for the second zone, but this actually means "all remaining files". The mp3 files have already been placed in the first zone and are therefore not selected again.

## Running a script

There are many ways to run a MyDefrag script:

- Make sure the script is in the "Scripts" folder in the MyDefrag installation directory, and that it has a [![ \* ](../img/Bullit.gif) **Title**](../Settings/Settings-Title.md) and a [![ \* ](../img/Bullit.gif) **Description**](../Settings/Settings-Description.md). It will then show up in the MyDefrag chooser, when you run MyDefrag.
- Double-click a script. You can for example place your script on the desktop, or you can use Windows Explorer to navigate to the folder that contains your script. The MyDefrag installer creates an association between the ".MyD" extension and the MyDefrag script interpreter, so double-clicking a script will automatically open the interpreter and run the script.
- Drag-and-drop a script onto the MyDefrag interpreter (the MyDefrag icon on your desktop).
- Enter the name of a MyDefrag script on a commandline just like an executable program. For example "Weekly.MyD". You can do the same in all places where you can enter the name of a program, such as .BAT files, .CMD files, or in any kind of programming language that can execute Windows commandlines (for example the PHP system() function).
- Run the MyDefrag interpreter ("MyDefrag.exe") with the name of a script as a parameter, for example "MyDefrag.exe Weekly.MyD".
- Create a shortcut to the MyDefag.exe interpreter, then open the properties of the shortcut and add the name of a script to the end of the "target" line.
- Create a scheduled task, see [![ \* ](../img/Bullit.gif) **How do I schedule a task, to run automatically every day?**](../FAQUsing/FAQUsing-HowDoIScheduleATaskToRunAutomaticallyEveryDay.md)

## Commandline

The MyDefrag script interpreter ("c:\Program Files\MyDefrag v4.3.1\MyDefrag.exe") accepts the following commandline parameters. The parameters can also be used with scripts, for example "Weekly.MyD -v C:".

[TABLE]

## The "Settings.MyD" script

MyDefrag will run a configuration script called "Settings.MyD" before running your script. It contains default settings, translations for all the text messages that MyDefrag can show on the display, and more. The script has the exact same syntax as a regular script and can contain the exact same commands.

## Other things to know about scripts

- Scripts are flat text files and can be changed with any text editor, for example the "Notepad" Windows accesorie.
- Right-click a MyD script and choose "Edit". This special menu item is created by the MyDefrag installer and will open the script with Notepad.
- Script files can be Unicode, UTF-8, or ASCII.
- MyDefrag ignores all whitespace, the indentation of the lines is only there for clarification. You can even put multiple commands on a single line, if you want.
- Scripts are case-insensitive. You can write "VolumeSelect", but also "volumeselect", "VOLUMESELECT", or whatever.
- Scripts can contain the following comments:
  - Anything between "/\*" and "\*/"
  - Anything on the same line after "//"
  - Anything on the same line after "REM"
  - Anything on the same line after "#"
  - Anything on the same line after "--"
- The MyDefrag scripting language is a (very complex) way to pass settings and parameters into MyDefrag. It was not designed to be programming language. Therefore there are no commands for if-then, while, goto, and many other things commonly found in programming languages. If you need stuff like that then I suggest that you use your favorite programming language to generate a MyDefrag script.

---

_Source HTML: `Manual-Scripts.html`_
