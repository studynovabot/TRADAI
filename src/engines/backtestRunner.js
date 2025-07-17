/**
 * Backtest Runner - Signal Engine Performance Testing
 * 
 * This module runs backtests on the signal engine across multiple
 * assets and timeframes to evaluate performance.
 */

const { Logger } = require('../utils/Logger');
const { SignalEngine } = require('./signalEngine');
const fs = require('fs-extra');
const path = require('path');

class BacktestRunner {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize signal engine
    this.signalEngine = new SignalEngine(config);
    
    // Backtest configuration
    this.backtestConfig = {
      assets: ['USD/INR', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'],
      timeframes: ['5m', '15m', '30m', '1h', '4h'],
      candlesPerTest: 15,
      dataDir: path.join(process.cwd(), 'data', 'backtest'),
      resultsDir: path.join(process.cwd(), 'data', 'results'),
      sampleDataDir: path.join(process.cwd(), 'data', 'sample')
    };
    
    this.logger.info('🧪 Backtest Runner initialized');
  }

  /**
   * Run backtest across all assets and timeframes
   */
  async runFullBacktest() {
    try {
      this.logger.info('🚀 Starting full backtest');
      
      // Create results directory
      await fs.ensureDir(this.backtestConfig.resultsDir);
      
      const startTime = Date.now();
      const results = {
        summary: {
          totalTests: 0,
          totalSignals: 0,
          validSignals: 0,
          accurateSignals: 0,
          averageConfidence: 0,
          byAsset: {},
          byTimeframe: {},
          byRegime: {},
          bySetupTag: {}
        },
        details: []
      };
      
      // Run tests for each asset and timeframe
      for (const asset of this.backtestConfig.assets) {
        results.summary.byAsset[asset] = {
          tests: 0,
          signals: 0,
          validSignals: 0,
          accurateSignals: 0,
          averageConfidence: 0
        };
        
        for (const timeframe of this.backtestConfig.timeframes) {
          this.logger.info(`🧪 Testing ${asset} on ${timeframe} timeframe`);
          
          // Get market data for this asset and timeframe
          const marketData = await this.getMarketData(asset, timeframe);
          if (!marketData) {
            this.logger.warn(`⚠️ No market data available for ${asset} on ${timeframe}`);
            continue;
          }
          
          // Run test
          const testResult = await this.runSingleTest(asset, timeframe, marketData);
          
          // Update results
          results.details.push(testResult);
          results.summary.totalTests++;
          results.summary.totalSignals += testResult.signals.length;
          results.summary.validSignals += testResult.validSignals;
          results.summary.accurateSignals += testResult.accurateSignals;
          
          // Update asset-specific results
          results.summary.byAsset[asset].tests++;
          results.summary.byAsset[asset].signals += testResult.signals.length;
          results.summary.byAsset[asset].validSignals += testResult.validSignals;
          results.summary.byAsset[asset].accurateSignals += testResult.accurateSignals;
          
          // Update timeframe-specific results
          if (!results.summary.byTimeframe[timeframe]) {
            results.summary.byTimeframe[timeframe] = {
              tests: 0,
              signals: 0,
              validSignals: 0,
              accurateSignals: 0,
              averageConfidence: 0
            };
          }
          
          results.summary.byTimeframe[timeframe].tests++;
          results.summary.byTimeframe[timeframe].signals += testResult.signals.length;
          results.summary.byTimeframe[timeframe].validSignals += testResult.validSignals;
          results.summary.byTimeframe[timeframe].accurateSignals += testResult.accurateSignals;
          
          // Update regime-specific results
          for (const signal of testResult.signals) {
            if (!signal.regime) continue;
            
            if (!results.summary.byRegime[signal.regime]) {
              results.summary.byRegime[signal.regime] = {
                signals: 0,
                validSignals: 0,
                accurateSignals: 0,
                averageConfidence: 0
              };
            }
            
            results.summary.byRegime[signal.regime].signals++;
            
            if (signal.execute) {
              results.summary.byRegime[signal.regime].validSignals++;
              
              if (signal.accurate) {
                results.summary.byRegime[signal.regime].accurateSignals++;
              }
              
              results.summary.byRegime[signal.regime].averageConfidence = 
                (results.summary.byRegime[signal.regime].averageConfidence * 
                 (results.summary.byRegime[signal.regime].validSignals - 1) + 
                 signal.confidence) / results.summary.byRegime[signal.regime].validSignals;
            }
            
            // Update setup tag-specific results
            if (signal.setupTag) {
              if (!results.summary.bySetupTag[signal.setupTag]) {
                results.summary.bySetupTag[signal.setupTag] = {
                  signals: 0,
                  validSignals: 0,
                  accurateSignals: 0,
                  averageConfidence: 0
                };
              }
              
              results.summary.bySetupTag[signal.setupTag].signals++;
              
              if (signal.execute) {
                results.summary.bySetupTag[signal.setupTag].validSignals++;
                
                if (signal.accurate) {
                  results.summary.bySetupTag[signal.setupTag].accurateSignals++;
                }
                
                results.summary.bySetupTag[signal.setupTag].averageConfidence = 
                  (results.summary.bySetupTag[signal.setupTag].averageConfidence * 
                   (results.summary.bySetupTag[signal.setupTag].validSignals - 1) + 
                   signal.confidence) / results.summary.bySetupTag[signal.setupTag].validSignals;
              }
            }
          }
        }
        
        // Calculate asset-specific average confidence
        if (results.summary.byAsset[asset].validSignals > 0) {
          results.summary.byAsset[asset].averageConfidence = 
            results.summary.byAsset[asset].accurateSignals / results.summary.byAsset[asset].validSignals;
        }
      }
      
      // Calculate overall average confidence
      if (results.summary.validSignals > 0) {
        results.summary.averageConfidence = 
          results.summary.accurateSignals / results.summary.validSignals;
      }
      
      // Calculate timeframe-specific average confidence
      for (const [timeframe, data] of Object.entries(results.summary.byTimeframe)) {
        if (data.validSignals > 0) {
          data.averageConfidence = data.accurateSignals / data.validSignals;
        }
      }
      
      // Calculate processing time
      const processingTime = Date.now() - startTime;
      results.summary.processingTime = processingTime;
      
      // Save results
      const resultsFile = path.join(this.backtestConfig.resultsDir, `backtest_results_${Date.now()}.json`);
      await fs.writeJson(resultsFile, results, { spaces: 2 });
      
      this.logger.info(`✅ Backtest completed in ${processingTime}ms`);
      this.logger.info(`📊 Overall accuracy: ${(results.summary.averageConfidence * 100).toFixed(1)}%`);
      this.logger.info(`📊 Valid signals: ${results.summary.validSignals}/${results.summary.totalSignals}`);
      this.logger.info(`📊 Results saved to: ${resultsFile}`);
      
      return results;
      
    } catch (error) {
      this.logger.error('❌ Backtest failed:', error);
      throw error;
    }
  }

  /**
   * Run a single backtest for a specific asset and timeframe
   */
  async runSingleTest(asset, timeframe, marketData) {
    try {
      const signals = [];
      let validSignals = 0;
      let accurateSignals = 0;
      
      // Generate signals for each candle
      for (let i = 50; i < marketData.data[timeframe].length - 5; i++) {
        // Create a subset of data up to the current candle
        const testData = {
          currencyPair: asset,
          timestamp: marketData.data[timeframe][i].timestamp,
          data: {}
        };
        
        // Copy data for all timeframes up to the current candle
        for (const tf of Object.keys(marketData.data)) {
          // Find the index in this timeframe that corresponds to the current candle
          const tfIndex = marketData.data[tf].findIndex(
            candle => new Date(candle.timestamp) >= new Date(marketData.data[timeframe][i].timestamp)
          );
          
          if (tfIndex > 0) {
            testData.data[tf] = marketData.data[tf].slice(0, tfIndex + 1);
          }
        }
        
        // Generate signal
        const signal = await this.signalEngine.generateSignal(testData);
        
        // Determine if signal was accurate (using future data)
        const accurate = this.evaluateSignalAccuracy(signal, marketData.data[timeframe].slice(i + 1, i + 6));
        
        // Add to results
        signals.push({
          ...signal,
          accurate,
          candle: i
        });
        
        if (signal.execute) {
          validSignals++;
          
          if (accurate) {
            accurateSignals++;
          }
        }
      }
      
      // Calculate accuracy
      const accuracy = validSignals > 0 ? accurateSignals / validSignals : 0;
      
      return {
        asset,
        timeframe,
        signals,
        validSignals,
        accurateSignals,
        accuracy
      };
      
    } catch (error) {
      this.logger.error(`❌ Test failed for ${asset} on ${timeframe}:`, error);
      return {
        asset,
        timeframe,
        signals: [],
        validSignals: 0,
        accurateSignals: 0,
        accuracy: 0,
        error: error.message
      };
    }
  }

  /**
   * Evaluate if a signal was accurate based on future price action
   */
  evaluateSignalAccuracy(signal, futureCandles) {
    if (!signal.execute || !futureCandles || futureCandles.length === 0) {
      return false;
    }
    
    // For UP signals, check if price went up in the next few candles
    if (signal.direction === 'UP') {
      const entryPrice = futureCandles[0].open;
      const maxPrice = Math.max(...futureCandles.map(candle => candle.high));
      const priceChange = (maxPrice - entryPrice) / entryPrice;
      
      // Consider accurate if price increased by at least 0.2%
      return priceChange >= 0.002;
    }
    // For DOWN signals, check if price went down in the next few candles
    else if (signal.direction === 'DOWN') {
      const entryPrice = futureCandles[0].open;
      const minPrice = Math.min(...futureCandles.map(candle => candle.low));
      const priceChange = (entryPrice - minPrice) / entryPrice;
      
      // Consider accurate if price decreased by at least 0.2%
      return priceChange >= 0.002;
    }
    
    return false;
  }

  /**
   * Get market data for a specific asset and timeframe
   */
  async getMarketData(asset, timeframe) {
    try {
      // Check if we have real backtest data
      const backtestFile = path.join(this.backtestConfig.dataDir, `${asset.replace('/', '_')}_${timeframe}.json`);
      
      if (await fs.pathExists(backtestFile)) {
        return await fs.readJson(backtestFile);
      }
      
      // Fall back to sample data
      const sampleFile = path.join(this.backtestConfig.sampleDataDir, 'market_data_sample.json');
      
      if (await fs.pathExists(sampleFile)) {
        const sampleData = await fs.readJson(sampleFile);
        sampleData.currencyPair = asset;
        return sampleData;
      }
      
      this.logger.warn(`⚠️ No market data found for ${asset} on ${timeframe}`);
      return null;
      
    } catch (error) {
      this.logger.error(`❌ Error getting market data for ${asset} on ${timeframe}:`, error);
      return null;
    }
  }
}

module.exports = { BacktestRunner };