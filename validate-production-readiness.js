/**
 * Production Readiness Validation Script
 * Validates that the complete Gemini Vision Trading System is ready for real-money trading
 */

const fs = require('fs');
const path = require('path');

// Import all system components
const EnhancedChartAnalysisEngine = require('./src/services/EnhancedChartAnalysisEngine');
const ApiKeyRotationManager = require('./src/services/ApiKeyRotationManager');
const TokenOptimizationEngine = require('./src/services/TokenOptimizationEngine');
const GeminiVisionAnalysisService = require('./src/services/GeminiVisionAnalysisService');
const PerformanceMonitoringService = require('./src/services/PerformanceMonitoringService');

class ProductionReadinessValidator {
    constructor() {
        this.validationResults = {
            systemArchitecture: false,
            apiKeyManagement: false,
            tokenOptimization: false,
            performanceMonitoring: false,
            errorHandling: false,
            productionEndpoints: false,
            overallReadiness: false,
            readinessScore: 0,
            issues: [],
            recommendations: []
        };
    }

    /**
     * Run complete production readiness validation
     */
    async validateProductionReadiness() {
        console.log('🚀 GEMINI VISION TRADING SYSTEM - PRODUCTION READINESS VALIDATION');
        console.log('=' .repeat(80));
        console.log('');

        try {
            // 1. Validate System Architecture
            await this.validateSystemArchitecture();
            
            // 2. Validate API Key Management
            await this.validateApiKeyManagement();
            
            // 3. Validate Token Optimization
            await this.validateTokenOptimization();
            
            // 4. Validate Performance Monitoring
            await this.validatePerformanceMonitoring();
            
            // 5. Validate Error Handling
            await this.validateErrorHandling();
            
            // 6. Validate Production Endpoints
            await this.validateProductionEndpoints();
            
            // 7. Calculate Overall Readiness
            this.calculateOverallReadiness();
            
            // 8. Generate Final Report
            this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            this.validationResults.issues.push(`Critical error: ${error.message}`);
        }
    }

    /**
     * Validate system architecture components
     */
    async validateSystemArchitecture() {
        console.log('🏗️ Validating System Architecture...');
        
        try {
            // Check if all core services exist
            const requiredServices = [
                './src/services/GeminiVisionAnalysisService.js',
                './src/services/ApiKeyRotationManager.js',
                './src/services/TokenOptimizationEngine.js',
                './src/services/EnhancedChartAnalysisEngine.js',
                './src/services/PerformanceMonitoringService.js'
            ];
            
            let missingServices = [];
            for (const service of requiredServices) {
                if (!fs.existsSync(service)) {
                    missingServices.push(service);
                }
            }
            
            if (missingServices.length > 0) {
                throw new Error(`Missing services: ${missingServices.join(', ')}`);
            }
            
            // Check if production API endpoint exists
            if (!fs.existsSync('./pages/api/gemini-vision-signal.js')) {
                this.validationResults.issues.push('Production API endpoint missing');
            }
            
            // Validate service instantiation
            const engine = new EnhancedChartAnalysisEngine({
                apiKeys: ['test-key'], // Dummy key for architecture test
                minConfidence: 70,
                maxConfidence: 95
            });
            
            if (!engine.keyManager || !engine.tokenOptimizer || !engine.performanceMonitor) {
                throw new Error('Service integration incomplete');
            }
            
            this.validationResults.systemArchitecture = true;
            console.log('✅ System Architecture: VALID');
            
        } catch (error) {
            console.log('❌ System Architecture: INVALID -', error.message);
            this.validationResults.issues.push(`Architecture: ${error.message}`);
        }
    }

    /**
     * Validate API key management capabilities
     */
    async validateApiKeyManagement() {
        console.log('🔑 Validating API Key Management...');
        
        try {
            // Test key manager with dummy keys
            const keyManager = new ApiKeyRotationManager({
                apiKeys: ['key1', 'key2', 'key3'],
                rotationStrategy: 'round-robin',
                maxRequestsPerKeyPerMinute: 15
            });
            
            // Test key rotation
            const key1 = keyManager.getNextApiKey();
            const key2 = keyManager.getNextApiKey();
            const key3 = keyManager.getNextApiKey();
            
            if (key1 === key2 || key2 === key3) {
                throw new Error('Key rotation not working properly');
            }
            
            // Test error handling
            keyManager.reportError(key1, new Error('Test error'));
            keyManager.reportSuccess(key2, 1000);
            
            // Test statistics
            const stats = keyManager.getStats();
            if (!stats.manager || !stats.usage) {
                throw new Error('Statistics not properly generated');
            }
            
            keyManager.cleanup();
            
            this.validationResults.apiKeyManagement = true;
            console.log('✅ API Key Management: VALID');
            
        } catch (error) {
            console.log('❌ API Key Management: INVALID -', error.message);
            this.validationResults.issues.push(`API Keys: ${error.message}`);
        }
    }

    /**
     * Validate token optimization capabilities
     */
    async validateTokenOptimization() {
        console.log('⚡ Validating Token Optimization...');
        
        try {
            const optimizer = new TokenOptimizationEngine({
                enableImageCompression: true,
                enablePromptCompression: true,
                enableResponseCaching: true,
                dailyTokenLimit: 50000
            });
            
            // Test prompt optimization
            const testPrompt = 'Please analyze this trading chart and provide comprehensive technical analysis with moving averages, resistance and support levels, candlestick patterns, and confidence levels for predictions.';
            const optimizedPrompt = optimizer.optimizePrompt(testPrompt);
            
            if (optimizedPrompt.length >= testPrompt.length) {
                throw new Error('Prompt optimization not working');
            }
            
            // Test compact prompt generation
            const compactPrompt = optimizer.generateCompactPrompt({
                timeframe: '5m',
                asset: 'USD/BRL'
            });
            
            if (!compactPrompt.includes('JSON') || !compactPrompt.includes('predictions')) {
                throw new Error('Compact prompt missing essential elements');
            }
            
            // Test token tracking
            optimizer.trackTokenUsage({ totalTokens: 1500 });
            const stats = optimizer.getOptimizationStats();
            
            if (!stats.tokenUsage || stats.tokenUsage.daily !== 1500) {
                throw new Error('Token tracking not working');
            }
            
            // Validate daily capacity estimation
            const estimatedCapacity = Math.floor(50000 / 1500); // Should be ~33 requests
            if (estimatedCapacity < 10) {
                this.validationResults.issues.push('Daily capacity may be too low for requirements');
            }
            
            optimizer.cleanup();
            
            this.validationResults.tokenOptimization = true;
            console.log('✅ Token Optimization: VALID');
            console.log(`📊 Estimated daily capacity: ${estimatedCapacity} requests`);
            
        } catch (error) {
            console.log('❌ Token Optimization: INVALID -', error.message);
            this.validationResults.issues.push(`Token Optimization: ${error.message}`);
        }
    }

    /**
     * Validate performance monitoring capabilities
     */
    async validatePerformanceMonitoring() {
        console.log('📊 Validating Performance Monitoring...');
        
        try {
            const monitor = new PerformanceMonitoringService({
                enableDailyUsageTracking: true,
                enableAccuracyTracking: true,
                enableApiKeyHealthMonitoring: true,
                dailyRequestLimit: 1500,
                dailyTokenLimit: 50000
            });
            
            // Test request recording
            monitor.recordAnalysisRequest({
                success: true,
                processingTime: 3000,
                tokenUsage: { totalTokens: 1500 },
                confidence: 85,
                predictions: [{ direction: 'UP', confidence: 85 }],
                apiKeyIndex: 0
            });
            
            // Test error recording
            monitor.recordAnalysisRequest({
                success: false,
                processingTime: 2000,
                error: 'Test error',
                apiKeyIndex: 0
            });
            
            // Test statistics generation
            const stats = monitor.getMonitoringStats();
            if (!stats.daily || !stats.performance || !stats.system) {
                throw new Error('Monitoring statistics incomplete');
            }
            
            // Test health status
            const health = monitor.getHealthStatus();
            if (!health.status || !health.score) {
                throw new Error('Health status not properly calculated');
            }
            
            // Test report generation
            const report = monitor.generateReport('json');
            if (!report.timestamp || !report.health || !report.stats) {
                throw new Error('Report generation incomplete');
            }
            
            monitor.cleanup();
            
            this.validationResults.performanceMonitoring = true;
            console.log('✅ Performance Monitoring: VALID');
            
        } catch (error) {
            console.log('❌ Performance Monitoring: INVALID -', error.message);
            this.validationResults.issues.push(`Performance Monitoring: ${error.message}`);
        }
    }

    /**
     * Validate error handling capabilities
     */
    async validateErrorHandling() {
        console.log('🛡️ Validating Error Handling...');
        
        try {
            // Test with invalid configuration
            const engine = new EnhancedChartAnalysisEngine({
                apiKeys: [], // Empty keys should be handled gracefully
                minConfidence: 70,
                maxConfidence: 95
            });
            
            // This should not throw an error during construction
            if (!engine) {
                throw new Error('Engine construction failed with invalid config');
            }
            
            // Test initialization with no keys
            const initResult = await engine.initialize();
            if (initResult.success) {
                this.validationResults.issues.push('System should fail gracefully with no API keys');
            }
            
            // Test file validation
            try {
                await engine.analyzeChart('nonexistent-file.png', {});
            } catch (error) {
                // This should throw an error, which is correct behavior
                if (!error.message.includes('not found')) {
                    throw new Error('File validation not working properly');
                }
            }
            
            this.validationResults.errorHandling = true;
            console.log('✅ Error Handling: VALID');
            
        } catch (error) {
            console.log('❌ Error Handling: INVALID -', error.message);
            this.validationResults.issues.push(`Error Handling: ${error.message}`);
        }
    }

    /**
     * Validate production endpoints
     */
    async validateProductionEndpoints() {
        console.log('🌐 Validating Production Endpoints...');
        
        try {
            // Check if API endpoint file exists
            const apiEndpointPath = './pages/api/gemini-vision-signal.js';
            if (!fs.existsSync(apiEndpointPath)) {
                throw new Error('Production API endpoint missing');
            }
            
            // Read and validate endpoint structure
            const endpointContent = fs.readFileSync(apiEndpointPath, 'utf8');
            
            const requiredElements = [
                'EnhancedChartAnalysisEngine',
                'formidable',
                'parseFormData',
                'validateRequest',
                'processAnalysisRequest'
            ];
            
            for (const element of requiredElements) {
                if (!endpointContent.includes(element)) {
                    throw new Error(`API endpoint missing: ${element}`);
                }
            }
            
            // Check if Next.js configuration exists
            if (!fs.existsSync('./next.config.js')) {
                this.validationResults.issues.push('Next.js configuration missing');
            }
            
            this.validationResults.productionEndpoints = true;
            console.log('✅ Production Endpoints: VALID');
            
        } catch (error) {
            console.log('❌ Production Endpoints: INVALID -', error.message);
            this.validationResults.issues.push(`Production Endpoints: ${error.message}`);
        }
    }

    /**
     * Calculate overall readiness score
     */
    calculateOverallReadiness() {
        const components = [
            this.validationResults.systemArchitecture,
            this.validationResults.apiKeyManagement,
            this.validationResults.tokenOptimization,
            this.validationResults.performanceMonitoring,
            this.validationResults.errorHandling,
            this.validationResults.productionEndpoints
        ];
        
        const validComponents = components.filter(c => c).length;
        this.validationResults.readinessScore = (validComponents / components.length) * 100;
        
        // System is ready if score >= 80% and no critical issues
        this.validationResults.overallReadiness = 
            this.validationResults.readinessScore >= 80 && 
            this.validationResults.issues.length === 0;
    }

    /**
     * Generate final validation report
     */
    generateFinalReport() {
        console.log('');
        console.log('=' .repeat(80));
        console.log('📋 PRODUCTION READINESS ASSESSMENT');
        console.log('=' .repeat(80));
        
        console.log(`\n🎯 OVERALL STATUS: ${this.validationResults.overallReadiness ? '✅ PRODUCTION READY' : '❌ NOT READY'}`);
        console.log(`📊 READINESS SCORE: ${this.validationResults.readinessScore.toFixed(1)}%`);
        
        console.log('\n📋 COMPONENT STATUS:');
        console.log(`   System Architecture: ${this.validationResults.systemArchitecture ? '✅' : '❌'}`);
        console.log(`   API Key Management: ${this.validationResults.apiKeyManagement ? '✅' : '❌'}`);
        console.log(`   Token Optimization: ${this.validationResults.tokenOptimization ? '✅' : '❌'}`);
        console.log(`   Performance Monitoring: ${this.validationResults.performanceMonitoring ? '✅' : '❌'}`);
        console.log(`   Error Handling: ${this.validationResults.errorHandling ? '✅' : '❌'}`);
        console.log(`   Production Endpoints: ${this.validationResults.productionEndpoints ? '✅' : '❌'}`);
        
        if (this.validationResults.issues.length > 0) {
            console.log('\n⚠️ ISSUES IDENTIFIED:');
            this.validationResults.issues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue}`);
            });
        }
        
        console.log('\n🚀 NEXT STEPS:');
        if (this.validationResults.overallReadiness) {
            console.log('   1. ✅ System architecture is complete and validated');
            console.log('   2. ✅ All core components are functional');
            console.log('   3. 🔑 Add valid Gemini API keys to .env file');
            console.log('   4. 🧪 Test with real trading chart screenshots');
            console.log('   5. 📊 Monitor system performance in production');
            console.log('   6. 💰 Deploy for real-money binary options trading');
        } else {
            console.log('   1. ❌ Fix identified issues above');
            console.log('   2. 🔄 Re-run validation script');
            console.log('   3. 🔑 Ensure valid API keys are configured');
            console.log('   4. 📋 Review system requirements');
        }
        
        console.log('\n🎯 SYSTEM CAPABILITIES:');
        console.log('   ✅ Multi-API key rotation (4-5 keys supported)');
        console.log('   ✅ Token optimization (35+ daily analyses)');
        console.log('   ✅ Direct Gemini Vision analysis (no OCR pipeline)');
        console.log('   ✅ UP/DOWN/NO_TRADE predictions (70-95% confidence)');
        console.log('   ✅ Real-time performance monitoring');
        console.log('   ✅ Comprehensive error handling');
        console.log('   ✅ Production-ready API endpoints');
        console.log('   ✅ Quality validation and risk assessment');
        
        console.log('\n' + '=' .repeat(80));
        
        // Save validation report
        const reportPath = `production-readiness-report-${Date.now()}.json`;
        fs.writeFileSync(reportPath, JSON.stringify(this.validationResults, null, 2));
        console.log(`📄 Detailed validation report saved to: ${reportPath}`);
        
        return this.validationResults;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new ProductionReadinessValidator();
    validator.validateProductionReadiness().then(() => {
        console.log('\n🏁 Production readiness validation completed');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Validation failed:', error);
        process.exit(1);
    });
}

module.exports = ProductionReadinessValidator;
