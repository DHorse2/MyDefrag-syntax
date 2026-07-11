## FAQ General information - Why does MyDefrag not perfectly optimize my disk?

It's very unlikely, if not impossible, for MyDefrag to perfectly optimize your disk, more's the pity. The program will do it's best for you, but there are many circumstances that will prevent it from perfectly optimizing your disk.

- Are you comparing with another defragmenter? Use the DefragmentOnly script. MyDefrag uses wrap-around fragmentation, a concept unique to MyDefrag. The DefragmentOnly script will turn this setting off and is the only script that is more or less compatible with other defragmenters. For more information see the [![ \* ](img/Bullit.gif) **IgnoreWrapAroundFragmentation**](../Settings/Settings-IgnoreWrapAroundFragmentation.md) setting.
- MyDefrag maintains some "free space" areas on the disk. This is by design, the free spaces are there so there is a better chance for new files (such as temporary files) to be placed on a fast part of the disk. If you don't want the gaps then simply edit the script of your choice and remove (or comment-out) the statements that create the gaps.
- Other programs may be creating files while MyDefrag is running, and this will interfere with the optimization. The new files will appear on the MyDefrag diskmap as black unused diskspace.
- If your harddisk is very full then MyDefrag will have difficulty shuffling files around, and in some cases will have to throw the towel in the ring and give up altogether.
- There are many files that cannot be moved while Windows is running, because they are in use by an application, or by a service, or by Windows itself. See your "c:\Program Files\MyDefrag v4.3.1\MyDefrag.log" file for a list of files that could not be moved. The unmovables can be anywhere on disk and are usually fragmented into microscopically small segments. In other words, the harddisk is not a big block of space where files can be moved at will, but thousands of little blocks bounded by unmovable data.  
  **Tip:** Certain unmovable Windows files cannot be defragmented, but there are things you can do. For more information see the [![ \* ](img/Bullit.gif) **FAQ Special files**](FrequentlyAskedQuestions-FAQSpecialFiles.md)
- The Daily scripts will try to perfectly fill gaps with files from above the gap, but if MyDefrag cannot find a perfect fitting combination of files then a (smaller) gap will be left unfilled. The Weekly and Monthly scripts will fill all the gaps, but will take more time to finish.
- The Daily scripts will only defragment a file if there is a gap large enough to hold the entire file. The Weekly and Monthly scripts will defragment all files, but will take more time to finish.

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQGeneralInformation-WhyDoesMyDefragNotPerfectlyOptimizeMyDisk.html`_
