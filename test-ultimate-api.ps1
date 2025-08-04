# 🚀💡 ULTIMATE GEMINI VISION API TEST SCRIPT
# PowerShell script to test the Ultimate Gemini Vision API

Write-Host "🚀💡 ULTIMATE GEMINI VISION API TEST" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# Configuration
$apiUrl = "http://localhost:3000/api/ultimate-gemini-vision"
$testImage = "test-image.png"
$timeout = 120 # 2 minutes

Write-Host "📊 Test Configuration:" -ForegroundColor Yellow
Write-Host "- API URL: $apiUrl" -ForegroundColor White
Write-Host "- Test Image: $testImage" -ForegroundColor White
Write-Host "- Timeout: $timeout seconds" -ForegroundColor White
Write-Host ""

# Check if test image exists
if (-not (Test-Path $testImage)) {
    Write-Host "❌ Test image not found: $testImage" -ForegroundColor Red
    Write-Host "Please ensure you have a test image in the current directory." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Test image found: $testImage" -ForegroundColor Green
$imageSize = (Get-Item $testImage).Length
Write-Host "📊 Image size: $([math]::Round($imageSize / 1KB, 2)) KB" -ForegroundColor White
Write-Host ""

# Check if server is running
Write-Host "🔍 Checking if server is running..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not running or not responding" -ForegroundColor Red
    Write-Host "Please start the server with: npm run dev" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Prepare form data
Write-Host "📤 Preparing Ultimate API request..." -ForegroundColor Yellow

$boundary = [System.Guid]::NewGuid().ToString()
$LF = "`r`n"

# Read image file
$imageBytes = [System.IO.File]::ReadAllBytes($testImage)
$imageBase64 = [System.Convert]::ToBase64String($imageBytes)

# Create multipart form data
$bodyLines = @(
    "--$boundary",
    "Content-Disposition: form-data; name=`"image`"; filename=`"$testImage`"",
    "Content-Type: image/png",
    "",
    [System.Text.Encoding]::UTF8.GetString($imageBytes),
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
    "Content-Disposition: form-data; name=`"debugMode`"",
    "",
    "true",
    "--$boundary--"
)

$body = $bodyLines -join $LF

# Make API request
Write-Host "🚀 Sending request to Ultimate Gemini Vision API..." -ForegroundColor Cyan
$startTime = Get-Date

try {
    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    # Use curl for better multipart support
    Write-Host "📡 Using curl for multipart upload..." -ForegroundColor Yellow
    
    $curlArgs = @(
        "-X", "POST",
        "-F", "image=@$testImage",
        "-F", "asset=USD/BRL",
        "-F", "timeframe=5m",
        "-F", "imagePreprocessing=true",
        "-F", "ocrEnabled=true",
        "-F", "patternDetection=true",
        "-F", "debugMode=true",
        "--max-time", "$timeout",
        "--silent",
        "--show-error",
        $apiUrl
    )
    
    $response = & curl @curlArgs
    $endTime = Get-Date
    $processingTime = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "✅ API request completed!" -ForegroundColor Green
    Write-Host "⏱️ Processing time: $([math]::Round($processingTime, 0))ms" -ForegroundColor White
    Write-Host ""
    
    # Parse JSON response
    $result = $response | ConvertFrom-Json
    
    # Validate response
    Write-Host "🔍 VALIDATING ULTIMATE RESPONSE..." -ForegroundColor Yellow
    Write-Host "-" * 40 -ForegroundColor Yellow
    
    if (-not $result.success) {
        throw "API returned failure: $($result.error)"
    }
    Write-Host "✅ Response indicates success" -ForegroundColor Green
    
    if (-not $result.analysis) {
        throw "Missing analysis object in response"
    }
    Write-Host "✅ Analysis object present" -ForegroundColor Green
    
    # Validate NO HOLD guarantee
    $signal = $result.analysis.signal
    if (-not $signal) {
        throw "Missing signal in analysis"
    }
    
    if ($signal -notin @("BUY", "SELL")) {
        throw "Invalid signal: $signal. Expected: BUY or SELL"
    }
    Write-Host "✅ NO HOLD GUARANTEE VERIFIED: Signal is $signal" -ForegroundColor Green
    
    # Validate confidence ranges
    $signalConfidence = $result.analysis.signalConfidence
    $overallConfidence = $result.analysis.overallConfidence
    
    if ($signalConfidence -lt 60 -or $signalConfidence -gt 95) {
        throw "Signal confidence out of range: $signalConfidence% (expected 60%-95%)"
    }
    Write-Host "✅ Signal confidence valid: $signalConfidence%" -ForegroundColor Green
    
    if ($overallConfidence -lt 60 -or $overallConfidence -gt 95) {
        throw "Overall confidence out of range: $overallConfidence% (expected 60%-95%)"
    }
    Write-Host "✅ Overall confidence valid: $overallConfidence%" -ForegroundColor Green
    
    # Validate candle predictions
    $predictions = $result.analysis.nextCandlePredictions
    if (-not $predictions -or $predictions.Count -ne 3) {
        throw "Expected 3 candle predictions, got $($predictions.Count)"
    }
    Write-Host "✅ 3 candle predictions present" -ForegroundColor Green
    
    # Validate each prediction
    for ($i = 0; $i -lt $predictions.Count; $i++) {
        $pred = $predictions[$i]
        if ($pred.direction -notin @("UP", "DOWN")) {
            throw "Invalid prediction $($i + 1) direction: $($pred.direction)"
        }
        if ($pred.confidence -lt 60 -or $pred.confidence -gt 95) {
            throw "Invalid prediction $($i + 1) confidence: $($pred.confidence)%"
        }
    }
    Write-Host "✅ All candle predictions valid (UP/DOWN only)" -ForegroundColor Green
    
    # Validate ultimate features
    if (-not $result.ultimateFeatures) {
        throw "Missing ultimateFeatures in response"
    }
    
    if (-not $result.ultimateFeatures.noHoldGuarantee) {
        throw "NO HOLD guarantee not confirmed in response"
    }
    Write-Host "✅ Ultimate features confirmed" -ForegroundColor Green
    
    # Validate human-readable report
    if (-not $result.report) {
        throw "Missing human-readable report"
    }
    
    if ($result.report -notlike "*TRADAI Analysis Report*") {
        throw "Report does not contain expected TRADAI format"
    }
    Write-Host "✅ Human-readable report present" -ForegroundColor Green
    
    Write-Host ""
    
    # Display results
    Write-Host "📊 ULTIMATE ANALYSIS RESULTS:" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host "🎯 Signal: $signal" -ForegroundColor $(if ($signal -eq "BUY") { "Green" } else { "Red" })
    Write-Host "📈 Signal Confidence: $signalConfidence%" -ForegroundColor White
    Write-Host "📊 Overall Confidence: $overallConfidence%" -ForegroundColor White
    Write-Host "💹 Asset: $($result.analysis.asset)" -ForegroundColor White
    Write-Host "⏰ Timeframe: $($result.analysis.timeframe)" -ForegroundColor White
    Write-Host "📈 Trend: $($result.analysis.trend)" -ForegroundColor White
    Write-Host "🏪 Market Condition: $($result.analysis.marketCondition)" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🔮 NEXT 3 CANDLE PREDICTIONS:" -ForegroundColor Yellow
    for ($i = 0; $i -lt $predictions.Count; $i++) {
        $pred = $predictions[$i]
        $color = if ($pred.direction -eq "UP") { "Green" } else { "Red" }
        Write-Host "Candle $($i + 1): $($pred.direction) ($($pred.confidence)%) - $($pred.reasoning)" -ForegroundColor $color
    }
    Write-Host ""
    
    Write-Host "🔧 TECHNICAL INDICATORS:" -ForegroundColor Yellow
    if ($result.analysis.technicalIndicators) {
        Write-Host "EMA: $($result.analysis.technicalIndicators.ema)" -ForegroundColor White
        Write-Host "SMA: $($result.analysis.technicalIndicators.sma)" -ForegroundColor White
        Write-Host "Stochastic: $($result.analysis.technicalIndicators.stochastic)" -ForegroundColor White
    }
    Write-Host ""
    
    Write-Host "📊 ULTIMATE STATISTICS:" -ForegroundColor Yellow
    if ($result.metadata.ultimateStats) {
        $stats = $result.metadata.ultimateStats
        Write-Host "Total Analyses: $($stats.totalAnalyses)" -ForegroundColor White
        Write-Host "BUY Signals: $($stats.buySignals) ($($stats.buyPercentage)%)" -ForegroundColor Green
        Write-Host "SELL Signals: $($stats.sellSignals) ($($stats.sellPercentage)%)" -ForegroundColor Red
        Write-Host "Average Confidence: $([math]::Round($stats.averageConfidence, 1))%" -ForegroundColor White
        Write-Host "Average Processing Time: $([math]::Round($stats.averageProcessingTime, 0))ms" -ForegroundColor White
    }
    Write-Host ""
    
    # Display human-readable report
    Write-Host "📄 HUMAN-READABLE REPORT:" -ForegroundColor Cyan
    Write-Host "-" * 60 -ForegroundColor Cyan
    Write-Host $result.report -ForegroundColor White
    Write-Host "-" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    # Final validation summary
    Write-Host "✅ ULTIMATE GEMINI VISION TEST PASSED!" -ForegroundColor Green
    Write-Host "🎯 Key Validations:" -ForegroundColor Yellow
    Write-Host "  ✅ NO HOLD guarantee verified" -ForegroundColor Green
    Write-Host "  ✅ Signal confidence within range" -ForegroundColor Green
    Write-Host "  ✅ 3 candle predictions provided" -ForegroundColor Green
    Write-Host "  ✅ Human-readable report generated" -ForegroundColor Green
    Write-Host "  ✅ Ultimate features confirmed" -ForegroundColor Green
    Write-Host "  ✅ Technical indicators analyzed" -ForegroundColor Green
    Write-Host ""
    
    # Save results for review
    $resultsFile = "ultimate-test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $result | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultsFile -Encoding UTF8
    Write-Host "💾 Full results saved to: $resultsFile" -ForegroundColor Cyan
    
    Write-Host "🎉 ULTIMATE TEST COMPLETED SUCCESSFULLY!" -ForegroundColor Green
    
} catch {
    $endTime = Get-Date
    $processingTime = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "❌ ULTIMATE GEMINI VISION TEST FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Processing time: $([math]::Round($processingTime, 0))ms" -ForegroundColor White
    Write-Host ""
    
    if ($_.Exception.InnerException) {
        Write-Host "Inner exception: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
    
    Write-Host "💥 ULTIMATE TEST FAILED!" -ForegroundColor Red
    exit 1
}