/**
 * OTC Test Summary and Analysis
 * 
 * Provides a clear summary of the OTC model workflow test results
 */

const fs = require('fs-extra');
const path = require('path');

async function generateOTCTestSummary() {
    console.log('📋 OTC MODEL WORKFLOW TEST SUMMARY');
    console.log('=' .repeat(50));
    
    try {
        // Find the latest OTC test results
        const resultsDir = path.join(process.cwd(), 'test-results');
        const files = await fs.readdir(resultsDir);
        const otcTestFiles = files.filter(f => f.startsWith('otc-workflow-test-') && f.endsWith('.json'));
        
        if (otcTestFiles.length === 0) {
            console.log('❌ No OTC test results found. Run the test first with: node run-otc-test.js');
            return;
        }
        
        // Get the latest test results
        const latestTestFile = otcTestFiles.sort().pop();
        const testResults = await fs.readJson(path.join(resultsDir, latestTestFile));
        
        console.log(`📅 Test Date: ${new Date(testResults.timestamp).toLocaleString()}`);
        console.log(`📊 Overall Status: ${testResults.finalVerdict}`);
        console.log('');
        
        // Test Results Overview
        console.log('🎯 TEST RESULTS OVERVIEW');
        console.log('-'.repeat(30));
        console.log(`✅ Tests Passed: ${testResults.passedTests}`);
        console.log(`❌ Tests Failed: ${testResults.failedTests}`);
        console.log(`📊 Total Tests: ${testResults.totalTests}`);
        console.log(`📈 Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`);
        console.log('');
        
        // Real Data Usage Analysis
        console.log('📡 REAL DATA USAGE ANALYSIS');
        console.log('-'.repeat(30));
        
        const dataValidation = testResults.dataSourceValidation;
        
        if (dataValidation.twelveData?.status === 'CONNECTED') {
            console.log('✅ Twelve Data API: Connected and working');
            console.log(`   📊 Latest Price: ${dataValidation.twelveData.samplePrice}`);
            console.log(`   ⏰ Data Freshness: ${dataValidation.twelveData.dataFreshness}`);
        } else {
            console.log('❌ Twelve Data API: Not working');
        }
        
        if (dataValidation.alphaVantage?.status === 'CONNECTED') {
            console.log('✅ Alpha Vantage API: Connected and working');
        } else {
            console.log('⚠️ Alpha Vantage API: Not working (backup only)');
        }
        
        if (dataValidation.historicalData?.status === 'AVAILABLE') {
            console.log(`✅ Historical Data: ${dataValidation.historicalData.dataFiles} files available`);
        } else {
            console.log('❌ Historical Data: Not available');
        }
        
        console.log('');
        
        // Signal Authenticity Analysis
        console.log('🎯 SIGNAL AUTHENTICITY ANALYSIS');
        console.log('-'.repeat(30));
        
        const signalAuth = testResults.signalAuthenticity;
        if (signalAuth) {
            console.log(`📊 Signals Tested: ${signalAuth.totalSignalsTested}`);
            console.log(`✅ Valid Signals: ${signalAuth.validSignals}`);
            console.log(`📈 Authenticity Score: ${signalAuth.averageAuthenticityScore.toFixed(1)}%`);
            console.log(`🎯 Verdict: ${signalAuth.verdict}`);
            
            if (signalAuth.commonIssues && Object.keys(signalAuth.commonIssues).length > 0) {
                console.log('⚠️ Common Issues:');
                Object.entries(signalAuth.commonIssues).forEach(([issue, count]) => {
                    console.log(`   • ${issue} (${count} times)`);
                });
            }
            
            if (signalAuth.commonPositives && Object.keys(signalAuth.commonPositives).length > 0) {
                console.log('✅ Positive Indicators:');
                Object.entries(signalAuth.commonPositives).forEach(([positive, count]) => {
                    console.log(`   • ${positive} (${count} times)`);
                });
            }
        } else {
            console.log('❌ Signal authenticity not tested');
        }
        
        console.log('');
        
        // Synthetic Data Detection
        console.log('🔍 SYNTHETIC DATA DETECTION');
        console.log('-'.repeat(30));
        
        const syntheticScan = dataValidation.syntheticDataScan;
        if (syntheticScan) {
            console.log(`📊 Total Synthetic References: ${syntheticScan.totalReferences}`);
            console.log(`⚠️ Risk Level: ${syntheticScan.riskLevel}`);
            console.log('');
            console.log('Breakdown:');
            console.log(`   • Mock References: ${syntheticScan.mockReferences}`);
            console.log(`   • Simulated Data: ${syntheticScan.simulatedDataReferences}`);
            console.log(`   • Fallback Data: ${syntheticScan.fallbackReferences}`);
            console.log(`   • Test Data: ${syntheticScan.testDataReferences}`);
        }
        
        console.log('');
        
        // Performance Analysis
        console.log('⚡ PERFORMANCE ANALYSIS');
        console.log('-'.repeat(30));
        
        const performance = testResults.performanceMetrics;
        if (performance) {
            console.log(`📊 Success Rate: ${performance.successRate}`);
            console.log(`⏱️ Avg Processing Time: ${performance.averageProcessingTime}`);
            console.log(`🎯 Avg Confidence: ${performance.averageConfidence}`);
        } else {
            console.log('❌ Performance metrics not available');
        }
        
        console.log('');
        
        // Critical Issues
        if (testResults.criticalIssues.length > 0) {
            console.log('❌ CRITICAL ISSUES');
            console.log('-'.repeat(30));
            testResults.criticalIssues.forEach(issue => {
                console.log(`   • ${issue}`);
            });
            console.log('');
        }
        
        // Warnings
        if (testResults.warnings.length > 0) {
            console.log('⚠️ WARNINGS');
            console.log('-'.repeat(30));
            testResults.warnings.forEach(warning => {
                console.log(`   • ${warning}`);
            });
            console.log('');
        }
        
        // Recommendations
        if (testResults.recommendations.length > 0) {
            console.log('💡 RECOMMENDATIONS');
            console.log('-'.repeat(30));
            testResults.recommendations.forEach(rec => {
                console.log(`   • ${rec}`);
            });
            console.log('');
        }
        
        // Final Assessment
        console.log('🎯 FINAL ASSESSMENT');
        console.log('-'.repeat(30));
        
        switch (testResults.finalVerdict) {
            case 'EXCELLENT':
                console.log('🎉 EXCELLENT: OTC model is ready for production trading!');
                console.log('   ✅ All systems working optimally');
                console.log('   ✅ Using real market data');
                console.log('   ✅ Generating authentic signals');
                break;
                
            case 'GOOD':
                console.log('✅ GOOD: OTC model is working well with minor improvements needed');
                console.log('   ✅ Core functionality working');
                console.log('   ✅ Using mostly real data');
                console.log('   ⚠️ Some minor issues to address');
                break;
                
            case 'ACCEPTABLE':
                console.log('⚠️ ACCEPTABLE: OTC model is functional but needs improvements');
                console.log('   ✅ Basic functionality working');
                console.log('   ⚠️ Some data source issues');
                console.log('   ⚠️ Address recommendations before heavy use');
                break;
                
            case 'NEEDS_IMPROVEMENT':
                console.log('🔧 NEEDS IMPROVEMENT: Significant issues need to be fixed');
                console.log('   ⚠️ Multiple system issues');
                console.log('   ⚠️ Data quality concerns');
                console.log('   ❌ Not recommended for trading yet');
                break;
                
            case 'CRITICAL_ISSUES':
                console.log('❌ CRITICAL ISSUES: Do not use for trading!');
                console.log('   ❌ Major system failures');
                console.log('   ❌ Data integrity problems');
                console.log('   ❌ Fix critical issues before any use');
                break;
                
            default:
                console.log('❓ UNKNOWN: Unable to determine status');
        }
        
        console.log('');
        console.log('📄 Detailed results available in:');
        console.log(`   • ${latestTestFile}`);
        
        const summaryFiles = files.filter(f => f.startsWith('otc-workflow-summary-') && f.endsWith('.md'));
        if (summaryFiles.length > 0) {
            const latestSummary = summaryFiles.sort().pop();
            console.log(`   • ${latestSummary}`);
        }
        
        console.log('');
        console.log('🚀 To run the test again: node run-otc-test.js');
        
    } catch (error) {
        console.error('❌ Error reading test results:', error.message);
        console.log('💡 Run the OTC test first: node run-otc-test.js');
    }
}

// Run if called directly
if (require.main === module) {
    generateOTCTestSummary()
        .catch(error => {
            console.error('Error:', error);
            process.exit(1);
        });
}

module.exports = { generateOTCTestSummary };