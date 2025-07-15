/**
 * TechnicalAnalyzer - Advanced Technical Analysis Engine
 * 
 * Calculates technical indicators and detects candlestick patterns
 * using the technicalindicators library and custom pattern recognition
 */

const { 
  RSI, 
  MACD, 
  SMA, 
  EMA, 
  BollingerBands,
  Stochastic,
  ATR
} = require('technicalindicators');
const { Logger } = require('../utils/Logger');
const AdaptiveIndicatorEngine = require('./AdaptiveIndicatorEngine');
const { CandlestickPatterns } = require('../utils/CandlestickPatterns');

class TechnicalAnalyzer {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();

    // Initialize Adaptive Indicator Engine
    this.adaptiveEngine = new AdaptiveIndicatorEngine(config);
    this.useAdaptiveIndicators = config.enableAdaptiveIndicators !== false; // Default to true
    this.patterns = new CandlestickPatterns();
    
    this.logger.info('📈 TechnicalAnalyzer initialized');
  }

  /**
   * Optimize indicator parameters based on historical data
   */
  async optimizeIndicators(historicalData) {
    if (!this.useAdaptiveIndicators) {
      return { optimized: false, reason: 'Adaptive indicators disabled' };
    }

    return await this.adaptiveEngine.optimizeParameters(historicalData);
  }

  /**
   * Check if optimization is needed
   */
  needsOptimization() {
    return this.adaptiveEngine.needsOptimization();
  }

  /**
   * Get adaptive indicator status for AI prompt
   */
  getAdaptiveStatusForAI() {
    return this.adaptiveEngine.formatAdaptiveStatusForAI();
  }

  /**
   * Get optimization summary
   */
  getOptimizationSummary() {
    return this.adaptiveEngine.getOptimizationSummary();
  }
  
  /**
   * Perform comprehensive technical analysis on market data
   */
  async analyze(marketData) {
    try {
      if (!marketData || marketData.length < 14) {
        throw new Error('Insufficient data for technical analysis (minimum 14 candles required)');
      }
      
      this.logger.debug(`🔍 Analyzing ${marketData.length} candles...`);
      
      // Extract OHLCV arrays
      const closes = marketData.map(candle => candle.close);
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const opens = marketData.map(candle => candle.open);
      const volumes = marketData.map(candle => candle.volume);
      
      // Calculate all indicators
      const analysis = {
        timestamp: new Date(),
        candleCount: marketData.length,
        
        // Price action
        currentPrice: closes[closes.length - 1],
        priceChange: closes[closes.length - 1] - closes[closes.length - 2],
        priceChangePercent: ((closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]) * 100,
        
        // RSI Analysis
        rsi: this.calculateRSI(closes),
        
        // MACD Analysis
        macd: this.calculateMACD(closes),
        
        // Moving Averages
        sma: this.calculateSMA(closes),
        ema: this.calculateEMA(closes),
        
        // Bollinger Bands
        bollingerBands: this.calculateBollingerBands(closes),
        
        // Stochastic
        stochastic: this.calculateStochastic(highs, lows, closes),
        
        // ATR (Average True Range)
        atr: this.calculateATR(highs, lows, closes),
        
        // Volatility Analysis
        volatility: this.calculateVolatility(closes),
        
        // Volume Analysis
        volume: this.analyzeVolume(volumes),
        
        // Candlestick Patterns
        patterns: this.detectPatterns(marketData),
        
        // Market State
        marketState: null // Will be determined after calculations
      };
      
      // Determine overall market state
      analysis.marketState = this.determineMarketState(analysis);
      
      this.logger.logTechnicalAnalysis({
        rsi: analysis.rsi.current,
        macd: analysis.macd.signal,
        volatility: analysis.volatility.current,
        patterns: analysis.patterns.detected,
        marketState: analysis.marketState
      });
      
      return analysis;
      
    } catch (error) {
      this.logger.logError('Technical Analysis', error);
      throw error;
    }
  }
  
  /**
   * Calculate RSI with interpretation
   */
  calculateRSI(closes) {
    // Use adaptive parameters if available
    let rsiPeriod, overbought, oversold;
    if (this.useAdaptiveIndicators) {
      const adaptiveParams = this.adaptiveEngine.getCurrentParameters();
      rsiPeriod = adaptiveParams.parameters.rsi.period;
      overbought = adaptiveParams.parameters.rsi.overbought;
      oversold = adaptiveParams.parameters.rsi.oversold;
    } else {
      rsiPeriod = this.config.indicators.rsi.period;
      overbought = this.config.indicators.rsi.overbought;
      oversold = this.config.indicators.rsi.oversold;
    }

    const rsiValues = RSI.calculate({ values: closes, period: rsiPeriod });
    const current = rsiValues[rsiValues.length - 1];
    
    let signal = 'NEUTRAL';
    let strength = 'MODERATE';

    if (current > overbought) {
      signal = 'OVERBOUGHT';
      strength = current > (overbought + 10) ? 'STRONG' : 'MODERATE';
    } else if (current < oversold) {
      signal = 'OVERSOLD';
      strength = current < (oversold - 10) ? 'STRONG' : 'MODERATE';
    }
    
    return {
      current: current,
      previous: rsiValues[rsiValues.length - 2],
      signal: signal,
      strength: strength,
      trend: current > rsiValues[rsiValues.length - 2] ? 'RISING' : 'FALLING'
    };
  }
  
  /**
   * Calculate MACD with signal interpretation
   */
  calculateMACD(closes) {
    // Use adaptive parameters if available
    let fastPeriod, slowPeriod, signalPeriod;
    if (this.useAdaptiveIndicators) {
      const adaptiveParams = this.adaptiveEngine.getCurrentParameters();
      fastPeriod = adaptiveParams.parameters.macd.fastPeriod;
      slowPeriod = adaptiveParams.parameters.macd.slowPeriod;
      signalPeriod = adaptiveParams.parameters.macd.signalPeriod;
    } else {
      ({ fastPeriod, slowPeriod, signalPeriod } = this.config.indicators.macd);
    }
    
    const macdData = MACD.calculate({
      values: closes,
      fastPeriod: fastPeriod,
      slowPeriod: slowPeriod,
      signalPeriod: signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    
    const current = macdData[macdData.length - 1];
    const previous = macdData[macdData.length - 2];
    
    let signal = 'NEUTRAL';
    
    if (current && previous) {
      // Bullish crossover
      if (current.MACD > current.signal && previous.MACD <= previous.signal) {
        signal = 'BULLISH_CROSSOVER';
      }
      // Bearish crossover
      else if (current.MACD < current.signal && previous.MACD >= previous.signal) {
        signal = 'BEARISH_CROSSOVER';
      }
      // Above/below signal line
      else if (current.MACD > current.signal) {
        signal = 'BULLISH';
      } else if (current.MACD < current.signal) {
        signal = 'BEARISH';
      }
    }
    
    return {
      macd: current?.MACD || 0,
      signal: current?.signal || 0,
      histogram: current?.histogram || 0,
      crossover: signal,
      trend: current?.MACD > previous?.MACD ? 'RISING' : 'FALLING'
    };
  }
  
  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(closes) {
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma50 = SMA.calculate({ period: 50, values: closes });
    
    const current = closes[closes.length - 1];
    const sma20Current = sma20[sma20.length - 1];
    const sma50Current = sma50[sma50.length - 1];
    
    return {
      sma20: sma20Current,
      sma50: sma50Current,
      priceVsSMA20: current > sma20Current ? 'ABOVE' : 'BELOW',
      priceVsSMA50: current > sma50Current ? 'ABOVE' : 'BELOW',
      smaAlignment: sma20Current > sma50Current ? 'BULLISH' : 'BEARISH'
    };
  }
  
  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(closes) {
    const ema12 = EMA.calculate({ period: 12, values: closes });
    const ema26 = EMA.calculate({ period: 26, values: closes });
    
    return {
      ema12: ema12[ema12.length - 1],
      ema26: ema26[ema26.length - 1],
      alignment: ema12[ema12.length - 1] > ema26[ema26.length - 1] ? 'BULLISH' : 'BEARISH'
    };
  }
  
  /**
   * Calculate Bollinger Bands with enhanced analysis
   */
  calculateBollingerBands(closes) {
    // Use adaptive parameters if available
    let period, stdDev;
    if (this.useAdaptiveIndicators) {
      const adaptiveParams = this.adaptiveEngine.getCurrentParameters();
      period = adaptiveParams.parameters.bollingerBands.period;
      stdDev = adaptiveParams.parameters.bollingerBands.stdDev;
    } else {
      period = this.config.indicators.bollingerBands.period;
      stdDev = this.config.indicators.bollingerBands.stdDev;
    }

    if (closes.length < period) {
      return {
        upper: null,
        middle: null,
        lower: null,
        position: 'INSUFFICIENT_DATA',
        bandwidth: 0,
        squeeze: false,
        signal: 'NEUTRAL'
      };
    }

    const bbData = BollingerBands.calculate({
      period: period,
      values: closes,
      stdDev: stdDev
    });

    const current = bbData[bbData.length - 1];
    const previous = bbData[bbData.length - 2];
    const currentPrice = closes[closes.length - 1];

    // Determine position
    let position = 'MIDDLE';
    let signal = 'NEUTRAL';

    if (currentPrice > current.upper) {
      position = 'ABOVE_UPPER';
      signal = 'OVERBOUGHT';
    } else if (currentPrice < current.lower) {
      position = 'BELOW_LOWER';
      signal = 'OVERSOLD';
    } else if (currentPrice > current.middle) {
      position = 'UPPER_HALF';
      signal = 'BULLISH_BIAS';
    } else {
      position = 'LOWER_HALF';
      signal = 'BEARISH_BIAS';
    }

    // Calculate bandwidth and squeeze
    const bandwidth = ((current.upper - current.lower) / current.middle) * 100;
    const previousBandwidth = previous ? ((previous.upper - previous.lower) / previous.middle) * 100 : bandwidth;
    const squeeze = bandwidth < 2.0; // Tight bands indicate low volatility

    // Bollinger Band bounce signals
    if (currentPrice <= current.lower && closes[closes.length - 2] > bbData[bbData.length - 2].lower) {
      signal = 'BOUNCE_UP';
    } else if (currentPrice >= current.upper && closes[closes.length - 2] < bbData[bbData.length - 2].upper) {
      signal = 'BOUNCE_DOWN';
    }

    return {
      upper: current.upper,
      middle: current.middle,
      lower: current.lower,
      position: position,
      bandwidth: bandwidth,
      bandwidthChange: bandwidth - previousBandwidth,
      squeeze: squeeze,
      signal: signal,
      percentB: ((currentPrice - current.lower) / (current.upper - current.lower)) * 100
    };
  }
  
  /**
   * Calculate Stochastic Oscillator with enhanced signals
   */
  calculateStochastic(highs, lows, closes) {
    // Use adaptive parameters if available
    let kPeriod, dPeriod;
    if (this.useAdaptiveIndicators) {
      const adaptiveParams = this.adaptiveEngine.getCurrentParameters();
      kPeriod = adaptiveParams.parameters.stochastic.kPeriod;
      dPeriod = adaptiveParams.parameters.stochastic.dPeriod;
    } else {
      kPeriod = this.config.indicators.stochastic.kPeriod || 14;
      dPeriod = this.config.indicators.stochastic.dPeriod || 3;
    }

    if (highs.length < kPeriod) {
      return {
        k: null,
        d: null,
        signal: 'INSUFFICIENT_DATA',
        crossover: 'NONE',
        divergence: false
      };
    }

    const stochData = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: kPeriod,
      signalPeriod: dPeriod
    });

    const current = stochData[stochData.length - 1];
    const previous = stochData[stochData.length - 2];

    // Basic signal
    let signal = 'NEUTRAL';
    if (current.k > 80) signal = 'OVERBOUGHT';
    else if (current.k < 20) signal = 'OVERSOLD';

    // Crossover detection
    let crossover = 'NONE';
    if (previous) {
      if (previous.k <= previous.d && current.k > current.d) {
        crossover = 'BULLISH'; // %K crosses above %D
      } else if (previous.k >= previous.d && current.k < current.d) {
        crossover = 'BEARISH'; // %K crosses below %D
      }
    }

    // Enhanced signals based on levels and crossovers
    if (crossover === 'BULLISH' && current.k < 30) {
      signal = 'STRONG_BUY';
    } else if (crossover === 'BEARISH' && current.k > 70) {
      signal = 'STRONG_SELL';
    }

    return {
      k: current.k,
      d: current.d,
      signal: signal,
      crossover: crossover,
      trend: current.k > previous?.k ? 'RISING' : 'FALLING',
      strength: Math.abs(current.k - 50) > 30 ? 'STRONG' : 'WEAK'
    };
  }
  
  /**
   * Calculate Average True Range
   */
  calculateATR(highs, lows, closes) {
    const atrData = ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14
    });
    
    return {
      current: atrData[atrData.length - 1],
      average: atrData.reduce((a, b) => a + b, 0) / atrData.length
    };
  }
  
  /**
   * Calculate volatility metrics
   */
  calculateVolatility(closes) {
    const period = this.config.indicators.volatility.period;
    const recentCloses = closes.slice(-period);
    
    // Standard deviation
    const mean = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
    const variance = recentCloses.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentCloses.length;
    const stdDev = Math.sqrt(variance);
    
    // Volatility as percentage
    const volatilityPercent = (stdDev / mean) * 100;
    
    let level = 'MODERATE';
    if (volatilityPercent > 2) level = 'HIGH';
    else if (volatilityPercent < 0.5) level = 'LOW';
    
    return {
      current: volatilityPercent,
      level: level,
      stdDev: stdDev
    };
  }
  
  /**
   * Enhanced volume analysis with trend and strength
   */
  analyzeVolume(volumes) {
    if (volumes.length < 5) {
      return {
        signal: 'INSUFFICIENT_DATA',
        trend: 'UNKNOWN',
        strength: 'WEAK'
      };
    }

    const currentVolume = volumes[volumes.length - 1];
    const previousVolume = volumes[volumes.length - 2];
    const avgVolume5 = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const avgVolume10 = volumes.length >= 10 ?
      volumes.slice(-10).reduce((a, b) => a + b, 0) / 10 : avgVolume5;

    // Volume trend analysis
    let trend = 'NEUTRAL';
    if (currentVolume > previousVolume * 1.2) trend = 'INCREASING';
    else if (currentVolume < previousVolume * 0.8) trend = 'DECREASING';

    // Volume strength analysis
    let signal = 'NORMAL';
    let strength = 'MODERATE';

    const ratio5 = currentVolume / avgVolume5;
    const ratio10 = currentVolume / avgVolume10;

    if (ratio5 > 2.0) {
      signal = 'VERY_HIGH';
      strength = 'VERY_STRONG';
    } else if (ratio5 > 1.5) {
      signal = 'HIGH';
      strength = 'STRONG';
    } else if (ratio5 < 0.5) {
      signal = 'LOW';
      strength = 'WEAK';
    } else if (ratio5 < 0.3) {
      signal = 'VERY_LOW';
      strength = 'VERY_WEAK';
    }

    // Volume confirmation signals
    let confirmation = 'NEUTRAL';
    if (signal === 'HIGH' || signal === 'VERY_HIGH') {
      confirmation = 'BREAKOUT_LIKELY';
    } else if (signal === 'LOW' || signal === 'VERY_LOW') {
      confirmation = 'CONSOLIDATION';
    }

    return {
      current: currentVolume,
      previous: previousVolume,
      average5: avgVolume5,
      average10: avgVolume10,
      signal: signal,
      trend: trend,
      strength: strength,
      confirmation: confirmation,
      ratio5: ratio5,
      ratio10: ratio10,
      volumeChange: ((currentVolume - previousVolume) / previousVolume) * 100
    };
  }
  
  /**
   * Detect candlestick patterns
   */
  detectPatterns(marketData) {
    return this.patterns.detectPatterns(marketData);
  }
  
  /**
   * Determine overall market state
   */
  determineMarketState(analysis) {
    const signals = [];
    
    // RSI signals
    if (analysis.rsi.signal === 'OVERBOUGHT') signals.push('BEARISH');
    else if (analysis.rsi.signal === 'OVERSOLD') signals.push('BULLISH');
    
    // MACD signals
    if (analysis.macd.crossover === 'BULLISH_CROSSOVER') signals.push('BULLISH');
    else if (analysis.macd.crossover === 'BEARISH_CROSSOVER') signals.push('BEARISH');
    
    // Moving average signals
    if (analysis.sma.smaAlignment === 'BULLISH') signals.push('BULLISH');
    else if (analysis.sma.smaAlignment === 'BEARISH') signals.push('BEARISH');
    
    // Pattern signals
    if (analysis.patterns.bullishCount > analysis.patterns.bearishCount) {
      signals.push('BULLISH');
    } else if (analysis.patterns.bearishCount > analysis.patterns.bullishCount) {
      signals.push('BEARISH');
    }
    
    // Count signals
    const bullishCount = signals.filter(s => s === 'BULLISH').length;
    const bearishCount = signals.filter(s => s === 'BEARISH').length;
    
    if (bullishCount > bearishCount) return 'BULLISH';
    else if (bearishCount > bullishCount) return 'BEARISH';
    else return 'NEUTRAL';
  }
}

module.exports = { TechnicalAnalyzer };
