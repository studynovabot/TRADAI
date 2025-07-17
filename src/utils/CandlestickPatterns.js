/**
 * CandlestickPatterns - Enhanced Pattern Recognition
 * 
 * Detects various candlestick patterns for technical analysis
 * with strength assessment for high-confidence trading signals
 */

class CandlestickPatterns {
  constructor() {
    // Pattern detection thresholds
    this.thresholds = {
      doji: {
        bodyToRangeRatio: 0.1, // Max body size as percentage of range
        minRange: 0.0005 // Minimum range to avoid noise
      },
      hammer: {
        bodyToRangeRatio: 0.3, // Max body size as percentage of range
        lowerShadowRatio: 2.0, // Lower shadow must be at least 2x body
        upperShadowRatio: 0.5 // Upper shadow must be at most 0.5x body
      },
      shootingStar: {
        bodyToRangeRatio: 0.3, // Max body size as percentage of range
        upperShadowRatio: 2.0, // Upper shadow must be at least 2x body
        lowerShadowRatio: 0.5 // Lower shadow must be at most 0.5x body
      },
      engulfing: {
        minBodySize: 0.0005, // Minimum body size to be significant
        minEngulfRatio: 1.1 // Current body must engulf previous by at least 110%
      },
      marubozu: {
        bodyToRangeRatio: 0.8, // Body must be at least 80% of range
        minBodySize: 0.001 // Minimum body size to be significant
      }
    };
    
    this.patterns = {
      // Single candle patterns
      doji: this.isDoji.bind(this),
      hammer: this.isHammer.bind(this),
      invertedHammer: this.isInvertedHammer.bind(this),
      shootingStar: this.isShootingStar.bind(this),
      marubozu: this.isMarubozu.bind(this),
      
      // Two candle patterns
      bullishEngulfing: this.isBullishEngulfing.bind(this),
      bearishEngulfing: this.isBearishEngulfing.bind(this),
      
      // Three candle patterns
      morningStar: this.isMorningStar.bind(this),
      eveningStar: this.isEveningStar.bind(this)
    };
  }
  
  /**
   * Detect all patterns in market data with enhanced confidence scoring
   */
  detectPatterns(marketData) {
    if (!marketData || marketData.length < 3) {
      return {
        detected: [],
        bullishCount: 0,
        bearishCount: 0,
        summary: 'Insufficient data for pattern detection',
        mainPattern: null
      };
    }
    
    const detected = [];
    let bullishCount = 0;
    let bearishCount = 0;
    let strongestPattern = null;
    let highestStrength = 0;
    
    // Check single candle patterns (last candle)
    const lastCandle = marketData[marketData.length - 1];
    const prevCandle = marketData[marketData.length - 2];
    
    // Enhanced Doji detection
    if (this.isDoji(lastCandle)) {
      const dojiType = this.getDojiType(lastCandle);
      const dojiStrength = dojiType.includes('Long-legged') ? 0.7 : 
                          dojiType.includes('Dragonfly') ? 0.75 : 
                          dojiType.includes('Gravestone') ? 0.75 : 0.6;
      
      const dojiDirection = dojiType.includes('Dragonfly') ? 'BULLISH' : 
                           dojiType.includes('Gravestone') ? 'BEARISH' : 'NEUTRAL';
      
      detected.push({ 
        pattern: dojiType, 
        type: dojiDirection, 
        strength: dojiStrength 
      });
      
      if (dojiStrength > highestStrength) {
        strongestPattern = {
          type: 'doji',
          subType: dojiType.toLowerCase().replace(' ', '_'),
          strength: dojiStrength,
          direction: dojiDirection.toLowerCase()
        };
        highestStrength = dojiStrength;
      }
    }
    
    // Enhanced Hammer detection
    if (this.isHammer(lastCandle)) {
      // Check for downtrend context for stronger signal
      const inDowntrend = prevCandle && prevCandle.close < prevCandle.open;
      const hammerStrength = inDowntrend ? 0.85 : 0.75;
      
      detected.push({ 
        pattern: 'Hammer', 
        type: 'BULLISH', 
        strength: hammerStrength 
      });
      bullishCount++;
      
      if (hammerStrength > highestStrength) {
        strongestPattern = {
          type: 'hammer',
          strength: hammerStrength,
          direction: 'bullish'
        };
        highestStrength = hammerStrength;
      }
    }

    // Enhanced Inverted Hammer detection
    if (this.isInvertedHammer(lastCandle)) {
      // Check for downtrend context for stronger signal
      const inDowntrend = prevCandle && prevCandle.close < prevCandle.open;
      const invHammerStrength = inDowntrend ? 0.75 : 0.65;
      
      detected.push({ 
        pattern: 'Inverted Hammer', 
        type: 'BULLISH', 
        strength: invHammerStrength 
      });
      bullishCount++;
      
      if (invHammerStrength > highestStrength) {
        strongestPattern = {
          type: 'inverted_hammer',
          strength: invHammerStrength,
          direction: 'bullish'
        };
        highestStrength = invHammerStrength;
      }
    }

    // Enhanced Shooting Star detection
    if (this.isShootingStar(lastCandle)) {
      // Check for uptrend context for stronger signal
      const inUptrend = prevCandle && prevCandle.close > prevCandle.open;
      const shootingStarStrength = inUptrend ? 0.85 : 0.75;
      
      detected.push({ 
        pattern: 'Shooting Star', 
        type: 'BEARISH', 
        strength: shootingStarStrength 
      });
      bearishCount++;
      
      if (shootingStarStrength > highestStrength) {
        strongestPattern = {
          type: 'shooting_star',
          strength: shootingStarStrength,
          direction: 'bearish'
        };
        highestStrength = shootingStarStrength;
      }
    }

    // Enhanced Marubozu detection
    const marubozuResult = this.isMarubozu(lastCandle);
    if (marubozuResult) {
      const marubozuStrength = 0.85; // Strong signal
      
      detected.push({ 
        pattern: `${marubozuResult} Marubozu`, 
        type: marubozuResult === 'Bullish' ? 'BULLISH' : 'BEARISH', 
        strength: marubozuStrength 
      });
      
      if (marubozuResult === 'Bullish') bullishCount++;
      else bearishCount++;
      
      if (marubozuStrength > highestStrength) {
        strongestPattern = {
          type: 'marubozu',
          subType: marubozuResult.toLowerCase(),
          strength: marubozuStrength,
          direction: marubozuResult.toLowerCase()
        };
        highestStrength = marubozuStrength;
      }
    }
    
    // Check two candle patterns
    if (marketData.length >= 2) {
      // Enhanced Bullish Engulfing detection
      if (this.isBullishEngulfing([prevCandle, lastCandle])) {
        const engulfingStrength = 0.9; // Very strong signal
        
        detected.push({ 
          pattern: 'Bullish Engulfing', 
          type: 'BULLISH', 
          strength: engulfingStrength 
        });
        bullishCount++;
        
        if (engulfingStrength > highestStrength) {
          strongestPattern = {
            type: 'engulfing',
            subType: 'bullish',
            strength: engulfingStrength,
            direction: 'bullish'
          };
          highestStrength = engulfingStrength;
        }
      }
      
      // Enhanced Bearish Engulfing detection
      if (this.isBearishEngulfing([prevCandle, lastCandle])) {
        const engulfingStrength = 0.9; // Very strong signal
        
        detected.push({ 
          pattern: 'Bearish Engulfing', 
          type: 'BEARISH', 
          strength: engulfingStrength 
        });
        bearishCount++;
        
        if (engulfingStrength > highestStrength) {
          strongestPattern = {
            type: 'engulfing',
            subType: 'bearish',
            strength: engulfingStrength,
            direction: 'bearish'
          };
          highestStrength = engulfingStrength;
        }
      }
      
      // Check for Harami pattern
      if (this.isHarami([prevCandle, lastCandle])) {
        const haramiType = lastCandle.close > lastCandle.open ? 'Bullish' : 'Bearish';
        const haramiStrength = 0.7;
        
        detected.push({ 
          pattern: `${haramiType} Harami`, 
          type: haramiType === 'Bullish' ? 'BULLISH' : 'BEARISH', 
          strength: haramiStrength 
        });
        
        if (haramiType === 'Bullish') bullishCount++;
        else bearishCount++;
        
        if (haramiStrength > highestStrength) {
          strongestPattern = {
            type: 'harami',
            subType: haramiType.toLowerCase(),
            strength: haramiStrength,
            direction: haramiType.toLowerCase()
          };
          highestStrength = haramiStrength;
        }
      }
    }
    
    // Check three candle patterns
    if (marketData.length >= 3) {
      const threeCandles = marketData.slice(-3);
      
      // Enhanced Morning Star detection
      if (this.isMorningStar(threeCandles)) {
        const morningStarStrength = 0.95; // Extremely strong signal
        
        detected.push({ 
          pattern: 'Morning Star', 
          type: 'BULLISH', 
          strength: morningStarStrength 
        });
        bullishCount++;
        
        if (morningStarStrength > highestStrength) {
          strongestPattern = {
            type: 'morning_star',
            strength: morningStarStrength,
            direction: 'bullish'
          };
          highestStrength = morningStarStrength;
        }
      }
      
      // Enhanced Evening Star detection
      if (this.isEveningStar(threeCandles)) {
        const eveningStarStrength = 0.95; // Extremely strong signal
        
        detected.push({ 
          pattern: 'Evening Star', 
          type: 'BEARISH', 
          strength: eveningStarStrength 
        });
        bearishCount++;
        
        if (eveningStarStrength > highestStrength) {
          strongestPattern = {
            type: 'evening_star',
            strength: eveningStarStrength,
            direction: 'bearish'
          };
          highestStrength = eveningStarStrength;
        }
      }
      
      // Check for Three White Soldiers
      if (this.isThreeWhiteSoldiers(threeCandles)) {
        const threeWhiteSoldiersStrength = 0.9;
        
        detected.push({ 
          pattern: 'Three White Soldiers', 
          type: 'BULLISH', 
          strength: threeWhiteSoldiersStrength 
        });
        bullishCount++;
        
        if (threeWhiteSoldiersStrength > highestStrength) {
          strongestPattern = {
            type: 'three_white_soldiers',
            strength: threeWhiteSoldiersStrength,
            direction: 'bullish'
          };
          highestStrength = threeWhiteSoldiersStrength;
        }
      }
      
      // Check for Three Black Crows
      if (this.isThreeBlackCrows(threeCandles)) {
        const threeBlackCrowsStrength = 0.9;
        
        detected.push({ 
          pattern: 'Three Black Crows', 
          type: 'BEARISH', 
          strength: threeBlackCrowsStrength 
        });
        bearishCount++;
        
        if (threeBlackCrowsStrength > highestStrength) {
          strongestPattern = {
            type: 'three_black_crows',
            strength: threeBlackCrowsStrength,
            direction: 'bearish'
          };
          highestStrength = threeBlackCrowsStrength;
        }
      }
    }
    
    return {
      detected: detected,
      bullishCount: bullishCount,
      bearishCount: bearishCount,
      summary: this.generateSummary(detected, bullishCount, bearishCount),
      mainPattern: strongestPattern
    };
  }
  
  /**
   * Check if candle is a Doji
   */
  isDoji(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    
    // Body is less than 10% of the total range
    return bodySize <= (range * 0.1);
  }
  
  /**
   * Check if candle is a Hammer
   */
  isHammer(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const range = candle.high - candle.low;
    
    // Lower shadow at least 2x body size, upper shadow small
    return lowerShadow >= (bodySize * 2) && 
           upperShadow <= (bodySize * 0.5) &&
           bodySize >= (range * 0.1); // Not a doji
  }
  
  /**
   * Check if candle is an Inverted Hammer
   */
  isInvertedHammer(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const range = candle.high - candle.low;
    
    // Upper shadow at least 2x body size, lower shadow small
    return upperShadow >= (bodySize * 2) && 
           lowerShadow <= (bodySize * 0.5) &&
           bodySize >= (range * 0.1); // Not a doji
  }
  
  /**
   * Check if candle is a Shooting Star
   */
  isShootingStar(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const range = candle.high - candle.low;
    
    // Similar to inverted hammer but appears after uptrend
    return upperShadow >= (bodySize * 2) && 
           lowerShadow <= (bodySize * 0.5) &&
           bodySize >= (range * 0.1) &&
           candle.close < candle.open; // Bearish body
  }
  
  /**
   * Check if candle is a Marubozu
   */
  isMarubozu(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const range = candle.high - candle.low;

    // Body is at least 80% of total range, minimal shadows
    if (bodySize >= (range * 0.8) &&
        lowerShadow <= (range * 0.1) &&
        upperShadow <= (range * 0.1)) {

      return candle.close > candle.open ? 'Bullish' : 'Bearish';
    }

    return null;
  }

  /**
   * Get Marubozu type and signal
   */
  getMarubozuType(candle) {
    const marubozu = this.isMarubozu(candle);
    if (marubozu === 'Bullish') {
      return { type: 'Bullish', signal: 'BULLISH' };
    } else if (marubozu === 'Bearish') {
      return { type: 'Bearish', signal: 'BEARISH' };
    }
    return { type: 'None', signal: 'NEUTRAL' };
  }

  /**
   * Check for Inverted Hammer pattern
   */
  isInvertedHammer(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;

    // Small body, long upper shadow, minimal lower shadow
    return bodySize <= (range * 0.3) &&
           upperShadow >= (range * 0.6) &&
           lowerShadow <= (range * 0.1);
  }

  /**
   * Check for Shooting Star pattern
   */
  isShootingStar(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;

    // Small body at bottom, long upper shadow, minimal lower shadow
    const bodyAtBottom = Math.min(candle.open, candle.close) <= (candle.low + range * 0.3);

    return bodySize <= (range * 0.3) &&
           upperShadow >= (range * 0.6) &&
           lowerShadow <= (range * 0.1) &&
           bodyAtBottom;
  }
  
  /**
   * Check for Bullish Engulfing pattern
   */
  isBullishEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const [candle1, candle2] = candles;
    if (!candle1 || !candle2) return false;
    
    // First candle is bearish, second is bullish
    const firstBearish = candle1.close < candle1.open;
    const secondBullish = candle2.close > candle2.open;
    
    // Second candle engulfs first candle
    const engulfs = candle2.open < candle1.close && candle2.close > candle1.open;
    
    return firstBearish && secondBullish && engulfs;
  }
  
  /**
   * Check for Bearish Engulfing pattern
   */
  isBearishEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const [candle1, candle2] = candles;
    if (!candle1 || !candle2) return false;
    
    // First candle is bullish, second is bearish
    const firstBullish = candle1.close > candle1.open;
    const secondBearish = candle2.close < candle2.open;
    
    // Second candle engulfs first candle
    const engulfs = candle2.open > candle1.close && candle2.close < candle1.open;
    
    return firstBullish && secondBearish && engulfs;
  }
  
  /**
   * Check for Morning Star pattern
   */
  isMorningStar(candles) {
    if (candles.length !== 3) return false;
    
    const [first, second, third] = candles;
    
    // First candle: bearish
    const firstBearish = first.close < first.open;
    
    // Second candle: small body (star)
    const secondBodySize = Math.abs(second.close - second.open);
    const secondRange = second.high - second.low;
    const secondSmall = secondBodySize <= (secondRange * 0.3);
    
    // Third candle: bullish and closes above first candle's midpoint
    const thirdBullish = third.close > third.open;
    const firstMidpoint = (first.open + first.close) / 2;
    const thirdClosesHigh = third.close > firstMidpoint;
    
    return firstBearish && secondSmall && thirdBullish && thirdClosesHigh;
  }
  
  /**
   * Check for Evening Star pattern
   */
  isEveningStar(candles) {
    if (candles.length !== 3) return false;
    
    const [first, second, third] = candles;
    
    // First candle: bullish
    const firstBullish = first.close > first.open;
    
    // Second candle: small body (star)
    const secondBodySize = Math.abs(second.close - second.open);
    const secondRange = second.high - second.low;
    const secondSmall = secondBodySize <= (secondRange * 0.3);
    
    // Third candle: bearish and closes below first candle's midpoint
    const thirdBearish = third.close < third.open;
    const firstMidpoint = (first.open + first.close) / 2;
    const thirdClosesLow = third.close < firstMidpoint;
    
    return firstBullish && secondSmall && thirdBearish && thirdClosesLow;
  }
  
  /**
   * Check if candle is a Spinning Top
   */
  isSpinningTop(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;
    
    // Small body with long shadows on both sides
    return bodySize <= (range * 0.3) &&
           upperShadow >= (range * 0.3) &&
           lowerShadow >= (range * 0.3);
  }

  /**
   * Check for Harami pattern
   */
  isHarami(candles) {
    if (candles.length < 2) return false;
    
    const [first, second] = candles;
    
    // First candle has large body, second has small body contained within first
    const firstBodySize = Math.abs(first.close - first.open);
    const secondBodySize = Math.abs(second.close - second.open);
    const firstRange = first.high - first.low;
    
    const firstLarge = firstBodySize >= (firstRange * 0.6);
    const secondSmall = secondBodySize <= (firstBodySize * 0.5);
    
    // Second candle is contained within first candle's body
    const contained = second.high <= Math.max(first.open, first.close) &&
                      second.low >= Math.min(first.open, first.close);
    
    return firstLarge && secondSmall && contained;
  }

  /**
   * Check for Piercing Line pattern
   */
  isPiercingLine(candles) {
    if (candles.length < 2) return false;
    
    const [first, second] = candles;
    
    // First candle is bearish, second is bullish
    const firstBearish = first.close < first.open;
    const secondBullish = second.close > second.open;
    
    // Second candle opens below first's low and closes above first's midpoint
    const firstMidpoint = (first.open + first.close) / 2;
    const piercing = second.open < first.low && second.close > firstMidpoint;
    
    return firstBearish && secondBullish && piercing;
  }

  /**
   * Check for Dark Cloud Cover pattern
   */
  isDarkCloud(candles) {
    if (candles.length < 2) return false;
    
    const [first, second] = candles;
    
    // First candle is bullish, second is bearish
    const firstBullish = first.close > first.open;
    const secondBearish = second.close < second.open;
    
    // Second candle opens above first's high and closes below first's midpoint
    const firstMidpoint = (first.open + first.close) / 2;
    const darkCloud = second.open > first.high && second.close < firstMidpoint;
    
    return firstBullish && secondBearish && darkCloud;
  }

  /**
   * Check for Three White Soldiers pattern
   */
  isThreeWhiteSoldiers(candles) {
    if (candles.length < 3) return false;
    
    const [first, second, third] = candles;
    
    // All three candles are bullish
    const allBullish = first.close > first.open &&
                       second.close > second.open &&
                       third.close > third.open;
    
    // Each candle opens within the previous candle's body
    const progressiveOpening = second.open > first.open && second.open < first.close &&
                               third.open > second.open && third.open < second.close;
    
    // Each candle closes higher than the previous
    const progressiveClosing = second.close > first.close && third.close > second.close;
    
    return allBullish && progressiveOpening && progressiveClosing;
  }

  /**
   * Check for Three Black Crows pattern
   */
  isThreeBlackCrows(candles) {
    if (candles.length < 3) return false;
    
    const [first, second, third] = candles;
    
    // All three candles are bearish
    const allBearish = first.close < first.open &&
                       second.close < second.open &&
                       third.close < third.open;
    
    // Each candle opens within the previous candle's body
    const progressiveOpening = second.open < first.open && second.open > first.close &&
                               third.open < second.open && third.open > second.close;
    
    // Each candle closes lower than the previous
    const progressiveClosing = second.close < first.close && third.close < second.close;
    
    return allBearish && progressiveOpening && progressiveClosing;
  }

  /**
   * Check if candle is a Spinning Top
   */
  isSpinningTop(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;
    
    // Small body with long shadows on both sides
    return bodySize <= (range * 0.3) &&
           upperShadow >= (range * 0.3) &&
           lowerShadow >= (range * 0.3);
  }

  /**
   * Check for Harami pattern
   */
  isHarami(candles) {
    if (candles.length < 2) return false;
    
    const [first, second] = candles;
    
    // First candle has large body, second has small body contained within first
    const firstBodySize = Math.abs(first.close - first.open);
    const secondBodySize = Math.abs(second.close - second.open);
    const firstRange = first.high - first.low;
    
    const firstLarge = firstBodySize >= (firstRange * 0.6);
    const secondSmall = secondBodySize <= (firstBodySize * 0.5);
    
    // Second candle is contained within first candle's body
    const contained = second.high <= Math.max(first.open, first.close) &&
                      second.low >= Math.min(first.open, first.close);
    
    return firstLarge && secondSmall && contained;
  }

  /**
   * Check for Piercing Line pattern
   */
  isPiercingLine(candles) {
    if (candles.length < 2) return false;
    
    const [first, second] = candles;
    
    // First candle is bearish, second is bullish
    const firstBearish = first.close < first.open;
    const secondBullish = second.close > second.open;
    
    // Second candle opens below first's low and closes above first's midpoint
    const firstMidpoint = (first.open + first.close) / 2;
    const piercing = second.open < first.low && second.close > firstMidpoint;
    
    return firstBearish && secondBullish && piercing;
  }

  /**
   * Check for Dark Cloud Cover pattern
   */
  isDarkCloud(candles) {
    if (candles.length < 2) return false;
    
    const [first, second] = candles;
    
    // First candle is bullish, second is bearish
    const firstBullish = first.close > first.open;
    const secondBearish = second.close < second.open;
    
    // Second candle opens above first's high and closes below first's midpoint
    const firstMidpoint = (first.open + first.close) / 2;
    const darkCloud = second.open > first.high && second.close < firstMidpoint;
    
    return firstBullish && secondBearish && darkCloud;
  }

  /**
   * Check for Three White Soldiers pattern
   */
  isThreeWhiteSoldiers(candles) {
    if (candles.length < 3) return false;
    
    const [first, second, third] = candles;
    
    // All three candles are bullish
    const allBullish = first.close > first.open &&
                       second.close > second.open &&
                       third.close > third.open;
    
    // Each candle opens within the previous candle's body
    const progressiveOpening = second.open > first.open && second.open < first.close &&
                               third.open > second.open && third.open < second.close;
    
    // Each candle closes higher than the previous
    const progressiveClosing = second.close > first.close && third.close > second.close;
    
    return allBullish && progressiveOpening && progressiveClosing;
  }

  /**
   * Check for Three Black Crows pattern
   */
  isThreeBlackCrows(candles) {
    if (candles.length < 3) return false;
    
    const [first, second, third] = candles;
    
    // All three candles are bearish
    const allBearish = first.close < first.open &&
                       second.close < second.open &&
                       third.close < third.open;
    
    // Each candle opens within the previous candle's body
    const progressiveOpening = second.open < first.open && second.open > first.close &&
                               third.open < second.open && third.open > second.close;
    
    // Each candle closes lower than the previous
    const progressiveClosing = second.close < first.close && third.close < second.close;
    
    return allBearish && progressiveOpening && progressiveClosing;
  }

  /**
   * Get the specific type of Doji
   */
  getDojiType(candle) {
    if (!this.isDoji(candle)) return 'Not a Doji';
    
    const bodySize = Math.abs(candle.close - candle.open);
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    
    // Long-legged doji (long upper and lower shadows)
    if (upperShadow > bodySize * 2 && lowerShadow > bodySize * 2) {
      return 'Long-legged Doji';
    }
    
    // Dragonfly doji (long lower shadow, minimal upper shadow)
    if (lowerShadow > bodySize * 3 && upperShadow < bodySize) {
      return 'Dragonfly Doji';
    }
    
    // Gravestone doji (long upper shadow, minimal lower shadow)
    if (upperShadow > bodySize * 3 && lowerShadow < bodySize) {
      return 'Gravestone Doji';
    }
    
    // Regular doji
    return 'Standard Doji';
  }
  
  /**
   * Check for Three White Soldiers pattern
   */
  isThreeWhiteSoldiers(candles) {
    if (candles.length !== 3) return false;
    
    const [first, second, third] = candles;
    
    // All three candles must be bullish
    const allBullish = first.close > first.open && 
                      second.close > second.open && 
                      third.close > third.open;
    
    if (!allBullish) return false;
    
    // Each candle should open within the previous candle's body
    const properOpens = second.open > first.open && second.open < first.close &&
                       third.open > second.open && third.open < second.close;
    
    // Each candle should close higher than the previous
    const higherCloses = second.close > first.close && third.close > second.close;
    
    // Each candle should have a decent body size
    const goodBodySizes = (second.close - second.open) >= (second.high - second.low) * 0.6 &&
                         (third.close - third.open) >= (third.high - third.low) * 0.6;
    
    return allBullish && properOpens && higherCloses && goodBodySizes;
  }
  
  /**
   * Check for Three Black Crows pattern
   */
  isThreeBlackCrows(candles) {
    if (candles.length !== 3) return false;
    
    const [first, second, third] = candles;
    
    // All three candles must be bearish
    const allBearish = first.close < first.open && 
                      second.close < second.open && 
                      third.close < third.open;
    
    if (!allBearish) return false;
    
    // Each candle should open within the previous candle's body
    const properOpens = second.open < first.open && second.open > first.close &&
                       third.open < second.open && third.open > second.close;
    
    // Each candle should close lower than the previous
    const lowerCloses = second.close < first.close && third.close < second.close;
    
    // Each candle should have a decent body size
    const goodBodySizes = (second.open - second.close) >= (second.high - second.low) * 0.6 &&
                         (third.open - third.close) >= (third.high - third.low) * 0.6;
    
    return allBearish && properOpens && lowerCloses && goodBodySizes;
  }

  /**
   * Generate pattern summary with enhanced details
   */
  generateSummary(detected, bullishCount, bearishCount) {
    if (detected.length === 0) {
      return 'No significant candlestick patterns detected.';
    }
    
    let summary = '';
    
    if (bullishCount > bearishCount) {
      summary = `Bullish patterns dominate (${bullishCount} bullish vs ${bearishCount} bearish). `;
    } else if (bearishCount > bullishCount) {
      summary = `Bearish patterns dominate (${bearishCount} bearish vs ${bullishCount} bullish). `;
    } else if (bullishCount > 0) {
      summary = `Mixed signals (${bullishCount} bullish, ${bearishCount} bearish). `;
    } else {
      summary = 'Neutral patterns detected. ';
    }
    
    // Add strongest pattern
    if (detected.length > 0) {
      // Sort patterns by strength
      const sortedPatterns = [...detected].sort((a, b) => {
        // Convert string strengths to numeric values for comparison
        const getStrengthValue = (strength) => {
          if (typeof strength === 'number') return strength;
          return strength === 'VERY_STRONG' ? 0.9 : 
                 strength === 'STRONG' ? 0.8 : 
                 strength === 'MODERATE' ? 0.7 : 0.6;
        };
        
        return getStrengthValue(b.strength) - getStrengthValue(a.strength);
      });
      
      const strongestPattern = sortedPatterns[0];
      summary += `Strongest pattern: ${strongestPattern.pattern} (${strongestPattern.type}).`;
    }
    
    return summary;
  }
}

module.exports = { CandlestickPatterns };
