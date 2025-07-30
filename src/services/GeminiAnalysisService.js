/**
 * Gemini AI Analysis Service for Trading Signal Generation
 * Processes Google Vision OCR results and provides comprehensive technical analysis using Google's Gemini AI
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiAnalysisService {
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || process.env.GOOGLE_VISION_API_KEY, // Using same key as Vision API
            model: config.model || 'gemini-2.5-flash', // Best price-performance ratio with free tier
            temperature: config.temperature || 0.1,
            maxTokens: config.maxTokens || 3000,
            timeout: config.timeout || 45000,
            minConfidence: config.minConfidence || 70,
            ...config
        };

        // Initialize Gemini client
        this.genAI = new GoogleGenerativeAI(this.config.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: this.config.model });

        this.isInitialized = false;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Gemini Analysis Service...');
            
            if (!this.config.apiKey) {
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
     * Test API connection
     */
    async testConnection() {
        try {
            const result = await this.model.generateContent('Test connection. Respond with "OK".');
            const response = await result.response;
            const text = response.text();

            if (text && text.includes('OK')) {
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
