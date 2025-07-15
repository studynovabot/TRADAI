# AI Trading System Test Script (Simple Version)
Write-Host "AI Trading System - Test Suite" -ForegroundColor Green

# Test 1: Check required files
Write-Host "`nTest 1: Checking required files..." -ForegroundColor Cyan

$requiredFiles = @(
    "manifest.json",
    "utils/tensorflow-ai-model.js",
    "utils/ai-signal-engine.js",
    "utils/auto-trade-engine.js",
    "ai-integration.js",
    "content.js",
    "popup.html"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "OK: $file" -ForegroundColor Green
    } else {
        Write-Host "MISSING: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

# Test 2: Check manifest.json
Write-Host "`nTest 2: Checking manifest..." -ForegroundColor Cyan
if (Test-Path "manifest.json") {
    try {
        $manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
        Write-Host "OK: Manifest is valid JSON" -ForegroundColor Green
        Write-Host "Extension name: $($manifest.name)" -ForegroundColor White
        Write-Host "Version: $($manifest.version)" -ForegroundColor White
    } catch {
        Write-Host "ERROR: Manifest JSON is invalid" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: Manifest not found" -ForegroundColor Red
}

# Test 3: Check AI model files
Write-Host "`nTest 3: Checking AI components..." -ForegroundColor Cyan

$aiFiles = @(
    "utils/tensorflow-ai-model.js",
    "utils/ai-signal-engine.js",
    "utils/auto-trade-engine.js"
)

foreach ($file in $aiFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "OK: $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "MISSING: $file" -ForegroundColor Red
    }
}

# Test 4: Check model directory
Write-Host "`nTest 4: Checking model directory..." -ForegroundColor Cyan
if (Test-Path "assets/models") {
    Write-Host "OK: Models directory exists" -ForegroundColor Green
    $modelFiles = Get-ChildItem "assets/models" -File
    Write-Host "Model files found: $($modelFiles.Count)" -ForegroundColor White
} else {
    Write-Host "WARNING: Models directory not found" -ForegroundColor Yellow
}

# Summary
Write-Host "`nTest Summary:" -ForegroundColor Green
if ($allFilesExist) {
    Write-Host "SUCCESS: All core files are present" -ForegroundColor Green
    Write-Host "Extension is ready for testing" -ForegroundColor Green
} else {
    Write-Host "WARNING: Some files are missing" -ForegroundColor Yellow
    Write-Host "Please check the missing files above" -ForegroundColor Yellow
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Load extension in Chrome (chrome://extensions/)" -ForegroundColor White
Write-Host "2. Enable Developer mode" -ForegroundColor White
Write-Host "3. Click 'Load unpacked' and select this folder" -ForegroundColor White
Write-Host "4. Test on quotex.io" -ForegroundColor White