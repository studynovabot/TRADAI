/**
 * Pattern Recognition and Matching System
 * 
 * Advanced pattern recognition for candlestick patterns, chart formations,
 * and technical indicators extracted from screenshot analysis.
 */

class PatternRecognitionSystem {
    constructor(config = {}) {
        this.config = {
            minPatternConfidence: config.minPatternConfidence || 0.7,
            maxPatternAge: config.maxPatternAge || 24 * 60 * 60 * 1000, // 24 hours
            patternWeights: config.patternWeights || {
                candlestick: 0.4,
                chart: 0.3,
                indicator: 0.3
            },
            ...config
        };

        this.patternDatabase = this.initializePatternDatabase();
        this.recognitionHistory = [];
    }

    /**
     * Initialize pattern database with known patterns
     */
    initializePatternDatabase() {
        return {
            candlestickPatterns: {
                doji: {
                    name: 'Doji',
                    type: 'reversal',
                    reliability: 0.75,
                    description: 'Indecision pattern with small body',
                    rules: {
                        bodySize: { max: 0.1 }, // Body less than 10% of total range
                        shadowRatio: { min: 2 } // Shadows at least 2x body size
                    }
                },
                hammer: {
                    name: 'Hammer',
                    type: 'bullish_reversal',
                    reliability: 0.8,
                    description: 'Bullish reversal with long lower shadow',
                    rules: {
                        lowerShadow: { min: 2 }, // Lower shadow 2x body
                        upperShadow: { max: 0.1 }, // Small upper shadow
                        position: 'downtrend'
                    }
                },
                shootingStar: {
                    name: 'Shooting Star',
                    type: 'bearish_reversal',
                    reliability: 0.8,
                    description: 'Bearish reversal with long upper shadow',
                    rules: {
                        upperShadow: { min: 2 }, // Upper shadow 2x body
                        lowerShadow: { max: 0.1 }, // Small lower shadow
                        position: 'uptrend'
                    }
                },
                engulfing: {
                    name: 'Engulfing',
                    type: 'reversal',
                    reliability: 0.85,
                    description: 'Second candle engulfs first candle',
                    rules: {
                        candleCount: 2,
                        engulfment: true,
                        colorChange: true
                    }
                }
            },

            chartPatterns: {
                supportResistance: {
                    name: 'Support/Resistance',
                    type: 'continuation',
                    reliability: 0.7,
                    description: 'Price bounces off key levels',
                    rules: {
                        touchCount: { min: 2 },
                        priceRejection: true
                    }
                },
                triangle: {
                    name: 'Triangle',
                    type: 'continuation',
                    reliability: 0.75,
                    description: 'Converging trend lines',
                    rules: {
                        convergence: true,
                        volumeDecrease: true
                    }
                },
                headShoulders: {
                    name: 'Head and Shoulders',
                    type: 'reversal',
                    reliability: 0.9,
                    description: 'Three peaks with middle highest',
                    rules: {
                        peakCount: 3,
                        middlePeakHighest: true,
                        necklineBreak: true
                    }
                }
            },

            indicatorPatterns: {
                rsiDivergence: {
                    name: 'RSI Divergence',
                    type: 'reversal',
                    reliability: 0.8,
                    description: 'Price and RSI move in opposite directions',
                    rules: {
                        priceDirection: 'opposite',
                        rsiDirection: 'opposite'
                    }
                },
                macdCrossover: {
                    name: 'MACD Crossover',
                    type: 'momentum',
                    reliability: 0.75,
                    description: 'MACD line crosses signal line',
                    rules: {
                        crossover: true,
                        histogramConfirmation: true
                    }
                }
            }
        };
    }

    /**
     * Recognize patterns in extracted chart data
     */
    async recognizePatterns(chartData, elements, ohlcvData) {
        console.log('🔍 Starting pattern recognition...');

        const recognition = {
            timestamp: Date.now(),
            patterns: {
                candlestick: [],
                chart: [],
                indicator: []
            },
            confidence: 0,
            signals: [],
            metadata: {}
        };

        try {
            // Recognize candlestick patterns
            recognition.patterns.candlestick = await this.recognizeCandlestickPatterns(ohlcvData);

            // Recognize chart patterns
            recognition.patterns.chart = await this.recognizeChartPatterns(ohlcvData, elements);

            // Recognize indicator patterns
            recognition.patterns.indicator = await this.recognizeIndicatorPatterns(elements);

            // Calculate overall confidence
            recognition.confidence = this.calculatePatternConfidence(recognition.patterns);

            // Generate trading signals
            recognition.signals = this.generateSignalsFromPatterns(recognition.patterns);

            // Store recognition history
            this.recognitionHistory.push(recognition);
            if (this.recognitionHistory.length > 100) {
                this.recognitionHistory.shift();
            }

            console.log(`✅ Pattern recognition completed with ${(recognition.confidence * 100).toFixed(1)}% confidence`);
            console.log(`📊 Found ${recognition.patterns.candlestick.length} candlestick, ${recognition.patterns.chart.length} chart, ${recognition.patterns.indicator.length} indicator patterns`);

            return recognition;

        } catch (error) {
            console.error('❌ Pattern recognition failed:', error);
            throw new Error(`Pattern recognition failed: ${error.message}`);
        }
    }

    /**
     * Recognize candlestick patterns
     */
    async recognizeCandlestickPatterns(ohlcvData) {
        const patterns = [];

        if (!ohlcvData || ohlcvData.length < 2) {
            return patterns;
        }

        // Check each candlestick pattern
        for (const [patternName, patternDef] of Object.entries(this.patternDatabase.candlestickPatterns)) {
            const matches = this.findCandlestickPattern(ohlcvData, patternName, patternDef);
            patterns.push(...matches);
        }

        return patterns.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Find specific candlestick pattern in data
     */
    findCandlestickPattern(ohlcvData, patternName, patternDef) {
        const matches = [];
        const candleCount = patternDef.rules.candleCount || 1;

        for (let i = candleCount - 1; i < ohlcvData.length; i++) {
            const candles = ohlcvData.slice(i - candleCount + 1, i + 1);
            const match = this.matchCandlestickPattern(candles, patternDef);

            if (match.isMatch) {
                matches.push({
                    name: patternName,
                    type: patternDef.type,
                    confidence: match.confidence,
                    position: i,
                    candles: candles.length,
                    reliability: patternDef.reliability,
                    description: patternDef.description,
                    timestamp: candles[candles.length - 1].timestamp
                });
            }
        }

        return matches;
    }

    /**
     * Match candlestick pattern against rules
     */
    matchCandlestickPattern(candles, patternDef) {
        const match = { isMatch: false, confidence: 0, details: {} };

        try {
            const latestCandle = candles[candles.length - 1];
            const range = latestCandle.high - latestCandle.low;
            const body = Math.abs(latestCandle.close - latestCandle.open);
            const upperShadow = latestCandle.high - Math.max(latestCandle.open, latestCandle.close);
            const lowerShadow = Math.min(latestCandle.open, latestCandle.close) - latestCandle.low;

            let score = 0;
            let maxScore = 0;

            // Check body size rules
            if (patternDef.rules.bodySize) {
                maxScore++;
                const bodyRatio = body / range;
                if (patternDef.rules.bodySize.max && bodyRatio <= patternDef.rules.bodySize.max) {
                    score++;
                }
                if (patternDef.rules.bodySize.min && bodyRatio >= patternDef.rules.bodySize.min) {
                    score++;
                }
            }

            // Check shadow rules
            if (patternDef.rules.upperShadow) {
                maxScore++;
                const shadowRatio = upperShadow / body;
                if (patternDef.rules.upperShadow.min && shadowRatio >= patternDef.rules.upperShadow.min) {
                    score++;
                }
                if (patternDef.rules.upperShadow.max && shadowRatio <= patternDef.rules.upperShadow.max) {
                    score++;
                }
            }

            if (patternDef.rules.lowerShadow) {
                maxScore++;
                const shadowRatio = lowerShadow / body;
                if (patternDef.rules.lowerShadow.min && shadowRatio >= patternDef.rules.lowerShadow.min) {
                    score++;
                }
                if (patternDef.rules.lowerShadow.max && shadowRatio <= patternDef.rules.lowerShadow.max) {
                    score++;
                }
            }

            // Check engulfing pattern
            if (patternDef.rules.engulfment && candles.length >= 2) {
                maxScore++;
                const prev = candles[0];
                const curr = candles[1];
                
                if (curr.open < prev.close && curr.close > prev.open) {
                    score++; // Bullish engulfing
                } else if (curr.open > prev.close && curr.close < prev.open) {
                    score++; // Bearish engulfing
                }
            }

            match.confidence = maxScore > 0 ? score / maxScore : 0;
            match.isMatch = match.confidence >= this.config.minPatternConfidence;
            match.details = { score, maxScore, bodyRatio: body / range };

            return match;

        } catch (error) {
            console.warn(`Pattern matching error for ${patternDef.name}:`, error.message);
            return match;
        }
    }

    /**
     * Recognize chart patterns
     */
    async recognizeChartPatterns(ohlcvData, elements) {
        const patterns = [];

        // Analyze support and resistance levels
        const srPattern = this.findSupportResistancePattern(ohlcvData);
        if (srPattern) patterns.push(srPattern);

        // Analyze trend patterns
        const trendPattern = this.findTrendPattern(ohlcvData);
        if (trendPattern) patterns.push(trendPattern);

        return patterns;
    }

    /**
     * Find support and resistance patterns
     */
    findSupportResistancePattern(ohlcvData) {
        if (ohlcvData.length < 10) return null;

        const highs = ohlcvData.map(d => d.high);
        const lows = ohlcvData.map(d => d.low);
        const currentPrice = ohlcvData[ohlcvData.length - 1].close;

        // Find potential support/resistance levels
        const levels = this.findKeyLevels(highs, lows);
        const nearestLevel = this.findNearestLevel(currentPrice, levels);

        if (nearestLevel && Math.abs(currentPrice - nearestLevel.price) / currentPrice < 0.01) {
            return {
                name: 'Support/Resistance',
                type: nearestLevel.type,
                confidence: nearestLevel.strength,
                level: nearestLevel.price,
                distance: Math.abs(currentPrice - nearestLevel.price),
                touches: nearestLevel.touches,
                description: `${nearestLevel.type} level at ${nearestLevel.price.toFixed(5)}`
            };
        }

        return null;
    }

    /**
     * Find key support/resistance levels
     */
    findKeyLevels(highs, lows) {
        const levels = [];
        const tolerance = 0.001; // 0.1% tolerance

        // Find resistance levels from highs
        highs.forEach((high, index) => {
            const touches = highs.filter(h => Math.abs(h - high) / high < tolerance).length;
            if (touches >= 2) {
                levels.push({
                    price: high,
                    type: 'resistance',
                    touches,
                    strength: Math.min(touches / 5, 1) // Normalize to 0-1
                });
            }
        });

        // Find support levels from lows
        lows.forEach((low, index) => {
            const touches = lows.filter(l => Math.abs(l - low) / low < tolerance).length;
            if (touches >= 2) {
                levels.push({
                    price: low,
                    type: 'support',
                    touches,
                    strength: Math.min(touches / 5, 1) // Normalize to 0-1
                });
            }
        });

        return levels.sort((a, b) => b.strength - a.strength);
    }

    /**
     * Find nearest key level to current price
     */
    findNearestLevel(currentPrice, levels) {
        if (levels.length === 0) return null;

        return levels.reduce((nearest, level) => {
            const distance = Math.abs(currentPrice - level.price);
            const nearestDistance = Math.abs(currentPrice - nearest.price);
            return distance < nearestDistance ? level : nearest;
        });
    }

    /**
     * Find trend patterns
     */
    findTrendPattern(ohlcvData) {
        if (ohlcvData.length < 20) return null;

        const closes = ohlcvData.map(d => d.close);
        const trend = this.calculateTrend(closes);

        if (Math.abs(trend.slope) > 0.001 && trend.strength > 0.7) {
            return {
                name: 'Trend',
                type: trend.direction,
                confidence: trend.strength,
                slope: trend.slope,
                duration: ohlcvData.length,
                description: `${trend.direction} trend with ${(trend.strength * 100).toFixed(1)}% strength`
            };
        }

        return null;
    }

    /**
     * Calculate trend direction and strength
     */
    calculateTrend(prices) {
        const n = prices.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = prices.reduce((sum, price) => sum + price, 0);
        const sumXY = prices.reduce((sum, price, i) => sum + i * price, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared for trend strength
        const mean = sumY / n;
        const totalSumSquares = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
        const residualSumSquares = prices.reduce((sum, price, i) => {
            const predicted = slope * i + intercept;
            return sum + Math.pow(price - predicted, 2);
        }, 0);

        const rSquared = 1 - (residualSumSquares / totalSumSquares);

        return {
            slope,
            direction: slope > 0 ? 'uptrend' : 'downtrend',
            strength: Math.max(0, rSquared)
        };
    }

    /**
     * Recognize indicator patterns
     */
    async recognizeIndicatorPatterns(elements) {
        const patterns = [];

        // Analyze detected indicators
        if (elements.elements && elements.elements.indicators) {
            elements.elements.indicators.forEach(indicator => {
                if (indicator.type === 'rsi' && indicator.value) {
                    if (indicator.value > 70) {
                        patterns.push({
                            name: 'RSI Overbought',
                            type: 'bearish_signal',
                            confidence: 0.8,
                            value: indicator.value,
                            description: `RSI overbought at ${indicator.value}`
                        });
                    } else if (indicator.value < 30) {
                        patterns.push({
                            name: 'RSI Oversold',
                            type: 'bullish_signal',
                            confidence: 0.8,
                            value: indicator.value,
                            description: `RSI oversold at ${indicator.value}`
                        });
                    }
                }
            });
        }

        return patterns;
    }

    /**
     * Calculate overall pattern confidence
     */
    calculatePatternConfidence(patterns) {
        const weights = this.config.patternWeights;
        let totalConfidence = 0;
        let totalWeight = 0;

        // Weight by pattern type
        Object.entries(patterns).forEach(([type, patternList]) => {
            if (patternList.length > 0 && weights[type]) {
                const avgConfidence = patternList.reduce((sum, p) => sum + p.confidence, 0) / patternList.length;
                totalConfidence += avgConfidence * weights[type];
                totalWeight += weights[type];
            }
        });

        return totalWeight > 0 ? totalConfidence / totalWeight : 0;
    }

    /**
     * Generate trading signals from recognized patterns
     */
    generateSignalsFromPatterns(patterns) {
        const signals = [];

        // Analyze all patterns for signal generation
        const allPatterns = [
            ...patterns.candlestick,
            ...patterns.chart,
            ...patterns.indicator
        ];

        let bullishScore = 0;
        let bearishScore = 0;
        let totalWeight = 0;

        allPatterns.forEach(pattern => {
            const weight = pattern.confidence * (pattern.reliability || 0.7);
            totalWeight += weight;

            if (pattern.type.includes('bullish') || pattern.type === 'support') {
                bullishScore += weight;
            } else if (pattern.type.includes('bearish') || pattern.type === 'resistance') {
                bearishScore += weight;
            }
        });

        if (totalWeight > 0) {
            const bullishRatio = bullishScore / totalWeight;
            const bearishRatio = bearishScore / totalWeight;

            if (bullishRatio > 0.6) {
                signals.push({
                    direction: 'CALL',
                    confidence: bullishRatio,
                    strength: 'strong',
                    patterns: allPatterns.filter(p => p.type.includes('bullish') || p.type === 'support'),
                    reasoning: 'Multiple bullish patterns detected'
                });
            } else if (bearishRatio > 0.6) {
                signals.push({
                    direction: 'PUT',
                    confidence: bearishRatio,
                    strength: 'strong',
                    patterns: allPatterns.filter(p => p.type.includes('bearish') || p.type === 'resistance'),
                    reasoning: 'Multiple bearish patterns detected'
                });
            }
        }

        return signals;
    }

    /**
     * Get pattern recognition statistics
     */
    getRecognitionStats() {
        return {
            totalRecognitions: this.recognitionHistory.length,
            averageConfidence: this.recognitionHistory.length > 0 ?
                this.recognitionHistory.reduce((sum, r) => sum + r.confidence, 0) / this.recognitionHistory.length : 0,
            patternCounts: this.recognitionHistory.reduce((counts, r) => {
                counts.candlestick += r.patterns.candlestick.length;
                counts.chart += r.patterns.chart.length;
                counts.indicator += r.patterns.indicator.length;
                return counts;
            }, { candlestick: 0, chart: 0, indicator: 0 }),
            lastRecognition: this.recognitionHistory.length > 0 ?
                this.recognitionHistory[this.recognitionHistory.length - 1].timestamp : null
        };
    }
}

module.exports = { PatternRecognitionSystem };
