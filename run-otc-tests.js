/**
 * Run OTC Trading Tests
 * 
 * This script runs all OTC trading tests in sequence.
 */

const { spawn } = require('child_process');

// List of test scripts to run
const tests = [
    'test-enhanced-otc.js',
    'test-next-candle-prediction.js'
];

// Run tests in sequence
async function runTests() {
    console.log('🧪 Running OTC Trading Tests');
    console.log('===========================');
    
    for (const test of tests) {
        console.log(`\n🧪 Running test: ${test}`);
        console.log('----------------------------');
        
        try {
            // Run test script
            await new Promise((resolve, reject) => {
                const process = spawn('node', [test], { stdio: 'inherit' });
                
                process.on('close', code => {
                    if (code === 0) {
                        console.log(`✅ Test ${test} completed successfully`);
                        resolve();
                    } else {
                        console.error(`❌ Test ${test} failed with code ${code}`);
                        reject(new Error(`Test failed with code ${code}`));
                    }
                });
                
                process.on('error', error => {
                    console.error(`❌ Failed to run test ${test}: ${error.message}`);
                    reject(error);
                });
            });
        } catch (error) {
            console.error(`❌ Error running test ${test}: ${error.message}`);
        }
    }
    
    console.log('\n🎉 All tests completed');
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});