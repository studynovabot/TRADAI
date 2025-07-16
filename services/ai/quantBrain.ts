// Quant Brain - Tabular AI model for technical analysis
export class QuantBrain {
  constructor() {}

  async analyze(marketData: any[], indicators: any) {
    try {
      // Get the latest values
      const latest = marketData[marketData.length - 1];
      const previous = marketData[marketData.length - 2];
      
      // Calculate price change
      const priceChange = ((latest.close - previous.close) / previous.close) * 100;
      
      // Scoring system based on technical indicators
      let bullishScore = 0;
      let bearishScore = 0;
      
      // RSI Analysis
      if (indicators.rsi > 70) {
        bearishScore += 2; // Overbought
      } else if (indicators.rsi < 30) {
        bullishScore += 2; // Oversold
      } else if (indicators.rsi > 50) {
        bullishScore += 1; // Above midline
      } else {
        bearishScore += 1; // Below midline
      }
      
      // MACD Analysis
      if (indicators.macd.macd > indicators.macd.signal) {
        bullishScore += 2;
      } else {
        bearishScore += 2;
      }
      
      // EMA Analysis
      if (latest.close > indicators.ema.ema20) {
        bullishScore += 1;
      } else {
        bearishScore += 1;
      }
      
      if (indicators.ema.ema20 > indicators.ema.ema50) {
        bullishScore += 1;
      } else {
        bearishScore += 1;
      }
      
      // Bollinger Bands Analysis
      if (latest.close < indicators.bollinger.lower) {
        bullishScore += 2; // Near lower band - potential bounce
      } else if (latest.close > indicators.bollinger.upper) {
        bearishScore += 2; // Near upper band - potential reversal
      }
      
      // Volume Analysis
      if (indicators.volume.trend === 'increasing') {
        if (priceChange > 0) {
          bullishScore += 1;
        } else {
          bearishScore += 1;
        }
      }
      
      // Volatility Analysis
      if (indicators.volatility < 0.5) {
        // Low volatility - potential breakout
        if (priceChange > 0) {
          bullishScore += 1;
        } else {
          bearishScore += 1;
        }
      }
      
      // Pattern Analysis
      if (indicators.pattern) {
        if (indicators.pattern.type === 'bullish') {
          bullishScore += 2;
        } else if (indicators.pattern.type === 'bearish') {
          bearishScore += 2;
        }
      }
      
      // Determine direction and confidence
      let direction: 'BUY' | 'SELL';
      let confidence: number;
      
      const totalScore = bullishScore + bearishScore;
      
      if (bullishScore > bearishScore) {
        direction = 'BUY';
        confidence = Math.min((bullishScore / totalScore), 0.95);
      } else if (bearishScore > bullishScore) {
        direction = 'SELL';
        confidence = Math.min((bearishScore / totalScore), 0.95);
      } else {
        // Equal scores - use price momentum as tiebreaker
        direction = priceChange > 0 ? 'BUY' : 'SELL';
        confidence = 0.55; // Low confidence for tie situations
      }
      
      // Ensure confidence is within reasonable bounds
      confidence = Math.max(Math.min(confidence, 0.95), 0.55);
      
      // Boost confidence based on score difference
      const scoreDifference = Math.abs(bullishScore - bearishScore);
      if (scoreDifference >= 3) {
        confidence = Math.min(confidence * 1.1, 0.95);
      } else if (scoreDifference >= 2) {
        confidence = Math.min(confidence * 1.05, 0.90);
      }
      
      console.log(`🧮 Quant Brain: ${direction} (${Math.round(confidence * 100)}%) - Bull: ${bullishScore}, Bear: ${bearishScore}`);
      
      return {
        direction,
        confidence,
        bullishScore,
        bearishScore,
        analysis: {
          rsi_signal: indicators.rsi > 70 ? 'overbought' : indicators.rsi < 30 ? 'oversold' : 'neutral',
          macd_signal: indicators.macd.macd > indicators.macd.signal ? 'bullish' : 'bearish',
          ema_signal: latest.close > indicators.ema.ema20 ? 'above_ema20' : 'below_ema20',
          bb_signal: latest.close < indicators.bollinger.lower ? 'near_lower' : 
                     latest.close > indicators.bollinger.upper ? 'near_upper' : 'middle',
          volume_signal: indicators.volume.trend,
          pattern_signal: indicators.pattern?.type || 'none'
        }
      };
      
    } catch (error) {
      console.error('❌ Quant Brain error:', error);
      throw new Error('Quant Brain analysis failed');
    }
  }
}