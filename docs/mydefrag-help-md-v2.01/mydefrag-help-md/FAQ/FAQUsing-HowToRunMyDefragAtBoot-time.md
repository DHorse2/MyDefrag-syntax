## FAQ Using - How to run MyDefrag at boot-time?

It's very easy to run MyDefrag automatically in the background when the computer starts via the Windows Task Scheduler. First create (and test) the task, see [![ \* ](img/Bullit.gif) **How do I schedule a task, to run automatically every day?**](../FAQUsing/FAQUsing-HowDoIScheduleATaskToRunAutomaticallyEveryDay.md) Then come back here and change the properties of the task like this:

#### 2000, XP

- Start -\> Settings -\> Control Panel -\> Scheduled Tasks
- Open the properties of the task.
- Open the "Schedule" tab.
- From the "Schedule Task" pull-down select "At System Startup".

#### Vista

- Start -\> Settings -\> Control Panel -\> Administrative Tools -\> Task Scheduler
- Open the properties of the task.
- Open the "Triggers" tab, then edit or create a trigger.
- From the "begin the task" pulldown select "At Startup".

**Note:** This will not defragment system files such as the page file. To do that see the "see also" chapter for a link to Pagedefrag, a free utility by Microsoft Technet (formerly SysInternals).

### See also:

[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQUsing-HowToRunMyDefragAtBoot-time.html`_
