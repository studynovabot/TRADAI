/**
 * AI Indicator & Volume-Based Prediction Engine
 * 
 * Implements technical analysis and AI prediction using:
 * - RSI, MACD, Bollinger Bands analysis
 * - Volume strength analysis
 * - Support/Resistance detection
 * - XGBoost-like lightweight ML model
 * - Multi-indicator confluence scoring
 */

// Use technicalindicators library
const TechnicalIndicators = require('technicalindicators');
const fs = require('fs-extra');
const path = require('path');

class AIIndicatorEngine {
    constructor(config = {}) {
        this.config = {
            rsiPeriod: 14,
            macdFast: 12,
            macdSlow: 26,
            macdSignal: 9,
            bbPeriod: 20,
            bbStdDev: 2,
            volumePeriod: 20,
            supportResistancePeriod: 50,
            minConfidence: 0.6,
            ...config
        };

        // Technical indicator thresholds
        this.thresholds = {
            rsi: {
                oversold: 30,
                overbought: 70,
                extreme_oversold: 20,
                extreme_overbought: 80
            },
            macd: {
                bullish_crossover: 0.0001,
                bearish_crossover: -0.0001
            },
            bollinger: {
                upper_touch: 0.95, // 95% of distance to upper band
                lower_touch: 0.05  // 5% of distance to lower band
            },
            volume: {
                high_volume_multiplier: 1.5,
                low_volume_multiplier: 0.5
            }
        };

        // ML model weights (simplified XGBoost-like approach)
        this.modelWeights = {
            rsi_signal: 0.25,
            macd_signal: 0.20,
            bollinger_signal: 0.20,
            volume_signal: 0.15,
            support_resistance: 0.10,
            momentum: 0.10
        };

        this.predictionHistory = [];
        this.maxHistorySize = 1000;

        console.log('🧠 AI Indicator Engine initialized');
        this.isInitialized = false;
    }

    /**
     * Initialize the AI Indicator Engine
     */
    async initialize() {
        try {
            console.log('🚀 Initializing AI Indicator Engine...');
            
            // Initialize technical indicators
            this.indicators = {
                RSI: TechnicalIndicators.RSI,
                MACD: TechnicalIndicators.MACD,
                BollingerBands: TechnicalIndicators.BollingerBands,
                SMA: TechnicalIndicators.SMA,
                EMA: TechnicalIndicators.EMA,
                Stochastic: TechnicalIndicators.Stochastic
            };
            
            // Initialize prediction model weights (simple ML-like approach)
            this.modelWeights = {
                rsi: 0.25,
                macd: 0.30,
                bollinger: 0.20,
                volume: 0.15,
                momentum: 0.10
            };
            
            this.isInitialized = true;
            console.log('✅ AI Indicator Engine initialized successfully');
            
            return { success: true, component: 'AIIndicatorEngine' };
            
        } catch (error) {
            console.error('❌ Failed to initialize AI Indicator Engine:', error);
            throw new Error(`AIIndicatorEngine initialization failed: ${error.message}`);
        }
    }

    /**
     * Analyze market data and generate AI prediction
     */
    async analyzeMarketData(candles, indicators = null) {
        try {
            console.log('🔍 Starting AI indicator analysis...');

            if (!candles || candles.length < 50) {
                throw new Error('Insufficient candle data for analysis');
            }

            // Calculate technical indicators if not provided
            const calculatedIndicators = indicators || await this.calculateAllIndicators(candles);

            // Generate individual signals
            const rsiSignal = this.analyzeRSI(calculatedIndicators.rsi, candles);
            const macdSignal = this.analyzeMACD(calculatedIndicators.macd, candles);
            const bollingerSignal = this.analyzeBollingerBands(calculatedIndicators.bollingerBands, candles);
            const volumeSignal = this.analyzeVolume(candles);
            const supportResistanceSignal = this.analyzeSupportResistance(candles);
            const momentumSignal = this.analyzeMomentum(candles);

            // Combine signals using ML-like approach
            const prediction = this.combineSignalsWithML({
                rsi: rsiSignal,
                macd: macdSignal,
                bollinger: bollingerSignal,
                volume: volumeSignal,
                supportResistance: supportResistanceSignal,
                momentum: momentumSignal
            });

            // Store prediction for learning
            this.storePredictionForLearning(prediction, candles);

            console.log('✅ AI indicator analysis completed');
            return prediction;

        } catch (error) {
            console.error(`❌ AI indicator analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze indicators (wrapper for analyzeMarketData)
     */
    async analyzeIndicators(historicalData, options = {}) {
        try {
            console.log('📈 Analyzing technical indicators...');
            
            const { timeframe = '5m', quickMode = false } = options;
            
            if (!historicalData || historicalData.length < 30) {
                return {
                    confidence: 0,
                    direction: 'NO_SIGNAL',
                    summary: 'Insufficient data for indicator analysis'
                };
            }
            
            // Use the most recent data for analysis
            const recentData = historicalData.slice(-100); // Last 100 candles
            
            // Analyze market data using existing method
            const analysis = await this.analyzeMarketData(recentData);
            
            // Convert to expected format
            const indicatorAnalysis = {
                confidence: Math.round(analysis.confidence * 100),
                direction: analysis.signal,
                summary: {
                    rsi: analysis.indicators?.rsi || 'N/A',
                    macd: analysis.indicators?.macd || 'N/A',
                    bollinger: analysis.indicators?.bollinger || 'N/A',
                    volume: analysis.indicators?.volume || 'N/A',
                    momentum: analysis.indicators?.momentum || 'N/A'
                },
                reasoning: analysis.reasoning || [],
                strength: analysis.strength || 0
            };
            
            // Apply quick mode adjustments
            if (quickMode) {
                indicatorAnalysis.confidence = Math.max(0, indicatorAnalysis.confidence - 10);
            }
            
            console.log(`✅ Indicator analysis complete: ${indicatorAnalysis.direction} (${indicatorAnalysis.confidence}%)`);
            return indicatorAnalysis;
            
        } catch (error) {
            console.error('❌ Indicator analysis failed:', error);
            return {
                confidence: 0,
                direction: 'ERROR',
                summary: 'Indicator analysis failed',
                error: error.message
            };
        }
    }

    /**
     * Calculate all technical indicators
     */
    async calculateAllIndicators(candles) {
        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume || 1000);

        // RSI
        const rsi = TechnicalIndicators.RSI.calculate({
            values: closes,
            period: this.config.rsiPeriod
        });

        // MACD
        const macd = TechnicalIndicators.MACD.calculate({
            values: closes,
            fastPeriod: this.config.macdFast,
            slowPeriod: this.config.macdSlow,
            signalPeriod: this.config.macdSignal,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });

        // Bollinger Bands
        const bb = TechnicalIndicators.BollingerBands.calculate({
            period: this.config.bbPeriod,
            values: closes,
            stdDev: this.config.bbStdDev
        });

        // ATR for volatility
        const atr = TechnicalIndicators.ATR.calculate({
            period: 14,
            high: highs,
            low: lows,
            close: closes
        });

        // Stochastic
        const stoch = TechnicalIndicators.Stochastic.calculate({
            period: 14,
            kPeriod: 3,
            dPeriod: 3,
            high: highs,
            low: lows,
            close: closes
        });

        return {
            rsi: rsi,
            macd: macd,
            bollingerBands: bb,
            atr: atr,
            stochastic: stoch,
            volumes: volumes
        };
    }

    /**
     * Analyze RSI signals
     */
    analyzeRSI(rsiValues, candles) {
        if (!rsiValues || rsiValues.length === 0) {
            return { signal: 'NEUTRAL', strength: 0, confidence: 0, reasoning: 'No RSI data' };
        }

        const currentRSI = rsiValues[rsiValues.length - 1];
        const prevRSI = rsiValues[rsiValues.length - 2] || currentRSI;
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        const reasoning = [];

        // Oversold/Overbought analysis
        if (currentRSI <= this.thresholds.rsi.extreme_oversold) {
            signal = 'BUY';
            strength = 0.9;
            confidence = 0.8;
            reasoning.push(`RSI extremely oversold at ${currentRSI.toFixed(1)}`);
        } else if (currentRSI <= this.thresholds.rsi.oversold) {
            signal = 'BUY';
            strength = 0.7;
            confidence = 0.6;
            reasoning.push(`RSI oversold at ${currentRSI.toFixed(1)}`);
        } else if (currentRSI >= this.thresholds.rsi.extreme_overbought) {
            signal = 'SELL';
            strength = 0.9;
            confidence = 0.8;
            reasoning.push(`RSI extremely overbought at ${currentRSI.toFixed(1)}`);
        } else if (currentRSI >= this.thresholds.rsi.overbought) {
            signal = 'SELL';
            strength = 0.7;
            confidence = 0.6;
            reasoning.push(`RSI overbought at ${currentRSI.toFixed(1)}`);
        }

        // Divergence analysis
        const rsiTrend = currentRSI - prevRSI;
        const priceTrend = candles[candles.length - 1].close - candles[candles.length - 2].close;
        
        if (rsiTrend > 0 && priceTrend < 0 && currentRSI < 50) {
            // Bullish divergence
            signal = signal === 'NEUTRAL' ? 'BUY' : signal;
            strength = Math.max(strength, 0.6);
            confidence = Math.max(confidence, 0.5);
            reasoning.push('Bullish RSI divergence detected');
        } else if (rsiTrend < 0 && priceTrend > 0 && currentRSI > 50) {
            // Bearish divergence
            signal = signal === 'NEUTRAL' ? 'SELL' : signal;
            strength = Math.max(strength, 0.6);
            confidence = Math.max(confidence, 0.5);
            reasoning.push('Bearish RSI divergence detected');
        }

        return {
            signal,
            strength,
            confidence,
            value: currentRSI,
            reasoning: reasoning.join(', ') || `RSI at ${currentRSI.toFixed(1)}`
        };
    }

    /**
     * Analyze MACD signals
     */
    analyzeMACD(macdValues, candles) {
        if (!macdValues || macdValues.length < 2) {
            return { signal: 'NEUTRAL', strength: 0, confidence: 0, reasoning: 'No MACD data' };
        }

        const current = macdValues[macdValues.length - 1];
        const previous = macdValues[macdValues.length - 2];
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        const reasoning = [];

        // MACD line crossover
        if (previous.MACD <= previous.signal && current.MACD > current.signal) {
            signal = 'BUY';
            strength = 0.8;
            confidence = 0.7;
            reasoning.push('MACD bullish crossover');
        } else if (previous.MACD >= previous.signal && current.MACD < current.signal) {
            signal = 'SELL';
            strength = 0.8;
            confidence = 0.7;
            reasoning.push('MACD bearish crossover');
        }

        // Histogram analysis
        const histogramTrend = current.histogram - previous.histogram;
        if (histogramTrend > 0 && current.histogram > 0) {
            signal = signal === 'NEUTRAL' ? 'BUY' : signal;
            strength = Math.max(strength, 0.5);
            confidence = Math.max(confidence, 0.4);
            reasoning.push('MACD histogram increasing (bullish)');
        } else if (histogramTrend < 0 && current.histogram < 0) {
            signal = signal === 'NEUTRAL' ? 'SELL' : signal;
            strength = Math.max(strength, 0.5);
            confidence = Math.max(confidence, 0.4);
            reasoning.push('MACD histogram decreasing (bearish)');
        }

        // Zero line analysis
        if (current.MACD > 0 && previous.MACD <= 0) {
            signal = 'BUY';
            strength = Math.max(strength, 0.6);
            confidence = Math.max(confidence, 0.6);
            reasoning.push('MACD crossed above zero line');
        } else if (current.MACD < 0 && previous.MACD >= 0) {
            signal = 'SELL';
            strength = Math.max(strength, 0.6);
            confidence = Math.max(confidence, 0.6);
            reasoning.push('MACD crossed below zero line');
        }

        return {
            signal,
            strength,
            confidence,
            value: current,
            reasoning: reasoning.join(', ') || `MACD: ${current.MACD.toFixed(4)}`
        };
    }

    /**
     * Analyze Bollinger Bands signals
     */
    analyzeBollingerBands(bbValues, candles) {
        if (!bbValues || bbValues.length === 0) {
            return { signal: 'NEUTRAL', strength: 0, confidence: 0, reasoning: 'No Bollinger Bands data' };
        }

        const currentBB = bbValues[bbValues.length - 1];
        const currentPrice = candles[candles.length - 1].close;
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        const reasoning = [];

        // Calculate position within bands
        const bandWidth = currentBB.upper - currentBB.lower;
        const pricePosition = (currentPrice - currentBB.lower) / bandWidth;

        // Band touch analysis
        if (pricePosition <= this.thresholds.bollinger.lower_touch) {
            signal = 'BUY';
            strength = 0.7;
            confidence = 0.6;
            reasoning.push('Price near lower Bollinger Band');
        } else if (pricePosition >= this.thresholds.bollinger.upper_touch) {
            signal = 'SELL';
            strength = 0.7;
            confidence = 0.6;
            reasoning.push('Price near upper Bollinger Band');
        }

        // Band squeeze analysis
        const avgBandWidth = bbValues.slice(-10).reduce((sum, bb) => sum + (bb.upper - bb.lower), 0) / 10;
        const currentBandWidth = bandWidth;
        
        if (currentBandWidth < avgBandWidth * 0.8) {
            // Band squeeze - expect breakout
            strength = Math.max(strength, 0.4);
            confidence = Math.max(confidence, 0.3);
            reasoning.push('Bollinger Band squeeze detected');
        }

        // Middle line analysis
        if (currentPrice > currentBB.middle) {
            const aboveMiddleStrength = (currentPrice - currentBB.middle) / (currentBB.upper - currentBB.middle);
            if (signal === 'NEUTRAL' && aboveMiddleStrength > 0.5) {
                signal = 'BUY';
                strength = aboveMiddleStrength * 0.5;
                confidence = 0.4;
                reasoning.push('Price above Bollinger middle line');
            }
        } else {
            const belowMiddleStrength = (currentBB.middle - currentPrice) / (currentBB.middle - currentBB.lower);
            if (signal === 'NEUTRAL' && belowMiddleStrength > 0.5) {
                signal = 'SELL';
                strength = belowMiddleStrength * 0.5;
                confidence = 0.4;
                reasoning.push('Price below Bollinger middle line');
            }
        }

        return {
            signal,
            strength,
            confidence,
            value: currentBB,
            pricePosition,
            reasoning: reasoning.join(', ') || `Price at ${(pricePosition * 100).toFixed(1)}% of BB range`
        };
    }

    /**
     * Analyze volume signals
     */
    analyzeVolume(candles) {
        if (!candles || candles.length < this.config.volumePeriod) {
            return { signal: 'NEUTRAL', strength: 0, confidence: 0, reasoning: 'Insufficient volume data' };
        }

        const volumes = candles.map(c => c.volume || 1000);
        const currentVolume = volumes[volumes.length - 1];
        
        // Calculate average volume
        const avgVolume = volumes.slice(-this.config.volumePeriod).reduce((sum, v) => sum + v, 0) / this.config.volumePeriod;
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        const reasoning = [];

        const volumeRatio = currentVolume / avgVolume;
        
        // High volume analysis
        if (volumeRatio >= this.thresholds.volume.high_volume_multiplier) {
            const currentCandle = candles[candles.length - 1];
            const priceChange = currentCandle.close - currentCandle.open;
            
            if (priceChange > 0) {
                signal = 'BUY';
                strength = Math.min(volumeRatio / 2, 0.8);
                confidence = 0.6;
                reasoning.push(`High volume bullish candle (${volumeRatio.toFixed(1)}x avg)`);
            } else if (priceChange < 0) {
                signal = 'SELL';
                strength = Math.min(volumeRatio / 2, 0.8);
                confidence = 0.6;
                reasoning.push(`High volume bearish candle (${volumeRatio.toFixed(1)}x avg)`);
            }
        }

        // Volume trend analysis
        const recentVolumes = volumes.slice(-5);
        const volumeTrend = recentVolumes[recentVolumes.length - 1] - recentVolumes[0];
        
        if (volumeTrend > 0) {
            strength = Math.max(strength, 0.3);
            confidence = Math.max(confidence, 0.3);
            reasoning.push('Increasing volume trend');
        }

        return {
            signal,
            strength,
            confidence,
            value: currentVolume,
            ratio: volumeRatio,
            reasoning: reasoning.join(', ') || `Volume: ${volumeRatio.toFixed(1)}x average`
        };
    }

    /**
     * Analyze support and resistance levels
     */
    analyzeSupportResistance(candles) {
        if (!candles || candles.length < this.config.supportResistancePeriod) {
            return { signal: 'NEUTRAL', strength: 0, confidence: 0, reasoning: 'Insufficient data for S/R analysis' };
        }

        const currentPrice = candles[candles.length - 1].close;
        const recentCandles = candles.slice(-this.config.supportResistancePeriod);
        
        // Find support and resistance levels
        const highs = recentCandles.map(c => c.high);
        const lows = recentCandles.map(c => c.low);
        
        const resistance = Math.max(...highs);
        const support = Math.min(...lows);
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        const reasoning = [];

        // Distance to support/resistance
        const distanceToResistance = (resistance - currentPrice) / currentPrice;
        const distanceToSupport = (currentPrice - support) / currentPrice;
        
        // Near support level
        if (distanceToSupport < 0.002) { // Within 0.2%
            signal = 'BUY';
            strength = 0.6;
            confidence = 0.5;
            reasoning.push('Price near support level');
        }
        
        // Near resistance level
        if (distanceToResistance < 0.002) { // Within 0.2%
            signal = 'SELL';
            strength = 0.6;
            confidence = 0.5;
            reasoning.push('Price near resistance level');
        }

        // Breakout analysis
        if (currentPrice > resistance * 1.001) { // 0.1% above resistance
            signal = 'BUY';
            strength = 0.8;
            confidence = 0.7;
            reasoning.push('Resistance breakout');
        } else if (currentPrice < support * 0.999) { // 0.1% below support
            signal = 'SELL';
            strength = 0.8;
            confidence = 0.7;
            reasoning.push('Support breakdown');
        }

        return {
            signal,
            strength,
            confidence,
            support,
            resistance,
            distanceToSupport,
            distanceToResistance,
            reasoning: reasoning.join(', ') || `S/R: ${support.toFixed(5)} - ${resistance.toFixed(5)}`
        };
    }

    /**
     * Analyze momentum signals
     */
    analyzeMomentum(candles) {
        if (!candles || candles.length < 10) {
            return { signal: 'NEUTRAL', strength: 0, confidence: 0, reasoning: 'Insufficient data for momentum' };
        }

        const closes = candles.map(c => c.close);
        const currentPrice = closes[closes.length - 1];
        
        // Calculate momentum over different periods
        const momentum3 = (currentPrice - closes[closes.length - 4]) / closes[closes.length - 4];
        const momentum5 = (currentPrice - closes[closes.length - 6]) / closes[closes.length - 6];
        const momentum10 = (currentPrice - closes[closes.length - 11]) / closes[closes.length - 11];
        
        let signal = 'NEUTRAL';
        let strength = 0;
        let confidence = 0;
        const reasoning = [];

        // Momentum alignment
        const momentums = [momentum3, momentum5, momentum10];
        const bullishCount = momentums.filter(m => m > 0).length;
        const bearishCount = momentums.filter(m => m < 0).length;
        
        if (bullishCount >= 2) {
            signal = 'BUY';
            strength = bullishCount / 3 * 0.7;
            confidence = 0.5;
            reasoning.push(`Bullish momentum (${bullishCount}/3 periods)`);
        } else if (bearishCount >= 2) {
            signal = 'SELL';
            strength = bearishCount / 3 * 0.7;
            confidence = 0.5;
            reasoning.push(`Bearish momentum (${bearishCount}/3 periods)`);
        }

        // Strong momentum detection
        const avgMomentum = momentums.reduce((sum, m) => sum + Math.abs(m), 0) / momentums.length;
        if (avgMomentum > 0.005) { // 0.5% average momentum
            strength = Math.min(strength + 0.3, 1.0);
            confidence = Math.min(confidence + 0.2, 1.0);
            reasoning.push('Strong momentum detected');
        }

        return {
            signal,
            strength,
            confidence,
            momentum3: momentum3 * 100,
            momentum5: momentum5 * 100,
            momentum10: momentum10 * 100,
            reasoning: reasoning.join(', ') || `Momentum: ${(momentum5 * 100).toFixed(2)}%`
        };
    }

    /**
     * Combine signals using ML-like approach
     */
    combineSignalsWithML(signals) {
        console.log('🤖 Combining signals with ML approach...');

        // Convert signals to numerical values
        const signalValues = {};
        const confidenceValues = {};
        const strengthValues = {};
        
        Object.keys(signals).forEach(key => {
            const signal = signals[key];
            signalValues[key] = signal.signal === 'BUY' ? 1 : signal.signal === 'SELL' ? -1 : 0;
            confidenceValues[key] = signal.confidence || 0;
            strengthValues[key] = signal.strength || 0;
        });

        // Calculate weighted score
        let totalScore = 0;
        let totalWeight = 0;
        const reasoning = [];

        Object.keys(this.modelWeights).forEach(key => {
            if (signalValues[key] !== undefined) {
                const weight = this.modelWeights[key];
                const adjustedWeight = weight * confidenceValues[key] * strengthValues[key];
                const score = signalValues[key] * adjustedWeight;
                
                totalScore += score;
                totalWeight += adjustedWeight;
                
                if (Math.abs(score) > 0.01) {
                    reasoning.push(`${key}: ${signals[key].reasoning}`);
                }
            }
        });

        // Normalize score
        const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
        
        // Determine final prediction
        let direction = 'NO_SIGNAL';
        let confidence = 0;
        
        if (Math.abs(normalizedScore) > 0.1) {
            direction = normalizedScore > 0 ? 'UP' : 'DOWN';
            confidence = Math.min(Math.abs(normalizedScore) * 100, 95);
        }

        // Apply confidence threshold
        if (confidence < this.config.minConfidence * 100) {
            direction = 'NO_SIGNAL';
            confidence = 0;
        }

        return {
            direction,
            confidence,
            score: normalizedScore,
            signals,
            reasoning: reasoning.slice(0, 5), // Top 5 reasons
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Store prediction for learning
     */
    storePredictionForLearning(prediction, candles) {
        this.predictionHistory.push({
            prediction,
            marketData: {
                price: candles[candles.length - 1].close,
                timestamp: candles[candles.length - 1].timestamp
            },
            timestamp: Date.now()
        });

        // Limit history size
        if (this.predictionHistory.length > this.maxHistorySize) {
            this.predictionHistory = this.predictionHistory.slice(-this.maxHistorySize);
        }
    }

    /**
     * Get prediction statistics
     */
    getPredictionStats() {
        const total = this.predictionHistory.length;
        const buySignals = this.predictionHistory.filter(p => p.prediction.direction === 'UP').length;
        const sellSignals = this.predictionHistory.filter(p => p.prediction.direction === 'DOWN').length;
        const noSignals = this.predictionHistory.filter(p => p.prediction.direction === 'NO_SIGNAL').length;
        
        const avgConfidence = this.predictionHistory
            .filter(p => p.prediction.confidence > 0)
            .reduce((sum, p) => sum + p.prediction.confidence, 0) / 
            this.predictionHistory.filter(p => p.prediction.confidence > 0).length || 0;

        return {
            totalPredictions: total,
            buySignals,
            sellSignals,
            noSignals,
            avgConfidence: avgConfidence.toFixed(1),
            signalRate: ((buySignals + sellSignals) / total * 100).toFixed(1)
        };
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            status: 'healthy',
            modelWeights: this.modelWeights,
            thresholds: this.thresholds,
            predictionHistory: this.predictionHistory.length,
            stats: this.getPredictionStats()
        };
    }
}

module.exports = { AIIndicatorEngine };