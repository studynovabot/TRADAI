# 🚀 ULTIMATE ENDPOINT TEST (PowerShell)
# Test the Ultimate Gemini Vision endpoint to verify NO HOLD guarantee

Write-Host "🚀 TESTING ULTIMATE ENDPOINT..." -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Check if server is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    Write-Host "✅ Server is running on localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running. Please start with: npm run dev" -ForegroundColor Red
    exit 1
}

# Check if test image exists
$testImagePath = ".\test-image.png"
if (-not (Test-Path $testImagePath)) {
    Write-Host "⚠️ Test image not found, creating simple test image..." -ForegroundColor Yellow
    # Create a simple 1x1 pixel PNG
    $base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12P4AAAAAQABXMKKiwAAAABJRU5ErkJggg=="
    $imageBytes = [Convert]::FromBase64String($base64Image)
    [System.IO.File]::WriteAllBytes($testImagePath, $imageBytes)
    Write-Host "✅ Test image created" -ForegroundColor Green
}

# Prepare multipart form data
$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"asset`"",
    "",
    "USD/BRL",
    "--$boundary",
    "Content-Disposition: form-data; name=`"timeframe`"",
    "",
    "5m",
    "--$boundary",
    "Content-Disposition: form-data; name=`"imagePreprocessing`"",
    "",
    "true",
    "--$boundary",
    "Content-Disposition: form-data; name=`"ocrEnabled`"",
    "",
    "true",
    "--$boundary",
    "Content-Disposition: form-data; name=`"patternDetection`"",
    "",
    "true",
    "--$boundary",
    "Content-Disposition: form-data; name=`"image`"; filename=`"test-image.png`"",
    "Content-Type: image/png",
    "",
    [System.Text.Encoding]::Latin1.GetString([System.IO.File]::ReadAllBytes($testImagePath)),
    "--$boundary--"
)

$body = $bodyLines -join $LF

Write-Host "📤 Sending request to Ultimate endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/ultimate-gemini-vision" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body `
        -TimeoutSec 120

    Write-Host "✅ Request successful!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    
    # Parse JSON response
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host "" -ForegroundColor White
        Write-Host "📊 ULTIMATE ANALYSIS RESULTS:" -ForegroundColor Yellow
        Write-Host "=============================" -ForegroundColor Yellow
        Write-Host "🎯 Signal: $($result.analysis.signal)" -ForegroundColor $(if ($result.analysis.signal -eq "HOLD") { "Red" } else { "Green" })
        Write-Host "📈 Signal Confidence: $($result.analysis.signalConfidence)%" -ForegroundColor Cyan
        Write-Host "📊 Overall Confidence: $($result.analysis.overallConfidence)%" -ForegroundColor Cyan
        Write-Host "💹 Asset: $($result.analysis.asset)" -ForegroundColor White
        Write-Host "⏰ Timeframe: $($result.analysis.timeframe)" -ForegroundColor White
        Write-Host "📈 Trend: $($result.analysis.trend)" -ForegroundColor White
        Write-Host "🏪 Market Condition: $($result.analysis.marketCondition)" -ForegroundColor White
        
        Write-Host "" -ForegroundColor White
        Write-Host "🔮 NEXT 3 CANDLE PREDICTIONS:" -ForegroundColor Magenta
        foreach ($pred in $result.analysis.nextCandlePredictions) {
            Write-Host "Candle $($pred.candle): $($pred.direction) ($($pred.confidence)%) - $($pred.reasoning)" -ForegroundColor White
        }
        
        Write-Host "" -ForegroundColor White
        Write-Host "🔧 TECHNICAL INDICATORS:" -ForegroundColor Blue
        Write-Host "EMA: $($result.analysis.technicalIndicators.ema)" -ForegroundColor White
        Write-Host "SMA: $($result.analysis.technicalIndicators.sma)" -ForegroundColor White
        Write-Host "Stochastic: $($result.analysis.technicalIndicators.stochastic)" -ForegroundColor White
        
        if ($result.analysis.patternAnalysis) {
            Write-Host "" -ForegroundColor White
            Write-Host "📊 DETAILED ANALYSIS:" -ForegroundColor Yellow
            Write-Host "Pattern Analysis: $($result.analysis.patternAnalysis)" -ForegroundColor White
            Write-Host "Volume Analysis: $($result.analysis.volumeAnalysis)" -ForegroundColor White
            Write-Host "Risk Assessment: $($result.analysis.riskAssessment)" -ForegroundColor White
            Write-Host "Confluence Factors: $($result.analysis.confluenceFactors)" -ForegroundColor White
        }
        
        Write-Host "" -ForegroundColor White
        Write-Host "🎯 NO HOLD VERIFICATION:" -ForegroundColor Yellow
        if ($result.analysis.signal -eq "HOLD") {
            Write-Host "❌ CRITICAL BUG: Ultimate endpoint returned HOLD!" -ForegroundColor Red
            Write-Host "This should NEVER happen with the Ultimate service!" -ForegroundColor Red
        } else {
            Write-Host "✅ NO HOLD GUARANTEE VERIFIED: Signal is $($result.analysis.signal)" -ForegroundColor Green
            Write-Host "✅ Ultimate endpoint working correctly!" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ Analysis failed: $($result.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure the server is running: npm run dev" -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 ULTIMATE ENDPOINT TEST COMPLETED!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "💡 REMEMBER:" -ForegroundColor Yellow
Write-Host "- Use /api/ultimate-gemini-vision for NO HOLD signals" -ForegroundColor White
Write-Host "- Use test-ultimate-api.html for browser testing" -ForegroundColor White
Write-Host "- The Ultimate endpoint provides detailed analysis" -ForegroundColor White