/**
 * Enhanced Technical Analysis Engine for TRADAI
 * Comprehensive indicator analysis with pattern recognition and market sentiment
 */

const { 
  RSI, MACD, BollingerBands, Stochastic, EMA, SMA, 
  ATR, ADX, CCI, Williams, OBV, VWAP 
} = require('technicalindicators');

class EnhancedTechnicalAnalyzer {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    
    // Indicator periods
    this.periods = {
      rsi: 14,
      macd: { fast: 12, slow: 26, signal: 9 },
      bollinger: { period: 20, stdDev: 2 },
      stochastic: { k: 14, d: 3 },
      ema: [9, 21, 50, 200],
      sma: [20, 50, 100, 200],
      atr: 14,
      adx: 14,
      cci: 20,
      williams: 14
    };
    
    // Pattern recognition
    this.patterns = new Map();
    this.supportResistanceLevels = [];
    
    // Market regime detection
    this.marketRegime = 'UNKNOWN';
    this.volatilityState = 'NORMAL';
    
    // Multi-timeframe data storage
    this.timeframeData = new Map();
  }

  /**
   * Perform comprehensive technical analysis
   */
  async analyzeMarket(marketData, currencyPair, timeframe) {
    try {
      if (marketData.length < 50) {
        throw new Error('Insufficient data for comprehensive analysis');
      }

      this.logger.info(`📊 Starting enhanced technical analysis for ${currencyPair} (${timeframe})`);

      // Extract OHLCV arrays
      const closes = marketData.map(candle => candle.close);
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const opens = marketData.map(candle => candle.open);
      const volumes = marketData.map(candle => candle.volume || 0);

      // Core technical indicators
      const indicators = await this.calculateIndicators(closes, highs, lows, opens, volumes);
      
      // Pattern recognition
      const patterns = this.detectPatterns(marketData.slice(-10));
      
      // Support/Resistance levels
      const supportResistance = this.calculateSupportResistance(highs, lows, closes);
      
      // Market regime detection
      const marketRegime = this.detectMarketRegime(closes, indicators);
      
      // Volume analysis
      const volumeAnalysis = this.analyzeVolume(volumes, closes);
      
      // Volatility analysis
      const volatilityAnalysis = this.analyzeVolatility(closes, indicators.atr);
      
      // Multi-timeframe confluence
      const confluence = await this.calculateConfluence(currencyPair, timeframe, indicators);
      
      // Market sentiment indicators
      const sentiment = this.calculateMarketSentiment(indicators, patterns, marketRegime);
      
      // Risk assessment
      const riskAssessment = this.assessRisk(indicators, volatilityAnalysis, marketRegime);

      const analysis = {
        timestamp: new Date(),
        currencyPair,
        timeframe,
        currentPrice: closes[closes.length - 1],
        priceChange: this.calculatePriceChange(closes),
        
        // Core indicators
        indicators,
        
        // Pattern analysis
        patterns,
        candlestickPatterns: this.analyzeCandlestickPatterns(marketData.slice(-5)),
        
        // Levels
        supportResistance,
        
        // Market context
        marketRegime,
        volatilityAnalysis,
        volumeAnalysis,
        sentiment,
        confluence,
        
        // Risk metrics
        riskAssessment,
        
        // Trading signals
        signals: this.generateTradingSignals(indicators, patterns, marketRegime, sentiment),
        
        // Quality score
        dataQuality: this.assessDataQuality(marketData),
        
        // Educational insights
        insights: this.generateEducationalInsights(indicators, patterns, marketRegime)
      };

      this.logger.info(`✅ Technical analysis completed for ${currencyPair}`);
      return analysis;

    } catch (error) {
      this.logger.error('❌ Enhanced technical analysis error:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive technical indicators
   */
  async calculateIndicators(closes, highs, lows, opens, volumes) {
    const indicators = {};

    try {
      // Ensure we have enough data points
      if (closes.length < 50) {
        this.logger.warn(`⚠️ Insufficient data points: ${closes.length}. Some indicators may be inaccurate.`);
      }

      // Momentum indicators
      indicators.rsi = closes.length >= this.periods.rsi ?
        RSI.calculate({ values: closes, period: this.periods.rsi }) : [];
      indicators.stochastic = closes.length >= Math.max(this.periods.stochastic.k, this.periods.stochastic.d) ?
        Stochastic.calculate({
          high: highs,
          low: lows,
          close: closes,
          periodK: this.periods.stochastic.k,
          periodD: this.periods.stochastic.d
        }) : [];

      indicators.williams = closes.length >= this.periods.williams ?
        Williams.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: this.periods.williams
        }) : [];

      indicators.cci = closes.length >= this.periods.cci ?
        CCI.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: this.periods.cci
        }) : [];

      // Trend indicators
      indicators.macd = MACD.calculate({
        values: closes,
        fastPeriod: this.periods.macd.fast,
        slowPeriod: this.periods.macd.slow,
        signalPeriod: this.periods.macd.signal
      });
      
      indicators.adx = ADX.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: this.periods.adx
      });

      // Moving averages
      indicators.ema = {};
      indicators.sma = {};
      
      for (const period of this.periods.ema) {
        indicators.ema[`ema${period}`] = EMA.calculate({ values: closes, period });
      }
      
      for (const period of this.periods.sma) {
        indicators.sma[`sma${period}`] = SMA.calculate({ values: closes, period });
      }

      // Volatility indicators
      indicators.bollinger = BollingerBands.calculate({
        values: closes,
        period: this.periods.bollinger.period,
        stdDev: this.periods.bollinger.stdDev
      });
      
      indicators.atr = ATR.calculate({
        high: highs,
        low: lows,
        close: closes,
        period: this.periods.atr
      });

      // Volume indicators
      if (volumes.some(v => v > 0)) {
        indicators.obv = OBV.calculate({ close: closes, volume: volumes });
        indicators.vwap = this.calculateVWAP(highs, lows, closes, volumes);
      }

      // Get latest values
      const latest = {};
      Object.keys(indicators).forEach(key => {
        const indicator = indicators[key];
        if (Array.isArray(indicator) && indicator.length > 0) {
          latest[key] = indicator[indicator.length - 1];
        } else if (typeof indicator === 'object' && indicator !== null) {
          latest[key] = {};
          Object.keys(indicator).forEach(subKey => {
            const subIndicator = indicator[subKey];
            if (Array.isArray(subIndicator) && subIndicator.length > 0) {
              latest[key][subKey] = subIndicator[subIndicator.length - 1];
            }
          });
        }
      });

      return { raw: indicators, latest };

    } catch (error) {
      this.logger.error('❌ Indicator calculation error:', error);
      return { raw: {}, latest: {} };
    }
  }

  /**
   * Detect candlestick patterns
   */
  detectPatterns(recentData) {
    const patterns = [];
    
    if (recentData.length < 3) return patterns;

    const current = recentData[recentData.length - 1];
    const previous = recentData[recentData.length - 2];
    const beforePrevious = recentData[recentData.length - 3];

    // Doji pattern
    if (this.isDoji(current)) {
      patterns.push({
        name: 'Doji',
        type: 'REVERSAL',
        strength: 'MEDIUM',
        description: 'Indecision in the market'
      });
    }

    // Hammer pattern
    if (this.isHammer(current)) {
      patterns.push({
        name: 'Hammer',
        type: 'BULLISH_REVERSAL',
        strength: 'STRONG',
        description: 'Potential bullish reversal'
      });
    }

    // Shooting star
    if (this.isShootingStar(current)) {
      patterns.push({
        name: 'Shooting Star',
        type: 'BEARISH_REVERSAL',
        strength: 'STRONG',
        description: 'Potential bearish reversal'
      });
    }

    // Engulfing patterns
    if (this.isBullishEngulfing(previous, current)) {
      patterns.push({
        name: 'Bullish Engulfing',
        type: 'BULLISH_REVERSAL',
        strength: 'VERY_STRONG',
        description: 'Strong bullish reversal signal'
      });
    }

    if (this.isBearishEngulfing(previous, current)) {
      patterns.push({
        name: 'Bearish Engulfing',
        type: 'BEARISH_REVERSAL',
        strength: 'VERY_STRONG',
        description: 'Strong bearish reversal signal'
      });
    }

    // Three-candle patterns
    if (recentData.length >= 3) {
      if (this.isMorningStar(beforePrevious, previous, current)) {
        patterns.push({
          name: 'Morning Star',
          type: 'BULLISH_REVERSAL',
          strength: 'VERY_STRONG',
          description: 'Three-candle bullish reversal'
        });
      }

      if (this.isEveningStar(beforePrevious, previous, current)) {
        patterns.push({
          name: 'Evening Star',
          type: 'BEARISH_REVERSAL',
          strength: 'VERY_STRONG',
          description: 'Three-candle bearish reversal'
        });
      }
    }

    return patterns;
  }

  /**
   * Calculate support and resistance levels
   */
  calculateSupportResistance(highs, lows, closes) {
    const levels = [];
    const lookback = Math.min(50, highs.length);
    const recentHighs = highs.slice(-lookback);
    const recentLows = lows.slice(-lookback);
    
    // Find pivot highs and lows
    const pivotHighs = this.findPivotPoints(recentHighs, 'high');
    const pivotLows = this.findPivotPoints(recentLows, 'low');
    
    // Current price for context
    const currentPrice = closes[closes.length - 1];
    
    // Add resistance levels (above current price)
    pivotHighs
      .filter(level => level > currentPrice)
      .sort((a, b) => a - b)
      .slice(0, 3)
      .forEach((level, index) => {
        levels.push({
          type: 'RESISTANCE',
          price: level,
          strength: index === 0 ? 'STRONG' : 'MEDIUM',
          distance: ((level - currentPrice) / currentPrice * 100).toFixed(2)
        });
      });
    
    // Add support levels (below current price)
    pivotLows
      .filter(level => level < currentPrice)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .forEach((level, index) => {
        levels.push({
          type: 'SUPPORT',
          price: level,
          strength: index === 0 ? 'STRONG' : 'MEDIUM',
          distance: ((currentPrice - level) / currentPrice * 100).toFixed(2)
        });
      });
    
    return levels;
  }

  /**
   * Detect market regime (trending, ranging, volatile)
   */
  detectMarketRegime(closes, indicators) {
    const adx = indicators.latest.adx;
    const atr = indicators.latest.atr;
    const recentCloses = closes.slice(-20);
    
    // Calculate price movement efficiency
    const totalMove = Math.abs(recentCloses[recentCloses.length - 1] - recentCloses[0]);
    const actualMove = recentCloses.reduce((sum, close, i) => {
      if (i === 0) return 0;
      return sum + Math.abs(close - recentCloses[i - 1]);
    }, 0);
    
    const efficiency = totalMove / actualMove;
    
    let regime = 'RANGING';
    let confidence = 'MEDIUM';
    
    if (adx > 25 && efficiency > 0.3) {
      regime = 'TRENDING';
      confidence = adx > 40 ? 'HIGH' : 'MEDIUM';
    } else if (atr && atr > closes[closes.length - 1] * 0.01) {
      regime = 'VOLATILE';
      confidence = 'HIGH';
    }
    
    return {
      regime,
      confidence,
      adx: adx || 0,
      efficiency: efficiency.toFixed(3),
      volatility: atr ? (atr / closes[closes.length - 1] * 100).toFixed(2) : 0
    };
  }

  /**
   * Analyze volume patterns
   */
  analyzeVolume(volumes, closes) {
    if (!volumes || volumes.every(v => v === 0)) {
      return { available: false, message: 'Volume data not available' };
    }
    
    const recentVolumes = volumes.slice(-20);
    const recentCloses = closes.slice(-20);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    const volumeRatio = currentVolume / avgVolume;
    const priceChange = (recentCloses[recentCloses.length - 1] - recentCloses[recentCloses.length - 2]) / recentCloses[recentCloses.length - 2];
    
    let signal = 'NEUTRAL';
    let strength = 'NORMAL';
    
    if (volumeRatio > 1.5) {
      strength = 'HIGH';
      signal = priceChange > 0 ? 'BULLISH' : 'BEARISH';
    } else if (volumeRatio < 0.5) {
      strength = 'LOW';
    }
    
    return {
      available: true,
      currentVolume,
      avgVolume: avgVolume.toFixed(0),
      volumeRatio: volumeRatio.toFixed(2),
      signal,
      strength,
      interpretation: this.interpretVolumeSignal(signal, strength, priceChange)
    };
  }

  /**
   * Generate trading signals based on all analysis
   */
  generateTradingSignals(indicators, patterns, marketRegime, sentiment) {
    const signals = [];
    const latest = indicators.latest;
    
    // RSI signals
    if (latest.rsi < 30) {
      signals.push({
        type: 'BUY',
        source: 'RSI',
        strength: 'MEDIUM',
        description: 'RSI oversold condition'
      });
    } else if (latest.rsi > 70) {
      signals.push({
        type: 'SELL',
        source: 'RSI',
        strength: 'MEDIUM',
        description: 'RSI overbought condition'
      });
    }
    
    // MACD signals
    if (latest.macd && latest.macd.macd > latest.macd.signal && latest.macd.histogram > 0) {
      signals.push({
        type: 'BUY',
        source: 'MACD',
        strength: 'STRONG',
        description: 'MACD bullish crossover'
      });
    } else if (latest.macd && latest.macd.macd < latest.macd.signal && latest.macd.histogram < 0) {
      signals.push({
        type: 'SELL',
        source: 'MACD',
        strength: 'STRONG',
        description: 'MACD bearish crossover'
      });
    }
    
    // Pattern signals
    patterns.forEach(pattern => {
      if (pattern.type.includes('BULLISH')) {
        signals.push({
          type: 'BUY',
          source: 'PATTERN',
          strength: pattern.strength,
          description: pattern.name + ' - ' + pattern.description
        });
      } else if (pattern.type.includes('BEARISH')) {
        signals.push({
          type: 'SELL',
          source: 'PATTERN',
          strength: pattern.strength,
          description: pattern.name + ' - ' + pattern.description
        });
      }
    });
    
    return signals;
  }

  /**
   * Calculate market sentiment score
   */
  calculateMarketSentiment(indicators, patterns, marketRegime) {
    let bullishScore = 0;
    let bearishScore = 0;
    const latest = indicators.latest;
    
    // RSI sentiment
    if (latest.rsi < 40) bullishScore += 1;
    else if (latest.rsi > 60) bearishScore += 1;
    
    // MACD sentiment
    if (latest.macd && latest.macd.histogram > 0) bullishScore += 1;
    else if (latest.macd && latest.macd.histogram < 0) bearishScore += 1;
    
    // Pattern sentiment
    patterns.forEach(pattern => {
      if (pattern.type.includes('BULLISH')) bullishScore += 1;
      else if (pattern.type.includes('BEARISH')) bearishScore += 1;
    });
    
    // Market regime adjustment
    if (marketRegime.regime === 'TRENDING') {
      // Amplify signals in trending markets
      bullishScore *= 1.2;
      bearishScore *= 1.2;
    }
    
    const totalScore = bullishScore + bearishScore;
    const sentiment = totalScore === 0 ? 'NEUTRAL' : 
                     bullishScore > bearishScore ? 'BULLISH' : 'BEARISH';
    
    const confidence = totalScore === 0 ? 0 : 
                      Math.abs(bullishScore - bearishScore) / totalScore * 100;
    
    return {
      sentiment,
      confidence: confidence.toFixed(1),
      bullishScore,
      bearishScore,
      factors: totalScore
    };
  }

  // Helper methods for pattern recognition
  isDoji(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const range = candle.high - candle.low;
    return bodySize / range < 0.1;
  }

  isHammer(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    return lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5;
  }

  isShootingStar(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    return upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5;
  }

  isBullishEngulfing(prev, curr) {
    return prev.close < prev.open && // Previous bearish
           curr.close > curr.open && // Current bullish
           curr.open < prev.close && // Current opens below prev close
           curr.close > prev.open;   // Current closes above prev open
  }

  isBearishEngulfing(prev, curr) {
    return prev.close > prev.open && // Previous bullish
           curr.close < curr.open && // Current bearish
           curr.open > prev.close && // Current opens above prev close
           curr.close < prev.open;   // Current closes below prev open
  }

  isMorningStar(first, second, third) {
    // First candle: bearish (red)
    const firstBearish = first.close < first.open;
    // Second candle: small body (doji-like), gaps down
    const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3;
    const secondGapsDown = second.high < first.close;
    // Third candle: bullish (green), closes above first candle's midpoint
    const thirdBullish = third.close > third.open;
    const thirdClosesHigh = third.close > (first.open + first.close) / 2;

    return firstBearish && secondSmall && secondGapsDown && thirdBullish && thirdClosesHigh;
  }

  isEveningStar(first, second, third) {
    // First candle: bullish (green)
    const firstBullish = first.close > first.open;
    // Second candle: small body (doji-like), gaps up
    const secondSmall = Math.abs(second.close - second.open) < Math.abs(first.close - first.open) * 0.3;
    const secondGapsUp = second.low > first.close;
    // Third candle: bearish (red), closes below first candle's midpoint
    const thirdBearish = third.close < third.open;
    const thirdClosesLow = third.close < (first.open + first.close) / 2;

    return firstBullish && secondSmall && secondGapsUp && thirdBearish && thirdClosesLow;
  }

  calculatePriceChange(closes) {
    if (closes.length < 2) return 0;
    const current = closes[closes.length - 1];
    const previous = closes[closes.length - 2];
    return ((current - previous) / previous * 100).toFixed(3);
  }

  assessDataQuality(marketData) {
    const completeness = marketData.filter(candle => 
      candle.open && candle.high && candle.low && candle.close
    ).length / marketData.length;
    
    return {
      score: completeness > 0.95 ? 'EXCELLENT' : 
             completeness > 0.9 ? 'GOOD' : 
             completeness > 0.8 ? 'FAIR' : 'POOR',
      completeness: (completeness * 100).toFixed(1),
      dataPoints: marketData.length
    };
  }

  generateEducationalInsights(indicators, patterns, marketRegime) {
    const insights = [];
    const latest = indicators.latest;
    
    if (latest.rsi < 30) {
      insights.push("RSI below 30 suggests oversold conditions - potential buying opportunity when combined with other bullish signals.");
    }
    
    if (marketRegime.regime === 'TRENDING' && marketRegime.confidence === 'HIGH') {
      insights.push("Strong trending market detected - trend-following strategies may be more effective than reversal plays.");
    }
    
    patterns.forEach(pattern => {
      if (pattern.strength === 'VERY_STRONG') {
        insights.push(`${pattern.name} is a reliable ${pattern.type.toLowerCase()} pattern with high success rate.`);
      }
    });
    
    return insights;
  }

  findPivotPoints(prices, type) {
    const pivots = [];
    const minPeriod = 5; // Minimum periods to look for pivots

    for (let i = minPeriod; i < prices.length - minPeriod; i++) {
      let isPivot = true;
      const currentPrice = prices[i];

      // Check if current price is a pivot high or low
      for (let j = 1; j <= minPeriod; j++) {
        if (type === 'high') {
          // For pivot high, current should be higher than surrounding prices
          if (currentPrice <= prices[i - j] || currentPrice <= prices[i + j]) {
            isPivot = false;
            break;
          }
        } else {
          // For pivot low, current should be lower than surrounding prices
          if (currentPrice >= prices[i - j] || currentPrice >= prices[i + j]) {
            isPivot = false;
            break;
          }
        }
      }

      if (isPivot) {
        pivots.push({
          price: currentPrice,
          index: i,
          type: type.toUpperCase()
        });
      }
    }

    return pivots;
  }

  interpretVolumeSignal(signal, strength, priceChange) {
    const interpretations = {
      'HIGH_VOLUME_UP': 'Strong buying pressure - bullish confirmation',
      'HIGH_VOLUME_DOWN': 'Strong selling pressure - bearish confirmation',
      'LOW_VOLUME_UP': 'Weak buying interest - potential reversal',
      'LOW_VOLUME_DOWN': 'Weak selling pressure - potential bounce',
      'AVERAGE_VOLUME': 'Normal trading activity - no strong signal'
    };

    let interpretation = interpretations[signal] || 'Volume analysis inconclusive';

    if (strength === 'VERY_HIGH') {
      interpretation += ' - Extremely significant volume activity';
    } else if (strength === 'HIGH') {
      interpretation += ' - Significant volume activity';
    }

    return interpretation;
  }

  analyzeVolatility(closes, atr) {
    if (!closes || closes.length < 20) {
      return {
        level: 'UNKNOWN',
        atr: 0,
        percentile: 0,
        interpretation: 'Insufficient data for volatility analysis'
      };
    }

    const currentATR = Array.isArray(atr) && atr.length > 0 ? atr[atr.length - 1] : 0;
    const currentPrice = closes[closes.length - 1];
    const atrPercent = currentATR / currentPrice * 100;

    // Calculate volatility percentile over recent period
    const recentCloses = closes.slice(-20);
    const returns = [];
    for (let i = 1; i < recentCloses.length; i++) {
      returns.push(Math.abs((recentCloses[i] - recentCloses[i-1]) / recentCloses[i-1]));
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const currentReturn = Math.abs((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]);

    let level = 'MEDIUM';
    let percentile = 50;

    if (atrPercent > 0.5 || currentReturn > avgReturn * 2) {
      level = 'HIGH';
      percentile = 80;
    } else if (atrPercent < 0.1 || currentReturn < avgReturn * 0.5) {
      level = 'LOW';
      percentile = 20;
    }

    return {
      level,
      atr: currentATR,
      atrPercent: atrPercent.toFixed(3),
      percentile,
      interpretation: `${level.toLowerCase()} volatility environment - ATR: ${atrPercent.toFixed(3)}%`
    };
  }
}

module.exports = { EnhancedTechnicalAnalyzer };
