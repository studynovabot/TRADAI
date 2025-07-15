/**
 * AI Candle Sniper - Candlestick Pattern Recognition
 * Professional pattern detection for binary options trading
 */

class CandlestickPatterns {
    constructor() {
        this.patterns = [];
        this.minBodyRatio = 0.6; // Minimum body size ratio for strong candles
        this.dojiThreshold = 0.1; // Maximum body size ratio for doji
        this.shadowRatio = 0.6; // Minimum shadow ratio for pin bars
    }

    /**
     * Analyze candlestick patterns in OHLCV data
     * @param {Array} data - Array of OHLCV candles
     * @param {number} lookback - Number of candles to analyze (default: 10)
     * @returns {Array} Detected patterns
     */
    analyzePatterns(data, lookback = 10) {
        if (!data || data.length < 3) {
            return [];
        }

        this.patterns = [];
        const candles = data.slice(-Math.min(lookback, data.length));
        
        // Single candle patterns
        this.detectSingleCandlePatterns(candles);
        
        // Two candle patterns
        this.detectTwoCandlePatterns(candles);
        
        // Three candle patterns
        this.detectThreeCandlePatterns(candles);
        
        // Multi-candle patterns
        this.detectMultiCandlePatterns(candles);

        return this.patterns.sort((a, b) => b.strength - a.strength);
    }

    /**
     * Detect single candle patterns
     * @param {Array} candles - Array of candles
     */
    detectSingleCandlePatterns(candles) {
        for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];
            
            // Doji
            if (this.isDoji(candle)) {
                this.addPattern('Doji', i, 1, this.getDojiType(candle), 'neutral', 60);
            }
            
            // Hammer / Hanging Man
            if (this.isHammer(candle)) {
                const trend = this.getTrend(candles, i);
                const type = trend === 'down' ? 'bullish' : 'bearish';
                const name = trend === 'down' ? 'Hammer' : 'Hanging Man';
                this.addPattern(name, i, 1, type, type, 70);
            }
            
            // Pin Bar
            if (this.isPinBar(candle)) {
                const direction = this.getPinBarDirection(candle);
                this.addPattern('Pin Bar', i, 1, direction, direction, 65);
            }
            
            // Marubozu
            if (this.isMarubozu(candle)) {
                const direction = candle.close > candle.open ? 'bullish' : 'bearish';
                this.addPattern('Marubozu', i, 1, direction, direction, 75);
            }
            
            // Spinning Top
            if (this.isSpinningTop(candle)) {
                this.addPattern('Spinning Top', i, 1, 'neutral', 'neutral', 50);
            }
        }
    }

    /**
     * Detect two candle patterns
     * @param {Array} candles - Array of candles
     */
    detectTwoCandlePatterns(candles) {
        for (let i = 1; i < candles.length; i++) {
            const prev = candles[i - 1];
            const curr = candles[i];
            
            // Bullish Engulfing
            if (this.isBullishEngulfing(prev, curr)) {
                this.addPattern('Bullish Engulfing', i - 1, 2, 'bullish', 'bullish', 85);
            }
            
            // Bearish Engulfing
            if (this.isBearishEngulfing(prev, curr)) {
                this.addPattern('Bearish Engulfing', i - 1, 2, 'bearish', 'bearish', 85);
            }
            
            // Piercing Pattern
            if (this.isPiercingPattern(prev, curr)) {
                this.addPattern('Piercing Pattern', i - 1, 2, 'bullish', 'bullish', 80);
            }
            
            // Dark Cloud Cover
            if (this.isDarkCloudCover(prev, curr)) {
                this.addPattern('Dark Cloud Cover', i - 1, 2, 'bearish', 'bearish', 80);
            }
            
            // Tweezer Top/Bottom
            if (this.isTweezerTop(prev, curr)) {
                this.addPattern('Tweezer Top', i - 1, 2, 'bearish', 'bearish', 70);
            }
            
            if (this.isTweezerBottom(prev, curr)) {
                this.addPattern('Tweezer Bottom', i - 1, 2, 'bullish', 'bullish', 70);
            }
        }
    }

    /**
     * Detect three candle patterns
     * @param {Array} candles - Array of candles
     */
    detectThreeCandlePatterns(candles) {
        for (let i = 2; i < candles.length; i++) {
            const first = candles[i - 2];
            const second = candles[i - 1];
            const third = candles[i];
            
            // Morning Star
            if (this.isMorningStar(first, second, third)) {
                this.addPattern('Morning Star', i - 2, 3, 'bullish', 'bullish', 90);
            }
            
            // Evening Star
            if (this.isEveningStar(first, second, third)) {
                this.addPattern('Evening Star', i - 2, 3, 'bearish', 'bearish', 90);
            }
            
            // Three White Soldiers
            if (this.isThreeWhiteSoldiers(first, second, third)) {
                this.addPattern('Three White Soldiers', i - 2, 3, 'bullish', 'bullish', 85);
            }
            
            // Three Black Crows
            if (this.isThreeBlackCrows(first, second, third)) {
                this.addPattern('Three Black Crows', i - 2, 3, 'bearish', 'bearish', 85);
            }
            
            // Inside Bar
            if (this.isInsideBar(first, second, third)) {
                this.addPattern('Inside Bar', i - 2, 3, 'consolidation', 'neutral', 60);
            }
        }
    }

    /**
     * Detect multi-candle patterns
     * @param {Array} candles - Array of candles
     */
    detectMultiCandlePatterns(candles) {
        // Rising/Falling Three Methods
        if (candles.length >= 5) {
            for (let i = 4; i < candles.length; i++) {
                const pattern = candles.slice(i - 4, i + 1);
                
                if (this.isRisingThreeMethods(pattern)) {
                    this.addPattern('Rising Three Methods', i - 4, 5, 'bullish', 'bullish', 75);
                }
                
                if (this.isFallingThreeMethods(pattern)) {
                    this.addPattern('Falling Three Methods', i - 4, 5, 'bearish', 'bearish', 75);
                }
            }
        }
    }

    // Single Candle Pattern Detection Methods

    isDoji(candle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        return totalRange > 0 && (bodySize / totalRange) <= this.dojiThreshold;
    }

    getDojiType(candle) {
        const open = candle.open;
        const close = candle.close;
        const high = candle.high;
        const low = candle.low;
        const bodyMid = (open + close) / 2;
        const totalRange = high - low;
        
        const upperShadow = high - Math.max(open, close);
        const lowerShadow = Math.min(open, close) - low;
        
        if (upperShadow > totalRange * 0.6) return 'Dragonfly Doji';
        if (lowerShadow > totalRange * 0.6) return 'Gravestone Doji';
        return 'Standard Doji';
    }

    isHammer(candle) {
        const body = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        
        return totalRange > 0 &&
               lowerShadow >= totalRange * 0.6 &&
               upperShadow <= totalRange * 0.1 &&
               body <= totalRange * 0.3;
    }

    isPinBar(candle) {
        const body = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        
        const hasLongShadow = upperShadow >= totalRange * this.shadowRatio || 
                             lowerShadow >= totalRange * this.shadowRatio;
        const hasSmallBody = body <= totalRange * 0.3;
        
        return hasLongShadow && hasSmallBody;
    }

    getPinBarDirection(candle) {
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        
        return upperShadow > lowerShadow ? 'bearish' : 'bullish';
    }

    isMarubozu(candle) {
        const body = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        
        return totalRange > 0 &&
               body >= totalRange * 0.95 &&
               upperShadow <= totalRange * 0.05 &&
               lowerShadow <= totalRange * 0.05;
    }

    isSpinningTop(candle) {
        const body = Math.abs(candle.close - candle.open);
        const totalRange = candle.high - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        
        return totalRange > 0 &&
               body <= totalRange * 0.3 &&
               upperShadow >= totalRange * 0.3 &&
               lowerShadow >= totalRange * 0.3;
    }

    // Two Candle Pattern Detection Methods

    isBullishEngulfing(prev, curr) {
        return prev.close < prev.open && // Previous bearish
               curr.close > curr.open && // Current bullish
               curr.open < prev.close && // Current opens below previous close
               curr.close > prev.open;   // Current closes above previous open
    }

    isBearishEngulfing(prev, curr) {
        return prev.close > prev.open && // Previous bullish
               curr.close < curr.open && // Current bearish
               curr.open > prev.close && // Current opens above previous close
               curr.close < prev.open;   // Current closes below previous open
    }

    isPiercingPattern(prev, curr) {
        const prevBody = prev.open - prev.close; // Bearish candle
        const midPoint = prev.close + (prevBody / 2);
        
        return prev.close < prev.open && // Previous bearish
               curr.close > curr.open && // Current bullish
               curr.open < prev.close && // Gap down
               curr.close > midPoint &&  // Closes above midpoint
               curr.close < prev.open;   // But below previous open
    }

    isDarkCloudCover(prev, curr) {
        const prevBody = prev.close - prev.open; // Bullish candle
        const midPoint = prev.open + (prevBody / 2);
        
        return prev.close > prev.open && // Previous bullish
               curr.close < curr.open && // Current bearish
               curr.open > prev.close && // Gap up
               curr.close < midPoint &&  // Closes below midpoint
               curr.close > prev.open;   // But above previous open
    }

    isTweezerTop(prev, curr) {
        const tolerance = (prev.high + curr.high) * 0.002; // 0.2% tolerance
        return Math.abs(prev.high - curr.high) <= tolerance &&
               prev.close > prev.open && // Previous bullish
               curr.close < curr.open;   // Current bearish
    }

    isTweezerBottom(prev, curr) {
        const tolerance = (prev.low + curr.low) * 0.002; // 0.2% tolerance
        return Math.abs(prev.low - curr.low) <= tolerance &&
               prev.close < prev.open && // Previous bearish
               curr.close > curr.open;   // Current bullish
    }

    // Three Candle Pattern Detection Methods

    isMorningStar(first, second, third) {
        return first.close < first.open && // First bearish
               this.isDoji(second) &&      // Middle is doji/small body
               third.close > third.open && // Third bullish
               third.close > (first.open + first.close) / 2; // Third closes above first's midpoint
    }

    isEveningStar(first, second, third) {
        return first.close > first.open && // First bullish
               this.isDoji(second) &&      // Middle is doji/small body
               third.close < third.open && // Third bearish
               third.close < (first.open + first.close) / 2; // Third closes below first's midpoint
    }

    isThreeWhiteSoldiers(first, second, third) {
        return first.close > first.open &&  // All bullish
               second.close > second.open &&
               third.close > third.open &&
               second.close > first.close && // Progressive higher closes
               third.close > second.close &&
               second.open > first.open &&   // Each opens higher than previous
               third.open > second.open;
    }

    isThreeBlackCrows(first, second, third) {
        return first.close < first.open &&  // All bearish
               second.close < second.open &&
               third.close < third.open &&
               second.close < first.close && // Progressive lower closes
               third.close < second.close &&
               second.open < first.open &&   // Each opens lower than previous
               third.open < second.open;
    }

    isInsideBar(first, second, third) {
        return second.high < first.high &&  // Second candle inside first
               second.low > first.low &&
               third.high > second.high &&  // Third breaks out
               third.low < second.low;
    }

    // Multi-Candle Pattern Detection Methods

    isRisingThreeMethods(pattern) {
        if (pattern.length !== 5) return false;
        
        const [first, ...middle] = pattern.slice(0, 4);
        const last = pattern[4];
        
        // First and last are bullish
        const firstBullish = first.close > first.open;
        const lastBullish = last.close > last.open;
        
        // Middle candles are bearish and contained within first candle
        const middleBearish = middle.every(candle => 
            candle.close < candle.open &&
            candle.high < first.high &&
            candle.low > first.low
        );
        
        // Last candle closes above first
        return firstBullish && lastBullish && middleBearish && last.close > first.close;
    }

    isFallingThreeMethods(pattern) {
        if (pattern.length !== 5) return false;
        
        const [first, ...middle] = pattern.slice(0, 4);
        const last = pattern[4];
        
        // First and last are bearish
        const firstBearish = first.close < first.open;
        const lastBearish = last.close < last.open;
        
        // Middle candles are bullish and contained within first candle
        const middleBullish = middle.every(candle => 
            candle.close > candle.open &&
            candle.high < first.high &&
            candle.low > first.low
        );
        
        // Last candle closes below first
        return firstBearish && lastBearish && middleBullish && last.close < first.close;
    }

    // Utility Methods

    getTrend(candles, index, lookback = 5) {
        if (index < lookback) return 'neutral';
        
        const recentCandles = candles.slice(Math.max(0, index - lookback), index);
        const closes = recentCandles.map(c => c.close);
        
        const firstClose = closes[0];
        const lastClose = closes[closes.length - 1];
        
        const change = (lastClose - firstClose) / firstClose;
        
        if (change > 0.02) return 'up';
        if (change < -0.02) return 'down';
        return 'neutral';
    }

    addPattern(name, startIndex, length, direction, signal, strength) {
        this.patterns.push({
            name,
            startIndex,
            length,
            direction,
            signal,
            strength,
            timestamp: Date.now()
        });
    }

    /**
     * Get pattern significance based on market context
     * @param {Object} pattern - Pattern object
     * @param {Array} candles - All candles
     * @returns {Object} Enhanced pattern with context
     */
    enhancePattern(pattern, candles) {
        const enhanced = { ...pattern };
        
        // Add trend context
        const trend = this.getTrend(candles, pattern.startIndex + pattern.length - 1);
        enhanced.trendContext = trend;
        
        // Adjust strength based on trend alignment
        if (pattern.signal === 'bullish' && trend === 'down') {
            enhanced.strength += 10; // Reversal patterns stronger against trend
        } else if (pattern.signal === 'bearish' && trend === 'up') {
            enhanced.strength += 10;
        } else if (pattern.signal === trend) {
            enhanced.strength += 5; // Continuation patterns
        }
        
        // Add volume context if available
        const patternCandles = candles.slice(pattern.startIndex, pattern.startIndex + pattern.length);
        const hasVolume = patternCandles.some(c => c.volume > 0);
        
        if (hasVolume) {
            const avgVolume = this.getAverageVolume(candles, pattern.startIndex);
            const patternVolume = patternCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / pattern.length;
            
            if (patternVolume > avgVolume * 1.5) {
                enhanced.strength += 10;
                enhanced.volumeConfirmation = 'high';
            } else if (patternVolume < avgVolume * 0.5) {
                enhanced.strength -= 5;
                enhanced.volumeConfirmation = 'low';
            } else {
                enhanced.volumeConfirmation = 'normal';
            }
        }
        
        return enhanced;
    }

    getAverageVolume(candles, index, lookback = 20) {
        const start = Math.max(0, index - lookback);
        const recentCandles = candles.slice(start, index);
        
        const totalVolume = recentCandles.reduce((sum, c) => sum + (c.volume || 0), 0);
        return recentCandles.length > 0 ? totalVolume / recentCandles.length : 0;
    }

    /**
     * Filter patterns by reliability and market conditions
     * @param {Array} patterns - All detected patterns
     * @param {Object} filters - Filter criteria
     * @returns {Array} Filtered patterns
     */
    filterPatterns(patterns, filters = {}) {
        const {
            minStrength = 60,
            maxAge = 5, // Maximum candles ago
            signalTypes = ['bullish', 'bearish'], // Exclude neutral if needed
            excludeOverlapping = true
        } = filters;
        
        let filtered = patterns.filter(pattern => 
            pattern.strength >= minStrength &&
            signalTypes.includes(pattern.signal) &&
            (Date.now() - pattern.timestamp) < (maxAge * 60000) // Assuming 1min candles
        );
        
        // Remove overlapping patterns (keep strongest)
        if (excludeOverlapping) {
            filtered = this.removeOverlapping(filtered);
        }
        
        return filtered.sort((a, b) => b.strength - a.strength);
    }

    removeOverlapping(patterns) {
        const nonOverlapping = [];
        
        for (const pattern of patterns) {
            const overlaps = nonOverlapping.some(existing => 
                this.patternsOverlap(pattern, existing)
            );
            
            if (!overlaps) {
                nonOverlapping.push(pattern);
            }
        }
        
        return nonOverlapping;
    }

    patternsOverlap(pattern1, pattern2) {
        const end1 = pattern1.startIndex + pattern1.length;
        const end2 = pattern2.startIndex + pattern2.length;
        
        return !(end1 <= pattern2.startIndex || end2 <= pattern1.startIndex);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CandlestickPatterns;
} else {
    window.CandlestickPatterns = CandlestickPatterns;
}