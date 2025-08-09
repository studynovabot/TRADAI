/**
 * 🎯 DETERMINISTIC GEMINI VISION SERVICE FOR SCALPING SIGNALS
 * 
 * Ultra-refined service that analyzes the most recent CLOSED candle with:
 * - Deterministic structured JSON outputs (temperature 0.0-0.2)
 * - Closed candle rule enforcement
 * - Timestamp validation and alignment
 * - Reduced false signals for 1m/3m/5m scalping
 * - Sanity checks and overrides
 * - Performance monitoring
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');
const DeterministicPrompts = require('../lib/DeterministicPrompts');
const DeterministicLogger = require('../lib/DeterministicLogger');

// Load environment variables
require('dotenv').config();

class DeterministicGeminiVisionService {
    constructor(config = {}) {
        this.config = {
            // API Configuration
            apiKeys: config.apiKeys || null,
            models: config.models || ['gemini-2.5-flash', 'gemini-2.5-flash-latest', 'gemini-1.5-pro'],
            temperature: config.temperature || 0.1, // Deterministic setting
            maxTokens: config.maxTokens || 512,
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            
            // Deterministic Configuration
            allowedSkewSeconds: config.allowedSkewSeconds || 2,
            latencyThresholdMs: config.latencyThresholdMs || 3000,
            confidenceReductionOnLatency: config.confidenceReductionOnLatency || 30,
            
            // Scalping Configuration
            scalingTimeframes: config.scalingTimeframes || ['1m', '3m', '5m'],
            minConfidenceForScalping: config.minConfidenceForScalping || 75,
            
            // Image Processing
            imagePreprocessing: config.imagePreprocessing !== false,
            standardWidth: config.standardWidth || 1280,
            
            ...config
        };

        // Initialize failover state
        this.currentKeyIndex = 0;
        this.currentModelIndex = 0;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;

        // Initialize logger
        this.logger = new DeterministicLogger({
            logLevel: config.debugMode ? 'debug' : 'info',
            logToFile: true,
            logToConsole: config.debugMode,
            enablePerformanceTracking: true,
            enableAccuracyTracking: true
        });

        // Performance tracking (delegated to logger)
        this.performanceMetrics = {
            totalRequests: 0,
            averageLatency: 0,
            latencyExceededCount: 0,
            ocrConflictCount: 0,
            numericFeedUsedCount: 0,
            signalCounts: { BUY: 0, SELL: 0, HOLD: 0 },
            confidenceDistribution: { high: 0, medium: 0, low: 0 }
        };

        // Scoring weights for 1m/3m/5m scalping
        this.scoringWeights = {
            ema_crossover: 35,      // EMA5 vs EMA20 - highest priority
            bollinger_position: 25,  // Price vs Bollinger midline
            stochastic: 20,         // K/D crossover & slope
            candle_body_wick: 10,   // Candle strength
            volume_activity: 10     // Volume/activity (if available)
        };
    }

    /**
     * Load API keys from environment variables
     */
    loadApiKeysFromEnv() {
        const keys = [];

        // Primary keys
        if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
        if (process.env.GOOGLE_VISION_API_KEY) keys.push(process.env.GOOGLE_VISION_API_KEY);

        // Additional keys
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_API_KEY_${i}`];
            if (key) keys.push(key);
        }

        if (keys.length === 0) {
            throw new Error('No Gemini API keys found in environment variables');
        }

        console.log(`🔑 Loaded ${keys.length} Gemini API keys for deterministic analysis`);
        return keys;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            console.log('🎯 Initializing Deterministic Gemini Vision Service...');

            if (!this.config.apiKeys) {
                this.config.apiKeys = this.loadApiKeysFromEnv();
            }

            this.initializeCurrentClient();
            await this.testConnection();

            this.isInitialized = true;
            console.log('✅ Deterministic Gemini Vision Service initialized successfully');

            return { success: true, message: 'Service ready for deterministic analysis' };
        } catch (error) {
            console.error('❌ Failed to initialize Deterministic Gemini Vision Service:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Initialize current Gemini client
     */
    initializeCurrentClient() {
        const currentKey = this.config.apiKeys[this.currentKeyIndex];
        const currentModel = this.config.models[this.currentModelIndex];

        this.genAI = new GoogleGenerativeAI(currentKey);
        this.model = this.genAI.getGenerativeModel({
            model: currentModel,
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxTokens,
                responseMimeType: "application/json" // Force JSON response
            }
        });

        console.log(`🔧 Initialized client with key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}, model: ${currentModel}`);
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Deterministic Gemini API connection...');
            const testPrompt = 'Respond with valid JSON: {"status": "OK", "test": true}';
            
            const result = await this.model.generateContent(testPrompt);
            const response = await result.response;
            const text = response.text();

            const parsed = JSON.parse(text);
            if (parsed.status === 'OK') {
                console.log('✅ Deterministic Gemini API connection successful');
                return true;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('❌ Deterministic Gemini API connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Switch to next API key/model on failure
     */
    switchToNextKey() {
        this.currentKeyIndex++;
        if (this.currentKeyIndex >= this.config.apiKeys.length) {
            this.currentKeyIndex = 0;
            this.currentModelIndex++;
            if (this.currentModelIndex >= this.config.models.length) {
                throw new Error('All Gemini API keys and models exhausted');
            }
        }
        this.initializeCurrentClient();
        console.log(`🔄 Switched to API key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}`);
    }

    /**
     * Preprocess image for reliable analysis
     */
    async preprocessImage(imageBuffer) {
        if (!this.config.imagePreprocessing) {
            return imageBuffer;
        }

        try {
            console.log('🔧 Preprocessing image for deterministic analysis...');
            
            let processedImage = sharp(imageBuffer);
            const metadata = await processedImage.metadata();
            
            // Standardize image size and enhance quality
            processedImage = processedImage
                .resize(this.config.standardWidth, null, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .sharpen({ sigma: 1.0, flat: 1, jagged: 1.5 })
                .normalize()
                .modulate({ brightness: 1.05, saturation: 1.1 })
                .png({ quality: 95, compressionLevel: 6 });

            // Smart crop to focus on chart area
            const cropOptions = this.calculateChartCropRegion(metadata);
            if (cropOptions) {
                processedImage = processedImage.extract(cropOptions);
                console.log('✂️ Auto-cropped chart region for better analysis');
            }

            const processedBuffer = await processedImage.toBuffer();
            console.log(`✅ Image preprocessed: ${processedBuffer.length} bytes`);
            
            return processedBuffer;
        } catch (error) {
            console.warn('⚠️ Image preprocessing failed, using original:', error.message);
            return imageBuffer;
        }
    }

    /**
     * Calculate crop region to focus on chart area
     */
    calculateChartCropRegion(metadata) {
        const { width, height } = metadata;
        
        if (width < 800 || height < 600) {
            return null;
        }

        // Remove UI elements and focus on chart
        return {
            left: Math.floor(width * 0.02),
            top: Math.floor(height * 0.06),
            width: Math.floor(width * 0.96),
            height: Math.floor(height * 0.88)
        };
    }

    /**
     * Determine the timestamp of the most recent closed candle
     */
    determineAnalyzedCandleTimestamp(metadata) {
        const screenshotTimestamp = new Date(metadata.screenshot_timestamp_iso);
        
        // If platform provides time-to-close, calculate closed candle timestamp
        if (metadata.platform_time_to_close_secs !== undefined) {
            const timeToCloseMs = metadata.platform_time_to_close_secs * 1000;
            const analyzedTimestamp = new Date(screenshotTimestamp.getTime() - timeToCloseMs);
            
            console.log(`📅 Calculated analyzed candle timestamp from time-to-close: ${analyzedTimestamp.toISOString()}`);
            return analyzedTimestamp.toISOString();
        }

        // Fallback: assume screenshot was taken at candle close
        // Round down to the nearest timeframe interval
        const timeframeMs = this.getTimeframeInMs(metadata.timeframe);
        const roundedTimestamp = new Date(Math.floor(screenshotTimestamp.getTime() / timeframeMs) * timeframeMs);
        
        console.log(`📅 Estimated analyzed candle timestamp: ${roundedTimestamp.toISOString()}`);
        return roundedTimestamp.toISOString();
    }

    /**
     * Convert timeframe string to milliseconds
     */
    getTimeframeInMs(timeframe) {
        const timeframeMap = {
            '1m': 60 * 1000,
            '3m': 3 * 60 * 1000,
            '5m': 5 * 60 * 1000,
            '15m': 15 * 60 * 1000,
            '30m': 30 * 60 * 1000,
            '1h': 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '1d': 24 * 60 * 60 * 1000
        };
        return timeframeMap[timeframe] || 5 * 60 * 1000; // Default to 5m
    }

    /**
     * Create deterministic analysis prompt using the centralized prompt module
     */
    createDeterministicPrompt(metadata) {
        const analyzedCandleTimestamp = this.determineAnalyzedCandleTimestamp(metadata);
        
        const systemPrompt = DeterministicPrompts.getSystemPrompt();
        const userPrompt = DeterministicPrompts.getAnalysisPrompt(metadata, analyzedCandleTimestamp);

        return { systemPrompt, userPrompt };
    }

    /**
     * Get required JSON schema for response validation
     */
    getResponseSchema() {
        return {
            pair: "string",
            timeframe: "string", 
            analyzed_candle_timestamp: "ISO8601",
            screenshot_timestamp: "ISO8601",
            pipeline_latency_ms: "int",
            ohlc: {
                open: "float",
                high: "float", 
                low: "float",
                close: "float"
            },
            indicators: {
                EMA5: "float",
                EMA20: "float",
                Bollinger_mid: "float",
                Bollinger_upper: "float",
                Bollinger_lower: "float",
                Stochastic_K: "float",
                Stochastic_D: "float"
            },
            signal: "BUY|SELL|HOLD",
            confidence: "0-100",
            factor_scores: [
                {
                    factor: "EMA_crossover",
                    score: "-100..100",
                    explanation: "string"
                },
                {
                    factor: "Bollinger_position", 
                    score: "-100..100",
                    explanation: "string"
                },
                {
                    factor: "Stochastic",
                    score: "-100..100", 
                    explanation: "string"
                },
                {
                    factor: "Candle_body_wick",
                    score: "-100..100",
                    explanation: "string"
                },
                {
                    factor: "Volume_or_activity",
                    score: "-100..100",
                    explanation: "string (optional if volume not available)"
                }
            ],
            next_3_candles: [
                {
                    candle_index: 1,
                    direction: "UP|DOWN|NEUTRAL",
                    probability: "0-100",
                    reason: "string"
                }
            ],
            support_levels: ["float"],
            resistance_levels: ["float"],
            raw_ocr: {
                time_axis_reading: "string",
                numeric_price_reading: "string"
            },
            notes: "string"
        };
    }

    /**
     * Main analysis method
     */
    async analyzeChartImage(imageBuffer, metadata) {
        const startTime = Date.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Log analysis start
            this.logger.logAnalysisStart(requestId, metadata);
            this.logger.info('🎯 Starting deterministic chart analysis...', { requestId });
            
            // Update performance metrics
            this.performanceMetrics.totalRequests++;

            // 1. Preprocess image
            const processedImageBuffer = await this.preprocessImage(imageBuffer);

            // 2. Prepare image data for Gemini
            const imageData = {
                inlineData: {
                    data: processedImageBuffer.toString('base64'),
                    mimeType: this.detectMimeType(processedImageBuffer)
                }
            };

            // 3. Create deterministic prompt
            const { systemPrompt, userPrompt } = this.createDeterministicPrompt(metadata);

            // 4. Call Gemini with failover
            this.logger.info('🤖 Sending deterministic request to Gemini...', { requestId });
            const response = await this.callGeminiWithFailover(systemPrompt, userPrompt, imageData, requestId);

            const pipelineLatency = Date.now() - startTime;

            // 5. Parse and validate response
            const analysis = this.parseAndValidateResponse(response, metadata, pipelineLatency);

            // 6. Apply sanity checks and overrides
            const originalAnalysis = { ...analysis };
            const finalAnalysis = this.applySanityChecks(analysis, pipelineLatency);

            // Log sanity checks if changes were made
            if (originalAnalysis.signal !== finalAnalysis.signal || originalAnalysis.confidence !== finalAnalysis.confidence) {
                this.logger.logSanityChecks(requestId, originalAnalysis, finalAnalysis, {
                    latencyCheck: pipelineLatency > this.config.latencyThresholdMs,
                    scalingCheck: this.config.scalingTimeframes.includes(metadata.timeframe)
                });
            }

            // 7. Update performance metrics
            this.updatePerformanceMetrics(finalAnalysis, pipelineLatency);

            // Log completion
            this.logger.logAnalysisComplete(requestId, finalAnalysis, pipelineLatency);
            this.logger.info(`✅ Deterministic analysis completed: ${finalAnalysis.signal} (${finalAnalysis.confidence}%) in ${pipelineLatency}ms`, { requestId });

            return {
                success: true,
                analysis: finalAnalysis,
                metadata: {
                    processing_time: pipelineLatency,
                    model_used: this.config.models[this.currentModelIndex],
                    api_key_index: this.currentKeyIndex + 1,
                    request_id: requestId
                }
            };

        } catch (error) {
            const pipelineLatency = Date.now() - startTime;
            
            // Log error
            this.logger.logAnalysisError(requestId, error, pipelineLatency);
            this.logger.error('❌ Deterministic analysis failed:', { requestId, error: error.message });
            
            return {
                success: false,
                error: error.message,
                metadata: {
                    processing_time: pipelineLatency,
                    error_type: 'analysis_failure',
                    request_id: requestId
                }
            };
        }
    }

    /**
     * Call Gemini with failover mechanism
     */
    async callGeminiWithFailover(systemPrompt, userPrompt, imageData, requestId, retryCount = 0) {
        try {
            const result = await this.model.generateContent([
                { text: systemPrompt },
                { text: userPrompt },
                imageData
            ]);

            const response = await result.response;
            return response.text();

        } catch (error) {
            this.logger.error(`❌ Gemini API call failed (attempt ${retryCount + 1}):`, { 
                requestId, 
                error: error.message,
                currentModel: this.config.models[this.currentModelIndex],
                currentKeyIndex: this.currentKeyIndex
            });

            if (retryCount < this.config.maxRetries) {
                // Log model failover
                const fromModel = this.config.models[this.currentModelIndex];
                this.switchToNextKey();
                const toModel = this.config.models[this.currentModelIndex];
                
                this.logger.logModelFailover(requestId, fromModel, toModel, error.message);
                
                return this.callGeminiWithFailover(systemPrompt, userPrompt, imageData, requestId, retryCount + 1);
            }

            throw new Error(`All Gemini API attempts failed: ${error.message}`);
        }
    }

    /**
     * Parse and validate Gemini response
     */
    parseAndValidateResponse(responseText, metadata, pipelineLatency) {
        try {
            const analysis = JSON.parse(responseText);
            
            // Validate required fields
            const requiredFields = ['pair', 'timeframe', 'analyzed_candle_timestamp', 'signal', 'confidence'];
            for (const field of requiredFields) {
                if (analysis[field] === undefined) {
                    throw new Error(`Missing required field: ${field}`);
                }
            }

            // Add metadata
            analysis.screenshot_timestamp = metadata.screenshot_timestamp_iso;
            analysis.pipeline_latency_ms = pipelineLatency;

            // Validate signal
            if (!['BUY', 'SELL', 'HOLD'].includes(analysis.signal)) {
                throw new Error(`Invalid signal: ${analysis.signal}`);
            }

            // Validate confidence
            if (typeof analysis.confidence !== 'number' || analysis.confidence < 0 || analysis.confidence > 100) {
                throw new Error(`Invalid confidence: ${analysis.confidence}`);
            }

            return analysis;

        } catch (error) {
            console.error('❌ Failed to parse Gemini response:', error);
            throw new Error(`Invalid JSON response from Gemini: ${error.message}`);
        }
    }

    /**
     * Apply sanity checks and overrides
     */
    applySanityChecks(analysis, pipelineLatency) {
        let finalAnalysis = { ...analysis };
        let confidenceReduction = 0;
        const notes = [];

        // Check pipeline latency
        if (pipelineLatency > this.config.latencyThresholdMs) {
            confidenceReduction += this.config.confidenceReductionOnLatency;
            notes.push(`High latency detected: ${pipelineLatency}ms > ${this.config.latencyThresholdMs}ms`);
            
            // Force HOLD for very high latency
            if (pipelineLatency > this.config.latencyThresholdMs * 2) {
                finalAnalysis.signal = 'HOLD';
                notes.push('Signal forced to HOLD due to excessive latency');
            }
        }

        // Check for contradictory indicators
        if (analysis.factor_scores) {
            const scores = analysis.factor_scores;
            const emaScore = scores.find(s => s.factor === 'EMA_crossover')?.score || 0;
            const stochScore = scores.find(s => s.factor === 'Stochastic')?.score || 0;
            
            // If EMA and Stochastic strongly contradict
            if (Math.abs(emaScore - stochScore) > 80) {
                confidenceReduction += 20;
                notes.push('Strong contradiction between EMA and Stochastic indicators');
            }
        }

        // Apply confidence reduction
        if (confidenceReduction > 0) {
            finalAnalysis.confidence = Math.max(0, finalAnalysis.confidence - confidenceReduction);
            notes.push(`Confidence reduced by ${confidenceReduction}%`);
        }

        // Conservative approach for scalping timeframes
        if (this.config.scalingTimeframes.includes(analysis.timeframe)) {
            if (finalAnalysis.confidence < this.config.minConfidenceForScalping) {
                finalAnalysis.signal = 'HOLD';
                notes.push(`Signal changed to HOLD for scalping (confidence ${finalAnalysis.confidence}% < ${this.config.minConfidenceForScalping}%)`);
            }
        }

        // Add notes to analysis
        if (notes.length > 0) {
            finalAnalysis.notes = (finalAnalysis.notes || '') + ' ' + notes.join('. ');
        }

        return finalAnalysis;
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(analysis, latency) {
        const metrics = this.performanceMetrics;
        
        // Update latency
        metrics.averageLatency = ((metrics.averageLatency * (metrics.totalRequests - 1)) + latency) / metrics.totalRequests;
        
        if (latency > this.config.latencyThresholdMs) {
            metrics.latencyExceededCount++;
        }

        // Update signal counts
        metrics.signalCounts[analysis.signal]++;

        // Update confidence distribution
        if (analysis.confidence >= 80) {
            metrics.confidenceDistribution.high++;
        } else if (analysis.confidence >= 60) {
            metrics.confidenceDistribution.medium++;
        } else {
            metrics.confidenceDistribution.low++;
        }

        // Also update logger metrics
        this.logger.updatePerformanceMetrics(analysis, latency);
    }

    /**
     * Detect MIME type from image buffer
     */
    detectMimeType(buffer) {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return 'image/png';
        }
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'image/jpeg';
        }
        if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return 'image/webp';
        }
        return 'image/png';
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const loggerMetrics = this.logger.getPerformanceMetrics();
        return {
            ...this.performanceMetrics,
            ...loggerMetrics,
            uptime: Date.now() - (this.initTime || Date.now()),
            current_model: this.config.models[this.currentModelIndex],
            current_key_index: this.currentKeyIndex + 1,
            total_keys: this.config.apiKeys?.length || 0
        };
    }

    /**
     * Get accuracy metrics
     */
    getAccuracyMetrics() {
        return this.logger.getAccuracyMetrics();
    }

    /**
     * Generate performance report
     */
    generatePerformanceReport() {
        return this.logger.generatePerformanceReport();
    }

    /**
     * Save performance report
     */
    savePerformanceReport() {
        return this.logger.savePerformanceReport();
    }

    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
        this.performanceMetrics = {
            totalRequests: 0,
            averageLatency: 0,
            latencyExceededCount: 0,
            ocrConflictCount: 0,
            numericFeedUsedCount: 0,
            signalCounts: { BUY: 0, SELL: 0, HOLD: 0 },
            confidenceDistribution: { high: 0, medium: 0, low: 0 }
        };
        console.log('📊 Performance metrics reset');
    }
}

module.exports = DeterministicGeminiVisionService;