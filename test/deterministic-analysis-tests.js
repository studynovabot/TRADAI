/**
 * 🧪 DETERMINISTIC ANALYSIS UNIT & INTEGRATION TESTS
 * 
 * Comprehensive test suite for the deterministic Gemini analysis pipeline.
 * Tests closed candle rule, timestamp validation, and signal accuracy.
 */

const fs = require('fs');
const path = require('path');
const DeterministicGeminiVisionService = require('../services/DeterministicGeminiVisionService');
const DeterministicPrompts = require('../lib/DeterministicPrompts');

class DeterministicAnalysisTests {
    constructor() {
        this.service = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        
        // Test data directory
        this.testDataDir = path.join(__dirname, 'test-data');
        this.ensureTestDataDirectory();
    }

    /**
     * Ensure test data directory exists
     */
    ensureTestDataDirectory() {
        if (!fs.existsSync(this.testDataDir)) {
            fs.mkdirSync(this.testDataDir, { recursive: true });
            console.log(`📁 Created test data directory: ${this.testDataDir}`);
        }
    }

    /**
     * Initialize the service for testing
     */
    async initializeService() {
        if (!this.service) {
            this.service = new DeterministicGeminiVisionService({
                temperature: 0.1,
                maxTokens: 512,
                timeout: 30000,
                debugMode: true,
                latencyThresholdMs: 3000,
                minConfidenceForScalping: 75
            });

            const result = await this.service.initialize();
            if (!result.success) {
                throw new Error(`Failed to initialize service: ${result.error}`);
            }
        }
        return this.service;
    }

    /**
     * Run a single test
     */
    async runTest(testName, testFunction) {
        this.testResults.total++;
        console.log(`\n🧪 Running test: ${testName}`);
        
        try {
            const startTime = Date.now();
            await testFunction();
            const duration = Date.now() - startTime;
            
            this.testResults.passed++;
            this.testResults.details.push({
                name: testName,
                status: 'PASSED',
                duration: duration,
                error: null
            });
            
            console.log(`✅ Test passed: ${testName} (${duration}ms)`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.details.push({
                name: testName,
                status: 'FAILED',
                duration: 0,
                error: error.message
            });
            
            console.error(`❌ Test failed: ${testName} - ${error.message}`);
        }
    }

    /**
     * Test 1: Service Initialization
     */
    async testServiceInitialization() {
        const service = new DeterministicGeminiVisionService({
            temperature: 0.1,
            debugMode: true
        });

        const result = await service.initialize();
        
        if (!result.success) {
            throw new Error(`Service initialization failed: ${result.error}`);
        }

        // Verify service properties
        if (service.config.temperature !== 0.1) {
            throw new Error('Temperature not set correctly');
        }

        if (!service.isInitialized) {
            throw new Error('Service not marked as initialized');
        }
    }

    /**
     * Test 2: Prompt Generation
     */
    async testPromptGeneration() {
        const metadata = {
            pair: 'USD/EUR',
            timeframe: '1m',
            screenshot_timestamp_iso: '2024-01-15T10:30:00.000Z',
            platform_time_to_close_secs: 15
        };

        const service = await this.initializeService();
        const { systemPrompt, userPrompt } = service.createDeterministicPrompt(metadata);

        // Verify system prompt
        if (!systemPrompt.includes('deterministically')) {
            throw new Error('System prompt missing deterministic instruction');
        }

        if (!systemPrompt.includes('JSON')) {
            throw new Error('System prompt missing JSON requirement');
        }

        // Verify user prompt
        if (!userPrompt.includes('analyzed_candle_timestamp')) {
            throw new Error('User prompt missing timestamp requirement');
        }

        if (!userPrompt.includes('closed candle') && !userPrompt.includes('CLOSED candle')) {
            throw new Error('User prompt missing closed candle rule');
        }

        if (!userPrompt.includes(metadata.timeframe)) {
            throw new Error('User prompt missing timeframe');
        }
    }

    /**
     * Test 3: Timestamp Calculation
     */
    async testTimestampCalculation() {
        const service = await this.initializeService();

        // Test with time-to-close provided
        const metadata1 = {
            screenshot_timestamp_iso: '2024-01-15T10:30:45.000Z',
            platform_time_to_close_secs: 15,
            timeframe: '1m'
        };

        const timestamp1 = service.determineAnalyzedCandleTimestamp(metadata1);
        const expected1 = '2024-01-15T10:30:30.000Z';
        
        if (timestamp1 !== expected1) {
            throw new Error(`Timestamp calculation failed. Expected: ${expected1}, Got: ${timestamp1}`);
        }

        // Test without time-to-close (fallback)
        const metadata2 = {
            screenshot_timestamp_iso: '2024-01-15T10:30:45.000Z',
            timeframe: '5m'
        };

        const timestamp2 = service.determineAnalyzedCandleTimestamp(metadata2);
        
        // Should round down to nearest 5-minute interval
        if (!timestamp2.includes('10:30:00') && !timestamp2.includes('10:25:00')) {
            throw new Error(`Fallback timestamp calculation failed: ${timestamp2}`);
        }
    }

    /**
     * Test 4: Timeframe Conversion
     */
    async testTimeframeConversion() {
        const service = await this.initializeService();

        const testCases = [
            { timeframe: '1m', expected: 60 * 1000 },
            { timeframe: '3m', expected: 3 * 60 * 1000 },
            { timeframe: '5m', expected: 5 * 60 * 1000 },
            { timeframe: '15m', expected: 15 * 60 * 1000 },
            { timeframe: '1h', expected: 60 * 60 * 1000 },
            { timeframe: '1d', expected: 24 * 60 * 60 * 1000 }
        ];

        for (const testCase of testCases) {
            const result = service.getTimeframeInMs(testCase.timeframe);
            if (result !== testCase.expected) {
                throw new Error(`Timeframe conversion failed for ${testCase.timeframe}. Expected: ${testCase.expected}, Got: ${result}`);
            }
        }
    }

    /**
     * Test 5: Response Schema Validation
     */
    async testResponseSchemaValidation() {
        const service = await this.initializeService();

        // Valid response
        const validResponse = {
            pair: 'USD/EUR',
            timeframe: '1m',
            analyzed_candle_timestamp: '2024-01-15T10:30:00.000Z',
            signal: 'BUY',
            confidence: 85
        };

        const metadata = {
            screenshot_timestamp_iso: '2024-01-15T10:30:45.000Z',
            timeframe: '1m'
        };

        try {
            const result = service.parseAndValidateResponse(JSON.stringify(validResponse), metadata, 1000);
            if (result.signal !== 'BUY' || result.confidence !== 85) {
                throw new Error('Valid response validation failed');
            }
        } catch (error) {
            throw new Error(`Valid response rejected: ${error.message}`);
        }

        // Invalid response - missing required field
        const invalidResponse = {
            pair: 'USD/EUR',
            timeframe: '1m'
            // Missing signal and confidence
        };

        try {
            service.parseAndValidateResponse(JSON.stringify(invalidResponse), metadata, 1000);
            throw new Error('Invalid response was accepted');
        } catch (error) {
            if (!error.message.includes('Missing required field')) {
                throw new Error(`Wrong error for invalid response: ${error.message}`);
            }
        }
    }

    /**
     * Test 6: Sanity Checks and Overrides
     */
    async testSanityChecks() {
        const service = await this.initializeService();

        // Test high latency override
        const highLatencyAnalysis = {
            signal: 'BUY',
            confidence: 90,
            timeframe: '1m'
        };

        const result1 = service.applySanityChecks(highLatencyAnalysis, 5000); // High latency
        
        if (result1.confidence >= 90) {
            throw new Error('High latency should reduce confidence');
        }

        // Test very high latency forcing HOLD
        const result2 = service.applySanityChecks(highLatencyAnalysis, 8000); // Very high latency
        
        if (result2.signal !== 'HOLD') {
            throw new Error('Very high latency should force HOLD signal');
        }

        // Test scalping confidence threshold
        const lowConfidenceAnalysis = {
            signal: 'BUY',
            confidence: 60,
            timeframe: '1m'
        };

        const result3 = service.applySanityChecks(lowConfidenceAnalysis, 1000);
        
        if (result3.signal !== 'HOLD') {
            throw new Error('Low confidence scalping signal should be changed to HOLD');
        }
    }

    /**
     * Test 7: Performance Metrics Tracking
     */
    async testPerformanceMetrics() {
        const service = await this.initializeService();

        // Reset metrics
        service.resetPerformanceMetrics();

        const initialMetrics = service.getPerformanceMetrics();
        if (initialMetrics.totalRequests !== 0) {
            throw new Error('Metrics not reset properly');
        }

        // Simulate some analysis updates
        const mockAnalysis1 = { signal: 'BUY', confidence: 85 };
        const mockAnalysis2 = { signal: 'SELL', confidence: 75 };
        const mockAnalysis3 = { signal: 'HOLD', confidence: 45 };

        service.updatePerformanceMetrics(mockAnalysis1, 1500);
        service.updatePerformanceMetrics(mockAnalysis2, 2500);
        service.updatePerformanceMetrics(mockAnalysis3, 4500); // High latency

        const finalMetrics = service.getPerformanceMetrics();

        if (finalMetrics.signalCounts.BUY !== 1) {
            throw new Error('BUY signal count incorrect');
        }

        if (finalMetrics.signalCounts.SELL !== 1) {
            throw new Error('SELL signal count incorrect');
        }

        if (finalMetrics.signalCounts.HOLD !== 1) {
            throw new Error('HOLD signal count incorrect');
        }

        if (finalMetrics.latencyExceededCount !== 1) {
            throw new Error('Latency exceeded count incorrect');
        }

        // Check both service and logger metrics
        if (finalMetrics.confidenceDistribution && finalMetrics.confidenceDistribution['high (80-100)'] !== 1) {
            throw new Error(`High confidence distribution incorrect: expected 1, got ${finalMetrics.confidenceDistribution['high (80-100)']}`);
        }
    }

    /**
     * Test 8: Image Preprocessing
     */
    async testImagePreprocessing() {
        const service = await this.initializeService();

        // Create a simple test image buffer (1x1 PNG)
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
            0x54, 0x08, 0x99, 0x01, 0x01, 0x01, 0x00, 0x00, // image data
            0xFE, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 
            0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, // IEND chunk
            0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        // Test MIME type detection
        const mimeType = service.detectMimeType(testImageBuffer);
        if (mimeType !== 'image/png') {
            throw new Error(`MIME type detection failed. Expected: image/png, Got: ${mimeType}`);
        }

        // Test preprocessing (should not throw error)
        try {
            const processedBuffer = await service.preprocessImage(testImageBuffer);
            if (!Buffer.isBuffer(processedBuffer)) {
                throw new Error('Preprocessing should return a buffer');
            }
        } catch (error) {
            // Preprocessing might fail with minimal test image, but should handle gracefully
            if (!error.message.includes('preprocessing failed')) {
                throw error;
            }
        }
    }

    /**
     * Test 9: Prompt Module Integration
     */
    async testPromptModuleIntegration() {
        // Test system prompt
        const systemPrompt = DeterministicPrompts.getSystemPrompt();
        if (!systemPrompt.includes('deterministically')) {
            throw new Error('System prompt missing deterministic instruction');
        }

        // Test analysis prompt
        const metadata = {
            pair: 'USD/EUR',
            timeframe: '5m',
            screenshot_timestamp_iso: '2024-01-15T10:30:00.000Z'
        };

        const analysisPrompt = DeterministicPrompts.getAnalysisPrompt(metadata, '2024-01-15T10:25:00.000Z');
        
        if (!analysisPrompt.includes('5m scalping')) {
            throw new Error('Analysis prompt missing timeframe-specific instructions');
        }

        if (!analysisPrompt.includes('2024-01-15T10:25:00.000Z')) {
            throw new Error('Analysis prompt missing analyzed candle timestamp');
        }

        // Test prompt configuration
        const config = DeterministicPrompts.getPromptConfig();
        if (config.temperature !== 0.1) {
            throw new Error('Prompt config temperature incorrect');
        }

        if (config.responseMimeType !== 'application/json') {
            throw new Error('Prompt config response type incorrect');
        }
    }

    /**
     * Test 10: Error Handling and Recovery
     */
    async testErrorHandling() {
        const service = await this.initializeService();

        // Test invalid JSON response
        try {
            service.parseAndValidateResponse('invalid json', {}, 1000);
            throw new Error('Invalid JSON should throw error');
        } catch (error) {
            if (!error.message.includes('Invalid JSON response')) {
                throw new Error(`Wrong error for invalid JSON: ${error.message}`);
            }
        }

        // Test invalid signal value
        const invalidSignalResponse = {
            pair: 'USD/EUR',
            timeframe: '1m',
            analyzed_candle_timestamp: '2024-01-15T10:30:00.000Z',
            signal: 'INVALID',
            confidence: 85
        };

        try {
            service.parseAndValidateResponse(JSON.stringify(invalidSignalResponse), {}, 1000);
            throw new Error('Invalid signal should throw error');
        } catch (error) {
            if (!error.message.includes('Invalid signal')) {
                throw new Error(`Wrong error for invalid signal: ${error.message}`);
            }
        }
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting Deterministic Analysis Test Suite...\n');

        const tests = [
            ['Service Initialization', () => this.testServiceInitialization()],
            ['Prompt Generation', () => this.testPromptGeneration()],
            ['Timestamp Calculation', () => this.testTimestampCalculation()],
            ['Timeframe Conversion', () => this.testTimeframeConversion()],
            ['Response Schema Validation', () => this.testResponseSchemaValidation()],
            ['Sanity Checks and Overrides', () => this.testSanityChecks()],
            ['Performance Metrics Tracking', () => this.testPerformanceMetrics()],
            ['Image Preprocessing', () => this.testImagePreprocessing()],
            ['Prompt Module Integration', () => this.testPromptModuleIntegration()],
            ['Error Handling and Recovery', () => this.testErrorHandling()]
        ];

        for (const [testName, testFunction] of tests) {
            await this.runTest(testName, testFunction);
        }

        this.printTestResults();
        return this.testResults;
    }

    /**
     * Print test results summary
     */
    printTestResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 DETERMINISTIC ANALYSIS TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed} ✅`);
        console.log(`Failed: ${this.testResults.failed} ❌`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
        
        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.details
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error}`);
                });
        }

        console.log('\n✅ Passed Tests:');
        this.testResults.details
            .filter(test => test.status === 'PASSED')
            .forEach(test => {
                console.log(`  - ${test.name} (${test.duration}ms)`);
            });

        console.log('='.repeat(60));
    }

    /**
     * Save test results to file
     */
    saveTestResults() {
        const resultsFile = path.join(this.testDataDir, `test-results-${Date.now()}.json`);
        const results = {
            ...this.testResults,
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };

        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`📁 Test results saved to: ${resultsFile}`);
        return resultsFile;
    }
}

// Export for use in other modules
module.exports = DeterministicAnalysisTests;

// Run tests if this file is executed directly
if (require.main === module) {
    (async () => {
        const testSuite = new DeterministicAnalysisTests();
        try {
            await testSuite.runAllTests();
            testSuite.saveTestResults();
            
            // Exit with appropriate code
            process.exit(testSuite.testResults.failed > 0 ? 1 : 0);
        } catch (error) {
            console.error('❌ Test suite execution failed:', error);
            process.exit(1);
        }
    })();
}