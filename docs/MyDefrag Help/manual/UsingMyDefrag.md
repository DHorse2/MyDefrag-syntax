# Using MyDefrag

MyDefrag is extremely easy to use. All you have to do is start MyDefrag,
choose one of the scripts (for example "Weekly"), choose 1 or more
disks, and click the Run button. That's all! The rest is automatic and MyDefrag will
defragment and optimize all your disks. Advanced users can build their own scripts
and customize just about every aspect of MyDefrag, see the

[**Scripts**](Scripts.md)

chapter.

For the Run Once I advise the "Monthly" script, after that "Daily" once per day. The installer has an option that will make an automatic schedule for you, or see [**How do I schedule a task, to run automatically every day?**](../faq/FAQ.md#faqusing-howdoischeduleatasktorunautomaticallyeveryday)

**Tip:** Reboot your computer and measure how long it takes until you see the login screen. Run MyDefrag to optimize your harddisks, and then reboot and measure again. If you like what you see then perhaps you could make a donation? I have worked very hard for a very long time on MyDefrag....

**Tip:** If MyDefrag is very slow then try turning your virusscanner off. Some virusscanners get exited and scan all the files that MyDefrag is moving, even though MyDefrag does not execute or change the files.

## Keyboard and mouse

| ALT+R | "Run" menu |
| --- | --- |
| ALT+V | "View" menu |
| ALT+Z | "Zoom" menu |
| F1 | Open the manual. |
| Space | Pause / Continue. |
| Mouse move-over (hover) | Show information about the file under the cursor, in text below the diskmap window |
| CTRL-C | Copy the path of the file under the mouse (as shown under the diskmap window)     to the clipboard. |
| Mouse left-click | Zoom in |
| Mouse right-click | Zoom out |
| Mousewheel | Scroll up/down |
| + | Zoom in. |
| - | Zoom out. |
| Arrow up | Scroll 4 lines up. |
| Arrow down | Scroll 4 lines down. |
| Home | Scroll to top. |
| End | Scroll to bottom. |
| Page Up | Scroll up half a page. |
| Page Down | Scroll down half a page. |

## Standard scripts

The following scripts are included in the MyDefrag distribution.

System Disk Daily, Weekly, and Monthly These scripts are designed for the system disk (the C: disk). They place the MFT and the directories at 30% into the data on the disk, and create zones from the beginning of the disk with files used when booting, files used by the most used programs, regular files, and spacehogs (less important files that take up a lot of space). Between the zones it creates gaps for temporary files. Daily is designed to be fast, but will not perfectly defragment and optimize the disk. Weekly does a more thorough job than Daily, but takes more time to finish. Monthly gives the best defragmentation and optimization results, but takes a lot of time to complete and is not recommended for daily use. Data Disk Daily, Weekly, and Monthly These scripts are designed for data disks (any disk that does not contain Windows). They place the MFT and the directories at the beginning of the disk, followed by a gap for temporary files and then all the other files. Flash memory disks Defragment and consolidate free space on the selected disk(s). This script is specially designed for Flash and SSD disks. It will defragment all the fragmented files and make the free space as large as possible by moving all files to the beginning of the disk. Many people think that flash disks do not benefit from defragmentation and optimization because bandwidth and access time are the same for the entire disk, unlike mechanical harddisks which are faster at the beginning than the end. But fragmented files need extra processing time inside Windows, not noticeable on mechanical harddisks but very significant on fast flash memory disks. Even more important is free space optimization. Flash memory is written in large blocks, and if free space is fragmented then Windows has to (read and) write much more data than the size of the file. This takes time, which translates into lower speed. Flash memory has a limited number of erase-write cycles. The script is specially designed to move as little data as possible, but still uses up some of those cycles. My advise is to use some discretion and not run this script every day, but only incidentally, for example once per month. Analyze only Analyze the selected disks. The script will automatically pause between disks, so you can view and interpret the diskmap. Defragment Only Defragment all the files and directories on the selected disk(s). The script will first defragment files for which it can find a large enough gap, and then slowly defragment files that are bigger than the largest gap by shuffling data. Are you comparing with another defragmenter? Use this script. MyDefrag uses wrap-around fragmentation, a concept unique to MyDefrag. The DefragmentOnly script will turn this setting off and is the only script that is more or less compatible with other defragmenters. For more information see the [**IgnoreWrapAroundFragmentation**](../language/Settings/IgnoreWrapAroundFragmentation.md) setting in the MyDefrag manual. Please note that it is a **BAD IDEA** to only defragment a volume, you should also optimize (the gaps on) a volume. Defragmentation results in more smaller gaps on the volume, because a file with 2 fragments will leave 2 gaps behind (worst case) and will make a big gap smaller. Gaps promote fragmentation and it is best to have as few gaps as possible. The "Defragment Only" script can be useful in certain situations, but it's usually better to invest a bit more time and run one of the Optimize scripts. Consolidate Free Space Move files and directories to the beginning of the disk(s). This can be useful on very full disks, to make room for maneuvering big files. The script will defragment all fragmented files and will fill all the gaps. It does not do any optimization, such as sorting the files into zones.

## Example scripts

The following scripts are provided in the "Example Scripts" folder as an example
to script programmers. If you want to use one of these script from the MyDefrag
chooser then copy the script to the "Scripts" folder.

Sort By CreationTime Sort all the files and directories by creation time on the selected disk(s). Sort By LastAccess Sort all the files and directories by last access time on the selected disk(s). Sort By LastChange Sort all the files and directories by last change time on the selected disk(s). Sort By Name Sort all the files and directories by name on the selected disk(s). Sort By Size Sort all the files and directories by size on the selected disk(s). Force Together Move all the files and directories to the beginning of the disk. Files will be fragmented to perfectly fill all the gaps. Move To End Of Disk Move all the files and directories to the end of the disk.

### See also:

[**Scripts**](Scripts.md)
