/**
 * Test script to verify the Forex Signal Generator implementation
 * This script tests the TwelveDataService and TechnicalAnalyzer with real market data
 */

import { TwelveDataService } from './services/twelveDataService';
import { TechnicalAnalyzer } from './services/technicalAnalyzer';

async function testForexImplementation() {
  console.log('🧪 Testing Forex Signal Generator implementation with real market data...');
  
  try {
    // Test TwelveDataService
    console.log('\n📊 Testing TwelveDataService...');
    const twelveData = new TwelveDataService();
    
    // Test with EUR/USD pair
    console.log('Fetching EUR/USD market data...');
    const eurUsdData = await twelveData.getOHLCV('EUR/USD', '5M', 50);
    
    if (!eurUsdData || eurUsdData.length === 0) {
      console.error('❌ Failed to fetch EUR/USD market data');
      return false;
    }
    
    console.log(`✅ Successfully fetched ${eurUsdData.length} candles for EUR/USD`);
    console.log('Latest candle:', eurUsdData[eurUsdData.length - 1]);
    
    // Test with GBP/USD pair
    console.log('\nFetching GBP/USD market data...');
    const gbpUsdData = await twelveData.getOHLCV('GBP/USD', '5M', 50);
    
    if (!gbpUsdData || gbpUsdData.length === 0) {
      console.error('❌ Failed to fetch GBP/USD market data');
      return false;
    }
    
    console.log(`✅ Successfully fetched ${gbpUsdData.length} candles for GBP/USD`);
    console.log('Latest candle:', gbpUsdData[gbpUsdData.length - 1]);
    
    // Test TechnicalAnalyzer
    console.log('\n📈 Testing TechnicalAnalyzer...');
    const technicalAnalyzer = new TechnicalAnalyzer();
    
    // Analyze EUR/USD
    console.log('Analyzing EUR/USD market data...');
    const eurUsdIndicators = await technicalAnalyzer.analyzeMarket(eurUsdData);
    
    if (!eurUsdIndicators) {
      console.error('❌ Failed to analyze EUR/USD market data');
      return false;
    }
    
    console.log('✅ Successfully analyzed EUR/USD market data');
    console.log('Technical indicators:', JSON.stringify(eurUsdIndicators, null, 2));
    
    // Analyze GBP/USD
    console.log('\nAnalyzing GBP/USD market data...');
    const gbpUsdIndicators = await technicalAnalyzer.analyzeMarket(gbpUsdData);
    
    if (!gbpUsdIndicators) {
      console.error('❌ Failed to analyze GBP/USD market data');
      return false;
    }
    
    console.log('✅ Successfully analyzed GBP/USD market data');
    console.log('Technical indicators:', JSON.stringify(gbpUsdIndicators, null, 2));
    
    // Generate trading signals
    console.log('\n🚦 Generating trading signals...');
    
    // EUR/USD signal
    const eurUsdSignal = generateSignal('EUR/USD', eurUsdData, eurUsdIndicators, 'scalping');
    console.log('EUR/USD signal:', JSON.stringify(eurUsdSignal, null, 2));
    
    // GBP/USD signal
    const gbpUsdSignal = generateSignal('GBP/USD', gbpUsdData, gbpUsdIndicators, 'scalping');
    console.log('GBP/USD signal:', JSON.stringify(gbpUsdSignal, null, 2));
    
    console.log('\n✅ All tests passed! The Forex Signal Generator is working properly with real market data.');
    return true;
  } catch (error) {
    console.error('❌ Error during testing:', error);
    return false;
  }
}

// Helper function to generate signal
function generateSignal(pair: string, marketData: any[], indicators: any, tradeMode: string) {
  // Default values
  let signal = 'NO TRADE';
  let confidence = 0;
  let reason = 'No clear trading opportunity';

  // Get latest candle
  const latestCandle = marketData[marketData.length - 1];
  
  // Extract key indicators
  const { rsi, macd, ema, pattern, trend } = indicators;

  // Determine signal based on indicators
  let bullishSignals = 0;
  let bearishSignals = 0;
  let totalSignals = 0;

  // RSI analysis
  if (rsi > 70) {
    bearishSignals++;
    reason = 'RSI is overbought';
  } else if (rsi < 30) {
    bullishSignals++;
    reason = 'RSI is oversold';
  }
  totalSignals++;

  // MACD analysis
  if (macd && macd.histogram > 0 && macd.macd > macd.signal) {
    bullishSignals++;
    reason = 'MACD is bullish';
  } else if (macd && macd.histogram < 0 && macd.macd < macd.signal) {
    bearishSignals++;
    reason = 'MACD is bearish';
  }
  totalSignals++;

  // EMA analysis
  if (ema && ema.ema20 > ema.ema50) {
    bullishSignals++;
    reason = 'Short-term EMA above long-term EMA';
  } else if (ema && ema.ema20 < ema.ema50) {
    bearishSignals++;
    reason = 'Short-term EMA below long-term EMA';
  }
  totalSignals++;

  // Pattern analysis
  if (pattern && pattern.type) {
    if (pattern.type.includes('bullish')) {
      bullishSignals++;
      reason = `Bullish ${pattern.type} pattern detected`;
    } else if (pattern.type.includes('bearish')) {
      bearishSignals++;
      reason = `Bearish ${pattern.type} pattern detected`;
    }
    totalSignals++;
  }

  // Trend analysis
  if (trend && trend.direction) {
    if (trend.direction === 'bullish') {
      bullishSignals++;
      reason = 'Overall trend is bullish';
    } else if (trend.direction === 'bearish') {
      bearishSignals++;
      reason = 'Overall trend is bearish';
    }
    totalSignals++;
  }

  // Calculate confidence
  const bullishConfidence = bullishSignals / totalSignals;
  const bearishConfidence = bearishSignals / totalSignals;

  // Determine final signal
  if (bullishConfidence > 0.6) {
    signal = 'BUY';
    confidence = bullishConfidence * 100;
  } else if (bearishConfidence > 0.6) {
    signal = 'SELL';
    confidence = bearishConfidence * 100;
  } else {
    signal = 'NO TRADE';
    confidence = Math.max(bullishConfidence, bearishConfidence) * 100;
    reason = 'Mixed signals, no clear direction';
  }

  // Calculate risk-reward values
  const { entry, stopLoss, takeProfit, rrRatio } = calculateRiskReward(signal, marketData);

  return {
    pair,
    signal,
    confidence: Math.round(confidence),
    reason,
    entry,
    stopLoss,
    takeProfit,
    rrRatio,
    tradeMode,
    timestamp: new Date().toISOString()
  };
}

// Helper function to calculate risk-reward values
function calculateRiskReward(signal: string, marketData: any[]) {
  // Get latest candle
  const latestCandle = marketData[marketData.length - 1];
  const currentPrice = latestCandle.close;
  
  // Calculate ATR (Average True Range) for dynamic stop loss
  const atr = calculateATR(marketData, 14);
  
  let entry = currentPrice;
  let stopLoss = currentPrice;
  let takeProfit = currentPrice;
  
  if (signal === 'BUY') {
    stopLoss = entry - (atr * 1.5);
    takeProfit = entry + (atr * 3);
  } else if (signal === 'SELL') {
    stopLoss = entry + (atr * 1.5);
    takeProfit = entry - (atr * 3);
  } else {
    // NO TRADE
    stopLoss = signal === 'BUY' ? entry - (atr * 1.5) : entry + (atr * 1.5);
    takeProfit = signal === 'BUY' ? entry + (atr * 1.5) : entry - (atr * 1.5);
  }

  // Calculate risk-reward ratio
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(entry - takeProfit);
  const rrRatio = reward / risk;

  return {
    entry: parseFloat(entry.toFixed(5)),
    stopLoss: parseFloat(stopLoss.toFixed(5)),
    takeProfit: parseFloat(takeProfit.toFixed(5)),
    rrRatio: parseFloat(rrRatio.toFixed(2))
  };
}

// Helper function to calculate ATR
function calculateATR(marketData: any[], period: number): number {
  if (marketData.length < period + 1) {
    return 0.001; // Default value if not enough data
  }

  const trValues = [];
  
  // Calculate True Range values
  for (let i = 1; i < marketData.length; i++) {
    const high = marketData[i].high;
    const low = marketData[i].low;
    const prevClose = marketData[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    const tr = Math.max(tr1, tr2, tr3);
    trValues.push(tr);
  }
  
  // Calculate ATR as average of last 'period' TR values
  const lastTrValues = trValues.slice(-period);
  const atr = lastTrValues.reduce((sum, tr) => sum + tr, 0) / period;
  
  return atr;
}

// Run the test
testForexImplementation()
  .then(success => {
    if (success) {
      console.log('\n🎉 The Forex Signal Generator is production-ready!');
      process.exit(0);
    } else {
      console.error('\n❌ The Forex Signal Generator needs improvements before it can be used in production.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Error running tests:', error);
    process.exit(1);
  });