## FAQ Using - What is "NtfsDisableLastAccessUpdate"?

Windows can record the last time a file was accessed. It makes the system a bit slower because it takes a bit of overhead, and that is why Microsoft has turned this off by default on Vista. You can control it with the "NtfsDisableLastAccessUpdate" registry setting.

Recording last access times in combination with MyDefrag can make your disk faster, because MyDefrag can use the information to optimize your disk, for example by moving files to the back that have not been used recently. For more information see the [![ \* ](img/Bullit.gif) **SortByLastAccess**](../FileActions/FileActions-SortByLastAccess.md) fileaction.

|                                        |                                         |
|----------------------------------------|-----------------------------------------|
| See current setting:                   | fsutil behavior query disablelastaccess |
| Enable recording of last access time:  | fsutil behavior set disablelastaccess 0 |
| Disable recording of last access time: | fsutil behavior set disablelastaccess 1 |

### See also:

[![ \* ](img/Bullit.gif) **LastAccess**](../FileBoolean/FileBoolean-LastAccess.md)  
[![ \* ](img/Bullit.gif) **What are SpaceHogs?**](FAQGeneralInformation-WhatAreSpaceHogs.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-WhatIsNtfsDisableLastAccessUpdate.html`_
