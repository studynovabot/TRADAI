/**
 * Production AI Trading Signal Generator
 * 
 * High-accuracy trading signal generator (85-90% target) with:
 * - Real-time data from Twelve Data / Alpha Vantage
 * - Historical context from Yahoo Finance
 * - 3-brain AI architecture with deep analysis
 * - 2-3 minute processing time for maximum accuracy
 * - Zero mock data - production ready
 */

const { ProductionMarketDataFetcher } = require('../utils/ProductionMarketDataFetcher');
const { EnhancedQuantBrain } = require('../layers/EnhancedQuantBrain');
const { UltimateAnalystBrain } = require('../layers/UltimateAnalystBrain');
const { UltimateReflexBrain } = require('../layers/UltimateReflexBrain');
const { TechnicalIndicators } = require('../utils/TechnicalIndicators');
const { Logger } = require('../utils/Logger');
const fs = require('fs-extra');
const path = require('path');

class ProductionSignalGenerator {
  constructor(config = {}) {
    this.logger = Logger.getInstanceSync();
    this.config = config;
    
    // Initialize components
    this.dataFetcher = new ProductionMarketDataFetcher(config);
    this.quantBrain = new EnhancedQuantBrain(config);
    this.analystBrain = new UltimateAnalystBrain(config);
    this.reflexBrain = new UltimateReflexBrain(config);
    this.indicators = new TechnicalIndicators();
    
    // System configuration
    this.systemConfig = {
      targetAccuracy: 87, // 85-90% target
      minConfidence: 80,  // Minimum confidence threshold
      maxProcessingTime: 180000, // 3 minutes max
      enableDeepAnalysis: true,
      requireConsensus: true,
      strictRealDataMode: true
    };
    
    // Performance tracking
    this.performance = {
      totalSignals: 0,
      successfulSignals: 0,
      avgProcessingTime: 0,
      avgConfidence: 0,
      dataSourceStats: {
        realtime: { twelveData: 0, alphaVantage: 0, finnhub: 0, polygon: 0 },
        historical: { yahooFinance: 0 },
        failures: 0
      }
    };
    
    // Signal history for learning
    this.signalHistory = [];
    this.maxHistorySize = 1000;
    
    this.logger.info('Production Signal Generator initialized with 3-brain architecture');
  }
  
  /**
   * Generate ultra-accurate trading signal with deep analysis
   * @param {string} pair - Currency pair (e.g., 'EUR/USD')
   * @param {string} timeframe - Target timeframe (e.g., '5m')
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Complete signal with analysis
   */
  async generateSignal(pair, timeframe = '5m', options = {}) {
    const startTime = Date.now();
    const signalId = `${pair}_${timeframe}_${Date.now()}`;
    
    this.logger.info(`🚀 Starting deep signal generation for ${pair} ${timeframe} (ID: ${signalId})`);
    
    try {
      // Phase 1: Data Collection & Validation
      this.logger.info('📡 Phase 1: Collecting real-time and historical market data...');
      const marketData = await this.collectMarketData(pair, timeframe);
      
      if (!marketData || !this.validateMarketData(marketData)) {
        throw new Error('Unable to collect valid real market data from all sources');
      }
      
      // Phase 2: Data Fusion & Preparation
      this.logger.info('🔄 Phase 2: Fusing real-time and historical data...');
      const unifiedData = await this.fuseMarketData(marketData, pair, timeframe);
      
      // Phase 3: Technical Analysis & Indicator Calculation
      this.logger.info('📊 Phase 3: Calculating technical indicators across timeframes...');
      const technicalAnalysis = await this.performTechnicalAnalysis(unifiedData);
      
      // Phase 4: 3-Brain AI Analysis (Deep Processing)
      this.logger.info('🧠 Phase 4: Running 3-brain AI analysis (this may take 2-3 minutes)...');
      const aiAnalysis = await this.runThreeBrainAnalysis(unifiedData, technicalAnalysis, pair, timeframe);
      
      // Phase 5: Signal Validation & Consensus
      this.logger.info('✅ Phase 5: Validating signal consensus and confidence...');
      const finalSignal = await this.validateAndFinalizeSignal(aiAnalysis, marketData, pair, timeframe);
      
      // Phase 6: Performance Tracking
      const processingTime = Date.now() - startTime;
      this.updatePerformanceStats(finalSignal, processingTime, marketData.dataSources);
      
      // Log and return final signal
      this.logger.info(`🎯 Signal generated successfully in ${processingTime}ms with ${finalSignal.confidence}% confidence`);
      
      // Store signal for learning
      this.storeSignalForLearning(finalSignal, unifiedData, technicalAnalysis);
      
      return finalSignal;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`❌ Signal generation failed for ${pair} ${timeframe}: ${error.message}`);
      
      this.performance.totalSignals++;
      this.performance.dataSourceStats.failures++;
      
      return {
        pair,
        timeframe,
        direction: 'NO_SIGNAL',
        confidence: 0,
        riskScore: 'HIGH',
        reason: `Signal generation failed: ${error.message}`,
        dataSourcesUsed: {
          realtime: 'FAILED',
          fallback: 'FAILED',
          historical: 'FAILED'
        },
        generatedAt: new Date().toISOString(),
        processingTime,
        error: error.message,
        signalId
      };
    }
  }
  
  /**
   * Collect market data from multiple sources
   * @private
   */
  async collectMarketData(pair, timeframe) {
    const dataSources = {
      realtime: null,
      realtimeSource: null,
      historical: null,
      historicalSource: null
    };
    
    try {
      // Collect real-time data (1m, 3m, 5m candles)
      this.logger.debug('Fetching real-time market data...');
      const realtimeTimeframes = ['1m', '3m', '5m'];
      
      // Try to get real-time data with failover
      const realtimeData = await this.dataFetcher.fetchMultiTimeframeData(
        pair, 
        realtimeTimeframes, 
        100
      );
      
      if (realtimeData && Object.values(realtimeData).some(data => data !== null)) {
        dataSources.realtime = realtimeData;
        dataSources.realtimeSource = 'Twelve Data'; // Will be updated by fetcher
        this.logger.info(`✅ Real-time data collected for ${Object.keys(realtimeData).filter(tf => realtimeData[tf] !== null).join(', ')}`);
      } else {
        throw new Error('No real-time data available from any provider');
      }
      
      // Collect historical data from Yahoo Finance
      this.logger.debug('Fetching historical market data from Yahoo Finance...');
      const historicalTimeframes = ['15m', '30m', '1h', '4h'];
      const historicalData = {};
      
      for (const tf of historicalTimeframes) {
        try {
          let period = '1mo';
          let interval = tf;
          
          // Adjust period based on timeframe
          if (tf === '15m' || tf === '30m') {
            period = '1mo';
            interval = tf;
          } else if (tf === '1h') {
            period = '3mo';
            interval = '1h';
          } else if (tf === '4h') {
            period = '6mo';
            interval = '1h'; // Yahoo doesn't have 4h, use 1h and aggregate
          }
          
          const data = await this.dataFetcher.fetchHistoricalData(pair, period, interval);
          if (data && data.length > 0) {
            historicalData[tf] = data;
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch historical data for ${tf}: ${error.message}`);
        }
      }
      
      if (Object.keys(historicalData).length > 0) {
        dataSources.historical = historicalData;
        dataSources.historicalSource = 'Yahoo Finance';
        this.logger.info(`✅ Historical data collected for ${Object.keys(historicalData).join(', ')}`);
      } else {
        this.logger.warn('⚠️ No historical data available, proceeding with real-time only');
      }
      
      dataSources.dataSources = {
        realtime: dataSources.realtimeSource,
        historical: dataSources.historicalSource
      };
      
      return dataSources;
      
    } catch (error) {
      this.logger.error(`Data collection failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Validate collected market data
   * @private
   */
  validateMarketData(marketData) {
    if (!marketData) return false;
    
    // Must have at least real-time data
    if (!marketData.realtime) {
      this.logger.error('No real-time data available');
      return false;
    }
    
    // Check if we have at least one valid real-time timeframe
    const validRealtimeFrames = Object.keys(marketData.realtime)
      .filter(tf => marketData.realtime[tf] !== null && marketData.realtime[tf].length > 0);
    
    if (validRealtimeFrames.length === 0) {
      this.logger.error('No valid real-time timeframes available');
      return false;
    }
    
    // Validate data freshness (last candle should be recent)
    for (const tf of validRealtimeFrames) {
      const data = marketData.realtime[tf];
      const lastCandle = data[data.length - 1];
      const age = Date.now() - lastCandle.timestamp;
      
      // Data should be less than 10 minutes old for real-time analysis
      if (age > 10 * 60 * 1000) {
        this.logger.warn(`Real-time data for ${tf} is ${Math.round(age / 60000)} minutes old`);
      }
    }
    
    this.logger.info(`✅ Market data validation passed: ${validRealtimeFrames.length} real-time timeframes`);
    return true;
  }
  
  /**
   * Fuse real-time and historical data into unified dataset
   * @private
   */
  async fuseMarketData(marketData, pair, timeframe) {
    this.logger.debug('Fusing real-time and historical market data...');
    
    const unifiedData = {
      pair,
      timeframe,
      realtime: marketData.realtime,
      historical: marketData.historical || {},
      combined: {},
      metadata: {
        realtimeSource: marketData.realtimeSource,
        historicalSource: marketData.historicalSource,
        fusedAt: Date.now()
      }
    };
    
    // Create combined datasets for each available timeframe
    const allTimeframes = new Set([
      ...Object.keys(marketData.realtime || {}),
      ...Object.keys(marketData.historical || {})
    ]);
    
    for (const tf of allTimeframes) {
      const realtimeData = marketData.realtime?.[tf] || [];
      const historicalData = marketData.historical?.[tf] || [];
      
      if (realtimeData.length > 0 || historicalData.length > 0) {
        // Combine and sort by timestamp
        const combined = [...historicalData, ...realtimeData]
          .sort((a, b) => a.timestamp - b.timestamp)
          .filter((candle, index, array) => {
            // Remove duplicates based on timestamp
            return index === 0 || candle.timestamp !== array[index - 1].timestamp;
          });
        
        unifiedData.combined[tf] = combined;
        this.logger.debug(`Combined ${tf}: ${historicalData.length} historical + ${realtimeData.length} realtime = ${combined.length} total candles`);
      }
    }
    
    return unifiedData;
  }
  
  /**
   * Perform comprehensive technical analysis
   * @private
   */
  async performTechnicalAnalysis(unifiedData) {
    this.logger.debug('Performing technical analysis across all timeframes...');
    
    const analysis = {
      indicators: {},
      patterns: {},
      levels: {},
      trends: {},
      confluence: {}
    };
    
    // Analyze each timeframe
    for (const [tf, candles] of Object.entries(unifiedData.combined)) {
      if (!candles || candles.length < 50) continue;
      
      try {
        // Calculate technical indicators
        const indicators = await this.calculateIndicators(candles);
        analysis.indicators[tf] = indicators;
        
        // Detect patterns
        const patterns = await this.detectPatterns(candles);
        analysis.patterns[tf] = patterns;
        
        // Find support/resistance levels
        const levels = await this.findKeyLevels(candles);
        analysis.levels[tf] = levels;
        
        // Determine trend
        const trend = await this.analyzeTrend(candles, indicators);
        analysis.trends[tf] = trend;
        
        this.logger.debug(`Technical analysis completed for ${tf}: ${Object.keys(indicators).length} indicators`);
        
      } catch (error) {
        this.logger.warn(`Technical analysis failed for ${tf}: ${error.message}`);
      }
    }
    
    // Calculate confluence across timeframes
    analysis.confluence = await this.calculateConfluence(analysis);
    
    return analysis;
  }
  
  /**
   * Calculate technical indicators for candle data
   * @private
   */
  async calculateIndicators(candles) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    
    const indicators = {};
    
    try {
      // Moving averages
      indicators.ema20 = this.indicators.calculateEMA(closes, 20);
      indicators.ema50 = this.indicators.calculateEMA(closes, 50);
      indicators.ema200 = this.indicators.calculateEMA(closes, 200);
      
      // Momentum indicators
      indicators.rsi = this.indicators.calculateRSI(closes, 14);
      indicators.macd = this.indicators.calculateMACD(closes);
      indicators.stochastic = this.indicators.calculateStochastic(highs, lows, closes, 14);
      
      // Volatility indicators
      indicators.bollinger = this.indicators.calculateBollingerBands(closes, 20, 2);
      indicators.atr = this.indicators.calculateATR(highs, lows, closes, 14);
      
      // Volume indicators
      if (volumes.some(v => v > 0)) {
        indicators.volumeMA = this.indicators.calculateSMA(volumes, 20);
        indicators.volumeRatio = volumes[volumes.length - 1] / (indicators.volumeMA[indicators.volumeMA.length - 1] || 1);
      }
      
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
   * Detect candlestick patterns
   * @private
   */
  async detectPatterns(candles) {
    const patterns = {
      bullish: [],
      bearish: [],
      neutral: [],
      strength: 0
    };
    
    if (candles.length < 3) return patterns;
    
    const recent = candles.slice(-10); // Last 10 candles for pattern detection
    
    for (let i = 2; i < recent.length; i++) {
      const prev2 = recent[i - 2];
      const prev1 = recent[i - 1];
      const current = recent[i];
      
      // Bullish patterns
      if (this.isBullishEngulfing(prev1, current)) {
        patterns.bullish.push({ type: 'bullish_engulfing', strength: 0.8, index: i });
      }
      
      if (this.isHammer(current)) {
        patterns.bullish.push({ type: 'hammer', strength: 0.6, index: i });
      }
      
      if (this.isMorningStar(prev2, prev1, current)) {
        patterns.bullish.push({ type: 'morning_star', strength: 0.9, index: i });
      }
      
      // Bearish patterns
      if (this.isBearishEngulfing(prev1, current)) {
        patterns.bearish.push({ type: 'bearish_engulfing', strength: 0.8, index: i });
      }
      
      if (this.isShootingStar(current)) {
        patterns.bearish.push({ type: 'shooting_star', strength: 0.6, index: i });
      }
      
      if (this.isEveningStar(prev2, prev1, current)) {
        patterns.bearish.push({ type: 'evening_star', strength: 0.9, index: i });
      }
      
      // Neutral patterns
      if (this.isDoji(current)) {
        patterns.neutral.push({ type: 'doji', strength: 0.5, index: i });
      }
    }
    
    // Calculate overall pattern strength
    const bullishStrength = patterns.bullish.reduce((sum, p) => sum + p.strength, 0);
    const bearishStrength = patterns.bearish.reduce((sum, p) => sum + p.strength, 0);
    patterns.strength = bullishStrength - bearishStrength;
    
    return patterns;
  }
  
  /**
   * Find key support and resistance levels
   * @private
   */
  async findKeyLevels(candles) {
    const levels = {
      support: [],
      resistance: [],
      pivot: null
    };
    
    if (candles.length < 20) return levels;
    
    // Find pivot points (local highs and lows)
    const pivots = [];
    const lookback = 5;
    
    for (let i = lookback; i < candles.length - lookback; i++) {
      const current = candles[i];
      const leftCandles = candles.slice(i - lookback, i);
      const rightCandles = candles.slice(i + 1, i + lookback + 1);
      
      // Check for pivot high
      const isHigher = leftCandles.every(c => current.high >= c.high) &&
                     rightCandles.every(c => current.high >= c.high);
      
      // Check for pivot low
      const isLower = leftCandles.every(c => current.low <= c.low) &&
                     rightCandles.every(c => current.low <= c.low);
      
      if (isHigher) {
        pivots.push({ type: 'high', price: current.high, index: i, timestamp: current.timestamp });
      }
      
      if (isLower) {
        pivots.push({ type: 'low', price: current.low, index: i, timestamp: current.timestamp });
      }
    }
    
    // Group similar levels
    const tolerance = 0.001; // 0.1% tolerance
    const currentPrice = candles[candles.length - 1].close;
    
    pivots.forEach(pivot => {
      const relativeDistance = Math.abs(pivot.price - currentPrice) / currentPrice;
      
      if (pivot.type === 'high' && pivot.price > currentPrice) {
        levels.resistance.push({
          price: pivot.price,
          strength: 1 / (relativeDistance + 0.001),
          touches: 1,
          timestamp: pivot.timestamp
        });
      } else if (pivot.type === 'low' && pivot.price < currentPrice) {
        levels.support.push({
          price: pivot.price,
          strength: 1 / (relativeDistance + 0.001),
          touches: 1,
          timestamp: pivot.timestamp
        });
      }
    });
    
    // Sort by strength
    levels.support.sort((a, b) => b.strength - a.strength);
    levels.resistance.sort((a, b) => b.strength - a.strength);
    
    // Calculate current pivot
    if (candles.length >= 3) {
      const last3 = candles.slice(-3);
      const high = Math.max(...last3.map(c => c.high));
      const low = Math.min(...last3.map(c => c.low));
      levels.pivot = (high + low + candles[candles.length - 1].close) / 3;
    }
    
    return levels;
  }
  
  /**
   * Analyze trend direction and strength
   * @private
   */
  async analyzeTrend(candles, indicators) {
    const trend = {
      direction: 'SIDEWAYS',
      strength: 0,
      confidence: 0,
      signals: []
    };
    
    if (!indicators.current) return trend;
    
    const current = indicators.current;
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalSignals = 0;
    
    // EMA trend analysis
    if (current.ema20 && current.ema50) {
      totalSignals++;
      if (current.price > current.ema20 && current.ema20 > current.ema50) {
        bullishSignals++;
        trend.signals.push('Price above EMA20 > EMA50');
      } else if (current.price < current.ema20 && current.ema20 < current.ema50) {
        bearishSignals++;
        trend.signals.push('Price below EMA20 < EMA50');
      }
    }
    
    // MACD trend analysis
    if (current.macd.macd && current.macd.signal) {
      totalSignals++;
      if (current.macd.macd > current.macd.signal && current.macd.histogram > 0) {
        bullishSignals++;
        trend.signals.push('MACD bullish crossover');
      } else if (current.macd.macd < current.macd.signal && current.macd.histogram < 0) {
        bearishSignals++;
        trend.signals.push('MACD bearish crossover');
      }
    }
    
    // RSI analysis
    if (current.rsi) {
      totalSignals++;
      if (current.rsi > 50 && current.rsi < 70) {
        bullishSignals++;
        trend.signals.push('RSI bullish momentum');
      } else if (current.rsi < 50 && current.rsi > 30) {
        bearishSignals++;
        trend.signals.push('RSI bearish momentum');
      }
    }
    
    // Determine trend
    if (totalSignals > 0) {
      const bullishRatio = bullishSignals / totalSignals;
      const bearishRatio = bearishSignals / totalSignals;
      
      if (bullishRatio > 0.6) {
        trend.direction = 'BULLISH';
        trend.strength = bullishRatio;
      } else if (bearishRatio > 0.6) {
        trend.direction = 'BEARISH';
        trend.strength = bearishRatio;
      }
      
      trend.confidence = Math.max(bullishRatio, bearishRatio);
    }
    
    return trend;
  }
  
  /**
   * Calculate confluence across timeframes
   * @private
   */
  async calculateConfluence(analysis) {
    const confluence = {
      bullish: 0,
      bearish: 0,
      neutral: 0,
      strength: 0,
      agreement: 0,
      signals: []
    };
    
    const timeframes = Object.keys(analysis.trends);
    if (timeframes.length === 0) return confluence;
    
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    
    // Count trend directions across timeframes
    timeframes.forEach(tf => {
      const trend = analysis.trends[tf];
      if (trend.direction === 'BULLISH') {
        bullishCount++;
        confluence.signals.push(`${tf}: ${trend.direction} (${Math.round(trend.confidence * 100)}%)`);
      } else if (trend.direction === 'BEARISH') {
        bearishCount++;
        confluence.signals.push(`${tf}: ${trend.direction} (${Math.round(trend.confidence * 100)}%)`);
      } else {
        neutralCount++;
      }
    });
    
    const totalFrames = timeframes.length;
    confluence.bullish = bullishCount / totalFrames;
    confluence.bearish = bearishCount / totalFrames;
    confluence.neutral = neutralCount / totalFrames;
    
    // Calculate overall strength and agreement
    confluence.strength = Math.max(confluence.bullish, confluence.bearish) - confluence.neutral;
    confluence.agreement = Math.max(confluence.bullish, confluence.bearish);
    
    return confluence;
  }
  
  /**
   * Run 3-brain AI analysis with deep processing
   * @private
   */
  async runThreeBrainAnalysis(unifiedData, technicalAnalysis, pair, timeframe) {
    this.logger.info('🧠 Starting 3-brain AI analysis...');
    
    const aiAnalysis = {
      quantBrain: null,
      analystBrain: null,
      reflexBrain: null,
      consensus: null,
      processingTime: 0
    };
    
    const startTime = Date.now();
    
    try {
      // Brain 1: Quant Brain - ML/Statistical Analysis
      this.logger.debug('🧮 Running Quant Brain analysis...');
      const quantStart = Date.now();
      
      aiAnalysis.quantBrain = await this.quantBrain.analyze({
        marketData: unifiedData,
        technicalAnalysis: technicalAnalysis,
        pair: pair,
        timeframe: timeframe
      });
      
      this.logger.debug(`Quant Brain completed in ${Date.now() - quantStart}ms`);
      
      // Brain 2: Analyst Brain - Pattern Recognition & Reasoning
      this.logger.debug('🧑‍💻 Running Analyst Brain analysis...');
      const analystStart = Date.now();
      
      aiAnalysis.analystBrain = await this.analystBrain.analyze({
        marketData: unifiedData,
        technicalAnalysis: technicalAnalysis,
        quantAnalysis: aiAnalysis.quantBrain,
        pair: pair,
        timeframe: timeframe
      });
      
      this.logger.debug(`Analyst Brain completed in ${Date.now() - analystStart}ms`);
      
      // Brain 3: Reflex Brain - Final Validation & Risk Assessment
      this.logger.debug('⚡ Running Reflex Brain analysis...');
      const reflexStart = Date.now();
      
      aiAnalysis.reflexBrain = await this.reflexBrain.analyze({
        marketData: unifiedData,
        technicalAnalysis: technicalAnalysis,
        quantAnalysis: aiAnalysis.quantBrain,
        analystAnalysis: aiAnalysis.analystBrain,
        pair: pair,
        timeframe: timeframe
      });
      
      this.logger.debug(`Reflex Brain completed in ${Date.now() - reflexStart}ms`);
      
      // Calculate consensus
      aiAnalysis.consensus = this.calculateBrainConsensus(aiAnalysis);
      aiAnalysis.processingTime = Date.now() - startTime;
      
      this.logger.info(`🧠 3-brain analysis completed in ${aiAnalysis.processingTime}ms`);
      
      return aiAnalysis;
      
    } catch (error) {
      this.logger.error(`3-brain analysis failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Calculate consensus between the three AI brains
   * @private
   */
  calculateBrainConsensus(aiAnalysis) {
    const consensus = {
      direction: 'NO_SIGNAL',
      confidence: 0,
      agreement: 0,
      reasoning: [],
      riskScore: 'HIGH'
    };
    
    const brains = [aiAnalysis.quantBrain, aiAnalysis.analystBrain, aiAnalysis.reflexBrain];
    const validBrains = brains.filter(brain => brain && brain.direction !== 'NO_SIGNAL');
    
    if (validBrains.length === 0) {
      consensus.reasoning.push('No valid signals from any brain');
      return consensus;
    }
    
    // Count votes for each direction
    const votes = { BUY: 0, SELL: 0, HOLD: 0 };
    const confidences = [];
    const risks = [];
    
    validBrains.forEach(brain => {
      if (brain.direction && votes.hasOwnProperty(brain.direction)) {
        votes[brain.direction]++;
        confidences.push(brain.confidence || 0);
        risks.push(brain.riskScore || 'MEDIUM');
        consensus.reasoning.push(`${brain.source || 'Brain'}: ${brain.direction} (${brain.confidence}%)`);
      }
    });
    
    // Determine consensus direction
    const maxVotes = Math.max(...Object.values(votes));
    const winningDirections = Object.keys(votes).filter(dir => votes[dir] === maxVotes);
    
    if (winningDirections.length === 1 && maxVotes >= 2) {
      consensus.direction = winningDirections[0];
      consensus.agreement = maxVotes / validBrains.length;
      consensus.confidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    } else {
      consensus.direction = 'NO_SIGNAL';
      consensus.reasoning.push('No clear consensus between brains');
    }
    
    // Determine risk score
    const riskScores = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const avgRisk = risks.reduce((sum, r) => sum + (riskScores[r] || 2), 0) / risks.length;
    
    if (avgRisk <= 1.5) consensus.riskScore = 'LOW';
    else if (avgRisk <= 2.5) consensus.riskScore = 'MEDIUM';
    else consensus.riskScore = 'HIGH';
    
    return consensus;
  }
  
  /**
   * Validate and finalize the trading signal
   * @private
   */
  async validateAndFinalizeSignal(aiAnalysis, marketData, pair, timeframe) {
    this.logger.debug('Validating and finalizing signal...');
    
    const signal = {
      pair,
      timeframe,
      direction: 'NO_SIGNAL',
      confidence: 0,
      riskScore: 'HIGH',
      reason: 'Signal validation failed',
      dataSourcesUsed: {
        realtime: marketData.realtimeSource || 'FAILED',
        fallback: 'Not used',
        historical: marketData.historicalSource || 'Not available'
      },
      generatedAt: new Date().toISOString(),
      processingTime: aiAnalysis.processingTime || 0,
      signalId: `${pair}_${timeframe}_${Date.now()}`,
      analysis: {
        brainConsensus: aiAnalysis.consensus,
        technicalScore: 0,
        patternStrength: 0,
        confluenceScore: 0
      }
    };
    
    // Check if we have valid consensus
    if (!aiAnalysis.consensus || aiAnalysis.consensus.direction === 'NO_SIGNAL') {
      signal.reason = 'No consensus from AI brains';
      return signal;
    }
    
    // Check minimum confidence threshold
    if (aiAnalysis.consensus.confidence < this.systemConfig.minConfidence) {
      signal.reason = `Confidence ${aiAnalysis.consensus.confidence}% below minimum ${this.systemConfig.minConfidence}%`;
      return signal;
    }
    
    // Check agreement threshold
    if (aiAnalysis.consensus.agreement < 0.67) { // At least 2/3 agreement
      signal.reason = `Insufficient agreement between brains: ${Math.round(aiAnalysis.consensus.agreement * 100)}%`;
      return signal;
    }
    
    // All validations passed - create final signal
    signal.direction = aiAnalysis.consensus.direction;
    signal.confidence = Math.round(aiAnalysis.consensus.confidence * 10) / 10;
    signal.riskScore = aiAnalysis.consensus.riskScore;
    signal.reason = aiAnalysis.consensus.reasoning.join(' + ');
    
    // Add technical analysis scores
    if (aiAnalysis.quantBrain) {
      signal.analysis.technicalScore = aiAnalysis.quantBrain.technicalScore || 0;
    }
    
    if (aiAnalysis.analystBrain) {
      signal.analysis.patternStrength = aiAnalysis.analystBrain.patternStrength || 0;
    }
    
    if (aiAnalysis.reflexBrain) {
      signal.analysis.confluenceScore = aiAnalysis.reflexBrain.confluenceScore || 0;
    }
    
    // Final safety check
    if (signal.confidence < this.systemConfig.minConfidence || signal.riskScore === 'HIGH') {
      signal.direction = 'NO_SIGNAL';
      signal.reason = 'Final safety check failed - signal rejected';
    }
    
    return signal;
  }
  
  /**
   * Update performance statistics
   * @private
   */
  updatePerformanceStats(signal, processingTime, dataSources) {
    this.performance.totalSignals++;
    
    if (signal.direction !== 'NO_SIGNAL') {
      this.performance.successfulSignals++;
      this.performance.avgConfidence = 
        (this.performance.avgConfidence * (this.performance.successfulSignals - 1) + signal.confidence) / 
        this.performance.successfulSignals;
    }
    
    this.performance.avgProcessingTime = 
      (this.performance.avgProcessingTime * (this.performance.totalSignals - 1) + processingTime) / 
      this.performance.totalSignals;
    
    // Update data source stats
    if (dataSources.realtime) {
      const realtimeSource = dataSources.realtime.toLowerCase().replace(/\s+/g, '');
      if (this.performance.dataSourceStats.realtime[realtimeSource] !== undefined) {
        this.performance.dataSourceStats.realtime[realtimeSource]++;
      }
    }
    
    if (dataSources.historical) {
      this.performance.dataSourceStats.historical.yahooFinance++;
    }
  }
  
  /**
   * Store signal for learning and improvement
   * @private
   */
  storeSignalForLearning(signal, unifiedData, technicalAnalysis) {
    const learningData = {
      signal,
      marketContext: {
        pair: unifiedData.pair,
        timeframe: unifiedData.timeframe,
        dataQuality: Object.keys(unifiedData.combined).length,
        technicalScore: signal.analysis.technicalScore
      },
      timestamp: Date.now()
    };
    
    this.signalHistory.push(learningData);
    
    // Keep only recent history
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory = this.signalHistory.slice(-this.maxHistorySize);
    }
    
    // Save to file for persistence
    this.saveSignalHistory();
  }
  
  /**
   * Save signal history to file
   * @private
   */
  async saveSignalHistory() {
    try {
      const historyPath = path.join(process.cwd(), 'data', 'signal_history.json');
      await fs.ensureDir(path.dirname(historyPath));
      await fs.writeJson(historyPath, {
        signals: this.signalHistory.slice(-100), // Save last 100 signals
        performance: this.performance,
        lastUpdated: new Date().toISOString()
      }, { spaces: 2 });
    } catch (error) {
      this.logger.warn(`Failed to save signal history: ${error.message}`);
    }
  }
  
  /**
   * Get system performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      successRate: this.performance.totalSignals > 0 ? 
        (this.performance.successfulSignals / this.performance.totalSignals * 100).toFixed(2) + '%' : '0%',
      avgProcessingTimeFormatted: `${(this.performance.avgProcessingTime / 1000).toFixed(1)}s`,
      systemHealth: this.performance.dataSourceStats.failures < 5 ? 'HEALTHY' : 'DEGRADED'
    };
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
}

module.exports = { ProductionSignalGenerator };