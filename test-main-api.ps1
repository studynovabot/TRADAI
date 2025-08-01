# Test script for the main Gemini Vision Signal API endpoint
# Tests the API without file to see detailed error response

$PRODUCTION_URL = "https://tradai-m8d5v0aci-ranveer-singh-rajputs-projects.vercel.app"
$API_ENDPOINT = "$PRODUCTION_URL/api/gemini-vision-signal"

Write-Host "🚀 Testing Main Gemini Vision Signal API" -ForegroundColor Green
Write-Host "API Endpoint: $API_ENDPOINT" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Testing API endpoint without file..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $API_ENDPOINT -Method POST -Body "{}" -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ API call successful!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor White
    $response | ConvertTo-Json -Depth 5
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "❌ API call failed with status: $statusCode" -ForegroundColor Red
    
    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "Error Response Body:" -ForegroundColor Red
        Write-Host $errorBody -ForegroundColor White
        
        # Try to parse as JSON
        try {
            $errorJson = $errorBody | ConvertFrom-Json
            Write-Host "Parsed Error Details:" -ForegroundColor Red
            $errorJson | ConvertTo-Json -Depth 5
        } catch {
            Write-Host "Could not parse error response as JSON" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Could not read error response: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Test completed!" -ForegroundColor Green
