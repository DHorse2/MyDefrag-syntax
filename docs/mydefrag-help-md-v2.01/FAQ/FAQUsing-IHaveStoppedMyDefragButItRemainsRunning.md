## FAQ Using - I have stopped MyDefrag, but it remains running?

It may take a bit of time for the program to actually stop because MyDefrag will finish the current file in the background. Actually, it's not MyDefrag that finishes the file, but Windows itself. MyDefrag is based on the Microsoft defragmentation API and basically all it does is send "move this file to that location" commands to the API, and the API will finish the command no matter what. Windows will show the MyDefrag process as still alive until the API has finished with the file, even though MyDefrag has already stopped.

### See also:

[![ \* ](img/Bullit.gif) **Is it safe to stop MyDefrag?**](FAQUsing-IsItSafeToStopMyDefrag.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-IHaveStoppedMyDefragButItRemainsRunning.html`_
