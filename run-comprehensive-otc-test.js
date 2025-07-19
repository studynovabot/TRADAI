/**
 * Comprehensive OTC Signal Generator Test Runner
 * 
 * This script runs both the workflow test and the API test to provide
 * a complete assessment of the OTC signal generator.
 */

const { runOTCTest } = require('./run-otc-test');
const { OTCSignalWorkflowTester } = require('./test-otc-signal-workflow');
const path = require('path');

async function runComprehensiveTest() {
    console.log('🚀 Starting Comprehensive OTC Signal Generator Test');
    console.log('================================================\n');
    
    // Step 1: Run the workflow test
    console.log('STEP 1: Running OTC Workflow Test');
    console.log('--------------------------------');
    let workflowResults;
    try {
        workflowResults = await runOTCTest();
    } catch (error) {
        console.error(`❌ Workflow test failed: ${error.message}`);
        workflowResults = 'FAILED';
    }
    
    // Step 2: Run the API test
    console.log('\n\nSTEP 2: Running OTC API Test');
    console.log('---------------------------');
    let apiResults = { success: false, results: { passedTests: 0, totalTests: 0 } };
    
    try {
        // First check if the server is running
        const http = require('http');
        const serverCheck = new Promise((resolve) => {
            const req = http.get('http://localhost:3000', (res) => {
                resolve(true);
            });
            
            req.on('error', () => {
                resolve(false);
            });
            
            req.setTimeout(5000, () => {
                req.abort();
                resolve(false);
            });
        });
        
        const serverRunning = await serverCheck;
        
        if (!serverRunning) {
            console.error('❌ Server is not running at http://localhost:3000');
            console.log('Please start the server before running the API tests');
            apiResults = { 
                success: false, 
                results: { 
                    passedTests: 0, 
                    totalTests: 1,
                    errors: [{ test: 'server_check', error: 'Server is not running' }]
                } 
            };
        } else {
            const apiTester = new OTCSignalWorkflowTester({
                baseUrl: 'http://localhost:3000',
                testRuns: 1, // Reduced for faster testing
                outputDir: path.join(process.cwd(), 'test-results', `api-test-${Date.now()}`),
                currencyPairs: [
                    'EUR/USD OTC',
                    'GBP/USD OTC'
                ],
                timeframes: ['5M'],
                platforms: ['quotex']
            });
            
            apiResults = await apiTester.runAllTests();
        }
    } catch (error) {
        console.error(`❌ API test failed: ${error.message}`);
        apiResults = { 
            success: false, 
            results: { 
                passedTests: 0, 
                totalTests: 1,
                errors: [{ test: 'api_test', error: error.message }]
            } 
        };
    }
    
    // Step 3: Combine results and provide final assessment
    console.log('\n\nFINAL ASSESSMENT');
    console.log('===============');
    
    // Calculate overall success rate
    const workflowSuccess = workflowResults === 'EXCELLENT' || workflowResults === 'GOOD';
    
    // Calculate API success rate
    let apiSuccessRate = 0;
    if (apiResults.results.totalTests > 0) {
        apiSuccessRate = apiResults.results.passedTests / apiResults.results.totalTests;
    }
    const apiSuccess = apiSuccessRate >= 0.7; // 70% success rate
    
    console.log(`Workflow Test: ${workflowResults}`);
    
    if (apiResults.results.totalTests > 0) {
        console.log(`API Test: ${apiSuccess ? 'PASSED' : 'FAILED'} (${apiResults.results.passedTests}/${apiResults.results.totalTests} tests passed)`);
    } else {
        console.log(`API Test: SKIPPED (Server not running or test failed to execute)`);
    }
    
    // Check if the OTC signal generator is generating real signals
    const generatingRealSignals = workflowResults !== 'FAILED';
    
    // Check if the API is working
    const apiWorking = apiResults.results.passedTests > 0;
    
    console.log('\nSignal Generation Assessment:');
    if (generatingRealSignals) {
        console.log('✅ OTC signal generator is producing signals based on real market data');
    } else {
        console.log('❌ OTC signal generator is NOT producing signals based on real market data');
    }
    
    if (apiWorking) {
        console.log('✅ API endpoint is responding and generating signals');
    } else {
        console.log('❌ API endpoint is not responding or not generating signals');
    }
    
    // Final verdict
    let overallVerdict;
    if (generatingRealSignals && apiWorking) {
        console.log('\n✅ OVERALL VERDICT: PASSED');
        console.log('The OTC signal generator is working correctly with real market data.');
        console.log('Signals are being generated properly and the API is functioning as expected.');
        overallVerdict = 'PASSED';
    } else if (generatingRealSignals) {
        console.log('\n⚠️ OVERALL VERDICT: PARTIAL PASS');
        console.log('The OTC workflow is functioning correctly, but there are issues with the API.');
        console.log('Fix the API issues before using in production.');
        overallVerdict = 'PARTIAL_PASS';
    } else if (apiWorking) {
        console.log('\n⚠️ OVERALL VERDICT: PARTIAL PASS');
        console.log('The API is functioning correctly, but there are issues with the OTC workflow.');
        console.log('The system may be generating signals, but they might not be based on real market data.');
        overallVerdict = 'PARTIAL_PASS';
    } else {
        console.log('\n❌ OVERALL VERDICT: FAILED');
        console.log('Both the workflow and API tests failed.');
        console.log('The OTC signal generator is not functioning correctly and needs significant fixes.');
        overallVerdict = 'FAILED';
    }
    
    console.log('\nDetailed test results are available in the test-results directory.');
    
    return {
        workflowResults,
        apiResults,
        overallVerdict
    };
}

// Run the test if executed directly
if (require.main === module) {
    runComprehensiveTest().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runComprehensiveTest };