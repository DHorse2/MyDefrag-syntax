## FAQ Using - How do I defragment unmounted volumes?

Make a copy of the script that you want to run (for example "Weekly.MyD") and modify it with a text editor such as the "Notepad" accessorie. Look for the section between "VolumeSelect" and "VolumeActions" and change it into something like this:

### Example

[TABLE]

- Volumes can be dismounted with the "fsutil volume dismount d:" commandline.
- Use the "mountvol" commandline to get a list of all volumes, including unmounted volumes.
- Unmounted harddisks are seen as mounted. I don't know why....
- MyDefrag has to open the volume in order to test if it is mounted.
- The NTFS file system treats a locked volume as a dismounted volume.

### See also:

[![ \* ](img/Bullit.gif) **Name**](../VolumeBoolean/VolumeBoolean-Name.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-HowDoIDefragmentUnmountedVolumes.html`_
