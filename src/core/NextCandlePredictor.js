/**
 * Next Candle Predictor
 * 
 * This module specializes in predicting the next candle with high accuracy by:
 * 1. Analyzing recent price action and momentum
 * 2. Detecting short-term patterns and reversals
 * 3. Calculating probability distributions for price movements
 * 4. Combining multiple prediction models for improved accuracy
 */

const { createLogger } = require('../utils/logger');
const fs = require('fs-extra');
const path = require('path');

class NextCandlePredictor {
    constructor(config = {}) {
        this.logger = createLogger('NextCandlePredictor');
        
        // Configuration with defaults
        this.config = {
            modelWeights: {
                momentum: 0.25,
                pattern: 0.25,
                indicator: 0.30,
                volatility: 0.20
            },
            minConfidenceThreshold: 70,
            lookbackPeriods: {
                short: 5,
                medium: 14,
                long: 30
            },
            ...config
        };
        
        this.logger.info('Next Candle Predictor initialized');
    }
    
    /**
     * Predict the next candle based on market data
     * @param {Object} marketData - Market data with candles and indicators
     * @param {Object} options - Prediction options
     * @returns {Promise<Object>} - Next candle prediction
     */
    async predictNextCandle(marketData, options = {}) {
        try {
            this.logger.info('Predicting next candle...');
            
            const {
                pair = marketData.pair,
                timeframe = marketData.timeframe,
                includeProbabilityDistribution = true,
                includeConfidenceIntervals = true,
                detailedAnalysis = true
            } = options;
            
            // Extract candles and indicators
            const candles = marketData.candles || [];
            const indicators = marketData.indicators || {};
            
            if (candles.length < 10) {
                throw new Error('Insufficient candle data for prediction');
            }
            
            // Get the most recent candle
            const lastCandle = candles[candles.length - 1];
            
            // 1. Momentum-based prediction
            const momentumPrediction = this.predictWithMomentum(candles);
            
            // 2. Pattern-based prediction
            const patternPrediction = this.predictWithPatterns(candles);
            
            // 3. Indicator-based prediction
            const indicatorPrediction = this.predictWithIndicators(candles, indicators);
            
            // 4. Volatility-based prediction
            const volatilityPrediction = this.predictWithVolatility(candles);
            
            // 5. Combine predictions
            const combinedPrediction = this.combinePredictions([
                { prediction: momentumPrediction, weight: this.config.modelWeights.momentum },
                { prediction: patternPrediction, weight: this.config.modelWeights.pattern },
                { prediction: indicatorPrediction, weight: this.config.modelWeights.indicator },
                { prediction: volatilityPrediction, weight: this.config.modelWeights.volatility }
            ]);
            
            // 6. Calculate probability distribution
            const probabilityDistribution = includeProbabilityDistribution ? 
                this.calculateProbabilityDistribution(candles, combinedPrediction) : null;
            
            // 7. Calculate confidence intervals
            const confidenceIntervals = includeConfidenceIntervals ?
                this.calculateConfidenceIntervals(candles, combinedPrediction) : null;
            
            // 8. Generate detailed analysis
            const analysis = detailedAnalysis ?
                this.generateDetailedAnalysis(candles, indicators, combinedPrediction) : null;
            
            // 9. Create next candle prediction
            const nextCandle = this.generateNextCandle(lastCandle, combinedPrediction);
            
            // 10. Create prediction result
            const prediction = {
                pair,
                timeframe,
                currentCandle: lastCandle,
                nextCandle,
                direction: combinedPrediction.direction,
                confidence: combinedPrediction.confidence,
                expectedMove: combinedPrediction.expectedMove,
                probabilityDistribution,
                confidenceIntervals,
                analysis,
                timestamp: Date.now(),
                modelContributions: {
                    momentum: momentumPrediction,
                    pattern: patternPrediction,
                    indicator: indicatorPrediction,
                    volatility: volatilityPrediction
                }
            };
            
            this.logger.info(`Next candle prediction: ${prediction.direction} with ${prediction.confidence}% confidence`);
            return prediction;
        } catch (error) {
            this.logger.error(`Failed to predict next candle: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Predict next candle using momentum analysis
     * @param {Array} candles - Candlestick data
     * @returns {Object} - Momentum prediction
     */
    predictWithMomentum(candles) {
        this.logger.info('Predicting with momentum analysis...');
        
        // Get recent candles
        const recentCandles = candles.slice(-this.config.lookbackPeriods.short);
        
        // Calculate price changes
        const priceChanges = [];
        for (let i = 1; i < recentCandles.length; i++) {
            priceChanges.push(recentCandles[i].close - recentCandles[i-1].close);
        }
        
        // Calculate momentum
        const momentum = priceChanges.reduce((sum, change) => sum + change, 0);
        
        // Calculate average price change
        const avgPriceChange = momentum / priceChanges.length;
        
        // Calculate momentum strength
        const momentumStrength = Math.abs(avgPriceChange) / recentCandles[recentCandles.length-1].close * 10000;
        
        // Determine direction
        const direction = momentum > 0 ? 'UP' : momentum < 0 ? 'DOWN' : 'NEUTRAL';
        
        // Calculate confidence based on momentum strength and consistency
        const changeConsistency = this.calculateConsistency(priceChanges);
        const confidence = Math.min(95, Math.round(50 + momentumStrength * 2 + changeConsistency * 20));
        
        return {
            direction,
            confidence,
            expectedMove: avgPriceChange,
            momentum,
            momentumStrength,
            changeConsistency
        };
    }
    
    /**
     * Calculate consistency of price changes
     * @param {Array} changes - Price changes
     * @returns {number} - Consistency score (0-1)
     */
    calculateConsistency(changes) {
        if (changes.length === 0) return 0;
        
        const positiveChanges = changes.filter(change => change > 0).length;
        const negativeChanges = changes.filter(change => change < 0).length;
        
        const dominantDirection = Math.max(positiveChanges, negativeChanges);
        return dominantDirection / changes.length;
    }
    
    /**
     * Predict next candle using pattern analysis
     * @param {Array} candles - Candlestick data
     * @returns {Object} - Pattern prediction
     */
    predictWithPatterns(candles) {
        this.logger.info('Predicting with pattern analysis...');
        
        // Get recent candles
        const recentCandles = candles.slice(-this.config.lookbackPeriods.medium);
        
        // Detect candlestick patterns
        const patterns = this.detectCandlestickPatterns(recentCandles);
        
        // If no patterns detected, return neutral prediction
        if (patterns.length === 0) {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                expectedMove: 0,
                patterns: []
            };
        }
        
        // Calculate weighted direction based on pattern strength
        let weightedDirection = 0;
        let totalWeight = 0;
        let expectedMove = 0;
        
        for (const pattern of patterns) {
            const directionValue = pattern.direction === 'UP' ? 1 : pattern.direction === 'DOWN' ? -1 : 0;
            weightedDirection += directionValue * pattern.strength;
            expectedMove += pattern.expectedMove * pattern.strength;
            totalWeight += pattern.strength;
        }
        
        // Normalize
        weightedDirection = totalWeight > 0 ? weightedDirection / totalWeight : 0;
        expectedMove = totalWeight > 0 ? expectedMove / totalWeight : 0;
        
        // Determine direction
        const direction = weightedDirection > 0.2 ? 'UP' : weightedDirection < -0.2 ? 'DOWN' : 'NEUTRAL';
        
        // Calculate confidence based on pattern strength and recency
        const patternStrength = Math.min(1, totalWeight / patterns.length);
        const confidence = Math.min(95, Math.round(50 + Math.abs(weightedDirection) * 50 + patternStrength * 20));
        
        return {
            direction,
            confidence,
            expectedMove,
            patterns,
            patternStrength
        };
    }
    
    /**
     * Detect candlestick patterns
     * @param {Array} candles - Candlestick data
     * @returns {Array} - Detected patterns
     */
    detectCandlestickPatterns(candles) {
        const patterns = [];
        
        // Skip if not enough candles
        if (candles.length < 3) return patterns;
        
        // Get the last few candles
        const c1 = candles[candles.length - 1]; // Most recent
        const c2 = candles[candles.length - 2];
        const c3 = candles[candles.length - 3];
        
        // Calculate average true range for pattern significance
        const atr = this.calculateATR(candles, 14);
        
        // Doji
        if (Math.abs(c1.open - c1.close) < atr * 0.1) {
            patterns.push({
                name: 'Doji',
                direction: 'NEUTRAL',
                strength: 0.5,
                expectedMove: 0
            });
        }
        
        // Hammer (bullish)
        if (c1.close > c1.open && 
            (c1.high - c1.close) < (c1.open - c1.low) * 0.3 && 
            (c1.open - c1.low) > (c1.high - c1.low) * 0.6) {
            patterns.push({
                name: 'Hammer',
                direction: 'UP',
                strength: 0.7,
                expectedMove: atr * 0.8
            });
        }
        
        // Shooting Star (bearish)
        if (c1.close < c1.open && 
            (c1.open - c1.low) < (c1.high - c1.open) * 0.3 && 
            (c1.high - c1.open) > (c1.high - c1.low) * 0.6) {
            patterns.push({
                name: 'Shooting Star',
                direction: 'DOWN',
                strength: 0.7,
                expectedMove: -atr * 0.8
            });
        }
        
        // Bullish Engulfing
        if (c1.close > c1.open && c2.close < c2.open && 
            c1.close > c2.open && c1.open < c2.close) {
            patterns.push({
                name: 'Bullish Engulfing',
                direction: 'UP',
                strength: 0.8,
                expectedMove: atr * 1.2
            });
        }
        
        // Bearish Engulfing
        if (c1.close < c1.open && c2.close > c2.open && 
            c1.close < c2.open && c1.open > c2.close) {
            patterns.push({
                name: 'Bearish Engulfing',
                direction: 'DOWN',
                strength: 0.8,
                expectedMove: -atr * 1.2
            });
        }
        
        // Morning Star (bullish)
        if (c3.close < c3.open && // First candle bearish
            Math.abs(c2.open - c2.close) < atr * 0.3 && // Second candle small
            c1.close > c1.open && // Third candle bullish
            c1.close > (c3.open + c3.close) / 2) { // Third candle closes above midpoint of first
            patterns.push({
                name: 'Morning Star',
                direction: 'UP',
                strength: 0.9,
                expectedMove: atr * 1.5
            });
        }
        
        // Evening Star (bearish)
        if (c3.close > c3.open && // First candle bullish
            Math.abs(c2.open - c2.close) < atr * 0.3 && // Second candle small
            c1.close < c1.open && // Third candle bearish
            c1.close < (c3.open + c3.close) / 2) { // Third candle closes below midpoint of first
            patterns.push({
                name: 'Evening Star',
                direction: 'DOWN',
                strength: 0.9,
                expectedMove: -atr * 1.5
            });
        }
        
        // Three White Soldiers (bullish)
        if (candles.length >= 5 &&
            candles[candles.length - 3].close > candles[candles.length - 3].open &&
            candles[candles.length - 2].close > candles[candles.length - 2].open &&
            candles[candles.length - 1].close > candles[candles.length - 1].open &&
            candles[candles.length - 3].close < candles[candles.length - 2].open &&
            candles[candles.length - 2].close < candles[candles.length - 1].open) {
            patterns.push({
                name: 'Three White Soldiers',
                direction: 'UP',
                strength: 0.95,
                expectedMove: atr * 2.0
            });
        }
        
        // Three Black Crows (bearish)
        if (candles.length >= 5 &&
            candles[candles.length - 3].close < candles[candles.length - 3].open &&
            candles[candles.length - 2].close < candles[candles.length - 2].open &&
            candles[candles.length - 1].close < candles[candles.length - 1].open &&
            candles[candles.length - 3].close > candles[candles.length - 2].open &&
            candles[candles.length - 2].close > candles[candles.length - 1].open) {
            patterns.push({
                name: 'Three Black Crows',
                direction: 'DOWN',
                strength: 0.95,
                expectedMove: -atr * 2.0
            });
        }
        
        return patterns;
    }
    
    /**
     * Calculate Average True Range (ATR)
     * @param {Array} candles - Candlestick data
     * @param {number} period - ATR period
     * @returns {number} - ATR value
     */
    calculateATR(candles, period = 14) {
        if (candles.length < period + 1) {
            // Calculate simple average range if not enough data
            const ranges = candles.map(candle => candle.high - candle.low);
            return ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
        }
        
        // Calculate true ranges
        const trueRanges = [];
        for (let i = 1; i < candles.length; i++) {
            const current = candles[i];
            const previous = candles[i - 1];
            
            const tr1 = current.high - current.low;
            const tr2 = Math.abs(current.high - previous.close);
            const tr3 = Math.abs(current.low - previous.close);
            
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        // Calculate ATR
        const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
        return atr;
    }
    
    /**
     * Predict next candle using technical indicators
     * @param {Array} candles - Candlestick data
     * @param {Object} indicators - Technical indicators
     * @returns {Object} - Indicator prediction
     */
    predictWithIndicators(candles, indicators) {
        this.logger.info('Predicting with technical indicators...');
        
        // Default prediction if no indicators available
        if (!indicators || Object.keys(indicators).length === 0) {
            // Calculate basic indicators
            const calculatedIndicators = {
                rsi: this.calculateRSI(candles, 14),
                macd: this.calculateMACD(candles),
                bollinger: this.calculateBollingerBands(candles, 20, 2)
            };
            
            indicators = calculatedIndicators;
        }
        
        // Analyze RSI
        const rsiSignal = this.analyzeRSI(indicators.rsi);
        
        // Analyze MACD
        const macdSignal = this.analyzeMACD(indicators.macd);
        
        // Analyze Bollinger Bands
        const bollingerSignal = this.analyzeBollingerBands(indicators.bollinger, candles);
        
        // Combine indicator signals
        const signals = [rsiSignal, macdSignal, bollingerSignal].filter(signal => signal.direction !== 'NEUTRAL');
        
        if (signals.length === 0) {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                expectedMove: 0,
                indicators: { rsi: rsiSignal, macd: macdSignal, bollinger: bollingerSignal }
            };
        }
        
        // Calculate weighted direction
        let weightedDirection = 0;
        let totalWeight = 0;
        let expectedMove = 0;
        
        for (const signal of signals) {
            const directionValue = signal.direction === 'UP' ? 1 : signal.direction === 'DOWN' ? -1 : 0;
            const weight = signal.confidence / 100;
            
            weightedDirection += directionValue * weight;
            expectedMove += signal.expectedMove * weight;
            totalWeight += weight;
        }
        
        // Normalize
        weightedDirection = totalWeight > 0 ? weightedDirection / totalWeight : 0;
        expectedMove = totalWeight > 0 ? expectedMove / totalWeight : 0;
        
        // Determine direction
        const direction = weightedDirection > 0.2 ? 'UP' : weightedDirection < -0.2 ? 'DOWN' : 'NEUTRAL';
        
        // Calculate confidence
        const confidence = Math.min(95, Math.round(50 + Math.abs(weightedDirection) * 50));
        
        return {
            direction,
            confidence,
            expectedMove,
            indicators: { rsi: rsiSignal, macd: macdSignal, bollinger: bollingerSignal }
        };
    }
    
    /**
     * Calculate RSI
     * @param {Array} candles - Candlestick data
     * @param {number} period - RSI period
     * @returns {Array} - RSI values
     */
    calculateRSI(candles, period = 14) {
        if (candles.length < period + 1) {
            return [];
        }
        
        const closes = candles.map(candle => candle.close);
        const rsi = [];
        
        // Calculate price changes
        const changes = [];
        for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
        }
        
        // Calculate RSI
        for (let i = period; i < changes.length + 1; i++) {
            const periodChanges = changes.slice(i - period, i);
            
            // Calculate gains and losses
            const gains = periodChanges.filter(change => change > 0);
            const losses = periodChanges.filter(change => change < 0).map(change => Math.abs(change));
            
            // Calculate average gain and loss
            const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0;
            const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / period : 0;
            
            // Calculate RS and RSI
            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }
        
        return rsi;
    }
    
    /**
     * Calculate MACD
     * @param {Array} candles - Candlestick data
     * @returns {Object} - MACD values
     */
    calculateMACD(candles) {
        if (candles.length < 26) {
            return { macd: [], signal: [], histogram: [] };
        }
        
        const closes = candles.map(candle => candle.close);
        
        // Calculate EMAs
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);
        
        // Calculate MACD line
        const macdLine = [];
        for (let i = 0; i < ema12.length && i < ema26.length; i++) {
            macdLine.push(ema12[i] - ema26[i]);
        }
        
        // Calculate signal line (9-day EMA of MACD line)
        const signalLine = this.calculateEMA(macdLine, 9);
        
        // Calculate histogram
        const histogram = [];
        for (let i = 0; i < macdLine.length && i < signalLine.length; i++) {
            histogram.push(macdLine[i] - signalLine[i]);
        }
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram
        };
    }
    
    /**
     * Calculate EMA
     * @param {Array} data - Price data
     * @param {number} period - EMA period
     * @returns {Array} - EMA values
     */
    calculateEMA(data, period) {
        if (data.length < period) {
            return [];
        }
        
        const k = 2 / (period + 1);
        const ema = [];
        
        // Initialize EMA with SMA
        let sma = 0;
        for (let i = 0; i < period; i++) {
            sma += data[i];
        }
        sma /= period;
        ema.push(sma);
        
        // Calculate EMA
        for (let i = period; i < data.length; i++) {
            ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
        }
        
        return ema;
    }
    
    /**
     * Calculate Bollinger Bands
     * @param {Array} candles - Candlestick data
     * @param {number} period - Bollinger Bands period
     * @param {number} stdDev - Standard deviation multiplier
     * @returns {Object} - Bollinger Bands values
     */
    calculateBollingerBands(candles, period = 20, stdDev = 2) {
        if (candles.length < period) {
            return { upper: [], middle: [], lower: [] };
        }
        
        const closes = candles.map(candle => candle.close);
        const upper = [];
        const middle = [];
        const lower = [];
        
        // Calculate Bollinger Bands
        for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            
            // Calculate SMA
            const sma = slice.reduce((sum, price) => sum + price, 0) / period;
            
            // Calculate standard deviation
            const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
            const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
            const sd = Math.sqrt(variance);
            
            // Calculate bands
            middle.push(sma);
            upper.push(sma + stdDev * sd);
            lower.push(sma - stdDev * sd);
        }
        
        return {
            upper,
            middle,
            lower
        };
    }
    
    /**
     * Analyze RSI
     * @param {Array} rsi - RSI values
     * @returns {Object} - RSI signal
     */
    analyzeRSI(rsi) {
        if (!rsi || rsi.length === 0) {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                expectedMove: 0,
                value: null
            };
        }
        
        const currentRSI = rsi[rsi.length - 1];
        let direction = 'NEUTRAL';
        let confidence = 50;
        let expectedMove = 0;
        
        // Oversold condition (RSI < 30)
        if (currentRSI < 30) {
            direction = 'UP';
            confidence = 70 + (30 - currentRSI); // Higher confidence the more oversold
            expectedMove = 0.0010; // Estimated price move
        }
        // Overbought condition (RSI > 70)
        else if (currentRSI > 70) {
            direction = 'DOWN';
            confidence = 70 + (currentRSI - 70); // Higher confidence the more overbought
            expectedMove = -0.0010; // Estimated price move
        }
        // Neutral zone with slight bias
        else {
            if (currentRSI < 45) {
                direction = 'UP';
                confidence = 50 + (45 - currentRSI);
                expectedMove = 0.0005;
            } else if (currentRSI > 55) {
                direction = 'DOWN';
                confidence = 50 + (currentRSI - 55);
                expectedMove = -0.0005;
            } else {
                direction = 'NEUTRAL';
                confidence = 50;
                expectedMove = 0;
            }
        }
        
        // Cap confidence at 95
        confidence = Math.min(95, confidence);
        
        return {
            direction,
            confidence,
            expectedMove,
            value: currentRSI
        };
    }
    
    /**
     * Analyze MACD
     * @param {Object} macd - MACD values
     * @returns {Object} - MACD signal
     */
    analyzeMACD(macd) {
        if (!macd || !macd.macd || !macd.signal || !macd.histogram || 
            macd.macd.length === 0 || macd.signal.length === 0 || macd.histogram.length === 0) {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                expectedMove: 0,
                value: null
            };
        }
        
        const currentMACD = macd.macd[macd.macd.length - 1];
        const currentSignal = macd.signal[macd.signal.length - 1];
        const currentHistogram = macd.histogram[macd.histogram.length - 1];
        const previousHistogram = macd.histogram.length > 1 ? macd.histogram[macd.histogram.length - 2] : 0;
        
        let direction = 'NEUTRAL';
        let confidence = 50;
        let expectedMove = 0;
        
        // MACD line crosses above signal line (bullish)
        if (currentMACD > currentSignal && currentHistogram > 0 && previousHistogram <= 0) {
            direction = 'UP';
            confidence = 80;
            expectedMove = 0.0015;
        }
        // MACD line crosses below signal line (bearish)
        else if (currentMACD < currentSignal && currentHistogram < 0 && previousHistogram >= 0) {
            direction = 'DOWN';
            confidence = 80;
            expectedMove = -0.0015;
        }
        // MACD line above signal line (bullish)
        else if (currentMACD > currentSignal) {
            direction = 'UP';
            confidence = 60 + Math.min(20, Math.abs(currentHistogram) * 1000);
            expectedMove = 0.0010;
        }
        // MACD line below signal line (bearish)
        else if (currentMACD < currentSignal) {
            direction = 'DOWN';
            confidence = 60 + Math.min(20, Math.abs(currentHistogram) * 1000);
            expectedMove = -0.0010;
        }
        
        // Cap confidence at 95
        confidence = Math.min(95, confidence);
        
        return {
            direction,
            confidence,
            expectedMove,
            value: {
                macd: currentMACD,
                signal: currentSignal,
                histogram: currentHistogram
            }
        };
    }
    
    /**
     * Analyze Bollinger Bands
     * @param {Object} bollinger - Bollinger Bands values
     * @param {Array} candles - Candlestick data
     * @returns {Object} - Bollinger Bands signal
     */
    analyzeBollingerBands(bollinger, candles) {
        if (!bollinger || !bollinger.upper || !bollinger.middle || !bollinger.lower || 
            bollinger.upper.length === 0 || bollinger.middle.length === 0 || bollinger.lower.length === 0 ||
            !candles || candles.length === 0) {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                expectedMove: 0,
                value: null
            };
        }
        
        const currentUpper = bollinger.upper[bollinger.upper.length - 1];
        const currentMiddle = bollinger.middle[bollinger.middle.length - 1];
        const currentLower = bollinger.lower[bollinger.lower.length - 1];
        const currentClose = candles[candles.length - 1].close;
        
        let direction = 'NEUTRAL';
        let confidence = 50;
        let expectedMove = 0;
        
        // Price near or below lower band (potential buy)
        if (currentClose <= currentLower * 1.01) {
            direction = 'UP';
            confidence = 70 + Math.min(25, (currentLower - currentClose) / currentLower * 1000);
            expectedMove = 0.0012;
        }
        // Price near or above upper band (potential sell)
        else if (currentClose >= currentUpper * 0.99) {
            direction = 'DOWN';
            confidence = 70 + Math.min(25, (currentClose - currentUpper) / currentUpper * 1000);
            expectedMove = -0.0012;
        }
        // Price closer to upper band than middle band
        else if (currentClose > currentMiddle && currentClose < currentUpper) {
            direction = 'DOWN';
            confidence = 50 + (currentClose - currentMiddle) / (currentUpper - currentMiddle) * 20;
            expectedMove = -0.0008;
        }
        // Price closer to lower band than middle band
        else if (currentClose < currentMiddle && currentClose > currentLower) {
            direction = 'UP';
            confidence = 50 + (currentMiddle - currentClose) / (currentMiddle - currentLower) * 20;
            expectedMove = 0.0008;
        }
        
        // Cap confidence at 95
        confidence = Math.min(95, confidence);
        
        return {
            direction,
            confidence,
            expectedMove,
            value: {
                upper: currentUpper,
                middle: currentMiddle,
                lower: currentLower,
                price: currentClose
            }
        };
    }
    
    /**
     * Predict next candle using volatility analysis
     * @param {Array} candles - Candlestick data
     * @returns {Object} - Volatility prediction
     */
    predictWithVolatility(candles) {
        this.logger.info('Predicting with volatility analysis...');
        
        // Calculate volatility
        const volatility = this.calculateVolatility(candles);
        
        // Get recent price action
        const recentCandles = candles.slice(-this.config.lookbackPeriods.short);
        const lastCandle = candles[candles.length - 1];
        
        // Calculate price range
        const priceRange = lastCandle.high - lastCandle.low;
        
        // Calculate body size ratio
        const bodySize = Math.abs(lastCandle.close - lastCandle.open);
        const bodySizeRatio = bodySize / priceRange;
        
        // Calculate upper and lower wick ratios
        const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
        const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
        
        const upperWickRatio = upperWick / priceRange;
        const lowerWickRatio = lowerWick / priceRange;
        
        // Determine direction based on volatility and price action
        let direction = 'NEUTRAL';
        let confidence = 50;
        let expectedMove = 0;
        
        // High volatility with strong directional move
        if (volatility.current > volatility.average * 1.5) {
            // Check if we're in a volatility expansion phase
            if (volatility.trend === 'increasing') {
                // Likely continuation in the same direction
                direction = lastCandle.close > lastCandle.open ? 'UP' : 'DOWN';
                confidence = 65;
                expectedMove = direction === 'UP' ? volatility.current * 0.8 : -volatility.current * 0.8;
            } else {
                // Likely reversal or consolidation
                direction = upperWickRatio > lowerWickRatio ? 'DOWN' : 'UP';
                confidence = 60;
                expectedMove = direction === 'UP' ? volatility.current * 0.5 : -volatility.current * 0.5;
            }
        }
        // Low volatility
        else if (volatility.current < volatility.average * 0.5) {
            // Likely preparing for a volatility expansion
            if (volatility.trend === 'decreasing' && volatility.consecutive > 3) {
                // Direction based on recent price action
                const recentClose = recentCandles[recentCandles.length - 1].close;
                const recentOpen = recentCandles[0].open;
                
                direction = recentClose > recentOpen ? 'UP' : 'DOWN';
                confidence = 55;
                expectedMove = direction === 'UP' ? volatility.average * 1.2 : -volatility.average * 1.2;
            } else {
                // Neutral with slight bias
                direction = 'NEUTRAL';
                confidence = 50;
                expectedMove = 0;
            }
        }
        // Normal volatility
        else {
            // Use wick ratios to determine potential direction
            if (upperWickRatio > lowerWickRatio * 2) {
                direction = 'DOWN';
                confidence = 55 + upperWickRatio * 20;
                expectedMove = -volatility.current * 0.7;
            } else if (lowerWickRatio > upperWickRatio * 2) {
                direction = 'UP';
                confidence = 55 + lowerWickRatio * 20;
                expectedMove = volatility.current * 0.7;
            } else {
                direction = 'NEUTRAL';
                confidence = 50;
                expectedMove = 0;
            }
        }
        
        // Cap confidence at 95
        confidence = Math.min(95, confidence);
        
        return {
            direction,
            confidence,
            expectedMove,
            volatility,
            bodySizeRatio,
            upperWickRatio,
            lowerWickRatio
        };
    }
    
    /**
     * Calculate volatility
     * @param {Array} candles - Candlestick data
     * @returns {Object} - Volatility analysis
     */
    calculateVolatility(candles) {
        if (candles.length < 10) {
            return {
                current: 0,
                average: 0,
                trend: 'unknown',
                consecutive: 0
            };
        }
        
        // Calculate true ranges
        const trueRanges = [];
        for (let i = 1; i < candles.length; i++) {
            const current = candles[i];
            const previous = candles[i - 1];
            
            const tr1 = current.high - current.low;
            const tr2 = Math.abs(current.high - previous.close);
            const tr3 = Math.abs(current.low - previous.close);
            
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        // Calculate current volatility (latest true range)
        const current = trueRanges[trueRanges.length - 1];
        
        // Calculate average volatility (10-period ATR)
        const average = trueRanges.slice(-10).reduce((sum, tr) => sum + tr, 0) / 10;
        
        // Determine volatility trend
        const recentTrueRanges = trueRanges.slice(-5);
        let trend = 'stable';
        let consecutive = 0;
        
        if (recentTrueRanges.length >= 3) {
            // Check if volatility is consistently increasing or decreasing
            let increasing = 0;
            let decreasing = 0;
            
            for (let i = 1; i < recentTrueRanges.length; i++) {
                if (recentTrueRanges[i] > recentTrueRanges[i - 1]) {
                    increasing++;
                } else if (recentTrueRanges[i] < recentTrueRanges[i - 1]) {
                    decreasing++;
                }
            }
            
            if (increasing > decreasing && increasing >= 2) {
                trend = 'increasing';
                consecutive = increasing;
            } else if (decreasing > increasing && decreasing >= 2) {
                trend = 'decreasing';
                consecutive = decreasing;
            }
        }
        
        return {
            current,
            average,
            trend,
            consecutive
        };
    }
    
    /**
     * Combine predictions from multiple models
     * @param {Array} predictions - Array of predictions with weights
     * @returns {Object} - Combined prediction
     */
    combinePredictions(predictions) {
        this.logger.info('Combining predictions from multiple models...');
        
        // Filter out invalid predictions
        const validPredictions = predictions.filter(p => p.prediction && p.prediction.direction);
        
        if (validPredictions.length === 0) {
            return {
                direction: 'NEUTRAL',
                confidence: 50,
                expectedMove: 0,
                reasoning: ['No valid predictions available']
            };
        }
        
        // Calculate weighted direction and expected move
        let weightedDirection = 0;
        let weightedExpectedMove = 0;
        let totalWeight = 0;
        
        for (const { prediction, weight } of validPredictions) {
            const directionValue = prediction.direction === 'UP' ? 1 : 
                                  prediction.direction === 'DOWN' ? -1 : 0;
            
            weightedDirection += directionValue * weight * (prediction.confidence / 100);
            weightedExpectedMove += prediction.expectedMove * weight;
            totalWeight += weight;
        }
        
        // Normalize
        weightedDirection = totalWeight > 0 ? weightedDirection / totalWeight : 0;
        weightedExpectedMove = totalWeight > 0 ? weightedExpectedMove / totalWeight : 0;
        
        // Determine direction
        const direction = weightedDirection > 0.2 ? 'UP' : weightedDirection < -0.2 ? 'DOWN' : 'NEUTRAL';
        
        // Calculate confidence
        const confidence = Math.min(95, Math.round(50 + Math.abs(weightedDirection) * 50));
        
        // Generate reasoning
        const reasoning = validPredictions.map(({ prediction, weight }) => 
            `${prediction.direction} (${prediction.confidence}% confidence, ${Math.round(weight * 100)}% weight)`
        );
        
        return {
            direction,
            confidence,
            expectedMove: weightedExpectedMove,
            reasoning
        };
    }
    
    /**
     * Calculate probability distribution for next candle
     * @param {Array} candles - Candlestick data
     * @param {Object} prediction - Combined prediction
     * @returns {Object} - Probability distribution
     */
    calculateProbabilityDistribution(candles, prediction) {
        this.logger.info('Calculating probability distribution...');
        
        const lastCandle = candles[candles.length - 1];
        const lastClose = lastCandle.close;
        
        // Calculate volatility
        const volatility = this.calculateVolatility(candles);
        
        // Calculate standard deviation
        const stdDev = volatility.average;
        
        // Calculate expected move
        const expectedMove = prediction.expectedMove;
        
        // Calculate probability distribution
        const distribution = {
            mean: lastClose + expectedMove,
            stdDev,
            probabilities: {
                strongUp: 0,
                moderateUp: 0,
                slightUp: 0,
                neutral: 0,
                slightDown: 0,
                moderateDown: 0,
                strongDown: 0
            },
            priceRanges: {
                strongUp: { min: lastClose + stdDev * 1.5, max: lastClose + stdDev * 3 },
                moderateUp: { min: lastClose + stdDev * 0.5, max: lastClose + stdDev * 1.5 },
                slightUp: { min: lastClose, max: lastClose + stdDev * 0.5 },
                neutral: { min: lastClose - stdDev * 0.5, max: lastClose + stdDev * 0.5 },
                slightDown: { min: lastClose - stdDev * 0.5, max: lastClose },
                moderateDown: { min: lastClose - stdDev * 1.5, max: lastClose - stdDev * 0.5 },
                strongDown: { min: lastClose - stdDev * 3, max: lastClose - stdDev * 1.5 }
            }
        };
        
        // Calculate probabilities based on prediction
        if (prediction.direction === 'UP') {
            distribution.probabilities = {
                strongUp: prediction.confidence > 85 ? 0.15 : 0.05,
                moderateUp: prediction.confidence > 70 ? 0.35 : 0.20,
                slightUp: prediction.confidence > 60 ? 0.30 : 0.25,
                neutral: 0.15,
                slightDown: 0.10,
                moderateDown: 0.03,
                strongDown: 0.02
            };
        } else if (prediction.direction === 'DOWN') {
            distribution.probabilities = {
                strongUp: 0.02,
                moderateUp: 0.03,
                slightUp: 0.10,
                neutral: 0.15,
                slightDown: prediction.confidence > 60 ? 0.30 : 0.25,
                moderateDown: prediction.confidence > 70 ? 0.35 : 0.20,
                strongDown: prediction.confidence > 85 ? 0.15 : 0.05
            };
        } else {
            distribution.probabilities = {
                strongUp: 0.05,
                moderateUp: 0.15,
                slightUp: 0.20,
                neutral: 0.20,
                slightDown: 0.20,
                moderateDown: 0.15,
                strongDown: 0.05
            };
        }
        
        return distribution;
    }
    
    /**
     * Calculate confidence intervals for next candle
     * @param {Array} candles - Candlestick data
     * @param {Object} prediction - Combined prediction
     * @returns {Object} - Confidence intervals
     */
    calculateConfidenceIntervals(candles, prediction) {
        this.logger.info('Calculating confidence intervals...');
        
        const lastCandle = candles[candles.length - 1];
        const lastClose = lastCandle.close;
        
        // Calculate volatility
        const volatility = this.calculateVolatility(candles);
        
        // Calculate standard deviation
        const stdDev = volatility.average;
        
        // Calculate expected move
        const expectedMove = prediction.expectedMove;
        
        // Calculate confidence intervals
        return {
            percent50: {
                lower: lastClose + expectedMove - stdDev * 0.67,
                upper: lastClose + expectedMove + stdDev * 0.67
            },
            percent75: {
                lower: lastClose + expectedMove - stdDev * 1.15,
                upper: lastClose + expectedMove + stdDev * 1.15
            },
            percent95: {
                lower: lastClose + expectedMove - stdDev * 1.96,
                upper: lastClose + expectedMove + stdDev * 1.96
            }
        };
    }
    
    /**
     * Generate detailed analysis
     * @param {Array} candles - Candlestick data
     * @param {Object} indicators - Technical indicators
     * @param {Object} prediction - Combined prediction
     * @returns {Object} - Detailed analysis
     */
    generateDetailedAnalysis(candles, indicators, prediction) {
        this.logger.info('Generating detailed analysis...');
        
        // Calculate key metrics
        const lastCandle = candles[candles.length - 1];
        const volatility = this.calculateVolatility(candles);
        
        // Generate analysis text
        const analysisText = [];
        
        // Add prediction summary
        analysisText.push(`Prediction: ${prediction.direction} with ${prediction.confidence}% confidence`);
        
        // Add reasoning
        if (prediction.reasoning && prediction.reasoning.length > 0) {
            analysisText.push('Reasoning:');
            prediction.reasoning.forEach(reason => analysisText.push(`- ${reason}`));
        }
        
        // Add volatility analysis
        analysisText.push(`Volatility: ${volatility.trend} (${Math.round(volatility.current / volatility.average * 100)}% of average)`);
        
        // Add indicator analysis
        if (indicators) {
            if (indicators.rsi && indicators.rsi.length > 0) {
                const currentRSI = indicators.rsi[indicators.rsi.length - 1];
                analysisText.push(`RSI: ${Math.round(currentRSI)} (${currentRSI < 30 ? 'Oversold' : currentRSI > 70 ? 'Overbought' : 'Neutral'})`);
            }
            
            if (indicators.macd && indicators.macd.macd && indicators.macd.macd.length > 0) {
                const currentMACD = indicators.macd.macd[indicators.macd.macd.length - 1];
                const currentSignal = indicators.macd.signal[indicators.macd.signal.length - 1];
                const currentHistogram = indicators.macd.histogram[indicators.macd.histogram.length - 1];
                
                analysisText.push(`MACD: ${currentMACD > currentSignal ? 'Bullish' : 'Bearish'} (Histogram: ${currentHistogram > 0 ? 'Positive' : 'Negative'})`);
            }
            
            if (indicators.bollinger && indicators.bollinger.upper && indicators.bollinger.upper.length > 0) {
                const currentUpper = indicators.bollinger.upper[indicators.bollinger.upper.length - 1];
                const currentMiddle = indicators.bollinger.middle[indicators.bollinger.middle.length - 1];
                const currentLower = indicators.bollinger.lower[indicators.bollinger.lower.length - 1];
                
                let bbPosition = 'Middle';
                if (lastCandle.close > currentUpper * 0.95) {
                    bbPosition = 'Upper Band';
                } else if (lastCandle.close < currentLower * 1.05) {
                    bbPosition = 'Lower Band';
                }
                
                analysisText.push(`Bollinger Bands: Price near ${bbPosition}`);
            }
        }
        
        // Add pattern analysis
        const patterns = this.detectCandlestickPatterns(candles);
        if (patterns.length > 0) {
            analysisText.push('Detected Patterns:');
            patterns.forEach(pattern => {
                analysisText.push(`- ${pattern.name}: ${pattern.direction} (${Math.round(pattern.strength * 100)}% strength)`);
            });
        }
        
        return {
            summary: prediction.direction === 'UP' ? 'Bullish' : prediction.direction === 'DOWN' ? 'Bearish' : 'Neutral',
            confidence: prediction.confidence,
            expectedMove: prediction.expectedMove,
            volatility: volatility,
            patterns,
            text: analysisText.join('\n')
        };
    }
    
    /**
     * Generate next candle based on prediction
     * @param {Object} lastCandle - Last candle
     * @param {Object} prediction - Combined prediction
     * @returns {Object} - Next candle prediction
     */
    generateNextCandle(lastCandle, prediction) {
        this.logger.info('Generating next candle...');
        
        // Calculate expected price movement
        const expectedMove = prediction.expectedMove;
        
        // Calculate expected close
        const expectedClose = lastCandle.close + expectedMove;
        
        // Calculate expected range based on recent volatility
        const expectedRange = Math.abs(expectedMove) * 1.5;
        
        // Generate next candle
        let nextCandle = {
            timestamp: lastCandle.timestamp + 60000, // Assume 1-minute candle
            open: lastCandle.close,
            close: expectedClose,
            high: 0,
            low: 0
        };
        
        // Calculate high and low based on direction
        if (prediction.direction === 'UP') {
            nextCandle.high = Math.max(nextCandle.open, nextCandle.close) + expectedRange * 0.3;
            nextCandle.low = Math.min(nextCandle.open, nextCandle.close) - expectedRange * 0.1;
        } else if (prediction.direction === 'DOWN') {
            nextCandle.high = Math.max(nextCandle.open, nextCandle.close) + expectedRange * 0.1;
            nextCandle.low = Math.min(nextCandle.open, nextCandle.close) - expectedRange * 0.3;
        } else {
            nextCandle.high = Math.max(nextCandle.open, nextCandle.close) + expectedRange * 0.2;
            nextCandle.low = Math.min(nextCandle.open, nextCandle.close) - expectedRange * 0.2;
        }
        
        return nextCandle;
    }
}

module.exports = { NextCandlePredictor };