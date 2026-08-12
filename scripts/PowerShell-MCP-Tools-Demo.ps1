# PowerShell MCP Tools Demo Script
# This script demonstrates access to all required tools in the MCP environment

Write-Host "=== PowerShell MCP Tools Demo ===" -ForegroundColor Green

# Check if we can access all required tools
Write-Host "`nChecking available tools:" -ForegroundColor Yellow

# Test npm (Node Package Manager)
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ npm: Not available" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ npm: Error accessing tool" -ForegroundColor Red
}

# Test git
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Host "✅ git: $gitVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ git: Not available" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ git: Error accessing tool" -ForegroundColor Red
}

# Test vsce (Visual Studio Code Extension Manager)
try {
    $vsceVersion = vsce --version 2>$null
    if ($vsceVersion) {
        Write-Host "✅ vsce: $vsceVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ vsce: Not available" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ vsce: Error accessing tool" -ForegroundColor Red
}

# Test ovsx (Open VSX Registry client)
try {
    $ovsxVersion = ovsx --version 2>$null
    if ($ovsxVersion) {
        Write-Host "✅ ovsx: $ovsxVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ ovsx: Not available" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ovsx: Error accessing tool" -ForegroundColor Red
}

# Test Expand-Archive command
try {
    $expandCmd = Get-Command -Name Expand-Archive -ErrorAction Stop
    Write-Host "✅ Expand-Archive: Available in $($expandCmd.Source)" -ForegroundColor Green
} catch {
    Write-Host "❌ Expand-Archive: Not available" -ForegroundColor Red
}

# Test Compress-Archive command
try {
    $compressCmd = Get-Command -Name Compress-Archive -ErrorAction Stop
    Write-Host "✅ Compress-Archive: Available in $($compressCmd.Source)" -ForegroundColor Green
} catch {
    Write-Host "❌ Compress-Archive: Not available" -ForegroundColor Red
}

Write-Host "`n=== Demo Complete ===" -ForegroundColor Green

# Example usage of archive commands
Write-Host "`nExample archive operations:" -ForegroundColor Yellow

# Create a sample file for testing
"Sample content for testing compression" | Out-File -FilePath "test-file.txt" -Encoding UTF8
Write-Host "Created test-file.txt" -ForegroundColor Cyan

# Test Compress-Archive
try {
    Compress-Archive -Path "test-file.txt" -DestinationPath "test-archive.zip"
    Write-Host "✅ Created test-archive.zip" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create archive: $_" -ForegroundColor Red
}

# Test Expand-Archive (if archive was created)
try {
    if (Test-Path "test-archive.zip") {
        Expand-Archive -Path "test-archive.zip" -DestinationPath "extracted-test"
        Write-Host "✅ Extracted archive to extracted-test folder" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Failed to extract archive: $_" -ForegroundColor Red
}

# Cleanup test files
Remove-Item -Path "test-file.txt", "test-archive.zip", "extracted-test" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Cleaned up test files" -ForegroundColor Cyan

Write-Host "`n=== Demo Finished ===" -ForegroundColor Green