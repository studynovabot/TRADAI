/**
 * TechnicalIndicators - Advanced Technical Analysis Library
 * 
 * Provides functions for calculating various technical indicators
 * used in financial market analysis
 */

class TechnicalIndicators {
  /**
   * Calculate Relative Strength Index (RSI)
   * @param {Array} prices - Array of closing prices
   * @param {Number} period - RSI period (default: 14)
   * @returns {Number} - RSI value (0-100)
   */
  static calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return null;
    }

    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    // Calculate gains and losses
    let gains = 0;
    let losses = 0;

    // First period
    for (let i = 0; i < period; i++) {
      if (changes[i] >= 0) {
        gains += changes[i];
      } else {
        losses -= changes[i];
      }
    }

    // Calculate initial average gain and loss
    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate subsequent values
    for (let i = period; i < changes.length; i++) {
      if (changes[i] >= 0) {
        avgGain = (avgGain * (period - 1) + changes[i]) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - changes[i]) / period;
      }
    }

    // Calculate RS and RSI
    if (avgLoss === 0) {
      return 100;
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   * @param {Array} prices - Array of closing prices
   * @param {Number} fastPeriod - Fast EMA period (default: 12)
   * @param {Number} slowPeriod - Slow EMA period (default: 26)
   * @param {Number} signalPeriod - Signal EMA period (default: 9)
   * @returns {Object} - MACD values {macd, signal, histogram}
   */
  static calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod + signalPeriod) {
      return null;
    }

    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    // Calculate MACD line
    const macdLine = fastEMA - slowEMA;

    // Calculate signal line (EMA of MACD line)
    const macdHistory = prices.map((_, i) => {
      if (i < slowPeriod - 1) {
        return null;
      }
      return fastEMA - slowEMA;
    }).filter(val => val !== null);

    const signalLine = this.calculateEMA(macdHistory, signalPeriod);

    // Calculate histogram
    const histogram = macdLine - signalLine;

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   * @param {Array} prices - Array of closing prices
   * @param {Number} period - EMA period
   * @returns {Number} - EMA value
   */
  static calculateEMA(prices, period) {
    if (prices.length < period) {
      return null;
    }

    const k = 2 / (period + 1);
    
    // Calculate initial SMA
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    // Calculate EMA for remaining prices
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * k) + (ema * (1 - k));
    }
    
    return ema;
  }

  /**
   * Calculate multiple EMAs
   * @param {Array} prices - Array of closing prices
   * @param {Array} periods - Array of periods to calculate
   * @returns {Object} - EMAs for each period
   */
  static calculateMultipleEMAs(prices, periods = [8, 21, 50]) {
    const result = {};
    
    periods.forEach(period => {
      result[`ema${period}`] = this.calculateEMA(prices, period);
    });
    
    return result;
  }

  /**
   * Calculate Bollinger Bands
   * @param {Array} prices - Array of closing prices
   * @param {Number} period - Period for SMA (default: 20)
   * @param {Number} stdDev - Standard deviation multiplier (default: 2)
   * @returns {Object} - Bollinger Bands {upper, middle, lower}
   */
  static calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return null;
    }

    // Calculate SMA
    const sma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
    
    // Calculate standard deviation
    const squaredDifferences = prices.slice(-period).map(price => Math.pow(price - sma, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate bands
    const upperBand = sma + (standardDeviation * stdDev);
    const lowerBand = sma - (standardDeviation * stdDev);
    
    return {
      upper: upperBand,
      middle: sma,
      lower: lowerBand,
      width: upperBand - lowerBand,
      percentB: (prices[prices.length - 1] - lowerBand) / (upperBand - lowerBand)
    };
  }

  /**
   * Calculate Volume Trend
   * @param {Array} volumes - Array of volume data
   * @param {Number} period - Period for analysis (default: 14)
   * @returns {Object} - Volume trend analysis
   */
  static calculateVolumeTrend(volumes, period = 14) {
    if (volumes.length < period) {
      return { trend: 'insufficient data' };
    }

    const recentVolumes = volumes.slice(-period);
    const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / period;
    const latestVolume = volumes[volumes.length - 1];
    
    // Calculate volume change percentage
    const volumeChange = ((latestVolume - avgVolume) / avgVolume) * 100;
    
    // Determine volume trend
    let trend;
    if (volumeChange > 20) {
      trend = 'significantly increasing';
    } else if (volumeChange > 5) {
      trend = 'increasing';
    } else if (volumeChange < -20) {
      trend = 'significantly decreasing';
    } else if (volumeChange < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }
    
    // Check for volume spikes
    const isSpike = latestVolume > avgVolume * 2;
    
    return {
      trend,
      change: volumeChange,
      isSpike,
      latestVolume,
      avgVolume
    };
  }

  /**
   * Calculate Support and Resistance levels
   * @param {Array} candles - Array of OHLC candles
   * @param {Number} lookback - Number of candles to analyze (default: 50)
   * @param {Number} threshold - Minimum number of touches to consider a level (default: 2)
   * @returns {Object} - Support and resistance levels
   */
  static calculateSupportResistance(candles, lookback = 50, threshold = 2) {
    if (candles.length < lookback) {
      return { support: [], resistance: [] };
    }

    const recentCandles = candles.slice(-lookback);
    const priceMap = new Map();
    
    // Round prices to significant levels
    const roundPrice = (price) => {
      // Determine the appropriate rounding based on price magnitude
      const magnitude = Math.floor(Math.log10(price));
      const factor = Math.pow(10, magnitude - 2);
      return Math.round(price / factor) * factor;
    };
    
    // Count price touches
    recentCandles.forEach(candle => {
      const highRounded = roundPrice(candle.high);
      const lowRounded = roundPrice(candle.low);
      
      priceMap.set(highRounded, (priceMap.get(highRounded) || 0) + 1);
      priceMap.set(lowRounded, (priceMap.get(lowRounded) || 0) + 1);
    });
    
    // Filter significant levels
    const significantLevels = Array.from(priceMap.entries())
      .filter(([_, count]) => count >= threshold)
      .sort(([priceA], [priceB]) => priceA - priceB);
    
    // Separate into support and resistance
    const currentPrice = recentCandles[recentCandles.length - 1].close;
    const support = significantLevels
      .filter(([price]) => price < currentPrice)
      .map(([price, count]) => ({ price, strength: count / threshold }));
    
    const resistance = significantLevels
      .filter(([price]) => price > currentPrice)
      .map(([price, count]) => ({ price, strength: count / threshold }));
    
    return { 
      support: support.slice(-3), // Return 3 closest support levels
      resistance: resistance.slice(0, 3), // Return 3 closest resistance levels
      currentPrice
    };
  }

  /**
   * Calculate Average True Range (ATR) - Volatility indicator
   * @param {Array} candles - Array of OHLC candles
   * @param {Number} period - Period for ATR calculation (default: 14)
   * @returns {Number} - ATR value
   */
  static calculateATR(candles, period = 14) {
    if (candles.length < period + 1) {
      return null;
    }

    const trueRanges = [];
    
    // Calculate true ranges
    for (let i = 1; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }
    
    // Calculate initial ATR as simple average of first 'period' true ranges
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
    
    // Calculate subsequent ATR values using smoothing
    for (let i = period; i < trueRanges.length; i++) {
      atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    }
    
    return atr;
  }

  /**
   * Calculate Stochastic Oscillator
   * @param {Array} candles - Array of OHLC candles
   * @param {Number} period - K period (default: 14)
   * @param {Number} smoothK - K smoothing period (default: 3)
   * @param {Number} smoothD - D period (default: 3)
   * @returns {Object} - Stochastic values {k, d}
   */
  static calculateStochastic(candles, period = 14, smoothK = 3, smoothD = 3) {
    if (candles.length < period) {
      return null;
    }

    const highs = candles.map(candle => candle.high);
    const lows = candles.map(candle => candle.low);
    const closes = candles.map(candle => candle.close);
    
    // Calculate %K
    const rawK = [];
    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const currentClose = closes[i];
      
      if (highestHigh === lowestLow) {
        rawK.push(50); // Default to middle if range is zero
      } else {
        rawK.push(100 * (currentClose - lowestLow) / (highestHigh - lowestLow));
      }
    }
    
    // Smooth %K
    let smoothedK = [];
    if (smoothK > 1) {
      for (let i = smoothK - 1; i < rawK.length; i++) {
        const sum = rawK.slice(i - smoothK + 1, i + 1).reduce((a, b) => a + b, 0);
        smoothedK.push(sum / smoothK);
      }
    } else {
      smoothedK = rawK;
    }
    
    // Calculate %D (SMA of %K)
    const d = [];
    for (let i = smoothD - 1; i < smoothedK.length; i++) {
      const sum = smoothedK.slice(i - smoothD + 1, i + 1).reduce((a, b) => a + b, 0);
      d.push(sum / smoothD);
    }
    
    return {
      k: smoothedK[smoothedK.length - 1],
      d: d[d.length - 1],
      overbought: smoothedK[smoothedK.length - 1] > 80,
      oversold: smoothedK[smoothedK.length - 1] < 20
    };
  }

  /**
   * Calculate Ichimoku Cloud
   * @param {Array} candles - Array of OHLC candles
   * @returns {Object} - Ichimoku values
   */
  static calculateIchimoku(candles) {
    if (candles.length < 52) {
      return null;
    }

    const highs = candles.map(candle => candle.high);
    const lows = candles.map(candle => candle.low);
    
    // Calculate Tenkan-sen (Conversion Line): (9-period high + 9-period low)/2
    const tenkanSen = (Math.max(...highs.slice(-9)) + Math.min(...lows.slice(-9))) / 2;
    
    // Calculate Kijun-sen (Base Line): (26-period high + 26-period low)/2
    const kijunSen = (Math.max(...highs.slice(-26)) + Math.min(...lows.slice(-26))) / 2;
    
    // Calculate Senkou Span A (Leading Span A): (Tenkan-sen + Kijun-sen)/2
    const senkouSpanA = (tenkanSen + kijunSen) / 2;
    
    // Calculate Senkou Span B (Leading Span B): (52-period high + 52-period low)/2
    const senkouSpanB = (Math.max(...highs.slice(-52)) + Math.min(...lows.slice(-52))) / 2;
    
    // Calculate Chikou Span (Lagging Span): Current closing price time-shifted backwards 26 periods
    const chikouSpan = candles[candles.length - 1].close;
    
    // Determine cloud color and strength
    const currentPrice = candles[candles.length - 1].close;
    const cloudColor = senkouSpanA > senkouSpanB ? 'green' : 'red';
    const aboveCloud = currentPrice > Math.max(senkouSpanA, senkouSpanB);
    const belowCloud = currentPrice < Math.min(senkouSpanA, senkouSpanB);
    const inCloud = !aboveCloud && !belowCloud;
    
    // Determine trend based on Ichimoku
    let trend = 'neutral';
    if (currentPrice > senkouSpanA && currentPrice > senkouSpanB && tenkanSen > kijunSen) {
      trend = 'strong_bullish';
    } else if (currentPrice < senkouSpanA && currentPrice < senkouSpanB && tenkanSen < kijunSen) {
      trend = 'strong_bearish';
    } else if (currentPrice > senkouSpanA && currentPrice > senkouSpanB) {
      trend = 'bullish';
    } else if (currentPrice < senkouSpanA && currentPrice < senkouSpanB) {
      trend = 'bearish';
    }
    
    return {
      tenkanSen,
      kijunSen,
      senkouSpanA,
      senkouSpanB,
      chikouSpan,
      cloudColor,
      aboveCloud,
      belowCloud,
      inCloud,
      trend
    };
  }

  /**
   * Calculate Stochastic RSI
   * @param {Array} prices - Array of closing prices
   * @param {Number} rsiPeriod - RSI period (default: 14)
   * @param {Number} stochPeriod - Stochastic period (default: 14)
   * @param {Number} kPeriod - %K smoothing period (default: 3)
   * @param {Number} dPeriod - %D smoothing period (default: 3)
   * @returns {Object} - Stochastic RSI values {k, d, overbought, oversold}
   */
  static calculateStochasticRSI(prices, rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
    if (prices.length < rsiPeriod + stochPeriod + kPeriod + dPeriod) {
      return null;
    }

    // Calculate RSI values for the entire price series
    const rsiValues = [];
    for (let i = rsiPeriod; i <= prices.length; i++) {
      const rsi = this.calculateRSI(prices.slice(0, i), rsiPeriod);
      if (rsi !== null) {
        rsiValues.push(rsi);
      }
    }

    if (rsiValues.length < stochPeriod) {
      return null;
    }

    // Calculate Stochastic of RSI
    const stochRSIValues = [];
    for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
      const rsiSlice = rsiValues.slice(i - stochPeriod + 1, i + 1);
      const highestRSI = Math.max(...rsiSlice);
      const lowestRSI = Math.min(...rsiSlice);
      const currentRSI = rsiValues[i];
      
      if (highestRSI === lowestRSI) {
        stochRSIValues.push(50); // Default to middle if range is zero
      } else {
        const stochRSI = 100 * (currentRSI - lowestRSI) / (highestRSI - lowestRSI);
        stochRSIValues.push(stochRSI);
      }
    }

    // Smooth %K
    let smoothedK = [];
    if (kPeriod > 1) {
      for (let i = kPeriod - 1; i < stochRSIValues.length; i++) {
        const sum = stochRSIValues.slice(i - kPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
        smoothedK.push(sum / kPeriod);
      }
    } else {
      smoothedK = stochRSIValues;
    }

    // Calculate %D (SMA of %K)
    const d = [];
    for (let i = dPeriod - 1; i < smoothedK.length; i++) {
      const sum = smoothedK.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
      d.push(sum / dPeriod);
    }

    const currentK = smoothedK[smoothedK.length - 1];
    const currentD = d[d.length - 1];

    return {
      k: currentK,
      d: currentD,
      overbought: currentK > 80,
      oversold: currentK < 20,
      crossover: currentK > currentD ? 'bullish' : currentK < currentD ? 'bearish' : 'neutral'
    };
  }

  /**
   * Calculate VWAP (Volume Weighted Average Price)
   * @param {Array} candles - Array of OHLC candles with volume
   * @param {Number} period - Period for VWAP calculation (default: 20)
   * @returns {Number} - VWAP value
   */
  static calculateVWAP(candles, period = 20) {
    if (candles.length < period) {
      return null;
    }

    const recentCandles = candles.slice(-period);
    let totalVolume = 0;
    let totalVolumePrice = 0;

    recentCandles.forEach(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const volume = candle.volume || 0;
      
      totalVolumePrice += typicalPrice * volume;
      totalVolume += volume;
    });

    if (totalVolume === 0) {
      return null;
    }

    return totalVolumePrice / totalVolume;
  }

  /**
   * Calculate Williams %R
   * @param {Array} candles - Array of OHLC candles
   * @param {Number} period - Period for Williams %R (default: 14)
   * @returns {Number} - Williams %R value
   */
  static calculateWilliamsR(candles, period = 14) {
    if (candles.length < period) {
      return null;
    }

    const recentCandles = candles.slice(-period);
    const highs = recentCandles.map(candle => candle.high);
    const lows = recentCandles.map(candle => candle.low);
    const currentClose = candles[candles.length - 1].close;

    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);

    if (highestHigh === lowestLow) {
      return -50; // Default to middle if range is zero
    }

    const williamsR = -100 * (highestHigh - currentClose) / (highestHigh - lowestLow);
    
    return williamsR;
  }

  /**
   * Calculate Commodity Channel Index (CCI)
   * @param {Array} candles - Array of OHLC candles
   * @param {Number} period - Period for CCI (default: 20)
   * @returns {Number} - CCI value
   */
  static calculateCCI(candles, period = 20) {
    if (candles.length < period) {
      return null;
    }

    const recentCandles = candles.slice(-period);
    
    // Calculate typical prices
    const typicalPrices = recentCandles.map(candle => 
      (candle.high + candle.low + candle.close) / 3
    );

    // Calculate SMA of typical prices
    const sma = typicalPrices.reduce((sum, price) => sum + price, 0) / period;

    // Calculate mean deviation
    const meanDeviation = typicalPrices.reduce((sum, price) => 
      sum + Math.abs(price - sma), 0
    ) / period;

    if (meanDeviation === 0) {
      return 0;
    }

    const currentTypicalPrice = typicalPrices[typicalPrices.length - 1];
    const cci = (currentTypicalPrice - sma) / (0.015 * meanDeviation);

    return cci;
  }

  /**
   * Calculate Money Flow Index (MFI)
   * @param {Array} candles - Array of OHLC candles with volume
   * @param {Number} period - Period for MFI (default: 14)
   * @returns {Number} - MFI value
   */
  static calculateMFI(candles, period = 14) {
    if (candles.length < period + 1) {
      return null;
    }

    const recentCandles = candles.slice(-(period + 1));
    let positiveMoneyFlow = 0;
    let negativeMoneyFlow = 0;

    for (let i = 1; i < recentCandles.length; i++) {
      const current = recentCandles[i];
      const previous = recentCandles[i - 1];
      
      const currentTypicalPrice = (current.high + current.low + current.close) / 3;
      const previousTypicalPrice = (previous.high + previous.low + previous.close) / 3;
      const rawMoneyFlow = currentTypicalPrice * (current.volume || 0);

      if (currentTypicalPrice > previousTypicalPrice) {
        positiveMoneyFlow += rawMoneyFlow;
      } else if (currentTypicalPrice < previousTypicalPrice) {
        negativeMoneyFlow += rawMoneyFlow;
      }
    }

    if (negativeMoneyFlow === 0) {
      return 100;
    }

    const moneyFlowRatio = positiveMoneyFlow / negativeMoneyFlow;
    const mfi = 100 - (100 / (1 + moneyFlowRatio));

    return mfi;
  }

  /**
   * Calculate Parabolic SAR
   * @param {Array} candles - Array of OHLC candles
   * @param {Number} step - Acceleration factor step (default: 0.02)
   * @param {Number} max - Maximum acceleration factor (default: 0.2)
   * @returns {Object} - Parabolic SAR values
   */
  static calculateParabolicSAR(candles, step = 0.02, max = 0.2) {
    if (candles.length < 2) {
      return null;
    }

    const result = [];
    let trend = 1; // 1 for uptrend, -1 for downtrend
    let sar = candles[0].low;
    let ep = candles[0].high; // Extreme point
    let af = step; // Acceleration factor

    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];
      
      // Calculate new SAR
      sar = sar + af * (ep - sar);
      
      if (trend === 1) { // Uptrend
        if (candle.low <= sar) {
          // Trend reversal to downtrend
          trend = -1;
          sar = ep;
          ep = candle.low;
          af = step;
        } else {
          if (candle.high > ep) {
            ep = candle.high;
            af = Math.min(af + step, max);
          }
        }
      } else { // Downtrend
        if (candle.high >= sar) {
          // Trend reversal to uptrend
          trend = 1;
          sar = ep;
          ep = candle.high;
          af = step;
        } else {
          if (candle.low < ep) {
            ep = candle.low;
            af = Math.min(af + step, max);
          }
        }
      }
      
      result.push({
        sar: sar,
        trend: trend,
        ep: ep,
        af: af
      });
    }

    return result[result.length - 1];
  }

  /**
   * Calculate all indicators for a given set of candles
   * @param {Array} candles - Array of OHLC candles
   * @returns {Object} - All calculated indicators
   */
  static calculateAllIndicators(candles) {
    if (!candles || candles.length < 50) {
      return {
        error: 'Insufficient data for indicator calculation'
      };
    }

    const closes = candles.map(candle => candle.close);
    const volumes = candles.map(candle => candle.volume);
    
    return {
      rsi: this.calculateRSI(closes),
      rsi7: this.calculateRSI(closes, 7),
      macd: this.calculateMACD(closes),
      ema: this.calculateMultipleEMAs(closes, [9, 20, 50]),
      bollinger: this.calculateBollingerBands(closes),
      volume: this.calculateVolumeTrend(volumes),
      supportResistance: this.calculateSupportResistance(candles),
      atr: this.calculateATR(candles),
      stochastic: this.calculateStochastic(candles),
      stochasticRSI: this.calculateStochasticRSI(closes),
      ichimoku: this.calculateIchimoku(candles),
      vwap: this.calculateVWAP(candles),
      williamsR: this.calculateWilliamsR(candles),
      cci: this.calculateCCI(candles),
      mfi: this.calculateMFI(candles),
      parabolicSAR: this.calculateParabolicSAR(candles)
    };
  }
}

module.exports = { TechnicalIndicators };