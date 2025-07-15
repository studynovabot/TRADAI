# AI Candle Sniper - Setup Test Script
# Run this in PowerShell to verify installation

Write-Host "🎯 AI Candle Sniper - Setup Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check if we're in the right directory
$currentPath = Get-Location
Write-Host "📁 Current Directory: $currentPath" -ForegroundColor Yellow

# Check required files
$requiredFiles = @(
    "manifest.json",
    "popup.html",
    "popup.js", 
    "popup.css",
    "background.js",
    "content.js",
    "utils/indicators.js",
    "utils/patterns.js",
    "utils/fetchOHLCV.js"
)

Write-Host "`n📋 Checking Extension Files:" -ForegroundColor Green

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - MISSING!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

# Check manifest.json validity
Write-Host "`n🔍 Checking Manifest Validity:" -ForegroundColor Green
try {
    $manifest = Get-Content "manifest.json" | ConvertFrom-Json
    Write-Host "✅ Manifest JSON is valid" -ForegroundColor Green
    Write-Host "   Name: $($manifest.name)" -ForegroundColor White
    Write-Host "   Version: $($manifest.version)" -ForegroundColor White
    Write-Host "   Manifest Version: $($manifest.manifest_version)" -ForegroundColor White
} catch {
    Write-Host "❌ Manifest JSON is invalid!" -ForegroundColor Red
    $allFilesExist = $false
}

# Check assets directory
Write-Host "`n🎨 Checking Assets:" -ForegroundColor Green
$assetFiles = @("icon16.png", "icon32.png", "icon48.png", "icon128.png")
foreach ($asset in $assetFiles) {
    if (Test-Path "assets/$asset") {
        Write-Host "✅ assets/$asset" -ForegroundColor Green
    } else {
        Write-Host "⚠️ assets/$asset - Missing (will use placeholder)" -ForegroundColor Yellow
    }
}

# Test HTML structure
Write-Host "`n🌐 Checking HTML Structure:" -ForegroundColor Green
try {
    $htmlContent = Get-Content "popup.html" -Raw
    if ($htmlContent -match '<title>.*AI Candle Sniper.*</title>') {
        Write-Host "✅ Popup HTML structure looks good" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Popup HTML might have issues" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error reading popup.html" -ForegroundColor Red
}

# Final status
Write-Host "`n📊 Installation Status:" -ForegroundColor Cyan
if ($allFilesExist) {
    Write-Host "🎉 SUCCESS: Extension is ready for installation!" -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Open Chrome and go to chrome://extensions/" -ForegroundColor White
    Write-Host "2. Enable 'Developer mode' (toggle top-right)" -ForegroundColor White
    Write-Host "3. Click 'Load unpacked' and select this folder" -ForegroundColor White
    Write-Host "4. Pin the extension to your toolbar" -ForegroundColor White
    Write-Host "5. Test on a trading platform" -ForegroundColor White
} else {
    Write-Host "❌ FAILED: Some files are missing!" -ForegroundColor Red
    Write-Host "Please check the missing files above." -ForegroundColor White
}

# Open test page
Write-Host "`n🧪 Testing:" -ForegroundColor Cyan
$testPath = Join-Path $currentPath "test-extension.html"
if (Test-Path $testPath) {
    Write-Host "Opening test page in browser..." -ForegroundColor Yellow
    Start-Process "file:///$($testPath.Replace('\', '/'))"
} else {
    Write-Host "Test page not found at: $testPath" -ForegroundColor Red
}

Write-Host "`n🔧 Debugging Commands:" -ForegroundColor Cyan
Write-Host "- Enable debug: localStorage.setItem('candleSniperDebug', 'true')" -ForegroundColor White
Write-Host "- Check console: F12 > Console tab" -ForegroundColor White
Write-Host "- Extension page: chrome://extensions/" -ForegroundColor White

Write-Host "`nHappy Trading! Remember to manage your risk wisely." -ForegroundColor Magenta
Write-Host "Contact: Ranveer Singh Rajput" -ForegroundColor Gray

Read-Host "`nPress Enter to exit"