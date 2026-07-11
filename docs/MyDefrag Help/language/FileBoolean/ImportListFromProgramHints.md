# FileBoolean - ImportListFromProgramHints

Select the files that are listed in the "%SystemRoot%\Prefetch\*.pf" files.

Windows XP and Vista create a logfile for every program that is started, containing (amongst other things) a list of items (files, directories, streams, etc.) that are accessed during the first 10 seconds of program startup. The logfiles are called "hint" files and are used by the Windows prefetcher to optimize disk access. MyDefrag can analyze the hint files and create a zone that contains all the referenced files. The zone will by default be sorted so that the most used program is first in the zone, with it's files in the order in which they are accessed.

- The STRING argument specifies which hint file(s) must be imported. Default is all     the files in the "%SystemRoot%\Prefetch" folder. You can specify a wildcard "*" to     match any character or "?" to match a single character. If the STRING contains a     backslash ("\") then it is assumed to be a full path to a folder, to be used instead of     the Windows prefetch folder.
- Hint files older than 30 days are ignored (skipped).
- The zone is sorted by how often programs have been started, the most started     program first. This number is one of the statistics available in the hint files.     Please note that a high number of startups does not necessarily mean that a program     is important to the user.
- If a file was already placed in a previous zone then it will not be selected     and will not be moved. For example, the default Optimize scripts first place the MFT,     then the directories, and then the items used when booting. The MFT and the     directories are used when starting a program, but are not moved to the program-hints zone     because they have already been placed in a previous zone.
- The hint files do not list all files that belong to a program. Only the files that     are accessed during the first 10 seconds of program startup.
- Program hints are not limited to the volume where Windows is installed. If     a program uses files on other volumes then those other volumes will also be optimized.
- If you have a multiboot environment then the disk(s) will be optimized for the     currently booted Windows.
- The hint files change a lot. A zone based on these files therefore also changes a     lot.

### Syntax

```mydfrg
ImportListFromProgramHints(
STRING
)
```

### Example

```mydfrg
# Optimize the disk for faster program startup.
FileSelect
  ImportListFromProgramHints("*")
FileActions
  SortByImportSequence(Ascending)
FileEnd
```

### See also:

[**SortByImportSequence**](../FileActions/SortByImportSequence.md)

[**FileSelect**](../Scripts/FileSelect.md)

[**FileBoolean**](../Scripts/FileBoolean.md)

[**FileActions**](../Scripts/FileActions.md)
