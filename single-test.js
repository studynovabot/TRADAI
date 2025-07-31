/**
 * Single Screenshot Test for TRADAI API
 * Tests one screenshot at a time to validate API functionality
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const PRODUCTION_URL = 'https://tradai-8bnxxvuls-ranveer-singh-rajputs-projects.vercel.app';
const TEST_IMAGE = 'C:\\Users\\thaku\\Pictures\\trading ss\\5m\\usdinr.png';

async function testSingleScreenshot() {
    console.log('🚀 Testing TRADAI API with single screenshot...');
    console.log(`Production URL: ${PRODUCTION_URL}`);
    console.log(`Test image: ${TEST_IMAGE}`);
    
    // Check if file exists
    if (!fs.existsSync(TEST_IMAGE)) {
        console.error('❌ Test image not found:', TEST_IMAGE);
        return;
    }
    
    console.log('✅ Test image found');
    
    // Test health endpoint first
    console.log('\n🏥 Testing health endpoint...');
    try {
        const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`);
        const healthData = await healthResponse.json();
        
        if (healthResponse.ok && healthData.status === 'OK') {
            console.log('✅ Health endpoint: OK');
            console.log(`   Gemini Vision: ${healthData.services.geminiVision.status}`);
        } else {
            console.error('❌ Health endpoint failed');
            return;
        }
    } catch (error) {
        console.error('❌ Health endpoint error:', error.message);
        return;
    }
    
    // Test image upload and analysis
    console.log('\n📸 Testing image analysis...');
    const startTime = Date.now();
    
    try {
        // Read file as buffer
        const imageBuffer = fs.readFileSync(TEST_IMAGE);
        console.log(`📁 Image size: ${Math.round(imageBuffer.length / 1024)} KB`);
        
        // Create form data manually
        const boundary = '----formdata-tradai-' + Math.random().toString(36);
        const fileName = path.basename(TEST_IMAGE);
        
        let formData = '';
        formData += `--${boundary}\r\n`;
        formData += `Content-Disposition: form-data; name="image"; filename="${fileName}"\r\n`;
        formData += `Content-Type: image/png\r\n\r\n`;
        
        const formDataBuffer = Buffer.concat([
            Buffer.from(formData, 'utf8'),
            imageBuffer,
            Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
        ]);
        
        console.log('📤 Uploading to API...');
        
        const response = await fetch(`${PRODUCTION_URL}/api/gemini-vision-signal`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': formDataBuffer.length.toString()
            },
            body: formDataBuffer
        });
        
        const processingTime = Date.now() - startTime;
        console.log(`⏱️  Processing time: ${processingTime}ms (${(processingTime/1000).toFixed(1)}s)`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API request failed: ${response.status}`);
            console.error(`Error: ${errorText}`);
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Analysis successful!');
            
            const analysis = result.analysis;
            console.log('\n📊 ANALYSIS RESULTS:');
            console.log(`Overall Confidence: ${analysis.overallConfidence}%`);
            console.log(`Trading Signal: ${analysis.tradingSignal.action} (${analysis.tradingSignal.confidence}%)`);
            console.log(`Market Condition: ${analysis.marketCondition}`);
            console.log(`Detected Asset: ${analysis.detectedAsset || 'Unknown'}`);
            console.log(`Detected Timeframe: ${analysis.detectedTimeframe || 'Unknown'}`);
            
            if (analysis.predictions) {
                console.log('\n🔮 Next 3 Candle Predictions:');
                analysis.predictions.forEach(pred => {
                    console.log(`   Candle ${pred.candle}: ${pred.direction} (${pred.confidence}%)`);
                    console.log(`   Reasoning: ${pred.reasoning}`);
                });
            }
            
            console.log('\n📈 Technical Analysis:');
            console.log(`Trend: ${analysis.trend}`);
            console.log(`Current Price: ${analysis.currentPrice}`);
            
            if (analysis.technicalIndicators) {
                console.log(`EMA: ${analysis.technicalIndicators.ema}`);
                console.log(`SMA: ${analysis.technicalIndicators.sma}`);
                console.log(`Stochastic: ${analysis.technicalIndicators.stochastic}`);
            }
            
            // Quality assessment
            let qualityScore = 0;
            let maxScore = 6;
            
            if (processingTime < 60000) qualityScore++;
            if (analysis.overallConfidence >= 70) qualityScore++;
            if (analysis.predictions && analysis.predictions.length === 3) qualityScore++;
            if (analysis.tradingSignal.confidence >= 70) qualityScore++;
            if (analysis.technicalIndicators) qualityScore++;
            if (analysis.supportLevels && analysis.resistanceLevels) qualityScore++;
            
            const qualityPercent = Math.round((qualityScore / maxScore) * 100);
            console.log(`\n🎯 Quality Score: ${qualityPercent}% (${qualityScore}/${maxScore})`);
            
            if (qualityPercent >= 80) {
                console.log('🎉 EXCELLENT quality - Ready for trading!');
            } else if (qualityPercent >= 60) {
                console.log('👍 GOOD quality - Acceptable for trading');
            } else {
                console.log('⚠️  NEEDS IMPROVEMENT - Review before trading');
            }
            
        } else {
            console.error('❌ Analysis failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Use dynamic import for fetch
async function main() {
    try {
        const fetch = (await import('node-fetch')).default;
        global.fetch = fetch;
        await testSingleScreenshot();
    } catch (error) {
        console.error('❌ Failed to load dependencies:', error.message);
        console.log('💡 Try running: npm install node-fetch');
    }
}

main();
