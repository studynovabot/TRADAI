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

    // 1. Fetch market data
    const twelveData = new TwelveDataService();
    const marketData = await twelveData.getOHLCV(symbol, timeframe, 100);
    
    if (!marketData || marketData.length === 0) {
      res.status(400).json({ 
        error: 'Unable to fetch market data for the specified symbol' 
      });
      return;
    }

    // 2. Calculate technical indicators
    const technicalAnalyzer = new TechnicalAnalyzer();
    const indicators = await technicalAnalyzer.analyzeMarket(marketData);

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

    // 4. Check if all brains agree
    if (reflexResult.approved && quantResult.direction === analystResult.direction) {
      const response: GenerateSignalResponse = {
        signal: quantResult.direction,
        confidence: Math.round((quantResult.confidence + analystResult.confidence) / 2 * 100) / 100,
        reason: analystResult.explanation,
        indicators: {
          rsi: indicators.rsi,
          macd: indicators.macd,
          ema: indicators.ema,
          bb: indicators.bollinger,
          volume: indicators.volume,
          volatility: indicators.volatility,
          pattern: indicators.pattern
        },
        symbol,
        timeframe,
        trade_duration,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Signal generated successfully:', response.signal, response.confidence);
      res.status(200).json(response);
    } else {
      console.log('❌ No signal - AI brains disagreed');
      res.status(200).json({
        message: 'No signal generated due to AI disagreement',
        symbol,
        timeframe,
        trade_duration,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error generating signal:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating signal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}