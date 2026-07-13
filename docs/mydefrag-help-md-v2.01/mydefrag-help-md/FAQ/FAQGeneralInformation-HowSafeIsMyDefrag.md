## FAQ General information - How safe is MyDefrag?

Basically all MyDefrag does is send "move this file to that location" commands to the defragmentation API by Microsoft, a collection of system calls that are included in Windows NT, 2000, 2003, XP, Vista, 2008, and Win7. Most defragmenters are based on this API, including commercial defragmenters. The API is very mature and has proven to be extremely solid over the years. It is for example impossible to overwrite data, the API simply refuses it. It is also impossible for data to get corrupted, the API verifies every move.

MyDefrag is therefore totally safe to use, as testified by millions of users on all kinds of hardware. However, it is still a good idea to backup before defragmenting, just like with other defragmenters. because the heavy use of the harddisk may trigger a hardware fault (disk crash), and/or overheating (disk, power supply, controller chipset, etc.), and/or may cause unnoticed data corruption to come to the surface. It is also theoretically possible that other software is incompatible with MyDefrag, causing problems, but then that software would be incompatible with the standard Microsoft defragmentation API and all other defragmenters out there.

**Note:** If your disks use FAT then you should seriously consider changing them to NTFS. It is not only faster, but has several build-in safeguards that protect your data. For example, with NTFS you are safe when the computer crashes in the middle of defragmenting,

### See also:

[![ \* ](img/Bullit.gif) **Known problems**](../Manual/Manual-KnownProblems.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQGeneralInformation-HowSafeIsMyDefrag.html`_
