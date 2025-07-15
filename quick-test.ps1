Write-Host "EXTENSION FIXES APPLIED:" -ForegroundColor Green
Write-Host "- Enhanced Quotex asset detection" -ForegroundColor White
Write-Host "- 15+ new CSS selectors for asset detection" -ForegroundColor White  
Write-Host "- Fallback detection from page title and URL" -ForegroundColor White
Write-Host "- Multiple detection attempts with delays" -ForegroundColor White
Write-Host "- Improved debug logging" -ForegroundColor White
Write-Host ""

Write-Host "TESTING STEPS:" -ForegroundColor Yellow
Write-Host "1. Go to chrome://extensions/" -ForegroundColor White
Write-Host "2. Find AI Trading Sniper and click RELOAD" -ForegroundColor White
Write-Host "3. Open https://quotex.io/en/trade" -ForegroundColor White
Write-Host "4. Select EUR/USD or any currency pair" -ForegroundColor White
Write-Host "5. Click extension icon" -ForegroundColor White
Write-Host ""

Write-Host "EXPECTED RESULTS:" -ForegroundColor Cyan
Write-Host "- Platform: Quotex (not Unknown)" -ForegroundColor Gray
Write-Host "- Asset: EURUSD (not Asset not detected)" -ForegroundColor Gray
Write-Host "- Status: Ready for analysis" -ForegroundColor Gray
Write-Host ""

Write-Host "Press Enter to open Chrome extensions..." -ForegroundColor Yellow
Read-Host

Start-Process "chrome://extensions/"

Write-Host ""
Write-Host "Extension ready for testing!" -ForegroundColor Green