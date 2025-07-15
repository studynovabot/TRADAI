/**
 * RollingBacktestEngine - Automated Signal Accuracy Validation
 * 
 * Runs nightly backtests on recent candles to validate AI signal accuracy
 * Calculates performance metrics and adaptive thresholds
 */

const { Logger } = require('../utils/Logger');
const fs = require('fs').promises;
const path = require('path');

class RollingBacktestEngine {
  constructor(config, dataCollector, aiAnalyzer, technicalAnalyzer) {
    this.config = config;
    this.dataCollector = dataCollector;
    this.aiAnalyzer = aiAnalyzer;
    this.technicalAnalyzer = technicalAnalyzer;
    this.logger = Logger.getInstanceSync();
    
    // Backtest configuration
    this.backtestEnabled = config.enableBacktest !== false; // Default to true
    this.backtestDays = config.backtestDays || 7; // Last 7 days
    this.backtestInterval = config.backtestInterval || 24 * 60 * 60 * 1000; // 24 hours
    this.minAccuracyThreshold = config.minAccuracyThreshold || 0.6; // 60% minimum
    this.confidenceAdjustment = config.confidenceAdjustment || 0.1; // 10% adjustment
    
    // Results storage
    this.backtestResults = [];
    this.performanceMetrics = {
      totalSignals: 0,
      correctSignals: 0,
      accuracy: 0,
      winRate: 0,
      avgConfidence: 0,
      lastUpdate: null
    };
    
    // File paths
    this.resultsDir = path.join(process.cwd(), 'backtest-results');
    this.resultsFile = path.join(this.resultsDir, 'rolling-backtest.json');
    this.metricsFile = path.join(this.resultsDir, 'performance-metrics.json');
    
    this.logger.info('🔄 RollingBacktestEngine initialized');
    this.initializeBacktest();
  }

  /**
   * Initialize backtest system
   */
  async initializeBacktest() {
    try {
      // Create results directory
      await fs.mkdir(this.resultsDir, { recursive: true });
      
      // Load existing results
      await this.loadExistingResults();
      
      // Schedule nightly backtests if enabled
      if (this.backtestEnabled) {
        this.scheduleNightlyBacktest();
        this.logger.info(`📊 Nightly backtests scheduled every ${this.backtestInterval / (60 * 60 * 1000)} hours`);
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize backtest engine:', error);
    }
  }

  /**
   * Schedule nightly backtest execution
   */
  scheduleNightlyBacktest() {
    // Calculate time until next 2 AM
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);
    
    if (next2AM <= now) {
      next2AM.setDate(next2AM.getDate() + 1);
    }
    
    const timeUntilNext = next2AM.getTime() - now.getTime();
    
    // Schedule first backtest
    setTimeout(() => {
      this.runNightlyBacktest();
      
      // Schedule recurring backtests
      setInterval(() => {
        this.runNightlyBacktest();
      }, this.backtestInterval);
      
    }, timeUntilNext);
    
    this.logger.info(`⏰ Next backtest scheduled for: ${next2AM.toLocaleString()}`);
  }

  /**
   * Run nightly backtest
   */
  async runNightlyBacktest() {
    try {
      this.logger.info('🔄 Starting nightly backtest...');
      
      // Get historical data for backtest period
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (this.backtestDays * 24 * 60 * 60 * 1000));
      
      const historicalData = await this.getHistoricalData(startTime, endTime);
      
      if (!historicalData || historicalData.length < 20) {
        this.logger.warn('⚠️ Insufficient historical data for backtest');
        return;
      }
      
      // Run backtest on historical data
      const backtestResults = await this.runBacktest(historicalData);
      
      // Calculate performance metrics
      const metrics = this.calculatePerformanceMetrics(backtestResults);
      
      // Update adaptive thresholds
      this.updateAdaptiveThresholds(metrics);
      
      // Save results
      await this.saveBacktestResults(backtestResults, metrics);
      
      this.logger.info(`✅ Nightly backtest complete: ${metrics.accuracy}% accuracy (${metrics.totalSignals} signals)`);
      
    } catch (error) {
      this.logger.error('❌ Nightly backtest failed:', error);
    }
  }

  /**
   * Get historical market data for backtest
   */
  async getHistoricalData(startTime, endTime) {
    try {
      // Use existing data collector to fetch historical data
      const currencyPair = this.config.currencyPair || 'USD/INR';
      
      // Calculate number of candles needed (1-minute intervals)
      const minutes = Math.floor((endTime - startTime) / (60 * 1000));
      const candleCount = Math.min(minutes, 1000); // Limit to 1000 candles
      
      this.logger.info(`📚 Fetching ${candleCount} historical candles for backtest...`);
      
      // Fetch historical data
      const historicalData = await this.dataCollector.getHistoricalData(currencyPair, candleCount);
      
      return historicalData;
      
    } catch (error) {
      this.logger.error('❌ Failed to fetch historical data:', error);
      return null;
    }
  }

  /**
   * Run backtest on historical data
   */
  async runBacktest(historicalData) {
    const results = [];
    const batchSize = 20; // Process in batches to avoid overwhelming APIs
    
    this.logger.info(`🔄 Running backtest on ${historicalData.length} candles...`);
    
    for (let i = batchSize; i < historicalData.length - 5; i += 5) { // Every 5 minutes
      try {
        // Get market data slice for analysis
        const marketSlice = historicalData.slice(i - batchSize, i);
        const currentCandle = historicalData[i];
        
        // Get future candles for outcome validation (5 minutes ahead)
        const futureCandles = historicalData.slice(i + 1, i + 6);
        
        if (futureCandles.length < 5) continue;
        
        // Generate technical analysis
        const technicalData = await this.technicalAnalyzer.analyze(marketSlice);
        
        // Generate AI signal (disable dual model for backtest speed)
        const originalUseDualModel = this.aiAnalyzer.useDualModel;
        this.aiAnalyzer.useDualModel = false;
        
        const aiDecision = await this.aiAnalyzer.analyze({
          currencyPair: this.config.currencyPair || 'USD/INR',
          marketData: marketSlice,
          technicalData: technicalData
        });
        
        this.aiAnalyzer.useDualModel = originalUseDualModel;
        
        // Calculate actual outcome
        const outcome = this.calculateOutcome(currentCandle, futureCandles, aiDecision);
        
        // Store result
        results.push({
          timestamp: new Date(currentCandle.timestamp),
          signal: aiDecision.decision,
          confidence: aiDecision.confidence,
          currentPrice: currentCandle.close,
          futurePrice: futureCandles[4].close, // 5 minutes later
          outcome: outcome,
          correct: outcome.correct,
          reason: aiDecision.reason?.substring(0, 100)
        });
        
        // Add small delay to avoid rate limiting
        if (i % 20 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        this.logger.error(`❌ Backtest error at index ${i}:`, error);
        continue;
      }
    }
    
    return results;
  }

  /**
   * Calculate signal outcome
   */
  calculateOutcome(currentCandle, futureCandles, aiDecision) {
    const currentPrice = currentCandle.close;
    const futurePrice = futureCandles[4].close; // 5 minutes later
    const priceChange = futurePrice - currentPrice;
    const priceChangePercent = (priceChange / currentPrice) * 100;
    
    let actualDirection = 'NO_TRADE';
    if (Math.abs(priceChangePercent) > 0.01) { // Minimum 0.01% movement
      actualDirection = priceChangePercent > 0 ? 'BUY' : 'SELL';
    }
    
    // Determine if signal was correct
    let correct = false;
    if (aiDecision.decision === 'NO_TRADE') {
      correct = Math.abs(priceChangePercent) <= 0.01; // Correct if minimal movement
    } else {
      correct = aiDecision.decision === actualDirection;
    }
    
    return {
      actualDirection: actualDirection,
      priceChange: priceChange,
      priceChangePercent: priceChangePercent,
      correct: correct,
      confidence: aiDecision.confidence
    };
  }

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics(results) {
    if (results.length === 0) {
      return {
        totalSignals: 0,
        correctSignals: 0,
        accuracy: 0,
        winRate: 0,
        avgConfidence: 0,
        lastUpdate: new Date()
      };
    }
    
    const totalSignals = results.length;
    const correctSignals = results.filter(r => r.correct).length;
    const accuracy = (correctSignals / totalSignals) * 100;
    
    // Calculate win rate for actual trades (excluding NO_TRADE)
    const tradeSignals = results.filter(r => r.signal !== 'NO_TRADE');
    const correctTrades = tradeSignals.filter(r => r.correct).length;
    const winRate = tradeSignals.length > 0 ? (correctTrades / tradeSignals.length) * 100 : 0;
    
    // Calculate average confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / totalSignals;
    
    // Update stored metrics
    this.performanceMetrics = {
      totalSignals: totalSignals,
      correctSignals: correctSignals,
      accuracy: Math.round(accuracy * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      lastUpdate: new Date(),
      bySignalType: {
        BUY: this.calculateSignalTypeMetrics(results, 'BUY'),
        SELL: this.calculateSignalTypeMetrics(results, 'SELL'),
        NO_TRADE: this.calculateSignalTypeMetrics(results, 'NO_TRADE')
      }
    };
    
    return this.performanceMetrics;
  }

  /**
   * Calculate metrics for specific signal type
   */
  calculateSignalTypeMetrics(results, signalType) {
    const typeResults = results.filter(r => r.signal === signalType);
    if (typeResults.length === 0) return { count: 0, accuracy: 0, avgConfidence: 0 };
    
    const correct = typeResults.filter(r => r.correct).length;
    const accuracy = (correct / typeResults.length) * 100;
    const avgConfidence = typeResults.reduce((sum, r) => sum + r.confidence, 0) / typeResults.length;
    
    return {
      count: typeResults.length,
      accuracy: Math.round(accuracy * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  }

  /**
   * Update adaptive thresholds based on performance
   */
  updateAdaptiveThresholds(metrics) {
    try {
      // Adjust confidence thresholds based on accuracy
      if (metrics.accuracy < this.minAccuracyThreshold * 100) {
        // Increase confidence threshold if accuracy is low
        this.config.minConfidenceThreshold = Math.min(80, (this.config.minConfidenceThreshold || 60) + 5);
        this.logger.info(`📈 Increased confidence threshold to ${this.config.minConfidenceThreshold}% due to low accuracy`);
      } else if (metrics.accuracy > 80) {
        // Decrease confidence threshold if accuracy is high
        this.config.minConfidenceThreshold = Math.max(50, (this.config.minConfidenceThreshold || 60) - 2);
        this.logger.info(`📉 Decreased confidence threshold to ${this.config.minConfidenceThreshold}% due to high accuracy`);
      }
      
      // Update ensemble consensus threshold
      if (metrics.accuracy < 70) {
        this.config.consensusThreshold = Math.min(0.8, (this.config.consensusThreshold || 0.6) + 0.1);
        this.logger.info(`📈 Increased ensemble consensus to ${this.config.consensusThreshold * 100}%`);
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to update adaptive thresholds:', error);
    }
  }

  /**
   * Save backtest results to files
   */
  async saveBacktestResults(results, metrics) {
    try {
      // Save detailed results
      await fs.writeFile(this.resultsFile, JSON.stringify({
        timestamp: new Date(),
        results: results,
        summary: {
          totalSignals: results.length,
          correctSignals: results.filter(r => r.correct).length,
          accuracy: metrics.accuracy
        }
      }, null, 2));

      // Save performance metrics
      await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));

      // Add to historical results
      this.backtestResults.push({
        date: new Date(),
        metrics: metrics,
        resultCount: results.length
      });

      // Keep only last 30 backtest results
      if (this.backtestResults.length > 30) {
        this.backtestResults = this.backtestResults.slice(-30);
      }

      this.logger.info(`💾 Backtest results saved: ${results.length} signals analyzed`);

    } catch (error) {
      this.logger.error('❌ Failed to save backtest results:', error);
    }
  }

  /**
   * Load existing backtest results
   */
  async loadExistingResults() {
    try {
      // Load performance metrics
      try {
        const metricsData = await fs.readFile(this.metricsFile, 'utf8');
        this.performanceMetrics = JSON.parse(metricsData);
        this.logger.info(`📊 Loaded existing metrics: ${this.performanceMetrics.accuracy}% accuracy`);
      } catch (error) {
        this.logger.info('📊 No existing metrics found, starting fresh');
      }

    } catch (error) {
      this.logger.error('❌ Failed to load existing results:', error);
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMetrics;
  }

  /**
   * Get backtest summary for display
   */
  getBacktestSummary() {
    const metrics = this.performanceMetrics;

    if (metrics.totalSignals === 0) {
      return 'No backtest data available yet';
    }

    return `📊 Backtest Summary (Last Update: ${new Date(metrics.lastUpdate).toLocaleDateString()})
    Total Signals: ${metrics.totalSignals}
    Accuracy: ${metrics.accuracy}%
    Win Rate: ${metrics.winRate}%
    Avg Confidence: ${metrics.avgConfidence}%

    By Signal Type:
    • BUY: ${metrics.bySignalType?.BUY?.count || 0} signals (${metrics.bySignalType?.BUY?.accuracy || 0}% accuracy)
    • SELL: ${metrics.bySignalType?.SELL?.count || 0} signals (${metrics.bySignalType?.SELL?.accuracy || 0}% accuracy)
    • NO_TRADE: ${metrics.bySignalType?.NO_TRADE?.count || 0} signals (${metrics.bySignalType?.NO_TRADE?.accuracy || 0}% accuracy)`;
  }

  /**
   * Run manual backtest for testing
   */
  async runManualBacktest(days = 3) {
    try {
      this.logger.info(`🔄 Running manual backtest for last ${days} days...`);

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (days * 24 * 60 * 60 * 1000));

      const historicalData = await this.getHistoricalData(startTime, endTime);

      if (!historicalData || historicalData.length < 20) {
        this.logger.warn('⚠️ Insufficient historical data for manual backtest');
        return null;
      }

      const results = await this.runBacktest(historicalData);
      const metrics = this.calculatePerformanceMetrics(results);

      this.logger.info(`✅ Manual backtest complete: ${metrics.accuracy}% accuracy (${metrics.totalSignals} signals)`);

      return {
        results: results,
        metrics: metrics,
        summary: this.getBacktestSummary()
      };

    } catch (error) {
      this.logger.error('❌ Manual backtest failed:', error);
      return null;
    }
  }

  /**
   * Check if signal should be filtered based on backtest performance
   */
  shouldFilterSignal(aiDecision) {
    const metrics = this.performanceMetrics;

    // If no backtest data, don't filter
    if (metrics.totalSignals === 0) return false;

    // Filter low confidence signals if overall accuracy is poor
    if (metrics.accuracy < 60 && aiDecision.confidence < 70) {
      this.logger.info(`🚫 Filtering low confidence signal due to poor backtest performance`);
      return true;
    }

    // Filter signal type with poor performance
    const signalTypeMetrics = metrics.bySignalType?.[aiDecision.decision];
    if (signalTypeMetrics && signalTypeMetrics.accuracy < 50 && signalTypeMetrics.count > 5) {
      this.logger.info(`🚫 Filtering ${aiDecision.decision} signal due to poor type performance`);
      return true;
    }

    return false;
  }
}

module.exports = RollingBacktestEngine;
