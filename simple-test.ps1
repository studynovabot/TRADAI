# Simple test for Gemini Vision API
$url = "https://tradai-p5zbq5y02-ranveer-singh-rajputs-projects.vercel.app/api/gemini-vision-signal"
$imagePath = "C:\Users\thaku\Pictures\trading ss\5m\usdinr.png"

Write-Host "🚀 Testing Gemini Vision API..." -ForegroundColor Green
Write-Host "Image: $imagePath" -ForegroundColor Cyan

if (-not (Test-Path $imagePath)) {
    Write-Host "❌ Image file not found: $imagePath" -ForegroundColor Red
    exit 1
}

try {
    $startTime = Get-Date
    
    # Read the image file
    $imageBytes = [System.IO.File]::ReadAllBytes($imagePath)
    $fileName = Split-Path $imagePath -Leaf
    
    # Create boundary for multipart form data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    # Build the multipart form data
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"image`"; filename=`"$fileName`"",
        "Content-Type: image/png",
        "",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($imageBytes),
        "--$boundary--"
    )
    
    $body = $bodyLines -join $LF
    
    # Make the API call
    $headers = @{
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $body -Headers $headers
    
    $endTime = Get-Date
    $processingTime = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "⏱️  Processing time: $([math]::Round($processingTime))ms" -ForegroundColor Yellow
    
    if ($response.success) {
        Write-Host "✅ API call successful!" -ForegroundColor Green
        
        $analysis = $response.analysis
        Write-Host "`n📊 Analysis Results:" -ForegroundColor Cyan
        Write-Host "Overall Confidence: $($analysis.overallConfidence) percent" -ForegroundColor White
        Write-Host "Trading Signal: $($analysis.tradingSignal.action) ($($analysis.tradingSignal.confidence) percent)" -ForegroundColor White
        Write-Host "Market Condition: $($analysis.marketCondition)" -ForegroundColor White
        Write-Host "Detected Asset: $($analysis.detectedAsset)" -ForegroundColor White
        Write-Host "Detected Timeframe: $($analysis.detectedTimeframe)" -ForegroundColor White
        
        if ($analysis.predictions) {
            Write-Host "`n🔮 Next 3 Candle Predictions:" -ForegroundColor Cyan
            foreach ($pred in $analysis.predictions) {
                Write-Host "   Candle $($pred.candle): $($pred.direction) ($($pred.confidence) percent)" -ForegroundColor White
                Write-Host "   Reasoning: $($pred.reasoning)" -ForegroundColor Gray
            }
        }
        
        Write-Host "`n📈 Technical Analysis:" -ForegroundColor Cyan
        Write-Host "Trend: $($analysis.trend)" -ForegroundColor White
        Write-Host "Current Price: $($analysis.currentPrice)" -ForegroundColor White
        
        if ($analysis.technicalIndicators) {
            Write-Host "EMA: $($analysis.technicalIndicators.ema)" -ForegroundColor White
            Write-Host "SMA: $($analysis.technicalIndicators.sma)" -ForegroundColor White
            Write-Host "Stochastic: $($analysis.technicalIndicators.stochastic)" -ForegroundColor White
        }
        
        # Quality assessment
        $qualityScore = 0
        $maxScore = 6
        
        if ($processingTime -lt 60000) { $qualityScore++; Write-Host "✅ Processing time under 60s" -ForegroundColor Green }
        if ($analysis.overallConfidence -ge 70) { $qualityScore++; Write-Host "✅ High overall confidence" -ForegroundColor Green }
        if ($analysis.predictions -and $analysis.predictions.Count -eq 3) { $qualityScore++; Write-Host "✅ 3 candle predictions provided" -ForegroundColor Green }
        if ($analysis.tradingSignal.confidence -ge 70) { $qualityScore++; Write-Host "✅ High signal confidence" -ForegroundColor Green }
        if ($analysis.technicalIndicators) { $qualityScore++; Write-Host "✅ Technical indicators provided" -ForegroundColor Green }
        if ($analysis.supportLevels -and $analysis.resistanceLevels) { $qualityScore++; Write-Host "✅ Support/resistance levels identified" -ForegroundColor Green }
        
        $qualityPercent = [math]::Round(($qualityScore / $maxScore) * 100)
        Write-Host "`nSignal Quality Score: $qualityPercent percent ($qualityScore/$maxScore)" -ForegroundColor $(if ($qualityPercent -ge 80) { "Green" } elseif ($qualityPercent -ge 60) { "Yellow" } else { "Red" })
        
    } else {
        Write-Host "❌ API returned error: $($response.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Full error: $($_.Exception)" -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Green
