/**
 * Debug OCR Analysis
 * 
 * This script helps debug OCR issues and shows exactly what text is being extracted
 */

const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

async function debugOCRAnalysis() {
    console.log('🔍 Debug OCR Analysis for Trading Screenshots');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const screenshotDirectory = 'C:\\Users\\thaku\\Pictures\\trading ss\\usdinr';
    
    try {
        // Get screenshot files
        const files = await fs.readdir(screenshotDirectory);
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|bmp|gif)$/i.test(file)
        ).map(file => path.join(screenshotDirectory, file));

        if (imageFiles.length === 0) {
            console.log('❌ No image files found');
            return;
        }

        console.log(`📊 Found ${imageFiles.length} screenshots to debug`);
        
        // Initialize OCR worker
        const worker = await Tesseract.createWorker('eng');
        
        // Configure for financial data
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            tessedit_char_whitelist: '0123456789.,:/ABCDEFGHIJKLMNOPQRSTUVWXYZ%$',
            preserve_interword_spaces: '1'
        });

        // Analyze first screenshot in detail
        const firstScreenshot = imageFiles[0];
        console.log(`\n🔍 Detailed analysis of: ${path.basename(firstScreenshot)}`);
        
        const imageBuffer = await fs.readFile(firstScreenshot);
        const metadata = await sharp(imageBuffer).metadata();
        
        console.log(`📊 Image dimensions: ${metadata.width}x${metadata.height}`);
        
        // Full image OCR
        console.log('\n📝 Full Image OCR Results:');
        console.log('─'.repeat(50));
        
        const fullResult = await worker.recognize(imageBuffer);
        console.log('Raw Text:');
        console.log(fullResult.data.text);
        console.log(`\nConfidence: ${fullResult.data.confidence.toFixed(1)}%`);
        
        // Extract specific regions for debugging
        const regions = [
            { name: 'Top Bar', x: 0, y: 0, w: 1, h: 0.15 },
            { name: 'Right Side', x: 0.8, y: 0, w: 0.2, h: 0.5 },
            { name: 'Chart Area', x: 0.1, y: 0.15, w: 0.7, h: 0.6 },
            { name: 'Bottom Indicators', x: 0, y: 0.75, w: 1, h: 0.25 }
        ];
        
        for (const region of regions) {
            console.log(`\n📍 Region: ${region.name}`);
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
                const debugPath = `debug-${region.name.toLowerCase().replace(' ', '-')}.png`;
                await fs.writeFile(debugPath, regionImage);
                console.log(`💾 Debug image saved: ${debugPath}`);
                
                // OCR on region
                const regionResult = await worker.recognize(regionImage);
                console.log(`Text: "${regionResult.data.text.trim()}"`);
                console.log(`Confidence: ${regionResult.data.confidence.toFixed(1)}%`);
                
                // Look for price patterns (USD/INR optimized)
                const pricePatterns = [
                    /\d+\.\d{2,5}/g,
                    /8[0-5]\.\d{2,4}/g, // USD/INR range
                    /\d{2,3}\.\d{2,4}/g,
                    /USD.*?(\d+\.\d+)/i,
                    /INR.*?(\d+\.\d+)/i,
                    /BDT.*?(\d+\.\d+)/i
                ];
                
                pricePatterns.forEach((pattern, index) => {
                    const matches = regionResult.data.text.match(pattern);
                    if (matches) {
                        console.log(`   Pattern ${index + 1} matches: ${matches.join(', ')}`);
                    }
                });
                
            } catch (error) {
                console.log(`❌ Error processing region: ${error.message}`);
            }
        }
        
        // Enhanced image processing test
        console.log('\n🔧 Enhanced Image Processing Test:');
        console.log('─'.repeat(50));
        
        const enhancedImage = await sharp(imageBuffer)
            .resize(metadata.width * 4, metadata.height * 4)
            .normalize()
            .modulate({ brightness: 1.3, contrast: 1.5 })
            .sharpen({ sigma: 2.0 })
            .threshold(128)
            .negate()
            .png()
            .toBuffer();
        
        await fs.writeFile('debug-enhanced-full.png', enhancedImage);
        console.log('💾 Enhanced image saved: debug-enhanced-full.png');
        
        const enhancedResult = await worker.recognize(enhancedImage);
        console.log('Enhanced OCR Text:');
        console.log(enhancedResult.data.text);
        console.log(`Enhanced Confidence: ${enhancedResult.data.confidence.toFixed(1)}%`);
        
        // Look for all number patterns
        console.log('\n🔢 All Number Patterns Found:');
        console.log('─'.repeat(30));
        
        const allText = fullResult.data.text + ' ' + enhancedResult.data.text;
        const numberPatterns = [
            { name: 'Decimal prices', pattern: /\d+\.\d{2,5}/g },
            { name: 'USD/INR range', pattern: /8[0-5]\.\d{2,4}/g },
            { name: 'USD/BDT range', pattern: /1[0-2][0-9]\.\d{2,3}/g },
            { name: 'Any decimals', pattern: /\d+\.\d+/g },
            { name: 'Integers', pattern: /\d{2,4}/g },
            { name: 'Price with USD', pattern: /USD.*?(\d+\.\d+)/gi },
            { name: 'Price with INR', pattern: /INR.*?(\d+\.\d+)/gi },
            { name: 'Price with BDT', pattern: /BDT.*?(\d+\.\d+)/gi }
        ];
        
        numberPatterns.forEach(({ name, pattern }) => {
            const matches = allText.match(pattern);
            if (matches) {
                console.log(`${name}: ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''}`);
            }
        });
        
        await worker.terminate();
        
        console.log('\n✅ Debug analysis completed!');
        console.log('\n💡 Tips for better OCR:');
        console.log('- Check debug images to see if text is clear');
        console.log('- Ensure price numbers are visible and not overlapped');
        console.log('- Try different screenshot timing when prices are stable');
        console.log('- Make sure browser zoom is at 100%');
        
    } catch (error) {
        console.error('❌ Debug analysis failed:', error);
    }
}

// Run debug analysis
if (require.main === module) {
    debugOCRAnalysis().catch(console.error);
}

module.exports = { debugOCRAnalysis };
