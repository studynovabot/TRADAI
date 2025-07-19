/**
 * OTC Signal Generation API Endpoint
 * 
 * Specialized endpoint for weekend OTC trading that:
 * 1. Uses pattern matching against historical data
 * 2. Generates high-confidence signals based on pattern similarity
 * 3. Provides detailed reasoning and confidence scores
 */

import { OTCSignalGenerator } from '../../src/core/OTCSignalGenerator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('OTC Signal generation request received');
    
    // Extract request parameters
    const { symbol, trade_duration } = req.body;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }
    
    // Map trade duration to timeframe
    const timeframeMap = {
      '1M': '1m',
      '3M': '3m',
      '5M': '5m',
      '10M': '10m',
      '15M': '15m'
    };
    
    const timeframe = timeframeMap[trade_duration] || '5m';
    
    console.log(`Generating OTC signal for ${symbol} ${timeframe}`);
    
    // Initialize OTC signal generator
    const otcSignalGenerator = new OTCSignalGenerator();
    
    // Generate signal
    const signal = await otcSignalGenerator.generateSignal(symbol, timeframe);
    
    // Format response
    const response = {
      symbol,
      signal: signal.direction,
      confidence: signal.confidence,
      reason: signal.reason,
      timeframe: signal.timeframe,
      trade_duration,
      timestamp: Date.now(),
      candle_timestamp: new Date().toLocaleString(),
      entry_price: null, // Will be filled by frontend
      indicators: signal.analysis?.indicators || {},
      timeframe_analysis: {
        timeframes_analyzed: ['1m', '3m', '5m'],
        confluence: signal.analysis?.confluence || {}
      },
      mode: 'OTC',
      patternMatches: {
        count: signal.analysis?.patternMatches?.count || 0,
        similarity: signal.analysis?.patternMatches?.averageSimilarity || 0,
        historicalOutcomes: signal.analysis?.patternDetails || {}
      }
    };
    
    console.log(`OTC Signal generated: ${response.signal} with ${response.confidence}% confidence`);
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('OTC Signal generation error:', error);
    
    return res.status(500).json({
      error: 'Failed to generate OTC signal',
      message: error.message,
      signal: 'NO_TRADE',
      confidence: 0,
      reason: `Error: ${error.message}`,
      timestamp: Date.now()
    });
  }
}