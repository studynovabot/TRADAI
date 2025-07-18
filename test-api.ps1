$body = '{"pair":"EUR/USD","timeframe":"5m","enableDeepAnalysis":true}'

Write-Host "Testing production signal API endpoint..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/production-generate-signal" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 60
    Write-Host "SUCCESS: API endpoint responded!"
    Write-Host "Signal Direction: $($response.signal.direction)"
    Write-Host "Confidence: $($response.signal.confidence)%"
    Write-Host "Risk Score: $($response.signal.riskScore)"
    Write-Host "Reason: $($response.signal.reason)"
    Write-Host "Data Sources: $($response.signal.dataSourcesUsed | ConvertTo-Json -Compress)"
} catch {
    Write-Host "API call completed with response:"
    Write-Host $_.Exception.Message
}