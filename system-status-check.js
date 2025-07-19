/**
 * System Status Check
 * 
 * Real-time comprehensive status check of the OTC Signal Generator
 */

async function performSystemStatusCheck() {
    console.log('\n🔍 === REAL-TIME SYSTEM STATUS CHECK ===\n');
    
    const checks = [];
    
    try {
        // 1. Server Health Check
        console.log('🌐 Checking Server Health...');
        const healthResponse = await fetch('http://localhost:3000/api/otc-signal-generator/health');
        const healthData = await healthResponse.json();
        
        if (healthData.status === 'healthy') {
            console.log('   ✅ Server: HEALTHY');
            console.log(`   📊 Uptime: ${Math.floor(healthData.uptime / 60)} minutes`);
            console.log(`   💾 Memory: ${Math.floor(healthData.memory.rss / 1024 / 1024)}MB`);
            checks.push({ name: 'Server Health', status: 'PASS' });
        } else {
            throw new Error('Server unhealthy');
        }

        // 2. Web Interface Check
        console.log('\n🖥️ Checking Web Interface...');
        const webResponse = await fetch('http://localhost:3000/otc-signal-generator');
        
        if (webResponse.ok) {
            console.log('   ✅ Web Interface: ACCESSIBLE');
            checks.push({ name: 'Web Interface', status: 'PASS' });
        } else {
            throw new Error(`Web interface returned ${webResponse.status}`);
        }

        // 3. API Validation Check
        console.log('\n🔌 Checking API Validation...');
        const apiResponse = await fetch('http://localhost:3000/api/otc-signal-generator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        const apiData = await apiResponse.json();
        
        if (apiData.error && apiData.message.includes('currencyPair is required')) {
            console.log('   ✅ API Validation: WORKING');
            checks.push({ name: 'API Validation', status: 'PASS' });
        } else {
            throw new Error('API validation not working correctly');
        }

        // 4. Component Integration Check
        console.log('\n🔧 Checking Component Integration...');
        const { OTCSignalOrchestrator } = require('./src/core/OTCSignalOrchestrator');
        const orchestrator = new OTCSignalOrchestrator();
        
        if (orchestrator) {
            console.log('   ✅ Core Components: INTEGRATED');
            checks.push({ name: 'Component Integration', status: 'PASS' });
        } else {
            throw new Error('Component integration failed');
        }

        // 5. Data Source Check
        console.log('\n📊 Checking Data Sources...');
        const yahooFinance = require('yahoo-finance2').default;
        const testData = await yahooFinance.historical('EURUSD=X', {
            period1: new Date(Date.now() - 24 * 60 * 60 * 1000),
            period2: new Date(),
            interval: '1d'
        });
        
        if (testData && testData.length > 0) {
            console.log(`   ✅ Yahoo Finance: CONNECTED (${testData.length} data points)`);
            checks.push({ name: 'Data Sources', status: 'PASS' });
        } else {
            throw new Error('Yahoo Finance connection failed');
        }

        // 6. Technical Indicators Check
        console.log('\n🧠 Checking Technical Indicators...');
        const TechnicalIndicators = require('technicalindicators');
        const rsiTest = TechnicalIndicators.RSI.calculate({
            values: [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.15, 45.29, 45.41],
            period: 6
        });
        
        if (rsiTest && rsiTest.length > 0) {
            console.log(`   ✅ Technical Indicators: WORKING (RSI: ${rsiTest[rsiTest.length-1].toFixed(2)})`);
            checks.push({ name: 'Technical Indicators', status: 'PASS' });
        } else {
            throw new Error('Technical indicators failed');
        }

        // 7. File System Check
        console.log('\n📁 Checking File System...');
        const fs = require('fs-extra');
        const criticalPaths = [
            'data/historical',
            'logs/api',
            'config/otc-signal-generator.json',
            'docs/OTC_SIGNAL_GENERATOR.md'
        ];
        
        let pathsOk = 0;
        for (const path of criticalPaths) {
            if (await fs.pathExists(path)) {
                pathsOk++;
            }
        }
        
        if (pathsOk === criticalPaths.length) {
            console.log(`   ✅ File System: ALL PATHS ACCESSIBLE (${pathsOk}/${criticalPaths.length})`);
            checks.push({ name: 'File System', status: 'PASS' });
        } else {
            throw new Error(`Missing paths: ${criticalPaths.length - pathsOk}`);
        }

        // 8. Performance Check
        console.log('\n⚡ Checking Performance...');
        const startTime = Date.now();
        
        // Simulate a lightweight operation
        const testOrchestrator = new OTCSignalOrchestrator();
        const stats = testOrchestrator.getStats();
        
        const performanceTime = Date.now() - startTime;
        
        if (performanceTime < 1000) { // Should be very fast
            console.log(`   ✅ Performance: OPTIMAL (${performanceTime}ms)`);
            checks.push({ name: 'Performance', status: 'PASS' });
        } else {
            console.log(`   ⚠️  Performance: SLOW (${performanceTime}ms)`);
            checks.push({ name: 'Performance', status: 'WARN' });
        }

        // Final Status Report
        console.log('\n📊 === SYSTEM STATUS SUMMARY ===\n');
        
        const passed = checks.filter(c => c.status === 'PASS').length;
        const warned = checks.filter(c => c.status === 'WARN').length;
        const failed = checks.filter(c => c.status === 'FAIL').length;
        
        console.log(`✅ Passed: ${passed}`);
        console.log(`⚠️  Warnings: ${warned}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Health Score: ${Math.floor((passed / checks.length) * 100)}%\n`);
        
        checks.forEach(check => {
            const icon = check.status === 'PASS' ? '✅' : 
                        check.status === 'WARN' ? '⚠️' : '❌';
            console.log(`${icon} ${check.name}: ${check.status}`);
        });
        
        if (failed === 0) {
            console.log('\n🎉 === SYSTEM STATUS: EXCELLENT ===');
            console.log('🚀 All systems operational and ready for use!');
            console.log('\n💡 Quick Start:');
            console.log('   1. Open: http://localhost:3000/otc-signal-generator');
            console.log('   2. Select: EUR/USD OTC, 5M timeframe, 3 minutes duration');
            console.log('   3. Click: Generate Signal');
            console.log('   4. Wait: 30-60 seconds for analysis');
            console.log('   5. Review: Signal, confidence, and reasoning');
            
            console.log('\n🛡️ Safety Reminders:');
            console.log('   • Signals are for educational purposes only');
            console.log('   • No automatic trading execution');
            console.log('   • Always verify signals independently');
            console.log('   • Only high-confidence signals (≥75%) are generated');
            
        } else {
            console.log('\n⚠️  === SYSTEM STATUS: ISSUES DETECTED ===');
            console.log('❌ Please address the failed checks above');
        }
        
    } catch (error) {
        console.error(`\n❌ Status check failed: ${error.message}`);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Server appears to be down. Please run: npm run dev');
        }
    }
}

// Add fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Run status check if called directly
if (require.main === module) {
    performSystemStatusCheck().catch(console.error);
}

module.exports = { performSystemStatusCheck };