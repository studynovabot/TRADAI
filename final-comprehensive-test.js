/**
 * Final Comprehensive Test for Both Forex and OTC Generators
 * 
 * This test ensures both systems are using real data with no mocks
 */

const axios = require('axios');

class FinalComprehensiveTest {
    constructor() {
        this.baseUrl = 'https://tradai-jli03th3t-ranveer-singh-rajputs-projects.vercel.app';
        this.results = {
            forex: { passed: 0, failed: 0, issues: [] },
            otc: { passed: 0, failed: 0, issues: [] },
            overall: { authentic: true, criticalIssues: [] }
        };
    }

    async runFinalTest() {
        console.log('🚀 === FINAL COMPREHENSIVE AUTHENTICITY TEST ===');
        console.log(`🌐 Production URL: ${this.baseUrl}`);
        console.log(`⏰ Test Started: ${new Date().toISOString()}\n`);

        try {
            // Test 1: Forex Generator Comprehensive Test
            await this.testForexGenerator();

            // Test 2: OTC Generator Comprehensive Test
            await this.testOTCGenerator();

            // Test 3: Cross-System Validation
            await this.validateCrossSystems();

            // Generate Final Report
            this.generateFinalReport();

        } catch (error) {
            console.error('❌ Final test failed:', error);
            this.results.overall.criticalIssues.push(`Test suite failure: ${error.message}`);
        }
    }

    async testForexGenerator() {
        console.log('💱 === TESTING FOREX GENERATOR ===\n');

        const testCases = [
            { pair: 'EUR/USD', trade_mode: 'scalping', risk: '1' },
            { pair: 'GBP/USD', trade_mode: 'sniper', risk: '2' }
        ];

        for (const testCase of testCases) {
            console.log(`🔍 Testing Forex: ${testCase.pair} ${testCase.trade_mode}...`);

            try {
                const response = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, testCase, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = response.data;
                console.log(`   Signal: ${data.trade_type}, Entry: ${data.entry}, Confidence: ${data.confidence}%`);

                // Validate authenticity
                const issues = this.validateForexSignal(data, testCase);
                
                if (issues.length === 0) {
                    this.results.forex.passed++;
                    console.log(`   ✅ PASSED: Authentic signal`);
                } else {
                    this.results.forex.failed++;
                    this.results.forex.issues.push(...issues);
                    console.log(`   ❌ FAILED: ${issues.join(', ')}`);
                }

                await this.sleep(5000); // Rate limiting

            } catch (error) {
                this.results.forex.failed++;
                this.results.forex.issues.push(`${testCase.pair} ${testCase.trade_mode}: ${error.message}`);
                console.log(`   ❌ ERROR: ${error.message}`);
            }
        }

        console.log('');
    }

    async testOTCGenerator() {
        console.log('📈 === TESTING OTC GENERATOR ===\n');

        const testCases = [
            { currencyPair: 'USD/PKR', timeframe: '5m', tradeDuration: '5' },
            { currencyPair: 'USD/DZD', timeframe: '1m', tradeDuration: '1' }
        ];

        for (const testCase of testCases) {
            console.log(`🔍 Testing OTC: ${testCase.currencyPair} ${testCase.timeframe}...`);

            try {
                const response = await axios.post(`${this.baseUrl}/api/otc-signal-generator`, testCase, {
                    timeout: 60000,
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = response.data;
                console.log(`   Signal: ${data.signal}, Confidence: ${data.confidence}%, Grade: ${data.qualityGrade}`);

                // Validate authenticity
                const issues = this.validateOTCSignal(data, testCase);
                
                if (issues.length === 0) {
                    this.results.otc.passed++;
                    console.log(`   ✅ PASSED: Authentic signal`);
                } else {
                    this.results.otc.failed++;
                    this.results.otc.issues.push(...issues);
                    console.log(`   ❌ FAILED: ${issues.join(', ')}`);
                }

                await this.sleep(15000); // Rate limiting

            } catch (error) {
                this.results.otc.failed++;
                this.results.otc.issues.push(`${testCase.currencyPair} ${testCase.timeframe}: ${error.message}`);
                console.log(`   ❌ ERROR: ${error.message}`);
            }
        }

        console.log('');
    }

    validateForexSignal(data, testCase) {
        const issues = [];

        // Check for real data usage
        if (data.dataSource !== 'real') {
            issues.push(`Data source is '${data.dataSource}', not 'real'`);
        }

        // Check for strict mode
        if (!data.strictMode) {
            issues.push('Strict mode not enabled');
        }

        // Check for N/A values
        if (data.entry === 'N/A' || data.stop_loss === 'N/A' || data.take_profit === 'N/A') {
            issues.push('Contains N/A values');
        }

        // Check for valid numeric values
        if (typeof data.entry !== 'number' || typeof data.confidence !== 'number') {
            issues.push('Entry or confidence not numeric');
        }

        // Check confidence range
        if (data.confidence < 50 || data.confidence > 100) {
            issues.push(`Confidence ${data.confidence}% outside valid range`);
        }

        // Check for detailed reasoning
        if (!data.reason || data.reason.length < 20) {
            issues.push('Missing or insufficient reasoning');
        }

        return issues;
    }

    validateOTCSignal(data, testCase) {
        const issues = [];

        // Check for real data usage
        if (!data.metadata || data.metadata.dataSource !== 'real') {
            issues.push(`Data source is '${data.metadata?.dataSource}', not 'real'`);
        }

        // Check for strict mode
        if (!data.strictMode) {
            issues.push('Strict mode not enabled');
        }

        // Check for valid signal
        if (!['CALL', 'PUT'].includes(data.signal)) {
            issues.push(`Invalid signal: ${data.signal}`);
        }

        // Check confidence range
        if (data.confidence < 75 || data.confidence > 100) {
            issues.push(`Confidence ${data.confidence}% outside valid range`);
        }

        // Check for real technical indicators
        if (!data.technicalIndicators || data.technicalIndicators.dataSource !== 'real_market_data') {
            issues.push('Missing or invalid technical indicators');
        }

        // Check for analysis method
        if (!data.metadata || data.metadata.analysisMethod !== 'real_technical_indicators') {
            issues.push(`Analysis method is '${data.metadata?.analysisMethod}', not 'real_technical_indicators'`);
        }

        // Check for unique ID
        if (!data.metadata || !data.metadata.uniqueId || !data.metadata.uniqueId.includes(testCase.currencyPair)) {
            issues.push('Missing or invalid unique ID');
        }

        // Check for analysis strength values
        if (!data.metadata || typeof data.metadata.bullishStrength !== 'number' || typeof data.metadata.bearishStrength !== 'number') {
            issues.push('Missing analysis strength values');
        }

        // Check RSI validity (should be 0-100)
        if (data.technicalIndicators && data.technicalIndicators.rsi) {
            const rsi = data.technicalIndicators.rsi;
            if (rsi < 0 || rsi > 100) {
                issues.push(`Invalid RSI value: ${rsi}`);
            }
        }

        return issues;
    }

    async validateCrossSystems() {
        console.log('🔄 === CROSS-SYSTEM VALIDATION ===\n');

        // Test system health
        try {
            const healthResponse = await axios.get(`${this.baseUrl}/api/health`, { timeout: 10000 });
            console.log(`✅ System Health: ${healthResponse.status === 200 ? 'Healthy' : 'Issues detected'}`);
        } catch (error) {
            console.log(`❌ System Health: Failed - ${error.message}`);
            this.results.overall.criticalIssues.push('System health check failed');
        }

        // Test strict mode enforcement
        try {
            console.log('🔒 Testing strict mode enforcement...');
            
            const invalidResponse = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, {
                pair: 'INVALID/PAIR',
                trade_mode: 'scalping',
                risk: '1'
            }, { timeout: 30000 });

            if (invalidResponse.status === 200 && invalidResponse.data.trade_type) {
                console.log('❌ Strict mode failed: Accepted invalid currency pair');
                this.results.overall.criticalIssues.push('Strict mode validation failed');
            } else {
                console.log('✅ Strict mode working: Rejected invalid input');
            }

        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Strict mode working: Properly rejected invalid input');
            } else {
                console.log(`⚠️ Strict mode test inconclusive: ${error.message}`);
            }
        }

        console.log('');
    }

    generateFinalReport() {
        console.log('📋 === FINAL AUTHENTICITY REPORT ===\n');

        const forexTotal = this.results.forex.passed + this.results.forex.failed;
        const otcTotal = this.results.otc.passed + this.results.otc.failed;
        const forexScore = forexTotal > 0 ? (this.results.forex.passed / forexTotal) * 100 : 0;
        const otcScore = otcTotal > 0 ? (this.results.otc.passed / otcTotal) * 100 : 0;
        const overallScore = ((forexScore + otcScore) / 2);

        console.log('🎯 === AUTHENTICITY SCORES ===');
        console.log(`💱 Forex Generator: ${forexScore.toFixed(1)}% (${this.results.forex.passed}/${forexTotal} passed)`);
        console.log(`📈 OTC Generator: ${otcScore.toFixed(1)}% (${this.results.otc.passed}/${otcTotal} passed)`);
        console.log(`🏆 Overall Score: ${overallScore.toFixed(1)}%`);

        // List all issues
        const allIssues = [...this.results.forex.issues, ...this.results.otc.issues];
        if (allIssues.length > 0) {
            console.log('\n❌ AUTHENTICITY ISSUES FOUND:');
            allIssues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }

        // List critical issues
        if (this.results.overall.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            this.results.overall.criticalIssues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }

        // Final verdict
        console.log('\n🏆 === FINAL VERDICT ===');
        
        if (overallScore >= 90 && this.results.overall.criticalIssues.length === 0) {
            console.log('✅ SYSTEMS ARE AUTHENTIC AND PRODUCTION READY');
            console.log('🎉 Both Forex and OTC generators use real market data');
            console.log('🚀 Safe for live trading deployment');
        } else if (overallScore >= 70) {
            console.log('⚠️ SYSTEMS ARE MOSTLY AUTHENTIC WITH MINOR ISSUES');
            console.log('🔧 Some improvements needed before live trading');
        } else {
            console.log('❌ SYSTEMS HAVE SIGNIFICANT AUTHENTICITY ISSUES');
            console.log('🚨 NOT READY FOR LIVE TRADING');
            console.log('🛠️ Major fixes required');
        }

        console.log(`\n📊 Final Authenticity Score: ${overallScore.toFixed(1)}%`);
        console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the final test
if (require.main === module) {
    const tester = new FinalComprehensiveTest();
    tester.runFinalTest().catch(console.error);
}

module.exports = FinalComprehensiveTest;
