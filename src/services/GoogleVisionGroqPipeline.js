/**
 * Google Vision + AI Trading Signal Pipeline
 * Comprehensive OCR-to-AI pipeline for trading chart analysis and signal generation
 * Supports both Groq AI and Gemini AI providers with fallback capabilities
 */

const GoogleVisionOCRService = require('./GoogleVisionOCRService');
const EnhancedGroqAnalysisService = require('./EnhancedGroqAnalysisService');
const GeminiAnalysisService = require('./GeminiAnalysisService');
const fs = require('fs');
const path = require('path');

class GoogleVisionGroqPipeline {
    constructor(config = {}) {
        this.config = {
            // Processing settings
            processingTimeout: config.processingTimeout || 60000, // 60 seconds
            minConfidence: config.minConfidence || 70,
            enableRedundantValidation: config.enableRedundantValidation !== false,
            enableImagePreprocessing: config.enableImagePreprocessing !== false,

            // AI Provider settings
            aiProvider: config.aiProvider || 'groq', // 'groq', 'gemini', or 'both'
            enableFallback: config.enableFallback !== false,

            // Multi-timeframe settings
            supportedTimeframes: config.supportedTimeframes || ['1m', '3m', '5m'],
            requireMultiTimeframe: config.requireMultiTimeframe !== false,

            // Quality settings
            minSignalConfidence: config.minSignalConfidence || 70,
            maxSignalConfidence: config.maxSignalConfidence || 95,

            // Error handling
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 2000,

            ...config
        };

        // Initialize services
        this.visionService = new GoogleVisionOCRService({
            apiKey: config.googleVisionApiKey || process.env.GOOGLE_VISION_API_KEY,
            confidenceThreshold: 0.7,
            enableTextDetection: true,
            enableObjectDetection: true,
            enableLabelDetection: true
        });

        // Initialize AI analysis services based on configuration
        this.aiServices = {};

        if (this.config.aiProvider === 'groq' || this.config.aiProvider === 'both') {
            this.aiServices.groq = new EnhancedGroqAnalysisService({
                apiKey: config.groqApiKey || process.env.GROQ_API_KEY,
                model: 'llama-3.3-70b-versatile',
                temperature: 0.1,
                maxTokens: 3000,
                minConfidence: this.config.minConfidence
            });
        }

        if (this.config.aiProvider === 'gemini' || this.config.aiProvider === 'both') {
            // Use enhanced Gemini Vision service instead of separate OCR + AI
            const EnhancedChartAnalysisEngine = require('./EnhancedChartAnalysisEngine');
            this.aiServices.gemini = new EnhancedChartAnalysisEngine({
                apiKeys: [config.googleVisionApiKey || process.env.GOOGLE_VISION_API_KEY],
                minConfidence: this.config.minConfidence,
                maxConfidence: 95,
                enableQualityValidation: true,
                enableConfidenceCalibration: true
            });
        }

        // Set primary AI service
        this.primaryAiService = this.config.aiProvider === 'gemini' ? 'gemini' : 'groq';

        this.isInitialized = false;
        this.processingStats = {
            totalProcessed: 0,
            successfulAnalyses: 0,
            failedAnalyses: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Initialize the pipeline
     */
    async initialize() {
        try {
            console.log(`🚀 Initializing Google Vision + AI Pipeline (${this.config.aiProvider})...`);

            // Initialize vision service
            const visionInit = await this.visionService.initialize();
            if (!visionInit.success) {
                throw new Error(`Vision service initialization failed: ${visionInit.error}`);
            }

            // Initialize AI services
            const aiInitPromises = [];
            const aiServiceNames = [];

            for (const [serviceName, service] of Object.entries(this.aiServices)) {
                aiInitPromises.push(service.initialize());
                aiServiceNames.push(serviceName);
            }

            const aiInitResults = await Promise.allSettled(aiInitPromises);
            const successfulServices = [];
            const failedServices = [];

            aiInitResults.forEach((result, index) => {
                const serviceName = aiServiceNames[index];
                if (result.status === 'fulfilled' && result.value.success) {
                    successfulServices.push(serviceName);
                } else {
                    failedServices.push({
                        service: serviceName,
                        error: result.status === 'rejected' ? result.reason : result.value.error
                    });
                }
            });

            // Check if at least one AI service is available
            if (successfulServices.length === 0) {
                throw new Error(`All AI services failed to initialize: ${failedServices.map(f => `${f.service}: ${f.error}`).join(', ')}`);
            }

            // Update primary service if it failed
            if (!successfulServices.includes(this.primaryAiService)) {
                this.primaryAiService = successfulServices[0];
                console.log(`⚠️ Primary AI service failed, switching to: ${this.primaryAiService}`);
            }

            this.isInitialized = true;
            console.log(`✅ Google Vision + AI Pipeline initialized successfully`);
            console.log(`   Available AI services: ${successfulServices.join(', ')}`);
            console.log(`   Primary AI service: ${this.primaryAiService}`);

            if (failedServices.length > 0) {
                console.warn(`⚠️ Some AI services failed: ${failedServices.map(f => f.service).join(', ')}`);
            }

            return {
                success: true,
                message: 'Pipeline ready for trading signal generation',
                services: {
                    vision: visionInit,
                    ai: {
                        successful: successfulServices,
                        failed: failedServices,
                        primary: this.primaryAiService
                    }
                }
            };
        } catch (error) {
            console.error('❌ Failed to initialize pipeline:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process trading screenshot and generate comprehensive signals
     */
    async processScreenshot(imagePath, options = {}) {
        console.log(`📊 Processing trading screenshot: ${path.basename(imagePath)}`);
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Validate input
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Screenshot file not found: ${imagePath}`);
            }

            // Read image buffer
            const imageBuffer = fs.readFileSync(imagePath);
            
            // Step 1: Image preprocessing (if enabled)
            let processedImageBuffer = imageBuffer;
            if (this.config.enableImagePreprocessing) {
                console.log('🔧 Preprocessing image for better OCR accuracy...');
                processedImageBuffer = await this.preprocessImage(imageBuffer);
            }

            // Step 2: Google Vision OCR analysis
            console.log('👁️ Running Google Vision OCR analysis...');
            const visionResult = await this.visionService.analyzeChartScreenshot(
                processedImageBuffer, 
                {
                    timeframe: options.timeframe,
                    asset: options.asset,
                    platform: options.platform
                }
            );

            if (!visionResult.success) {
                throw new Error(`Vision OCR failed: ${visionResult.error}`);
            }

            // Step 3: AI analysis with fallback support
            console.log(`🧠 Running ${this.primaryAiService.toUpperCase()} AI analysis...`);
            const aiResult = await this.runAIAnalysisWithFallback(
                visionResult,
                {
                    timeframe: options.timeframe,
                    asset: options.asset,
                    analysisType: options.analysisType || 'comprehensive'
                }
            );

            if (!aiResult.success) {
                throw new Error(`AI analysis failed: ${aiResult.error}`);
            }

            // Step 4: Validation and quality assurance
            console.log('✅ Validating signal quality...');
            const validatedSignal = await this.validateSignalQuality(aiResult.analysis, visionResult);

            // Step 5: Generate final comprehensive report
            const finalReport = this.generateComprehensiveReport({
                processingId,
                imagePath,
                visionResult,
                aiResult,
                validatedSignal,
                options,
                processingTime: Date.now() - startTime
            });

            // Update statistics
            this.updateProcessingStats(true, Date.now() - startTime);

            console.log(`✅ Pipeline processing completed in ${Date.now() - startTime}ms`);
            
            return finalReport;

        } catch (error) {
            console.error(`❌ Pipeline processing failed: ${error.message}`);
            
            // Update statistics
            this.updateProcessingStats(false, Date.now() - startTime);
            
            return {
                success: false,
                processingId,
                error: error.message,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Process multiple screenshots for multi-timeframe analysis
     */
    async processMultiTimeframeScreenshots(screenshots, options = {}) {
        console.log(`📊 Processing ${screenshots.length} screenshots for multi-timeframe analysis...`);
        
        const startTime = Date.now();
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Validate inputs
            if (!screenshots || screenshots.length < 2) {
                throw new Error('Minimum 2 timeframes required for multi-timeframe analysis');
            }

            // Process each screenshot
            const results = [];
            for (const screenshot of screenshots) {
                const result = await this.processScreenshot(screenshot.path, {
                    timeframe: screenshot.timeframe,
                    asset: screenshot.asset || options.asset,
                    platform: screenshot.platform || options.platform
                });
                
                results.push({
                    timeframe: screenshot.timeframe,
                    result: result
                });
            }

            // Perform confluence analysis
            console.log('🔍 Performing multi-timeframe confluence analysis...');
            const confluenceAnalysis = await this.performConfluenceAnalysis(results);

            // Generate multi-timeframe signal
            const multiTimeframeSignal = this.generateMultiTimeframeSignal(confluenceAnalysis, results);

            const processingTime = Date.now() - startTime;

            console.log(`✅ Multi-timeframe analysis completed in ${processingTime}ms`);

            return {
                success: true,
                batchId,
                processingTime,
                timeframes: screenshots.map(s => s.timeframe),
                individualResults: results,
                confluenceAnalysis,
                multiTimeframeSignal,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Multi-timeframe processing failed: ${error.message}`);
            
            return {
                success: false,
                batchId,
                error: error.message,
                processingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Run AI analysis with fallback support
     */
    async runAIAnalysisWithFallback(visionResult, options = {}) {
        const availableServices = Object.keys(this.aiServices);

        // Try primary service first
        if (this.aiServices[this.primaryAiService]) {
            try {
                console.log(`🎯 Attempting analysis with primary service: ${this.primaryAiService}`);
                const result = await this.aiServices[this.primaryAiService].analyzeVisionResults(visionResult, options);

                if (result.success) {
                    console.log(`✅ ${this.primaryAiService} analysis successful`);
                    return {
                        ...result,
                        aiProvider: this.primaryAiService,
                        fallbackUsed: false
                    };
                }
            } catch (error) {
                console.warn(`⚠️ Primary AI service (${this.primaryAiService}) failed: ${error.message}`);
            }
        }

        // Try fallback services if enabled
        if (this.config.enableFallback) {
            for (const serviceName of availableServices) {
                if (serviceName === this.primaryAiService) continue; // Already tried

                try {
                    console.log(`🔄 Attempting fallback analysis with: ${serviceName}`);
                    const result = await this.aiServices[serviceName].analyzeVisionResults(visionResult, options);

                    if (result.success) {
                        console.log(`✅ Fallback ${serviceName} analysis successful`);
                        return {
                            ...result,
                            aiProvider: serviceName,
                            fallbackUsed: true,
                            originalProvider: this.primaryAiService
                        };
                    }
                } catch (error) {
                    console.warn(`⚠️ Fallback AI service (${serviceName}) failed: ${error.message}`);
                }
            }
        }

        // All services failed
        return {
            success: false,
            error: 'All AI analysis services failed',
            aiProvider: 'none',
            fallbackUsed: true,
            availableServices
        };
    }

    /**
     * Preprocess image for better OCR accuracy
     */
    async preprocessImage(imageBuffer) {
        try {
            const sharp = require('sharp');
            
            // Enhance image for better OCR
            const processedBuffer = await sharp(imageBuffer)
                .resize({ width: 1920, height: 1080, fit: 'inside', withoutEnlargement: true })
                .sharpen()
                .normalize()
                .png({ quality: 100 })
                .toBuffer();
            
            return processedBuffer;
        } catch (error) {
            console.warn('⚠️ Image preprocessing failed, using original:', error.message);
            return imageBuffer;
        }
    }

    /**
     * Validate signal quality and confidence
     */
    async validateSignalQuality(analysis, visionResult) {
        const validation = {
            isValid: true,
            confidence: analysis.overallConfidence,
            issues: [],
            enhancements: []
        };

        // Check minimum confidence
        if (analysis.overallConfidence < this.config.minSignalConfidence) {
            validation.issues.push(`Low confidence: ${analysis.overallConfidence}% (min: ${this.config.minSignalConfidence}%)`);
        }

        // Check vision data quality
        const visionQuality = analysis.metadata?.visionDataQuality;
        if (visionQuality && visionQuality.level === 'LOW') {
            validation.issues.push('Low OCR data quality detected');
        }

        // Check signal consistency
        if (analysis.tradingSignal && analysis.confluenceAnalysis) {
            const signalDirection = analysis.tradingSignal.direction;
            const confluenceBias = analysis.confluenceAnalysis.overallBias;
            
            if ((signalDirection === 'UP' && confluenceBias === 'BEARISH') ||
                (signalDirection === 'DOWN' && confluenceBias === 'BULLISH')) {
                validation.issues.push('Signal direction conflicts with confluence analysis');
            }
        }

        // Enhance confidence if multiple factors align
        if (analysis.multiTimeframeAnalysis) {
            const trends = Object.values(analysis.multiTimeframeAnalysis).map(tf => tf.trend);
            const uniqueTrends = [...new Set(trends)];
            
            if (uniqueTrends.length === 1 && uniqueTrends[0] !== 'SIDEWAYS') {
                validation.enhancements.push('Strong multi-timeframe alignment');
                validation.confidence = Math.min(95, validation.confidence + 5);
            }
        }

        validation.isValid = validation.issues.length === 0;
        
        return validation;
    }

    /**
     * Perform confluence analysis across multiple timeframes
     */
    async performConfluenceAnalysis(results) {
        const confluence = {
            timeframes: {},
            overallTrend: 'NEUTRAL',
            strength: 0,
            confidence: 0,
            agreements: 0,
            conflicts: 0
        };

        // Analyze each timeframe result
        results.forEach(({ timeframe, result }) => {
            if (result.success && result.analysis) {
                confluence.timeframes[timeframe] = {
                    trend: result.analysis.tradingSignal?.direction || 'NEUTRAL',
                    confidence: result.analysis.overallConfidence || 0,
                    recommendation: result.analysis.recommendation || 'WAIT'
                };
            }
        });

        // Calculate agreements and conflicts
        const trends = Object.values(confluence.timeframes).map(tf => tf.trend);
        const upCount = trends.filter(t => t === 'UP').length;
        const downCount = trends.filter(t => t === 'DOWN').length;
        
        confluence.agreements = Math.max(upCount, downCount);
        confluence.conflicts = trends.length - confluence.agreements;

        // Determine overall trend
        if (upCount > downCount) {
            confluence.overallTrend = 'UP';
            confluence.strength = (upCount / trends.length) * 10;
        } else if (downCount > upCount) {
            confluence.overallTrend = 'DOWN';
            confluence.strength = (downCount / trends.length) * 10;
        } else {
            confluence.overallTrend = 'NEUTRAL';
            confluence.strength = 5;
        }

        // Calculate overall confidence
        const confidences = Object.values(confluence.timeframes).map(tf => tf.confidence);
        confluence.confidence = confidences.length > 0 
            ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
            : 0;

        return confluence;
    }

    /**
     * Generate multi-timeframe trading signal
     */
    generateMultiTimeframeSignal(confluenceAnalysis, results) {
        const signal = {
            direction: confluenceAnalysis.overallTrend,
            confidence: confluenceAnalysis.confidence,
            strength: confluenceAnalysis.strength,
            timeframeAgreement: confluenceAnalysis.agreements,
            timeframeConflicts: confluenceAnalysis.conflicts,
            recommendation: 'WAIT',
            riskLevel: 'HIGH'
        };

        // Determine recommendation based on confluence
        if (confluenceAnalysis.agreements >= 2 && confluenceAnalysis.confidence >= 75) {
            signal.recommendation = signal.direction === 'UP' ? 'BUY' : 'SELL';
            signal.riskLevel = confluenceAnalysis.confidence >= 85 ? 'LOW' : 'MEDIUM';
        } else if (confluenceAnalysis.agreements >= 2 && confluenceAnalysis.confidence >= 70) {
            signal.recommendation = signal.direction === 'UP' ? 'BUY' : 'SELL';
            signal.riskLevel = 'MEDIUM';
        }

        // Add reasoning
        signal.reasoning = `Multi-timeframe analysis: ${confluenceAnalysis.agreements}/${results.length} timeframes agree on ${signal.direction} direction with ${signal.confidence.toFixed(1)}% confidence`;

        return signal;
    }

    /**
     * Generate comprehensive analysis report
     */
    generateComprehensiveReport(data) {
        return {
            success: true,
            processingId: data.processingId,
            processingTime: data.processingTime,
            timestamp: new Date().toISOString(),
            
            // Input data
            input: {
                imagePath: data.imagePath,
                options: data.options
            },
            
            // OCR results
            ocrResults: {
                method: 'Google Vision API',
                success: data.visionResult.success,
                confidence: data.visionResult.confidence,
                tradingData: data.visionResult.tradingData,
                processingTime: data.visionResult.processingTime
            },
            
            // AI analysis
            aiAnalysis: {
                method: data.aiResult.method || `${data.aiResult.aiProvider} AI`,
                provider: data.aiResult.aiProvider,
                fallbackUsed: data.aiResult.fallbackUsed || false,
                originalProvider: data.aiResult.originalProvider,
                success: data.aiResult.success,
                confidence: data.aiResult.confidence,
                analysis: data.aiResult.analysis,
                processingTime: data.aiResult.processingTime
            },

            // Signal validation
            validation: data.validatedSignal,

            // Final trading signal
            tradingSignal: {
                direction: data.aiResult.analysis?.tradingSignal?.direction || 'WAIT',
                confidence: data.validatedSignal.confidence,
                recommendation: data.aiResult.analysis?.recommendation || 'WAIT',
                riskLevel: data.aiResult.analysis?.riskLevel || 'HIGH',
                reasoning: data.groqResult.analysis?.tradingSignal?.reasoning || 'Insufficient data for signal generation'
            },
            
            // Quality metrics
            quality: {
                ocrQuality: data.groqResult.analysis?.metadata?.visionDataQuality?.level || 'UNKNOWN',
                signalQuality: data.validatedSignal.isValid ? 'VALID' : 'INVALID',
                overallQuality: this.calculateOverallQuality(data)
            }
        };
    }

    /**
     * Calculate overall quality score
     */
    calculateOverallQuality(data) {
        let score = 0;
        
        // OCR quality (30%)
        if (data.visionResult.confidence >= 0.8) score += 30;
        else if (data.visionResult.confidence >= 0.6) score += 20;
        else score += 10;
        
        // AI analysis quality (40%)
        if (data.groqResult.confidence >= 85) score += 40;
        else if (data.groqResult.confidence >= 75) score += 30;
        else if (data.groqResult.confidence >= 70) score += 20;
        else score += 10;
        
        // Validation quality (30%)
        if (data.validatedSignal.isValid && data.validatedSignal.issues.length === 0) score += 30;
        else if (data.validatedSignal.isValid) score += 20;
        else score += 10;
        
        return {
            score: score,
            level: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW'
        };
    }

    /**
     * Update processing statistics
     */
    updateProcessingStats(success, processingTime) {
        this.processingStats.totalProcessed++;
        
        if (success) {
            this.processingStats.successfulAnalyses++;
        } else {
            this.processingStats.failedAnalyses++;
        }
        
        // Update average processing time
        const totalTime = this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) + processingTime;
        this.processingStats.averageProcessingTime = totalTime / this.processingStats.totalProcessed;
    }

    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            successRate: this.processingStats.totalProcessed > 0 
                ? (this.processingStats.successfulAnalyses / this.processingStats.totalProcessed) * 100 
                : 0
        };
    }

    /**
     * Get available AI providers
     */
    getAvailableAIProviders() {
        return {
            configured: Object.keys(this.aiServices),
            primary: this.primaryAiService,
            fallbackEnabled: this.config.enableFallback
        };
    }

    /**
     * Switch primary AI provider
     */
    switchPrimaryAIProvider(provider) {
        if (this.aiServices[provider]) {
            this.primaryAiService = provider;
            console.log(`🔄 Switched primary AI provider to: ${provider}`);
            return true;
        } else {
            console.warn(`⚠️ AI provider '${provider}' not available`);
            return false;
        }
    }

    /**
     * Get pipeline statistics
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            successRate: this.processingStats.totalProcessed > 0
                ? (this.processingStats.successfulAnalyses / this.processingStats.totalProcessed) * 100
                : 0,
            aiProviders: this.getAvailableAIProviders()
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        try {
            this.visionService.cleanup();

            // Cleanup AI services
            for (const service of Object.values(this.aiServices)) {
                if (service.cleanup) {
                    service.cleanup();
                }
            }

            console.log('✅ Pipeline cleanup completed');
        } catch (error) {
            console.warn('⚠️ Pipeline cleanup warning:', error.message);
        }
    }
}

module.exports = GoogleVisionGroqPipeline;
