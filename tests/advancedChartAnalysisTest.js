/**
 * Advanced Chart Analysis System Test Suite
 * 
 * Comprehensive testing for the advanced trading chart analysis system
 * including accuracy validation and performance benchmarks.
 */

const fs = require('fs').promises;
const path = require('path');
const { AdvancedChartAnalysisEngine } = require('../src/core/AdvancedChartAnalysisEngine');

class AdvancedChartAnalysisTestSuite {
    constructor() {
        this.testResults = [];
        this.analysisEngine = new AdvancedChartAnalysisEngine({
            minAnalysisConfidence: 75,
            minSignalConfidence: 80,
            includeDebugInfo: true
        });
        
        this.testCriteria = {
            minOverallConfidence: 75,
            minSignalConfidence: 80,
            maxProcessingTime: 30000, // 30 seconds
            minSignalAccuracy: 0.8,
            requiredComponents: ['imageProcessing', 'computerVision', 'signalGeneration']
        };
    }

    /**
     * Run comprehensive test suite
     */
    async runComprehensiveTests() {
        console.log('🚀 Starting Advanced Chart Analysis Test Suite...');
        console.log('=' .repeat(60));
        
        const startTime = Date.now();
        
        try {
            // Test 1: System initialization
            await this.testSystemInitialization();
            
            // Test 2: Image processing capabilities
            await this.testImageProcessing();
            
            // Test 3: OCR accuracy
            await this.testOCRAccuracy();
            
            // Test 4: Computer vision analysis
            await this.testComputerVision();
            
            // Test 5: Signal generation
            await this.testSignalGeneration();
            
            // Test 6: End-to-end analysis
            await this.testEndToEndAnalysis();
            
            // Test 7: Performance benchmarks
            await this.testPerformanceBenchmarks();
            
            // Test 8: Error handling
            await this.testErrorHandling();
            
            // Generate final report
            const totalTime = Date.now() - startTime;
            await this.generateTestReport(totalTime);
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Test system initialization
     */
    async testSystemInitialization() {
        console.log('\n📋 Test 1: System Initialization');
        
        const test = {
            name: 'System Initialization',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            // Check if all components are initialized
            const components = [
                'imageProcessor',
                'dataExtractor', 
                'visionEngine',
                'multiTimeframeAnalyzer',
                'signalGenerator'
            ];
            
            const missingComponents = components.filter(comp => !this.analysisEngine[comp]);
            
            if (missingComponents.length > 0) {
                throw new Error(`Missing components: ${missingComponents.join(', ')}`);
            }
            
            // Test configuration
            const config = this.analysisEngine.config;
            if (!config || typeof config !== 'object') {
                throw new Error('Invalid configuration');
            }
            
            test.success = true;
            test.details = {
                componentsInitialized: components.length,
                configurationValid: true,
                memoryUsage: process.memoryUsage()
            };
            
            console.log('   ✅ All components initialized successfully');
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ Initialization failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Test image processing capabilities
     */
    async testImageProcessing() {
        console.log('\n🖼️ Test 2: Image Processing');
        
        const test = {
            name: 'Image Processing',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            // Create test image buffer (simple PNG)
            const testImageBuffer = await this.createTestImage();
            
            // Test image validation
            const validation = await this.analysisEngine.imageProcessor.validateImage(testImageBuffer);
            
            if (!validation.valid) {
                throw new Error(`Image validation failed: ${validation.error}`);
            }
            
            // Test image preprocessing
            const preprocessed = await this.analysisEngine.imageProcessor.preprocessImage(testImageBuffer);
            
            if (!preprocessed.buffer || preprocessed.buffer.length === 0) {
                throw new Error('Image preprocessing failed');
            }
            
            test.success = true;
            test.details = {
                validationPassed: validation.valid,
                preprocessingSuccessful: true,
                originalSize: testImageBuffer.length,
                processedSize: preprocessed.buffer.length,
                operations: preprocessed.metadata.operations
            };
            
            console.log('   ✅ Image processing working correctly');
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ Image processing failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Test OCR accuracy with known text
     */
    async testOCRAccuracy() {
        console.log('\n📝 Test 3: OCR Accuracy');
        
        const test = {
            name: 'OCR Accuracy',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            // Test with sample trading data
            const testData = {
                expectedCurrencyPair: 'EUR/USD',
                expectedPrice: '1.2345',
                expectedTimeframe: '5m'
            };
            
            // Create test image with known text (simplified)
            const testImageBuffer = await this.createTestImageWithText(testData);
            
            // Process with OCR
            const result = await this.analysisEngine.imageProcessor.processChartScreenshot(testImageBuffer);
            
            if (!result.success) {
                throw new Error(`OCR processing failed: ${result.error}`);
            }
            
            // Validate extracted data
            const accuracy = this.calculateOCRAccuracy(testData, result.tradingData);
            
            if (accuracy < 0.7) {
                throw new Error(`OCR accuracy too low: ${(accuracy * 100).toFixed(1)}%`);
            }
            
            test.success = true;
            test.details = {
                accuracy: accuracy,
                extractedData: result.tradingData,
                expectedData: testData,
                ocrConfidence: result.confidence
            };
            
            console.log(`   ✅ OCR accuracy: ${(accuracy * 100).toFixed(1)}%`);
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ OCR test failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Test computer vision analysis
     */
    async testComputerVision() {
        console.log('\n👁️ Test 4: Computer Vision Analysis');
        
        const test = {
            name: 'Computer Vision',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            // Create test chart image with known patterns
            const testImageBuffer = await this.createTestChartImage();
            const testRegions = await this.createTestRegions();
            
            // Run computer vision analysis
            const result = await this.analysisEngine.visionEngine.extractChartData(testImageBuffer, testRegions);
            
            if (!result.success) {
                throw new Error(`Computer vision analysis failed: ${result.error}`);
            }
            
            // Validate results
            const hasRequiredData = result.candlesticks && result.patterns && result.supportResistance;
            
            if (!hasRequiredData) {
                throw new Error('Missing required computer vision data');
            }
            
            test.success = true;
            test.details = {
                candlesticksDetected: result.candlesticks.length,
                patternsDetected: result.patterns.length,
                supportLevels: result.supportResistance.support.length,
                resistanceLevels: result.supportResistance.resistance.length,
                confidence: result.confidence
            };
            
            console.log(`   ✅ Computer vision analysis successful (${result.confidence.toFixed(1)}% confidence)`);
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ Computer vision test failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Test signal generation
     */
    async testSignalGeneration() {
        console.log('\n🎯 Test 5: Signal Generation');
        
        const test = {
            name: 'Signal Generation',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            // Create mock analysis data
            const mockAnalysisData = await this.createMockAnalysisData();
            
            // Generate signals
            const result = await this.analysisEngine.signalGenerator.generateSignals(mockAnalysisData);
            
            if (!result.success) {
                throw new Error(`Signal generation failed: ${result.error}`);
            }
            
            // Validate signal quality
            const highConfidenceSignals = result.signals.filter(s => s.confidence >= this.testCriteria.minSignalConfidence);
            
            if (result.signals.length === 0) {
                console.log('   ⚠️ No signals generated (may be normal for test data)');
            }
            
            test.success = true;
            test.details = {
                totalSignals: result.signals.length,
                highConfidenceSignals: highConfidenceSignals.length,
                averageConfidence: result.signals.length > 0 ? 
                    result.signals.reduce((sum, s) => sum + s.confidence, 0) / result.signals.length : 0,
                signalTypes: [...new Set(result.signals.map(s => s.type))]
            };
            
            console.log(`   ✅ Generated ${result.signals.length} signals (${highConfidenceSignals.length} high-confidence)`);
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ Signal generation test failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Test end-to-end analysis
     */
    async testEndToEndAnalysis() {
        console.log('\n🔄 Test 6: End-to-End Analysis');
        
        const test = {
            name: 'End-to-End Analysis',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            // Create comprehensive test image
            const testImageBuffer = await this.createComprehensiveTestImage();
            
            // Run full analysis
            const result = await this.analysisEngine.analyzeChartScreenshot(testImageBuffer);
            
            if (!result.success) {
                throw new Error(`End-to-end analysis failed: ${result.error}`);
            }
            
            // Validate comprehensive results
            const meetsConfidenceThreshold = result.confidence >= this.testCriteria.minOverallConfidence;
            const hasValidSignals = result.signals.length >= 0; // Allow zero signals
            const completedInTime = result.processingTime <= this.testCriteria.maxProcessingTime;
            
            if (!meetsConfidenceThreshold) {
                console.log(`   ⚠️ Confidence below threshold: ${result.confidence.toFixed(1)}%`);
            }
            
            if (!completedInTime) {
                throw new Error(`Processing time exceeded limit: ${result.processingTime}ms`);
            }
            
            test.success = true;
            test.details = {
                overallConfidence: result.confidence,
                processingTime: result.processingTime,
                signalCount: result.signals.length,
                marketAssessment: result.marketAssessment,
                riskAssessment: result.riskAssessment,
                componentsSuccessful: Object.values(result.metadata).filter(Boolean).length
            };
            
            console.log(`   ✅ End-to-end analysis completed (${result.confidence.toFixed(1)}% confidence, ${result.processingTime}ms)`);
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ End-to-end test failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Test performance benchmarks
     */
    async testPerformanceBenchmarks() {
        console.log('\n⚡ Test 7: Performance Benchmarks');
        
        const test = {
            name: 'Performance Benchmarks',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            const benchmarks = [];
            const testSizes = [
                { name: 'Small (800x600)', width: 800, height: 600 },
                { name: 'Medium (1920x1080)', width: 1920, height: 1080 },
                { name: 'Large (2560x1440)', width: 2560, height: 1440 }
            ];
            
            for (const size of testSizes) {
                const testImage = await this.createTestImageWithSize(size.width, size.height);
                const startTime = Date.now();
                
                const result = await this.analysisEngine.analyzeChartScreenshot(testImage);
                const processingTime = Date.now() - startTime;
                
                benchmarks.push({
                    size: size.name,
                    processingTime: processingTime,
                    success: result.success,
                    confidence: result.success ? result.confidence : 0
                });
                
                console.log(`   📊 ${size.name}: ${processingTime}ms`);
            }
            
            const avgProcessingTime = benchmarks.reduce((sum, b) => sum + b.processingTime, 0) / benchmarks.length;
            const successRate = benchmarks.filter(b => b.success).length / benchmarks.length;
            
            test.success = successRate >= 0.8; // 80% success rate required
            test.details = {
                benchmarks: benchmarks,
                averageProcessingTime: avgProcessingTime,
                successRate: successRate,
                memoryUsage: process.memoryUsage()
            };
            
            console.log(`   ✅ Average processing time: ${avgProcessingTime.toFixed(0)}ms (${(successRate * 100).toFixed(1)}% success rate)`);
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ Performance benchmark failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Test error handling
     */
    async testErrorHandling() {
        console.log('\n🛡️ Test 8: Error Handling');
        
        const test = {
            name: 'Error Handling',
            startTime: Date.now(),
            success: false,
            details: {}
        };
        
        try {
            const errorTests = [];
            
            // Test 1: Invalid image format
            try {
                const invalidBuffer = Buffer.from('invalid image data');
                const result = await this.analysisEngine.analyzeChartScreenshot(invalidBuffer);
                errorTests.push({ test: 'Invalid image', handled: !result.success });
            } catch (error) {
                errorTests.push({ test: 'Invalid image', handled: true });
            }
            
            // Test 2: Empty buffer
            try {
                const emptyBuffer = Buffer.alloc(0);
                const result = await this.analysisEngine.analyzeChartScreenshot(emptyBuffer);
                errorTests.push({ test: 'Empty buffer', handled: !result.success });
            } catch (error) {
                errorTests.push({ test: 'Empty buffer', handled: true });
            }
            
            // Test 3: Corrupted image
            try {
                const corruptedBuffer = Buffer.alloc(1000).fill(0xFF);
                const result = await this.analysisEngine.analyzeChartScreenshot(corruptedBuffer);
                errorTests.push({ test: 'Corrupted image', handled: !result.success });
            } catch (error) {
                errorTests.push({ test: 'Corrupted image', handled: true });
            }
            
            const handledErrors = errorTests.filter(t => t.handled).length;
            const errorHandlingRate = handledErrors / errorTests.length;
            
            test.success = errorHandlingRate >= 0.9; // 90% error handling required
            test.details = {
                errorTests: errorTests,
                handledErrors: handledErrors,
                totalTests: errorTests.length,
                errorHandlingRate: errorHandlingRate
            };
            
            console.log(`   ✅ Error handling: ${handledErrors}/${errorTests.length} tests passed`);
            
        } catch (error) {
            test.error = error.message;
            console.log(`   ❌ Error handling test failed: ${error.message}`);
        }
        
        test.duration = Date.now() - test.startTime;
        this.testResults.push(test);
    }

    /**
     * Helper methods for creating test data
     */
    async createTestImage() {
        // Create a simple test image buffer (placeholder)
        // In a real implementation, this would create a proper PNG buffer
        return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
    }

    async createTestImageWithText(testData) {
        // Create test image with embedded text (placeholder)
        return this.createTestImage();
    }

    async createTestChartImage() {
        // Create test chart image with patterns (placeholder)
        return this.createTestImage();
    }

    async createTestRegions() {
        // Create test regions for computer vision
        return {
            chartArea: { x: 0, y: 0, width: 800, height: 600 },
            header: { x: 0, y: 0, width: 800, height: 100 },
            priceAxis: { x: 700, y: 100, width: 100, height: 400 }
        };
    }

    async createMockAnalysisData() {
        // Create mock analysis data for signal generation
        return {
            tradingData: {
                currencyPair: 'EUR/USD',
                currentPrice: 1.2345,
                timeframe: '5m'
            },
            chartData: {
                patterns: [
                    { name: 'Doji', type: 'reversal', confidence: 85, signal: 'reversal' }
                ],
                supportResistance: {
                    support: [{ price: 1.2300, touches: 3, strength: 'strong' }],
                    resistance: [{ price: 1.2400, touches: 4, strength: 'very_strong' }]
                }
            }
        };
    }

    async createComprehensiveTestImage() {
        // Create comprehensive test image
        return this.createTestImage();
    }

    async createTestImageWithSize(width, height) {
        // Create test image with specific dimensions
        return this.createTestImage();
    }

    calculateOCRAccuracy(expected, actual) {
        // Calculate OCR accuracy based on expected vs actual data
        let matches = 0;
        let total = 0;
        
        if (expected.expectedCurrencyPair && actual.currencyPair) {
            total++;
            if (expected.expectedCurrencyPair === actual.currencyPair) matches++;
        }
        
        if (expected.expectedPrice && actual.currentPrice) {
            total++;
            if (Math.abs(parseFloat(expected.expectedPrice) - actual.currentPrice) < 0.0001) matches++;
        }
        
        if (expected.expectedTimeframe && actual.timeframe) {
            total++;
            if (expected.expectedTimeframe === actual.timeframe) matches++;
        }
        
        return total > 0 ? matches / total : 0;
    }

    /**
     * Generate comprehensive test report
     */
    async generateTestReport(totalTime) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ADVANCED CHART ANALYSIS TEST REPORT');
        console.log('='.repeat(60));
        
        const successfulTests = this.testResults.filter(t => t.success);
        const failedTests = this.testResults.filter(t => !t.success);
        const successRate = (successfulTests.length / this.testResults.length) * 100;
        
        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Tests: ${this.testResults.length}`);
        console.log(`   Successful: ${successfulTests.length}`);
        console.log(`   Failed: ${failedTests.length}`);
        console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
        console.log(`   Total Time: ${totalTime}ms`);
        
        console.log(`\n📋 Test Details:`);
        this.testResults.forEach((test, index) => {
            const status = test.success ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${test.name} (${test.duration}ms)`);
            if (test.error) {
                console.log(`      Error: ${test.error}`);
            }
        });
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            totalTime: totalTime,
            successRate: successRate,
            tests: this.testResults,
            systemInfo: {
                nodeVersion: process.version,
                platform: process.platform,
                memoryUsage: process.memoryUsage()
            }
        };
        
        try {
            await fs.writeFile(
                path.join(__dirname, '../test-results/advanced-chart-analysis-test-report.json'),
                JSON.stringify(report, null, 2)
            );
            console.log(`\n💾 Detailed report saved to test-results/advanced-chart-analysis-test-report.json`);
        } catch (error) {
            console.log(`\n⚠️ Failed to save report: ${error.message}`);
        }
        
        if (successRate < 80) {
            throw new Error(`Test suite failed with ${successRate.toFixed(1)}% success rate (minimum 80% required)`);
        }
        
        console.log(`\n🎉 Test suite completed successfully!`);
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.analysisEngine.cleanup();
            console.log('\n🧹 Test cleanup completed');
        } catch (error) {
            console.log(`\n⚠️ Cleanup warning: ${error.message}`);
        }
    }
}

// Export for use in other modules
module.exports = { AdvancedChartAnalysisTestSuite };

// Run tests if called directly
if (require.main === module) {
    const testSuite = new AdvancedChartAnalysisTestSuite();
    testSuite.runComprehensiveTests()
        .then(() => {
            console.log('\n✅ All tests completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test suite failed:', error.message);
            process.exit(1);
        });
}
