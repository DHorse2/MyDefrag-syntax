## FAQ Download And Install - How do I disable the Windows built-in defragger?

Windows 2000 & 2003:  
The built-in defragger is not started automatically.

Windows XP:  
1.  Download the free [![ \* ](img/Bullit.gif)](http://www.microsoft.com/windowsxp/downloads/powertoys/xppowertoys.mspx) [**Tweak UI**](http://www.microsoft.com/windowsxp/downloads/powertoys/xppowertoys.mspx) utility from Microsoft.
2.  Click on "General" and untick the "Optimise hard disk when idle" box.

Windows Vista:  
1.  Start -\> All Programs -\> Accessories -\> System Tools -\> Disk Defragmenter
2.  Untick the "Run on a schedule (recommended)" box.

Windows 7:  
1.  Klick on Start, type "services.msc" in the search box.
2.  Search for the "Defragmentation" service and disable it.

The following registry settings have something to do with the build-in defragmenter. There is no official Microsoft documentation for these settings, so any information you may find on the internet regarding these settings is guesswork, and I will not add to that. My advise is not to play with these settings, you are on your own here.

- HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Dfrg\BootOptimizeFunction\Enable
- HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\OptimalLayout\EnableAutoLayout
- HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters\EnablePrefetcher

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQDownloadAndInstall-HowDoIDisableTheWindowsBuilt-inDefragger.html`_
