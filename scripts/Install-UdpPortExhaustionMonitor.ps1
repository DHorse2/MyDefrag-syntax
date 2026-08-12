#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [switch]$Uninstall,
    [string]$TaskName = 'MyDefrag UDP Port Exhaustion Capture',
    [string]$OutputDirectory = (Join-Path $env:ProgramData 'MyDefrag\Diagnostics\UdpPortExhaustion')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$captureScript = Join-Path $PSScriptRoot 'Capture-UdpPortExhaustion.ps1'
if (-not (Test-Path -LiteralPath $captureScript -PathType Leaf)) {
    throw "Capture script not found: $captureScript"
}

if ($Uninstall) {
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Output "Removed temporary diagnostic scheduled task '$TaskName'."
    } else {
        Write-Output "Temporary diagnostic scheduled task '$TaskName' is not installed."
    }
    Write-Output "Captured logs were preserved at '$OutputDirectory'."
    return
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$powerShellPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$arguments = '-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -OutputDirectory "{1}"' -f `
    $captureScript, $OutputDirectory
$subscription = @'
<QueryList><Query Id="0" Path="System"><Select Path="System">*[System[Provider[@Name='Tcpip'] and EventID=4266]]</Select></Query></QueryList>
'@
$escapedSubscription = [System.Security.SecurityElement]::Escape($subscription.Trim())
$escapedCommand = [System.Security.SecurityElement]::Escape($powerShellPath)
$escapedArguments = [System.Security.SecurityElement]::Escape($arguments)
$taskXml = @"
<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Temporary diagnostic: capture UDP socket ownership when Tcpip event 4266 reports ephemeral-port exhaustion.</Description>
  </RegistrationInfo>
  <Triggers>
    <EventTrigger>
      <Enabled>true</Enabled>
      <Subscription>$escapedSubscription</Subscription>
    </EventTrigger>
  </Triggers>
  <Principals>
    <Principal id="System">
      <UserId>S-1-5-18</UserId>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>Queue</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
  </Settings>
  <Actions Context="System">
    <Exec>
      <Command>$escapedCommand</Command>
      <Arguments>$escapedArguments</Arguments>
    </Exec>
  </Actions>
</Task>
"@

Register-ScheduledTask -TaskName $TaskName -Xml $taskXml -Force | Out-Null
$installedTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop

[pscustomobject]@{
    TaskName = $installedTask.TaskName
    State = $installedTask.State
    TemporaryDiagnostic = $true
    Trigger = 'System/Tcpip event 4266'
    CaptureScript = $captureScript
    OutputDirectory = $OutputDirectory
    UninstallCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Uninstall"
}
