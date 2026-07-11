# Settings - ExitIfTimeout

This setting is the number of seconds that MyDefrag will wait for
  getting an internal lock on data in memory that is shared between threads.
  If the timeout is reached then MyDefrag will automatically exit.

- The timeout usually happens when the display thread is getting little or     no processing time from Windows (because the computer is busy with something     else), but can also happen at other points inside MyDefrag.
- Default is 120 seconds.
- The timeout is deactivated when NUMBER is zero.

### Syntax

```mydfrg
ExitIfTimeout(
NUMBER
)
```

### See also:

[**Settings**](../Scripts/Settings.md)
