/**
 * EnhancedMultiTimeframeAnalyzer - Production-Ready Multi-Timeframe Analysis
 * 
 * Analyzes market data across multiple timeframes (5m, 10m, 15m, 30m, 1H, 4H, 1D)
 * Provides comprehensive confluence analysis for high-confidence signals
 */

const { Logger } = require('../utils/Logger');
const { TechnicalAnalyzer } = require('./TechnicalAnalyzer');

class EnhancedMultiTimeframeAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    this.technicalAnalyzer = new TechnicalAnalyzer();
    
    // Define all timeframes to analyze
    this.timeframes = [
      { name: '5m', interval: '5min', weight: 0.10, candles: 100 },
      { name: '10m', interval: '10min', weight: 0.10, candles: 100 },
      { name: '15m', interval: '15min', weight: 0.15, candles: 100 },
      { name: '30m', interval: '30min', weight: 0.15, candles: 100 },
      { name: '1h', interval: '1h', weight: 0.20, candles: 100 },
      { name: '4h', interval: '4h', weight: 0.15, candles: 50 },
      { name: '1d', interval: '1day', weight: 0.15, candles: 30 }
    ];
    
    this.logger.info('📊 Enhanced Multi-Timeframe Analyzer initialized');
  }

  /**
   * Analyze all timeframes for a given symbol
   * @param {string} symbol - Trading pair to analyze
   * @param {object} dataService - Data service to fetch OHLCV data
   * @param {string} tradeDuration - User-selected trade duration
   * @returns {object} - Comprehensive multi-timeframe analysis
   */
  async analyzeAllTimeframes(symbol, dataService, tradeDuration) {
    try {
      this.logger.info(`📊 Starting multi-timeframe analysis for ${symbol} (Trade duration: ${tradeDuration})`);
      
      // Store analysis results for each timeframe
      const timeframeResults = {};
      
      // Analyze each timeframe sequentially
      for (const timeframe of this.timeframes) {
        this.logger.info(`📈 Analyzing ${timeframe.name} timeframe...`);
        
        // 1. Fetch OHLCV data for this timeframe
        const marketData = await dataService.getOHLCV(symbol, timeframe.interval, timeframe.candles);
        
        if (!marketData || marketData.length < 30) {
          this.logger.warn(`⚠️ Insufficient data for ${timeframe.name} timeframe, skipping`);
          continue;
        }
        
        // 2. Calculate technical indicators for this timeframe
        const indicators = await this.technicalAnalyzer.analyzeMarket(marketData);
        
        // 3. Determine trend direction and strength for this timeframe
        const trend = this.analyzeTrend(marketData, indicators);
        
        // 4. Store results for this timeframe
        timeframeResults[timeframe.name] = {
          marketData: marketData.slice(-20), // Keep only recent candles to save memory
          indicators,
          trend,
          weight: timeframe.weight
        };
        
        this.logger.info(`✅ ${timeframe.name} analysis complete: ${trend.direction} (${Math.round(trend.strength * 100)}%)`);
      }
      
      // 5. Perform confluence analysis across all timeframes
      const confluenceAnalysis = this.analyzeConfluence(timeframeResults);
      
      // 6. Generate final signal based on confluence
      const signal = this.generateSignal(confluenceAnalysis, tradeDuration);
      
      return {
        timeframeResults,
        confluenceAnalysis,
        signal,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ Multi-timeframe analysis failed:', error);
      throw new Error(`Multi-timeframe analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze trend direction and strength for a single timeframe
   * @param {Array} marketData - OHLCV data
   * @param {Object} indicators - Technical indicators
   * @returns {Object} - Trend analysis
   */
  analyzeTrend(marketData, indicators) {
    // Get recent candles
    const recentCandles = marketData.slice(-10);
    const latestCandle = recentCandles[recentCandles.length - 1];
    
    // Initialize scores
    let bullishScore = 0;
    let bearishScore = 0;
    let neutralScore = 0;
    
    // 1. Price action analysis
    const priceAction = this.analyzePriceAction(recentCandles);
    bullishScore += priceAction.bullishScore;
    bearishScore += priceAction.bearishScore;
    
    // 2. RSI analysis
    if (indicators.rsi > 70) {
      bearishScore += 2; // Overbought
    } else if (indicators.rsi < 30) {
      bullishScore += 2; // Oversold
    } else if (indicators.rsi > 60) {
      bullishScore += 0.5; // Bullish momentum
    } else if (indicators.rsi < 40) {
      bearishScore += 0.5; // Bearish momentum
    } else {
      neutralScore += 1; // Neutral zone
    }
    
    // 3. MACD analysis
    if (indicators.macd.histogram > 0 && indicators.macd.histogram > indicators.macd.histogram) {
      bullishScore += 1.5; // Bullish and increasing
    } else if (indicators.macd.histogram > 0) {
      bullishScore += 1; // Bullish
    } else if (indicators.macd.histogram < 0 && indicators.macd.histogram < indicators.macd.histogram) {
      bearishScore += 1.5; // Bearish and decreasing
    } else if (indicators.macd.histogram < 0) {
      bearishScore += 1; // Bearish
    }
    
    // 4. EMA analysis
    if (latestCandle.close > indicators.ema.ema20 && indicators.ema.ema20 > indicators.ema.ema50) {
      bullishScore += 2; // Strong bullish trend
    } else if (latestCandle.close > indicators.ema.ema20) {
      bullishScore += 1; // Above short-term average
    } else if (latestCandle.close < indicators.ema.ema20 && indicators.ema.ema20 < indicators.ema.ema50) {
      bearishScore += 2; // Strong bearish trend
    } else if (latestCandle.close < indicators.ema.ema20) {
      bearishScore += 1; // Below short-term average
    }
    
    // 5. Bollinger Bands analysis
    if (latestCandle.close < indicators.bollinger.lower) {
      bullishScore += 1.5; // Potential bounce from lower band
    } else if (latestCandle.close > indicators.bollinger.upper) {
      bearishScore += 1.5; // Potential reversal from upper band
    } else if (latestCandle.close > indicators.bollinger.middle && latestCandle.close < indicators.bollinger.upper) {
      bullishScore += 0.5; // In upper half of bands
    } else if (latestCandle.close < indicators.bollinger.middle && latestCandle.close > indicators.bollinger.lower) {
      bearishScore += 0.5; // In lower half of bands
    }
    
    // 6. Volume analysis
    if (indicators.volume.trend === 'increasing') {
      if (priceAction.direction === 'bullish') {
        bullishScore += 1.5; // Increasing volume with rising price
      } else if (priceAction.direction === 'bearish') {
        bearishScore += 1.5; // Increasing volume with falling price
      }
    }
    
    // 7. Pattern analysis
    if (indicators.pattern) {
      if (indicators.pattern.type === 'bullish') {
        bullishScore += indicators.pattern.strength * 2;
      } else if (indicators.pattern.type === 'bearish') {
        bearishScore += indicators.pattern.strength * 2;
      } else if (indicators.pattern.type === 'doji') {
        neutralScore += 1;
      }
    }
    
    // Calculate total score and determine direction
    const totalScore = bullishScore + bearishScore + neutralScore;
    let direction, strength;
    
    if (bullishScore > bearishScore && bullishScore > neutralScore) {
      direction = 'bullish';
      strength = bullishScore / totalScore;
    } else if (bearishScore > bullishScore && bearishScore > neutralScore) {
      direction = 'bearish';
      strength = bearishScore / totalScore;
    } else {
      direction = 'neutral';
      strength = neutralScore / totalScore;
    }
    
    return {
      direction,
      strength: Math.min(strength, 0.95), // Cap at 95% confidence
      bullishScore,
      bearishScore,
      neutralScore,
      totalScore,
      priceAction,
      indicators: {
        rsi: indicators.rsi > 70 ? 'overbought' : indicators.rsi < 30 ? 'oversold' : 'neutral',
        macd: indicators.macd.histogram > 0 ? 'bullish' : 'bearish',
        ema: latestCandle.close > indicators.ema.ema20 ? 'above_ema20' : 'below_ema20',
        bb: latestCandle.close < indicators.bollinger.lower ? 'near_lower' : 
             latestCandle.close > indicators.bollinger.upper ? 'near_upper' : 'middle',
        volume: indicators.volume.trend,
        pattern: indicators.pattern?.type || 'none'
      }
    };
  }

  /**
   * Analyze price action from recent candles
   * @param {Array} candles - Recent OHLCV candles
   * @returns {Object} - Price action analysis
   */
  analyzePriceAction(candles) {
    if (candles.length < 3) {
      return { direction: 'neutral', bullishScore: 0, bearishScore: 0 };
    }
    
    // Calculate price changes
    const priceChanges = [];
    for (let i = 1; i < candles.length; i++) {
      const change = (candles[i].close - candles[i-1].close) / candles[i-1].close;
      priceChanges.push(change);
    }
    
    // Calculate average price change
    const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    
    // Calculate recent momentum (last 3 candles)
    const recentChanges = priceChanges.slice(-3);
    const recentMomentum = recentChanges.reduce((sum, change) => sum + change, 0);
    
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Analyze overall trend
    if (avgChange > 0.001) {
      bullishScore += 1;
    } else if (avgChange < -0.001) {
      bearishScore += 1;
    }
    
    // Analyze recent momentum
    if (recentMomentum > 0.002) {
      bullishScore += 1.5; // Strong recent bullish momentum
    } else if (recentMomentum > 0) {
      bullishScore += 0.5; // Mild bullish momentum
    } else if (recentMomentum < -0.002) {
      bearishScore += 1.5; // Strong recent bearish momentum
    } else if (recentMomentum < 0) {
      bearishScore += 0.5; // Mild bearish momentum
    }
    
    // Analyze most recent candle
    const latestCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    if (latestCandle.close > latestCandle.open) {
      bullishScore += 0.5; // Bullish candle
      
      // Check for strong bullish candle
      if ((latestCandle.close - latestCandle.open) / (latestCandle.high - latestCandle.low) > 0.7) {
        bullishScore += 0.5; // Strong bullish body
      }
      
      // Check for bullish engulfing
      if (latestCandle.open < prevCandle.close && latestCandle.close > prevCandle.open && prevCandle.close < prevCandle.open) {
        bullishScore += 1.5; // Bullish engulfing pattern
      }
    } else if (latestCandle.close < latestCandle.open) {
      bearishScore += 0.5; // Bearish candle
      
      // Check for strong bearish candle
      if ((latestCandle.open - latestCandle.close) / (latestCandle.high - latestCandle.low) > 0.7) {
        bearishScore += 0.5; // Strong bearish body
      }
      
      // Check for bearish engulfing
      if (latestCandle.open > prevCandle.close && latestCandle.close < prevCandle.open && prevCandle.close > prevCandle.open) {
        bearishScore += 1.5; // Bearish engulfing pattern
      }
    }
    
    // Determine direction
    let direction;
    if (bullishScore > bearishScore) {
      direction = 'bullish';
    } else if (bearishScore > bullishScore) {
      direction = 'bearish';
    } else {
      direction = 'neutral';
    }
    
    return {
      direction,
      bullishScore,
      bearishScore,
      avgChange,
      recentMomentum
    };
  }

  /**
   * Analyze confluence across all timeframes
   * @param {Object} timeframeResults - Results from all timeframes
   * @returns {Object} - Confluence analysis
   */
  analyzeConfluence(timeframeResults) {
    // Count trend directions across timeframes
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    
    // Weighted scores for each direction
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Track which timeframes agree
    const bullishTimeframes = [];
    const bearishTimeframes = [];
    const neutralTimeframes = [];
    
    // Analyze each timeframe
    Object.entries(timeframeResults).forEach(([timeframe, result]) => {
      const { direction, strength, weight } = result.trend;
      
      if (direction === 'bullish') {
        bullishCount++;
        bullishScore += strength * (weight || 1);
        bullishTimeframes.push(timeframe);
      } else if (direction === 'bearish') {
        bearishCount++;
        bearishScore += strength * (weight || 1);
        bearishTimeframes.push(timeframe);
      } else {
        neutralCount++;
        neutralTimeframes.push(timeframe);
      }
    });
    
    // Calculate total timeframes analyzed
    const totalTimeframes = Object.keys(timeframeResults).length;
    
    // Calculate confluence percentages
    const bullishPercentage = totalTimeframes > 0 ? bullishCount / totalTimeframes : 0;
    const bearishPercentage = totalTimeframes > 0 ? bearishCount / totalTimeframes : 0;
    
    // Determine overall direction and confidence
    let direction, confidence, explanation;
    
    if (bullishCount > bearishCount && bullishCount > neutralCount) {
      direction = 'bullish';
      confidence = Math.min(0.5 + (bullishPercentage * 0.5), 0.95);
      explanation = `${bullishCount}/${totalTimeframes} timeframes show bullish trend`;
    } else if (bearishCount > bullishCount && bearishCount > neutralCount) {
      direction = 'bearish';
      confidence = Math.min(0.5 + (bearishPercentage * 0.5), 0.95);
      explanation = `${bearishCount}/${totalTimeframes} timeframes show bearish trend`;
    } else {
      direction = 'neutral';
      confidence = 0.5;
      explanation = 'Mixed signals across timeframes';
    }
    
    // Boost confidence if higher timeframes agree with overall direction
    const higherTimeframes = ['4h', '1d'];
    const higherTimeframeAgreement = higherTimeframes.filter(tf => {
      if (!timeframeResults[tf]) return false;
      return timeframeResults[tf].trend.direction === direction;
    }).length;
    
    if (higherTimeframeAgreement > 0) {
      confidence = Math.min(confidence * 1.2, 0.95);
      explanation += ` with higher timeframe confirmation (${higherTimeframeAgreement}/${higherTimeframes.length})`;
    }
    
    // Check for strong agreement across multiple timeframes
    if ((direction === 'bullish' && bullishCount >= 5) || (direction === 'bearish' && bearishCount >= 5)) {
      confidence = Math.min(confidence * 1.1, 0.95);
      explanation += ' - Strong multi-timeframe confluence';
    }
    
    return {
      direction,
      confidence,
      explanation,
      bullishCount,
      bearishCount,
      neutralCount,
      totalTimeframes,
      bullishTimeframes,
      bearishTimeframes,
      neutralTimeframes,
      bullishScore,
      bearishScore
    };
  }

  /**
   * Generate final trading signal based on confluence analysis
   * @param {Object} confluenceAnalysis - Confluence analysis results
   * @param {String} tradeDuration - User-selected trade duration
   * @returns {Object} - Trading signal
   */
  generateSignal(confluenceAnalysis, tradeDuration) {
    const { direction, confidence, explanation } = confluenceAnalysis;
    
    // Only generate signal if confidence is high enough
    if (confidence < 0.65) {
      return {
        signal: 'NO TRADE',
        confidence: confidence * 100,
        reason: `Insufficient confluence (${Math.round(confidence * 100)}% confidence). ${explanation}`,
        tradeDuration
      };
    }
    
    // Convert direction to signal
    const signal = direction === 'bullish' ? 'BUY' : direction === 'bearish' ? 'SELL' : 'NO TRADE';
    
    // Generate detailed reason
    let reason = `${explanation}. `;
    
    // Add timeframe details
    if (direction === 'bullish') {
      reason += `Bullish confirmation on ${confluenceAnalysis.bullishTimeframes.join(', ')} timeframes. `;
    } else if (direction === 'bearish') {
      reason += `Bearish confirmation on ${confluenceAnalysis.bearishTimeframes.join(', ')} timeframes. `;
    }
    
    // Add confidence level description
    if (confidence > 0.85) {
      reason += 'Very high confidence signal based on strong multi-timeframe confluence.';
    } else if (confidence > 0.75) {
      reason += 'High confidence signal with good multi-timeframe agreement.';
    } else {
      reason += 'Moderate confidence signal - consider additional confirmation.';
    }
    
    return {
      signal,
      confidence: Math.round(confidence * 100),
      reason,
      tradeDuration,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { EnhancedMultiTimeframeAnalyzer };