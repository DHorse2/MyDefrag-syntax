[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $env:ProgramData 'MyDefrag\Diagnostics\UdpPortExhaustion')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$capturedAt = Get-Date
$captureId = '{0}-{1}' -f $capturedAt.ToString('yyyyMMdd-HHmmss-fff'), $PID
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$captureErrors = [System.Collections.Generic.List[string]]::new()
$netstatLines = @()
$udpEndpoints = @()
$recentEvents = @()

try {
    $netstatLines = @(& "$env:SystemRoot\System32\netstat.exe" -anoq 2>&1)
} catch {
    $captureErrors.Add("netstat: $($_.Exception.Message)")
}

try {
    $udpEndpoints = @(Get-NetUDPEndpoint -ErrorAction Stop | Select-Object `
        LocalAddress, LocalPort, OwningProcess, CreationTime)
} catch {
    $captureErrors.Add("Get-NetUDPEndpoint (using netstat fallback): $($_.Exception.Message)")
    $udpEndpoints = @($netstatLines | ForEach-Object {
        if ($_ -match '^\s*UDP\s+(\S+):(\d+)\s+\*:\*\s+(\d+)\s*$') {
            [pscustomobject]@{
                LocalAddress = $Matches[1]
                LocalPort = [int]$Matches[2]
                OwningProcess = [int]$Matches[3]
                CreationTime = $null
            }
        }
    })
}

try {
    $recentEvents = @(Get-WinEvent -FilterHashtable @{
        LogName = 'System'
        ProviderName = 'Tcpip'
        Id = 4266
        StartTime = $capturedAt.AddMinutes(-10)
    } -ErrorAction Stop | Select-Object TimeCreated, RecordId, ProviderName, Id, LevelDisplayName, Message)
} catch {
    if ($_.FullyQualifiedErrorId -notlike 'NoMatchingEventsFound*') {
        $captureErrors.Add("Get-WinEvent: $($_.Exception.Message)")
    }
}

$endpointGroups = @($udpEndpoints | Group-Object OwningProcess | Sort-Object Count -Descending)
$processes = foreach ($group in $endpointGroups) {
    $processId = [int]$group.Name
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    [pscustomobject]@{
        ProcessId = $processId
        ProcessName = $(if ($process) { $process.ProcessName } else { $null })
        EndpointCount = $group.Count
        HandleCount = $(if ($process) { $process.HandleCount } else { $null })
        StartTime = $(if ($process) { $process.StartTime } else { $null })
        Path = $(if ($process) { $process.Path } else { $null })
    }
}

$dynamicPortRanges = @()
foreach ($addressFamily in @('ipv4', 'ipv6')) {
    try {
        $dynamicPortRanges += [pscustomobject]@{
            AddressFamily = $addressFamily
            Output = @(& "$env:SystemRoot\System32\netsh.exe" int $addressFamily show dynamicport udp 2>&1)
        }
    } catch {
        $captureErrors.Add("netsh ${addressFamily}: $($_.Exception.Message)")
    }
}

$payload = [ordered]@{
    SchemaVersion = '1.0'
    TemporaryDiagnostic = $true
    CaptureId = $captureId
    CapturedAt = $capturedAt.ToUniversalTime().ToString('o')
    ComputerName = $env:COMPUTERNAME
    Trigger = 'System/Tcpip event 4266'
    UdpEndpointCount = $udpEndpoints.Count
    ProcessesByUdpEndpointCount = @($processes)
    UdpEndpoints = @($udpEndpoints)
    DynamicPortRanges = $dynamicPortRanges
    RecentTriggerEvents = @($recentEvents)
    CaptureErrors = @($captureErrors)
}

$jsonPath = Join-Path $OutputDirectory "$captureId.json"
$temporaryJsonPath = "$jsonPath.tmp"
$netstatPath = Join-Path $OutputDirectory "$captureId-netstat.txt"

$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $temporaryJsonPath -Encoding utf8
Move-Item -LiteralPath $temporaryJsonPath -Destination $jsonPath
$netstatLines | Set-Content -LiteralPath $netstatPath -Encoding utf8

[pscustomobject]@{
    CaptureId = $captureId
    JsonPath = $jsonPath
    NetstatPath = $netstatPath
    UdpEndpointCount = $udpEndpoints.Count
    CaptureErrorCount = $captureErrors.Count
}
