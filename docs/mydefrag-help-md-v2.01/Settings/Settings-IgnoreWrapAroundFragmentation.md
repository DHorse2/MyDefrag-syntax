## Settings - IgnoreWrapAroundFragmentation

This setting will instruct MyDefrag to either ignore wrap-around fragments (yes, the default) or not (no) when defragmenting and displaying files.

- Do not change the default setting (which is "yes"). This setting should only be used in the DefragmentOnly script, nowhere else.
- Wrap-around fragments are aligned fragments (back-to-front) with nothing but unmovable data in between. Fragments like this have a negligeable impact on performance because the harddisk heads do not have to move, so they do not need to be defragmented.
- Other defragmenters do not know about wrap-around fragments, it is a concept unique to MyDefrag. Wrappped-around files will show up in other defragmenters as fragmented files. If you optimize a disk with MyDefrag and then look at that disk with an different defragmenter then it will look as if there are many fragmented files.
- The MyDefrag "SortBy" optimizations will create wrap-around fragments when they encounter an unmovable file. They move all the data to the beginning of the zone in the specified order, but there may be some unmovable files in the way. Instead of leaving gaps (if a file doesn't fit between the last file and the unmovable file), the program will "wrap" the file around the unmovable file by splitting it into fragments. This is better than placing the file to be placed above the unmovable file, because that would leave a gap (gaps promote fragmentation and it is best to have as few gaps as possible) and it would make all the next files slower because they would then be placed at a slightly slower part of the harddisk than they need to be. Also, it is entirely possible that there are many unmovable tiny little fragments on the disk, with not enough room between them for huge files.

### Syntax

[TABLE]

### Example

|                                      |
|--------------------------------------|
| `IgnoreWrapAroundFragmentation(yes)` |

### See also:

[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-IgnoreWrapAroundFragmentation.html`_
