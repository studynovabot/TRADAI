/**
 * Signal Engine Test Script
 * 
 * This script tests the new signal engine implementation with sample market data.
 */

const { SignalEngine } = require('../src/engines/signalEngine');
const { MarketDataManager } = require('../src/layers/MarketDataManager');
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

// Sample market data (if API key not available)
const sampleDataPath = path.join(__dirname, '../data/sample/market_data_sample.json');

async function runTest() {
  console.log('🧪 Starting Signal Engine Test');
  
  // Initialize components
  const marketDataManager = new MarketDataManager(config);
  const signalEngine = new SignalEngine(config);
  
  try {
    // Get market data (from API or sample)
    let marketData;
    
    if (config.twelveDataApiKey) {
      console.log('📊 Fetching live market data...');
      await marketDataManager.fetchAllTimeframes();
      marketData = marketDataManager.getLatestData();
    } else {
      console.log('📊 Loading sample market data...');
      if (await fs.pathExists(sampleDataPath)) {
        marketData = await fs.readJson(sampleDataPath);
      } else {
        throw new Error('Sample market data not found. Please provide a Twelve Data API key or create sample data.');
      }
    }
    
    // Generate signal
    console.log('🎯 Generating signal...');
    const signal = await signalEngine.generateSignal(marketData);
    
    // Display results
    console.log('\n🔍 SIGNAL RESULTS:');
    console.log('═════════════════════════════════════════════');
    console.log(`📊 Direction: ${signal.direction}`);
    console.log(`🌟 Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
    console.log(`🌊 Market Regime: ${signal.regime}`);
    console.log(`🏷️ Setup Tag: ${signal.setupTag}`);
    console.log(`✅ Execute: ${signal.execute}`);
    
    if (signal.execute) {
      console.log('\n✅ PASSED FILTERS:');
      const passedFilters = Object.entries(signal.filters)
        .filter(([_, result]) => result.passed)
        .map(([name, result]) => `   • ${name}: ${result.reason}`);
      
      passedFilters.forEach(filter => console.log(filter));
      
      console.log(`\n💡 REASONING: ${signal.reasoning}`);
    } else {
      console.log(`\n❌ REJECTED: ${signal.reasoning}`);
    }
    
    // Save sample data for future tests if we fetched live data
    if (config.twelveDataApiKey) {
      await fs.ensureDir(path.dirname(sampleDataPath));
      await fs.writeJson(sampleDataPath, marketData, { spaces: 2 });
      console.log('💾 Saved market data sample for future tests');
    }
    
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
runTest();