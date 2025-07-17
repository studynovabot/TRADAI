/**
 * Market Regime Detector
 * 
 * This module detects the current market regime (trending, ranging, volatile, low volume)
 * to help the signal engine apply appropriate filters and strategies.
 */

const { Logger } = require('../utils/Logger');
const { ADX, BollingerBands, ATR } = require('technicalindicators');

class MarketRegimeDetector {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Regime detection thresholds
    this.thresholds = {
      trending: {
        adxStrong: 25,        // ADX above 25 indicates trend
        adxVeryStrong: 35,    // ADX above 35 indicates strong trend
        directionThreshold: 5 // Minimum DI+/DI- difference
      },
      ranging: {
        adxWeak: 20,          // ADX below 20 indicates ranging market
        bbSqueezeRatio: 0.3,  // BB width compared to recent average
        priceRangeRatio: 0.6  // Price staying within 60% of range
      },
      volatile: {
        atrRatio: 1.5,        // ATR ratio compared to recent average
        bbWidthRatio: 1.8,    // BB width expansion ratio
        gapThreshold: 0.003   // 0.3% gap between candles
      },
      lowVolume: {
        volumeRatio: 0.7,     // Volume below 70% of average
        minVolume: 1000,      // Minimum volume threshold
        weekendHours: true    // Consider weekend/off-hours
      }
    };
    
    // Regime history for smoothing
    this.regimeHistory = [];
    this.historyMaxSize = 5;
    
    this.logger.info('📊 Market Regime Detector initialized');
  }

  /**
   * Detect current market regime from market data
   * @param {Object} marketData - Market data for multiple timeframes
   * @returns {Object} Detected regime with type and confidence
   */
  async detectRegime(marketData) {
    try {
      // Use multiple timeframes for regime detection
      // Primary: 15m, Secondary: 1h, Confirmation: 5m
      const timeframes = ['15m', '1h', '5m'];
      const regimeScores = {
        TRENDING: 0,
        RANGING: 0,
        VOLATILE: 0,
        LOW_VOLUME: 0
      };
      
      // Calculate regime scores for each timeframe
      for (const timeframe of timeframes) {
        const data = marketData.data[timeframe];
        if (!data || data.length < 30) continue;
        
        // Weight by timeframe importance
        const weight = timeframe === '15m' ? 0.5 : 
                      timeframe === '1h' ? 0.3 : 0.2;
        
        // Calculate individual regime indicators
        const trendingScore = this.calculateTrendingScore(data) * weight;
        const rangingScore = this.calculateRangingScore(data) * weight;
        const volatileScore = this.calculateVolatileScore(data) * weight;
        const lowVolumeScore = this.calculateLowVolumeScore(data) * weight;
        
        // Add to total scores
        regimeScores.TRENDING += trendingScore;
        regimeScores.RANGING += rangingScore;
        regimeScores.VOLATILE += volatileScore;
        regimeScores.LOW_VOLUME += lowVolumeScore;
      }
      
      // Determine dominant regime
      let dominantRegime = 'RANGING'; // Default
      let highestScore = 0;
      
      for (const [regime, score] of Object.entries(regimeScores)) {
        if (score > highestScore) {
          highestScore = score;
          dominantRegime = regime;
        }
      }
      
      // Calculate confidence based on score difference
      const sortedScores = Object.values(regimeScores).sort((a, b) => b - a);
      const confidence = sortedScores.length > 1 ? 
        (sortedScores[0] - sortedScores[1]) / sortedScores[0] : 1;
      
      // Apply smoothing using history
      const smoothedRegime = this.smoothRegimeDetection(dominantRegime, confidence);
      
      this.logger.debug(`Market regime detected: ${smoothedRegime.type} (${(smoothedRegime.confidence * 100).toFixed(1)}%)`);
      
      return smoothedRegime;
      
    } catch (error) {
      this.logger.error('❌ Regime detection failed:', error);
      return { type: 'RANGING', confidence: 0.5, error: true };
    }
  }

  /**
   * Calculate trending market score
   */
  calculateTrendingScore(data) {
    try {
      // Calculate ADX
      const adxInput = {
        high: data.map(candle => candle.high),
        low: data.map(candle => candle.low),
        close: data.map(candle => candle.close),
        period: 14
      };
      
      const adxResult = ADX.calculate(adxInput);
      if (!adxResult || adxResult.length === 0) return 0;
      
      // Get latest ADX values
      const latestAdx = adxResult[adxResult.length - 1];
      const adxValue = latestAdx.adx;
      const diPlus = latestAdx.pdi;
      const diMinus = latestAdx.mdi;
      
      // Calculate trend direction strength
      const directionStrength = Math.abs(diPlus - diMinus);
      
      // Calculate EMA alignment
      const closes = data.map(candle => candle.close);
      const ema20 = this.calculateEMA(closes, 20);
      const ema50 = this.calculateEMA(closes, 50);
      const ema200 = this.calculateEMA(closes, 200);
      
      let emaAlignmentScore = 0;
      const currentClose = closes[closes.length - 1];
      
      // Check if EMAs are aligned in a trending manner
      if (ema20 && ema50 && ema200) {
        // Bullish alignment: EMA20 > EMA50 > EMA200
        if (ema20 > ema50 && ema50 > ema200) {
          emaAlignmentScore = 0.3;
        }
        // Bearish alignment: EMA20 < EMA50 < EMA200
        else if (ema20 < ema50 && ema50 < ema200) {
          emaAlignmentScore = 0.3;
        }
        // Partial alignment
        else if ((ema20 > ema50) || (ema50 > ema200)) {
          emaAlignmentScore = 0.15;
        }
      }
      
      // Calculate final trending score
      let trendingScore = 0;
      
      // Strong trend
      if (adxValue > this.thresholds.trending.adxVeryStrong && 
          directionStrength > this.thresholds.trending.directionThreshold) {
        trendingScore = 0.8 + emaAlignmentScore;
      }
      // Moderate trend
      else if (adxValue > this.thresholds.trending.adxStrong) {
        trendingScore = 0.5 + emaAlignmentScore;
      }
      // Weak trend
      else if (adxValue > 15) {
        trendingScore = 0.3 + (emaAlignmentScore / 2);
      }
      
      return Math.min(1, trendingScore);
      
    } catch (error) {
      this.logger.error('❌ Error calculating trending score:', error);
      return 0;
    }
  }

  /**
   * Calculate ranging market score
   */
  calculateRangingScore(data) {
    try {
      // Calculate ADX (low ADX indicates ranging market)
      const adxInput = {
        high: data.map(candle => candle.high),
        low: data.map(candle => candle.low),
        close: data.map(candle => candle.close),
        period: 14
      };
      
      const adxResult = ADX.calculate(adxInput);
      if (!adxResult || adxResult.length === 0) return 0.5; // Default to moderate ranging
      
      const latestAdx = adxResult[adxResult.length - 1].adx;
      
      // Calculate Bollinger Bands squeeze
      const bbInput = {
        values: data.map(candle => candle.close),
        period: 20,
        stdDev: 2
      };
      
      const bbResult = BollingerBands.calculate(bbInput);
      if (!bbResult || bbResult.length < 10) return 0;
      
      // Calculate BB width and its ratio to recent average
      const recentBB = bbResult.slice(-10);
      const currentBBWidth = recentBB[recentBB.length - 1].upper - recentBB[recentBB.length - 1].lower;
      const avgBBWidth = recentBB.reduce((sum, bb) => sum + (bb.upper - bb.lower), 0) / recentBB.length;
      const bbWidthRatio = currentBBWidth / avgBBWidth;
      
      // Check if price is staying within a range
      const recent = data.slice(-20);
      const highestHigh = Math.max(...recent.map(candle => candle.high));
      const lowestLow = Math.min(...recent.map(candle => candle.low));
      const range = highestHigh - lowestLow;
      
      // Check how many candles stayed within the middle portion of the range
      const middleRangeCount = recent.filter(candle => {
        const middleRangeUpper = lowestLow + (range * (0.5 + this.thresholds.ranging.priceRangeRatio/2));
        const middleRangeLower = lowestLow + (range * (0.5 - this.thresholds.ranging.priceRangeRatio/2));
        return candle.close <= middleRangeUpper && candle.close >= middleRangeLower;
      }).length;
      
      const priceRangeScore = middleRangeCount / recent.length;
      
      // Calculate final ranging score
      let rangingScore = 0;
      
      // Strong ranging market
      if (latestAdx < this.thresholds.ranging.adxWeak && 
          bbWidthRatio < this.thresholds.ranging.bbSqueezeRatio &&
          priceRangeScore > 0.7) {
        rangingScore = 0.9;
      }
      // Moderate ranging market
      else if (latestAdx < 25 && bbWidthRatio < 0.5 && priceRangeScore > 0.5) {
        rangingScore = 0.6;
      }
      // Weak ranging market
      else if (latestAdx < 30 && priceRangeScore > 0.4) {
        rangingScore = 0.3;
      }
      
      return Math.min(1, rangingScore);
      
    } catch (error) {
      this.logger.error('❌ Error calculating ranging score:', error);
      return 0.3; // Default to weak ranging
    }
  }

  /**
   * Calculate volatile market score
   */
  calculateVolatileScore(data) {
    try {
      // Calculate ATR
      const atrInput = {
        high: data.map(candle => candle.high),
        low: data.map(candle => candle.low),
        close: data.map(candle => candle.close),
        period: 14
      };
      
      const atrResult = ATR.calculate(atrInput);
      if (!atrResult || atrResult.length < 10) return 0;
      
      // Calculate current ATR vs recent average
      const recentATR = atrResult.slice(-10);
      const currentATR = recentATR[recentATR.length - 1];
      const avgATR = recentATR.reduce((sum, atr) => sum + atr, 0) / recentATR.length;
      const atrRatio = currentATR / avgATR;
      
      // Calculate Bollinger Bands width expansion
      const bbInput = {
        values: data.map(candle => candle.close),
        period: 20,
        stdDev: 2
      };
      
      const bbResult = BollingerBands.calculate(bbInput);
      if (!bbResult || bbResult.length < 10) return 0;
      
      // Calculate BB width expansion
      const recentBB = bbResult.slice(-10);
      const currentBBWidth = recentBB[recentBB.length - 1].upper - recentBB[recentBB.length - 1].lower;
      const avgBBWidth = recentBB.slice(0, -1).reduce((sum, bb) => sum + (bb.upper - bb.lower), 0) / (recentBB.length - 1);
      const bbWidthRatio = currentBBWidth / avgBBWidth;
      
      // Check for price gaps
      const recent = data.slice(-10);
      let gapCount = 0;
      
      for (let i = 1; i < recent.length; i++) {
        const prevCandle = recent[i-1];
        const currCandle = recent[i];
        
        // Check for gap up
        const gapUp = currCandle.low > prevCandle.high;
        // Check for gap down
        const gapDown = currCandle.high < prevCandle.low;
        
        if (gapUp || gapDown) {
          gapCount++;
        }
      }
      
      const gapScore = gapCount / 9; // Max 9 gaps possible in 10 candles
      
      // Calculate final volatile score
      let volatileScore = 0;
      
      // Highly volatile market
      if (atrRatio > this.thresholds.volatile.atrRatio && 
          bbWidthRatio > this.thresholds.volatile.bbWidthRatio &&
          gapScore > 0.2) {
        volatileScore = 0.9;
      }
      // Moderately volatile market
      else if (atrRatio > 1.3 && bbWidthRatio > 1.4 && gapScore > 0.1) {
        volatileScore = 0.6;
      }
      // Slightly volatile market
      else if (atrRatio > 1.1 || bbWidthRatio > 1.2 || gapScore > 0) {
        volatileScore = 0.3;
      }
      
      return Math.min(1, volatileScore);
      
    } catch (error) {
      this.logger.error('❌ Error calculating volatile score:', error);
      return 0;
    }
  }

  /**
   * Calculate low volume market score
   */
  calculateLowVolumeScore(data) {
    try {
      // Extract volumes
      const volumes = data.map(candle => candle.volume);
      if (volumes.length < 20) return 0;
      
      // Calculate current volume vs recent average
      const recentVolumes = volumes.slice(-20);
      const currentVolume = recentVolumes[recentVolumes.length - 1];
      const avgVolume = recentVolumes.slice(0, -1).reduce((sum, vol) => sum + vol, 0) / (recentVolumes.length - 1);
      const volumeRatio = currentVolume / avgVolume;
      
      // Check if current time is during weekend or off-hours
      const isOffHours = this.isMarketOffHours();
      
      // Calculate final low volume score
      let lowVolumeScore = 0;
      
      // Very low volume
      if (volumeRatio < this.thresholds.lowVolume.volumeRatio && 
          currentVolume < this.thresholds.lowVolume.minVolume) {
        lowVolumeScore = 0.8;
      }
      // Moderately low volume
      else if (volumeRatio < 0.85) {
        lowVolumeScore = 0.5;
      }
      // Slightly low volume
      else if (volumeRatio < 0.95) {
        lowVolumeScore = 0.2;
      }
      
      // Boost score if it's off-hours
      if (isOffHours && this.thresholds.lowVolume.weekendHours) {
        lowVolumeScore = Math.min(1, lowVolumeScore + 0.3);
      }
      
      return Math.min(1, lowVolumeScore);
      
    } catch (error) {
      this.logger.error('❌ Error calculating low volume score:', error);
      return 0;
    }
  }

  /**
   * Check if current time is during market off-hours
   */
  isMarketOffHours() {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    
    // Weekend (0 = Sunday, 6 = Saturday)
    if (day === 0 || day === 6) {
      return true;
    }
    
    // Off-hours (before 7 AM or after 9 PM UTC)
    if (hour < 7 || hour >= 21) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(values, period) {
    if (values.length < period) return null;
    
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < values.length; i++) {
      ema = (values[i] - ema) * k + ema;
    }
    
    return ema;
  }

  /**
   * Smooth regime detection using history
   */
  smoothRegimeDetection(currentRegime, confidence) {
    // Add current detection to history
    this.regimeHistory.push({ type: currentRegime, confidence });
    
    // Keep history at max size
    if (this.regimeHistory.length > this.historyMaxSize) {
      this.regimeHistory.shift();
    }
    
    // If history is too short or confidence is very high, return current regime
    if (this.regimeHistory.length < 3 || confidence > 0.8) {
      return { type: currentRegime, confidence };
    }
    
    // Count regime occurrences in history
    const regimeCounts = {};
    let totalConfidence = 0;
    
    for (const regime of this.regimeHistory) {
      regimeCounts[regime.type] = (regimeCounts[regime.type] || 0) + 1;
      totalConfidence += regime.confidence;
    }
    
    // Find most frequent regime
    let smoothedRegime = currentRegime;
    let maxCount = 0;
    
    for (const [regime, count] of Object.entries(regimeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        smoothedRegime = regime;
      }
    }
    
    // Calculate smoothed confidence
    const smoothedConfidence = totalConfidence / this.regimeHistory.length;
    
    return { 
      type: smoothedRegime, 
      confidence: smoothedConfidence,
      raw: { type: currentRegime, confidence }
    };
  }
}

module.exports = { MarketRegimeDetector };