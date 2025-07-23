// Minimal test to check basic functionality
console.log('Starting minimal test...');

try {
    // Test 1: Basic Node.js
    console.log('Node.js version:', process.version);
    
    // Test 2: Directory check
    const fs = require('fs');
    const targetDir = "C:\\Users\\thaku\\Pictures\\trading ss";
    
    if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        const imageFiles = files.filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
        console.log(`Found ${imageFiles.length} image files in target directory`);
    } else {
        console.log('Target directory not found');
    }
    
    // Test 3: Dependencies
    const deps = ['sharp', 'jimp', 'tesseract.js', 'axios'];
    deps.forEach(dep => {
        try {
            require(dep);
            console.log(`${dep}: OK`);
        } catch (e) {
            console.log(`${dep}: FAILED - ${e.message}`);
        }
    });
    
    console.log('Minimal test completed');
    
} catch (error) {
    console.error('Test failed:', error.message);
}
