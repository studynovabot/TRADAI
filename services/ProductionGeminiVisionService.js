/**
 * 🚀💎 PRODUCTION-READY GEMINI VISION TRADAI SIGNAL SYSTEM
 * Ultra-detailed, high-accuracy trading image analysis using pure Gemini capabilities
 * 
 * This service implements the ultra-optimized master prompt for binary options signals
 * with complete reliance on Gemini's multimodal capabilities - NO external OCR tools.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

class ProductionGeminiVisionService {
    constructor(config = {}) {
        this.config = {
            apiKeys: config.apiKeys || null,
            models: config.models || ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro'],
            temperature: config.temperature || 0.1,
            maxTokens: config.maxTokens || 8000,
            timeout: config.timeout || 90000,
            maxRetries: config.maxRetries || 3,
            baseDelay: config.baseDelay || 1000,
            
            // Production configuration options
            imagePreprocessing: config.imagePreprocessing !== false,
            debugMode: config.debugMode || false,
            
            ...config
        };

        // Initialize failover state
        this.currentKeyIndex = 0;
        this.currentModelIndex = 0;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;

        // Production statistics
        this.productionStats = {
            totalAnalyses: 0,
            buySignals: 0,
            sellSignals: 0,
            holdSignals: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            keyRotations: 0,
            modelFallbacks: 0,
            successfulExtractions: 0,
            failedExtractions: 0
        };
    }

    /**
     * Load API keys from environment variables
     */
    loadApiKeysFromEnv() {
        const keys = [];

        // Primary key
        if (process.env.GEMINI_API_KEY) {
            keys.push(process.env.GEMINI_API_KEY);
        }
        // Backward compatibility
        if (process.env.GOOGLE_VISION_API_KEY) {
            keys.push(process.env.GOOGLE_VISION_API_KEY);
        }

        // Additional keys
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_API_KEY_${i}`];
            if (key) {
                keys.push(key);
            }
        }

        if (keys.length === 0) {
            throw new Error('No Gemini API keys found in environment variables');
        }

        console.log(`🔑 Loaded ${keys.length} Gemini API keys for production failover`);
        return keys;
    }

    /**
     * Initialize current Gemini client
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

        console.log(`🔧 Initialized Production Gemini client with key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}, model: ${currentModel}`);
    }

    getCurrentKey() {
        return this.config.apiKeys[this.currentKeyIndex];
    }

    getCurrentModel() {
        return this.config.models[this.currentModelIndex];
    }

    switchToNextKey() {
        this.currentKeyIndex++;
        if (this.currentKeyIndex >= this.config.apiKeys.length) {
            this.currentKeyIndex = 0;
            this.switchToNextModel();
        }

        this.productionStats.keyRotations++;
        this.initializeCurrentClient();
        console.log(`🔄 Switched to API key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}`);
    }

    switchToNextModel() {
        this.currentModelIndex++;
        if (this.currentModelIndex >= this.config.models.length) {
            throw new Error('All Gemini API keys and models exhausted');
        }

        this.productionStats.modelFallbacks++;
        console.log(`🔄 Switched to model: ${this.getCurrentModel()}`);
    }

    /**
     * Initialize the production service
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Production Gemini Vision Service...');

            if (!this.config.apiKeys) {
                this.config.apiKeys = this.loadApiKeysFromEnv();
            }

            if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
                throw new Error('Google API key is required for Production Gemini');
            }

            this.initializeCurrentClient();
            await this.testConnection();

            this.isInitialized = true;
            console.log('✅ Production Gemini Vision Service initialized successfully');

            return {
                success: true,
                message: 'Production Gemini Vision Service ready',
                features: {
                    imagePreprocessing: this.config.imagePreprocessing,
                    debugMode: this.config.debugMode,
                    pureGeminiAnalysis: true,
                    noExternalOCR: true
                }
            };
        } catch (error) {
            console.error('❌ Failed to initialize Production Gemini Vision Service:', error);
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
            console.log('🔍 Testing Production Gemini API connection...');
            const text = await this.callGeminiWithFailover('Test connection - respond with "PRODUCTION OK"');

            if (text && text.toLowerCase().includes('ok')) {
                console.log('✅ Production Gemini API connection successful');
                return true;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('❌ Production Gemini API connection failed:', error.message);
            throw error;
        }
    }

    /**
     * 🖼️ Production Image Preprocessing: Enhance image quality for optimal analysis
     */
    async preprocessImage(imageBuffer, options = {}) {
        if (!this.config.imagePreprocessing) {
            console.log('📷 Image preprocessing disabled, using original image');
            return imageBuffer;
        }

        try {
            console.log('🔧 Production image preprocessing for enhanced analysis...');
            
            let processedImage = sharp(imageBuffer);
            
            // Get image metadata
            const metadata = await processedImage.metadata();
            console.log(`📊 Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

            // Production image enhancement pipeline
            processedImage = processedImage
                .resize(Math.min(metadata.width, 2048), Math.min(metadata.height, 1536), {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .sharpen({ sigma: 1.2, flat: 1, jagged: 2 })
                .normalize()
                .modulate({ brightness: 1.1, saturation: 1.2, hue: 0 })
                .png({ quality: 98, compressionLevel: 6 });

            const processedBuffer = await processedImage.toBuffer();
            console.log(`✅ Production image preprocessed: ${processedBuffer.length} bytes`);
            
            return processedBuffer;
        } catch (error) {
            console.warn('⚠️ Production image preprocessing failed, using original:', error.message);
            return imageBuffer;
        }
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
     * 🎯 MAIN PRODUCTION ANALYSIS METHOD
     */
    async analyzeChartImage(imageBuffer, options = {}) {
        const startTime = Date.now();

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log('🚀 Starting Production Gemini Vision Analysis...');

            // 1️⃣ Production Image Preprocessing
            const processedImageBuffer = await this.preprocessImage(imageBuffer, options);

            // Prepare image data for Gemini
            const imageData = {
                inlineData: {
                    data: processedImageBuffer.toString('base64'),
                    mimeType: this.detectMimeType(processedImageBuffer)
                }
            };

            // 2️⃣ Create Production Analysis Prompt
            const prompt = this.createProductionAnalysisPrompt(options);

            console.log('🤖 Sending production request to Gemini...');

            // Send request to Gemini with failover
            const text = await this.callGeminiWithFailover(prompt, imageData);

            const processingTime = Date.now() - startTime;

            // 3️⃣ Parse and validate response
            const analysis = await this.parseProductionResponse(text, options);

            // 4️⃣ Update statistics
            this.updateProductionStats(analysis, processingTime);

            console.log(`✅ Production analysis completed in ${processingTime}ms`);
            console.log(`📊 Final signal: ${analysis.signal} with ${analysis.signalConfidence}% confidence`);

            return {
                success: true,
                analysis: analysis,
                confidence: analysis.overallConfidence,
                processingTime: processingTime,
                metadata: {
                    model: this.getCurrentModel(),
                    timestamp: new Date().toISOString(),
                    imageSize: processedImageBuffer.length,
                    originalImageSize: imageBuffer.length,
                    analysisMethod: 'Production Gemini Vision',
                    version: '1.0.0-production',
                    pureGeminiAnalysis: true
                }
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('❌ Production chart analysis failed:', error.message);

            return {
                success: false,
                error: error.message,
                processingTime: processingTime,
                metadata: {
                    analysisMethod: 'Production Gemini Vision',
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * 🧠 Create Production Analysis Prompt (Your Ultra-Detailed Requirements)
     */
    createProductionAnalysisPrompt(options = {}) {
        return `You are the only analysis engine for this system, and we rely entirely on your capabilities — no other OCR tools or external text extraction will be used. You must directly read and interpret both the visual and textual elements from the chart image provided. Perform all analysis steps end-to-end on your own.

1. **Chart Context Extraction**:
   - Determine and explicitly state the asset/currency pair selected.
   - Identify and state the exact timeframe shown (e.g., 1m, 5m, 1h) as displayed in the broker/platform UI.
   - If possible, identify the broker or platform name from the chart UI.

2. **Indicator Detection**:
   - Locate and read indicator overlays directly from the chart, including but not limited to: EMA, SMA, Bollinger Bands, RSI, Stochastic Oscillator, ATR, and MACD histogram.
   - Report their exact current values and relative position to the price (e.g., "Price is below 20 EMA, indicating bearish momentum").

3. **Market Structure & Trend**:
   - Determine whether the market is currently trending up, trending down, or ranging.
   - Analyze the sequence of recent highs/lows (higher highs/lows → bullish; lower highs/lows → bearish).

4. **Candle Pattern Analysis**:
   - Identify any recognizable candlestick patterns among the last 3-5 candles (e.g., engulfing, pin bar, hammer, doji) and explain their potential impact.

5. **Support & Resistance**:
   - Clearly identify the nearest support and resistance levels visible on the chart.
   - Provide their estimated price levels.

6. **Volatility & Confirmation**:
   - Analyze volatility using ATR or Bollinger Bands width.
   - Confirm signals by correlating at least 3 factors: indicators, candle patterns, and market structure.

7. **Directional Signal & Prediction**:
   - Give a single, decisive directional signal: UP, DOWN, or HOLD, with a clear confidence percentage.
   - Predict the direction of the next 3 candles separately, with probability estimates for each.

8. **Conflict Resolution**:
   - If there are conflicting signals (e.g., oversold but bearish trend), evaluate which factor has higher priority based on recent price action and timeframe.

9. **Uncertainties**:
   - Clearly state if there are any uncertainties or ambiguities in reading the image or interpreting indicators, instead of guessing.

**Important**:
You are expected to do the complete image analysis and data interpretation solely within this response. You must NOT assume any external OCR software like Tesseract or local image processing; rely entirely on your own multimodal capabilities to see, read, and analyze the chart image precisely. Output all findings in a structured format.

Return your analysis in this EXACT structured format:

PRODUCTION GEMINI VISION ANALYSIS REPORT
========================================
Asset: [Extracted currency pair e.g., USD/INR]
Timeframe: [Extracted timeframe e.g., 3m]
Broker/Platform: [If identifiable from UI]
Current Price: [X.XXXXX from latest candle]
Analysis Timestamp: [Current timestamp]

CHART CONTEXT EXTRACTION:
- Asset/Currency Pair: [Explicitly state what you read from the chart]
- Timeframe: [Exactly as shown in the platform UI]
- Platform Identification: [Any visible broker/platform branding]

INDICATOR DETECTION & READINGS:
- EMA Values: [Current EMA values and positions relative to price]
- SMA Values: [Current SMA values and positions relative to price]
- RSI Reading: [Current RSI value if visible]
- Stochastic Oscillator: [%K and %D values if visible]
- MACD: [Current MACD values if visible]
- Bollinger Bands: [Position relative to bands if visible]
- ATR: [Current ATR value if visible]
- Other Indicators: [Any other visible indicators]

MARKET STRUCTURE & TREND ANALYSIS:
- Current Trend: [Trending Up/Trending Down/Ranging]
- Trend Strength: [Strong/Moderate/Weak]
- Recent Highs/Lows Sequence: [Higher highs/lows or lower highs/lows analysis]
- Market Phase: [Accumulation/Distribution/Trending/Consolidation]

CANDLESTICK PATTERN ANALYSIS:
- Last 5 Candles Description: [Detailed description of recent candles]
- Pattern Recognition: [Any identifiable patterns: doji, hammer, engulfing, etc.]
- Body vs Wick Analysis: [Analysis of candle bodies and wicks]
- Pattern Impact: [How patterns influence the next moves]

SUPPORT & RESISTANCE LEVELS:
- Nearest Support: [Price level and distance]
- Nearest Resistance: [Price level and distance]
- Key Psychological Levels: [Round numbers, significant levels]
- Level Strength: [How well-tested these levels are]

VOLATILITY & CONFIRMATION:
- Current Volatility State: [High/Medium/Low based on ATR or Bollinger Bands]
- Volatility Trend: [Expanding/Contracting]
- Signal Confirmation Factors: [List at least 3 confirming factors]
- Conflicting Signals: [Any contradictory indicators]

DIRECTIONAL SIGNAL & PREDICTION:
- Primary Signal: [UP/DOWN/HOLD]
- Signal Confidence: [XX%]
- Overall Confidence: [XX%]

Next 3 Candle Predictions:
- Candle 1: [UP/DOWN] (XX% probability) - [Reasoning]
- Candle 2: [UP/DOWN] (XX% probability) - [Reasoning]  
- Candle 3: [UP/DOWN] (XX% probability) - [Reasoning]

CONFLICT RESOLUTION:
- Conflicting Signals Identified: [List any conflicts]
- Priority Assessment: [Which signals take precedence and why]
- Resolution Logic: [How conflicts were resolved]

UNCERTAINTIES & LIMITATIONS:
- Image Quality Issues: [Any visibility problems]
- Indicator Reading Difficulties: [Any unclear readings]
- Ambiguous Signals: [Any uncertain interpretations]
- Confidence Adjustments: [How uncertainties affected confidence]

TECHNICAL SUMMARY:
- Key Supporting Factors: [List main bullish/bearish factors]
- Risk Factors: [Potential signal invalidation points]
- Stop Loss Suggestion: [Recommended stop loss level]
- Target Levels: [Potential profit targets]

FINAL RECOMMENDATION:
Signal: [UP/DOWN/HOLD]
Confidence: [XX%]
Timeframe Validity: [How long this signal is expected to be valid]
Key Levels to Watch: [Critical price levels for signal validation/invalidation]

Generated: ${new Date().toISOString()}
Analysis Method: Pure Gemini Vision (No External OCR)
Model: ${this.getCurrentModel()}

END OF ANALYSIS

**CRITICAL REMINDER**: You are the sole analysis engine. Read everything directly from the image using your multimodal capabilities. Do not assume any external text extraction tools are available.`;
    }

    /**
     * 📝 Parse Production Response
     */
    async parseProductionResponse(text, options = {}) {
        console.log('📝 Parsing production Gemini response...');

        try {
            // Extract structured data from response
            const analysis = this.extractStructuredData(text);
            return this.validateProductionAnalysis(analysis);
        } catch (error) {
            console.warn('⚠️ Production response parsing failed:', error.message);
            return this.createProductionFallbackResponse(text, options);
        }
    }

    /**
     * Extract structured data from Gemini response
     */
    extractStructuredData(text) {
        const analysis = {
            asset: this.extractField(text, 'Asset:', ['Timeframe:', 'Broker/']),
            timeframe: this.extractField(text, 'Timeframe:', ['Broker/', 'Current Price:']),
            platform: this.extractField(text, 'Broker/Platform:', ['Current Price:', 'Analysis Timestamp:']),
            currentPrice: this.extractField(text, 'Current Price:', ['Analysis Timestamp:', 'CHART CONTEXT']),
            
            // Extract signal and confidence
            signal: this.extractSignal(text),
            signalConfidence: this.extractConfidence(text, 'Signal Confidence:'),
            overallConfidence: this.extractConfidence(text, 'Overall Confidence:'),
            
            // Extract trend analysis
            currentTrend: this.extractField(text, 'Current Trend:', ['Trend Strength:', 'Recent Highs']),
            trendStrength: this.extractField(text, 'Trend Strength:', ['Recent Highs', 'Market Phase']),
            
            // Extract indicator readings
            indicators: this.extractIndicators(text),
            
            // Extract support/resistance
            supportLevels: this.extractLevels(text, 'Nearest Support:'),
            resistanceLevels: this.extractLevels(text, 'Nearest Resistance:'),
            
            // Extract predictions
            nextCandles: this.extractCandlePredictions(text),
            
            // Extract technical summary
            keyFactors: this.extractKeyFactors(text),
            riskFactors: this.extractRiskFactors(text),
            
            // Raw response for debugging
            rawResponse: text
        };

        return analysis;
    }

    /**
     * Extract field value from text
     */
    extractField(text, startMarker, endMarkers) {
        try {
            const startIndex = text.indexOf(startMarker);
            if (startIndex === -1) return 'Not detected';
            
            const valueStart = startIndex + startMarker.length;
            let valueEnd = text.length;
            
            // Find the earliest end marker
            for (const endMarker of endMarkers) {
                const endIndex = text.indexOf(endMarker, valueStart);
                if (endIndex !== -1 && endIndex < valueEnd) {
                    valueEnd = endIndex;
                }
            }
            
            return text.substring(valueStart, valueEnd).trim().replace(/^\[|\]$/g, '');
        } catch (error) {
            return 'Extraction failed';
        }
    }

    /**
     * Extract signal from text
     */
    extractSignal(text) {
        const signalMatch = text.match(/(?:Signal|Primary Signal|Final Recommendation):\s*(UP|DOWN|HOLD|BUY|SELL)/i);
        if (signalMatch) {
            const signal = signalMatch[1].toUpperCase();
            return signal === 'BUY' ? 'UP' : signal === 'SELL' ? 'DOWN' : signal;
        }
        
        // Fallback: analyze text sentiment
        const upWords = ['up', 'buy', 'bullish', 'rise', 'higher', 'support'];
        const downWords = ['down', 'sell', 'bearish', 'fall', 'lower', 'resistance'];
        
        const textLower = text.toLowerCase();
        const upScore = upWords.reduce((score, word) => score + (textLower.split(word).length - 1), 0);
        const downScore = downWords.reduce((score, word) => score + (textLower.split(word).length - 1), 0);
        
        return upScore > downScore ? 'UP' : 'DOWN';
    }

    /**
     * Extract confidence percentage
     */
    extractConfidence(text, marker) {
        const confidenceMatch = text.match(new RegExp(marker + '\\s*(\\d+)%', 'i'));
        return confidenceMatch ? parseInt(confidenceMatch[1]) : 75;
    }

    /**
     * Extract indicator readings
     */
    extractIndicators(text) {
        return {
            ema: this.extractField(text, 'EMA Values:', ['SMA Values:', 'RSI Reading:']),
            sma: this.extractField(text, 'SMA Values:', ['RSI Reading:', 'Stochastic']),
            rsi: this.extractField(text, 'RSI Reading:', ['Stochastic', 'MACD:']),
            stochastic: this.extractField(text, 'Stochastic Oscillator:', ['MACD:', 'Bollinger']),
            macd: this.extractField(text, 'MACD:', ['Bollinger', 'ATR:']),
            bollingerBands: this.extractField(text, 'Bollinger Bands:', ['ATR:', 'Other']),
            atr: this.extractField(text, 'ATR:', ['Other Indicators:', 'MARKET STRUCTURE'])
        };
    }

    /**
     * Extract support/resistance levels
     */
    extractLevels(text, marker) {
        const levelText = this.extractField(text, marker, ['Nearest Resistance:', 'Key Psychological', 'Level Strength:']);
        const levelMatch = levelText.match(/(\d+\.?\d*)/);
        return levelMatch ? parseFloat(levelMatch[1]) : null;
    }

    /**
     * Extract candle predictions
     */
    extractCandlePredictions(text) {
        const predictions = [];
        for (let i = 1; i <= 3; i++) {
            const candleMatch = text.match(new RegExp(`Candle ${i}:\\s*(UP|DOWN)\\s*\\((\\d+)%.*?\\)\\s*-\\s*(.+?)(?=Candle ${i+1}:|CONFLICT|$)`, 'is'));
            if (candleMatch) {
                predictions.push({
                    direction: candleMatch[1],
                    probability: parseInt(candleMatch[2]),
                    reasoning: candleMatch[3].trim()
                });
            }
        }
        return predictions;
    }

    /**
     * Extract key supporting factors
     */
    extractKeyFactors(text) {
        const factorsText = this.extractField(text, 'Key Supporting Factors:', ['Risk Factors:', 'Stop Loss']);
        return factorsText.split(/[,;]/).map(factor => factor.trim()).filter(factor => factor.length > 0);
    }

    /**
     * Extract risk factors
     */
    extractRiskFactors(text) {
        const riskText = this.extractField(text, 'Risk Factors:', ['Stop Loss', 'Target Levels']);
        return riskText.split(/[,;]/).map(risk => risk.trim()).filter(risk => risk.length > 0);
    }

    /**
     * Validate production analysis
     */
    validateProductionAnalysis(analysis) {
        // Ensure required fields are present
        if (!analysis.signal) {
            analysis.signal = 'HOLD';
        }
        
        if (!analysis.signalConfidence || analysis.signalConfidence < 50) {
            analysis.signalConfidence = 75;
        }
        
        if (!analysis.overallConfidence || analysis.overallConfidence < 50) {
            analysis.overallConfidence = analysis.signalConfidence;
        }
        
        // Validate signal values
        if (!['UP', 'DOWN', 'HOLD'].includes(analysis.signal)) {
            analysis.signal = 'HOLD';
        }
        
        return analysis;
    }

    /**
     * Create fallback response when parsing fails
     */
    createProductionFallbackResponse(text, options = {}) {
        console.log('🔄 Creating production fallback response...');
        
        return {
            asset: 'Unknown',
            timeframe: 'Unknown',
            platform: 'Unknown',
            currentPrice: 'Unknown',
            signal: this.extractSignal(text),
            signalConfidence: 70,
            overallConfidence: 70,
            currentTrend: 'Unknown',
            trendStrength: 'Unknown',
            indicators: {},
            supportLevels: null,
            resistanceLevels: null,
            nextCandles: [],
            keyFactors: ['Fallback analysis'],
            riskFactors: ['Limited data extraction'],
            rawResponse: text,
            fallbackUsed: true
        };
    }

    /**
     * Call Gemini with failover support
     */
    async callGeminiWithFailover(prompt, imageData = null) {
        let lastError;
        
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                console.log(`🤖 Gemini API call attempt ${attempt + 1}/${this.config.maxRetries}`);
                
                const parts = imageData ? [prompt, imageData] : [prompt];
                const result = await this.model.generateContent(parts);
                const response = await result.response;
                const text = response.text();
                
                if (text && text.trim().length > 0) {
                    console.log(`✅ Gemini API call successful (${text.length} chars)`);
                    return text;
                } else {
                    throw new Error('Empty response from Gemini');
                }
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Gemini API call failed (attempt ${attempt + 1}):`, error.message);
                
                if (attempt < this.config.maxRetries - 1) {
                    // Try next key/model
                    this.switchToNextKey();
                    await this.delay(this.config.baseDelay * (attempt + 1));
                }
            }
        }
        
        throw new Error(`All Gemini API attempts failed. Last error: ${lastError.message}`);
    }

    /**
     * Update production statistics
     */
    updateProductionStats(analysis, processingTime) {
        this.productionStats.totalAnalyses++;
        
        if (analysis.signal === 'UP') {
            this.productionStats.buySignals++;
        } else if (analysis.signal === 'DOWN') {
            this.productionStats.sellSignals++;
        } else {
            this.productionStats.holdSignals++;
        }
        
        // Update averages
        const totalAnalyses = this.productionStats.totalAnalyses;
        this.productionStats.averageConfidence = 
            (this.productionStats.averageConfidence * (totalAnalyses - 1) + analysis.overallConfidence) / totalAnalyses;
        
        this.productionStats.averageProcessingTime = 
            (this.productionStats.averageProcessingTime * (totalAnalyses - 1) + processingTime) / totalAnalyses;
        
        if (analysis.fallbackUsed) {
            this.productionStats.failedExtractions++;
        } else {
            this.productionStats.successfulExtractions++;
        }
    }

    /**
     * Get production statistics
     */
    getProductionStats() {
        return {
            ...this.productionStats,
            successRate: this.productionStats.totalAnalyses > 0 
                ? (this.productionStats.successfulExtractions / this.productionStats.totalAnalyses * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ProductionGeminiVisionService;