/**
 * Advanced Candlestick Pattern Recognition Engine
 * Professional-grade pattern detection with strength analysis
 */

class AdvancedPatternRecognition {
    constructor() {
        this.patterns = new Map();
        this.setupPatternDefinitions();
    }

    setupPatternDefinitions() {
        // Single candlestick patterns
        this.patterns.set('doji', {
            name: 'Doji',
            type: 'reversal',
            strength: 'medium',
            detector: this.isDoji.bind(this)
        });

        this.patterns.set('hammer', {
            name: 'Hammer',
            type: 'bullish',
            strength: 'strong',
            detector: this.isHammer.bind(this)
        });

        this.patterns.set('hanging_man', {
            name: 'Hanging Man',
            type: 'bearish',
            strength: 'strong',
            detector: this.isHangingMan.bind(this)
        });

        this.patterns.set('shooting_star', {
            name: 'Shooting Star',
            type: 'bearish',
            strength: 'strong',
            detector: this.isShootingStar.bind(this)
        });

        this.patterns.set('inverted_hammer', {
            name: 'Inverted Hammer',
            type: 'bullish',
            strength: 'medium',
            detector: this.isInvertedHammer.bind(this)
        });

        this.patterns.set('marubozu_bullish', {
            name: 'Bullish Marubozu',
            type: 'bullish',
            strength: 'strong',
            detector: this.isBullishMarubozu.bind(this)
        });

        this.patterns.set('marubozu_bearish', {
            name: 'Bearish Marubozu',
            type: 'bearish',
            strength: 'strong',
            detector: this.isBearishMarubozu.bind(this)
        });

        // Two candlestick patterns
        this.patterns.set('bullish_engulfing', {
            name: 'Bullish Engulfing',
            type: 'bullish',
            strength: 'very_strong',
            detector: this.isBullishEngulfing.bind(this)
        });

        this.patterns.set('bearish_engulfing', {
            name: 'Bearish Engulfing',
            type: 'bearish',
            strength: 'very_strong',
            detector: this.isBearishEngulfing.bind(this)
        });

        this.patterns.set('piercing_line', {
            name: 'Piercing Line',
            type: 'bullish',
            strength: 'strong',
            detector: this.isPiercingLine.bind(this)
        });

        this.patterns.set('dark_cloud_cover', {
            name: 'Dark Cloud Cover',
            type: 'bearish',
            strength: 'strong',
            detector: this.isDarkCloudCover.bind(this)
        });

        this.patterns.set('tweezer_top', {
            name: 'Tweezer Top',
            type: 'bearish',
            strength: 'medium',
            detector: this.isTweezerTop.bind(this)
        });

        this.patterns.set('tweezer_bottom', {
            name: 'Tweezer Bottom',
            type: 'bullish',
            strength: 'medium',
            detector: this.isTweezerBottom.bind(this)
        });

        // Three candlestick patterns
        this.patterns.set('morning_star', {
            name: 'Morning Star',
            type: 'bullish',
            strength: 'very_strong',
            detector: this.isMorningStar.bind(this)
        });

        this.patterns.set('evening_star', {
            name: 'Evening Star',
            type: 'bearish',
            strength: 'very_strong',
            detector: this.isEveningStar.bind(this)
        });

        this.patterns.set('three_white_soldiers', {
            name: 'Three White Soldiers',
            type: 'bullish',
            strength: 'very_strong',
            detector: this.isThreeWhiteSoldiers.bind(this)
        });

        this.patterns.set('three_black_crows', {
            name: 'Three Black Crows',
            type: 'bearish',
            strength: 'very_strong',
            detector: this.isThreeBlackCrows.bind(this)
        });

        this.patterns.set('inside_bar', {
            name: 'Inside Bar',
            type: 'continuation',
            strength: 'medium',
            detector: this.isInsideBar.bind(this)
        });

        this.patterns.set('outside_bar', {
            name: 'Outside Bar',
            type: 'reversal',
            strength: 'strong',
            detector: this.isOutsideBar.bind(this)
        });

        // Advanced patterns
        this.patterns.set('pin_bar', {
            name: 'Pin Bar',
            type: 'reversal',
            strength: 'strong',
            detector: this.isPinBar.bind(this)
        });

        this.patterns.set('fakey_pattern', {
            name: 'Fakey Pattern',
            type: 'reversal',
            strength: 'very_strong',
            detector: this.isFakeyPattern.bind(this)
        });
    }

    // Main pattern detection method
    detectPatterns(candles, timeframe = '5M') {
        if (!candles || candles.length < 3) {
            return [];
        }

        const detectedPatterns = [];
        const candleCount = candles.length;

        // Check each pattern type
        for (const [patternKey, patternDef] of this.patterns.entries()) {
            try {
                const requiredCandles = this.getRequiredCandles(patternKey);
                
                // Check if we have enough candles
                if (candleCount >= requiredCandles) {
                    const relevantCandles = candles.slice(-requiredCandles);
                    const isPresent = patternDef.detector(relevantCandles);
                    
                    if (isPresent) {
                        const pattern = {
                            name: patternDef.name,
                            type: patternDef.type,
                            strength: patternDef.strength,
                            timeframe: timeframe,
                            reliability: this.calculateReliability(patternKey, relevantCandles),
                            context: this.analyzeContext(candles, patternKey),
                            candles: relevantCandles.map(c => ({
                                timestamp: c.timestamp,
                                open: c.open,
                                high: c.high,
                                low: c.low,
                                close: c.close
                            }))
                        };
                        
                        detectedPatterns.push(pattern);
                    }
                }
            } catch (error) {
                console.log(`[Pattern Recognition] Error detecting ${patternKey}:`, error);
            }
        }

        // Sort by strength and reliability
        return detectedPatterns.sort((a, b) => {
            const strengthOrder = { 'very_strong': 4, 'strong': 3, 'medium': 2, 'weak': 1 };
            const aScore = (strengthOrder[a.strength] || 0) + (a.reliability || 0);
            const bScore = (strengthOrder[b.strength] || 0) + (b.reliability || 0);
            return bScore - aScore;
        });
    }

    // Single candlestick pattern detectors
    isDoji(candles) {
        const candle = candles[candles.length - 1];
        const bodySize = Math.abs(candle.close - candle.open);
        const range = candle.high - candle.low;
        
        // Doji: body is very small relative to range
        return bodySize <= (range * 0.1) && range > 0;
    }

    isHammer(candles) {
        if (candles.length < 2) return false;
        
        const current = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        
        const bodySize = Math.abs(current.close - current.open);
        const range = current.high - current.low;
        const lowerShadow = Math.min(current.open, current.close) - current.low;
        const upperShadow = current.high - Math.max(current.open, current.close);
        
        // Hammer characteristics
        const hasSmallBody = bodySize <= (range * 0.3);
        const hasLongLowerShadow = lowerShadow >= (range * 0.5);
        const hasShortUpperShadow = upperShadow <= (range * 0.1);
        const isInDowntrend = previous.close > current.low; // Simplified trend check
        
        return hasSmallBody && hasLongLowerShadow && hasShortUpperShadow && isInDowntrend;
    }

    isHangingMan(candles) {
        if (candles.length < 2) return false;
        
        const current = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        
        const bodySize = Math.abs(current.close - current.open);
        const range = current.high - current.low;
        const lowerShadow = Math.min(current.open, current.close) - current.low;
        const upperShadow = current.high - Math.max(current.open, current.close);
        
        // Hanging man characteristics (similar to hammer but in uptrend)
        const hasSmallBody = bodySize <= (range * 0.3);
        const hasLongLowerShadow = lowerShadow >= (range * 0.5);
        const hasShortUpperShadow = upperShadow <= (range * 0.1);
        const isInUptrend = previous.close < current.high; // Simplified trend check
        
        return hasSmallBody && hasLongLowerShadow && hasShortUpperShadow && isInUptrend;
    }

    isShootingStar(candles) {
        if (candles.length < 2) return false;
        
        const current = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        
        const bodySize = Math.abs(current.close - current.open);
        const range = current.high - current.low;
        const upperShadow = current.high - Math.max(current.open, current.close);
        const lowerShadow = Math.min(current.open, current.close) - current.low;
        
        // Shooting star characteristics
        const hasSmallBody = bodySize <= (range * 0.3);
        const hasLongUpperShadow = upperShadow >= (range * 0.5);
        const hasShortLowerShadow = lowerShadow <= (range * 0.1);
        const isInUptrend = previous.close < current.high;
        
        return hasSmallBody && hasLongUpperShadow && hasShortLowerShadow && isInUptrend;
    }

    isInvertedHammer(candles) {
        if (candles.length < 2) return false;
        
        const current = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        
        const bodySize = Math.abs(current.close - current.open);
        const range = current.high - current.low;
        const upperShadow = current.high - Math.max(current.open, current.close);
        const lowerShadow = Math.min(current.open, current.close) - current.low;
        
        // Inverted hammer characteristics (similar to shooting star but in downtrend)
        const hasSmallBody = bodySize <= (range * 0.3);
        const hasLongUpperShadow = upperShadow >= (range * 0.5);
        const hasShortLowerShadow = lowerShadow <= (range * 0.1);
        const isInDowntrend = previous.close > current.low;
        
        return hasSmallBody && hasLongUpperShadow && hasShortLowerShadow && isInDowntrend;
    }

    isBullishMarubozu(candles) {
        const candle = candles[candles.length - 1];
        
        const isBullish = candle.close > candle.open;
        const noUpperShadow = Math.abs(candle.high - candle.close) <= ((candle.close - candle.open) * 0.01);
        const noLowerShadow = Math.abs(candle.open - candle.low) <= ((candle.close - candle.open) * 0.01);
        
        return isBullish && noUpperShadow && noLowerShadow;
    }

    isBearishMarubozu(candles) {
        const candle = candles[candles.length - 1];
        
        const isBearish = candle.close < candle.open;
        const noUpperShadow = Math.abs(candle.high - candle.open) <= ((candle.open - candle.close) * 0.01);
        const noLowerShadow = Math.abs(candle.close - candle.low) <= ((candle.open - candle.close) * 0.01);
        
        return isBearish && noUpperShadow && noLowerShadow;
    }

    // Two candlestick pattern detectors
    isBullishEngulfing(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const prevIsBearish = previous.close < previous.open;
        const currIsBullish = current.close > current.open;
        const currentEngulfsPrevious = current.open < previous.close && current.close > previous.open;
        
        return prevIsBearish && currIsBullish && currentEngulfsPrevious;
    }

    isBearishEngulfing(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const prevIsBullish = previous.close > previous.open;
        const currIsBearish = current.close < current.open;
        const currentEngulfsPrevious = current.open > previous.close && current.close < previous.open;
        
        return prevIsBullish && currIsBearish && currentEngulfsPrevious;
    }

    isPiercingLine(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const prevIsBearish = previous.close < previous.open;
        const currIsBullish = current.close > current.open;
        const gapsDown = current.open < previous.close;
        const closesAboveMidpoint = current.close > (previous.open + previous.close) / 2;
        const closesBelowPreviousOpen = current.close < previous.open;
        
        return prevIsBearish && currIsBullish && gapsDown && closesAboveMidpoint && closesBelowPreviousOpen;
    }

    isDarkCloudCover(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const prevIsBullish = previous.close > previous.open;
        const currIsBearish = current.close < current.open;
        const gapsUp = current.open > previous.close;
        const closesBelowMidpoint = current.close < (previous.open + previous.close) / 2;
        const closesAbovePreviousOpen = current.close > previous.open;
        
        return prevIsBullish && currIsBearish && gapsUp && closesBelowMidpoint && closesAbovePreviousOpen;
    }

    isTweezerTop(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const similarHighs = Math.abs(previous.high - current.high) <= ((previous.high + current.high) / 2) * 0.002;
        const atLeastOneIsBearish = previous.close < previous.open || current.close < current.open;
        
        return similarHighs && atLeastOneIsBearish;
    }

    isTweezerBottom(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const similarLows = Math.abs(previous.low - current.low) <= ((previous.low + current.low) / 2) * 0.002;
        const atLeastOneIsBullish = previous.close > previous.open || current.close > current.open;
        
        return similarLows && atLeastOneIsBullish;
    }

    // Three candlestick pattern detectors
    isMorningStar(candles) {
        if (candles.length < 3) return false;
        
        const [first, second, third] = candles.slice(-3);
        
        const firstIsBearish = first.close < first.open;
        const secondIsSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.5;
        const secondGapsDown = second.high < first.close;
        const thirdIsBullish = third.close > third.open;
        const thirdClosesAboveFirstMidpoint = third.close > (first.open + first.close) / 2;
        
        return firstIsBearish && secondIsSmall && secondGapsDown && thirdIsBullish && thirdClosesAboveFirstMidpoint;
    }

    isEveningStar(candles) {
        if (candles.length < 3) return false;
        
        const [first, second, third] = candles.slice(-3);
        
        const firstIsBullish = first.close > first.open;
        const secondIsSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.5;
        const secondGapsUp = second.low > first.close;
        const thirdIsBearish = third.close < third.open;
        const thirdClosesBelowFirstMidpoint = third.close < (first.open + first.close) / 2;
        
        return firstIsBullish && secondIsSmall && secondGapsUp && thirdIsBearish && thirdClosesBelowFirstMidpoint;
    }

    isThreeWhiteSoldiers(candles) {
        if (candles.length < 3) return false;
        
        const [first, second, third] = candles.slice(-3);
        
        const allBullish = first.close > first.open && second.close > second.open && third.close > third.open;
        const consecutive = second.open > first.open && second.close > first.close && 
                           third.open > second.open && third.close > second.close;
        const noLongShadows = this.hasMinimalShadows(first) && this.hasMinimalShadows(second) && this.hasMinimalShadows(third);
        
        return allBullish && consecutive && noLongShadows;
    }

    isThreeBlackCrows(candles) {
        if (candles.length < 3) return false;
        
        const [first, second, third] = candles.slice(-3);
        
        const allBearish = first.close < first.open && second.close < second.open && third.close < third.open;
        const consecutive = second.open < first.open && second.close < first.close && 
                           third.open < second.open && third.close < second.close;
        const noLongShadows = this.hasMinimalShadows(first) && this.hasMinimalShadows(second) && this.hasMinimalShadows(third);
        
        return allBearish && consecutive && noLongShadows;
    }

    isInsideBar(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const currentIsInside = current.high <= previous.high && current.low >= previous.low;
        
        return currentIsInside;
    }

    isOutsideBar(candles) {
        if (candles.length < 2) return false;
        
        const [previous, current] = candles.slice(-2);
        
        const currentIsOutside = current.high > previous.high && current.low < previous.low;
        
        return currentIsOutside;
    }

    // Advanced pattern detectors
    isPinBar(candles) {
        if (candles.length < 2) return false;
        
        const current = candles[candles.length - 1];
        const previous = candles[candles.length - 2];
        
        const bodySize = Math.abs(current.close - current.open);
        const range = current.high - current.low;
        const bodyRatio = bodySize / range;
        
        // Pin bar characteristics
        const hasSmallBody = bodyRatio <= 0.33;
        const hasSignificantTail = this.hasSignificantTail(current);
        const tailDirection = this.getTailDirection(current);
        
        if (!hasSmallBody || !hasSignificantTail) return false;
        
        // Context matters - pin bar should be in direction opposite to recent trend
        const recentTrend = this.getRecentTrend(candles.slice(-5));
        
        return (tailDirection === 'lower' && recentTrend === 'bearish') ||
               (tailDirection === 'upper' && recentTrend === 'bullish');
    }

    isFakeyPattern(candles) {
        if (candles.length < 4) return false;
        
        // Fakey is an inside bar followed by a false breakout
        const [first, inside, breakout, reversal] = candles.slice(-4);
        
        const isInsideBar = inside.high <= first.high && inside.low >= first.low;
        if (!isInsideBar) return false;
        
        const breakoutDirection = breakout.close > first.high ? 'up' : 
                                breakout.close < first.low ? 'down' : null;
        if (!breakoutDirection) return false;
        
        const isReversal = breakoutDirection === 'up' ? 
                          reversal.close < first.low : 
                          reversal.close > first.high;
        
        return isReversal;
    }

    // Helper methods
    getRequiredCandles(patternKey) {
        const singleCandlePatterns = ['doji', 'hammer', 'hanging_man', 'shooting_star', 'inverted_hammer', 'marubozu_bullish', 'marubozu_bearish'];
        const twoCandlePatterns = ['bullish_engulfing', 'bearish_engulfing', 'piercing_line', 'dark_cloud_cover', 'tweezer_top', 'tweezer_bottom', 'inside_bar', 'outside_bar', 'pin_bar'];
        const threeCandlePatterns = ['morning_star', 'evening_star', 'three_white_soldiers', 'three_black_crows'];
        const fourCandlePatterns = ['fakey_pattern'];
        
        if (singleCandlePatterns.includes(patternKey)) return 2; // Need previous for context
        if (twoCandlePatterns.includes(patternKey)) return 2;
        if (threeCandlePatterns.includes(patternKey)) return 3;
        if (fourCandlePatterns.includes(patternKey)) return 4;
        
        return 2; // Default
    }

    calculateReliability(patternKey, candles) {
        let reliability = 50; // Base reliability
        
        // Adjust based on pattern strength
        const strengthBonus = {
            'very_strong': 25,
            'strong': 15,
            'medium': 5,
            'weak': -5
        };
        
        const patternDef = this.patterns.get(patternKey);
        reliability += strengthBonus[patternDef.strength] || 0;
        
        // Adjust based on volume (if available)
        const avgVolume = this.getAverageVolume(candles);
        const currentVolume = candles[candles.length - 1].volume || 0;
        
        if (currentVolume > avgVolume * 1.5) {
            reliability += 15; // High volume confirmation
        } else if (currentVolume < avgVolume * 0.5) {
            reliability -= 10; // Low volume weakens pattern
        }
        
        // Adjust based on position relative to support/resistance
        const nearSupportResistance = this.isNearSupportResistance(candles);
        if (nearSupportResistance) {
            reliability += 10;
        }
        
        return Math.max(0, Math.min(100, reliability));
    }

    analyzeContext(candles, patternKey) {
        const context = {
            trend: this.getRecentTrend(candles.slice(-10)),
            volatility: this.getVolatility(candles.slice(-20)),
            volume: this.getVolumeContext(candles.slice(-5)),
            supportResistance: this.isNearSupportResistance(candles),
            timeOfDay: this.getTimeContext()
        };
        
        return context;
    }

    hasMinimalShadows(candle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        
        return upperShadow <= bodySize * 0.1 && lowerShadow <= bodySize * 0.1;
    }

    hasSignificantTail(candle) {
        const range = candle.high - candle.low;
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        
        return (upperShadow >= range * 0.5) || (lowerShadow >= range * 0.5);
    }

    getTailDirection(candle) {
        const upperShadow = candle.high - Math.max(candle.open, candle.close);
        const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
        
        return upperShadow > lowerShadow ? 'upper' : 'lower';
    }

    getRecentTrend(candles) {
        if (candles.length < 3) return 'neutral';
        
        const first = candles[0];
        const last = candles[candles.length - 1];
        const change = (last.close - first.open) / first.open;
        
        if (change > 0.002) return 'bullish';
        if (change < -0.002) return 'bearish';
        return 'neutral';
    }

    getVolatility(candles) {
        if (candles.length < 5) return 'normal';
        
        const ranges = candles.map(c => c.high - c.low);
        const avgRange = ranges.reduce((sum, range) => sum + range, 0) / ranges.length;
        const recentRange = ranges[ranges.length - 1];
        
        if (recentRange > avgRange * 1.5) return 'high';
        if (recentRange < avgRange * 0.5) return 'low';
        return 'normal';
    }

    getVolumeContext(candles) {
        const volumes = candles.map(c => c.volume || 1000).filter(v => v > 0);
        if (volumes.length === 0) return 'normal';
        
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        const currentVolume = volumes[volumes.length - 1];
        
        if (currentVolume > avgVolume * 1.5) return 'high';
        if (currentVolume < avgVolume * 0.5) return 'low';
        return 'normal';
    }

    getAverageVolume(candles) {
        const volumes = candles.map(c => c.volume || 1000).filter(v => v > 0);
        return volumes.length > 0 ? volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length : 1000;
    }

    isNearSupportResistance(candles) {
        // Simplified support/resistance detection
        if (candles.length < 10) return false;
        
        const current = candles[candles.length - 1];
        const historical = candles.slice(0, -1);
        
        // Check for recent highs/lows
        const recentHighs = historical.filter(c => Math.abs(c.high - current.close) / current.close < 0.001);
        const recentLows = historical.filter(c => Math.abs(c.low - current.close) / current.close < 0.001);
        
        return recentHighs.length >= 2 || recentLows.length >= 2;
    }

    getTimeContext() {
        const now = new Date();
        const hour = now.getHours();
        
        // Market session context
        if ((hour >= 8 && hour <= 12) || (hour >= 13 && hour <= 17)) {
            return 'active_session';
        } else if (hour >= 0 && hour <= 6) {
            return 'low_activity';
        } else {
            return 'moderate_activity';
        }
    }

    // Export pattern detection results
    getPatternSummary(patterns) {
        const summary = {
            total: patterns.length,
            bullish: patterns.filter(p => p.type === 'bullish').length,
            bearish: patterns.filter(p => p.type === 'bearish').length,
            reversal: patterns.filter(p => p.type === 'reversal').length,
            continuation: patterns.filter(p => p.type === 'continuation').length,
            strongPatterns: patterns.filter(p => p.strength === 'very_strong' || p.strength === 'strong').length,
            highReliability: patterns.filter(p => (p.reliability || 0) >= 70).length
        };
        
        return summary;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedPatternRecognition;
} else if (typeof window !== 'undefined') {
    window.AdvancedPatternRecognition = AdvancedPatternRecognition;
} else {
    // Service worker environment - make globally available
    self.AdvancedPatternRecognition = AdvancedPatternRecognition;
}