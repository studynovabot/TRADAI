/**
 * OTC Real Data Test
 * 
 * This script tests the OTC signal generator with real market data
 * collected via browser automation and OCR.
 */

const fs = require('fs-extra');
const path = require('path');
const { OTCSignalGenerator } = require('../src/core/OTCSignalGenerator');
const { ServerlessOTCSignalGenerator } = require('../src/core/ServerlessOTCSignalGenerator');

async function testOTCRealData() {
    console.log('🧪 Testing OTC Signal Generator with Real Market Data');
    console.log('==================================================');
    
    try {
        // Initialize OTC Signal Generator
        console.log('🔧 Initializing OTC Signal Generator...');
        const signalGenerator = new OTCSignalGenerator();
        
        // Test currency pairs
        const pairs = [
            'EUR/USD OTC',
            'GBP/USD OTC'
        ];
        
        // Test timeframes
        const timeframes = ['5M', '15M'];
        
        // Test results
        const results = [];
        
        // Test each combination
        for (const pair of pairs) {
            for (const timeframe of timeframes) {
                console.log(`\n🔍 Testing ${pair} ${timeframe}...`);
                
                try {
                    // Generate signal
                    const signal = await signalGenerator.generateSignal({
                        pair,
                        timeframe
                    });
                    
                    // Check if signal is using real data
                    const isRealData = signal.metadata && signal.metadata.source !== 'simulated';
                    
                    // Log result
                    console.log(`✅ Signal: ${signal.signal}`);
                    console.log(`✅ Confidence: ${signal.confidence}`);
                    console.log(`✅ Data Source: ${signal.metadata ? signal.metadata.source : 'unknown'}`);
                    
                    // Store result
                    results.push({
                        pair,
                        timeframe,
                        signal: signal.signal,
                        confidence: signal.confidence,
                        isRealData,
                        metadata: signal.metadata
                    });
                    
                } catch (error) {
                    console.error(`❌ Error generating signal for ${pair} ${timeframe}:`, error.message);
                    
                    // Store error
                    results.push({
                        pair,
                        timeframe,
                        error: error.message
                    });
                }
            }
        }
        
        // Test Serverless OTC Signal Generator
        console.log('\n🔧 Testing Serverless OTC Signal Generator...');
        const serverlessGenerator = new ServerlessOTCSignalGenerator();
        
        try {
            // Generate signal
            const serverlessSignal = await serverlessGenerator.generateSignal({
                currencyPair: 'EUR/USD OTC',
                timeframe: '5M',
                tradeDuration: '3 minutes',
                platform: 'quotex'
            });
            
            // Log result
            console.log(`✅ Serverless Signal: ${serverlessSignal.signal}`);
            console.log(`✅ Serverless Confidence: ${serverlessSignal.confidence}`);
            
            // Store result
            results.push({
                type: 'serverless',
                pair: 'EUR/USD OTC',
                timeframe: '5M',
                signal: serverlessSignal.signal,
                confidence: serverlessSignal.confidence
            });
            
        } catch (error) {
            console.error('❌ Error generating serverless signal:', error.message);
            
            // Store error
            results.push({
                type: 'serverless',
                error: error.message
            });
        }
        
        // Save results
        const resultsPath = path.join(process.cwd(), 'test-results', `otc-real-data-test-${Date.now()}.json`);
        await fs.ensureDir(path.dirname(resultsPath));
        await fs.writeJson(resultsPath, results, { spaces: 2 });
        
        console.log(`\n✅ Test results saved to: ${resultsPath}`);
        
        // Check if all tests used real data
        const realDataTests = results.filter(r => r.isRealData);
        const totalValidTests = results.filter(r => !r.error && r.pair).length;
        
        console.log(`\n📊 Real Data Usage: ${realDataTests.length}/${totalValidTests} tests`);
        
        if (realDataTests.length === totalValidTests) {
            console.log('🎉 All tests used real market data!');
        } else {
            console.log('⚠️ Some tests did not use real market data.');
            console.log('Please run the setup script: npm run setup:browser-automation');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testOTCRealData().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});