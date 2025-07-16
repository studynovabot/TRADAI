// Technical Analysis Service - Calculate all indicators
import { RSI, MACD, EMA, BollingerBands } from 'technicalindicators';

export class TechnicalAnalyzer {
  constructor() {}

  async analyzeMarket(marketData: any[]) {
    try {
      // Extract price arrays
      const closes = marketData.map(candle => candle.close);
      const highs = marketData.map(candle => candle.high);
      const lows = marketData.map(candle => candle.low);
      const volumes = marketData.map(candle => candle.volume);
      
      // Calculate RSI
      const rsi = RSI.calculate({ values: closes, period: 14 });
      const currentRSI = rsi[rsi.length - 1];
      
      // Calculate MACD
      const macd = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
      });
      const currentMACD = macd[macd.length - 1];
      
      // Calculate EMAs
      const ema20 = EMA.calculate({ values: closes, period: 20 });
      const ema50 = EMA.calculate({ values: closes, period: 50 });
      const currentEMA20 = ema20[ema20.length - 1];
      const currentEMA50 = ema50[ema50.length - 1];
      
      // Calculate Bollinger Bands
      const bb = BollingerBands.calculate({
        values: closes,
        period: 20,
        stdDev: 2
      });
      const currentBB = bb[bb.length - 1];
      
      // Volume analysis
      const recentVolumes = volumes.slice(-10);
      const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
      const currentVolume = volumes[volumes.length - 1];
      const volumeTrend = currentVolume > avgVolume ? 'increasing' : 'decreasing';
      
      // Volatility calculation (ATR approximation)
      const volatility = this.calculateVolatility(marketData.slice(-20));
      
      // Pattern detection
      const pattern = this.detectPattern(marketData.slice(-5));
      
      return {
        rsi: currentRSI || 50, // Default to neutral if calculation fails
        macd: currentMACD || { macd: 0, signal: 0, histogram: 0 },
        ema: {
          ema20: currentEMA20 || closes[closes.length - 1],
          ema50: currentEMA50 || closes[closes.length - 1]
        },
        bollinger: currentBB || { 
          upper: closes[closes.length - 1] * 1.02, 
          middle: closes[closes.length - 1], 
          lower: closes[closes.length - 1] * 0.98 
        },
        volume: {
          current: currentVolume || 0,
          average: avgVolume || 0,
          trend: volumeTrend,
          ratio: currentVolume && avgVolume ? currentVolume / avgVolume : 1
        },
        volatility: volatility || 1.0,
        pattern: pattern || null
      };
      
    } catch (error) {
      console.error('❌ Technical analysis error:', error);
      throw new Error('Technical analysis failed');
    }
  }
  
  private calculateVolatility(data: any[]): number {
    if (data.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const return_ = Math.log(data[i].close / data[i-1].close);
      returns.push(return_);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * 100;
    
    return volatility;
  }
  
  private detectPattern(data: any[]): { type: string; strength: number } | null {
    if (data.length < 5) return null;
    
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    
    // Simple pattern detection
    const bodySize = Math.abs(latest.close - latest.open);
    const candleRange = latest.high - latest.low;
    const bodyRatio = bodySize / candleRange;
    
    // Engulfing patterns
    if (bodyRatio > 0.7) {
      if (latest.close > latest.open && previous.close < previous.open) {
        // Bullish engulfing
        if (latest.close > previous.open && latest.open < previous.close) {
          return { type: 'bullish', strength: 0.8 };
        }
      } else if (latest.close < latest.open && previous.close > previous.open) {
        // Bearish engulfing
        if (latest.close < previous.open && latest.open > previous.close) {
          return { type: 'bearish', strength: 0.8 };
        }
      }
    }
    
    // Doji pattern
    if (bodyRatio < 0.1) {
      return { type: 'doji', strength: 0.6 };
    }
    
    // Hammer/Shooting star
    const upperShadow = latest.high - Math.max(latest.open, latest.close);
    const lowerShadow = Math.min(latest.open, latest.close) - latest.low;
    
    if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
      return { type: 'hammer', strength: 0.7 };
    }
    
    if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5) {
      return { type: 'shooting_star', strength: 0.7 };
    }
    
    return null;
  }
}