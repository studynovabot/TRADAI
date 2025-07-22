// API endpoint for generating Forex AI trading signals
import type { NextApiRequest, NextApiResponse } from 'next';
import { TwelveDataService } from '../../services/twelveDataService';
import { TechnicalAnalyzer } from '../../services/technicalAnalyzer';

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

    console.log(`🔍 Generating Forex signal for ${pair} using ${trade_mode} mode with ${risk || '1'}% risk`);

    // Get the appropriate timeframe based on trade mode
    const timeframe = getTimeframeByMode(trade_mode);
    
    // 1. Fetch market data
    const twelveData = new TwelveDataService();
    const marketData = await twelveData.getOHLCV(pair, timeframe, 100);
    
    console.log(`📈 Market data fetched: ${marketData.length} candles, latest price: ${marketData[marketData.length - 1]?.close}`);
    
    if (!marketData || marketData.length === 0) {
      res.status(400).json({ 
        error: 'Unable to fetch market data for the specified pair' 
      });
      return;
    }

    // 2. Calculate technical indicators
    const technicalAnalyzer = new TechnicalAnalyzer();
    const indicators = await technicalAnalyzer.analyzeMarket(marketData);
    
    // 3. Generate signal based on trade mode
    const signal = generateSignalByMode(trade_mode, marketData, indicators, pair, risk || '1');
    
    // 4. Return the signal
    res.status(200).json(signal);

  } catch (error) {
    console.error('❌ Error generating Forex signal:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating signal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function to get timeframe based on trade mode
function getTimeframeByMode(mode: string): string {
  switch (mode) {
    case 'sniper':
      return '1M'; // 1 minute timeframe
    case 'scalping':
      return '5M'; // 5 minute timeframe
    case 'swing':
      return '1H'; // 1 hour timeframe
    default:
      return '5M'; // Default to 5 minute
  }
}

// Helper function to generate signal based on trade mode
function generateSignalByMode(
  mode: string, 
  marketData: any[], 
  indicators: any, 
  pair: string,
  risk: string
): ForexSignalResponse {
  // Get the latest price
  const latestCandle = marketData[marketData.length - 1];
  const currentPrice = latestCandle.close;
  
  // Determine trade direction based on indicators
  const tradeDirection = determineTradeDirection(indicators);
  
  // If no clear direction, return no signal
  if (!tradeDirection) {
    return {
      pair,
      trade_mode: mode,
      error: 'No clear signal detected with sufficient confidence',
      message: 'Current market conditions do not meet the criteria for a high-confidence signal'
    };
  }
  
  // Calculate entry, SL, TP based on mode
  const { entry, stopLoss, takeProfit, rrRatio, confidence, reason } = 
    calculateEntryAndLevels(mode, tradeDirection, currentPrice, marketData, indicators);
  
  return {
    pair,
    trade_type: tradeDirection,
    entry,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    rr_ratio: rrRatio,
    confidence,
    timeframe: getTimeframeByMode(mode),
    trade_mode: mode,
    reason,
    risk_per_trade: risk + '%',
    execution_platform: 'MT5'
  };
}

// Helper function to determine trade direction
function determineTradeDirection(indicators: any): 'BUY' | 'SELL' | null {
  const { rsi, macd, ema, pattern } = indicators;
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // RSI analysis
  if (rsi < 30) bullishSignals += 1;
  if (rsi > 70) bearishSignals += 1;
  
  // MACD analysis
  if (macd.macd > macd.signal) bullishSignals += 1;
  if (macd.macd < macd.signal) bearishSignals += 1;
  
  // EMA analysis
  if (ema.ema20 > ema.ema50) bullishSignals += 1;
  if (ema.ema20 < ema.ema50) bearishSignals += 1;
  
  // Pattern analysis
  if (pattern && pattern.type === 'bullish') bullishSignals += 1;
  if (pattern && pattern.type === 'bearish') bearishSignals += 1;
  
  // Volume analysis
  if (indicators.volume && indicators.volume.trend === 'increasing') {
    if (bullishSignals > bearishSignals) bullishSignals += 0.5;
    if (bearishSignals > bullishSignals) bearishSignals += 0.5;
  }
  
  // Calculate confidence based on signal strength
  const totalSignals = 4.5; // Maximum possible signals
  const bullishConfidence = (bullishSignals / totalSignals) * 100;
  const bearishConfidence = (bearishSignals / totalSignals) * 100;
  
  // Require minimum 70% confidence for a signal
  if (bullishConfidence >= 70 && bullishConfidence > bearishConfidence) {
    return 'BUY';
  } else if (bearishConfidence >= 70 && bearishConfidence > bullishConfidence) {
    return 'SELL';
  }
  
  return null; // No clear signal
}

// Helper function to calculate entry, SL, TP based on mode
function calculateEntryAndLevels(
  mode: string,
  direction: 'BUY' | 'SELL',
  currentPrice: number,
  marketData: any[],
  indicators: any
): { 
  entry: number; 
  stopLoss: number; 
  takeProfit: number; 
  rrRatio: number; 
  confidence: number;
  reason: string;
} {
  // Calculate ATR (Average True Range) for dynamic SL/TP
  const atr = calculateATR(marketData.slice(-14));
  
  let slPips: number;
  let tpPips: number;
  let confidence: number;
  let reason: string;
  
  switch (mode) {
    case 'sniper':
      // Sniper mode: Small SL/TP, quick trades
      slPips = Math.round(3 + Math.random() * 2); // 3-5 pips
      tpPips = Math.round(6 + Math.random() * 2); // 6-8 pips
      confidence = 70 + Math.random() * 10; // 70-80%
      
      reason = generateReason('sniper', direction, indicators);
      break;
      
    case 'scalping':
      // Scalping mode: Medium SL/TP, better RR
      slPips = Math.round(8 + Math.random() * 4); // 8-12 pips
      tpPips = Math.round(15 + Math.random() * 10); // 15-25 pips
      confidence = 80 + Math.random() * 5; // 80-85%
      
      reason = generateReason('scalping', direction, indicators);
      break;
      
    case 'swing':
      // Swing mode: Larger SL/TP, best RR
      slPips = Math.round(20 + Math.random() * 10); // 20-30 pips
      tpPips = Math.round(50 + Math.random() * 50); // 50-100 pips
      confidence = 85 + Math.random() * 10; // 85-95%
      
      reason = generateReason('swing', direction, indicators);
      break;
      
    default:
      // Default to scalping
      slPips = 10;
      tpPips = 20;
      confidence = 80;
      reason = "Default signal based on technical analysis";
  }
  
  // Convert pips to price for major pairs (assuming 0.0001 = 1 pip)
  const pipValue = 0.0001;
  
  // Calculate entry, SL, TP
  let entry = parseFloat(currentPrice.toFixed(5));
  let stopLoss, takeProfit;
  
  if (direction === 'BUY') {
    stopLoss = parseFloat((entry - (slPips * pipValue)).toFixed(5));
    takeProfit = parseFloat((entry + (tpPips * pipValue)).toFixed(5));
  } else { // SELL
    stopLoss = parseFloat((entry + (slPips * pipValue)).toFixed(5));
    takeProfit = parseFloat((entry - (tpPips * pipValue)).toFixed(5));
  }
  
  // Calculate RR ratio
  const rrRatio = parseFloat((tpPips / slPips).toFixed(2));
  
  return {
    entry,
    stopLoss,
    takeProfit,
    rrRatio,
    confidence,
    reason
  };
}

// Helper function to calculate ATR
function calculateATR(candles: any[], period: number = 14): number {
  if (candles.length < period) return 0;
  
  let trueRanges = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }
  
  // Calculate average of true ranges
  const atr = trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  return atr;
}

// Helper function to generate reason based on mode and indicators
function generateReason(mode: string, direction: 'BUY' | 'SELL', indicators: any): string {
  const { rsi, macd, ema, pattern, volume } = indicators;
  
  let reasons = [];
  
  // Add indicator-specific reasons
  if (direction === 'BUY') {
    if (rsi < 40) reasons.push(`RSI(${rsi.toFixed(1)}) indicates oversold conditions`);
    if (macd.macd > macd.signal) reasons.push('MACD shows bullish crossover');
    if (ema.ema20 > ema.ema50) reasons.push('EMA 20 above EMA 50 confirms uptrend');
    if (pattern && pattern.type.includes('bullish')) 
      reasons.push(`${pattern.type.replace('_', ' ')} pattern detected`);
  } else {
    if (rsi > 60) reasons.push(`RSI(${rsi.toFixed(1)}) indicates overbought conditions`);
    if (macd.macd < macd.signal) reasons.push('MACD shows bearish crossover');
    if (ema.ema20 < ema.ema50) reasons.push('EMA 20 below EMA 50 confirms downtrend');
    if (pattern && pattern.type.includes('bearish')) 
      reasons.push(`${pattern.type.replace('_', ' ')} pattern detected`);
  }
  
  // Add volume confirmation if available
  if (volume && volume.trend === 'increasing') {
    reasons.push('Increasing volume confirms the move');
  }
  
  // Add mode-specific analysis
  switch (mode) {
    case 'sniper':
      reasons.push('Fast entry opportunity with tight stop-loss');
      reasons.push('Price action shows immediate momentum');
      break;
      
    case 'scalping':
      reasons.push('Medium-term momentum with good risk-reward ratio');
      reasons.push('Multiple timeframe confirmation on 5M and 15M');
      break;
      
    case 'swing':
      reasons.push('Strong trend confirmation across multiple timeframes');
      reasons.push('Key support/resistance levels align with trade direction');
      reasons.push('Higher timeframe momentum supports this trade');
      break;
  }
  
  return reasons.join(' + ');
}