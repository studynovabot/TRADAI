/**
 * Debug Vercel Response
 */

const https = require('https');

const deploymentUrl = 'https://tradai-indol.vercel.app';

function debugResponse(url) {
    return new Promise((resolve) => {
        console.log(`\n🔍 Debugging response from: ${url}`);
        
        const req = https.get(url, (res) => {
            let data = '';
            
            console.log(`Status: ${res.statusCode}`);
            console.log(`Headers:`, res.headers);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`\nResponse body (first 500 chars):`);
                console.log(data.substring(0, 500));
                console.log(`\nFull response length: ${data.length} characters`);
                resolve();
            });
        });
        
        req.on('error', (error) => {
            console.log(`Error: ${error.message}`);
            resolve();
        });
        
        req.setTimeout(10000, () => {
            req.destroy();
            console.log('Request timeout');
            resolve();
        });
    });
}

async function debugDeployment() {
    console.log('🐛 === DEBUGGING VERCEL DEPLOYMENT ===');
    
    await debugResponse(deploymentUrl);
    await debugResponse(`${deploymentUrl}/api/otc-signal-generator/health`);
}

debugDeployment().catch(console.error);