/**
 * OTC Test Runner
 * 
 * Simple script to run the comprehensive OTC workflow test
 */

const { OTCWorkflowTester } = require('./test-otc-workflow-comprehensive');

async function runOTCTest() {
    console.log('🚀 Starting OTC Model Workflow Test...');
    console.log('This test will verify:');
    console.log('✓ Real market data usage (not synthetic/mock)');
    console.log('✓ Authentic signal generation');
    console.log('✓ Complete workflow integrity');
    console.log('✓ Performance and quality metrics');
    console.log('');
    
    try {
        const tester = new OTCWorkflowTester();
        const results = await tester.runComprehensiveTest();
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 OTC WORKFLOW TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log(`📊 Overall Status: ${results.finalVerdict}`);
        console.log(`📊 Tests Passed: ${results.passedTests}/${results.totalTests} (${((results.passedTests/results.totalTests)*100).toFixed(1)}%)`);
        
        if (results.criticalIssues.length > 0) {
            console.log('\n❌ CRITICAL ISSUES:');
            results.criticalIssues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (results.warnings.length > 0) {
            console.log('\n⚠️ WARNINGS:');
            results.warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        if (results.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            results.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }
        
        // Data Source Summary
        console.log('\n📡 DATA SOURCES:');
        if (results.dataSourceValidation.twelveData) {
            console.log(`   • Twelve Data API: ${results.dataSourceValidation.twelveData.status}`);
        }
        if (results.dataSourceValidation.alphaVantage) {
            console.log(`   • Alpha Vantage API: ${results.dataSourceValidation.alphaVantage.status}`);
        }
        if (results.dataSourceValidation.historicalData) {
            console.log(`   • Historical Data: ${results.dataSourceValidation.historicalData.status}`);
        }
        
        // Signal Authenticity Summary
        if (results.signalAuthenticity) {
            console.log('\n🎯 SIGNAL AUTHENTICITY:');
            console.log(`   • Average Score: ${results.signalAuthenticity.averageAuthenticityScore?.toFixed(1)}%`);
            console.log(`   • Verdict: ${results.signalAuthenticity.verdict}`);
            console.log(`   • Signals Tested: ${results.signalAuthenticity.validSignals}/${results.signalAuthenticity.totalSignalsTested}`);
        }
        
        // Performance Summary
        if (results.performanceMetrics) {
            console.log('\n⚡ PERFORMANCE:');
            console.log(`   • Success Rate: ${results.performanceMetrics.successRate}`);
            console.log(`   • Avg Processing Time: ${results.performanceMetrics.averageProcessingTime}`);
            console.log(`   • Avg Confidence: ${results.performanceMetrics.averageConfidence}`);
        }
        
        console.log('\n' + '='.repeat(60));
        
        // Final recommendation
        switch (results.finalVerdict) {
            case 'EXCELLENT':
                console.log('🎉 EXCELLENT! OTC workflow is ready for production trading.');
                break;
            case 'GOOD':
                console.log('✅ GOOD! OTC workflow is working well with minor improvements needed.');
                break;
            case 'ACCEPTABLE':
                console.log('⚠️ ACCEPTABLE! Address recommendations before heavy trading use.');
                break;
            case 'NEEDS_IMPROVEMENT':
                console.log('🔧 NEEDS IMPROVEMENT! Significant issues need to be fixed.');
                break;
            case 'CRITICAL_ISSUES':
                console.log('❌ CRITICAL ISSUES! Do not use for trading until fixed.');
                break;
            default:
                console.log('❓ UNKNOWN STATUS! Review detailed results.');
        }
        
        console.log('\n📄 Detailed results saved in test-results/ directory');
        
        return results.finalVerdict !== 'CRITICAL_ISSUES';
        
    } catch (error) {
        console.error('\n❌ Test execution failed:', error.message);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
if (require.main === module) {
    runOTCTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { runOTCTest };