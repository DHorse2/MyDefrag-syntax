[CmdletBinding()]
param(
    [ValidateSet(
        'All',
        'Fast',
        'Syntax',
        'Core',
        'Server',
        'Parser',
        'Tokenizer',
        'LanguageData',
        'Completion',
        'Shared',
        'Utilities',
        'Diagnostics',
        'Manifest',
        'Extension',
        'Language',
        'LanguageValidation',
        'LanguageRuntime',
        'LanguageReport',
        'LanguageApp',
        'LocaleApp',
        'Apps',
        'Coverage'
    )]
    [string[]]$Suite = @('All'),

    [string]$ReportPath,

    [string]$JsonReportPath,

    [string]$JUnitReportPath,

    [switch]$DetailedConsole,

    [switch]$List
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$harnessPath = $MyInvocation.MyCommand.Path
$nodeReporterPath = Join-Path $PSScriptRoot 'node-test-jsonl-reporter.js'
$nodeReporterSpecifier = './' + (Get-Item -LiteralPath $nodeReporterPath).FullName.Substring(
    $projectRoot.TrimEnd('\', '/').Length + 1
).Replace('\', '/')
$nodeCommand = (Get-Command node.exe -ErrorAction Stop).Source
$npmCommand = (Get-Command npm.cmd -ErrorAction Stop).Source
$powerShellCommand = Join-Path $PSHOME 'powershell.exe'
$script:reportWriter = $null
$script:detailedConsole = $DetailedConsole.IsPresent
$script:executionNumber = 0
$script:executionResults = New-Object System.Collections.Generic.List[object]
$script:runArtifactDirectory = $null

function Get-RepositoryRelativePath {
    param(
        [AllowNull()]
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $rootPrefix = $script:projectRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    if ($fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $fullPath.Substring($rootPrefix.Length) -replace '\\', '/'
    }
    if ($fullPath.Equals($script:projectRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        return '.'
    }
    return $null
}

function ConvertTo-TestIdPart {
    param(
        [AllowEmptyString()]
        [string]$Value
    )

    $text = if ($null -eq $Value) { '' } else { $Value }
    return ($text -replace '[^A-Za-z0-9._/-]+', '-').Trim('-').ToLowerInvariant()
}

function Write-ReportLine {
    param(
        [AllowEmptyString()]
        [string]$Text = '',

        [switch]$ReportOnly
    )

    if (-not $ReportOnly -and $script:detailedConsole) {
        Write-Host $Text
    }
    if ($null -ne $script:reportWriter) {
        $script:reportWriter.WriteLine($Text)
    }
}

function Add-ExecutionResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Check,

        [Parameter(Mandatory = $true)]
        [string]$Runner,

        [Parameter(Mandatory = $true)]
        [string]$TestExecutable,

        [Parameter(Mandatory = $true)]
        [string]$Result,

        [Parameter(Mandatory = $true)]
        [double]$Seconds,

        [int]$NamedTests = 0,

        [string]$Detail = '',

        [System.Collections.IEnumerable]$TestCases = @(),

        [string]$EventsPath,

        [object]$Coverage
    )

    $script:executionResults.Add([PSCustomObject]@{
        Check = $Check
        Result = $Result
        Seconds = $Seconds
        NamedTests = $NamedTests
        Runner = $Runner
        RunnerRepositoryPath = Get-RepositoryRelativePath $Runner
        TestExecutable = $TestExecutable
        TestExecutableRepositoryPath = Get-RepositoryRelativePath $TestExecutable
        EventsPath = $EventsPath
        EventsRepositoryPath = Get-RepositoryRelativePath $EventsPath
        TestCases = @($TestCases | ForEach-Object { $_ })
        Coverage = $Coverage
        Detail = $Detail
    })
}

function Write-ExecutionHeader {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Check,

        [Parameter(Mandatory = $true)]
        [string]$Runner,

        [Parameter(Mandatory = $true)]
        [string]$TestExecutable,

        [string[]]$Arguments = @()
    )

    $script:executionNumber++
    Write-ReportLine ''
    Write-ReportLine ("#### Execution {0:D3}" -f $script:executionNumber)
    Write-ReportLine ''
    Write-ReportLine "- Check: $Check"
    Write-ReportLine "- Runner executable: ``$Runner``"
    $runnerRepositoryPath = Get-RepositoryRelativePath $Runner
    if ($runnerRepositoryPath) {
        Write-ReportLine "- Runner repository path: ``$runnerRepositoryPath``"
    }
    Write-ReportLine "- Test executable: ``$TestExecutable``"
    $testRepositoryPath = Get-RepositoryRelativePath $TestExecutable
    if ($testRepositoryPath) {
        Write-ReportLine "- Test repository path: ``$testRepositoryPath``"
    }
    if ($Arguments.Count -gt 0) {
        Write-ReportLine "- Arguments: ``$($Arguments -join ' ')``"
    }
    if (-not $script:detailedConsole) {
        Write-Host ("[{0:D3}] {1}: {2}" -f `
            $script:executionNumber,
            $Check,
            $TestExecutable)
    }
}

function Invoke-NativeTest {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Check,

        [Parameter(Mandatory = $true)]
        [string]$Runner,

        [Parameter(Mandatory = $true)]
        [string]$TestExecutable,

        [string[]]$Arguments = @(),

        [switch]$DetailedOutput,

        [string]$EventsPath
    )

    Write-ExecutionHeader `
        -Check $Check `
        -Runner $Runner `
        -TestExecutable $TestExecutable `
        -Arguments $Arguments

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $process = New-Object System.Diagnostics.Process
    try {
        $process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
        $process.StartInfo.FileName = $Runner
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.CreateNoWindow = $true
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        $process.StartInfo.Arguments = @(
            foreach ($argument in $Arguments) {
                if ($argument -match '[\s"]') {
                    '"{0}"' -f ($argument -replace '"', '\"')
                } else {
                    $argument
                }
            }
        ) -join ' '
        [void]$process.Start()
        $standardOutputTask = $process.StandardOutput.ReadToEndAsync()
        $standardErrorTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $standardOutput = $standardOutputTask.Result
        $standardError = $standardErrorTask.Result
        $exitCode = $process.ExitCode
    } finally {
        $stopwatch.Stop()
        $process.Dispose()
    }

    $output = New-Object System.Collections.Generic.List[string]
    foreach ($streamText in @($standardOutput, $standardError)) {
        if (-not [string]::IsNullOrEmpty($streamText)) {
            $trimmedText = $streamText.TrimEnd([char[]]"`r`n")
            foreach ($line in ($trimmedText -split '\r?\n')) {
                $output.Add($line)
            }
        }
    }
    $result = if ($exitCode -eq 0) { 'Passed' } else { 'Failed' }
    $detail = if ($exitCode -eq 0) { '' } else { "Exit code $exitCode" }
    $testCases = New-Object System.Collections.Generic.List[object]
    $coverage = $null
    if ($EventsPath -and (Test-Path -LiteralPath $EventsPath -PathType Leaf)) {
        foreach ($eventLine in (Get-Content -LiteralPath $EventsPath)) {
            if ([string]::IsNullOrWhiteSpace($eventLine)) {
                continue
            }
            $event = $eventLine | ConvertFrom-Json
            if ($event.type -eq 'test:coverage' -and $event.summary) {
                $coverageFiles = @(
                    foreach ($coverageFile in $event.summary.files) {
                        [PSCustomObject]@{
                            path = $coverageFile.path
                            repositoryPath = Get-RepositoryRelativePath $coverageFile.path
                            totalLines = $coverageFile.totalLineCount
                            coveredLines = $coverageFile.coveredLineCount
                            linePercent = $coverageFile.coveredLinePercent
                            totalBranches = $coverageFile.totalBranchCount
                            coveredBranches = $coverageFile.coveredBranchCount
                            branchPercent = $coverageFile.coveredBranchPercent
                            totalFunctions = $coverageFile.totalFunctionCount
                            coveredFunctions = $coverageFile.coveredFunctionCount
                            functionPercent = $coverageFile.coveredFunctionPercent
                        }
                    }
                )
                $measuredPaths = @{}
                foreach ($coverageFile in $coverageFiles) {
                    $measuredPaths[[string]$coverageFile.path.ToLowerInvariant()] = $true
                }
                $unmeasuredFiles = @(
                    Get-ChildItem -LiteralPath (Join-Path $script:projectRoot 'src') `
                        -Recurse -File -Filter '*.js' |
                        Where-Object {
                            $_.Name -notlike '*.test.js' -and
                            -not $measuredPaths.ContainsKey($_.FullName.ToLowerInvariant())
                        } |
                        Sort-Object FullName |
                        ForEach-Object {
                            [PSCustomObject]@{
                                path = $_.FullName
                                repositoryPath = Get-RepositoryRelativePath $_.FullName
                            }
                        }
                )
                $coverage = [PSCustomObject]@{
                    scope = 'modules-loaded-by-function-tests'
                    totals = $event.summary.totals
                    files = $coverageFiles
                    unmeasuredFiles = $unmeasuredFiles
                }
                continue
            }
            if ($event.type -notin @('test:pass', 'test:fail')) {
                continue
            }
            $testFile = if ($event.file) {
                [System.IO.Path]::GetFullPath([string]$event.file)
            } else {
                $TestExecutable
            }
            $testRepositoryPath = Get-RepositoryRelativePath $testFile
            $testName = [string]$event.name
            $testId = '{0}::{1}' -f `
                (ConvertTo-TestIdPart $testRepositoryPath), `
                (ConvertTo-TestIdPart $testName)
            $testCases.Add([PSCustomObject]@{
                Id = $testId
                Name = $testName
                Status = if ($event.type -eq 'test:pass') { 'Passed' } else { 'Failed' }
                DurationMilliseconds = $event.durationMs
                TestExecutable = $testFile
                TestExecutableRepositoryPath = $testRepositoryPath
                Line = $event.line
                Column = $event.column
                Error = if ($event.PSObject.Properties.Name -contains 'error') {
                    $event.error
                } else {
                    $null
                }
            })
        }
    }
    $namedTests = $testCases.Count
    if ($namedTests -eq 0) {
        foreach ($line in $output) {
            if ($line -match 'tests\s+([0-9]+)\s*$') {
                $namedTests += [int]$Matches[1]
            }
        }
    }

    if ($DetailedOutput -or $output.Count -gt 0) {
        Write-ReportLine ''
        Write-ReportLine '```text'
        if ($output.Count -eq 0) {
            Write-ReportLine '(no output)'
        } else {
            foreach ($line in $output) {
                Write-ReportLine ([string]$line)
            }
        }
        Write-ReportLine '```'
    }
    Write-ReportLine ''
    Write-ReportLine ("- Result: {0} ({1:N2} seconds)" -f $result, $stopwatch.Elapsed.TotalSeconds)

    $testCaseArray = @($testCases | ForEach-Object { $_ })
    Add-ExecutionResult `
        -Check $Check `
        -Runner $Runner `
        -TestExecutable $TestExecutable `
        -Result $result `
        -Seconds ([Math]::Round($stopwatch.Elapsed.TotalSeconds, 2)) `
        -NamedTests $namedTests `
        -Detail $detail `
        -TestCases $testCaseArray `
        -EventsPath $EventsPath `
        -Coverage $coverage

    return $exitCode
}

function Invoke-NodeTestFiles {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Check,

        [Parameter(Mandatory = $true)]
        [System.IO.FileInfo[]]$Files
    )

    $failedFiles = New-Object System.Collections.Generic.List[string]
    foreach ($file in $Files) {
        $eventsDirectory = Join-Path $script:runArtifactDirectory 'events'
        [void](New-Item -ItemType Directory -Path $eventsDirectory -Force)
        $eventsName = '{0:D3}-{1}.jsonl' -f `
            ($script:executionNumber + 1), `
            ([System.IO.Path]::GetFileNameWithoutExtension($file.Name))
        $eventsPath = Join-Path $eventsDirectory $eventsName
        $exitCode = Invoke-NativeTest `
            -Check $Check `
            -Runner $script:nodeCommand `
            -TestExecutable $file.FullName `
            -Arguments @(
                '--test',
                '--test-reporter=spec',
                '--test-reporter-destination=stdout',
                "--test-reporter=$script:nodeReporterSpecifier",
                "--test-reporter-destination=$eventsPath",
                $file.FullName
            ) `
            -DetailedOutput `
            -EventsPath $eventsPath
        if ($exitCode -ne 0) {
            $failedFiles.Add($file.FullName)
        }
    }

    if ($failedFiles.Count -gt 0) {
        throw "Node tests failed: $($failedFiles -join ', ')"
    }
}

function Invoke-NodeTestBatch {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Check,

        [Parameter(Mandatory = $true)]
        [System.IO.FileInfo[]]$Files,

        [string[]]$AdditionalArguments = @()
    )

    $eventsDirectory = Join-Path $script:runArtifactDirectory 'events'
    [void](New-Item -ItemType Directory -Path $eventsDirectory -Force)
    $eventsPath = Join-Path $eventsDirectory ('{0:D3}-{1}.jsonl' -f `
        ($script:executionNumber + 1), `
        (ConvertTo-TestIdPart $Check))
    $arguments = @(
        $AdditionalArguments
        '--test'
        '--test-reporter=spec'
        '--test-reporter-destination=stdout'
        "--test-reporter=$script:nodeReporterSpecifier"
        "--test-reporter-destination=$eventsPath"
        foreach ($file in $Files) {
            $file.FullName
        }
    )
    $testRoot = Join-Path $script:projectRoot 'src'
    $exitCode = Invoke-NativeTest `
        -Check $Check `
        -Runner $script:nodeCommand `
        -TestExecutable $testRoot `
        -Arguments $arguments `
        -DetailedOutput `
        -EventsPath $eventsPath
    if ($exitCode -ne 0) {
        throw "Node test batch '$Check' failed with exit code $exitCode."
    }
}

function Invoke-NodeScript {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Check,

        [Parameter(Mandatory = $true)]
        [string]$Path,

        [string[]]$Arguments = @()
    )

    $nodeArguments = @($Path) + $Arguments
    $exitCode = Invoke-NativeTest `
        -Check $Check `
        -Runner $script:nodeCommand `
        -TestExecutable $Path `
        -Arguments $nodeArguments `
        -DetailedOutput
    if ($exitCode -ne 0) {
        throw "Node test executable '$Path' failed with exit code $exitCode."
    }
}

function Test-JavaScriptSyntax {
    $roots = @(
        (Join-Path $script:projectRoot 'src'),
        (Join-Path $script:projectRoot 'build\scripts'),
        (Join-Path $script:projectRoot 'build\mdl-language-app'),
        (Join-Path $script:projectRoot 'build\mdl-locale-app')
    )
    $files = @(
        $roots |
            Where-Object { Test-Path -LiteralPath $_ -PathType Container } |
            ForEach-Object {
                Get-ChildItem -LiteralPath $_ -Recurse -File -Filter '*.js'
            } |
            Sort-Object FullName -Unique
    )

    $failedFiles = New-Object System.Collections.Generic.List[string]
    foreach ($file in $files) {
        $exitCode = Invoke-NativeTest `
            -Check 'JavaScriptSyntax' `
            -Runner $script:nodeCommand `
            -TestExecutable $file.FullName `
            -Arguments @('--check', $file.FullName)
        if ($exitCode -ne 0) {
            $failedFiles.Add($file.FullName)
        }
    }

    if ($failedFiles.Count -gt 0) {
        throw "JavaScript syntax failed: $($failedFiles -join ', ')"
    }
}

function Test-PowerShellSyntax {
    $extensions = @('.ps1', '.psm1', '.psd1')
    $files = @(
        Get-ChildItem -LiteralPath $script:projectRoot -File |
            Where-Object { $_.Extension -in $extensions }
        Get-ChildItem -LiteralPath (Join-Path $script:projectRoot 'scripts') -Recurse -File |
            Where-Object { $_.Extension -in $extensions }
    ) | Sort-Object FullName -Unique

    $failures = New-Object System.Collections.Generic.List[string]
    foreach ($file in $files) {
        Write-ExecutionHeader `
            -Check 'PowerShellSyntax' `
            -Runner $script:powerShellCommand `
            -TestExecutable $file.FullName `
            -Arguments @('PowerShell AST parse only; target is not executed')

        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $tokens = $null
        $errors = $null
        [void][System.Management.Automation.Language.Parser]::ParseFile(
            $file.FullName,
            [ref]$tokens,
            [ref]$errors
        )
        $stopwatch.Stop()
        $result = if ($errors.Count -eq 0) { 'Passed' } else { 'Failed' }
        $detail = @(
            foreach ($parseError in $errors) {
                "$($file.FullName):$($parseError.Extent.StartLineNumber): $($parseError.Message)"
            }
        ) -join [Environment]::NewLine

        if ($errors.Count -gt 0) {
            Write-ReportLine ''
            Write-ReportLine '```text'
            foreach ($failure in ($detail -split [Environment]::NewLine)) {
                Write-ReportLine $failure
            }
            Write-ReportLine '```'
            $failures.Add($detail)
        }
        Write-ReportLine ''
        Write-ReportLine ("- Result: {0} ({1:N2} seconds)" -f $result, $stopwatch.Elapsed.TotalSeconds)
        Add-ExecutionResult `
            -Check 'PowerShellSyntax' `
            -Runner $script:powerShellCommand `
            -TestExecutable $file.FullName `
            -Result $result `
            -Seconds ([Math]::Round($stopwatch.Elapsed.TotalSeconds, 2)) `
            -NamedTests 0 `
            -Detail $detail
    }

    if ($failures.Count -gt 0) {
        throw "PowerShell syntax failed:`n$($failures -join [Environment]::NewLine)"
    }
}

$serverTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src\server') -File -Filter '*.test.js' |
        Sort-Object FullName
)
$completionTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src\completion') -File -Filter '*.test.js' |
        Sort-Object FullName
)
$sharedTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src\shared') -File -Filter '*.test.js' |
        Sort-Object FullName
)
$utilitiesTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src\utilities') -File -Filter '*.test.js' |
        Sort-Object FullName
)
$diagnosticTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src\diagnostics') -File -Filter '*.test.js' |
        Sort-Object FullName
)
$manifestTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'src') -File -Filter '*.test.js' |
        Sort-Object FullName
)
$extensionTests = @(
    $serverTests
    $completionTests
    $sharedTests
    $utilitiesTests
    $diagnosticTests
    $manifestTests
) | Sort-Object FullName -Unique
$languageAppTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'build\mdl-language-app\tests') `
        -File -Filter '*.test.js' |
        Sort-Object FullName
)
$localeAppTests = @(
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'build\mdl-locale-app\tests') `
        -File -Filter '*.test.js' |
        Sort-Object FullName
)
$languageBuilderPath = Join-Path $projectRoot 'build\scripts\build-language.js'
$languageRuntimeTestPath = Join-Path $projectRoot 'build\scripts\test-language-runtime.js'
$languageReportTestPath = Join-Path $projectRoot 'build\scripts\test-language-report.js'

$reportDomains = [ordered]@{
    Syntax = @{
        Label = 'Scripts and syntax'
        Slug = 'scripts-and-syntax'
    }
    Server = @{
        Label = 'Language server'
        Slug = 'language-server'
    }
    Extension = @{
        Label = 'Extension'
        Slug = 'extension'
    }
    LanguageTooling = @{
        Label = 'Language tooling'
        Slug = 'language-tooling'
    }
    LanguageApp = @{
        Label = 'Language Maintenance app'
        Slug = 'language-maintenance-app'
    }
    LocaleApp = @{
        Label = 'Locale Maintenance app'
        Slug = 'locale-maintenance-app'
    }
    Coverage = @{
        Label = 'Coverage'
        Slug = 'coverage'
    }
}

$checks = [ordered]@{
    JavaScriptSyntax = @{
        Group = 'Syntax'
        ReportDomain = 'Syntax'
        Description = 'Parse JavaScript used by the extension, language apps, and build scripts.'
        Action = { Test-JavaScriptSyntax }
    }
    PowerShellSyntax = @{
        Group = 'Syntax'
        ReportDomain = 'Syntax'
        Description = 'Parse root and scripts-library PowerShell files without executing them.'
        Action = { Test-PowerShellSyntax }
    }
    LanguageDataUnit = @{
        Group = 'LanguageData'
        ReportDomain = 'Server'
        Description = 'Run language keyword, parent, setting, and predefined-identifier tests.'
        Action = {
            Invoke-NodeTestFiles `
                -Check 'LanguageDataUnit' `
                -Files @($script:serverTests | Where-Object { $_.Name -eq 'languageData.test.js' })
        }
    }
    ParserUnit = @{
        Group = 'Parser'
        ReportDomain = 'Server'
        Description = 'Run full-statement, fragment, diagnostic-range, and trace formatting tests.'
        Action = {
            Invoke-NodeTestFiles `
                -Check 'ParserUnit' `
                -Files @($script:serverTests | Where-Object { $_.Name -eq 'parser.test.js' })
        }
    }
    TokenizerUnit = @{
        Group = 'Tokenizer'
        ReportDomain = 'Server'
        Description = 'Run token classification, comment, macro, punctuation, and offset tests.'
        Action = {
            Invoke-NodeTestFiles `
                -Check 'TokenizerUnit' `
                -Files @($script:serverTests | Where-Object { $_.Name -eq 'tokenizer.test.js' })
        }
    }
    CompletionUnit = @{
        Group = 'Completion'
        ReportDomain = 'Extension'
        Description = 'Run completion context, selection, template, and provider function tests.'
        Action = { Invoke-NodeTestFiles -Check 'CompletionUnit' -Files $script:completionTests }
    }
    SharedUnit = @{
        Group = 'Shared'
        ReportDomain = 'Extension'
        Description = 'Run catalog, INI, and path function tests.'
        Action = { Invoke-NodeTestFiles -Check 'SharedUnit' -Files $script:sharedTests }
    }
    UtilitiesUnit = @{
        Group = 'Utilities'
        ReportDomain = 'Extension'
        Description = 'Run file lookup, exclusion, range, and path utility tests.'
        Action = { Invoke-NodeTestFiles -Check 'UtilitiesUnit' -Files $script:utilitiesTests }
    }
    DiagnosticsUnit = @{
        Group = 'Diagnostics'
        ReportDomain = 'Extension'
        Description = 'Run diagnostic navigation, Explorer, state, and keyword function tests.'
        Action = { Invoke-NodeTestFiles -Check 'DiagnosticsUnit' -Files $script:diagnosticTests }
    }
    ManifestUnit = @{
        Group = 'Manifest'
        ReportDomain = 'Extension'
        Description = 'Validate extension entry points, languages, grammars, commands, menus, and settings.'
        Action = { Invoke-NodeTestFiles -Check 'ManifestUnit' -Files $script:manifestTests }
    }
    Coverage = @{
        Group = 'Coverage'
        ReportDomain = 'Coverage'
        Description = 'Run all extension function tests with Node source coverage.'
        Action = {
            Invoke-NodeTestBatch `
                -Check 'Coverage' `
                -Files $script:extensionTests `
                -AdditionalArguments @(
                    '--experimental-test-coverage',
                    '--test-coverage-include=src/**/*.js',
                    '--test-coverage-exclude=src/**/*.test.js'
                )
        }
    }
    LanguageValidation = @{
        Group = 'LanguageValidation'
        ReportDomain = 'LanguageTooling'
        Description = 'Validate authored and generated language data without writing it.'
        Action = {
            Invoke-NodeScript `
                -Check 'LanguageValidation' `
                -Path $script:languageBuilderPath `
                -Arguments @('validate')
        }
    }
    LanguageRuntime = @{
        Group = 'LanguageRuntime'
        ReportDomain = 'LanguageTooling'
        Description = 'Run language catalog runtime assertions.'
        Action = {
            Invoke-NodeScript -Check 'LanguageRuntime' -Path $script:languageRuntimeTestPath
        }
    }
    LanguageReport = @{
        Group = 'LanguageReport'
        ReportDomain = 'LanguageTooling'
        Description = 'Run isolated language build and report assertions.'
        Action = {
            Invoke-NodeScript -Check 'LanguageReport' -Path $script:languageReportTestPath
        }
    }
    LanguageApp = @{
        Group = 'LanguageApp'
        ReportDomain = 'LanguageApp'
        Description = 'Run each Language Maintenance app test file.'
        Action = { Invoke-NodeTestFiles -Check 'LanguageApp' -Files $script:languageAppTests }
    }
    LocaleApp = @{
        Group = 'LocaleApp'
        ReportDomain = 'LocaleApp'
        Description = 'Run each Locale Maintenance app test file.'
        Action = { Invoke-NodeTestFiles -Check 'LocaleApp' -Files $script:localeAppTests }
    }
}

if ($List) {
    @(
        foreach ($entry in $checks.GetEnumerator()) {
            [PSCustomObject]@{
                Check = $entry.Key
                Suite = $entry.Value.Group
                Description = $entry.Value.Description
            }
        }
    ) | Format-Table Check, Suite, Description -AutoSize | Out-Host
    exit 0
}

if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $reportDirectory = Join-Path $projectRoot 'artifacts\test-results'
    $reportName = 'MyDefragSyntax-TestReport-{0}-{1}.md' -f `
        (Get-Date -Format 'yyyyMMdd-HHmmss-fff'), `
        $PID
    $ReportPath = Join-Path $reportDirectory $reportName
} elseif (-not [System.IO.Path]::IsPathRooted($ReportPath)) {
    $ReportPath = Join-Path $projectRoot $ReportPath
}
$ReportPath = [System.IO.Path]::GetFullPath($ReportPath)
$reportDirectory = Split-Path -Parent $ReportPath
[void](New-Item -ItemType Directory -Path $reportDirectory -Force)
$runArtifactDirectory = Join-Path `
    $reportDirectory `
    ([System.IO.Path]::GetFileNameWithoutExtension($ReportPath))
[void](New-Item -ItemType Directory -Path $runArtifactDirectory -Force)
$script:runArtifactDirectory = $runArtifactDirectory
if ([string]::IsNullOrWhiteSpace($JsonReportPath)) {
    $JsonReportPath = [System.IO.Path]::ChangeExtension($ReportPath, '.json')
} elseif (-not [System.IO.Path]::IsPathRooted($JsonReportPath)) {
    $JsonReportPath = Join-Path $projectRoot $JsonReportPath
}
$JsonReportPath = [System.IO.Path]::GetFullPath($JsonReportPath)
[void](New-Item -ItemType Directory -Path (Split-Path -Parent $JsonReportPath) -Force)
if ([string]::IsNullOrWhiteSpace($JUnitReportPath)) {
    $JUnitReportPath = [System.IO.Path]::ChangeExtension($ReportPath, '.xml')
} elseif (-not [System.IO.Path]::IsPathRooted($JUnitReportPath)) {
    $JUnitReportPath = Join-Path $projectRoot $JUnitReportPath
}
$JUnitReportPath = [System.IO.Path]::GetFullPath($JUnitReportPath)
[void](New-Item -ItemType Directory -Path (Split-Path -Parent $JUnitReportPath) -Force)
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$script:reportWriter = New-Object System.IO.StreamWriter($ReportPath, $false, $utf8NoBom)
$script:reportWriter.AutoFlush = $true

$selectedGroups = @(
    foreach ($suiteName in $Suite) {
        switch ($suiteName) {
            'All' {
                'Syntax'
                'LanguageData'
                'Parser'
                'Tokenizer'
                'Completion'
                'Shared'
                'Utilities'
                'Diagnostics'
                'Manifest'
                'LanguageValidation'
                'LanguageRuntime'
                'LanguageReport'
                'LanguageApp'
                'LocaleApp'
                'Coverage'
            }
            'Fast' {
                'LanguageData'
                'Parser'
                'Tokenizer'
                'Completion'
                'Shared'
                'Utilities'
                'Diagnostics'
                'Manifest'
                'LanguageValidation'
                'LanguageRuntime'
                'LanguageReport'
                'LanguageApp'
                'LocaleApp'
            }
            'Server' {
                'LanguageData'
                'Parser'
                'Tokenizer'
            }
            { $_ -in @('Core', 'Extension') } {
                'LanguageData'
                'Parser'
                'Tokenizer'
                'Completion'
                'Shared'
                'Utilities'
                'Diagnostics'
                'Manifest'
            }
            'Apps' {
                'LanguageApp'
                'LocaleApp'
            }
            'Language' {
                'LanguageValidation'
                'LanguageRuntime'
                'LanguageReport'
            }
            default {
                $suiteName
            }
        }
    }
) | Select-Object -Unique
$selectedCheckLookup = @(
    $checks.GetEnumerator() |
        Where-Object { $_.Value.Group -in $selectedGroups }
)
$selectedChecks = @(
    foreach ($domainEntry in $reportDomains.GetEnumerator()) {
        foreach ($checkEntry in $selectedCheckLookup) {
            if ($checkEntry.Value.ReportDomain -eq $domainEntry.Key) {
                $checkEntry
            }
        }
    }
)
$selectedReportDomains = @(
    foreach ($domainEntry in $reportDomains.GetEnumerator()) {
        $domainCheckCount = @(
            $selectedChecks |
                Where-Object { $_.Value.ReportDomain -eq $domainEntry.Key }
        ).Count
        if ($domainCheckCount -gt 0) {
            $domainEntry
        }
    }
)

$startedAt = Get-Date
$results = New-Object System.Collections.Generic.List[object]
$exitCode = 0

Write-ReportLine '# MyDefrag Syntax Test Report'
Write-ReportLine ''
Write-ReportLine '<!-- markdownlint-disable MD013 MD060 -->'
Write-ReportLine ''
Write-ReportLine '## Table of Contents'
Write-ReportLine ''
Write-ReportLine '- [Run configuration](#run-configuration)'
Write-ReportLine '- [Detailed executions by tested domain](#detailed-executions-by-tested-domain)'
foreach ($domainEntry in $selectedReportDomains) {
    Write-ReportLine ("  - [{0}](#detailed-executions-for-{1})" -f `
        $domainEntry.Value.Label,
        $domainEntry.Value.Slug)
}
Write-ReportLine '- [Check summary](#check-summary)'
Write-ReportLine '- [Execution inventory by tested domain](#execution-inventory-by-tested-domain)'
foreach ($domainEntry in $selectedReportDomains) {
    Write-ReportLine ("  - [{0}](#execution-inventory-for-{1})" -f `
        $domainEntry.Value.Label,
        $domainEntry.Value.Slug)
}
Write-ReportLine '- [Named test inventory by tested domain](#named-test-inventory-by-tested-domain)'
foreach ($domainEntry in $selectedReportDomains) {
    Write-ReportLine ("  - [{0}](#named-tests-for-{1})" -f `
        $domainEntry.Value.Label,
        $domainEntry.Value.Slug)
}
if ('Coverage' -in $selectedGroups) {
    Write-ReportLine '- [Coverage metrics](#coverage-metrics)'
}
Write-ReportLine ''
Write-ReportLine '## Run configuration'
Write-ReportLine ''
Write-ReportLine "- Started: $($startedAt.ToString('o'))"
Write-ReportLine "- Project root: ``$projectRoot``"
Write-ReportLine "- Harness executable: ``$harnessPath``"
Write-ReportLine "- Harness repository path: ``$(Get-RepositoryRelativePath $harnessPath)``"
Write-ReportLine "- PowerShell executable: ``$powerShellCommand``"
Write-ReportLine "- Node executable: ``$nodeCommand``"
Write-ReportLine "- npm executable: ``$npmCommand``"
Write-ReportLine "- Node event reporter: ``$nodeReporterPath``"
Write-ReportLine "- Node event reporter repository path: ``$(Get-RepositoryRelativePath $nodeReporterPath)``"
Write-ReportLine "- Selected suites: $($selectedGroups -join ', ')"
Write-ReportLine "- Results file: ``$ReportPath``"
Write-ReportLine "- Machine results file: ``$JsonReportPath``"
Write-ReportLine "- JUnit results file: ``$JUnitReportPath``"
Write-ReportLine ''
Write-ReportLine '## Detailed executions by tested domain'
if (-not $script:detailedConsole) {
    Write-Host "Detailed results file: $ReportPath"
}

Push-Location $projectRoot
try {
    $currentReportDomain = $null
    foreach ($entry in $selectedChecks) {
        if ($entry.Value.ReportDomain -ne $currentReportDomain) {
            $currentReportDomain = $entry.Value.ReportDomain
            $domainLabel = $reportDomains[$currentReportDomain].Label
            Write-ReportLine ''
            Write-ReportLine ("### Detailed executions for {0}" -f $domainLabel)
        }
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        if (-not $script:detailedConsole) {
            Write-Host ''
            Write-Host "=== $($entry.Key): $($entry.Value.Description) ==="
        }
        Write-ReportLine ''
        Write-ReportLine ("**Check: {0} - {1}**" -f $entry.Key, $entry.Value.Description)
        try {
            & $entry.Value.Action
            $stopwatch.Stop()
            $results.Add([PSCustomObject]@{
                Check = $entry.Key
                Result = 'Passed'
                Seconds = [Math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
                Detail = ''
            })
        } catch {
            $stopwatch.Stop()
            $results.Add([PSCustomObject]@{
                Check = $entry.Key
                Result = 'Failed'
                Seconds = [Math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
                Detail = $_.Exception.Message
            })
            Write-ReportLine ''
            Write-ReportLine "- Check failure: $($_.Exception.Message)"
        }
    }
} finally {
    Pop-Location
}

$finishedAt = Get-Date
Write-ReportLine ''
Write-ReportLine '## Check summary'
Write-ReportLine ''
Write-ReportLine '| Tested domain | Check | Result | Named tests | Seconds | Detail |'
Write-ReportLine '|---|---|---:|---:|---:|---|'
foreach ($result in $results) {
    $detail = $result.Detail -replace '\|', '\|' -replace '[\r\n]+', ' '
    $reportDomainKey = $checks[$result.Check].ReportDomain
    $reportDomainLabel = $reportDomains[$reportDomainKey].Label
    $checkNamedTestsMeasurement = $script:executionResults |
        Where-Object { $_.Check -eq $result.Check } |
        Measure-Object -Property NamedTests -Sum
    $checkNamedTests = if ($null -eq $checkNamedTestsMeasurement.Sum) {
        0
    } else {
        $checkNamedTestsMeasurement.Sum
    }
    Write-ReportLine `
        -Text ("| {0} | {1} | {2} | {3} | {4:N2} | {5} |" -f `
            $reportDomainLabel,
            $result.Check,
            $result.Result,
            $checkNamedTests,
            $result.Seconds,
            $detail) `
        -ReportOnly
}

Write-ReportLine '' -ReportOnly
Write-ReportLine '## Execution inventory by tested domain' -ReportOnly
$inventoryNumber = 0
foreach ($domainEntry in $selectedReportDomains) {
    $domainChecks = @(
        $selectedChecks |
            Where-Object { $_.Value.ReportDomain -eq $domainEntry.Key } |
            ForEach-Object { $_.Key }
    )
    $domainExecutions = @(
        $script:executionResults |
            Where-Object { $_.Check -in $domainChecks }
    )
    Write-ReportLine '' -ReportOnly
    Write-ReportLine ("### Execution inventory for {0}" -f $domainEntry.Value.Label) -ReportOnly
    Write-ReportLine '' -ReportOnly
    if ($domainExecutions.Count -eq 0) {
        Write-ReportLine 'No executions were recorded for this tested domain.' -ReportOnly
        continue
    }
    Write-ReportLine '| # | Check | Result | Named tests | Seconds | Runner executable | Runner repository path | Test executable | Test repository path |' -ReportOnly
    Write-ReportLine '|---:|---|---:|---:|---:|---|---|---|---|' -ReportOnly
    foreach ($execution in $domainExecutions) {
        $inventoryNumber++
        $runnerCell = [string]::Concat([char]96, $execution.Runner, [char]96)
        $testExecutableCell = [string]::Concat(
            [char]96,
            $execution.TestExecutable,
            [char]96
        )
        $runnerRepositoryCell = if ($execution.RunnerRepositoryPath) {
            [string]::Concat([char]96, $execution.RunnerRepositoryPath, [char]96)
        } else { '' }
        $testRepositoryCell = if ($execution.TestExecutableRepositoryPath) {
            [string]::Concat([char]96, $execution.TestExecutableRepositoryPath, [char]96)
        } else { '' }
        Write-ReportLine `
            -Text ("| {0} | {1} | {2} | {3} | {4:N2} | {5} | {6} | {7} | {8} |" -f `
                $inventoryNumber,
                $execution.Check,
                $execution.Result,
                $execution.NamedTests,
                $execution.Seconds,
                $runnerCell,
                $runnerRepositoryCell,
                $testExecutableCell,
                $testRepositoryCell) `
            -ReportOnly
    }
}

Write-ReportLine '' -ReportOnly
Write-ReportLine '## Named test inventory by tested domain' -ReportOnly
$testCaseNumber = 0
foreach ($domainEntry in $selectedReportDomains) {
    $domainChecks = @(
        $selectedChecks |
            Where-Object { $_.Value.ReportDomain -eq $domainEntry.Key } |
            ForEach-Object { $_.Key }
    )
    $domainExecutions = @(
        $script:executionResults |
            Where-Object { $_.Check -in $domainChecks }
    )
    $domainTestCount = @(
        foreach ($execution in $domainExecutions) {
            $execution.TestCases
        }
    ).Count
    Write-ReportLine '' -ReportOnly
    Write-ReportLine ("### Named tests for {0}" -f $domainEntry.Value.Label) -ReportOnly
    Write-ReportLine '' -ReportOnly
    if ($domainTestCount -eq 0) {
        Write-ReportLine 'No named Node tests were reported for this tested domain.' -ReportOnly
        continue
    }
    Write-ReportLine '| # | Check | Result | Test name | Milliseconds | Full test executable path | Repository-relative test path | Source |' -ReportOnly
    Write-ReportLine '|---:|---|---:|---|---:|---|---|---:|' -ReportOnly
    foreach ($execution in $domainExecutions) {
        foreach ($testCase in $execution.TestCases) {
            $testCaseNumber++
            $testName = ([string]$testCase.Name) -replace '\|', '\|' -replace '[\r\n]+', ' '
            $fullTestPathCell = [string]::Concat([char]96, $testCase.TestExecutable, [char]96)
            $relativeTestPathCell = [string]::Concat(
                [char]96,
                $testCase.TestExecutableRepositoryPath,
                [char]96
            )
            $sourceCell = if ($testCase.Line) {
                '{0}:{1}' -f $testCase.Line, $testCase.Column
            } else { '' }
            Write-ReportLine `
                -Text ("| {0} | {1} | {2} | {3} | {4:N4} | {5} | {6} | {7} |" -f `
                    $testCaseNumber,
                    $execution.Check,
                    $testCase.Status,
                    $testName,
                    $testCase.DurationMilliseconds,
                    $fullTestPathCell,
                    $relativeTestPathCell,
                    $sourceCell) `
                -ReportOnly
        }
    }
}

$coverageExecution = $script:executionResults |
    Where-Object { $null -ne $_.Coverage } |
    Select-Object -First 1
if ($null -ne $coverageExecution) {
    $coverage = $coverageExecution.Coverage
    Write-ReportLine '' -ReportOnly
    Write-ReportLine '## Coverage metrics' -ReportOnly
    Write-ReportLine '' -ReportOnly
    Write-ReportLine '- Scope: modules loaded by the function tests; unmeasured production modules are listed separately and are not included as zeroes in Node totals.' -ReportOnly
    Write-ReportLine ("- Lines: {0:N2}% ({1}/{2})" -f `
        $coverage.totals.coveredLinePercent,
        $coverage.totals.coveredLineCount,
        $coverage.totals.totalLineCount) -ReportOnly
    Write-ReportLine ("- Branches: {0:N2}% ({1}/{2})" -f `
        $coverage.totals.coveredBranchPercent,
        $coverage.totals.coveredBranchCount,
        $coverage.totals.totalBranchCount) -ReportOnly
    Write-ReportLine ("- Functions: {0:N2}% ({1}/{2})" -f `
        $coverage.totals.coveredFunctionPercent,
        $coverage.totals.coveredFunctionCount,
        $coverage.totals.totalFunctionCount) -ReportOnly
    Write-ReportLine '' -ReportOnly
    Write-ReportLine '| Repository-relative source path | Lines | Branches | Functions |' -ReportOnly
    Write-ReportLine '|---|---:|---:|---:|' -ReportOnly
    foreach ($coverageFile in $coverage.files) {
        $coveragePathCell = [string]::Concat(
            [char]96,
            $coverageFile.repositoryPath,
            [char]96
        )
        Write-ReportLine `
            -Text ("| {0} | {1:N2}% | {2:N2}% | {3:N2}% |" -f `
                $coveragePathCell,
                $coverageFile.linePercent,
                $coverageFile.branchPercent,
                $coverageFile.functionPercent) `
            -ReportOnly
    }
    if ($coverage.unmeasuredFiles.Count -gt 0) {
        Write-ReportLine '' -ReportOnly
        Write-ReportLine '### Production modules not measured' -ReportOnly
        Write-ReportLine '' -ReportOnly
        foreach ($unmeasuredFile in $coverage.unmeasuredFiles) {
            Write-ReportLine ("- ``{0}`` (``{1}``)" -f `
                $unmeasuredFile.path,
                $unmeasuredFile.repositoryPath) -ReportOnly
        }
    }
}
Write-ReportLine '' -ReportOnly
Write-ReportLine "- Finished: $($finishedAt.ToString('o'))" -ReportOnly
Write-ReportLine ("- Duration: {0:N2} seconds" -f ($finishedAt - $startedAt).TotalSeconds) -ReportOnly
Write-ReportLine "- Executions recorded: $($script:executionResults.Count)" -ReportOnly
$namedTestMeasurement = $script:executionResults | Measure-Object -Property NamedTests -Sum
$namedTestTotal = if ($null -eq $namedTestMeasurement.Sum) {
    0
} else {
    $namedTestMeasurement.Sum
}
Write-ReportLine "- Named Node tests reported: $namedTestTotal" -ReportOnly
Write-ReportLine '' -ReportOnly
Write-ReportLine '<!-- markdownlint-enable MD013 MD060 -->' -ReportOnly

$failed = @($results | Where-Object { $_.Result -eq 'Failed' })
Write-Host ''
Write-Host '=== Test summary ==='
$results | Format-Table Check, Result, Seconds -AutoSize | Out-Host
Write-Host ''
Write-Host "Detailed results file: $ReportPath"
Write-Host "Executions recorded: $($script:executionResults.Count)"
Write-Host "Named Node tests reported: $namedTestTotal"
if ($failed.Count -gt 0) {
    Write-Host 'Failures:'
    $failed | Format-Table Check, Detail -Wrap -AutoSize | Out-Host
    $exitCode = 1
} else {
    Write-Host "All $($results.Count) selected checks passed."
}

$machineTestCases = @(
    foreach ($execution in $script:executionResults) {
        foreach ($testCase in $execution.TestCases) {
            [PSCustomObject]@{
                id = $testCase.Id
                domain = $execution.Check
                name = $testCase.Name
                status = $testCase.Status.ToLowerInvariant()
                durationMilliseconds = $testCase.DurationMilliseconds
                runnerExecutable = $execution.Runner
                runnerRepositoryPath = $execution.RunnerRepositoryPath
                testExecutable = $testCase.TestExecutable
                testExecutableRepositoryPath = $testCase.TestExecutableRepositoryPath
                sourceLocation = [PSCustomObject]@{
                    line = $testCase.Line
                    column = $testCase.Column
                }
                error = $testCase.Error
            }
        }
    }
)
$machineExecutions = @(
    foreach ($execution in $script:executionResults) {
        [PSCustomObject]@{
            check = $execution.Check
            status = $execution.Result.ToLowerInvariant()
            durationSeconds = $execution.Seconds
            namedTests = $execution.NamedTests
            runnerExecutable = $execution.Runner
            runnerRepositoryPath = $execution.RunnerRepositoryPath
            testExecutable = $execution.TestExecutable
            testExecutableRepositoryPath = $execution.TestExecutableRepositoryPath
            eventsPath = $execution.EventsPath
            eventsRepositoryPath = $execution.EventsRepositoryPath
            detail = $execution.Detail
            testCaseIds = @($execution.TestCases | ForEach-Object { $_.Id })
            coverage = $execution.Coverage
        }
    }
)
$coverageReports = @(
    $script:executionResults |
        Where-Object { $null -ne $_.Coverage } |
        ForEach-Object { $_.Coverage }
)
$machineReport = [ordered]@{
    schemaVersion = '1.0'
    runId = [System.IO.Path]::GetFileNameWithoutExtension($ReportPath)
    status = if ($exitCode -eq 0) { 'passed' } else { 'failed' }
    startedAt = $startedAt.ToString('o')
    finishedAt = $finishedAt.ToString('o')
    durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 4)
    selection = [ordered]@{
        requestedSuites = @($Suite)
        resolvedGroups = @($selectedGroups)
    }
    environment = [ordered]@{
        computerName = $env:COMPUTERNAME
        operatingSystem = [Environment]::OSVersion.VersionString
        powerShellVersion = $PSVersionTable.PSVersion.ToString()
        nodeVersion = (& $nodeCommand --version)
    }
    paths = [ordered]@{
        projectRoot = $projectRoot
        harnessExecutable = $harnessPath
        harnessRepositoryPath = Get-RepositoryRelativePath $harnessPath
        nodeExecutable = $nodeCommand
        npmExecutable = $npmCommand
        humanReport = $ReportPath
        humanReportRepositoryPath = Get-RepositoryRelativePath $ReportPath
        machineReport = $JsonReportPath
        machineReportRepositoryPath = Get-RepositoryRelativePath $JsonReportPath
        junitReport = $JUnitReportPath
        junitReportRepositoryPath = Get-RepositoryRelativePath $JUnitReportPath
        runArtifacts = $runArtifactDirectory
        runArtifactsRepositoryPath = Get-RepositoryRelativePath $runArtifactDirectory
    }
    summary = [ordered]@{
        checks = $results.Count
        failedChecks = $failed.Count
        executions = $script:executionResults.Count
        namedTests = $machineTestCases.Count
        passedTests = @($machineTestCases | Where-Object { $_.status -eq 'passed' }).Count
        failedTests = @($machineTestCases | Where-Object { $_.status -eq 'failed' }).Count
    }
    checks = @($results | ForEach-Object { $_ })
    executions = $machineExecutions
    testCases = $machineTestCases
    coverage = if ($coverageReports.Count -gt 0) { $coverageReports[0] } else { $null }
}
$machineJson = $machineReport | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($JsonReportPath, $machineJson + [Environment]::NewLine, $utf8NoBom)

$junitCases = @(
    $machineTestCases
    foreach ($execution in $script:executionResults) {
        if ($execution.TestCases.Count -gt 0) {
            continue
        }
        [PSCustomObject]@{
            domain = $execution.Check
            name = if ($execution.TestExecutableRepositoryPath) {
                $execution.TestExecutableRepositoryPath
            } else {
                $execution.TestExecutable
            }
            status = $execution.Result.ToLowerInvariant()
            durationMilliseconds = $execution.Seconds * 1000
            testExecutable = $execution.TestExecutable
            testExecutableRepositoryPath = $execution.TestExecutableRepositoryPath
            sourceLocation = [PSCustomObject]@{ line = 0; column = 0 }
            error = if ($execution.Result -eq 'Failed') {
                [PSCustomObject]@{
                    message = $execution.Detail
                    stack = $execution.Detail
                }
            } else {
                $null
            }
        }
    }
)
$xmlSettings = New-Object System.Xml.XmlWriterSettings
$xmlSettings.Encoding = $utf8NoBom
$xmlSettings.Indent = $true
$xmlWriter = [System.Xml.XmlWriter]::Create($JUnitReportPath, $xmlSettings)
try {
    $xmlWriter.WriteStartDocument()
    $xmlWriter.WriteStartElement('testsuites')
    $xmlWriter.WriteAttributeString('name', 'MyDefrag Syntax')
    $xmlWriter.WriteAttributeString('tests', [string]$junitCases.Count)
    $xmlWriter.WriteAttributeString(
        'failures',
        [string]@($junitCases | Where-Object { $_.status -eq 'failed' }).Count
    )
    foreach ($domainGroup in ($junitCases | Group-Object domain)) {
        $domainFailures = @($domainGroup.Group | Where-Object { $_.status -eq 'failed' }).Count
        $domainSeconds = ($domainGroup.Group |
            Measure-Object -Property durationMilliseconds -Sum).Sum / 1000
        $xmlWriter.WriteStartElement('testsuite')
        $xmlWriter.WriteAttributeString('name', [string]$domainGroup.Name)
        $xmlWriter.WriteAttributeString('tests', [string]$domainGroup.Count)
        $xmlWriter.WriteAttributeString('failures', [string]$domainFailures)
        $xmlWriter.WriteAttributeString('time', ('{0:F6}' -f $domainSeconds))
        foreach ($testCase in $domainGroup.Group) {
            $xmlWriter.WriteStartElement('testcase')
            $xmlWriter.WriteAttributeString('classname', [string]$testCase.domain)
            $xmlWriter.WriteAttributeString('name', [string]$testCase.name)
            $xmlWriter.WriteAttributeString(
                'time',
                ('{0:F6}' -f ([double]$testCase.durationMilliseconds / 1000))
            )
            $xmlWriter.WriteAttributeString(
                'file',
                [string]$testCase.testExecutableRepositoryPath
            )
            $xmlWriter.WriteAttributeString('line', [string]$testCase.sourceLocation.line)
            $xmlWriter.WriteStartElement('properties')
            $xmlWriter.WriteStartElement('property')
            $xmlWriter.WriteAttributeString('name', 'testExecutable')
            $xmlWriter.WriteAttributeString('value', [string]$testCase.testExecutable)
            $xmlWriter.WriteEndElement()
            $xmlWriter.WriteStartElement('property')
            $xmlWriter.WriteAttributeString('name', 'testExecutableRepositoryPath')
            $xmlWriter.WriteAttributeString(
                'value',
                [string]$testCase.testExecutableRepositoryPath
            )
            $xmlWriter.WriteEndElement()
            $xmlWriter.WriteEndElement()
            if ($testCase.status -eq 'failed') {
                $xmlWriter.WriteStartElement('failure')
                $errorMessage = if ($testCase.error -and $testCase.error.message) {
                    [string]$testCase.error.message
                } else {
                    'Test failed.'
                }
                $xmlWriter.WriteAttributeString('message', $errorMessage)
                if ($testCase.error -and $testCase.error.stack) {
                    $xmlWriter.WriteString([string]$testCase.error.stack)
                }
                $xmlWriter.WriteEndElement()
            }
            $xmlWriter.WriteEndElement()
        }
        $xmlWriter.WriteEndElement()
    }
    $xmlWriter.WriteEndElement()
    $xmlWriter.WriteEndDocument()
} finally {
    $xmlWriter.Dispose()
}

$script:reportWriter.Dispose()
$script:reportWriter = $null

$latestMarkdownPath = Join-Path $reportDirectory 'MyDefragSyntax-TestReport-latest.md'
$latestJsonPath = Join-Path $reportDirectory 'MyDefragSyntax-TestReport-latest.json'
$latestJUnitPath = Join-Path $reportDirectory 'MyDefragSyntax-TestReport-latest.xml'
Copy-Item -LiteralPath $ReportPath -Destination $latestMarkdownPath -Force
Copy-Item -LiteralPath $JsonReportPath -Destination $latestJsonPath -Force
Copy-Item -LiteralPath $JUnitReportPath -Destination $latestJUnitPath -Force
Write-Host "Machine results file: $JsonReportPath"
Write-Host "JUnit results file: $JUnitReportPath"
Write-Host "Latest human report: $latestMarkdownPath"
Write-Host "Latest machine report: $latestJsonPath"
Write-Host "Latest JUnit report: $latestJUnitPath"
exit $exitCode
