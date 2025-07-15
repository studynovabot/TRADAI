/**
 * AdaptiveIndicatorEngine - Self-Adjusting Technical Indicators
 * 
 * Creates self-adjusting indicator periods (RSI, MACD) using rolling optimization
 * Replaces fixed periods with dynamic calibration based on recent performance
 */

const { Logger } = require('../utils/Logger');

class AdaptiveIndicatorEngine {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Adaptive indicator configuration
    this.enableAdaptiveIndicators = config.enableAdaptiveIndicators !== false; // Default to true
    this.optimizationWindow = config.optimizationWindow || 50; // Last 50 candles for optimization
    this.reoptimizationInterval = config.reoptimizationInterval || 24 * 60 * 60 * 1000; // 24 hours
    
    // Indicator parameter ranges for optimization
    this.parameterRanges = {
      rsi: {
        period: { min: 10, max: 25, default: 14 },
        overbought: { min: 65, max: 85, default: 70 },
        oversold: { min: 15, max: 35, default: 30 }
      },
      macd: {
        fastPeriod: { min: 8, max: 16, default: 12 },
        slowPeriod: { min: 20, max: 30, default: 26 },
        signalPeriod: { min: 7, max: 12, default: 9 }
      },
      bollingerBands: {
        period: { min: 15, max: 25, default: 20 },
        stdDev: { min: 1.5, max: 2.5, default: 2.0 }
      },
      stochastic: {
        kPeriod: { min: 10, max: 18, default: 14 },
        dPeriod: { min: 2, max: 5, default: 3 }
      }
    };
    
    // Current optimized parameters
    this.currentParameters = {
      rsi: {
        period: this.parameterRanges.rsi.period.default,
        overbought: this.parameterRanges.rsi.overbought.default,
        oversold: this.parameterRanges.rsi.oversold.default
      },
      macd: {
        fastPeriod: this.parameterRanges.macd.fastPeriod.default,
        slowPeriod: this.parameterRanges.macd.slowPeriod.default,
        signalPeriod: this.parameterRanges.macd.signalPeriod.default
      },
      bollingerBands: {
        period: this.parameterRanges.bollingerBands.period.default,
        stdDev: this.parameterRanges.bollingerBands.stdDev.default
      },
      stochastic: {
        kPeriod: this.parameterRanges.stochastic.kPeriod.default,
        dPeriod: this.parameterRanges.stochastic.dPeriod.default
      }
    };
    
    // Performance tracking
    this.performanceHistory = {
      rsi: [],
      macd: [],
      bollingerBands: [],
      stochastic: [],
      lastOptimization: null
    };
    
    // Optimization state
    this.isOptimizing = false;
    this.optimizationResults = {};
    
    this.logger.info('🔧 AdaptiveIndicatorEngine initialized');
  }

  /**
   * Get current optimized parameters for all indicators
   */
  getCurrentParameters() {
    return {
      enabled: this.enableAdaptiveIndicators,
      parameters: this.currentParameters,
      lastOptimization: this.performanceHistory.lastOptimization,
      isOptimizing: this.isOptimizing
    };
  }

  /**
   * Optimize indicator parameters based on recent performance
   */
  async optimizeParameters(historicalData, actualOutcomes = null) {
    if (!this.enableAdaptiveIndicators || this.isOptimizing) {
      return {
        optimized: false,
        reason: this.isOptimizing ? 'Optimization in progress' : 'Adaptive indicators disabled'
      };
    }
    
    if (historicalData.length < this.optimizationWindow) {
      return {
        optimized: false,
        reason: `Insufficient data: ${historicalData.length} < ${this.optimizationWindow} required`
      };
    }
    
    this.isOptimizing = true;
    this.logger.info('🔧 Starting indicator parameter optimization...');
    
    try {
      const optimizationData = historicalData.slice(-this.optimizationWindow);
      const results = {};
      
      // Optimize each indicator
      results.rsi = await this.optimizeRSI(optimizationData);
      results.macd = await this.optimizeMACD(optimizationData);
      results.bollingerBands = await this.optimizeBollingerBands(optimizationData);
      results.stochastic = await this.optimizeStochastic(optimizationData);
      
      // Update current parameters with best performing ones
      this.updateParameters(results);
      
      // Record optimization
      this.performanceHistory.lastOptimization = new Date();
      this.optimizationResults = results;
      
      this.logger.info('✅ Indicator optimization completed');
      
      return {
        optimized: true,
        results: results,
        newParameters: this.currentParameters,
        timestamp: this.performanceHistory.lastOptimization
      };
      
    } catch (error) {
      this.logger.error('❌ Indicator optimization failed:', error);
      return {
        optimized: false,
        error: error.message
      };
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize RSI parameters
   */
  async optimizeRSI(data) {
    const bestParams = { period: 14, overbought: 70, oversold: 30, score: 0 };
    let bestScore = 0;
    
    // Test different RSI periods
    for (let period = this.parameterRanges.rsi.period.min; period <= this.parameterRanges.rsi.period.max; period += 2) {
      for (let overbought = this.parameterRanges.rsi.overbought.min; overbought <= this.parameterRanges.rsi.overbought.max; overbought += 5) {
        for (let oversold = this.parameterRanges.rsi.oversold.min; oversold <= this.parameterRanges.rsi.oversold.max; oversold += 5) {
          
          const rsiValues = this.calculateRSI(data, period);
          const signals = this.generateRSISignals(rsiValues, overbought, oversold);
          const score = this.evaluateSignalPerformance(signals, data);
          
          if (score > bestScore) {
            bestScore = score;
            bestParams.period = period;
            bestParams.overbought = overbought;
            bestParams.oversold = oversold;
            bestParams.score = score;
          }
        }
      }
    }
    
    return bestParams;
  }

  /**
   * Optimize MACD parameters
   */
  async optimizeMACD(data) {
    const bestParams = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, score: 0 };
    let bestScore = 0;
    
    // Test different MACD parameters
    for (let fast = this.parameterRanges.macd.fastPeriod.min; fast <= this.parameterRanges.macd.fastPeriod.max; fast += 2) {
      for (let slow = this.parameterRanges.macd.slowPeriod.min; slow <= this.parameterRanges.macd.slowPeriod.max; slow += 2) {
        for (let signal = this.parameterRanges.macd.signalPeriod.min; signal <= this.parameterRanges.macd.signalPeriod.max; signal += 1) {
          
          if (fast >= slow) continue; // Fast must be less than slow
          
          const macdData = this.calculateMACD(data, fast, slow, signal);
          const signals = this.generateMACDSignals(macdData);
          const score = this.evaluateSignalPerformance(signals, data);
          
          if (score > bestScore) {
            bestScore = score;
            bestParams.fastPeriod = fast;
            bestParams.slowPeriod = slow;
            bestParams.signalPeriod = signal;
            bestParams.score = score;
          }
        }
      }
    }
    
    return bestParams;
  }

  /**
   * Optimize Bollinger Bands parameters
   */
  async optimizeBollingerBands(data) {
    const bestParams = { period: 20, stdDev: 2.0, score: 0 };
    let bestScore = 0;
    
    // Test different Bollinger Band parameters
    for (let period = this.parameterRanges.bollingerBands.period.min; period <= this.parameterRanges.bollingerBands.period.max; period += 2) {
      for (let stdDev = this.parameterRanges.bollingerBands.stdDev.min; stdDev <= this.parameterRanges.bollingerBands.stdDev.max; stdDev += 0.25) {
        
        const bbData = this.calculateBollingerBands(data, period, stdDev);
        const signals = this.generateBollingerSignals(bbData, data);
        const score = this.evaluateSignalPerformance(signals, data);
        
        if (score > bestScore) {
          bestScore = score;
          bestParams.period = period;
          bestParams.stdDev = parseFloat(stdDev.toFixed(2));
          bestParams.score = score;
        }
      }
    }
    
    return bestParams;
  }

  /**
   * Optimize Stochastic parameters
   */
  async optimizeStochastic(data) {
    const bestParams = { kPeriod: 14, dPeriod: 3, score: 0 };
    let bestScore = 0;
    
    // Test different Stochastic parameters
    for (let kPeriod = this.parameterRanges.stochastic.kPeriod.min; kPeriod <= this.parameterRanges.stochastic.kPeriod.max; kPeriod += 2) {
      for (let dPeriod = this.parameterRanges.stochastic.dPeriod.min; dPeriod <= this.parameterRanges.stochastic.dPeriod.max; dPeriod += 1) {
        
        const stochData = this.calculateStochastic(data, kPeriod, dPeriod);
        const signals = this.generateStochasticSignals(stochData);
        const score = this.evaluateSignalPerformance(signals, data);
        
        if (score > bestScore) {
          bestScore = score;
          bestParams.kPeriod = kPeriod;
          bestParams.dPeriod = dPeriod;
          bestParams.score = score;
        }
      }
    }
    
    return bestParams;
  }

  /**
   * Calculate RSI with given period
   */
  calculateRSI(data, period) {
    const rsiValues = [];
    
    for (let i = period; i < data.length; i++) {
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = data[j].close - data[j - 1].close;
        if (change > 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgGain / (avgLoss || 0.0001);
      const rsi = 100 - (100 / (1 + rs));
      
      rsiValues.push({
        timestamp: data[i].timestamp,
        value: rsi,
        index: i
      });
    }
    
    return rsiValues;
  }

  /**
   * Calculate MACD with given parameters
   */
  calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
    const macdData = [];
    
    // Calculate EMAs
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    // Calculate MACD line
    for (let i = slowPeriod - 1; i < data.length; i++) {
      const macdLine = fastEMA[i - (slowPeriod - fastPeriod)] - slowEMA[i - (slowPeriod - 1)];
      macdData.push({
        timestamp: data[i].timestamp,
        macd: macdLine,
        index: i
      });
    }
    
    // Calculate Signal line (EMA of MACD)
    const signalEMA = this.calculateEMAFromValues(macdData.map(d => d.macd), signalPeriod);
    
    // Add signal line and histogram
    for (let i = signalPeriod - 1; i < macdData.length; i++) {
      macdData[i].signal = signalEMA[i - (signalPeriod - 1)];
      macdData[i].histogram = macdData[i].macd - macdData[i].signal;
    }
    
    return macdData.slice(signalPeriod - 1);
  }

  /**
   * Calculate EMA for price data
   */
  calculateEMA(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is simple average
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
    }
    ema[period - 1] = sum / period;
    
    // Calculate subsequent EMAs
    for (let i = period; i < data.length; i++) {
      ema[i] = (data[i].close - ema[i - 1]) * multiplier + ema[i - 1];
    }
    
    return ema;
  }

  /**
   * Calculate EMA from array of values
   */
  calculateEMAFromValues(values, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is simple average
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += values[i];
    }
    ema[period - 1] = sum / period;
    
    // Calculate subsequent EMAs
    for (let i = period; i < values.length; i++) {
      ema[i] = (values[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }
    
    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(data, period, stdDev) {
    const bbData = [];
    
    for (let i = period - 1; i < data.length; i++) {
      // Calculate SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j].close;
      }
      const sma = sum / period;
      
      // Calculate standard deviation
      let variance = 0;
      for (let j = i - period + 1; j <= i; j++) {
        variance += Math.pow(data[j].close - sma, 2);
      }
      const standardDeviation = Math.sqrt(variance / period);
      
      bbData.push({
        timestamp: data[i].timestamp,
        middle: sma,
        upper: sma + (stdDev * standardDeviation),
        lower: sma - (stdDev * standardDeviation),
        index: i
      });
    }
    
    return bbData;
  }

  /**
   * Calculate Stochastic oscillator
   */
  calculateStochastic(data, kPeriod, dPeriod) {
    const stochData = [];
    
    // Calculate %K
    for (let i = kPeriod - 1; i < data.length; i++) {
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      
      for (let j = i - kPeriod + 1; j <= i; j++) {
        highestHigh = Math.max(highestHigh, data[j].high);
        lowestLow = Math.min(lowestLow, data[j].low);
      }
      
      const k = ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
      
      stochData.push({
        timestamp: data[i].timestamp,
        k: k,
        index: i
      });
    }
    
    // Calculate %D (SMA of %K)
    for (let i = dPeriod - 1; i < stochData.length; i++) {
      let sum = 0;
      for (let j = i - dPeriod + 1; j <= i; j++) {
        sum += stochData[j].k;
      }
      stochData[i].d = sum / dPeriod;
    }
    
    return stochData.slice(dPeriod - 1);
  }

  /**
   * Generate RSI signals
   */
  generateRSISignals(rsiValues, overbought, oversold) {
    const signals = [];
    
    for (let i = 1; i < rsiValues.length; i++) {
      const current = rsiValues[i];
      const previous = rsiValues[i - 1];
      
      if (previous.value > overbought && current.value <= overbought) {
        signals.push({ type: 'SELL', timestamp: current.timestamp, strength: 0.7 });
      } else if (previous.value < oversold && current.value >= oversold) {
        signals.push({ type: 'BUY', timestamp: current.timestamp, strength: 0.7 });
      }
    }
    
    return signals;
  }

  /**
   * Generate MACD signals
   */
  generateMACDSignals(macdData) {
    const signals = [];
    
    for (let i = 1; i < macdData.length; i++) {
      const current = macdData[i];
      const previous = macdData[i - 1];
      
      if (previous.macd <= previous.signal && current.macd > current.signal) {
        signals.push({ type: 'BUY', timestamp: current.timestamp, strength: 0.8 });
      } else if (previous.macd >= previous.signal && current.macd < current.signal) {
        signals.push({ type: 'SELL', timestamp: current.timestamp, strength: 0.8 });
      }
    }
    
    return signals;
  }

  /**
   * Generate Bollinger Band signals
   */
  generateBollingerSignals(bbData, priceData) {
    const signals = [];
    
    for (let i = 0; i < bbData.length; i++) {
      const bb = bbData[i];
      const price = priceData[bb.index];
      
      if (price.close <= bb.lower) {
        signals.push({ type: 'BUY', timestamp: bb.timestamp, strength: 0.6 });
      } else if (price.close >= bb.upper) {
        signals.push({ type: 'SELL', timestamp: bb.timestamp, strength: 0.6 });
      }
    }
    
    return signals;
  }

  /**
   * Generate Stochastic signals
   */
  generateStochasticSignals(stochData) {
    const signals = [];
    
    for (let i = 1; i < stochData.length; i++) {
      const current = stochData[i];
      const previous = stochData[i - 1];
      
      if (previous.k <= previous.d && current.k > current.d && current.k < 20) {
        signals.push({ type: 'BUY', timestamp: current.timestamp, strength: 0.6 });
      } else if (previous.k >= previous.d && current.k < current.d && current.k > 80) {
        signals.push({ type: 'SELL', timestamp: current.timestamp, strength: 0.6 });
      }
    }
    
    return signals;
  }

  /**
   * Evaluate signal performance
   */
  evaluateSignalPerformance(signals, priceData) {
    if (signals.length === 0) return 0;
    
    let totalScore = 0;
    let validSignals = 0;
    
    for (const signal of signals) {
      const signalIndex = priceData.findIndex(d => d.timestamp >= signal.timestamp);
      if (signalIndex === -1 || signalIndex >= priceData.length - 5) continue;
      
      // Look ahead 5 candles to evaluate signal
      const futurePrice = priceData[signalIndex + 5].close;
      const currentPrice = priceData[signalIndex].close;
      const priceChange = (futurePrice - currentPrice) / currentPrice;
      
      // Score based on signal direction vs actual price movement
      let score = 0;
      if (signal.type === 'BUY' && priceChange > 0) {
        score = Math.min(1, priceChange * 100) * signal.strength;
      } else if (signal.type === 'SELL' && priceChange < 0) {
        score = Math.min(1, Math.abs(priceChange) * 100) * signal.strength;
      }
      
      totalScore += score;
      validSignals++;
    }
    
    return validSignals > 0 ? totalScore / validSignals : 0;
  }

  /**
   * Update current parameters with optimization results
   */
  updateParameters(results) {
    if (results.rsi && results.rsi.score > 0.3) {
      this.currentParameters.rsi = {
        period: results.rsi.period,
        overbought: results.rsi.overbought,
        oversold: results.rsi.oversold
      };
    }
    
    if (results.macd && results.macd.score > 0.3) {
      this.currentParameters.macd = {
        fastPeriod: results.macd.fastPeriod,
        slowPeriod: results.macd.slowPeriod,
        signalPeriod: results.macd.signalPeriod
      };
    }
    
    if (results.bollingerBands && results.bollingerBands.score > 0.3) {
      this.currentParameters.bollingerBands = {
        period: results.bollingerBands.period,
        stdDev: results.bollingerBands.stdDev
      };
    }
    
    if (results.stochastic && results.stochastic.score > 0.3) {
      this.currentParameters.stochastic = {
        kPeriod: results.stochastic.kPeriod,
        dPeriod: results.stochastic.dPeriod
      };
    }
  }

  /**
   * Check if optimization is needed
   */
  needsOptimization() {
    if (!this.enableAdaptiveIndicators) return false;
    
    const lastOptimization = this.performanceHistory.lastOptimization;
    if (!lastOptimization) return true;
    
    const timeSinceOptimization = Date.now() - lastOptimization.getTime();
    return timeSinceOptimization >= this.reoptimizationInterval;
  }

  /**
   * Format adaptive indicator status for AI prompt
   */
  formatAdaptiveStatusForAI() {
    if (!this.enableAdaptiveIndicators) {
      return 'ADAPTIVE INDICATORS: Disabled - using default parameters';
    }
    
    const lastOpt = this.performanceHistory.lastOptimization;
    const status = lastOpt ? `Last optimized: ${lastOpt.toISOString()}` : 'Never optimized';
    
    return `ADAPTIVE INDICATOR STATUS:
Optimization: ${this.isOptimizing ? 'IN PROGRESS' : 'READY'}
${status}

Current Optimized Parameters:
RSI: Period=${this.currentParameters.rsi.period}, Overbought=${this.currentParameters.rsi.overbought}, Oversold=${this.currentParameters.rsi.oversold}
MACD: Fast=${this.currentParameters.macd.fastPeriod}, Slow=${this.currentParameters.macd.slowPeriod}, Signal=${this.currentParameters.macd.signalPeriod}
Bollinger Bands: Period=${this.currentParameters.bollingerBands.period}, StdDev=${this.currentParameters.bollingerBands.stdDev}
Stochastic: K=${this.currentParameters.stochastic.kPeriod}, D=${this.currentParameters.stochastic.dPeriod}

TRADING IMPLICATIONS:
- Indicators are dynamically calibrated for current market conditions
- Parameters automatically adjust based on recent performance
- Optimization reduces false signals and improves accuracy`;
  }

  /**
   * Get optimization summary
   */
  getOptimizationSummary() {
    return {
      enabled: this.enableAdaptiveIndicators,
      isOptimizing: this.isOptimizing,
      lastOptimization: this.performanceHistory.lastOptimization,
      needsOptimization: this.needsOptimization(),
      currentParameters: this.currentParameters,
      optimizationResults: this.optimizationResults
    };
  }
}

module.exports = AdaptiveIndicatorEngine;
