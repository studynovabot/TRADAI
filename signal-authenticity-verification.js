/**
 * TRADAI Signal Authenticity Verification Tool
 * 
 * This tool performs comprehensive verification of signal authenticity
 * by analyzing the actual signal generation process and data sources
 */

const axios = require('axios');

class SignalAuthenticityVerifier {
    constructor() {
        this.baseUrl = 'https://tradai-5msqbiept-ranveer-singh-rajputs-projects.vercel.app';
        this.findings = {
            forex: {
                authentic: [],
                suspicious: [],
                violations: []
            },
            otc: {
                authentic: [],
                suspicious: [],
                violations: []
            },
            overall: {
                authenticityScore: 0,
                criticalIssues: [],
                recommendations: []
            }
        };
    }

    async verifySignalAuthenticity() {
        console.log('🔍 === TRADAI SIGNAL AUTHENTICITY VERIFICATION ===');
        console.log(`🌐 Production URL: ${this.baseUrl}`);
        console.log(`⏰ Verification Started: ${new Date().toISOString()}\n`);

        try {
            // Phase 1: Verify Forex Signal Authenticity
            await this.verifyForexSignalAuthenticity();

            // Phase 2: Verify OTC Signal Authenticity
            await this.verifyOTCSignalAuthenticity();

            // Phase 3: Analyze Data Source Traceability
            await this.analyzeDataSourceTraceability();

            // Phase 4: Test Strict Mode Enforcement
            await this.testStrictModeEnforcement();

            // Phase 5: Generate Final Assessment
            this.generateAuthenticityAssessment();

        } catch (error) {
            console.error('❌ Authenticity verification failed:', error);
            this.findings.overall.criticalIssues.push(`Verification failure: ${error.message}`);
        }
    }

    /**
     * Phase 1: Verify Forex Signal Authenticity
     */
    async verifyForexSignalAuthenticity() {
        console.log('💱 === PHASE 1: FOREX SIGNAL AUTHENTICITY VERIFICATION ===\n');

        const testCases = [
            { pair: 'EUR/USD', trade_mode: 'scalping', risk: '1' },
            { pair: 'GBP/USD', trade_mode: 'sniper', risk: '2' },
            { pair: 'USD/JPY', trade_mode: 'swing', risk: '1' }
        ];

        for (const testCase of testCases) {
            console.log(`🔍 Testing ${testCase.pair} ${testCase.trade_mode}...`);

            try {
                // Generate multiple signals to check for patterns
                const signals = [];
                for (let i = 0; i < 3; i++) {
                    const response = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, testCase, {
                        timeout: 30000,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    signals.push(response.data);
                    await this.sleep(6000); // Wait between requests
                }

                // Analyze signals for authenticity
                const analysis = this.analyzeForexSignalAuthenticity(signals, testCase);
                
                if (analysis.isAuthentic) {
                    this.findings.forex.authentic.push(analysis);
                    console.log(`✅ ${testCase.pair} ${testCase.trade_mode}: AUTHENTIC`);
                } else {
                    this.findings.forex.suspicious.push(analysis);
                    console.log(`⚠️ ${testCase.pair} ${testCase.trade_mode}: SUSPICIOUS`);
                }

                // Check for violations
                if (analysis.violations.length > 0) {
                    this.findings.forex.violations.push(...analysis.violations);
                    console.log(`❌ ${testCase.pair} ${testCase.trade_mode}: VIOLATIONS DETECTED`);
                    analysis.violations.forEach(v => console.log(`   - ${v}`));
                }

            } catch (error) {
                console.log(`❌ ${testCase.pair} ${testCase.trade_mode}: Error - ${error.message}`);
                this.findings.forex.violations.push(`${testCase.pair} ${testCase.trade_mode}: ${error.message}`);
            }
        }

        console.log('');
    }

    /**
     * Phase 2: Verify OTC Signal Authenticity
     */
    async verifyOTCSignalAuthenticity() {
        console.log('📈 === PHASE 2: OTC SIGNAL AUTHENTICITY VERIFICATION ===\n');

        const testCases = [
            { currencyPair: 'USD/PKR', timeframe: '1m', tradeDuration: '1' },
            { currencyPair: 'USD/DZD', timeframe: '5m', tradeDuration: '5' }
        ];

        for (const testCase of testCases) {
            console.log(`🔍 Testing ${testCase.currencyPair} ${testCase.timeframe}...`);

            try {
                // Generate multiple signals to check for patterns
                const signals = [];
                for (let i = 0; i < 2; i++) {
                    const response = await axios.post(`${this.baseUrl}/api/otc-signal-generator`, testCase, {
                        timeout: 60000,
                        headers: { 'Content-Type': 'application/json' }
                    });

                    signals.push(response.data);
                    await this.sleep(15000); // Wait between requests
                }

                // Analyze signals for authenticity
                const analysis = this.analyzeOTCSignalAuthenticity(signals, testCase);
                
                if (analysis.isAuthentic) {
                    this.findings.otc.authentic.push(analysis);
                    console.log(`✅ ${testCase.currencyPair} ${testCase.timeframe}: AUTHENTIC`);
                } else {
                    this.findings.otc.suspicious.push(analysis);
                    console.log(`⚠️ ${testCase.currencyPair} ${testCase.timeframe}: SUSPICIOUS`);
                }

                // Check for violations
                if (analysis.violations.length > 0) {
                    this.findings.otc.violations.push(...analysis.violations);
                    console.log(`❌ ${testCase.currencyPair} ${testCase.timeframe}: VIOLATIONS DETECTED`);
                    analysis.violations.forEach(v => console.log(`   - ${v}`));
                }

            } catch (error) {
                console.log(`❌ ${testCase.currencyPair} ${testCase.timeframe}: Error - ${error.message}`);
                this.findings.otc.violations.push(`${testCase.currencyPair} ${testCase.timeframe}: ${error.message}`);
            }
        }

        console.log('');
    }

    /**
     * Analyze Forex signals for authenticity patterns
     */
    analyzeForexSignalAuthenticity(signals, testCase) {
        const analysis = {
            testCase,
            isAuthentic: true,
            violations: [],
            patterns: {
                entryVariation: 0,
                confidenceVariation: 0,
                reasoningVariation: 0
            },
            dataSourceValidation: {
                allReal: true,
                strictModeEnabled: true,
                timestampVariation: true
            }
        };

        if (signals.length < 2) {
            analysis.violations.push('Insufficient signals for pattern analysis');
            return analysis;
        }

        // Check for identical values (indicating hard-coded responses)
        const entries = signals.map(s => s.entry).filter(e => e && e !== 'N/A');
        const confidences = signals.map(s => s.confidence).filter(c => c && c !== 'N/A');
        const reasons = signals.map(s => s.reason).filter(r => r && r !== 'N/A');

        // Calculate variations
        if (entries.length > 1) {
            const entryVariation = this.calculateVariation(entries);
            analysis.patterns.entryVariation = entryVariation;
            
            if (entryVariation === 0) {
                analysis.violations.push('Identical entry points across multiple signals (suspicious)');
                analysis.isAuthentic = false;
            }
        }

        if (confidences.length > 1) {
            const confidenceVariation = this.calculateVariation(confidences);
            analysis.patterns.confidenceVariation = confidenceVariation;
            
            if (confidenceVariation === 0) {
                analysis.violations.push('Identical confidence scores across multiple signals (suspicious)');
                analysis.isAuthentic = false;
            }
        }

        // Check data source metadata
        signals.forEach((signal, index) => {
            if (signal.dataSource !== 'real') {
                analysis.violations.push(`Signal ${index + 1}: dataSource is '${signal.dataSource}', not 'real'`);
                analysis.dataSourceValidation.allReal = false;
                analysis.isAuthentic = false;
            }

            if (!signal.strictMode) {
                analysis.violations.push(`Signal ${index + 1}: strictMode is false or missing`);
                analysis.dataSourceValidation.strictModeEnabled = false;
                analysis.isAuthentic = false;
            }

            // Check for "N/A" values
            if (signal.entry === 'N/A' || signal.stop_loss === 'N/A' || signal.take_profit === 'N/A') {
                analysis.violations.push(`Signal ${index + 1}: Contains 'N/A' values`);
                analysis.isAuthentic = false;
            }
        });

        return analysis;
    }

    /**
     * Analyze OTC signals for authenticity patterns
     */
    analyzeOTCSignalAuthenticity(signals, testCase) {
        const analysis = {
            testCase,
            isAuthentic: true,
            violations: [],
            patterns: {
                signalVariation: 0,
                confidenceVariation: 0,
                analysisVariation: 0
            },
            dataSourceValidation: {
                allReal: true,
                strictModeEnabled: true,
                timestampVariation: true
            }
        };

        if (signals.length < 2) {
            analysis.violations.push('Insufficient signals for pattern analysis');
            return analysis;
        }

        // Check for identical values
        const signalTypes = signals.map(s => s.signal).filter(s => s && s !== 'NO_SIGNAL');
        const confidences = signals.map(s => s.confidence).filter(c => c && c > 0);
        const analyses = signals.map(s => s.analysis).filter(a => a && a.length > 0);

        // Calculate variations
        if (confidences.length > 1) {
            const confidenceVariation = this.calculateVariation(confidences);
            analysis.patterns.confidenceVariation = confidenceVariation;
            
            if (confidenceVariation === 0) {
                analysis.violations.push('Identical confidence scores across multiple signals (suspicious)');
                analysis.isAuthentic = false;
            }
        }

        // Check for deterministic patterns in analysis text
        if (analyses.length > 1) {
            const uniqueAnalyses = [...new Set(analyses)];
            if (uniqueAnalyses.length === 1) {
                analysis.violations.push('Identical analysis text across multiple signals (suspicious)');
                analysis.isAuthentic = false;
            }
        }

        // Check data source metadata
        signals.forEach((signal, index) => {
            if (signal.metadata && signal.metadata.dataSource !== 'real') {
                analysis.violations.push(`Signal ${index + 1}: dataSource is '${signal.metadata.dataSource}', not 'real'`);
                analysis.dataSourceValidation.allReal = false;
                analysis.isAuthentic = false;
            }

            if (!signal.strictMode) {
                analysis.violations.push(`Signal ${index + 1}: strictMode is false or missing`);
                analysis.dataSourceValidation.strictModeEnabled = false;
                analysis.isAuthentic = false;
            }

            // Check for suspicious patterns in technical indicators
            if (signal.technicalIndicators) {
                const rsi = signal.technicalIndicators.rsi;
                if (rsi && (rsi < 0 || rsi > 100)) {
                    analysis.violations.push(`Signal ${index + 1}: Invalid RSI value: ${rsi}`);
                    analysis.isAuthentic = false;
                }
            }
        });

        return analysis;
    }

    /**
     * Phase 3: Analyze Data Source Traceability
     */
    async analyzeDataSourceTraceability() {
        console.log('🔗 === PHASE 3: DATA SOURCE TRACEABILITY ANALYSIS ===\n');

        // Test with a known pair to trace data flow
        try {
            const response = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, {
                pair: 'EUR/USD',
                trade_mode: 'scalping',
                risk: '1'
            }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('📊 Analyzing data source traceability...');
            
            // Check for data source indicators
            const hasDataSource = response.data.dataSource === 'real';
            const hasStrictMode = response.data.strictMode === true;
            const hasTimestamp = !!response.data.timestamp;
            const hasRealValues = response.data.entry && response.data.entry !== 'N/A';

            console.log(`   Data Source: ${response.data.dataSource || 'MISSING'}`);
            console.log(`   Strict Mode: ${response.data.strictMode || 'MISSING'}`);
            console.log(`   Timestamp: ${response.data.timestamp || 'MISSING'}`);
            console.log(`   Real Values: ${hasRealValues ? 'YES' : 'NO'}`);

            if (!hasDataSource) {
                this.findings.overall.criticalIssues.push('Missing or invalid dataSource metadata');
            }

            if (!hasStrictMode) {
                this.findings.overall.criticalIssues.push('Strict mode not properly enforced');
            }

            if (!hasRealValues) {
                this.findings.overall.criticalIssues.push('Signal contains N/A or missing values');
            }

        } catch (error) {
            console.log(`❌ Data source traceability test failed: ${error.message}`);
            this.findings.overall.criticalIssues.push(`Data source traceability test failed: ${error.message}`);
        }

        console.log('');
    }

    /**
     * Phase 4: Test Strict Mode Enforcement
     */
    async testStrictModeEnforcement() {
        console.log('🔒 === PHASE 4: STRICT MODE ENFORCEMENT TESTING ===\n');

        // Test with invalid currency pair to see if strict mode rejects it
        try {
            console.log('🧪 Testing strict mode with invalid currency pair...');
            
            const response = await axios.post(`${this.baseUrl}/api/forex-signal-generator`, {
                pair: 'INVALID/PAIR',
                trade_mode: 'scalping',
                risk: '1'
            }, {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' }
            });

            // If we get here, check if it was properly rejected
            if (response.status === 200 && response.data.error) {
                console.log('✅ Strict mode properly rejected invalid currency pair');
                console.log(`   Error: ${response.data.error}`);
            } else if (response.status === 200 && response.data.trade_type) {
                console.log('❌ CRITICAL: Strict mode accepted invalid currency pair');
                this.findings.overall.criticalIssues.push('Strict mode failed to reject invalid currency pair');
            }

        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('✅ Strict mode properly rejected invalid input with 400 error');
            } else {
                console.log(`⚠️ Unexpected error during strict mode test: ${error.message}`);
            }
        }

        console.log('');
    }

    /**
     * Calculate variation in a set of numbers
     */
    calculateVariation(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    /**
     * Generate Final Authenticity Assessment
     */
    generateAuthenticityAssessment() {
        console.log('📋 === FINAL AUTHENTICITY ASSESSMENT ===\n');

        const totalForexTests = this.findings.forex.authentic.length + this.findings.forex.suspicious.length;
        const totalOTCTests = this.findings.otc.authentic.length + this.findings.otc.suspicious.length;
        const totalViolations = this.findings.forex.violations.length + this.findings.otc.violations.length;

        // Calculate authenticity score
        const forexScore = totalForexTests > 0 ? (this.findings.forex.authentic.length / totalForexTests) * 100 : 0;
        const otcScore = totalOTCTests > 0 ? (this.findings.otc.authentic.length / totalOTCTests) * 100 : 0;
        const overallScore = ((forexScore + otcScore) / 2) - (totalViolations * 10);
        
        this.findings.overall.authenticityScore = Math.max(0, Math.round(overallScore));

        console.log('🎯 === AUTHENTICITY SCORE BREAKDOWN ===');
        console.log(`📊 Forex Authenticity: ${forexScore.toFixed(1)}% (${this.findings.forex.authentic.length}/${totalForexTests} authentic)`);
        console.log(`📈 OTC Authenticity: ${otcScore.toFixed(1)}% (${this.findings.otc.authentic.length}/${totalOTCTests} authentic)`);
        console.log(`⚠️ Total Violations: ${totalViolations}`);
        console.log(`🏆 Overall Authenticity Score: ${this.findings.overall.authenticityScore}%`);

        // Generate recommendations
        if (this.findings.overall.authenticityScore >= 90) {
            console.log('\n✅ VERDICT: SIGNALS ARE AUTHENTIC');
            console.log('🎉 The TRADAI system generates authentic signals using real market data.');
        } else if (this.findings.overall.authenticityScore >= 70) {
            console.log('\n⚠️ VERDICT: SIGNALS ARE MOSTLY AUTHENTIC WITH SOME CONCERNS');
            console.log('🔧 Minor improvements needed to ensure full authenticity.');
        } else {
            console.log('\n❌ VERDICT: SIGNALS HAVE AUTHENTICITY ISSUES');
            console.log('🚨 Significant improvements needed before live trading.');
        }

        // List critical issues
        if (this.findings.overall.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES IDENTIFIED:');
            this.findings.overall.criticalIssues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }

        // List all violations
        if (totalViolations > 0) {
            console.log('\n❌ AUTHENTICITY VIOLATIONS:');
            [...this.findings.forex.violations, ...this.findings.otc.violations].forEach((violation, index) => {
                console.log(`   ${index + 1}. ${violation}`);
            });
        }
    }

    /**
     * Utility function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the authenticity verification
if (require.main === module) {
    const verifier = new SignalAuthenticityVerifier();
    verifier.verifySignalAuthenticity().catch(console.error);
}

module.exports = SignalAuthenticityVerifier;
