/**
 * Advanced Multi-Timeframe Analysis Engine
 * 
 * Enhanced version that analyzes multiple timeframes simultaneously to generate 
 * confluence-based trading signals with high accuracy and confidence scoring.
 */

const { TradingDataExtractor } = require('./TradingDataExtractor');

class AdvancedMultiTimeframeAnalyzer {
    constructor(config = {}) {
        this.config = {
            // Timeframe weights for confluence analysis
            timeframeWeights: config.timeframeWeights || {
                '1m': 0.1,
                '5m': 0.2,
                '15m': 0.25,
                '30m': 0.3,
                '1h': 0.35,
                '4h': 0.4,
                '1d': 0.5
            },
            
            // Confluence requirements
            minConfluenceFactors: config.minConfluenceFactors || 3,
            minConfidenceThreshold: config.minConfidenceThreshold || 75,
            
            // Signal strength thresholds
            strongSignalThreshold: config.strongSignalThreshold || 85,
            moderateSignalThreshold: config.moderateSignalThreshold || 70,
            
            // Pattern weights
            patternWeights: config.patternWeights || {
                'single_candlestick': 0.6,
                'multi_candlestick': 0.8,
                'chart_formation': 1.0,
                'support_resistance': 0.9,
                'trend_analysis': 0.7,
                'indicator_confluence': 0.8
            },
            
            ...config
        };
        
        this.analysisHistory = [];
        this.dataExtractor = new TradingDataExtractor();
    }

    /**
     * Perform comprehensive multi-timeframe analysis
     */
    async analyzeMultipleTimeframes(analysisData) {
        console.log('🔄 Starting advanced multi-timeframe analysis...');
        
        const startTime = Date.now();
        const analysisId = `amta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Extract market structure from all available data
            const marketStructure = this.analyzeMarketStructure(analysisData);
            
            // Perform confluence analysis
            const confluenceAnalysis = this.performConfluenceAnalysis(analysisData);
            
            // Generate trading signals
            const signals = this.generateTradingSignals(marketStructure, confluenceAnalysis);
            
            // Calculate risk management parameters
            const riskManagement = this.calculateRiskManagement(signals, marketStructure);
            
            // Determine overall market bias
            const marketBias = this.determineMarketBias(confluenceAnalysis, marketStructure);
            
            const processingTime = Date.now() - startTime;
            
            const result = {
                analysisId,
                success: true,
                processingTime,
                marketStructure,
                confluenceAnalysis,
                signals,
                riskManagement,
                marketBias,
                confidence: this.calculateOverallConfidence(confluenceAnalysis, signals),
                timestamp: new Date().toISOString(),
                metadata: {
                    confluenceFactors: confluenceAnalysis.factors.length,
                    signalCount: signals.length,
                    strongSignals: signals.filter(s => s.strength === 'strong').length
                }
            };
            
            // Store analysis history
            this.analysisHistory.push({
                analysisId,
                timestamp: result.timestamp,
                processingTime,
                confidence: result.confidence,
                signalCount: signals.length,
                success: true
            });
            
            console.log(`✅ Advanced multi-timeframe analysis completed in ${processingTime}ms with ${result.confidence.toFixed(1)}% confidence`);
            
            return result;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            console.error('❌ Advanced multi-timeframe analysis failed:', error.message);
            
            return {
                analysisId,
                success: false,
                error: error.message,
                processingTime,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Analyze market structure from all available data
     */
    analyzeMarketStructure(analysisData) {
        console.log('🏗️ Analyzing market structure...');
        
        const structure = {
            trend: { direction: 'unknown', strength: 0, confidence: 0 },
            supportResistance: { support: [], resistance: [] },
            priceAction: { patterns: [], signals: [] },
            volatility: { level: 'unknown', trend: 'unknown' },
            volume: { trend: 'unknown', strength: 0 }
        };
        
        try {
            // Analyze trend from computer vision data
            if (analysisData.chartData && analysisData.chartData.trendAnalysis) {
                structure.trend = analysisData.chartData.trendAnalysis;
            }
            
            // Consolidate support and resistance levels
            if (analysisData.chartData && analysisData.chartData.supportResistance) {
                structure.supportResistance = analysisData.chartData.supportResistance;
            }
            
            // Analyze price action patterns
            if (analysisData.chartData && analysisData.chartData.patterns) {
                structure.priceAction.patterns = analysisData.chartData.patterns;
                structure.priceAction.signals = this.extractSignalsFromPatterns(analysisData.chartData.patterns);
            }
            
            // Analyze volatility (simplified)
            structure.volatility = this.analyzeVolatility(analysisData);
            
            console.log(`   🏗️ Market structure: ${structure.trend.direction} trend, ${structure.supportResistance.support.length} support levels`);
            
            return structure;
            
        } catch (error) {
            console.error('❌ Market structure analysis failed:', error.message);
            return structure;
        }
    }

    /**
     * Perform confluence analysis across all factors
     */
    performConfluenceAnalysis(analysisData) {
        console.log('🎯 Performing confluence analysis...');
        
        const confluence = {
            factors: [],
            bullishFactors: 0,
            bearishFactors: 0,
            neutralFactors: 0,
            overallBias: 'neutral',
            strength: 0,
            confidence: 0
        };
        
        try {
            // Analyze technical indicators
            const indicatorFactors = this.analyzeIndicatorConfluence(analysisData);
            confluence.factors.push(...indicatorFactors);
            
            // Analyze candlestick patterns
            const patternFactors = this.analyzeCandlestickConfluence(analysisData);
            confluence.factors.push(...patternFactors);
            
            // Analyze support/resistance confluence
            const srFactors = this.analyzeSupportResistanceConfluence(analysisData);
            confluence.factors.push(...srFactors);
            
            // Analyze trend confluence
            const trendFactors = this.analyzeTrendConfluence(analysisData);
            confluence.factors.push(...trendFactors);
            
            // Calculate confluence statistics
            confluence.factors.forEach(factor => {
                if (factor.bias === 'bullish') confluence.bullishFactors++;
                else if (factor.bias === 'bearish') confluence.bearishFactors++;
                else confluence.neutralFactors++;
            });
            
            // Determine overall bias
            if (confluence.bullishFactors > confluence.bearishFactors) {
                confluence.overallBias = 'bullish';
                confluence.strength = (confluence.bullishFactors / confluence.factors.length) * 100;
            } else if (confluence.bearishFactors > confluence.bullishFactors) {
                confluence.overallBias = 'bearish';
                confluence.strength = (confluence.bearishFactors / confluence.factors.length) * 100;
            } else {
                confluence.overallBias = 'neutral';
                confluence.strength = 50;
            }
            
            // Calculate confidence based on factor count and agreement
            confluence.confidence = this.calculateConfluenceConfidence(confluence);
            
            console.log(`   🎯 Confluence: ${confluence.overallBias} bias with ${confluence.factors.length} factors (${confluence.confidence.toFixed(1)}%)`);
            
            return confluence;
            
        } catch (error) {
            console.error('❌ Confluence analysis failed:', error.message);
            return confluence;
        }
    }

    /**
     * Generate trading signals based on analysis
     */
    generateTradingSignals(marketStructure, confluenceAnalysis) {
        console.log('📊 Generating trading signals...');
        
        const signals = [];
        
        try {
            // Generate signals based on confluence strength
            if (confluenceAnalysis.confidence >= this.config.minConfidenceThreshold) {
                
                if (confluenceAnalysis.overallBias === 'bullish' && confluenceAnalysis.strength >= this.config.moderateSignalThreshold) {
                    signals.push(this.createBullishSignal(marketStructure, confluenceAnalysis));
                }
                
                if (confluenceAnalysis.overallBias === 'bearish' && confluenceAnalysis.strength >= this.config.moderateSignalThreshold) {
                    signals.push(this.createBearishSignal(marketStructure, confluenceAnalysis));
                }
            }
            
            // Generate pattern-specific signals
            const patternSignals = this.generatePatternSignals(marketStructure.priceAction.patterns);
            signals.push(...patternSignals);
            
            // Filter and rank signals
            const rankedSignals = this.rankSignals(signals);
            
            console.log(`   📊 Generated ${rankedSignals.length} trading signals`);
            
            return rankedSignals;
            
        } catch (error) {
            console.error('❌ Signal generation failed:', error.message);
            return [];
        }
    }

    /**
     * Calculate overall confidence
     */
    calculateOverallConfidence(confluenceAnalysis, signals) {
        let confidence = 0;
        let factors = 0;
        
        // Confluence confidence (60% weight)
        if (confluenceAnalysis.confidence > 0) {
            confidence += confluenceAnalysis.confidence * 0.6;
            factors += 0.6;
        }
        
        // Signal quality confidence (40% weight)
        if (signals.length > 0) {
            const avgSignalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
            confidence += avgSignalConfidence * 0.4;
            factors += 0.4;
        }
        
        return factors > 0 ? confidence / factors : 0;
    }
}

module.exports = { AdvancedMultiTimeframeAnalyzer };
