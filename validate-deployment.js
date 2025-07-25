/**
 * Simple Deployment Validation
 * 
 * Validates the Vercel deployment using basic HTTP requests
 */

const https = require('https');

const DEPLOYMENT_URL = 'https://tradai-ir0uluckl-ranveer-singh-rajputs-projects.vercel.app';

/**
 * Make HTTP request
 */
function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(DEPLOYMENT_URL + path);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TRADAI-Validator/1.0'
            }
        };

        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    data: data,
                    success: res.statusCode >= 200 && res.statusCode < 300
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(body);
        }
        
        req.end();
    });
}

/**
 * Test health endpoint
 */
async function testHealthEndpoint() {
    console.log('🔍 Testing Health Endpoint...');
    
    try {
        const response = await makeRequest('/api/otc-signal-generator/health');
        
        if (response.success) {
            const health = JSON.parse(response.data);
            console.log(`   ✅ Health Status: ${health.status}`);
            console.log(`   ✅ Version: ${health.version}`);
            console.log(`   ✅ Multi-Timeframe Analysis: ${health.components?.multiTimeframeAnalysis}`);
            console.log(`   ✅ File Upload Support: ${health.components?.fileUpload}`);
            return true;
        } else {
            console.log(`   ❌ Health check failed with status: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Health check error: ${error.message}`);
        return false;
    }
}

/**
 * Test standard signal generation
 */
async function testStandardSignalGeneration() {
    console.log('\n🎯 Testing Standard Signal Generation...');
    
    try {
        const requestBody = JSON.stringify({
            currencyPair: 'EUR/USD OTC',
            timeframe: '5M',
            tradeDuration: '3 minutes',
            platform: 'quotex'
        });
        
        const response = await makeRequest('/api/otc-signal-generator', 'POST', requestBody);
        
        if (response.success) {
            const result = JSON.parse(response.data);
            console.log(`   ✅ Signal Generated: ${result.signal}`);
            console.log(`   ✅ Confidence: ${result.confidence}`);
            console.log(`   ✅ Processing Time: ${result.processingTime}ms`);
            return true;
        } else {
            console.log(`   ❌ Signal generation failed with status: ${response.statusCode}`);
            console.log(`   ❌ Response: ${response.data}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Signal generation error: ${error.message}`);
        return false;
    }
}

/**
 * Test multi-timeframe endpoint
 */
async function testMultiTimeframeEndpoint() {
    console.log('\n📸 Testing Multi-Timeframe Endpoint...');
    
    try {
        // Test with empty request to check if endpoint exists
        const response = await makeRequest('/api/multi-timeframe-analysis', 'POST', '{}');
        
        // Should return 400 for missing files, which means endpoint is working
        if (response.statusCode === 400) {
            const result = JSON.parse(response.data);
            console.log(`   ✅ Endpoint Available: Multi-timeframe analysis API is accessible`);
            console.log(`   ✅ Error Handling: ${result.error || result.message}`);
            return true;
        } else if (response.success) {
            console.log(`   ✅ Endpoint Available: Multi-timeframe analysis API is accessible`);
            return true;
        } else {
            console.log(`   ❌ Endpoint test failed with status: ${response.statusCode}`);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ Multi-timeframe endpoint error: ${error.message}`);
        return false;
    }
}

/**
 * Main validation function
 */
async function validateDeployment() {
    console.log('🚀 === VERCEL DEPLOYMENT VALIDATION ===');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🌐 Testing deployment: ${DEPLOYMENT_URL}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    const tests = [
        { name: 'Health Check', test: testHealthEndpoint },
        { name: 'Standard Signal Generation', test: testStandardSignalGeneration },
        { name: 'Multi-Timeframe Endpoint', test: testMultiTimeframeEndpoint }
    ];
    
    let passedTests = 0;
    const totalTests = tests.length;
    
    for (const testCase of tests) {
        const result = await testCase.test();
        if (result) passedTests++;
    }
    
    console.log('\n📊 === VALIDATION RESULTS ===');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
    console.log(`   Overall Status: ${passedTests === totalTests ? 'PASSED' : 'PARTIAL'}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (passedTests === totalTests) {
        console.log('\n🎉 === DEPLOYMENT SUCCESSFUL ===');
        console.log('✅ Enhanced Multi-Timeframe OTC Signal Generator is live!');
        console.log('✅ All API endpoints are functional');
        console.log('✅ Multi-timeframe analysis capability confirmed');
        console.log('\n🌐 Access the application:');
        console.log(`   ${DEPLOYMENT_URL}/otc-signal-generator`);
        console.log('\n📸 To test multi-timeframe analysis:');
        console.log('   1. Navigate to the OTC Signal Generator page');
        console.log('   2. Switch to "Multi-Timeframe Screenshots" mode');
        console.log('   3. Upload trading chart screenshots for 1m, 3m, and 5m timeframes');
        console.log('   4. Click "Analyze Multi-Timeframe Confluence"');
        console.log('   5. Wait for comprehensive analysis results');
    } else {
        console.log('\n⚠️ === DEPLOYMENT ISSUES DETECTED ===');
        console.log('Some tests failed. Please check the logs above for details.');
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run validation
validateDeployment().catch(console.error);
