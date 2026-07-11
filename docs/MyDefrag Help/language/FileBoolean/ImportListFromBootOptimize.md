# FileBoolean - ImportListFromBootOptimize

Select the files that are listed in the "%SystemRoot%\Prefetch\Layout.ini" file.
  Windows XP and Vista create a list of items (files, directories, streams, etc.) that are
  accessed when the computer boots. MyDefrag can use that list to place the items in a zone.
  If used in conjunction with the

[**SortByImportSequence**](../FileActions/SortByImportSequence.md)

function it will place the items in the order in which they are loaded when booting.

- If an item was already placed in a previous zone then it will not be selected     and will not be moved. For example, the default Optimize scripts first place the MFT,     then the directories, and then the items used when booting. The MFT and the     directories are used when booting, but are not moved to the boot optimization zone     because they have already been placed in a previous zone.
- If you have a multiboot environment then the disk(s) will be optimized for the     currently booted Windows.
- Boot optimization is not limited to the volume where Windows is installed. If     Windows uses items on other volumes, then those other volumes will also be boot     optimized.

### Syntax

```mydfrg
ImportListFromBootOptimize()
```

### Example

```mydfrg
# Optimize the disks for faster booting.
FileSelect
  ImportListFromBootOptimize()
FileActions
  SortByImportSequence(Ascending)
FileEnd
```

### Changing the list

The "layout.ini" file is a standard Unicode text file and you can look at it
  with for example the Windows Notepad text editor.
  Microsoft (and I) feel that booting is finished when the desktop is visible and all
  programs have been started. The "layout.ini" file therefore lists all items that
  are used by Windows itself and by the first 32 programs that run after booting.
  The list is automatically updated by Windows, look at the date/time of the file to see
  when it was updated last. You can force an update with the following commandline.

| `Rundll32.exe advapi32.dll,ProcessIdleTasks` |
| --- |

The list can contain some surprising items, files that you were not expecting to be accessed while booting. For example, Windows seems to scan lot's of folders when booting, perhaps it is looking for drivers or DLL's. The folders are listed in the layout.ini file, but the contents of the folders is not. Another example is that many programs contain their icon inside the main executable program. The executable will therefore be listed, not because the program was run when booting but because Windows needed to show the icon on the desktop. The same applies for other kinds of files, for example a big movie may end up in the list because you have a media player that is started in the background that does a quick check to see if the last played file is still there. Other background programs can do similar things.

It's possible to change the list in several ways. The easiest way is to use the standard MyDefrag scripting commands. For example, to exclude all files larger than 100 megabytes you can do this:

| # Create zone with files that are used while booting and are smaller than 100Mb.    FileSelect      ImportListFromBootOptimize() and Size(0,100MB)    FileActions      SortByImportSequence(Ascending)    FileEnd |
| --- |

Another way to change the list is by making a copy of the file, editing the file, and then using the MyDefrag [**ImportListFromFile**](ImportListFromFile.md) fileboolean to import the file. The advantage is that you will get a MyDefrag zone that changes very little. The disadvantage is that you have to do it all over again when something changes on the computer, for example when you install a new driver.

### See also:

[**SortByImportSequence**](../FileActions/SortByImportSequence.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
