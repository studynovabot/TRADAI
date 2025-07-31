/**
 * Quick API Test Script
 * Tests the TRADAI API directly to diagnose issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'https://tradai-8bnxxvuls-ranveer-singh-rajputs-projects.vercel.app';

// Test 1: Health Check
function testHealthCheck() {
    return new Promise((resolve, reject) => {
        console.log('🏥 Testing health endpoint...');
        
        const options = {
            hostname: 'tradai-8bnxxvuls-ranveer-singh-rajputs-projects.vercel.app',
            port: 443,
            path: '/api/health',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'TRADAI-Test-Script/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            
            console.log(`Status: ${res.statusCode}`);
            console.log(`Headers:`, res.headers);
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('✅ Health check response:', jsonData);
                    resolve(jsonData);
                } catch (error) {
                    console.log('Raw response:', data);
                    reject(new Error(`Invalid JSON response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Health check failed:', error.message);
            reject(error);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Test 2: Simple fetch test (if available)
async function testWithFetch() {
    try {
        console.log('\n🌐 Testing with fetch API...');
        
        // Try to import node-fetch
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const data = await response.json();
        
        console.log('✅ Fetch test successful:', data);
        return data;
    } catch (error) {
        console.log('❌ Fetch test failed:', error.message);
        return null;
    }
}

// Test 3: CORS headers check
function testCORSHeaders() {
    return new Promise((resolve, reject) => {
        console.log('\n🔧 Testing CORS headers...');
        
        const options = {
            hostname: 'tradai-8bnxxvuls-ranveer-singh-rajputs-projects.vercel.app',
            port: 443,
            path: '/api/health',
            method: 'OPTIONS',
            headers: {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`CORS Status: ${res.statusCode}`);
            console.log('CORS Headers:', res.headers);
            
            const corsHeaders = {
                'access-control-allow-origin': res.headers['access-control-allow-origin'],
                'access-control-allow-methods': res.headers['access-control-allow-methods'],
                'access-control-allow-headers': res.headers['access-control-allow-headers']
            };
            
            console.log('Relevant CORS headers:', corsHeaders);
            resolve(corsHeaders);
        });

        req.on('error', (error) => {
            console.error('❌ CORS test failed:', error.message);
            reject(error);
        });

        req.end();
    });
}

// Test 4: Image upload simulation
async function testImageUpload() {
    try {
        console.log('\n📸 Testing image upload simulation...');
        
        // Check if test image exists
        const testImagePath = 'C:\\Users\\thaku\\Pictures\\trading ss\\5m\\usdinr.png';
        
        if (!fs.existsSync(testImagePath)) {
            console.log('❌ Test image not found:', testImagePath);
            console.log('Available files in directory:');
            try {
                const dir = path.dirname(testImagePath);
                const files = fs.readdirSync(dir);
                files.forEach(file => console.log(`  - ${file}`));
            } catch (dirError) {
                console.log('❌ Cannot read directory:', dirError.message);
            }
            return;
        }
        
        const imageStats = fs.statSync(testImagePath);
        console.log(`✅ Test image found: ${testImagePath}`);
        console.log(`   Size: ${Math.round(imageStats.size / 1024)} KB`);
        console.log(`   Modified: ${imageStats.mtime}`);
        
        // We won't actually upload in this test, just verify the file is accessible
        console.log('✅ Image upload test preparation successful');
        
    } catch (error) {
        console.error('❌ Image upload test failed:', error.message);
    }
}

// Main test function
async function runDiagnostics() {
    console.log('🚀 TRADAI API Diagnostics Starting...');
    console.log('='.repeat(50));
    
    try {
        // Test 1: Health Check
        await testHealthCheck();
        
        // Test 2: Fetch API
        await testWithFetch();
        
        // Test 3: CORS
        await testCORSHeaders();
        
        // Test 4: Image Upload Prep
        await testImageUpload();
        
        console.log('\n' + '='.repeat(50));
        console.log('🎉 Diagnostics completed!');
        console.log('\nIf health check passed but browser fails:');
        console.log('1. Check browser console for detailed errors');
        console.log('2. Try disabling browser extensions');
        console.log('3. Check if antivirus/firewall is blocking requests');
        console.log('4. Try a different browser');
        console.log('5. Check network proxy settings');
        
    } catch (error) {
        console.error('\n❌ Diagnostics failed:', error.message);
        console.log('\nTroubleshooting steps:');
        console.log('1. Check internet connection');
        console.log('2. Verify API URL is correct');
        console.log('3. Check if API server is running');
        console.log('4. Try again in a few minutes');
    }
}

// Run diagnostics
runDiagnostics();
