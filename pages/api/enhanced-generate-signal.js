/**
 * Enhanced Signal Generator API Endpoint
 * 
 * Performs multi-timeframe analysis to generate high-confidence trading signals
 * based on technical indicators, candlestick patterns, and market confluence
 */

import { MarketDataFetcher } from '../../src/utils/MarketDataFetcher';
import { MultiTimeframeAnalysis } from '../../src/utils/MultiTimeframeAnalysis';
import { SignalPerformanceTracker } from '../../src/utils/SignalPerformanceTracker';

// Initialize services with API key from environment variables
const marketDataFetcher = new MarketDataFetcher(process.env.MARKET_DATA_API_KEY);
const multiTimeframeAnalysis = new MultiTimeframeAnalysis();
const performanceTracker = new SignalPerformanceTracker();

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Start performance measurement
    const startTime = Date.now();
    
    // Extract parameters from request
    const { 
      symbol, 
      trade_duration, 
      timeframes = ['5m', '15m', '30m', '1h', '4h', '1d'],
      min_confidence = 70 
    } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    // Log request for debugging
    console.log(`Generating enhanced signal for ${symbol} across timeframes: ${timeframes.join(', ')}`);
    
    // Fetch market data for all timeframes
    const marketData = await marketDataFetcher.fetchMultiTimeframeData(symbol, timeframes);
    
    // Perform multi-timeframe analysis
    const analysisResult = multiTimeframeAnalysis.analyzeTimeframes(marketData);
    
    // Get the latest candle from the 5m timeframe for entry timing
    const latestCandle = marketData['5m'][marketData['5m'].length - 1];
    const formattedCandleTimestamp = new Date(latestCandle.timestamp).toISOString();
    
    // Determine if the signal meets the minimum confidence threshold
    const meetsConfidenceThreshold = analysisResult.confidence >= min_confidence;
    
    // Construct the enhanced signal response
    const signal = {
      symbol,
      signal: meetsConfidenceThreshold ? analysisResult.signal : 'NO TRADE',
      confidence: analysisResult.confidence,
      confidence_threshold_met: meetsConfidenceThreshold,
      reason: analysisResult.reason,
      entry_timeframe: '5m', // Base timeframe for entry
      trade_duration: trade_duration || '5m',
      timestamp: Date.now(),
      generated_at: new Date().toISOString(),
      candle_timestamp: formattedCandleTimestamp,
      entry_price: latestCandle.close,
      
      // Enhanced indicator data
      technical_analysis: {
        rsi: marketData['5m'] ? 
          analysisResult.timeframe_results['5m']?.indicators?.rsi : null,
        macd: marketData['5m'] ? 
          analysisResult.timeframe_results['5m']?.indicators?.macd : null,
        ema: marketData['5m'] ? 
          analysisResult.timeframe_results['5m']?.indicators?.ema : null,
        bollinger: marketData['5m'] ? 
          analysisResult.timeframe_results['5m']?.indicators?.bollinger : null,
        volume: marketData['5m'] ? 
          analysisResult.timeframe_results['5m']?.indicators?.volume : null,
        support_resistance: marketData['5m'] ? 
          analysisResult.timeframe_results['5m']?.indicators?.supportResistance : null
      },
      
      // Pattern information
      pattern_analysis: {
        main_pattern: analysisResult.mainPattern,
        detected_patterns: marketData['5m'] ? 
          analysisResult.timeframe_results['5m']?.patterns?.detected : []
      },
      
      // Timeframe confluence data
      timeframe_analysis: {
        timeframes_analyzed: analysisResult.timeframes_analyzed,
        confluence: analysisResult.confluence,
        bullish_count: analysisResult.confluence.bullishTimeframes.length,
        bearish_count: analysisResult.confluence.bearishTimeframes.length,
        neutral_count: analysisResult.confluence.neutralTimeframes.length
      },
      
      // Processing metadata
      processing_time_ms: Date.now() - startTime
    };
    
    // Record the signal for performance tracking
    const signalId = await performanceTracker.recordSignal(signal);
    signal.id = signalId;
    
    // Return the enhanced signal
    return res.status(200).json(signal);
  } catch (error) {
    console.error(`Error generating enhanced signal: ${error.message}`);
    return res.status(500).json({ 
      error: 'Error generating enhanced signal', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}