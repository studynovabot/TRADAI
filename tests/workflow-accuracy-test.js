/**
 * Workflow Accuracy Test for TRADAI
 * 
 * This script tests all workflows for 15 candles across different timeframes and currencies
 * while respecting the Twelve Data API rate limit of 8 requests per minute.
 * 
 * The test checks for patterns in accuracy percentages to identify if fallback accuracy
 * is occurring instead of proper analysis.
 */

const { ThreeBrainOrchestrator } = require('../src/layers/ThreeBrainOrchestrator');
const { MarketDataManager } = require('../src/layers/MarketDataManager');
const { QuantBrain } = require('../src/layers/QuantBrain');
const { AnalystBrain } = require('../src/layers/AnalystBrain');
const { ReflexBrain } = require('../src/layers/ReflexBrain');
const { Config } = require('../src/config/Config');
const fs = require('fs-extra');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  timeframes: ['1m', '5m', '15m', '30m', '1h'],
  currencies: ['USD/INR', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
  candleCount: 15,
  requestsPerMinute: 8, // Twelve Data API rate limit
  requestDelay: Math.ceil(60000 / 8), // Delay between requests in ms
  outputFile: path.join(__dirname, '../test-results/workflow-accuracy-test.json')
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

/**
 * Main test function
 */
async function runWorkflowAccuracyTests() {
  console.log('🧪 Starting Workflow Accuracy Tests');
  console.log(`📊 Testing ${TEST_CONFIG.timeframes.length} timeframes × ${TEST_CONFIG.currencies.length} currencies with ${TEST_CONFIG.candleCount} candles each`);
  console.log(`⏱️ Rate limit: ${TEST_CONFIG.requestsPerMinute} requests per minute (${TEST_CONFIG.requestDelay}ms delay between requests)`);
  
  // Ensure output directory exists
  await fs.ensureDir(path.dirname(TEST_CONFIG.outputFile));
  
  // Load configuration
  const config = await Config.load('./config/trading.json');
  config.paperTrading = true; // Force paper trading for tests
  
  // Track total tests
  let totalTests = TEST_CONFIG.timeframes.length * TEST_CONFIG.currencies.length;
  let completedTests = 0;
  let accuracyValues = [];
  
  // Run tests for each currency and timeframe combination
  for (const currency of TEST_CONFIG.currencies) {
    for (const timeframe of TEST_CONFIG.timeframes) {
      try {
        console.log(`\n🔍 Testing ${currency} on ${timeframe} timeframe`);
        
        // Create test-specific config
        const testConfig = { ...config, currencyPair: currency };
        
        // Run the test
        const result = await testWorkflow(testConfig, timeframe, TEST_CONFIG.candleCount);
        
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
async function testWorkflow(config, timeframe, candleCount) {
  try {
    // Initialize components
    const marketDataManager = new MarketDataManager(config);
    const quantBrain = new QuantBrain(config);
    const analystBrain = new AnalystBrain(config);
    const reflexBrain = new ReflexBrain(config);
    
    // Load models
    await quantBrain.loadModels();
    
    // Fetch market data
    console.log(`📊 Fetching ${candleCount} candles for ${config.currencyPair} on ${timeframe} timeframe`);
    const candles = await fetchMarketData(marketDataManager, timeframe, candleCount);
    
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
      
      // Create market data object with historical context
      const marketData = {
        currencyPair: config.currencyPair,
        data: {
          [timeframe]: candles.slice(0, i + 1)
        }
      };
      
      // Generate signal
      const signal = await generateSignal(
        quantBrain,
        analystBrain,
        reflexBrain,
        marketData
      );
      
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
 * Fetch market data for testing
 */
async function fetchMarketData(marketDataManager, timeframe, count) {
  try {
    // Convert timeframe to Twelve Data format
    const interval = marketDataManager.mapTimeframeToInterval(timeframe);
    
    // Fetch data
    const candles = await marketDataManager.fetchTimeframeData(timeframe, count);
    
    return candles;
  } catch (error) {
    console.error(`❌ Error fetching market data:`, error);
    throw error;
  }
}

/**
 * Generate a signal using all three brains
 */
async function generateSignal(quantBrain, analystBrain, reflexBrain, marketData) {
  try {
    // Stage 1: Quant Brain - ML Prediction
    const prediction = await quantBrain.predict(marketData);
    
    // Stage 2: Analyst Brain - LLM Validation
    const validation = await analystBrain.validate(prediction, marketData);
    
    // Stage 3: Reflex Brain - Signal Quality Evaluation
    const signalId = `test-${Date.now()}`;
    const evaluation = await reflexBrain.evaluate(signalId, prediction, validation, marketData);
    
    // Combine results
    return {
      direction: evaluation.finalDecision,
      confidence: evaluation.finalConfidence,
      reason: evaluation.reason
    };
  } catch (error) {
    console.error(`❌ Error generating signal:`, error);
    throw error;
  }
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