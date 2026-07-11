## FAQ Using - Do I have to "checkdisk" before running MyDefrag?

Feel free to do so, but it's not necessary. MyDefrag is totally solid and cannot get confused by a corrupted disk. And even if it could then nothing bad can happen, because MyDefrag does not write to disk itself. Everything is done through the Windows defragmentation API, and Windows is quite smart about handling corrupted disks.

Tip: MyDefrag can automatically call the "chkdsk" Windows utility when selecting a volume, so that MyDefrag will skip the volume if the utility finds something wrong with it. See the [![ \* ](img/Bullit.gif) **CheckVolume**](../VolumeBoolean/VolumeBoolean-CheckVolume.md) volumeboolean.

### See also:

[![ \* ](img/Bullit.gif) **CheckVolume**](../VolumeBoolean/VolumeBoolean-CheckVolume.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-DoIHaveTocheckdiskBeforeRunningMyDefrag.html`_
