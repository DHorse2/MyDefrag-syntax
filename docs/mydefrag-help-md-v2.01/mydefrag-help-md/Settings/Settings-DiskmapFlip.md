## Settings - DiskmapFlip

This setting controls if the diskmap shows the beginning of the disk at the top-left (no) or at the bottom-left (yes).

- Default is "yes". The beginning of the disk is the fastest part of the disk, so that's where MyDefrag moves all the data. With the default DiskmapFlip(yes) setting the data will be shown at the bottom of the screen, with empty space above. Bits and bytes don't care about gravity, but my stupid brain still finds this display more natural than the DiskmapFlip(no) setting, where the data seems to be floating above empty space.
- Television screens draw the picture line by line, starting at the top-left. I don't know why the inventors chose to do it like that, perhaps they just followed the layout of a written page of text. Computer video memory therefore also starts at the top-left, it starts at zero and counts up, showing one pixel at a time. Drawing a diskmap is therefore easiest to do with the beginning of the disk (zero) at the top-left, and this is what most defragmenters do. Years ago the earliest versions of JkDefrag also did it like that, but I didn't like it and at some point in time added extra code to flip the diskmap.

### Syntax

[TABLE]

### See also:

[![ \* ](../img/Bullit.gif) **Settings**](../Scripts/Scripts-Settings.md)

---

_Source HTML: `Settings-DiskmapFlip.html`_
