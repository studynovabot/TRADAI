#!/usr/bin/env node

/**
 * Quick Gemini API Test
 * ====================
 * 
 * A simple script to quickly test one Gemini API key
 * Perfect for rapid testing and debugging
 */

const { GeminiAPIHealthChecker } = require('./gemini-api-health-checker.js');

async function quickTest() {
    console.log('🚀 Quick Gemini API Test\n');
    
    // Test just the first API key for speed
    const testKey = "AIzaSyBr9_N7QNQfxNI1JIEjd-l0qnyN61IfulE";
    
    const checker = new GeminiAPIHealthChecker({
        timeout: 10000,  // 10 seconds
        waitBetweenCalls: 0  // No wait for single test
    });
    
    try {
        console.log('Testing single API key...\n');
        
        const result = await checker.testApiKey(testKey);
        
        console.log('\n📊 Test Result:');
        console.log('================');
        console.log(`Status: ${result.status}`);
        console.log(`Response Time: ${result.response_time || 'N/A'}`);
        console.log(`Error: ${result.error || 'None'}`);
        console.log(`Sample Output: ${result.output_sample || 'None'}`);
        
        if (result.status === 'working') {
            console.log('\n✅ API key is working! Ready for production use.');
            
            // Show example usage
            console.log('\n💡 Example usage in your code:');
            console.log(`const GEMINI_API_KEY = "${testKey}";`);
            console.log('// Use this key for your AI requests');
            
        } else {
            console.log('\n❌ API key is not working. Check the error above.');
        }
        
    } catch (error) {
        console.error(`💥 Test failed: ${error.message}`);
    }
}

if (require.main === module) {
    quickTest();
}
