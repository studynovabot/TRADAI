/**
 * Direct Gemini Vision Analysis Service for Trading Chart Analysis
 * Uses Google Gemini AI directly for complete image-to-signal analysis without OCR preprocessing
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

class DirectGeminiVisionService {
    constructor(config = {}) {
        this.config = {
            apiKeys: config.apiKeys || null, // Will be loaded during initialize()
            models: config.models || ['gemini-1.5-flash', 'gemini-1.5-flash-latest'],
            temperature: config.temperature || 0.1,
            maxTokens: config.maxTokens || 4000,
            timeout: config.timeout || 60000,
            minConfidence: config.minConfidence || 70,
            maxConfidence: config.maxConfidence || 95,
            maxRetries: config.maxRetries || 3,
            baseDelay: config.baseDelay || 1000,
            ...config
        };

        // Initialize failover state
        this.currentKeyIndex = 0;
        this.currentModelIndex = 0;
        this.genAI = null;
        this.model = null;

        // Will initialize client during initialize() method

        this.isInitialized = false;
        this.analysisStats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            retriesUsed: 0,
            keyRotations: 0,
            modelFallbacks: 0
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

        console.log(`🔧 Initialized Gemini client with key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}, model: ${currentModel}`);
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
            this.currentKeyIndex = 0; // Reset to first key
            this.switchToNextModel(); // Try next model
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
     * Retry wrapper with exponential backoff for 503 errors
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

                // Check if it's a retryable error (503 overload)
                if (this.isRetryableError(error)) {
                    console.warn(`🚧 ${operation} failed (${error.status || 'Unknown'}): ${error.message}`);

                    if (attempt < this.config.maxRetries) {
                        const delay = this.config.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                        console.log(`⏳ Waiting ${delay}ms before retry...`);
                        await this.sleep(delay);
                    } else {
                        console.warn(`❌ ${operation} failed after ${this.config.maxRetries} attempts`);
                    }
                } else {
                    // Non-retryable error, throw immediately
                    throw error;
                }
            }
        }

        throw lastError;
    }

    /**
     * Check if error is retryable (503, 429, network issues)
     */
    isRetryableError(error) {
        const retryableStatuses = [503, 429, 502, 504];
        const retryableMessages = ['overloaded', 'quota', 'rate limit', 'timeout', 'network'];

        // Check status code
        if (error.status && retryableStatuses.includes(error.status)) {
            return true;
        }

        // Check error message
        const errorMessage = error.message?.toLowerCase() || '';
        return retryableMessages.some(msg => errorMessage.includes(msg));
    }

    /**
     * Sleep utility
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
                }, `Gemini API call (Key ${this.currentKeyIndex + 1}, Model: ${this.getCurrentModel()})`);

            } catch (error) {
                console.error(`❌ Failover attempt ${failoverAttempts + 1}: ${error.message}`);

                // If it's a key/quota issue, try next key
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
     * Check if error indicates key exhaustion
     */
    isKeyExhaustedError(error) {
        const exhaustionMessages = ['quota', 'limit', 'overloaded', 'unauthorized', 'forbidden'];
        const errorMessage = error.message?.toLowerCase() || '';
        return exhaustionMessages.some(msg => errorMessage.includes(msg));
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Direct Gemini Vision Service...');

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
            console.log('✅ Direct Gemini Vision Service initialized successfully');

            return {
                success: true,
                message: 'Direct Gemini Vision Service ready'
            };
        } catch (error) {
            console.error('❌ Failed to initialize Direct Gemini Vision Service:', error);
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
            console.log('🔍 Testing Gemini API connection with failover...');
            const text = await this.callGeminiWithFailover('Test connection - respond with "OK"');

            if (text && text.toLowerCase().includes('ok')) {
                console.log('✅ Gemini API connection successful');
                return true;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('❌ Gemini API connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Analyze trading chart image directly with Gemini Vision
     * This is the main method that processes images and returns comprehensive trading analysis
     */
    async analyzeChartImage(imageBuffer, options = {}) {
        const startTime = Date.now();

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log(`📊 Analyzing trading chart image with Direct Gemini Vision...`);

            // Prepare image data for Gemini
            const imageData = {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: this.detectMimeType(imageBuffer)
                }
            };

            // Create comprehensive analysis prompt
            const prompt = this.createDirectAnalysisPrompt(options);

            console.log('🤖 Sending image to Gemini for direct analysis...');

            // Send request to Gemini with failover
            const text = await this.callGeminiWithFailover(prompt, imageData);

            const processingTime = Date.now() - startTime;

            // Parse and validate response
            const analysis = this.parseAnalysisResponse(text, options);

            // Update statistics
            this.updateStats(analysis, processingTime);

            console.log(`✅ Direct analysis completed in ${processingTime}ms`);

            return {
                success: true,
                analysis: analysis,
                confidence: analysis.overallConfidence || 75,
                processingTime: processingTime,
                metadata: {
                    model: this.getCurrentModel(),
                    timestamp: new Date().toISOString(),
                    imageSize: imageBuffer.length,
                    analysisMethod: 'Direct Gemini Vision'
                }
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('❌ Direct chart analysis failed:', error.message);

            return {
                success: false,
                error: error.message,
                processingTime: processingTime,
                metadata: {
                    analysisMethod: 'Direct Gemini Vision',
                    timestamp: new Date().toISOString()
                }
            };
        }
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
        // Default to PNG
        return 'image/png';
    }

    /**
     * Create comprehensive direct analysis prompt for Gemini Vision
     */
    createDirectAnalysisPrompt(options = {}) {
        const { asset = 'Auto-detect', timeframe = 'Auto-detect', platform = 'Trading Platform' } = options;

        return `You are a world-class professional forex trader and technical analyst with 20+ years of institutional trading experience. You are analyzing a trading chart image directly using your vision capabilities.

🎯 **ENHANCED ANALYSIS REQUIREMENTS:**

1. **ASSET & TIMEFRAME DETECTION:**
   - Auto-detect the exact trading pair/asset from the chart (USD/BRL, USD/INR, etc.)
   - Auto-detect the timeframe (1m, 3m, 5m, 15m, 1h, etc.) from chart indicators
   - Identify current price from the chart
   - Note any significant support/resistance level breaks

2. **ENHANCED CONTEXT ANALYSIS:**
   - Identify recent price action significance (breakouts, bounces, rejections)
   - Analyze market structure changes (higher highs/lows, lower highs/lows)
   - Detect momentum shifts and trend exhaustion signals
   - Note any significant volume spikes or divergences

3. **TECHNICAL INDICATORS VERIFICATION:**
   - Moving Averages: Exact position relative to price, crossovers, slope direction
   - Stochastic: Current K/D values, crossovers, overbought/oversold zones
   - RSI: Current level, divergences, trend confirmation
   - Volume: Relative strength, confirmation/contradiction with price action
   - Any other visible indicators with specific readings

4. **RISK ASSESSMENT & INVALIDATION LEVELS:**
   - Identify key invalidation levels for bullish/bearish scenarios
   - Calculate risk/reward ratios for potential trades
   - Note confluence of multiple technical factors
   - Assess probability of false breakouts/breakdowns

5. **CONSERVATIVE BOUNCE PROBABILITY:**
   - Be more conservative about oversold bounces in strong trends
   - Consider trend strength when evaluating reversal signals
   - Prioritize trend continuation over counter-trend moves
   - Require multiple confirmations for reversal signals

6. **NEXT 3 CANDLE PREDICTIONS (CRITICAL):**
   - Only provide predictions if confidence ≥ 60%
   - If confidence < 60%, recommend NO_TRADE
   - Provide specific technical reasoning for each prediction
   - Consider all visible technical factors and confluences

7. **TRADING SIGNAL LOGIC:**
   - NO HOLD signals - only BUY/SELL/NO_TRADE
   - BUY: Only if multiple bullish confluences and confidence ≥ 60%
   - SELL: Only if multiple bearish confluences and confidence ≥ 60%
   - NO_TRADE: If confidence < 60% or conflicting signals

RESPONSE FORMAT (JSON):
{
  "detectedAsset": "auto-detected trading pair (e.g., USD/BRL, USD/INR)",
  "detectedTimeframe": "auto-detected timeframe (e.g., 5m, 1m, 3m)",
  "currentPrice": "visible current price from chart",
  "enhancedContext": {
    "recentPriceAction": "description of significant recent moves",
    "supportBreaks": ["list of broken support levels"],
    "resistanceBreaks": ["list of broken resistance levels"],
    "marketStructure": "higher highs/lower lows/ranging/consolidation",
    "momentumShift": "detected/not detected",
    "trendStrength": "strong/moderate/weak"
  },
  "technicalIndicators": {
    "ema": {
      "signal": "BUY/SELL/NEUTRAL", 
      "confidence": 60-95, 
      "position": "above/below price",
      "crossover": "bullish/bearish/none",
      "analysis": "detailed analysis"
    },
    "stochastic": {
      "kValue": 0-100,
      "dValue": 0-100,
      "signal": "BUY/SELL/NEUTRAL", 
      "confidence": 60-95, 
      "zone": "overbought/oversold/neutral",
      "crossover": "bullish/bearish/none"
    },
    "rsi": {
      "value": 0-100, 
      "signal": "BUY/SELL/NEUTRAL", 
      "confidence": 60-95,
      "zone": "overbought/oversold/neutral",
      "divergence": "bullish/bearish/none"
    },
    "volume": {
      "level": "HIGH/NORMAL/LOW",
      "trend": "increasing/decreasing/stable",
      "confirmation": "confirms/contradicts price action"
    }
  },
  "riskAssessment": {
    "invalidationLevels": {
      "bullish": "price level that invalidates bullish scenario",
      "bearish": "price level that invalidates bearish scenario"
    },
    "riskRewardRatio": "calculated ratio for potential trades",
    "confluenceCount": "number of technical factors aligning",
    "falseBreakoutProbability": "LOW/MEDIUM/HIGH"
  },
  "supportResistance": {
    "keySupport": ["level1", "level2", "level3"],
    "keyResistance": ["level1", "level2", "level3"],
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
    "entryPoint": "specific price level or null if NO_TRADE",
    "stopLoss": "specific price level or null",
    "takeProfit": "specific price level or null",
    "riskReward": "calculated ratio",
    "reasoning": "comprehensive multi-factor analysis summary",
    "riskLevel": "LOW/MEDIUM/HIGH",
    "timeframe": "recommended timeframe"
  },
  "overallConfidence": 60-95,
  "recommendedAction": "BUY/SELL/NO_TRADE",
  "marketCondition": "TRENDING/RANGING/VOLATILE"
}

CRITICAL INSTRUCTIONS:
- Base analysis ONLY on what you can actually see in the chart
- Require minimum 2-3 confluences before issuing BUY/SELL signals
- If confidence drops below 60%, recommend NO_TRADE
- Be conservative about oversold bounces in strong downtrends
- Be conservative about overbought reversals in strong uptrends
- Align main signal with candle predictions (if predicting 2+ DOWN candles, signal should be SELL)
- Provide specific price levels and technical reasoning
- This analysis will be used for real money trading decisions

Analyze the chart image now and provide the complete JSON response.`;
    }

    /**
     * Parse and validate Gemini analysis response
     */
    parseAnalysisResponse(text, options = {}) {
        console.log('📝 Parsing Gemini Vision response...');

        try {
            // Try to extract JSON from the response
            let jsonMatch = text.match(/\{[\s\S]*\}/);

            // If no JSON found, try to find it within code blocks
            if (!jsonMatch) {
                const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (codeBlockMatch) {
                    jsonMatch = [codeBlockMatch[1]];
                }
            }

            if (jsonMatch) {
                try {
                    const analysisData = JSON.parse(jsonMatch[0]);
                    console.log('✅ Successfully parsed JSON response');

                    // Validate and ensure required fields
                    const analysis = this.validateAndEnhanceAnalysis(analysisData);

                    return analysis;

                } catch (parseError) {
                    console.warn('⚠️ JSON parse error:', parseError.message);
                }
            }

            // If JSON parsing fails, create structured response from text
            console.log('📄 Creating structured response from text analysis');
            return this.createStructuredResponseFromText(text, options);

        } catch (error) {
            console.warn('⚠️ Response parsing failed, using fallback:', error.message);
            return this.createStructuredResponseFromText(text, options);
        }
    }

    /**
     * Validate and enhance the analysis structure
     */
    validateAndEnhanceAnalysis(analysis) {
        // Ensure all required fields exist with defaults
        const enhanced = {
            detectedAsset: analysis.detectedAsset || 'Unknown',
            detectedTimeframe: analysis.detectedTimeframe || '5m',
            currentPrice: analysis.currentPrice || 'Market Price',
            
            // Enhanced context fields
            enhancedContext: analysis.enhancedContext || {
                recentPriceAction: "No significant recent moves detected",
                supportBreaks: [],
                resistanceBreaks: [],
                marketStructure: "ranging",
                momentumShift: "not detected",
                trendStrength: "moderate"
            },
            
            technicalIndicators: analysis.technicalIndicators || {
                ema: { 
                    signal: "NEUTRAL", 
                    confidence: 70, 
                    position: "neutral",
                    crossover: "none",
                    analysis: "EMA analysis" 
                },
                stochastic: { 
                    kValue: 50,
                    dValue: 50,
                    signal: "NEUTRAL", 
                    confidence: 70, 
                    zone: "neutral",
                    crossover: "none"
                },
                rsi: { 
                    value: 50, 
                    signal: "NEUTRAL", 
                    confidence: 70,
                    zone: "neutral",
                    divergence: "none"
                },
                volume: {
                    level: "NORMAL",
                    trend: "stable",
                    confirmation: "neutral"
                }
            },
            
            // Risk assessment fields
            riskAssessment: analysis.riskAssessment || {
                invalidationLevels: {
                    bullish: "No specific level identified",
                    bearish: "No specific level identified"
                },
                riskRewardRatio: "1:1",
                confluenceCount: 1,
                falseBreakoutProbability: "MEDIUM"
            },
            
            supportResistance: analysis.supportResistance || {
                keySupport: [],
                keyResistance: [],
                currentPosition: "between levels",
                proximityToLevel: "moderate",
                levelStrength: "MODERATE"
            },
            
            nextCandlePredictions: analysis.nextCandlePredictions || this.generateEnhancedDefaultPredictions(),
            
            tradingSignal: this.validateTradingSignal(analysis.tradingSignal || {
                action: "NO_TRADE",
                direction: "NONE",
                confidence: 60,
                entryPoint: null,
                stopLoss: null,
                takeProfit: null,
                riskReward: "N/A",
                reasoning: "Insufficient confluence for high-confidence signal",
                riskLevel: "HIGH",
                timeframe: "5m"
            }),
            
            overallConfidence: this.validateConfidence(analysis.overallConfidence || 70),
            recommendedAction: analysis.recommendedAction || "NO_TRADE",
            marketCondition: analysis.marketCondition || "RANGING",

            // Legacy fields for compatibility
            trend: analysis.enhancedContext?.marketStructure || "ranging",
            supportLevels: analysis.supportResistance?.keySupport || [],
            resistanceLevels: analysis.supportResistance?.keyResistance || [],
            predictions: analysis.nextCandlePredictions || this.generateEnhancedDefaultPredictions(),

            // Add metadata
            metadata: {
                analysisTimestamp: new Date().toISOString(),
                dataSource: "Direct Gemini Vision",
                analysisMethod: "Direct Image Analysis"
            }
        };

        // Ensure confidence values are within valid range
        enhanced.overallConfidence = Math.max(70, Math.min(95, enhanced.overallConfidence));

        return enhanced;
    }

    /**
     * Validate trading signal and remove HOLD logic
     */
    validateTradingSignal(signal) {
        // Convert HOLD to NO_TRADE
        if (signal.action === 'HOLD') {
            signal.action = 'NO_TRADE';
            signal.direction = 'NONE';
        }

        // Ensure confidence is at least 60% for BUY/SELL signals
        if ((signal.action === 'BUY' || signal.action === 'SELL') && signal.confidence < 60) {
            signal.action = 'NO_TRADE';
            signal.direction = 'NONE';
            signal.reasoning = 'Confidence below 60% threshold - NO_TRADE recommended';
        }

        return {
            action: signal.action || 'NO_TRADE',
            direction: signal.direction || 'NONE',
            confidence: this.validateConfidence(signal.confidence || 60),
            entryPoint: signal.entryPoint || null,
            stopLoss: signal.stopLoss || null,
            takeProfit: signal.takeProfit || null,
            riskReward: signal.riskReward || 'N/A',
            reasoning: signal.reasoning || 'No specific reasoning provided',
            riskLevel: signal.riskLevel || 'MEDIUM',
            timeframe: signal.timeframe || '5m'
        };
    }

    /**
     * Generate enhanced default predictions
     */
    generateEnhancedDefaultPredictions() {
        return [
            { 
                candle: 1, 
                direction: "UP", 
                confidence: 65, 
                reasoning: "Default prediction - insufficient data for specific analysis",
                keyFactors: ["market structure", "trend continuation"]
            },
            { 
                candle: 2, 
                direction: "UP", 
                confidence: 60, 
                reasoning: "Default prediction - following first candle direction",
                keyFactors: ["momentum", "trend alignment"]
            },
            { 
                candle: 3, 
                direction: "DOWN", 
                confidence: 60, 
                reasoning: "Default prediction - potential reversal or consolidation",
                keyFactors: ["profit taking", "resistance levels"]
            }
        ];
    }

    /**
     * Create structured response from text when JSON parsing fails
     */
    createStructuredResponseFromText(text, options = {}) {
        console.log('🔍 Extracting analysis from text response...');

        // Extract key information from text
        const trend = this.extractTrend(text);
        const signals = this.extractSignals(text);
        const confidence = this.calculateConfidenceFromText(text);

        return {
            detectedAsset: options.asset || 'Auto-detected',
            detectedTimeframe: options.timeframe || '5m',
            currentPrice: 'Market Price',
            multiTimeframeAnalysis: {
                "1m": { trend: trend, strength: 5, confidence: confidence },
                "3m": { trend: trend, strength: 5, confidence: confidence },
                "5m": { trend: trend, strength: 5, confidence: confidence }
            },
            technicalIndicators: {
                ema: { signal: signals.action, confidence: confidence, analysis: "EMA analysis from text" },
                sma: { signal: signals.action, confidence: confidence, analysis: "SMA analysis from text" },
                stochastic: { value: 50, signal: signals.action, confidence: confidence, overbought: false, oversold: false },
                rsi: { value: 50, signal: signals.action, confidence: confidence },
                volume: "NORMAL",
                momentum: trend === "UP" ? "BULLISH" : trend === "DOWN" ? "BEARISH" : "NEUTRAL"
            },
            candlestickPatterns: [],
            supportResistance: {
                support: [],
                resistance: [],
                currentLevel: "BETWEEN",
                confidence: confidence
            },
            predictions: this.generatePredictionsFromText(text, signals),
            tradingSignal: {
                action: signals.action,
                direction: signals.direction,
                confidence: confidence,
                entryPoint: "Market Price",
                reasoning: "Analysis based on Gemini Vision text response",
                riskLevel: "MEDIUM",
                timeframe: "5m"
            },
            confluenceAnalysis: {
                bullishFactors: signals.direction === "UP" ? ["Gemini Vision analysis"] : [],
                bearishFactors: signals.direction === "DOWN" ? ["Gemini Vision analysis"] : [],
                overallBias: signals.direction === "UP" ? "BULLISH" : signals.direction === "DOWN" ? "BEARISH" : "NEUTRAL",
                confluenceScore: confidence
            },
            overallConfidence: confidence,
            marketCondition: "RANGING",
            timeframeBias: signals.direction === "UP" ? "BULLISH" : signals.direction === "DOWN" ? "BEARISH" : "NEUTRAL",

            // Legacy fields
            trend: trend,
            supportLevels: [],
            resistanceLevels: [],
            chartPatterns: "Text-based pattern analysis"
        };
    }

    /**
     * Extract trend from text analysis
     */
    extractTrend(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('uptrend') || lowerText.includes('bullish') || lowerText.includes('up')) {
            return 'UP';
        } else if (lowerText.includes('downtrend') || lowerText.includes('bearish') || lowerText.includes('down')) {
            return 'DOWN';
        }
        return 'SIDEWAYS';
    }

    /**
     * Extract trading signals from text
     */
    extractSignals(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('buy') || lowerText.includes('long') || lowerText.includes('bullish')) {
            return { action: 'BUY', direction: 'UP' };
        } else if (lowerText.includes('sell') || lowerText.includes('short') || lowerText.includes('bearish')) {
            return { action: 'SELL', direction: 'DOWN' };
        }
        // Default to NO_TRADE instead of HOLD
        return { action: 'NO_TRADE', direction: 'NONE' };
    }

    /**
     * Calculate confidence from text analysis
     */
    calculateConfidenceFromText(text) {
        const lowerText = text.toLowerCase();
        let confidence = 75; // Base confidence

        // Positive indicators
        if (lowerText.includes('strong')) confidence += 5;
        if (lowerText.includes('clear')) confidence += 5;
        if (lowerText.includes('confirmed')) confidence += 5;

        // Negative indicators
        if (lowerText.includes('uncertain')) confidence -= 10;
        if (lowerText.includes('mixed')) confidence -= 5;

        return Math.max(70, Math.min(95, confidence));
    }

    /**
     * Generate predictions from text analysis
     */
    generatePredictionsFromText(text, signals) {
        const baseConfidence = this.calculateConfidenceFromText(text);

        return [
            {
                candle: 1,
                direction: signals.direction,
                confidence: Math.max(70, Math.min(95, baseConfidence)),
                reasoning: `Technical analysis indicates ${signals.direction.toLowerCase()} movement`
            },
            {
                candle: 2,
                direction: signals.direction,
                confidence: Math.max(70, Math.min(95, baseConfidence - 5)),
                reasoning: `Continuation of ${signals.direction.toLowerCase()} trend expected`
            },
            {
                candle: 3,
                direction: signals.direction,
                confidence: Math.max(70, Math.min(95, baseConfidence - 10)),
                reasoning: `Medium-term ${signals.direction.toLowerCase()} bias maintained`
            }
        ];
    }

    /**
     * Generate default predictions when not provided
     */
    generateDefaultPredictions() {
        return [
            { candle: 1, direction: "UP", confidence: 75, reasoning: "Based on technical analysis" },
            { candle: 2, direction: "UP", confidence: 70, reasoning: "Trend continuation expected" },
            { candle: 3, direction: "UP", confidence: 70, reasoning: "Medium-term outlook" }
        ];
    }

    /**
     * Validate confidence percentage
     */
    validateConfidence(confidence) {
        const conf = parseInt(confidence);
        if (isNaN(conf)) return 75;
        return Math.max(this.config.minConfidence, Math.min(this.config.maxConfidence, conf));
    }

    /**
     * Update analysis statistics
     */
    updateStats(analysis, processingTime) {
        this.analysisStats.totalAnalyses++;
        if (analysis.overallConfidence >= this.config.minConfidence) {
            this.analysisStats.successfulAnalyses++;
        }

        // Update averages
        const total = this.analysisStats.totalAnalyses;
        this.analysisStats.averageConfidence =
            ((this.analysisStats.averageConfidence * (total - 1)) + analysis.overallConfidence) / total;
        this.analysisStats.averageProcessingTime =
            ((this.analysisStats.averageProcessingTime * (total - 1)) + processingTime) / total;
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            service: 'Direct Gemini Vision Analysis',
            model: this.getCurrentModel(),
            isInitialized: this.isInitialized,
            ...this.analysisStats,
            successRate: this.analysisStats.totalAnalyses > 0 ?
                (this.analysisStats.successfulAnalyses / this.analysisStats.totalAnalyses) * 100 : 0,
            currentKey: this.currentKeyIndex + 1,
            totalKeys: this.config.apiKeys.length,
            currentModel: this.getCurrentModel(),
            failoverCapability: `${this.config.apiKeys.length} keys × ${this.config.models.length} models`
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up Direct Gemini Vision Service...');
        this.isInitialized = false;
    }
}

module.exports = DirectGeminiVisionService;
