// Enhanced API endpoint for generating high-confidence AI trading signals
import type { NextApiRequest, NextApiResponse } from 'next';
import { TwelveDataService } from '../../services/twelveDataService';

// Import the enhanced multi-timeframe analyzer
const { EnhancedMultiTimeframeAnalyzer } = require('../../src/core/EnhancedMultiTimeframeAnalyzer');

type GenerateSignalRequest = {
  symbol: string;
  trade_duration: string;
};

type GenerateSignalResponse = {
  signal?: 'BUY' | 'SELL' | 'NO TRADE';
  confidence?: number;
  reason?: string;
  indicators?: any;
  symbol?: string;
  trade_duration?: string;
  timestamp?: string;
  candle_timestamp?: string;
  timeframe_analysis?: any;
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
    const { symbol, trade_duration }: GenerateSignalRequest = req.body;

    if (!symbol || !trade_duration) {
      res.status(400).json({ 
        error: 'Missing required fields: symbol, trade_duration' 
      });
      return;
    }

    console.log(`🔍 Generating enhanced signal for ${symbol} with trade duration: ${trade_duration}`);
    console.log(`📊 API Keys configured: TWELVE_DATA=${!!process.env.TWELVE_DATA_API_KEY}`);

    // Create a loading delay to simulate deep analysis (15-30 seconds)
    const analysisStartTime = Date.now();
    
    // 1. Initialize the data service
    const twelveData = new TwelveDataService();
    
    // 2. Initialize the enhanced multi-timeframe analyzer
    const multiTimeframeAnalyzer = new EnhancedMultiTimeframeAnalyzer();
    
    // 3. Perform multi-timeframe analysis
    console.log(`📈 Starting multi-timeframe analysis for ${symbol}...`);
    const analysisResult = await multiTimeframeAnalyzer.analyzeAllTimeframes(symbol, twelveData, trade_duration);
    
    // 4. Extract the final signal from the analysis
    const { signal, confidence, reason } = analysisResult.signal;
    
    // 5. Format the indicators for the response
    const indicators = formatIndicatorsForResponse(analysisResult);
    
    // 6. Calculate the candle timestamp for entry
    const candleTimestamp = calculateEntryTimestamp(trade_duration);
    
    // Ensure minimum analysis time (15-30 seconds)
    const analysisTime = Date.now() - analysisStartTime;
    const minAnalysisTime = 15000; // 15 seconds minimum
    
    if (analysisTime < minAnalysisTime) {
      await new Promise(resolve => setTimeout(resolve, minAnalysisTime - analysisTime));
    }
    
    console.log(`✅ Signal generated: ${signal} (${confidence}%) - Analysis took ${(Date.now() - analysisStartTime) / 1000} seconds`);
    
    // 7. Generate response with signal
    const response: GenerateSignalResponse = {
      signal: signal,
      confidence: confidence,
      reason: reason,
      indicators: indicators,
      symbol: symbol,
      trade_duration: trade_duration,
      timestamp: new Date().toISOString(),
      candle_timestamp: candleTimestamp,
      timeframe_analysis: {
        timeframes_analyzed: Object.keys(analysisResult.timeframeResults),
        confluence: analysisResult.confluenceAnalysis
      }
    };
    
    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error generating enhanced signal:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating signal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Format indicators for the response
 */
function formatIndicatorsForResponse(analysisResult: any) {
  // Get the 15-minute timeframe analysis as the primary reference
  const primaryTimeframe = analysisResult.timeframeResults['15m'] || 
                          analysisResult.timeframeResults['5m'] ||
                          Object.values(analysisResult.timeframeResults)[0];
  
  if (!primaryTimeframe) {
    return {
      error: 'No timeframe analysis available'
    };
  }
  
  // Extract indicators from the primary timeframe
  const { indicators, trend } = primaryTimeframe;
  
  // Format the response
  return {
    rsi: indicators.rsi,
    macd: indicators.macd,
    ema: indicators.ema,
    bb: indicators.bollinger,
    volume: indicators.volume,
    volatility: indicators.volatility,
    pattern: indicators.pattern,
    
    // Add trend analysis
    trend: {
      direction: trend.direction,
      strength: trend.strength,
      bullishScore: trend.bullishScore,
      bearishScore: trend.bearishScore
    },
    
    // Add confluence analysis
    confluence: {
      bullishTimeframes: analysisResult.confluenceAnalysis.bullishTimeframes,
      bearishTimeframes: analysisResult.confluenceAnalysis.bearishTimeframes,
      neutralTimeframes: analysisResult.confluenceAnalysis.neutralTimeframes,
      agreement: analysisResult.confluenceAnalysis.confidence
    }
  };
}

/**
 * Calculate the timestamp for trade entry
 */
function calculateEntryTimestamp(tradeDuration: string): string {
  const now = new Date();
  
  // Round to the nearest minute
  now.setSeconds(0);
  now.setMilliseconds(0);
  
  // Add 1 minute to ensure we're looking at the next candle
  now.setMinutes(now.getMinutes() + 1);
  
  // Format with timezone (UTC+5:30)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  return new Intl.DateTimeFormat('en-IN', options).format(now);
}