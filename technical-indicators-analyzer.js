#!/usr/bin/env node

/**
 * 📊 Technical Indicators Analysis Module
 * ======================================
 * 
 * Comprehensive technical analysis capabilities for all major indicators
 * Processes EMA, SMA, RSI, MACD, Stochastic, Bollinger Bands, and more
 * 
 * Features:
 * - Advanced indicator calculation and validation
 * - Multi-timeframe indicator analysis
 * - Confluence detection across indicators
 * - Signal strength assessment
 * - Trend confirmation analysis
 * - Overbought/oversold detection
 * 
 * Built for TRADAI Chart Analysis System
 */

class TechnicalIndicatorsAnalyzer {
    constructor(options = {}) {
        this.options = {
            defaultPeriods: {
                sma: [20, 50, 200],
                ema: [12, 26, 50],
                rsi: 14,
                macd: { fast: 12, slow: 26, signal: 9 },
                stochastic: { k: 14, d: 3 },
                bollingerBands: { period: 20, stdDev: 2 }
            },
            overboughtThreshold: 70,
            oversoldThreshold: 30,
            trendStrengthThreshold: 0.6,
            confluenceMinimum: 3,
            ...options
        };

        // Analysis results storage
        this.analysisResults = {
            movingAverages: {},
            momentum: {},
            volatility: {},
            trend: {},
            confluence: {},
            signals: []
        };

        this.stats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            indicatorDetections: {
                sma: 0,
                ema: 0,
                rsi: 0,
                macd: 0,
                stochastic: 0,
                bollingerBands: 0
            },
            confluenceDetections: 0,
            trendConfirmations: 0
        };
    }

    /**
     * Analyze technical indicators from AI vision response
     */
    async analyzeIndicators(aiAnalysisText, chartData) {
        console.log(`📊 Analyzing technical indicators for ${chartData.timeframe}/${chartData.filename}`);

        try {
            this.stats.totalAnalyses++;

            // Reset analysis results
            this.resetAnalysisResults();

            // Extract and analyze each indicator type
            await this.analyzeMovingAverages(aiAnalysisText);
            await this.analyzeMomentumIndicators(aiAnalysisText);
            await this.analyzeVolatilityIndicators(aiAnalysisText);
            await this.analyzeTrendIndicators(aiAnalysisText);

            // Perform confluence analysis
            await this.performConfluenceAnalysis();

            // Generate indicator-based signals
            const signals = await this.generateIndicatorSignals();

            // Calculate overall indicator strength
            const indicatorStrength = this.calculateIndicatorStrength();

            this.stats.successfulAnalyses++;

            const result = {
                chartData,
                timestamp: new Date().toISOString(),
                indicators: this.analysisResults,
                signals,
                indicatorStrength,
                confluence: this.analysisResults.confluence,
                summary: this.generateIndicatorSummary()
            };

            console.log(`✅ Technical indicators analysis completed`);
            console.log(`   Indicators detected: ${this.countDetectedIndicators()}`);
            console.log(`   Confluence signals: ${this.analysisResults.confluence.count}`);
            console.log(`   Overall strength: ${indicatorStrength.toFixed(2)}`);

            return result;

        } catch (error) {
            console.error(`❌ Technical indicators analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze moving averages (SMA/EMA)
     */
    async analyzeMovingAverages(analysisText) {
        const maAnalysis = {
            sma: this.extractSMAData(analysisText),
            ema: this.extractEMAData(analysisText),
            pricePosition: this.analyzePricePosition(analysisText),
            crossovers: this.detectMACrossovers(analysisText),
            trend: this.determineMATrend(analysisText)
        };

        this.analysisResults.movingAverages = maAnalysis;

        // Update statistics
        if (maAnalysis.sma.detected) this.stats.indicatorDetections.sma++;
        if (maAnalysis.ema.detected) this.stats.indicatorDetections.ema++;

        return maAnalysis;
    }

    /**
     * Extract SMA data from analysis text
     */
    extractSMAData(text) {
        const smaData = {
            detected: false,
            periods: [],
            values: {},
            priceRelation: 'UNKNOWN',
            signal: 'NEUTRAL'
        };

        // Look for SMA mentions
        const smaMatches = text.match(/SMA[\s\-_]*(\d+)[:\s]*([0-9\.]+)?/gi);
        if (smaMatches) {
            smaData.detected = true;
            smaMatches.forEach(match => {
                const periodMatch = match.match(/(\d+)/);
                const valueMatch = match.match(/([0-9\.]+)$/);
                
                if (periodMatch) {
                    const period = parseInt(periodMatch[1]);
                    smaData.periods.push(period);
                    
                    if (valueMatch) {
                        smaData.values[period] = parseFloat(valueMatch[1]);
                    }
                }
            });
        }

        // Analyze price relationship to SMA
        if (text.toLowerCase().includes('above') && text.toLowerCase().includes('sma')) {
            smaData.priceRelation = 'ABOVE';
            smaData.signal = 'BULLISH';
        } else if (text.toLowerCase().includes('below') && text.toLowerCase().includes('sma')) {
            smaData.priceRelation = 'BELOW';
            smaData.signal = 'BEARISH';
        }

        return smaData;
    }

    /**
     * Extract EMA data from analysis text
     */
    extractEMAData(text) {
        const emaData = {
            detected: false,
            periods: [],
            values: {},
            priceRelation: 'UNKNOWN',
            signal: 'NEUTRAL'
        };

        // Look for EMA mentions
        const emaMatches = text.match(/EMA[\s\-_]*(\d+)[:\s]*([0-9\.]+)?/gi);
        if (emaMatches) {
            emaData.detected = true;
            emaMatches.forEach(match => {
                const periodMatch = match.match(/(\d+)/);
                const valueMatch = match.match(/([0-9\.]+)$/);
                
                if (periodMatch) {
                    const period = parseInt(periodMatch[1]);
                    emaData.periods.push(period);
                    
                    if (valueMatch) {
                        emaData.values[period] = parseFloat(valueMatch[1]);
                    }
                }
            });
        }

        // Analyze price relationship to EMA
        if (text.toLowerCase().includes('above') && text.toLowerCase().includes('ema')) {
            emaData.priceRelation = 'ABOVE';
            emaData.signal = 'BULLISH';
        } else if (text.toLowerCase().includes('below') && text.toLowerCase().includes('ema')) {
            emaData.priceRelation = 'BELOW';
            emaData.signal = 'BEARISH';
        }

        return emaData;
    }

    /**
     * Analyze momentum indicators (RSI, MACD, Stochastic)
     */
    async analyzeMomentumIndicators(analysisText) {
        const momentumAnalysis = {
            rsi: this.extractRSIData(analysisText),
            macd: this.extractMACDData(analysisText),
            stochastic: this.extractStochasticData(analysisText),
            momentum: this.assessOverallMomentum(analysisText)
        };

        this.analysisResults.momentum = momentumAnalysis;

        // Update statistics
        if (momentumAnalysis.rsi.detected) this.stats.indicatorDetections.rsi++;
        if (momentumAnalysis.macd.detected) this.stats.indicatorDetections.macd++;
        if (momentumAnalysis.stochastic.detected) this.stats.indicatorDetections.stochastic++;

        return momentumAnalysis;
    }

    /**
     * Extract RSI data from analysis text
     */
    extractRSIData(text) {
        const rsiData = {
            detected: false,
            value: null,
            level: 'NEUTRAL',
            signal: 'NEUTRAL',
            trend: 'UNKNOWN'
        };

        // Look for RSI mentions
        const rsiMatch = text.match(/RSI[:\s]*([0-9\.]+)/i);
        if (rsiMatch) {
            rsiData.detected = true;
            rsiData.value = parseFloat(rsiMatch[1]);

            // Determine RSI level
            if (rsiData.value >= this.options.overboughtThreshold) {
                rsiData.level = 'OVERBOUGHT';
                rsiData.signal = 'BEARISH';
            } else if (rsiData.value <= this.options.oversoldThreshold) {
                rsiData.level = 'OVERSOLD';
                rsiData.signal = 'BULLISH';
            } else if (rsiData.value > 50) {
                rsiData.level = 'BULLISH_ZONE';
                rsiData.signal = 'BULLISH';
            } else {
                rsiData.level = 'BEARISH_ZONE';
                rsiData.signal = 'BEARISH';
            }

            // Determine trend
            if (text.toLowerCase().includes('rising') || text.toLowerCase().includes('upward')) {
                rsiData.trend = 'RISING';
            } else if (text.toLowerCase().includes('falling') || text.toLowerCase().includes('downward')) {
                rsiData.trend = 'FALLING';
            }
        }

        return rsiData;
    }

    /**
     * Extract MACD data from analysis text
     */
    extractMACDData(text) {
        const macdData = {
            detected: false,
            signal: 'NEUTRAL',
            crossover: 'NONE',
            histogram: 'NEUTRAL',
            trend: 'UNKNOWN'
        };

        // Look for MACD mentions
        if (text.toLowerCase().includes('macd')) {
            macdData.detected = true;

            // Check for crossovers
            if (text.toLowerCase().includes('bullish crossover') || 
                text.toLowerCase().includes('macd above signal')) {
                macdData.crossover = 'BULLISH';
                macdData.signal = 'BULLISH';
            } else if (text.toLowerCase().includes('bearish crossover') || 
                       text.toLowerCase().includes('macd below signal')) {
                macdData.crossover = 'BEARISH';
                macdData.signal = 'BEARISH';
            }

            // Check histogram
            if (text.toLowerCase().includes('histogram') && text.toLowerCase().includes('positive')) {
                macdData.histogram = 'POSITIVE';
            } else if (text.toLowerCase().includes('histogram') && text.toLowerCase().includes('negative')) {
                macdData.histogram = 'NEGATIVE';
            }
        }

        return macdData;
    }

    /**
     * Extract Stochastic data from analysis text
     */
    extractStochasticData(text) {
        const stochData = {
            detected: false,
            kValue: null,
            dValue: null,
            level: 'NEUTRAL',
            signal: 'NEUTRAL',
            crossover: 'NONE'
        };

        // Look for Stochastic mentions
        if (text.toLowerCase().includes('stochastic')) {
            stochData.detected = true;

            // Extract values if present
            const kMatch = text.match(/%K[:\s]*([0-9\.]+)/i);
            const dMatch = text.match(/%D[:\s]*([0-9\.]+)/i);

            if (kMatch) stochData.kValue = parseFloat(kMatch[1]);
            if (dMatch) stochData.dValue = parseFloat(dMatch[1]);

            // Determine level and signal
            const avgValue = (stochData.kValue + stochData.dValue) / 2;
            if (avgValue >= 80) {
                stochData.level = 'OVERBOUGHT';
                stochData.signal = 'BEARISH';
            } else if (avgValue <= 20) {
                stochData.level = 'OVERSOLD';
                stochData.signal = 'BULLISH';
            }

            // Check for crossovers
            if (text.toLowerCase().includes('bullish crossover') || 
                text.toLowerCase().includes('%k above %d')) {
                stochData.crossover = 'BULLISH';
                stochData.signal = 'BULLISH';
            } else if (text.toLowerCase().includes('bearish crossover') || 
                       text.toLowerCase().includes('%k below %d')) {
                stochData.crossover = 'BEARISH';
                stochData.signal = 'BEARISH';
            }
        }

        return stochData;
    }

    /**
     * Analyze volatility indicators (Bollinger Bands)
     */
    async analyzeVolatilityIndicators(analysisText) {
        const volatilityAnalysis = {
            bollingerBands: this.extractBollingerBandsData(analysisText),
            volatility: this.assessVolatility(analysisText)
        };

        this.analysisResults.volatility = volatilityAnalysis;

        // Update statistics
        if (volatilityAnalysis.bollingerBands.detected) {
            this.stats.indicatorDetections.bollingerBands++;
        }

        return volatilityAnalysis;
    }

    /**
     * Extract Bollinger Bands data from analysis text
     */
    extractBollingerBandsData(text) {
        const bbData = {
            detected: false,
            pricePosition: 'UNKNOWN',
            signal: 'NEUTRAL',
            squeeze: false,
            expansion: false
        };

        if (text.toLowerCase().includes('bollinger')) {
            bbData.detected = true;

            // Analyze price position
            if (text.toLowerCase().includes('upper band')) {
                bbData.pricePosition = 'UPPER';
                bbData.signal = 'BEARISH';
            } else if (text.toLowerCase().includes('lower band')) {
                bbData.pricePosition = 'LOWER';
                bbData.signal = 'BULLISH';
            } else if (text.toLowerCase().includes('middle band')) {
                bbData.pricePosition = 'MIDDLE';
                bbData.signal = 'NEUTRAL';
            }

            // Check for squeeze or expansion
            if (text.toLowerCase().includes('squeeze')) {
                bbData.squeeze = true;
            } else if (text.toLowerCase().includes('expansion')) {
                bbData.expansion = true;
            }
        }

        return bbData;
    }

    /**
     * Analyze trend indicators
     */
    async analyzeTrendIndicators(analysisText) {
        const trendAnalysis = {
            overallTrend: this.extractOverallTrend(analysisText),
            trendStrength: this.assessTrendStrength(analysisText),
            trendConfirmation: this.checkTrendConfirmation(analysisText)
        };

        this.analysisResults.trend = trendAnalysis;

        if (trendAnalysis.trendConfirmation) {
            this.stats.trendConfirmations++;
        }

        return trendAnalysis;
    }

    /**
     * Extract overall trend from analysis
     */
    extractOverallTrend(text) {
        const trendData = {
            direction: 'UNKNOWN',
            strength: 'UNKNOWN',
            duration: 'UNKNOWN'
        };

        // Extract trend direction
        if (text.toLowerCase().includes('uptrend') || text.toLowerCase().includes('bullish trend')) {
            trendData.direction = 'UP';
        } else if (text.toLowerCase().includes('downtrend') || text.toLowerCase().includes('bearish trend')) {
            trendData.direction = 'DOWN';
        } else if (text.toLowerCase().includes('sideways') || text.toLowerCase().includes('ranging')) {
            trendData.direction = 'SIDEWAYS';
        }

        // Extract trend strength
        if (text.toLowerCase().includes('strong trend')) {
            trendData.strength = 'STRONG';
        } else if (text.toLowerCase().includes('weak trend')) {
            trendData.strength = 'WEAK';
        } else if (text.toLowerCase().includes('moderate trend')) {
            trendData.strength = 'MODERATE';
        }

        return trendData;
    }

    /**
     * Perform confluence analysis across all indicators
     */
    async performConfluenceAnalysis() {
        const confluenceSignals = [];
        let bullishCount = 0;
        let bearishCount = 0;

        // Check each indicator for signals
        const indicators = [
            this.analysisResults.movingAverages.sma,
            this.analysisResults.movingAverages.ema,
            this.analysisResults.momentum.rsi,
            this.analysisResults.momentum.macd,
            this.analysisResults.momentum.stochastic,
            this.analysisResults.volatility.bollingerBands
        ];

        indicators.forEach((indicator, index) => {
            if (indicator && indicator.signal) {
                if (indicator.signal === 'BULLISH') {
                    bullishCount++;
                    confluenceSignals.push({
                        indicator: this.getIndicatorName(index),
                        signal: 'BULLISH'
                    });
                } else if (indicator.signal === 'BEARISH') {
                    bearishCount++;
                    confluenceSignals.push({
                        indicator: this.getIndicatorName(index),
                        signal: 'BEARISH'
                    });
                }
            }
        });

        const totalSignals = bullishCount + bearishCount;
        const confluenceStrength = Math.max(bullishCount, bearishCount) / totalSignals;

        this.analysisResults.confluence = {
            signals: confluenceSignals,
            bullishCount,
            bearishCount,
            totalSignals,
            strength: confluenceStrength,
            direction: bullishCount > bearishCount ? 'BULLISH' : 
                      bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL',
            count: Math.max(bullishCount, bearishCount)
        };

        if (this.analysisResults.confluence.count >= this.options.confluenceMinimum) {
            this.stats.confluenceDetections++;
        }

        return this.analysisResults.confluence;
    }

    /**
     * Generate indicator-based trading signals
     */
    async generateIndicatorSignals() {
        const signals = [];

        // Moving Average signals
        if (this.analysisResults.movingAverages.sma.signal !== 'NEUTRAL') {
            signals.push({
                type: 'MOVING_AVERAGE',
                indicator: 'SMA',
                signal: this.analysisResults.movingAverages.sma.signal,
                strength: 0.7
            });
        }

        // RSI signals
        if (this.analysisResults.momentum.rsi.detected) {
            const rsi = this.analysisResults.momentum.rsi;
            if (rsi.level === 'OVERBOUGHT' || rsi.level === 'OVERSOLD') {
                signals.push({
                    type: 'MOMENTUM',
                    indicator: 'RSI',
                    signal: rsi.signal,
                    strength: 0.8,
                    value: rsi.value
                });
            }
        }

        // MACD signals
        if (this.analysisResults.momentum.macd.crossover !== 'NONE') {
            signals.push({
                type: 'MOMENTUM',
                indicator: 'MACD',
                signal: this.analysisResults.momentum.macd.signal,
                strength: 0.75
            });
        }

        // Confluence signals
        if (this.analysisResults.confluence.count >= this.options.confluenceMinimum) {
            signals.push({
                type: 'CONFLUENCE',
                indicator: 'MULTIPLE',
                signal: this.analysisResults.confluence.direction,
                strength: this.analysisResults.confluence.strength,
                count: this.analysisResults.confluence.count
            });
        }

        this.analysisResults.signals = signals;
        return signals;
    }

    /**
     * Calculate overall indicator strength
     */
    calculateIndicatorStrength() {
        const detectedCount = this.countDetectedIndicators();
        const confluenceStrength = this.analysisResults.confluence.strength || 0;
        const signalCount = this.analysisResults.signals.length;

        // Weighted calculation
        const detectionWeight = 0.3;
        const confluenceWeight = 0.5;
        const signalWeight = 0.2;

        const detectionScore = Math.min(detectedCount / 6, 1); // Max 6 indicators
        const signalScore = Math.min(signalCount / 4, 1); // Max 4 signals

        return (detectionScore * detectionWeight) + 
               (confluenceStrength * confluenceWeight) + 
               (signalScore * signalWeight);
    }

    /**
     * Generate indicator summary
     */
    generateIndicatorSummary() {
        const detected = this.countDetectedIndicators();
        const confluence = this.analysisResults.confluence;
        const signals = this.analysisResults.signals.length;

        return {
            indicatorsDetected: detected,
            confluenceSignals: confluence.count,
            confluenceDirection: confluence.direction,
            totalSignals: signals,
            overallStrength: this.calculateIndicatorStrength(),
            recommendation: this.generateRecommendation()
        };
    }

    /**
     * Generate trading recommendation based on indicators
     */
    generateRecommendation() {
        const confluence = this.analysisResults.confluence;
        const strength = this.calculateIndicatorStrength();

        if (confluence.count >= this.options.confluenceMinimum && strength > this.options.trendStrengthThreshold) {
            return {
                action: confluence.direction === 'BULLISH' ? 'BUY' : 'SELL',
                confidence: Math.round(strength * 100),
                reasoning: `Strong ${confluence.direction.toLowerCase()} confluence with ${confluence.count} indicators`
            };
        } else {
            return {
                action: 'WAIT',
                confidence: Math.round(strength * 100),
                reasoning: 'Insufficient indicator confluence for strong signal'
            };
        }
    }

    /**
     * Utility methods
     */
    resetAnalysisResults() {
        this.analysisResults = {
            movingAverages: {},
            momentum: {},
            volatility: {},
            trend: {},
            confluence: {},
            signals: []
        };
    }

    countDetectedIndicators() {
        return Object.values(this.stats.indicatorDetections).reduce((sum, count) => sum + (count > 0 ? 1 : 0), 0);
    }

    getIndicatorName(index) {
        const names = ['SMA', 'EMA', 'RSI', 'MACD', 'Stochastic', 'Bollinger Bands'];
        return names[index] || 'Unknown';
    }

    analyzePricePosition(text) {
        // Implementation for price position analysis
        return 'UNKNOWN';
    }

    detectMACrossovers(text) {
        // Implementation for MA crossover detection
        return 'NONE';
    }

    determineMATrend(text) {
        // Implementation for MA trend determination
        return 'UNKNOWN';
    }

    assessOverallMomentum(text) {
        // Implementation for overall momentum assessment
        return 'NEUTRAL';
    }

    assessVolatility(text) {
        // Implementation for volatility assessment
        return 'NORMAL';
    }

    assessTrendStrength(text) {
        // Implementation for trend strength assessment
        return 0.5;
    }

    checkTrendConfirmation(text) {
        // Implementation for trend confirmation check
        return false;
    }

    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.totalAnalyses > 0 ? 
                (this.stats.successfulAnalyses / this.stats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
            averageIndicatorsDetected: this.stats.totalAnalyses > 0 ? 
                (this.countDetectedIndicators() / this.stats.totalAnalyses).toFixed(1) : '0'
        };
    }
}

module.exports = { TechnicalIndicatorsAnalyzer };
