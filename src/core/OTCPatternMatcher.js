/**
 * OTC Pattern Matcher
 * 
 * Specialized engine for OTC weekend trading that:
 * 1. Captures current market patterns from broker charts
 * 2. Matches them against historical patterns from weekday trading
 * 3. Predicts next candle direction based on historical similarity
 * 4. Provides confidence scores and reasoning for predictions
 */

const fs = require('fs-extra');
const path = require('path');
const { OTCHistoricalDataCollector } = require('../../utils/otc-historical-data');

// Mock Logger and TechnicalIndicators for testing
class Logger {
  static getInstanceSync() {
    return new Logger();
  }
  
  info(message) { console.log(`[INFO] ${message}`); }
  warn(message) { console.log(`[WARN] ${message}`); }
  error(message) { console.log(`[ERROR] ${message}`); }
  debug(message) { console.log(`[DEBUG] ${message}`); }
}

class TechnicalIndicators {
  calculateEMA(data, period) { return data.map(() => Math.random()); }
  calculateRSI(data, period) { return data.map(() => Math.random() * 100); }
  calculateMACD(data) { 
    return {
      MACD: data.map(() => Math.random()),
      signal: data.map(() => Math.random()),
      histogram: data.map(() => Math.random())
    };
  }
  calculateBollingerBands(data, period, stdDev) {
    return {
      upper: data.map(d => d * 1.1),
      middle: [...data],
      lower: data.map(d => d * 0.9)
    };
  }
  calculateATR(highs, lows, closes, period) { return highs.map(() => Math.random()); }
  calculateStochastic(highs, lows, closes, period) { return closes.map(() => Math.random() * 100); }
}

class OTCPatternMatcher {
    constructor(config = {}) {
        this.logger = Logger.getInstanceSync();
        this.config = config;
        
        // Initialize components
        this.indicators = new TechnicalIndicators();
        
        // Initialize historical data collector
        this.historicalData = new OTCHistoricalDataCollector({
            dataDir: path.join(process.cwd(), 'data', 'otc')
        });
        
        // Pattern matching configuration
        this.matchingConfig = {
            minSimilarityScore: 80, // Minimum similarity score (0-100)
            minHistoricalMatches: 3, // Minimum number of matches required
            lookbackCandles: 10,     // Number of candles to use for pattern matching
            indicatorsToMatch: [     // Indicators to include in pattern matching
                'rsi', 'macd', 'bollinger', 'ema'
            ],
            patternFeatures: [       // Features to extract for pattern matching
                'candleShape',       // Candle body and shadow proportions
                'priceAction',       // Price movement patterns
                'volumeProfile',     // Volume characteristics
                'indicatorReadings', // Technical indicator values
                'supportResistance'  // Key levels
            ],
            similarityMethod: 'cosine', // Similarity calculation method
            confidenceThreshold: 75     // Minimum confidence for signal generation
        };
        
        // Historical pattern database
        this.patternDatabase = {
            patterns: [],
            lastUpdated: null,
            assetSpecific: new Map(), // Patterns by asset
            timeframeSpecific: new Map() // Patterns by timeframe
        };
        
        this.logger.info('OTC Pattern Matcher initialized');
        
        // Load historical patterns
        this.loadPatternDatabase();
    }
    
    /**
     * Load historical pattern database from disk
     */
    async loadPatternDatabase() {
        try {
            const dbPath = path.join(process.cwd(), 'data', 'otc_pattern_database.json');
            
            if (await fs.pathExists(dbPath)) {
                const data = await fs.readJson(dbPath);
                this.patternDatabase.patterns = data.patterns || [];
                this.patternDatabase.lastUpdated = data.lastUpdated;
                
                // Organize patterns by asset and timeframe for faster lookup
                this.organizePatternDatabase();
                
                this.logger.info(`Loaded ${this.patternDatabase.patterns.length} historical patterns from database`);
            } else {
                this.logger.warn('Pattern database not found, will create new one');
                await this.initializeEmptyDatabase();
            }
        } catch (error) {
            this.logger.error(`Failed to load pattern database: ${error.message}`);
            await this.initializeEmptyDatabase();
        }
    }
    
    /**
     * Initialize an empty pattern database
     */
    async initializeEmptyDatabase() {
        this.patternDatabase = {
            patterns: [],
            lastUpdated: new Date().toISOString(),
            assetSpecific: new Map(),
            timeframeSpecific: new Map()
        };
        
        // Save empty database
        await this.savePatternDatabase();
    }
    
    /**
     * Save pattern database to disk
     */
    async savePatternDatabase() {
        try {
            const dbPath = path.join(process.cwd(), 'data', 'otc_pattern_database.json');
            await fs.ensureDir(path.dirname(dbPath));
            
            await fs.writeJson(dbPath, {
                patterns: this.patternDatabase.patterns,
                lastUpdated: new Date().toISOString(),
                totalPatterns: this.patternDatabase.patterns.length,
                metadata: {
                    version: '1.0',
                    description: 'OTC Pattern Database for weekend trading'
                }
            }, { spaces: 2 });
            
            this.logger.info(`Saved ${this.patternDatabase.patterns.length} patterns to database`);
        } catch (error) {
            this.logger.error(`Failed to save pattern database: ${error.message}`);
        }
    }
    
    /**
     * Organize patterns by asset and timeframe for faster lookup
     */
    organizePatternDatabase() {
        // Clear existing maps
        this.patternDatabase.assetSpecific = new Map();
        this.patternDatabase.timeframeSpecific = new Map();
        
        // Organize by asset
        for (const pattern of this.patternDatabase.patterns) {
            // By asset
            if (!this.patternDatabase.assetSpecific.has(pattern.asset)) {
                this.patternDatabase.assetSpecific.set(pattern.asset, []);
            }
            this.patternDatabase.assetSpecific.get(pattern.asset).push(pattern);
            
            // By timeframe
            if (!this.patternDatabase.timeframeSpecific.has(pattern.timeframe)) {
                this.patternDatabase.timeframeSpecific.set(pattern.timeframe, []);
            }
            this.patternDatabase.timeframeSpecific.get(pattern.timeframe).push(pattern);
        }
    }
    
    /**
     * Match current market data against historical patterns
     * @param {Object} marketData - Current market data
     * @param {string} asset - Asset symbol (e.g., 'EUR/USD')
     * @param {string} timeframe - Timeframe (e.g., '1M', '5M')
     * @returns {Promise<Object>} - Matching results with predictions
     */
    async findMatchingPatterns(marketData, asset, timeframe) {
        this.logger.info(`Finding matching patterns for ${asset} ${timeframe}`);
        
        try {
            // Extract candles from market data
            const candles = this.extractCandles(marketData, timeframe);
            
            if (!candles || candles.length < this.matchingConfig.lookbackCandles) {
                throw new Error(`Insufficient candle data for pattern matching (need at least ${this.matchingConfig.lookbackCandles} candles)`);
            }
            
            // Calculate technical indicators for current data
            const indicators = await this.calculateIndicators(candles);
            
            // Extract pattern features
            const currentPattern = this.extractPatternFeatures(candles, indicators, asset, timeframe);
            
            // Find matching patterns in database
            const matches = await this.findSimilarPatterns(currentPattern, asset, timeframe);
            
            // Generate prediction based on matches
            const prediction = this.generatePrediction(matches, currentPattern);
            
            return {
                currentPattern,
                matches,
                prediction,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            this.logger.error(`Pattern matching failed: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Extract candles from market data for a specific timeframe
     */
    extractCandles(marketData, timeframe) {
        // Check if we have data for this timeframe
        if (marketData.combined && marketData.combined[timeframe]) {
            return marketData.combined[timeframe];
        }
        
        // Try realtime data
        if (marketData.realtime && marketData.realtime[timeframe]) {
            return marketData.realtime[timeframe];
        }
        
        // No data found for this timeframe
        return null;
    }
    
    /**
     * Calculate technical indicators for candle data
     */
    async calculateIndicators(candles) {
        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume || 0);
        
        const indicators = {};
        
        try {
            // Moving averages
            indicators.ema20 = this.indicators.calculateEMA(closes, 20);
            indicators.ema50 = this.indicators.calculateEMA(closes, 50);
            
            // Momentum indicators
            indicators.rsi = this.indicators.calculateRSI(closes, 14);
            indicators.macd = this.indicators.calculateMACD(closes);
            indicators.stochastic = this.indicators.calculateStochastic(highs, lows, closes, 14);
            
            // Volatility indicators
            indicators.bollinger = this.indicators.calculateBollingerBands(closes, 20, 2);
            indicators.atr = this.indicators.calculateATR(highs, lows, closes, 14);
            
            // Current values (last values from arrays)
            indicators.current = {
                price: closes[closes.length - 1],
                rsi: indicators.rsi[indicators.rsi.length - 1],
                macd: {
                    macd: indicators.macd.MACD[indicators.macd.MACD.length - 1],
                    signal: indicators.macd.signal[indicators.macd.signal.length - 1],
                    histogram: indicators.macd.histogram[indicators.macd.histogram.length - 1]
                },
                ema20: indicators.ema20[indicators.ema20.length - 1],
                ema50: indicators.ema50[indicators.ema50.length - 1],
                bollinger: {
                    upper: indicators.bollinger.upper[indicators.bollinger.upper.length - 1],
                    middle: indicators.bollinger.middle[indicators.bollinger.middle.length - 1],
                    lower: indicators.bollinger.lower[indicators.bollinger.lower.length - 1]
                }
            };
            
        } catch (error) {
            this.logger.warn(`Indicator calculation error: ${error.message}`);
        }
        
        return indicators;
    }
    
    /**
     * Extract pattern features from candle data and indicators
     */
    extractPatternFeatures(candles, indicators, asset, timeframe) {
        // Use only the most recent candles for pattern matching
        const recentCandles = candles.slice(-this.matchingConfig.lookbackCandles);
        
        // Extract candle shape features
        const candleShapes = recentCandles.map(candle => {
            const bodySize = Math.abs(candle.close - candle.open);
            const totalRange = candle.high - candle.low;
            const upperShadow = candle.high - Math.max(candle.open, candle.close);
            const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
            const isBullish = candle.close > candle.open;
            
            return {
                bodySize,
                totalRange,
                upperShadow,
                lowerShadow,
                bodyToRangeRatio: totalRange > 0 ? bodySize / totalRange : 0,
                upperShadowRatio: totalRange > 0 ? upperShadow / totalRange : 0,
                lowerShadowRatio: totalRange > 0 ? lowerShadow / totalRange : 0,
                isBullish
            };
        });
        
        // Extract price action features
        const priceAction = {
            trend: this.detectTrend(recentCandles),
            volatility: this.calculateVolatility(recentCandles),
            momentum: this.calculateMomentum(recentCandles),
            swingPoints: this.findSwingPoints(recentCandles)
        };
        
        // Extract indicator features
        const indicatorFeatures = {
            rsi: indicators.current.rsi,
            macd: indicators.current.macd,
            ema: {
                ema20: indicators.current.ema20,
                ema50: indicators.current.ema50,
                relation: indicators.current.ema20 > indicators.current.ema50 ? 'bullish' : 'bearish'
            },
            bollinger: {
                width: (indicators.current.bollinger.upper - indicators.current.bollinger.lower) / indicators.current.bollinger.middle,
                position: this.calculateBollingerPosition(indicators.current)
            }
        };
        
        // Detect candlestick patterns
        const candlestickPatterns = this.detectCandlestickPatterns(recentCandles);
        
        // Create pattern object
        return {
            asset,
            timeframe,
            timestamp: new Date().toISOString(),
            candles: recentCandles,
            candleShapes,
            priceAction,
            indicators: indicatorFeatures,
            candlestickPatterns,
            vectorized: this.vectorizePattern(candleShapes, priceAction, indicatorFeatures, candlestickPatterns)
        };
    }
    
    /**
     * Detect trend direction from candle data
     */
    detectTrend(candles) {
        const closes = candles.map(c => c.close);
        
        // Simple linear regression
        const n = closes.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += closes[i];
            sumXY += i * closes[i];
            sumX2 += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        
        // Determine trend strength and direction
        const trendStrength = Math.abs(slope) / (closes[0] * 0.01); // Normalized to percentage
        
        let direction;
        if (trendStrength < 0.1) {
            direction = 'SIDEWAYS';
        } else if (slope > 0) {
            direction = 'BULLISH';
        } else {
            direction = 'BEARISH';
        }
        
        return {
            direction,
            strength: trendStrength,
            slope
        };
    }
    
    /**
     * Calculate price volatility
     */
    calculateVolatility(candles) {
        const closes = candles.map(c => c.close);
        const returns = [];
        
        for (let i = 1; i < closes.length; i++) {
            returns.push((closes[i] - closes[i-1]) / closes[i-1]);
        }
        
        // Calculate standard deviation of returns
        const mean = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const variance = returns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        
        // Annualized volatility (approximation)
        const annualizedVolatility = stdDev * Math.sqrt(365 * 24 * 60 / 5); // Assuming 5-minute candles
        
        return {
            stdDev,
            annualized: annualizedVolatility
        };
    }
    
    /**
     * Calculate price momentum
     */
    calculateMomentum(candles) {
        const closes = candles.map(c => c.close);
        
        // Rate of change (ROC)
        const periods = [5, 10];
        const roc = {};
        
        for (const period of periods) {
            if (closes.length > period) {
                roc[period] = (closes[closes.length - 1] - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period] * 100;
            }
        }
        
        return {
            roc,
            direction: roc[5] > 0 ? 'bullish' : 'bearish',
            strength: Math.abs(roc[5] || 0)
        };
    }
    
    /**
     * Find swing high and low points
     */
    findSwingPoints(candles) {
        const swingPoints = {
            highs: [],
            lows: []
        };
        
        const lookback = 2; // Number of candles to look on each side
        
        for (let i = lookback; i < candles.length - lookback; i++) {
            const current = candles[i];
            
            // Check for swing high
            let isSwingHigh = true;
            for (let j = i - lookback; j < i; j++) {
                if (candles[j].high >= current.high) {
                    isSwingHigh = false;
                    break;
                }
            }
            
            for (let j = i + 1; j <= i + lookback; j++) {
                if (candles[j].high >= current.high) {
                    isSwingHigh = false;
                    break;
                }
            }
            
            if (isSwingHigh) {
                swingPoints.highs.push({
                    index: i,
                    price: current.high,
                    timestamp: current.timestamp
                });
            }
            
            // Check for swing low
            let isSwingLow = true;
            for (let j = i - lookback; j < i; j++) {
                if (candles[j].low <= current.low) {
                    isSwingLow = false;
                    break;
                }
            }
            
            for (let j = i + 1; j <= i + lookback; j++) {
                if (candles[j].low <= current.low) {
                    isSwingLow = false;
                    break;
                }
            }
            
            if (isSwingLow) {
                swingPoints.lows.push({
                    index: i,
                    price: current.low,
                    timestamp: current.timestamp
                });
            }
        }
        
        return swingPoints;
    }
    
    /**
     * Calculate position relative to Bollinger Bands
     */
    calculateBollingerPosition(current) {
        const price = current.price;
        const upper = current.bollinger.upper;
        const lower = current.bollinger.lower;
        const middle = current.bollinger.middle;
        
        // Calculate position as percentage between lower and upper bands
        const range = upper - lower;
        const position = range !== 0 ? (price - lower) / range : 0.5;
        
        let zone;
        if (position > 0.8) zone = 'upper_extreme';
        else if (position > 0.6) zone = 'upper';
        else if (position < 0.2) zone = 'lower_extreme';
        else if (position < 0.4) zone = 'lower';
        else zone = 'middle';
        
        return {
            value: position,
            zone,
            aboveMiddle: price > middle
        };
    }
    
    /**
     * Detect candlestick patterns
     */
    detectCandlestickPatterns(candles) {
        if (candles.length < 3) return { bullish: [], bearish: [] };
        
        const patterns = {
            bullish: [],
            bearish: []
        };
        
        // Check last 3 candles for patterns
        const last3 = candles.slice(-3);
        
        // Bullish patterns
        if (this.isBullishEngulfing(last3[1], last3[2])) {
            patterns.bullish.push({ type: 'bullish_engulfing', strength: 0.8 });
        }
        
        if (this.isHammer(last3[2])) {
            patterns.bullish.push({ type: 'hammer', strength: 0.6 });
        }
        
        if (this.isMorningStar(last3[0], last3[1], last3[2])) {
            patterns.bullish.push({ type: 'morning_star', strength: 0.9 });
        }
        
        // Bearish patterns
        if (this.isBearishEngulfing(last3[1], last3[2])) {
            patterns.bearish.push({ type: 'bearish_engulfing', strength: 0.8 });
        }
        
        if (this.isShootingStar(last3[2])) {
            patterns.bearish.push({ type: 'shooting_star', strength: 0.6 });
        }
        
        if (this.isEveningStar(last3[0], last3[1], last3[2])) {
            patterns.bearish.push({ type: 'evening_star', strength: 0.9 });
        }
        
        return patterns;
    }
    
    /**
     * Vectorize pattern features for similarity comparison
     */
    vectorizePattern(candleShapes, priceAction, indicators, candlestickPatterns) {
        const vector = [];
        
        // Add candle shape features
        for (const shape of candleShapes) {
            vector.push(
                shape.bodyToRangeRatio,
                shape.upperShadowRatio,
                shape.lowerShadowRatio,
                shape.isBullish ? 1 : -1
            );
        }
        
        // Add price action features
        vector.push(
            priceAction.trend.direction === 'BULLISH' ? 1 : (priceAction.trend.direction === 'BEARISH' ? -1 : 0),
            priceAction.trend.strength,
            priceAction.volatility.stdDev,
            priceAction.momentum.roc[5] || 0,
            priceAction.momentum.roc[10] || 0
        );
        
        // Add indicator features
        vector.push(
            indicators.rsi / 100, // Normalize RSI to 0-1
            indicators.macd.macd,
            indicators.macd.histogram,
            indicators.ema.relation === 'bullish' ? 1 : -1,
            indicators.bollinger.width,
            indicators.bollinger.position.value
        );
        
        // Add candlestick pattern features
        const bullishPatternStrength = candlestickPatterns.bullish.reduce((sum, p) => sum + p.strength, 0);
        const bearishPatternStrength = candlestickPatterns.bearish.reduce((sum, p) => sum + p.strength, 0);
        vector.push(bullishPatternStrength, bearishPatternStrength);
        
        return vector;
    }
    
    /**
     * Find similar patterns in the database
     */
    async findSimilarPatterns(currentPattern, asset, timeframe) {
        // Get relevant patterns from database
        let candidatePatterns = [];
        
        // First try asset and timeframe specific patterns
        if (this.patternDatabase.assetSpecific.has(asset)) {
            const assetPatterns = this.patternDatabase.assetSpecific.get(asset);
            candidatePatterns = assetPatterns.filter(p => p.timeframe === timeframe);
        }
        
        // Get historical OTC data for this asset and timeframe
        const historicalData = await this.getHistoricalOTCData(asset, timeframe);
        
        // Add patterns from historical data
        if (historicalData && historicalData.candles && historicalData.candles.length > 0) {
            const historicalPatterns = await this.createPatternsFromHistoricalData(
                historicalData.candles, 
                asset, 
                timeframe
            );
            
            if (historicalPatterns.length > 0) {
                this.logger.info(`Added ${historicalPatterns.length} patterns from historical OTC data`);
                
                // Add historical patterns to candidate patterns
                for (const pattern of historicalPatterns) {
                    if (!candidatePatterns.some(p => p.id === pattern.id)) {
                        candidatePatterns.push(pattern);
                    }
                }
            }
        }
        
        // If not enough patterns, include all patterns for this timeframe
        if (candidatePatterns.length < 20 && this.patternDatabase.timeframeSpecific.has(timeframe)) {
            const timeframePatterns = this.patternDatabase.timeframeSpecific.get(timeframe);
            
            // Add patterns not already included
            for (const pattern of timeframePatterns) {
                if (pattern.asset !== asset && !candidatePatterns.some(p => p.id === pattern.id)) {
                    candidatePatterns.push(pattern);
                }
            }
        }
        
        // If still not enough patterns, include all patterns
        if (candidatePatterns.length < 20) {
            for (const pattern of this.patternDatabase.patterns) {
                if (!candidatePatterns.some(p => p.id === pattern.id)) {
                    candidatePatterns.push(pattern);
                }
            }
        }
        
        // Calculate similarity scores
        const scoredPatterns = candidatePatterns.map(pattern => {
            const similarityScore = this.calculateSimilarity(
                currentPattern.vectorized,
                pattern.vectorized
            );
            
            return {
                ...pattern,
                similarityScore
            };
        });
        
        // Sort by similarity score (descending)
        scoredPatterns.sort((a, b) => b.similarityScore - a.similarityScore);
        
        // Return top matches
        const topMatches = scoredPatterns
            .filter(p => p.similarityScore >= this.matchingConfig.minSimilarityScore)
            .slice(0, 10);
        
        return {
            matches: topMatches,
            totalCandidates: candidatePatterns.length,
            matchCount: topMatches.length,
            highestScore: topMatches.length > 0 ? topMatches[0].similarityScore : 0,
            averageScore: topMatches.length > 0 
                ? topMatches.reduce((sum, p) => sum + p.similarityScore, 0) / topMatches.length 
                : 0
        };
    }
    
    /**
     * Calculate similarity between two pattern vectors
     */
    calculateSimilarity(vector1, vector2) {
        // Ensure vectors are the same length
        const minLength = Math.min(vector1.length, vector2.length);
        const v1 = vector1.slice(0, minLength);
        const v2 = vector2.slice(0, minLength);
        
        // Use cosine similarity
        let dotProduct = 0;
        let magnitude1 = 0;
        let magnitude2 = 0;
        
        for (let i = 0; i < minLength; i++) {
            dotProduct += v1[i] * v2[i];
            magnitude1 += v1[i] * v1[i];
            magnitude2 += v2[i] * v2[i];
        }
        
        magnitude1 = Math.sqrt(magnitude1);
        magnitude2 = Math.sqrt(magnitude2);
        
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        
        const similarity = dotProduct / (magnitude1 * magnitude2);
        
        // Convert to percentage (0-100)
        return Math.round((similarity + 1) / 2 * 100);
    }
    
    /**
     * Generate prediction based on matching patterns
     */
    generatePrediction(matches, currentPattern) {
        if (!matches.matches || matches.matches.length === 0) {
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                reason: 'No matching patterns found'
            };
        }
        
        // Check if we have enough matches
        if (matches.matches.length < this.matchingConfig.minHistoricalMatches) {
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                reason: `Insufficient matches (${matches.matches.length}/${this.matchingConfig.minHistoricalMatches} required)`
            };
        }
        
        // Count outcomes from matching patterns
        let bullishCount = 0;
        let bearishCount = 0;
        
        for (const match of matches.matches) {
            if (match.outcome === 'bullish') {
                bullishCount++;
            } else if (match.outcome === 'bearish') {
                bearishCount++;
            }
        }
        
        const totalMatches = matches.matches.length;
        const bullishPercentage = (bullishCount / totalMatches) * 100;
        const bearishPercentage = (bearishCount / totalMatches) * 100;
        
        // Determine direction based on majority
        let direction, confidence, reason;
        
        if (bullishPercentage >= this.matchingConfig.confidenceThreshold) {
            direction = 'BUY';
            confidence = bullishPercentage;
            reason = `${bullishCount}/${totalMatches} similar patterns resulted in bullish movement`;
        } else if (bearishPercentage >= this.matchingConfig.confidenceThreshold) {
            direction = 'SELL';
            confidence = bearishPercentage;
            reason = `${bearishCount}/${totalMatches} similar patterns resulted in bearish movement`;
        } else {
            direction = 'NO_SIGNAL';
            confidence = Math.max(bullishPercentage, bearishPercentage);
            reason = 'No clear directional bias in matching patterns';
        }
        
        // Add pattern-specific reasoning
        const patternReason = this.generatePatternReason(currentPattern);
        if (patternReason) {
            reason += '. ' + patternReason;
        }
        
        // Add top match details
        if (matches.matches.length > 0) {
            const topMatch = matches.matches[0];
            reason += `. Best match (${topMatch.similarityScore}% similarity) from ${new Date(topMatch.timestamp).toLocaleDateString()}`;
        }
        
        return {
            direction,
            confidence: Math.round(confidence),
            reason,
            bullishPercentage: Math.round(bullishPercentage),
            bearishPercentage: Math.round(bearishPercentage),
            matchCount: totalMatches,
            averageSimilarity: matches.averageScore
        };
    }
    
    /**
     * Generate reason based on current pattern
     */
    generatePatternReason(currentPattern) {
        const reasons = [];
        
        // Add trend reason
        if (currentPattern.priceAction.trend.direction === 'BULLISH') {
            reasons.push(`Bullish trend detected (strength: ${currentPattern.priceAction.trend.strength.toFixed(2)})`);
        } else if (currentPattern.priceAction.trend.direction === 'BEARISH') {
            reasons.push(`Bearish trend detected (strength: ${currentPattern.priceAction.trend.strength.toFixed(2)})`);
        }
        
        // Add RSI reason
        const rsi = currentPattern.indicators.rsi;
        if (rsi < 30) {
            reasons.push(`RSI oversold at ${rsi.toFixed(2)}`);
        } else if (rsi > 70) {
            reasons.push(`RSI overbought at ${rsi.toFixed(2)}`);
        }
        
        // Add MACD reason
        const macd = currentPattern.indicators.macd;
        if (macd.histogram > 0 && macd.macd > macd.signal) {
            reasons.push('MACD bullish crossover');
        } else if (macd.histogram < 0 && macd.macd < macd.signal) {
            reasons.push('MACD bearish crossover');
        }
        
        // Add Bollinger Band reason
        const bb = currentPattern.indicators.bollinger;
        if (bb.position.zone === 'lower_extreme') {
            reasons.push('Price at lower Bollinger Band (potential bounce)');
        } else if (bb.position.zone === 'upper_extreme') {
            reasons.push('Price at upper Bollinger Band (potential reversal)');
        }
        
        // Add candlestick pattern reason
        if (currentPattern.candlestickPatterns.bullish.length > 0) {
            const patterns = currentPattern.candlestickPatterns.bullish.map(p => p.type.replace('_', ' ')).join(', ');
            reasons.push(`Bullish candlestick patterns: ${patterns}`);
        } else if (currentPattern.candlestickPatterns.bearish.length > 0) {
            const patterns = currentPattern.candlestickPatterns.bearish.map(p => p.type.replace('_', ' ')).join(', ');
            reasons.push(`Bearish candlestick patterns: ${patterns}`);
        }
        
        return reasons.join('. ');
    }
    
    /**
     * Add a new pattern to the database
     */
    async addPatternToDatabase(pattern, outcome) {
        // Generate unique ID
        const id = `pattern_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Add to database
        this.patternDatabase.patterns.push({
            ...pattern,
            id,
            outcome,
            added: new Date().toISOString()
        });
        
        // Update organized maps
        this.organizePatternDatabase();
        
        // Save to disk
        await this.savePatternDatabase();
        
        return id;
    }
    
    // Candlestick pattern detection methods
    isBullishEngulfing(prev, current) {
        return prev.close < prev.open && // Previous bearish
               current.close > current.open && // Current bullish
               current.open < prev.close && // Current opens below prev close
               current.close > prev.open; // Current closes above prev open
    }
    
    isBearishEngulfing(prev, current) {
        return prev.close > prev.open && // Previous bullish
               current.close < current.open && // Current bearish
               current.open > prev.close && // Current opens above prev close
               current.close < prev.open; // Current closes below prev open
    }
    
    isHammer(candle) {
        const body = Math.abs(candle.close - candle.open);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        
        return lowerShadow > body * 2 && upperShadow < body * 0.5;
    }
    
    isShootingStar(candle) {
        const body = Math.abs(candle.close - candle.open);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        
        return upperShadow > body * 2 && lowerShadow < body * 0.5;
    }
    
    isDoji(candle) {
        const body = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        
        return body < totalRange * 0.1; // Body is less than 10% of total range
    }
    
    isMorningStar(first, second, third) {
        return first.close < first.open && // First bearish
               Math.abs(second.close - second.open) < (first.high - first.low) * 0.3 && // Second small body
               third.close > third.open && // Third bullish
               third.close > (first.open + first.close) / 2; // Third closes above first midpoint
    }
    
    isEveningStar(first, second, third) {
        return first.close > first.open && // First bullish
               Math.abs(second.close - second.open) < (first.high - first.low) * 0.3 && // Second small body
               third.close < third.open && // Third bearish
               third.close < (first.open + first.close) / 2; // Third closes below first midpoint
    }
    
    /**
     * Get historical OTC data for a specific asset and timeframe
     */
    async getHistoricalOTCData(asset, timeframe) {
        try {
            // Normalize asset name for OTC
            const normalizedAsset = this.normalizeAssetForOTC(asset);
            
            // Get historical data
            const historicalData = await this.historicalData.getHistoricalData(
                normalizedAsset,
                timeframe,
                { limit: 1000 } // Get up to 1000 candles
            );
            
            this.logger.info(`Loaded ${historicalData.candles.length} historical candles for ${normalizedAsset} ${timeframe}`);
            
            return historicalData;
        } catch (error) {
            this.logger.warn(`Error loading historical OTC data: ${error.message}`);
            return { candles: [] };
        }
    }
    
    /**
     * Create pattern objects from historical candle data
     */
    async createPatternsFromHistoricalData(candles, asset, timeframe) {
        const patterns = [];
        
        try {
            // Need at least lookbackCandles + 1 (for outcome)
            if (candles.length < this.matchingConfig.lookbackCandles + 1) {
                return patterns;
            }
            
            // Process candles in sliding window
            for (let i = 0; i <= candles.length - (this.matchingConfig.lookbackCandles + 1); i++) {
                // Get pattern candles
                const patternCandles = candles.slice(i, i + this.matchingConfig.lookbackCandles);
                
                // Get outcome candle
                const outcomeCandle = candles[i + this.matchingConfig.lookbackCandles];
                
                // Calculate indicators
                const indicators = await this.calculateIndicators(patternCandles);
                
                // Create pattern object
                const pattern = {
                    id: `OTC_${asset}_${timeframe}_${patternCandles[0].timestamp}`,
                    asset,
                    timeframe,
                    timestamp: patternCandles[patternCandles.length - 1].timestamp,
                    candles: patternCandles,
                    indicators,
                    vectorized: this.vectorizePattern(patternCandles, indicators),
                    outcome: {
                        direction: outcomeCandle.close > patternCandles[patternCandles.length - 1].close ? 'UP' : 'DOWN',
                        priceDelta: outcomeCandle.close - patternCandles[patternCandles.length - 1].close,
                        percentDelta: (outcomeCandle.close / patternCandles[patternCandles.length - 1].close - 1) * 100,
                        timestamp: outcomeCandle.timestamp
                    },
                    source: 'historical_otc'
                };
                
                // Add to patterns
                patterns.push(pattern);
                
                // Only process every 5th candle to reduce computation
                i += 4;
            }
            
            this.logger.info(`Created ${patterns.length} patterns from historical data`);
            
            return patterns;
        } catch (error) {
            this.logger.warn(`Error creating patterns from historical data: ${error.message}`);
            return patterns;
        }
    }
    
    /**
     * Vectorize a pattern for similarity comparison
     */
    vectorizePattern(candles, indicators) {
        // Extract features for vectorization
        const vector = [];
        
        // Price changes (normalized)
        const lastClose = candles[candles.length - 1].close;
        for (let i = 0; i < candles.length; i++) {
            // Normalize by dividing by last close price
            vector.push(candles[i].open / lastClose);
            vector.push(candles[i].high / lastClose);
            vector.push(candles[i].low / lastClose);
            vector.push(candles[i].close / lastClose);
        }
        
        // Add indicator values if available
        if (indicators) {
            // Add last 5 values of each indicator
            const indicatorKeys = Object.keys(indicators);
            for (const key of indicatorKeys) {
                const values = indicators[key];
                if (Array.isArray(values)) {
                    // Add last 5 values
                    const lastValues = values.slice(-5);
                    for (const value of lastValues) {
                        vector.push(value);
                    }
                }
            }
        }
        
        return vector;
    }
    
    /**
     * Normalize asset name for OTC data storage
     */
    normalizeAssetForOTC(asset) {
        if (!asset) return 'UNKNOWN';
        
        // Remove spaces and convert to uppercase
        let normalized = asset.toString().toUpperCase().replace(/\s+/g, '');
        
        // Replace / with _ for filenames
        normalized = normalized.replace(/\//g, '_');
        
        // Ensure OTC is in the name
        if (!normalized.includes('OTC')) {
            normalized = `${normalized}_OTC`;
        }
        
        return normalized;
    }
}

module.exports = { OTCPatternMatcher };