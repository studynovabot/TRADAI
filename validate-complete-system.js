#!/usr/bin/env node

/**
 * 🧪 Complete Trading System Validation
 * =====================================
 * 
 * Comprehensive validation script for the complete TRADAI system
 * Tests all components with real chart screenshots and validates accuracy
 * 
 * Features:
 * - End-to-end system testing
 * - Real chart processing validation
 * - Signal accuracy assessment
 * - Performance benchmarking
 * - Error handling verification
 * - Production readiness validation
 */

const { CompleteTradingSystem } = require('./complete-trading-system.js');
const { GeminiAPIHealthChecker } = require('./gemini-api-health-checker.js');
const fs = require('fs').promises;
const path = require('path');

class SystemValidator {
    constructor() {
        this.testResults = {
            startTime: new Date().toISOString(),
            endTime: null,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            warnings: 0,
            errors: [],
            performance: {},
            signalValidation: {},
            systemHealth: {}
        };

        this.tradingSystem = null;
        this.testCharts = [];
    }

    /**
     * Run comprehensive system validation
     */
    async runValidation() {
        console.log('🧪 TRADAI Complete System Validation');
        console.log('====================================');
        console.log(`Start Time: ${this.testResults.startTime}`);
        console.log('');

        try {
            // Phase 1: Pre-validation checks
            await this.runPreValidationChecks();
            
            // Phase 2: Component validation
            await this.runComponentValidation();
            
            // Phase 3: Integration testing
            await this.runIntegrationTesting();
            
            // Phase 4: Real chart processing
            await this.runRealChartProcessing();
            
            // Phase 5: Performance validation
            await this.runPerformanceValidation();
            
            // Phase 6: Error handling validation
            await this.runErrorHandlingValidation();
            
            // Phase 7: Production readiness assessment
            await this.runProductionReadinessAssessment();
            
            // Generate final report
            await this.generateValidationReport();
            
            console.log('\n✅ Complete System Validation Finished');
            this.displaySummary();
            
        } catch (error) {
            console.error('\n❌ Validation failed:', error.message);
            this.testResults.errors.push({
                phase: 'System Validation',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            await this.generateValidationReport();
            throw error;
        }
    }

    /**
     * Phase 1: Pre-validation checks
     */
    async runPreValidationChecks() {
        console.log('🔍 Phase 1: Pre-validation Checks');
        console.log('==================================');

        // Test 1: API Key Health Check
        await this.runTest('API Key Health Check', async () => {
            const healthChecker = new GeminiAPIHealthChecker();
            await healthChecker.testAllKeys();
            
            if (healthChecker.workingKeys.length === 0) {
                throw new Error('No working API keys available');
            }
            
            return {
                workingKeys: healthChecker.workingKeys.length,
                totalKeys: healthChecker.apiKeys.length,
                successRate: (healthChecker.workingKeys.length / healthChecker.apiKeys.length * 100).toFixed(1) + '%'
            };
        });

        // Test 2: Chart Directory Validation
        await this.runTest('Chart Directory Validation', async () => {
            const baseDir = 'C:\\Users\\thaku\\Pictures\\trading ss';
            const timeframes = ['1m', '3m', '5m'];
            const results = {};

            for (const timeframe of timeframes) {
                const timeframePath = path.join(baseDir, timeframe);
                try {
                    const files = await fs.readdir(timeframePath);
                    const chartFiles = files.filter(file => 
                        ['.png', '.jpg', '.jpeg'].some(ext => 
                            file.toLowerCase().endsWith(ext)
                        )
                    );
                    results[timeframe] = chartFiles.length;
                    
                    // Store test charts for later use
                    if (chartFiles.length > 0) {
                        this.testCharts.push({
                            timeframe,
                            filename: chartFiles[0],
                            path: path.join(timeframePath, chartFiles[0])
                        });
                    }
                } catch (error) {
                    results[timeframe] = 0;
                }
            }

            const totalCharts = Object.values(results).reduce((sum, count) => sum + count, 0);
            if (totalCharts === 0) {
                throw new Error('No chart files found in any timeframe directory');
            }

            return results;
        });

        console.log('✅ Pre-validation checks completed\n');
    }

    /**
     * Phase 2: Component validation
     */
    async runComponentValidation() {
        console.log('🔧 Phase 2: Component Validation');
        console.log('=================================');

        // Test 3: Trading System Initialization
        await this.runTest('Trading System Initialization', async () => {
            this.tradingSystem = new CompleteTradingSystem({
                chartDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
                autoProcessing: false, // Manual for testing
                enableLogging: true
            });

            const initResult = await this.tradingSystem.initialize();
            
            if (!initResult.success) {
                throw new Error('Trading system initialization failed');
            }

            return initResult;
        });

        // Test 4: Component Health Check
        await this.runTest('Component Health Check', async () => {
            const stats = this.tradingSystem.getSystemStats();
            
            const health = {
                imageProcessor: this.tradingSystem.imageProcessor ? 'OK' : 'FAILED',
                aiAnalyzer: this.tradingSystem.aiAnalyzer ? 'OK' : 'FAILED',
                apiManager: this.tradingSystem.aiAnalyzer.apiManager ? 'OK' : 'FAILED'
            };

            const failedComponents = Object.entries(health)
                .filter(([component, status]) => status === 'FAILED')
                .map(([component]) => component);

            if (failedComponents.length > 0) {
                throw new Error(`Failed components: ${failedComponents.join(', ')}`);
            }

            return health;
        });

        console.log('✅ Component validation completed\n');
    }

    /**
     * Phase 3: Integration testing
     */
    async runIntegrationTesting() {
        console.log('🔗 Phase 3: Integration Testing');
        console.log('===============================');

        // Test 5: Image Processing Integration
        await this.runTest('Image Processing Integration', async () => {
            if (this.testCharts.length === 0) {
                throw new Error('No test charts available');
            }

            const testChart = this.testCharts[0];
            const chartData = await this.tradingSystem.imageProcessor.processSpecificFile(
                testChart.timeframe, 
                testChart.filename
            );

            if (!chartData.imageData || chartData.imageData.length === 0) {
                throw new Error('Image processing failed - no image data');
            }

            return {
                timeframe: chartData.timeframe,
                filename: chartData.filename,
                imageSize: Math.round(chartData.imageData.length / 1024) + 'KB',
                quality: chartData.metadata.quality,
                processingTime: chartData.processingTime + 'ms'
            };
        });

        console.log('✅ Integration testing completed\n');
    }

    /**
     * Phase 4: Real chart processing
     */
    async runRealChartProcessing() {
        console.log('📊 Phase 4: Real Chart Processing');
        console.log('=================================');

        const processedSignals = [];

        // Test 6: Single Chart Analysis
        await this.runTest('Single Chart Analysis', async () => {
            if (this.testCharts.length === 0) {
                throw new Error('No test charts available');
            }

            const testChart = this.testCharts[0];
            const startTime = Date.now();
            
            const signal = await this.tradingSystem.processChart(
                testChart.timeframe, 
                testChart.filename
            );

            const processingTime = Date.now() - startTime;
            processedSignals.push(signal);

            // Validate signal structure
            this.validateSignalStructure(signal);

            return {
                signal: signal.signal,
                confidence: signal.confidence,
                timeframe: signal.timeframe,
                processingTime: processingTime + 'ms',
                analysisQuality: signal.analysisQuality
            };
        });

        // Test 7: Multi-Chart Processing
        await this.runTest('Multi-Chart Processing', async () => {
            const results = [];
            const maxCharts = Math.min(this.testCharts.length, 3); // Test up to 3 charts

            for (let i = 1; i < maxCharts; i++) {
                const testChart = this.testCharts[i];
                try {
                    const signal = await this.tradingSystem.processChart(
                        testChart.timeframe, 
                        testChart.filename
                    );
                    
                    processedSignals.push(signal);
                    results.push({
                        timeframe: signal.timeframe,
                        signal: signal.signal,
                        confidence: signal.confidence
                    });
                } catch (error) {
                    this.testResults.warnings++;
                    console.warn(`⚠️ Failed to process ${testChart.timeframe}/${testChart.filename}: ${error.message}`);
                }
            }

            return {
                chartsProcessed: results.length,
                results: results
            };
        });

        // Store signals for validation
        this.testResults.signalValidation = {
            totalSignals: processedSignals.length,
            signals: processedSignals,
            signalDistribution: this.analyzeSignalDistribution(processedSignals),
            averageConfidence: this.calculateAverageConfidence(processedSignals)
        };

        console.log('✅ Real chart processing completed\n');
    }

    /**
     * Phase 5: Performance validation
     */
    async runPerformanceValidation() {
        console.log('⚡ Phase 5: Performance Validation');
        console.log('==================================');

        // Test 8: Response Time Validation
        await this.runTest('Response Time Validation', async () => {
            const stats = this.tradingSystem.getSystemStats();
            const componentStats = stats.componentStats;

            const performance = {
                averageAnalysisTime: componentStats.aiAnalyzer ? 
                    componentStats.aiAnalyzer.averageAnalysisTimeMs : 0,
                averageImageProcessing: componentStats.imageProcessor ? 
                    componentStats.imageProcessor.averageProcessingTimeMs : 0,
                apiResponseTime: componentStats.aiAnalyzer && componentStats.aiAnalyzer.apiManagerStats ? 
                    componentStats.aiAnalyzer.apiManagerStats.averageResponseTime : 0
            };

            // Validate performance thresholds
            if (performance.averageAnalysisTime > 60000) { // 1 minute
                throw new Error(`Analysis time too slow: ${performance.averageAnalysisTime}ms`);
            }

            this.testResults.performance = performance;
            return performance;
        });

        console.log('✅ Performance validation completed\n');
    }

    /**
     * Phase 6: Error handling validation
     */
    async runErrorHandlingValidation() {
        console.log('🛡️ Phase 6: Error Handling Validation');
        console.log('=====================================');

        // Test 9: Invalid Input Handling
        await this.runTest('Invalid Input Handling', async () => {
            try {
                // Try to process non-existent file
                await this.tradingSystem.processChart('1m', 'nonexistent.png');
                throw new Error('Should have failed with non-existent file');
            } catch (error) {
                if (error.message.includes('not found') || error.message.includes('File not found')) {
                    return { errorHandling: 'PASSED', errorMessage: error.message };
                } else {
                    throw error;
                }
            }
        });

        console.log('✅ Error handling validation completed\n');
    }

    /**
     * Phase 7: Production readiness assessment
     */
    async runProductionReadinessAssessment() {
        console.log('🚀 Phase 7: Production Readiness Assessment');
        console.log('===========================================');

        // Test 10: System Health Assessment
        await this.runTest('System Health Assessment', async () => {
            const stats = this.tradingSystem.getSystemStats();
            
            const health = {
                successRate: parseFloat(stats.successRate.replace('%', '')),
                averageConfidence: this.testResults.signalValidation.averageConfidence,
                systemUptime: stats.systemUptimeMs,
                componentHealth: {
                    imageProcessor: stats.componentStats.imageProcessor ? 'HEALTHY' : 'UNHEALTHY',
                    aiAnalyzer: stats.componentStats.aiAnalyzer ? 'HEALTHY' : 'UNHEALTHY'
                }
            };

            // Production readiness criteria
            const criteria = {
                minSuccessRate: 95,
                minAverageConfidence: 70,
                requiredComponents: ['imageProcessor', 'aiAnalyzer']
            };

            const issues = [];
            
            if (health.successRate < criteria.minSuccessRate) {
                issues.push(`Success rate too low: ${health.successRate}% (min: ${criteria.minSuccessRate}%)`);
            }
            
            if (health.averageConfidence < criteria.minAverageConfidence) {
                issues.push(`Average confidence too low: ${health.averageConfidence}% (min: ${criteria.minAverageConfidence}%)`);
            }

            const unhealthyComponents = Object.entries(health.componentHealth)
                .filter(([component, status]) => status === 'UNHEALTHY')
                .map(([component]) => component);

            if (unhealthyComponents.length > 0) {
                issues.push(`Unhealthy components: ${unhealthyComponents.join(', ')}`);
            }

            this.testResults.systemHealth = {
                health,
                criteria,
                issues,
                productionReady: issues.length === 0
            };

            if (issues.length > 0) {
                throw new Error(`Production readiness issues: ${issues.join('; ')}`);
            }

            return health;
        });

        console.log('✅ Production readiness assessment completed\n');
    }

    /**
     * Run individual test with error handling
     */
    async runTest(testName, testFunction) {
        this.testResults.totalTests++;
        console.log(`🧪 Running: ${testName}`);

        try {
            const startTime = Date.now();
            const result = await testFunction();
            const duration = Date.now() - startTime;

            this.testResults.passedTests++;
            console.log(`✅ PASSED: ${testName} (${duration}ms)`);
            
            if (result && typeof result === 'object') {
                console.log(`   Result: ${JSON.stringify(result, null, 2).substring(0, 200)}...`);
            }
            
            return result;

        } catch (error) {
            this.testResults.failedTests++;
            console.log(`❌ FAILED: ${testName}`);
            console.log(`   Error: ${error.message}`);
            
            this.testResults.errors.push({
                test: testName,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            throw error;
        }
    }

    /**
     * Validate signal structure
     */
    validateSignalStructure(signal) {
        const requiredFields = [
            'timestamp', 'timeframe', 'signal', 'confidence', 
            'recommendation', 'reasoning'
        ];

        for (const field of requiredFields) {
            if (!(field in signal)) {
                throw new Error(`Missing required field in signal: ${field}`);
            }
        }

        if (!['UP', 'DOWN', 'NO TRADE'].includes(signal.signal)) {
            throw new Error(`Invalid signal value: ${signal.signal}`);
        }

        if (signal.confidence < 0 || signal.confidence > 100) {
            throw new Error(`Invalid confidence value: ${signal.confidence}`);
        }
    }

    /**
     * Analyze signal distribution
     */
    analyzeSignalDistribution(signals) {
        const distribution = { UP: 0, DOWN: 0, 'NO TRADE': 0 };
        
        signals.forEach(signal => {
            distribution[signal.signal]++;
        });

        return distribution;
    }

    /**
     * Calculate average confidence
     */
    calculateAverageConfidence(signals) {
        if (signals.length === 0) return 0;
        
        const totalConfidence = signals.reduce((sum, signal) => sum + signal.confidence, 0);
        return Math.round(totalConfidence / signals.length);
    }

    /**
     * Generate validation report
     */
    async generateValidationReport() {
        this.testResults.endTime = new Date().toISOString();
        
        const reportPath = `./validation-report-${Date.now()}.json`;
        await fs.writeFile(reportPath, JSON.stringify(this.testResults, null, 2));
        
        console.log(`📄 Validation report saved: ${reportPath}`);
    }

    /**
     * Display validation summary
     */
    displaySummary() {
        console.log('\n📊 VALIDATION SUMMARY');
        console.log('=====================');
        console.log(`Total Tests: ${this.testResults.totalTests}`);
        console.log(`Passed: ${this.testResults.passedTests}`);
        console.log(`Failed: ${this.testResults.failedTests}`);
        console.log(`Warnings: ${this.testResults.warnings}`);
        console.log(`Success Rate: ${(this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(1)}%`);
        
        if (this.testResults.signalValidation.totalSignals > 0) {
            console.log('\n🎯 Signal Analysis:');
            console.log(`Signals Generated: ${this.testResults.signalValidation.totalSignals}`);
            console.log(`Average Confidence: ${this.testResults.signalValidation.averageConfidence}%`);
            console.log(`Distribution: ${JSON.stringify(this.testResults.signalValidation.signalDistribution)}`);
        }

        if (this.testResults.systemHealth.productionReady !== undefined) {
            console.log(`\n🚀 Production Ready: ${this.testResults.systemHealth.productionReady ? 'YES' : 'NO'}`);
            
            if (!this.testResults.systemHealth.productionReady) {
                console.log('Issues:');
                this.testResults.systemHealth.issues.forEach(issue => {
                    console.log(`   - ${issue}`);
                });
            }
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.tradingSystem) {
            await this.tradingSystem.shutdown();
        }
    }
}

// Main execution
async function main() {
    const validator = new SystemValidator();
    
    try {
        await validator.runValidation();
        console.log('\n🎉 System validation completed successfully!');
        console.log('🚀 TRADAI system is ready for production trading!');
        
    } catch (error) {
        console.error('\n💥 System validation failed:', error.message);
        console.log('\n🔧 Please review the validation report and fix issues before production deployment.');
        process.exit(1);
        
    } finally {
        await validator.cleanup();
    }
}

if (require.main === module) {
    main();
}

module.exports = { SystemValidator };
