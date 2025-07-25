/**
 * Basic OCR Test for Trading Screenshots
 */

const fs = require('fs');
const path = require('path');

async function testOCR() {
    console.log('🔍 Starting Basic OCR Test...');
    
    // Import Tesseract dynamically
    let Tesseract;
    try {
        Tesseract = require('tesseract.js');
        console.log('✅ Tesseract.js loaded successfully');
    } catch (error) {
        console.log('❌ Failed to load Tesseract.js:', error.message);
        return;
    }

    const screenshotPath = 'C:\\Users\\thaku\\Pictures\\trading ss';
    const screenshots = [];
    
    // Find all screenshots
    try {
        const subdirs = fs.readdirSync(screenshotPath);
        
        for (const subdir of subdirs) {
            const subdirPath = path.join(screenshotPath, subdir);
            
            if (fs.statSync(subdirPath).isDirectory()) {
                const files = fs.readdirSync(subdirPath);
                
                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                        screenshots.push({
                            name: `${subdir}/${file}`,
                            path: path.join(subdirPath, file),
                            pair: subdir.toUpperCase()
                        });
                    }
                }
            }
        }
        
        console.log(`📸 Found ${screenshots.length} screenshots to test`);
        
    } catch (error) {
        console.log('❌ Error finding screenshots:', error.message);
        return;
    }

    // Test each screenshot
    for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        console.log(`\n🔍 Testing ${i + 1}/${screenshots.length}: ${screenshot.name}`);
        
        try {
            const startTime = Date.now();
            
            // Create OCR worker
            const worker = await Tesseract.createWorker();
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            // Configure for number recognition
            await worker.setParameters({
                tessedit_pageseg_mode: 6,
                tessedit_char_whitelist: '0123456789.,',
            });
            
            // Perform OCR on the full image
            console.log('   📖 Running OCR...');
            const { data: { text, confidence } } = await worker.recognize(screenshot.path);
            
            // Extract potential prices
            const priceMatches = text.match(/\d+\.\d{2,5}/g) || [];
            const allNumbers = text.match(/\d+\.?\d*/g) || [];
            
            // Filter for realistic forex prices
            const validPrices = priceMatches.filter(price => {
                const num = parseFloat(price);
                return num >= 0.1 && num <= 1000.0;
            });
            
            const processingTime = Date.now() - startTime;
            
            // Display results
            console.log(`   ✅ OCR completed in ${processingTime}ms`);
            console.log(`   📊 Confidence: ${confidence.toFixed(1)}%`);
            console.log(`   🔢 All numbers found: ${allNumbers.slice(0, 10).join(', ')}${allNumbers.length > 10 ? '...' : ''}`);
            console.log(`   💰 Potential prices: ${validPrices.join(', ') || 'None found'}`);
            
            if (validPrices.length > 0) {
                console.log(`   🎯 Best price candidate: ${validPrices[0]}`);
            }
            
            // Show some of the raw text for debugging
            const cleanText = text.replace(/\s+/g, ' ').trim();
            if (cleanText.length > 0) {
                console.log(`   📝 Sample text: "${cleanText.substring(0, 100)}${cleanText.length > 100 ? '...' : ''}"`);
            }
            
            await worker.terminate();
            
        } catch (error) {
            console.log(`   ❌ OCR failed: ${error.message}`);
        }
    }
    
    console.log('\n🎉 OCR testing completed!');
    
    // Provide recommendations
    console.log('\n📋 ANALYSIS RECOMMENDATIONS:');
    console.log('1. If prices were detected: OCR is working correctly');
    console.log('2. If no prices found: Try adjusting OCR parameters or image preprocessing');
    console.log('3. For production use: Implement region-specific OCR for better accuracy');
    console.log('4. Consider broker-specific configurations for optimal results');
}

// Run the test
testOCR().catch(error => {
    console.error('❌ Test failed:', error);
});
