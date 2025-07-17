/**
 * Backtest Runner Test Script
 * 
 * This script tests the backtest runner with sample market data.
 */

const { BacktestRunner } = require('../src/engines/backtestRunner');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const config = {
  currencyPair: 'USD/INR',
  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || '',
  maxDailyTrades: 50,
  maxConsecutiveLosses: 3,
  tradeAmount: 10
};

async function runTest() {
  console.log('🧪 Starting Backtest Runner Test');
  
  // Initialize backtest runner
  const backtestRunner = new BacktestRunner(config);
  
  try {
    // Create necessary directories
    await fs.ensureDir(path.join(process.cwd(), 'data', 'backtest'));
    await fs.ensureDir(path.join(process.cwd(), 'data', 'results'));
    
    // Run backtest
    console.log('🚀 Running backtest...');
    const results = await backtestRunner.runFullBacktest();
    
    // Display summary results
    console.log('\n📊 BACKTEST RESULTS SUMMARY:');
    console.log('═════════════════════════════════════════════');
    console.log(`Total Tests: ${results.summary.totalTests}`);
    console.log(`Total Signals: ${results.summary.totalSignals}`);
    console.log(`Valid Signals: ${results.summary.validSignals}`);
    console.log(`Accurate Signals: ${results.summary.accurateSignals}`);
    console.log(`Overall Accuracy: ${(results.summary.averageConfidence * 100).toFixed(1)}%`);
    
    // Display results by asset
    console.log('\n📊 RESULTS BY ASSET:');
    for (const [asset, data] of Object.entries(results.summary.byAsset)) {
      if (data.validSignals > 0) {
        console.log(`${asset}: ${(data.averageConfidence * 100).toFixed(1)}% accuracy (${data.accurateSignals}/${data.validSignals} signals)`);
      }
    }
    
    // Display results by timeframe
    console.log('\n📊 RESULTS BY TIMEFRAME:');
    for (const [timeframe, data] of Object.entries(results.summary.byTimeframe)) {
      if (data.validSignals > 0) {
        console.log(`${timeframe}: ${(data.averageConfidence * 100).toFixed(1)}% accuracy (${data.accurateSignals}/${data.validSignals} signals)`);
      }
    }
    
    // Display results by regime
    console.log('\n📊 RESULTS BY MARKET REGIME:');
    for (const [regime, data] of Object.entries(results.summary.byRegime)) {
      if (data.validSignals > 0) {
        console.log(`${regime}: ${(data.averageConfidence * 100).toFixed(1)}% accuracy (${data.accurateSignals}/${data.validSignals} signals)`);
      }
    }
    
    // Display top setup tags
    console.log('\n📊 TOP PERFORMING SETUP TAGS:');
    const setupTags = Object.entries(results.summary.bySetupTag)
      .filter(([_, data]) => data.validSignals >= 3) // Minimum 3 signals for statistical relevance
      .sort(([_, a], [__, b]) => b.averageConfidence - a.averageConfidence)
      .slice(0, 5); // Top 5
    
    for (const [tag, data] of setupTags) {
      console.log(`${tag}: ${(data.averageConfidence * 100).toFixed(1)}% accuracy (${data.accurateSignals}/${data.validSignals} signals)`);
    }
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
runTest();