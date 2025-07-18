/**
 * Simple Signal Test - Quick verification of signal engine
 * 
 * This script provides a quick test of the signal engine functionality
 * without requiring API keys or complex setup.
 */

const { SignalEngine } = require('../src/engines/signalEngine');
const path = require('path');

// Test configuration
const config = {
  currencyPair: 'USD/INR',
  maxDailyTrades: 50,
  maxConsecutiveLosses: 3,
  tradeAmount: 10
};

// Sample market data for testing
const sampleMarketData = {
  currencyPair: 'USD/INR',
  timestamp: new Date().toISOString(),
  data: {
    '1m': Array.from({ length: 60 }, (_, i) => ({
      timestamp: new Date(Date.now() - (59 - i) * 60000).toISOString(),
      open: 82.0 + Math.random() * 0.1 - 0.05,
      high: 82.0 + Math.random() * 0.15,
      low: 82.0 - Math.random() * 0.15,
      close: 82.0 + Math.random() * 0.1 - 0.05,
      volume: 1000 + Math.random() * 500
    })),
    '5m': Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(Date.now() - (49 - i) * 300000).toISOString(),
      open: 82.0 + Math.random() * 0.2 - 0.1,
      high: 82.0 + Math.random() * 0.25,
      low: 82.0 - Math.random() * 0.25,
      close: 82.0 + Math.random() * 0.2 - 0.1,
      volume: 5000 + Math.random() * 2000
    })),
    '15m': Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 900000).toISOString(),
      open: 82.0 + Math.random() * 0.3 - 0.15,
      high: 82.0 + Math.random() * 0.4,
      low: 82.0 - Math.random() * 0.4,
      close: 82.0 + Math.random() * 0.3 - 0.15,
      volume: 15000 + Math.random() * 5000
    })),
    '1h': Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
      open: 82.0 + Math.random() * 0.5 - 0.25,
      high: 82.0 + Math.random() * 0.6,
      low: 82.0 - Math.random() * 0.6,
      close: 82.0 + Math.random() * 0.5 - 0.25,
      volume: 50000 + Math.random() * 20000
    })),
    '4h': Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(Date.now() - (11 - i) * 14400000).toISOString(),
      open: 82.0 + Math.random() * 0.8 - 0.4,
      high: 82.0 + Math.random() * 1.0,
      low: 82.0 - Math.random() * 1.0,
      close: 82.0 + Math.random() * 0.8 - 0.4,
      volume: 200000 + Math.random() * 100000
    }))
  }
};

async function runSimpleTest() {
  console.log('🧪 Simple Signal Engine Test');
  console.log('================================');
  
  try {
    // Initialize signal engine
    console.log('🔧 Initializing Signal Engine...');
    const signalEngine = new SignalEngine(config);
    
    // Test 1: Basic signal generation
    console.log('\n📊 Test 1: Basic Signal Generation');
    console.log('──────────────────────────────────');
    
    const startTime = Date.now();
    const signal = await signalEngine.generateSignal(sampleMarketData);
    const processingTime = Date.now() - startTime;
    
    console.log(`⚡ Processing time: ${processingTime}ms`);
    
    if (signal) {
      console.log(`✅ Signal generated successfully!`);
      console.log(`📈 Direction: ${signal.direction}`);
      console.log(`🎯 Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
      console.log(`🌊 Market Regime: ${signal.regime}`);
      console.log(`🏷️ Setup Tag: ${signal.setupTag}`);
      console.log(`▶️ Execute: ${signal.execute}`);
      console.log(`📊 Passed Filters: ${signal.passedFilters}`);
      console.log(`⚠️ Contradictions: ${signal.contradictions}`);
      console.log(`💡 Reasoning: ${signal.reasoning}`);
      
      // Test 2: Signal validation
      console.log('\n📊 Test 2: Signal Validation');
      console.log('──────────────────────────────');
      
      if (signal.execute) {
        console.log(`✅ Signal passed validation`);
        
        // Check confidence threshold
        if (signal.confidence >= 0.65) {
          console.log(`✅ Confidence meets threshold (≥65%)`);
        } else {
          console.log(`⚠️ Confidence below threshold (${(signal.confidence * 100).toFixed(1)}% < 65%)`);
        }
        
        // Check for key factors
        if (signal.keyFactors && signal.keyFactors.length > 0) {
          console.log(`✅ Key factors identified: ${signal.keyFactors.join(', ')}`);
        } else {
          console.log(`⚠️ No key factors identified`);
        }
        
        // Check regime detection
        if (signal.regime && signal.regime !== 'UNKNOWN') {
          console.log(`✅ Market regime detected: ${signal.regime}`);
        } else {
          console.log(`⚠️ Market regime not detected`);
        }
        
      } else {
        console.log(`❌ Signal failed validation: ${signal.reasoning}`);
      }
      
      // Test 3: Multiple signals
      console.log('\n📊 Test 3: Multiple Signal Generation');
      console.log('────────────────────────────────────');
      
      const signals = [];
      for (let i = 0; i < 5; i++) {
        const testSignal = await signalEngine.generateSignal(sampleMarketData);
        signals.push(testSignal);
        console.log(`Signal ${i + 1}: ${testSignal.direction} (${(testSignal.confidence * 100).toFixed(1)}%) - ${testSignal.setupTag}`);
      }
      
      // Analyze results
      const validSignals = signals.filter(s => s.execute);
      const averageConfidence = validSignals.reduce((sum, s) => sum + s.confidence, 0) / validSignals.length;
      const uniqueSetups = new Set(validSignals.map(s => s.setupTag));
      
      console.log(`\n📈 Results Summary:`);
      console.log(`   Valid signals: ${validSignals.length}/5`);
      console.log(`   Average confidence: ${(averageConfidence * 100).toFixed(1)}%`);
      console.log(`   Unique setups: ${uniqueSetups.size}`);
      
      if (validSignals.length >= 2 && averageConfidence >= 0.6) {
        console.log(`\n🎉 Test PASSED! Signal engine is working correctly.`);
      } else {
        console.log(`\n⚠️ Test PARTIAL: Signal engine working but may need optimization.`);
      }
      
    } else {
      console.log(`❌ No signal generated`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run test if called directly
if (require.main === module) {
  runSimpleTest();
}

module.exports = { runSimpleTest };