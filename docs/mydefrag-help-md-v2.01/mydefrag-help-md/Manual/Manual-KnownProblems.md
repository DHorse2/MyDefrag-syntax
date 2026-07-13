## Known problems

- Some data on an NTFS partition may become corrupted after you restart a Windows XP-based computer that uses a SATA hard disk drive. This is not a MyDefrag bug but a Microsoft defragmentation API bug. Microsoft has fixed this in XP service pack 3. Also see: [![ \* ](../img/Bullit.gif)](http://support.microsoft.com/kb/941715/en) [**Bugfix 941715**](http://support.microsoft.com/kb/941715/en)
- Certain boot manager and disk encryption software can be incompatible with MyDefrag (and other defragmentation programs). They assume a fixed location on disk for their configuration files, and if these files are moved then the entire disk may become inaccessible. MyDefrag contains a list of exceptions and will never move the critical files of SafeBoot, Acronis OS Selector, SecurStar DriveCrypt, Symantec GoBack, PGP Whole Disk Encryption, and DiskCryptor. Software not listed here is probably safe to use, check the manual or ask your vendor. If you know of any other software that needs a special exception then please let me know.
- The Windows defragmentation API refuses to move directories on FAT32 filesystems. This is a known limitation of the Windows defragmentation API and not a bug in MyDefrag. Tip: [![ \* ](../img/Bullit.gif)](http://support.microsoft.com/kb/214579) [**How to use Convert.exe to convert a partition to the NTFS file system**](http://support.microsoft.com/kb/214579)
- The Windows defragmentation API on Windows 2000 does not work on disks that were formatted with a clustersize greater than 4KB. This is a known API limitation and not a bug in MyDefrag. There is no risk of losing data, the API simply refuses to move files.
- Some kinds of external disks cannot be defragmented and optimized, especially network disks that use their own internal operating system and special dedicated filesystem. The drivers of these disks simply do not support it.
- Files that are encrypted by Windows can be defragmented and optimized, but their \$EFS:\$LOGGED_UTILITY_STREAM counterpart cannot. The Windows CreateFile() system call refuses to open these files and I have not yet found a workaround.
- A user has sent me a message that HP advises against defragmentation of the special "recovery" partition on their computers. MyDefrag uses the standard Microsoft defragmentation API, so I think it is safe to use, but I don't know for sure. I have not found any additional information about this issue anywhere on the internet.
- Do not hibernate your computer, then boot with something else (such as BartPE), and then change the hibernated disk in any way. This will corrupt the disk, a known hibernation problem. MyDefrag contains a test and will refuse to process hibernated disks.

---

_Source HTML: `Manual-KnownProblems.html`_
