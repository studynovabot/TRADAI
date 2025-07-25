/**
 * Critical Fix for USD/INR Price Detection
 * 
 * This script implements the exact same approach that works in debug mode
 * to capture the USD/INR prices (90.8750, 90.8700, etc.) that we know exist
 */

const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

async function fixUSDINRPriceDetection() {
    console.log('🔧 Critical Fix: USD/INR Price Detection');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const screenshotDirectory = 'C:\\Users\\thaku\\Pictures\\trading ss\\usdinr';
    
    try {
        // Get first screenshot for testing
        const files = await fs.readdir(screenshotDirectory);
        const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|bmp|gif)$/i.test(file)
        ).map(file => path.join(screenshotDirectory, file));

        if (imageFiles.length === 0) {
            console.log('❌ No image files found');
            return;
        }

        const firstScreenshot = imageFiles[0];
        console.log(`🔍 Testing price detection on: ${path.basename(firstScreenshot)}`);
        
        const imageBuffer = await fs.readFile(firstScreenshot);
        const metadata = await sharp(imageBuffer).metadata();
        
        console.log(`📊 Image dimensions: ${metadata.width}x${metadata.height}`);
        
        // Initialize OCR worker with exact same settings as debug
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
            tessedit_char_whitelist: '0123456789.,:/ABCDEFGHIJKLMNOPQRSTUVWXYZ%$₹',
            preserve_interword_spaces: '1'
        });

        // Test the exact region that worked in debug (Right Side)
        console.log('\n🎯 Testing Right Side Region (where debug found USD/INR prices):');
        console.log('─'.repeat(60));
        
        const rightSideRegion = { x: 0.8, y: 0, w: 0.2, h: 0.5 };
        
        // Extract region using exact same method as debug
        const regionImage = await sharp(imageBuffer)
            .extract({
                left: Math.floor(metadata.width * rightSideRegion.x),
                top: Math.floor(metadata.height * rightSideRegion.y),
                width: Math.floor(metadata.width * rightSideRegion.w),
                height: Math.floor(metadata.height * rightSideRegion.h)
            })
            .resize(Math.floor(metadata.width * rightSideRegion.w * 3), Math.floor(metadata.height * rightSideRegion.h * 3))
            .normalize()
            .sharpen()
            .grayscale()
            .png()
            .toBuffer();
        
        // Save debug image
        await fs.writeFile('debug-right-side-fix.png', regionImage);
        console.log('💾 Debug image saved: debug-right-side-fix.png');
        
        // Perform OCR
        const { data: { text, confidence } } = await worker.recognize(regionImage);
        console.log(`📝 OCR Text: "${text}"`);
        console.log(`📊 OCR Confidence: ${confidence.toFixed(1)}%`);
        
        // Extract USD/INR prices using multiple patterns
        const usdInrPatterns = [
            /90\.\d{4}/g,  // 90.8750 format
            /90\.\d{3}/g,  // 90.875 format
            /90\.\d{2}/g,  // 90.87 format
            /9[0-5]\.\d{2,4}/g, // 90-95 range
            /\d{2}\.\d{4}/g, // Any XX.XXXX format
            /\d{2}\.\d{3}/g, // Any XX.XXX format
            /\d{2}\.\d{2}/g  // Any XX.XX format
        ];
        
        const foundPrices = [];
        usdInrPatterns.forEach((pattern, index) => {
            const matches = text.match(pattern);
            if (matches) {
                console.log(`🎯 Pattern ${index + 1} (${pattern}) found: ${matches.join(', ')}`);
                foundPrices.push(...matches);
            }
        });
        
        // Filter for realistic USD/INR prices
        const validUSDINRPrices = foundPrices
            .map(price => parseFloat(price))
            .filter(price => !isNaN(price) && price >= 80 && price <= 95)
            .filter((price, index, arr) => arr.indexOf(price) === index); // Remove duplicates
        
        console.log(`\n✅ Valid USD/INR prices found: ${validUSDINRPrices.length}`);
        if (validUSDINRPrices.length > 0) {
            console.log(`💰 USD/INR Prices: ${validUSDINRPrices.join(', ')}`);
            
            // Test if these prices would pass validation
            validUSDINRPrices.forEach(price => {
                const isValid = price >= 80 && price <= 95;
                console.log(`   ${price}: ${isValid ? '✅ VALID' : '❌ INVALID'} for USD/INR range (80-95)`);
            });
        } else {
            console.log('❌ No valid USD/INR prices found in right side region');
        }
        
        // Test alternative regions if right side fails
        if (validUSDINRPrices.length === 0) {
            console.log('\n🔍 Testing alternative regions...');
            
            const alternativeRegions = [
                { name: 'Top Right Corner', x: 0.85, y: 0, w: 0.15, h: 0.3 },
                { name: 'Price Scale Right', x: 0.9, y: 0.2, w: 0.1, h: 0.6 },
                { name: 'Chart Right Edge', x: 0.75, y: 0.1, w: 0.25, h: 0.4 }
            ];
            
            for (const region of alternativeRegions) {
                console.log(`\n📍 Testing ${region.name}:`);
                
                try {
                    const altRegionImage = await sharp(imageBuffer)
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
                    
                    const altResult = await worker.recognize(altRegionImage);
                    console.log(`   Text: "${altResult.data.text.trim()}"`);
                    console.log(`   Confidence: ${altResult.data.confidence.toFixed(1)}%`);
                    
                    // Look for USD/INR prices
                    const altPrices = [];
                    usdInrPatterns.forEach(pattern => {
                        const matches = altResult.data.text.match(pattern);
                        if (matches) {
                            altPrices.push(...matches);
                        }
                    });
                    
                    const validAltPrices = altPrices
                        .map(price => parseFloat(price))
                        .filter(price => !isNaN(price) && price >= 80 && price <= 95);
                    
                    if (validAltPrices.length > 0) {
                        console.log(`   ✅ Found USD/INR prices: ${validAltPrices.join(', ')}`);
                    } else {
                        console.log(`   ❌ No USD/INR prices found`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ Error processing region: ${error.message}`);
                }
            }
        }
        
        await worker.terminate();
        
        console.log('\n📋 SUMMARY:');
        console.log('─'.repeat(40));
        if (validUSDINRPrices.length > 0) {
            console.log(`✅ USD/INR price detection: WORKING`);
            console.log(`💰 Detected prices: ${validUSDINRPrices.join(', ')}`);
            console.log(`📊 Confidence: ${confidence.toFixed(1)}%`);
            console.log(`🎯 Best price: ${Math.max(...validUSDINRPrices)}`);
        } else {
            console.log(`❌ USD/INR price detection: FAILED`);
            console.log(`🔧 Need to adjust OCR regions or processing`);
        }
        
        console.log('\n💡 NEXT STEPS:');
        console.log('1. Update main analyzer with working region coordinates');
        console.log('2. Implement the exact OCR processing that works');
        console.log('3. Ensure price validation uses correct USD/INR range');
        console.log('4. Test with all USD/INR screenshots');
        
    } catch (error) {
        console.error('❌ Fix attempt failed:', error);
    }
}

// Run the fix
if (require.main === module) {
    fixUSDINRPriceDetection().catch(console.error);
}

module.exports = { fixUSDINRPriceDetection };
