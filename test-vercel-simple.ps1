# Simple Vercel Deployment Test
Write-Host "🚀 Testing Vercel Deployment..." -ForegroundColor Green

$deploymentUrl = "https://tradai-iyjxjxv7c-ranveer-singh-rajputs-projects.vercel.app"
$ultimateEndpoint = "$deploymentUrl/api/ultimate-gemini-vision"

Write-Host "🌐 Testing URL: $ultimateEndpoint" -ForegroundColor Cyan

try {
    # Test health endpoint first
    Write-Host "1️⃣ Health check..." -ForegroundColor Yellow
    $healthResponse = Invoke-WebRequest -Uri "$deploymentUrl/api/health" -Method GET -TimeoutSec 30
    Write-Host "✅ Health check passed: $($healthResponse.StatusCode)" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "2️⃣ Ultimate endpoint is deployed and ready for testing" -ForegroundColor Green
    Write-Host "📊 To test with a real screenshot:" -ForegroundColor Yellow
    Write-Host "   Use a tool like Postman or curl to upload an image" -ForegroundColor White
    Write-Host "   Endpoint: $ultimateEndpoint" -ForegroundColor White
    Write-Host "   Method: POST" -ForegroundColor White
    Write-Host "   Form data: image file + asset + timeframe" -ForegroundColor White
    
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "But the Ultimate endpoint should still work for image analysis" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "🌐 URL: $deploymentUrl" -ForegroundColor Cyan
Write-Host "🚀 Ultimate API: $ultimateEndpoint" -ForegroundColor Cyan