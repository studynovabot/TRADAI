/**
 * Simple Vercel Deployment Test
 */

const https = require('https');
const http = require('http');

const deploymentUrl = 'https://tradai-indol.vercel.app';

function testUrl(url, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔍 Testing: ${description}`);
        console.log(`🔗 URL: ${url}`);
        
        const startTime = Date.now();
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.get(url, (res) => {
            const responseTime = Date.now() - startTime;
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   ✅ Status: ${res.statusCode}`);
                console.log(`   ⚡ Response time: ${responseTime}ms`);
                console.log(`   📊 Content size: ${Math.floor(data.length / 1024)}KB`);
                
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    console.log(`   ✅ ${description}: SUCCESS`);
                    resolve({ success: true, status: res.statusCode, time: responseTime, size: data.length });
                } else {
                    console.log(`   ⚠️  ${description}: Unexpected status ${res.statusCode}`);
                    resolve({ success: false, status: res.statusCode, time: responseTime, size: data.length });
                }
            });
        });
        
        req.on('error', (error) => {
            const responseTime = Date.now() - startTime;
            console.log(`   ❌ ${description}: FAILED`);
            console.log(`   Error: ${error.message}`);
            resolve({ success: false, error: error.message, time: responseTime });
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            console.log(`   ❌ ${description}: TIMEOUT`);
            resolve({ success: false, error: 'Timeout', time: 30000 });
        });
    });
}

async function testDeployment() {
    console.log('🌐 === VERCEL DEPLOYMENT VERIFICATION ===');
    console.log(`🚀 Testing deployment: ${deploymentUrl}`);
    
    const tests = [
        {
            url: deploymentUrl,
            description: 'Main Page'
        },
        {
            url: `${deploymentUrl}/otc-signal-generator`,
            description: 'OTC Signal Generator Page'
        },
        {
            url: `${deploymentUrl}/api/otc-signal-generator/health`,
            description: 'Health API Endpoint'
        }
    ];
    
    const results = [];
    
    for (const test of tests) {
        const result = await testUrl(test.url, test.description);
        results.push({ ...result, name: test.description });
    }
    
    // Test API with POST request
    console.log('\n🔍 Testing: API POST Request');
    await testAPIPost();
    
    // Summary
    console.log('\n📊 === TEST SUMMARY ===');
    
    const successful = results.filter(r => r.success).length;
    const total = results.length;
    
    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`📈 Success Rate: ${Math.floor((successful / total) * 100)}%`);
    
    results.forEach(result => {
        const icon = result.success ? '✅' : '❌';
        const timeInfo = result.time ? ` (${result.time}ms)` : '';
        console.log(`${icon} ${result.name}: ${result.success ? 'PASS' : 'FAIL'}${timeInfo}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
    });
    
    if (successful === total) {
        console.log('\n🎉 === DEPLOYMENT VERIFICATION SUCCESSFUL ===');
        console.log('🌐 Your OTC Signal Generator is LIVE on Vercel!');
        console.log('\n🔗 Access URLs:');
        console.log(`   Main Site: ${deploymentUrl}`);
        console.log(`   OTC Generator: ${deploymentUrl}/otc-signal-generator`);
        console.log(`   Health Check: ${deploymentUrl}/api/otc-signal-generator/health`);
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Open the OTC Signal Generator page in your browser');
        console.log('   2. Test signal generation with different parameters');
        console.log('   3. Verify all features work as expected');
        console.log('   4. Monitor performance and logs');
        
    } else {
        console.log('\n⚠️  === DEPLOYMENT ISSUES DETECTED ===');
        console.log('Some endpoints are not accessible. Please check the deployment.');
    }
    
    console.log('\n⚠️  Important Notes:');
    console.log('   • Vercel serverless functions have execution time limits');
    console.log('   • Browser automation features may be limited');
    console.log('   • Some features may behave differently than local development');
    console.log('   • This system is for educational purposes only');
}

function testAPIPost() {
    return new Promise((resolve) => {
        console.log(`🔗 URL: ${deploymentUrl}/api/otc-signal-generator`);
        
        const postData = JSON.stringify({});
        const urlObj = new URL(`${deploymentUrl}/api/otc-signal-generator`);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const startTime = Date.now();
        const req = https.request(options, (res) => {
            const responseTime = Date.now() - startTime;
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`   ✅ Status: ${res.statusCode}`);
                console.log(`   ⚡ Response time: ${responseTime}ms`);
                
                try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.error && jsonData.message) {
                        console.log(`   ✅ API validation working: ${jsonData.message}`);
                    } else {
                        console.log(`   📊 API response: ${JSON.stringify(jsonData).substring(0, 100)}...`);
                    }
                } catch (e) {
                    console.log(`   📊 Response received (${data.length} chars)`);
                }
                
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.log(`   ❌ API POST test failed: ${error.message}`);
            resolve();
        });
        
        req.setTimeout(30000, () => {
            req.destroy();
            console.log(`   ❌ API POST test: TIMEOUT`);
            resolve();
        });
        
        req.write(postData);
        req.end();
    });
}

// Run the test
testDeployment().catch(console.error);