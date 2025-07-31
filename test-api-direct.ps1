# Direct API Test for TRADAI Gemini Vision
# Tests the production API with trading screenshots

$PRODUCTION_URL = "https://tradai-8bnxxvuls-ranveer-singh-rajputs-projects.vercel.app"
$API_ENDPOINT = "$PRODUCTION_URL/api/gemini-vision-signal"

# Test images from 5m directory
$TEST_IMAGES = @(
    "C:\Users\thaku\Pictures\trading ss\5m\usdinr.png",
    "C:\Users\thaku\Pictures\trading ss\5m\usdbdt.png",
    "C:\Users\thaku\Pictures\trading ss\5m\usdbrl.png",
    "C:\Users\thaku\Pictures\trading ss\5m\usdtry.png"
)

Write-Host "🚀 TRADAI API Comprehensive Testing" -ForegroundColor Green
Write-Host "Production URL: $PRODUCTION_URL" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

# Test 1: Health Check
Write-Host "`n🏥 Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$PRODUCTION_URL/api/health" -Method GET -TimeoutSec 30
    if ($healthResponse.status -eq "OK") {
        Write-Host "✅ Health Check: PASSED" -ForegroundColor Green
        Write-Host "   Gemini Vision: $($healthResponse.services.geminiVision.status)" -ForegroundColor White
        Write-Host "   Technical Analysis: $($healthResponse.services.technicalAnalysis.status)" -ForegroundColor White
    } else {
        Write-Host "❌ Health Check: FAILED" -ForegroundColor Red
        Write-Host "   Status: $($healthResponse.status)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Health Check: ERROR" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Individual Screenshot Testing
$testResults = @()
$testCount = 0
$successCount = 0

foreach ($imagePath in $TEST_IMAGES) {
    $fileName = Split-Path $imagePath -Leaf
    $testCount++
    
    Write-Host "`n📸 Test $testCount`: Testing $fileName" -ForegroundColor Cyan
    Write-Host "-" * 50 -ForegroundColor Gray
    
    # Check if file exists
    if (-not (Test-Path $imagePath)) {
        Write-Host "❌ File not found: $imagePath" -ForegroundColor Red
        $testResults += @{
            FileName = $fileName
            Success = $false
            Error = "File not found"
            ProcessingTime = 0
        }
        continue
    }
    
    $fileSize = (Get-Item $imagePath).Length
    Write-Host "📁 File size: $([math]::Round($fileSize / 1KB)) KB" -ForegroundColor White
    
    $startTime = Get-Date
    
    try {
        # Read the image file
        $imageBytes = [System.IO.File]::ReadAllBytes($imagePath)
        
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
        
        Write-Host "📤 Uploading to API..." -ForegroundColor White
        
        $response = Invoke-RestMethod -Uri $API_ENDPOINT -Method POST -Body $body -Headers $headers -TimeoutSec 120
        
        $endTime = Get-Date
        $processingTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "⏱️  Processing time: $([math]::Round($processingTime))ms ($([math]::Round($processingTime/1000, 1))s)" -ForegroundColor Yellow
        
        if ($response.success) {
            Write-Host "✅ Analysis: SUCCESS" -ForegroundColor Green
            $successCount++
            
            $analysis = $response.analysis
            
            # Display key results
            Write-Host "`n📊 Analysis Results:" -ForegroundColor Cyan
            Write-Host "   Overall Confidence: $($analysis.overallConfidence)%" -ForegroundColor White
            Write-Host "   Trading Signal: $($analysis.tradingSignal.action) ($($analysis.tradingSignal.confidence)%)" -ForegroundColor White
            Write-Host "   Market Condition: $($analysis.marketCondition)" -ForegroundColor White
            Write-Host "   Detected Asset: $($analysis.detectedAsset)" -ForegroundColor White
            Write-Host "   Detected Timeframe: $($analysis.detectedTimeframe)" -ForegroundColor White
            
            # Show predictions
            if ($analysis.predictions) {
                Write-Host "`n🔮 Next 3 Candle Predictions:" -ForegroundColor Cyan
                foreach ($pred in $analysis.predictions) {
                    Write-Host "   Candle $($pred.candle): $($pred.direction) ($($pred.confidence)%)" -ForegroundColor White
                }
            }
            
            # Calculate quality score
            $qualityScore = 0
            $maxScore = 6
            
            if ($processingTime -lt 60000) { $qualityScore++ }
            if ($analysis.overallConfidence -ge 70) { $qualityScore++ }
            if ($analysis.predictions -and $analysis.predictions.Count -eq 3) { $qualityScore++ }
            if ($analysis.tradingSignal.confidence -ge 70) { $qualityScore++ }
            if ($analysis.technicalIndicators) { $qualityScore++ }
            if ($analysis.supportLevels -and $analysis.resistanceLevels) { $qualityScore++ }
            
            $qualityPercent = [math]::Round(($qualityScore / $maxScore) * 100)
            
            if ($qualityPercent -ge 80) {
                Write-Host "`n🎯 Quality Score: $qualityPercent% - EXCELLENT" -ForegroundColor Green
            } elseif ($qualityPercent -ge 60) {
                Write-Host "`n⚠️  Quality Score: $qualityPercent% - GOOD" -ForegroundColor Yellow
            } else {
                Write-Host "`n❌ Quality Score: $qualityPercent% - NEEDS IMPROVEMENT" -ForegroundColor Red
            }
            
            $testResults += @{
                FileName = $fileName
                Success = $true
                ProcessingTime = $processingTime
                QualityScore = $qualityPercent
                OverallConfidence = $analysis.overallConfidence
                TradingSignal = "$($analysis.tradingSignal.action) ($($analysis.tradingSignal.confidence)%)"
                DetectedAsset = $analysis.detectedAsset
                DetectedTimeframe = $analysis.detectedTimeframe
            }
            
        } else {
            Write-Host "❌ Analysis: FAILED" -ForegroundColor Red
            Write-Host "   Error: $($response.error)" -ForegroundColor Red
            
            $testResults += @{
                FileName = $fileName
                Success = $false
                Error = $response.error
                ProcessingTime = $processingTime
            }
        }
        
    } catch {
        $endTime = Get-Date
        $processingTime = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "❌ Test: FAILED" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        
        $testResults += @{
            FileName = $fileName
            Success = $false
            Error = $_.Exception.Message
            ProcessingTime = $processingTime
        }
    }
    
    # Wait between tests to avoid rate limiting
    if ($testCount -lt $TEST_IMAGES.Count) {
        Write-Host "`n⏳ Waiting 5 seconds before next test..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

# Generate Summary Report
Write-Host "`n" + "=" * 60 -ForegroundColor Gray
Write-Host "📋 COMPREHENSIVE TEST SUMMARY" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

$successfulTests = $testResults | Where-Object { $_.Success -eq $true }
$failedTests = $testResults | Where-Object { $_.Success -eq $false }

Write-Host "`n📊 Overall Statistics:" -ForegroundColor Cyan
Write-Host "   Total Tests: $testCount" -ForegroundColor White
Write-Host "   Successful: $successCount" -ForegroundColor Green
Write-Host "   Failed: $($testCount - $successCount)" -ForegroundColor Red
Write-Host "   Success Rate: $([math]::Round(($successCount / $testCount) * 100))%" -ForegroundColor White

if ($successfulTests.Count -gt 0) {
    $avgProcessingTime = ($successfulTests | Measure-Object -Property ProcessingTime -Average).Average
    $avgQualityScore = ($successfulTests | Measure-Object -Property QualityScore -Average).Average
    
    Write-Host "`n📈 Performance Metrics:" -ForegroundColor Cyan
    Write-Host "   Average Processing Time: $([math]::Round($avgProcessingTime))ms ($([math]::Round($avgProcessingTime/1000, 1))s)" -ForegroundColor White
    Write-Host "   Average Quality Score: $([math]::Round($avgQualityScore))%" -ForegroundColor White
    
    # Check if meets requirements
    $meetsTimeRequirement = $avgProcessingTime -lt 60000
    $meetsQualityRequirement = $avgQualityScore -ge 70
    
    Write-Host "`n✅ Requirements Check:" -ForegroundColor Cyan
    Write-Host "   Processing Time < 60s: $(if ($meetsTimeRequirement) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($meetsTimeRequirement) { 'Green' } else { 'Red' })
    Write-Host "   Quality Score ≥ 70%: $(if ($meetsQualityRequirement) { '✅ PASS' } else { '❌ FAIL' })" -ForegroundColor $(if ($meetsQualityRequirement) { 'Green' } else { 'Red' })
}

Write-Host "`n📋 Individual Test Results:" -ForegroundColor Cyan
foreach ($result in $testResults) {
    $status = if ($result.Success) { "✅" } else { "❌" }
    $details = if ($result.Success) { 
        "Quality: $($result.QualityScore)%, Time: $([math]::Round($result.ProcessingTime/1000, 1))s"
    } else { 
        "Error: $($result.Error)" 
    }
    Write-Host "   $status $($result.FileName) - $details" -ForegroundColor White
}

# Final Assessment
Write-Host "`n🎯 FINAL ASSESSMENT:" -ForegroundColor Yellow
if ($successCount -eq $testCount -and $successfulTests.Count -gt 0) {
    $avgQuality = ($successfulTests | Measure-Object -Property QualityScore -Average).Average
    if ($avgQuality -ge 80) {
        Write-Host "🎉 EXCELLENT - System ready for production trading!" -ForegroundColor Green
    } elseif ($avgQuality -ge 70) {
        Write-Host "👍 GOOD - System acceptable for trading with monitoring" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️  NEEDS IMPROVEMENT - Review quality issues before trading" -ForegroundColor Red
    }
} else {
    Write-Host "❌ ISSUES DETECTED - Some tests failed, review before production use" -ForegroundColor Red
}

Write-Host "`n🎉 Testing completed!" -ForegroundColor Green
