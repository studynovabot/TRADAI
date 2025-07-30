#!/usr/bin/env node

/**
 * 🤖 AI Vision Chart Analysis Engine
 * ==================================
 * 
 * Advanced AI-powered chart analysis using Gemini Vision API
 * Analyzes 30-40 candlesticks with comprehensive technical analysis
 * 
 * Features:
 * - Gemini Vision API integration for chart reading
 * - Candlestick pattern recognition
 * - Technical indicator analysis
 * - Trend detection and strength assessment
 * - Support/resistance level identification
 * - Price action analysis
 * - Multi-timeframe compatibility
 * 
 * Built for TRADAI Chart Analysis System
 */

const { GeminiAPIManager } = require('./gemini-api-manager.js');

class AIVisionChartAnalyzer {
    constructor(options = {}) {
        this.options = {
            maxCandlesticks: 40,
            minCandlesticks: 30,
            analysisTimeout: 45000, // 45 seconds
            retryAttempts: 3,
            confidenceThreshold: 0.7,
            ...options
        };

        // Initialize API manager
        this.apiManager = new GeminiAPIManager({
            requestTimeout: this.options.analysisTimeout,
            maxRetries: this.options.retryAttempts
        });

        // Analysis statistics
        this.stats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            failedAnalyses: 0,
            averageAnalysisTime: 0,
            patternDetections: 0,
            trendDetections: 0,
            supportResistanceDetections: 0
        };

        this.initialized = false;
    }

    /**
     * Initialize the AI Vision Chart Analyzer
     */
    async initialize() {
        console.log('🚀 Initializing AI Vision Chart Analyzer...');
        
        try {
            // Initialize API manager
            await this.apiManager.initialize();
            
            this.initialized = true;
            console.log('✅ AI Vision Chart Analyzer initialized successfully');
            
            return {
                success: true,
                workingKeys: this.apiManager.workingKeys.length,
                analysisCapabilities: [
                    'Candlestick Pattern Recognition',
                    'Technical Indicator Analysis', 
                    'Trend Detection',
                    'Support/Resistance Identification',
                    'Price Action Analysis',
                    'Multi-timeframe Analysis'
                ]
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize AI Vision Chart Analyzer:', error.message);
            throw error;
        }
    }

    /**
     * Analyze a chart image using AI vision
     */
    async analyzeChart(chartData) {
        if (!this.initialized) {
            throw new Error('AI Vision Chart Analyzer not initialized. Call initialize() first.');
        }

        const startTime = Date.now();
        console.log(`🔍 Analyzing chart: ${chartData.timeframe}/${chartData.filename}`);

        try {
            this.stats.totalAnalyses++;

            // Create comprehensive analysis prompt
            const analysisPrompt = this.createAnalysisPrompt(chartData);

            // Make API request with image
            const response = await this.apiManager.makeRequest({
                contents: [{
                    parts: [
                        {
                            text: analysisPrompt
                        },
                        {
                            inline_data: {
                                mime_type: this.getMimeType(chartData.metadata.format),
                                data: chartData.imageData
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2000
                }
            });

            // Process AI response
            const analysis = await this.processAnalysisResponse(response, chartData);
            
            // Update statistics
            const analysisTime = Date.now() - startTime;
            this.updateStatistics(analysisTime, analysis);

            console.log(`✅ Chart analysis completed: ${chartData.timeframe}/${chartData.filename}`);
            console.log(`   Analysis time: ${analysisTime}ms`);
            console.log(`   Confidence: ${analysis.confidence}%`);
            console.log(`   Signal: ${analysis.signal}`);

            return analysis;

        } catch (error) {
            this.stats.failedAnalyses++;
            console.error(`❌ Chart analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create comprehensive analysis prompt for AI
     */
    createAnalysisPrompt(chartData) {
        return `You are a professional trading chart analyst with expertise in binary options trading. Analyze this ${chartData.timeframe} timeframe chart image with extreme precision.

ANALYSIS REQUIREMENTS:
======================

1. CHART STRUCTURE ANALYSIS:
   - Identify and count the visible candlesticks (target: 30-40 candles)
   - Determine the currency pair and current price
   - Identify the timeframe and time range shown
   - Assess chart quality and readability

2. CANDLESTICK ANALYSIS:
   - Analyze the last 10-15 candlesticks in detail
   - Identify candlestick patterns (doji, hammer, engulfing, shooting star, etc.)
   - Assess bullish/bearish momentum
   - Note any significant price gaps or unusual formations

3. TECHNICAL INDICATORS ANALYSIS:
   - Moving Averages (EMA/SMA): Identify visible EMAs/SMAs and price relationship
   - RSI: Read current RSI level and trend (if visible)
   - MACD: Analyze MACD line, signal line, and histogram (if visible)
   - Stochastic: Read %K and %D levels and crossovers (if visible)
   - Bollinger Bands: Assess price position relative to bands (if visible)
   - Volume: Analyze volume patterns and trends (if visible)

4. TREND ANALYSIS:
   - Overall trend direction (uptrend/downtrend/sideways)
   - Trend strength (weak/moderate/strong)
   - Recent trend changes or reversals
   - Higher highs/lower lows pattern

5. SUPPORT AND RESISTANCE:
   - Identify key support levels (minimum 2 levels)
   - Identify key resistance levels (minimum 2 levels)
   - Assess how price is reacting to these levels
   - Note any breakouts or bounces

6. PRICE ACTION ANALYSIS:
   - Current price position in the recent range
   - Price momentum and velocity
   - Rejection levels and acceptance areas
   - Market structure (consolidation/trending)

TRADING SIGNAL GENERATION:
=========================

Based on your analysis, provide a trading recommendation for the NEXT 3 CANDLES:

SIGNAL: [UP/DOWN/NO TRADE]
CONFIDENCE: [percentage 0-100]%
RISK LEVEL: [LOW/MEDIUM/HIGH]
TIMEFRAME: ${chartData.timeframe}

DETAILED REASONING:
- Technical indicator confluence
- Candlestick pattern significance
- Trend alignment
- Support/resistance interaction
- Risk factors and market conditions

CRITICAL REQUIREMENTS:
- Only recommend UP/DOWN if confidence is 70% or higher
- Use NO TRADE for risky or unclear market conditions
- Provide specific technical reasons for your decision
- Consider the ${chartData.timeframe} timeframe characteristics
- Focus on the next 3 candles prediction accuracy

FORMAT YOUR RESPONSE EXACTLY AS:

CHART_ANALYSIS:
===============
Currency_Pair: [pair]
Current_Price: [price]
Timeframe: ${chartData.timeframe}
Candlesticks_Count: [number]
Chart_Quality: [EXCELLENT/GOOD/FAIR/POOR]

TECHNICAL_INDICATORS:
====================
Moving_Averages: [analysis]
RSI: [level and trend]
MACD: [analysis]
Stochastic: [analysis]
Bollinger_Bands: [analysis]
Volume: [analysis]

PATTERN_RECOGNITION:
===================
Candlestick_Patterns: [identified patterns]
Chart_Patterns: [triangles, channels, etc.]
Recent_Formations: [last 5-10 candles]

TREND_ANALYSIS:
==============
Overall_Trend: [UP/DOWN/SIDEWAYS]
Trend_Strength: [WEAK/MODERATE/STRONG]
Trend_Duration: [estimate]
Reversal_Signals: [any reversal signs]

SUPPORT_RESISTANCE:
==================
Key_Support_Levels: [list levels]
Key_Resistance_Levels: [list levels]
Current_Level_Interaction: [analysis]
Breakout_Potential: [assessment]

TRADING_SIGNAL:
==============
SIGNAL: [UP/DOWN/NO TRADE]
CONFIDENCE: [percentage]%
RISK_LEVEL: [LOW/MEDIUM/HIGH]
TARGET_CANDLES: 3
REASONING: [detailed explanation]

RISK_ASSESSMENT:
===============
Market_Condition: [TRENDING/RANGING/VOLATILE/UNCERTAIN]
Risk_Factors: [list any risks]
Trade_Suitability: [EXCELLENT/GOOD/FAIR/POOR]
Recommendation: [final recommendation]

Analyze the chart image now and provide your professional assessment.`;
    }

    /**
     * Process the AI analysis response
     */
    async processAnalysisResponse(response, chartData) {
        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('No analysis response received from AI');
        }

        const analysisText = response.candidates[0].content.parts[0].text;
        
        // Parse the structured response
        const analysis = this.parseAnalysisResponse(analysisText, chartData);
        
        // Validate analysis quality
        this.validateAnalysis(analysis);
        
        return analysis;
    }

    /**
     * Parse the structured AI response
     */
    parseAnalysisResponse(analysisText, chartData) {
        const analysis = {
            chartData: chartData,
            timestamp: new Date().toISOString(),
            rawAnalysis: analysisText,
            
            // Parsed components
            chartInfo: {},
            technicalIndicators: {},
            patterns: {},
            trend: {},
            supportResistance: {},
            signal: 'NO TRADE',
            confidence: 0,
            riskLevel: 'HIGH',
            reasoning: '',
            riskAssessment: {},
            
            // Metadata
            analysisQuality: 'UNKNOWN',
            parsingSuccess: false
        };

        try {
            // Extract signal information
            const signalMatch = analysisText.match(/SIGNAL:\s*([UP|DOWN|NO TRADE]+)/i);
            if (signalMatch) {
                analysis.signal = signalMatch[1].toUpperCase();
            }

            // Extract confidence
            const confidenceMatch = analysisText.match(/CONFIDENCE:\s*(\d+)%/i);
            if (confidenceMatch) {
                analysis.confidence = parseInt(confidenceMatch[1]);
            }

            // Extract risk level
            const riskMatch = analysisText.match(/RISK_LEVEL:\s*([LOW|MEDIUM|HIGH]+)/i);
            if (riskMatch) {
                analysis.riskLevel = riskMatch[1].toUpperCase();
            }

            // Extract reasoning
            const reasoningMatch = analysisText.match(/REASONING:\s*([^]*?)(?=\n\n|\nRISK_ASSESSMENT|$)/i);
            if (reasoningMatch) {
                analysis.reasoning = reasoningMatch[1].trim();
            }

            // Extract currency pair
            const pairMatch = analysisText.match(/Currency_Pair:\s*([A-Z\/]+)/i);
            if (pairMatch) {
                analysis.chartInfo.currencyPair = pairMatch[1];
            }

            // Extract current price
            const priceMatch = analysisText.match(/Current_Price:\s*([\d\.]+)/i);
            if (priceMatch) {
                analysis.chartInfo.currentPrice = parseFloat(priceMatch[1]);
            }

            // Extract trend analysis
            const trendMatch = analysisText.match(/Overall_Trend:\s*([UP|DOWN|SIDEWAYS]+)/i);
            if (trendMatch) {
                analysis.trend.direction = trendMatch[1].toUpperCase();
                this.stats.trendDetections++;
            }

            // Extract trend strength
            const strengthMatch = analysisText.match(/Trend_Strength:\s*([WEAK|MODERATE|STRONG]+)/i);
            if (strengthMatch) {
                analysis.trend.strength = strengthMatch[1].toUpperCase();
            }

            // Check for pattern detections
            if (analysisText.toLowerCase().includes('doji') || 
                analysisText.toLowerCase().includes('hammer') ||
                analysisText.toLowerCase().includes('engulfing')) {
                this.stats.patternDetections++;
            }

            // Check for support/resistance detections
            if (analysisText.toLowerCase().includes('support') && 
                analysisText.toLowerCase().includes('resistance')) {
                this.stats.supportResistanceDetections++;
            }

            analysis.parsingSuccess = true;
            analysis.analysisQuality = this.assessAnalysisQuality(analysis, analysisText);

        } catch (error) {
            console.warn('⚠️ Error parsing analysis response:', error.message);
            analysis.parsingSuccess = false;
        }

        return analysis;
    }

    /**
     * Validate the analysis quality
     */
    validateAnalysis(analysis) {
        // Check if signal is valid
        if (!['UP', 'DOWN', 'NO TRADE'].includes(analysis.signal)) {
            throw new Error(`Invalid signal: ${analysis.signal}`);
        }

        // Check confidence range
        if (analysis.confidence < 0 || analysis.confidence > 100) {
            throw new Error(`Invalid confidence: ${analysis.confidence}%`);
        }

        // Check if trade signal meets minimum confidence
        if ((analysis.signal === 'UP' || analysis.signal === 'DOWN') && 
            analysis.confidence < this.options.confidenceThreshold * 100) {
            console.warn(`⚠️ Trade signal confidence (${analysis.confidence}%) below threshold (${this.options.confidenceThreshold * 100}%)`);
        }

        // Check if reasoning is provided
        if (!analysis.reasoning || analysis.reasoning.length < 50) {
            console.warn('⚠️ Analysis reasoning is too brief or missing');
        }
    }

    /**
     * Assess the quality of the analysis
     */
    assessAnalysisQuality(analysis, analysisText) {
        let qualityScore = 0;
        
        // Check for key components
        if (analysis.signal !== 'UNKNOWN') qualityScore += 20;
        if (analysis.confidence > 0) qualityScore += 20;
        if (analysis.reasoning.length > 100) qualityScore += 20;
        if (analysisText.includes('TECHNICAL_INDICATORS')) qualityScore += 15;
        if (analysisText.includes('SUPPORT_RESISTANCE')) qualityScore += 15;
        if (analysisText.includes('PATTERN_RECOGNITION')) qualityScore += 10;

        if (qualityScore >= 90) return 'EXCELLENT';
        if (qualityScore >= 75) return 'GOOD';
        if (qualityScore >= 60) return 'FAIR';
        return 'POOR';
    }

    /**
     * Get MIME type for image format
     */
    getMimeType(format) {
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg'
        };
        
        return mimeTypes[format.toLowerCase()] || 'image/png';
    }

    /**
     * Update analysis statistics
     */
    updateStatistics(analysisTime, analysis) {
        this.stats.successfulAnalyses++;
        
        // Update average analysis time
        if (this.stats.totalAnalyses === 1) {
            this.stats.averageAnalysisTime = analysisTime;
        } else {
            this.stats.averageAnalysisTime = 
                ((this.stats.averageAnalysisTime * (this.stats.totalAnalyses - 1)) + analysisTime) / this.stats.totalAnalyses;
        }
    }

    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalAnalyses > 0 ? 
                (this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
            averageAnalysisTimeMs: Math.round(this.stats.averageAnalysisTime),
            apiManagerStats: this.apiManager.getStats()
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down AI Vision Chart Analyzer...');
        
        if (this.apiManager) {
            await this.apiManager.shutdown();
        }
        
        console.log('✅ AI Vision Chart Analyzer shutdown complete');
    }
}

module.exports = { AIVisionChartAnalyzer };
