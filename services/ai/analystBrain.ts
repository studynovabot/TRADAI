// Analyst Brain - LLM-based analysis using Groq
import { Groq } from 'groq-sdk';

export class AnalystBrain {
  private groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || ''
    });
  }

  async analyze(marketData: any[], indicators: any, symbol: string, timeframe: string) {
    try {
      const latest = marketData[marketData.length - 1];
      const previous = marketData[marketData.length - 2];
      const priceChange = ((latest.close - previous.close) / previous.close) * 100;
      
      // Build comprehensive analysis prompt
      const prompt = `
You are a professional trading analyst. Based on the following technical analysis data, determine the most probable next candle direction for ${symbol} on ${timeframe} timeframe.

CURRENT MARKET DATA:
- Current Price: ${latest.close}
- Previous Price: ${previous.close}
- Price Change: ${priceChange.toFixed(2)}%
- High: ${latest.high}
- Low: ${latest.low}
- Volume: ${latest.volume}

TECHNICAL INDICATORS:
- RSI (14): ${indicators.rsi.toFixed(2)}
- MACD Line: ${indicators.macd.macd.toFixed(4)}
- MACD Signal: ${indicators.macd.signal.toFixed(4)}
- MACD Histogram: ${indicators.macd.histogram.toFixed(4)}
- EMA 20: ${indicators.ema.ema20.toFixed(4)}
- EMA 50: ${indicators.ema.ema50.toFixed(4)}
- Bollinger Upper: ${indicators.bollinger.upper.toFixed(4)}
- Bollinger Middle: ${indicators.bollinger.middle.toFixed(4)}
- Bollinger Lower: ${indicators.bollinger.lower.toFixed(4)}
- Volume Trend: ${indicators.volume.trend}
- Volatility: ${indicators.volatility.toFixed(2)}%
- Pattern Detected: ${indicators.pattern?.type || 'None'}

ANALYSIS REQUIREMENTS:
1. Provide a clear BUY or SELL recommendation
2. Give confidence level (65-95%)
3. Explain your reasoning in 2-3 sentences
4. Focus on the most significant indicators
5. Consider confluence of multiple signals

Respond in this exact format:
DIRECTION: [BUY/SELL]
CONFIDENCE: [number]
EXPLANATION: [your analysis]
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a professional trading analyst with 20+ years of experience. You analyze technical indicators and provide clear, actionable trading signals."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-70b-8192",
        temperature: 0.1,
        max_tokens: 300,
        top_p: 0.9
      });

      const response = completion.choices[0]?.message?.content || '';
      
      // Parse the response
      const directionMatch = response.match(/DIRECTION:\s*(BUY|SELL)/i);
      const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
      const explanationMatch = response.match(/EXPLANATION:\s*(.+)/i);

      if (!directionMatch || !confidenceMatch || !explanationMatch) {
        throw new Error('Invalid response format from Analyst Brain');
      }

      const direction = directionMatch[1].toUpperCase() as 'BUY' | 'SELL';
      const confidence = Math.min(Math.max(parseInt(confidenceMatch[1]), 65), 95) / 100;
      const explanation = explanationMatch[1].trim();

      console.log(`💡 Analyst Brain: ${direction} (${Math.round(confidence * 100)}%)`);
      console.log(`📝 Explanation: ${explanation}`);

      return {
        direction,
        confidence,
        explanation,
        raw_response: response
      };

    } catch (error) {
      console.error('❌ Analyst Brain error:', error);
      
      // Enhanced fallback analysis if AI fails
      const latest = marketData[marketData.length - 1];
      const previous = marketData[marketData.length - 2];
      const priceChange = ((latest.close - previous.close) / previous.close) * 100;
      
      // Use technical indicators for better fallback decision
      let direction: 'BUY' | 'SELL';
      let confidence = 0.60;
      let explanation = 'Fallback technical analysis: ';
      
      // Simple multi-indicator fallback logic
      let bullishSignals = 0;
      let bearishSignals = 0;
      
      // RSI signal
      if (indicators.rsi < 30) {
        bullishSignals++;
        explanation += 'RSI oversold, ';
      } else if (indicators.rsi > 70) {
        bearishSignals++;
        explanation += 'RSI overbought, ';
      }
      
      // MACD signal
      if (indicators.macd.macd > indicators.macd.signal) {
        bullishSignals++;
        explanation += 'MACD bullish, ';
      } else {
        bearishSignals++;
        explanation += 'MACD bearish, ';
      }
      
      // Price vs EMA
      if (latest.close > indicators.ema.ema20) {
        bullishSignals++;
        explanation += 'Price above EMA20, ';
      } else {
        bearishSignals++;
        explanation += 'Price below EMA20, ';
      }
      
      // Final decision
      if (bullishSignals > bearishSignals) {
        direction = 'BUY';
        confidence = Math.min(0.60 + (bullishSignals * 0.05), 0.75);
      } else if (bearishSignals > bullishSignals) {
        direction = 'SELL';
        confidence = Math.min(0.60 + (bearishSignals * 0.05), 0.75);
      } else {
        // Tie - use price momentum
        direction = priceChange > 0 ? 'BUY' : 'SELL';
        confidence = 0.55;
        explanation += 'using price momentum as tiebreaker';
      }
      
      explanation = explanation.replace(/, $/, '') + ' (AI service unavailable)';
      
      return {
        direction,
        confidence,
        explanation,
        raw_response: 'AI service temporarily unavailable - using technical fallback'
      };
    }
  }
}