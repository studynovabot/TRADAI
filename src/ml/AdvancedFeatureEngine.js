/**
 * Advanced Feature Engineering Engine
 * 
 * Extracts 24+ features from market data for ML model training and prediction.
 * Features include price action, technical indicators, momentum, volatility, 
 * volume, and market structure features.
 */

class AdvancedFeatureEngine {
    constructor() {
        this.featureCount = 24;
        this.featureNames = [
            // Price features (4)
            'price_change', 'price_volatility', 'price_range', 'price_position',
            
            // Technical indicator features (8)
            'rsi_value', 'rsi_divergence', 'macd_signal', 'macd_histogram',
            'ema_alignment', 'bollinger_position', 'stochastic_signal', 'atr_normalized',
            
            // Volume features (4)
            'volume_ratio', 'volume_trend', 'volume_spike', 'obv_trend',
            
            // Market structure features (4)
            'support_strength', 'resistance_strength', 'trend_strength', 'market_regime',
            
            // Pattern features (4)
            'candlestick_pattern', 'chart_pattern', 'harmonic_pattern', 'fibonacci_level'
        ];
    }

    /**
     * Extract all features from OHLCV data and indicators
     */
    extractFeatures(ohlcvData, indicators = {}) {
        if (!ohlcvData || ohlcvData.length === 0) {
            throw new Error('OHLCV data is required for feature extraction');
        }

        const features = {};

        try {
            // Extract price features
            Object.assign(features, this.extractPriceFeatures(ohlcvData));
            
            // Extract technical indicator features
            Object.assign(features, this.extractTechnicalFeatures(ohlcvData, indicators));
            
            // Extract volume features
            Object.assign(features, this.extractVolumeFeatures(ohlcvData));
            
            // Extract market structure features
            Object.assign(features, this.extractMarketStructureFeatures(ohlcvData));
            
            // Extract pattern features
            Object.assign(features, this.extractPatternFeatures(ohlcvData));

            // Validate feature count
            const extractedFeatureCount = Object.keys(features).length;
            if (extractedFeatureCount !== this.featureCount) {
                console.warn(`Expected ${this.featureCount} features, got ${extractedFeatureCount}`);
            }

            return features;

        } catch (error) {
            throw new Error(`Feature extraction failed: ${error.message}`);
        }
    }

    /**
     * Extract price-based features (4 features)
     */
    extractPriceFeatures(ohlcvData) {
        const latest = ohlcvData[ohlcvData.length - 1];
        const previous = ohlcvData[ohlcvData.length - 2] || latest;

        return {
            price_change: this.calculatePriceChange(latest, previous),
            price_volatility: this.calculatePriceVolatility(ohlcvData),
            price_range: this.calculatePriceRange(latest),
            price_position: this.calculatePricePosition(ohlcvData)
        };
    }

    /**
     * Extract technical indicator features (8 features)
     */
    extractTechnicalFeatures(ohlcvData, indicators) {
        return {
            rsi_value: this.extractRSIValue(indicators.rsi),
            rsi_divergence: this.detectRSIDivergence(ohlcvData, indicators.rsi),
            macd_signal: this.extractMACDSignal(indicators.macd),
            macd_histogram: this.extractMACDHistogram(indicators.macd),
            ema_alignment: this.checkEMAAlignment(indicators.ema),
            bollinger_position: this.calculateBollingerPosition(ohlcvData, indicators.bollinger),
            stochastic_signal: this.extractStochasticSignal(indicators.stochastic),
            atr_normalized: this.normalizeATR(indicators.atr, ohlcvData)
        };
    }

    /**
     * Extract volume-based features (4 features)
     */
    extractVolumeFeatures(ohlcvData) {
        return {
            volume_ratio: this.calculateVolumeRatio(ohlcvData),
            volume_trend: this.calculateVolumeTrend(ohlcvData),
            volume_spike: this.detectVolumeSpike(ohlcvData),
            obv_trend: this.calculateOBVTrend(ohlcvData)
        };
    }

    /**
     * Extract market structure features (4 features)
     */
    extractMarketStructureFeatures(ohlcvData) {
        return {
            support_strength: this.calculateSupportStrength(ohlcvData),
            resistance_strength: this.calculateResistanceStrength(ohlcvData),
            trend_strength: this.calculateTrendStrength(ohlcvData),
            market_regime: this.identifyMarketRegime(ohlcvData)
        };
    }

    /**
     * Extract pattern-based features (4 features)
     */
    extractPatternFeatures(ohlcvData) {
        return {
            candlestick_pattern: this.detectCandlestickPatterns(ohlcvData),
            chart_pattern: this.detectChartPatterns(ohlcvData),
            harmonic_pattern: this.detectHarmonicPatterns(ohlcvData),
            fibonacci_level: this.calculateFibonacciLevels(ohlcvData)
        };
    }

    // Price Feature Calculations
    calculatePriceChange(latest, previous) {
        if (!latest.close || !previous.close) return 0;
        return (latest.close - previous.close) / previous.close;
    }

    calculatePriceVolatility(ohlcvData) {
        if (ohlcvData.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < ohlcvData.length; i++) {
            const ret = (ohlcvData[i].close - ohlcvData[i-1].close) / ohlcvData[i-1].close;
            returns.push(ret);
        }
        
        const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    calculatePriceRange(candle) {
        if (!candle.high || !candle.low) return 0;
        return (candle.high - candle.low) / candle.close;
    }

    calculatePricePosition(ohlcvData) {
        const latest = ohlcvData[ohlcvData.length - 1];
        if (!latest.high || !latest.low) return 0.5;
        return (latest.close - latest.low) / (latest.high - latest.low);
    }

    // Technical Indicator Feature Calculations
    extractRSIValue(rsi) {
        if (!rsi || !Array.isArray(rsi) || rsi.length === 0) return 50;
        return rsi[rsi.length - 1] / 100; // Normalize to 0-1
    }

    detectRSIDivergence(ohlcvData, rsi) {
        if (!rsi || rsi.length < 10 || ohlcvData.length < 10) return 0;
        
        // Simple divergence detection: compare price and RSI trends over last 10 periods
        const priceSlope = this.calculateSlope(ohlcvData.slice(-10).map(d => d.close));
        const rsiSlope = this.calculateSlope(rsi.slice(-10));
        
        // Divergence occurs when price and RSI move in opposite directions
        return (priceSlope * rsiSlope < 0) ? 1 : 0;
    }

    extractMACDSignal(macd) {
        if (!macd || !macd.signal || macd.signal.length === 0) return 0;
        const latest = macd.signal[macd.signal.length - 1];
        return Math.tanh(latest * 1000); // Normalize and bound between -1 and 1
    }

    extractMACDHistogram(macd) {
        if (!macd || !macd.histogram || macd.histogram.length === 0) return 0;
        const latest = macd.histogram[macd.histogram.length - 1];
        return Math.tanh(latest * 1000); // Normalize and bound between -1 and 1
    }

    checkEMAAlignment(ema) {
        if (!ema || !ema.ema9 || !ema.ema21 || !ema.ema50) return 0;
        
        const ema9 = ema.ema9[ema.ema9.length - 1];
        const ema21 = ema.ema21[ema.ema21.length - 1];
        const ema50 = ema.ema50[ema.ema50.length - 1];
        
        // Check if EMAs are in bullish alignment (9 > 21 > 50)
        if (ema9 > ema21 && ema21 > ema50) return 1;
        // Check if EMAs are in bearish alignment (9 < 21 < 50)
        if (ema9 < ema21 && ema21 < ema50) return -1;
        return 0; // Mixed alignment
    }

    calculateBollingerPosition(ohlcvData, bollinger) {
        if (!bollinger || !bollinger.upper || !bollinger.lower || ohlcvData.length === 0) return 0.5;
        
        const latest = ohlcvData[ohlcvData.length - 1];
        const upper = bollinger.upper[bollinger.upper.length - 1];
        const lower = bollinger.lower[bollinger.lower.length - 1];
        
        if (upper === lower) return 0.5;
        return (latest.close - lower) / (upper - lower);
    }

    extractStochasticSignal(stochastic) {
        if (!stochastic || !stochastic.k || !stochastic.d) return 0;
        
        const k = stochastic.k[stochastic.k.length - 1] / 100;
        const d = stochastic.d[stochastic.d.length - 1] / 100;
        
        // Signal when %K crosses above %D
        return k - d;
    }

    normalizeATR(atr, ohlcvData) {
        if (!atr || atr.length === 0 || ohlcvData.length === 0) return 0;
        
        const latest = ohlcvData[ohlcvData.length - 1];
        const atrValue = atr[atr.length - 1];
        
        return atrValue / latest.close; // ATR as percentage of price
    }

    // Volume Feature Calculations
    calculateVolumeRatio(ohlcvData) {
        if (ohlcvData.length < 20) return 1;
        
        const latest = ohlcvData[ohlcvData.length - 1];
        const avgVolume = ohlcvData.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
        
        return avgVolume > 0 ? latest.volume / avgVolume : 1;
    }

    calculateVolumeTrend(ohlcvData) {
        if (ohlcvData.length < 10) return 0;
        
        const volumes = ohlcvData.slice(-10).map(d => d.volume);
        return this.calculateSlope(volumes);
    }

    detectVolumeSpike(ohlcvData) {
        if (ohlcvData.length < 20) return 0;
        
        const latest = ohlcvData[ohlcvData.length - 1];
        const avgVolume = ohlcvData.slice(-20, -1).reduce((sum, d) => sum + d.volume, 0) / 19;
        const stdDev = this.calculateStandardDeviation(ohlcvData.slice(-20, -1).map(d => d.volume));
        
        return latest.volume > (avgVolume + 2 * stdDev) ? 1 : 0;
    }

    calculateOBVTrend(ohlcvData) {
        if (ohlcvData.length < 10) return 0;
        
        let obv = 0;
        const obvValues = [0];
        
        for (let i = 1; i < ohlcvData.length; i++) {
            if (ohlcvData[i].close > ohlcvData[i-1].close) {
                obv += ohlcvData[i].volume;
            } else if (ohlcvData[i].close < ohlcvData[i-1].close) {
                obv -= ohlcvData[i].volume;
            }
            obvValues.push(obv);
        }
        
        return this.calculateSlope(obvValues.slice(-10));
    }

    // Market Structure Feature Calculations
    calculateSupportStrength(ohlcvData) {
        if (ohlcvData.length < 20) return 0;
        
        const lows = ohlcvData.slice(-20).map(d => d.low);
        const minLow = Math.min(...lows);
        const touchCount = lows.filter(low => Math.abs(low - minLow) / minLow < 0.001).length;
        
        return Math.min(touchCount / 5, 1); // Normalize to 0-1
    }

    calculateResistanceStrength(ohlcvData) {
        if (ohlcvData.length < 20) return 0;
        
        const highs = ohlcvData.slice(-20).map(d => d.high);
        const maxHigh = Math.max(...highs);
        const touchCount = highs.filter(high => Math.abs(high - maxHigh) / maxHigh < 0.001).length;
        
        return Math.min(touchCount / 5, 1); // Normalize to 0-1
    }

    calculateTrendStrength(ohlcvData) {
        if (ohlcvData.length < 20) return 0;
        
        const closes = ohlcvData.slice(-20).map(d => d.close);
        const slope = this.calculateSlope(closes);
        const r2 = this.calculateRSquared(closes);
        
        return slope * r2; // Trend strength = direction * consistency
    }

    identifyMarketRegime(ohlcvData) {
        if (ohlcvData.length < 50) return 0;
        
        const shortTrend = this.calculateSlope(ohlcvData.slice(-10).map(d => d.close));
        const longTrend = this.calculateSlope(ohlcvData.slice(-50).map(d => d.close));
        const volatility = this.calculatePriceVolatility(ohlcvData.slice(-20));
        
        // Classify market regime: 1 = trending up, -1 = trending down, 0 = ranging
        if (Math.abs(shortTrend) < volatility * 0.5) return 0; // Ranging
        return shortTrend > 0 ? 1 : -1; // Trending
    }

    // Pattern Feature Calculations
    detectCandlestickPatterns(ohlcvData) {
        if (ohlcvData.length < 3) return 0;
        
        const latest = ohlcvData[ohlcvData.length - 1];
        const previous = ohlcvData[ohlcvData.length - 2];
        
        // Simple doji detection
        const bodySize = Math.abs(latest.close - latest.open) / (latest.high - latest.low);
        if (bodySize < 0.1) return 1; // Doji pattern
        
        // Simple engulfing pattern
        if (latest.open < previous.close && latest.close > previous.open) return 0.8; // Bullish engulfing
        if (latest.open > previous.close && latest.close < previous.open) return -0.8; // Bearish engulfing
        
        return 0;
    }

    detectChartPatterns(ohlcvData) {
        // Simplified chart pattern detection
        if (ohlcvData.length < 20) return 0;
        
        const highs = ohlcvData.slice(-20).map(d => d.high);
        const lows = ohlcvData.slice(-20).map(d => d.low);
        
        // Simple triangle pattern detection
        const highSlope = this.calculateSlope(highs);
        const lowSlope = this.calculateSlope(lows);
        
        if (Math.abs(highSlope) < 0.001 && Math.abs(lowSlope) < 0.001) return 0.5; // Symmetrical triangle
        return 0;
    }

    detectHarmonicPatterns(ohlcvData) {
        // Simplified harmonic pattern detection
        return 0; // Placeholder for complex harmonic pattern detection
    }

    calculateFibonacciLevels(ohlcvData) {
        if (ohlcvData.length < 20) return 0.5;
        
        const highs = ohlcvData.slice(-20).map(d => d.high);
        const lows = ohlcvData.slice(-20).map(d => d.low);
        const latest = ohlcvData[ohlcvData.length - 1];
        
        const high = Math.max(...highs);
        const low = Math.min(...lows);
        const range = high - low;
        
        if (range === 0) return 0.5;
        
        // Calculate position relative to Fibonacci levels
        const position = (latest.close - low) / range;
        
        // Return distance to nearest Fibonacci level (0, 0.236, 0.382, 0.5, 0.618, 0.786, 1)
        const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const distances = fibLevels.map(level => Math.abs(position - level));
        const minDistance = Math.min(...distances);
        
        return 1 - minDistance; // Closer to Fib level = higher value
    }

    // Utility Functions
    calculateSlope(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const denominator = n * sumX2 - sumX * sumX;
        if (denominator === 0) return 0;
        
        return (n * sumXY - sumX * sumY) / denominator;
    }

    calculateRSquared(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const totalSumSquares = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
        
        if (totalSumSquares === 0) return 1;
        
        const slope = this.calculateSlope(values);
        const intercept = mean - slope * (values.length - 1) / 2;
        
        const residualSumSquares = values.reduce((sum, val, i) => {
            const predicted = slope * i + intercept;
            return sum + Math.pow(val - predicted, 2);
        }, 0);
        
        return 1 - (residualSumSquares / totalSumSquares);
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    /**
     * Get feature names
     */
    getFeatureNames() {
        return [...this.featureNames];
    }

    /**
     * Get feature count
     */
    getFeatureCount() {
        return this.featureCount;
    }
}

    /**
     * Normalize features for ML model input
     */
    normalizeFeatures(features) {
        const normalized = {};

        for (const [name, value] of Object.entries(features)) {
            // Apply appropriate normalization based on feature type
            if (name.includes('ratio') || name.includes('position')) {
                normalized[name] = Math.max(0, Math.min(1, value)); // Clamp to 0-1
            } else if (name.includes('change') || name.includes('trend')) {
                normalized[name] = Math.tanh(value); // Bound to -1 to 1
            } else if (name.includes('strength') || name.includes('score')) {
                normalized[name] = Math.max(0, Math.min(1, value)); // Clamp to 0-1
            } else {
                normalized[name] = Math.tanh(value); // Default: bound to -1 to 1
            }
        }

        return normalized;
    }

    /**
     * Convert features to array format for ML models
     */
    featuresToArray(features) {
        return this.featureNames.map(name => features[name] || 0);
    }

    /**
     * Validate extracted features
     */
    validateFeatures(features) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Check feature count
        if (Object.keys(features).length !== this.featureCount) {
            validation.errors.push(`Expected ${this.featureCount} features, got ${Object.keys(features).length}`);
            validation.isValid = false;
        }

        // Check for missing features
        this.featureNames.forEach(name => {
            if (!(name in features)) {
                validation.errors.push(`Missing feature: ${name}`);
                validation.isValid = false;
            }
        });

        // Check for invalid values
        Object.entries(features).forEach(([name, value]) => {
            if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
                validation.errors.push(`Invalid value for feature ${name}: ${value}`);
                validation.isValid = false;
            }
        });

        return validation;
    }
}

module.exports = { AdvancedFeatureEngine };
