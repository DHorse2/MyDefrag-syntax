# Scripts

MyDefrag comes with a collection of completely automatic scripts that cover the
needs of most users, see the

[**Using MyDefrag**](UsingMyDefrag.md)

chapter.
You will only have to look at scripting if you have special wishes.

[](Scripts.md#script-language-reference) [**Script language reference**](Scripts.md#script-language-reference) [](Scripts.md#a-simple-script) [**A simple script**](Scripts.md#a-simple-script) [](Scripts.md#zones) [**Zones**](Scripts.md#zones) [](Scripts.md#running-a-script) [**Running a script**](Scripts.md#running-a-script) [](Scripts.md#commandline) [**Commandline**](Scripts.md#commandline) [](Scripts.md#the-settingsmyd-script) [**The "Settings.MyD" script**](Scripts.md#the-settingsmyd-script) [](Scripts.md#other-things-to-know-about-scripts) [**Other things to know about scripts**](Scripts.md#other-things-to-know-about-scripts)

## Script language reference

The MyDefrag scripting language was specially designed for defragmentation and
optimization purposes. It is not a programming language, but a parameter passing
language, and is therefore very straightforward and easy to use yet allows for
some very complex and sophisticated disk optimizations. The program
checks every script before running it, there is absolutely no way that you can
damage your disks by making a mistake in a script.

| [**VolumeSelect**](../language/Scripts/VolumeSelect.md) |
| --- |
| [**VolumeBoolean**](../language/Scripts/VolumeBoolean.md) |
| [**VolumeActions**](../language/Scripts/VolumeActions.md) |
| [**FileSelect**](../language/Scripts/FileSelect.md) |
| [**FileBoolean**](../language/Scripts/FileBoolean.md) |
| [**FileActions**](../language/Scripts/FileActions.md) |
| [**Settings**](../language/Scripts/Settings.md) |
| [**Variables**](../language/Scripts/Variables.md) |
| [**Macros**](../language/Scripts/Macros.md) |
| [**STRING**](../language/Scripts/STRING.md) |
| [**NUMBER**](../language/Scripts/NUMBER.md) |
| [**DATETIME**](../language/Scripts/DATETIME.md) |
| [**Formal script grammar**](../language/Scripts/FormalScriptGrammar.md) |

## A simple script

Scripts are text files that tell MyDefrag what to do. The lines in the text file
are executed one by one, from top to bottom. Here is a small example of a script:

| A small example script. |  |
| --- | --- |
| Slowdown(80) VolumeSelect   All VolumeActions   FileSelect     All   FileActions     Defragment()   FileEnd VolumeEnd | --> see:  Settings --> see:  VolumeSelect --> see:  VolumeBoolean --> see:  VolumeActions --> see:  FileSelect --> see:  FileBoolean --> see:  FileActions |

This example script begins with a setting, in this case the Slowdown() setting. After the setting there is a VolumeSelect-VolumeActions-VolumeEnd statement. There can be more than 1 of these in a script, but most scripts will have only 1. The VolumeSelect statement is the basic workhorse in a script, it specifies which volumes (disks) are to be processed (in this case "All") and the actions to perform on those volumes.

Inside the VolumeSelect statement is a FileSelect-FileActions-FileEnd statement. Most VolumeSelect statements will have more than 1 FileSelect statements, this is just a basic example. The FileSelect specifies which files are to be processed (in this case "All") and what to do with them (in this case "Defragment").

So, this small example script will set the Slowdown setting, and will Defragment all the files on all the volumes.

## Zones

MyDefrag organizes all the files on a volume into "zones". The first zone is placed at the
beginning of the volume, the second zone after the first zone, the third zone after that,
etcetera. In the script you select the files that go into each zone and what actions
are performed on those files.

| A script with 2 zones. |
| --- |
| VolumeSelect   All VolumeActions    # First zone: MP3 files   FileSelect     FileName("*.mp3")   FileActions     SortByName(Ascending)   FileEnd    # Second zone: Other files   FileSelect     All   FileActions     FastFill()   FileEnd  VolumeEnd |

This script defines 2 zones, first a zone with all the mp3 files, and then a zone with all the other stuff on the volume. The first zone will be sorted by name by the SortByName() function, the second zone will FastFill the gaps.

Items (files, directories) are placed in the first possible zone. In the above example we select "All" files for the second zone, but this actually means "all remaining files". The mp3 files have already been placed in the first zone and are therefore not selected again.

## Running a script

There are many ways to run a MyDefrag script:

- Make sure the script is in the "Scripts" folder in the MyDefrag installation   directory, and that it has a [**Title**](../language/Settings/Title.md) and a   [**Description**](../language/Settings/Description.md). It will then show up in the MyDefrag   chooser, when you run MyDefrag.
- Double-click a script. You can for example place your script on the desktop,   or you can use Windows Explorer to navigate to the folder that contains your   script. The MyDefrag installer creates an association   between the ".MyD" extension and the MyDefrag script interpreter, so   double-clicking a script will automatically open the interpreter   and run the script.
- Drag-and-drop a script onto the MyDefrag interpreter (the MyDefrag icon   on your desktop).
- Enter the name of a MyDefrag script on a commandline just like an   executable program. For example "Weekly.MyD". You can do the same   in all places where you can enter the name of a program, such as .BAT files,   .CMD files, or in any kind of programming language that can execute   Windows commandlines (for example the PHP system() function).
- Run the MyDefrag interpreter ("MyDefrag.exe") with the name of   a script as a parameter, for example "MyDefrag.exe Weekly.MyD".
- Create a shortcut to the MyDefag.exe interpreter, then open the   properties of the shortcut and add the name of a script to the end of the   "target" line.
- Create a scheduled task, see   [**How do I schedule a task, to run automatically every day?**](../faq/FAQ.md#faqusing-howdoischeduleatasktorunautomaticallyeveryday)

## Commandline

The MyDefrag script interpreter ("c:\Program Files\MyDefrag v4.3.1\MyDefrag.exe")
accepts the following commandline parameters.
The parameters can also be used with scripts, for example "Weekly.MyD -v C:".

| **Parameter** |  | **Description** |  |  |
| --- | --- | --- | --- | --- |
| `[-r] FILENAME` |  | Run a MyDefrag script.   The interpreter will look for the FILENAME in various directories.         For more information see the [**RunScript**](../language/Settings/RunScript.md) command.        The "-r" is optional if the filename matches "*.MyD".        For example:  `MyDefrag.exe -r Weekly.MyD` | `MyDefrag.exe -r Weekly.MyD` |  |
| `MyDefrag.exe -r Weekly.MyD` |  |  |  |  |
| `[-m] NAME=VALUE` |  | Set a macro.   See the [**Macros**](../language/Scripts/Macros.md) for more information.        The DOS commandline has a maximum length, depending on the Windows         version, and this puts a cap on the number of commandline macros         you can define. MyDefrag itself has no limits to the size, the number,         or the content of macros.        The "-m" is optional, but should be used to prevent clashes with         FILENAME and VOLUME.        For example:  `MyDefrag.exe -m SELECT=All` | `MyDefrag.exe -m SELECT=All` |  |
| `MyDefrag.exe -m SELECT=All` |  |  |  |  |
| `[-v] VOLUME` |  | The volumes to be processed.   Wildcards "*" and "?" can be used to select a set of volumes.        Default is to process all volumes.        This only works if your script uses the         [**CommandlineVolumes**](../language/VolumeBoolean/CommandlineVolumes.md) volumeboolean.        The "-v" is optional, but should be used to prevent clashes with         FILENAME and macros.        For example:  `MyDefrag.exe -v C: -v D:` `Weekly -v F:` | `MyDefrag.exe -v C: -v D:` | `Weekly -v F:` |
| `MyDefrag.exe -v C: -v D:` |  |  |  |  |
| `Weekly -v F:` |  |  |  |  |
| `-d N` |  | Select a debug level. This will control the messages that are written to the       debug logfile. The number N is a value from 0 to 6:        0 = Fatal errors.        1 = same as 0 plus warning messages and basic information messages.        2 = same as 1 plus scripting and volume analyasis information messages.        3 = same as 5 plus scripting high-detail information messages.        4 = same as 2 plus moving items information messages.        5 = same as 4 plus moving items high-detail information messages.        6 = same as 5 plus volume analysis high-detail information messages.  For example:  `MyDefrag.exe -d 3`  **Also see:** the [**Debug**](../language/Settings/Debug.md) setting.  **Note:** The debug logfile is highly technical. See the       [**WriteLogfile**](../language/Settings/WriteLogfile.md) and [**AppendLogfile**](../language/Settings/AppendLogfile.md)       script commands to create a logfile more suitable for users. | `MyDefrag.exe -d 3` |  |
| `MyDefrag.exe -d 3` |  |  |  |  |

## The "Settings.MyD" script

MyDefrag will run a configuration script called "Settings.MyD" before running
your script.
It contains default settings, translations for all the text messages that MyDefrag can
show on the display, and more. The script has the exact same syntax as a regular script
and can contain the exact same commands.

## Other things to know about scripts

- Scripts are flat text files and can be changed with any text editor, for   example the "Notepad" Windows accesorie.
- Right-click a MyD script and choose "Edit". This special menu item is created by the   MyDefrag installer and will open the script with Notepad.
- Script files can be Unicode, UTF-8, or ASCII.
- MyDefrag ignores all whitespace, the indentation of the lines is only there for   clarification. You can even put multiple commands on a single line, if you want.
- Scripts are case-insensitive. You can write "VolumeSelect", but also "volumeselect",   "VOLUMESELECT", or whatever.
- Scripts can contain the following comments:
  - Anything between "/*" and "*/"
  - Anything on the same line after "//"
  - Anything on the same line after "REM"
  - Anything on the same line after "#"
  - Anything on the same line after "--"
- The MyDefrag scripting language is a (very complex) way to pass settings and parameters   into MyDefrag. It was not designed to be programming language. Therefore there are no   commands for if-then, while, goto, and many other things commonly found in programming   languages. If you need stuff like that then I suggest that you use your favorite programming   language to generate a MyDefrag script.
