# Quick PowerShell test for the Gemini Vision Signal API fix
# Tests the deployed API endpoint to verify the fix is working

$PRODUCTION_URL = "https://tradai-b8yhirva3-ranveer-singh-rajputs-projects.vercel.app"
$API_ENDPOINT = "$PRODUCTION_URL/api/gemini-vision-signal"

Write-Host "🚀 Testing TRADAI Gemini Vision Signal API Fix" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray
Write-Host "Production URL: $PRODUCTION_URL" -ForegroundColor Cyan
Write-Host "API Endpoint: $API_ENDPOINT" -ForegroundColor Cyan
Write-Host ""

try {
    # Step 1: Test health endpoint
    Write-Host "1️⃣ Testing health endpoint..." -ForegroundColor Yellow
    
    $healthResponse = Invoke-RestMethod -Uri "$PRODUCTION_URL/api/health" -Method GET -ErrorAction Stop
    
    Write-Host "   ✅ Health endpoint accessible" -ForegroundColor Green
    Write-Host "   Status: $($healthResponse.status)" -ForegroundColor White
    
    if ($healthResponse.services) {
        Write-Host "   Gemini Vision: $($healthResponse.services.geminiVision.status)" -ForegroundColor White
        Write-Host "   Technical Analysis: $($healthResponse.services.technicalAnalysis.status)" -ForegroundColor White
    }
    Write-Host ""

    # Step 2: Test API endpoint without file (should return 400 or error)
    Write-Host "2️⃣ Testing API endpoint without file..." -ForegroundColor Yellow
    
    try {
        $emptyResponse = Invoke-RestMethod -Uri $API_ENDPOINT -Method POST -Body "{}" -ContentType "application/json" -ErrorAction Stop
        Write-Host "   Response: $($emptyResponse | ConvertTo-Json -Depth 3)" -ForegroundColor White
    }
    catch {
        $errorResponse = $_.Exception.Response
        if ($errorResponse) {
            $statusCode = $errorResponse.StatusCode.value__
            Write-Host "   Status Code: $statusCode" -ForegroundColor White
            
            if ($statusCode -eq 400) {
                Write-Host "   ✅ Correctly returns 400 for missing file" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ Unexpected status code: $statusCode" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ❌ Network error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""

    # Step 3: Test with a test image if available
    $testImagePath = ".\test-image.png"
    
    if (Test-Path $testImagePath) {
        Write-Host "3️⃣ Testing API endpoint with test image..." -ForegroundColor Yellow
        
        # Create multipart form data
        $boundary = [System.Guid]::NewGuid().ToString()
        $LF = "`r`n"
        
        $fileBytes = [System.IO.File]::ReadAllBytes($testImagePath)
        $fileName = Split-Path $testImagePath -Leaf
        
        $bodyLines = (
            "--$boundary",
            "Content-Disposition: form-data; name=`"image`"; filename=`"$fileName`"",
            "Content-Type: image/png$LF",
            [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
            "--$boundary",
            "Content-Disposition: form-data; name=`"asset`"$LF",
            "USD/BRL",
            "--$boundary",
            "Content-Disposition: form-data; name=`"timeframe`"$LF", 
            "5m",
            "--$boundary--$LF"
        ) -join $LF
        
        try {
            $imageResponse = Invoke-RestMethod -Uri $API_ENDPOINT `
                                            -Method POST `
                                            -ContentType "multipart/form-data; boundary=$boundary" `
                                            -Body $bodyLines `
                                            -ErrorAction Stop
            
            Write-Host "   ✅ API call successful!" -ForegroundColor Green
            Write-Host "   Success: $($imageResponse.success)" -ForegroundColor White
            Write-Host "   Confidence: $($imageResponse.confidence)%" -ForegroundColor White
            Write-Host "   Processing Time: $($imageResponse.processingTime)ms" -ForegroundColor White
            
            if ($imageResponse.analysis) {
                Write-Host "   Trading Signal: $($imageResponse.analysis.tradingSignal.action)" -ForegroundColor White
                Write-Host "   Signal Confidence: $($imageResponse.analysis.tradingSignal.confidence)%" -ForegroundColor White
            }
        }
        catch {
            $errorResponse = $_.Exception.Response
            if ($errorResponse) {
                $statusCode = $errorResponse.StatusCode.value__
                Write-Host "   ❌ API call failed with status: $statusCode" -ForegroundColor Red
                
                # Try to get error details
                try {
                    $errorStream = $errorResponse.GetResponseStream()
                    $reader = New-Object System.IO.StreamReader($errorStream)
                    $errorBody = $reader.ReadToEnd()
                    $errorData = $errorBody | ConvertFrom-Json
                    
                    Write-Host "   Error: $($errorData.error)" -ForegroundColor Red
                    Write-Host "   Code: $($errorData.code)" -ForegroundColor Red
                    if ($errorData.details) {
                        Write-Host "   Details: $($errorData.details)" -ForegroundColor Red
                    }
                }
                catch {
                    Write-Host "   Raw error: $($_.Exception.Message)" -ForegroundColor Red
                }
            } else {
                Write-Host "   ❌ Network error: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "3️⃣ Skipping image test - no test image found at $testImagePath" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "🎉 API Fix Test Completed!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Test failed with error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Stack: $($_.Exception.StackTrace)" -ForegroundColor Red
}
