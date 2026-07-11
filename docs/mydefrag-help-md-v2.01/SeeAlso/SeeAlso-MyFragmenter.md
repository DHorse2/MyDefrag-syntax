## See also - MyFragmenter

MyFragmenter is a small commandline utility included with MyDefrag to fragment existing files, to generate new fragmented files with random data, or to list fragmentation information about files. It is useful only for people who are testing defragmentation programs.

|               |     |                                                                                                                        |
|---------------|-----|------------------------------------------------------------------------------------------------------------------------|
| **Parameter** |     | **Description**                                                                                                        |
| `filename(s)` |     | The file(s) to be fragmented. If a file does not exist then a new file will be created containing random data.         |
| `[-p NNN]`    |     | Split the file(s) into NNN fragments. Default is 10 fragments. If NNN is zero or 1 then the file will be defragmented. |
| `[-s NNN]`    |     | When a new file is created then the size will be NNN kilobytes. Default is 1000 kilobyte (1 megabyte).                 |
| `[-i]`        |     | Only show information about the file(s), do not fragment or create the file(s).                                        |
| `[-h]`        |     | Show a help text.                                                                                                      |

### Example

|                                                                          |
|--------------------------------------------------------------------------|
| `"c:\Program Files\MyDefrag v4.3.1\MyFragmenter.exe" -s 10000 r:\t1.tmp` |

---

_Source HTML: `SeeAlso-MyFragmenter.html`_
