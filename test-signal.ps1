$body = @{
    pair = "EUR/USD"
    timeframe = "5m"
    enableDeepAnalysis = $true
} | ConvertTo-Json

Write-Host "Testing signal generation endpoint..."
Write-Host "Request body: $body"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/production-generate-signal" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 300
    Write-Host "SUCCESS: Signal generated!"
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
        Write-Host "Response: $($_.Exception.Response.Content)"
    }
}