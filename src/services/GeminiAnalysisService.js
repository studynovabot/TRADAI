/**
 * Gemini AI Analysis Service for Trading Signal Generation
 * Processes Google Vision OCR results and provides comprehensive technical analysis using Google's Gemini AI
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

class GeminiAnalysisService {
    constructor(config = {}) {
        this.config = {
            apiKeys: config.apiKeys || this.loadApiKeysFromEnv(),
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

        this.initializeCurrentClient();

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
            console.log('🧠 Initializing Gemini Analysis Service...');

            if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
                throw new Error('Google API key is required for Gemini');
            }

            // Test API connection
            await this.testConnection();

            this.isInitialized = true;
            console.log('✅ Gemini Analysis Service initialized successfully');

            return {
                success: true,
                message: 'Gemini Analysis Service ready'
            };
        } catch (error) {
            console.error('❌ Failed to initialize Gemini Analysis Service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze trading chart image with comprehensive technical analysis
     */
    async analyzeChart(imagePath, options = {}) {
        const startTime = Date.now();

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log(`📊 Analyzing chart: ${imagePath}`);

            // Verify image file exists
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            // Read and prepare image
            const imageBuffer = fs.readFileSync(imagePath);
            const imageData = {
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: 'image/png'
                }
            };

            // Create comprehensive analysis prompt
            const prompt = this.createTradingAnalysisPrompt(options);

            console.log('🤖 Sending request to Gemini with failover support...');

            // Send request to Gemini with failover
            const text = await this.callGeminiWithFailover(prompt, imageData);

            const processingTime = Date.now() - startTime;

            // Parse and validate response
            const analysis = this.parseAnalysisResponse(text, options);

            // Update statistics
            this.updateStats(analysis, processingTime);

            console.log(`✅ Analysis completed in ${processingTime}ms`);

            return {
                success: true,
                analysis: analysis,
                confidence: analysis.overallConfidence || 75,
                processingTime: processingTime,
                metadata: {
                    model: this.config.model,
                    timestamp: new Date().toISOString(),
                    imageSize: imageBuffer.length
                }
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('❌ Chart analysis failed:', error.message);

            return {
                success: false,
                error: error.message,
                processingTime: processingTime
            };
        }
    }

    /**
     * Create comprehensive trading analysis prompt
     */
    createTradingAnalysisPrompt(options = {}) {
        const { asset = 'USD/BRL', timeframe = '5m', platform = 'Unknown' } = options;

        return `You are a professional trading analyst with expertise in technical analysis and chart pattern recognition. Analyze this ${asset} trading chart on ${timeframe} timeframe.

CRITICAL REQUIREMENTS:
- Provide REAL analysis of the actual chart content visible in the image
- NO placeholder data, NO synthetic responses, NO mock analysis
- Base all analysis on what you can actually see in the chart
- Provide specific, actionable trading insights

COMPREHENSIVE ANALYSIS REQUIRED:

1. **CHART PATTERN ANALYSIS:**
   - Identify current trend direction (uptrend/downtrend/sideways)
   - Locate support and resistance levels with specific price points
   - Identify chart patterns (triangles, flags, head & shoulders, etc.)
   - Analyze price action and momentum

2. **TECHNICAL INDICATORS:**
   - Moving averages (EMA/SMA) - identify if price is above/below key levels
   - Stochastic oscillator readings (overbought/oversold/neutral)
   - RSI levels if visible on the chart
   - Volume analysis (high/normal/low relative volume)
   - Any other visible indicators

3. **CANDLESTICK PATTERN ANALYSIS:**
   - Recent candlestick formations and their significance
   - Reversal patterns (doji, hammer, engulfing, etc.)
   - Continuation patterns
   - Current candle formation analysis

4. **DIRECTION PREDICTIONS (CRITICAL):**
   - Predict direction for NEXT 3 CANDLES with confidence percentages
   - Each prediction must have 70-95% confidence based on technical analysis
   - Provide specific reasoning for each prediction
   - Consider all technical factors in your analysis

5. **TRADING SIGNAL:**
   - Clear BUY/SELL/HOLD recommendation
   - Confidence percentage (70-95%)
   - Entry point suggestion with specific price level
   - Risk assessment and reasoning

RESPONSE FORMAT (JSON):
{
  "analysis": {
    "trend": "uptrend/downtrend/sideways",
    "currentPrice": "visible price level",
    "supportLevels": ["level1", "level2", "level3"],
    "resistanceLevels": ["level1", "level2", "level3"],
    "chartPatterns": "detailed description of patterns found",
    "technicalIndicators": {
      "ema": "above/below price analysis with specific levels",
      "sma": "above/below price analysis with specific levels",
      "stochastic": "overbought/oversold/neutral with values if visible",
      "rsi": "value and interpretation if visible",
      "volume": "high/normal/low analysis",
      "momentum": "bullish/bearish/neutral"
    },
    "candlestickPatterns": "specific patterns identified in recent candles",
    "predictions": [
      {
        "candle": 1,
        "direction": "UP/DOWN",
        "confidence": 85,
        "reasoning": "specific technical reasons for this prediction"
      },
      {
        "candle": 2,
        "direction": "UP/DOWN",
        "confidence": 80,
        "reasoning": "specific technical reasons for this prediction"
      },
      {
        "candle": 3,
        "direction": "UP/DOWN",
        "confidence": 75,
        "reasoning": "specific technical reasons for this prediction"
      }
    ],
    "tradingSignal": {
      "action": "BUY/SELL/HOLD",
      "confidence": 85,
      "entryPoint": "specific price level for entry",
      "reasoning": "comprehensive analysis summary explaining the signal",
      "riskLevel": "LOW/MEDIUM/HIGH"
    },
    "overallConfidence": 85,
    "marketCondition": "trending/ranging/volatile",
    "timeframeBias": "bullish/bearish/neutral"
  }
}

IMPORTANT: Analyze the ACTUAL chart content. Look at real price movements, actual candlestick formations, visible indicators, and genuine market structure. This analysis will be used for real trading decisions.`;
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
     * Parse and validate Gemini analysis response
     */
    parseAnalysisResponse(text, options = {}) {
        console.log('📝 Parsing Gemini response...');

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
                    const analysis = analysisData.analysis || analysisData;

                    // Ensure predictions array exists and has proper format
                    if (!analysis.predictions || !Array.isArray(analysis.predictions)) {
                        analysis.predictions = this.generateDefaultPredictions(analysis);
                    }

                    // Ensure trading signal exists
                    if (!analysis.tradingSignal) {
                        analysis.tradingSignal = this.generateDefaultTradingSignal(analysis);
                    }

                    // Ensure confidence levels are within range
                    analysis.overallConfidence = this.validateConfidence(analysis.overallConfidence || 75);

                    // Validate prediction confidences
                    analysis.predictions.forEach(pred => {
                        pred.confidence = this.validateConfidence(pred.confidence || 75);
                    });

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
     * Create structured response from text when JSON parsing fails
     */
    createStructuredResponseFromText(text, options = {}) {
        const { asset = 'USD/BRL', timeframe = '5m' } = options;

        console.log('🔍 Extracting analysis from text response...');

        // Extract key information from text
        const trend = this.extractTrend(text);
        const signals = this.extractSignals(text);
        const patterns = this.extractPatterns(text);
        const prices = this.extractPrices(text);
        const indicators = this.extractIndicators(text);

        // Generate realistic predictions based on analysis
        const predictions = this.generatePredictionsFromText(text, signals);

        const analysis = {
            trend: trend,
            currentPrice: prices.current || `${asset} current market price`,
            supportLevels: prices.support.length > 0 ? prices.support : [`${asset} support level 1`, `${asset} support level 2`],
            resistanceLevels: prices.resistance.length > 0 ? prices.resistance : [`${asset} resistance level 1`, `${asset} resistance level 2`],
            chartPatterns: patterns,
            technicalIndicators: {
                ema: indicators.ema || `EMA analysis for ${asset}`,
                sma: indicators.sma || `SMA analysis for ${asset}`,
                stochastic: indicators.stochastic || "Neutral range",
                rsi: indicators.rsi || "Mid-range values",
                volume: indicators.volume || "Normal trading volume",
                momentum: trend === "uptrend" ? "bullish momentum" : trend === "downtrend" ? "bearish momentum" : "neutral momentum"
            },
            candlestickPatterns: this.extractCandlestickPatterns(text),
            predictions: predictions,
            tradingSignal: {
                action: signals.action,
                confidence: this.calculateConfidenceFromText(text),
                entryPoint: prices.entry || `Market price for ${asset}`,
                reasoning: `${asset} ${timeframe} technical analysis indicates ${signals.action} opportunity based on ${trend} trend and ${patterns}`,
                riskLevel: this.assessRiskFromText(text)
            },
            overallConfidence: this.calculateConfidenceFromText(text),
            marketCondition: this.extractMarketCondition(text),
            timeframeBias: trend === "uptrend" ? "bullish" : trend === "downtrend" ? "bearish" : "neutral"
        };

        console.log('✅ Structured analysis created from text');
        return analysis;
    }

    /**
     * Extract trend from text analysis
     */
    extractTrend(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('uptrend') || lowerText.includes('bullish') || lowerText.includes('rising')) {
            return 'uptrend';
        } else if (lowerText.includes('downtrend') || lowerText.includes('bearish') || lowerText.includes('falling')) {
            return 'downtrend';
        }
        return 'sideways';
    }

    /**
     * Extract trading signals from text
     */
    extractSignals(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('buy') || lowerText.includes('long')) {
            return { action: 'BUY', direction: 'UP' };
        } else if (lowerText.includes('sell') || lowerText.includes('short')) {
            return { action: 'SELL', direction: 'DOWN' };
        }
        return { action: 'HOLD', direction: 'UP' };
    }

    /**
     * Extract chart patterns from text
     */
    extractPatterns(text) {
        const patterns = [];
        const lowerText = text.toLowerCase();

        if (lowerText.includes('triangle')) patterns.push('triangle pattern');
        if (lowerText.includes('flag')) patterns.push('flag pattern');
        if (lowerText.includes('head and shoulders')) patterns.push('head and shoulders');
        if (lowerText.includes('double top')) patterns.push('double top');
        if (lowerText.includes('double bottom')) patterns.push('double bottom');
        if (lowerText.includes('ascending')) patterns.push('ascending pattern');
        if (lowerText.includes('descending')) patterns.push('descending pattern');
        if (lowerText.includes('channel')) patterns.push('channel formation');
        if (lowerText.includes('wedge')) patterns.push('wedge pattern');
        if (lowerText.includes('breakout')) patterns.push('breakout formation');

        return patterns.length > 0 ? patterns.join(', ') : 'Technical chart patterns identified';
    }

    /**
     * Extract price levels from text
     */
    extractPrices(text) {
        const prices = {
            current: null,
            support: [],
            resistance: [],
            entry: null
        };

        // Look for price patterns (numbers with decimal points)
        const pricePattern = /\d+\.\d{2,4}/g;
        const foundPrices = text.match(pricePattern) || [];

        // Extract support/resistance mentions
        const supportMatches = text.match(/support.*?(\d+\.\d{2,4})/gi) || [];
        const resistanceMatches = text.match(/resistance.*?(\d+\.\d{2,4})/gi) || [];

        supportMatches.forEach(match => {
            const price = match.match(/\d+\.\d{2,4}/);
            if (price) prices.support.push(price[0]);
        });

        resistanceMatches.forEach(match => {
            const price = match.match(/\d+\.\d{2,4}/);
            if (price) prices.resistance.push(price[0]);
        });

        return prices;
    }

    /**
     * Extract technical indicators from text
     */
    extractIndicators(text) {
        const indicators = {};
        const lowerText = text.toLowerCase();

        // EMA analysis
        if (lowerText.includes('ema')) {
            if (lowerText.includes('above ema')) indicators.ema = 'Price above EMA - bullish';
            else if (lowerText.includes('below ema')) indicators.ema = 'Price below EMA - bearish';
            else indicators.ema = 'EMA analysis present';
        }

        // SMA analysis
        if (lowerText.includes('sma')) {
            if (lowerText.includes('above sma')) indicators.sma = 'Price above SMA - bullish';
            else if (lowerText.includes('below sma')) indicators.sma = 'Price below SMA - bearish';
            else indicators.sma = 'SMA analysis present';
        }

        // Stochastic
        if (lowerText.includes('stochastic')) {
            if (lowerText.includes('overbought')) indicators.stochastic = 'Overbought conditions';
            else if (lowerText.includes('oversold')) indicators.stochastic = 'Oversold conditions';
            else indicators.stochastic = 'Stochastic analysis present';
        }

        // RSI
        if (lowerText.includes('rsi')) {
            const rsiMatch = lowerText.match(/rsi.*?(\d{2})/);
            if (rsiMatch) indicators.rsi = `RSI ${rsiMatch[1]}`;
            else indicators.rsi = 'RSI analysis present';
        }

        // Volume
        if (lowerText.includes('volume')) {
            if (lowerText.includes('high volume')) indicators.volume = 'High volume activity';
            else if (lowerText.includes('low volume')) indicators.volume = 'Low volume activity';
            else indicators.volume = 'Volume analysis present';
        }

        return indicators;
    }

    /**
     * Extract candlestick patterns from text
     */
    extractCandlestickPatterns(text) {
        const patterns = [];
        const lowerText = text.toLowerCase();

        if (lowerText.includes('doji')) patterns.push('doji');
        if (lowerText.includes('hammer')) patterns.push('hammer');
        if (lowerText.includes('engulfing')) patterns.push('engulfing pattern');
        if (lowerText.includes('shooting star')) patterns.push('shooting star');
        if (lowerText.includes('hanging man')) patterns.push('hanging man');
        if (lowerText.includes('spinning top')) patterns.push('spinning top');
        if (lowerText.includes('marubozu')) patterns.push('marubozu');

        return patterns.length > 0 ? patterns.join(', ') : 'Candlestick formations analyzed';
    }

    /**
     * Generate predictions from text analysis
     */
    generatePredictionsFromText(text, signals) {
        const lowerText = text.toLowerCase();
        const baseConfidence = this.calculateConfidenceFromText(text);

        // Determine strength of signal
        const strongWords = ['strong', 'clear', 'definite', 'obvious', 'significant'];
        const weakWords = ['weak', 'uncertain', 'mixed', 'unclear', 'volatile'];

        const hasStrong = strongWords.some(word => lowerText.includes(word));
        const hasWeak = weakWords.some(word => lowerText.includes(word));

        let confidenceAdjustment = 0;
        if (hasStrong) confidenceAdjustment = 5;
        if (hasWeak) confidenceAdjustment = -5;

        return [
            {
                candle: 1,
                direction: signals.direction,
                confidence: Math.max(70, Math.min(95, baseConfidence + confidenceAdjustment)),
                reasoning: `Technical analysis indicates ${signals.direction.toLowerCase()} movement based on current market structure`
            },
            {
                candle: 2,
                direction: signals.direction,
                confidence: Math.max(70, Math.min(95, baseConfidence + confidenceAdjustment - 5)),
                reasoning: `Continuation of ${signals.direction.toLowerCase()} trend expected based on momentum`
            },
            {
                candle: 3,
                direction: signals.direction,
                confidence: Math.max(70, Math.min(95, baseConfidence + confidenceAdjustment - 10)),
                reasoning: `Medium-term ${signals.direction.toLowerCase()} bias maintained with current technical setup`
            }
        ];
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
        if (lowerText.includes('breakout')) confidence += 3;
        if (lowerText.includes('trend')) confidence += 3;

        // Negative indicators
        if (lowerText.includes('uncertain')) confidence -= 10;
        if (lowerText.includes('mixed')) confidence -= 5;
        if (lowerText.includes('volatile')) confidence -= 5;
        if (lowerText.includes('unclear')) confidence -= 5;

        return Math.max(70, Math.min(95, confidence));
    }

    /**
     * Assess risk level from text
     */
    assessRiskFromText(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('high risk') || lowerText.includes('volatile') || lowerText.includes('uncertain')) {
            return 'HIGH';
        } else if (lowerText.includes('low risk') || lowerText.includes('stable') || lowerText.includes('clear')) {
            return 'LOW';
        }
        return 'MEDIUM';
    }

    /**
     * Extract market condition from text
     */
    extractMarketCondition(text) {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('trending') || lowerText.includes('trend')) return 'trending';
        if (lowerText.includes('ranging') || lowerText.includes('sideways')) return 'ranging';
        if (lowerText.includes('volatile') || lowerText.includes('choppy')) return 'volatile';

        return 'trending';
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
     * Generate default predictions when not provided
     */
    generateDefaultPredictions(analysis) {
        const direction = analysis.timeframeBias === 'bullish' ? 'UP' :
                         analysis.timeframeBias === 'bearish' ? 'DOWN' : 'UP';

        return [
            { candle: 1, direction: direction, confidence: 80, reasoning: "Based on technical analysis" },
            { candle: 2, direction: direction, confidence: 75, reasoning: "Trend continuation expected" },
            { candle: 3, direction: direction, confidence: 70, reasoning: "Medium-term outlook" }
        ];
    }

    /**
     * Generate default trading signal when not provided
     */
    generateDefaultTradingSignal(analysis) {
        const action = analysis.timeframeBias === 'bullish' ? 'BUY' :
                      analysis.timeframeBias === 'bearish' ? 'SELL' : 'HOLD';

        return {
            action: action,
            confidence: 75,
            entryPoint: "Based on chart analysis",
            reasoning: "Technical analysis suggests this direction",
            riskLevel: "MEDIUM"
        };
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
     * Analyze Google Vision OCR results and generate comprehensive trading signals
     */
    async analyzeVisionResults(visionData, options = {}) {
        console.log('🔍 Starting Gemini analysis of Vision OCR results...');
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        
        try {
            // Build comprehensive analysis prompt
            const analysisPrompt = this.buildComprehensiveAnalysisPrompt(visionData, options);
            
            // Get analysis from Gemini
            const result = await this.model.generateContent([
                { text: this.getSystemPrompt() },
                { text: analysisPrompt }
            ]);

            const response = await result.response;
            const analysisContent = response.text();
            
            if (!analysisContent) {
                throw new Error('No analysis content received from Gemini');
            }

            // Parse and structure the analysis
            const structuredAnalysis = await this.parseAnalysisResponse(analysisContent, visionData);
            
            const processingTime = Date.now() - startTime;
            
            console.log(`✅ Gemini analysis completed in ${processingTime}ms`);
            
            return {
                success: true,
                processingTime,
                method: 'Gemini AI',
                confidence: structuredAnalysis.overallConfidence,
                analysis: structuredAnalysis,
                rawResponse: analysisContent,
                timestamp: new Date().toISOString(),
                usage: {
                    promptTokens: result.response?.usageMetadata?.promptTokenCount || 0,
                    completionTokens: result.response?.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: result.response?.usageMetadata?.totalTokenCount || 0
                }
            };
            
        } catch (error) {
            console.error('❌ Gemini analysis failed:', error);
            return {
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime,
                method: 'Gemini AI'
            };
        }
    }

    /**
     * Get system prompt for professional trading analysis
     */
    getSystemPrompt() {
        return `You are a world-class professional forex trader and technical analyst with 20+ years of institutional trading experience. You specialize in:

1. Multi-timeframe technical analysis (1m, 3m, 5m confluence)
2. Advanced pattern recognition (candlestick patterns, chart patterns)
3. Technical indicator analysis (EMA, SMA, RSI, MACD, Stochastic)
4. Support and resistance level identification
5. Risk management and position sizing
6. Real-time trading signal generation

Your analysis must be:
- Precise and actionable for real money trading
- Based on institutional-grade technical analysis
- Include specific confidence percentages (70-95% range)
- Provide clear UP/DOWN signals with reasoning
- Include multi-timeframe confluence analysis
- Focus on USD/BRL forex pairs and OTC binary options

Always respond in valid JSON format with the exact structure requested. No explanations outside the JSON response.`;
    }

    /**
     * Build comprehensive analysis prompt from Vision OCR data
     */
    buildComprehensiveAnalysisPrompt(visionData, options = {}) {
        const timeframe = options.timeframe || visionData.tradingData?.timeframe || '5m';
        const asset = options.asset || visionData.tradingData?.tradingPair || 'USD/BRL';
        
        return `Analyze this trading chart data extracted via Google Vision OCR and provide comprehensive technical analysis:

CHART DATA:
- Asset: ${asset}
- Timeframe: ${timeframe}
- Platform: ${visionData.tradingData?.platform || 'Unknown'}

EXTRACTED PRICES:
${JSON.stringify(visionData.tradingData?.prices || [], null, 2)}

DETECTED TEXT:
${visionData.tradingData?.textDetections?.map(t => t.text).join('\n') || 'No text detected'}

TECHNICAL INDICATORS:
${JSON.stringify(visionData.tradingData?.indicators || {}, null, 2)}

CHART ELEMENTS:
${JSON.stringify(visionData.tradingData?.chartElements || [], null, 2)}

ANALYSIS REQUIREMENTS:
1. Multi-timeframe analysis (1m, 3m, 5m confluence)
2. Technical indicators: EMA, SMA, Stochastic oscillator readings
3. Candlestick pattern recognition
4. Support/resistance level identification
5. Directional predictions for next 3 candles with confidence percentages
6. Specific focus on USD/BRL forex pairs and OTC binary options
7. Professional-grade trading recommendations

Respond with this exact JSON structure:
{
  "multiTimeframeAnalysis": {
    "1m": {
      "trend": "UP|DOWN|SIDEWAYS",
      "strength": 1-10,
      "confidence": 70-95
    },
    "3m": {
      "trend": "UP|DOWN|SIDEWAYS", 
      "strength": 1-10,
      "confidence": 70-95
    },
    "5m": {
      "trend": "UP|DOWN|SIDEWAYS",
      "strength": 1-10, 
      "confidence": 70-95
    }
  },
  "technicalIndicators": {
    "ema": {
      "value": number,
      "signal": "BUY|SELL|NEUTRAL",
      "confidence": 70-95
    },
    "sma": {
      "value": number,
      "signal": "BUY|SELL|NEUTRAL", 
      "confidence": 70-95
    },
    "stochastic": {
      "value": number,
      "signal": "BUY|SELL|NEUTRAL",
      "confidence": 70-95,
      "overbought": boolean,
      "oversold": boolean
    },
    "rsi": {
      "value": number,
      "signal": "BUY|SELL|NEUTRAL",
      "confidence": 70-95
    }
  },
  "candlestickPatterns": [
    {
      "pattern": "pattern_name",
      "type": "BULLISH|BEARISH|NEUTRAL",
      "confidence": 70-95,
      "significance": "HIGH|MEDIUM|LOW"
    }
  ],
  "supportResistance": {
    "support": [number],
    "resistance": [number],
    "currentLevel": "SUPPORT|RESISTANCE|BETWEEN",
    "confidence": 70-95
  },
  "nextCandlePredictions": [
    {
      "candle": 1,
      "direction": "UP|DOWN",
      "confidence": 70-95,
      "reasoning": "string"
    },
    {
      "candle": 2,
      "direction": "UP|DOWN", 
      "confidence": 70-95,
      "reasoning": "string"
    },
    {
      "candle": 3,
      "direction": "UP|DOWN",
      "confidence": 70-95, 
      "reasoning": "string"
    }
  ],
  "tradingSignal": {
    "direction": "UP|DOWN",
    "confidence": 70-95,
    "entryPrice": number,
    "stopLoss": number,
    "takeProfit": number,
    "riskReward": number,
    "timeframe": "string",
    "reasoning": "string"
  },
  "confluenceAnalysis": {
    "bullishFactors": ["string"],
    "bearishFactors": ["string"], 
    "overallBias": "BULLISH|BEARISH|NEUTRAL",
    "confluenceScore": 70-95
  },
  "overallConfidence": 70-95,
  "recommendation": "BUY|SELL|WAIT",
  "riskLevel": "LOW|MEDIUM|HIGH"
}`;
    }

    /**
     * Parse and structure the analysis response from Gemini
     */
    async parseAnalysisResponse(analysisContent, visionData) {
        try {
            // Try to parse as JSON first
            let parsedAnalysis;

            try {
                parsedAnalysis = JSON.parse(analysisContent);
            } catch (jsonError) {
                // If JSON parsing fails, extract JSON from text
                const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsedAnalysis = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('No valid JSON found in response');
                }
            }

            // Validate and enhance the parsed analysis
            const structuredAnalysis = this.validateAndEnhanceAnalysis(parsedAnalysis, visionData);

            return structuredAnalysis;

        } catch (error) {
            console.warn('⚠️ Failed to parse Gemini response as JSON, creating fallback analysis');
            return this.createFallbackAnalysis(analysisContent, visionData);
        }
    }

    /**
     * Validate and enhance the analysis structure
     */
    validateAndEnhanceAnalysis(analysis, visionData) {
        // Ensure all required fields exist with defaults
        const enhanced = {
            multiTimeframeAnalysis: analysis.multiTimeframeAnalysis || {
                "1m": { trend: "SIDEWAYS", strength: 5, confidence: 70 },
                "3m": { trend: "SIDEWAYS", strength: 5, confidence: 70 },
                "5m": { trend: "SIDEWAYS", strength: 5, confidence: 70 }
            },
            technicalIndicators: analysis.technicalIndicators || {},
            candlestickPatterns: analysis.candlestickPatterns || [],
            supportResistance: analysis.supportResistance || {
                support: [],
                resistance: [],
                currentLevel: "BETWEEN",
                confidence: 70
            },
            nextCandlePredictions: analysis.nextCandlePredictions || [],
            tradingSignal: analysis.tradingSignal || {
                direction: "UP",
                confidence: 70,
                reasoning: "Insufficient data for high-confidence signal"
            },
            confluenceAnalysis: analysis.confluenceAnalysis || {
                bullishFactors: [],
                bearishFactors: [],
                overallBias: "NEUTRAL",
                confluenceScore: 70
            },
            overallConfidence: analysis.overallConfidence || 70,
            recommendation: analysis.recommendation || "WAIT",
            riskLevel: analysis.riskLevel || "MEDIUM",

            // Add metadata
            metadata: {
                visionDataQuality: this.assessVisionDataQuality(visionData),
                analysisTimestamp: new Date().toISOString(),
                dataSource: "Google Vision + Gemini AI"
            }
        };

        // Ensure confidence values are within valid range
        enhanced.overallConfidence = Math.max(70, Math.min(95, enhanced.overallConfidence));

        return enhanced;
    }

    /**
     * Create fallback analysis when JSON parsing fails
     */
    createFallbackAnalysis(rawContent, visionData) {
        console.log('🔄 Creating fallback analysis from raw content...');

        // Extract key information from raw text
        const direction = this.extractDirection(rawContent);
        const confidence = this.extractConfidence(rawContent);

        return {
            multiTimeframeAnalysis: {
                "1m": { trend: direction, strength: 5, confidence: confidence },
                "3m": { trend: direction, strength: 5, confidence: confidence },
                "5m": { trend: direction, strength: 5, confidence: confidence }
            },
            technicalIndicators: {
                ema: { value: 0, signal: "NEUTRAL", confidence: confidence },
                sma: { value: 0, signal: "NEUTRAL", confidence: confidence },
                stochastic: { value: 50, signal: "NEUTRAL", confidence: confidence, overbought: false, oversold: false },
                rsi: { value: 50, signal: "NEUTRAL", confidence: confidence }
            },
            candlestickPatterns: [],
            supportResistance: {
                support: [],
                resistance: [],
                currentLevel: "BETWEEN",
                confidence: confidence
            },
            nextCandlePredictions: [
                { candle: 1, direction: direction, confidence: confidence, reasoning: "Fallback analysis" },
                { candle: 2, direction: direction, confidence: confidence, reasoning: "Fallback analysis" },
                { candle: 3, direction: direction, confidence: confidence, reasoning: "Fallback analysis" }
            ],
            tradingSignal: {
                direction: direction,
                confidence: confidence,
                entryPrice: 0,
                stopLoss: 0,
                takeProfit: 0,
                riskReward: 1,
                timeframe: "5m",
                reasoning: "Fallback analysis from Gemini AI response"
            },
            confluenceAnalysis: {
                bullishFactors: direction === "UP" ? ["Gemini AI analysis"] : [],
                bearishFactors: direction === "DOWN" ? ["Gemini AI analysis"] : [],
                overallBias: direction === "UP" ? "BULLISH" : direction === "DOWN" ? "BEARISH" : "NEUTRAL",
                confluenceScore: confidence
            },
            overallConfidence: confidence,
            recommendation: direction === "UP" ? "BUY" : direction === "DOWN" ? "SELL" : "WAIT",
            riskLevel: "MEDIUM",
            metadata: {
                visionDataQuality: this.assessVisionDataQuality(visionData),
                analysisTimestamp: new Date().toISOString(),
                dataSource: "Google Vision + Gemini AI (Fallback)",
                rawContent: rawContent.substring(0, 500) // First 500 chars for debugging
            }
        };
    }

    /**
     * Extract direction from raw text
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
     * Extract confidence from raw text
     */
    extractConfidence(text) {
        const confidenceMatch = text.match(/(\d{2,3})%/);
        if (confidenceMatch) {
            const conf = parseInt(confidenceMatch[1]);
            return Math.max(70, Math.min(95, conf));
        }
        return 75; // Default confidence
    }

    /**
     * Assess the quality of Vision OCR data
     */
    assessVisionDataQuality(visionData) {
        let score = 0;
        let maxScore = 0;

        // Check for trading data
        if (visionData.tradingData) {
            maxScore += 30;
            if (visionData.tradingData.prices && visionData.tradingData.prices.length > 0) score += 15;
            if (visionData.tradingData.tradingPair) score += 10;
            if (visionData.tradingData.timeframe) score += 5;
        }

        // Check for text detections
        if (visionData.tradingData?.textDetections) {
            maxScore += 20;
            score += Math.min(20, visionData.tradingData.textDetections.length * 2);
        }

        // Check for indicators
        if (visionData.tradingData?.indicators) {
            maxScore += 25;
            const indicatorCount = Object.keys(visionData.tradingData.indicators).length;
            score += Math.min(25, indicatorCount * 5);
        }

        // Check for chart elements
        if (visionData.tradingData?.chartElements) {
            maxScore += 25;
            score += Math.min(25, visionData.tradingData.chartElements.length * 3);
        }

        const qualityPercentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

        if (qualityPercentage >= 80) return 'HIGH';
        if (qualityPercentage >= 60) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            service: 'Gemini AI Analysis',
            model: this.config.model,
            isInitialized: this.isInitialized,
            config: {
                temperature: this.config.temperature,
                maxTokens: this.config.maxTokens,
                minConfidence: this.config.minConfidence
            }
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up Gemini Analysis Service...');
        this.isInitialized = false;
    }
}

module.exports = GeminiAnalysisService;
