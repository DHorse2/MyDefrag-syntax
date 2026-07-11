# Scripts - FileBoolean

Select items (files, directories) for processing. There are several functions
  to choose from, and they can be combined in expressions with AND, OR, NOT, and
  parenthesis.

- Files that are selected with the FileBoolean of the global     [**ExcludeFiles**](../Settings/ExcludeFiles.md) setting are automatically excluded in     the FileBoolean of [**FileSelect**](FileSelect.md) statements.

### Example

```mydfrg
Fileselect
  Size(10000000,0) or Lastaccess("","1 Month Ago")
FileActions
  ....
FileEnd
```

### Actions

| [**(...)**](../FileBoolean/....md) |
| --- |
| [**All**](../FileBoolean/All.md) |
| [**AND**](../FileBoolean/AND.md) |
| [**Archive**](../FileBoolean/Archive.md) |
| [**AverageFragmentSize**](../FileBoolean/AverageFragmentSize.md) |
| [**Compressed**](../FileBoolean/Compressed.md) |
| [**CreationDate**](../FileBoolean/CreationDate.md) |
| [**Directory**](../FileBoolean/Directory.md) |
| [**DirectoryName**](../FileBoolean/DirectoryName.md) |
| [**DirectoryPath**](../FileBoolean/DirectoryPath.md) |
| [**Encrypted**](../FileBoolean/Encrypted.md) |
| [**FileLocation**](../FileBoolean/FileLocation.md) |
| [**FileName**](../FileBoolean/FileName.md) |
| [**FragmentCount**](../FileBoolean/FragmentCount.md) |
| [**Fragmented**](../FileBoolean/Fragmented.md) |
| [**FullPath**](../FileBoolean/FullPath.md) |
| [**Hidden**](../FileBoolean/Hidden.md) |
| [**ImportListFromBootOptimize**](../FileBoolean/ImportListFromBootOptimize.md) |
| [**ImportListFromFile**](../FileBoolean/ImportListFromFile.md) |
| [**ImportListFromProgramHints**](../FileBoolean/ImportListFromProgramHints.md) |
| [**Largest**](../FileBoolean/Largest.md) |
| [**LargestFragmentSize**](../FileBoolean/LargestFragmentSize.md) |
| [**LastAccess**](../FileBoolean/LastAccess.md) |
| [**LastAccessEnabled**](../FileBoolean/LastAccessEnabled.md) |
| [**LastChange**](../FileBoolean/LastChange.md) |
| [**NOT**](../FileBoolean/NOT.md) |
| [**NotToBeIndexed**](../FileBoolean/NotToBeIndexed.md) |
| [**Offline**](../FileBoolean/Offline.md) |
| [**OR**](../FileBoolean/OR.md) |
| [**Readonly**](../FileBoolean/Readonly.md) |
| [**SelectNtfsSystemFiles**](../FileBoolean/SelectNtfsSystemFiles.md) |
| [**Size**](../FileBoolean/Size.md) |
| [**Smallest**](../FileBoolean/Smallest.md) |
| [**SmallestFragmentSize**](../FileBoolean/SmallestFragmentSize.md) |
| [**Sparse**](../FileBoolean/Sparse.md) |
| [**System**](../FileBoolean/System.md) |
| [**Temporary**](../FileBoolean/Temporary.md) |
| [**Unmovable**](../FileBoolean/Unmovable.md) |
| [**Virtual**](../FileBoolean/Virtual.md) |

### See also:

[**FileSelect**](FileSelect.md)

[**FileActions**](FileActions.md)

[**ExcludeFiles**](../Settings/ExcludeFiles.md)

[**Scripts**](../../manual/Scripts.md)
