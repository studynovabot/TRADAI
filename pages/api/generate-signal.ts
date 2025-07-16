// API endpoint for generating AI trading signals
import type { NextApiRequest, NextApiResponse } from 'next';
import { QuantBrain } from '../../services/ai/quantBrain';
import { AnalystBrain } from '../../services/ai/analystBrain';
import { ReflexBrain } from '../../services/ai/reflexBrain';
import { TechnicalAnalyzer } from '../../services/technicalAnalyzer';
import { TwelveDataService } from '../../services/twelveDataService';

type GenerateSignalRequest = {
  symbol: string;
  timeframe: string;
  trade_duration: string;
};

type GenerateSignalResponse = {
  signal?: 'BUY' | 'SELL';
  confidence?: number;
  reason?: string;
  indicators?: any;
  symbol?: string;
  timeframe?: string;
  trade_duration?: string;
  timestamp?: string;
  error?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GenerateSignalResponse>
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { symbol, timeframe, trade_duration }: GenerateSignalRequest = req.body;

    if (!symbol || !timeframe || !trade_duration) {
      res.status(400).json({ 
        error: 'Missing required fields: symbol, timeframe, trade_duration' 
      });
      return;
    }

    console.log(`🔍 Generating signal for ${symbol} on ${timeframe} for ${trade_duration}`);
    console.log(`📊 API Keys configured: TWELVE_DATA=${!!process.env.TWELVE_DATA_API_KEY}, GROQ=${!!process.env.GROQ_API_KEY}`);

    // 1. Fetch market data
    const twelveData = new TwelveDataService();
    const marketData = await twelveData.getOHLCV(symbol, timeframe, 100);
    
    console.log(`📈 Market data fetched: ${marketData.length} candles, latest price: ${marketData[marketData.length - 1]?.close}`);
    
    if (!marketData || marketData.length === 0) {
      res.status(400).json({ 
        error: 'Unable to fetch market data for the specified symbol' 
      });
      return;
    }

    // 2. Calculate technical indicators
    const technicalAnalyzer = new TechnicalAnalyzer();
    const indicators = await technicalAnalyzer.analyzeMarket(marketData);
    
    console.log(`📊 Technical indicators calculated: RSI=${indicators.rsi?.toFixed(1)}, MACD=${indicators.macd?.macd?.toFixed(4)}, EMA20=${indicators.ema?.ema20?.toFixed(4)}`);

    // 3. Run through 3-Brain AI System
    console.log('🧮 Running Quant Brain analysis...');
    const quantBrain = new QuantBrain();
    const quantResult = await quantBrain.analyze(marketData, indicators);

    console.log('💡 Running Analyst Brain analysis...');
    const analystBrain = new AnalystBrain();
    const analystResult = await analystBrain.analyze(marketData, indicators, symbol, timeframe);

    console.log('⚡ Running Reflex Brain analysis...');
    const reflexBrain = new ReflexBrain();
    const reflexResult = await reflexBrain.analyze(quantResult, analystResult, indicators);

    // 4. Enhanced signal generation logic - Always generate a signal with proper confidence
    let finalSignal: 'BUY' | 'SELL';
    let finalConfidence: number;
    let finalReason: string;
    let signalQuality: string;

    // Check if both main brains agree
    if (quantResult.direction === analystResult.direction) {
      // Both brains agree - high quality signal
      finalSignal = quantResult.direction;
      finalConfidence = Math.round((quantResult.confidence + analystResult.confidence) / 2 * 100) / 100;
      finalReason = `${analystResult.explanation} | Technical confluence: ${quantResult.bullishScore > quantResult.bearishScore ? 'Bullish' : 'Bearish'} (${quantResult.bullishScore}:${quantResult.bearishScore})`;
      signalQuality = reflexResult.approved ? 'HIGH' : 'MEDIUM';
      
      // Boost confidence if reflex brain also approves
      if (reflexResult.approved) {
        finalConfidence = Math.min(finalConfidence * 1.1, 0.95);
      }
    } else {
      // Brains disagree - use the one with higher confidence
      if (quantResult.confidence > analystResult.confidence) {
        finalSignal = quantResult.direction;
        finalConfidence = Math.max(quantResult.confidence * 0.8, 0.60); // Reduce confidence due to disagreement
        finalReason = `Technical analysis suggests ${quantResult.direction} (Quant: ${Math.round(quantResult.confidence * 100)}% vs Analyst: ${Math.round(analystResult.confidence * 100)}%). ${analystResult.explanation}`;
      } else {
        finalSignal = analystResult.direction;
        finalConfidence = Math.max(analystResult.confidence * 0.8, 0.60); // Reduce confidence due to disagreement
        finalReason = `Market analysis suggests ${analystResult.direction} (Analyst: ${Math.round(analystResult.confidence * 100)}% vs Quant: ${Math.round(quantResult.confidence * 100)}%). ${analystResult.explanation}`;
      }
      signalQuality = 'LOW';
    }

    // Apply minimum confidence floor
    finalConfidence = Math.max(finalConfidence, 0.55);

    // Generate response with signal
    const response: GenerateSignalResponse = {
      signal: finalSignal,
      confidence: Math.round(finalConfidence * 100) / 100,
      reason: `[${signalQuality} QUALITY] ${finalReason}`,
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        ema: indicators.ema,
        bb: indicators.bollinger,
        volume: indicators.volume,
        volatility: indicators.volatility,
        pattern: indicators.pattern,
        quant_analysis: quantResult.analysis,
        signal_quality: signalQuality,
        brain_agreement: quantResult.direction === analystResult.direction,
        reflex_approved: reflexResult.approved
      },
      symbol,
      timeframe,
      trade_duration,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Signal generated: ${response.signal} (${Math.round(finalConfidence * 100)}%) - Quality: ${signalQuality}`);
    console.log(`🧠 Brain Agreement: ${quantResult.direction === analystResult.direction ? 'YES' : 'NO'} | Reflex: ${reflexResult.approved ? 'APPROVED' : 'REJECTED'}`);
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error generating signal:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating signal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}