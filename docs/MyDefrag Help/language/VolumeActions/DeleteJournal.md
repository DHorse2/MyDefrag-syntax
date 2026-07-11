# VolumeActions - DeleteJournal

Delete the Update Sequence Number (USN) change journal.
  The journal is stored in a huge file called "$Extend\$UsnJrnl:$J:$DATA" in the
  root of a volume, and is invisible to (most) applications.
  MyDefrag on Windows 7 can move and defragment the journal, but not on older Windows
  versions.

- The USN change journal is a database of all changes made to files on a volume.     Windows enters records into the journal when files, directories, and     other objects are added, deleted, and modified. Programs can consult the     journal to quickly determine all the modifications made to a set of files, much     more efficiently than checking time stamps or registering for file notifications.
- The journal is disabled by default, and automatically enabled and used by the     Indexing Service, File Replication Service (FRS), Remote Installation Service (RIS),     and Remote Storage. Third party programs can also use the USN change journal.
- After deleting the journal Windows will automatically create a new journal and     record volume changes from that moment on.
- Deleting the journal is usually safe, but can have consequences. Applications that     are using it will not see file changes between the last time the application ran and     when the journal was deleted. Well-programmed applications will detect that the     journal was deleted and will revert to an alternative method of finding changed     files.  **Note:** For the File Replication Service see the "Enable Journal Wrap     Automatic Restore" registry setting.
- Deleting the journal may take a long time on a volume with many files.
- The journal is an NTFS facility. It does not exist on FAT disks or other     filesystems.
- The journal is a sparse file. The size that is reported by Windows includes     unused blocks, the actual space occupied on disk is listed by MyDefrag in the     "clusters" column.
- The journal can also be deleted from the Windows Run commandline with the      **fsutil**     command, in Windows 2003/XP/Vista, not Windows 2000. The "fsutil" command must be     run as administrator and can take several minutes to finish.     Example of the commandline:  fsutil usn deletejournal /n c:

### Syntax

```mydfrg
DeleteJournal()
```

### Example

```mydfrg
VolumeSelect
  ...
VolumeActions
  ...
  # Delete the USN change journal.
  DeleteJournal()
  ...
VolumeEnd
```

### See also:

[**VolumeActions**](../Scripts/VolumeActions.md)
