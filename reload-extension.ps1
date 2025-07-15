# AI Trading Sniper - Extension Reload Script

Write-Host "🔄 Reloading AI Trading Sniper Extension..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if Chrome is running
$chromeProcess = Get-Process chrome -ErrorAction SilentlyContinue
if ($chromeProcess) {
    Write-Host "✅ Chrome is running" -ForegroundColor Green
} else {
    Write-Host "⚠️  Chrome is not running - please start Chrome first" -ForegroundColor Yellow
    Read-Host "Press Enter to continue anyway"
}

# Step 2: Instructions for manual reload
Write-Host "📋 Manual Steps Required:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open Chrome and go to: chrome://extensions/" -ForegroundColor White
Write-Host "2. Find 'AI Trading Sniper' extension" -ForegroundColor White
Write-Host "3. Click the 🔄 RELOAD button" -ForegroundColor White
Write-Host "4. Click 'Inspect views: service worker' to check console" -ForegroundColor White
Write-Host ""

# Step 3: Check for common issues
Write-Host "🔍 Checking extension files..." -ForegroundColor Cyan

$requiredFiles = @(
    "manifest.json",
    "background.js", 
    "popup-sniper.html",
    "popup-sniper.js",
    "content.js",
    "ai-integration.js",
    "utils/advanced-patterns.js"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - MISSING!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

Write-Host ""

if ($allFilesExist) {
    Write-Host "✅ All required files present" -ForegroundColor Green
} else {
    Write-Host "❌ Some files are missing - extension may not work properly" -ForegroundColor Red
}

Write-Host ""
Write-Host "Recent Fixes Applied:" -ForegroundColor Cyan
Write-Host "- Fixed service worker DOM issues" -ForegroundColor Green
Write-Host "- Added proper importScripts loading" -ForegroundColor Green  
Write-Host "- Created robust fallback systems" -ForegroundColor Green
Write-Host "- Deferred component initialization" -ForegroundColor Green
Write-Host "- Added service worker exports" -ForegroundColor Green

Write-Host ""
Write-Host "Expected Console Messages:" -ForegroundColor Yellow
Write-Host "[Candle Sniper] Initializing enhanced background engine..." -ForegroundColor Gray
Write-Host "[Candle Sniper] Initializing AI components..." -ForegroundColor Gray
Write-Host "[Candle Sniper] AI integration loaded" -ForegroundColor Gray
Write-Host "[Candle Sniper] Pattern recognition loaded" -ForegroundColor Gray
Write-Host "[Candle Sniper] Initializing management components..." -ForegroundColor Gray
Write-Host "[Candle Sniper] Enhanced background engine ready" -ForegroundColor Gray

Write-Host ""
Write-Host "If you still see errors:" -ForegroundColor Red
Write-Host "1. Check the service worker console for specific error details" -ForegroundColor White
Write-Host "2. Look for any remaining document or window references" -ForegroundColor White
Write-Host "3. Try disabling and re-enabling the extension" -ForegroundColor White
Write-Host "4. Clear Chrome cache and try again" -ForegroundColor White

Write-Host ""
Write-Host "Press Enter to open Chrome extensions page..." -ForegroundColor Cyan
Read-Host

# Try to open Chrome extensions page
try {
    Start-Process "chrome://extensions/"
    Write-Host "✅ Chrome extensions page opened" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not open Chrome - please open manually" -ForegroundColor Yellow
    Write-Host "Go to: chrome://extensions/" -ForegroundColor White
}

Write-Host ""
Write-Host "Extension ready for testing!" -ForegroundColor Green
Write-Host "Click the extension icon and try Start Sniper Mode" -ForegroundColor White