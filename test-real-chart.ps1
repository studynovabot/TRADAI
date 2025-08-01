# Test script for Direct Gemini Vision API with real trading chart
# Tests the API with actual USD/INR chart image

$PRODUCTION_URL = "https://tradai-m8d5v0aci-ranveer-singh-rajputs-projects.vercel.app"
$API_ENDPOINT = "$PRODUCTION_URL/api/gemini-vision-signal"

# Path to the real trading chart image
$CHART_IMAGE_PATH = "C:\Users\thaku\Pictures\trading ss\5m\usdinr2.png"

Write-Host "🚀 Testing Direct Gemini Vision API with Real Trading Chart" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Gray
Write-Host "API Endpoint: $API_ENDPOINT" -ForegroundColor Cyan
Write-Host "Chart Image: $CHART_IMAGE_PATH" -ForegroundColor Cyan
Write-Host ""

# Check if the image file exists
if (-not (Test-Path $CHART_IMAGE_PATH)) {
    Write-Host "❌ Chart image not found at: $CHART_IMAGE_PATH" -ForegroundColor Red
    Write-Host "Please ensure the USD/INR chart image exists at this location." -ForegroundColor Yellow
    exit 1
}

$imageInfo = Get-Item $CHART_IMAGE_PATH
Write-Host "📊 Chart Image Info:" -ForegroundColor Yellow
Write-Host "   File: $($imageInfo.Name)" -ForegroundColor White
Write-Host "   Size: $([math]::Round($imageInfo.Length / 1KB, 2)) KB" -ForegroundColor White
Write-Host "   Modified: $($imageInfo.LastWriteTime)" -ForegroundColor White
Write-Host ""

try {
    Write-Host "1️⃣ Testing API health endpoint..." -ForegroundColor Yellow
    
    $healthResponse = Invoke-RestMethod -Uri "$PRODUCTION_URL/api/health" -Method GET -ErrorAction Stop
    Write-Host "   ✅ Health endpoint accessible" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor White
    Write-Host ""

    Write-Host "2️⃣ Testing API without file (should return 400)..." -ForegroundColor Yellow
    
    try {
        $emptyResponse = Invoke-RestMethod -Uri $API_ENDPOINT -Method POST -Body "{}" -ContentType "application/json" -ErrorAction Stop
        Write-Host "   ⚠️ Unexpected success response" -ForegroundColor Yellow
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 400) {
            Write-Host "   ✅ Correctly returns 400 for invalid content type" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Unexpected status code: $statusCode" -ForegroundColor Yellow
        }
    }
    Write-Host ""

    Write-Host "3️⃣ Testing API with real USD/INR trading chart..." -ForegroundColor Yellow
    Write-Host "   📤 Uploading chart image for analysis..." -ForegroundColor Cyan
    
    # Create multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $fileBytes = [System.IO.File]::ReadAllBytes($CHART_IMAGE_PATH)
    $fileName = Split-Path $CHART_IMAGE_PATH -Leaf
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"$fileName`"",
        "Content-Type: image/png$LF",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
        "--$boundary",
        "Content-Disposition: form-data; name=`"asset`"$LF",
        "USD/INR",
        "--$boundary",
        "Content-Disposition: form-data; name=`"timeframe`"$LF", 
        "5m",
        "--$boundary",
        "Content-Disposition: form-data; name=`"platform`"$LF", 
        "Trading Platform",
        "--$boundary--$LF"
    ) -join $LF
    
    $startTime = Get-Date
    
    try {
        $analysisResponse = Invoke-RestMethod -Uri $API_ENDPOINT `
                                            -Method POST `
                                            -ContentType "multipart/form-data; boundary=$boundary" `
                                            -Body $bodyLines `
                                            -TimeoutSec 120 `
                                            -ErrorAction Stop
        
        $endTime = Get-Date
        $processingTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   ✅ Analysis completed successfully!" -ForegroundColor Green
        Write-Host "   ⏱️ Processing Time: $([math]::Round($processingTime, 0))ms" -ForegroundColor White
        Write-Host ""
        
        Write-Host "📊 Analysis Results:" -ForegroundColor Green
        Write-Host "   Success: $($analysisResponse.success)" -ForegroundColor White
        Write-Host "   Overall Confidence: $($analysisResponse.confidence)%" -ForegroundColor White
        
        if ($analysisResponse.analysis) {
            $analysis = $analysisResponse.analysis
            
            Write-Host "   Detected Asset: $($analysis.detectedAsset)" -ForegroundColor White
            Write-Host "   Detected Timeframe: $($analysis.detectedTimeframe)" -ForegroundColor White
            Write-Host "   Current Price: $($analysis.currentPrice)" -ForegroundColor White
            Write-Host ""
            
            Write-Host "📈 Trading Signal:" -ForegroundColor Cyan
            if ($analysis.tradingSignal) {
                Write-Host "   Action: $($analysis.tradingSignal.action)" -ForegroundColor White
                Write-Host "   Direction: $($analysis.tradingSignal.direction)" -ForegroundColor White
                Write-Host "   Confidence: $($analysis.tradingSignal.confidence)%" -ForegroundColor White
                Write-Host "   Entry Point: $($analysis.tradingSignal.entryPoint)" -ForegroundColor White
                Write-Host "   Risk Level: $($analysis.tradingSignal.riskLevel)" -ForegroundColor White
            }
            Write-Host ""
            
            Write-Host "🔮 Next 3 Candle Predictions:" -ForegroundColor Cyan
            if ($analysis.predictions) {
                foreach ($pred in $analysis.predictions) {
                    Write-Host "   Candle $($pred.candle): $($pred.direction) ($($pred.confidence)%)" -ForegroundColor White
                }
            }
            Write-Host ""
            
            Write-Host "📊 Multi-Timeframe Analysis:" -ForegroundColor Cyan
            if ($analysis.multiTimeframeAnalysis) {
                $mtf = $analysis.multiTimeframeAnalysis
                Write-Host "   1m: $($mtf.'1m'.trend) (Strength: $($mtf.'1m'.strength), Confidence: $($mtf.'1m'.confidence)%)" -ForegroundColor White
                Write-Host "   3m: $($mtf.'3m'.trend) (Strength: $($mtf.'3m'.strength), Confidence: $($mtf.'3m'.confidence)%)" -ForegroundColor White
                Write-Host "   5m: $($mtf.'5m'.trend) (Strength: $($mtf.'5m'.strength), Confidence: $($mtf.'5m'.confidence)%)" -ForegroundColor White
            }
            Write-Host ""
            
            Write-Host "🔧 Technical Indicators:" -ForegroundColor Cyan
            if ($analysis.technicalIndicators) {
                $indicators = $analysis.technicalIndicators
                Write-Host "   EMA: $($indicators.ema.signal) ($($indicators.ema.confidence)%)" -ForegroundColor White
                Write-Host "   SMA: $($indicators.sma.signal) ($($indicators.sma.confidence)%)" -ForegroundColor White
                Write-Host "   Stochastic: $($indicators.stochastic.signal) ($($indicators.stochastic.confidence)%)" -ForegroundColor White
                Write-Host "   RSI: $($indicators.rsi.signal) ($($indicators.rsi.confidence)%)" -ForegroundColor White
                Write-Host "   Volume: $($indicators.volume)" -ForegroundColor White
                Write-Host "   Momentum: $($indicators.momentum)" -ForegroundColor White
            }
            Write-Host ""
            
            Write-Host "🎯 Market Analysis:" -ForegroundColor Cyan
            Write-Host "   Market Condition: $($analysis.marketCondition)" -ForegroundColor White
            Write-Host "   Timeframe Bias: $($analysis.timeframeBias)" -ForegroundColor White
            
            if ($analysis.confluenceAnalysis) {
                Write-Host "   Overall Bias: $($analysis.confluenceAnalysis.overallBias)" -ForegroundColor White
                Write-Host "   Confluence Score: $($analysis.confluenceAnalysis.confluenceScore)%" -ForegroundColor White
            }
        }
        
        Write-Host ""
        Write-Host "✅ DIRECT GEMINI VISION ANALYSIS SUCCESSFUL!" -ForegroundColor Green
        Write-Host "   The API successfully processed the USD/INR chart and provided comprehensive trading analysis." -ForegroundColor Green
        
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   ❌ Analysis failed with status: $statusCode" -ForegroundColor Red
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            $reader.Close()
            
            if ($errorBody) {
                Write-Host "   Error Details:" -ForegroundColor Red
                $errorJson = $errorBody | ConvertFrom-Json
                Write-Host "   Error: $($errorJson.error)" -ForegroundColor Red
                Write-Host "   Code: $($errorJson.code)" -ForegroundColor Red
                if ($errorJson.details) {
                    Write-Host "   Details: $($errorJson.details)" -ForegroundColor Red
                }
            }
        }
        catch {
            Write-Host "   Raw error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

} catch {
    Write-Host "❌ Test failed with error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Direct Gemini Vision API Test Completed!" -ForegroundColor Green
