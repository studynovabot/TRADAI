/**
 * Simple OCR Testing Script
 * 
 * Tests OCR functionality on trading screenshots without TensorFlow dependencies
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

class SimpleOCRTester {
    constructor() {
        this.screenshotPath = 'C:\\Users\\thaku\\Pictures\\trading ss';
        this.ocrWorker = null;
        this.testResults = [];
    }

    /**
     * Initialize OCR worker
     */
    async initialize() {
        console.log('🔍 Initializing Simple OCR Tester...');

        try {
            // Create OCR worker
            this.ocrWorker = await Tesseract.createWorker();
            await this.ocrWorker.loadLanguage('eng');
            await this.ocrWorker.initialize('eng');
            
            // Configure for price recognition
            await this.ocrWorker.setParameters({
                tessedit_pageseg_mode: 6,
                tessedit_char_whitelist: '0123456789.,',
                preserve_interword_spaces: '1'
            });

            console.log('✅ OCR worker initialized');

        } catch (error) {
            console.error('❌ Failed to initialize OCR worker:', error);
            throw error;
        }
    }

    /**
     * Run OCR tests on all screenshots
     */
    async runTests() {
        console.log('🚀 Starting Simple OCR Tests...');
        console.log('=' .repeat(60));

        try {
            // Find screenshots
            const screenshots = await this.findScreenshots();
            console.log(`📸 Found ${screenshots.length} screenshots to analyze`);

            if (screenshots.length === 0) {
                console.log('⚠️ No screenshots found in the specified directory');
                return;
            }

            // Test each screenshot
            for (let i = 0; i < screenshots.length; i++) {
                const screenshot = screenshots[i];
                console.log(`\n🔍 Testing screenshot ${i + 1}/${screenshots.length}: ${screenshot.name}`);
                
                try {
                    const result = await this.testScreenshot(screenshot);
                    this.testResults.push(result);
                    this.displayResult(result);
                    
                } catch (error) {
                    console.error(`❌ Failed to test ${screenshot.name}:`, error.message);
                    this.testResults.push({
                        file: screenshot.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            // Generate summary
            this.generateSummary();

        } catch (error) {
            console.error('❌ Testing failed:', error);
            throw error;
        }
    }

    /**
     * Find all screenshot files
     */
    async findScreenshots() {
        const screenshots = [];
        
        try {
            // Check if directory exists
            const mainDirExists = await this.directoryExists(this.screenshotPath);
            if (!mainDirExists) {
                console.log(`❌ Directory not found: ${this.screenshotPath}`);
                return screenshots;
            }

            // Get subdirectories
            const subdirs = await fs.readdir(this.screenshotPath);
            console.log(`📁 Found subdirectories: ${subdirs.join(', ')}`);
            
            for (const subdir of subdirs) {
                const subdirPath = path.join(this.screenshotPath, subdir);
                
                try {
                    const stat = await fs.stat(subdirPath);
                    if (stat.isDirectory()) {
                        console.log(`📂 Scanning directory: ${subdir}`);
                        
                        const files = await fs.readdir(subdirPath);
                        console.log(`   Found ${files.length} files`);
                        
                        for (const file of files) {
                            const filePath = path.join(subdirPath, file);
                            const fileExt = path.extname(file).toLowerCase();
                            
                            if (['.png', '.jpg', '.jpeg', '.bmp', '.gif'].includes(fileExt)) {
                                const fileSize = (await fs.stat(filePath)).size;
                                screenshots.push({
                                    name: `${subdir}/${file}`,
                                    path: filePath,
                                    pair: subdir.toUpperCase(),
                                    size: fileSize
                                });
                                console.log(`   ✅ Added: ${file} (${Math.round(fileSize/1024)}KB)`);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not access ${subdir}:`, error.message);
                }
            }

        } catch (error) {
            console.error('❌ Error finding screenshots:', error);
        }

        return screenshots;
    }

    /**
     * Test OCR on a single screenshot
     */
    async testScreenshot(screenshot) {
        const startTime = Date.now();
        
        try {
            // Read image
            const imageBuffer = await fs.readFile(screenshot.path);
            
            // Get image info
            const metadata = await sharp(imageBuffer).metadata();
            console.log(`   📊 Image: ${metadata.width}x${metadata.height} (${metadata.format})`);
            
            // Enhance image for OCR
            const enhancedImage = await sharp(imageBuffer)
                .resize(1600, 1200, { fit: 'inside' })
                .sharpen()
                .normalize()
                .png()
                .toBuffer();

            // Test different regions for price detection
            const regions = [
                { name: 'top-right', left: 600, top: 50, width: 200, height: 100 },
                { name: 'top-center', left: 400, top: 50, width: 300, height: 100 },
                { name: 'center-right', left: 500, top: 200, width: 250, height: 150 },
                { name: 'full-top', left: 0, top: 0, width: 800, height: 200 }
            ];

            const ocrResults = {};
            let bestPriceResult = null;
            let maxConfidence = 0;

            for (const region of regions) {
                try {
                    // Extract region
                    const regionImage = await sharp(enhancedImage)
                        .extract({
                            left: Math.max(0, region.left),
                            top: Math.max(0, region.top),
                            width: Math.min(region.width, metadata.width - region.left),
                            height: Math.min(region.height, metadata.height - region.top)
                        })
                        .threshold(128) // Convert to binary for better OCR
                        .png()
                        .toBuffer();

                    // Perform OCR
                    const { data: { text, confidence } } = await this.ocrWorker.recognize(regionImage);
                    
                    // Extract prices and numbers
                    const priceMatches = text.match(/\d+\.\d{2,5}/g) || [];
                    const allNumbers = text.match(/\d+\.?\d*/g) || [];
                    
                    // Filter for realistic forex prices (0.5 to 200.0 range)
                    const validPrices = priceMatches.filter(price => {
                        const num = parseFloat(price);
                        return num >= 0.5 && num <= 200.0 && price.includes('.');
                    });

                    const result = {
                        text: text.trim(),
                        confidence: confidence,
                        allPrices: priceMatches,
                        validPrices: validPrices,
                        allNumbers: allNumbers,
                        hasValidPrice: validPrices.length > 0
                    };

                    ocrResults[region.name] = result;

                    // Track best result
                    if (result.hasValidPrice && confidence > maxConfidence) {
                        maxConfidence = confidence;
                        bestPriceResult = {
                            region: region.name,
                            price: validPrices[0],
                            confidence: confidence
                        };
                    }

                } catch (error) {
                    ocrResults[region.name] = {
                        error: error.message,
                        hasValidPrice: false
                    };
                }
            }

            const processingTime = Date.now() - startTime;

            return {
                file: screenshot.name,
                pair: screenshot.pair,
                success: true,
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format,
                    size: screenshot.size
                },
                ocr: ocrResults,
                bestPrice: bestPriceResult,
                processingTime: processingTime,
                timestamp: Date.now()
            };

        } catch (error) {
            return {
                file: screenshot.name,
                pair: screenshot.pair,
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Display result for a single screenshot
     */
    displayResult(result) {
        if (!result.success) {
            console.log(`   ❌ FAILED: ${result.error}`);
            return;
        }

        console.log(`   ✅ SUCCESS (${result.processingTime}ms)`);
        
        // Show best price found
        if (result.bestPrice) {
            console.log(`   💰 Best Price: ${result.bestPrice.price} (${result.bestPrice.confidence.toFixed(1)}% confidence)`);
            console.log(`   📍 Found in: ${result.bestPrice.region}`);
        } else {
            console.log(`   ⚠️ No valid prices detected`);
        }

        // Show OCR results summary
        const regionsWithPrices = Object.entries(result.ocr)
            .filter(([_, data]) => data.hasValidPrice)
            .length;
        
        console.log(`   🔍 OCR Summary: ${regionsWithPrices}/4 regions found prices`);

        // Show all detected prices
        const allValidPrices = Object.values(result.ocr)
            .filter(data => data.hasValidPrice)
            .flatMap(data => data.validPrices);
        
        if (allValidPrices.length > 0) {
            console.log(`   📊 All Prices: ${[...new Set(allValidPrices)].join(', ')}`);
        }
    }

    /**
     * Generate summary report
     */
    generateSummary() {
        console.log('\n' + '=' .repeat(60));
        console.log('📊 SIMPLE OCR TEST SUMMARY');
        console.log('=' .repeat(60));

        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.success).length;
        const testsWithPrices = this.testResults.filter(r => r.success && r.bestPrice).length;

        console.log(`📈 Total Screenshots: ${totalTests}`);
        console.log(`✅ Successful OCR: ${successfulTests} (${((successfulTests/totalTests)*100).toFixed(1)}%)`);
        console.log(`💰 Price Detection: ${testsWithPrices} (${((testsWithPrices/totalTests)*100).toFixed(1)}%)`);

        if (successfulTests > 0) {
            const avgTime = this.testResults
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.processingTime, 0) / successfulTests;
            
            console.log(`⏱️ Avg Processing: ${avgTime.toFixed(0)}ms`);
        }

        // Show detected prices by pair
        const pricesByPair = {};
        this.testResults
            .filter(r => r.success && r.bestPrice)
            .forEach(r => {
                if (!pricesByPair[r.pair]) {
                    pricesByPair[r.pair] = [];
                }
                pricesByPair[r.pair].push(r.bestPrice.price);
            });

        if (Object.keys(pricesByPair).length > 0) {
            console.log('\n💱 Detected Prices by Pair:');
            Object.entries(pricesByPair).forEach(([pair, prices]) => {
                console.log(`   ${pair}: ${prices.join(', ')}`);
            });
        }

        // Recommendations
        console.log('\n📋 RECOMMENDATIONS:');
        
        if (testsWithPrices === 0) {
            console.log('❌ No prices detected. Try:');
            console.log('   - Check screenshot quality and resolution');
            console.log('   - Verify price display areas are visible');
            console.log('   - Adjust OCR parameters for your broker');
        } else if (testsWithPrices < totalTests * 0.7) {
            console.log('⚠️ Partial success. Consider:');
            console.log('   - Fine-tuning OCR regions for your broker');
            console.log('   - Improving image preprocessing');
            console.log('   - Adding broker-specific configurations');
        } else {
            console.log('✅ Excellent results! OCR is working well.');
            console.log('   - Price detection is reliable');
            console.log('   - Ready for integration with trading system');
        }
    }

    /**
     * Check if directory exists
     */
    async directoryExists(dirPath) {
        try {
            const stat = await fs.stat(dirPath);
            return stat.isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * Cleanup
     */
    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
        }
        
        console.log('✅ Cleanup completed');
    }
}

// Run if called directly
if (require.main === module) {
    const tester = new SimpleOCRTester();
    
    tester.initialize()
        .then(() => tester.runTests())
        .then(() => tester.cleanup())
        .catch(error => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { SimpleOCRTester };
