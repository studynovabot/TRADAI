Write-Host "Testing system health endpoint..."

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/system-health" -Method GET
    Write-Host "SUCCESS: Health check completed!"
    Write-Host "Status: $($response.status)"
    Write-Host "Score: $($response.score)"
    Write-Host "Recommendations:"
    $response.recommendations | ForEach-Object { Write-Host "  - $_" }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}