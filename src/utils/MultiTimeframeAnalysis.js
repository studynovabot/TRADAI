/**
 * MultiTimeframeAnalysis - Advanced Market Analysis Across Multiple Timeframes
 * 
 * Analyzes market data across multiple timeframes to identify high-confidence
 * trading signals with strong confluence
 */

const { TechnicalIndicators } = require('./TechnicalIndicators');
const { CandlestickPatterns } = require('./CandlestickPatterns');

class MultiTimeframeAnalysis {
  constructor() {
    this.timeframes = ['5m', '15m', '30m', '1h', '4h', '1d'];
    this.candlestickPatterns = new CandlestickPatterns();
    this.confidenceThresholds = {
      minimum: 60,  // Minimum confidence to generate any signal
      noTrade: 70,  // Below this threshold, recommend NO TRADE
      moderate: 80, // Moderate confidence
      high: 90      // High confidence
    };
  }

  /**
   * Analyze market data across multiple timeframes
   * @param {Object} marketData - Object containing candle data for each timeframe
   * @returns {Object} - Analysis results with signal recommendation
   */
  analyzeTimeframes(marketData) {
    // Validate input data
    if (!marketData || Object.keys(marketData).length === 0) {
      return {
        error: 'No market data provided for analysis'
      };
    }

    const timeframesAnalyzed = [];
    const timeframeResults = {};
    let bullishTimeframes = [];
    let bearishTimeframes = [];
    let neutralTimeframes = [];
    
    // Analyze each timeframe
    for (const timeframe of this.timeframes) {
      if (marketData[timeframe] && marketData[timeframe].length >= 50) {
        timeframesAnalyzed.push(timeframe);
        
        // Calculate indicators for this timeframe
        const indicators = TechnicalIndicators.calculateAllIndicators(marketData[timeframe]);
        
        // Detect candlestick patterns
        const patterns = this.candlestickPatterns.detectPatterns(marketData[timeframe]);
        
        // Determine timeframe bias
        const timeframeBias = this.determineTimeframeBias(indicators, patterns);
        
        // Store results for this timeframe
        timeframeResults[timeframe] = {
          indicators,
          patterns,
          bias: timeframeBias
        };
        
        // Track timeframe biases
        if (timeframeBias.bias === 'bullish') {
          bullishTimeframes.push(timeframe);
        } else if (timeframeBias.bias === 'bearish') {
          bearishTimeframes.push(timeframe);
        } else {
          neutralTimeframes.push(timeframe);
        }
      }
    }
    
    // Calculate overall signal based on timeframe confluence
    const signalResult = this.calculateOverallSignal(
      timeframeResults, 
      bullishTimeframes, 
      bearishTimeframes, 
      neutralTimeframes
    );
    
    return {
      timeframes_analyzed: timeframesAnalyzed,
      timeframe_results: timeframeResults,
      confluence: {
        bullishTimeframes,
        bearishTimeframes,
        neutralTimeframes
      },
      signal: signalResult.signal,
      confidence: signalResult.confidence,
      reason: signalResult.reason,
      mainPattern: signalResult.mainPattern
    };
  }

  /**
   * Determine the bias (bullish/bearish/neutral) for a single timeframe
   * @param {Object} indicators - Calculated indicators for the timeframe
   * @param {Object} patterns - Detected patterns for the timeframe
   * @returns {Object} - Timeframe bias with confidence and reasons
   */
  determineTimeframeBias(indicators, patterns) {
    let bullishFactors = [];
    let bearishFactors = [];
    
    // Check RSI
    if (indicators.rsi) {
      if (indicators.rsi < 30) {
        bullishFactors.push({ factor: 'RSI', value: `Oversold (${indicators.rsi.toFixed(2)})` });
      } else if (indicators.rsi > 70) {
        bearishFactors.push({ factor: 'RSI', value: `Overbought (${indicators.rsi.toFixed(2)})` });
      }
    }
    
    // Check MACD
    if (indicators.macd) {
      if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
        bullishFactors.push({ factor: 'MACD', value: 'Bullish crossover' });
      } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
        bearishFactors.push({ factor: 'MACD', value: 'Bearish crossover' });
      }
    }
    
    // Check EMAs
    if (indicators.ema) {
      if (indicators.ema.ema8 > indicators.ema.ema21 && indicators.ema.ema21 > indicators.ema.ema50) {
        bullishFactors.push({ factor: 'EMA', value: 'Bullish alignment (8 > 21 > 50)' });
      } else if (indicators.ema.ema8 < indicators.ema.ema21 && indicators.ema.ema21 < indicators.ema.ema50) {
        bearishFactors.push({ factor: 'EMA', value: 'Bearish alignment (8 < 21 < 50)' });
      }
    }
    
    // Check Bollinger Bands
    if (indicators.bollinger) {
      const lastPrice = indicators.bollinger.middle; // Using middle band as a proxy for last price
      if (lastPrice < indicators.bollinger.lower) {
        bullishFactors.push({ factor: 'Bollinger', value: 'Price below lower band' });
      } else if (lastPrice > indicators.bollinger.upper) {
        bearishFactors.push({ factor: 'Bollinger', value: 'Price above upper band' });
      }
    }
    
    // Check Volume
    if (indicators.volume) {
      if (indicators.volume.trend.includes('increasing') && indicators.volume.isSpike) {
        // Volume trend supports the price direction
        if (bullishFactors.length > bearishFactors.length) {
          bullishFactors.push({ factor: 'Volume', value: 'Increasing volume supports uptrend' });
        } else if (bearishFactors.length > bullishFactors.length) {
          bearishFactors.push({ factor: 'Volume', value: 'Increasing volume supports downtrend' });
        }
      }
    }
    
    // Check Support/Resistance
    if (indicators.supportResistance) {
      const { support, resistance, currentPrice } = indicators.supportResistance;
      
      // Check if price is near support
      if (support.length > 0) {
        const closestSupport = support[support.length - 1];
        const distanceToSupport = (currentPrice - closestSupport.price) / currentPrice * 100;
        
        if (distanceToSupport < 1) { // Within 1% of support
          bullishFactors.push({ factor: 'Support', value: `Price near strong support (${closestSupport.price.toFixed(2)})` });
        }
      }
      
      // Check if price is near resistance
      if (resistance.length > 0) {
        const closestResistance = resistance[0];
        const distanceToResistance = (closestResistance.price - currentPrice) / currentPrice * 100;
        
        if (distanceToResistance < 1) { // Within 1% of resistance
          bearishFactors.push({ factor: 'Resistance', value: `Price near strong resistance (${closestResistance.price.toFixed(2)})` });
        }
      }
    }
    
    // Check Candlestick Patterns
    if (patterns && patterns.detected && patterns.detected.length > 0) {
      patterns.detected.forEach(pattern => {
        if (pattern.type === 'BULLISH') {
          bullishFactors.push({ factor: 'Pattern', value: `${pattern.pattern}` });
        } else if (pattern.type === 'BEARISH') {
          bearishFactors.push({ factor: 'Pattern', value: `${pattern.pattern}` });
        }
      });
    }
    
    // Determine overall bias for this timeframe
    let bias = 'neutral';
    let confidence = 50;
    let reasons = [];
    
    if (bullishFactors.length > bearishFactors.length) {
      bias = 'bullish';
      confidence = 50 + (bullishFactors.length * 5);
      reasons = bullishFactors.map(f => `${f.factor}: ${f.value}`);
    } else if (bearishFactors.length > bullishFactors.length) {
      bias = 'bearish';
      confidence = 50 + (bearishFactors.length * 5);
      reasons = bearishFactors.map(f => `${f.factor}: ${f.value}`);
    } else {
      reasons = [...bullishFactors, ...bearishFactors].map(f => `${f.factor}: ${f.value}`);
    }
    
    // Cap confidence at 95%
    confidence = Math.min(confidence, 95);
    
    return {
      bias,
      confidence,
      bullishFactors,
      bearishFactors,
      reasons: reasons.join(', ')
    };
  }

  /**
   * Calculate the overall signal based on timeframe confluence
   * @param {Object} timeframeResults - Analysis results for each timeframe
   * @param {Array} bullishTimeframes - List of timeframes with bullish bias
   * @param {Array} bearishTimeframes - List of timeframes with bearish bias
   * @param {Array} neutralTimeframes - List of timeframes with neutral bias
   * @returns {Object} - Overall signal recommendation
   */
  calculateOverallSignal(timeframeResults, bullishTimeframes, bearishTimeframes, neutralTimeframes) {
    // Default to NO TRADE
    let signal = 'NO TRADE';
    let confidence = 50;
    let reason = 'Insufficient confluence across timeframes.';
    let mainPattern = null;
    
    const totalTimeframes = bullishTimeframes.length + bearishTimeframes.length + neutralTimeframes.length;
    
    // Calculate bullish and bearish percentages
    const bullishPercentage = (bullishTimeframes.length / totalTimeframes) * 100;
    const bearishPercentage = (bearishTimeframes.length / totalTimeframes) * 100;
    
    // Find the strongest pattern across all timeframes
    let strongestPattern = null;
    let highestPatternStrength = 0;
    
    Object.keys(timeframeResults).forEach(timeframe => {
      const result = timeframeResults[timeframe];
      if (result.patterns && result.patterns.mainPattern) {
        const pattern = result.patterns.mainPattern;
        if (pattern.strength > highestPatternStrength) {
          highestPatternStrength = pattern.strength;
          strongestPattern = {
            ...pattern,
            timeframe
          };
        }
      }
    });
    
    // Determine signal based on timeframe confluence
    if (bullishPercentage >= 60 && bullishTimeframes.length >= 3) {
      signal = 'BUY';
      confidence = Math.min(95, 60 + (bullishPercentage - 60) * 1.5);
      
      // Check if higher timeframes are aligned for stronger confidence
      const higherTimeframesAligned = ['1h', '4h', '1d'].every(tf => 
        bullishTimeframes.includes(tf)
      );
      
      if (higherTimeframesAligned) {
        confidence += 10;
        reason = 'Strong bullish confluence across multiple timeframes, including higher timeframes. ';
      } else {
        reason = 'Bullish confluence across multiple timeframes. ';
      }
      
      // Add pattern information if available
      if (strongestPattern && strongestPattern.direction === 'bullish') {
        reason += `${this.capitalizeFirstLetter(strongestPattern.type.replace('_', ' '))} pattern detected on ${strongestPattern.timeframe} timeframe. `;
        confidence += 5;
        mainPattern = strongestPattern;
      }
      
    } else if (bearishPercentage >= 60 && bearishTimeframes.length >= 3) {
      signal = 'SELL';
      confidence = Math.min(95, 60 + (bearishPercentage - 60) * 1.5);
      
      // Check if higher timeframes are aligned for stronger confidence
      const higherTimeframesAligned = ['1h', '4h', '1d'].every(tf => 
        bearishTimeframes.includes(tf)
      );
      
      if (higherTimeframesAligned) {
        confidence += 10;
        reason = 'Strong bearish confluence across multiple timeframes, including higher timeframes. ';
      } else {
        reason = 'Bearish confluence across multiple timeframes. ';
      }
      
      // Add pattern information if available
      if (strongestPattern && strongestPattern.direction === 'bearish') {
        reason += `${this.capitalizeFirstLetter(strongestPattern.type.replace('_', ' '))} pattern detected on ${strongestPattern.timeframe} timeframe. `;
        confidence += 5;
        mainPattern = strongestPattern;
      }
      
    } else {
      // Calculate a more dynamic confidence based on the actual market conditions
      // Base confidence starts at 20% and increases based on the strongest bias
      const baseConfidence = 20;
      const maxBiasPercentage = Math.max(bullishPercentage, bearishPercentage);
      const biasStrength = maxBiasPercentage / 100; // Convert to 0-1 scale
      
      // Calculate confidence: base + (bias strength * 50) to get a range of 20-70%
      confidence = baseConfidence + (biasStrength * 50);
      
      // Add additional confidence if there's a strong pattern
      if (strongestPattern && strongestPattern.strength > 0.7) {
        confidence += strongestPattern.strength * 10;
      }
      
      reason = 'Insufficient confluence across timeframes. Mixed signals detected. ';
      
      if (neutralTimeframes.length > totalTimeframes / 2) {
        reason += 'Market is showing mostly neutral conditions. ';
      } else if (bullishTimeframes.length === bearishTimeframes.length) {
        reason += 'Equal bullish and bearish signals across timeframes. ';
      } else if (bullishTimeframes.length > bearishTimeframes.length) {
        reason += `Slight bullish bias (${bullishPercentage.toFixed(1)}%) but insufficient for a high-confidence signal. `;
      } else {
        reason += `Slight bearish bias (${bearishPercentage.toFixed(1)}%) but insufficient for a high-confidence signal. `;
      }
    }
    
    // Cap confidence at 95%
    confidence = Math.min(Math.round(confidence), 95);
    
    // Add additional context to the reason
    reason += `Analysis based on ${totalTimeframes} timeframes (${bullishTimeframes.length} bullish, ${bearishTimeframes.length} bearish, ${neutralTimeframes.length} neutral).`;
    
    return {
      signal,
      confidence,
      reason,
      mainPattern
    };
  }

  /**
   * Helper function to capitalize the first letter of a string
   * @param {String} string - Input string
   * @returns {String} - String with first letter capitalized
   */
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

module.exports = { MultiTimeframeAnalysis };