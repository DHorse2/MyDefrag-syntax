## FAQ Using - Why do I have more diskspace after running MyDefrag?

Running MyDefrag can cause the Microsoft Shadow Copy service to clean up (delete) some restore points, resulting in more free diskspace. It can happen with all defragmenters and optimizers, not only MyDefrag.

The Microsoft Shadow Copy service makes snapshots of the disk, and is used to get a consistent view of the disk by services such as restore points and backup. MyDefrag does not change files (it only defragments or moves them), but it does change the disk (moving a file is a change to the disk), and the Shadow Copy service remembers all these changes in big files in the "C:\System Volume Information\\..." folder. When the total amount of diskspace used by shadow copies exceeds a threshold then the oldest snapshot (restore point) is automatically deleted.

To release the diskspace used by restore points see the [![ \* ](img/Bullit.gif)](http://support.microsoft.com/kb/310405) [**How to turn off and turn on System Restore in Windows XP**](http://support.microsoft.com/kb/310405) article on the Microsoft website. The threshold can be changed with the "vssadmin" command, see the [![ \* ](img/Bullit.gif)](http://technet2.microsoft.com/windowsserver/en/library/89d2e411-6977-4808-9ad5-476c9eaecaa51033.mspx?mfr=true) [**vssadmin manpage.**](http://technet2.microsoft.com/windowsserver/en/library/89d2e411-6977-4808-9ad5-476c9eaecaa51033.mspx?mfr=true)

In my opinion this is a bug in the Shadow Copy service. MyDefrag (and almost all the other defragmenters out there) is build on top of the Microsoft defragmentation API, so it is entirely possible for the Shadow Copy service to see what is happening. It should only remember that a block of data has been moved, there is not need to make a complete copy of the data.

### About restore points

Restore points are a backup of certain Windows system files, such as drivers, registry, menu, desktop settings, and more. They do not backup anything else, such as user files and non-Windows programs. Also, restore points are deleted automatically (see above). You should therefore NOT rely on restore points in any way. Personally I always turn them off, saving a ton of diskspace.

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-WhyDoIHaveMoreDiskspaceAfterRunningMyDefrag.html`_
