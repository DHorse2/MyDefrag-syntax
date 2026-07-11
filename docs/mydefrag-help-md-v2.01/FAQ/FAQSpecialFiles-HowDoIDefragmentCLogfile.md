## FAQ Special files - How do I defragment "C:\\Logfile"?

The \$Logfile is a special NTFS system file. It is a circular log of all disk operations and is used to safely roll back unsuccessful disk operations. The file has a fixed size and is allocated when the disk is formatted. It cannot be deleted, moved, or defragmented.

- The "chkdsk" Windows commandline utility can show and change the size of the \$Logfile. Making the \$Logfile bigger will not move it, but will append a new fragment. Making the \$Logfile smaller will remove fragments from the end.
  |                |
  |----------------|
  | `CHKDSK c: /L` |

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQSpecialFiles-HowDoIDefragmentCLogfile.html`_
