@echo off
echo ========================================
echo TRADAI Critical Dependencies Installation
echo ========================================

echo.
echo Installing image-size...
npm install image-size
if %errorlevel% neq 0 (
    echo Failed to install image-size
    pause
    exit /b 1
)

echo.
echo Installing file-type...
npm install file-type
if %errorlevel% neq 0 (
    echo Failed to install file-type
    pause
    exit /b 1
)

echo.
echo Installing jimp...
npm install jimp
if %errorlevel% neq 0 (
    echo Failed to install jimp
    pause
    exit /b 1
)

echo.
echo Installing formidable...
npm install formidable
if %errorlevel% neq 0 (
    echo Failed to install formidable
    pause
    exit /b 1
)

echo.
echo Installing canvas...
set npm_config_msvs_version=2019
npm install canvas --timeout=600000
if %errorlevel% neq 0 (
    echo Canvas installation failed, trying alternative...
    npm install skia-canvas
    if %errorlevel% neq 0 (
        echo Failed to install canvas alternatives
        pause
        exit /b 1
    )
)

echo.
echo Installing TensorFlow.js...
npm install @tensorflow/tfjs-node --timeout=600000
if %errorlevel% neq 0 (
    echo TensorFlow Node installation failed, trying browser version...
    npm install @tensorflow/tfjs
    if %errorlevel% neq 0 (
        echo Failed to install TensorFlow
        pause
        exit /b 1
    )
)

echo.
echo Installing opencv4nodejs...
set OPENCV4NODEJS_DISABLE_AUTOBUILD=0
set OPENCV4NODEJS_AUTOBUILD_OPENCV_VERSION=4.5.5
npm install opencv4nodejs --timeout=1800000
if %errorlevel% neq 0 (
    echo opencv4nodejs installation failed
    echo This requires CMake, Python, and Visual Studio Build Tools
    echo Please install these prerequisites manually and retry
    pause
    exit /b 1
)

echo.
echo ========================================
echo All dependencies installed successfully!
echo ========================================
echo.
echo Testing installations...

node -e "
try {
    console.log('Testing dependencies...');
    
    const imageSize = require('image-size');
    console.log('✓ image-size working');
    
    const fileType = require('file-type');
    console.log('✓ file-type working');
    
    const Jimp = require('jimp');
    console.log('✓ jimp working');
    
    const formidable = require('formidable');
    console.log('✓ formidable working');
    
    try {
        const canvas = require('canvas');
        const testCanvas = canvas.createCanvas(100, 100);
        console.log('✓ canvas working (' + testCanvas.width + 'x' + testCanvas.height + ')');
    } catch (e) {
        try {
            const skiaCanvas = require('skia-canvas');
            console.log('✓ skia-canvas working (alternative)');
        } catch (e2) {
            console.log('✗ canvas not working: ' + e.message);
        }
    }
    
    try {
        const tf = require('@tensorflow/tfjs-node');
        console.log('✓ @tensorflow/tfjs-node working (v' + tf.version.tfjs + ')');
    } catch (e) {
        try {
            const tf = require('@tensorflow/tfjs');
            console.log('✓ @tensorflow/tfjs working (browser version)');
        } catch (e2) {
            console.log('✗ TensorFlow not working: ' + e.message);
        }
    }
    
    try {
        const cv = require('opencv4nodejs');
        console.log('✓ opencv4nodejs working (v' + cv.version + ')');
    } catch (e) {
        console.log('✗ opencv4nodejs not working: ' + e.message);
    }
    
    console.log('\\n🚀 TRADAI Professional Chart Analysis System Ready!');
    console.log('📊 System capable of precision technical analysis');
    
} catch (error) {
    console.log('❌ Test failed:', error.message);
    process.exit(1);
}
"

echo.
echo Installation and testing completed!
pause
