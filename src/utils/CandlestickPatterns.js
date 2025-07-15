/**
 * CandlestickPatterns - Advanced Pattern Recognition
 * 
 * Detects various candlestick patterns for technical analysis
 */

class CandlestickPatterns {
  constructor() {
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
   * Detect all patterns in market data
   */
  detectPatterns(marketData) {
    if (!marketData || marketData.length < 3) {
      return {
        detected: [],
        bullishCount: 0,
        bearishCount: 0,
        summary: 'Insufficient data for pattern detection'
      };
    }
    
    const detected = [];
    let bullishCount = 0;
    let bearishCount = 0;
    
    // Check single candle patterns (last candle)
    const lastCandle = marketData[marketData.length - 1];
    
    if (this.isDoji(lastCandle)) {
      detected.push({ pattern: 'Doji', type: 'NEUTRAL', strength: 'MODERATE' });
    }
    
    if (this.isHammer(lastCandle)) {
      detected.push({ pattern: 'Hammer', type: 'BULLISH', strength: 'STRONG' });
      bullishCount++;
    }

    if (this.isInvertedHammer(lastCandle)) {
      detected.push({ pattern: 'Inverted Hammer', type: 'BULLISH', strength: 'MODERATE' });
      bullishCount++;
    }

    if (this.isShootingStar(lastCandle)) {
      detected.push({ pattern: 'Shooting Star', type: 'BEARISH', strength: 'STRONG' });
      bearishCount++;
    }

    if (this.isMarubozu(lastCandle)) {
      const marubozu = this.getMarubozuType(lastCandle);
      detected.push({
        pattern: `${marubozu.type} Marubozu`,
        type: marubozu.signal,
        strength: 'STRONG'
      });
      if (marubozu.signal === 'BULLISH') bullishCount++;
      else bearishCount++;
    }
    
    if (this.isInvertedHammer(lastCandle)) {
      detected.push({ pattern: 'Inverted Hammer', type: 'BULLISH', strength: 'MODERATE' });
      bullishCount++;
    }
    
    if (this.isShootingStar(lastCandle)) {
      detected.push({ pattern: 'Shooting Star', type: 'BEARISH', strength: 'STRONG' });
      bearishCount++;
    }
    
    const marubozuResult = this.isMarubozu(lastCandle);
    if (marubozuResult) {
      detected.push({ 
        pattern: `${marubozuResult} Marubozu`, 
        type: marubozuResult === 'Bullish' ? 'BULLISH' : 'BEARISH', 
        strength: 'STRONG' 
      });
      if (marubozuResult === 'Bullish') bullishCount++;
      else bearishCount++;
    }
    
    // Check two candle patterns
    if (marketData.length >= 2) {
      const prevCandle = marketData[marketData.length - 2];
      
      if (this.isBullishEngulfing(prevCandle, lastCandle)) {
        detected.push({ pattern: 'Bullish Engulfing', type: 'BULLISH', strength: 'VERY_STRONG' });
        bullishCount++;
      }
      
      if (this.isBearishEngulfing(prevCandle, lastCandle)) {
        detected.push({ pattern: 'Bearish Engulfing', type: 'BEARISH', strength: 'VERY_STRONG' });
        bearishCount++;
      }
    }
    
    // Check three candle patterns
    if (marketData.length >= 3) {
      const threeCandles = marketData.slice(-3);
      
      if (this.isMorningStar(threeCandles)) {
        detected.push({ pattern: 'Morning Star', type: 'BULLISH', strength: 'VERY_STRONG' });
        bullishCount++;
      }
      
      if (this.isEveningStar(threeCandles)) {
        detected.push({ pattern: 'Evening Star', type: 'BEARISH', strength: 'VERY_STRONG' });
        bearishCount++;
      }
    }
    
    return {
      detected: detected,
      bullishCount: bullishCount,
      bearishCount: bearishCount,
      summary: this.generateSummary(detected, bullishCount, bearishCount)
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
   * Generate pattern summary
   */
  generateSummary(detected, bullishCount, bearishCount) {
    if (detected.length === 0) {
      return 'No significant patterns detected';
    }
    
    if (bullishCount > bearishCount) {
      return `Bullish patterns dominate (${bullishCount} bullish vs ${bearishCount} bearish)`;
    } else if (bearishCount > bullishCount) {
      return `Bearish patterns dominate (${bearishCount} bearish vs ${bearishCount} bullish)`;
    } else {
      return `Mixed signals (${bullishCount} bullish, ${bearishCount} bearish)`;
    }
  }
}

module.exports = { CandlestickPatterns };
