## FAQ Special files - How do I defragment "C:\\Extend\\RmMetadata\\TxfLog\\Tops:\$T:\$DATA"?

This is a special NTFS system file used by the Windows Transactional Resource Manager. MyDefrag cannot move or defragment this file. It can be cleaned with the fsutil command, see below. Do not try to delete this file by hand.

- Use the following commandline to see information about the TOPS files:
  |                            |
  |----------------------------|
  | `fsutil resource info c:\` |
- The following commandline will instruct Windows to clean (not delete) the TOPS file at the next reboot:
  |                                         |
  |-----------------------------------------|
  | `fsutil resource setautoreset true c:\` |

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQSpecialFiles-HowDoIDefragmentCExtendRmMetadataTxfLogTopsTDATA.html`_
