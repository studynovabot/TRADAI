/**
 * Enhanced Quant Brain - Layer 1: ML-Based Market Prediction
 * 
 * This module implements an enhanced version of the first layer of the 3-layer AI trading system.
 * It uses multiple ML models to predict market direction with confidence scores.
 */

const { Logger } = require('../utils/Logger');
const { EnhancedRealML } = require('../ml/EnhancedRealML');
const fs = require('fs-extra');
const path = require('path');

// Technical indicators
const RSI = require('technicalindicators').RSI;
const EMA = require('technicalindicators').EMA;
const MACD = require('technicalindicators').MACD;
const BollingerBands = require('technicalindicators').BollingerBands;
const ATR = require('technicalindicators').ATR;
const Stochastic = require('technicalindicators').Stochastic;

class EnhancedQuantBrain {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize ML models
    this.mlModels = new EnhancedRealML(config);
    
    // Technical indicator configuration
    this.indicators = {
      rsi: { period: 14 },
      ema: { periods: [8, 21, 50, 200] },
      macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      bb: { period: 20, stdDev: 2 },
      atr: { period: 14 },
      stoch: { kPeriod: 14, dPeriod: 3, slowing: 3 }
    };
    
    // Feature extraction configuration
    this.featureConfig = {
      timeframes: ['1m', '3m', '5m', '15m', '30m', '1h'],
      includeVolume: true,
      includePatterns: true,
      includeMarketStructure: true,
      includeMultiTimeframe: true
    };
    
    // Risk assessment configuration
    this.riskConfig = {
      volatilityWeight: 0.3,
      trendStrengthWeight: 0.3,
      volumeProfileWeight: 0.2,
      marketStructureWeight: 0.2,
      maxRiskScore: 0.8
    };
    
    // Performance tracking
    this.performance = {
      predictions: 0,
      successfulPredictions: 0,
      accuracy: 0,
      avgConfidence: 0,
      avgProcessingTime: 0
    };
    
    this.logger.info('🧠 EnhancedQuantBrain initialized');
  }
  
  /**
   * Load ML models
   */
  async loadModels() {
    try {
      this.logger.info('🔄 Loading ML models...');
      const success = await this.mlModels.loadModels();
      
      if (success) {
        this.logger.info('✅ ML models loaded successfully');
      } else {
        this.logger.warn('⚠️ Some ML models failed to load');
      }
      
      return success;
    } catch (error) {
      this.logger.error('❌ Failed to load ML models:', error);
      return false;
    }
  }
  
  /**
   * Main prediction method
   */
  async predict(marketData) {
    const startTime = Date.now();
    
    try {
      this.logger.info('🔮 Generating market prediction...');
      
      // Extract features from market data
      const features = this.extractFeatures(marketData);
      
      // Get predictions from ML models
      const predictions = await this.mlModels.getPredictions(features);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(features, marketData);
      
      // Generate final prediction with confidence
      const finalPrediction = this.generateFinalPrediction(predictions, riskScore, features);
      
      // Add metadata
      finalPrediction.timestamp = new Date().toISOString();
      finalPrediction.currencyPair = this.config.currencyPair;
      finalPrediction.timeframe = '5m';
      finalPrediction.features = features;
      finalPrediction.modelPredictions = predictions;
      finalPrediction.processingTime = Date.now() - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(finalPrediction);
      
      this.logger.info(`✅ Prediction: ${finalPrediction.direction} (${(finalPrediction.confidence * 100).toFixed(1)}% confidence, ${(finalPrediction.riskScore * 100).toFixed(1)}% risk)`);
      
      return finalPrediction;
      
    } catch (error) {
      this.logger.error('❌ Prediction failed:', error);
      
      // Return conservative prediction on error
      return {
        direction: 'NEUTRAL',
        confidence: 0.1,
        riskScore: 0.9,
        error: error.message,
        timestamp: new Date().toISOString(),
        currencyPair: this.config.currencyPair,
        timeframe: '5m',
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Extract features from market data
   */
  extractFeatures(marketData) {
    try {
      const features = {
        technical: {},
        volume: {},
        patterns: {},
        marketStructure: {},
        multiTimeframe: {}
      };
      
      // Process each timeframe
      for (const timeframe of this.featureConfig.timeframes) {
        if (marketData.data[timeframe] && marketData.data[timeframe].length > 0) {
          const candles = marketData.data[timeframe];
          
          // Extract technical indicators
          this.extractTechnicalFeatures(features, candles, timeframe);
          
          // Extract volume features
          if (this.featureConfig.includeVolume) {
            this.extractVolumeFeatures(features, candles, timeframe);
          }
          
          // Extract pattern features
          if (this.featureConfig.includePatterns) {
            this.extractPatternFeatures(features, candles, timeframe);
          }
        }
      }
      
      // Extract market structure features
      if (this.featureConfig.includeMarketStructure) {
        this.extractMarketStructureFeatures(features, marketData);
      }
      
      // Extract multi-timeframe features
      if (this.featureConfig.includeMultiTimeframe) {
        this.extractMultiTimeframeFeatures(features, marketData);
      }
      
      return features;
      
    } catch (error) {
      this.logger.error('❌ Feature extraction failed:', error);
      throw error;
    }
  }
  
  /**
   * Extract technical indicator features
   */
  extractTechnicalFeatures(features, candles, timeframe) {
    const prefix = `${timeframe}_`;
    
    // Extract price data
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const opens = candles.map(c => c.open);
    
    // Calculate RSI
    if (closes.length >= this.indicators.rsi.period) {
      try {
        const rsi = RSI.calculate({
          values: closes,
          period: this.indicators.rsi.period
        });
        
        if (rsi && rsi.length > 0) {
          features.technical[`${prefix}rsi14`] = rsi[rsi.length - 1];
          features.technical[`${prefix}rsi_overbought`] = rsi[rsi.length - 1] > 70 ? 1 : 0;
          features.technical[`${prefix}rsi_oversold`] = rsi[rsi.length - 1] < 30 ? 1 : 0;
        }
      } catch (error) {
        this.logger.warn(`⚠️ RSI calculation failed: ${error.message}`);
      }
    }
    
    // Calculate EMAs
    for (const period of this.indicators.ema.periods) {
      if (closes.length >= period) {
        try {
          const ema = EMA.calculate({
            values: closes,
            period: period
          });
          
          if (ema && ema.length > 0) {
            features.technical[`${prefix}ema${period}`] = ema[ema.length - 1];
          }
        } catch (error) {
          this.logger.warn(`⚠️ EMA${period} calculation failed: ${error.message}`);
        }
      }
    }
    
    // Calculate MACD
    if (closes.length >= this.indicators.macd.slowPeriod + this.indicators.macd.signalPeriod) {
      try {
        const macd = MACD.calculate({
          values: closes,
          fastPeriod: this.indicators.macd.fastPeriod,
          slowPeriod: this.indicators.macd.slowPeriod,
          signalPeriod: this.indicators.macd.signalPeriod
        });
        
        if (macd && macd.length > 0) {
          const latest = macd[macd.length - 1];
          
          features.technical[`${prefix}macd_line`] = latest.MACD;
          features.technical[`${prefix}macd_signal`] = latest.signal;
          features.technical[`${prefix}macd_histogram`] = latest.histogram;
          
          // MACD crossovers
          if (macd.length >= 2) {
            const current = latest.MACD > latest.signal;
            const previous = macd[macd.length - 2].MACD > macd[macd.length - 2].signal;
            
            features.technical[`${prefix}macd_bullish_cross`] = (!previous && current) ? 1 : 0;
            features.technical[`${prefix}macd_bearish_cross`] = (previous && !current) ? 1 : 0;
          }
        }
      } catch (error) {
        this.logger.warn(`⚠️ MACD calculation failed: ${error.message}`);
      }
    }
    
    // Calculate Bollinger Bands
    if (closes.length >= this.indicators.bb.period) {
      try {
        const bb = BollingerBands.calculate({
          values: closes,
          period: this.indicators.bb.period,
          stdDev: this.indicators.bb.stdDev
        });
        
        if (bb && bb.length > 0) {
          const latest = bb[bb.length - 1];
          const currentPrice = closes[closes.length - 1];
          
          features.technical[`${prefix}bb_upper`] = latest.upper;
          features.technical[`${prefix}bb_middle`] = latest.middle;
          features.technical[`${prefix}bb_lower`] = latest.lower;
          features.technical[`${prefix}bb_width`] = (latest.upper - latest.lower) / latest.middle;
          features.technical[`${prefix}bb_position`] = (currentPrice - latest.lower) / (latest.upper - latest.lower);
          
          // Detect BB squeeze and expansion
          features.technical[`${prefix}bb_squeeze`] = this.detectBBSqueeze(bb) ? 1 : 0;
          features.technical[`${prefix}bb_expansion`] = this.detectBBExpansion(bb) ? 1 : 0;
        }
      } catch (error) {
        this.logger.warn(`⚠️ Bollinger Bands calculation failed: ${error.message}`);
      }
    }
    
    // Calculate ATR
    if (closes.length >= this.indicators.atr.period) {
      try {
        const atr = ATR.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: this.indicators.atr.period
        });
        
        if (atr && atr.length > 0) {
          features.technical[`${prefix}atr`] = atr[atr.length - 1];
          features.technical[`${prefix}atr_normalized`] = atr[atr.length - 1] / closes[closes.length - 1];
          
          // ATR trend
          if (atr.length >= 8) {
            const avgRecent = atr.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
            const avgOlder = atr.slice(-8, -5).reduce((sum, val) => sum + val, 0) / 3;
            features.technical[`${prefix}atr_trend`] = (avgRecent - avgOlder) / avgOlder;
          }
        }
      } catch (error) {
        this.logger.warn(`⚠️ ATR calculation failed: ${error.message}`);
      }
    }
    
    // Calculate Stochastic
    if (closes.length >= this.indicators.stoch.kPeriod + this.indicators.stoch.dPeriod) {
      try {
        const stoch = Stochastic.calculate({
          high: highs,
          low: lows,
          close: closes,
          period: this.indicators.stoch.kPeriod,
          signalPeriod: this.indicators.stoch.dPeriod
        });
        
        if (stoch && stoch.length > 0) {
          const latest = stoch[stoch.length - 1];
          
          features.technical[`${prefix}stoch_k`] = latest.k;
          features.technical[`${prefix}stoch_d`] = latest.d;
          features.technical[`${prefix}stoch_overbought`] = latest.k > 80 ? 1 : 0;
          features.technical[`${prefix}stoch_oversold`] = latest.k < 20 ? 1 : 0;
          
          // Stochastic crossover
          if (stoch.length >= 2) {
            const current = latest.k > latest.d;
            const previous = stoch[stoch.length - 2].k > stoch[stoch.length - 2].d;
            
            features.technical[`${prefix}stoch_bullish_cross`] = (!previous && current) ? 1 : 0;
            features.technical[`${prefix}stoch_bearish_cross`] = (previous && !current) ? 1 : 0;
          }
        }
      } catch (error) {
        this.logger.warn(`⚠️ Stochastic calculation failed: ${error.message}`);
      }
    }
    
    // Calculate price changes
    if (closes.length >= 2) {
      const lastClose = closes[closes.length - 1];
      const prevClose = closes[closes.length - 2];
      
      features.technical[`${prefix}price_change`] = (lastClose - prevClose) / prevClose;
      features.technical[`${prefix}price_change_abs`] = Math.abs((lastClose - prevClose) / prevClose);
    }
  }
  
  /**
   * Extract volume features
   */
  extractVolumeFeatures(features, candles, timeframe) {
    const prefix = `${timeframe}_`;
    
    if (candles.length < 2) return;
    
    const volumes = candles.map(c => c.volume);
    const closes = candles.map(c => c.close);
    
    // Calculate volume metrics
    const lastVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-10).reduce((sum, vol) => sum + vol, 0) / 10;
    
    features.volume[`${prefix}volume`] = lastVolume;
    features.volume[`${prefix}volume_avg`] = avgVolume;
    features.volume[`${prefix}volume_ratio`] = lastVolume / avgVolume;
    features.volume[`${prefix}volume_change`] = (lastVolume - volumes[volumes.length - 2]) / volumes[volumes.length - 2];
    
    // Detect volume spikes
    features.volume[`${prefix}volume_spike`] = lastVolume > avgVolume * 2 ? 1 : 0;
    
    // Volume trend
    const volumeTrend = this.calculateVolumeTrend(volumes.slice(-5));
    features.volume[`${prefix}volume_trend`] = volumeTrend;
    
    // Volume-price divergence
    features.volume[`${prefix}volume_price_divergence`] = this.detectVolumePriceDivergence(closes, volumes) ? 1 : 0;
  }
  
  /**
   * Extract pattern features
   */
  extractPatternFeatures(features, candles, timeframe) {
    const prefix = `${timeframe}_`;
    
    if (candles.length < 5) return;
    
    // Detect bullish patterns
    features.patterns[`${prefix}bullish_engulfing`] = this.detectBullishEngulfing(candles) ? 1 : 0;
    features.patterns[`${prefix}hammer`] = this.detectHammer(candles) ? 1 : 0;
    features.patterns[`${prefix}morning_star`] = this.detectMorningStar(candles) ? 1 : 0;
    features.patterns[`${prefix}piercing_line`] = this.detectPiercingLine(candles) ? 1 : 0;
    features.patterns[`${prefix}bullish_harami`] = this.detectBullishHarami(candles) ? 1 : 0;
    
    // Detect bearish patterns
    features.patterns[`${prefix}bearish_engulfing`] = this.detectBearishEngulfing(candles) ? 1 : 0;
    features.patterns[`${prefix}shooting_star`] = this.detectShootingStar(candles) ? 1 : 0;
    features.patterns[`${prefix}evening_star`] = this.detectEveningStar(candles) ? 1 : 0;
    features.patterns[`${prefix}dark_cloud_cover`] = this.detectDarkCloudCover(candles) ? 1 : 0;
    features.patterns[`${prefix}bearish_harami`] = this.detectBearishHarami(candles) ? 1 : 0;
    
    // Detect doji
    features.patterns[`${prefix}doji`] = this.detectDoji(candles) ? 1 : 0;
  }
  
  /**
   * Extract market structure features
   */
  extractMarketStructureFeatures(features, marketData) {
    try {
      // Use 15m timeframe for market structure
      const timeframe = '15m';
      const candles = marketData.data[timeframe];
      
      if (!candles || candles.length < 20) return;
      
      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      
      // Detect trend
      const uptrend = this.detectUptrend(closes);
      const downtrend = this.detectDowntrend(closes);
      
      features.marketStructure.uptrend = uptrend ? 1 : 0;
      features.marketStructure.downtrend = downtrend ? 1 : 0;
      features.marketStructure.sideways = (!uptrend && !downtrend) ? 1 : 0;
      
      // Detect support and resistance
      const supportResistance = this.detectSupportResistance(highs, lows, closes);
      
      features.marketStructure.support = supportResistance.support;
      features.marketStructure.resistance = supportResistance.resistance;
      features.marketStructure.distance_to_support = (closes[closes.length - 1] - supportResistance.support) / closes[closes.length - 1];
      features.marketStructure.distance_to_resistance = (supportResistance.resistance - closes[closes.length - 1]) / closes[closes.length - 1];
      
      // Detect breakouts
      features.marketStructure.breakout = this.detectBreakout(candles, supportResistance.resistance) ? 1 : 0;
      features.marketStructure.breakdown = this.detectBreakdown(candles, supportResistance.support) ? 1 : 0;
      
      // Detect higher highs and lower lows
      features.marketStructure.higher_highs = this.detectHigherHighs(highs) ? 1 : 0;
      features.marketStructure.higher_lows = this.detectHigherLows(lows) ? 1 : 0;
      features.marketStructure.lower_highs = this.detectLowerHighs(highs) ? 1 : 0;
      features.marketStructure.lower_lows = this.detectLowerLows(lows) ? 1 : 0;
      
    } catch (error) {
      this.logger.warn(`⚠️ Market structure extraction failed: ${error.message}`);
    }
  }
  
  /**
   * Extract multi-timeframe features
   */
  extractMultiTimeframeFeatures(features, marketData) {
    try {
      const timeframes = ['5m', '15m', '30m', '1h'];
      const validTimeframes = timeframes.filter(tf => 
        marketData.data[tf] && marketData.data[tf].length >= 20
      );
      
      if (validTimeframes.length < 2) return;
      
      // Count bullish and bearish timeframes
      let bullishCount = 0;
      let bearishCount = 0;
      
      for (const tf of validTimeframes) {
        const candles = marketData.data[tf];
        const closes = candles.map(c => c.close);
        
        // Check EMA alignment
        if (features.technical[`${tf}_ema8`] && features.technical[`${tf}_ema21`]) {
          if (features.technical[`${tf}_ema8`] > features.technical[`${tf}_ema21`]) {
            bullishCount++;
          } else {
            bearishCount++;
          }
        }
        
        // Check RSI
        if (features.technical[`${tf}_rsi14`]) {
          if (features.technical[`${tf}_rsi14`] > 50) {
            bullishCount++;
          } else {
            bearishCount++;
          }
        }
        
        // Check MACD
        if (features.technical[`${tf}_macd_line`] && features.technical[`${tf}_macd_signal`]) {
          if (features.technical[`${tf}_macd_line`] > features.technical[`${tf}_macd_signal`]) {
            bullishCount++;
          } else {
            bearishCount++;
          }
        }
      }
      
      // Calculate multi-timeframe alignment
      features.multiTimeframe.bullish_alignment = bullishCount / (bullishCount + bearishCount);
      features.multiTimeframe.bearish_alignment = bearishCount / (bullishCount + bearishCount);
      features.multiTimeframe.alignment_strength = Math.abs(bullishCount - bearishCount) / (bullishCount + bearishCount);
      features.multiTimeframe.bullish_timeframes = bullishCount;
      features.multiTimeframe.bearish_timeframes = bearishCount;
      features.multiTimeframe.total_timeframes = validTimeframes.length;
      
    } catch (error) {
      this.logger.warn(`⚠️ Multi-timeframe extraction failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate risk score
   */
  calculateRiskScore(features, marketData) {
    try {
      let riskScore = 0.5; // Default medium risk
      
      // Volatility risk (ATR)
      let volatilityRisk = 0.5;
      if (features.technical['5m_atr_normalized']) {
        const atrNormalized = features.technical['5m_atr_normalized'];
        volatilityRisk = Math.min(1, atrNormalized * 100); // Scale ATR to 0-1
      }
      
      // Trend strength risk
      let trendRisk = 0.5;
      if (features.marketStructure) {
        if (features.marketStructure.uptrend === 1 && features.marketStructure.higher_highs === 1) {
          trendRisk = 0.3; // Strong uptrend is lower risk
        } else if (features.marketStructure.downtrend === 1 && features.marketStructure.lower_lows === 1) {
          trendRisk = 0.3; // Strong downtrend is lower risk
        } else if (features.marketStructure.sideways === 1) {
          trendRisk = 0.7; // Sideways market is higher risk
        }
      }
      
      // Volume profile risk
      let volumeRisk = 0.5;
      if (features.volume['5m_volume_ratio']) {
        const volumeRatio = features.volume['5m_volume_ratio'];
        if (volumeRatio < 0.5) {
          volumeRisk = 0.7; // Low volume is higher risk
        } else if (volumeRatio > 2) {
          volumeRisk = 0.6; // Very high volume can be risky
        } else if (volumeRatio > 1) {
          volumeRisk = 0.4; // Above average volume is lower risk
        }
      }
      
      // Market structure risk
      let structureRisk = 0.5;
      if (features.marketStructure) {
        if (features.marketStructure.breakout === 1 || features.marketStructure.breakdown === 1) {
          structureRisk = 0.6; // Breakouts can be volatile
        } else if (features.marketStructure.distance_to_support < 0.01) {
          structureRisk = 0.4; // Near support is lower risk for buys
        } else if (features.marketStructure.distance_to_resistance < 0.01) {
          structureRisk = 0.4; // Near resistance is lower risk for sells
        }
      }
      
      // Calculate weighted risk score
      riskScore = (
        volatilityRisk * this.riskConfig.volatilityWeight +
        trendRisk * this.riskConfig.trendStrengthWeight +
        volumeRisk * this.riskConfig.volumeProfileWeight +
        structureRisk * this.riskConfig.marketStructureWeight
      );
      
      // Clamp risk score
      riskScore = Math.max(0.1, Math.min(this.riskConfig.maxRiskScore, riskScore));
      
      return riskScore;
      
    } catch (error) {
      this.logger.warn(`⚠️ Risk calculation failed: ${error.message}`);
      return 0.5; // Default medium risk
    }
  }
  
  /**
   * Generate final prediction
   */
  generateFinalPrediction(predictions, riskScore, features) {
    // Get ensemble prediction
    const ensemble = predictions.ensemble;
    
    // Determine direction
    let direction = ensemble.direction;
    let confidence = ensemble.confidence;
    
    // Adjust confidence based on multi-timeframe alignment
    if (features.multiTimeframe) {
      if (direction === 'UP' && features.multiTimeframe.bullish_alignment > 0.7) {
        confidence = Math.min(1, confidence * 1.2);
      } else if (direction === 'DOWN' && features.multiTimeframe.bearish_alignment > 0.7) {
        confidence = Math.min(1, confidence * 1.2);
      } else if (direction === 'UP' && features.multiTimeframe.bearish_alignment > 0.7) {
        confidence = Math.max(0.1, confidence * 0.8);
      } else if (direction === 'DOWN' && features.multiTimeframe.bullish_alignment > 0.7) {
        confidence = Math.max(0.1, confidence * 0.8);
      }
    }
    
    // Adjust confidence based on risk score
    confidence = Math.max(0.1, confidence * (1 - riskScore * 0.5));
    
    // Convert to binary options format
    if (direction === 'UP') {
      direction = 'BUY';
    } else if (direction === 'DOWN') {
      direction = 'SELL';
    } else {
      direction = 'NO TRADE';
    }
    
    // If confidence is too low, recommend no trade
    if (confidence < 0.3) {
      direction = 'NO TRADE';
    }
    
    return {
      direction,
      confidence,
      riskScore,
      modelConsensus: this.calculateModelConsensus(predictions)
    };
  }
  
  /**
   * Calculate model consensus
   */
  calculateModelConsensus(predictions) {
    const modelVotes = {
      UP: 0,
      DOWN: 0,
      total: 0
    };
    
    // Count votes from each model
    for (const [model, prediction] of Object.entries(predictions)) {
      if (model !== 'ensemble' && prediction !== undefined) {
        modelVotes.total++;
        if (prediction.direction === 'UP') {
          modelVotes.UP++;
        } else if (prediction.direction === 'DOWN') {
          modelVotes.DOWN++;
        }
      }
    }
    
    // Calculate consensus percentages
    const upConsensus = modelVotes.total > 0 ? modelVotes.UP / modelVotes.total : 0;
    const downConsensus = modelVotes.total > 0 ? modelVotes.DOWN / modelVotes.total : 0;
    
    return {
      upVotes: modelVotes.UP,
      downVotes: modelVotes.DOWN,
      totalModels: modelVotes.total,
      upConsensus,
      downConsensus,
      consensusStrength: Math.max(upConsensus, downConsensus)
    };
  }
  
  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(prediction) {
    this.performance.predictions++;
    this.performance.avgConfidence = (
      (this.performance.avgConfidence * (this.performance.predictions - 1)) + 
      prediction.confidence
    ) / this.performance.predictions;
    
    this.performance.avgProcessingTime = (
      (this.performance.avgProcessingTime * (this.performance.predictions - 1)) + 
      prediction.processingTime
    ) / this.performance.predictions;
  }
  
  /**
   * Update prediction accuracy (call after trade completion)
   */
  updatePredictionAccuracy(prediction, actualOutcome) {
    const wasCorrect = (
      (prediction.direction === 'BUY' && actualOutcome === 'WIN') ||
      (prediction.direction === 'SELL' && actualOutcome === 'WIN') ||
      (prediction.direction === 'NO TRADE' && actualOutcome === 'AVOID_LOSS')
    );
    
    if (wasCorrect) {
      this.performance.successfulPredictions++;
    }
    
    this.performance.accuracy = this.performance.successfulPredictions / this.performance.predictions;
    
    // Update ML model accuracy
    if (prediction.modelPredictions && actualOutcome !== 'UNKNOWN') {
      const actualDirection = actualOutcome === 'WIN' ? prediction.direction === 'BUY' ? 'UP' : 'DOWN' : 
                             actualOutcome === 'LOSS' ? prediction.direction === 'BUY' ? 'DOWN' : 'UP' : 
                             'NEUTRAL';
      
      this.mlModels.updatePerformance(prediction.modelPredictions, actualDirection);
    }
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performance,
      modelPerformance: this.mlModels.getPerformanceMetrics()
    };
  }
  
  // ===== Technical Analysis Helper Methods =====
  
  /**
   * Detect Bollinger Bands squeeze
   */
  detectBBSqueeze(bbData) {
    if (bbData.length < 10) return false;
    
    const recentWidth = bbData.slice(-3).map(bb => (bb.upper - bb.lower) / bb.middle);
    const olderWidth = bbData.slice(-10, -3).map(bb => (bb.upper - bb.lower) / bb.middle);
    
    const avgRecentWidth = recentWidth.reduce((sum, w) => sum + w, 0) / recentWidth.length;
    const avgOlderWidth = olderWidth.reduce((sum, w) => sum + w, 0) / olderWidth.length;
    
    return avgRecentWidth < avgOlderWidth * 0.7;
  }
  
  /**
   * Detect Bollinger Bands expansion
   */
  detectBBExpansion(bbData) {
    if (bbData.length < 10) return false;
    
    const recentWidth = bbData.slice(-3).map(bb => (bb.upper - bb.lower) / bb.middle);
    const olderWidth = bbData.slice(-10, -3).map(bb => (bb.upper - bb.lower) / bb.middle);
    
    const avgRecentWidth = recentWidth.reduce((sum, w) => sum + w, 0) / recentWidth.length;
    const avgOlderWidth = olderWidth.reduce((sum, w) => sum + w, 0) / olderWidth.length;
    
    return avgRecentWidth > avgOlderWidth * 1.3;
  }
  
  /**
   * Calculate volume trend
   */
  calculateVolumeTrend(volumes) {
    if (volumes.length < 3) return 0;
    
    const changes = [];
    for (let i = 1; i < volumes.length; i++) {
      changes.push((volumes[i] - volumes[i-1]) / volumes[i-1]);
    }
    
    return changes.reduce((sum, change) => sum + change, 0) / changes.length;
  }
  
  /**
   * Detect volume-price divergence
   */
  detectVolumePriceDivergence(closes, volumes) {
    if (closes.length < 5 || volumes.length < 5) return false;
    
    const recentCloses = closes.slice(-5);
    const recentVolumes = volumes.slice(-5);
    
    const priceChange = (recentCloses[recentCloses.length - 1] - recentCloses[0]) / recentCloses[0];
    const volumeChange = (recentVolumes[recentVolumes.length - 1] - recentVolumes[0]) / recentVolumes[0];
    
    return (priceChange > 0.01 && volumeChange < -0.1) || (priceChange < -0.01 && volumeChange < -0.1);
  }
  
  /**
   * Detect uptrend
   */
  detectUptrend(closes) {
    if (closes.length < 20) return false;
    
    // Check if price is above EMA20
    const ema20 = EMA.calculate({
      values: closes,
      period: 20
    });
    
    if (ema20.length === 0) return false;
    
    const lastClose = closes[closes.length - 1];
    const lastEma = ema20[ema20.length - 1];
    
    return lastClose > lastEma;
  }
  
  /**
   * Detect downtrend
   */
  detectDowntrend(closes) {
    if (closes.length < 20) return false;
    
    // Check if price is below EMA20
    const ema20 = EMA.calculate({
      values: closes,
      period: 20
    });
    
    if (ema20.length === 0) return false;
    
    const lastClose = closes[closes.length - 1];
    const lastEma = ema20[ema20.length - 1];
    
    return lastClose < lastEma;
  }
  
  /**
   * Detect support and resistance levels
   */
  detectSupportResistance(highs, lows, closes) {
    if (highs.length < 20 || lows.length < 20) {
      return { support: 0, resistance: 0 };
    }
    
    // Simple implementation - find recent swing highs and lows
    const recentHighs = highs.slice(-20);
    const recentLows = lows.slice(-20);
    
    const maxHigh = Math.max(...recentHighs);
    const minLow = Math.min(...recentLows);
    
    const lastClose = closes[closes.length - 1];
    
    // Find closest support below current price
    let support = minLow;
    for (let i = recentLows.length - 2; i >= 0; i--) {
      if (recentLows[i] < lastClose && recentLows[i] > support) {
        support = recentLows[i];
      }
    }
    
    // Find closest resistance above current price
    let resistance = maxHigh;
    for (let i = recentHighs.length - 2; i >= 0; i--) {
      if (recentHighs[i] > lastClose && recentHighs[i] < resistance) {
        resistance = recentHighs[i];
      }
    }
    
    return { support, resistance };
  }
  
  /**
   * Detect breakout
   */
  detectBreakout(candles, resistance) {
    if (candles.length < 3 || resistance === 0) return false;
    
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    return prevCandle.close < resistance && lastCandle.close > resistance;
  }
  
  /**
   * Detect breakdown
   */
  detectBreakdown(candles, support) {
    if (candles.length < 3 || support === 0) return false;
    
    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    
    return prevCandle.close > support && lastCandle.close < support;
  }
  
  /**
   * Detect higher highs
   */
  detectHigherHighs(highs) {
    if (highs.length < 10) return false;
    
    const recentHighs = [];
    
    // Find local highs
    for (let i = 2; i < highs.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
          highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        recentHighs.push(highs[i]);
      }
    }
    
    if (recentHighs.length < 2) return false;
    
    // Check if recent highs are increasing
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] <= recentHighs[i-1]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Detect higher lows
   */
  detectHigherLows(lows) {
    if (lows.length < 10) return false;
    
    const recentLows = [];
    
    // Find local lows
    for (let i = 2; i < lows.length - 2; i++) {
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
          lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        recentLows.push(lows[i]);
      }
    }
    
    if (recentLows.length < 2) return false;
    
    // Check if recent lows are increasing
    for (let i = 1; i < recentLows.length; i++) {
      if (recentLows[i] <= recentLows[i-1]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Detect lower highs
   */
  detectLowerHighs(highs) {
    if (highs.length < 10) return false;
    
    const recentHighs = [];
    
    // Find local highs
    for (let i = 2; i < highs.length - 2; i++) {
      if (highs[i] > highs[i-1] && highs[i] > highs[i-2] && 
          highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        recentHighs.push(highs[i]);
      }
    }
    
    if (recentHighs.length < 2) return false;
    
    // Check if recent highs are decreasing
    for (let i = 1; i < recentHighs.length; i++) {
      if (recentHighs[i] >= recentHighs[i-1]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Detect lower lows
   */
  detectLowerLows(lows) {
    if (lows.length < 10) return false;
    
    const recentLows = [];
    
    // Find local lows
    for (let i = 2; i < lows.length - 2; i++) {
      if (lows[i] < lows[i-1] && lows[i] < lows[i-2] && 
          lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        recentLows.push(lows[i]);
      }
    }
    
    if (recentLows.length < 2) return false;
    
    // Check if recent lows are decreasing
    for (let i = 1; i < recentLows.length; i++) {
      if (recentLows[i] >= recentLows[i-1]) {
        return false;
      }
    }
    
    return true;
  }
  
  // ===== Candlestick Pattern Detection Methods =====
  
  /**
   * Detect bullish engulfing pattern
   */
  detectBullishEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    return (
      previous.close < previous.open && // Previous candle is bearish
      current.close > current.open && // Current candle is bullish
      current.open < previous.close && // Current open below previous close
      current.close > previous.open // Current close above previous open
    );
  }
  
  /**
   * Detect bearish engulfing pattern
   */
  detectBearishEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    
    return (
      previous.close > previous.open && // Previous candle is bullish
      current.close < current.open && // Current candle is bearish
      current.open > previous.close && // Current open above previous close
      current.close < previous.open // Current close below previous open
    );
  }
  
  /**
   * Detect hammer pattern
   */
  detectHammer(candles) {
    if (candles.length < 1) return false;
    
    const candle = candles[candles.length - 1];
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    
    return (
      lowerShadow > bodySize * 2 && // Lower shadow at least 2x body
      upperShadow < bodySize * 0.5 && // Upper shadow less than half of body
      candle.close > candle.open // Bullish candle
    );
  }
  
  /**
   * Detect shooting star pattern
   */
  detectShootingStar(candles) {
    if (candles.length < 1) return false;
    
    const candle = candles[candles.length - 1];
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerShadow = Math.min(candle.open, candle.close) - candle.low;
    const upperShadow = candle.high - Math.max(candle.open, candle.close);
    
    return (
      upperShadow > bodySize * 2 && // Upper shadow at least 2x body
      lowerShadow < bodySize * 0.5 && // Lower shadow less than half of body
      candle.close < candle.open // Bearish candle
    );
  }
  
  /**
   * Detect morning star pattern
   */
  detectMorningStar(candles) {
    if (candles.length < 3) return false;
    
    const first = candles[candles.length - 3];
    const middle = candles[candles.length - 2];
    const last = candles[candles.length - 1];
    
    const firstBodySize = Math.abs(first.close - first.open);
    const middleBodySize = Math.abs(middle.close - middle.open);
    const lastBodySize = Math.abs(last.close - last.open);
    
    return (
      first.close < first.open && // First candle is bearish
      firstBodySize > middleBodySize * 2 && // First candle has large body
      last.close > last.open && // Last candle is bullish
      lastBodySize > middleBodySize * 2 && // Last candle has large body
      Math.max(middle.open, middle.close) < first.close && // Middle candle below first
      last.close > (first.open + first.close) / 2 // Last close above first midpoint
    );
  }
  
  /**
   * Detect evening star pattern
   */
  detectEveningStar(candles) {
    if (candles.length < 3) return false;
    
    const first = candles[candles.length - 3];
    const middle = candles[candles.length - 2];
    const last = candles[candles.length - 1];
    
    const firstBodySize = Math.abs(first.close - first.open);
    const middleBodySize = Math.abs(middle.close - middle.open);
    const lastBodySize = Math.abs(last.close - last.open);
    
    return (
      first.close > first.open && // First candle is bullish
      firstBodySize > middleBodySize * 2 && // First candle has large body
      last.close < last.open && // Last candle is bearish
      lastBodySize > middleBodySize * 2 && // Last candle has large body
      Math.min(middle.open, middle.close) > first.close && // Middle candle above first
      last.close < (first.open + first.close) / 2 // Last close below first midpoint
    );
  }
  
  /**
   * Detect piercing line pattern
   */
  detectPiercingLine(candles) {
    if (candles.length < 2) return false;
    
    const first = candles[candles.length - 2];
    const second = candles[candles.length - 1];
    
    return (
      first.close < first.open && // First candle is bearish
      second.close > second.open && // Second candle is bullish
      second.open < first.low && // Second open below first low
      second.close > (first.open + first.close) / 2 // Second close above first midpoint
    );
  }
  
  /**
   * Detect dark cloud cover pattern
   */
  detectDarkCloudCover(candles) {
    if (candles.length < 2) return false;
    
    const first = candles[candles.length - 2];
    const second = candles[candles.length - 1];
    
    return (
      first.close > first.open && // First candle is bullish
      second.close < second.open && // Second candle is bearish
      second.open > first.high && // Second open above first high
      second.close < (first.open + first.close) / 2 // Second close below first midpoint
    );
  }
  
  /**
   * Detect bullish harami pattern
   */
  detectBullishHarami(candles) {
    if (candles.length < 2) return false;
    
    const first = candles[candles.length - 2];
    const second = candles[candles.length - 1];
    
    return (
      first.close < first.open && // First candle is bearish
      second.close > second.open && // Second candle is bullish
      second.open > first.close && // Second open above first close
      second.close < first.open // Second close below first open
    );
  }
  
  /**
   * Detect bearish harami pattern
   */
  detectBearishHarami(candles) {
    if (candles.length < 2) return false;
    
    const first = candles[candles.length - 2];
    const second = candles[candles.length - 1];
    
    return (
      first.close > first.open && // First candle is bullish
      second.close < second.open && // Second candle is bearish
      second.open < first.close && // Second open below first close
      second.close > first.open // Second close above first open
    );
  }
  
  /**
   * Detect doji pattern
   */
  detectDoji(candles) {
    if (candles.length < 1) return false;
    
    const candle = candles[candles.length - 1];
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    
    return bodySize < totalRange * 0.1; // Body is less than 10% of total range
  }
}

module.exports = { EnhancedQuantBrain };