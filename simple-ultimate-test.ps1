# Simple Ultimate Endpoint Test
Write-Host "🚀 Testing Ultimate Endpoint..." -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    Write-Host "✅ Server is running" -ForegroundColor Green
    
    Write-Host "📊 To test the Ultimate endpoint:" -ForegroundColor Yellow
    Write-Host "1. Open your browser" -ForegroundColor White
    Write-Host "2. Go to: http://localhost:3000" -ForegroundColor White
    Write-Host "3. Open: test-ultimate-api.html" -ForegroundColor White
    Write-Host "4. Upload a trading chart image" -ForegroundColor White
    Write-Host "5. Click 'Analyze Chart'" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "✅ Expected result: BUY or SELL (never HOLD)" -ForegroundColor Green
    Write-Host "✅ Detailed analysis with patterns, volume, risk" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Server not running. Start with: npm run dev" -ForegroundColor Red
}

Write-Host "" -ForegroundColor White
Write-Host "🎯 CRITICAL REMINDER:" -ForegroundColor Yellow
Write-Host "Use /api/ultimate-gemini-vision (NOT enhanced-gemini-vision)" -ForegroundColor White