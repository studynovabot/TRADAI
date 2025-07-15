# AI Trading System Comprehensive Test Script
# Tests all components of the TensorFlow.js AI trading system

Write-Host "🧠 AI Trading System - Comprehensive Test Suite" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Test 1: Extension Structure
Write-Host "`n📁 Test 1: Verifying Extension Structure..." -ForegroundColor Cyan

$requiredFiles = @(
    "manifest.json",
    "utils/tensorflow-ai-model.js",
    "utils/ai-signal-engine.js",
    "utils/auto-trade-engine.js",
    "utils/real-time-analyzer.js",
    "utils/indicators.js",
    "utils/patterns.js",
    "ai-integration.js",
    "content.js",
    "popup.html",
    "popup.js"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
    } else {
        Write-Host "✅ $file" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "❌ Missing files:" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
} else {
    Write-Host "✅ All required files present" -ForegroundColor Green
}

# Test 2: Model Directory Structure
Write-Host "`n🤖 Test 2: Checking AI Model Structure..." -ForegroundColor Cyan

$modelDir = "assets/models"
if (Test-Path $modelDir) {
    Write-Host "✅ Models directory exists" -ForegroundColor Green
    
    $modelFiles = @(
        "model-trainer.py",
        "requirements.txt",
        "setup-training.ps1",
        "create-demo-model.js"
    )
    
    foreach ($file in $modelFiles) {
        $fullPath = Join-Path $modelDir $file
        if (Test-Path $fullPath) {
            Write-Host "✅ $file" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $file (optional)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Models directory missing" -ForegroundColor Red
}

# Test 3: JavaScript Syntax Validation
Write-Host "`n🔍 Test 3: JavaScript Syntax Validation..." -ForegroundColor Cyan

$jsFiles = @(
    "utils/tensorflow-ai-model.js",
    "utils/ai-signal-engine.js",
    "utils/auto-trade-engine.js",
    "ai-integration.js"
)

foreach ($jsFile in $jsFiles) {
    if (Test-Path $jsFile) {
        try {
            # Basic syntax check by looking for common issues
            $content = Get-Content $jsFile -Raw
            
            # Check for basic syntax issues
            $issues = @()
            
            if ($content -match "(?<!\/\/.*)(?<!\/\*.*)\bundefind\b") {
                $issues += "Possible 'undefined' typo"
            }
            
            if ($content -match "(?<!\/\/.*)(?<!\/\*.*)\bfunciton\b") {
                $issues += "Possible 'function' typo"
            }
            
            # Check for unmatched brackets (basic check)
            $openBraces = ($content -split '\{').Count - 1
            $closeBraces = ($content -split '\}').Count - 1
            if ($openBraces -ne $closeBraces) {
                $issues += "Unmatched braces: $openBraces open, $closeBraces close"
            }
            
            if ($issues.Count -eq 0) {
                Write-Host "✅ $jsFile - Syntax OK" -ForegroundColor Green
            } else {
                Write-Host "⚠️ $jsFile - Potential issues:" -ForegroundColor Yellow
                $issues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
            }
            
        } catch {
            Write-Host "❌ $jsFile - Error reading file" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ $jsFile - File not found" -ForegroundColor Red
    }
}

# Test 4: Manifest Validation
Write-Host "`n📋 Test 4: Manifest Validation..." -ForegroundColor Cyan

if (Test-Path "manifest.json") {
    try {
        $manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
        
        # Check required fields
        $requiredFields = @("manifest_version", "name", "version", "permissions", "content_scripts")
        $manifestIssues = @()
        
        foreach ($field in $requiredFields) {
            if (-not $manifest.$field) {
                $manifestIssues += "Missing field: $field"
            }
        }
        
        # Check permissions
        $requiredPermissions = @("activeTab", "storage", "scripting")
        foreach ($perm in $requiredPermissions) {
            if ($manifest.permissions -notcontains $perm) {
                $manifestIssues += "Missing permission: $perm"
            }
        }
        
        # Check web accessible resources
        if ($manifest.web_accessible_resources) {
            $resources = $manifest.web_accessible_resources[0].resources
            $requiredResources = @("utils/tensorflow-ai-model.js", "utils/ai-signal-engine.js")
            
            foreach ($resource in $requiredResources) {
                if ($resources -notcontains $resource) {
                    $manifestIssues += "Missing web accessible resource: $resource"
                }
            }
        }
        
        if ($manifestIssues.Count -eq 0) {
            Write-Host "✅ Manifest validation passed" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Manifest issues found:" -ForegroundColor Yellow
            $manifestIssues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
        }
        
    } catch {
        Write-Host "❌ Manifest JSON parsing failed" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Manifest.json not found" -ForegroundColor Red
}

# Test 5: Python Training Environment Check
Write-Host "`n🐍 Test 5: Python Training Environment..." -ForegroundColor Cyan

try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python available: $pythonVersion" -ForegroundColor Green
    
    # Check if virtual environment exists
    if (Test-Path "assets/models/trading-model-env") {
        Write-Host "✅ Virtual environment exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Virtual environment not set up (run setup-training.ps1)" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "⚠️ Python not found (optional for pre-trained model)" -ForegroundColor Yellow
}

# Test 6: Extension Loading Test
Write-Host "`n🔌 Test 6: Extension Loading Simulation..." -ForegroundColor Cyan

# Simulate extension loading by checking for common issues
$loadingIssues = @()

# Check for circular dependencies
$jsFiles = Get-ChildItem -Path "utils" -Filter "*.js" | ForEach-Object { $_.Name }
Write-Host "📦 JavaScript modules found: $($jsFiles.Count)" -ForegroundColor White

# Check content script
if (Test-Path "content.js") {
    $contentScript = Get-Content "content.js" -Raw
    if ($contentScript -match "chrome\.runtime\.getURL") {
        Write-Host "✅ Content script uses proper resource loading" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Content script may not load resources properly" -ForegroundColor Yellow
    }
} else {
    $loadingIssues += "Content script missing"
}

# Check popup
if (Test-Path "popup.html" -and (Test-Path "popup.js")) {
    Write-Host "✅ Popup files present" -ForegroundColor Green
} else {
    $loadingIssues += "Popup files missing"
}

if ($loadingIssues.Count -eq 0) {
    Write-Host "✅ Extension loading simulation passed" -ForegroundColor Green
} else {
    Write-Host "❌ Extension loading issues:" -ForegroundColor Red
    $loadingIssues | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
}

# Test 7: AI Model Integration Test
Write-Host "`n🧠 Test 7: AI Model Integration..." -ForegroundColor Cyan

# Check if TensorFlow.js model structure is correct
$aiModelFile = "utils/tensorflow-ai-model.js"
if (Test-Path $aiModelFile) {
    $aiContent = Get-Content $aiModelFile -Raw
    
    $aiChecks = @()
    
    if ($aiContent -match "class TensorFlowAIModel") {
        $aiChecks += "✅ TensorFlowAIModel class defined"
    } else {
        $aiChecks += "❌ TensorFlowAIModel class missing"
    }
    
    if ($aiContent -match "async predict\(") {
        $aiChecks += "✅ Predict method defined"
    } else {
        $aiChecks += "❌ Predict method missing"
    }
    
    if ($aiContent -match "tf\.loadLayersModel") {
        $aiChecks += "✅ TensorFlow.js model loading"
    } else {
        $aiChecks += "❌ TensorFlow.js model loading missing"
    }
    
    $aiChecks | ForEach-Object { Write-Host $_ }
    
    # Check for model files
    $modelJsonPath = "assets/models/trading-model.json"
    $scalingParamsPath = "assets/models/scaling-params.json"
    
    if (Test-Path $modelJsonPath) {
        Write-Host "✅ TensorFlow.js model file found" -ForegroundColor Green
    } else {
        Write-Host "❌ TensorFlow.js model file missing (trading-model.json)" -ForegroundColor Red
        Write-Host "   Run assets/models/generate-model.html to create a demo model" -ForegroundColor Yellow
    }
    
    if (Test-Path $scalingParamsPath) {
        Write-Host "✅ Scaling parameters file found" -ForegroundColor Green
    } else {
        Write-Host "❌ Scaling parameters file missing (scaling-params.json)" -ForegroundColor Red
    }
    
    # Check for test file
    if (Test-Path "test-tensorflow-model.html") {
        Write-Host "✅ TensorFlow.js test page found" -ForegroundColor Green
        Write-Host "   Run this file to test the model: test-tensorflow-model.html" -ForegroundColor Cyan
    } else {
        Write-Host "❌ TensorFlow.js test page missing" -ForegroundColor Red
    }
    
    # Offer to run the test page
    Write-Host "`nWould you like to run the TensorFlow.js model test page?" -ForegroundColor Yellow
    $runTest = Read-Host "Enter 'y' to run the test, any other key to skip"
    
    if ($runTest -eq 'y') {
        # Check if Chrome is installed
        $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
        $chromePath2 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        
        if (Test-Path $chromePath) {
            $browser = $chromePath
        } elseif (Test-Path $chromePath2) {
            $browser = $chromePath2
        } else {
            Write-Host "❌ Chrome not found. Please open test-tensorflow-model.html manually." -ForegroundColor Red
        }
        
        if ($browser) {
            # Get the current directory
            $currentDir = Get-Location
            $testModelPath = Join-Path $currentDir "test-tensorflow-model.html"
            
            # Open the test page
            Write-Host "🚀 Opening TensorFlow.js model test page..." -ForegroundColor Green
            Start-Process $browser -ArgumentList $testModelPath
            
            Write-Host ""
            Write-Host "Please follow these steps to test the model:" -ForegroundColor Yellow
            Write-Host "1. Click 'Load Model' to initialize the TensorFlow.js model" -ForegroundColor White
            Write-Host "2. Select a sample dataset or enter custom data" -ForegroundColor White
            Write-Host "3. Click 'Test Model' to run a prediction" -ForegroundColor White
            Write-Host "4. View the results and performance metrics" -ForegroundColor White
        }
    }
    
} else {
    Write-Host "❌ AI model file not found" -ForegroundColor Red
}

# Test 8: Auto-Trading Integration Test
Write-Host "`n🤖 Test 8: Auto-Trading Integration..." -ForegroundColor Cyan

$autoTradeFile = "utils/auto-trade-engine.js"
if (Test-Path $autoTradeFile) {
    $autoContent = Get-Content $autoTradeFile -Raw
    
    $autoChecks = @()
    
    if ($autoContent -match "class AutoTradeEngine") {
        $autoChecks += "✅ AutoTradeEngine class defined"
    } else {
        $autoChecks += "❌ AutoTradeEngine class missing"
    }
    
    if ($autoContent -match "async executeSignal\(") {
        $autoChecks += "✅ Execute signal method defined"
    } else {
        $autoChecks += "❌ Execute signal method missing"
    }
    
    if ($autoContent -match "riskSettings") {
        $autoChecks += "✅ Risk management settings"
    } else {
        $autoChecks += "❌ Risk management missing"
    }
    
    if ($autoContent -match "platformSelectors") {
        $autoChecks += "✅ Platform selectors defined"
    } else {
        $autoChecks += "❌ Platform selectors missing"
    }
    
    $autoChecks | ForEach-Object { Write-Host $_ }
    
} else {
    Write-Host "❌ Auto-trade engine file not found" -ForegroundColor Red
}

# Test Summary
Write-Host "`n📊 Test Summary" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green

$totalTests = 8
$passedTests = 0

# Count passed tests (simplified)
if ($missingFiles.Count -eq 0) { $passedTests++ }
if (Test-Path $modelDir) { $passedTests++ }
if (Test-Path $aiModelFile) { $passedTests++ }
if (Test-Path "manifest.json") { $passedTests++ }
if (Test-Path $autoTradeFile) { $passedTests++ }

Write-Host "Tests Passed: $passedTests/$totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })

if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All tests passed! Extension is ready for deployment." -ForegroundColor Green
} elseif ($passedTests -ge 6) {
    Write-Host "`n⚠️ Most tests passed. Extension should work with minor issues." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Several tests failed. Please review and fix issues before deployment." -ForegroundColor Red
}

Write-Host "`n🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Load extension in Chrome (chrome://extensions/)" -ForegroundColor White
Write-Host "2. Set up AI model (demo or trained)" -ForegroundColor White
Write-Host "3. Test on Quotex.io demo account" -ForegroundColor White
Write-Host "4. Configure risk settings" -ForegroundColor White
Write-Host "5. Monitor performance" -ForegroundColor White

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "- AI_TRADING_SETUP.md - Complete setup guide" -ForegroundColor White
Write-Host "- assets/models/setup-training.ps1 - Model training setup" -ForegroundColor White

Write-Host "`nTest completed at $(Get-Date)" -ForegroundColor Gray