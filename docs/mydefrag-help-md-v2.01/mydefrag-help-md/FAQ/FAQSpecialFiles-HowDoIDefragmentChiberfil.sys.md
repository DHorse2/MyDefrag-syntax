## FAQ Special files - How do I defragment "C:\hiberfil.sys"?

This huge file is used by the hibernation facility and cannot be defragmented on a running system. You can only delete the file, like this:

Windows Vista:  
1.  Click Start -\> All Programs -\> Accessories, right click on "Command Prompt", and then click "Run as Administrator". If User Account Control (UAC) asks you for permission, permit the Command Prompt to run.
2.  Enter "powercfg -h off" (without the quotes).
3.  Reboot. The "hiberfil.sys" file will be automatically deleted.
4.  Repeat point 1 to open a command prompt.
5.  Enter "powercfg -h on" (without the quotes).
6.  Reboot.

Windows XP:  
1.  Open the "Control Panel", double-click "Power Options".
2.  Click the Hibernate tab, de-select the "Enable hibernate support" check box, and then click Apply.
3.  Reboot. The "hiberfil.sys" file will be automatically deleted.
4.  Open the "Control Panel", double-click "Power Options".
5.  Click the Hibernate tab, select the "Enable hibernate support" check box, and then click Apply.
6.  Reboot. The "hiberfil.sys" file will be automatically created.

- Do not hibernate your computer, then boot with something else (such as BartPE), and then change the hibernated disk in any way. This will corrupt the disk, a known hibernation problem. MyDefrag contains a test and will refuse to process hibernated disks.

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQSpecialFiles-HowDoIDefragmentChiberfil.sys.html`_
