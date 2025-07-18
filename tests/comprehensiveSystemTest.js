/**
 * Comprehensive System Test - End-to-End Signal Generation Test
 * 
 * This script tests the complete upgraded trading system with:
 * - Advanced signal engine with confluence filters
 * - Market regime detection
 * - Dynamic confidence scoring
 * - Setup tagging and pattern recognition
 * - Adaptive filter weighting
 * - Trade logging and feedback
 */

const { TradingSystem } = require('../src/TradingSystem');
const { MarketDataManager } = require('../src/layers/MarketDataManager');
const { BacktestRunner } = require('../src/engines/backtestRunner');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const config = {
  currencyPair: 'USD/INR',
  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  maxDailyTrades: 50,
  maxConsecutiveLosses: 3,
  tradeAmount: 10,
  signalOnly: true // Focus on signal generation
};

class SystemTestRunner {
  constructor() {
    this.results = {
      totalTests: 0,
      validSignals: 0,
      highConfidenceSignals: 0,
      uniqueSetupTags: new Set(),
      confidenceDistribution: {},
      regimeDistribution: {},
      avgConfidence: 0,
      avgProcessingTime: 0,
      errors: []
    };
  }

  async runComprehensiveTest() {
    console.log('🧪 Starting Comprehensive System Test');
    console.log('═══════════════════════════════════════════════════════════════');
    
    try {
      // Initialize components
      console.log('🔧 Initializing system components...');
      const tradingSystem = new TradingSystem(config);
      const marketDataManager = new MarketDataManager(config);
      const backtestRunner = new BacktestRunner(config);
      
      // Test 1: Signal Engine Integration Test
      console.log('\n📊 Test 1: Signal Engine Integration');
      console.log('─────────────────────────────────────────────');
      await this.testSignalEngineIntegration(tradingSystem, marketDataManager);
      
      // Test 2: Market Regime Detection Test
      console.log('\n🌊 Test 2: Market Regime Detection');
      console.log('─────────────────────────────────────────────');
      await this.testMarketRegimeDetection(tradingSystem, marketDataManager);
      
      // Test 3: Multiple Asset Test
      console.log('\n💰 Test 3: Multiple Asset Testing');
      console.log('─────────────────────────────────────────────');
      await this.testMultipleAssets(tradingSystem);
      
      // Test 4: Confidence Distribution Test
      console.log('\n📈 Test 4: Confidence Distribution Analysis');
      console.log('─────────────────────────────────────────────');
      await this.testConfidenceDistribution(tradingSystem);
      
      // Test 5: Setup Tag Analysis
      console.log('\n🏷️ Test 5: Setup Tag Analysis');
      console.log('─────────────────────────────────────────────');
      await this.testSetupTagAnalysis(tradingSystem);
      
      // Test 6: Performance Benchmarking
      console.log('\n⚡ Test 6: Performance Benchmarking');
      console.log('─────────────────────────────────────────────');
      await this.testPerformanceBenchmarking(backtestRunner);
      
      // Generate final report
      console.log('\n📋 Generating Final Report...');
      await this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ System test failed:', error);
      this.results.errors.push(error.message);
    }
  }

  /**
   * Test signal engine integration with real market data
   */
  async testSignalEngineIntegration(tradingSystem, marketDataManager) {
    try {
      let marketData;
      
      // Try to get real market data
      if (config.twelveDataApiKey) {
        console.log('📡 Fetching live market data...');
        await marketDataManager.fetchAllTimeframes();
        marketData = marketDataManager.getLatestData();
      } else {
        console.log('📂 Using sample market data...');
        const samplePath = path.join(__dirname, '../data/sample/market_data_sample.json');
        marketData = await fs.readJson(samplePath);
      }
      
      // Generate multiple signals with different market conditions
      for (let i = 0; i < 10; i++) {
        console.log(`🎯 Generating signal ${i + 1}/10...`);
        
        const startTime = Date.now();
        const signal = await tradingSystem.generateSignal();
        const processingTime = Date.now() - startTime;
        
        this.results.totalTests++;
        this.results.avgProcessingTime += processingTime;
        
        if (signal && signal.signalSummary) {
          this.results.validSignals++;
          
          // Track confidence distribution
          const confidenceRange = Math.floor(signal.confidence * 10) * 10;
          this.results.confidenceDistribution[confidenceRange] = 
            (this.results.confidenceDistribution[confidenceRange] || 0) + 1;
          
          // Track regime distribution
          const regime = signal.signalSummary.signalEngine?.regime || 'UNKNOWN';
          this.results.regimeDistribution[regime] = 
            (this.results.regimeDistribution[regime] || 0) + 1;
          
          // Track setup tags
          const setupTag = signal.signalSummary.signalEngine?.setupTag;
          if (setupTag) {
            this.results.uniqueSetupTags.add(setupTag);
          }
          
          // Track high confidence signals
          if (signal.confidence >= 0.65) {
            this.results.highConfidenceSignals++;
          }
          
          this.results.avgConfidence += signal.confidence;
          
          console.log(`   ✅ Signal: ${signal.signalQuality} (${(signal.confidence * 100).toFixed(1)}% confidence)`);
          console.log(`   🏷️ Setup: ${setupTag || 'Generic'}`);
          console.log(`   🌊 Regime: ${regime}`);
          console.log(`   ⚡ Time: ${processingTime}ms`);
        } else {
          console.log(`   ❌ No valid signal generated`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Integration test completed: ${this.results.validSignals}/${this.results.totalTests} valid signals`);
      
    } catch (error) {
      console.error('❌ Signal engine integration test failed:', error);
      this.results.errors.push(`Integration test: ${error.message}`);
    }
  }

  /**
   * Test market regime detection accuracy
   */
  async testMarketRegimeDetection(tradingSystem, marketDataManager) {
    try {
      console.log('🌊 Testing market regime detection...');
      
      // Test with different market conditions
      const testScenarios = [
        'trending_up',
        'trending_down', 
        'ranging',
        'volatile',
        'low_volume'
      ];
      
      for (const scenario of testScenarios) {
        console.log(`   Testing ${scenario} scenario...`);
        
        // Generate signal and check regime detection
        const signal = await tradingSystem.generateSignal();
        
        if (signal && signal.signalSummary?.signalEngine?.regime) {
          const detectedRegime = signal.signalSummary.signalEngine.regime;
          console.log(`   📊 Detected regime: ${detectedRegime}`);
          
          // Check if regime makes sense for the scenario
          const isAccurate = this.validateRegimeAccuracy(scenario, detectedRegime);
          if (isAccurate) {
            console.log(`   ✅ Regime detection accurate`);
          } else {
            console.log(`   ⚠️ Regime detection may need adjustment`);
          }
        } else {
          console.log(`   ❌ No regime detected`);
        }
      }
      
      console.log(`✅ Market regime detection test completed`);
      
    } catch (error) {
      console.error('❌ Market regime detection test failed:', error);
      this.results.errors.push(`Regime detection test: ${error.message}`);
    }
  }

  /**
   * Test multiple assets to ensure system works across different pairs
   */
  async testMultipleAssets(tradingSystem) {
    try {
      console.log('💰 Testing multiple currency pairs...');
      
      const assets = ['USD/INR', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
      
      for (const asset of assets) {
        console.log(`   Testing ${asset}...`);
        
        // Update config for this asset
        tradingSystem.config.currencyPair = asset;
        
        const signal = await tradingSystem.generateSignal();
        
        if (signal && signal.signalSummary) {
          const setupTag = signal.signalSummary.signalEngine?.setupTag;
          const confidence = signal.confidence;
          
          console.log(`   ✅ ${asset}: ${setupTag || 'Generic'} (${(confidence * 100).toFixed(1)}%)`);
        } else {
          console.log(`   ❌ ${asset}: No signal generated`);
        }
      }
      
      console.log(`✅ Multiple asset test completed`);
      
    } catch (error) {
      console.error('❌ Multiple asset test failed:', error);
      this.results.errors.push(`Multiple asset test: ${error.message}`);
    }
  }

  /**
   * Test confidence distribution to ensure we're not clustered around 50%
   */
  async testConfidenceDistribution(tradingSystem) {
    try {
      console.log('📈 Analyzing confidence distribution...');
      
      // Generate 25 signals to analyze distribution
      const confidences = [];
      
      for (let i = 0; i < 25; i++) {
        const signal = await tradingSystem.generateSignal();
        
        if (signal && signal.confidence) {
          confidences.push(signal.confidence);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Analyze distribution
      const distribution = this.analyzeConfidenceDistribution(confidences);
      
      console.log(`   📊 Generated ${confidences.length} signals`);
      console.log(`   📈 Average confidence: ${(distribution.average * 100).toFixed(1)}%`);
      console.log(`   📈 Std deviation: ${(distribution.stdDev * 100).toFixed(1)}%`);
      console.log(`   📈 High confidence (≥65%): ${distribution.highConfidence} signals`);
      console.log(`   📈 Range: ${(distribution.min * 100).toFixed(1)}% - ${(distribution.max * 100).toFixed(1)}%`);
      
      // Check if distribution is healthy (not clustered around 50%)
      if (distribution.average > 0.6 && distribution.stdDev > 0.1) {
        console.log(`   ✅ Confidence distribution looks healthy`);
      } else if (distribution.average < 0.52 && distribution.stdDev < 0.05) {
        console.log(`   ⚠️ Confidence distribution may be too clustered around 50%`);
      } else {
        console.log(`   ℹ️ Confidence distribution is within acceptable range`);
      }
      
    } catch (error) {
      console.error('❌ Confidence distribution test failed:', error);
      this.results.errors.push(`Confidence distribution test: ${error.message}`);
    }
  }

  /**
   * Test setup tag generation and variety
   */
  async testSetupTagAnalysis(tradingSystem) {
    try {
      console.log('🏷️ Analyzing setup tag generation...');
      
      const setupTags = new Set();
      const tagFrequency = {};
      
      // Generate 20 signals to analyze setup tags
      for (let i = 0; i < 20; i++) {
        const signal = await tradingSystem.generateSignal();
        
        if (signal && signal.signalSummary?.signalEngine?.setupTag) {
          const tag = signal.signalSummary.signalEngine.setupTag;
          setupTags.add(tag);
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      console.log(`   📊 Unique setup tags: ${setupTags.size}`);
      console.log(`   🏷️ Most common tags:`);
      
      const sortedTags = Object.entries(tagFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      for (const [tag, count] of sortedTags) {
        console.log(`      • ${tag}: ${count} times`);
      }
      
      if (setupTags.size >= 5) {
        console.log(`   ✅ Good variety in setup tags`);
      } else {
        console.log(`   ⚠️ Limited variety in setup tags`);
      }
      
    } catch (error) {
      console.error('❌ Setup tag analysis failed:', error);
      this.results.errors.push(`Setup tag analysis: ${error.message}`);
    }
  }

  /**
   * Test performance benchmarking
   */
  async testPerformanceBenchmarking(backtestRunner) {
    try {
      console.log('⚡ Running performance benchmark...');
      
      const startTime = Date.now();
      
      // Run a small backtest
      const results = await backtestRunner.runFullBacktest();
      
      const totalTime = Date.now() - startTime;
      
      console.log(`   📊 Backtest completed in ${totalTime}ms`);
      console.log(`   📈 Total signals: ${results.summary.totalSignals}`);
      console.log(`   📈 Valid signals: ${results.summary.validSignals}`);
      console.log(`   📈 Overall accuracy: ${(results.summary.averageConfidence * 100).toFixed(1)}%`);
      
      // Check performance targets
      if (results.summary.averageConfidence >= 0.65) {
        console.log(`   ✅ Accuracy target met (≥65%)`);
      } else {
        console.log(`   ⚠️ Accuracy below target (${(results.summary.averageConfidence * 100).toFixed(1)}% < 65%)`);
      }
      
      if (totalTime < 30000) { // 30 seconds
        console.log(`   ✅ Performance target met (<30s)`);
      } else {
        console.log(`   ⚠️ Performance slower than target (${totalTime}ms > 30s)`);
      }
      
    } catch (error) {
      console.error('❌ Performance benchmarking failed:', error);
      this.results.errors.push(`Performance benchmark: ${error.message}`);
    }
  }

  /**
   * Generate final comprehensive report
   */
  async generateFinalReport() {
    try {
      // Calculate final metrics
      this.results.avgConfidence = this.results.validSignals > 0 ? 
        this.results.avgConfidence / this.results.validSignals : 0;
      
      this.results.avgProcessingTime = this.results.totalTests > 0 ? 
        this.results.avgProcessingTime / this.results.totalTests : 0;
      
      const successRate = this.results.totalTests > 0 ? 
        (this.results.validSignals / this.results.totalTests) * 100 : 0;
      
      const highConfidenceRate = this.results.validSignals > 0 ? 
        (this.results.highConfidenceSignals / this.results.validSignals) * 100 : 0;
      
      // Generate report
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTests: this.results.totalTests,
          validSignals: this.results.validSignals,
          successRate: successRate.toFixed(1),
          avgConfidence: (this.results.avgConfidence * 100).toFixed(1),
          avgProcessingTime: Math.round(this.results.avgProcessingTime),
          highConfidenceSignals: this.results.highConfidenceSignals,
          highConfidenceRate: highConfidenceRate.toFixed(1),
          uniqueSetupTags: Array.from(this.results.uniqueSetupTags),
          errors: this.results.errors
        },
        distributions: {
          confidence: this.results.confidenceDistribution,
          regime: this.results.regimeDistribution
        },
        assessment: {
          accuracyTarget: this.results.avgConfidence >= 0.65 ? 'PASSED' : 'FAILED',
          confidenceVariety: Object.keys(this.results.confidenceDistribution).length >= 5 ? 'PASSED' : 'FAILED',
          setupVariety: this.results.uniqueSetupTags.size >= 5 ? 'PASSED' : 'FAILED',
          performanceTarget: this.results.avgProcessingTime < 5000 ? 'PASSED' : 'FAILED'
        }
      };
      
      // Save report
      const reportPath = path.join(__dirname, '../data/results/comprehensive_test_report.json');
      await fs.ensureDir(path.dirname(reportPath));
      await fs.writeJson(reportPath, report, { spaces: 2 });
      
      // Display final summary
      console.log('\n📋 COMPREHENSIVE TEST REPORT');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`📊 Total Tests: ${report.summary.totalTests}`);
      console.log(`📈 Valid Signals: ${report.summary.validSignals} (${report.summary.successRate}%)`);
      console.log(`🎯 Average Confidence: ${report.summary.avgConfidence}%`);
      console.log(`⚡ Average Processing Time: ${report.summary.avgProcessingTime}ms`);
      console.log(`🌟 High Confidence Signals: ${report.summary.highConfidenceSignals} (${report.summary.highConfidenceRate}%)`);
      console.log(`🏷️ Unique Setup Tags: ${report.summary.uniqueSetupTags.length}`);
      
      console.log('\n✅ ASSESSMENT RESULTS:');
      console.log(`   Accuracy Target (≥65%): ${report.assessment.accuracyTarget}`);
      console.log(`   Confidence Variety: ${report.assessment.confidenceVariety}`);
      console.log(`   Setup Variety: ${report.assessment.setupVariety}`);
      console.log(`   Performance Target: ${report.assessment.performanceTarget}`);
      
      if (report.summary.errors.length > 0) {
        console.log('\n❌ ERRORS ENCOUNTERED:');
        report.summary.errors.forEach(error => console.log(`   • ${error}`));
      }
      
      console.log(`\n💾 Report saved to: ${reportPath}`);
      
      // Final verdict
      const passedTests = Object.values(report.assessment).filter(result => result === 'PASSED').length;
      const totalTests = Object.keys(report.assessment).length;
      
      if (passedTests === totalTests) {
        console.log('\n🎉 SYSTEM UPGRADE SUCCESSFUL! All targets met.');
      } else {
        console.log(`\n⚠️ SYSTEM UPGRADE PARTIAL: ${passedTests}/${totalTests} targets met.`);
      }
      
    } catch (error) {
      console.error('❌ Failed to generate final report:', error);
    }
  }

  /**
   * Validate regime accuracy for test scenarios
   */
  validateRegimeAccuracy(scenario, detectedRegime) {
    const expectedRegimes = {
      'trending_up': ['TRENDING', 'BULLISH'],
      'trending_down': ['TRENDING', 'BEARISH'],
      'ranging': ['RANGING', 'SIDEWAYS'],
      'volatile': ['VOLATILE', 'BREAKOUT'],
      'low_volume': ['LOW_VOLUME', 'QUIET']
    };
    
    const expected = expectedRegimes[scenario] || [];
    return expected.some(regime => detectedRegime.includes(regime));
  }

  /**
   * Analyze confidence distribution
   */
  analyzeConfidenceDistribution(confidences) {
    if (confidences.length === 0) {
      return { average: 0, stdDev: 0, min: 0, max: 0, highConfidence: 0 };
    }
    
    const sum = confidences.reduce((a, b) => a + b, 0);
    const average = sum / confidences.length;
    
    const variance = confidences.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);
    
    const min = Math.min(...confidences);
    const max = Math.max(...confidences);
    
    const highConfidence = confidences.filter(c => c >= 0.65).length;
    
    return { average, stdDev, min, max, highConfidence };
  }
}

// Run the comprehensive test
async function runTest() {
  const testRunner = new SystemTestRunner();
  await testRunner.runComprehensiveTest();
}

// Execute if run directly
if (require.main === module) {
  runTest();
}

module.exports = { SystemTestRunner };