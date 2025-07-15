// API endpoint for logging trade results
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs-extra';
import path from 'path';

type LogTradeRequest = {
  symbol: string;
  timeframe: string;
  trade_duration: string;
  signal: 'BUY' | 'SELL';
  result: 'WIN' | 'LOSS' | 'SKIP';
  confidence: number;
  reason: string;
  timestamp: string;
};

type LogTradeResponse = {
  success: boolean;
  message?: string;
  error?: string;
  trade_id?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogTradeResponse>
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
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { 
      symbol, 
      timeframe, 
      trade_duration, 
      signal, 
      result, 
      confidence, 
      reason, 
      timestamp 
    }: LogTradeRequest = req.body;

    if (!symbol || !timeframe || !trade_duration || !signal || !result || !confidence || !reason || !timestamp) {
      res.status(400).json({ 
        success: false,
        error: 'Missing required fields' 
      });
      return;
    }

    // Create trade log entry
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tradeLog = {
      trade_id: tradeId,
      symbol,
      timeframe,
      trade_duration,
      signal,
      result,
      confidence,
      reason,
      timestamp,
      logged_at: new Date().toISOString()
    };

    // Ensure trades directory exists
    const tradesDir = path.join(process.cwd(), 'data', 'trades');
    await fs.ensureDir(tradesDir);

    // Read existing trades or create new array
    const tradesFile = path.join(tradesDir, 'trade_logs.json');
    let trades = [];
    
    try {
      if (await fs.pathExists(tradesFile)) {
        trades = await fs.readJson(tradesFile);
      }
    } catch (error) {
      console.log('Creating new trade logs file');
      trades = [];
    }

    // Add new trade
    trades.push(tradeLog);

    // Keep only last 1000 trades to prevent file getting too large
    if (trades.length > 1000) {
      trades = trades.slice(-1000);
    }

    // Save updated trades
    await fs.writeJson(tradesFile, trades, { spaces: 2 });

    // Also save to daily file for better organization
    const today = new Date().toISOString().split('T')[0];
    const dailyFile = path.join(tradesDir, `trades_${today}.json`);
    
    let dailyTrades = [];
    try {
      if (await fs.pathExists(dailyFile)) {
        dailyTrades = await fs.readJson(dailyFile);
      }
    } catch (error) {
      dailyTrades = [];
    }
    
    dailyTrades.push(tradeLog);
    await fs.writeJson(dailyFile, dailyTrades, { spaces: 2 });

    console.log(`📊 Trade logged: ${symbol} ${signal} ${result} (${confidence}%)`);

    res.status(200).json({
      success: true,
      message: 'Trade logged successfully',
      trade_id: tradeId
    });

  } catch (error) {
    console.error('❌ Error logging trade:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error while logging trade',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}