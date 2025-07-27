/**
 * Quick API Test
 * Test the new deployment with a single screenshot
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://tradai-ijp5tv3zr-ranveer-singh-rajputs-projects.vercel.app';

async function quickAPITest() {
    console.log('🔍 Quick API Test with New Deployment');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const screenshotPath = 'C:\\Users\\thaku\\Pictures\\trading ss\\1m\\usdbrl.png';
    
    try {
        console.log(`📸 Testing: ${path.basename(screenshotPath)}`);
        console.log(`📁 File size: ${(fs.statSync(screenshotPath).size / 1024).toFixed(1)} KB`);
        
        // Create multipart form data
        const boundary = '----formdata-' + Math.random().toString(36);
        const fileData = fs.readFileSync(screenshotPath);
        
        let body = '';
        body += `--${boundary}\r\n`;
        body += 'Content-Disposition: form-data; name="platform"\r\n\r\n';
        body += 'IQ Option\r\n';
        body += `--${boundary}\r\n`;
        body += 'Content-Disposition: form-data; name="analysisType"\r\n\r\n';
        body += 'single\r\n';
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="screenshots"; filename="usdbrl.png"\r\n`;
        body += 'Content-Type: image/png\r\n\r\n';
        
        const bodyBuffer = Buffer.concat([
            Buffer.from(body, 'utf8'),
            fileData,
            Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
        ]);
        
        console.log('📤 Uploading to API...');
        
        const startTime = Date.now();
        const response = await new Promise((resolve, reject) => {
            const url = new URL(`${PRODUCTION_URL}/api/multi-timeframe-analysis`);
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': bodyBuffer.length
                },
                timeout: 120000
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        resolve({ statusCode: res.statusCode, data: result });
                    } catch (error) {
                        resolve({ statusCode: res.statusCode, data: { error: 'Invalid JSON', rawData: data.substring(0, 200) } });
                    }
                });
            });
            
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            
            req.write(bodyBuffer);
            req.end();
        });
        
        const processingTime = Date.now() - startTime;
        
        console.log(`📥 Response received (${processingTime}ms)`);
        console.log(`🌐 HTTP Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            const result = response.data;
            console.log('\n✅ SUCCESS! API Response:');
            console.log(`   Direction: ${result.signal || result.direction || 'Unknown'}`);
            console.log(`   Confidence: ${result.confidenceNumeric || result.confidence || 'Unknown'}`);
            console.log(`   Trading Pair: ${result.currency_pair || 'Unknown'}`);
            console.log(`   Success: ${result.success}`);
            
            const direction = result.signal || result.direction || '';
            const isDirectional = direction === 'UP' || direction === 'DOWN';
            const confidence = parseFloat(result.confidenceNumeric || result.confidence || 0);
            
            console.log('\n🎯 Validation:');
            console.log(`   Directional: ${isDirectional ? '✅' : '❌'} (${direction})`);
            console.log(`   Good Confidence: ${confidence >= 70 ? '✅' : '❌'} (${confidence}%)`);
            
            return isDirectional && confidence >= 70;
        } else {
            console.log('\n❌ FAILED!');
            console.log(`   HTTP Status: ${response.statusCode}`);
            console.log(`   Error: ${response.data.error || 'Unknown'}`);
            return false;
        }
        
    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        return false;
    }
}

quickAPITest().then(success => {
    console.log('\n═'.repeat(50));
    console.log(success ? '🎉 API TEST PASSED' : '⚠️ API TEST FAILED');
    console.log('═'.repeat(50));
    process.exit(success ? 0 : 1);
});
