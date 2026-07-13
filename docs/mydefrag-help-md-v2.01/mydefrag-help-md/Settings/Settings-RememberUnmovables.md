## Settings - RememberUnmovables

This setting controls wether or not MyDefrag will remember which files are unmovable. If set to "yes" (the default) then MyDefrag can prevent some unnecessary data movement.

- Default is "yes". Only the AnalyzeOnly script uses "no".
- The list of unmovable files is remembered in a file called "MyDefrag.dat" in the installation directory.
- The Microsoft defragmentation API does not have a facility to determine if a file is movable or not, so MyDefrag can only find out by actually trying to move a file (by commanding the API). This is wasteful and in some cases results in (a lot of) unnecessary data movement.
- The list is loaded just after analyzing a disk. Each unmovable file in the list is tested wether or not it is still unmovable by instructing the API to move the first 1000 clusters to a new location.
- New unmovable files are added to the list after completing a zone.

### Syntax

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-RememberUnmovables.html`_
