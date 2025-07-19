# OTC Workflow Test Script
# Tests the complete OTC model workflow for real data usage and authentic signal generation

Write-Host "🚀 OTC Model Workflow Comprehensive Test" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if required files exist
$requiredFiles = @(
    "test-otc-workflow-comprehensive.js",
    "run-otc-test.js",
    ".env"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        if ($file -eq ".env") {
            Write-Host "   Please create .env file with your API keys" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "🔍 This test will verify:" -ForegroundColor Yellow
Write-Host "   • Real market data usage (not synthetic/mock)" -ForegroundColor White
Write-Host "   • Authentic signal generation based on real patterns" -ForegroundColor White
Write-Host "   • Complete OTC workflow integrity" -ForegroundColor White
Write-Host "   • Performance and quality metrics" -ForegroundColor White
Write-Host "   • Data source validation" -ForegroundColor White
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with the test? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Test cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting OTC workflow test..." -ForegroundColor Cyan

# Run the test
try {
    node run-otc-test.js
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "✅ OTC workflow test completed successfully!" -ForegroundColor Green
        Write-Host "📄 Check the test-results/ directory for detailed reports." -ForegroundColor Cyan
    } else {
        Write-Host "❌ OTC workflow test failed or found critical issues." -ForegroundColor Red
        Write-Host "📄 Check the test-results/ directory for detailed analysis." -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Error running test: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎯 Test Summary:" -ForegroundColor Cyan
Write-Host "   • If EXCELLENT/GOOD: OTC model is ready for trading" -ForegroundColor Green
Write-Host "   • If ACCEPTABLE: Minor improvements needed" -ForegroundColor Yellow
Write-Host "   • If NEEDS_IMPROVEMENT: Significant fixes required" -ForegroundColor Red
Write-Host "   • If CRITICAL_ISSUES: Do not use for trading" -ForegroundColor Red

exit $exitCode