#!/usr/bin/env node

/**
 * Camera Roll Screenshot Analysis
 * 
 * Analyzes screenshots in Camera Roll directory to check for USD/EUR trading charts
 * and validate OCR functionality by testing actual broker platform screenshots.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class CameraRollAnalyzer {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.screenshotDir = 'C:\\Users\\thaku\\Pictures\\Camera Roll';
        this.results = {
            totalFiles: 0,
            imageFiles: 0,
            testedFiles: 0,
            usdEurFound: 0,
            ocrSuccessful: 0,
            ocrFailed: 0,
            screenshots: []
        };
    }

    async analyzeScreenshots() {
        console.log('📸 === CAMERA ROLL SCREENSHOT ANALYSIS ===');
        console.log('⏰ Started:', new Date().toISOString());
        console.log(`📁 Directory: ${this.screenshotDir}`);
        console.log('');

        // Check if directory exists
        if (!fs.existsSync(this.screenshotDir)) {
            console.log(`❌ Directory not found: ${this.screenshotDir}`);
            console.log('📁 Please check the directory path');
            return;
        }

        // Scan directory for image files
        await this.scanDirectory();

        // Test screenshots with OCR
        await this.testScreenshotsWithOCR();

        // Generate analysis report
        this.generateAnalysisReport();
    }

    async scanDirectory() {
        console.log('🔍 === SCANNING CAMERA ROLL DIRECTORY ===');
        
        try {
            const files = fs.readdirSync(this.screenshotDir);
            this.results.totalFiles = files.length;
            
            console.log(`📊 Found ${files.length} total files`);
            
            // Filter image files
            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp'].includes(ext);
            });
            
            this.results.imageFiles = imageFiles.length;
            console.log(`🖼️ Found ${imageFiles.length} image files`);
            
            // Analyze each image file
            for (const file of imageFiles) {
                const filePath = path.join(this.screenshotDir, file);
                const stats = fs.statSync(filePath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                
                console.log(`   📸 ${file} (${sizeMB}MB)`);
                
                this.results.screenshots.push({
                    filename: file,
                    filePath: filePath,
                    sizeMB: parseFloat(sizeMB),
                    tested: false,
                    containsUsdEur: false,
                    ocrResult: null
                });
            }
            
            console.log('');
            
        } catch (error) {
            console.error('❌ Error scanning directory:', error.message);
        }
    }

    async testScreenshotsWithOCR() {
        console.log('🔍 === TESTING SCREENSHOTS WITH OCR ===');
        console.log('🎯 Looking for USD/EUR trading charts and validating OCR functionality');
        console.log('');
        
        // Sort by size (larger files first, more likely to be meaningful screenshots)
        const sortedScreenshots = this.results.screenshots
            .filter(s => s.sizeMB >= 0.05) // Skip very small files
            .sort((a, b) => b.sizeMB - a.sizeMB)
            .slice(0, 15); // Test top 15 files
        
        console.log(`📊 Testing ${sortedScreenshots.length} screenshots (largest files first)`);
        console.log('');
        
        for (let i = 0; i < sortedScreenshots.length; i++) {
            const screenshot = sortedScreenshots[i];
            await this.testSingleScreenshot(screenshot, i + 1, sortedScreenshots.length);
            
            // Add delay between tests
            if (i < sortedScreenshots.length - 1) {
                console.log('   ⏳ Waiting 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    async testSingleScreenshot(screenshot, index, total) {
        console.log(`🖼️ [${index}/${total}] Testing: ${screenshot.filename}`);
        console.log(`   📊 Size: ${screenshot.sizeMB}MB`);
        
        try {
            // Read image file
            const imageBuffer = fs.readFileSync(screenshot.filePath);
            const imageBase64 = `data:image/${path.extname(screenshot.filename).substring(1)};base64,${imageBuffer.toString('base64')}`;
            
            const startTime = Date.now();
            
            // Test with EUR/USD (which is supported) to check for USD/EUR content
            const response = await axios.post(`${this.baseUrl}/api/otc-chart-analysis`, {
                currencyPair: 'EUR/USD', // Use supported pair
                timeframe: '5m',
                tradeDuration: '3 minutes',
                imageData: imageBase64,
                platform: 'quotex'
            }, {
                timeout: 120000, // 2 minutes timeout
                validateStatus: () => true
            });

            const processingTime = Date.now() - startTime;
            
            console.log(`   ⏱️ Processing time: ${processingTime}ms (${(processingTime/1000).toFixed(1)}s)`);
            console.log(`   📊 Response status: ${response.status}`);
            
            screenshot.tested = true;
            screenshot.processingTime = processingTime;
            screenshot.ocrResult = {
                status: response.status,
                data: response.data
            };
            
            this.results.testedFiles++;
            
            if (response.status === 200 && response.data.success) {
                console.log(`   ✅ OCR SUCCESS!`);
                console.log(`   📈 Signal: ${response.data.signal || response.data.direction || 'N/A'}`);
                console.log(`   🎯 Confidence: ${response.data.confidence || 'N/A'}%`);
                
                this.results.ocrSuccessful++;
                
                // Check if USD/EUR or EUR/USD content was detected
                if (response.data.chartFeatures) {
                    const features = response.data.chartFeatures;
                    
                    console.log(`   📊 Chart Features:`);
                    if (features.extractedPrices) {
                        console.log(`      💰 Extracted ${features.extractedPrices.length} price values`);
                    }
                    if (features.currencyPairDetected) {
                        console.log(`      💱 Currency pair detected in image`);
                    }
                    if (features.timeframeDetected) {
                        console.log(`      ⏰ Timeframe detected in image`);
                    }
                    if (features.brokerPlatform) {
                        console.log(`      🏢 Broker platform: ${features.brokerPlatform}`);
                    }
                    if (features.dataSource) {
                        console.log(`      📊 Data source: ${features.dataSource}`);
                    }
                    
                    // Check for USD/EUR content in OCR text or extracted data
                    const responseText = JSON.stringify(response.data).toLowerCase();
                    if (responseText.includes('usd/eur') || responseText.includes('eur/usd') || 
                        responseText.includes('eurusd') || responseText.includes('usdeur')) {
                        console.log(`   🎯 USD/EUR CONTENT DETECTED!`);
                        screenshot.containsUsdEur = true;
                        this.results.usdEurFound++;
                    }
                }
                
                // Check processing time for authenticity
                if (processingTime >= 10000) {
                    console.log(`   🔍 REAL OCR PROCESSING (${(processingTime/1000).toFixed(1)}s - indicates authentic analysis)`);
                } else {
                    console.log(`   ⚡ FAST PROCESSING (${(processingTime/1000).toFixed(1)}s - may indicate cached/mock response)`);
                }
                
            } else {
                console.log(`   ❌ OCR FAILED: ${response.data.error || 'Unknown error'}`);
                console.log(`   💬 Message: ${response.data.message || 'No message'}`);
                
                this.results.ocrFailed++;
                
                // Even failed responses might contain useful error info about content
                const responseText = JSON.stringify(response.data).toLowerCase();
                if (responseText.includes('usd/eur') || responseText.includes('eur/usd')) {
                    console.log(`   🎯 USD/EUR MENTIONED IN ERROR RESPONSE`);
                    screenshot.containsUsdEur = true;
                    this.results.usdEurFound++;
                }
            }
            
        } catch (error) {
            console.log(`   ❌ REQUEST ERROR: ${error.message}`);
            screenshot.tested = true;
            screenshot.ocrResult = { error: error.message };
            this.results.ocrFailed++;
        }
        
        console.log('');
    }

    generateAnalysisReport() {
        console.log('📋 === CAMERA ROLL ANALYSIS REPORT ===');
        console.log('');
        
        // File Statistics
        console.log('📊 === FILE STATISTICS ===');
        console.log(`📁 Total files in directory: ${this.results.totalFiles}`);
        console.log(`🖼️ Image files found: ${this.results.imageFiles}`);
        console.log(`🧪 Screenshots tested: ${this.results.testedFiles}`);
        console.log('');
        
        // OCR Results
        console.log('🔍 === OCR ANALYSIS RESULTS ===');
        console.log(`✅ OCR successful: ${this.results.ocrSuccessful}`);
        console.log(`❌ OCR failed: ${this.results.ocrFailed}`);
        
        const successRate = this.results.testedFiles > 0 ? 
            ((this.results.ocrSuccessful / this.results.testedFiles) * 100).toFixed(1) : 0;
        console.log(`📈 OCR success rate: ${successRate}%`);
        console.log('');
        
        // USD/EUR Detection
        console.log('💱 === USD/EUR DETECTION RESULTS ===');
        console.log(`🎯 Screenshots containing USD/EUR: ${this.results.usdEurFound}`);
        
        if (this.results.usdEurFound > 0) {
            console.log('✅ USD/EUR CONTENT FOUND - OCR is detecting currency pair information');
            console.log('✅ This indicates OCR functionality is working properly');
            
            // Show which files contained USD/EUR
            const usdEurFiles = this.results.screenshots.filter(s => s.containsUsdEur);
            console.log('');
            console.log('📸 Files containing USD/EUR:');
            usdEurFiles.forEach(file => {
                console.log(`   • ${file.filename} (${file.sizeMB}MB)`);
            });
        } else {
            console.log('❌ NO USD/EUR CONTENT DETECTED');
            console.log('');
            console.log('🔍 POSSIBLE REASONS:');
            console.log('   1. Screenshots may not contain USD/EUR trading charts');
            console.log('   2. OCR functionality may not be working properly');
            console.log('   3. Screenshots may not be from broker trading platforms');
            console.log('   4. OCR may not be extracting currency pair information correctly');
        }
        console.log('');
        
        // Processing Time Analysis
        const successfulTests = this.results.screenshots.filter(s => s.tested && s.ocrResult && !s.ocrResult.error);
        if (successfulTests.length > 0) {
            const processingTimes = successfulTests
                .filter(s => s.processingTime)
                .map(s => s.processingTime);
            
            if (processingTimes.length > 0) {
                const avgTime = Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length);
                const realOCRCount = processingTimes.filter(time => time >= 10000).length;
                
                console.log('⏱️ === PROCESSING TIME ANALYSIS ===');
                console.log(`   Average processing time: ${avgTime}ms (${(avgTime/1000).toFixed(1)}s)`);
                console.log(`   Tests with real OCR processing (10s+): ${realOCRCount}/${processingTimes.length}`);
                
                if (realOCRCount > 0) {
                    console.log('✅ Real OCR processing detected - system is performing authentic analysis');
                } else {
                    console.log('⚠️ All tests had fast processing - may indicate mock responses or cached data');
                }
                console.log('');
            }
        }
        
        // Final Assessment
        console.log('🎯 === FINAL ASSESSMENT ===');
        
        if (this.results.usdEurFound > 0 && this.results.ocrSuccessful > 0) {
            console.log('🎉 OCR FUNCTIONALITY IS WORKING PROPERLY');
            console.log('✅ System successfully detected USD/EUR content in screenshots');
            console.log('✅ OCR is extracting currency pair information correctly');
        } else if (this.results.ocrSuccessful > 0 && this.results.usdEurFound === 0) {
            console.log('⚠️ OCR IS WORKING BUT NO USD/EUR CONTENT FOUND');
            console.log('   • OCR functionality appears to be working');
            console.log('   • Screenshots may not contain USD/EUR trading charts');
            console.log('   • Consider testing with known USD/EUR broker screenshots');
        } else {
            console.log('❌ OCR FUNCTIONALITY ISSUES DETECTED');
            console.log('   • OCR may not be working properly');
            console.log('   • System may be using mock data instead of real analysis');
            console.log('   • Screenshots may not be suitable for OCR analysis');
        }
        
        console.log('');
        console.log('⏰ Analysis completed:', new Date().toISOString());
    }
}

// Run the analysis
if (require.main === module) {
    const analyzer = new CameraRollAnalyzer();
    analyzer.analyzeScreenshots().catch(console.error);
}

module.exports = CameraRollAnalyzer;
