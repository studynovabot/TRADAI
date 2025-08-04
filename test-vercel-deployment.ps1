# 🚀 VERCEL DEPLOYMENT TEST - Ultimate Gemini Vision
# Test the deployed Ultimate endpoint for NO HOLD guarantee and detailed analysis

Write-Host "🚀 TESTING VERCEL DEPLOYMENT..." -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Deployment URL
$deploymentUrl = "https://tradai-iyjxjxv7c-ranveer-singh-rajputs-projects.vercel.app"
$ultimateEndpoint = "$deploymentUrl/api/ultimate-gemini-vision"

Write-Host "🌐 Testing URL: $ultimateEndpoint" -ForegroundColor Cyan
Write-Host ""

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

# Test 1: Health check
Write-Host "1️⃣ HEALTH CHECK..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$deploymentUrl/api/health" -Method GET -TimeoutSec 30
    Write-Host "✅ Health check passed: $($healthResponse.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Health check failed, but continuing with main test..." -ForegroundColor Yellow
}

Write-Host ""

# Test 2: Ultimate endpoint with image
Write-Host "2️⃣ ULTIMATE ENDPOINT TEST..." -ForegroundColor Yellow
Write-Host "📤 Uploading test chart image..." -ForegroundColor Cyan

try {
    # Prepare multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $imageBytes = [System.IO.File]::ReadAllBytes($testImagePath)
    $imageContent = [System.Text.Encoding]::Latin1.GetString($imageBytes)
    
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
        "Content-Disposition: form-data; name=`"debugMode`"",
        "",
        "false",
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"test-chart.png`"",
        "Content-Type: image/png",
        "",
        $imageContent,
        "--$boundary--"
    )
    
    $body = $bodyLines -join $LF
    
    Write-Host "⏱️ Sending request (may take 30-60 seconds)..." -ForegroundColor Cyan
    $startTime = Get-Date
    
    $response = Invoke-WebRequest -Uri $ultimateEndpoint `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $body `
        -TimeoutSec 120
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "✅ Request completed in $([math]::Round($duration, 1)) seconds" -ForegroundColor Green
    Write-Host "📊 Status Code: $($response.StatusCode)" -ForegroundColor Green
    
    # Parse JSON response
    $result = $response.Content | ConvertFrom-Json
    
    if ($result.success) {
        Write-Host ""
        Write-Host "🎯 ULTIMATE ANALYSIS RESULTS:" -ForegroundColor Yellow
        Write-Host "=============================" -ForegroundColor Yellow
        
        # Check for HOLD signal (should never happen)
        if ($result.analysis.signal -eq "HOLD") {
            Write-Host "❌ CRITICAL BUG: HOLD signal detected!" -ForegroundColor Red
            Write-Host "🚨 This should NEVER happen with Ultimate endpoint!" -ForegroundColor Red
        } else {
            Write-Host "✅ NO HOLD GUARANTEE VERIFIED" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "📊 SIGNAL ANALYSIS:" -ForegroundColor Cyan
        Write-Host "🎯 Signal: $($result.analysis.signal)" -ForegroundColor $(if ($result.analysis.signal -eq "BUY") { "Green" } else { "Red" })
        Write-Host "📈 Signal Confidence: $($result.analysis.signalConfidence)%" -ForegroundColor White
        Write-Host "📊 Overall Confidence: $($result.analysis.overallConfidence)%" -ForegroundColor White
        Write-Host "💹 Asset: $($result.analysis.asset)" -ForegroundColor White
        Write-Host "⏰ Timeframe: $($result.analysis.timeframe)" -ForegroundColor White
        Write-Host "📈 Trend: $($result.analysis.trend)" -ForegroundColor White
        Write-Host "🏪 Market Condition: $($result.analysis.marketCondition)" -ForegroundColor White
        
        Write-Host ""
        Write-Host "🔮 NEXT 3 CANDLE PREDICTIONS:" -ForegroundColor Magenta
        foreach ($pred in $result.analysis.nextCandlePredictions) {
            $color = if ($pred.direction -eq "UP") { "Green" } else { "Red" }
            Write-Host "Candle $($pred.candle): $($pred.direction) ($($pred.confidence)%)" -ForegroundColor $color
            Write-Host "  └─ $($pred.reasoning)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "🔧 TECHNICAL INDICATORS:" -ForegroundColor Blue
        Write-Host "EMA: $($result.analysis.technicalIndicators.ema)" -ForegroundColor White
        Write-Host "SMA: $($result.analysis.technicalIndicators.sma)" -ForegroundColor White
        Write-Host "Stochastic: $($result.analysis.technicalIndicators.stochastic)" -ForegroundColor White
        
        # Check for detailed analysis fields
        Write-Host ""
        Write-Host "📊 DETAILED ANALYSIS:" -ForegroundColor Yellow
        
        if ($result.analysis.patternAnalysis) {
            Write-Host "✅ Pattern Analysis: $($result.analysis.patternAnalysis)" -ForegroundColor Green
        } else {
            Write-Host "❌ Pattern Analysis: Missing" -ForegroundColor Red
        }
        
        if ($result.analysis.volumeAnalysis) {
            Write-Host "✅ Volume Analysis: $($result.analysis.volumeAnalysis)" -ForegroundColor Green
        } else {
            Write-Host "❌ Volume Analysis: Missing" -ForegroundColor Red
        }
        
        if ($result.analysis.riskAssessment) {
            Write-Host "✅ Risk Assessment: $($result.analysis.riskAssessment)" -ForegroundColor Green
        } else {
            Write-Host "❌ Risk Assessment: Missing" -ForegroundColor Red
        }
        
        if ($result.analysis.confluenceFactors) {
            Write-Host "✅ Confluence Factors: $($result.analysis.confluenceFactors)" -ForegroundColor Green
        } else {
            Write-Host "❌ Confluence Factors: Missing" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "📄 HUMAN-READABLE REPORT:" -ForegroundColor Yellow
        Write-Host "-------------------------" -ForegroundColor Yellow
        if ($result.humanReadableReport) {
            Write-Host $result.humanReadableReport -ForegroundColor White
        } else {
            Write-Host "❌ Human-readable report missing" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "🎯 VERIFICATION SUMMARY:" -ForegroundColor Yellow
        Write-Host "========================" -ForegroundColor Yellow
        
        $holdCheck = if ($result.analysis.signal -ne "HOLD") { "✅ PASS" } else { "❌ FAIL" }
        $detailCheck = if ($result.analysis.patternAnalysis -and $result.analysis.volumeAnalysis) { "✅ PASS" } else { "❌ FAIL" }
        $confidenceCheck = if ($result.analysis.signalConfidence -ge 60 -and $result.analysis.signalConfidence -le 95) { "✅ PASS" } else { "❌ FAIL" }
        $predictionsCheck = if ($result.analysis.nextCandlePredictions -and $result.analysis.nextCandlePredictions.Count -eq 3) { "✅ PASS" } else { "❌ FAIL" }
        
        Write-Host "NO HOLD Guarantee: $holdCheck" -ForegroundColor $(if ($holdCheck.Contains("PASS")) { "Green" } else { "Red" })
        Write-Host "Detailed Analysis: $detailCheck" -ForegroundColor $(if ($detailCheck.Contains("PASS")) { "Green" } else { "Red" })
        Write-Host "Confidence Range: $confidenceCheck" -ForegroundColor $(if ($confidenceCheck.Contains("PASS")) { "Green" } else { "Red" })
        Write-Host "3 Candle Predictions: $predictionsCheck" -ForegroundColor $(if ($predictionsCheck.Contains("PASS")) { "Green" } else { "Red" })
        
    } else {
        Write-Host "❌ Analysis failed: $($result.error)" -ForegroundColor Red
        if ($result.details) {
            Write-Host "Details: $($result.details)" -ForegroundColor Yellow
        }
    }
    
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 VERCEL DEPLOYMENT TEST COMPLETED!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Deployment URL: $deploymentUrl" -ForegroundColor Cyan
Write-Host "🚀 Ultimate Endpoint: $ultimateEndpoint" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Test with real trading chart screenshots" -ForegroundColor White
Write-Host "2. Verify NO HOLD guarantee with multiple images" -ForegroundColor White
Write-Host "3. Check detailed analysis quality" -ForegroundColor White