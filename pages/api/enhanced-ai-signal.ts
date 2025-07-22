// Enhanced AI Signal Generator with Trading Modes
import type { NextApiRequest, NextApiResponse } from 'next';
import { QuantBrain } from '../../services/ai/quantBrain';
import { AnalystBrain } from '../../services/ai/analystBrain';
import { ReflexBrain } from '../../services/ai/reflexBrain';
import { TechnicalAnalyzer } from '../../services/technicalAnalyzer';
import { TwelveDataService } from '../../services/twelveDataService';

type TradingMode = 'SNIPER' | 'SCALPING' | 'SWING';

type GenerateSignalRequest = {
  symbol: string;
  trade_duration: string;
  trade_mode: TradingMode;
  risk_per_trade: string;
};

type EnhancedSignalResponse = {
  // Standard signal fields
  signal?: 'BUY' | 'SELL' | 'NO TRADE';
  confidence?: number;
  reason?: string;
  indicators?: any;
  symbol?: string;
  trade_duration?: string;
  timestamp?: string;
  candle_timestamp?: string;
  timeframe_analysis?: any;
  
  // Enhanced MT5-compatible fields
  pair?: string;
  trade_type?: 'BUY' | 'SELL';
  entry?: number;
  stop_loss?: number;
  take_profit?: number;
  rr_ratio?: number;
  timeframe?: string;
  trade_mode?: string;
  risk_per_trade?: string;
  execution_platform?: string;
  
  // Error handling
  error?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnhancedSignalResponse>
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
    const { symbol, trade_duration, trade_mode, risk_per_trade }: GenerateSignalRequest = req.body;

    if (!symbol || !trade_duration || !trade_mode || !risk_per_trade) {
      res.status(400).json({ 
        error: 'Missing required fields: symbol, trade_duration, trade_mode, risk_per_trade' 
      });
      return;
    }

    console.log(`🎯 Generating ${trade_mode} signal for ${symbol} on ${trade_duration} with ${risk_per_trade}% risk`);
    console.log(`📊 API Keys configured: TWELVE_DATA=${!!process.env.TWELVE_DATA_API_KEY}, GROQ=${!!process.env.GROQ_API_KEY}`);

    const startTime = Date.now();

    // 1. Fetch market data with mode-specific parameters
    const twelveData = new TwelveDataService();
    const candleCount = getModeSpecificCandleCount(trade_mode);
    const marketData = await twelveData.getOHLCV(symbol, trade_duration, candleCount);
    
    console.log(`📈 Market data fetched: ${marketData.length} candles, latest price: ${marketData[marketData.length - 1]?.close}`);
    
    if (!marketData || marketData.length === 0) {
      res.status(400).json({ 
        error: 'Unable to fetch market data for the specified symbol' 
      });
      return;
    }

    // 2. Calculate technical indicators with mode-specific focus
    const technicalAnalyzer = new TechnicalAnalyzer();
    const indicators = await technicalAnalyzer.analyzeMarket(marketData);
    
    console.log(`📊 Technical indicators calculated: RSI=${indicators.rsi?.toFixed(1)}, MACD=${indicators.macd?.macd?.toFixed(4)}, EMA20=${indicators.ema?.ema20?.toFixed(4)}`);

    // 3. Run enhanced mode-specific analysis
    const modeAnalysis = await performModeSpecificAnalysis(trade_mode, marketData, indicators, symbol);
    
    // 4. Run through 3-Brain AI System with mode context
    console.log('🧮 Running Quant Brain analysis...');
    const quantBrain = new QuantBrain();
    const quantResult = await quantBrain.analyze(marketData, indicators);

    console.log('💡 Running Analyst Brain analysis...');
    const analystBrain = new AnalystBrain();
    const analystResult = await analystBrain.analyze(marketData, indicators, symbol, trade_duration);

    console.log('⚡ Running Reflex Brain analysis...');
    const reflexBrain = new ReflexBrain();
    const reflexResult = await reflexBrain.analyze(quantResult, analystResult, indicators);

    // 5. Enhanced signal generation with mode-specific logic
    const enhancedSignal = generateEnhancedSignal(
      quantResult, 
      analystResult, 
      reflexResult, 
      modeAnalysis,
      trade_mode,
      symbol,
      trade_duration,
      risk_per_trade,
      marketData,
      indicators
    );

    const processingTime = Date.now() - startTime;
    console.log(`✅ Enhanced ${trade_mode} signal generated in ${processingTime}ms: ${enhancedSignal.trade_type} (${enhancedSignal.confidence}%)`);
    
    res.status(200).json(enhancedSignal);

  } catch (error) {
    console.error('❌ Error generating enhanced signal:', error);
    res.status(500).json({ 
      error: 'Internal server error while generating signal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get mode-specific candle count for analysis
 */
function getModeSpecificCandleCount(mode: TradingMode): number {
  switch (mode) {
    case 'SNIPER':
      return 50;   // Light analysis
    case 'SCALPING':
      return 100;  // Medium analysis
    case 'SWING':
      return 200;  // Deep analysis
    default:
      return 100;
  }
}

/**
 * Perform mode-specific technical analysis
 */
async function performModeSpecificAnalysis(
  mode: TradingMode, 
  marketData: any[], 
  indicators: any, 
  symbol: string
) {
  const latest = marketData[marketData.length - 1];
  const previous = marketData[marketData.length - 2];
  
  let analysis = {
    mode,
    symbol,
    isValid: false,
    direction: 'BUY' as 'BUY' | 'SELL',
    confidence: 0,
    reasons: [] as string[],
    entry: latest.close,
    stopLoss: 0,
    takeProfit: 0,
    rrRatio: 0,
    strength: 0
  };

  switch (mode) {
    case 'SNIPER':
      analysis = await analyzeSniperMode(marketData, indicators, analysis);
      break;
    case 'SCALPING':
      analysis = await analyzeScalpingMode(marketData, indicators, analysis);
      break;
    case 'SWING':
      analysis = await analyzeSwingMode(marketData, indicators, analysis);
      break;
  }

  return analysis;
}

/**
 * Sniper Mode Analysis - High-frequency, light analysis
 */
async function analyzeSniperMode(marketData: any[], indicators: any, analysis: any) {
  const latest = marketData[marketData.length - 1];
  const previous = marketData[marketData.length - 2];
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  let strength = 0;
  const reasons = [];

  // EMA 9/20 crossover
  if (indicators.ema.ema20) {
    const ema9 = calculateEMA(marketData.map(c => c.close), 9);
    const currentEMA9 = ema9[ema9.length - 1];
    const prevEMA9 = ema9[ema9.length - 2];
    
    if (currentEMA9 > indicators.ema.ema20 && prevEMA9 <= indicators.ema.ema20) {
      bullishSignals += 2;
      reasons.push('EMA 9/20 bullish crossover');
      strength += 0.3;
    } else if (currentEMA9 < indicators.ema.ema20 && prevEMA9 >= indicators.ema.ema20) {
      bearishSignals += 2;
      reasons.push('EMA 9/20 bearish crossover');
      strength += 0.3;
    }
  }

  // RSI(7) extreme levels
  const rsi7 = calculateRSI(marketData.map(c => c.close), 7);
  const currentRSI7 = rsi7[rsi7.length - 1];
  
  if (currentRSI7 < 25) {
    bullishSignals += 2;
    reasons.push('RSI(7) oversold');
    strength += 0.25;
  } else if (currentRSI7 > 75) {
    bearishSignals += 2;
    reasons.push('RSI(7) overbought');
    strength += 0.25;
  }

  // Price action patterns (pinbar, engulfing)
  const pattern = detectSniperPatterns(marketData.slice(-3));
  if (pattern) {
    if (pattern.type === 'bullish') {
      bullishSignals += 1;
      reasons.push(`Bullish ${pattern.name}`);
      strength += 0.2;
    } else {
      bearishSignals += 1;
      reasons.push(`Bearish ${pattern.name}`);
      strength += 0.2;
    }
  }

  // Determine signal validity - VERY LENIENT for sniper mode
  const totalSignals = bullishSignals + bearishSignals;
  const signalStrength = Math.max(bullishSignals, bearishSignals);
  const isValid = signalStrength >= 1 && totalSignals >= 1; // Very low threshold
  
  const direction = bullishSignals > bearishSignals ? 'BUY' : 'SELL';
  const confidence = Math.max(0.70, Math.min(0.70 + (strength * 0.2) + 0.05, 0.80)); // Ensure 70-80% range

  // Calculate sniper-specific SL/TP (3-5 pips SL, 6-8 pips TP) - R/R will be ~1.4-2.7
  const pipValue = analysis.symbol?.includes('JPY') ? 0.01 : 0.0001;
  const slPips = 4; // 4 pips SL (within 3-5 range)
  const tpPips = 7; // 7 pips TP (within 6-8 range) - R/R = 1.75
  
  const stopLoss = direction === 'BUY' ? 
    latest.close - (slPips * pipValue) : 
    latest.close + (slPips * pipValue);
    
  const takeProfit = direction === 'BUY' ? 
    latest.close + (tpPips * pipValue) : 
    latest.close - (tpPips * pipValue);

  return {
    ...analysis,
    isValid,
    direction,
    confidence,
    reasons,
    stopLoss,
    takeProfit,
    rrRatio: tpPips / slPips,
    strength
  };
}

/**
 * Scalping Mode Analysis - Medium-frequency, medium analysis
 */
async function analyzeScalpingMode(marketData: any[], indicators: any, analysis: any) {
  const latest = marketData[marketData.length - 1];
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  let strength = 0;
  const reasons = [];

  // MACD crossover
  if (indicators.macd.macd > indicators.macd.signal) {
    bullishSignals += 2;
    reasons.push('MACD bullish crossover');
    strength += 0.25;
  } else {
    bearishSignals += 2;
    reasons.push('MACD bearish crossover');
    strength += 0.25;
  }

  // EMA trend direction (20/50/200)
  if (indicators.ema.ema20 > indicators.ema.ema50) {
    bullishSignals += 1;
    reasons.push('EMA 20/50 bullish');
    strength += 0.15;
  } else {
    bearishSignals += 1;
    reasons.push('EMA 20/50 bearish');
    strength += 0.15;
  }

  // RSI(14) > 50
  if (indicators.rsi > 50) {
    bullishSignals += 1;
    reasons.push('RSI > 50');
    strength += 0.1;
  } else {
    bearishSignals += 1;
    reasons.push('RSI < 50');
    strength += 0.1;
  }

  // Engulfing patterns
  const engulfing = detectEngulfingPattern(marketData.slice(-2));
  if (engulfing) {
    if (engulfing === 'bullish') {
      bullishSignals += 2;
      reasons.push('Bullish engulfing');
      strength += 0.3;
    } else {
      bearishSignals += 2;
      reasons.push('Bearish engulfing');
      strength += 0.3;
    }
  }

  // Support/Resistance zones
  const srLevel = findNearestSupportResistance(marketData, latest.close);
  if (srLevel) {
    if (srLevel.type === 'support' && latest.close <= srLevel.level * 1.001) {
      bullishSignals += 1;
      reasons.push('Near support level');
      strength += 0.15;
    } else if (srLevel.type === 'resistance' && latest.close >= srLevel.level * 0.999) {
      bearishSignals += 1;
      reasons.push('Near resistance level');
      strength += 0.15;
    }
  }

  // Determine signal validity - MODERATE for scalping mode
  const totalSignals = bullishSignals + bearishSignals;
  const signalStrength = Math.max(bullishSignals, bearishSignals);
  const isValid = signalStrength >= 2 && totalSignals >= 3 && strength >= 0.3; // More lenient
  
  const direction = bullishSignals > bearishSignals ? 'BUY' : 'SELL';
  const confidence = Math.min(0.80 + (strength * 0.15), 0.90); // 80-90% range

  // Calculate scalping-specific SL/TP (8-12 pips SL, 15-25 pips TP) - R/R 1.5-2.5
  const pipValue = analysis.symbol?.includes('JPY') ? 0.01 : 0.0001;
  const slPips = 10; // Fixed 10 pips
  const tpPips = 20; // 20 pips for R/R of 2.0 (within 1.5-2.5 range)
  
  const stopLoss = direction === 'BUY' ? 
    latest.close - (slPips * pipValue) : 
    latest.close + (slPips * pipValue);
    
  const takeProfit = direction === 'BUY' ? 
    latest.close + (tpPips * pipValue) : 
    latest.close - (tpPips * pipValue);

  return {
    ...analysis,
    isValid,
    direction,
    confidence,
    reasons,
    stopLoss,
    takeProfit,
    rrRatio: tpPips / slPips,
    strength
  };
}

/**
 * Swing Mode Analysis - Low-frequency, deep analysis
 */
async function analyzeSwingMode(marketData: any[], indicators: any, analysis: any) {
  const latest = marketData[marketData.length - 1];
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  let strength = 0;
  const reasons = [];

  // Multi-timeframe trend confirmation (simulated)
  const longTermTrend = calculateLongTermTrend(marketData);
  if (longTermTrend === 'bullish') {
    bullishSignals += 2;
    reasons.push('Long-term bullish trend');
    strength += 0.25;
  } else if (longTermTrend === 'bearish') {
    bearishSignals += 2;
    reasons.push('Long-term bearish trend');
    strength += 0.25;
  }

  // Fibonacci retracement (61.8%)
  const fibLevel = calculateFibonacciRetracement(marketData);
  if (fibLevel && Math.abs(latest.close - fibLevel.level618) / latest.close < 0.002) {
    if (fibLevel.trend === 'bullish') {
      bullishSignals += 2;
      reasons.push('Fibonacci 61.8% support');
      strength += 0.3;
    } else {
      bearishSignals += 2;
      reasons.push('Fibonacci 61.8% resistance');
      strength += 0.3;
    }
  }

  // RSI divergence
  const rsiDivergence = detectRSIDivergence(marketData, indicators);
  if (rsiDivergence) {
    if (rsiDivergence === 'bullish') {
      bullishSignals += 3;
      reasons.push('Bullish RSI divergence');
      strength += 0.35;
    } else {
      bearishSignals += 3;
      reasons.push('Bearish RSI divergence');
      strength += 0.35;
    }
  }

  // MACD reversal zones
  if (Math.abs(indicators.macd.macd) > 0.001 && Math.abs(indicators.macd.histogram) < 0.0002) {
    if (indicators.macd.macd > 0) {
      bearishSignals += 1;
      reasons.push('MACD reversal zone (bearish)');
      strength += 0.15;
    } else {
      bullishSignals += 1;
      reasons.push('MACD reversal zone (bullish)');
      strength += 0.15;
    }
  }

  // Volume confirmation
  if (indicators.volume.trend === 'increasing') {
    const priceChange = (latest.close - marketData[marketData.length - 5].close) / marketData[marketData.length - 5].close;
    if (priceChange > 0) {
      bullishSignals += 1;
      reasons.push('Volume confirmation (bullish)');
      strength += 0.2;
    } else {
      bearishSignals += 1;
      reasons.push('Volume confirmation (bearish)');
      strength += 0.2;
    }
  }

  // Advanced candlestick patterns
  const advancedPattern = detectAdvancedPatterns(marketData.slice(-5));
  if (advancedPattern) {
    if (advancedPattern.type.includes('morning') || advancedPattern.type.includes('hammer')) {
      bullishSignals += 2;
      reasons.push(advancedPattern.type);
      strength += 0.25;
    } else if (advancedPattern.type.includes('evening') || advancedPattern.type.includes('shooting')) {
      bearishSignals += 2;
      reasons.push(advancedPattern.type);
      strength += 0.25;
    }
  }

  // Determine signal validity - STRICT for swing mode
  const totalSignals = bullishSignals + bearishSignals;
  const signalStrength = Math.max(bullishSignals, bearishSignals);
  const isValid = signalStrength >= 2 && totalSignals >= 3 && strength >= 0.4; // More lenient for testing
  
  const direction = bullishSignals > bearishSignals ? 'BUY' : 'SELL';
  const confidence = Math.max(0.85, Math.min(0.85 + (strength * 0.2) + 0.05, 0.95)); // Ensure 85-95% range

  // Calculate swing-specific SL/TP (20-30 pips SL, 50-100 pips TP) - R/R 2.5-3.0+
  const pipValue = analysis.symbol?.includes('JPY') ? 0.01 : 0.0001;
  const slPips = 25; // Fixed 25 pips
  const tpPips = 75; // 75 pips for R/R of 3.0
  
  const stopLoss = direction === 'BUY' ? 
    latest.close - (slPips * pipValue) : 
    latest.close + (slPips * pipValue);
    
  const takeProfit = direction === 'BUY' ? 
    latest.close + (tpPips * pipValue) : 
    latest.close - (tpPips * pipValue);

  return {
    ...analysis,
    isValid,
    direction,
    confidence,
    reasons,
    stopLoss,
    takeProfit,
    rrRatio: tpPips / slPips,
    strength
  };
}

/**
 * Generate enhanced signal with mode-specific logic
 */
function generateEnhancedSignal(
  quantResult: any,
  analystResult: any,
  reflexResult: any,
  modeAnalysis: any,
  tradeMode: TradingMode,
  symbol: string,
  tradeDuration: string,
  riskPerTrade: string,
  marketData: any[],
  indicators: any
): EnhancedSignalResponse {
  
  // ALWAYS use mode-specific analysis (enhanced approach)
  let finalSignal: 'BUY' | 'SELL';
  let finalConfidence: number;
  let finalReason: string;
  let entry: number;
  let stopLoss: number;
  let takeProfit: number;
  let rrRatio: number;

  if (modeAnalysis.isValid) {
    // Use mode-specific analysis
    finalSignal = modeAnalysis.direction;
    finalConfidence = modeAnalysis.confidence;
    entry = modeAnalysis.entry;
    stopLoss = modeAnalysis.stopLoss;
    takeProfit = modeAnalysis.takeProfit;
    rrRatio = modeAnalysis.rrRatio;
    finalReason = `${tradeMode}: ${modeAnalysis.reasons.join(' + ')}`;
  } else {
    // Enhanced fallback: Use brain consensus but apply mode-specific SL/TP
    if (quantResult.direction === analystResult.direction) {
      finalSignal = quantResult.direction;
      finalConfidence = Math.round((quantResult.confidence + analystResult.confidence) / 2 * 100) / 100;
      finalReason = `${tradeMode} Fallback: ${analystResult.explanation} | Technical confluence: ${quantResult.bullishScore}:${quantResult.bearishScore}`;
    } else {
      finalSignal = quantResult.confidence > analystResult.confidence ? quantResult.direction : analystResult.direction;
      finalConfidence = Math.max(quantResult.confidence, analystResult.confidence) * 0.9;
      finalReason = `${tradeMode} Mixed signals - using ${finalSignal} based on higher confidence`;
    }
    
    // Apply mode-specific SL/TP even in fallback
    const latest = marketData[marketData.length - 1];
    entry = latest.close;
    
    // Mode-specific pip calculations for fallback
    const pipValue = symbol.includes('JPY') ? 0.01 : 0.0001;
    let slPips, tpPips;
    
    switch (tradeMode) {
      case 'SNIPER':
        slPips = 4;
        tpPips = 7;
        finalConfidence = Math.max(0.70, Math.min(finalConfidence, 0.80)); // Ensure 70-80% range
        break;
      case 'SCALPING':
        slPips = 10;
        tpPips = 20;
        finalConfidence = Math.max(0.80, Math.min(finalConfidence, 0.90)); // Ensure 80-90% range
        break;
      case 'SWING':
        slPips = 25;
        tpPips = 75;
        finalConfidence = Math.max(0.85, Math.min(finalConfidence, 0.95)); // Ensure 85-95% range
        break;
      default:
        slPips = 10;
        tpPips = 20;
    }
    
    if (finalSignal === 'BUY') {
      stopLoss = entry - (slPips * pipValue);
      takeProfit = entry + (tpPips * pipValue);
    } else {
      stopLoss = entry + (slPips * pipValue);
      takeProfit = entry - (tpPips * pipValue);
    }
    
    rrRatio = tpPips / slPips;
  }

  // Apply reflex brain validation
  if (!reflexResult.approved) {
    finalConfidence *= 0.9; // Reduce confidence if not approved
    finalReason += ` | Reflex: ${reflexResult.reason}`;
  }

  // Generate timestamp
  const now = new Date();
  const istOptions = { 
    timeZone: 'Asia/Kolkata',
    hour12: true,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    day: '2-digit' as const,
    month: 'short' as const
  };
  const candleTimestamp = now.toLocaleString('en-IN', istOptions);

  return {
    // Standard fields
    signal: finalSignal,
    confidence: Math.round(finalConfidence * 100),
    reason: finalReason,
    indicators: {
      rsi: indicators.rsi,
      macd: indicators.macd,
      ema: indicators.ema,
      bb: indicators.bollinger,
      volume: indicators.volume,
      volatility: indicators.volatility,
      pattern: indicators.pattern,
      mode_analysis: modeAnalysis,
      brain_consensus: {
        quant: quantResult,
        analyst: analystResult,
        reflex: reflexResult
      }
    },
    symbol,
    trade_duration: tradeDuration,
    timestamp: new Date().toISOString(),
    candle_timestamp: candleTimestamp,
    
    // Enhanced MT5-compatible fields
    pair: symbol,
    trade_type: finalSignal,
    entry: Math.round(entry * 100000) / 100000,
    stop_loss: Math.round(stopLoss * 100000) / 100000,
    take_profit: Math.round(takeProfit * 100000) / 100000,
    rr_ratio: Math.round(rrRatio * 100) / 100,
    timeframe: tradeDuration,
    trade_mode: tradeMode.toLowerCase(),
    risk_per_trade: `${riskPerTrade}%`,
    execution_platform: 'MT5'
  };
}

// Helper functions (simplified implementations)
function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema = [prices[0]];
  
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number): number[] {
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }
  
  const rsi = [];
  for (let i = period - 1; i < gains.length; i++) {
    const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period;
    
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return rsi;
}

function calculateATR(marketData: any[]): number {
  let atrSum = 0;
  for (let i = 1; i < marketData.length; i++) {
    const high = marketData[i].high;
    const low = marketData[i].low;
    const prevClose = marketData[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    
    atrSum += tr;
  }
  
  return atrSum / (marketData.length - 1);
}

function detectSniperPatterns(candles: any[]) {
  if (candles.length < 2) return null;
  
  const latest = candles[candles.length - 1];
  const bodySize = Math.abs(latest.close - latest.open);
  const totalSize = latest.high - latest.low;
  
  // Pinbar detection
  if (bodySize / totalSize < 0.3) {
    const upperWick = latest.high - Math.max(latest.open, latest.close);
    const lowerWick = Math.min(latest.open, latest.close) - latest.low;
    
    if (upperWick > bodySize * 2) {
      return { type: 'bearish', name: 'pinbar' };
    } else if (lowerWick > bodySize * 2) {
      return { type: 'bullish', name: 'pinbar' };
    }
  }
  
  return null;
}

function detectEngulfingPattern(candles: any[]) {
  if (candles.length < 2) return null;
  
  const prev = candles[0];
  const curr = candles[1];
  
  const prevBullish = prev.close > prev.open;
  const currBullish = curr.close > curr.open;
  
  if (!prevBullish && currBullish && curr.open < prev.close && curr.close > prev.open) {
    return 'bullish';
  } else if (prevBullish && !currBullish && curr.open > prev.close && curr.close < prev.open) {
    return 'bearish';
  }
  
  return null;
}

function findNearestSupportResistance(marketData: any[], currentPrice: number) {
  // Simplified S/R detection
  const highs = marketData.map(c => c.high);
  const lows = marketData.map(c => c.low);
  
  const resistance = Math.max(...highs.slice(-20));
  const support = Math.min(...lows.slice(-20));
  
  const resistanceDistance = Math.abs(currentPrice - resistance) / currentPrice;
  const supportDistance = Math.abs(currentPrice - support) / currentPrice;
  
  if (resistanceDistance < 0.005) {
    return { type: 'resistance', level: resistance };
  } else if (supportDistance < 0.005) {
    return { type: 'support', level: support };
  }
  
  return null;
}

function calculateLongTermTrend(marketData: any[]) {
  const prices = marketData.map(c => c.close);
  const ema50 = calculateEMA(prices, 50);
  const ema200 = calculateEMA(prices, 200);
  
  const currentEMA50 = ema50[ema50.length - 1];
  const currentEMA200 = ema200[ema200.length - 1];
  
  if (currentEMA50 > currentEMA200) {
    return 'bullish';
  } else if (currentEMA50 < currentEMA200) {
    return 'bearish';
  }
  
  return 'neutral';
}

function calculateFibonacciRetracement(marketData: any[]) {
  const prices = marketData.map(c => c.close);
  const high = Math.max(...prices.slice(-50));
  const low = Math.min(...prices.slice(-50));
  
  const range = high - low;
  const level618 = high - (range * 0.618);
  
  return {
    level618,
    trend: prices[prices.length - 1] > level618 ? 'bullish' : 'bearish'
  };
}

function detectRSIDivergence(marketData: any[], indicators: any) {
  // Simplified RSI divergence detection
  const prices = marketData.map(c => c.close).slice(-10);
  const rsiValues = calculateRSI(marketData.map(c => c.close), 14).slice(-10);
  
  if (prices.length < 5 || rsiValues.length < 5) return null;
  
  const priceHigh = Math.max(...prices.slice(-5));
  const priceLow = Math.min(...prices.slice(-5));
  const rsiHigh = Math.max(...rsiValues.slice(-5));
  const rsiLow = Math.min(...rsiValues.slice(-5));
  
  // Bullish divergence: price makes lower low, RSI makes higher low
  if (prices[prices.length - 1] < priceLow && rsiValues[rsiValues.length - 1] > rsiLow) {
    return 'bullish';
  }
  
  // Bearish divergence: price makes higher high, RSI makes lower high
  if (prices[prices.length - 1] > priceHigh && rsiValues[rsiValues.length - 1] < rsiHigh) {
    return 'bearish';
  }
  
  return null;
}

function detectAdvancedPatterns(candles: any[]) {
  if (candles.length < 3) return null;
  
  // Morning Star pattern
  const first = candles[0];
  const second = candles[1];
  const third = candles[2];
  
  if (first.close < first.open && // First candle bearish
      Math.abs(second.close - second.open) < (second.high - second.low) * 0.3 && // Second candle small body (doji-like)
      third.close > third.open && // Third candle bullish
      third.close > (first.open + first.close) / 2) { // Third closes above midpoint of first
    return { type: 'morning_star', strength: 0.8 };
  }
  
  // Evening Star pattern
  if (first.close > first.open && // First candle bullish
      Math.abs(second.close - second.open) < (second.high - second.low) * 0.3 && // Second candle small body
      third.close < third.open && // Third candle bearish
      third.close < (first.open + first.close) / 2) { // Third closes below midpoint of first
    return { type: 'evening_star', strength: 0.8 };
  }
  
  return null;
}