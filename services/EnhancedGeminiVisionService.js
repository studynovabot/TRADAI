/**
 * Enhanced Gemini Vision Analysis Service for Trading Signal Generation
 * Implements advanced signal accuracy improvements with multi-factor confirmation,
 * image preprocessing, backtesting capabilities, and structured analysis
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const sharp = require('sharp'); // For image preprocessing
const path = require('path');

class EnhancedGeminiVisionService {
    constructor(config = {}) {
        this.config = {
            apiKeys: config.apiKeys || null,
            models: config.models || ['gemini-2.5-flash', 'gemini-2.5-flash-latest'],
            temperature: config.temperature || 0.1,
            maxTokens: config.maxTokens || 4000,
            timeout: config.timeout || 60000,
            minConfidence: config.minConfidence || 60, // Lower threshold for uncertainty handling
            maxConfidence: config.maxConfidence || 95,
            maxRetries: config.maxRetries || 3,
            baseDelay: config.baseDelay || 1000,
            
            // Enhanced configuration options
            imagePreprocessing: config.imagePreprocessing !== false, // Enable by default
            multiFactorConfirmation: config.multiFactorConfirmation !== false,
            contradictionHandling: config.contradictionHandling !== false,
            backtestingEnabled: config.backtestingEnabled || false,
            uncertaintyThreshold: config.uncertaintyThreshold || 60,
            
            ...config
        };

        // Initialize failover state
        this.currentKeyIndex = 0;
        this.currentModelIndex = 0;
        this.genAI = null;
        this.model = null;

        this.isInitialized = false;
        this.analysisStats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            uncertainAnalyses: 0,
            contradictoryAnalyses: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            retriesUsed: 0,
            keyRotations: 0,
            modelFallbacks: 0,
            backtestResults: []
        };

        // Backtesting storage
        this.historicalPredictions = [];
        this.backtestingResults = {
            totalPredictions: 0,
            correctPredictions: 0,
            accuracy: 0,
            confidenceCalibration: {}
        };
    }

    /**
     * Load API keys from environment variables
     */
    loadApiKeysFromEnv() {
        const keys = [];

        // Primary key
        if (process.env.GOOGLE_VISION_API_KEY) {
            keys.push(process.env.GOOGLE_VISION_API_KEY);
        }

        // Additional keys (GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.)
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_API_KEY_${i}`];
            if (key) {
                keys.push(key);
            }
        }

        if (keys.length === 0) {
            throw new Error('No Gemini API keys found in environment variables');
        }

        console.log(`🔑 Loaded ${keys.length} Gemini API keys for failover`);
        return keys;
    }

    /**
     * Initialize current Gemini client with current key and model
     */
    initializeCurrentClient() {
        const currentKey = this.getCurrentKey();
        const currentModel = this.getCurrentModel();

        this.genAI = new GoogleGenerativeAI(currentKey);
        this.model = this.genAI.getGenerativeModel({
            model: currentModel,
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxTokens
            }
        });

        console.log(`🔧 Initialized Enhanced Gemini client with key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}, model: ${currentModel}`);
    }

    /**
     * Get current API key
     */
    getCurrentKey() {
        return this.config.apiKeys[this.currentKeyIndex];
    }

    /**
     * Get current model
     */
    getCurrentModel() {
        return this.config.models[this.currentModelIndex];
    }

    /**
     * Switch to next API key
     */
    switchToNextKey() {
        this.currentKeyIndex++;
        if (this.currentKeyIndex >= this.config.apiKeys.length) {
            this.currentKeyIndex = 0;
            this.switchToNextModel();
        }

        this.analysisStats.keyRotations++;
        this.initializeCurrentClient();
        console.log(`🔄 Switched to API key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}`);
    }

    /**
     * Switch to next model
     */
    switchToNextModel() {
        this.currentModelIndex++;
        if (this.currentModelIndex >= this.config.models.length) {
            throw new Error('All Gemini API keys and models exhausted');
        }

        this.analysisStats.modelFallbacks++;
        console.log(`🔄 Switched to model: ${this.getCurrentModel()}`);
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Enhanced Gemini Vision Service...');

            // Load API keys if not already loaded
            if (!this.config.apiKeys) {
                this.config.apiKeys = this.loadApiKeysFromEnv();
            }

            if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
                throw new Error('Google API key is required for Gemini');
            }

            // Initialize the current client with loaded API keys
            this.initializeCurrentClient();

            // Test API connection
            await this.testConnection();

            this.isInitialized = true;
            console.log('✅ Enhanced Gemini Vision Service initialized successfully');

            return {
                success: true,
                message: 'Enhanced Gemini Vision Service ready',
                features: {
                    imagePreprocessing: this.config.imagePreprocessing,
                    multiFactorConfirmation: this.config.multiFactorConfirmation,
                    contradictionHandling: this.config.contradictionHandling,
                    backtestingEnabled: this.config.backtestingEnabled
                }
            };
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Gemini Vision Service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Enhanced Gemini API connection...');
            const text = await this.callGeminiWithFailover('Test connection - respond with "OK"');

            if (text && text.toLowerCase().includes('ok')) {
                console.log('✅ Enhanced Gemini API connection successful');
                return true;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('❌ Enhanced Gemini API connection failed:', error.message);
            throw error;
        }
    }

    /**
     * 1️⃣ Image Preprocessing: Enhance image quality and crop chart region
     */
    async preprocessImage(imageBuffer, options = {}) {
        if (!this.config.imagePreprocessing) {
            console.log('📷 Image preprocessing disabled, using original image');
            return imageBuffer;
        }

        try {
            console.log('🔧 Preprocessing image for enhanced analysis...');
            
            let processedImage = sharp(imageBuffer);
            
            // Get image metadata
            const metadata = await processedImage.metadata();
            console.log(`📊 Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

            // Enhance image quality
            processedImage = processedImage
                .resize(Math.min(metadata.width, 1920), Math.min(metadata.height, 1080), {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .sharpen()
                .normalize()
                .png({ quality: 95 });

            // Auto-crop to focus on chart area (remove UI elements)
            if (options.autoCrop !== false) {
                // Detect and crop chart region (this is a simplified approach)
                // In a production environment, you might want to use more sophisticated
                // computer vision techniques to detect the actual chart boundaries
                const cropOptions = this.calculateCropRegion(metadata);
                if (cropOptions) {
                    processedImage = processedImage.extract(cropOptions);
                    console.log('✂️ Auto-cropped chart region');
                }
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
    calculateCropRegion(metadata) {
        // Simple heuristic to crop common UI elements
        // This removes typical margins and focuses on the central chart area
        const { width, height } = metadata;
        
        if (width < 800 || height < 600) {
            return null; // Don't crop small images
        }

        return {
            left: Math.floor(width * 0.05),
            top: Math.floor(height * 0.1),
            width: Math.floor(width * 0.9),
            height: Math.floor(height * 0.8)
        };
    }

    /**
     * Detect MIME type from image buffer
     */
    detectMimeType(buffer) {
        // Check for PNG signature
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return 'image/png';
        }
        // Check for JPEG signature
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'image/jpeg';
        }
        // Check for WebP signature
        if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return 'image/webp';
        }
        return 'image/png';
    }

    /**
     * Main analysis method with enhanced accuracy features
     */
    async analyzeChartImage(imageBuffer, options = {}) {
        const startTime = Date.now();

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log('📊 Starting Enhanced Gemini Vision Analysis...');

            // 1️⃣ Image Preprocessing
            const processedImageBuffer = await this.preprocessImage(imageBuffer, options);

            // Prepare image data for Gemini
            const imageData = {
                inlineData: {
                    data: processedImageBuffer.toString('base64'),
                    mimeType: this.detectMimeType(processedImageBuffer)
                }
            };

            // 2️⃣ Create Enhanced Analysis Prompt
            const prompt = this.createEnhancedAnalysisPrompt(options);

            console.log('🤖 Sending enhanced request to Gemini...');

            // Send request to Gemini with failover
            const text = await this.callGeminiWithFailover(prompt, imageData);

            const processingTime = Date.now() - startTime;

            // 3️⃣ Parse and validate response with enhanced logic
            const analysis = await this.parseAndValidateResponse(text, options);

            // 4️⃣ Multi-Factor Confirmation
            const confirmedAnalysis = this.applyMultiFactorConfirmation(analysis);

            // 5️⃣ Contradiction Handling
            const finalAnalysis = this.handleContradictions(confirmedAnalysis);

            // 6️⃣ Update statistics and backtesting data
            this.updateEnhancedStats(finalAnalysis, processingTime);

            // 7️⃣ Store for backtesting if enabled
            if (this.config.backtestingEnabled) {
                this.storePredictionForBacktest(finalAnalysis, options);
            }

            console.log(`✅ Enhanced analysis completed in ${processingTime}ms`);
            console.log(`📊 Final confidence: ${finalAnalysis.overallConfidence}%`);

            return {
                success: true,
                analysis: finalAnalysis,
                confidence: finalAnalysis.overallConfidence,
                processingTime: processingTime,
                metadata: {
                    model: this.getCurrentModel(),
                    timestamp: new Date().toISOString(),
                    imageSize: processedImageBuffer.length,
                    originalImageSize: imageBuffer.length,
                    analysisMethod: 'Enhanced Gemini Vision',
                    featuresUsed: {
                        imagePreprocessing: this.config.imagePreprocessing,
                        multiFactorConfirmation: this.config.multiFactorConfirmation,
                        contradictionHandling: this.config.contradictionHandling
                    }
                }
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('❌ Enhanced chart analysis failed:', error.message);

            return {
                success: false,
                error: error.message,
                processingTime: processingTime,
                metadata: {
                    analysisMethod: 'Enhanced Gemini Vision',
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * 2️⃣ Create Enhanced Analysis Prompt with Multi-Factor Requirements
     */
    createEnhancedAnalysisPrompt(options = {}) {
        const { asset = 'Auto-detect', timeframe = 'Auto-detect', platform = 'Trading Platform' } = options;

        return `You are a world-class institutional forex trader and technical analyst with 25+ years of experience. You are analyzing a trading chart image using advanced multi-factor confirmation methodology.

CRITICAL ANALYSIS REQUIREMENTS:

🔍 **TECHNICAL INDICATOR VERIFICATION:**
- Explicitly identify EMA/MA lines and their crossover directions (up/down)
- Analyze candlestick patterns with trend context (pin bars, engulfing, dojis)
- Stochastic oscillator state: %K crossing above/below %D, current values vs overbought (>80) or oversold (<20) zones
- RSI levels and divergence patterns
- Volume analysis relative to recent periods
- MACD signal line crossovers and histogram analysis

🎯 **MULTI-FACTOR CONFIRMATION (MINIMUM 3 CONFLUENCES REQUIRED):**
- Indicator agreement: EMA crossover + stochastic + candlestick signal alignment
- Trend alignment: higher highs/lows for uptrend, lower highs/lows for downtrend
- Price behavior near support/resistance levels
- Volume confirmation of price movements
- Multi-timeframe confluence (1m, 3m, 5m alignment)

📊 **EXPLICIT BIAS DETECTION:**
- Analyze recent 5-10 candles for dominant trend direction
- Identify volatility shifts and momentum changes
- Detect momentum exhaustion signals (stochastic divergence, RSI extremes)
- Assess market structure breaks

⚖️ **CONTRADICTION HANDLING:**
If signals are mixed (e.g., EMA bullish but stochastic bearish):
- Issue NO_TRADE signal, OR
- Reduce confidence percentage below 60% with detailed reasoning
- Explicitly state conflicting factors

🎯 **ENHANCED OUTPUT REQUIREMENTS:**

Respond with this EXACT JSON structure:

{
  "detectedAsset": "auto-detected trading pair",
  "detectedTimeframe": "auto-detected timeframe", 
  "currentPrice": "visible current price",
  "technicalIndicatorVerification": {
    "emaAnalysis": {
      "fastEMA": {"value": number, "position": "above/below price"},
      "slowEMA": {"value": number, "position": "above/below price"},
      "crossover": "bullish/bearish/none",
      "signal": "BUY/SELL/NEUTRAL",
      "confidence": 70-95
    },
    "stochasticAnalysis": {
      "kValue": 0-100,
      "dValue": 0-100,
      "crossover": "bullish/bearish/none",
      "zone": "overbought/oversold/neutral",
      "signal": "BUY/SELL/NEUTRAL",
      "confidence": 70-95
    },
    "rsiAnalysis": {
      "value": 0-100,
      "zone": "overbought/oversold/neutral",
      "divergence": "bullish/bearish/none",
      "signal": "BUY/SELL/NEUTRAL",
      "confidence": 70-95
    },
    "volumeAnalysis": {
      "level": "HIGH/NORMAL/LOW",
      "trend": "increasing/decreasing/stable",
      "confirmation": "confirms/contradicts price action"
    }
  },
  "candlestickPatternAnalysis": {
    "recentPatterns": [
      {
        "pattern": "pattern name",
        "type": "BULLISH/BEARISH/NEUTRAL",
        "significance": "HIGH/MEDIUM/LOW",
        "trendContext": "with/against trend",
        "confidence": 70-95
      }
    ],
    "currentCandle": {
      "formation": "description",
      "bias": "BULLISH/BEARISH/NEUTRAL"
    }
  },
  "multiFactorConfirmation": {
    "confluences": [
      "factor 1 description",
      "factor 2 description", 
      "factor 3 description"
    ],
    "conflictingFactors": [
      "conflicting factor 1",
      "conflicting factor 2"
    ],
    "confluenceCount": 0-10,
    "overallAlignment": "STRONG/MODERATE/WEAK/CONFLICTED"
  },
  "biasDetection": {
    "recent5CandlesTrend": "UP/DOWN/SIDEWAYS",
    "recent10CandlesTrend": "UP/DOWN/SIDEWAYS", 
    "volatilityShift": "increasing/decreasing/stable",
    "momentumExhaustion": "detected/not detected",
    "marketStructure": "intact/broken"
  },
  "supportResistanceLevels": {
    "keySupport": [number, number, number],
    "keyResistance": [number, number, number],
    "currentPosition": "near support/near resistance/between levels",
    "proximityToLevel": "very close/close/moderate/far",
    "levelStrength": "STRONG/MODERATE/WEAK"
  },
  "nextCandlePredictions": [
    {
      "candle": 1,
      "direction": "UP/DOWN",
      "confidence": 60-95,
      "reasoning": "specific technical confluence reasoning",
      "keyFactors": ["factor1", "factor2", "factor3"]
    },
    {
      "candle": 2, 
      "direction": "UP/DOWN",
      "confidence": 60-95,
      "reasoning": "specific technical confluence reasoning",
      "keyFactors": ["factor1", "factor2", "factor3"]
    },
    {
      "candle": 3,
      "direction": "UP/DOWN", 
      "confidence": 60-95,
      "reasoning": "specific technical confluence reasoning",
      "keyFactors": ["factor1", "factor2", "factor3"]
    }
  ],
  "tradingSignal": {
    "action": "BUY/SELL/NO_TRADE",
    "direction": "UP/DOWN/NONE",
    "confidence": 60-95,
    "entryPoint": "specific price level",
    "stopLoss": "specific price level",
    "takeProfit": "specific price level",
    "riskReward": number,
    "reasoning": "comprehensive multi-factor analysis summary",
    "riskLevel": "LOW/MEDIUM/HIGH",
    "timeframe": "recommended timeframe"
  },
  "contradictionAnalysis": {
    "hasContradictions": true/false,
    "contradictorySignals": [
      {
        "indicator1": "EMA",
        "signal1": "BULLISH",
        "indicator2": "Stochastic", 
        "signal2": "BEARISH",
        "severity": "HIGH/MEDIUM/LOW"
      }
    ],
    "resolutionStrategy": "wait/reduce confidence/follow stronger signal",
    "finalDecision": "explanation of how contradictions were resolved"
  },
  "overallConfidence": 60-95,
  "recommendedAction": "BUY/SELL/WAIT",
  "riskAssessment": "LOW/MEDIUM/HIGH",
  "marketCondition": "TRENDING/RANGING/VOLATILE"
}

CRITICAL INSTRUCTIONS:
- Base analysis ONLY on what you can actually see in the chart
- Require minimum 3 confluences before issuing BUY/SELL signals
- If confidence drops below 60%, recommend NO_TRADE/WAIT
- Explicitly handle and document any contradictory signals
- Provide specific price levels and technical reasoning
- This analysis will be used for real money trading decisions

Analyze the chart image now and provide the complete JSON response.`;
    }

    /**
     * 3️⃣ Parse and validate response with enhanced validation
     */
    async parseAndValidateResponse(text, options = {}) {
        console.log('📝 Parsing enhanced Gemini response...');

        try {
            // Try to extract JSON from the response
            let jsonMatch = text.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (codeBlockMatch) {
                    jsonMatch = [codeBlockMatch[1]];
                }
            }

            if (jsonMatch) {
                try {
                    const analysisData = JSON.parse(jsonMatch[0]);
                    console.log('✅ Successfully parsed enhanced JSON response');

                    // Enhanced validation
                    const validatedAnalysis = this.validateEnhancedAnalysis(analysisData);
                    return validatedAnalysis;

                } catch (parseError) {
                    console.warn('⚠️ Enhanced JSON parse error:', parseError.message);
                }
            }

            // Fallback to structured response creation
            console.log('📄 Creating enhanced structured response from text');
            return this.createEnhancedFallbackResponse(text, options);

        } catch (error) {
            console.warn('⚠️ Enhanced response parsing failed:', error.message);
            return this.createEnhancedFallbackResponse(text, options);
        }
    }

    /**
     * Validate enhanced analysis structure
     */
    validateEnhancedAnalysis(analysis) {
        // Ensure all required enhanced fields exist
        const validated = {
            detectedAsset: analysis.detectedAsset || 'Unknown',
            detectedTimeframe: analysis.detectedTimeframe || '5m',
            currentPrice: analysis.currentPrice || 'Market Price',
            
            technicalIndicatorVerification: analysis.technicalIndicatorVerification || {
                emaAnalysis: { signal: "NEUTRAL", confidence: 70 },
                stochasticAnalysis: { signal: "NEUTRAL", confidence: 70 },
                rsiAnalysis: { signal: "NEUTRAL", confidence: 70 },
                volumeAnalysis: { level: "NORMAL", confirmation: "neutral" }
            },
            
            candlestickPatternAnalysis: analysis.candlestickPatternAnalysis || {
                recentPatterns: [],
                currentCandle: { formation: "Standard candle", bias: "NEUTRAL" }
            },
            
            multiFactorConfirmation: analysis.multiFactorConfirmation || {
                confluences: [],
                conflictingFactors: [],
                confluenceCount: 0,
                overallAlignment: "WEAK"
            },
            
            biasDetection: analysis.biasDetection || {
                recent5CandlesTrend: "SIDEWAYS",
                recent10CandlesTrend: "SIDEWAYS",
                volatilityShift: "stable",
                momentumExhaustion: "not detected",
                marketStructure: "intact"
            },
            
            supportResistanceLevels: analysis.supportResistanceLevels || {
                keySupport: [],
                keyResistance: [],
                currentPosition: "between levels",
                proximityToLevel: "moderate",
                levelStrength: "MODERATE"
            },
            
            nextCandlePredictions: analysis.nextCandlePredictions || this.generateDefaultPredictions(),
            
            tradingSignal: analysis.tradingSignal || {
                action: "NO_TRADE",
                direction: "NONE",
                confidence: 60,
                reasoning: "Insufficient confluence for high-confidence signal",
                riskLevel: "HIGH"
            },
            
            contradictionAnalysis: analysis.contradictionAnalysis || {
                hasContradictions: false,
                contradictorySignals: [],
                resolutionStrategy: "wait",
                finalDecision: "No major contradictions detected"
            },
            
            overallConfidence: this.validateConfidence(analysis.overallConfidence || 70),
            recommendedAction: analysis.recommendedAction || "WAIT",
            riskAssessment: analysis.riskAssessment || "MEDIUM",
            marketCondition: analysis.marketCondition || "RANGING"
        };

        return validated;
    }

    /**
     * 4️⃣ Apply Multi-Factor Confirmation
     */
    applyMultiFactorConfirmation(analysis) {
        if (!this.config.multiFactorConfirmation) {
            return analysis;
        }

        console.log('🎯 Applying multi-factor confirmation...');

        const confluenceCount = analysis.multiFactorConfirmation?.confluenceCount || 0;
        const hasContradictions = analysis.contradictionAnalysis?.hasContradictions || false;

        // Require minimum 3 confluences for BUY/SELL signals
        if (confluenceCount < 3 && (analysis.tradingSignal.action === 'BUY' || analysis.tradingSignal.action === 'SELL')) {
            console.log(`⚠️ Insufficient confluences (${confluenceCount}/3), downgrading to NO_TRADE`);
            
            analysis.tradingSignal.action = 'NO_TRADE';
            analysis.tradingSignal.direction = 'NONE';
            analysis.tradingSignal.confidence = Math.min(analysis.tradingSignal.confidence, 65);
            analysis.tradingSignal.reasoning = `Insufficient technical confluences (${confluenceCount}/3 required). ${analysis.tradingSignal.reasoning}`;
            analysis.overallConfidence = Math.min(analysis.overallConfidence, 65);
            analysis.recommendedAction = 'WAIT';
        }

        // Handle contradictions
        if (hasContradictions) {
            console.log('⚠️ Contradictory signals detected, applying resolution strategy');
            
            const contradictions = analysis.contradictionAnalysis.contradictorySignals || [];
            const highSeverityContradictions = contradictions.filter(c => c.severity === 'HIGH');
            
            if (highSeverityContradictions.length > 0) {
                analysis.tradingSignal.action = 'NO_TRADE';
                analysis.tradingSignal.direction = 'NONE';
                analysis.tradingSignal.confidence = Math.min(analysis.tradingSignal.confidence, 60);
                analysis.overallConfidence = Math.min(analysis.overallConfidence, 60);
                analysis.recommendedAction = 'WAIT';
                analysis.riskAssessment = 'HIGH';
            }
        }

        return analysis;
    }

    /**
     * 5️⃣ Handle Contradictions
     */
    handleContradictions(analysis) {
        if (!this.config.contradictionHandling) {
            return analysis;
        }

        console.log('⚖️ Handling signal contradictions...');

        // Check for indicator contradictions
        const indicators = analysis.technicalIndicatorVerification;
        const contradictions = [];

        // Check EMA vs Stochastic
        if (indicators.emaAnalysis?.signal === 'BUY' && indicators.stochasticAnalysis?.signal === 'SELL') {
            contradictions.push({
                indicator1: 'EMA',
                signal1: 'BULLISH',
                indicator2: 'Stochastic',
                signal2: 'BEARISH',
                severity: 'HIGH'
            });
        }

        // Check RSI vs Price Action
        if (indicators.rsiAnalysis?.signal === 'SELL' && analysis.biasDetection?.recent5CandlesTrend === 'UP') {
            contradictions.push({
                indicator1: 'RSI',
                signal1: 'BEARISH',
                indicator2: 'Price Action',
                signal2: 'BULLISH',
                severity: 'MEDIUM'
            });
        }

        // Update contradiction analysis
        if (contradictions.length > 0) {
            analysis.contradictionAnalysis.hasContradictions = true;
            analysis.contradictionAnalysis.contradictorySignals = contradictions;
            
            // Apply resolution strategy
            const highSeverityCount = contradictions.filter(c => c.severity === 'HIGH').length;
            
            if (highSeverityCount > 0) {
                analysis.contradictionAnalysis.resolutionStrategy = 'wait';
                analysis.tradingSignal.action = 'NO_TRADE';
                analysis.overallConfidence = Math.min(analysis.overallConfidence, 55);
                this.analysisStats.contradictoryAnalyses++;
            } else {
                analysis.contradictionAnalysis.resolutionStrategy = 'reduce confidence';
                analysis.overallConfidence = Math.min(analysis.overallConfidence, 70);
            }
        }

        return analysis;
    }

    /**
     * 6️⃣ Update Enhanced Statistics
     */
    updateEnhancedStats(analysis, processingTime) {
        this.analysisStats.totalAnalyses++;
        
        if (analysis.overallConfidence >= this.config.minConfidence) {
            this.analysisStats.successfulAnalyses++;
        }
        
        if (analysis.overallConfidence < this.config.uncertaintyThreshold) {
            this.analysisStats.uncertainAnalyses++;
        }

        // Update averages
        const total = this.analysisStats.totalAnalyses;
        this.analysisStats.averageConfidence =
            ((this.analysisStats.averageConfidence * (total - 1)) + analysis.overallConfidence) / total;
        this.analysisStats.averageProcessingTime =
            ((this.analysisStats.averageProcessingTime * (total - 1)) + processingTime) / total;
    }

    /**
     * 7️⃣ Store Prediction for Backtesting
     */
    storePredictionForBacktest(analysis, options) {
        if (!this.config.backtestingEnabled) {
            return;
        }

        const prediction = {
            timestamp: new Date().toISOString(),
            asset: analysis.detectedAsset,
            timeframe: analysis.detectedTimeframe,
            predictions: analysis.nextCandlePredictions,
            tradingSignal: analysis.tradingSignal,
            confidence: analysis.overallConfidence,
            metadata: options
        };

        this.historicalPredictions.push(prediction);
        
        // Keep only last 1000 predictions to manage memory
        if (this.historicalPredictions.length > 1000) {
            this.historicalPredictions = this.historicalPredictions.slice(-1000);
        }

        console.log(`📊 Stored prediction for backtesting (${this.historicalPredictions.length} total)`);
    }

    /**
     * 8️⃣ Backtesting Capability
     */
    async processBacktestData(historicalData) {
        if (!this.config.backtestingEnabled) {
            console.log('📊 Backtesting is disabled');
            return null;
        }

        console.log('📊 Processing backtest data...');
        
        let correctPredictions = 0;
        let totalPredictions = 0;
        const confidenceCalibration = {};

        for (const prediction of this.historicalPredictions) {
            // Find corresponding actual data
            const actualData = historicalData.find(data => 
                data.timestamp > prediction.timestamp &&
                data.asset === prediction.asset
            );

            if (actualData) {
                // Check prediction accuracy
                for (const candlePrediction of prediction.predictions) {
                    totalPredictions++;
                    
                    // Compare predicted direction with actual
                    const actualDirection = actualData.direction; // UP/DOWN
                    const predictedDirection = candlePrediction.direction;
                    
                    if (actualDirection === predictedDirection) {
                        correctPredictions++;
                    }

                    // Track confidence calibration
                    const confidenceRange = Math.floor(candlePrediction.confidence / 10) * 10;
                    if (!confidenceCalibration[confidenceRange]) {
                        confidenceCalibration[confidenceRange] = { correct: 0, total: 0 };
                    }
                    confidenceCalibration[confidenceRange].total++;
                    if (actualDirection === predictedDirection) {
                        confidenceCalibration[confidenceRange].correct++;
                    }
                }
            }
        }

        const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;

        this.backtestingResults = {
            totalPredictions,
            correctPredictions,
            accuracy,
            confidenceCalibration
        };

        console.log(`📊 Backtesting results: ${accuracy.toFixed(2)}% accuracy (${correctPredictions}/${totalPredictions})`);
        
        return this.backtestingResults;
    }

    /**
     * Generate default predictions
     */
    generateDefaultPredictions() {
        return [
            { candle: 1, direction: "UP", confidence: 70, reasoning: "Default prediction", keyFactors: ["market structure"] },
            { candle: 2, direction: "UP", confidence: 65, reasoning: "Default prediction", keyFactors: ["trend continuation"] },
            { candle: 3, direction: "UP", confidence: 60, reasoning: "Default prediction", keyFactors: ["momentum"] }
        ];
    }

    /**
     * Create enhanced fallback response
     */
    createEnhancedFallbackResponse(text, options = {}) {
        console.log('🔄 Creating enhanced fallback analysis...');

        const direction = this.extractDirection(text);
        const confidence = Math.max(60, this.extractConfidence(text)); // Ensure minimum 60%

        return {
            detectedAsset: options.asset || 'Unknown',
            detectedTimeframe: options.timeframe || '5m',
            currentPrice: 'Market Price',
            technicalIndicatorVerification: {
                emaAnalysis: { signal: "NEUTRAL", confidence: confidence },
                stochasticAnalysis: { signal: "NEUTRAL", confidence: confidence },
                rsiAnalysis: { signal: "NEUTRAL", confidence: confidence },
                volumeAnalysis: { level: "NORMAL", confirmation: "neutral" }
            },
            candlestickPatternAnalysis: {
                recentPatterns: [],
                currentCandle: { formation: "Standard formation", bias: "NEUTRAL" }
            },
            multiFactorConfirmation: {
                confluences: ["Fallback analysis"],
                conflictingFactors: [],
                confluenceCount: 1,
                overallAlignment: "WEAK"
            },
            biasDetection: {
                recent5CandlesTrend: direction,
                recent10CandlesTrend: direction,
                volatilityShift: "stable",
                momentumExhaustion: "not detected",
                marketStructure: "intact"
            },
            supportResistanceLevels: {
                keySupport: [],
                keyResistance: [],
                currentPosition: "between levels",
                proximityToLevel: "moderate",
                levelStrength: "MODERATE"
            },
            nextCandlePredictions: this.generateDefaultPredictions(),
            tradingSignal: {
                action: "NO_TRADE",
                direction: "NONE",
                confidence: Math.min(confidence, 65),
                reasoning: "Fallback analysis - insufficient data for high-confidence signal",
                riskLevel: "HIGH"
            },
            contradictionAnalysis: {
                hasContradictions: false,
                contradictorySignals: [],
                resolutionStrategy: "wait",
                finalDecision: "Fallback analysis applied"
            },
            overallConfidence: Math.min(confidence, 65),
            recommendedAction: "WAIT",
            riskAssessment: "HIGH",
            marketCondition: "RANGING"
        };
    }

    /**
     * Extract direction from text
     */
    extractDirection(text) {
        const upperText = text.toUpperCase();
        if (upperText.includes('UP') || upperText.includes('BUY') || upperText.includes('BULLISH')) {
            return 'UP';
        } else if (upperText.includes('DOWN') || upperText.includes('SELL') || upperText.includes('BEARISH')) {
            return 'DOWN';
        }
        return 'SIDEWAYS';
    }

    /**
     * Extract confidence from text
     */
    extractConfidence(text) {
        const confidenceMatch = text.match(/(\d{2,3})%/);
        if (confidenceMatch) {
            const conf = parseInt(confidenceMatch[1]);
            return Math.max(60, Math.min(95, conf));
        }
        return 70;
    }

    /**
     * Validate confidence percentage
     */
    validateConfidence(confidence) {
        const conf = parseInt(confidence);
        if (isNaN(conf)) return 70;
        return Math.max(this.config.minConfidence, Math.min(this.config.maxConfidence, conf));
    }

    /**
     * Call Gemini API with failover support
     */
    async callGeminiWithFailover(prompt, imageData = null) {
        const maxFailovers = this.config.apiKeys.length * this.config.models.length;
        let failoverAttempts = 0;

        while (failoverAttempts < maxFailovers) {
            try {
                return await this.retryWithBackoff(async () => {
                    const content = imageData ? [prompt, imageData] : [prompt];
                    const result = await this.model.generateContent(content);
                    const response = await result.response;
                    return response.text();
                }, `Enhanced Gemini API call (Key ${this.currentKeyIndex + 1}, Model: ${this.getCurrentModel()})`);

            } catch (error) {
                console.error(`❌ Enhanced failover attempt ${failoverAttempts + 1}: ${error.message}`);

                if (this.isKeyExhaustedError(error)) {
                    try {
                        this.switchToNextKey();
                        failoverAttempts++;
                    } catch (exhaustedError) {
                        throw new Error(`All API keys and models exhausted: ${exhaustedError.message}`);
                    }
                } else {
                    throw error;
                }
            }
        }

        throw new Error('Maximum failover attempts reached');
    }

    /**
     * Retry wrapper with exponential backoff
     */
    async retryWithBackoff(fn, operation = 'API call') {
        let lastError;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                console.log(`🔄 ${operation} - Attempt ${attempt}/${this.config.maxRetries}`);
                const result = await fn();

                if (attempt > 1) {
                    console.log(`✅ ${operation} succeeded on attempt ${attempt}`);
                }

                return result;

            } catch (error) {
                lastError = error;
                this.analysisStats.retriesUsed++;

                if (this.isRetryableError(error)) {
                    console.warn(`🚧 ${operation} failed (${error.status || 'Unknown'}): ${error.message}`);

                    if (attempt < this.config.maxRetries) {
                        const delay = this.config.baseDelay * Math.pow(2, attempt - 1);
                        console.log(`⏳ Waiting ${delay}ms before retry...`);
                        await this.sleep(delay);
                    } else {
                        console.warn(`❌ ${operation} failed after ${this.config.maxRetries} attempts`);
                    }
                } else {
                    throw error;
                }
            }
        }

        throw lastError;
    }

    /**
     * Check if error is retryable
     */
    isRetryableError(error) {
        const retryableStatuses = [503, 429, 502, 504];
        const retryableMessages = ['overloaded', 'quota', 'rate limit', 'timeout', 'network'];

        if (error.status && retryableStatuses.includes(error.status)) {
            return true;
        }

        const errorMessage = error.message?.toLowerCase() || '';
        return retryableMessages.some(msg => errorMessage.includes(msg));
    }

    /**
     * Check if error indicates key exhaustion
     */
    isKeyExhaustedError(error) {
        const exhaustionMessages = ['quota', 'limit', 'overloaded', 'unauthorized', 'forbidden'];
        const errorMessage = error.message?.toLowerCase() || '';
        return exhaustionMessages.some(msg => errorMessage.includes(msg));
    }

    /**
     * Sleep utility
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get enhanced service statistics
     */
    getStats() {
        const successRate = this.analysisStats.totalAnalyses > 0 ?
            (this.analysisStats.successfulAnalyses / this.analysisStats.totalAnalyses) * 100 : 0;
        
        const uncertaintyRate = this.analysisStats.totalAnalyses > 0 ?
            (this.analysisStats.uncertainAnalyses / this.analysisStats.totalAnalyses) * 100 : 0;

        const contradictionRate = this.analysisStats.totalAnalyses > 0 ?
            (this.analysisStats.contradictoryAnalyses / this.analysisStats.totalAnalyses) * 100 : 0;

        return {
            service: 'Enhanced Gemini Vision Analysis',
            model: this.getCurrentModel(),
            isInitialized: this.isInitialized,
            
            // Enhanced statistics
            ...this.analysisStats,
            successRate: successRate.toFixed(2) + '%',
            uncertaintyRate: uncertaintyRate.toFixed(2) + '%',
            contradictionRate: contradictionRate.toFixed(2) + '%',
            
            // Configuration
            config: {
                imagePreprocessing: this.config.imagePreprocessing,
                multiFactorConfirmation: this.config.multiFactorConfirmation,
                contradictionHandling: this.config.contradictionHandling,
                backtestingEnabled: this.config.backtestingEnabled,
                uncertaintyThreshold: this.config.uncertaintyThreshold
            },
            
            // Backtesting results
            backtesting: this.config.backtestingEnabled ? this.backtestingResults : null,
            
            // API status
            currentKey: this.currentKeyIndex + 1,
            totalKeys: this.config.apiKeys.length,
            failoverCapability: `${this.config.apiKeys.length} keys × ${this.config.models.length} models`
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up Enhanced Gemini Vision Service...');
        this.isInitialized = false;
        
        // Save backtesting data if enabled
        if (this.config.backtestingEnabled && this.historicalPredictions.length > 0) {
            const backupPath = path.join(process.cwd(), 'backtesting-data.json');
            try {
                fs.writeFileSync(backupPath, JSON.stringify({
                    predictions: this.historicalPredictions,
                    results: this.backtestingResults,
                    timestamp: new Date().toISOString()
                }, null, 2));
                console.log(`💾 Backtesting data saved to ${backupPath}`);
            } catch (error) {
                console.warn('⚠️ Failed to save backtesting data:', error.message);
            }
        }
    }
}

module.exports = EnhancedGeminiVisionService;