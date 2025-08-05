# 🚀💎 PRODUCTION GEMINI VISION API TEST SCRIPT
# Test the new production-ready API endpoint with ultra-detailed analysis

Write-Host "🚀 Starting Production Gemini Vision API Test..." -ForegroundColor Green
Write-Host ""

# Configuration
$apiUrl = "http://localhost:3000/api/production-gemini-vision"
$testImagePath = "e:\Ranveer\TRADAI\test-image.png"

# Check if test image exists
if (-not (Test-Path $testImagePath)) {
    Write-Host "⚠️ Test image not found at: $testImagePath" -ForegroundColor Yellow
    Write-Host "Please ensure you have a test chart image available." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can:"
    Write-Host "1. Take a screenshot of a trading chart and save it as test-image.png"
    Write-Host "2. Or modify the `$testImagePath variable to point to your image"
    Write-Host ""
    exit 1
}

Write-Host "📷 Test image found: $testImagePath" -ForegroundColor Green
$imageInfo = Get-Item $testImagePath
Write-Host "📊 Image size: $($imageInfo.Length) bytes" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "🌐 Testing Production API endpoint..." -ForegroundColor Yellow
    
    # Prepare the multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    # Read image file
    $imageBytes = [System.IO.File]::ReadAllBytes($testImagePath)
    $imageBase64 = [System.Convert]::ToBase64String($imageBytes)
    
    # Create multipart form data
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"test-image.png`"",
        "Content-Type: image/png",
        "",
        [System.Text.Encoding]::UTF8.GetString($imageBytes),
        "--$boundary",
        "Content-Disposition: form-data; name=`"debugMode`"",
        "",
        "true",
        "--$boundary--"
    )
    
    $body = $bodyLines -join $LF
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    
    # Make the API request
    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    Write-Host "📤 Sending request to API..." -ForegroundColor Cyan
    $startTime = Get-Date
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Body $bodyBytes -Headers $headers -TimeoutSec 120
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host ""
    Write-Host "✅ API Response Received!" -ForegroundColor Green
    Write-Host "⏱️ Total Request Time: $([math]::Round($duration, 2))ms" -ForegroundColor Cyan
    Write-Host ""
    
    if ($response.success) {
        Write-Host "🎉 PRODUCTION ANALYSIS SUCCESSFUL!" -ForegroundColor Green
        Write-Host "=================================" -ForegroundColor Green
        Write-Host ""
        
        # Display main results
        Write-Host "📊 MAIN RESULTS:" -ForegroundColor Yellow
        Write-Host "Signal: $($response.analysis.signal)" -ForegroundColor White
        Write-Host "Confidence: $($response.confidence)%" -ForegroundColor White
        Write-Host "Processing Time: $($response.processingTime)ms" -ForegroundColor White
        Write-Host ""
        
        # Display extracted chart context
        Write-Host "📈 CHART CONTEXT:" -ForegroundColor Yellow
        Write-Host "Asset: $($response.analysis.asset)" -ForegroundColor White
        Write-Host "Timeframe: $($response.analysis.timeframe)" -ForegroundColor White
        Write-Host "Platform: $($response.analysis.platform)" -ForegroundColor White
        Write-Host "Current Price: $($response.analysis.currentPrice)" -ForegroundColor White
        Write-Host ""
        
        # Display trend analysis
        Write-Host "📊 TREND ANALYSIS:" -ForegroundColor Yellow
        Write-Host "Current Trend: $($response.analysis.currentTrend)" -ForegroundColor White
        Write-Host "Trend Strength: $($response.analysis.trendStrength)" -ForegroundColor White
        Write-Host ""
        
        # Display indicators if available
        if ($response.analysis.indicators) {
            Write-Host "🔍 INDICATORS:" -ForegroundColor Yellow
            $indicators = $response.analysis.indicators
            if ($indicators.ema -and $indicators.ema -ne "Not detected") {
                Write-Host "EMA: $($indicators.ema)" -ForegroundColor White
            }
            if ($indicators.sma -and $indicators.sma -ne "Not detected") {
                Write-Host "SMA: $($indicators.sma)" -ForegroundColor White
            }
            if ($indicators.rsi -and $indicators.rsi -ne "Not detected") {
                Write-Host "RSI: $($indicators.rsi)" -ForegroundColor White
            }
            if ($indicators.stochastic -and $indicators.stochastic -ne "Not detected") {
                Write-Host "Stochastic: $($indicators.stochastic)" -ForegroundColor White
            }
            Write-Host ""
        }
        
        # Display support/resistance levels
        if ($response.analysis.supportLevels -or $response.analysis.resistanceLevels) {
            Write-Host "📍 SUPPORT & RESISTANCE:" -ForegroundColor Yellow
            if ($response.analysis.supportLevels) {
                Write-Host "Support: $($response.analysis.supportLevels)" -ForegroundColor White
            }
            if ($response.analysis.resistanceLevels) {
                Write-Host "Resistance: $($response.analysis.resistanceLevels)" -ForegroundColor White
            }
            Write-Host ""
        }
        
        # Display next candle predictions
        if ($response.analysis.nextCandles -and $response.analysis.nextCandles.Count -gt 0) {
            Write-Host "🔮 NEXT CANDLE PREDICTIONS:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $response.analysis.nextCandles.Count; $i++) {
                $candle = $response.analysis.nextCandles[$i]
                Write-Host "Candle $($i + 1): $($candle.direction) ($($candle.probability)%)" -ForegroundColor White
                if ($candle.reasoning) {
                    Write-Host "  Reasoning: $($candle.reasoning)" -ForegroundColor Gray
                }
            }
            Write-Host ""
        }
        
        # Display key factors
        if ($response.analysis.keyFactors -and $response.analysis.keyFactors.Count -gt 0) {
            Write-Host "🎯 KEY SUPPORTING FACTORS:" -ForegroundColor Yellow
            for ($i = 0; $i -lt $response.analysis.keyFactors.Count; $i++) {
                Write-Host "$($i + 1). $($response.analysis.keyFactors[$i])" -ForegroundColor White
            }
            Write-Host ""
        }
        
        # Display metadata
        Write-Host "🔧 METADATA:" -ForegroundColor Yellow
        Write-Host "Model: $($response.metadata.model)" -ForegroundColor White
        Write-Host "Analysis Method: $($response.metadata.analysisMethod)" -ForegroundColor White
        Write-Host "Version: $($response.metadata.version)" -ForegroundColor White
        Write-Host "Pure Gemini Analysis: $($response.metadata.pureGeminiAnalysis)" -ForegroundColor White
        Write-Host ""
        
        # Display service statistics
        if ($response.serviceStats) {
            Write-Host "📈 SERVICE STATISTICS:" -ForegroundColor Yellow
            Write-Host "Total Analyses: $($response.serviceStats.totalAnalyses)" -ForegroundColor White
            Write-Host "Success Rate: $($response.serviceStats.successRate)" -ForegroundColor White
            Write-Host "Average Confidence: $([math]::Round($response.serviceStats.averageConfidence, 2))%" -ForegroundColor White
            Write-Host "Average Processing Time: $([math]::Round($response.serviceStats.averageProcessingTime, 2))ms" -ForegroundColor White
            Write-Host ""
        }
        
        # Save detailed results
        $resultsFile = "production-api-test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
        $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $resultsFile -Encoding UTF8
        Write-Host "💾 Detailed results saved to: $resultsFile" -ForegroundColor Green
        
    } else {
        Write-Host "❌ ANALYSIS FAILED!" -ForegroundColor Red
        Write-Host "Error: $($response.error)" -ForegroundColor Red
        Write-Host "Processing Time: $($response.processingTime)ms" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ API TEST FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorResponse = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorResponse)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Response Body: $errorBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response body" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "🏁 Production API Test Completed!" -ForegroundColor Green