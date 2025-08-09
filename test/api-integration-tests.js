/**
 * 🧪 API INTEGRATION TESTS FOR DETERMINISTIC ANALYSIS
 * 
 * Tests the /api/analyze and /api/analyze-base64 endpoints with real requests.
 * Validates the exact JSON schema and response format.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

class APIIntegrationTests {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
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
     * Create a minimal test image (1x1 PNG)
     */
    createTestImage() {
        return Buffer.from([
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
    }

    /**
     * Validate response schema
     */
    validateResponseSchema(response) {
        const requiredFields = [
            'pair', 'timeframe', 'analyzed_candle_timestamp', 'screenshot_timestamp',
            'pipeline_latency_ms', 'ohlc', 'indicators', 'signal', 'confidence',
            'factor_scores', 'next_3_candles', 'support_levels', 'resistance_levels',
            'raw_ocr', 'notes'
        ];

        for (const field of requiredFields) {
            if (response[field] === undefined) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate OHLC structure
        const ohlcFields = ['open', 'high', 'low', 'close'];
        for (const field of ohlcFields) {
            if (typeof response.ohlc[field] !== 'number') {
                throw new Error(`OHLC field ${field} must be a number`);
            }
        }

        // Validate indicators structure
        const indicatorFields = ['EMA5', 'EMA20', 'Bollinger_mid', 'Bollinger_upper', 'Bollinger_lower', 'Stochastic_K', 'Stochastic_D'];
        for (const field of indicatorFields) {
            if (typeof response.indicators[field] !== 'number') {
                throw new Error(`Indicator field ${field} must be a number`);
            }
        }

        // Validate signal
        if (!['BUY', 'SELL', 'HOLD'].includes(response.signal)) {
            throw new Error(`Invalid signal: ${response.signal}`);
        }

        // Validate confidence
        if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 100) {
            throw new Error(`Invalid confidence: ${response.confidence}`);
        }

        // Validate factor_scores
        if (!Array.isArray(response.factor_scores) || response.factor_scores.length !== 5) {
            throw new Error('factor_scores must be an array of 5 elements');
        }

        const expectedFactors = ['EMA_crossover', 'Bollinger_position', 'Stochastic', 'Candle_body_wick', 'Volume_or_activity'];
        for (let i = 0; i < response.factor_scores.length; i++) {
            const factor = response.factor_scores[i];
            if (!expectedFactors.includes(factor.factor)) {
                throw new Error(`Invalid factor: ${factor.factor}`);
            }
            if (typeof factor.score !== 'number' || factor.score < -100 || factor.score > 100) {
                throw new Error(`Invalid factor score: ${factor.score}`);
            }
            if (typeof factor.explanation !== 'string') {
                throw new Error(`Factor explanation must be a string`);
            }
        }

        // Validate next_3_candles
        if (!Array.isArray(response.next_3_candles) || response.next_3_candles.length !== 3) {
            throw new Error('next_3_candles must be an array of 3 elements');
        }

        for (let i = 0; i < response.next_3_candles.length; i++) {
            const candle = response.next_3_candles[i];
            if (candle.candle_index !== i + 1) {
                throw new Error(`Invalid candle_index: ${candle.candle_index}`);
            }
            if (!['UP', 'DOWN', 'NEUTRAL'].includes(candle.direction)) {
                throw new Error(`Invalid candle direction: ${candle.direction}`);
            }
            if (typeof candle.probability !== 'number' || candle.probability < 0 || candle.probability > 100) {
                throw new Error(`Invalid candle probability: ${candle.probability}`);
            }
        }

        // Validate arrays
        if (!Array.isArray(response.support_levels)) {
            throw new Error('support_levels must be an array');
        }
        if (!Array.isArray(response.resistance_levels)) {
            throw new Error('resistance_levels must be an array');
        }

        // Validate raw_ocr
        if (typeof response.raw_ocr.time_axis_reading !== 'string') {
            throw new Error('raw_ocr.time_axis_reading must be a string');
        }
        if (typeof response.raw_ocr.numeric_price_reading !== 'string') {
            throw new Error('raw_ocr.numeric_price_reading must be a string');
        }

        // Validate timestamps
        try {
            new Date(response.analyzed_candle_timestamp);
            new Date(response.screenshot_timestamp);
        } catch (error) {
            throw new Error('Invalid timestamp format');
        }

        return true;
    }

    /**
     * Run a single test
     */
    async runTest(testName, testFunction) {
        this.testResults.total++;
        console.log(`\n🧪 Running API test: ${testName}`);
        
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
            
            console.log(`✅ API test passed: ${testName} (${duration}ms)`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.details.push({
                name: testName,
                status: 'FAILED',
                duration: 0,
                error: error.message
            });
            
            console.error(`❌ API test failed: ${testName} - ${error.message}`);
        }
    }

    /**
     * Test 1: /api/analyze endpoint with form data
     */
    async testAnalyzeEndpoint() {
        const testImage = this.createTestImage();
        const form = new FormData();
        
        form.append('image', testImage, {
            filename: 'test-chart.png',
            contentType: 'image/png'
        });
        form.append('pair', 'USD/EUR');
        form.append('timeframe', '1m');
        form.append('screenshot_timestamp_iso', new Date().toISOString());
        form.append('platform_time_to_close_secs', '15');

        const response = await axios.post(`${this.baseUrl}/api/analyze`, form, {
            headers: {
                ...form.getHeaders(),
                'Content-Length': form.getLengthSync()
            },
            timeout: 60000
        });

        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        // Validate response schema
        this.validateResponseSchema(response.data);

        // Validate specific fields
        if (response.data.pair !== 'USD/EUR') {
            throw new Error(`Expected pair USD/EUR, got ${response.data.pair}`);
        }

        if (response.data.timeframe !== '1m') {
            throw new Error(`Expected timeframe 1m, got ${response.data.timeframe}`);
        }

        if (typeof response.data.pipeline_latency_ms !== 'number') {
            throw new Error('pipeline_latency_ms must be a number');
        }
    }

    /**
     * Test 2: /api/analyze-base64 endpoint with JSON payload
     */
    async testAnalyzeBase64Endpoint() {
        const testImage = this.createTestImage();
        const base64Image = testImage.toString('base64');

        const payload = {
            image: base64Image,
            metadata: {
                pair: 'USD/JPY',
                timeframe: '3m',
                screenshot_timestamp_iso: new Date().toISOString(),
                platform_time_to_close_secs: 30,
                indicator_color_map: {
                    EMA5: '#FFD700',
                    EMA20: '#C58BFF',
                    BOLLINGER: '#00C2A5'
                }
            }
        };

        const response = await axios.post(`${this.baseUrl}/api/analyze-base64`, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        // Validate response schema
        this.validateResponseSchema(response.data);

        // Validate specific fields
        if (response.data.pair !== 'USD/JPY') {
            throw new Error(`Expected pair USD/JPY, got ${response.data.pair}`);
        }

        if (response.data.timeframe !== '3m') {
            throw new Error(`Expected timeframe 3m, got ${response.data.timeframe}`);
        }
    }

    /**
     * Test 3: Error handling - missing image
     */
    async testMissingImageError() {
        const form = new FormData();
        form.append('pair', 'USD/EUR');
        form.append('timeframe', '1m');

        try {
            await axios.post(`${this.baseUrl}/api/analyze`, form, {
                headers: form.getHeaders(),
                timeout: 30000
            });
            throw new Error('Expected error for missing image');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                const errorData = error.response.data;
                if (!errorData.error.includes('No image file provided')) {
                    throw new Error(`Wrong error message: ${errorData.error}`);
                }
            } else {
                throw new Error(`Expected 400 status, got ${error.response?.status || 'network error'}`);
            }
        }
    }

    /**
     * Test 4: Error handling - missing metadata (base64)
     */
    async testMissingMetadataError() {
        const testImage = this.createTestImage();
        const base64Image = testImage.toString('base64');

        const payload = {
            image: base64Image
            // Missing metadata
        };

        try {
            await axios.post(`${this.baseUrl}/api/analyze-base64`, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            throw new Error('Expected error for missing metadata');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                const errorData = error.response.data;
                if (!errorData.error.includes('No metadata provided')) {
                    throw new Error(`Wrong error message: ${errorData.error}`);
                }
            } else {
                throw new Error(`Expected 400 status, got ${error.response?.status || 'network error'}`);
            }
        }
    }

    /**
     * Test 5: Invalid file type
     */
    async testInvalidFileType() {
        const form = new FormData();
        
        form.append('image', Buffer.from('not an image'), {
            filename: 'test.txt',
            contentType: 'text/plain'
        });
        form.append('pair', 'USD/EUR');
        form.append('timeframe', '1m');

        try {
            await axios.post(`${this.baseUrl}/api/analyze`, form, {
                headers: form.getHeaders(),
                timeout: 30000
            });
            throw new Error('Expected error for invalid file type');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                const errorData = error.response.data;
                if (!errorData.error.includes('Unsupported file type')) {
                    throw new Error(`Wrong error message: ${errorData.error}`);
                }
            } else {
                throw new Error(`Expected 400 status, got ${error.response?.status || 'network error'}`);
            }
        }
    }

    /**
     * Test 6: Invalid base64 data
     */
    async testInvalidBase64() {
        const payload = {
            image: 'invalid-base64-data',
            metadata: {
                pair: 'USD/EUR',
                timeframe: '1m',
                screenshot_timestamp_iso: new Date().toISOString()
            }
        };

        try {
            await axios.post(`${this.baseUrl}/api/analyze-base64`, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            throw new Error('Expected error for invalid base64');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                const errorData = error.response.data;
                if (!errorData.error.includes('Invalid base64 image data')) {
                    throw new Error(`Wrong error message: ${errorData.error}`);
                }
            } else {
                throw new Error(`Expected 400 status, got ${error.response?.status || 'network error'}`);
            }
        }
    }

    /**
     * Test 7: Method not allowed
     */
    async testMethodNotAllowed() {
        try {
            await axios.get(`${this.baseUrl}/api/analyze`);
            throw new Error('Expected error for GET method');
        } catch (error) {
            if (error.response && error.response.status === 405) {
                const errorData = error.response.data;
                if (!errorData.error.includes('Method not allowed')) {
                    throw new Error(`Wrong error message: ${errorData.error}`);
                }
            } else {
                throw new Error(`Expected 405 status, got ${error.response?.status || 'network error'}`);
            }
        }
    }

    /**
     * Test 8: CORS headers
     */
    async testCORSHeaders() {
        try {
            const response = await axios.options(`${this.baseUrl}/api/analyze`);
            
            if (response.status !== 200) {
                throw new Error(`Expected status 200 for OPTIONS, got ${response.status}`);
            }

            const headers = response.headers;
            if (!headers['access-control-allow-origin']) {
                throw new Error('Missing CORS origin header');
            }

            if (!headers['access-control-allow-methods']) {
                throw new Error('Missing CORS methods header');
            }

        } catch (error) {
            if (error.response) {
                throw error;
            } else {
                throw new Error(`CORS test failed: ${error.message}`);
            }
        }
    }

    /**
     * Test 9: Response time validation
     */
    async testResponseTime() {
        const testImage = this.createTestImage();
        const form = new FormData();
        
        form.append('image', testImage, {
            filename: 'test-chart.png',
            contentType: 'image/png'
        });
        form.append('pair', 'USD/EUR');
        form.append('timeframe', '5m');
        form.append('screenshot_timestamp_iso', new Date().toISOString());

        const startTime = Date.now();
        const response = await axios.post(`${this.baseUrl}/api/analyze`, form, {
            headers: form.getHeaders(),
            timeout: 60000
        });
        const responseTime = Date.now() - startTime;

        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        // Validate that pipeline_latency_ms is reasonable
        const pipelineLatency = response.data.pipeline_latency_ms;
        if (pipelineLatency > responseTime + 1000) { // Allow 1s tolerance
            throw new Error(`Pipeline latency ${pipelineLatency}ms exceeds response time ${responseTime}ms`);
        }

        console.log(`📊 Response time: ${responseTime}ms, Pipeline latency: ${pipelineLatency}ms`);
    }

    /**
     * Test 10: Timestamp validation
     */
    async testTimestampValidation() {
        const testImage = this.createTestImage();
        const screenshotTime = new Date();
        const base64Image = testImage.toString('base64');

        const payload = {
            image: base64Image,
            metadata: {
                pair: 'USD/EUR',
                timeframe: '1m',
                screenshot_timestamp_iso: screenshotTime.toISOString(),
                platform_time_to_close_secs: 15
            }
        };

        const response = await axios.post(`${this.baseUrl}/api/analyze-base64`, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        if (response.status !== 200) {
            throw new Error(`Expected status 200, got ${response.status}`);
        }

        // Validate timestamp alignment
        const analyzedTimestamp = new Date(response.data.analyzed_candle_timestamp);
        const screenshotTimestamp = new Date(response.data.screenshot_timestamp);

        // Analyzed candle should be before screenshot
        if (analyzedTimestamp >= screenshotTimestamp) {
            throw new Error('Analyzed candle timestamp should be before screenshot timestamp');
        }

        // Should be exactly 15 seconds before (based on platform_time_to_close_secs)
        const timeDiff = screenshotTimestamp.getTime() - analyzedTimestamp.getTime();
        if (Math.abs(timeDiff - 15000) > 1000) { // Allow 1s tolerance
            throw new Error(`Expected 15s difference, got ${timeDiff}ms`);
        }

        console.log(`📅 Timestamp validation passed: ${timeDiff}ms difference`);
    }

    /**
     * Run all API integration tests
     */
    async runAllTests() {
        console.log('🚀 Starting API Integration Test Suite...\n');
        console.log(`🌐 Testing against: ${this.baseUrl}\n`);

        const tests = [
            ['Analyze Endpoint (Form Data)', () => this.testAnalyzeEndpoint()],
            ['Analyze Base64 Endpoint (JSON)', () => this.testAnalyzeBase64Endpoint()],
            ['Missing Image Error', () => this.testMissingImageError()],
            ['Missing Metadata Error', () => this.testMissingMetadataError()],
            ['Invalid File Type', () => this.testInvalidFileType()],
            ['Invalid Base64 Data', () => this.testInvalidBase64()],
            ['Method Not Allowed', () => this.testMethodNotAllowed()],
            ['CORS Headers', () => this.testCORSHeaders()],
            ['Response Time Validation', () => this.testResponseTime()],
            ['Timestamp Validation', () => this.testTimestampValidation()]
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
        console.log('📊 API INTEGRATION TEST RESULTS');
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
        const resultsFile = path.join(this.testDataDir, `api-test-results-${Date.now()}.json`);
        const results = {
            ...this.testResults,
            baseUrl: this.baseUrl,
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };

        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
        console.log(`📁 API test results saved to: ${resultsFile}`);
        return resultsFile;
    }
}

// Export for use in other modules
module.exports = APIIntegrationTests;

// Run tests if this file is executed directly
if (require.main === module) {
    (async () => {
        const baseUrl = process.argv[2] || 'http://localhost:3000';
        const testSuite = new APIIntegrationTests(baseUrl);
        
        try {
            await testSuite.runAllTests();
            testSuite.saveTestResults();
            
            // Exit with appropriate code
            process.exit(testSuite.testResults.failed > 0 ? 1 : 0);
        } catch (error) {
            console.error('❌ API test suite execution failed:', error);
            process.exit(1);
        }
    })();
}