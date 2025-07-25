/**
 * USD/BRL OCR Debug Analysis Script
 * 
 * This script provides detailed OCR debugging for USD/BRL trading screenshots
 * to validate real data extraction and identify any issues with price detection.
 */

const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

async function debugUSDRLOCR() {
    console.log('🔍 Debug OCR Analysis for USD/BRL Trading Screenshots');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const screenshotDirectory = 'C:\\Users\\thaku\\Pictures\\trading ss\\usdbrl';
    
    try {
        // Get USD/BRL screenshots
        const files = await fs.readdir(screenshotDirectory);
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|bmp|gif)$/i.test(file)
        ).map(file => path.join(screenshotDirectory, file));

        if (imageFiles.length === 0) {
            console.log('❌ No USD/BRL image files found');
            console.log(`📂 Directory checked: ${screenshotDirectory}`);
            console.log('💡 Please add USD/BRL trading screenshots to this directory');
            return;
        }

        console.log(`📊 Found ${imageFiles.length} screenshots to debug\n`);

        // Initialize OCR worker
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            tessedit_char_whitelist: '0123456789.,:/ABCDEFGHIJKLMNOPQRSTUVWXYZ%$₹',
            preserve_interword_spaces: '1'
        });

        // Analyze each screenshot
        for (let i = 0; i < Math.min(imageFiles.length, 3); i++) {
            const imagePath = imageFiles[i];
            const imageName = path.basename(imagePath);
            
            console.log(`🔍 Detailed analysis of: ${imageName}`);
            
            const imageBuffer = await fs.readFile(imagePath);
            const metadata = await sharp(imageBuffer).metadata();
            
            console.log(`📊 Image dimensions: ${metadata.width}x${metadata.height}\n`);

            // Full image OCR
            console.log('📝 Full Image OCR Results:');
            console.log('─'.repeat(54));
            
            const fullOCR = await worker.recognize(imageBuffer);
            const fullText = fullOCR.data.text;
            
            // Count diacritics for validation
            const diacritics = (fullText.match(/[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/gi) || []).length;
            console.log(`Detected ${diacritics} diacritics`);
            
            console.log('Raw Text:');
            console.log(fullText.substring(0, 200) + (fullText.length > 200 ? '...' : ''));
            console.log(`\nConfidence: ${fullOCR.data.confidence.toFixed(1)}%\n`);

            // Define USD/BRL specific regions
            const regions = [
                { name: 'Top Bar', x: 0, y: 0, w: 1, h: 0.15 },
                { name: 'Right Side', x: 0.8, y: 0, w: 0.2, h: 0.5 },
                { name: 'Chart Area', x: 0.1, y: 0.15, w: 0.7, h: 0.6 },
                { name: 'Bottom Indicators', x: 0, y: 0.75, w: 1, h: 0.25 }
            ];

            // Analyze each region
            for (const region of regions) {
                console.log(`📍 Region: ${region.name}`);
                console.log('─'.repeat(30));
                
                try {
                    // Extract region
                    const regionImage = await sharp(imageBuffer)
                        .extract({
                            left: Math.floor(metadata.width * region.x),
                            top: Math.floor(metadata.height * region.y),
                            width: Math.floor(metadata.width * region.w),
                            height: Math.floor(metadata.height * region.h)
                        })
                        .resize(Math.floor(metadata.width * region.w * 3), Math.floor(metadata.height * region.h * 3))
                        .normalize()
                        .sharpen()
                        .grayscale()
                        .png()
                        .toBuffer();
                    
                    // Save debug image
                    const debugImageName = `debug-${region.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                    await fs.writeFile(debugImageName, regionImage);
                    console.log(`💾 Debug image saved: ${debugImageName}`);
                    
                    // Perform OCR on region
                    const regionOCR = await worker.recognize(regionImage);
                    const regionText = regionOCR.data.text.trim();
                    
                    console.log(`Text: "${regionText}"`);
                    console.log(`Confidence: ${regionOCR.data.confidence.toFixed(1)}%`);
                    
                    // Look for USD/BRL prices (5.0-6.5 range)
                    const usdBrlPatterns = [
                        /[5-6]\.\d{4}/g,  // 5.1234 format
                        /[5-6]\.\d{3}/g,  // 5.123 format
                        /[5-6]\.\d{2}/g,  // 5.12 format
                        /[5-6]\.\d{1}/g   // 5.1 format
                    ];
                    
                    const foundPrices = [];
                    usdBrlPatterns.forEach((pattern, index) => {
                        const matches = regionText.match(pattern);
                        if (matches) {
                            console.log(`   Pattern ${index + 1} matches: ${matches.join(', ')}`);
                            foundPrices.push(...matches);
                        }
                    });
                    
                    if (foundPrices.length === 0) {
                        console.log('   No USD/BRL prices found in this region');
                    }
                    
                } catch (error) {
                    console.log(`   ❌ Error processing region: ${error.message}`);
                }
                
                console.log('');
            }

            // Enhanced image processing test
            console.log('🔧 Enhanced Image Processing Test:');
            console.log('─'.repeat(54));
            
            try {
                const enhancedImage = await sharp(imageBuffer)
                    .resize(Math.min(2000, metadata.width * 2), Math.min(1500, metadata.height * 2))
                    .normalize()
                    .modulate({ brightness: 1.1, contrast: 1.2 })
                    .sharpen({ sigma: 1.0 })
                    .grayscale()
                    .png()
                    .toBuffer();
                
                await fs.writeFile('debug-enhanced-full.png', enhancedImage);
                console.log('💾 Enhanced image saved: debug-enhanced-full.png');
                
                const enhancedOCR = await worker.recognize(enhancedImage);
                console.log('Enhanced OCR Text:');
                console.log(enhancedOCR.data.text.substring(0, 200) + (enhancedOCR.data.text.length > 200 ? '...' : ''));
                console.log(`\nEnhanced Confidence: ${enhancedOCR.data.confidence.toFixed(1)}%\n`);
                
            } catch (error) {
                console.log(`❌ Enhanced processing failed: ${error.message}\n`);
            }

            // Extract all number patterns
            console.log('🔢 All Number Patterns Found:');
            console.log('─'.repeat(30));
            
            const allNumbers = fullText.match(/\d+\.?\d*/g) || [];
            const integers = allNumbers.filter(n => !n.includes('.'));
            const decimals = allNumbers.filter(n => n.includes('.'));
            
            console.log(`Integers: ${integers.slice(0, 10).join(', ')}${integers.length > 10 ? '...' : ''}`);
            console.log(`Decimals: ${decimals.slice(0, 10).join(', ')}${decimals.length > 10 ? '...' : ''}`);
            
            // Look for USD/BRL specific patterns in full text
            const usdBrlPrices = [];
            const patterns = [
                /[5-6]\.\d{1,4}/g,
                /USD\/BRL.*?([5-6]\.\d{1,4})/gi,
                /BRL.*?([5-6]\.\d{1,4})/gi
            ];
            
            patterns.forEach(pattern => {
                const matches = fullText.match(pattern);
                if (matches) {
                    usdBrlPrices.push(...matches);
                }
            });
            
            if (usdBrlPrices.length > 0) {
                console.log(`USD/BRL Prices: ${usdBrlPrices.slice(0, 5).join(', ')}`);
            } else {
                console.log('USD/BRL Prices: None detected');
            }

            console.log('\n✅ Debug analysis completed!\n');
        }

        await worker.terminate();

        // Summary and recommendations
        console.log('💡 Tips for better OCR:');
        console.log('- Check debug images to see if text is clear');
        console.log('- Ensure price numbers are visible and not overlapped');
        console.log('- Try different screenshot timing when prices are stable');
        console.log('- Make sure browser zoom is at 100%');
        console.log('- USD/BRL prices should be in 5.0-6.5 range');

    } catch (error) {
        console.error('❌ Debug analysis failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the debug analysis
if (require.main === module) {
    debugUSDRLOCR().catch(console.error);
}

module.exports = { debugUSDRLOCR };
