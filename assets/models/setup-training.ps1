# TensorFlow.js Model Training Setup Script
# Run this script to set up the Python environment for model training

Write-Host "🚀 Setting up TensorFlow.js model training environment..." -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found! Please install Python 3.8+ first." -ForegroundColor Red
    Write-Host "Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Create virtual environment
Write-Host "📦 Creating virtual environment..." -ForegroundColor Cyan
python -m venv trading-model-env

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Cyan
& ".\trading-model-env\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "⬆️ Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install requirements
Write-Host "📚 Installing Python packages..." -ForegroundColor Cyan
pip install -r requirements.txt

# Install TA-Lib (Windows specific)
Write-Host "📊 Installing TA-Lib for Windows..." -ForegroundColor Cyan
try {
    # Try to install TA-Lib from wheel
    pip install TA-Lib
} catch {
    Write-Host "⚠️ TA-Lib installation failed. Trying alternative method..." -ForegroundColor Yellow
    
    # Download and install TA-Lib wheel manually
    $taLibUrl = "https://download.lfd.uci.edu/pythonlibs/archived/TA_Lib-0.4.25-cp39-cp39-win_amd64.whl"
    Write-Host "📥 Downloading TA-Lib wheel..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $taLibUrl -OutFile "TA_Lib-0.4.25-cp39-cp39-win_amd64.whl"
    pip install "TA_Lib-0.4.25-cp39-cp39-win_amd64.whl"
    Remove-Item "TA_Lib-0.4.25-cp39-cp39-win_amd64.whl"
}

# Test installation
Write-Host "🧪 Testing installation..." -ForegroundColor Cyan
python -c "import tensorflow as tf; import tensorflowjs as tfjs; import talib; print('✅ All packages installed successfully!')"

Write-Host ""
Write-Host "🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To train the model:" -ForegroundColor Yellow
Write-Host "1. Activate environment: .\trading-model-env\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "2. Run training: python model-trainer.py" -ForegroundColor White
Write-Host ""
Write-Host "The trained model will be exported to tfjs-model/ directory" -ForegroundColor Cyan