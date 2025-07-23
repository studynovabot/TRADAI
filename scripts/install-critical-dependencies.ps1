# TRADAI Critical Dependencies Installation Script
# PowerShell script for professional-grade chart analysis system

Write-Host "🚀 TRADAI Professional Chart Analysis Dependencies Installation" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Yellow

# Function to check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check if running as Administrator
if (-not (Test-Administrator)) {
    Write-Host "❌ This script must be run as Administrator" -ForegroundColor Red
    Write-Host "💡 Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Set execution policy
Write-Host "🔧 Setting PowerShell execution policy..." -ForegroundColor Cyan
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Install Chocolatey if not present
Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Cyan
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # Refresh environment variables
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Write-Host "Chocolatey installed successfully" -ForegroundColor Green
} else {
    Write-Host "Chocolatey already installed" -ForegroundColor Green
}

# Install CMake (required for opencv4nodejs)
Write-Host "🔧 Installing CMake..." -ForegroundColor Cyan
if (-not (Get-Command cmake -ErrorAction SilentlyContinue)) {
    choco install cmake --installargs 'ADD_CMAKE_TO_PATH=System' -y
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Write-Host "CMake installed successfully" -ForegroundColor Green
} else {
    Write-Host "CMake already installed" -ForegroundColor Green
}

# Install Python (required for native module compilation)
Write-Host "🐍 Installing Python..." -ForegroundColor Cyan
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    choco install python --params "/InstallDir:C:\Python" -y
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Write-Host "Python installed successfully" -ForegroundColor Green
} else {
    Write-Host "Python already installed" -ForegroundColor Green
}

# Install Visual Studio Build Tools
Write-Host "🔨 Installing Visual Studio Build Tools..." -ForegroundColor Cyan
$vsInstalled = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*" | Where-Object { $_.DisplayName -like "*Visual Studio*Build Tools*" }
if (-not $vsInstalled) {
    choco install visualstudio2019buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.Windows10SDK.19041" -y
    Write-Host "Visual Studio Build Tools installed successfully" -ForegroundColor Green
} else {
    Write-Host "Visual Studio Build Tools already installed" -ForegroundColor Green
}

# Install GTK for Canvas (Windows)
Write-Host "🎨 Installing GTK runtime for Canvas..." -ForegroundColor Cyan
choco install gtk-runtime -y

# Refresh environment variables
Write-Host "🔄 Refreshing environment variables..." -ForegroundColor Cyan
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "All prerequisites installed successfully!" -ForegroundColor Green
Write-Host "🚀 Ready to install Node.js dependencies..." -ForegroundColor Yellow

# Install Node.js dependencies
Write-Host "📦 Installing critical Node.js dependencies..." -ForegroundColor Cyan

# Set environment variables for opencv4nodejs
$env:OPENCV4NODEJS_DISABLE_AUTOBUILD = "0"
$env:OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION = "4.5.5"

# Install dependencies one by one with proper error handling
$dependencies = @(
    "image-size",
    "file-type", 
    "jimp",
    "formidable",
    "canvas",
    "@tensorflow/tfjs-node",
    "opencv4nodejs"
)

foreach ($dep in $dependencies) {
    Write-Host "📦 Installing $dep..." -ForegroundColor Cyan
    
    if ($dep -eq "opencv4nodejs") {
        # Special handling for opencv4nodejs with extended timeout
        npm install $dep --timeout=1800000
    } elseif ($dep -eq "canvas") {
        # Special handling for canvas
        npm install $dep --timeout=600000
    } else {
        npm install $dep
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$dep installed successfully" -ForegroundColor Green
    } else {
        Write-Host "Failed to install $dep" -ForegroundColor Red
    }
}

Write-Host "Installation completed!" -ForegroundColor Green
Write-Host "TRADAI Professional Chart Analysis System is ready for precision analysis" -ForegroundColor Yellow
