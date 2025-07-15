@echo off
echo ========================================
echo Local HTTP Server for AI Training
echo ========================================

echo.
echo This will start a local HTTP server to avoid CORS issues
echo when loading CSV training data files.

echo.
echo Checking for Python...
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo ✅ Python found! Starting HTTP server...
    echo.
    echo 🌐 Server will be available at:
    echo    http://localhost:8000
    echo.
    echo 📁 Available pages:
    echo    http://localhost:8000/assets/models/professional-js-trainer.html
    echo    http://localhost:8000/test-enhanced-ai-model.html
    echo.
    echo Press Ctrl+C to stop the server
    echo.
    python -m http.server 8000
) else (
    echo ❌ Python not found!
    echo.
    echo Please install Python from https://python.org
    echo Or use the file upload method in the trainer.
    echo.
    pause
)
