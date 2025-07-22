// Production-Grade Forex Signal Generator API
// Implements Sniper, Scalping, and Swing modes with real technical analysis

import { NextApiRequest, NextApiResponse } from 'next';
import { ForexSignalGenerator } from '../../services/forexSignalGenerator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const { pair, trade_mode, risk } = req.body;

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
        error: 'Invalid trade_mode. Must be one of: sniper, scalping, swing'
      });
      return;
    }

    console.log(`🔍 Generating ${trade_mode} signal for ${pair} with ${risk || '1'}% risk`);
    
    // Initialize the production signal generator
    const signalGenerator = new ForexSignalGenerator();
    
    // Generate the signal using real technical analysis
    const result = await signalGenerator.generateSignal(pair, trade_mode, risk || '1');
    
    // Handle both success and error cases properly
    if (result.error) {
      // Return error with 200 status so frontend can handle it properly
      res.status(200).json({
        error: result.error,
        pair: result.pair,
        trade_mode: result.trade_mode,
        message: 'No high-confidence signal detected at this time. Market conditions may not be optimal for the selected trading mode.'
      });
    } else {
      // Return successful signal
      res.status(200).json(result);
    }

  } catch (error) {
    console.error('❌ Error generating Forex signal:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating signal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}