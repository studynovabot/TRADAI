// API route for trading signals
import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs-extra';
import * as path from 'path';

type Signal = {
  id: string;
  pair: string;
  direction: 'CALL' | 'PUT';
  confidence: number;
  timeframe: string;
  timestamp: number;
  analysis?: string;
};

type Data = {
  signals: Signal[];
  count: number;
  status: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Get recent signals from file or database
    const signals = await getRecentSignals();
    
    res.status(200).json({
      signals,
      count: signals.length,
      status: 'OK'
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({
      signals: [],
      count: 0,
      status: 'ERROR'
    });
  }
}

async function getRecentSignals(): Promise<Signal[]> {
  try {
    // Try to read signals from orchestrator signals file
    const signalsPath = path.join(process.cwd(), 'data', 'signals', 'orchestrator_signals.json');
    
    if (await fs.pathExists(signalsPath)) {
      const data = await fs.readJson(signalsPath);
      
      // Convert to expected format
      const signals: Signal[] = data.map((signal: any, index: number) => ({
        id: `signal_${index}`,
        pair: signal.pair || 'USD/EUR',
        direction: signal.direction || 'CALL',
        confidence: signal.confidence || 75,
        timeframe: signal.timeframe || '2min',
        timestamp: signal.timestamp || Date.now(),
        analysis: signal.analysis || 'AI Analysis'
      }));
      
      // Return most recent 20 signals
      return signals.slice(-20).reverse();
    }
    
    // STRICT MODE: No demo signals allowed
    throw new Error('No real signals available');
  } catch (error) {
    console.error('Error reading signals:', error);
    throw new Error(`Failed to read real signals: ${error.message}`);
  }
}

