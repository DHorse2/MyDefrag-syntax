## FAQ General information - Are striped RAID volumes faster at their beginning?

Yes. Striped raid volumes are mapped onto physical drives in blocks (usually 64 kilobyte). The first block in the stripe set is the first block on the first drive, the second striped block is the first block on the second drive. If there are only 2 drives then the third striped block is the second block on the first drive. So, striped raid volumes have the same characteristics as the underlying physical drives - fast at the beginning and slow at the end. You can test the speed with a utility such as [![ \* ](img/Bullit.gif)](http://www.hdtune.com/) [**HD Tune**](http://www.hdtune.com/).

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQGeneralInformation-AreStripedRAIDVolumesFasterAtTheirBeginning.html`_
