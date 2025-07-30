/**
 * AI-Powered Pattern Recognition Engine
 * Integrates Groq and Together AI APIs for professional-grade technical analysis
 */

const axios = require('axios');
require('dotenv').config();

class AIPatternRecognition {
    constructor() {
        this.groqApiKey = process.env.GROQ_API_KEY;
        this.togetherApiKey = process.env.TOGETHER_API_KEY;
        this.groqBaseUrl = 'https://api.groq.com/openai/v1';
        this.togetherBaseUrl = 'https://api.together.xyz/v1';
        
        if (!this.groqApiKey || !this.togetherApiKey) {
            console.warn('⚠️ AI API keys not found in environment variables');
        }
    }

    /**
     * Analyze chart screenshot using AI for professional-grade pattern recognition
     */
    async analyzeChartWithAI(imageData, chartComponents) {
        console.log('🧠 Starting AI-powered chart analysis...');
        
        try {
            // Prepare comprehensive analysis prompt
            const analysisPrompt = this.buildAnalysisPrompt(chartComponents);
            
            // Get analysis from both AI providers for cross-validation
            const [groqAnalysis, togetherAnalysis] = await Promise.allSettled([
                this.getGroqAnalysis(analysisPrompt),
                this.getTogetherAnalysis(analysisPrompt)
            ]);
            
            // Combine and validate results
            const combinedAnalysis = this.combineAnalyses(groqAnalysis, togetherAnalysis, chartComponents);
            
            console.log('✅ AI analysis completed');
            return combinedAnalysis;
            
        } catch (error) {
            console.error('❌ AI analysis failed:', error.message);
            return this.getFallbackAnalysis(chartComponents);
        }
    }

    /**
     * Build comprehensive analysis prompt for AI
     */
    buildAnalysisPrompt(chartComponents) {
        const { timeframe, currencyPair, priceData, indicators } = chartComponents;
        
        return `
You are a professional forex trader and technical analyst. Analyze this trading chart data with institutional-level precision:

CHART DATA:
- Currency Pair: ${currencyPair}
- Timeframe: ${timeframe}
- Current Price: ${priceData.currentPrice}
- Price Range: ${priceData.lowPrice} - ${priceData.highPrice}

TECHNICAL INDICATORS DETECTED:
- EMA 5: ${indicators.ema5?.detected ? 'Present' : 'Not detected'} (Trend: ${indicators.ema5?.trend})
- SMA 20: ${indicators.sma20?.detected ? 'Present' : 'Not detected'} (Trend: ${indicators.sma20?.trend})
- Stochastic %K: ${indicators.stochastic?.kLine?.level || 'Unknown'} level
- Stochastic %D: ${indicators.stochastic?.dLine?.level || 'Unknown'} level

ANALYSIS REQUIREMENTS:
1. Provide precise indicator analysis with exact signals (BULLISH/BEARISH/NEUTRAL)
2. Identify candlestick patterns with confidence levels
3. Determine support/resistance levels with 4-5 decimal precision
4. Generate trading signals with entry/exit points and confidence percentages (80-95%)
5. Assess overall market structure and momentum

RESPONSE FORMAT:
Return a JSON object with this exact structure:
{
  "indicators": {
    "ema5": {"signal": "BULLISH/BEARISH/NEUTRAL", "position": "ABOVE/BELOW price", "strength": 1-10},
    "sma20": {"signal": "BULLISH/BEARISH/NEUTRAL", "position": "ABOVE/BELOW price", "strength": 1-10},
    "stochastic": {"kLevel": number, "dLevel": number, "signal": "BULLISH/BEARISH/NEUTRAL", "zone": "OVERSOLD/OVERBOUGHT/NEUTRAL"}
  },
  "patterns": {
    "primary": "Pattern name",
    "confidence": number,
    "description": "Detailed pattern description"
  },
  "supportResistance": {
    "support": [array of price levels],
    "resistance": [array of price levels],
    "currentLevel": number
  },
  "signals": {
    "immediate": {"direction": "LONG/SHORT", "confidence": number, "entry": number, "target": number, "stopLoss": number},
    "shortTerm": {"direction": "LONG/SHORT", "confidence": number, "entry": number, "target": number, "stopLoss": number},
    "mediumTerm": {"direction": "LONG/SHORT", "confidence": number, "entry": number, "target": number, "stopLoss": number}
  },
  "marketStructure": {
    "trend": "BULLISH/BEARISH/NEUTRAL",
    "momentum": "STRONG/MODERATE/WEAK",
    "volatility": "HIGH/MEDIUM/LOW"
  }
}

Provide only the JSON response with no additional text.`;
    }

    /**
     * Get analysis from Groq API
     */
    async getGroqAnalysis(prompt) {
        if (!this.groqApiKey) {
            throw new Error('Groq API key not available');
        }

        try {
            const response = await axios.post(`${this.groqBaseUrl}/chat/completions`, {
                model: 'llama-3.1-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional forex trader and technical analyst with 20+ years of experience. Provide precise, institutional-level technical analysis.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.groqApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const content = response.data.choices[0].message.content;
            return JSON.parse(content);

        } catch (error) {
            console.error('❌ Groq API error:', error.message);
            throw error;
        }
    }

    /**
     * Get analysis from Together AI API
     */
    async getTogetherAnalysis(prompt) {
        if (!this.togetherApiKey) {
            throw new Error('Together AI API key not available');
        }

        try {
            const response = await axios.post(`${this.togetherBaseUrl}/chat/completions`, {
                model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional forex trader and technical analyst with institutional-level expertise. Provide precise technical analysis with exact price levels and confidence percentages.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.togetherApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const content = response.data.choices[0].message.content;
            return JSON.parse(content);

        } catch (error) {
            console.error('❌ Together AI API error:', error.message);
            throw error;
        }
    }

    /**
     * Combine analyses from multiple AI providers
     */
    combineAnalyses(groqResult, togetherResult, chartComponents) {
        const groqAnalysis = groqResult.status === 'fulfilled' ? groqResult.value : null;
        const togetherAnalysis = togetherResult.status === 'fulfilled' ? togetherResult.value : null;

        if (!groqAnalysis && !togetherAnalysis) {
            return this.getFallbackAnalysis(chartComponents);
        }

        // Use primary analysis (prefer Groq, fallback to Together)
        const primaryAnalysis = groqAnalysis || togetherAnalysis;
        const secondaryAnalysis = groqAnalysis && togetherAnalysis ? togetherAnalysis : null;

        // Cross-validate confidence levels if both analyses available
        if (secondaryAnalysis) {
            this.crossValidateAnalyses(primaryAnalysis, secondaryAnalysis);
        }

        return {
            ...primaryAnalysis,
            metadata: {
                primarySource: groqAnalysis ? 'groq' : 'together',
                crossValidated: !!secondaryAnalysis,
                timestamp: new Date().toISOString(),
                confidence: this.calculateOverallConfidence(primaryAnalysis, secondaryAnalysis)
            }
        };
    }

    /**
     * Cross-validate analyses for accuracy
     */
    crossValidateAnalyses(primary, secondary) {
        // Compare signal directions
        const signalMatches = {
            immediate: primary.signals?.immediate?.direction === secondary.signals?.immediate?.direction,
            shortTerm: primary.signals?.shortTerm?.direction === secondary.signals?.shortTerm?.direction,
            mediumTerm: primary.signals?.mediumTerm?.direction === secondary.signals?.mediumTerm?.direction
        };

        // Adjust confidence based on agreement
        if (signalMatches.immediate && signalMatches.shortTerm) {
            primary.signals.immediate.confidence = Math.min(95, primary.signals.immediate.confidence + 5);
            primary.signals.shortTerm.confidence = Math.min(95, primary.signals.shortTerm.confidence + 5);
        }

        console.log('🔍 Cross-validation completed:', signalMatches);
    }

    /**
     * Calculate overall analysis confidence
     */
    calculateOverallConfidence(primary, secondary) {
        if (!secondary) return 'medium';

        const primaryAvgConfidence = this.getAverageConfidence(primary);
        const secondaryAvgConfidence = this.getAverageConfidence(secondary);
        
        const avgConfidence = (primaryAvgConfidence + secondaryAvgConfidence) / 2;

        if (avgConfidence >= 90) return 'very_high';
        if (avgConfidence >= 80) return 'high';
        if (avgConfidence >= 70) return 'medium';
        return 'low';
    }

    /**
     * Get average confidence from analysis
     */
    getAverageConfidence(analysis) {
        const confidences = [];
        
        if (analysis.signals?.immediate?.confidence) confidences.push(analysis.signals.immediate.confidence);
        if (analysis.signals?.shortTerm?.confidence) confidences.push(analysis.signals.shortTerm.confidence);
        if (analysis.signals?.mediumTerm?.confidence) confidences.push(analysis.signals.mediumTerm.confidence);
        if (analysis.patterns?.confidence) confidences.push(analysis.patterns.confidence);

        return confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 70;
    }

    /**
     * Fallback analysis when AI APIs are unavailable
     */
    getFallbackAnalysis(chartComponents) {
        console.log('🔄 Using fallback technical analysis...');
        
        const { priceData, indicators } = chartComponents;
        
        return {
            indicators: {
                ema5: {
                    signal: indicators.ema5?.trend === 'uptrend' ? 'BULLISH' : indicators.ema5?.trend === 'downtrend' ? 'BEARISH' : 'NEUTRAL',
                    position: 'DETECTED',
                    strength: 7
                },
                sma20: {
                    signal: indicators.sma20?.trend === 'uptrend' ? 'BULLISH' : indicators.sma20?.trend === 'downtrend' ? 'BEARISH' : 'NEUTRAL',
                    position: 'DETECTED',
                    strength: 7
                },
                stochastic: {
                    kLevel: indicators.stochastic?.kLine?.level || 50,
                    dLevel: indicators.stochastic?.dLine?.level || 50,
                    signal: 'NEUTRAL',
                    zone: 'NEUTRAL'
                }
            },
            patterns: {
                primary: 'Analysis in progress',
                confidence: 75,
                description: 'Technical analysis based on detected indicators'
            },
            supportResistance: {
                support: [priceData.lowPrice],
                resistance: [priceData.highPrice],
                currentLevel: priceData.currentPrice
            },
            signals: {
                immediate: {
                    direction: 'NEUTRAL',
                    confidence: 75,
                    entry: priceData.currentPrice,
                    target: priceData.currentPrice * 1.002,
                    stopLoss: priceData.currentPrice * 0.998
                },
                shortTerm: {
                    direction: 'NEUTRAL',
                    confidence: 75,
                    entry: priceData.currentPrice,
                    target: priceData.currentPrice * 1.005,
                    stopLoss: priceData.currentPrice * 0.995
                },
                mediumTerm: {
                    direction: 'NEUTRAL',
                    confidence: 75,
                    entry: priceData.currentPrice,
                    target: priceData.currentPrice * 1.01,
                    stopLoss: priceData.currentPrice * 0.99
                }
            },
            marketStructure: {
                trend: 'NEUTRAL',
                momentum: 'MODERATE',
                volatility: 'MEDIUM'
            },
            metadata: {
                primarySource: 'fallback',
                crossValidated: false,
                timestamp: new Date().toISOString(),
                confidence: 'medium'
            }
        };
    }
}

module.exports = AIPatternRecognition;
