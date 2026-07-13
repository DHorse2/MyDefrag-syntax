## FAQ Using - How to run a different script per disk?

There are many ways to run a batch of scripts with a different disk per script.

- Manually by selecting scripts and disks in the MyDefrag script chooser window. MyDefrag will remember the disks that you selected per script, so simply selecting a script will also select the disks that you selected last time.
- By running MyDefrag from the commandline. For more information about the MyDefrag commandline see the "Commandline" chapter on the [![ \* ](img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md) manual page.  
  **Tip:** Put the commandlines in a small .bat file. You can then run the .bat file from the task scheduler.
  [TABLE]
- By creating a small MyDefrag script. The following example is a bit of a kludge, but you do not have to make any changes to the standard MyDefrag scripts, and you can use it as any other MyDefrag script (for example in the MyDefrag script chooser window and from the task scheduler). Save this in a .MyD file in your MyDefrag "Script" directory, and customize as needed:
  [TABLE]
- By creating your own custom MyDefrag script, containing multiple [![ \* ](img/Bullit.gif) **VolumeSelect**](../Scripts/Scripts-VolumeSelect.md) statements each with it's own [![ \* ](img/Bullit.gif) **VolumeBoolean**](../Scripts/Scripts-VolumeBoolean.md) to select disks. This is a very powerful and flexible method, because you can use all the VolumeBoolean's that MyDefrag has to offer. For example, it is possible to do a different optimization depending on the level of fragmentation on a disk.
  [TABLE]

### See also:

[![ \* ](img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-HowToRunADifferentScriptPerDisk.html`_
