/**
 * Multi-Timeframe Confluence Analyzer
 * 
 * Analyzes market data across multiple timeframes and requires agreement
 * between timeframes before generating signals. Implements sophisticated
 * confluence detection and weighting algorithms.
 */

class MultiTimeframeConfluenceAnalyzer {
    constructor(config = {}) {
        this.config = {
            timeframes: config.timeframes || ['1m', '5m', '15m', '30m', '1h', '4h'],
            minConfluence: config.minConfluence || 0.75,
            minTimeframes: config.minTimeframes || 3,
            confluenceWeights: config.confluenceWeights || {
                '1m': 0.1,
                '5m': 0.2,
                '15m': 0.2,
                '30m': 0.2,
                '1h': 0.2,
                '4h': 0.1
            },
            ...config
        };

        this.analysisHistory = [];
        this.confluenceMetrics = {
            totalAnalyses: 0,
            avgConfluence: 0,
            strongConfluenceCount: 0,
            weakConfluenceCount: 0
        };
    }

    /**
     * Analyze confluence across multiple timeframes
     */
    async analyzeConfluence(marketDataByTimeframe, signal = null) {
        const analysis = {
            timestamp: Date.now(),
            timeframes: Object.keys(marketDataByTimeframe),
            confluenceScore: 0,
            agreement: 0,
            strength: 'weak',
            details: {},
            signals: {},
            passed: false,
            errors: [],
            warnings: []
        };

        try {
            // Validate input data
            if (!this.validateInputData(marketDataByTimeframe, analysis)) {
                return analysis;
            }

            // Analyze each timeframe
            for (const [timeframe, data] of Object.entries(marketDataByTimeframe)) {
                analysis.details[timeframe] = await this.analyzeTimeframe(timeframe, data);
                analysis.signals[timeframe] = this.extractTimeframeSignal(analysis.details[timeframe]);
            }

            // Calculate confluence metrics
            analysis.confluenceScore = this.calculateConfluenceScore(analysis.signals);
            analysis.agreement = this.calculateAgreement(analysis.signals);
            analysis.strength = this.determineConfluenceStrength(analysis.confluenceScore);

            // Validate confluence requirements
            analysis.passed = this.validateConfluenceRequirements(analysis);

            // Generate confluence insights
            analysis.insights = this.generateConfluenceInsights(analysis);

            // Store analysis history
            this.analysisHistory.push(analysis);
            if (this.analysisHistory.length > 1000) {
                this.analysisHistory.shift();
            }

            // Update metrics
            this.updateConfluenceMetrics();

            return analysis;

        } catch (error) {
            analysis.errors.push(`Confluence analysis failed: ${error.message}`);
            return analysis;
        }
    }

    /**
     * Validate input data
     */
    validateInputData(marketDataByTimeframe, analysis) {
        const timeframes = Object.keys(marketDataByTimeframe);

        if (timeframes.length === 0) {
            analysis.errors.push('No timeframe data provided');
            return false;
        }

        if (timeframes.length < this.config.minTimeframes) {
            analysis.warnings.push(`Insufficient timeframes: ${timeframes.length} < ${this.config.minTimeframes}`);
        }

        // Validate each timeframe data
        for (const [timeframe, data] of Object.entries(marketDataByTimeframe)) {
            if (!data || !Array.isArray(data) || data.length === 0) {
                analysis.errors.push(`Invalid data for timeframe ${timeframe}`);
                return false;
            }

            // Check data completeness
            const requiredFields = ['open', 'high', 'low', 'close', 'volume', 'timestamp'];
            const latestCandle = data[data.length - 1];
            
            for (const field of requiredFields) {
                if (latestCandle[field] === undefined || latestCandle[field] === null) {
                    analysis.warnings.push(`Missing ${field} in ${timeframe} data`);
                }
            }
        }

        return analysis.errors.length === 0;
    }

    /**
     * Analyze individual timeframe
     */
    async analyzeTimeframe(timeframe, data) {
        const analysis = {
            timeframe,
            candleCount: data.length,
            trend: null,
            momentum: null,
            volatility: null,
            volume: null,
            support: null,
            resistance: null,
            indicators: {},
            patterns: [],
            signal: null,
            confidence: 0
        };

        try {
            // Trend analysis
            analysis.trend = this.analyzeTrend(data);
            
            // Momentum analysis
            analysis.momentum = this.analyzeMomentum(data);
            
            // Volatility analysis
            analysis.volatility = this.analyzeVolatility(data);
            
            // Volume analysis
            analysis.volume = this.analyzeVolume(data);
            
            // Support/Resistance analysis
            const srLevels = this.analyzeSupportResistance(data);
            analysis.support = srLevels.support;
            analysis.resistance = srLevels.resistance;
            
            // Technical indicators
            analysis.indicators = this.calculateTimeframeIndicators(data);
            
            // Pattern detection
            analysis.patterns = this.detectTimeframePatterns(data);
            
            // Generate timeframe signal
            analysis.signal = this.generateTimeframeSignal(analysis);
            analysis.confidence = this.calculateTimeframeConfidence(analysis);

        } catch (error) {
            console.warn(`Timeframe analysis failed for ${timeframe}:`, error.message);
        }

        return analysis;
    }

    /**
     * Analyze trend for a timeframe
     */
    analyzeTrend(data) {
        if (data.length < 20) return { direction: 'neutral', strength: 0 };

        const closes = data.slice(-20).map(d => d.close);
        const slope = this.calculateSlope(closes);
        const r2 = this.calculateRSquared(closes);

        let direction = 'neutral';
        if (slope > 0.001) direction = 'up';
        else if (slope < -0.001) direction = 'down';

        return {
            direction,
            strength: r2,
            slope,
            consistency: r2
        };
    }

    /**
     * Analyze momentum for a timeframe
     */
    analyzeMomentum(data) {
        if (data.length < 10) return { direction: 'neutral', strength: 0 };

        const recentCloses = data.slice(-10).map(d => d.close);
        const olderCloses = data.slice(-20, -10).map(d => d.close);

        const recentAvg = recentCloses.reduce((sum, c) => sum + c, 0) / recentCloses.length;
        const olderAvg = olderCloses.reduce((sum, c) => sum + c, 0) / olderCloses.length;

        const momentumChange = (recentAvg - olderAvg) / olderAvg;

        let direction = 'neutral';
        if (momentumChange > 0.005) direction = 'increasing';
        else if (momentumChange < -0.005) direction = 'decreasing';

        return {
            direction,
            strength: Math.abs(momentumChange),
            change: momentumChange
        };
    }

    /**
     * Analyze volatility for a timeframe
     */
    analyzeVolatility(data) {
        if (data.length < 20) return { level: 'normal', value: 0 };

        const returns = [];
        for (let i = 1; i < data.length; i++) {
            const ret = (data[i].close - data[i-1].close) / data[i-1].close;
            returns.push(ret);
        }

        const volatility = this.calculateStandardDeviation(returns);

        let level = 'normal';
        if (volatility > 0.03) level = 'high';
        else if (volatility < 0.01) level = 'low';

        return {
            level,
            value: volatility,
            percentile: this.calculateVolatilityPercentile(volatility)
        };
    }

    /**
     * Analyze volume for a timeframe
     */
    analyzeVolume(data) {
        if (data.length < 20) return { trend: 'neutral', strength: 0 };

        const volumes = data.slice(-20).map(d => d.volume);
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const latestVolume = volumes[volumes.length - 1];

        const volumeRatio = latestVolume / avgVolume;
        const volumeSlope = this.calculateSlope(volumes.slice(-10));

        let trend = 'neutral';
        if (volumeSlope > 0) trend = 'increasing';
        else if (volumeSlope < 0) trend = 'decreasing';

        return {
            trend,
            strength: Math.abs(volumeSlope),
            ratio: volumeRatio,
            spike: volumeRatio > 2.0,
            avgVolume
        };
    }

    /**
     * Analyze support and resistance levels
     */
    analyzeSupportResistance(data) {
        if (data.length < 50) return { support: null, resistance: null };

        const highs = data.map(d => d.high);
        const lows = data.map(d => d.low);

        // Find significant levels using pivot points
        const supportLevels = this.findPivotLows(lows);
        const resistanceLevels = this.findPivotHighs(highs);

        return {
            support: supportLevels.length > 0 ? supportLevels[0] : null,
            resistance: resistanceLevels.length > 0 ? resistanceLevels[0] : null,
            supportLevels,
            resistanceLevels
        };
    }

    /**
     * Calculate technical indicators for timeframe
     */
    calculateTimeframeIndicators(data) {
        const indicators = {};

        try {
            // RSI
            indicators.rsi = this.calculateRSI(data, 14);
            
            // MACD
            indicators.macd = this.calculateMACD(data);
            
            // Moving averages
            indicators.sma20 = this.calculateSMA(data, 20);
            indicators.ema20 = this.calculateEMA(data, 20);
            
            // Bollinger Bands
            indicators.bollinger = this.calculateBollingerBands(data, 20, 2);

        } catch (error) {
            console.warn('Indicator calculation failed:', error.message);
        }

        return indicators;
    }

    /**
     * Detect patterns in timeframe
     */
    detectTimeframePatterns(data) {
        const patterns = [];

        try {
            // Candlestick patterns
            const candlestickPatterns = this.detectCandlestickPatterns(data.slice(-5));
            patterns.push(...candlestickPatterns);

            // Chart patterns
            const chartPatterns = this.detectChartPatterns(data.slice(-50));
            patterns.push(...chartPatterns);

        } catch (error) {
            console.warn('Pattern detection failed:', error.message);
        }

        return patterns;
    }

    /**
     * Generate signal for timeframe
     */
    generateTimeframeSignal(analysis) {
        const signals = [];

        // Trend signal
        if (analysis.trend.direction === 'up' && analysis.trend.strength > 0.7) {
            signals.push({ type: 'trend', direction: 'bullish', weight: 0.3 });
        } else if (analysis.trend.direction === 'down' && analysis.trend.strength > 0.7) {
            signals.push({ type: 'trend', direction: 'bearish', weight: 0.3 });
        }

        // Momentum signal
        if (analysis.momentum.direction === 'increasing' && analysis.momentum.strength > 0.01) {
            signals.push({ type: 'momentum', direction: 'bullish', weight: 0.2 });
        } else if (analysis.momentum.direction === 'decreasing' && analysis.momentum.strength > 0.01) {
            signals.push({ type: 'momentum', direction: 'bearish', weight: 0.2 });
        }

        // Volume signal
        if (analysis.volume.trend === 'increasing' && analysis.volume.ratio > 1.5) {
            signals.push({ type: 'volume', direction: 'bullish', weight: 0.1 });
        }

        // Indicator signals
        if (analysis.indicators.rsi) {
            if (analysis.indicators.rsi < 30) {
                signals.push({ type: 'rsi', direction: 'bullish', weight: 0.2 });
            } else if (analysis.indicators.rsi > 70) {
                signals.push({ type: 'rsi', direction: 'bearish', weight: 0.2 });
            }
        }

        // Combine signals
        let bullishWeight = 0;
        let bearishWeight = 0;

        signals.forEach(signal => {
            if (signal.direction === 'bullish') {
                bullishWeight += signal.weight;
            } else if (signal.direction === 'bearish') {
                bearishWeight += signal.weight;
            }
        });

        if (bullishWeight > bearishWeight && bullishWeight > 0.5) {
            return { direction: 'bullish', strength: bullishWeight, signals };
        } else if (bearishWeight > bullishWeight && bearishWeight > 0.5) {
            return { direction: 'bearish', strength: bearishWeight, signals };
        }

        return { direction: 'neutral', strength: 0, signals };
    }

    /**
     * Calculate timeframe confidence
     */
    calculateTimeframeConfidence(analysis) {
        let confidence = 0.5; // Base confidence

        // Trend confidence
        if (analysis.trend.strength > 0.8) confidence += 0.2;
        else if (analysis.trend.strength > 0.6) confidence += 0.1;

        // Volume confirmation
        if (analysis.volume.ratio > 1.5) confidence += 0.1;

        // Pattern confirmation
        if (analysis.patterns.length > 0) {
            const avgPatternConfidence = analysis.patterns.reduce((sum, p) => sum + (p.confidence || 0), 0) / analysis.patterns.length;
            confidence += avgPatternConfidence * 0.2;
        }

        return Math.min(1, confidence);
    }

    /**
     * Extract signal from timeframe analysis
     */
    extractTimeframeSignal(timeframeAnalysis) {
        return {
            direction: timeframeAnalysis.signal?.direction || 'neutral',
            strength: timeframeAnalysis.signal?.strength || 0,
            confidence: timeframeAnalysis.confidence || 0,
            timeframe: timeframeAnalysis.timeframe
        };
    }

    /**
     * Calculate confluence score across timeframes
     */
    calculateConfluenceScore(signals) {
        const timeframes = Object.keys(signals);
        if (timeframes.length === 0) return 0;

        let weightedBullish = 0;
        let weightedBearish = 0;
        let totalWeight = 0;

        timeframes.forEach(tf => {
            const signal = signals[tf];
            const weight = this.config.confluenceWeights[tf] || 0.1;
            
            totalWeight += weight;

            if (signal.direction === 'bullish') {
                weightedBullish += signal.strength * weight;
            } else if (signal.direction === 'bearish') {
                weightedBearish += signal.strength * weight;
            }
        });

        if (totalWeight === 0) return 0;

        const maxWeight = Math.max(weightedBullish, weightedBearish);
        return maxWeight / totalWeight;
    }

    /**
     * Calculate agreement between timeframes
     */
    calculateAgreement(signals) {
        const timeframes = Object.keys(signals);
        if (timeframes.length <= 1) return 1;

        const directions = timeframes.map(tf => signals[tf].direction).filter(d => d !== 'neutral');
        if (directions.length === 0) return 0;

        const bullishCount = directions.filter(d => d === 'bullish').length;
        const bearishCount = directions.filter(d => d === 'bearish').length;

        return Math.max(bullishCount, bearishCount) / directions.length;
    }

    /**
     * Determine confluence strength
     */
    determineConfluenceStrength(confluenceScore) {
        if (confluenceScore >= 0.8) return 'very_strong';
        if (confluenceScore >= 0.7) return 'strong';
        if (confluenceScore >= 0.6) return 'moderate';
        if (confluenceScore >= 0.4) return 'weak';
        return 'very_weak';
    }

    /**
     * Validate confluence requirements
     */
    validateConfluenceRequirements(analysis) {
        if (analysis.confluenceScore < this.config.minConfluence) {
            analysis.warnings.push(`Confluence score below threshold: ${analysis.confluenceScore.toFixed(2)} < ${this.config.minConfluence}`);
            return false;
        }

        if (analysis.timeframes.length < this.config.minTimeframes) {
            analysis.warnings.push(`Insufficient timeframes: ${analysis.timeframes.length} < ${this.config.minTimeframes}`);
            return false;
        }

        return true;
    }

    /**
     * Generate confluence insights
     */
    generateConfluenceInsights(analysis) {
        const insights = [];

        // Confluence strength insight
        insights.push(`Confluence strength: ${analysis.strength} (${(analysis.confluenceScore * 100).toFixed(1)}%)`);

        // Agreement insight
        insights.push(`Timeframe agreement: ${(analysis.agreement * 100).toFixed(1)}%`);

        // Strongest timeframes
        const strongestTf = Object.entries(analysis.signals)
            .sort((a, b) => b[1].strength - a[1].strength)[0];
        
        if (strongestTf) {
            insights.push(`Strongest signal from ${strongestTf[0]} timeframe`);
        }

        return insights;
    }

    /**
     * Update confluence metrics
     */
    updateConfluenceMetrics() {
        this.confluenceMetrics.totalAnalyses = this.analysisHistory.length;
        
        if (this.analysisHistory.length > 0) {
            this.confluenceMetrics.avgConfluence = this.analysisHistory.reduce((sum, a) => sum + a.confluenceScore, 0) / this.analysisHistory.length;
            this.confluenceMetrics.strongConfluenceCount = this.analysisHistory.filter(a => a.confluenceScore >= 0.7).length;
            this.confluenceMetrics.weakConfluenceCount = this.analysisHistory.filter(a => a.confluenceScore < 0.5).length;
        }
    }

    // Utility functions
    calculateSlope(values) {
        if (values.length < 2) return 0;
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        const denominator = n * sumX2 - sumX * sumX;
        return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
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

    calculateVolatilityPercentile(volatility) {
        // Simplified percentile calculation
        if (volatility > 0.05) return 95;
        if (volatility > 0.03) return 80;
        if (volatility > 0.02) return 60;
        if (volatility > 0.01) return 40;
        return 20;
    }

    findPivotLows(lows) {
        // Simplified pivot low detection
        const pivots = [];
        for (let i = 2; i < lows.length - 2; i++) {
            if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
                pivots.push({ price: lows[i], index: i });
            }
        }
        return pivots.sort((a, b) => a.price - b.price);
    }

    findPivotHighs(highs) {
        // Simplified pivot high detection
        const pivots = [];
        for (let i = 2; i < highs.length - 2; i++) {
            if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
                pivots.push({ price: highs[i], index: i });
            }
        }
        return pivots.sort((a, b) => b.price - a.price);
    }

    // Simplified indicator calculations
    calculateRSI(data, period) {
        if (data.length < period + 1) return 50;
        // Simplified RSI calculation
        return 50 + (Math.random() - 0.5) * 40; // Placeholder
    }

    calculateMACD(data) {
        // Simplified MACD calculation
        return { macd: 0, signal: 0, histogram: 0 }; // Placeholder
    }

    calculateSMA(data, period) {
        if (data.length < period) return 0;
        const closes = data.slice(-period).map(d => d.close);
        return closes.reduce((sum, c) => sum + c, 0) / closes.length;
    }

    calculateEMA(data, period) {
        // Simplified EMA calculation
        return this.calculateSMA(data, period); // Placeholder
    }

    calculateBollingerBands(data, period, stdDev) {
        const sma = this.calculateSMA(data, period);
        return { upper: sma * 1.02, middle: sma, lower: sma * 0.98 }; // Placeholder
    }

    detectCandlestickPatterns(data) {
        // Simplified pattern detection
        return []; // Placeholder
    }

    detectChartPatterns(data) {
        // Simplified pattern detection
        return []; // Placeholder
    }

    /**
     * Get confluence metrics
     */
    getConfluenceMetrics() {
        return { ...this.confluenceMetrics };
    }

    /**
     * Get analysis history
     */
    getAnalysisHistory(limit = 100) {
        return this.analysisHistory.slice(-limit);
    }
}

module.exports = { MultiTimeframeConfluenceAnalyzer };
