# Debugging a Windows service

The usual approach is **not** to debug it only while installed as a service. Instead, design the executable so the same service logic can run in two modes:

```text
mdm-mcp-service.exe --console
mdm-mcp-service.exe --service
```

## 1. Run it as a console application first

In console mode, the program:

* Uses the same configuration.
* Starts the same supervisors and workers.
* Executes the same service logic.
* Writes logs directly to the terminal.
* Responds to `Ctrl+C` as a shutdown request.
* Does not register with the Windows Service Control Manager.

This gives you normal debugging:

* Breakpoints.
* Stack traces.
* standard output.
* interactive logging.
* debugger attachment from Visual Studio, VSCodium, or WinDbg.

For MCP, nearly all core logic should be testable this way.

```text
Service executable
├── shared application startup
├── shared MCP core
├── shared shutdown handling
├── console host
└── Windows service host
```

The service host should be a thin wrapper, not where the application logic lives.

---

## 2. Use very early file logging

A real service has no visible terminal, so logging must begin before most initialization occurs.

Log at least:

* Process startup.
* Executable path.
* Effective account.
* Working directory.
* Configuration path.
* Data paths.
* Windows session ID.
* Service-control events.
* Initialization stages.
* Worker creation.
* Shutdown reason.
* Errors with full causal chains.

For example:

```text
2026-07-20T16:14:02.117-07:00 INFO  service process started
2026-07-20T16:14:02.118-07:00 INFO  account=NT SERVICE\MdmMcp
2026-07-20T16:14:02.118-07:00 INFO  session=0
2026-07-20T16:14:02.119-07:00 INFO  config=D:\MdmMcp\config\service.toml
2026-07-20T16:14:02.121-07:00 INFO  initializing World
2026-07-20T16:14:02.483-07:00 ERROR filesystem initialization failed
    caused by: access denied opening D:\MdmMcp\data
```

The log location must be writable by the service account. Do not assume the service can write into the interactive user’s profile.

---

## 3. Attach a debugger to the running service

After installing and starting the service:

1. Start your debugger as administrator.
2. Find the service process by executable name or PID.
3. Attach to that process.
4. Set breakpoints.
5. Trigger the operation that needs investigation.

PowerShell can identify the PID:

```powershell
Get-CimInstance Win32_Service -Filter "Name='MdmMcp'" |
    Select-Object Name, State, ProcessId, StartName
```

Then attach Visual Studio, WinDbg, or another native debugger to that process.

For Rust, Visual Studio with native debugging, WinDbg, or VSCodium using CodeLLDB can attach to the executable if matching debug symbols are available.

---

## 4. Debug startup failures

Attaching can be difficult when the service crashes immediately. Common techniques are:

### Add a startup delay

Only enable this in a development build:

```text
MCP_SERVICE_DEBUG_WAIT_SECONDS=30
```

At startup, the service logs its PID and waits briefly, allowing the debugger to attach.

### Wait for a debugger flag

A better development mechanism is:

```text
mdm-mcp-service.exe --service --wait-for-debugger
```

The process starts, initializes logging, and waits until a debugger is detected or a timeout expires.

Do not leave an indefinite debugger wait in production because Windows expects services to report startup progress within bounded periods.

### Debug the same initialization in console mode

Most startup defects are easier to reproduce using:

```powershell
.\mdm-mcp-service.exe --console --config D:\MdmMcp\config\service.toml
```

Use the same account and paths where possible.

---

## 5. Reproduce the service account environment

A program may work perfectly under your account and fail as a service because the environments differ.

Investigate:

* Filesystem permissions.
* Registry permissions.
* `%USERPROFILE%`.
* `%APPDATA%` and `%LOCALAPPDATA%`.
* Working directory.
* PATH.
* mapped drives.
* network credentials.
* DPAPI-protected secrets.
* certificate stores.
* proxy settings.

Never depend on the current working directory. Resolve configuration and data paths explicitly.

Bad:

```rust
let config = std::fs::read_to_string("config/service.toml")?;
```

Better:

```rust
let config_path = resolve_config_path_from_cli_or_service_registry()?;
let config = std::fs::read_to_string(&config_path)?;
```

Mapped network drives are another common problem. A service may not see `Z:` even though you do. Prefer a UNC path:

```text
\\server\share\backup
```

---

## 6. Test service-control events

A Windows service receives control commands rather than terminal signals.

You need to test:

* Start.
* Stop.
* Shutdown.
* Pause and continue, if supported.
* Restart.
* System shutdown.
* Unexpected worker failure.

Useful commands include:

```powershell
Start-Service MdmMcp
Stop-Service MdmMcp
Restart-Service MdmMcp
Get-Service MdmMcp
```

Or:

```cmd
sc.exe query MdmMcp
sc.exe start MdmMcp
sc.exe stop MdmMcp
```

The stop handler should request cooperative shutdown rather than immediately terminating the process:

```text
Service Control Manager sends STOP
    ↓
service wrapper records stop pending
    ↓
cancellation token is set
    ↓
workers checkpoint and stop
    ↓
World flushes required state
    ↓
service reports stopped
```

---

## 7. Use Windows Event Viewer as a secondary channel

A service should write major lifecycle failures to the Windows Event Log:

* Service failed to initialize.
* Configuration invalid.
* Persistent database unavailable.
* Repeated crash loop.
* Unclean shutdown.
* Required service dependency missing.

Detailed operational traces belong in structured application logs. Event Viewer should contain the high-level incidents needed to diagnose why the service did not start.

Relevant locations include:

```text
Event Viewer
└── Windows Logs
    ├── Application
    └── System
```

Service Control Manager events usually appear in the **System** log.

---

## 8. Configure service recovery

Windows can automatically restart a failed service:

```cmd
sc.exe failure MdmMcp reset= 86400 actions= restart/5000/restart/15000/run/60000
```

But recovery must not hide the fault. Persist:

* Exit code.
* Panic or exception details.
* Last completed initialization stage.
* Active work orders.
* Last checkpoint.
* Restart count.

A crash loop should eventually stop automatic retries or enter a degraded state rather than endlessly damaging state or flooding logs.

---

## 9. Separate process crashes from worker failures

For MCP, not every failed background job should crash the Windows service.

```text
Windows service process
└── MCP supervisor
    ├── filesystem worker
    ├── indexing worker
    ├── graph worker
    ├── backup worker
    └── remote adapter worker
```

A worker failure should normally become:

```text
Work order failed
Worker restarted
Subsystem degraded
Circuit breaker opened
```

The entire service should terminate only when:

* Core state is corrupt.
* Required invariants are broken.
* Durable storage cannot be used safely.
* Service control infrastructure has failed.
* Continuing could cause data loss.

This makes debugging far easier because worker faults remain observable events rather than unexplained service disappearances.

---

## 10. Recommended Rust structure

For your Rust MCP service, I would structure startup approximately like this:

```rust
fn main() -> anyhow::Result<()> {
    initialize_early_logging()?;

    let mode = StartupMode::from_args();

    match mode {
        StartupMode::Console => run_console_host(),
        StartupMode::WindowsService => run_windows_service_host(),
    }
}
```

Both hosts call the same application function:

```rust
async fn run_mcp_application(
    config: AppConfig,
    shutdown: CancellationToken,
) -> anyhow::Result<()> {
    let app = AppContext::initialize(config).await?;
    app.run(shutdown).await
}
```

Only the hosting mechanism differs:

```text
Console host:
Ctrl+C → cancellation token

Windows service host:
SERVICE_CONTROL_STOP → cancellation token
```

That arrangement allows almost all debugging and automated testing to happen outside the Service Control Manager.

---

## Practical debugging sequence

1. Run the application in console mode.
2. Test the failing operation with full debug logging.
3. Install the service using exactly the intended configuration.
4. Confirm the service identity and filesystem permissions.
5. Start it and inspect application logs plus Event Viewer.
6. Attach a debugger if the fault occurs only under the service host.
7. Reproduce using the service account environment.
8. Test stop, restart, crash recovery, and interrupted work-order recovery.

The central design rule is:

> **Make the Windows service wrapper extremely small. Debug the MCP application as a normal process, then separately verify the service-hosting boundary.**
