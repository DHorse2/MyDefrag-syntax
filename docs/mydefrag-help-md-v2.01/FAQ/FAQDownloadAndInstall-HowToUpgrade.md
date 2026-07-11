## FAQ Download And Install - How to upgrade?

MyDefrag scripts and settings are not upward (and downward) compatible. It is therefore not possible to upgrade by quickly installing a new MyDefrag version on top of an existing version. The program would not run because of incompatible settings, and the old scripts would generate all kinds of strange and mysterious error messages. To avoid these problems the MyDefrag installer will therefore install every version in it's own directory. Added benefits are that you can experiment with a new version before uninstalling the old version, and you can keep using custom scripts that you created for the old version.

Upgrading is easy if you have not made custom scripts. Simply uninstall the old version and install the new version. Or the other way around, whatever you like.

Upgrading is a bit more work if you have made custom scripts or have made changes to the default scripts (including the Settings.MyD script).

1.  Install the new MyDefrag.
2.  Copy your scripts to the Scripts directory of the new MyDefrag version. Scripts are generally not upwards compatible and you will probably have to make changes to the scripts. Just run a script and MyDefrag will tell you exactly what it does not like in the old script. Then look in the MyDefrag manual and make the necessary changes, it's usually not difficult.
3.  Uninstall the old MyDefrag when you don't need it any more.

**Tip:** Make a link to the "c:\Program Files\MyDefrag v4.3.1\\ folder, called for example "c:\Program Files\MyDefrag\\. Use this linked folder for your scheduled tasks and whatever. When a new MyDefrag version comes out you can quickly change the link to point to the new MyDefrag folder. This way you don't have to change any scheduled tasks, you can experiment with the new version before taking it into production, and you can quickly revert back to the old version when needed. For a tool to create such a link see the free [![ \* ](img/Bullit.gif)](http://technet.microsoft.com/en-us/sysinternals/bb896768.aspx) [**Junction**](http://technet.microsoft.com/en-us/sysinternals/bb896768.aspx) tool from Windows Sysinternals.

### See also:

[![ \* ](img/Bullit.gif) **Download and install**](../Manual/Manual-DownloadAndInstall.md)  
[![ \* ](img/Bullit.gif) **Frequently Asked Questions**](../Manual/Manual-FrequentlyAskedQuestions.md)

---

_Source HTML: `FAQ/FAQDownloadAndInstall-HowToUpgrade.html`_
