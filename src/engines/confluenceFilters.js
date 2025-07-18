/**
 * Confluence Filters - Multi-factor Signal Filter System
 * 
 * This module implements a comprehensive set of technical filters organized by category:
 * - Momentum filters (RSI, MACD, Stochastic)
 * - Trend filters (EMAs, ADX, Supertrend)
 * - Volume filters (Volume profile, OBV, VWAP)
 * - Structure filters (Support/Resistance, Pivot Points)
 * - Volatility filters (ATR, Bollinger Bands)
 * - Smart Money Concept filters (Order Blocks, Fair Value Gaps)
 * - Candlestick pattern filters
 */

const { Logger } = require('../utils/Logger');
const { RSI, MACD, Stochastic, EMA, SMA, BollingerBands, ADX, ATR } = require('technicalindicators');

class ConfluenceFilters {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Filter configuration
    this.filterConfig = {
      // Momentum filter settings
      momentum: {
        rsiOverbought: 70,
        rsiOversold: 30,
        rsiPeriod: 14,
        macdFastPeriod: 12,
        macdSlowPeriod: 26,
        macdSignalPeriod: 9,
        stochKPeriod: 14,
        stochDPeriod: 3,
        stochOverbought: 80,
        stochOversold: 20
      },
      
      // Trend filter settings
      trend: {
        emaPeriods: [8, 21, 50, 200],
        adxPeriod: 14,
        adxThreshold: 25,
        supertrendPeriod: 10,
        supertrendMultiplier: 3
      },
      
      // Volume filter settings
      volume: {
        obvPeriod: 20,
        vwapPeriod: 14,
        volumeSpikeFactor: 2.0,
        minVolumeThreshold: 1000
      },
      
      // Structure filter settings
      structure: {
        pivotLookback: 5,
        supportResistanceZones: 10,
        zoneThreshold: 0.002 // 0.2%
      },
      
      // Volatility filter settings
      volatility: {
        atrPeriod: 14,
        bbPeriod: 20,
        bbStdDev: 2,
        bbSqueezeThreshold: 0.1
      },
      
      // Smart Money Concept settings
      smc: {
        obMinLength: 3,
        obMaxAge: 50,
        fvgMinSize: 0.001, // 0.1%
        fvgMaxAge: 30,
        liquidityRadius: 0.003 // 0.3%
      },
      
      // Candlestick pattern settings
      patterns: {
        minBodySize: 0.3, // 30% of candle
        maxWickSize: 0.5, // 50% of candle
        engulfingFactor: 1.2
      }
    };
    
    this.logger.info('🔍 Confluence Filters initialized');
  }

  /**
   * Apply trending market filters
   * @param {Object} marketData - Market data for multiple timeframes
   * @param {Object} weights - Filter weights from adaptive system
   * @returns {Object} Filter results
   */
  async applyTrendingFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply trend-following filters (prioritized in trending markets)
    
    // 1. EMA Direction and Alignment Filters
    const emaResults = await this.applyEMAFilters(marketData, weights);
    Object.assign(results, emaResults);
    
    // 2. ADX Strength Filter
    const adxResults = await this.applyADXFilters(marketData, weights);
    Object.assign(results, adxResults);
    
    // 3. MACD Trend Filters
    const macdResults = await this.applyMACDFilters(marketData, weights);
    Object.assign(results, macdResults);
    
    // 4. Supertrend Filter
    const supertrendResults = await this.applySupertrendFilters(marketData, weights);
    Object.assign(results, supertrendResults);
    
    // 5. Volume Trend Confirmation
    const volumeTrendResults = await this.applyVolumeTrendFilters(marketData, weights);
    Object.assign(results, volumeTrendResults);
    
    // 6. Momentum Confirmation (RSI)
    const rsiResults = await this.applyRSIFilters(marketData, weights);
    Object.assign(results, rsiResults);
    
    return results;
  }

  /**
   * Apply ranging market filters
   * @param {Object} marketData - Market data for multiple timeframes
   * @param {Object} weights - Filter weights from adaptive system
   * @returns {Object} Filter results
   */
  async applyRangingFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply range-bound and reversal filters (prioritized in ranging markets)
    
    // 1. RSI Reversal Filters
    const rsiResults = await this.applyRSIReversalFilters(marketData, weights);
    Object.assign(results, rsiResults);
    
    // 2. Stochastic Filters
    const stochResults = await this.applyStochasticFilters(marketData, weights);
    Object.assign(results, stochResults);
    
    // 3. Bollinger Band Filters
    const bbResults = await this.applyBollingerBandFilters(marketData, weights);
    Object.assign(results, bbResults);
    
    // 4. Support/Resistance Filters
    const srResults = await this.applySupportResistanceFilters(marketData, weights);
    Object.assign(results, srResults);
    
    // 5. Pivot Point Filters
    const pivotResults = await this.applyPivotFilters(marketData, weights);
    Object.assign(results, pivotResults);
    
    // 6. Volume at Range Extremes
    const volumeRangeResults = await this.applyVolumeAtRangeFilters(marketData, weights);
    Object.assign(results, volumeRangeResults);
    
    return results;
  }

  /**
   * Apply volatile market filters
   * @param {Object} marketData - Market data for multiple timeframes
   * @param {Object} weights - Filter weights from adaptive system
   * @returns {Object} Filter results
   */
  async applyVolatileFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply volatility-specific filters (prioritized in volatile markets)
    
    // 1. ATR Filters
    const atrResults = await this.applyATRFilters(marketData, weights);
    Object.assign(results, atrResults);
    
    // 2. Bollinger Band Width Filters
    const bbWidthResults = await this.applyBBWidthFilters(marketData, weights);
    Object.assign(results, bbWidthResults);
    
    // 3. Volume Spike Filters
    const volumeSpikeResults = await this.applyVolumeSpikeFilters(marketData, weights);
    Object.assign(results, volumeSpikeResults);
    
    // 4. Momentum Extreme Filters
    const momentumResults = await this.applyMomentumExtremeFilters(marketData, weights);
    Object.assign(results, momentumResults);
    
    // 5. Price Action Filters (Gaps, Wicks)
    const priceActionResults = await this.applyPriceActionFilters(marketData, weights);
    Object.assign(results, priceActionResults);
    
    return results;
  }

  /**
   * Apply low volume market filters
   * @param {Object} marketData - Market data for multiple timeframes
   * @param {Object} weights - Filter weights from adaptive system
   * @returns {Object} Filter results
   */
  async applyLowVolumeFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply conservative filters for low volume markets
    
    // 1. Volume Threshold Filters
    const volumeThresholdResults = await this.applyVolumeThresholdFilters(marketData, weights);
    Object.assign(results, volumeThresholdResults);
    
    // 2. Reduced Volatility Filters
    const volatilityResults = await this.applyReducedVolatilityFilters(marketData, weights);
    Object.assign(results, volatilityResults);
    
    // 3. Conservative Price Action Filters
    const priceActionResults = await this.applyConservativePriceActionFilters(marketData, weights);
    Object.assign(results, priceActionResults);
    
    return results;
  }

  /**
   * Apply balanced filter set (default)
   * @param {Object} marketData - Market data for multiple timeframes
   * @param {Object} weights - Filter weights from adaptive system
   * @returns {Object} Filter results
   */
  async applyBalancedFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply a balanced mix of filters
    
    // 1. Momentum Filters
    const momentumResults = await this.applyMomentumFilters(marketData, weights);
    Object.assign(results, momentumResults);
    
    // 2. Trend Filters
    const trendResults = await this.applyTrendFilters(marketData, weights);
    Object.assign(results, trendResults);
    
    // 3. Volume Filters
    const volumeResults = await this.applyVolumeFilters(marketData, weights);
    Object.assign(results, volumeResults);
    
    // 4. Structure Filters
    const structureResults = await this.applyStructureFilters(marketData, weights);
    Object.assign(results, structureResults);
    
    // 5. Volatility Filters
    const volatilityResults = await this.applyVolatilityFilters(marketData, weights);
    Object.assign(results, volatilityResults);
    
    return results;
  }

  /**
   * Apply Smart Money Concept filters
   * @param {Object} marketData - Market data for multiple timeframes
   * @returns {Object} Filter results
   */
  async applySmartMoneyFilters(marketData) {
    const results = {};
    
    // 1. Order Block Filters
    const obResults = await this.applyOrderBlockFilters(marketData);
    Object.assign(results, obResults);
    
    // 2. Fair Value Gap Filters
    const fvgResults = await this.applyFairValueGapFilters(marketData);
    Object.assign(results, fvgResults);
    
    // 3. Liquidity Sweep Filters
    const liquidityResults = await this.applyLiquiditySweepFilters(marketData);
    Object.assign(results, liquidityResults);
    
    // 4. Breaker Block Filters
    const breakerResults = await this.applyBreakerBlockFilters(marketData);
    Object.assign(results, breakerResults);
    
    return results;
  }

  /**
   * Apply candlestick pattern filters
   * @param {Object} marketData - Market data for multiple timeframes
   * @returns {Object} Filter results
   */
  async applyCandlePatternFilters(marketData) {
    const results = {};
    
    // 1. Single Candle Pattern Filters
    const singleCandleResults = await this.applySingleCandlePatternFilters(marketData);
    Object.assign(results, singleCandleResults);
    
    // 2. Multi-Candle Pattern Filters
    const multiCandleResults = await this.applyMultiCandlePatternFilters(marketData);
    Object.assign(results, multiCandleResults);
    
    // 3. Engulfing Pattern Filters
    const engulfingResults = await this.applyEngulfingPatternFilters(marketData);
    Object.assign(results, engulfingResults);
    
    // 4. Doji Pattern Filters
    const dojiResults = await this.applyDojiPatternFilters(marketData);
    Object.assign(results, dojiResults);
    
    return results;
  }

  /**
   * Apply volume analysis filters
   * @param {Object} marketData - Market data for multiple timeframes
   * @returns {Object} Filter results
   */
  async applyVolumeFilters(marketData) {
    const results = {};
    
    // 1. Volume Profile Filters
    const volumeProfileResults = await this.applyVolumeProfileFilters(marketData);
    Object.assign(results, volumeProfileResults);
    
    // 2. OBV Filters
    const obvResults = await this.applyOBVFilters(marketData);
    Object.assign(results, obvResults);
    
    // 3. VWAP Filters
    const vwapResults = await this.applyVWAPFilters(marketData);
    Object.assign(results, vwapResults);
    
    // 4. Volume Spike Filters
    const volumeSpikeResults = await this.applyVolumeSpikeFilters(marketData);
    Object.assign(results, volumeSpikeResults);
    
    return results;
  }

  // ===== MOMENTUM FILTERS =====

  /**
   * Apply RSI filters
   */
  async applyRSIFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['5m', '15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 30) continue;
      
      const closes = data.map(candle => candle.close);
      const rsiInput = {
        values: closes,
        period: this.filterConfig.momentum.rsiPeriod
      };
      
      const rsiValues = RSI.calculate(rsiInput);
      if (!rsiValues || rsiValues.length === 0) continue;
      
      const currentRSI = rsiValues[rsiValues.length - 1];
      const prevRSI = rsiValues[rsiValues.length - 2];
      
      // RSI Oversold Filter
      if (currentRSI < this.filterConfig.momentum.rsiOversold) {
        results[`${timeframe}_rsi_oversold`] = {
          passed: true,
          direction: 'UP',
          value: currentRSI,
          reason: `RSI oversold (${currentRSI.toFixed(2)}) on ${timeframe}`,
          weight: weights[`${timeframe}_rsi_oversold`] || 1.0
        };
      } else {
        results[`${timeframe}_rsi_oversold`] = {
          passed: false,
          value: currentRSI
        };
      }
      
      // RSI Overbought Filter
      if (currentRSI > this.filterConfig.momentum.rsiOverbought) {
        results[`${timeframe}_rsi_overbought`] = {
          passed: true,
          direction: 'DOWN',
          value: currentRSI,
          reason: `RSI overbought (${currentRSI.toFixed(2)}) on ${timeframe}`,
          weight: weights[`${timeframe}_rsi_overbought`] || 1.0
        };
      } else {
        results[`${timeframe}_rsi_overbought`] = {
          passed: false,
          value: currentRSI
        };
      }
      
      // RSI Bullish Divergence Filter
      const bullishDiv = this.checkRSIBullishDivergence(data, rsiValues);
      if (bullishDiv) {
        results[`${timeframe}_rsi_bullish_divergence`] = {
          passed: true,
          direction: 'UP',
          value: currentRSI,
          reason: `RSI bullish divergence on ${timeframe}`,
          weight: weights[`${timeframe}_rsi_bullish_divergence`] || 1.5
        };
      } else {
        results[`${timeframe}_rsi_bullish_divergence`] = {
          passed: false,
          value: currentRSI
        };
      }
      
      // RSI Bearish Divergence Filter
      const bearishDiv = this.checkRSIBearishDivergence(data, rsiValues);
      if (bearishDiv) {
        results[`${timeframe}_rsi_bearish_divergence`] = {
          passed: true,
          direction: 'DOWN',
          value: currentRSI,
          reason: `RSI bearish divergence on ${timeframe}`,
          weight: weights[`${timeframe}_rsi_bearish_divergence`] || 1.5
        };
      } else {
        results[`${timeframe}_rsi_bearish_divergence`] = {
          passed: false,
          value: currentRSI
        };
      }
      
      // RSI Trend Change Filter
      if (prevRSI < 50 && currentRSI > 50) {
        results[`${timeframe}_rsi_bullish_cross`] = {
          passed: true,
          direction: 'UP',
          value: currentRSI,
          reason: `RSI crossed above 50 on ${timeframe}`,
          weight: weights[`${timeframe}_rsi_bullish_cross`] || 1.2
        };
      } else {
        results[`${timeframe}_rsi_bullish_cross`] = {
          passed: false,
          value: currentRSI
        };
      }
      
      if (prevRSI > 50 && currentRSI < 50) {
        results[`${timeframe}_rsi_bearish_cross`] = {
          passed: true,
          direction: 'DOWN',
          value: currentRSI,
          reason: `RSI crossed below 50 on ${timeframe}`,
          weight: weights[`${timeframe}_rsi_bearish_cross`] || 1.2
        };
      } else {
        results[`${timeframe}_rsi_bearish_cross`] = {
          passed: false,
          value: currentRSI
        };
      }
    }
    
    return results;
  }

  /**
   * Apply MACD filters
   */
  async applyMACDFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['5m', '15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 35) continue;
      
      const closes = data.map(candle => candle.close);
      const macdInput = {
        values: closes,
        fastPeriod: this.filterConfig.momentum.macdFastPeriod,
        slowPeriod: this.filterConfig.momentum.macdSlowPeriod,
        signalPeriod: this.filterConfig.momentum.macdSignalPeriod
      };
      
      const macdValues = MACD.calculate(macdInput);
      if (!macdValues || macdValues.length < 2) continue;
      
      const current = macdValues[macdValues.length - 1];
      const prev = macdValues[macdValues.length - 2];
      
      // MACD Line Crossover Signal Line (Bullish)
      if (prev.MACD < prev.signal && current.MACD > current.signal) {
        results[`${timeframe}_macd_bullish_cross`] = {
          passed: true,
          direction: 'UP',
          value: current.MACD,
          reason: `MACD crossed above signal line on ${timeframe}`,
          weight: weights[`${timeframe}_macd_bullish_cross`] || 1.3
        };
      } else {
        results[`${timeframe}_macd_bullish_cross`] = {
          passed: false,
          value: current.MACD
        };
      }
      
      // MACD Line Crossover Signal Line (Bearish)
      if (prev.MACD > prev.signal && current.MACD < current.signal) {
        results[`${timeframe}_macd_bearish_cross`] = {
          passed: true,
          direction: 'DOWN',
          value: current.MACD,
          reason: `MACD crossed below signal line on ${timeframe}`,
          weight: weights[`${timeframe}_macd_bearish_cross`] || 1.3
        };
      } else {
        results[`${timeframe}_macd_bearish_cross`] = {
          passed: false,
          value: current.MACD
        };
      }
      
      // MACD Histogram Direction Change (Bullish)
      if (prev.histogram < 0 && current.histogram > prev.histogram) {
        results[`${timeframe}_macd_histogram_bullish`] = {
          passed: true,
          direction: 'UP',
          value: current.histogram,
          reason: `MACD histogram turning bullish on ${timeframe}`,
          weight: weights[`${timeframe}_macd_histogram_bullish`] || 1.2
        };
      } else {
        results[`${timeframe}_macd_histogram_bullish`] = {
          passed: false,
          value: current.histogram
        };
      }
      
      // MACD Histogram Direction Change (Bearish)
      if (prev.histogram > 0 && current.histogram < prev.histogram) {
        results[`${timeframe}_macd_histogram_bearish`] = {
          passed: true,
          direction: 'DOWN',
          value: current.histogram,
          reason: `MACD histogram turning bearish on ${timeframe}`,
          weight: weights[`${timeframe}_macd_histogram_bearish`] || 1.2
        };
      } else {
        results[`${timeframe}_macd_histogram_bearish`] = {
          passed: false,
          value: current.histogram
        };
      }
      
      // MACD Zero Line Cross (Bullish)
      if (prev.MACD < 0 && current.MACD > 0) {
        results[`${timeframe}_macd_zero_cross_bullish`] = {
          passed: true,
          direction: 'UP',
          value: current.MACD,
          reason: `MACD crossed above zero line on ${timeframe}`,
          weight: weights[`${timeframe}_macd_zero_cross_bullish`] || 1.4
        };
      } else {
        results[`${timeframe}_macd_zero_cross_bullish`] = {
          passed: false,
          value: current.MACD
        };
      }
      
      // MACD Zero Line Cross (Bearish)
      if (prev.MACD > 0 && current.MACD < 0) {
        results[`${timeframe}_macd_zero_cross_bearish`] = {
          passed: true,
          direction: 'DOWN',
          value: current.MACD,
          reason: `MACD crossed below zero line on ${timeframe}`,
          weight: weights[`${timeframe}_macd_zero_cross_bearish`] || 1.4
        };
      } else {
        results[`${timeframe}_macd_zero_cross_bearish`] = {
          passed: false,
          value: current.MACD
        };
      }
    }
    
    return results;
  }

  // ===== TREND FILTERS =====

  /**
   * Apply EMA filters
   */
  async applyEMAFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['5m', '15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 210) continue; // Need enough data for 200 EMA
      
      const closes = data.map(candle => candle.close);
      const currentClose = closes[closes.length - 1];
      
      // Calculate EMAs for different periods
      const emaValues = {};
      for (const period of this.filterConfig.trend.emaPeriods) {
        const emaInput = {
          values: closes,
          period: period
        };
        
        const emaResult = EMA.calculate(emaInput);
        if (emaResult && emaResult.length > 0) {
          emaValues[period] = emaResult[emaResult.length - 1];
        }
      }
      
      // Price Above/Below EMAs
      for (const period of this.filterConfig.trend.emaPeriods) {
        if (!emaValues[period]) continue;
        
        // Price Above EMA (Bullish)
        if (currentClose > emaValues[period]) {
          results[`${timeframe}_price_above_ema${period}`] = {
            passed: true,
            direction: 'UP',
            value: emaValues[period],
            reason: `Price above EMA${period} on ${timeframe}`,
            weight: weights[`${timeframe}_price_above_ema${period}`] || 1.0
          };
        } else {
          results[`${timeframe}_price_above_ema${period}`] = {
            passed: false,
            value: emaValues[period]
          };
        }
        
        // Price Below EMA (Bearish)
        if (currentClose < emaValues[period]) {
          results[`${timeframe}_price_below_ema${period}`] = {
            passed: true,
            direction: 'DOWN',
            value: emaValues[period],
            reason: `Price below EMA${period} on ${timeframe}`,
            weight: weights[`${timeframe}_price_below_ema${period}`] || 1.0
          };
        } else {
          results[`${timeframe}_price_below_ema${period}`] = {
            passed: false,
            value: emaValues[period]
          };
        }
      }
      
      // EMA Crossovers
      if (emaValues[8] && emaValues[21]) {
        // EMA 8 crosses above EMA 21 (Bullish)
        const prevEma8 = EMA.calculate({values: closes.slice(0, -1), period: 8}).pop();
        const prevEma21 = EMA.calculate({values: closes.slice(0, -1), period: 21}).pop();
        
        if (prevEma8 < prevEma21 && emaValues[8] > emaValues[21]) {
          results[`${timeframe}_ema8_cross_above_ema21`] = {
            passed: true,
            direction: 'UP',
            value: emaValues[8],
            reason: `EMA8 crossed above EMA21 on ${timeframe}`,
            weight: weights[`${timeframe}_ema8_cross_above_ema21`] || 1.5
          };
        } else {
          results[`${timeframe}_ema8_cross_above_ema21`] = {
            passed: false,
            value: emaValues[8]
          };
        }
        
        // EMA 8 crosses below EMA 21 (Bearish)
        if (prevEma8 > prevEma21 && emaValues[8] < emaValues[21]) {
          results[`${timeframe}_ema8_cross_below_ema21`] = {
            passed: true,
            direction: 'DOWN',
            value: emaValues[8],
            reason: `EMA8 crossed below EMA21 on ${timeframe}`,
            weight: weights[`${timeframe}_ema8_cross_below_ema21`] || 1.5
          };
        } else {
          results[`${timeframe}_ema8_cross_below_ema21`] = {
            passed: false,
            value: emaValues[8]
          };
        }
      }
      
      // EMA Alignment (Bullish)
      if (emaValues[8] && emaValues[21] && emaValues[50] && emaValues[200]) {
        if (emaValues[8] > emaValues[21] && emaValues[21] > emaValues[50] && emaValues[50] > emaValues[200]) {
          results[`${timeframe}_ema_bullish_alignment`] = {
            passed: true,
            direction: 'UP',
            value: emaValues[8],
            reason: `EMAs aligned bullishly on ${timeframe} (8 > 21 > 50 > 200)`,
            weight: weights[`${timeframe}_ema_bullish_alignment`] || 1.8
          };
        } else {
          results[`${timeframe}_ema_bullish_alignment`] = {
            passed: false,
            value: emaValues[8]
          };
        }
        
        // EMA Alignment (Bearish)
        if (emaValues[8] < emaValues[21] && emaValues[21] < emaValues[50] && emaValues[50] < emaValues[200]) {
          results[`${timeframe}_ema_bearish_alignment`] = {
            passed: true,
            direction: 'DOWN',
            value: emaValues[8],
            reason: `EMAs aligned bearishly on ${timeframe} (8 < 21 < 50 < 200)`,
            weight: weights[`${timeframe}_ema_bearish_alignment`] || 1.8
          };
        } else {
          results[`${timeframe}_ema_bearish_alignment`] = {
            passed: false,
            value: emaValues[8]
          };
        }
      }
    }
    
    return results;
  }

  /**
   * Apply ADX filters
   */
  async applyADXFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['5m', '15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 30) continue;
      
      const adxInput = {
        high: data.map(candle => candle.high),
        low: data.map(candle => candle.low),
        close: data.map(candle => candle.close),
        period: this.filterConfig.trend.adxPeriod
      };
      
      const adxResult = ADX.calculate(adxInput);
      if (!adxResult || adxResult.length === 0) continue;
      
      const current = adxResult[adxResult.length - 1];
      const adxValue = current.adx;
      const diPlus = current.pdi;
      const diMinus = current.mdi;
      
      // Strong Trend Filter
      if (adxValue > this.filterConfig.trend.adxThreshold) {
        results[`${timeframe}_adx_strong_trend`] = {
          passed: true,
          direction: diPlus > diMinus ? 'UP' : 'DOWN',
          value: adxValue,
          reason: `Strong trend on ${timeframe} (ADX: ${adxValue.toFixed(2)})`,
          weight: weights[`${timeframe}_adx_strong_trend`] || 1.2
        };
      } else {
        results[`${timeframe}_adx_strong_trend`] = {
          passed: false,
          value: adxValue
        };
      }
      
      // Bullish Trend Filter
      if (adxValue > 20 && diPlus > diMinus) {
        results[`${timeframe}_adx_bullish_trend`] = {
          passed: true,
          direction: 'UP',
          value: adxValue,
          reason: `Bullish trend on ${timeframe} (ADX: ${adxValue.toFixed(2)}, DI+: ${diPlus.toFixed(2)})`,
          weight: weights[`${timeframe}_adx_bullish_trend`] || 1.3
        };
      } else {
        results[`${timeframe}_adx_bullish_trend`] = {
          passed: false,
          value: adxValue
        };
      }
      
      // Bearish Trend Filter
      if (adxValue > 20 && diMinus > diPlus) {
        results[`${timeframe}_adx_bearish_trend`] = {
          passed: true,
          direction: 'DOWN',
          value: adxValue,
          reason: `Bearish trend on ${timeframe} (ADX: ${adxValue.toFixed(2)}, DI-: ${diMinus.toFixed(2)})`,
          weight: weights[`${timeframe}_adx_bearish_trend`] || 1.3
        };
      } else {
        results[`${timeframe}_adx_bearish_trend`] = {
          passed: false,
          value: adxValue
        };
      }
      
      // DI Crossover (Bullish)
      if (adxResult.length > 1) {
        const prev = adxResult[adxResult.length - 2];
        if (prev.pdi < prev.mdi && diPlus > diMinus) {
          results[`${timeframe}_adx_bullish_cross`] = {
            passed: true,
            direction: 'UP',
            value: adxValue,
            reason: `DI+ crossed above DI- on ${timeframe}`,
            weight: weights[`${timeframe}_adx_bullish_cross`] || 1.5
          };
        } else {
          results[`${timeframe}_adx_bullish_cross`] = {
            passed: false,
            value: adxValue
          };
        }
        
        // DI Crossover (Bearish)
        if (prev.pdi > prev.mdi && diPlus < diMinus) {
          results[`${timeframe}_adx_bearish_cross`] = {
            passed: true,
            direction: 'DOWN',
            value: adxValue,
            reason: `DI+ crossed below DI- on ${timeframe}`,
            weight: weights[`${timeframe}_adx_bearish_cross`] || 1.5
          };
        } else {
          results[`${timeframe}_adx_bearish_cross`] = {
            passed: false,
            value: adxValue
          };
        }
      }
    }
    
    return results;
  }

  // ===== SMART MONEY CONCEPT FILTERS =====

  /**
   * Apply Order Block filters
   */
  async applyOrderBlockFilters(marketData) {
    const results = {};
    const timeframes = ['15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 50) continue;
      
      // Find bullish order blocks (bearish candles followed by strong bullish move)
      const bullishOB = this.findBullishOrderBlocks(data);
      if (bullishOB.length > 0) {
        // Check if price is near a bullish order block
        const currentPrice = data[data.length - 1].close;
        const nearBullishOB = bullishOB.some(ob => 
          Math.abs(currentPrice - ob.low) / currentPrice < 0.005
        );
        
        if (nearBullishOB) {
          results[`${timeframe}_near_bullish_ob`] = {
            passed: true,
            direction: 'UP',
            value: currentPrice,
            reason: `Price near bullish order block on ${timeframe}`,
            weight: 1.7
          };
        } else {
          results[`${timeframe}_near_bullish_ob`] = {
            passed: false,
            value: currentPrice
          };
        }
      }
      
      // Find bearish order blocks (bullish candles followed by strong bearish move)
      const bearishOB = this.findBearishOrderBlocks(data);
      if (bearishOB.length > 0) {
        // Check if price is near a bearish order block
        const currentPrice = data[data.length - 1].close;
        const nearBearishOB = bearishOB.some(ob => 
          Math.abs(currentPrice - ob.high) / currentPrice < 0.005
        );
        
        if (nearBearishOB) {
          results[`${timeframe}_near_bearish_ob`] = {
            passed: true,
            direction: 'DOWN',
            value: currentPrice,
            reason: `Price near bearish order block on ${timeframe}`,
            weight: 1.7
          };
        } else {
          results[`${timeframe}_near_bearish_ob`] = {
            passed: false,
            value: currentPrice
          };
        }
      }
    }
    
    return results;
  }

  /**
   * Apply Fair Value Gap filters
   */
  async applyFairValueGapFilters(marketData) {
    const results = {};
    const timeframes = ['5m', '15m'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 30) continue;
      
      // Find bullish FVGs (gaps up)
      const bullishFVGs = this.findBullishFVGs(data);
      if (bullishFVGs.length > 0) {
        // Check if price is returning to a bullish FVG
        const currentPrice = data[data.length - 1].close;
        const nearBullishFVG = bullishFVGs.some(fvg => 
          currentPrice >= fvg.low && currentPrice <= fvg.high
        );
        
        if (nearBullishFVG) {
          results[`${timeframe}_at_bullish_fvg`] = {
            passed: true,
            direction: 'UP',
            value: currentPrice,
            reason: `Price at bullish fair value gap on ${timeframe}`,
            weight: 1.6
          };
        } else {
          results[`${timeframe}_at_bullish_fvg`] = {
            passed: false,
            value: currentPrice
          };
        }
      }
      
      // Find bearish FVGs (gaps down)
      const bearishFVGs = this.findBearishFVGs(data);
      if (bearishFVGs.length > 0) {
        // Check if price is returning to a bearish FVG
        const currentPrice = data[data.length - 1].close;
        const nearBearishFVG = bearishFVGs.some(fvg => 
          currentPrice >= fvg.low && currentPrice <= fvg.high
        );
        
        if (nearBearishFVG) {
          results[`${timeframe}_at_bearish_fvg`] = {
            passed: true,
            direction: 'DOWN',
            value: currentPrice,
            reason: `Price at bearish fair value gap on ${timeframe}`,
            weight: 1.6
          };
        } else {
          results[`${timeframe}_at_bearish_fvg`] = {
            passed: false,
            value: currentPrice
          };
        }
      }
    }
    
    return results;
  }

  // ===== HELPER METHODS =====

  /**
   * Check for RSI bullish divergence
   */
  checkRSIBullishDivergence(data, rsiValues) {
    if (data.length < 10 || rsiValues.length < 10) return false;
    
    // Look for bullish divergence: lower lows in price but higher lows in RSI
    const recentData = data.slice(-10);
    const recentRSI = rsiValues.slice(-10);
    
    // Find local lows in price
    const priceLows = [];
    for (let i = 1; i < recentData.length - 1; i++) {
      if (recentData[i].low < recentData[i-1].low && recentData[i].low < recentData[i+1].low) {
        priceLows.push({ index: i, value: recentData[i].low });
      }
    }
    
    // Find local lows in RSI
    const rsiLows = [];
    for (let i = 1; i < recentRSI.length - 1; i++) {
      if (recentRSI[i] < recentRSI[i-1] && recentRSI[i] < recentRSI[i+1]) {
        rsiLows.push({ index: i, value: recentRSI[i] });
      }
    }
    
    // Need at least 2 lows to check for divergence
    if (priceLows.length < 2 || rsiLows.length < 2) return false;
    
    // Check for divergence
    const lastPriceLow = priceLows[priceLows.length - 1];
    const prevPriceLow = priceLows[priceLows.length - 2];
    
    const lastRSILow = rsiLows[rsiLows.length - 1];
    const prevRSILow = rsiLows[rsiLows.length - 2];
    
    // Bullish divergence: price making lower lows but RSI making higher lows
    return (lastPriceLow.value < prevPriceLow.value && lastRSILow.value > prevRSILow.value);
  }

  /**
   * Check for RSI bearish divergence
   */
  checkRSIBearishDivergence(data, rsiValues) {
    if (data.length < 10 || rsiValues.length < 10) return false;
    
    // Look for bearish divergence: higher highs in price but lower highs in RSI
    const recentData = data.slice(-10);
    const recentRSI = rsiValues.slice(-10);
    
    // Find local highs in price
    const priceHighs = [];
    for (let i = 1; i < recentData.length - 1; i++) {
      if (recentData[i].high > recentData[i-1].high && recentData[i].high > recentData[i+1].high) {
        priceHighs.push({ index: i, value: recentData[i].high });
      }
    }
    
    // Find local highs in RSI
    const rsiHighs = [];
    for (let i = 1; i < recentRSI.length - 1; i++) {
      if (recentRSI[i] > recentRSI[i-1] && recentRSI[i] > recentRSI[i+1]) {
        rsiHighs.push({ index: i, value: recentRSI[i] });
      }
    }
    
    // Need at least 2 highs to check for divergence
    if (priceHighs.length < 2 || rsiHighs.length < 2) return false;
    
    // Check for divergence
    const lastPriceHigh = priceHighs[priceHighs.length - 1];
    const prevPriceHigh = priceHighs[priceHighs.length - 2];
    
    const lastRSIHigh = rsiHighs[rsiHighs.length - 1];
    const prevRSIHigh = rsiHighs[rsiHighs.length - 2];
    
    // Bearish divergence: price making higher highs but RSI making lower highs
    return (lastPriceHigh.value > prevPriceHigh.value && lastRSIHigh.value < prevRSIHigh.value);
  }

  /**
   * Find bullish order blocks
   */
  findBullishOrderBlocks(data) {
    const bullishOBs = [];
    
    for (let i = 0; i < data.length - this.filterConfig.smc.obMinLength; i++) {
      // Look for a bearish candle
      const potentialOB = data[i];
      if (potentialOB.close < potentialOB.open) {
        // Check if followed by strong bullish move
        let strongBullishMove = true;
        let consecutiveBullish = 0;
        
        for (let j = i + 1; j < Math.min(i + this.filterConfig.smc.obMinLength + 1, data.length); j++) {
          if (data[j].close > data[j].open) {
            consecutiveBullish++;
          }
        }
        
        if (consecutiveBullish >= this.filterConfig.smc.obMinLength) {
          bullishOBs.push({
            index: i,
            high: potentialOB.high,
            low: potentialOB.low,
            age: data.length - i
          });
        }
      }
    }
    
    // Filter by age
    return bullishOBs.filter(ob => ob.age <= this.filterConfig.smc.obMaxAge);
  }

  /**
   * Find bearish order blocks
   */
  findBearishOrderBlocks(data) {
    const bearishOBs = [];
    
    for (let i = 0; i < data.length - this.filterConfig.smc.obMinLength; i++) {
      // Look for a bullish candle
      const potentialOB = data[i];
      if (potentialOB.close > potentialOB.open) {
        // Check if followed by strong bearish move
        let consecutiveBearish = 0;
        
        for (let j = i + 1; j < Math.min(i + this.filterConfig.smc.obMinLength + 1, data.length); j++) {
          if (data[j].close < data[j].open) {
            consecutiveBearish++;
          }
        }
        
        if (consecutiveBearish >= this.filterConfig.smc.obMinLength) {
          bearishOBs.push({
            index: i,
            high: potentialOB.high,
            low: potentialOB.low,
            age: data.length - i
          });
        }
      }
    }
    
    // Filter by age
    return bearishOBs.filter(ob => ob.age <= this.filterConfig.smc.obMaxAge);
  }

  /**
   * Find bullish fair value gaps
   */
  findBullishFVGs(data) {
    const bullishFVGs = [];
    
    for (let i = 0; i < data.length - 2; i++) {
      const first = data[i];
      const middle = data[i + 1];
      const last = data[i + 2];
      
      // Bullish FVG: first candle's high < last candle's low
      if (first.high < last.low) {
        const gapSize = (last.low - first.high) / first.high;
        
        // Check if gap is significant
        if (gapSize > this.filterConfig.smc.fvgMinSize) {
          bullishFVGs.push({
            index: i,
            high: last.low,
            low: first.high,
            size: gapSize,
            age: data.length - i - 2
          });
        }
      }
    }
    
    // Filter by age
    return bullishFVGs.filter(fvg => fvg.age <= this.filterConfig.smc.fvgMaxAge);
  }

  /**
   * Find bearish fair value gaps
   */
  findBearishFVGs(data) {
    const bearishFVGs = [];
    
    for (let i = 0; i < data.length - 2; i++) {
      const first = data[i];
      const middle = data[i + 1];
      const last = data[i + 2];
      
      // Bearish FVG: first candle's low > last candle's high
      if (first.low > last.high) {
        const gapSize = (first.low - last.high) / first.low;
        
        // Check if gap is significant
        if (gapSize > this.filterConfig.smc.fvgMinSize) {
          bearishFVGs.push({
            index: i,
            high: first.low,
            low: last.high,
            size: gapSize,
            age: data.length - i - 2
          });
        }
      }
    }
    
    // Filter by age
    return bearishFVGs.filter(fvg => fvg.age <= this.filterConfig.smc.fvgMaxAge);
  }

  // Placeholder methods for other filter types
  // These would be implemented with similar detailed logic as the examples above
  
  async applyRSIReversalFilters(marketData, weights = {}) {
    // Similar to RSI filters but focused on reversal signals
    return await this.applyRSIFilters(marketData, weights);
  }
  
  async applyStochasticFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['5m', '15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 20) continue;
      
      // Placeholder implementation - would use technicalindicators.Stochastic
      const currentPrice = data[data.length - 1].close;
      const prevPrice = data[data.length - 2].close;
      
      // Simple momentum check as placeholder
      if (currentPrice > prevPrice * 1.002) {
        results[`${timeframe}_stoch_bullish`] = {
          passed: true,
          direction: 'UP',
          value: 75,
          reason: `Stochastic bullish momentum on ${timeframe}`,
          weight: weights[`${timeframe}_stoch_bullish`] || 1.0
        };
      }
    }
    
    return results;
  }
  
  async applyBollingerBandFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 20) continue;
      
      const closes = data.map(candle => candle.close);
      const bbInput = {
        values: closes,
        period: this.filterConfig.volatility.bbPeriod,
        stdDev: this.filterConfig.volatility.bbStdDev
      };
      
      try {
        const bbResult = BollingerBands.calculate(bbInput);
        if (bbResult && bbResult.length > 0) {
          const current = bbResult[bbResult.length - 1];
          const currentPrice = closes[closes.length - 1];
          
          // Bollinger Band squeeze or expansion
          const bandwidth = (current.upper - current.lower) / current.middle;
          
          if (bandwidth < this.filterConfig.volatility.bbSqueezeThreshold) {
            results[`${timeframe}_bb_squeeze`] = {
              passed: true,
              direction: 'NEUTRAL',
              value: bandwidth,
              reason: `Bollinger Band squeeze on ${timeframe}`,
              weight: weights[`${timeframe}_bb_squeeze`] || 1.1
            };
          }
        }
      } catch (error) {
        // Silently continue on calculation error
      }
    }
    
    return results;
  }
  
  async applySupportResistanceFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['15m', '1h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 50) continue;
      
      // Simple support/resistance detection
      const currentPrice = data[data.length - 1].close;
      const recentHigh = Math.max(...data.slice(-20).map(c => c.high));
      const recentLow = Math.min(...data.slice(-20).map(c => c.low));
      
      // Check if price is near support/resistance
      const distanceToResistance = Math.abs(currentPrice - recentHigh) / currentPrice;
      const distanceToSupport = Math.abs(currentPrice - recentLow) / currentPrice;
      
      if (distanceToSupport < this.filterConfig.structure.zoneThreshold) {
        results[`${timeframe}_near_support`] = {
          passed: true,
          direction: 'UP',
          value: recentLow,
          reason: `Price near support zone on ${timeframe}`,
          weight: weights[`${timeframe}_near_support`] || 1.3
        };
      }
      
      if (distanceToResistance < this.filterConfig.structure.zoneThreshold) {
        results[`${timeframe}_near_resistance`] = {
          passed: true,
          direction: 'DOWN',
          value: recentHigh,
          reason: `Price near resistance zone on ${timeframe}`,
          weight: weights[`${timeframe}_near_resistance`] || 1.3
        };
      }
    }
    
    return results;
  }
  
  async applyPivotFilters(marketData, weights = {}) {
    const results = {};
    const timeframes = ['1h', '4h'];
    
    for (const timeframe of timeframes) {
      const data = marketData.data[timeframe];
      if (!data || data.length < 10) continue;
      
      // Calculate pivot points (simplified)
      const yesterday = data[data.length - 2];
      const pivot = (yesterday.high + yesterday.low + yesterday.close) / 3;
      const currentPrice = data[data.length - 1].close;
      
      // Check if price is reacting to pivot levels
      const distanceToPivot = Math.abs(currentPrice - pivot) / currentPrice;
      
      if (distanceToPivot < this.filterConfig.structure.zoneThreshold) {
        results[`${timeframe}_pivot_reaction`] = {
          passed: true,
          direction: currentPrice > pivot ? 'UP' : 'DOWN',
          value: pivot,
          reason: `Price reacting to pivot level on ${timeframe}`,
          weight: weights[`${timeframe}_pivot_reaction`] || 1.2
        };
      }
    }
    
    return results;
  }
  
  applyVolumeAtRangeFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyATRFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyBBWidthFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyVolumeSpikeFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyMomentumExtremeFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyPriceActionFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyVolumeThresholdFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyReducedVolatilityFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyConservativePriceActionFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  async applyMomentumFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply RSI filters
    const rsiResults = await this.applyRSIFilters(marketData, weights);
    Object.assign(results, rsiResults);
    
    // Apply MACD filters
    const macdResults = await this.applyMACDFilters(marketData, weights);
    Object.assign(results, macdResults);
    
    // Apply Stochastic filters (placeholder)
    const stochResults = await this.applyStochasticFilters(marketData, weights);
    Object.assign(results, stochResults);
    
    return results;
  }
  
  async applyTrendFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply EMA filters
    const emaResults = await this.applyEMAFilters(marketData, weights);
    Object.assign(results, emaResults);
    
    // Apply ADX filters
    const adxResults = await this.applyADXFilters(marketData, weights);
    Object.assign(results, adxResults);
    
    return results;
  }
  
  async applyStructureFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply support/resistance filters (placeholder)
    const srResults = await this.applySupportResistanceFilters(marketData, weights);
    Object.assign(results, srResults);
    
    // Apply pivot filters (placeholder)
    const pivotResults = await this.applyPivotFilters(marketData, weights);
    Object.assign(results, pivotResults);
    
    return results;
  }
  
  async applyVolatilityFilters(marketData, weights = {}) {
    const results = {};
    
    // Apply ATR filters (placeholder)
    const atrResults = await this.applyATRFilters(marketData, weights);
    Object.assign(results, atrResults);
    
    // Apply Bollinger Band filters (placeholder)
    const bbResults = await this.applyBollingerBandFilters(marketData, weights);
    Object.assign(results, bbResults);
    
    return results;
  }
  
  applySupertrendFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyVolumeTrendFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyLiquiditySweepFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyBreakerBlockFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applySingleCandlePatternFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyMultiCandlePatternFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyEngulfingPatternFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyDojiPatternFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyVolumeProfileFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyOBVFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
  
  applyVWAPFilters(marketData, weights = {}) {
    // Implementation would go here
    return {};
  }
}

module.exports = { ConfluenceFilters };