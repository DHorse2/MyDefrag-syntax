## FAQ Using - How to run MyDefrag for a single disk?

Besides choosing a disk when MyDefrag starts up, there are several other ways to run a script for only a single disk. If you are handy with the Windows commandline then enter the name of the script followed by the name of the volume, like this:

|                 |
|-----------------|
| `Weekly.MyD C:` |

If you don't know how to use the Windows commandline then try this. Make a shortcut to a script by right-clicking on the desktop, -\> New -\> Shortcut, and then select the script that you want from the "C:\Program Files\MyDefrag v4.3.1\Scripts\\ folder. Then open the properties of the shortcut and at the end of the "Target" line add the disk that you want. That's all! You are now ready to roll. The target line will look like this:

|                                                            |
|------------------------------------------------------------|
| `"C:\Program Files\MyDefrag v4.3.1\Scripts\Weekly.MyD" C:` |

Another way to do it, more powerful but a bit more involved, is by customizing a script. Make a copy of one of the standard scripts and open the copy in a text editor (for example the standard Windows NotePad accessorie). Then look for the section between "VolumeSelect" and "VolumeActions" and change it into something like the example below. There are many keywords that you can use to select disks. For more information see the [![ \* ](img/Bullit.gif) **VolumeBoolean**](../Scripts/Scripts-VolumeBoolean.md) section in the MyDefrag manual.

### Example

[TABLE]

### See also:

[![ \* ](img/Bullit.gif) **Name**](../VolumeBoolean/VolumeBoolean-Name.md)  
[![ \* ](img/Bullit.gif) **VolumeBoolean**](../Scripts/Scripts-VolumeBoolean.md)  
[![ \* ](img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-HowToRunMyDefragForASingleDisk.html`_
