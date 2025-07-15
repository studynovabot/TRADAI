Write-Host "🔧 AI TRADING SNIPER - DETECTION FIX" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""

Write-Host "STEP 1: RELOAD EXTENSION" -ForegroundColor Yellow
Write-Host "- Go to chrome://extensions/" -ForegroundColor White
Write-Host "- Find AI Trading Sniper" -ForegroundColor White
Write-Host "- Click RELOAD button" -ForegroundColor White
Write-Host ""

Write-Host "STEP 2: OPEN QUOTEX TEST" -ForegroundColor Yellow  
Write-Host "- Go to https://quotex.io/en/trade" -ForegroundColor White
Write-Host "- Wait for page to load completely" -ForegroundColor White
Write-Host "- Select EUR/USD currency pair" -ForegroundColor White
Write-Host ""

Write-Host "STEP 3: CHECK CONSOLE MESSAGES" -ForegroundColor Yellow
Write-Host "- Press F12 to open browser console" -ForegroundColor White
Write-Host "- Look for [Candle Sniper] messages" -ForegroundColor White
Write-Host "- Should see: Content script starting..." -ForegroundColor Gray
Write-Host ""

Write-Host "STEP 4: TEST DETECTION MANUALLY" -ForegroundColor Yellow
Write-Host "- Copy this code and paste in console:" -ForegroundColor White
Write-Host ""
Write-Host "// PASTE THIS IN QUOTEX CONSOLE:" -ForegroundColor Cyan
Write-Host "console.log('Extension loaded?', !!window.candleSniperDetector);" -ForegroundColor Gray
Write-Host "if (window.candleSniperDetector) {" -ForegroundColor Gray
Write-Host "  console.log('Platform:', window.candleSniperDetector.platform);" -ForegroundColor Gray
Write-Host "  console.log('Asset:', window.candleSniperDetector.getCurrentAsset());" -ForegroundColor Gray
Write-Host "}" -ForegroundColor Gray
Write-Host ""

Write-Host "EXPECTED RESULTS:" -ForegroundColor Cyan
Write-Host "- Extension loaded? true" -ForegroundColor Green
Write-Host "- Platform: quotex" -ForegroundColor Green
Write-Host "- Asset: EURUSD (or selected pair)" -ForegroundColor Green
Write-Host ""

Write-Host "IF NOT WORKING:" -ForegroundColor Red
Write-Host "1. Extension not loaded = Reload extension + refresh page" -ForegroundColor White
Write-Host "2. Platform: unknown = Wrong URL or content script issue" -ForegroundColor White  
Write-Host "3. Asset: Asset not detected = Selector issue" -ForegroundColor White
Write-Host ""

Write-Host "Press Enter to open Chrome extensions..." -ForegroundColor Yellow
Read-Host

try {
    Start-Process "chrome://extensions/"
    Write-Host "Chrome extensions opened" -ForegroundColor Green
} catch {
    Write-Host "Please manually open chrome://extensions/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "After reloading extension, test on Quotex!" -ForegroundColor Green