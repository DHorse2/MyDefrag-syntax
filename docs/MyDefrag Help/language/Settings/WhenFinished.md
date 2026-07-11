# Settings - WhenFinished

This setting specifies what MyDefrag will do when it finishes executing
  a script. Default is to do nothing, the MyDefrag window will remain on the screen
  until the user stops the program.

- This setting is ignored by the screensaver version of MyDefrag.
- If the "Forced" option is not specified then a shutdown or reboot is not     guaranteed. MyDefrag will instruct Windows to do a "soft" reboot or shutdown,     but Windows may choose to ignore it, for example when the computer is locked     or when a program is running that refuses to be stopped.

### Syntax

```mydfrg
WhenFinished(PARAMETER)
```

### Parameter

| **Wait** |  | [default] Wait for the user to close the program. The diskmap remains on the     screen and the user can examine it.     If the [**WindowSize**](WindowSize.md) setting is "invisible" then this     setting is ignored and MyDefrag will always "exit". |  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Exit** |  | Stop the program, close the window. The user does not get a chance to examine     the results. |  |  |  |  |  |  |
| **Shutdown** |  | Shutdown (power off) the computer. In addition to "shutdown" you may specify     the following options:  **Reboot** Shutdown and reboot the computer.  **WarnUsers** Show a message to all users and wait for 30 seconds, giving the users         a chance to save their work and logoff.  **Forced**  Kill all programs without giving them a chance to save their data.         This can cause data loss. | **Reboot** | Shutdown and reboot the computer. | **WarnUsers** | Show a message to all users and wait for 30 seconds, giving the users         a chance to save their work and logoff. | **Forced** | Kill all programs without giving them a chance to save their data.         This can cause data loss. |
| **Reboot** | Shutdown and reboot the computer. |  |  |  |  |  |  |  |
| **WarnUsers** | Show a message to all users and wait for 30 seconds, giving the users         a chance to save their work and logoff. |  |  |  |  |  |  |  |
| **Forced** | Kill all programs without giving them a chance to save their data.         This can cause data loss. |  |  |  |  |  |  |  |
| **Hibernate** |  | Stop MyDefrag and hibernate the computer. In addition to "Hibernate" you may specify     the following option:  **Forced**  Kill all programs without giving them a chance to save their data.         This can cause data loss. | **Forced** | Kill all programs without giving them a chance to save their data.         This can cause data loss. |  |  |  |  |
| **Forced** | Kill all programs without giving them a chance to save their data.         This can cause data loss. |  |  |  |  |  |  |  |
| **Standby** |  | Stop MyDefrag and standby (sleep) the computer. In addition to "Standby" you may specify     the following option:  **Forced**  Kill all programs without giving them a chance to save their data.         This can cause data loss. | **Forced** | Kill all programs without giving them a chance to save their data.         This can cause data loss. |  |  |  |  |
| **Forced** | Kill all programs without giving them a chance to save their data.         This can cause data loss. |  |  |  |  |  |  |  |

### Example

```mydfrg
/* Automatically exit MyDefrag when it is finished. */
WhenFinished(Exit)
/* Do a soft shutdown. */
WhenFinished(Shutdown)
/* Warn the users and reboot after 30 seconds. */
WhenFinished(Shutdown WarnUsers Reboot)
```

### See also:

[**Settings**](../Scripts/Settings.md)
