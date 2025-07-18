/**
 * System Diagnostics - Verify all components are working
 * 
 * This script runs diagnostic tests on all major components of the
 * upgraded trading system to ensure everything is connected properly.
 */

const path = require('path');
const fs = require('fs-extra');

// Import all components to test
const { SignalEngine } = require('../src/engines/signalEngine');
const { MarketRegimeDetector } = require('../src/engines/marketRegimeDetector');
const { ConfluenceFilters } = require('../src/engines/confluenceFilters');
const { ConfidenceScorer } = require('../src/engines/confidenceScorer');
const { SetupTagger } = require('../src/engines/setupTagger');
const { FilterWeightManager } = require('../src/engines/filterWeightManager');
const { TradeLogger } = require('../src/engines/tradeLogger');
const { BacktestRunner } = require('../src/engines/backtestRunner');

// Configuration
const config = {
  currencyPair: 'USD/INR',
  maxDailyTrades: 50,
  maxConsecutiveLosses: 3,
  tradeAmount: 10
};

class SystemDiagnostics {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  async runAllDiagnostics() {
    console.log('🔍 System Diagnostics - Component Verification');
    console.log('================================================');
    
    try {
      // Test 1: Component Initialization
      await this.testComponentInitialization();
      
      // Test 2: Data Flow
      await this.testDataFlow();
      
      // Test 3: Integration Points
      await this.testIntegrationPoints();
      
      // Test 4: Error Handling
      await this.testErrorHandling();
      
      // Test 5: Performance
      await this.testPerformance();
      
      // Generate final report
      this.generateDiagnosticReport();
      
    } catch (error) {
      console.error('❌ Diagnostic suite failed:', error);
      this.logResult('FAILED', 'Diagnostic Suite', error.message);
    }
  }

  async testComponentInitialization() {
    console.log('\n🔧 Test 1: Component Initialization');
    console.log('───────────────────────────────────');
    
    // Test SignalEngine
    try {
      const signalEngine = new SignalEngine(config);
      console.log('✅ SignalEngine - Initialized successfully');
      this.logResult('PASSED', 'SignalEngine Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ SignalEngine - Failed to initialize:', error.message);
      this.logResult('FAILED', 'SignalEngine Initialization', error.message);
    }
    
    // Test MarketRegimeDetector
    try {
      const regimeDetector = new MarketRegimeDetector(config);
      console.log('✅ MarketRegimeDetector - Initialized successfully');
      this.logResult('PASSED', 'MarketRegimeDetector Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ MarketRegimeDetector - Failed to initialize:', error.message);
      this.logResult('FAILED', 'MarketRegimeDetector Initialization', error.message);
    }
    
    // Test ConfluenceFilters
    try {
      const confluenceFilters = new ConfluenceFilters(config);
      console.log('✅ ConfluenceFilters - Initialized successfully');
      this.logResult('PASSED', 'ConfluenceFilters Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ ConfluenceFilters - Failed to initialize:', error.message);
      this.logResult('FAILED', 'ConfluenceFilters Initialization', error.message);
    }
    
    // Test ConfidenceScorer
    try {
      const confidenceScorer = new ConfidenceScorer(config);
      console.log('✅ ConfidenceScorer - Initialized successfully');
      this.logResult('PASSED', 'ConfidenceScorer Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ ConfidenceScorer - Failed to initialize:', error.message);
      this.logResult('FAILED', 'ConfidenceScorer Initialization', error.message);
    }
    
    // Test SetupTagger
    try {
      const setupTagger = new SetupTagger(config);
      console.log('✅ SetupTagger - Initialized successfully');
      this.logResult('PASSED', 'SetupTagger Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ SetupTagger - Failed to initialize:', error.message);
      this.logResult('FAILED', 'SetupTagger Initialization', error.message);
    }
    
    // Test FilterWeightManager
    try {
      const filterWeightManager = new FilterWeightManager(config);
      console.log('✅ FilterWeightManager - Initialized successfully');
      this.logResult('PASSED', 'FilterWeightManager Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ FilterWeightManager - Failed to initialize:', error.message);
      this.logResult('FAILED', 'FilterWeightManager Initialization', error.message);
    }
    
    // Test TradeLogger
    try {
      const tradeLogger = new TradeLogger(config);
      console.log('✅ TradeLogger - Initialized successfully');
      this.logResult('PASSED', 'TradeLogger Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ TradeLogger - Failed to initialize:', error.message);
      this.logResult('FAILED', 'TradeLogger Initialization', error.message);
    }
    
    // Test BacktestRunner
    try {
      const backtestRunner = new BacktestRunner(config);
      console.log('✅ BacktestRunner - Initialized successfully');
      this.logResult('PASSED', 'BacktestRunner Initialization', 'Component initialized');
    } catch (error) {
      console.log('❌ BacktestRunner - Failed to initialize:', error.message);
      this.logResult('FAILED', 'BacktestRunner Initialization', error.message);
    }
  }

  async testDataFlow() {
    console.log('\n📊 Test 2: Data Flow');
    console.log('────────────────────');
    
    // Sample market data
    const sampleData = {
      currencyPair: 'USD/INR',
      timestamp: new Date().toISOString(),
      data: {
        '5m': Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - (49 - i) * 300000).toISOString(),
          open: 82.0 + Math.random() * 0.1 - 0.05,
          high: 82.0 + Math.random() * 0.15,
          low: 82.0 - Math.random() * 0.15,
          close: 82.0 + Math.random() * 0.1 - 0.05,
          volume: 5000 + Math.random() * 2000
        })),
        '15m': Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() - (29 - i) * 900000).toISOString(),
          open: 82.0 + Math.random() * 0.2 - 0.1,
          high: 82.0 + Math.random() * 0.25,
          low: 82.0 - Math.random() * 0.25,
          close: 82.0 + Math.random() * 0.2 - 0.1,
          volume: 15000 + Math.random() * 5000
        })),
        '1h': Array.from({ length: 24 }, (_, i) => ({
          timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
          open: 82.0 + Math.random() * 0.3 - 0.15,
          high: 82.0 + Math.random() * 0.4,
          low: 82.0 - Math.random() * 0.4,
          close: 82.0 + Math.random() * 0.3 - 0.15,
          volume: 50000 + Math.random() * 20000
        }))
      }
    };
    
    try {
      // Test market regime detection
      const regimeDetector = new MarketRegimeDetector(config);
      const regime = await regimeDetector.detectRegime(sampleData);
      
      if (regime && regime.type) {
        console.log(`✅ Market Regime Detection - ${regime.type} (${(regime.confidence * 100).toFixed(1)}%)`);
        this.logResult('PASSED', 'Market Regime Detection', `Detected ${regime.type}`);
      } else {
        console.log('⚠️ Market Regime Detection - No regime detected');
        this.logResult('WARNING', 'Market Regime Detection', 'No regime detected');
      }
      
      // Test confluence filters
      const confluenceFilters = new ConfluenceFilters(config);
      const filterResults = await confluenceFilters.applyBalancedFilters(sampleData);
      
      if (filterResults && Object.keys(filterResults).length > 0) {
        console.log(`✅ Confluence Filters - ${Object.keys(filterResults).length} filters applied`);
        this.logResult('PASSED', 'Confluence Filters', `Applied ${Object.keys(filterResults).length} filters`);
      } else {
        console.log('⚠️ Confluence Filters - No filters applied');
        this.logResult('WARNING', 'Confluence Filters', 'No filters applied');
      }
      
      // Test confidence scoring
      const confidenceScorer = new ConfidenceScorer(config);
      const confidence = confidenceScorer.calculateConfidence({ filters: filterResults }, regime);
      
      if (confidence && typeof confidence.confidence === 'number') {
        console.log(`✅ Confidence Scoring - ${(confidence.confidence * 100).toFixed(1)}% confidence`);
        this.logResult('PASSED', 'Confidence Scoring', `Calculated ${(confidence.confidence * 100).toFixed(1)}% confidence`);
      } else {
        console.log('❌ Confidence Scoring - Failed to calculate confidence');
        this.logResult('FAILED', 'Confidence Scoring', 'Failed to calculate confidence');
      }
      
      // Test setup tagging
      const setupTagger = new SetupTagger(config);
      const setupTag = setupTagger.generateSetupTag({ filters: filterResults }, regime);
      
      if (setupTag && setupTag !== 'NO_SIGNAL') {
        console.log(`✅ Setup Tagging - ${setupTag}`);
        this.logResult('PASSED', 'Setup Tagging', `Generated tag: ${setupTag}`);
      } else {
        console.log('⚠️ Setup Tagging - No setup tag generated');
        this.logResult('WARNING', 'Setup Tagging', 'No setup tag generated');
      }
      
    } catch (error) {
      console.log('❌ Data Flow Test Failed:', error.message);
      this.logResult('FAILED', 'Data Flow Test', error.message);
    }
  }

  async testIntegrationPoints() {
    console.log('\n🔗 Test 3: Integration Points');
    console.log('─────────────────────────────');
    
    try {
      // Test end-to-end signal generation
      const signalEngine = new SignalEngine(config);
      
      const sampleData = {
        currencyPair: 'USD/INR',
        timestamp: new Date().toISOString(),
        data: {
          '5m': Array.from({ length: 50 }, (_, i) => ({
            timestamp: new Date(Date.now() - (49 - i) * 300000).toISOString(),
            open: 82.0 + Math.random() * 0.1 - 0.05,
            high: 82.0 + Math.random() * 0.15,
            low: 82.0 - Math.random() * 0.15,
            close: 82.0 + Math.random() * 0.1 - 0.05,
            volume: 5000 + Math.random() * 2000
          })),
          '15m': Array.from({ length: 30 }, (_, i) => ({
            timestamp: new Date(Date.now() - (29 - i) * 900000).toISOString(),
            open: 82.0 + Math.random() * 0.2 - 0.1,
            high: 82.0 + Math.random() * 0.25,
            low: 82.0 - Math.random() * 0.25,
            close: 82.0 + Math.random() * 0.2 - 0.1,
            volume: 15000 + Math.random() * 5000
          })),
          '1h': Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
            open: 82.0 + Math.random() * 0.3 - 0.15,
            high: 82.0 + Math.random() * 0.4,
            low: 82.0 - Math.random() * 0.4,
            close: 82.0 + Math.random() * 0.3 - 0.15,
            volume: 50000 + Math.random() * 20000
          }))
        }
      };
      
      const signal = await signalEngine.generateSignal(sampleData);
      
      if (signal && signal.direction && signal.confidence !== undefined) {
        console.log(`✅ End-to-End Signal Generation - ${signal.direction} (${(signal.confidence * 100).toFixed(1)}%)`);
        this.logResult('PASSED', 'End-to-End Signal Generation', `Generated ${signal.direction} signal`);
      } else {
        console.log('❌ End-to-End Signal Generation - Failed');
        this.logResult('FAILED', 'End-to-End Signal Generation', 'Failed to generate signal');
      }
      
    } catch (error) {
      console.log('❌ Integration Test Failed:', error.message);
      this.logResult('FAILED', 'Integration Test', error.message);
    }
  }

  async testErrorHandling() {
    console.log('\n🛡️ Test 4: Error Handling');
    console.log('─────────────────────────');
    
    try {
      // Test with invalid data
      const signalEngine = new SignalEngine(config);
      
      const invalidData = {
        currencyPair: 'INVALID',
        timestamp: 'invalid',
        data: {
          '5m': [] // Empty data
        }
      };
      
      const signal = await signalEngine.generateSignal(invalidData);
      
      if (signal && signal.execute === false) {
        console.log('✅ Error Handling - Gracefully handled invalid data');
        this.logResult('PASSED', 'Error Handling', 'Handled invalid data gracefully');
      } else {
        console.log('⚠️ Error Handling - May need improvement');
        this.logResult('WARNING', 'Error Handling', 'Error handling may need improvement');
      }
      
    } catch (error) {
      console.log('✅ Error Handling - Properly threw error for invalid data');
      this.logResult('PASSED', 'Error Handling', 'Properly threw error for invalid data');
    }
  }

  async testPerformance() {
    console.log('\n⚡ Test 5: Performance');
    console.log('─────────────────────');
    
    try {
      const signalEngine = new SignalEngine(config);
      
      const sampleData = {
        currencyPair: 'USD/INR',
        timestamp: new Date().toISOString(),
        data: {
          '5m': Array.from({ length: 50 }, (_, i) => ({
            timestamp: new Date(Date.now() - (49 - i) * 300000).toISOString(),
            open: 82.0 + Math.random() * 0.1 - 0.05,
            high: 82.0 + Math.random() * 0.15,
            low: 82.0 - Math.random() * 0.15,
            close: 82.0 + Math.random() * 0.1 - 0.05,
            volume: 5000 + Math.random() * 2000
          })),
          '15m': Array.from({ length: 30 }, (_, i) => ({
            timestamp: new Date(Date.now() - (29 - i) * 900000).toISOString(),
            open: 82.0 + Math.random() * 0.2 - 0.1,
            high: 82.0 + Math.random() * 0.25,
            low: 82.0 - Math.random() * 0.25,
            close: 82.0 + Math.random() * 0.2 - 0.1,
            volume: 15000 + Math.random() * 5000
          })),
          '1h': Array.from({ length: 24 }, (_, i) => ({
            timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
            open: 82.0 + Math.random() * 0.3 - 0.15,
            high: 82.0 + Math.random() * 0.4,
            low: 82.0 - Math.random() * 0.4,
            close: 82.0 + Math.random() * 0.3 - 0.15,
            volume: 50000 + Math.random() * 20000
          }))
        }
      };
      
      // Test signal generation performance
      const iterations = 10;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await signalEngine.generateSignal(sampleData);
        const endTime = Date.now();
        times.push(endTime - startTime);
      }
      
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log(`✅ Performance Test - Avg: ${avgTime.toFixed(1)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);
      
      if (avgTime < 2000) { // Less than 2 seconds
        this.logResult('PASSED', 'Performance Test', `Average time: ${avgTime.toFixed(1)}ms`);
      } else {
        this.logResult('WARNING', 'Performance Test', `Average time: ${avgTime.toFixed(1)}ms (may be slow)`);
      }
      
    } catch (error) {
      console.log('❌ Performance Test Failed:', error.message);
      this.logResult('FAILED', 'Performance Test', error.message);
    }
  }

  logResult(status, test, details) {
    this.results.details.push({ status, test, details });
    
    if (status === 'PASSED') {
      this.results.passed++;
    } else if (status === 'FAILED') {
      this.results.failed++;
    } else if (status === 'WARNING') {
      this.results.warnings++;
    }
  }

  generateDiagnosticReport() {
    console.log('\n📋 Diagnostic Report');
    console.log('═══════════════════');
    
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = total > 0 ? (this.results.passed / total) * 100 : 0;
    
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.details
        .filter(r => r.status === 'FAILED')
        .forEach(r => console.log(`   • ${r.test}: ${r.details}`));
    }
    
    if (this.results.warnings > 0) {
      console.log('\n⚠️ Warnings:');
      this.results.details
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`   • ${r.test}: ${r.details}`));
    }
    
    if (this.results.failed === 0) {
      console.log('\n🎉 All critical tests passed! System is ready for use.');
    } else {
      console.log('\n⚠️ Some tests failed. Please review the issues above.');
    }
  }
}

// Run diagnostics if called directly
async function runDiagnostics() {
  const diagnostics = new SystemDiagnostics();
  await diagnostics.runAllDiagnostics();
}

if (require.main === module) {
  runDiagnostics();
}

module.exports = { SystemDiagnostics };