# Notice: Language App Startup Stall and Port-Exhaustion Investigation

Status: Active temporary diagnostic as of 2026-08-11.

This notice records the reported symptom, the evidence presently available,
the distinction between the Chromium message and the suspected Windows cause,
and the conditions for removing the temporary diagnostic instrumentation.

## Table of Contents

- [Purpose](#purpose)
- [Reported Issue](#reported-issue)
- [What the Chromium Message Establishes](#what-the-chromium-message-establishes)
- [Why Port Exhaustion Is Suspected](#why-port-exhaustion-is-suspected)
- [Current Instrumentation](#current-instrumentation)
  - [Temporary Scheduled Task](#temporary-scheduled-task)
  - [Permanent Application Diagnostics](#permanent-application-diagnostics)
- [Removal Criteria](#removal-criteria)
- [Uninstall and Verification](#uninstall-and-verification)
- [Data Handling](#data-handling)
- [Sources](#sources)

## Purpose

This is an investigation notice, not a completed root-cause declaration.
Chromium confirms what its error message means, while the Windows event history
makes UDP ephemeral-port exhaustion the strongest current environmental
hypothesis. The process responsible for the exhaustion has not yet been
identified.

No dynamic-port range was changed. No process is automatically terminated or
restarted, and the diagnostic does not transmit its captures elsewhere.

## Reported Issue

The reported incident has these terms:

- The computer had been idle for roughly one day with the display off.
- No sleep or wake transition was found for the relevant idle interval.
- The first `npm run language:app` launch did not display its existing splash
  window for approximately one minute.
- Electron then reported the Chromium network-service restart message. The
  launch was subsequently interrupted and exited with `SIGINT`.
- Later launches normally behaved correctly for the rest of the day.
- Windows had recorded System/Tcpip event 4266 for global UDP ephemeral-port
  exhaustion seven times in the preceding fourteen days, including
  2026-08-11 15:23:21. That event was on the incident day, but it was not
  simultaneous with the 20:26 application launch.
- An elevated inventory after recovery found only 43 UDP endpoints, so the
  historical event could no longer identify the process that had held the
  ports.

The absence of a sleep transition makes a resume-specific application defect
less likely. The timing gap between event 4266 and the application stall means
that port exhaustion remains a supported hypothesis, not proven causation.

## What the Chromium Message Establishes

The relevant Chromium branch runs when the network-service remote was already
bound but is no longer connected. Chromium installs a disconnect handler,
emits the message when `service_was_bound` is true, and launches a replacement
Network Service process:

> “Network service crashed or was terminated, restarting service.”
>
> — [Chromium source](https://chromium.googlesource.com/chromium/src/+/master/content/browser/network_service_instance_impl.cc#658)

This establishes that Chromium detected loss of its existing Network Service
and attempted recovery. It does not distinguish a crash from an external
termination, and it does not identify port exhaustion or any other root cause.

The line number in an Electron log belongs to the Chromium revision bundled
with that Electron release. It can differ from the current Chromium `master`
line number without changing the meaning of the message.

## Why Port Exhaustion Is Suspected

Microsoft describes ephemeral ports as the client-side ports used to create
outbound connections. When they are all consumed, new connection attempts can
fail. It also describes the reported recover-then-recur pattern: after a
restart, the “symptoms come back after a period of time.”

For investigation, Microsoft states:

> “The key is to identify which process or application”

It also warns about increasing the dynamic range:

> “not a permanent solution but only temporary.”

These statements are from the
[Microsoft port-exhaustion guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/tcp-ip-port-exhaustion-troubleshooting).

Microsoft's examples focus heavily on TCP states such as `TIME_WAIT`, while the
local Windows evidence specifically reports global **UDP** ephemeral-port
exhaustion. Windows maintains separate TCP and UDP dynamic ranges. Therefore,
the temporary capture targets UDP endpoints and owning process IDs rather than
assuming that the TCP examples alone describe this incident.

The Microsoft guidance supports identifying and correcting the consuming
process. Merely rebooting or expanding the port range can hide the condition
temporarily without resolving a socket leak.

## Current Instrumentation

<!-- markdownlint-disable MD013 -->

| Component | Status | Permanence | Purpose |
| --- | --- | --- | --- |
| `MyDefrag UDP Port Exhaustion Capture` Scheduled Task | Installed, enabled, Ready | Temporary | Capture ownership when Tcpip event 4266 occurs |
| `scripts/Capture-UdpPortExhaustion.ps1` | Repository file | Permanent | Produce repeatable JSON and `netstat` evidence |
| `scripts/Install-UdpPortExhaustionMonitor.ps1` | Repository file | Permanent | Install or remove the temporary task |
| Language-app startup JSONL logging | Enabled | Permanent | Record startup phases and Electron process failures |
| Immediate startup splash and dedicated Electron profile | Enabled | Permanent | Keep startup visible and isolate application state |

<!-- markdownlint-enable MD013 -->

### Temporary Scheduled Task

The task runs as Local System only when Windows writes System/Tcpip event 4266.
It has a five-minute execution limit and writes to:

```text
%ProgramData%\MyDefrag\Diagnostics\UdpPortExhaustion\
```

Each capture includes:

- the trigger time and recent event 4266 records;
- UDP local addresses, ports, and owning process IDs;
- process names, executable paths, start times, and handle counts;
- the IPv4 and IPv6 UDP dynamic-port ranges;
- raw `netstat -anoq` output; and
- any capture errors.

Process command lines are deliberately excluded because they can contain
credentials, tokens, or other sensitive arguments.

An on-demand installation test completed with task result `0`, recording 45
UDP endpoints across 13 process groups with no capture errors. That test proves
the task can run; it is not evidence that the machine was exhausted during the
test.

### Permanent Application Diagnostics

The Language Maintenance app now displays its splash immediately and reports
real startup phases. It uses this dedicated profile:

```text
%APPDATA%\MyDefrag Language Maintenance\
```

Append-only startup logs are written below the profile's `logs` directory.
They record child-process loss, renderer loss, load failures, preload failures,
and renderer responsiveness. These application diagnostics remain useful even
after the Windows Scheduled Task is removed.

## Removal Criteria

The Scheduled Task is temporary and should not remain installed indefinitely.
Remove it when the first applicable condition below is met:

1. A qualifying recurrence produces an event-triggered capture, timestamps
   connect it to the reported startup cycle, and the evidence identifies a
   candidate consuming process. Preserve the evidence, assign or complete the
   process-level investigation, and then remove the task. A single explicitly
   planned post-fix verification cycle may be retained before removal.
2. A process-level fix is applied and the machine completes fourteen
   consecutive days without another qualifying startup stall or Tcpip 4266
   event. The fourteen-day observation period is a project-specific closure
   criterion chosen to cover the previously inspected fourteen-day event
   history; it is not a Microsoft requirement.
3. Two qualifying startup stalls occur without a corresponding Tcpip 4266
   event or capture during the same startup/idle cycle, and the application
   JSONL logs instead identify another failure point. At that point the UDP
   monitor is no longer testing the leading explanation and should be removed.
4. The investigation is closed, abandoned, or transferred to another approved
   collection method.
5. The repository or capture-script path will be moved. Remove the task before
   moving the script, then reinstall it only if this investigation remains
   active.

A qualifying recurrence means the first Language Maintenance launch after an
overnight or similarly long idle interval again shows no startup window for
approximately one minute, or records another Network Service loss during that
startup cycle.

Do not remove the task merely because launches work later the same day or a
restart temporarily clears the symptoms. That behavior is part of the reported
issue and is consistent with Microsoft's warning about temporary recovery.

## Uninstall and Verification

Run from an elevated PowerShell session:

```powershell
npm run language:diagnostics:uninstall
```

Verify removal:

```powershell
Get-ScheduledTask -TaskName 'MyDefrag UDP Port Exhaustion Capture' `
    -ErrorAction SilentlyContinue
```

No returned task confirms that the temporary monitor is removed. Uninstalling
does not delete the permanent scripts, application diagnostics, or captures.

## Data Handling

Captures remain local but can reveal process names, executable paths, socket
ownership, and network endpoint information. Restrict them to maintainers who
are investigating this incident.

The uninstall command deliberately preserves existing captures. After the
issue is closed and any required evidence has been retained elsewhere, a
maintainer may review and manually remove captures that are no longer needed.
There is no automatic retention deletion.

## Sources

- [Chromium `network_service_instance_impl.cc`](https://chromium.googlesource.com/chromium/src/+/master/content/browser/network_service_instance_impl.cc#658)
- [Microsoft: Troubleshoot port exhaustion issues](https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/tcp-ip-port-exhaustion-troubleshooting)
- [Local diagnosis execution record](../runs/2026-08-11/20260811-2037_83bdbb21_Diagnose-intermittent-post-idle-language-app-startup-stall/execution-record.md)
- [Instrumentation execution record](../runs/2026-08-11/20260811-2045_186fefbd_Implement-resilient-language-app-startup-diagnostics/execution-record.md)
- [UDP capture script](../scripts/Capture-UdpPortExhaustion.ps1)
- [Temporary monitor installer](../scripts/Install-UdpPortExhaustionMonitor.ps1)
- [Language Maintenance app documentation](language-maintenance-app.md#startup-profile-and-diagnostics)
