# Test Quotex Integration
Write-Host "🔧 Testing Candle Sniper with Quotex..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Show fixes applied
Write-Host "✅ FIXES APPLIED:" -ForegroundColor Green
Write-Host "- Enhanced Quotex asset detection with 15+ selectors" -ForegroundColor White
Write-Host "- Added fallback detection from title and URL" -ForegroundColor White
Write-Host "- Improved debug logging and error handling" -ForegroundColor White
Write-Host "- Multiple detection attempts with delays" -ForegroundColor White
Write-Host "- Added platform confirmation messages" -ForegroundColor White

Write-Host ""
Write-Host "🎯 TESTING STEPS:" -ForegroundColor Yellow
Write-Host "1. Reload extension in Chrome (chrome://extensions/)" -ForegroundColor White
Write-Host "2. Open Quotex.io in a new tab" -ForegroundColor White
Write-Host "3. Select any currency pair (EUR/USD recommended)" -ForegroundColor White
Write-Host "4. Click the extension icon" -ForegroundColor White
Write-Host "5. Check if asset and platform are detected" -ForegroundColor White

Write-Host ""
Write-Host "📊 EXPECTED RESULTS:" -ForegroundColor Cyan
Write-Host "- Platform: Quotex (not 'Unknown')" -ForegroundColor Gray
Write-Host "- Asset: EUR/USD or selected pair (not 'Asset not detected')" -ForegroundColor Gray
Write-Host "- Status: Should show analyzing/ready to scan" -ForegroundColor Gray

Write-Host ""
Write-Host "🔍 DEBUG CONSOLE:" -ForegroundColor Yellow
Write-Host "Open browser console (F12) to see debug messages:" -ForegroundColor White
Write-Host "[Candle Sniper] Starting asset monitoring for quotex on quotex.io" -ForegroundColor Gray
Write-Host "[Candle Sniper] Detecting Quotex asset..." -ForegroundColor Gray
Write-Host "[Candle Sniper] Quotex asset found via selector: EURUSD" -ForegroundColor Gray
Write-Host "[Candle Sniper] Notifying background: Asset=EURUSD, Platform=quotex" -ForegroundColor Gray

Write-Host ""
Write-Host "🚨 IF STILL NOT WORKING:" -ForegroundColor Red
Write-Host "1. Check browser console for specific error messages" -ForegroundColor White
Write-Host "2. Try a different currency pair" -ForegroundColor White
Write-Host "3. Refresh the Quotex page and try again" -ForegroundColor White
Write-Host "4. Make sure chart is fully loaded before testing" -ForegroundColor White

Write-Host ""
Write-Host "Press Enter to open Chrome extensions for reload..." -ForegroundColor Cyan
Read-Host

# Open Chrome extensions
try {
    Start-Process "chrome://extensions/"
    Write-Host "✅ Chrome extensions opened" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Please manually open chrome://extensions/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "After reloading, test with Quotex:" -ForegroundColor Green
try {
    Start-Process "https://quotex.io/en/trade"
    Write-Host "✅ Quotex opened" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Please manually open https://quotex.io/en/trade" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Happy Testing!" -ForegroundColor Green