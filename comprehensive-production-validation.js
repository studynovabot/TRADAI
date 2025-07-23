/**
 * TRADAI System v2.0 Comprehensive Production Validation
 * 
 * This test suite validates that both Forex and OTC signal generators
 * meet all production requirements with real market data analysis
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class ComprehensiveProductionValidator {
    constructor() {
        this.baseUrl = 'https://tradai-5msqbiept-ranveer-singh-rajputs-projects.vercel.app';
        this.results = {
            timestamp: new Date().toISOString(),
            forex: {
                realDataValidation: { passed: false, tests: [] },
                technicalAnalysis: { passed: false, tests: [] },
                strictModeCompliance: { passed: false, tests: [] },
                performanceMetrics: { passed: false, tests: [] }
            },
            otc: {
                realDataValidation: { passed: false, tests: [] },
                signalGeneration: { passed: false, tests: [] },
                strictModeCompliance: { passed: false, tests: [] },
                performanceMetrics: { passed: false, tests: [] }
            },
            overall: {
                productionReady: false,
                criticalIssues: [],
                recommendations: []
            }
        };
    }

    async runComprehensiveValidation() {
        console.log('🚀 === TRADAI COMPREHENSIVE PRODUCTION VALIDATION ===');
        console.log(`🌐 Production URL: ${this.baseUrl}`);
        console.log(`⏰ Validation Started: ${new Date().toISOString()}\n`);

        try {
            // Phase 1: Forex Signal Generator Validation
            await this.validateForexSignalGenerator();

            // Phase 2: OTC Signal Generator Validation
            await this.validateOTCSignalGenerator();

            // Phase 3: Cross-System Validation
            await this.validateCrossSystemRequirements();

            // Phase 4: Generate Final Assessment
            this.generateFinalAssessment();

            // Phase 5: Save Results
            await this.saveValidationResults();

        } catch (error) {
            console.error('❌ Comprehensive validation failed:', error);
            this.results.overall.criticalIssues.push(`Validation suite failure: ${error.message}`);
        }
    }

    /**
     * Phase 1: Validate Forex Signal Generator
     */
    async validateForexSignalGenerator() {
        console.log('💱 === PHASE 1: FOREX SIGNAL GENERATOR VALIDATION ===\n');

        // Test 1: Real Data Validation
        await this.testForexRealDataUsage();

        // Test 2: Technical Analysis Validation
        await this.testForexTechnicalAnalysis();

        // Test 3: Strict Mode Compliance
        await this.testForexStrictModeCompliance();

        // Test 4: Performance Metrics
        await this.testForexPerformanceMetrics();
    }

    async testForexRealDataUsage() {
        console.log('📊 Testing Forex Real Data Usage...');

        const testCases = [
            { pair: 'EUR/USD', trade_mode: 'scalping', risk: '1' },
            { pair: 'GBP/USD', trade_mode: 'sniper', risk: '2' },
            { pair: 'USD/JPY', trade_mode: 'swing', risk: '1' }
        ];

        let passedTests = 0;
        const testResults = [];

        for (const testCase of testCases) {
            try {
                const startTime = Date.now();
                const response = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, testCase, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });
                const responseTime = Date.now() - startTime;

                const data = response.data;
                
                // Validate real data usage
                const hasRealData = (
                    data.dataSource === 'real' &&
                    data.strictMode === true &&
                    data.trade_type && data.trade_type !== 'N/A' &&
                    data.entry && data.entry !== 'N/A' && typeof data.entry === 'number' &&
                    data.confidence && data.confidence !== 'N/A' && typeof data.confidence === 'number'
                );

                const result = {
                    testCase,
                    hasRealData,
                    responseTime,
                    data: {
                        trade_type: data.trade_type,
                        entry: data.entry,
                        confidence: data.confidence,
                        dataSource: data.dataSource,
                        strictMode: data.strictMode
                    },
                    passed: hasRealData && responseTime < 30000
                };

                testResults.push(result);

                if (result.passed) {
                    passedTests++;
                    console.log(`✅ ${testCase.pair} ${testCase.trade_mode}: Real data confirmed - ${data.trade_type} @ ${data.entry}, ${data.confidence}%`);
                } else {
                    console.log(`❌ ${testCase.pair} ${testCase.trade_mode}: Real data validation failed`);
                }

                await this.sleep(3000); // Rate limiting

            } catch (error) {
                const result = {
                    testCase,
                    error: error.message,
                    passed: false
                };
                testResults.push(result);
                console.log(`❌ ${testCase.pair} ${testCase.trade_mode}: Error - ${error.message}`);
            }
        }

        this.results.forex.realDataValidation = {
            passed: passedTests === testCases.length,
            tests: testResults,
            passRate: `${passedTests}/${testCases.length}`,
            summary: passedTests === testCases.length ? 
                'All forex signals use real market data' : 
                'Some forex signals may use fallback data'
        };

        console.log(`📈 Forex Real Data Validation: ${this.results.forex.realDataValidation.passed ? '✅ PASSED' : '❌ FAILED'} (${this.results.forex.realDataValidation.passRate})\n`);
    }

    async testForexTechnicalAnalysis() {
        console.log('🔍 Testing Forex Technical Analysis Quality...');

        const testCase = { pair: 'EUR/USD', trade_mode: 'scalping', risk: '1' };
        
        try {
            const response = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, testCase, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            const data = response.data;
            
            // Validate technical analysis quality
            const hasQualityAnalysis = (
                data.reason && data.reason.length > 50 && // Detailed reasoning
                data.rr_ratio && data.rr_ratio > 0 && // Valid risk-reward ratio
                data.stop_loss && data.take_profit && // Proper risk management
                Math.abs(data.stop_loss - data.entry) > 0 && // Valid stop loss
                Math.abs(data.take_profit - data.entry) > 0 // Valid take profit
            );

            const result = {
                testCase,
                hasQualityAnalysis,
                data: {
                    reason: data.reason?.substring(0, 100) + '...',
                    rr_ratio: data.rr_ratio,
                    stop_loss: data.stop_loss,
                    take_profit: data.take_profit,
                    entry: data.entry
                },
                passed: hasQualityAnalysis
            };

            this.results.forex.technicalAnalysis = {
                passed: hasQualityAnalysis,
                tests: [result],
                summary: hasQualityAnalysis ? 
                    'Forex signals include comprehensive technical analysis' : 
                    'Forex technical analysis quality needs improvement'
            };

            console.log(`🔍 Technical Analysis: ${hasQualityAnalysis ? '✅ PASSED' : '❌ FAILED'}`);
            if (hasQualityAnalysis) {
                console.log(`   Reason: ${data.reason?.substring(0, 100)}...`);
                console.log(`   R:R Ratio: ${data.rr_ratio}, SL: ${data.stop_loss}, TP: ${data.take_profit}`);
            }

        } catch (error) {
            this.results.forex.technicalAnalysis = {
                passed: false,
                tests: [{ error: error.message, passed: false }],
                summary: 'Technical analysis test failed due to error'
            };
            console.log(`❌ Technical Analysis Test Failed: ${error.message}`);
        }

        console.log('');
    }

    async testForexStrictModeCompliance() {
        console.log('🔒 Testing Forex Strict Mode Compliance...');

        // Test with invalid parameters to ensure strict mode rejects appropriately
        const invalidTestCases = [
            { pair: 'INVALID/PAIR', trade_mode: 'scalping', risk: '1' },
            { pair: 'EUR/USD', trade_mode: 'invalid_mode', risk: '1' }
        ];

        let strictModeWorking = true;
        const testResults = [];

        for (const testCase of invalidTestCases) {
            try {
                const response = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, testCase, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });

                // If we get a successful response with invalid data, strict mode is not working
                if (response.status === 200 && response.data.success !== false) {
                    strictModeWorking = false;
                    testResults.push({
                        testCase,
                        issue: 'Accepted invalid parameters',
                        passed: false
                    });
                } else {
                    testResults.push({
                        testCase,
                        result: 'Properly rejected invalid input',
                        passed: true
                    });
                }

            } catch (error) {
                // Errors are expected for invalid inputs in strict mode
                testResults.push({
                    testCase,
                    result: 'Properly rejected with error',
                    passed: true
                });
            }

            await this.sleep(2000);
        }

        this.results.forex.strictModeCompliance = {
            passed: strictModeWorking,
            tests: testResults,
            summary: strictModeWorking ? 
                'Forex strict mode properly validates inputs' : 
                'Forex strict mode validation needs improvement'
        };

        console.log(`🔒 Strict Mode Compliance: ${strictModeWorking ? '✅ PASSED' : '❌ FAILED'}\n`);
    }

    async testForexPerformanceMetrics() {
        console.log('⚡ Testing Forex Performance Metrics...');

        const testCase = { pair: 'EUR/USD', trade_mode: 'scalping', risk: '1' };
        const responseTimes = [];

        // Run 3 performance tests
        for (let i = 0; i < 3; i++) {
            try {
                const startTime = Date.now();
                await axios.post(`${this.baseUrl}/api/forex-signal-generator`, testCase, {
                    timeout: 30000,
                    headers: { 'Content-Type': 'application/json' }
                });
                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);

                await this.sleep(5000); // Wait between tests

            } catch (error) {
                console.log(`⚡ Performance test ${i + 1} failed: ${error.message}`);
            }
        }

        const avgResponseTime = responseTimes.length > 0 ? 
            Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) : 0;
        const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
        const performancePassed = avgResponseTime < 15000 && maxResponseTime < 30000;

        this.results.forex.performanceMetrics = {
            passed: performancePassed,
            tests: [{
                avgResponseTime,
                maxResponseTime,
                responseTimes,
                passed: performancePassed
            }],
            summary: performancePassed ? 
                'Forex performance meets production requirements' : 
                'Forex performance needs optimization'
        };

        console.log(`⚡ Performance: ${performancePassed ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`   Average: ${avgResponseTime}ms, Max: ${maxResponseTime}ms\n`);
    }

    /**
     * Phase 2: Validate OTC Signal Generator
     */
    async validateOTCSignalGenerator() {
        console.log('📈 === PHASE 2: OTC SIGNAL GENERATOR VALIDATION ===\n');

        // Test 1: Real Data Validation
        await this.testOTCRealDataUsage();

        // Test 2: Signal Generation Quality
        await this.testOTCSignalGeneration();

        // Test 3: Strict Mode Compliance
        await this.testOTCStrictModeCompliance();

        // Test 4: Performance Metrics
        await this.testOTCPerformanceMetrics();
    }

    async testOTCRealDataUsage() {
        console.log('📊 Testing OTC Real Data Usage...');

        const testCases = [
            { currencyPair: 'USD/PKR', timeframe: '1m', tradeDuration: '1' },
            { currencyPair: 'USD/DZD', timeframe: '5m', tradeDuration: '5' }
        ];

        let passedTests = 0;
        const testResults = [];

        for (const testCase of testCases) {
            try {
                const startTime = Date.now();
                const response = await axios.post(`${this.baseUrl}/api/otc-signal-generator`, testCase, {
                    timeout: 60000,
                    headers: { 'Content-Type': 'application/json' }
                });
                const responseTime = Date.now() - startTime;

                const data = response.data;
                
                // Validate real data usage
                const hasRealData = (
                    data.success === true &&
                    data.metadata && data.metadata.dataSource === 'real' &&
                    data.signal && data.signal !== 'NO_SIGNAL' &&
                    data.confidence && data.confidence >= 75 &&
                    data.qualityGrade && ['A+', 'A', 'B+', 'B'].includes(data.qualityGrade)
                );

                const result = {
                    testCase,
                    hasRealData,
                    responseTime,
                    data: {
                        signal: data.signal,
                        confidence: data.confidence,
                        qualityGrade: data.qualityGrade,
                        dataSource: data.metadata?.dataSource,
                        strictMode: data.strictMode
                    },
                    passed: hasRealData && responseTime < 60000
                };

                testResults.push(result);

                if (result.passed) {
                    passedTests++;
                    console.log(`✅ ${testCase.currencyPair} ${testCase.timeframe}: Real data confirmed - ${data.signal}, ${data.confidence}%, Grade: ${data.qualityGrade}`);
                } else {
                    console.log(`❌ ${testCase.currencyPair} ${testCase.timeframe}: Real data validation failed`);
                }

                await this.sleep(15000); // Longer wait for OTC

            } catch (error) {
                const result = {
                    testCase,
                    error: error.message,
                    passed: false
                };
                testResults.push(result);
                console.log(`❌ ${testCase.currencyPair} ${testCase.timeframe}: Error - ${error.message}`);
            }
        }

        this.results.otc.realDataValidation = {
            passed: passedTests > 0, // At least one test should pass
            tests: testResults,
            passRate: `${passedTests}/${testCases.length}`,
            summary: passedTests > 0 ? 
                'OTC signals use real market data analysis' : 
                'OTC signal generation needs improvement'
        };

        console.log(`📈 OTC Real Data Validation: ${this.results.otc.realDataValidation.passed ? '✅ PASSED' : '❌ FAILED'} (${this.results.otc.realDataValidation.passRate})\n`);
    }

    async testOTCSignalGeneration() {
        console.log('🎯 Testing OTC Signal Generation Quality...');

        const testCase = { currencyPair: 'USD/PKR', timeframe: '5m', tradeDuration: '5' };
        
        try {
            const response = await axios.post(`${this.baseUrl}/api/otc-signal-generator`, testCase, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            });

            const data = response.data;
            
            // Validate signal generation quality
            const hasQualitySignal = (
                data.success === true &&
                ['CALL', 'PUT'].includes(data.signal) &&
                data.confidence >= 75 &&
                data.analysis && data.analysis.length > 30 && // Detailed analysis
                data.technicalIndicators && // Technical indicators present
                data.qualityGrade && ['A+', 'A', 'B+', 'B'].includes(data.qualityGrade)
            );

            const result = {
                testCase,
                hasQualitySignal,
                data: {
                    signal: data.signal,
                    confidence: data.confidence,
                    analysis: data.analysis?.substring(0, 100) + '...',
                    qualityGrade: data.qualityGrade,
                    technicalIndicators: data.technicalIndicators
                },
                passed: hasQualitySignal
            };

            this.results.otc.signalGeneration = {
                passed: hasQualitySignal,
                tests: [result],
                summary: hasQualitySignal ? 
                    'OTC signals include comprehensive analysis' : 
                    'OTC signal generation quality needs improvement'
            };

            console.log(`🎯 Signal Generation: ${hasQualitySignal ? '✅ PASSED' : '❌ FAILED'}`);
            if (hasQualitySignal) {
                console.log(`   Signal: ${data.signal}, Confidence: ${data.confidence}%, Grade: ${data.qualityGrade}`);
                console.log(`   Analysis: ${data.analysis?.substring(0, 100)}...`);
            }

        } catch (error) {
            this.results.otc.signalGeneration = {
                passed: false,
                tests: [{ error: error.message, passed: false }],
                summary: 'OTC signal generation test failed due to error'
            };
            console.log(`❌ Signal Generation Test Failed: ${error.message}`);
        }

        console.log('');
    }

    async testOTCStrictModeCompliance() {
        console.log('🔒 Testing OTC Strict Mode Compliance...');

        // Test with missing required parameters
        const invalidTestCase = { currencyPair: 'USD/PKR' }; // Missing timeframe and tradeDuration

        try {
            const response = await axios.post(`${this.baseUrl}/api/otc-signal-generator`, invalidTestCase, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            // Should reject invalid input
            const strictModeWorking = response.status !== 200 || response.data.success === false;

            this.results.otc.strictModeCompliance = {
                passed: strictModeWorking,
                tests: [{
                    testCase: invalidTestCase,
                    result: strictModeWorking ? 'Properly rejected invalid input' : 'Accepted invalid input',
                    passed: strictModeWorking
                }],
                summary: strictModeWorking ? 
                    'OTC strict mode properly validates inputs' : 
                    'OTC strict mode validation needs improvement'
            };

        } catch (error) {
            // Error is expected for invalid input
            this.results.otc.strictModeCompliance = {
                passed: true,
                tests: [{
                    testCase: invalidTestCase,
                    result: 'Properly rejected with error',
                    passed: true
                }],
                summary: 'OTC strict mode properly validates inputs'
            };
        }

        console.log(`🔒 OTC Strict Mode: ${this.results.otc.strictModeCompliance.passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    }

    async testOTCPerformanceMetrics() {
        console.log('⚡ Testing OTC Performance Metrics...');

        const testCase = { currencyPair: 'USD/PKR', timeframe: '1m', tradeDuration: '1' };
        
        try {
            const startTime = Date.now();
            await axios.post(`${this.baseUrl}/api/otc-signal-generator`, testCase, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            });
            const responseTime = Date.now() - startTime;

            const performancePassed = responseTime < 60000;

            this.results.otc.performanceMetrics = {
                passed: performancePassed,
                tests: [{
                    responseTime,
                    passed: performancePassed
                }],
                summary: performancePassed ? 
                    'OTC performance meets production requirements' : 
                    'OTC performance needs optimization'
            };

            console.log(`⚡ OTC Performance: ${performancePassed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log(`   Response Time: ${responseTime}ms\n`);

        } catch (error) {
            this.results.otc.performanceMetrics = {
                passed: false,
                tests: [{ error: error.message, passed: false }],
                summary: 'OTC performance test failed due to error'
            };
            console.log(`❌ OTC Performance Test Failed: ${error.message}\n`);
        }
    }

    /**
     * Phase 3: Cross-System Validation
     */
    async validateCrossSystemRequirements() {
        console.log('🔄 === PHASE 3: CROSS-SYSTEM VALIDATION ===\n');

        // Test system health endpoints
        await this.testSystemHealth();

        // Test API key configuration
        await this.testAPIKeyConfiguration();
    }

    async testSystemHealth() {
        console.log('🏥 Testing System Health...');

        const healthEndpoints = [
            '/api/health',
            '/api/vercel-health',
            '/api/system-health'
        ];

        let healthyEndpoints = 0;

        for (const endpoint of healthEndpoints) {
            try {
                const response = await axios.get(`${this.baseUrl}${endpoint}`, { timeout: 10000 });
                if (response.status === 200) {
                    healthyEndpoints++;
                    console.log(`✅ ${endpoint}: Healthy`);
                } else {
                    console.log(`⚠️ ${endpoint}: Status ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${endpoint}: ${error.message}`);
            }
        }

        console.log(`🏥 System Health: ${healthyEndpoints}/${healthEndpoints.length} endpoints healthy\n`);
    }

    async testAPIKeyConfiguration() {
        console.log('🔑 Testing API Key Configuration...');

        // This is inferred from successful data fetching in previous tests
        const forexDataWorking = this.results.forex.realDataValidation.passed;
        const otcDataWorking = this.results.otc.realDataValidation.passed;

        console.log(`🔑 TwelveData API: ${forexDataWorking ? '✅ Working' : '❌ Issues detected'}`);
        console.log(`🔑 Market Data APIs: ${otcDataWorking ? '✅ Working' : '❌ Issues detected'}\n`);
    }

    /**
     * Phase 4: Generate Final Assessment
     */
    generateFinalAssessment() {
        console.log('📋 === PHASE 4: FINAL ASSESSMENT ===\n');

        const forexPassed = (
            this.results.forex.realDataValidation.passed &&
            this.results.forex.technicalAnalysis.passed &&
            this.results.forex.strictModeCompliance.passed &&
            this.results.forex.performanceMetrics.passed
        );

        const otcPassed = (
            this.results.otc.realDataValidation.passed &&
            this.results.otc.signalGeneration.passed &&
            this.results.otc.strictModeCompliance.passed &&
            this.results.otc.performanceMetrics.passed
        );

        this.results.overall.productionReady = forexPassed && otcPassed;

        // Generate recommendations
        if (!forexPassed) {
            this.results.overall.criticalIssues.push('Forex signal generator not meeting production standards');
        }
        if (!otcPassed) {
            this.results.overall.criticalIssues.push('OTC signal generator not meeting production standards');
        }

        // Success criteria assessment
        console.log('🎯 === SUCCESS CRITERIA ASSESSMENT ===');
        console.log(`✅ Forex Real Data Usage: ${this.results.forex.realDataValidation.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Forex Technical Analysis: ${this.results.forex.technicalAnalysis.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ OTC Real Data Usage: ${this.results.otc.realDataValidation.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ OTC Signal Generation: ${this.results.otc.signalGeneration.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Strict Mode Compliance: ${this.results.forex.strictModeCompliance.passed && this.results.otc.strictModeCompliance.passed ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Performance Requirements: ${this.results.forex.performanceMetrics.passed && this.results.otc.performanceMetrics.passed ? 'PASSED' : 'FAILED'}`);

        console.log(`\n🏆 OVERALL PRODUCTION READINESS: ${this.results.overall.productionReady ? '✅ READY' : '❌ NOT READY'}`);

        if (this.results.overall.productionReady) {
            console.log('\n🎉 CONGRATULATIONS! TRADAI System v2.0 is PRODUCTION READY!');
            console.log('✅ Both Forex and OTC signal generators meet all requirements');
            console.log('✅ Real market data integration confirmed');
            console.log('✅ Strict mode compliance verified');
            console.log('✅ Performance standards met');
        } else {
            console.log('\n⚠️ TRADAI System v2.0 requires additional work before production deployment');
            console.log('❌ Critical issues identified:');
            this.results.overall.criticalIssues.forEach(issue => {
                console.log(`   - ${issue}`);
            });
        }
    }

    /**
     * Phase 5: Save Results
     */
    async saveValidationResults() {
        const reportPath = path.join(process.cwd(), 'validation-results', `comprehensive-validation-${Date.now()}.json`);
        await fs.ensureDir(path.dirname(reportPath));
        await fs.writeJson(reportPath, this.results, { spaces: 2 });

        console.log(`\n📄 Comprehensive validation report saved: ${reportPath}`);
    }

    /**
     * Utility function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the comprehensive validation
if (require.main === module) {
    const validator = new ComprehensiveProductionValidator();
    validator.runComprehensiveValidation().catch(console.error);
}

module.exports = ComprehensiveProductionValidator;
