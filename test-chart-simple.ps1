# Simple test script for Direct Gemini Vision API with real trading chart

$PRODUCTION_URL = "https://tradai-m8d5v0aci-ranveer-singh-rajputs-projects.vercel.app"
$API_ENDPOINT = "$PRODUCTION_URL/api/gemini-vision-signal"
$CHART_IMAGE_PATH = "C:\Users\thaku\Pictures\trading ss\5m\usdinr2.png"

Write-Host "Testing Direct Gemini Vision API with Real Trading Chart" -ForegroundColor Green
Write-Host "API Endpoint: $API_ENDPOINT" -ForegroundColor Cyan
Write-Host "Chart Image: $CHART_IMAGE_PATH" -ForegroundColor Cyan
Write-Host ""

# Check if the image file exists
if (-not (Test-Path $CHART_IMAGE_PATH)) {
    Write-Host "Chart image not found at: $CHART_IMAGE_PATH" -ForegroundColor Red
    Write-Host "Please ensure the USD/INR chart image exists at this location." -ForegroundColor Yellow
    exit 1
}

$imageInfo = Get-Item $CHART_IMAGE_PATH
Write-Host "Chart Image Info:" -ForegroundColor Yellow
Write-Host "File: $($imageInfo.Name)" -ForegroundColor White
Write-Host "Size: $([math]::Round($imageInfo.Length / 1KB, 2)) KB" -ForegroundColor White
Write-Host ""

try {
    Write-Host "Testing API with real USD/INR trading chart..." -ForegroundColor Yellow
    
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
        "--$boundary--$LF"
    ) -join $LF
    
    $startTime = Get-Date
    
    $analysisResponse = Invoke-RestMethod -Uri $API_ENDPOINT `
                                        -Method POST `
                                        -ContentType "multipart/form-data; boundary=$boundary" `
                                        -Body $bodyLines `
                                        -TimeoutSec 120 `
                                        -ErrorAction Stop
    
    $endTime = Get-Date
    $processingTime = ($endTime - $startTime).TotalMilliseconds
    
    Write-Host "Analysis completed successfully!" -ForegroundColor Green
    Write-Host "Processing Time: $([math]::Round($processingTime, 0))ms" -ForegroundColor White
    Write-Host ""
    
    Write-Host "Analysis Results:" -ForegroundColor Green
    Write-Host "Success: $($analysisResponse.success)" -ForegroundColor White
    Write-Host "Overall Confidence: $($analysisResponse.confidence)%" -ForegroundColor White
    
    if ($analysisResponse.analysis) {
        $analysis = $analysisResponse.analysis
        
        Write-Host "Detected Asset: $($analysis.detectedAsset)" -ForegroundColor White
        Write-Host "Detected Timeframe: $($analysis.detectedTimeframe)" -ForegroundColor White
        
        if ($analysis.tradingSignal) {
            Write-Host ""
            Write-Host "Trading Signal:" -ForegroundColor Cyan
            Write-Host "Action: $($analysis.tradingSignal.action)" -ForegroundColor White
            Write-Host "Direction: $($analysis.tradingSignal.direction)" -ForegroundColor White
            Write-Host "Confidence: $($analysis.tradingSignal.confidence)%" -ForegroundColor White
        }
        
        if ($analysis.predictions) {
            Write-Host ""
            Write-Host "Next 3 Candle Predictions:" -ForegroundColor Cyan
            foreach ($pred in $analysis.predictions) {
                Write-Host "Candle $($pred.candle): $($pred.direction) ($($pred.confidence)%)" -ForegroundColor White
            }
        }
    }
    
    Write-Host ""
    Write-Host "DIRECT GEMINI VISION ANALYSIS SUCCESSFUL!" -ForegroundColor Green
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Analysis failed with status: $statusCode" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green
