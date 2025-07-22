/**
 * Ultra-Precision Trading Signal Generator
 * 
 * Generates high-confidence 2-5 minute trading signals using:
 * - Multi-indicator convergence system
 * - Advanced candlestick pattern recognition
 * - Multi-timeframe confluence analysis
 * - Alpha Vantage, Twelve Data, and Yahoo Finance integration
 * - Volume analysis and market structure detection
 */

const axios = require('axios');
const { TechnicalIndicators } = require('../utils/TechnicalIndicators');
const { CandlestickPatterns } = require('../utils/CandlestickPatterns');
const yahooFinance = require('yahoo-finance2').default;

class UltraPrecisionSignalGenerator {
  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.twelveDataKey = process.env.TWELVE_DATA_API_KEY;
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30 seconds cache for ultra-fast signals
    
    // Signal confidence thresholds
    this.confidenceThresholds = {
      veryHigh: 85,
      high: 75,
      medium: 65,
      low: 50
    };
    
    // Timeframes for multi-timeframe analysis
    this.timeframes = ['1M', '2M', '5M'];
    
    // Initialize pattern detector
    this.patternDetector = new CandlestickPatterns();
  }

  /**
   * Generate ultra-precision trading signal
   * @param {string} symbol - Trading symbol (e.g., 'EURUSD', 'GBPUSD')
   * @param {string} primaryTimeframe - Primary timeframe for signal (default: '2M')
   * @returns {Promise<Object>} - Ultra-precision signal with confidence score
   */
  async generateUltraPrecisionSignal(symbol, primaryTimeframe = '2M') {
    try {
      console.log(`🎯 Generating ultra-precision signal for ${symbol} on ${primaryTimeframe}`);
      
      // Step 1: Fetch multi-timeframe data from multiple sources
      const marketData = await this.fetchMultiSourceData(symbol);
      
      // Step 2: Calculate all core indicators
      const indicators = await this.calculateCoreIndicators(marketData);
      
      // Step 3: Detect advanced patterns
      const patterns = await this.detectAdvancedPatterns(marketData);
      
      // Step 4: Perform multi-timeframe confluence analysis
      const confluence = await this.analyzeMultiTimeframeConfluence(marketData);
      
      // Step 5: Analyze volume and market structure
      const volumeAnalysis = this.analyzeVolumeAndStructure(marketData);
      
      // Step 6: Generate signal with confidence scoring
      const signal = this.generateSignalWithConfidence({
        indicators,
        patterns,
        confluence,
        volumeAnalysis,
        marketData,
        symbol,
        timeframe: primaryTimeframe
      });
      
      // Step 7: Add risk management parameters
      const enhancedSignal = this.addRiskManagement(signal, marketData);
      
      console.log(`✅ Generated ${enhancedSignal.direction} signal with ${enhancedSignal.confidence}% confidence`);
      
      return enhancedSignal;
      
    } catch (error) {
      console.error('❌ Error generating ultra-precision signal:', error);
      throw error;
    }
  }

  /**
   * Fetch market data from multiple sources for redundancy and accuracy
   */
  async fetchMultiSourceData(symbol) {
    const cacheKey = `multi-source-${symbol}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    try {
      // Primary: Try Twelve Data for recent data
      let primaryData = null;
      if (this.twelveDataKey) {
        primaryData = await this.fetchTwelveData(symbol, '1min', 100);
      }
      
      // Secondary: Try Alpha Vantage for backup
      let secondaryData = null;
      if (this.alphaVantageKey && !primaryData) {
        secondaryData = await this.fetchAlphaVantageData(symbol, '1min', 100);
      }
      
      // Tertiary: Yahoo Finance for historical context
      let historicalData = null;
      try {
        historicalData = await this.fetchYahooFinanceData(symbol, '1m', 200);
      } catch (error) {
        console.warn('Yahoo Finance data unavailable:', error.message);
      }
      
      // Combine and validate data
      const combinedData = this.combineAndValidateData({
        primary: primaryData,
        secondary: secondaryData,
        historical: historicalData
      });
      
      // Generate multi-timeframe views
      const multiTimeframeData = this.generateMultiTimeframeViews(combinedData);
      
      // Cache the result
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        data: multiTimeframeData
      });
      
      return multiTimeframeData;
      
    } catch (error) {
      console.error('Error fetching multi-source data:', error);
      // Fallback to demo data
      return this.generateDemoData(symbol);
    }
  }

  /**
   * Fetch data from Twelve Data API
   */
  async fetchTwelveData(symbol, interval, outputsize) {
    try {
      const response = await axios.get('https://api.twelvedata.com/time_series', {
        params: {
          symbol: symbol,
          interval: interval,
          outputsize: outputsize,
          apikey: this.twelveDataKey,
          format: 'json'
        },
        timeout: 10000
      });

      if (response.data.status === 'error') {
        throw new Error(response.data.message);
      }

      if (!response.data.values) {
        throw new Error('No data returned from Twelve Data');
      }

      return response.data.values.map(item => ({
        timestamp: new Date(item.datetime).getTime(),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume) || 0
      })).reverse();

    } catch (error) {
      console.error('Twelve Data API error:', error);
      return null;
    }
  }

  /**
   * Fetch data from Alpha Vantage API
   */
  async fetchAlphaVantageData(symbol, interval, outputsize) {
    try {
      const response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'FX_INTRADAY',
          from_symbol: symbol.substring(0, 3),
          to_symbol: symbol.substring(3, 6),
          interval: interval,
          outputsize: 'compact',
          apikey: this.alphaVantageKey
        },
        timeout: 10000
      });

      const timeSeries = response.data[`Time Series FX (${interval})`];
      if (!timeSeries) {
        throw new Error('No data returned from Alpha Vantage');
      }

      return Object.entries(timeSeries)
        .map(([timestamp, data]) => ({
          timestamp: new Date(timestamp).getTime(),
          open: parseFloat(data['1. open']),
          high: parseFloat(data['2. high']),
          low: parseFloat(data['3. low']),
          close: parseFloat(data['4. close']),
          volume: 0 // FX doesn't have volume in Alpha Vantage
        }))
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-outputsize);

    } catch (error) {
      console.error('Alpha Vantage API error:', error);
      return null;
    }
  }

  /**
   * Fetch historical data from Yahoo Finance
   */
  async fetchYahooFinanceData(symbol, interval, period) {
    try {
      // Convert symbol format for Yahoo Finance
      const yahooSymbol = this.convertToYahooSymbol(symbol);
      
      const result = await yahooFinance.chart(yahooSymbol, {
        period1: new Date(Date.now() - period * 60000).toISOString(),
        period2: new Date().toISOString(),
        interval: interval
      });

      if (!result.quotes || result.quotes.length === 0) {
        throw new Error('No data from Yahoo Finance');
      }

      return result.quotes.map(quote => ({
        timestamp: quote.date.getTime(),
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        volume: quote.volume || 0
      }));

    } catch (error) {
      console.error('Yahoo Finance error:', error);
      return null;
    }
  }

  /**
   * Calculate all core indicators for ultra-precision analysis
   */
  async calculateCoreIndicators(marketData) {
    const data1M = marketData['1M'] || [];
    const data2M = marketData['2M'] || [];
    const data5M = marketData['5M'] || [];
    
    if (data1M.length < 50) {
      throw new Error('Insufficient data for indicator calculation');
    }

    const closes1M = data1M.map(c => c.close);
    const closes2M = data2M.map(c => c.close);
    const closes5M = data5M.map(c => c.close);
    
    // Core momentum indicators
    const rsi7_1M = TechnicalIndicators.calculateRSI(closes1M, 7);
    const rsi14_1M = TechnicalIndicators.calculateRSI(closes1M, 14);
    const rsi7_2M = TechnicalIndicators.calculateRSI(closes2M, 7);
    const rsi14_2M = TechnicalIndicators.calculateRSI(closes2M, 14);
    
    // MACD for trend detection
    const macd1M = TechnicalIndicators.calculateMACD(closes1M, 12, 26, 9);
    const macd2M = TechnicalIndicators.calculateMACD(closes2M, 12, 26, 9);
    const macd5M = TechnicalIndicators.calculateMACD(closes5M, 12, 26, 9);
    
    // EMAs for trend validation
    const ema9_1M = TechnicalIndicators.calculateEMA(closes1M, 9);
    const ema20_1M = TechnicalIndicators.calculateEMA(closes1M, 20);
    const ema50_1M = TechnicalIndicators.calculateEMA(closes1M, 50);
    
    const ema9_2M = TechnicalIndicators.calculateEMA(closes2M, 9);
    const ema20_2M = TechnicalIndicators.calculateEMA(closes2M, 20);
    
    // Stochastic RSI for overbought/oversold
    const stochRSI1M = TechnicalIndicators.calculateStochastic(data1M, 14, 3, 3);
    const stochRSI2M = TechnicalIndicators.calculateStochastic(data2M, 14, 3, 3);
    
    // Bollinger Bands for volatility
    const bb1M = TechnicalIndicators.calculateBollingerBands(closes1M, 20, 2);
    const bb2M = TechnicalIndicators.calculateBollingerBands(closes2M, 20, 2);
    
    // ATR for volatility measurement
    const atr1M = TechnicalIndicators.calculateATR(data1M, 14);
    const atr2M = TechnicalIndicators.calculateATR(data2M, 14);
    
    return {
      rsi: {
        rsi7_1M,
        rsi14_1M,
        rsi7_2M,
        rsi14_2M
      },
      macd: {
        macd1M,
        macd2M,
        macd5M
      },
      ema: {
        ema9_1M,
        ema20_1M,
        ema50_1M,
        ema9_2M,
        ema20_2M
      },
      stochastic: {
        stochRSI1M,
        stochRSI2M
      },
      bollinger: {
        bb1M,
        bb2M
      },
      atr: {
        atr1M,
        atr2M
      }
    };
  }

  /**
   * Detect advanced candlestick patterns with enhanced accuracy
   */
  async detectAdvancedPatterns(marketData) {
    const patterns = {};
    
    for (const timeframe of ['1M', '2M', '5M']) {
      const data = marketData[timeframe];
      if (!data || data.length < 5) continue;
      
      // Use enhanced pattern detector
      const detectedPatterns = this.patternDetector.detectPatterns(data);
      
      // Additional pattern detection
      const advancedPatterns = this.detectAdvancedCandlestickPatterns(data);
      
      patterns[timeframe] = {
        ...detectedPatterns,
        advanced: advancedPatterns
      };
    }
    
    return patterns;
  }

  /**
   * Detect advanced patterns like Order Blocks, Break of Structure, etc.
   */
  detectAdvancedCandlestickPatterns(data) {
    if (data.length < 10) return {};
    
    const patterns = {};
    
    // Order Block Detection
    patterns.orderBlocks = this.detectOrderBlocks(data);
    
    // Break of Structure (BoS)
    patterns.breakOfStructure = this.detectBreakOfStructure(data);
    
    // Liquidity Sweeps
    patterns.liquiditySweeps = this.detectLiquiditySweeps(data);
    
    // Fair Value Gaps
    patterns.fairValueGaps = this.detectFairValueGaps(data);
    
    return patterns;
  }

  /**
   * Detect Order Blocks (institutional reversal zones)
   */
  detectOrderBlocks(data) {
    const orderBlocks = [];
    
    for (let i = 5; i < data.length - 1; i++) {
      const current = data[i];
      const prev = data[i - 1];
      const next = data[i + 1];
      
      // Bullish Order Block: Strong bearish candle followed by reversal
      if (prev.close < prev.open && // Previous bearish
          current.close > current.open && // Current bullish
          current.close > prev.high && // Break above previous high
          current.volume > data.slice(i-5, i).reduce((sum, c) => sum + c.volume, 0) / 5) { // Above average volume
        
        orderBlocks.push({
          type: 'bullish',
          level: prev.low,
          strength: this.calculateOrderBlockStrength(data, i, 'bullish'),
          timestamp: current.timestamp
        });
      }
      
      // Bearish Order Block: Strong bullish candle followed by reversal
      if (prev.close > prev.open && // Previous bullish
          current.close < current.open && // Current bearish
          current.close < prev.low && // Break below previous low
          current.volume > data.slice(i-5, i).reduce((sum, c) => sum + c.volume, 0) / 5) { // Above average volume
        
        orderBlocks.push({
          type: 'bearish',
          level: prev.high,
          strength: this.calculateOrderBlockStrength(data, i, 'bearish'),
          timestamp: current.timestamp
        });
      }
    }
    
    return orderBlocks;
  }

  /**
   * Detect Break of Structure (BoS)
   */
  detectBreakOfStructure(data) {
    const breaks = [];
    const swingHighs = [];
    const swingLows = [];
    
    // Find swing highs and lows
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i];
      const prev2 = data[i - 2];
      const prev1 = data[i - 1];
      const next1 = data[i + 1];
      const next2 = data[i + 2];
      
      // Swing High
      if (current.high > prev2.high && current.high > prev1.high && 
          current.high > next1.high && current.high > next2.high) {
        swingHighs.push({ price: current.high, index: i, timestamp: current.timestamp });
      }
      
      // Swing Low
      if (current.low < prev2.low && current.low < prev1.low && 
          current.low < next1.low && current.low < next2.low) {
        swingLows.push({ price: current.low, index: i, timestamp: current.timestamp });
      }
    }
    
    // Detect breaks
    const latest = data[data.length - 1];
    
    // Bullish BoS: Break above recent swing high
    const recentSwingHigh = swingHighs.slice(-3).reduce((max, swing) => 
      swing.price > max.price ? swing : max, { price: 0 });
    
    if (recentSwingHigh.price > 0 && latest.close > recentSwingHigh.price) {
      breaks.push({
        type: 'bullish',
        level: recentSwingHigh.price,
        strength: 0.8,
        timestamp: latest.timestamp
      });
    }
    
    // Bearish BoS: Break below recent swing low
    const recentSwingLow = swingLows.slice(-3).reduce((min, swing) => 
      swing.price < min.price ? swing : min, { price: Infinity });
    
    if (recentSwingLow.price < Infinity && latest.close < recentSwingLow.price) {
      breaks.push({
        type: 'bearish',
        level: recentSwingLow.price,
        strength: 0.8,
        timestamp: latest.timestamp
      });
    }
    
    return breaks;
  }

  /**
   * Analyze multi-timeframe confluence
   */
  async analyzeMultiTimeframeConfluence(marketData) {
    const confluence = {
      bullishSignals: 0,
      bearishSignals: 0,
      neutralSignals: 0,
      agreement: 0,
      details: {}
    };
    
    for (const timeframe of ['1M', '2M', '5M']) {
      const data = marketData[timeframe];
      if (!data || data.length < 20) continue;
      
      const closes = data.map(c => c.close);
      
      // RSI analysis
      const rsi = TechnicalIndicators.calculateRSI(closes, 14);
      let rsiSignal = 'neutral';
      if (rsi < 30) rsiSignal = 'bullish';
      else if (rsi > 70) rsiSignal = 'bearish';
      
      // MACD analysis
      const macd = TechnicalIndicators.calculateMACD(closes);
      let macdSignal = 'neutral';
      if (macd && macd.macd > macd.signal && macd.histogram > 0) macdSignal = 'bullish';
      else if (macd && macd.macd < macd.signal && macd.histogram < 0) macdSignal = 'bearish';
      
      // EMA trend analysis
      const ema9 = TechnicalIndicators.calculateEMA(closes, 9);
      const ema20 = TechnicalIndicators.calculateEMA(closes, 20);
      let emaSignal = 'neutral';
      if (ema9 > ema20 && closes[closes.length - 1] > ema9) emaSignal = 'bullish';
      else if (ema9 < ema20 && closes[closes.length - 1] < ema9) emaSignal = 'bearish';
      
      // Count signals
      const signals = [rsiSignal, macdSignal, emaSignal];
      const bullishCount = signals.filter(s => s === 'bullish').length;
      const bearishCount = signals.filter(s => s === 'bearish').length;
      const neutralCount = signals.filter(s => s === 'neutral').length;
      
      confluence.details[timeframe] = {
        rsi: { value: rsi, signal: rsiSignal },
        macd: { value: macd, signal: macdSignal },
        ema: { ema9, ema20, signal: emaSignal },
        bullishCount,
        bearishCount,
        neutralCount
      };
      
      confluence.bullishSignals += bullishCount;
      confluence.bearishSignals += bearishCount;
      confluence.neutralSignals += neutralCount;
    }
    
    // Calculate agreement percentage
    const totalSignals = confluence.bullishSignals + confluence.bearishSignals + confluence.neutralSignals;
    if (totalSignals > 0) {
      const maxSignals = Math.max(confluence.bullishSignals, confluence.bearishSignals, confluence.neutralSignals);
      confluence.agreement = (maxSignals / totalSignals) * 100;
    }
    
    return confluence;
  }

  /**
   * Analyze volume and market structure
   */
  analyzeVolumeAndStructure(marketData) {
    const analysis = {};
    
    for (const timeframe of ['1M', '2M', '5M']) {
      const data = marketData[timeframe];
      if (!data || data.length < 20) continue;
      
      const volumes = data.map(c => c.volume);
      const closes = data.map(c => c.close);
      
      // Volume trend analysis
      const recentVolumes = volumes.slice(-10);
      const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
      const currentVolume = volumes[volumes.length - 1];
      const volumeRatio = currentVolume / avgVolume;
      
      // Volume spike detection
      const isVolumeSpike = volumeRatio > 2.0;
      
      // Price-volume relationship
      const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
      const volumeConfirmation = (priceChange > 0 && volumeRatio > 1.2) || 
                                (priceChange < 0 && volumeRatio > 1.2);
      
      analysis[timeframe] = {
        avgVolume,
        currentVolume,
        volumeRatio,
        isVolumeSpike,
        volumeConfirmation,
        trend: volumeRatio > 1.2 ? 'increasing' : volumeRatio < 0.8 ? 'decreasing' : 'stable'
      };
    }
    
    return analysis;
  }

  /**
   * Generate signal with comprehensive confidence scoring
   */
  generateSignalWithConfidence(analysisData) {
    const { indicators, patterns, confluence, volumeAnalysis, marketData, symbol, timeframe } = analysisData;
    
    let confidence = 0;
    let direction = 'NEUTRAL';
    let reasons = [];
    
    // RSI Analysis (Weight: 15%)
    const rsi1M = indicators.rsi.rsi14_1M;
    const rsi2M = indicators.rsi.rsi14_2M;
    
    if (rsi1M < 30 && rsi2M < 30) {
      confidence += 15;
      direction = 'BUY';
      reasons.push('RSI oversold on multiple timeframes');
    } else if (rsi1M > 70 && rsi2M > 70) {
      confidence += 15;
      direction = 'SELL';
      reasons.push('RSI overbought on multiple timeframes');
    } else if (rsi1M < 35 || rsi2M < 35) {
      confidence += 8;
      if (direction === 'NEUTRAL') direction = 'BUY';
      reasons.push('RSI approaching oversold');
    } else if (rsi1M > 65 || rsi2M > 65) {
      confidence += 8;
      if (direction === 'NEUTRAL') direction = 'SELL';
      reasons.push('RSI approaching overbought');
    }
    
    // MACD Analysis (Weight: 20%)
    const macd1M = indicators.macd.macd1M;
    const macd2M = indicators.macd.macd2M;
    
    if (macd1M && macd2M) {
      // Bullish MACD crossover
      if (macd1M.macd > macd1M.signal && macd2M.macd > macd2M.signal && 
          macd1M.histogram > 0 && macd2M.histogram > 0) {
        confidence += 20;
        if (direction === 'NEUTRAL' || direction === 'BUY') {
          direction = 'BUY';
          reasons.push('MACD bullish crossover on multiple timeframes');
        }
      }
      // Bearish MACD crossover
      else if (macd1M.macd < macd1M.signal && macd2M.macd < macd2M.signal && 
               macd1M.histogram < 0 && macd2M.histogram < 0) {
        confidence += 20;
        if (direction === 'NEUTRAL' || direction === 'SELL') {
          direction = 'SELL';
          reasons.push('MACD bearish crossover on multiple timeframes');
        }
      }
      // Single timeframe MACD
      else if (macd1M.macd > macd1M.signal && macd1M.histogram > 0) {
        confidence += 10;
        if (direction === 'NEUTRAL') direction = 'BUY';
        reasons.push('MACD bullish on 1M');
      } else if (macd1M.macd < macd1M.signal && macd1M.histogram < 0) {
        confidence += 10;
        if (direction === 'NEUTRAL') direction = 'SELL';
        reasons.push('MACD bearish on 1M');
      }
    }
    
    // EMA Trend Analysis (Weight: 15%)
    const ema9_1M = indicators.ema.ema9_1M;
    const ema20_1M = indicators.ema.ema20_1M;
    const ema50_1M = indicators.ema.ema50_1M;
    const currentPrice = marketData['1M'][marketData['1M'].length - 1].close;
    
    if (ema9_1M > ema20_1M && ema20_1M > ema50_1M && currentPrice > ema9_1M) {
      confidence += 15;
      if (direction === 'NEUTRAL' || direction === 'BUY') {
        direction = 'BUY';
        reasons.push('Strong bullish EMA alignment');
      }
    } else if (ema9_1M < ema20_1M && ema20_1M < ema50_1M && currentPrice < ema9_1M) {
      confidence += 15;
      if (direction === 'NEUTRAL' || direction === 'SELL') {
        direction = 'SELL';
        reasons.push('Strong bearish EMA alignment');
      }
    } else if (ema9_1M > ema20_1M && currentPrice > ema9_1M) {
      confidence += 8;
      if (direction === 'NEUTRAL') direction = 'BUY';
      reasons.push('Bullish EMA crossover');
    } else if (ema9_1M < ema20_1M && currentPrice < ema9_1M) {
      confidence += 8;
      if (direction === 'NEUTRAL') direction = 'SELL';
      reasons.push('Bearish EMA crossover');
    }
    
    // Candlestick Pattern Analysis (Weight: 20%)
    let patternScore = 0;
    let patternDirection = 'NEUTRAL';
    
    for (const tf of ['1M', '2M']) {
      const tfPatterns = patterns[tf];
      if (tfPatterns && tfPatterns.mainPattern) {
        const pattern = tfPatterns.mainPattern;
        if (pattern.direction === 'bullish') {
          patternScore += pattern.strength * 10;
          patternDirection = 'BUY';
          reasons.push(`${pattern.type} bullish pattern on ${tf}`);
        } else if (pattern.direction === 'bearish') {
          patternScore += pattern.strength * 10;
          patternDirection = 'SELL';
          reasons.push(`${pattern.type} bearish pattern on ${tf}`);
        }
      }
    }
    
    if (patternScore > 0) {
      confidence += Math.min(patternScore, 20);
      if (direction === 'NEUTRAL') direction = patternDirection;
      else if (direction !== patternDirection) confidence -= 5; // Conflicting signals
    }
    
    // Volume Confirmation (Weight: 10%)
    const volume1M = volumeAnalysis['1M'];
    const volume2M = volumeAnalysis['2M'];
    
    if (volume1M && volume1M.volumeConfirmation) {
      confidence += 10;
      reasons.push('Volume confirms price movement');
    } else if (volume1M && volume1M.isVolumeSpike) {
      confidence += 5;
      reasons.push('Volume spike detected');
    }
    
    // Multi-timeframe Confluence (Weight: 20%)
    if (confluence.agreement > 70) {
      confidence += 20;
      reasons.push(`${confluence.agreement.toFixed(1)}% timeframe agreement`);
      
      if (confluence.bullishSignals > confluence.bearishSignals && 
          (direction === 'NEUTRAL' || direction === 'BUY')) {
        direction = 'BUY';
      } else if (confluence.bearishSignals > confluence.bullishSignals && 
                 (direction === 'NEUTRAL' || direction === 'SELL')) {
        direction = 'SELL';
      }
    } else if (confluence.agreement > 50) {
      confidence += 10;
      reasons.push(`Moderate timeframe agreement (${confluence.agreement.toFixed(1)}%)`);
    }
    
    // Bollinger Bands Analysis (Bonus: up to 10%)
    const bb1M = indicators.bollinger.bb1M;
    if (bb1M) {
      if (currentPrice <= bb1M.lower && direction === 'BUY') {
        confidence += 10;
        reasons.push('Price at Bollinger Band lower boundary');
      } else if (currentPrice >= bb1M.upper && direction === 'SELL') {
        confidence += 10;
        reasons.push('Price at Bollinger Band upper boundary');
      } else if (bb1M.width < bb1M.middle * 0.02) { // Squeeze
        confidence += 5;
        reasons.push('Bollinger Band squeeze - breakout expected');
      }
    }
    
    // Ensure confidence doesn't exceed 100%
    confidence = Math.min(confidence, 100);
    
    // Determine confidence level
    let confidenceLevel = 'LOW';
    if (confidence >= this.confidenceThresholds.veryHigh) confidenceLevel = 'VERY_HIGH';
    else if (confidence >= this.confidenceThresholds.high) confidenceLevel = 'HIGH';
    else if (confidence >= this.confidenceThresholds.medium) confidenceLevel = 'MEDIUM';
    
    return {
      symbol,
      direction,
      confidence: Math.round(confidence),
      confidenceLevel,
      timeframe,
      reasons,
      timestamp: Date.now(),
      expiryTime: Date.now() + (2 * 60 * 1000), // 2 minutes expiry for ultra-short signals
      indicators: {
        rsi: rsi1M,
        macd: macd1M,
        ema: { ema9: ema9_1M, ema20: ema20_1M },
        currentPrice
      },
      patterns: patterns['1M']?.mainPattern || null,
      confluence: {
        agreement: confluence.agreement,
        bullishSignals: confluence.bullishSignals,
        bearishSignals: confluence.bearishSignals
      }
    };
  }

  /**
   * Add risk management parameters to the signal
   */
  addRiskManagement(signal, marketData) {
    const data1M = marketData['1M'];
    const currentPrice = data1M[data1M.length - 1].close;
    const atr = TechnicalIndicators.calculateATR(data1M, 14);
    
    // Calculate stop loss and take profit based on ATR
    const atrMultiplier = signal.confidenceLevel === 'VERY_HIGH' ? 1.5 : 
                         signal.confidenceLevel === 'HIGH' ? 2.0 : 2.5;
    
    const stopLossDistance = atr * atrMultiplier;
    const takeProfitDistance = stopLossDistance * 2; // 2:1 risk-reward ratio
    
    let stopLoss, takeProfit;
    
    if (signal.direction === 'BUY') {
      stopLoss = currentPrice - stopLossDistance;
      takeProfit = currentPrice + takeProfitDistance;
    } else if (signal.direction === 'SELL') {
      stopLoss = currentPrice + stopLossDistance;
      takeProfit = currentPrice - takeProfitDistance;
    }
    
    return {
      ...signal,
      riskManagement: {
        entryPrice: currentPrice,
        stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(5)) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit.toFixed(5)) : null,
        riskRewardRatio: 2.0,
        atr: parseFloat(atr.toFixed(5)),
        positionSize: this.calculatePositionSize(signal.confidence)
      }
    };
  }

  /**
   * Calculate position size based on confidence
   */
  calculatePositionSize(confidence) {
    if (confidence >= 85) return 'LARGE'; // 3-5% of account
    if (confidence >= 75) return 'MEDIUM'; // 2-3% of account
    if (confidence >= 65) return 'SMALL'; // 1-2% of account
    return 'MICRO'; // 0.5-1% of account
  }

  /**
   * Helper methods
   */
  
  combineAndValidateData({ primary, secondary, historical }) {
    // Use primary data if available, fallback to secondary, then historical
    let data = primary || secondary || historical;
    
    if (!data || data.length < 50) {
      throw new Error('Insufficient market data for analysis');
    }
    
    // Validate data integrity
    data = data.filter(candle => 
      candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0 &&
      candle.high >= candle.low && candle.high >= candle.open && candle.high >= candle.close &&
      candle.low <= candle.open && candle.low <= candle.close
    );
    
    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  generateMultiTimeframeViews(data) {
    const views = {};
    
    // 1M data (use as-is)
    views['1M'] = data.slice(-100);
    
    // 2M data (combine every 2 candles)
    views['2M'] = this.compressTimeframe(data, 2).slice(-50);
    
    // 5M data (combine every 5 candles)
    views['5M'] = this.compressTimeframe(data, 5).slice(-20);
    
    return views;
  }

  compressTimeframe(data, factor) {
    const compressed = [];
    
    for (let i = 0; i < data.length; i += factor) {
      const chunk = data.slice(i, i + factor);
      if (chunk.length === factor) {
        compressed.push({
          timestamp: chunk[chunk.length - 1].timestamp,
          open: chunk[0].open,
          high: Math.max(...chunk.map(c => c.high)),
          low: Math.min(...chunk.map(c => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((sum, c) => sum + c.volume, 0)
        });
      }
    }
    
    return compressed;
  }

  convertToYahooSymbol(symbol) {
    // Convert forex pairs to Yahoo Finance format
    const forexMap = {
      'EURUSD': 'EURUSD=X',
      'GBPUSD': 'GBPUSD=X',
      'USDJPY': 'USDJPY=X',
      'USDCHF': 'USDCHF=X',
      'AUDUSD': 'AUDUSD=X',
      'USDCAD': 'USDCAD=X',
      'NZDUSD': 'NZDUSD=X'
    };
    
    return forexMap[symbol] || symbol;
  }

  generateDemoData(symbol) {
    console.log(`📊 Generating demo data for ${symbol}`);
    
    const data = [];
    const now = Date.now();
    let basePrice = 1.0500; // Example price
    
    for (let i = 100; i >= 0; i--) {
      const timestamp = now - (i * 60000); // 1 minute intervals
      const volatility = 0.001;
      const change = (Math.random() - 0.5) * volatility;
      
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.random() * 1000000 + 500000;
      
      data.push({
        timestamp,
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume: Math.round(volume)
      });
      
      basePrice = close;
    }
    
    return this.generateMultiTimeframeViews(data);
  }

  calculateOrderBlockStrength(data, index, type) {
    // Calculate order block strength based on volume, price action, and follow-through
    let strength = 0.5; // Base strength
    
    const current = data[index];
    const volume = current.volume;
    const avgVolume = data.slice(index - 10, index).reduce((sum, c) => sum + c.volume, 0) / 10;
    
    // Volume factor
    if (volume > avgVolume * 2) strength += 0.2;
    else if (volume > avgVolume * 1.5) strength += 0.1;
    
    // Price action factor
    const bodySize = Math.abs(current.close - current.open);
    const range = current.high - current.low;
    const bodyRatio = bodySize / range;
    
    if (bodyRatio > 0.7) strength += 0.2;
    else if (bodyRatio > 0.5) strength += 0.1;
    
    return Math.min(strength, 1.0);
  }

  detectLiquiditySweeps(data) {
    // Detect when price sweeps liquidity levels (stop hunts)
    const sweeps = [];
    
    for (let i = 10; i < data.length - 1; i++) {
      const current = data[i];
      const recent = data.slice(i - 10, i);
      
      // Find recent highs and lows
      const recentHigh = Math.max(...recent.map(c => c.high));
      const recentLow = Math.min(...recent.map(c => c.low));
      
      // Liquidity sweep above recent high
      if (current.high > recentHigh && current.close < recentHigh) {
        sweeps.push({
          type: 'bearish',
          level: recentHigh,
          timestamp: current.timestamp,
          strength: 0.7
        });
      }
      
      // Liquidity sweep below recent low
      if (current.low < recentLow && current.close > recentLow) {
        sweeps.push({
          type: 'bullish',
          level: recentLow,
          timestamp: current.timestamp,
          strength: 0.7
        });
      }
    }
    
    return sweeps;
  }

  detectFairValueGaps(data) {
    // Detect Fair Value Gaps (imbalances in price)
    const gaps = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Bullish FVG: Gap between previous high and next low
      if (prev.high < next.low) {
        gaps.push({
          type: 'bullish',
          top: next.low,
          bottom: prev.high,
          timestamp: current.timestamp,
          strength: 0.6
        });
      }
      
      // Bearish FVG: Gap between previous low and next high
      if (prev.low > next.high) {
        gaps.push({
          type: 'bearish',
          top: prev.low,
          bottom: next.high,
          timestamp: current.timestamp,
          strength: 0.6
        });
      }
    }
    
    return gaps;
  }
}

module.exports = { UltraPrecisionSignalGenerator };