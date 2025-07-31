# PowerShell script to test the deployed Gemini Vision API
# Tests the production deployment with trading screenshots

$PRODUCTION_URL = "https://tradai-p5zbq5y02-ranveer-singh-rajputs-projects.vercel.app"

# Screenshot directories
$SCREENSHOT_DIRS = @{
    "1m" = "C:\Users\thaku\Pictures\trading ss\1m"
    "3m" = "C:\Users\thaku\Pictures\trading ss\3m"
    "5m" = "C:\Users\thaku\Pictures\trading ss\5m"
}

Write-Host "🚀 Starting TRADAI Gemini API Test..." -ForegroundColor Green
Write-Host "Production URL: $PRODUCTION_URL" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n📋 Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$PRODUCTION_URL/api/health" -Method GET
    if ($healthResponse.status -eq "OK") {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "   Status: $($healthResponse.status)" -ForegroundColor White
        Write-Host "   Gemini Vision: $($healthResponse.services.geminiVision.status)" -ForegroundColor White
    } else {
        Write-Host "❌ Health check failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Health endpoint error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Check screenshot directories and select test images
Write-Host "`n📸 Checking screenshot directories..." -ForegroundColor Yellow
$testImages = @{}

foreach ($timeframe in $SCREENSHOT_DIRS.Keys) {
    $dir = $SCREENSHOT_DIRS[$timeframe]
    Write-Host "   Checking $timeframe directory: $dir" -ForegroundColor White
    
    if (Test-Path $dir) {
        $images = Get-ChildItem -Path $dir -Filter "*.png" | Select-Object -First 1
        if ($images) {
            $testImages[$timeframe] = $images[0].FullName
            Write-Host "   ✅ Found image: $($images[0].Name)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  No PNG images found in $timeframe directory" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Directory not found: $dir" -ForegroundColor Red
    }
}

if ($testImages.Count -eq 0) {
    Write-Host "❌ No test images found in any directory!" -ForegroundColor Red
    exit 1
}

# Test 3: Test Gemini Vision API with each available image
Write-Host "`n🔍 Testing Gemini Vision API..." -ForegroundColor Yellow

foreach ($timeframe in $testImages.Keys) {
    $imagePath = $testImages[$timeframe]
    Write-Host "`n   Testing $timeframe timeframe with: $(Split-Path $imagePath -Leaf)" -ForegroundColor Cyan
    
    $startTime = Get-Date
    
    try {
        # Create multipart form data
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $fileBytes = [System.IO.File]::ReadAllBytes($imagePath)
        $fileName = Split-Path $imagePath -Leaf
        
        $bodyLines = (
            "--$boundary",
            "Content-Disposition: form-data; name=`"image`"; filename=`"$fileName`"",
            "Content-Type: image/png$LF",
            [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
            "--$boundary--$LF"
        ) -join $LF
        
        $response = Invoke-RestMethod -Uri "$PRODUCTION_URL/api/gemini-vision-signal" `
                                    -Method POST `
                                    -ContentType "multipart/form-data; boundary=$boundary" `
                                    -Body $bodyLines
        
        $endTime = Get-Date
        $processingTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   ⏱️  Processing time: $([math]::Round($processingTime))ms" -ForegroundColor White
        
        if ($response.success) {
            Write-Host "   ✅ API call successful!" -ForegroundColor Green
            
            # Validate signal quality
            $analysis = $response.analysis
            Write-Host "   📊 Signal Analysis:" -ForegroundColor Cyan
            Write-Host "      Overall Confidence: $($analysis.overallConfidence)%" -ForegroundColor White
            Write-Host "      Trading Signal: $($analysis.tradingSignal.action) ($($analysis.tradingSignal.confidence)%)" -ForegroundColor White
            Write-Host "      Market Condition: $($analysis.marketCondition)" -ForegroundColor White
            
            if ($analysis.predictions) {
                Write-Host "      Next 3 Candles:" -ForegroundColor White
                foreach ($pred in $analysis.predictions) {
                    Write-Host "         Candle $($pred.candle): $($pred.direction) ($($pred.confidence)%)" -ForegroundColor White
                }
            }
            
            # Quality checks
            $qualityScore = 0
            $maxScore = 5
            
            if ($processingTime -lt 60000) { $qualityScore++ }
            if ($analysis.overallConfidence -ge 70) { $qualityScore++ }
            if ($analysis.predictions -and $analysis.predictions.Count -eq 3) { $qualityScore++ }
            if ($analysis.tradingSignal.confidence -ge 70) { $qualityScore++ }
            if ($analysis.technicalIndicators) { $qualityScore++ }
            
            $qualityPercent = [math]::Round(($qualityScore / $maxScore) * 100)
            
            if ($qualityPercent -ge 80) {
                Write-Host "   🎯 Quality Score: $qualityPercent% - EXCELLENT" -ForegroundColor Green
            } elseif ($qualityPercent -ge 60) {
                Write-Host "   ⚠️  Quality Score: $qualityPercent% - GOOD" -ForegroundColor Yellow
            } else {
                Write-Host "   ❌ Quality Score: $qualityPercent% - NEEDS IMPROVEMENT" -ForegroundColor Red
            }
            
        } else {
            Write-Host "   ❌ API returned error: $($response.error)" -ForegroundColor Red
        }

    } catch {
        Write-Host "   ❌ API test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Testing completed!" -ForegroundColor Green
Write-Host "📝 Check the results above for signal quality and performance metrics." -ForegroundColor Cyan
