/**
 * Feature Extraction Service
 * Extracts numerical features from market data for ML training
 */

class FeatureExtractionService {
  constructor() {
    this.lookbackCandles = parseInt(process.env.FEATURE_LOOKBACK_CANDLES) || 50;
  }

  /**
   * Extract comprehensive features from market data
   * @param {Object} marketData - Market data with OHLCV
   * @param {Array} recentCandles - Recent candle data
   * @returns {Object} Extracted features
   */
  extractFeatures(marketData, recentCandles = []) {
    try {
      const features = {
        // Basic price features
        currentPrice: marketData.currentPrice || 0,
        
        // Moving averages
        ...this.calculateMovingAverages(recentCandles),
        
        // Bollinger Bands
        ...this.calculateBollingerBands(recentCandles),
        
        // Stochastic oscillator
        ...this.calculateStochastic(recentCandles),
        
        // RSI
        rsi: this.calculateRSI(recentCandles),
        
        // MACD
        ...this.calculateMACD(recentCandles),
        
        // Volume features
        ...this.calculateVolumeFeatures(recentCandles),
        
        // Volatility features
        ...this.calculateVolatilityFeatures(recentCandles),
        
        // Candle pattern features
        ...this.calculateCandlePatternFeatures(recentCandles),
        
        // Momentum features
        ...this.calculateMomentumFeatures(recentCandles),
        
        // Support/Resistance features
        ...this.calculateSupportResistanceFeatures(recentCandles),
        
        // Time-based features
        ...this.calculateTimeFeatures(),
        
        // Market structure features
        ...this.calculateMarketStructureFeatures(recentCandles)
      };

      // Store raw time series if enabled
      if (process.env.STORE_RAW_TIMESERIES === 'true') {
        features.rawTimeSeries = {
          recentPrices: recentCandles.slice(-20).map(c => c.close),
          recentVolumes: recentCandles.slice(-20).map(c => c.volume || 0),
          recentHighs: recentCandles.slice(-20).map(c => c.high),
          recentLows: recentCandles.slice(-20).map(c => c.low)
        };
      }

      return features;
    } catch (error) {
      console.error('Feature extraction failed:', error);
      return this.getDefaultFeatures();
    }
  }

  /**
   * Calculate moving averages
   */
  calculateMovingAverages(candles) {
    if (candles.length < 20) return { ema5: 0, ema20: 0, ema_diff: 0, sma10: 0, sma20: 0 };

    const closes = candles.map(c => c.close);
    
    const ema5 = this.calculateEMA(closes, 5);
    const ema20 = this.calculateEMA(closes, 20);
    const sma10 = this.calculateSMA(closes, 10);
    const sma20 = this.calculateSMA(closes, 20);

    return {
      ema5: ema5[ema5.length - 1] || 0,
      ema20: ema20[ema20.length - 1] || 0,
      ema_diff: (ema5[ema5.length - 1] || 0) - (ema20[ema20.length - 1] || 0),
      sma10: sma10[sma10.length - 1] || 0,
      sma20: sma20[sma20.length - 1] || 0
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(candles) {
    if (candles.length < 20) return { bb_upper: 0, bb_mid: 0, bb_lower: 0, bb_pos: 0 };

    const closes = candles.map(c => c.close);
    const sma20 = this.calculateSMA(closes, 20);
    const std = this.calculateStandardDeviation(closes.slice(-20));
    
    const currentSMA = sma20[sma20.length - 1] || 0;
    const currentPrice = closes[closes.length - 1] || 0;
    
    const bb_upper = currentSMA + (2 * std);
    const bb_lower = currentSMA - (2 * std);
    const bb_pos = bb_upper !== bb_lower ? (currentPrice - bb_lower) / (bb_upper - bb_lower) : 0;

    return {
      bb_upper,
      bb_mid: currentSMA,
      bb_lower,
      bb_pos: Math.max(-1, Math.min(1, bb_pos)) // Normalize between -1 and 1
    };
  }

  /**
   * Calculate Stochastic oscillator
   */
  calculateStochastic(candles) {
    if (candles.length < 14) return { stoch_k: 50, stoch_d: 50, stoch_level: 0 };

    const recent = candles.slice(-14);
    const currentClose = recent[recent.length - 1].close;
    const highestHigh = Math.max(...recent.map(c => c.high));
    const lowestLow = Math.min(...recent.map(c => c.low));
    
    const stoch_k = highestHigh !== lowestLow ? 
      ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100 : 50;
    
    // Simple approximation for %D (3-period SMA of %K)
    const stoch_d = stoch_k; // Simplified
    
    let stoch_level = 0; // Neutral
    if (stoch_k > 80) stoch_level = 1; // Overbought
    if (stoch_k < 20) stoch_level = -1; // Oversold

    return { stoch_k, stoch_d, stoch_level };
  }

  /**
   * Calculate RSI
   */
  calculateRSI(candles, period = 14) {
    if (candles.length < period + 1) return 50;

    const closes = candles.map(c => c.close);
    let gains = 0, losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate MACD
   */
  calculateMACD(candles) {
    if (candles.length < 26) return { macd: 0, macd_signal: 0, macd_histogram: 0 };

    const closes = candles.map(c => c.close);
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    
    const macd = (ema12[ema12.length - 1] || 0) - (ema26[ema26.length - 1] || 0);
    const macd_signal = macd; // Simplified
    const macd_histogram = macd - macd_signal;

    return { macd, macd_signal, macd_histogram };
  }

  /**
   * Calculate volume features
   */
  calculateVolumeFeatures(candles) {
    if (candles.length < 10) return { volume_ratio: 1, volume_trend: 0 };

    const volumes = candles.map(c => c.volume || 1);
    const currentVolume = volumes[volumes.length - 1];
    const avgVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    
    const volume_ratio = avgVolume > 0 ? currentVolume / avgVolume : 1;
    const volume_trend = volumes.length > 1 ? 
      (volumes[volumes.length - 1] - volumes[volumes.length - 2]) / volumes[volumes.length - 2] : 0;

    return { volume_ratio, volume_trend };
  }

  /**
   * Calculate volatility features
   */
  calculateVolatilityFeatures(candles) {
    if (candles.length < 20) return { volatility: 0, atr: 0 };

    const closes = candles.map(c => c.close);
    const volatility = this.calculateStandardDeviation(closes.slice(-20));
    
    // Average True Range (simplified)
    const ranges = candles.slice(-14).map(c => c.high - c.low);
    const atr = ranges.reduce((a, b) => a + b, 0) / ranges.length;

    return { volatility, atr };
  }

  /**
   * Calculate candle pattern features
   */
  calculateCandlePatternFeatures(candles) {
    if (candles.length < 3) return { 
      last_candle_body_size: 0, 
      last_candle_wick_ratio: 0,
      candle_pattern: 0 
    };

    const lastCandle = candles[candles.length - 1];
    const body_size = Math.abs(lastCandle.close - lastCandle.open);
    const total_range = lastCandle.high - lastCandle.low;
    const wick_ratio = total_range > 0 ? body_size / total_range : 0;

    // Pattern detection (simplified)
    let candle_pattern = 0;
    if (this.isDoji(lastCandle)) candle_pattern = 1;
    if (this.isHammer(lastCandle)) candle_pattern = 2;
    if (this.isEngulfing(candles.slice(-2))) candle_pattern = 3;

    return {
      last_candle_body_size: body_size,
      last_candle_wick_ratio: wick_ratio,
      candle_pattern
    };
  }

  /**
   * Calculate momentum features
   */
  calculateMomentumFeatures(candles) {
    if (candles.length < 10) return { momentum_5: 0, momentum_10: 0, slope_ema5: 0 };

    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];
    
    const momentum_5 = closes.length >= 5 ? 
      (currentPrice - closes[closes.length - 5]) / closes[closes.length - 5] : 0;
    const momentum_10 = closes.length >= 10 ? 
      (currentPrice - closes[closes.length - 10]) / closes[closes.length - 10] : 0;

    // EMA slope (simplified)
    const ema5 = this.calculateEMA(closes, 5);
    const slope_ema5 = ema5.length >= 2 ? 
      ema5[ema5.length - 1] - ema5[ema5.length - 2] : 0;

    return { momentum_5, momentum_10, slope_ema5 };
  }

  /**
   * Calculate support/resistance features
   */
  calculateSupportResistanceFeatures(candles) {
    if (candles.length < 20) return { distance_to_support: 0, distance_to_resistance: 0 };

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const currentPrice = candles[candles.length - 1].close;

    const resistance = Math.max(...highs.slice(-20));
    const support = Math.min(...lows.slice(-20));

    return {
      distance_to_support: support > 0 ? (currentPrice - support) / support : 0,
      distance_to_resistance: resistance > 0 ? (resistance - currentPrice) / resistance : 0
    };
  }

  /**
   * Calculate time-based features
   */
  calculateTimeFeatures() {
    const now = new Date();
    return {
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      is_market_open: this.isMarketOpen(now)
    };
  }

  /**
   * Calculate market structure features
   */
  calculateMarketStructureFeatures(candles) {
    if (candles.length < 10) return { trend_strength: 0, market_phase: 0 };

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    // Trend strength (simplified)
    const trend_strength = this.calculateTrendStrength(closes);
    
    // Market phase: 0=ranging, 1=trending up, -1=trending down
    const market_phase = trend_strength > 0.6 ? 1 : (trend_strength < -0.6 ? -1 : 0);

    return { trend_strength, market_phase };
  }

  // Helper methods
  calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  }

  calculateSMA(prices, period) {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateStandardDeviation(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  calculateTrendStrength(closes) {
    if (closes.length < 10) return 0;
    
    const recent = closes.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    return first > 0 ? (last - first) / first : 0;
  }

  isDoji(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    return totalRange > 0 && bodySize / totalRange < 0.1;
  }

  isHammer(candle) {
    const bodySize = Math.abs(candle.close - candle.open);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    
    return lowerWick > bodySize * 2 && upperWick < bodySize;
  }

  isEngulfing(candles) {
    if (candles.length < 2) return false;
    
    const [prev, curr] = candles;
    const prevBody = Math.abs(prev.close - prev.open);
    const currBody = Math.abs(curr.close - curr.open);
    
    return currBody > prevBody * 1.5;
  }

  isMarketOpen(date) {
    const hour = date.getHours();
    const day = date.getDay();
    
    // Simplified: assume forex market (24/5)
    return day >= 1 && day <= 5; // Monday to Friday
  }

  getDefaultFeatures() {
    return {
      currentPrice: 0,
      ema5: 0, ema20: 0, ema_diff: 0, sma10: 0, sma20: 0,
      bb_upper: 0, bb_mid: 0, bb_lower: 0, bb_pos: 0,
      stoch_k: 50, stoch_d: 50, stoch_level: 0,
      rsi: 50,
      macd: 0, macd_signal: 0, macd_histogram: 0,
      volume_ratio: 1, volume_trend: 0,
      volatility: 0, atr: 0,
      last_candle_body_size: 0, last_candle_wick_ratio: 0, candle_pattern: 0,
      momentum_5: 0, momentum_10: 0, slope_ema5: 0,
      distance_to_support: 0, distance_to_resistance: 0,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      is_market_open: 1,
      trend_strength: 0, market_phase: 0
    };
  }
}

module.exports = FeatureExtractionService;