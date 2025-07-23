#!/usr/bin/env node

/**
 * Manual Screenshot Check
 * 
 * Manually examines screenshot files to check for USD/EUR content
 * and tests OCR functionality directly without API calls.
 */

const fs = require('fs');
const path = require('path');

class ManualScreenshotChecker {
    constructor() {
        this.screenshotDir = 'C:\\Users\\thaku\\Pictures\\Camera Roll';
        this.results = {
            totalFiles: 0,
            imageFiles: 0,
            analysisResults: []
        };
    }

    async checkScreenshots() {
        console.log('🔍 === MANUAL SCREENSHOT ANALYSIS ===');
        console.log('⏰ Started:', new Date().toISOString());
        console.log(`📁 Directory: ${this.screenshotDir}`);
        console.log('');

        // Check if directory exists
        if (!fs.existsSync(this.screenshotDir)) {
            console.log(`❌ Directory not found: ${this.screenshotDir}`);
            return;
        }

        // Scan and analyze files
        await this.scanAndAnalyzeFiles();

        // Test OCR functionality directly
        await this.testOCRDirectly();

        // Generate report
        this.generateReport();
    }

    async scanAndAnalyzeFiles() {
        console.log('📸 === SCANNING CAMERA ROLL FILES ===');
        
        try {
            const files = fs.readdirSync(this.screenshotDir);
            this.results.totalFiles = files.length;
            
            console.log(`📊 Found ${files.length} total files`);
            
            // Filter and analyze image files
            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp'].includes(ext);
            });
            
            this.results.imageFiles = imageFiles.length;
            console.log(`🖼️ Found ${imageFiles.length} image files`);
            console.log('');
            
            // Analyze each image file
            for (const file of imageFiles) {
                const filePath = path.join(this.screenshotDir, file);
                const stats = fs.statSync(filePath);
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                const created = stats.birthtime.toISOString();
                
                console.log(`📸 ${file}`);
                console.log(`   📊 Size: ${sizeMB}MB`);
                console.log(`   📅 Created: ${created}`);
                
                // Analyze filename for trading indicators
                const filename = file.toLowerCase();
                const tradingIndicators = this.analyzeFilename(filename);
                
                if (tradingIndicators.length > 0) {
                    console.log(`   🎯 Trading indicators in filename: ${tradingIndicators.join(', ')}`);
                }
                
                this.results.analysisResults.push({
                    filename: file,
                    filePath: filePath,
                    sizeMB: parseFloat(sizeMB),
                    created: created,
                    tradingIndicators: tradingIndicators,
                    likelyTradingScreenshot: tradingIndicators.length > 0 || sizeMB > 0.1
                });
                
                console.log('');
            }
            
        } catch (error) {
            console.error('❌ Error scanning files:', error.message);
        }
    }

    analyzeFilename(filename) {
        const indicators = [];
        
        // Check for currency pairs
        const currencyPairs = ['usd', 'eur', 'gbp', 'jpy', 'aud', 'cad', 'chf', 'nzd'];
        const tradingTerms = ['forex', 'trading', 'chart', 'signal', 'broker', 'quotex', 'iqoption', 'binomo'];
        
        currencyPairs.forEach(currency => {
            if (filename.includes(currency)) {
                indicators.push(currency.toUpperCase());
            }
        });
        
        tradingTerms.forEach(term => {
            if (filename.includes(term)) {
                indicators.push(term);
            }
        });
        
        return indicators;
    }

    async testOCRDirectly() {
        console.log('🔍 === TESTING OCR FUNCTIONALITY DIRECTLY ===');
        
        try {
            // Try to import OCR libraries to test if they're available
            console.log('📦 Checking OCR dependencies...');
            
            try {
                const tesseract = require('tesseract.js');
                console.log('✅ Tesseract.js is available');
                
                // Test with a simple image if available
                const largestFile = this.results.analysisResults
                    .filter(f => f.sizeMB > 0.1)
                    .sort((a, b) => b.sizeMB - a.sizeMB)[0];
                
                if (largestFile) {
                    console.log(`🧪 Testing OCR on: ${largestFile.filename}`);
                    await this.performDirectOCR(largestFile.filePath);
                } else {
                    console.log('⚠️ No suitable files found for OCR testing');
                }
                
            } catch (error) {
                console.log('❌ Tesseract.js not available:', error.message);
                console.log('   This explains why OCR functionality is not working');
            }
            
            try {
                const sharp = require('sharp');
                console.log('✅ Sharp image processing library is available');
            } catch (error) {
                console.log('❌ Sharp not available:', error.message);
            }
            
        } catch (error) {
            console.error('❌ Error testing OCR:', error.message);
        }
        
        console.log('');
    }

    async performDirectOCR(imagePath) {
        try {
            console.log('🔍 Performing direct OCR analysis...');
            
            const { createWorker } = require('tesseract.js');
            const worker = await createWorker();
            
            await worker.loadLanguage('eng');
            await worker.initialize('eng');
            
            console.log('📊 Running OCR on image...');
            const startTime = Date.now();
            
            const { data } = await worker.recognize(imagePath);
            
            const processingTime = Date.now() - startTime;
            console.log(`⏱️ OCR processing time: ${processingTime}ms (${(processingTime/1000).toFixed(1)}s)`);
            
            await worker.terminate();
            
            // Analyze extracted text
            const extractedText = data.text.toLowerCase();
            console.log(`📝 Extracted text length: ${extractedText.length} characters`);
            
            if (extractedText.length > 0) {
                console.log('✅ OCR successfully extracted text from image');
                
                // Check for USD/EUR content
                const usdEurIndicators = [
                    'usd/eur', 'eur/usd', 'eurusd', 'usdeur',
                    'dollar', 'euro', 'currency', 'forex'
                ];
                
                const foundIndicators = usdEurIndicators.filter(indicator => 
                    extractedText.includes(indicator)
                );
                
                if (foundIndicators.length > 0) {
                    console.log(`🎯 USD/EUR CONTENT DETECTED: ${foundIndicators.join(', ')}`);
                    console.log('✅ OCR is working and can detect currency information');
                } else {
                    console.log('❌ No USD/EUR content found in extracted text');
                }
                
                // Show sample of extracted text
                const textSample = extractedText.substring(0, 200);
                console.log(`📝 Text sample: "${textSample}${extractedText.length > 200 ? '...' : ''}"`);
                
            } else {
                console.log('❌ OCR extracted no text from image');
                console.log('   Image may not contain readable text or OCR failed');
            }
            
        } catch (error) {
            console.error('❌ Direct OCR test failed:', error.message);
        }
    }

    generateReport() {
        console.log('📋 === MANUAL ANALYSIS REPORT ===');
        console.log('');
        
        // File Analysis
        console.log('📊 === FILE ANALYSIS ===');
        console.log(`📁 Total files: ${this.results.totalFiles}`);
        console.log(`🖼️ Image files: ${this.results.imageFiles}`);
        
        const likelyTradingScreenshots = this.results.analysisResults.filter(f => f.likelyTradingScreenshot);
        console.log(`📈 Likely trading screenshots: ${likelyTradingScreenshots.length}`);
        console.log('');
        
        // Trading Screenshot Analysis
        if (likelyTradingScreenshots.length > 0) {
            console.log('📈 === LIKELY TRADING SCREENSHOTS ===');
            likelyTradingScreenshots.forEach(file => {
                console.log(`📸 ${file.filename} (${file.sizeMB}MB)`);
                if (file.tradingIndicators.length > 0) {
                    console.log(`   🎯 Indicators: ${file.tradingIndicators.join(', ')}`);
                }
            });
            console.log('');
        }
        
        // USD/EUR Analysis
        const usdEurFiles = this.results.analysisResults.filter(f => 
            f.tradingIndicators.some(indicator => 
                indicator.includes('USD') || indicator.includes('EUR')
            )
        );
        
        console.log('💱 === USD/EUR ANALYSIS ===');
        if (usdEurFiles.length > 0) {
            console.log(`🎯 Files with USD/EUR indicators: ${usdEurFiles.length}`);
            usdEurFiles.forEach(file => {
                console.log(`   📸 ${file.filename}`);
            });
            console.log('✅ USD/EUR content may be present in filenames');
        } else {
            console.log('❌ No USD/EUR indicators found in filenames');
            console.log('   Screenshots may not contain USD/EUR trading charts');
        }
        console.log('');
        
        // Final Assessment
        console.log('🎯 === FINAL ASSESSMENT ===');
        
        if (usdEurFiles.length > 0) {
            console.log('✅ USD/EUR INDICATORS FOUND IN FILENAMES');
            console.log('   Screenshots likely contain USD/EUR trading content');
            console.log('   If OCR fails to detect this, there may be OCR functionality issues');
        } else {
            console.log('❌ NO USD/EUR INDICATORS IN FILENAMES');
            console.log('   Screenshots may not contain USD/EUR trading charts');
            console.log('   This could explain why OCR does not detect USD/EUR content');
        }
        
        if (likelyTradingScreenshots.length > 0) {
            console.log('✅ Trading-related screenshots found');
            console.log('   Screenshots appear to be from trading platforms');
        } else {
            console.log('❌ No clear trading screenshots identified');
            console.log('   Screenshots may not be from broker platforms');
        }
        
        console.log('');
        console.log('⏰ Analysis completed:', new Date().toISOString());
    }
}

// Run the manual check
if (require.main === module) {
    const checker = new ManualScreenshotChecker();
    checker.checkScreenshots().catch(console.error);
}

module.exports = ManualScreenshotChecker;
