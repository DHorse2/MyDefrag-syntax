## FAQ Using - How to use MyDefrag from a bootable CD-ROM or memory stick?

***Tip:** Is MyDefrag installed on your harddisk? Then you can boot from a standard bootable CD-ROM, navigate to MyDefrag on the harddisk and just run it. No need to construct a special CD-ROM.*

It is possible and relatively easy to use MyDefrag as a "portable" program. MyDefrag is a single program called "MyDefrag.exe", fairly small and completely standalone (it only uses standard Windows DLL's). Basically all you need to do is make a copy of the program, and make a copy of the MyDefrag script that you want to run. All the other files in the MyDefrag distribution are extra's and are not essential to run MyDefrag.

- You can find the "MyDefrag.exe" program in your installation folder (default is "c:\Program Files\MyDefrag v4.3.1\\).  
  **Note:** Your CD-ROM must boot the same Windows version (32 bit or X64) as when MyDefrag was installed, because the MyDefrag installer automatically detects your Windows version and will place the appropriate MyDefrag version in the installation folder.
- The standard MyDefrag scripts are in the "Scripts" subfolder in your MyDefrag installation folder.
- You will probably also want to copy the "Settings.MyD" script. The script is not required and MyDefrag will run without it, but it contains the translations and default settings.
- MyDefrag will look for scripts in the same folder as the executable, and show them in the script-chooser menu. You can also run your script by drag-and-drop your script onto the interpreter. Yet another way is to enter a commandline with the name of your script as a parameter of the interpreter, for example "MyDefrag.exe -r Weekly.MyD". Double-clicking the script will not work, because the MyDefrag installer has not run in the CD-ROM environment and has not created the association between "\*.MyD" files and the interpreter.
- For more information about running MyDefrag see the "Running a script" and "Commandline" chapters on the [![ \* ](img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md) manual page.

## Boot optimization does not work

MyDefrag optimizes your disk(s) for the currently booted Windows, which in this case is the CD-ROM (or memory stick or whatever). Not your harddisk. MyDefrag uses the "%SystemRoot%\Prefetch\Layout.ini" file for the boot optimization. If all the volumes are mounted on the exact same drive letter as when you have booted normally, and the CD-ROM method uses a ramdisk, then perhaps you can copy the layout.ini file from the harddisk to the place where MyDefrag expects to find it:

|                                                                        |
|------------------------------------------------------------------------|
| `copy c:\windows\prefetch\layout.ini %SystemRoot%\prefetch\layout.ini` |

## Warning

Do not hibernate your computer, then boot with something else (such as BartPE), and then change the hibernated disk in any way. This will corrupt the disk, a known hibernation problem. MyDefrag contains a test and will refuse to process hibernated disks.

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-HowToUseMyDefragFromABootableCD-ROMOrMemoryStick.html`_
