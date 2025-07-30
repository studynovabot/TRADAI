/**
 * Enhanced Groq AI Analysis Service for Trading Signal Generation
 * Processes Google Vision OCR results and provides comprehensive technical analysis
 */

const axios = require('axios');
const Groq = require('groq-sdk');

class EnhancedGroqAnalysisService {
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || process.env.GROQ_API_KEY,
            baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
            model: config.model || 'llama-3.3-70b-versatile',
            temperature: config.temperature || 0.1,
            maxTokens: config.maxTokens || 3000,
            timeout: config.timeout || 45000,
            minConfidence: config.minConfidence || 70,
            ...config
        };

        // Initialize Groq client
        this.groq = new Groq({
            apiKey: this.config.apiKey
        });

        this.isInitialized = false;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Enhanced Groq Analysis Service...');
            
            if (!this.config.apiKey) {
                throw new Error('Groq API key is required');
            }

            // Test API connection
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('✅ Enhanced Groq Analysis Service initialized successfully');
            
            return {
                success: true,
                message: 'Enhanced Groq Analysis Service ready'
            };
        } catch (error) {
            console.error('❌ Failed to initialize Enhanced Groq Analysis Service:', error);
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
            const response = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'user',
                        content: 'Test connection. Respond with "OK".'
                    }
                ],
                model: this.config.model,
                max_tokens: 10,
                temperature: 0
            });

            if (response.choices && response.choices[0]) {
                console.log('✅ Groq API connection successful');
                return true;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('❌ Groq API connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Analyze Google Vision OCR results and generate comprehensive trading signals
     */
    async analyzeVisionResults(visionData, options = {}) {
        console.log('🔍 Starting enhanced Groq analysis of Vision OCR results...');
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        
        try {
            // Build comprehensive analysis prompt
            const analysisPrompt = this.buildComprehensiveAnalysisPrompt(visionData, options);
            
            // Get analysis from Groq
            const groqResponse = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt()
                    },
                    {
                        role: 'user',
                        content: analysisPrompt
                    }
                ],
                model: this.config.model,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });

            const analysisContent = groqResponse.choices[0]?.message?.content;
            
            if (!analysisContent) {
                throw new Error('No analysis content received from Groq');
            }

            // Parse and structure the analysis
            const structuredAnalysis = await this.parseAnalysisResponse(analysisContent, visionData);
            
            const processingTime = Date.now() - startTime;
            
            console.log(`✅ Enhanced Groq analysis completed in ${processingTime}ms`);
            
            return {
                success: true,
                processingTime,
                method: 'Enhanced Groq AI',
                confidence: structuredAnalysis.overallConfidence,
                analysis: structuredAnalysis,
                rawResponse: analysisContent,
                timestamp: new Date().toISOString(),
                usage: groqResponse.usage
            };
            
        } catch (error) {
            console.error('❌ Enhanced Groq analysis failed:', error);
            return {
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime,
                method: 'Enhanced Groq AI'
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
     * Parse and structure the analysis response from Groq
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
            console.warn('⚠️ Failed to parse Groq response as JSON, creating fallback analysis');
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
                dataSource: "Google Vision + Groq AI"
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
        const isUpSignal = /\b(up|bull|buy|long|positive|rise|increase)\b/i.test(rawContent);
        const isDownSignal = /\b(down|bear|sell|short|negative|fall|decrease)\b/i.test(rawContent);
        
        const direction = isUpSignal && !isDownSignal ? "UP" : 
                         isDownSignal && !isUpSignal ? "DOWN" : "UP";
        
        // Extract confidence if mentioned
        const confidenceMatch = rawContent.match(/(\d{2,3})%/);
        const confidence = confidenceMatch ? Math.max(70, Math.min(95, parseInt(confidenceMatch[1]))) : 75;
        
        return {
            multiTimeframeAnalysis: {
                "1m": { trend: direction === "UP" ? "UP" : "DOWN", strength: 6, confidence: confidence },
                "3m": { trend: direction === "UP" ? "UP" : "DOWN", strength: 6, confidence: confidence },
                "5m": { trend: direction === "UP" ? "UP" : "DOWN", strength: 6, confidence: confidence }
            },
            technicalIndicators: {
                ema: { signal: direction === "UP" ? "BUY" : "SELL", confidence: confidence },
                sma: { signal: direction === "UP" ? "BUY" : "SELL", confidence: confidence }
            },
            candlestickPatterns: [],
            supportResistance: {
                support: [],
                resistance: [],
                currentLevel: "BETWEEN",
                confidence: confidence
            },
            nextCandlePredictions: [
                { candle: 1, direction: direction, confidence: confidence, reasoning: "Based on overall trend analysis" },
                { candle: 2, direction: direction, confidence: confidence - 5, reasoning: "Continuation expected" },
                { candle: 3, direction: direction, confidence: confidence - 10, reasoning: "Trend momentum" }
            ],
            tradingSignal: {
                direction: direction,
                confidence: confidence,
                reasoning: "Fallback analysis based on text content analysis"
            },
            confluenceAnalysis: {
                bullishFactors: direction === "UP" ? ["Positive sentiment detected"] : [],
                bearishFactors: direction === "DOWN" ? ["Negative sentiment detected"] : [],
                overallBias: direction === "UP" ? "BULLISH" : "BEARISH",
                confluenceScore: confidence
            },
            overallConfidence: confidence,
            recommendation: direction === "UP" ? "BUY" : "SELL",
            riskLevel: "MEDIUM",
            metadata: {
                fallbackAnalysis: true,
                rawContent: rawContent.substring(0, 500),
                visionDataQuality: this.assessVisionDataQuality(visionData),
                analysisTimestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Assess the quality of Vision OCR data
     */
    assessVisionDataQuality(visionData) {
        let qualityScore = 0;
        let factors = [];
        
        if (visionData.tradingData?.prices?.length > 0) {
            qualityScore += 25;
            factors.push('Prices detected');
        }
        
        if (visionData.tradingData?.tradingPair) {
            qualityScore += 25;
            factors.push('Trading pair identified');
        }
        
        if (visionData.tradingData?.indicators && Object.keys(visionData.tradingData.indicators).length > 0) {
            qualityScore += 25;
            factors.push('Technical indicators found');
        }
        
        if (visionData.confidence && visionData.confidence > 0.8) {
            qualityScore += 25;
            factors.push('High OCR confidence');
        }
        
        return {
            score: qualityScore,
            level: qualityScore >= 75 ? 'HIGH' : qualityScore >= 50 ? 'MEDIUM' : 'LOW',
            factors: factors
        };
    }
}

module.exports = EnhancedGroqAnalysisService;
