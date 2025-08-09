# 🔥⚡ ULTRA-REFINED SCALPING API TEST SCRIPT (PowerShell)
# Tests the new /api/scalping-gemini-vision endpoint

Write-Host "🔥⚡ ULTRA-REFINED SCALPING API TESTER" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Yellow

# Configuration
$baseUrl = "http://localhost:3000"
$endpoint = "/api/scalping-gemini-vision"
$testImage = "test-image.png"
$timeframes = @("1m", "3m", "5m")
$assets = @("USDINR", "EURUSD", "GBPUSD")

# Check if test image exists
if (-not (Test-Path $testImage)) {
    Write-Host "⚠️ Test image $testImage not found." -ForegroundColor Yellow
    Write-Host "Please add a chart image file named 'test-image.png' to the root directory." -ForegroundColor Yellow
    Write-Host "Alternatively, you can test with a different image by updating the script." -ForegroundColor Yellow
    exit 1
}

Write-Host "📁 Using test image: $testImage" -ForegroundColor Green

# Test health check first
Write-Host "`n🔍 Testing health check..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "   Status: OK" -ForegroundColor Gray
} catch {
    Write-Host "⚠️ Health check failed (this is normal if server is not running)" -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test each timeframe
$totalTests = 0
$successfulTests = 0
$failedTests = 0
$signalDistribution = @{ BUY = 0; SELL = 0; HOLD = 0 }

foreach ($timeframe in $timeframes) {
    Write-Host "`n📊 Testing $timeframe timeframe..." -ForegroundColor Cyan
    
    $testNumber = 1
    foreach ($asset in $assets) {
        Write-Host "`n🔍 Test $testNumber`: $asset $timeframe" -ForegroundColor White
        
        $totalTests++
        $testStart = Get-Date
        
        try {
            # Prepare multipart form data
            $boundary = [System.Guid]::NewGuid().ToString()
            $LF = "`r`n"
            
            # Read image file
            $imageBytes = [System.IO.File]::ReadAllBytes($testImage)
            $imageBase64 = [System.Convert]::ToBase64String($imageBytes)
            
            # Create form data
            $bodyLines = @(
                "--$boundary",
                "Content-Disposition: form-data; name=`"image`"; filename=`"$testImage`"",
                "Content-Type: image/png",
                "",
                [System.Text.Encoding]::UTF8.GetString($imageBytes),
                "--$boundary",
                "Content-Disposition: form-data; name=`"timeframe`"",
                "",
                $timeframe,
                "--$boundary",
                "Content-Disposition: form-data; name=`"asset`"",
                "",
                $asset,
                "--$boundary",
                "Content-Disposition: form-data; name=`"autoCrop`"",
                "",
                "true",
                "--$boundary--"
            )
            
            $body = $bodyLines -join $LF
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            
            # Make API request using Invoke-WebRequest for better file upload support
            $headers = @{
                "Content-Type" = "multipart/form-data; boundary=$boundary"
            }
            
            # Alternative approach using curl if available
            if (Get-Command curl -ErrorAction SilentlyContinue) {
                $curlResult = & curl -s -X POST "$baseUrl$endpoint" `
                    -F "image=@$testImage" `
                    -F "timeframe=$timeframe" `
                    -F "asset=$asset" `
                    -F "autoCrop=true" `
                    --max-time 120
                
                if ($LASTEXITCODE -eq 0) {
                    $response = $curlResult | ConvertFrom-Json
                    $responseTime = ((Get-Date) - $testStart).TotalMilliseconds
                    
                    if ($response.success) {
                        $successfulTests++
                        
                        Write-Host "✅ Success: $($response.direction) ($($response.confidence)%)" -ForegroundColor Green
                        Write-Host "   Asset: $($response.asset)" -ForegroundColor Gray
                        Write-Host "   Timeframe: $($response.timeframe)" -ForegroundColor Gray
                        Write-Host "   Risk Level: $($response.final_signal.risk_level)" -ForegroundColor Gray
                        Write-Host "   Entry Timing: $($response.final_signal.entry_timing)" -ForegroundColor Gray
                        Write-Host "   Response Time: $([math]::Round($responseTime))ms" -ForegroundColor Gray
                        Write-Host "   Processing Time: $($response.performance.total_processing_time)ms" -ForegroundColor Gray
                        
                        # Update signal distribution
                        $signalDistribution[$response.direction]++
                        
                        # Validate scalping requirements
                        $issues = @()
                        if ($response.direction -eq "HOLD") {
                            $issues += "❌ HOLD signal detected (forbidden for scalping)"
                        }
                        if ($response.confidence -lt 75) {
                            $issues += "❌ Confidence $($response.confidence)% below scalping minimum (75%)"
                        }
                        if (-not $response.scalping_metadata) {
                            $issues += "❌ Missing scalping metadata"
                        }
                        if (-not $response.latest_candle_analysis) {
                            $issues += "❌ Missing latest candle analysis"
                        }
                        if (-not $response.next_candle_predictions -or $response.next_candle_predictions.Count -lt 3) {
                            $issues += "❌ Missing next 3 candle predictions"
                        }
                        
                        if ($issues.Count -gt 0) {
                            Write-Host "⚠️ Validation issues:" -ForegroundColor Yellow
                            foreach ($issue in $issues) {
                                Write-Host "   $issue" -ForegroundColor Red
                            }
                        } else {
                            Write-Host "✅ All scalping requirements validated" -ForegroundColor Green
                        }
                        
                    } else {
                        $failedTests++
                        Write-Host "❌ Failed: $($response.error)" -ForegroundColor Red
                    }
                } else {
                    $failedTests++
                    Write-Host "❌ Curl failed with exit code: $LASTEXITCODE" -ForegroundColor Red
                }
            } else {
                Write-Host "⚠️ curl not available, skipping test" -ForegroundColor Yellow
                Write-Host "💡 Install curl or use the Node.js test script instead" -ForegroundColor Yellow
                $failedTests++
            }
            
        } catch {
            $failedTests++
            $responseTime = ((Get-Date) - $testStart).TotalMilliseconds
            
            Write-Host "❌ Exception: $($_.Exception.Message)" -ForegroundColor Red
            
            if ($_.Exception.Message -like "*connection*refused*") {
                Write-Host "💡 Tip: Make sure your Next.js server is running (npm run dev)" -ForegroundColor Yellow
            }
        }
        
        $testNumber++
    }
}

# Print final results
Write-Host "`n🎉 ULTRA-REFINED SCALPING API TEST RESULTS" -ForegroundColor Yellow
Write-Host "=" * 50 -ForegroundColor Yellow

$successRate = if ($totalTests -gt 0) { [math]::Round(($successfulTests / $totalTests) * 100) } else { 0 }

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })

Write-Host "`n📊 Signal Distribution:" -ForegroundColor Cyan
Write-Host "   BUY: $($signalDistribution.BUY)" -ForegroundColor Green
Write-Host "   SELL: $($signalDistribution.SELL)" -ForegroundColor Red
$holdStatus = if ($signalDistribution.HOLD -eq 0) { "✅" } else { "❌ (FORBIDDEN)" }
Write-Host "   HOLD: $($signalDistribution.HOLD) $holdStatus" -ForegroundColor $(if ($signalDistribution.HOLD -eq 0) { "Green" } else { "Red" })

Write-Host "`n🎯 Scalping API Validation:" -ForegroundColor Cyan
$validationScore = 0

# Success rate (40 points)
$validationScore += [math]::Min(40, $successRate * 0.4)

# No HOLD signals (25 points)
if ($signalDistribution.HOLD -eq 0) {
    $validationScore += 25
}

# Basic functionality (35 points)
if ($successfulTests -gt 0) {
    $validationScore += 35
}

$validationScore = [math]::Round($validationScore)
Write-Host "   Overall Score: $validationScore/100" -ForegroundColor White

if ($validationScore -ge 90) {
    Write-Host "🎉 EXCELLENT - API ready for production scalping!" -ForegroundColor Green
} elseif ($validationScore -ge 75) {
    Write-Host "✅ GOOD - API suitable for scalping with monitoring" -ForegroundColor Green
} elseif ($validationScore -ge 60) {
    Write-Host "⚠️ FAIR - API needs improvements before scalping use" -ForegroundColor Yellow
} else {
    Write-Host "❌ POOR - API not ready for scalping" -ForegroundColor Red
}

Write-Host "`n💡 Usage Example:" -ForegroundColor Cyan
Write-Host "curl -X POST $baseUrl$endpoint \\" -ForegroundColor Gray
Write-Host "  -F `"image=@your-chart.png`" \\" -ForegroundColor Gray
Write-Host "  -F `"timeframe=1m`" \\" -ForegroundColor Gray
Write-Host "  -F `"asset=USDINR`"" -ForegroundColor Gray

Write-Host "`n🚀 To run the full Node.js test suite:" -ForegroundColor Cyan
Write-Host "node test-scalping-api.js" -ForegroundColor Gray

Write-Host "`n✅ Scalping API testing completed!" -ForegroundColor Green