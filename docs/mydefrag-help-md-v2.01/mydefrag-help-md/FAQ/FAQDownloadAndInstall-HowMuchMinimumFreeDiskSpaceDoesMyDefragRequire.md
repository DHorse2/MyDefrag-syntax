## FAQ Download And Install - How much minimum free disk space does MyDefrag require?

MyDefrag does not require a minimum free disk space, but:

- Windows reserves some space on NTFS disks for expansion of the MFT, default is 12.5% of the volume size. This space is counted by Windows as free space because it can/will be used for regular files when the rest of the volume is full. MyDefrag cannot move files into this space, only out of (see [![ \* ](img/Bullit.gif) **ReclaimNtfsReservedAreas**](../VolumeActions/VolumeActions-ReclaimNtfsReservedAreas.md)).
- On very full harddisks MyDefrag will take more time to shuffle files around, and in some cases will have to throw the towel in the ring and leave some files fragmented or not optimized.
- A file can only be defragmented if there is a gap on disk big enough to hold the entire file, depending on the script that you have chosen. There may be plenty of free space, but what is needed is a single big gap.

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQDownloadAndInstall-HowMuchMinimumFreeDiskSpaceDoesMyDefragRequire.html`_
