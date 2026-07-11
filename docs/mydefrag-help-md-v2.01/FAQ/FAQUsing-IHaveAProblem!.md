## FAQ Using - I have a problem!

First of all: don't worry, nothing can happen to your data. See [![ \* ](img/Bullit.gif) **How safe is MyDefrag?**](FAQGeneralInformation-HowSafeIsMyDefrag.md)

- Make a debug logfile. It contains lot's of information, and perhaps your question is answered there. You can create a debug logfile by uncommenting one of the Debug() lines in your "Settings.MyD" file, default location is "C:\Program Files\MyDefrag v4.3.1\Scripts\Settings.MyD". The default location of the debug logfile is "C:\Program Files\MyDefrag v4.3.1\MyDefrag.debuglog".  
  **Note:** make sure your userid has write permissions on the MyDefrag installation folder, or MyDefrag cannot write the logfile. Windows 7 is configured by default to deny regular users write-access to the "C:\Program Files" folder.
- Post a question on the forum. Help me to help you, the better your question, the better the answer. A tiny little short question "auw it hurts" can usually not be answered because I am not psychic. A huge long 5-page question is also no good because I don't have time to read through all that information. Please include the debug logfile. Usually the "Debug(175)" setting will generate enough detail. Do not post the complete file, but only the first and last few hundred lines, enough to demonstrate the problem.
- See [![ \* ](img/Bullit.gif) **MyDefrag is very slow, what speed can I expect?**](FAQUsing-MyDefragIsVerySlowWhatSpeedCanIExpect.md)
- See [![ \* ](img/Bullit.gif) **Why does MyDefrag not perfectly optimize my disk?**](FAQGeneralInformation-WhyDoesMyDefragNotPerfectlyOptimizeMyDisk.md)
- See [![ \* ](img/Bullit.gif) **Known problems**](../Manual/Manual-KnownProblems.md)
- See the [![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)
- If nothing happens at all, no MyDefrag window that pops-up, then you could try the following. Execute the following commandline in the "Start -\> Run" box, and then reboot. It will create a key in the registry that will disable the injection of LeakTrack (from Microsoft Debug Diagnostic Tool) into processes. LeakTrack is known to cause some programs not to load.
  |                                                                                                                          |
  |--------------------------------------------------------------------------------------------------------------------------|
  | `reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v LeakTrack /t REG_DWORD /d 0x0 /f` |

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-IHaveAProblem!.html`_
