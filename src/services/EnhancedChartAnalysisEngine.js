/**
 * Enhanced Chart Analysis Engine for Trading Signal Generation
 * Combines Gemini Vision, API key rotation, and token optimization for comprehensive analysis
 */

const GeminiVisionAnalysisService = require('./GeminiVisionAnalysisService');
const ApiKeyRotationManager = require('./ApiKeyRotationManager');
const TokenOptimizationEngine = require('./TokenOptimizationEngine');
const PerformanceMonitoringService = require('./PerformanceMonitoringService');
const fs = require('fs');
const path = require('path');

class EnhancedChartAnalysisEngine {
    constructor(config = {}) {
        this.config = {
            // API Configuration
            apiKeys: config.apiKeys || this.loadApiKeysFromEnv(),
            
            // Analysis Configuration
            minConfidence: config.minConfidence || 70,
            maxConfidence: config.maxConfidence || 95,
            supportedTimeframes: config.supportedTimeframes || ['1m', '3m', '5m', '15m', '30m'],
            supportedAssets: config.supportedAssets || ['USD/BRL', 'USD/TRY', 'EUR/USD', 'GBP/USD'],
            
            // Processing Configuration
            maxProcessingTime: config.maxProcessingTime || 60000, // 60 seconds
            enableParallelProcessing: config.enableParallelProcessing !== false,
            maxConcurrentRequests: config.maxConcurrentRequests || 3,
            
            // Quality Assurance
            enableQualityValidation: config.enableQualityValidation !== false,
            requireMinimumIndicators: config.requireMinimumIndicators || 3,
            enableConfidenceCalibration: config.enableConfidenceCalibration !== false,
            
            // Signal Generation
            enableMultiTimeframeAnalysis: config.enableMultiTimeframeAnalysis !== false,
            enablePatternRecognition: config.enablePatternRecognition !== false,
            enableSupportResistanceDetection: config.enableSupportResistanceDetection !== false,
            
            ...config
        };

        // Initialize core services
        this.initializeServices();
        
        // Analysis state
        this.isInitialized = false;
        this.processingQueue = [];
        this.activeRequests = 0;
        
        // Performance tracking
        this.performanceStats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            averageProcessingTime: 0,
            averageConfidence: 0,
            totalProcessingTime: 0,
            errorCount: 0,
            lastAnalysisTime: null
        };
    }

    /**
     * Load API keys from environment
     */
    loadApiKeysFromEnv() {
        const keys = [];
        
        // Primary key
        if (process.env.GOOGLE_VISION_API_KEY) {
            keys.push(process.env.GOOGLE_VISION_API_KEY);
        }
        
        // Additional keys
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GOOGLE_API_KEY_${i}`] || process.env[`GEMINI_API_KEY_${i}`];
            if (key) {
                keys.push(key);
            }
        }
        
        return keys;
    }

    /**
     * Initialize core services
     */
    initializeServices() {
        // API Key Rotation Manager
        this.keyManager = new ApiKeyRotationManager({
            apiKeys: this.config.apiKeys,
            rotationStrategy: 'least-used',
            maxRequestsPerKeyPerMinute: 15,
            maxRequestsPerKeyPerDay: 1500,
            enableAutoRecovery: true
        });

        // Token Optimization Engine
        this.tokenOptimizer = new TokenOptimizationEngine({
            enableImageCompression: true,
            enablePromptCompression: true,
            enableResponseCaching: true,
            enableBatchProcessing: false, // Disabled for real-time analysis
            dailyTokenLimit: 50000,
            maxImageWidth: 1024,
            maxImageHeight: 768
        });

        // Performance Monitoring Service
        this.performanceMonitor = new PerformanceMonitoringService({
            enableDailyUsageTracking: true,
            enableAccuracyTracking: true,
            enableApiKeyHealthMonitoring: true,
            enablePerformanceMetrics: true,
            dailyRequestLimit: 1500,
            dailyTokenLimit: 50000,
            accuracyWarningThreshold: 70,
            performanceWarningThreshold: 45000
        });

        // Gemini Vision Service (will be initialized with rotating keys)
        this.visionService = null;
    }

    /**
     * Initialize the analysis engine
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Enhanced Chart Analysis Engine...');
            
            if (this.config.apiKeys.length === 0) {
                throw new Error('No API keys provided for analysis');
            }

            // Initialize key manager
            await this.keyManager.initialize();
            
            // Initialize vision service with first available key
            const firstKey = this.keyManager.getNextApiKey();
            this.visionService = new GeminiVisionAnalysisService({
                apiKeys: this.config.apiKeys,
                model: 'gemini-2.5-flash',
                minConfidence: this.config.minConfidence,
                maxConfidence: this.config.maxConfidence,
                enableTokenOptimization: true,
                enableResponseCaching: true
            });
            
            await this.visionService.initialize();
            
            this.isInitialized = true;
            console.log('✅ Enhanced Chart Analysis Engine initialized successfully');
            
            return {
                success: true,
                message: 'Enhanced Chart Analysis Engine ready',
                availableKeys: this.keyManager.getStats().manager.availableKeys,
                supportedTimeframes: this.config.supportedTimeframes,
                supportedAssets: this.config.supportedAssets
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Chart Analysis Engine:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze trading chart screenshot and generate comprehensive signals
     */
    async analyzeChart(imagePath, options = {}) {
        console.log(`📊 Starting enhanced chart analysis: ${path.basename(imagePath)}`);
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        const analysisId = `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Validate input
            await this.validateInput(imagePath, options);
            
            // Check processing limits
            if (this.activeRequests >= this.config.maxConcurrentRequests) {
                throw new Error('Maximum concurrent requests reached');
            }
            
            this.activeRequests++;
            
            // Optimize image for analysis
            const imageBuffer = fs.readFileSync(imagePath);
            const optimizedImage = await this.tokenOptimizer.optimizeImage(imageBuffer);
            
            // Create temporary file for optimized image
            const tempImagePath = path.join(path.dirname(imagePath), `temp_${analysisId}.jpg`);
            fs.writeFileSync(tempImagePath, optimizedImage);
            
            try {
                // Perform analysis with current API key
                const analysisResult = await this.performAnalysisWithRetry(tempImagePath, options);
                
                // Validate and enhance results
                const enhancedResult = await this.enhanceAnalysisResult(analysisResult, options);
                
                // Update performance statistics
                this.updatePerformanceStats(true, Date.now() - startTime, enhancedResult.confidence);

                // Record analysis in performance monitor
                this.performanceMonitor.recordAnalysisRequest({
                    success: true,
                    processingTime: Date.now() - startTime,
                    tokenUsage: analysisResult.usage,
                    confidence: enhancedResult.confidence,
                    predictions: enhancedResult.analysis?.predictions,
                    apiKeyIndex: analysisResult.apiKeyIndex
                });

                console.log(`✅ Enhanced analysis completed in ${Date.now() - startTime}ms`);

                return {
                    success: true,
                    analysisId,
                    processingTime: Date.now() - startTime,
                    method: 'Enhanced Gemini Vision',
                    ...enhancedResult
                };
                
            } finally {
                // Clean up temporary file
                if (fs.existsSync(tempImagePath)) {
                    fs.unlinkSync(tempImagePath);
                }
                this.activeRequests--;
            }
            
        } catch (error) {
            this.activeRequests--;
            this.updatePerformanceStats(false, Date.now() - startTime, 0);

            // Record error in performance monitor
            this.performanceMonitor.recordAnalysisRequest({
                success: false,
                processingTime: Date.now() - startTime,
                error: error.message,
                apiKeyIndex: null
            });

            console.error('❌ Enhanced chart analysis failed:', error);
            return {
                success: false,
                error: error.message,
                analysisId,
                processingTime: Date.now() - startTime,
                method: 'Enhanced Gemini Vision'
            };
        }
    }

    /**
     * Validate input parameters
     */
    async validateInput(imagePath, options) {
        // Check file exists
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }
        
        // Check file size
        const stats = fs.statSync(imagePath);
        if (stats.size > 10 * 1024 * 1024) { // 10MB limit
            throw new Error('Image file too large (max 10MB)');
        }
        
        // Validate timeframe
        if (options.timeframe && !this.config.supportedTimeframes.includes(options.timeframe)) {
            throw new Error(`Unsupported timeframe: ${options.timeframe}`);
        }
        
        // Validate asset
        if (options.asset && !this.config.supportedAssets.includes(options.asset)) {
            console.warn(`⚠️ Asset ${options.asset} not in supported list, proceeding anyway`);
        }
    }

    /**
     * Perform analysis with retry logic and API key rotation
     */
    async performAnalysisWithRetry(imagePath, options, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Analysis attempt ${attempt}/${maxRetries}`);
                
                // Get optimized prompt
                const optimizedPrompt = this.tokenOptimizer.generateCompactPrompt(options);
                
                // Check cache first
                const imageBuffer = fs.readFileSync(imagePath);
                const cachedResult = this.tokenOptimizer.getCachedResponse(imageBuffer, optimizedPrompt);
                if (cachedResult) {
                    return cachedResult;
                }
                
                // Perform analysis
                const result = await this.visionService.analyzeChartScreenshot(imagePath, options);
                
                if (result.success) {
                    // Cache the result
                    this.tokenOptimizer.cacheResponse(imageBuffer, optimizedPrompt, result);
                    
                    // Track token usage
                    this.tokenOptimizer.trackTokenUsage(result.usage);
                    
                    // Report success to key manager
                    this.keyManager.reportSuccess(result.apiKey || 'unknown', result.processingTime);
                    
                    return result;
                } else {
                    throw new Error(result.error);
                }
                
            } catch (error) {
                lastError = error;
                console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
                
                // Report error to key manager
                this.keyManager.reportError('current', error);
                
                // If rate limit error, try with next key
                if (error.message.includes('quota') || error.message.includes('rate limit')) {
                    console.log('🔄 Switching to next API key due to rate limit...');
                    
                    // Reinitialize vision service with next key
                    try {
                        const nextKey = this.keyManager.getNextApiKey();
                        this.visionService = new GeminiVisionAnalysisService({
                            apiKeys: [nextKey],
                            model: 'gemini-2.5-flash',
                            minConfidence: this.config.minConfidence,
                            maxConfidence: this.config.maxConfidence
                        });
                        await this.visionService.initialize();
                    } catch (keyError) {
                        console.error('❌ Failed to switch API key:', keyError.message);
                    }
                }
                
                // Wait before retry
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        
        throw lastError || new Error('Analysis failed after all retries');
    }
    /**
     * Enhance analysis result with additional processing and validation
     */
    async enhanceAnalysisResult(result, options) {
        if (!result.success || !result.analysis) {
            return result;
        }

        const enhanced = { ...result };

        // Calibrate confidence levels
        if (this.config.enableConfidenceCalibration) {
            enhanced.analysis = this.calibrateConfidence(enhanced.analysis);
        }

        // Validate signal quality
        if (this.config.enableQualityValidation) {
            enhanced.qualityScore = this.calculateQualityScore(enhanced.analysis);
            enhanced.qualityLevel = this.getQualityLevel(enhanced.qualityScore);
        }

        // Add risk assessment
        enhanced.riskAssessment = this.assessRisk(enhanced.analysis, options);

        // Generate trading recommendations
        enhanced.recommendations = this.generateRecommendations(enhanced.analysis, options);

        // Add metadata
        enhanced.metadata = {
            engineVersion: '1.0.0',
            analysisTime: new Date().toISOString(),
            timeframe: options.timeframe || '5m',
            asset: options.asset || 'USD/BRL',
            processingMethod: 'Enhanced Gemini Vision',
            qualityChecks: this.config.enableQualityValidation,
            confidenceCalibration: this.config.enableConfidenceCalibration
        };

        return enhanced;
    }

    /**
     * Calibrate confidence levels based on historical performance
     */
    calibrateConfidence(analysis) {
        if (!analysis.predictions) return analysis;

        const calibrated = { ...analysis };

        // Apply calibration factor based on historical accuracy
        const calibrationFactor = 0.9; // Conservative adjustment

        calibrated.predictions = analysis.predictions.map(pred => ({
            ...pred,
            confidence: Math.max(
                this.config.minConfidence,
                Math.min(
                    this.config.maxConfidence,
                    Math.round(pred.confidence * calibrationFactor)
                )
            )
        }));

        // Recalculate overall confidence
        const avgConfidence = calibrated.predictions.reduce((sum, p) => sum + p.confidence, 0) / calibrated.predictions.length;
        calibrated.overallConfidence = Math.round(avgConfidence);

        return calibrated;
    }

    /**
     * Calculate quality score for analysis
     */
    calculateQualityScore(analysis) {
        let score = 0;
        let maxScore = 100;

        // Check predictions quality
        if (analysis.predictions && analysis.predictions.length >= 3) {
            score += 25;

            // Check confidence levels
            const avgConfidence = analysis.predictions.reduce((sum, p) => sum + p.confidence, 0) / analysis.predictions.length;
            if (avgConfidence >= 80) score += 15;
            else if (avgConfidence >= 70) score += 10;
        }

        // Check technical analysis completeness
        if (analysis.technicalAnalysis) {
            const indicators = Object.keys(analysis.technicalAnalysis);
            if (indicators.length >= this.config.requireMinimumIndicators) {
                score += 20;
            } else {
                score += (indicators.length / this.config.requireMinimumIndicators) * 20;
            }
        }

        // Check pattern recognition
        if (analysis.candlestickPatterns && analysis.candlestickPatterns.length > 0) {
            score += 15;
        }

        // Check support/resistance levels
        if (analysis.supportResistance) {
            const totalLevels = (analysis.supportResistance.support?.length || 0) +
                              (analysis.supportResistance.resistance?.length || 0);
            if (totalLevels >= 2) score += 15;
            else score += (totalLevels / 2) * 15;
        }

        // Check market structure analysis
        if (analysis.marketStructure && analysis.marketStructure.trend) {
            score += 10;
        }

        return Math.min(score, maxScore);
    }

    /**
     * Get quality level from score
     */
    getQualityLevel(score) {
        if (score >= 90) return 'EXCELLENT';
        if (score >= 80) return 'HIGH';
        if (score >= 70) return 'GOOD';
        if (score >= 60) return 'FAIR';
        return 'LOW';
    }

    /**
     * Assess risk for trading signals
     */
    assessRisk(analysis, options) {
        let riskScore = 0;
        let factors = [];

        // Confidence-based risk
        const avgConfidence = analysis.predictions?.reduce((sum, p) => sum + p.confidence, 0) / (analysis.predictions?.length || 1);
        if (avgConfidence < 75) {
            riskScore += 30;
            factors.push('Low confidence predictions');
        }

        // Market condition risk
        if (analysis.marketStructure?.condition === 'consolidating') {
            riskScore += 20;
            factors.push('Consolidating market conditions');
        }

        // Volatility risk
        if (options.timeframe === '1m') {
            riskScore += 15;
            factors.push('High-frequency timeframe');
        }

        // Pattern reliability
        if (!analysis.candlestickPatterns || analysis.candlestickPatterns.length === 0) {
            riskScore += 10;
            factors.push('No clear candlestick patterns');
        }

        // Support/resistance proximity
        if (!analysis.supportResistance ||
            (!analysis.supportResistance.support?.length && !analysis.supportResistance.resistance?.length)) {
            riskScore += 15;
            factors.push('Unclear support/resistance levels');
        }

        const riskLevel = riskScore <= 20 ? 'LOW' :
                         riskScore <= 40 ? 'MEDIUM' :
                         riskScore <= 60 ? 'HIGH' : 'VERY_HIGH';

        return {
            score: riskScore,
            level: riskLevel,
            factors: factors,
            recommendation: riskLevel === 'VERY_HIGH' ? 'AVOID_TRADING' :
                           riskLevel === 'HIGH' ? 'TRADE_WITH_CAUTION' :
                           'ACCEPTABLE_RISK'
        };
    }

    /**
     * Generate trading recommendations
     */
    generateRecommendations(analysis, options) {
        const recommendations = [];

        // Primary signal recommendation
        if (analysis.predictions && analysis.predictions.length > 0) {
            const firstPrediction = analysis.predictions[0];
            if (firstPrediction.confidence >= 80) {
                recommendations.push({
                    type: 'PRIMARY_SIGNAL',
                    action: firstPrediction.direction,
                    confidence: firstPrediction.confidence,
                    timeframe: options.timeframe || '5m',
                    reasoning: `Strong ${firstPrediction.direction} signal with ${firstPrediction.confidence}% confidence`
                });
            }
        }

        // Risk management recommendations
        const riskLevel = this.assessRisk(analysis, options).level;
        if (riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH') {
            recommendations.push({
                type: 'RISK_WARNING',
                action: 'REDUCE_POSITION_SIZE',
                reasoning: `High risk conditions detected (${riskLevel})`
            });
        }

        // Technical analysis recommendations
        if (analysis.technicalAnalysis?.rsi?.value) {
            const rsi = analysis.technicalAnalysis.rsi.value;
            if (rsi > 70) {
                recommendations.push({
                    type: 'TECHNICAL_WARNING',
                    action: 'OVERBOUGHT_CONDITION',
                    reasoning: `RSI indicates overbought conditions (${rsi})`
                });
            } else if (rsi < 30) {
                recommendations.push({
                    type: 'TECHNICAL_OPPORTUNITY',
                    action: 'OVERSOLD_CONDITION',
                    reasoning: `RSI indicates oversold conditions (${rsi})`
                });
            }
        }

        return recommendations;
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats(success, processingTime, confidence) {
        this.performanceStats.totalAnalyses++;
        this.performanceStats.totalProcessingTime += processingTime;
        this.performanceStats.averageProcessingTime = this.performanceStats.totalProcessingTime / this.performanceStats.totalAnalyses;
        this.performanceStats.lastAnalysisTime = new Date().toISOString();

        if (success) {
            this.performanceStats.successfulAnalyses++;
            if (confidence > 0) {
                this.performanceStats.averageConfidence =
                    ((this.performanceStats.averageConfidence * (this.performanceStats.successfulAnalyses - 1)) + confidence) /
                    this.performanceStats.successfulAnalyses;
            }
        } else {
            this.performanceStats.errorCount++;
        }
    }

    /**
     * Get comprehensive statistics
     */
    getStats() {
        return {
            engine: {
                isInitialized: this.isInitialized,
                activeRequests: this.activeRequests,
                maxConcurrentRequests: this.config.maxConcurrentRequests,
                supportedTimeframes: this.config.supportedTimeframes,
                supportedAssets: this.config.supportedAssets
            },
            performance: {
                ...this.performanceStats,
                successRate: this.performanceStats.totalAnalyses > 0 ?
                    (this.performanceStats.successfulAnalyses / this.performanceStats.totalAnalyses * 100).toFixed(2) + '%' : '0%'
            },
            keyManager: this.keyManager?.getStats(),
            tokenOptimizer: this.tokenOptimizer?.getOptimizationStats(),
            monitoring: this.performanceMonitor?.getMonitoringStats(),
            health: this.performanceMonitor?.getHealthStatus()
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up Enhanced Chart Analysis Engine...');

        if (this.keyManager) {
            this.keyManager.cleanup();
        }

        if (this.tokenOptimizer) {
            this.tokenOptimizer.cleanup();
        }

        if (this.visionService) {
            this.visionService.cleanup();
        }

        if (this.performanceMonitor) {
            this.performanceMonitor.cleanup();
        }

        this.processingQueue = [];
        this.activeRequests = 0;
        this.isInitialized = false;
    }
}

module.exports = EnhancedChartAnalysisEngine;
