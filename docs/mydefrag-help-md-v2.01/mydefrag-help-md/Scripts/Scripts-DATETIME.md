## Scripts - DATETIME

Date/Times can specify an offset into the future or the past, or can be a literal date/time.

- MyDefrag does not know anything about the number of days in the month, leap years, first week of the year, gregorian calendar, and other things that can make date/time calculations so horribly complicated. A "day" is 86400 seconds, a "week" is 604800 seconds, a "month" is 2628000 seconds (30.416667 days), and a "year" is 31536000 seconds (365 days).

### Syntax

|                         |     |                                                                                                                                                                                                                                     |
|-------------------------|-----|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **YYYY-MM-DD HH:MM:SS** |     | Literal date/time (year-month-day hours:minutes:seconds).                                                                                                                                                                           |
| **YYYY/MM/DD HH:MM:SS** |     | Literal date/time (year/month/day hours:minutes:seconds).                                                                                                                                                                           |
| **HH:MM:SS**            |     | The current date/time plus a number of hours:minutes:seconds.                                                                                                                                                                       |
| **HH:MM:SS ago**        |     | The current date/time minus a number of hours:minutes:seconds.                                                                                                                                                                      |
| **NNNN**                |     | The current date/time plus a number of seconds. Please note that zero ("0") is interpreted as "zero seconds after now", not as "beginning of time".                                                                                 |
| **NNNN ago**            |     | The current date/time minus a number of seconds.                                                                                                                                                                                    |
| **NNNN SSSS**           |     | The current date/time plus a number of "SSSS", where SSSS is "years", "months", "days", "hours", "minutes", "seconds", or "weeks" (1 week is 7 days).                                                                               |
| **NNNN SSSS ago**       |     | The current date/time minus a number of "SSSS", where SSSS is "years", "months", "days", "hours", "minutes", "seconds", or "weeks" (1 week is 7 days).                                                                              |
| **now**                 |     | The current date/time.                                                                                                                                                                                                              |
| \[empty\]               |     | Empty date/time. This is used by some functions for "beginning of time" or "infinity", depending of the function. Please note that number "0" is interpreted as "zero seconds after now", not as "beginning of time" or "infinity". |

### Examples

|                         |     |                         |
|-------------------------|-----|-------------------------|
| **2008/10/13 23:12:06** |     | Literal date/time.      |
| **01:00:00**            |     | 1 hour into the future. |
| **15**                  |     | 15 seconds after now.   |
| **15 days ago**         |     | 15 days ago.            |

### See also:

[![ \* ](../img/Bullit.gif) **Scripts**](../Manual/Manual-Scripts.md)

---

_Source HTML: `Scripts-DATETIME.html`_
