// API endpoint for generating Forex AI trading signals
import type { NextApiRequest, NextApiResponse } from 'next';
import { ForexSignalGenerator } from '../../services/forexSignalGenerator';

// Define types for the request and response
type ForexSignalRequest = {
  pair: string;
  trade_mode: 'sniper' | 'scalping' | 'swing';
  risk: string;
};

type ForexSignalResponse = {
  pair?: string;
  trade_type?: 'BUY' | 'SELL';
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  rr_ratio?: number;
  confidence?: number;
  timeframe?: string;
  trade_mode?: string;
  reason?: string;
  risk_per_trade?: string;
  execution_platform?: string;
  error?: string;
  message?: string;
  strictMode?: boolean;
  dataSource?: string;
  timestamp?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ForexSignalResponse>
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
    const { pair, trade_mode, risk }: ForexSignalRequest = req.body;

    if (!pair || !trade_mode) {
      res.status(400).json({
        error: 'Missing required fields: pair, trade_mode'
      });
      return;
    }

    // Validate trade mode
    const validModes = ['sniper', 'scalping', 'swing'];
    if (!validModes.includes(trade_mode.toLowerCase())) {
      res.status(400).json({
        error: 'Invalid trade_mode. Must be one of: sniper, scalping, swing',
        strictMode: true,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Validate currency pair format and supported pairs
    const validPairs = [
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF',
      'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'AUD/JPY', 'CAD/JPY',
      'CHF/JPY', 'EUR/AUD', 'EUR/CAD', 'EUR/CHF', 'GBP/AUD', 'GBP/CAD',
      'GBP/CHF', 'AUD/CAD', 'AUD/CHF', 'CAD/CHF', 'NZD/JPY', 'NZD/CAD'
    ];

    if (!validPairs.includes(pair.toUpperCase())) {
      res.status(400).json({
        error: `Invalid currency pair: ${pair}. Supported pairs: ${validPairs.slice(0, 10).join(', ')}...`,
        strictMode: true,
        supportedPairs: validPairs,
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log(`🔍 Generating ${trade_mode} signal for ${pair} with ${risk || '1'}% risk`);

    // Initialize the production signal generator (same as working endpoint)
    const signalGenerator = new ForexSignalGenerator();

    // Generate the signal using real technical analysis
    const result = await signalGenerator.generateSignal(pair, trade_mode, risk || '1');

    // Add strict mode and data source metadata
    const enhancedResult = {
      ...result,
      strictMode: true,
      dataSource: 'real',
      timestamp: new Date().toISOString()
    };

    // Handle both success and error cases properly
    if (result.error) {
      // Return error with 200 status so frontend can handle it properly
      res.status(200).json({
        error: result.error,
        pair: result.pair,
        trade_mode: result.trade_mode,
        message: 'No high-confidence signal detected at this time. Market conditions may not be optimal for the selected trading mode.',
        strictMode: true,
        dataSource: 'real',
        timestamp: new Date().toISOString()
      });
    } else {
      // Return successful signal
      res.status(200).json(enhancedResult);
    }

  } catch (error) {
    console.error('❌ Error generating Forex signal:', error);
    res.status(500).json({
      error: 'Internal server error while generating signal',
      message: error instanceof Error ? error.message : 'Unknown error',
      strictMode: true,
      timestamp: new Date().toISOString()
    });
  }
}

