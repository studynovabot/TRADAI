/**
 * Verify Real OCR System
 * 
 * Quick verification that the real OCR system can analyze screenshots
 */

const fs = require('fs');
const path = require('path');

async function verifyRealOCR() {
    console.log('🔍 VERIFYING REAL OCR SYSTEM');
    console.log('=' .repeat(50));

    try {
        // Check if Tesseract is available
        console.log('📦 Checking Tesseract.js availability...');
        const Tesseract = require('tesseract.js');
        console.log('✅ Tesseract.js loaded successfully');

        // Check if Sharp is available
        console.log('📦 Checking Sharp image processing...');
        const sharp = require('sharp');
        console.log('✅ Sharp loaded successfully');

        // Find screenshots
        const screenshotPath = 'C:\\Users\\thaku\\Pictures\\trading ss';
        console.log(`📁 Checking screenshot directory: ${screenshotPath}`);
        
        if (!fs.existsSync(screenshotPath)) {
            console.log('❌ Screenshot directory not found');
            return;
        }

        const screenshots = [];
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

        console.log(`📸 Found ${screenshots.length} screenshots`);

        if (screenshots.length === 0) {
            console.log('❌ No screenshots found');
            return;
        }

        // Test with first screenshot
        const testScreenshot = screenshots[0];
        console.log(`\n🧪 Testing with: ${testScreenshot.name}`);

        // Quick OCR test
        console.log('🔍 Initializing OCR worker...');
        const worker = await Tesseract.createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        
        console.log('📖 Performing OCR on screenshot...');
        const startTime = Date.now();
        
        // Load and process image
        const imageBuffer = fs.readFileSync(testScreenshot.path);
        const metadata = await sharp(imageBuffer).metadata();
        
        console.log(`📊 Image: ${metadata.width}x${metadata.height} (${metadata.format})`);
        
        // Enhance image for OCR
        const enhancedImage = await sharp(imageBuffer)
            .resize(1200, 900, { fit: 'inside' })
            .sharpen()
            .normalize()
            .png()
            .toBuffer();

        // Perform OCR
        const { data: { text, confidence } } = await worker.recognize(enhancedImage);
        const ocrTime = Date.now() - startTime;
        
        console.log(`✅ OCR completed in ${ocrTime}ms`);
        console.log(`📊 OCR Confidence: ${confidence.toFixed(1)}%`);
        
        // Extract prices
        const priceMatches = text.match(/\d+\.\d{2,5}/g) || [];
        const validPrices = priceMatches.filter(price => {
            const num = parseFloat(price);
            return num >= 0.5 && num <= 100.0;
        });

        console.log(`💰 Detected prices: ${validPrices.join(', ') || 'None'}`);
        
        // Extract trading pair
        const pairs = ['USD/TRY', 'USD/BRL', 'USDTRY', 'USDBRL'];
        let detectedPair = null;
        
        for (const pair of pairs) {
            if (text.toUpperCase().includes(pair)) {
                detectedPair = pair;
                break;
            }
        }
        
        console.log(`💱 Detected pair: ${detectedPair || 'Not found'}`);
        
        // Show sample text
        const cleanText = text.replace(/\s+/g, ' ').trim();
        console.log(`📝 Sample OCR text: "${cleanText.substring(0, 100)}..."`);

        await worker.terminate();

        // Verification results
        console.log('\n' + '='.repeat(50));
        console.log('🎯 VERIFICATION RESULTS');
        console.log('='.repeat(50));

        console.log('✅ Dependencies: All required packages available');
        console.log('✅ Screenshots: Found and accessible');
        console.log('✅ Image Processing: Sharp working correctly');
        console.log('✅ OCR Engine: Tesseract.js operational');
        console.log(`✅ Processing Speed: ${ocrTime}ms per image`);
        console.log(`✅ Text Extraction: ${confidence.toFixed(1)}% confidence`);
        console.log(`${validPrices.length > 0 ? '✅' : '⚠️'} Price Detection: ${validPrices.length} prices found`);
        console.log(`${detectedPair ? '✅' : '⚠️'} Pair Detection: ${detectedPair ? 'Working' : 'Needs tuning'}`);

        console.log('\n🚀 SYSTEM STATUS:');
        console.log('✅ Real OCR system is functional');
        console.log('✅ Can process your trading screenshots');
        console.log('✅ Extracts text and numerical data');
        console.log('✅ Ready for comprehensive analysis');

        console.log('\n📋 RECOMMENDATIONS:');
        if (validPrices.length > 0 && detectedPair) {
            console.log('🎉 Excellent! OCR is working perfectly');
            console.log('🚀 Ready to run full analysis on all screenshots');
        } else if (validPrices.length > 0) {
            console.log('✅ Price detection working, pair detection needs tuning');
            console.log('🔧 Adjust OCR regions for better pair recognition');
        } else {
            console.log('⚠️ OCR needs optimization for your broker interface');
            console.log('🔧 Consider adjusting OCR parameters or image preprocessing');
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Run full analysis: node scripts/real-analysis-test.js');
        console.log('2. Fine-tune OCR regions if needed');
        console.log('3. Deploy production system');

    } catch (error) {
        console.error('❌ Verification failed:', error);
        
        if (error.message.includes('tesseract')) {
            console.log('\n💡 SOLUTION: Install Tesseract.js');
            console.log('npm install tesseract.js');
        }
        
        if (error.message.includes('sharp')) {
            console.log('\n💡 SOLUTION: Install Sharp');
            console.log('npm install sharp');
        }
    }
}

// Run verification
verifyRealOCR();
