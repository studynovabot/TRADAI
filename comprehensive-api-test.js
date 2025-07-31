/**
 * Comprehensive TRADAI Gemini Vision API Testing Script
 * Tests production deployment with real trading screenshots
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Production API Configuration
const PRODUCTION_URL = 'https://tradai-8bnxxvuls-ranveer-singh-rajputs-projects.vercel.app';
const API_ENDPOINT = `${PRODUCTION_URL}/api/gemini-vision-signal`;

// Test Configuration
const SCREENSHOT_DIRS = {
    '5m': 'C:\\Users\\thaku\\Pictures\\trading ss\\5m',
    '3m': 'C:\\Users\\thaku\\Pictures\\trading ss\\3m',
    '1m': 'C:\\Users\\thaku\\Pictures\\trading ss\\1m'
};

// Expected screenshots for 5m timeframe
const PRIORITY_SCREENSHOTS = ['usdinr.png', 'usdbdt.png', 'usdbrl.png', 'usdtry.png'];

class ComprehensiveAPITester {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
        this.testCount = 0;
        this.successCount = 0;
        this.failureCount = 0;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        console.log(logMessage);
    }

    async testHealthEndpoint() {
        this.log('🏥 Testing production health endpoint...', 'info');
        
        try {
            const response = await fetch(`${PRODUCTION_URL}/api/health`);
            const data = await response.json();
            
            if (response.ok && data.status === 'OK') {
                this.log('✅ Health endpoint: HEALTHY', 'success');
                this.log(`   Gemini Vision: ${data.services.geminiVision.status}`, 'info');
                this.log(`   Technical Analysis: ${data.services.technicalAnalysis.status}`, 'info');
                return true;
            } else {
                this.log(`❌ Health endpoint failed: ${data.message}`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`❌ Health endpoint error: ${error.message}`, 'error');
            return false;
        }
    }

    async getAvailableScreenshots(timeframe) {
        const dir = SCREENSHOT_DIRS[timeframe];
        
        if (!fs.existsSync(dir)) {
            this.log(`❌ Directory not found: ${dir}`, 'error');
            return [];
        }

        const files = fs.readdirSync(dir).filter(file => 
            file.toLowerCase().endsWith('.png') || 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.jpeg')
        );

        this.log(`📁 Found ${files.length} images in ${timeframe} directory`, 'info');
        return files.map(file => path.join(dir, file));
    }

    async testSingleScreenshot(imagePath, timeframe, expectedAsset = null) {
        const fileName = path.basename(imagePath);
        this.testCount++;
        
        this.log(`\n🔍 Testing ${this.testCount}: ${fileName} (${timeframe})`, 'info');
        
        if (!fs.existsSync(imagePath)) {
            this.log(`❌ File not found: ${imagePath}`, 'error');
            this.failureCount++;
            return null;
        }

        const startTime = Date.now();
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('image', fs.createReadStream(imagePath));
            
            this.log('📤 Uploading image to production API...', 'info');
            
            // Make API call
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders()
            });

            const processingTime = Date.now() - startTime;
            this.log(`⏱️  Processing time: ${processingTime}ms (${(processingTime/1000).toFixed(1)}s)`, 'info');

            if (!response.ok) {
                const errorText = await response.text();
                this.log(`❌ API request failed: ${response.status} - ${errorText}`, 'error');
                this.failureCount++;
                
                this.testResults.push({
                    fileName,
                    timeframe,
                    success: false,
                    processingTime,
                    error: `HTTP ${response.status}: ${errorText}`,
                    timestamp: new Date().toISOString()
                });
                
                return null;
            }

            const result = await response.json();
            
            if (result.success) {
                this.log('✅ API call successful!', 'success');
                this.successCount++;
                
                const qualityScore = this.validateAnalysisQuality(result, processingTime, fileName);
                
                this.testResults.push({
                    fileName,
                    timeframe,
                    success: true,
                    processingTime,
                    qualityScore,
                    analysis: result.analysis,
                    timestamp: new Date().toISOString(),
                    expectedAsset,
                    detectedAsset: result.analysis.detectedAsset,
                    detectedTimeframe: result.analysis.detectedTimeframe
                });
                
                return result;
            } else {
                this.log(`❌ API returned error: ${result.error}`, 'error');
                this.failureCount++;
                
                this.testResults.push({
                    fileName,
                    timeframe,
                    success: false,
                    processingTime,
                    error: result.error,
                    timestamp: new Date().toISOString()
                });
                
                return null;
            }
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.log(`❌ Test failed: ${error.message}`, 'error');
            this.failureCount++;
            
            this.testResults.push({
                fileName,
                timeframe,
                success: false,
                processingTime,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            return null;
        }
    }

    validateAnalysisQuality(result, processingTime, fileName) {
        this.log(`📊 Validating analysis quality for ${fileName}...`, 'info');
        
        const analysis = result.analysis;
        let score = 0;
        let maxScore = 8;
        let issues = [];

        // Processing time check (< 60 seconds)
        if (processingTime < 60000) {
            score++;
            this.log('   ✅ Processing time under 60 seconds', 'success');
        } else {
            issues.push('Processing time exceeded 60 seconds');
            this.log('   ❌ Processing time exceeded 60 seconds', 'error');
        }

        // Overall confidence check (≥ 70%)
        if (analysis.overallConfidence >= 70) {
            score++;
            this.log(`   ✅ Overall confidence: ${analysis.overallConfidence}%`, 'success');
        } else {
            issues.push(`Low overall confidence: ${analysis.overallConfidence}%`);
            this.log(`   ❌ Overall confidence too low: ${analysis.overallConfidence}%`, 'error');
        }

        // Next 3 candle predictions check
        if (analysis.predictions && analysis.predictions.length === 3) {
            score++;
            this.log('   ✅ Next 3 candle predictions provided', 'success');
            
            let allPredictionsValid = true;
            analysis.predictions.forEach((pred, index) => {
                if (pred.confidence >= 70) {
                    this.log(`      Candle ${pred.candle}: ${pred.direction} (${pred.confidence}%)`, 'info');
                } else {
                    allPredictionsValid = false;
                    this.log(`      ⚠️  Candle ${pred.candle}: Low confidence ${pred.confidence}%`, 'warning');
                }
            });
            
            if (allPredictionsValid) score++;
        } else {
            issues.push('Missing or incomplete candle predictions');
            this.log('   ❌ Missing or incomplete candle predictions', 'error');
        }

        // Trading signal check
        if (analysis.tradingSignal && analysis.tradingSignal.action && analysis.tradingSignal.confidence >= 70) {
            score++;
            this.log(`   ✅ Trading signal: ${analysis.tradingSignal.action} (${analysis.tradingSignal.confidence}%)`, 'success');
        } else {
            issues.push('Missing or low-confidence trading signal');
            this.log('   ❌ Missing or low-confidence trading signal', 'error');
        }

        // Technical indicators check
        if (analysis.technicalIndicators && Object.keys(analysis.technicalIndicators).length > 0) {
            score++;
            this.log('   ✅ Technical indicators provided', 'success');
        } else {
            issues.push('Missing technical indicators');
            this.log('   ❌ Missing technical indicators', 'error');
        }

        // Support/resistance levels check
        if (analysis.supportLevels && analysis.resistanceLevels) {
            score++;
            this.log('   ✅ Support and resistance levels identified', 'success');
        } else {
            issues.push('Missing support/resistance levels');
            this.log('   ❌ Missing support/resistance levels', 'error');
        }

        // Asset detection check
        if (analysis.detectedAsset && analysis.detectedAsset !== 'Unknown') {
            score++;
            this.log(`   ✅ Asset detected: ${analysis.detectedAsset}`, 'success');
        } else {
            issues.push('Asset not detected');
            this.log('   ⚠️  Asset not detected or unknown', 'warning');
        }

        // Timeframe detection check
        if (analysis.detectedTimeframe && analysis.detectedTimeframe !== 'Unknown') {
            score++;
            this.log(`   ✅ Timeframe detected: ${analysis.detectedTimeframe}`, 'success');
        } else {
            issues.push('Timeframe not detected');
            this.log('   ⚠️  Timeframe not detected or unknown', 'warning');
        }

        const qualityScore = Math.round((score / maxScore) * 100);
        
        if (qualityScore >= 80) {
            this.log(`   🎯 Quality Score: ${qualityScore}% - EXCELLENT`, 'success');
        } else if (qualityScore >= 60) {
            this.log(`   ⚠️  Quality Score: ${qualityScore}% - GOOD`, 'warning');
        } else {
            this.log(`   ❌ Quality Score: ${qualityScore}% - NEEDS IMPROVEMENT`, 'error');
        }

        if (issues.length > 0) {
            this.log(`   Issues found: ${issues.join(', ')}`, 'warning');
        }

        return qualityScore;
    }

    async runComprehensiveTest() {
        this.log('🚀 Starting comprehensive TRADAI API testing...', 'info');
        this.log(`Production URL: ${PRODUCTION_URL}`, 'info');
        
        // Test health endpoint first
        const healthOk = await this.testHealthEndpoint();
        if (!healthOk) {
            this.log('❌ Health check failed, aborting tests', 'error');
            return;
        }

        // Test 5m timeframe with priority screenshots
        this.log('\n📈 Testing 5-minute timeframe screenshots...', 'info');
        const screenshots5m = await this.getAvailableScreenshots('5m');
        
        for (const screenshot of screenshots5m) {
            const fileName = path.basename(screenshot);
            let expectedAsset = null;
            
            // Determine expected asset from filename
            if (fileName.includes('usdinr')) expectedAsset = 'USD/INR';
            else if (fileName.includes('usdbdt')) expectedAsset = 'USD/BDT';
            else if (fileName.includes('usdbrl')) expectedAsset = 'USD/BRL';
            else if (fileName.includes('usdtry')) expectedAsset = 'USD/TRY';
            
            await this.testSingleScreenshot(screenshot, '5m', expectedAsset);
            
            // Add delay between tests to avoid rate limiting
            this.log('⏳ Waiting 3 seconds before next test...', 'info');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Test 3m timeframe
        this.log('\n📈 Testing 3-minute timeframe screenshots...', 'info');
        const screenshots3m = await this.getAvailableScreenshots('3m');
        
        for (const screenshot of screenshots3m.slice(0, 2)) { // Test first 2 screenshots
            await this.testSingleScreenshot(screenshot, '3m');
            this.log('⏳ Waiting 3 seconds before next test...', 'info');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Test 1m timeframe
        this.log('\n📈 Testing 1-minute timeframe screenshots...', 'info');
        const screenshots1m = await this.getAvailableScreenshots('1m');
        
        for (const screenshot of screenshots1m.slice(0, 2)) { // Test first 2 screenshots
            await this.testSingleScreenshot(screenshot, '1m');
            this.log('⏳ Waiting 3 seconds before next test...', 'info');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Generate comprehensive report
        this.generateComprehensiveReport();
    }

    generateComprehensiveReport() {
        const totalTime = Date.now() - this.startTime;
        const successfulTests = this.testResults.filter(r => r.success);
        const avgQuality = successfulTests.length > 0 ? 
            Math.round(successfulTests.reduce((sum, t) => sum + t.qualityScore, 0) / successfulTests.length) : 0;
        const avgProcessingTime = successfulTests.length > 0 ?
            Math.round(successfulTests.reduce((sum, t) => sum + t.processingTime, 0) / successfulTests.length) : 0;

        this.log('\n' + '='.repeat(80), 'info');
        this.log('📋 COMPREHENSIVE TEST REPORT', 'info');
        this.log('='.repeat(80), 'info');
        
        this.log(`🕒 Total test duration: ${Math.round(totalTime/1000)} seconds`, 'info');
        this.log(`📊 Tests executed: ${this.testCount}`, 'info');
        this.log(`✅ Successful: ${this.successCount}`, 'success');
        this.log(`❌ Failed: ${this.failureCount}`, 'error');
        this.log(`📈 Success rate: ${Math.round((this.successCount/this.testCount)*100)}%`, 'info');
        this.log(`🎯 Average quality score: ${avgQuality}%`, 'info');
        this.log(`⏱️  Average processing time: ${avgProcessingTime}ms (${(avgProcessingTime/1000).toFixed(1)}s)`, 'info');

        // Detailed results by timeframe
        ['5m', '3m', '1m'].forEach(timeframe => {
            const timeframeResults = this.testResults.filter(r => r.timeframe === timeframe);
            if (timeframeResults.length > 0) {
                const successfulTimeframe = timeframeResults.filter(r => r.success);
                this.log(`\n📈 ${timeframe.toUpperCase()} TIMEFRAME RESULTS:`, 'info');
                this.log(`   Tests: ${timeframeResults.length}`, 'info');
                this.log(`   Successful: ${successfulTimeframe.length}`, 'info');
                this.log(`   Success rate: ${Math.round((successfulTimeframe.length/timeframeResults.length)*100)}%`, 'info');
                
                if (successfulTimeframe.length > 0) {
                    const avgQualityTimeframe = Math.round(successfulTimeframe.reduce((sum, t) => sum + t.qualityScore, 0) / successfulTimeframe.length);
                    this.log(`   Average quality: ${avgQualityTimeframe}%`, 'info');
                }
            }
        });

        // Individual test results
        this.log('\n📋 INDIVIDUAL TEST RESULTS:', 'info');
        this.testResults.forEach((test, index) => {
            const status = test.success ? '✅' : '❌';
            const quality = test.success ? ` (${test.qualityScore}%)` : '';
            const time = ` [${Math.round(test.processingTime/1000)}s]`;
            this.log(`${index + 1}. ${status} ${test.fileName} (${test.timeframe})${quality}${time}`, 'info');
            
            if (!test.success) {
                this.log(`   Error: ${test.error}`, 'error');
            } else if (test.detectedAsset) {
                this.log(`   Detected: ${test.detectedAsset} | ${test.detectedTimeframe}`, 'info');
            }
        });

        // Save detailed report
        const reportPath = `comprehensive-test-report-${Date.now()}.json`;
        const report = {
            summary: {
                totalTests: this.testCount,
                successful: this.successCount,
                failed: this.failureCount,
                successRate: Math.round((this.successCount/this.testCount)*100),
                averageQuality: avgQuality,
                averageProcessingTime: avgProcessingTime,
                totalDuration: totalTime
            },
            results: this.testResults,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`\n📄 Detailed report saved: ${reportPath}`, 'info');
        
        // Final assessment
        this.log('\n🎯 FINAL ASSESSMENT:', 'info');
        if (this.successCount / this.testCount >= 0.8 && avgQuality >= 70) {
            this.log('🎉 TRADAI API TESTING: PASSED', 'success');
            this.log('   System is ready for production trading use', 'success');
        } else {
            this.log('⚠️  TRADAI API TESTING: NEEDS ATTENTION', 'warning');
            this.log('   Review failed tests and quality issues before production use', 'warning');
        }
    }
}

// Run comprehensive testing
if (require.main === module) {
    const tester = new ComprehensiveAPITester();
    tester.runComprehensiveTest().catch(error => {
        console.error('❌ Testing execution failed:', error);
        process.exit(1);
    });
}

module.exports = ComprehensiveAPITester;
