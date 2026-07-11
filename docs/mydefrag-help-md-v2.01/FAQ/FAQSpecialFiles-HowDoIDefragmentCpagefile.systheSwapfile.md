## FAQ Special files - How do I defragment "C:\pagefile.sys" (the swapfile)?

The following procedure has a good chance of defragmenting the pagefile, and will set the pagefile to a fixed size so it will never get fragmented again:

1.  **Windows Vista:** Open the "Control Panel", classic view. Double click "system". Select "Advanced system settings". Click the Performance "Settings" button. Select the "Advanced" tab. Click the Virtual Memory "Change" button.  
    **Windows 2000:** Open the "Control Panel". Double click "system". Select the "advanced" tab. Click the "Performance Settings" button. Click the Virtual Memory "Change" button.
2.  Write down the "Currently Allocated" number.
3.  **Windows Vista:** Select "no paging file" for all disks.  
    **Windows 2000:** Set the Initial Size and the Maximum Size numbers for all disks to zero.
4.  Reboot.
5.  Run MyDefrag.
6.  Go back to the same panel and setup a pagefile with a "custom size" where both the Initial Size and the Maximum Size are the number you wrote down.
7.  Reboot again. The pagefile should now be a single big unfragmented file that will never get fragmented again.

- The pagefile can be moved and defragmented by MyDefrag if you boot from a CDROM. For more information see [![ \* ](img/Bullit.gif) **How to use MyDefrag from a bootable CD-ROM or memory stick?**](FAQUsing-HowToUseMyDefragFromABootableCD-ROMOrMemoryStick.md)
- The pagefile and some other system files can be automatically defragmented at boot time with the free [![ \* ](img/Bullit.gif)](http://www.microsoft.com/technet/sysinternals/FileAndDisk/PageDefrag.mspx) [**Pagedefrag**](http://www.microsoft.com/technet/sysinternals/FileAndDisk/PageDefrag.mspx) utility by Microsoft TechNet (formerly Sysinternals),
- Another option is to turn the swapfile permanently off (see instructions above but stop at point 5). The swapfile makes your computer think it has more memory, it is virtual memory and saves a bit of money on real physical memory. But swapfile memory is extremely slow. If an application causes the computer to use it then it will usually result in a snowball effect where the computer becomes slower and slower and may eventually even crash. Without a swapfile all that would not happen, the offending application will quickly stop (or not even start) with a graceful "memory full" error message. If your computer has enough memory (for example 1 gigabyte) then you can safely turn off the swapfile, it will never be used and is basically a big waste of space on the harddisk.

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQSpecialFiles-HowDoIDefragmentCpagefile.systheSwapfile.html`_
