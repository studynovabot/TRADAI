/**
 * Screenshot Analysis Script
 * Analyzes trading screenshots without OCR to check image properties
 */

const fs = require('fs');
const path = require('path');

async function analyzeScreenshots() {
    console.log('🔍 Analyzing Trading Screenshots...');
    
    // Try to load sharp for image analysis
    let sharp;
    try {
        sharp = require('sharp');
        console.log('✅ Sharp image library loaded');
    } catch (error) {
        console.log('⚠️ Sharp not available, using basic file analysis only');
    }

    const screenshotPath = 'C:\\Users\\thaku\\Pictures\\trading ss';
    const screenshots = [];
    
    // Find all screenshots
    try {
        const subdirs = fs.readdirSync(screenshotPath);
        
        for (const subdir of subdirs) {
            const subdirPath = path.join(screenshotPath, subdir);
            
            if (fs.statSync(subdirPath).isDirectory() && subdir !== 'desktop.ini') {
                const files = fs.readdirSync(subdirPath);
                
                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                        const filePath = path.join(subdirPath, file);
                        const stats = fs.statSync(filePath);
                        
                        screenshots.push({
                            name: `${subdir}/${file}`,
                            path: filePath,
                            pair: subdir.toUpperCase(),
                            size: stats.size,
                            modified: stats.mtime
                        });
                    }
                }
            }
        }
        
        console.log(`📸 Found ${screenshots.length} screenshots to analyze`);
        
    } catch (error) {
        console.log('❌ Error finding screenshots:', error.message);
        return;
    }

    // Analyze each screenshot
    for (let i = 0; i < screenshots.length; i++) {
        const screenshot = screenshots[i];
        console.log(`\n🔍 Analyzing ${i + 1}/${screenshots.length}: ${screenshot.name}`);
        console.log(`   📁 Size: ${Math.round(screenshot.size / 1024)}KB`);
        console.log(`   📅 Modified: ${screenshot.modified.toLocaleString()}`);
        
        if (sharp) {
            try {
                // Get image metadata
                const metadata = await sharp(screenshot.path).metadata();
                console.log(`   📊 Dimensions: ${metadata.width}x${metadata.height}`);
                console.log(`   🎨 Format: ${metadata.format}`);
                console.log(`   🌈 Channels: ${metadata.channels}`);
                
                // Get image statistics
                const stats = await sharp(screenshot.path).stats();
                console.log(`   📈 Brightness: ${stats.channels[0].mean.toFixed(1)}`);
                console.log(`   📊 Contrast: ${(stats.channels[0].max - stats.channels[0].min).toFixed(1)}`);
                
                // Check if image is suitable for OCR
                const brightness = stats.channels[0].mean;
                const contrast = stats.channels[0].max - stats.channels[0].min;
                
                let quality = 'Good';
                if (brightness < 50 || brightness > 200) quality = 'Poor (brightness)';
                if (contrast < 100) quality = 'Poor (low contrast)';
                if (metadata.width < 800 || metadata.height < 600) quality = 'Poor (low resolution)';
                
                console.log(`   ✅ OCR Suitability: ${quality}`);
                
                // Suggest optimal regions for price detection based on common trading platforms
                console.log(`   🎯 Suggested OCR regions:`);
                console.log(`      Top-right: ${Math.round(metadata.width * 0.7)},50 (${Math.round(metadata.width * 0.25)}x100)`);
                console.log(`      Top-center: ${Math.round(metadata.width * 0.4)},50 (${Math.round(metadata.width * 0.3)}x100)`);
                console.log(`      Center-right: ${Math.round(metadata.width * 0.6)},200 (${Math.round(metadata.width * 0.3)}x150)`);
                
            } catch (error) {
                console.log(`   ❌ Image analysis failed: ${error.message}`);
            }
        }
    }
    
    // Provide analysis summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 SCREENSHOT ANALYSIS SUMMARY');
    console.log('=' .repeat(60));
    
    const totalSize = screenshots.reduce((sum, s) => sum + s.size, 0);
    const avgSize = totalSize / screenshots.length;
    
    console.log(`📸 Total Screenshots: ${screenshots.length}`);
    console.log(`📁 Total Size: ${Math.round(totalSize / 1024)}KB`);
    console.log(`📊 Average Size: ${Math.round(avgSize / 1024)}KB`);
    
    // Group by trading pair
    const pairCounts = {};
    screenshots.forEach(s => {
        pairCounts[s.pair] = (pairCounts[s.pair] || 0) + 1;
    });
    
    console.log('\n💱 Screenshots by Trading Pair:');
    Object.entries(pairCounts).forEach(([pair, count]) => {
        console.log(`   ${pair}: ${count} screenshots`);
    });
    
    console.log('\n📋 RECOMMENDATIONS FOR OCR:');
    console.log('1. ✅ Screenshots found and accessible');
    console.log('2. 🎯 Focus OCR on top-right and center regions');
    console.log('3. 🔧 Use image preprocessing (sharpen, normalize, threshold)');
    console.log('4. 📊 Configure OCR for numeric characters only');
    console.log('5. 🎨 Consider broker-specific region configurations');
    
    if (sharp) {
        console.log('6. ✅ Image analysis capabilities available');
    } else {
        console.log('6. ⚠️ Install Sharp for advanced image analysis');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('- Run OCR tests on these screenshots');
    console.log('- Fine-tune OCR regions based on your broker layout');
    console.log('- Implement real-time price extraction');
    console.log('- Integrate with trading signal generation');
}

// Run the analysis
analyzeScreenshots().catch(error => {
    console.error('❌ Analysis failed:', error);
});
