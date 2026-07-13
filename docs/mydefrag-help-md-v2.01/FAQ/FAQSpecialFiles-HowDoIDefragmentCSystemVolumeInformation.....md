## FAQ Special files - How do I defragment "C:\System Volume Information\\..."?

These huge files are used by the Shadow Copy service, which in turn is used by the System Restore facility and by Windows backup. The files can be defragmented on XP by stopping the Shadow Copy service ("srservice"). They cannot be defragmented on Vista. You can cleanup old shadow copies with "Start -\> Programs -\> Accessories -\> System Tools -\> Disk Cleanup", the "More Options" tab. Or you can turn off System Restore altogether like this:

Windows Vista:  
1.  In Control Panel, click "System".
2.  Select "System Protection".
3.  If a disk has a checkmark then remove the checkmark.

Windows XP:  
1.  Open the properties of "My Computer".
2.  Select the "System Restore" tab. If you do not see the System Restore tab then you are not logged on to Windows as an Administrator.
3.  Check "Turn off System Restore" or "Turn off System Restore on all drives".

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQSpecialFiles-HowDoIDefragmentCSystemVolumeInformation.....html`_
