/**
 * Simple Workflow Accuracy Test for TRADAI
 * 
 * This script tests trading workflows across different timeframes and currencies
 * while respecting the Twelve Data API rate limit of 8 requests per minute.
 */

// Load environment variables from .env file
require('dotenv').config();

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  timeframes: ['1m', '5m', '15m', '30m', '1h'],
  currencies: ['USD/INR', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  candleCount: 15,
  requestsPerMinute: 8, // Twelve Data API rate limit
  requestDelay: Math.ceil(60000 / 8), // Delay between requests in ms
  outputFile: path.join(__dirname, 'test-results', 'workflow-accuracy-test.json')
};

// Results storage
const testResults = {
  startTime: new Date().toISOString(),
  endTime: null,
  summary: {
    totalTests: 0,
    successfulTests: 0,
    failedTests: 0,
    averageAccuracy: 0,
    patternDetected: false,
    patternDetails: null
  },
  detailedResults: []
};

// API configuration
const API_KEY = process.env.TWELVE_DATA_API_KEY || '';
const BASE_URL = 'https://api.twelvedata.com';

// Log API key status
console.log(`🔑 Twelve Data API Key: ${API_KEY ? 'Found' : 'Not found'}`);
if (!API_KEY) {
  console.error('⚠️ ERROR: TWELVE_DATA_API_KEY not found in environment variables!');
  console.error('Please make sure the .env file contains a valid TWELVE_DATA_API_KEY.');
}

/**
 * Main test function
 */
async function runWorkflowAccuracyTests() {
  console.log('🧪 Starting Workflow Accuracy Tests');
  console.log(`📊 Testing ${TEST_CONFIG.timeframes.length} timeframes × ${TEST_CONFIG.currencies.length} currencies with ${TEST_CONFIG.candleCount} candles each`);
  console.log(`⏱️ Rate limit: ${TEST_CONFIG.requestsPerMinute} requests per minute (${TEST_CONFIG.requestDelay}ms delay between requests)`);
  
  // Verify API key before starting tests
  if (!API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY not found in environment variables. Please set a valid API key in the .env file.');
  }
  
  console.log(`🔑 Using Twelve Data API key: ${API_KEY ? '***' + API_KEY.substring(API_KEY.length - 4) : 'NOT FOUND'}`);
  
  // Ensure output directory exists
  await fs.ensureDir(path.dirname(TEST_CONFIG.outputFile));
  
  // Track total tests
  let totalTests = TEST_CONFIG.timeframes.length * TEST_CONFIG.currencies.length;
  let completedTests = 0;
  let accuracyValues = [];
  
  // Run tests for each currency and timeframe combination
  for (const currency of TEST_CONFIG.currencies) {
    for (const timeframe of TEST_CONFIG.timeframes) {
      try {
        console.log(`\n🔍 Testing ${currency} on ${timeframe} timeframe`);
        
        // Run the test
        const result = await testWorkflow(currency, timeframe, TEST_CONFIG.candleCount);
        
        // Store result
        testResults.detailedResults.push({
          currency,
          timeframe,
          ...result
        });
        
        // Track accuracy values for pattern detection
        if (result.success) {
          accuracyValues.push(result.accuracy);
        }
        
        // Update summary
        completedTests++;
        testResults.summary.totalTests = completedTests;
        testResults.summary.successfulTests += result.success ? 1 : 0;
        testResults.summary.failedTests += result.success ? 0 : 1;
        
        // Save intermediate results
        await saveResults();
        
        console.log(`✅ Test ${completedTests}/${totalTests} completed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        
        // Respect API rate limit
        if (completedTests < totalTests) {
          console.log(`⏳ Waiting ${TEST_CONFIG.requestDelay}ms before next request...`);
          await delay(TEST_CONFIG.requestDelay);
        }
        
      } catch (error) {
        console.error(`❌ Error testing ${currency} on ${timeframe}:`, error);
        
        // Store error result
        testResults.detailedResults.push({
          currency,
          timeframe,
          success: false,
          error: error.message,
          accuracy: 0,
          signals: []
        });
        
        // Update summary
        completedTests++;
        testResults.summary.totalTests = completedTests;
        testResults.summary.failedTests++;
        
        // Save intermediate results
        await saveResults();
        
        // If this is an API key or rate limit issue, stop all tests
        if (error.message.includes('API key') || 
            error.message.includes('rate limit') || 
            error.message.includes('unauthorized')) {
          console.error('⛔ Critical API error detected. Stopping all tests.');
          break;
        }
      }
    }
  }
  
  // Calculate average accuracy
  if (accuracyValues.length > 0) {
    testResults.summary.averageAccuracy = accuracyValues.reduce((sum, val) => sum + val, 0) / accuracyValues.length;
  }
  
  // Check for patterns in accuracy values
  const patternAnalysis = detectAccuracyPatterns(accuracyValues);
  testResults.summary.patternDetected = patternAnalysis.patternDetected;
  testResults.summary.patternDetails = patternAnalysis.details;
  
  // Finalize results
  testResults.endTime = new Date().toISOString();
  await saveResults();
  
  // Print summary
  console.log('\n📋 Test Summary:');
  console.log(`Total Tests: ${testResults.summary.totalTests}`);
  console.log(`Successful: ${testResults.summary.successfulTests}`);
  console.log(`Failed: ${testResults.summary.failedTests}`);
  console.log(`Average Accuracy: ${(testResults.summary.averageAccuracy * 100).toFixed(2)}%`);
  console.log(`Pattern Detected: ${testResults.summary.patternDetected ? 'YES ⚠️' : 'NO ✅'}`);
  
  if (testResults.summary.patternDetected) {
    console.log('\n⚠️ PATTERN DETECTED: This suggests fallback accuracy is occurring instead of proper analysis');
    console.log('Pattern Details:', testResults.summary.patternDetails);
  }
  
  console.log(`\n✅ Results saved to: ${TEST_CONFIG.outputFile}`);
  
  return testResults;
}

/**
 * Test a specific workflow
 */
async function testWorkflow(currency, timeframe, candleCount) {
  try {
    // Fetch market data
    console.log(`📊 Fetching ${candleCount} candles for ${currency} on ${timeframe} timeframe`);
    const candles = await fetchMarketData(currency, timeframe, candleCount);
    
    if (!candles || candles.length < candleCount) {
      throw new Error(`Insufficient data: Got ${candles ? candles.length : 0} candles, expected ${candleCount}`);
    }
    
    // Generate signals for each candle
    const signals = [];
    let correctPredictions = 0;
    
    for (let i = 0; i < candles.length - 1; i++) {
      // Use current candle to predict next candle
      const currentCandle = candles[i];
      const nextCandle = candles[i + 1];
      
      // Simulate a trading decision using technical indicators
      const signal = simulateTradingDecision(candles.slice(0, i + 1));
      
      // Evaluate prediction accuracy
      const actualDirection = nextCandle.close > currentCandle.close ? 'BUY' : 'SELL';
      const isCorrect = signal.direction === actualDirection;
      
      if (isCorrect) {
        correctPredictions++;
      }
      
      // Store signal with evaluation
      signals.push({
        candle: i + 1,
        timestamp: new Date(currentCandle.timestamp).toISOString(),
        predictedDirection: signal.direction,
        actualDirection,
        confidence: signal.confidence,
        isCorrect
      });
    }
    
    // Calculate accuracy
    const accuracy = correctPredictions / (candles.length - 1);
    
    return {
      success: true,
      accuracy,
      signals,
      candleCount: candles.length
    };
    
  } catch (error) {
    console.error(`❌ Workflow test error:`, error);
    return {
      success: false,
      error: error.message,
      accuracy: 0,
      signals: []
    };
  }
}

/**
 * Fetch market data from Twelve Data API
 */
async function fetchMarketData(symbol, timeframe, count) {
  try {
    // Convert timeframe to Twelve Data format
    const interval = mapTimeframeToInterval(timeframe);
    
    // Require API key - no fallbacks
    if (!API_KEY) {
      throw new Error('TWELVE_DATA_API_KEY not found in environment variables. Please set a valid API key in the .env file.');
    }
    
    const url = `${BASE_URL}/time_series`;
    const params = {
      symbol: symbol,
      interval: interval,
      outputsize: count,
      apikey: API_KEY,
      format: 'JSON'
    };
    
    console.log(`📡 Fetching ${timeframe} data for ${symbol} from Twelve Data API...`);
    console.log(`🔗 Request URL: ${url} with params: ${JSON.stringify(params, (key, value) => key === 'apikey' ? '***' : value)}`);
    
    const response = await axios.get(url, { 
      params,
      timeout: 15000 // 15 second timeout
    });
    
    console.log(`✅ API Response received: Status ${response.status}`);
    
    if (response.data.status === 'error') {
      console.error(`❌ API returned error status: ${response.data.message}`);
      throw new Error(`Twelve Data API Error: ${response.data.message}`);
    }
    
    if (!response.data.values || !Array.isArray(response.data.values) || response.data.values.length === 0) {
      console.error(`❌ No valid data in API response: ${JSON.stringify(response.data)}`);
      throw new Error('No data received from Twelve Data API');
    }
    
    console.log(`📊 Received ${response.data.values.length} candles from API`);
    
    // Parse the data
    const parsedData = parseTimeSeriesData(response.data.values);
    console.log(`✅ Successfully parsed ${parsedData.length} candles`);
    return parsedData;
    
  } catch (error) {
    console.error(`❌ Error fetching market data:`, error);
    if (error.response) {
      console.error(`API Response Status: ${error.response.status}`);
      console.error(`API Response Data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error(`No response received from API. Request details:`, error.request._currentUrl);
    }
    
    // No fallbacks - propagate the error
    throw new Error(`Failed to fetch market data for ${symbol} on ${timeframe}: ${error.message}`);
  }
}

/**
 * Parse time series data from Twelve Data API
 */
function parseTimeSeriesData(values) {
  if (!Array.isArray(values)) return [];
  
  return values.map(candle => {
    const open = parseFloat(candle.open);
    const high = parseFloat(candle.high);
    const low = parseFloat(candle.low);
    const close = parseFloat(candle.close);
    let volume = parseFloat(candle.volume || 0);
    
    // For forex pairs, generate synthetic volume based on price movement and range
    if (volume === 0 || volume < 1) {
      const priceRange = high - low;
      const bodySize = Math.abs(close - open);
      const volatility = priceRange / close;
      
      // Synthetic volume based on volatility and price movement
      volume = Math.max(1000, Math.round(volatility * 1000000 + bodySize * 500000));
    }
    
    return {
      timestamp: new Date(candle.datetime).getTime(),
      open,
      high,
      low,
      close,
      volume
    };
  }).sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
}

// No mock data generation - we only use real data

/**
 * Map timeframe to Twelve Data interval
 */
function mapTimeframeToInterval(timeframe) {
  const mapping = {
    '1m': '1min',
    '3m': '3min',
    '5m': '5min',
    '15m': '15min',
    '30m': '30min',
    '1h': '1h',
    '4h': '4h',
    '1d': '1day'
  };
  
  return mapping[timeframe] || '5min';
}

/**
 * Simulate a trading decision using technical indicators
 */
function simulateTradingDecision(candles) {
  if (candles.length < 5) {
    return { direction: Math.random() > 0.5 ? 'BUY' : 'SELL', confidence: 0.5 };
  }
  
  // Calculate simple moving averages
  const sma5 = calculateSMA(candles, 5);
  const sma10 = calculateSMA(candles, Math.min(10, candles.length));
  
  // Calculate RSI
  const rsi = calculateRSI(candles, 14);
  
  // Calculate MACD
  const macd = calculateMACD(candles);
  
  // Make decision based on indicators
  let buySignals = 0;
  let sellSignals = 0;
  
  // SMA signals
  if (sma5 > sma10) buySignals++;
  else sellSignals++;
  
  // RSI signals
  if (rsi < 30) buySignals += 2; // Oversold
  else if (rsi > 70) sellSignals += 2; // Overbought
  
  // MACD signals
  if (macd.histogram > 0 && macd.histogram > macd.previousHistogram) buySignals++;
  else if (macd.histogram < 0 && macd.histogram < macd.previousHistogram) sellSignals++;
  
  // Candlestick pattern signals
  const lastCandle = candles[candles.length - 1];
  const previousCandle = candles[candles.length - 2];
  
  // Bullish engulfing
  if (lastCandle.close > lastCandle.open && 
      previousCandle.close < previousCandle.open &&
      lastCandle.open < previousCandle.close &&
      lastCandle.close > previousCandle.open) {
    buySignals += 2;
  }
  
  // Bearish engulfing
  if (lastCandle.close < lastCandle.open && 
      previousCandle.close > previousCandle.open &&
      lastCandle.open > previousCandle.close &&
      lastCandle.close < previousCandle.open) {
    sellSignals += 2;
  }
  
  // Calculate confidence based on signal strength
  const totalSignals = buySignals + sellSignals;
  const confidence = totalSignals > 0 ? Math.max(buySignals, sellSignals) / totalSignals : 0.5;
  
  // Determine direction
  const direction = buySignals > sellSignals ? 'BUY' : 'SELL';
  
  return { direction, confidence };
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(candles, period) {
  if (candles.length < period) return null;
  
  const prices = candles.slice(-period).map(c => c.close);
  const sum = prices.reduce((total, price) => total + price, 0);
  return sum / period;
}

/**
 * Calculate Relative Strength Index
 */
function calculateRSI(candles, period = 14) {
  if (candles.length < period + 1) return 50; // Default to neutral
  
  const prices = candles.map(c => c.close);
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let currentGain = 0;
    let currentLoss = 0;
    
    if (change >= 0) {
      currentGain = change;
    } else {
      currentLoss = -change;
    }
    
    // Use smoothed averages
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
  }
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate MACD
 */
function calculateMACD(candles, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (candles.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0, previousHistogram: 0 };
  }
  
  const prices = candles.map(c => c.close);
  
  // Calculate EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Calculate MACD line
  const macdLine = fastEMA - slowEMA;
  
  // Calculate signal line (EMA of MACD line)
  const macdValues = [];
  for (let i = 0; i < prices.length - slowPeriod + 1; i++) {
    const fastEMA = calculateEMA(prices.slice(0, slowPeriod + i), fastPeriod);
    const slowEMA = calculateEMA(prices.slice(0, slowPeriod + i), slowPeriod);
    macdValues.push(fastEMA - slowEMA);
  }
  
  const signalLine = calculateEMA(macdValues, signalPeriod);
  
  // Calculate histogram
  const histogram = macdLine - signalLine;
  
  // Calculate previous histogram for trend
  let previousHistogram = 0;
  if (macdValues.length >= 2) {
    const prevMacd = macdValues[macdValues.length - 2];
    const prevSignal = calculateEMA(macdValues.slice(0, -1), signalPeriod);
    previousHistogram = prevMacd - prevSignal;
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    previousHistogram
  };
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  
  const k = 2 / (period + 1);
  
  // Start with SMA
  let ema = prices.slice(0, period).reduce((total, price) => total + price, 0) / period;
  
  // Calculate EMA
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }
  
  return ema;
}

/**
 * Detect patterns in accuracy values
 */
function detectAccuracyPatterns(accuracyValues) {
  if (accuracyValues.length < 5) {
    return { patternDetected: false, details: 'Insufficient data for pattern detection' };
  }
  
  // Check for repeated values (exact same accuracy across different tests)
  const uniqueValues = new Set(accuracyValues.map(v => v.toFixed(4)));
  const uniqueRatio = uniqueValues.size / accuracyValues.length;
  
  // Check for low variance
  const mean = accuracyValues.reduce((sum, val) => sum + val, 0) / accuracyValues.length;
  const variance = accuracyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / accuracyValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Check for clustering around specific values
  const clusters = {};
  accuracyValues.forEach(val => {
    const rounded = Math.round(val * 100) / 100; // Round to 2 decimal places
    clusters[rounded] = (clusters[rounded] || 0) + 1;
  });
  
  const clusterSizes = Object.values(clusters);
  const maxClusterSize = Math.max(...clusterSizes);
  const clusterRatio = maxClusterSize / accuracyValues.length;
  
  // Determine if a pattern exists
  const patternDetected = 
    uniqueRatio < 0.5 || // Less than 50% unique values
    stdDev < 0.05 || // Standard deviation less than 5%
    clusterRatio > 0.4; // More than 40% of values in a single cluster
  
  return {
    patternDetected,
    details: {
      uniqueValueRatio: uniqueRatio,
      standardDeviation: stdDev,
      largestClusterRatio: clusterRatio,
      clusterDistribution: clusters
    }
  };
}

/**
 * Save test results to file
 */
async function saveResults() {
  try {
    await fs.writeJson(TEST_CONFIG.outputFile, testResults, { spaces: 2 });
  } catch (error) {
    console.error('❌ Error saving results:', error);
  }
}

/**
 * Utility function for delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the tests
if (require.main === module) {
  runWorkflowAccuracyTests()
    .then(() => {
      console.log('✅ Tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runWorkflowAccuracyTests };