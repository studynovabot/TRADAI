/**
 * OTC Historical Data Matcher
 * 
 * Matches current chart patterns against historical OTC binary options data
 * to predict CALL/PUT signal outcomes with high accuracy.
 */

const { strictModeConfig } = require('../config/strict-mode');

class OTCHistoricalMatcher {
    constructor(config = {}) {
        this.config = {
            minSimilarity: config.minSimilarity || 0.8,
            maxHistoricalAge: config.maxHistoricalAge || 30 * 24 * 60 * 60 * 1000, // 30 days
            minHistoricalMatches: config.minHistoricalMatches || 10,
            patternWindow: config.patternWindow || 20, // Number of candles to analyze
            ...config
        };

        this.historicalDatabase = new Map();
        this.matchingHistory = [];
        this.performanceMetrics = {
            totalMatches: 0,
            successfulPredictions: 0,
            averageSimilarity: 0,
            lastUpdate: null
        };
    }

    /**
     * Store historical pattern with outcome
     */
    storeHistoricalPattern(patternData, outcome, metadata = {}) {
        if (!strictModeConfig.isStrictModeEnabled()) {
            console.warn('Historical pattern storage requires strict mode');
            return;
        }

        const patternId = this.generatePatternId(patternData);
        const historicalEntry = {
            id: patternId,
            timestamp: Date.now(),
            pattern: this.normalizePattern(patternData),
            outcome: outcome, // 'CALL_WIN', 'CALL_LOSS', 'PUT_WIN', 'PUT_LOSS'
            metadata: {
                symbol: metadata.symbol || 'UNKNOWN',
                timeframe: metadata.timeframe || '1m',
                tradeDuration: metadata.tradeDuration || 60,
                confidence: metadata.confidence || 0,
                ...metadata
            },
            features: this.extractPatternFeatures(patternData)
        };

        this.historicalDatabase.set(patternId, historicalEntry);

        // Clean old entries
        this.cleanOldHistoricalData();

        console.log(`📚 Stored historical pattern ${patternId} with outcome ${outcome}`);
    }

    /**
     * Find similar historical patterns for current chart data
     */
    async findSimilarPatterns(currentPattern, symbol, timeframe = '1m') {
        console.log(`🔍 Searching for similar patterns in historical database...`);

        if (this.historicalDatabase.size === 0) {
            throw new Error('No historical data available for pattern matching');
        }

        const normalizedCurrent = this.normalizePattern(currentPattern);
        const currentFeatures = this.extractPatternFeatures(currentPattern);
        const matches = [];

        // Search through historical database
        for (const [patternId, historicalEntry] of this.historicalDatabase) {
            // Filter by symbol and timeframe if specified
            if (symbol && historicalEntry.metadata.symbol !== symbol) continue;
            if (historicalEntry.metadata.timeframe !== timeframe) continue;

            // Calculate similarity
            const similarity = this.calculatePatternSimilarity(
                normalizedCurrent,
                historicalEntry.pattern,
                currentFeatures,
                historicalEntry.features
            );

            if (similarity >= this.config.minSimilarity) {
                matches.push({
                    patternId,
                    similarity,
                    outcome: historicalEntry.outcome,
                    timestamp: historicalEntry.timestamp,
                    metadata: historicalEntry.metadata,
                    age: Date.now() - historicalEntry.timestamp
                });
            }
        }

        // Sort by similarity (highest first)
        matches.sort((a, b) => b.similarity - a.similarity);

        console.log(`✅ Found ${matches.length} similar patterns with similarity >= ${this.config.minSimilarity}`);

        return {
            matches: matches.slice(0, 50), // Limit to top 50 matches
            totalFound: matches.length,
            searchCriteria: {
                symbol,
                timeframe,
                minSimilarity: this.config.minSimilarity
            }
        };
    }

    /**
     * Generate OTC signal prediction based on historical matches
     */
    async generateOTCPrediction(currentPattern, symbol, timeframe = '1m', tradeDuration = 60) {
        console.log(`🎯 Generating OTC prediction for ${symbol} ${timeframe}...`);

        try {
            // Find similar historical patterns
            const similarPatterns = await this.findSimilarPatterns(currentPattern, symbol, timeframe);

            if (similarPatterns.matches.length < this.config.minHistoricalMatches) {
                throw new Error(`Insufficient historical matches: ${similarPatterns.matches.length} < ${this.config.minHistoricalMatches}`);
            }

            // Analyze outcomes
            const outcomeAnalysis = this.analyzeOutcomes(similarPatterns.matches, tradeDuration);

            // Generate prediction
            const prediction = this.generatePredictionFromAnalysis(outcomeAnalysis, similarPatterns);

            // Store matching history
            this.matchingHistory.push({
                timestamp: Date.now(),
                symbol,
                timeframe,
                tradeDuration,
                matchCount: similarPatterns.matches.length,
                prediction,
                averageSimilarity: similarPatterns.matches.reduce((sum, m) => sum + m.similarity, 0) / similarPatterns.matches.length
            });

            // Update performance metrics
            this.updatePerformanceMetrics(similarPatterns.matches);

            console.log(`✅ OTC prediction generated: ${prediction.signal} with ${(prediction.confidence * 100).toFixed(1)}% confidence`);

            return prediction;

        } catch (error) {
            console.error(`❌ OTC prediction failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Normalize pattern data for comparison
     */
    normalizePattern(patternData) {
        if (!patternData || !Array.isArray(patternData) || patternData.length === 0) {
            throw new Error('Invalid pattern data for normalization');
        }

        // Take last N candles for pattern
        const candles = patternData.slice(-this.config.patternWindow);
        
        // Normalize prices relative to first candle
        const basePrice = candles[0].close;
        
        return candles.map(candle => ({
            open: (candle.open - basePrice) / basePrice,
            high: (candle.high - basePrice) / basePrice,
            low: (candle.low - basePrice) / basePrice,
            close: (candle.close - basePrice) / basePrice,
            volume: candle.volume || 0,
            timestamp: candle.timestamp
        }));
    }

    /**
     * Extract features from pattern for similarity calculation
     */
    extractPatternFeatures(patternData) {
        const candles = patternData.slice(-this.config.patternWindow);
        
        if (candles.length === 0) {
            return {};
        }

        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume || 0);

        return {
            // Price movement features
            totalReturn: (closes[closes.length - 1] - closes[0]) / closes[0],
            volatility: this.calculateVolatility(closes),
            trend: this.calculateTrend(closes),
            
            // Pattern shape features
            highestHigh: Math.max(...highs),
            lowestLow: Math.min(...lows),
            priceRange: Math.max(...highs) - Math.min(...lows),
            
            // Volume features
            averageVolume: volumes.reduce((sum, v) => sum + v, 0) / volumes.length,
            volumeTrend: this.calculateTrend(volumes),
            
            // Candlestick features
            bullishCandles: candles.filter(c => c.close > c.open).length,
            bearishCandles: candles.filter(c => c.close < c.open).length,
            dojiCandles: candles.filter(c => Math.abs(c.close - c.open) / (c.high - c.low) < 0.1).length,
            
            // Technical features
            momentum: this.calculateMomentum(closes),
            rsi: this.calculateSimpleRSI(closes),
            support: this.findSupportLevel(lows),
            resistance: this.findResistanceLevel(highs)
        };
    }

    /**
     * Calculate pattern similarity between current and historical patterns
     */
    calculatePatternSimilarity(pattern1, pattern2, features1, features2) {
        if (pattern1.length !== pattern2.length) {
            return 0;
        }

        let totalSimilarity = 0;
        let weights = {
            priceShape: 0.4,
            features: 0.6
        };

        // Price shape similarity (DTW-like comparison)
        const priceShapeSimilarity = this.calculatePriceShapeSimilarity(pattern1, pattern2);
        totalSimilarity += priceShapeSimilarity * weights.priceShape;

        // Feature similarity
        const featureSimilarity = this.calculateFeatureSimilarity(features1, features2);
        totalSimilarity += featureSimilarity * weights.features;

        return Math.max(0, Math.min(1, totalSimilarity));
    }

    /**
     * Calculate price shape similarity
     */
    calculatePriceShapeSimilarity(pattern1, pattern2) {
        let similarity = 0;
        const length = pattern1.length;

        for (let i = 0; i < length; i++) {
            const p1 = pattern1[i];
            const p2 = pattern2[i];

            // Compare normalized price movements
            const closeDiff = Math.abs(p1.close - p2.close);
            const highDiff = Math.abs(p1.high - p2.high);
            const lowDiff = Math.abs(p1.low - p2.low);

            const candleSimilarity = 1 - (closeDiff + highDiff + lowDiff) / 3;
            similarity += Math.max(0, candleSimilarity);
        }

        return similarity / length;
    }

    /**
     * Calculate feature similarity
     */
    calculateFeatureSimilarity(features1, features2) {
        const featureKeys = Object.keys(features1).filter(key => 
            typeof features1[key] === 'number' && typeof features2[key] === 'number'
        );

        if (featureKeys.length === 0) return 0;

        let totalSimilarity = 0;

        featureKeys.forEach(key => {
            const val1 = features1[key];
            const val2 = features2[key];
            
            // Normalize difference to 0-1 scale
            const maxVal = Math.max(Math.abs(val1), Math.abs(val2), 1);
            const similarity = 1 - Math.abs(val1 - val2) / maxVal;
            totalSimilarity += Math.max(0, similarity);
        });

        return totalSimilarity / featureKeys.length;
    }

    /**
     * Analyze outcomes from similar patterns
     */
    analyzeOutcomes(matches, tradeDuration) {
        const analysis = {
            totalMatches: matches.length,
            outcomes: {
                CALL_WIN: 0,
                CALL_LOSS: 0,
                PUT_WIN: 0,
                PUT_LOSS: 0
            },
            weightedOutcomes: {
                CALL_WIN: 0,
                CALL_LOSS: 0,
                PUT_WIN: 0,
                PUT_LOSS: 0
            },
            averageSimilarity: 0,
            confidenceFactors: {}
        };

        let totalWeight = 0;

        matches.forEach(match => {
            // Count outcomes
            analysis.outcomes[match.outcome]++;
            
            // Weight by similarity and recency
            const ageWeight = this.calculateAgeWeight(match.age);
            const weight = match.similarity * ageWeight;
            
            analysis.weightedOutcomes[match.outcome] += weight;
            totalWeight += weight;
            analysis.averageSimilarity += match.similarity;
        });

        analysis.averageSimilarity /= matches.length;

        // Normalize weighted outcomes
        if (totalWeight > 0) {
            Object.keys(analysis.weightedOutcomes).forEach(outcome => {
                analysis.weightedOutcomes[outcome] /= totalWeight;
            });
        }

        // Calculate confidence factors
        analysis.confidenceFactors = {
            sampleSize: Math.min(matches.length / 50, 1), // More samples = higher confidence
            similarity: analysis.averageSimilarity,
            consistency: this.calculateOutcomeConsistency(analysis.outcomes),
            recency: this.calculateRecencyFactor(matches)
        };

        return analysis;
    }

    /**
     * Generate prediction from outcome analysis
     */
    generatePredictionFromAnalysis(analysis, similarPatterns) {
        const callWinRate = (analysis.weightedOutcomes.CALL_WIN || 0);
        const putWinRate = (analysis.weightedOutcomes.PUT_WIN || 0);
        
        const callTotalRate = callWinRate + (analysis.weightedOutcomes.CALL_LOSS || 0);
        const putTotalRate = putWinRate + (analysis.weightedOutcomes.PUT_LOSS || 0);

        let signal, confidence, reasoning;

        if (callWinRate > putWinRate && callWinRate > 0.6) {
            signal = 'CALL';
            confidence = callWinRate;
            reasoning = `Historical CALL win rate: ${(callWinRate * 100).toFixed(1)}%`;
        } else if (putWinRate > callWinRate && putWinRate > 0.6) {
            signal = 'PUT';
            confidence = putWinRate;
            reasoning = `Historical PUT win rate: ${(putWinRate * 100).toFixed(1)}%`;
        } else {
            signal = 'NO_SIGNAL';
            confidence = 0.5;
            reasoning = 'Insufficient historical edge detected';
        }

        // Adjust confidence based on confidence factors
        const confidenceMultiplier = Object.values(analysis.confidenceFactors)
            .reduce((product, factor) => product * factor, 1);
        
        confidence *= confidenceMultiplier;

        return {
            signal,
            confidence: Math.max(0, Math.min(1, confidence)),
            reasoning,
            analysis: {
                historicalMatches: analysis.totalMatches,
                averageSimilarity: analysis.averageSimilarity,
                callWinRate: callWinRate,
                putWinRate: putWinRate,
                confidenceFactors: analysis.confidenceFactors
            },
            metadata: {
                generatedAt: Date.now(),
                strictMode: strictModeConfig.isStrictModeEnabled(),
                dataSource: 'historical_matching'
            }
        };
    }

    // Utility calculation methods
    calculateVolatility(prices) {
        if (prices.length < 2) return 0;
        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((sum, val) => sum + val, 0);
        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        const denominator = n * sumX2 - sumX * sumX;
        return denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
    }

    calculateMomentum(prices) {
        if (prices.length < 10) return 0;
        const recent = prices.slice(-5);
        const older = prices.slice(-10, -5);
        const recentAvg = recent.reduce((sum, p) => sum + p, 0) / recent.length;
        const olderAvg = older.reduce((sum, p) => sum + p, 0) / older.length;
        return (recentAvg - olderAvg) / olderAvg;
    }

    calculateSimpleRSI(prices) {
        if (prices.length < 14) return 50;
        const gains = [];
        const losses = [];
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i-1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        const avgGain = gains.slice(-14).reduce((sum, g) => sum + g, 0) / 14;
        const avgLoss = losses.slice(-14).reduce((sum, l) => sum + l, 0) / 14;
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    findSupportLevel(lows) {
        return Math.min(...lows);
    }

    findResistanceLevel(highs) {
        return Math.max(...highs);
    }

    calculateAgeWeight(age) {
        const maxAge = this.config.maxHistoricalAge;
        return Math.max(0, 1 - (age / maxAge));
    }

    calculateOutcomeConsistency(outcomes) {
        const total = Object.values(outcomes).reduce((sum, count) => sum + count, 0);
        if (total === 0) return 0;
        const maxOutcome = Math.max(...Object.values(outcomes));
        return maxOutcome / total;
    }

    calculateRecencyFactor(matches) {
        const avgAge = matches.reduce((sum, m) => sum + m.age, 0) / matches.length;
        return this.calculateAgeWeight(avgAge);
    }

    generatePatternId(patternData) {
        const hash = require('crypto').createHash('md5');
        hash.update(JSON.stringify(patternData.slice(-5))); // Use last 5 candles for ID
        return hash.digest('hex').substring(0, 16);
    }

    cleanOldHistoricalData() {
        const cutoffTime = Date.now() - this.config.maxHistoricalAge;
        for (const [patternId, entry] of this.historicalDatabase) {
            if (entry.timestamp < cutoffTime) {
                this.historicalDatabase.delete(patternId);
            }
        }
    }

    updatePerformanceMetrics(matches) {
        this.performanceMetrics.totalMatches += matches.length;
        this.performanceMetrics.averageSimilarity = 
            (this.performanceMetrics.averageSimilarity + 
             matches.reduce((sum, m) => sum + m.similarity, 0) / matches.length) / 2;
        this.performanceMetrics.lastUpdate = Date.now();
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            historicalDataSize: this.historicalDatabase.size,
            matchingHistorySize: this.matchingHistory.length
        };
    }
}

module.exports = { OTCHistoricalMatcher };
