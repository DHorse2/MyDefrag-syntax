# Test MCP Configuration
# This script verifies that the PowerShell MCP server is properly configured

Write-Host "Testing MCP Configuration..." -ForegroundColor Yellow

# Test basic PowerShell execution
Write-Host "1. Testing basic PowerShell execution..." -ForegroundColor Cyan
$testResult = powershell -Command "Write-Host 'PowerShell MCP test successful' -ForegroundColor Green"
Write-Host $testResult

# Test tool availability
Write-Host "`n2. Testing tool availability..." -ForegroundColor Cyan

# Check if we can run the commands that should be available
$commandsToTest = @(
    "npm --version",
    "git --version", 
    "vsce --version",
    "ovsx --version"
)

foreach ($command in $commandsToTest) {
    try {
        $result = powershell -Command "& { $command 2>\$null }"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $command - Success" -ForegroundColor Green
        } else {
            Write-Host "❌ $command - Failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ $command - Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test archive commands
Write-Host "`n3. Testing archive commands..." -ForegroundColor Cyan

try {
    $expandResult = powershell -Command "Get-Command -Name Expand-Archive -ErrorAction Stop"
    Write-Host "✅ Expand-Archive - Available" -ForegroundColor Green
} catch {
    Write-Host "❌ Expand-Archive - Not available" -ForegroundColor Red
}

try {
    $compressResult = powershell -Command "Get-Command -Name Compress-Archive -ErrorAction Stop"
    Write-Host "✅ Compress-Archive - Available" -ForegroundColor Green
} catch {
    Write-Host "❌ Compress-Archive - Not available" -ForegroundColor Red
}

Write-Host "`nMCP Configuration Test Complete!" -ForegroundColor Green