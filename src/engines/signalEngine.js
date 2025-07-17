/**
 * Advanced Signal Engine - Core Logic for Signal Generation
 * 
 * This module implements an intelligent signal generation system with:
 * - Multi-factor confluence engine
 * - Market regime detection
 * - Adaptive filter weighting
 * - Smart Money Concepts (SMC)
 * - Pattern recognition
 * - Confidence scoring
 */

const { Logger } = require('../utils/Logger');
const fs = require('fs-extra');
const path = require('path');
const { MarketRegimeDetector } = require('./marketRegimeDetector');
const { ConfluenceFilters } = require('./confluenceFilters');
const { SetupTagger } = require('./setupTagger');
const { ConfidenceScorer } = require('./confidenceScorer');
const { FilterWeightManager } = require('./filterWeightManager');
const { TradeLogger } = require('./tradeLogger');

class SignalEngine {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Initialize sub-components
    this.marketRegimeDetector = new MarketRegimeDetector(config);
    this.confluenceFilters = new ConfluenceFilters(config);
    this.setupTagger = new SetupTagger(config);
    this.confidenceScorer = new ConfidenceScorer(config);
    this.filterWeightManager = new FilterWeightManager(config);
    this.tradeLogger = new TradeLogger(config);
    
    // Signal generation configuration
    this.signalConfig = {
      minConfidenceThreshold: 0.65, // Minimum 65% confidence to generate signal
      minFiltersRequired: 4,        // At least 4 filters must align
      maxContradictions: 1,         // Maximum allowed contradicting filters
      enableAdaptiveWeighting: true,
      enableMarketRegimeFiltering: true,
      enableSmartMoneyPatterns: true,
      enableCandlePatterns: true,
      enableVolumeAnalysis: true
    };
    
    // Performance tracking
    this.performance = {
      totalSignals: 0,
      accurateSignals: 0,
      averageConfidence: 0,
      signalsByRegime: {
        trending: { count: 0, accurate: 0 },
        ranging: { count: 0, accurate: 0 },
        volatile: { count: 0, accurate: 0 },
        lowVolume: { count: 0, accurate: 0 }
      },
      topPerformingSetups: []
    };
    
    this.logger.info('🚀 Advanced Signal Engine initialized');
  }

  /**
   * Generate trading signal with multi-factor confluence
   * @param {Object} marketData - Market data for multiple timeframes
   * @returns {Object} Signal with direction, confidence, and reasoning
   */
  async generateSignal(marketData) {
    try {
      // 1. Detect market regime
      const regime = await this.marketRegimeDetector.detectRegime(marketData);
      
      // 2. Apply filters based on market regime
      const filterResults = await this.applyFiltersForRegime(marketData, regime);
      
      // 3. Calculate confidence score
      const confidenceResult = this.confidenceScorer.calculateConfidence(filterResults, regime);
      
      // 4. Generate setup tag
      const setupTag = this.setupTagger.generateSetupTag(filterResults, regime);
      
      // 5. Apply signal quality filters
      const signalQuality = this.evaluateSignalQuality(confidenceResult, filterResults, regime);
      
      // 6. Create final signal
      const signal = this.createSignal(
        confidenceResult.direction,
        confidenceResult.confidence,
        filterResults,
        regime,
        setupTag,
        signalQuality
      );
      
      // 7. Log signal for learning
      await this.logSignalForLearning(signal);
      
      return signal;
      
    } catch (error) {
      this.logger.error('❌ Signal generation failed:', error);
      return this.createErrorSignal(error.message);
    }
  }

  /**
   * Apply appropriate filters based on market regime
   */
  async applyFiltersForRegime(marketData, regime) {
    // Get current filter weights from adaptive system
    const filterWeights = await this.filterWeightManager.getCurrentWeights(
      marketData.currencyPair,
      regime.type
    );
    
    // Apply different filter sets based on regime
    let filterResults = {};
    
    switch (regime.type) {
      case 'TRENDING':
        // In trending markets, prioritize trend-following filters
        filterResults = await this.confluenceFilters.applyTrendingFilters(marketData, filterWeights);
        break;
        
      case 'RANGING':
        // In ranging markets, prioritize reversal and range-bound filters
        filterResults = await this.confluenceFilters.applyRangingFilters(marketData, filterWeights);
        break;
        
      case 'VOLATILE':
        // In volatile markets, use specialized volatility filters
        filterResults = await this.confluenceFilters.applyVolatileFilters(marketData, filterWeights);
        break;
        
      case 'LOW_VOLUME':
        // In low volume markets, use conservative filters or avoid trading
        filterResults = await this.confluenceFilters.applyLowVolumeFilters(marketData, filterWeights);
        break;
        
      default:
        // Default to balanced filter set
        filterResults = await this.confluenceFilters.applyBalancedFilters(marketData, filterWeights);
    }
    
    // Add Smart Money Concept filters if enabled
    if (this.signalConfig.enableSmartMoneyPatterns) {
      const smcResults = await this.confluenceFilters.applySmartMoneyFilters(marketData);
      filterResults = { ...filterResults, ...smcResults };
    }
    
    // Add candlestick pattern filters if enabled
    if (this.signalConfig.enableCandlePatterns) {
      const patternResults = await this.confluenceFilters.applyCandlePatternFilters(marketData);
      filterResults = { ...filterResults, ...patternResults };
    }
    
    // Add volume analysis if enabled
    if (this.signalConfig.enableVolumeAnalysis) {
      const volumeResults = await this.confluenceFilters.applyVolumeFilters(marketData);
      filterResults = { ...filterResults, ...volumeResults };
    }
    
    return {
      filters: filterResults,
      regime: regime,
      passedCount: this.countPassedFilters(filterResults),
      contradictionCount: this.countContradictions(filterResults),
      totalFilters: Object.keys(filterResults).length
    };
  }

  /**
   * Count how many filters passed (returned true)
   */
  countPassedFilters(filterResults) {
    return Object.values(filterResults).filter(result => 
      result.passed === true
    ).length;
  }

  /**
   * Count contradicting signals (e.g., some bullish, some bearish)
   */
  countContradictions(filterResults) {
    const bullishCount = Object.values(filterResults).filter(result => 
      result.passed === true && result.direction === 'UP'
    ).length;
    
    const bearishCount = Object.values(filterResults).filter(result => 
      result.passed === true && result.direction === 'DOWN'
    ).length;
    
    // If we have both bullish and bearish signals, there's contradiction
    return (bullishCount > 0 && bearishCount > 0) ? Math.min(bullishCount, bearishCount) : 0;
  }

  /**
   * Evaluate overall signal quality
   */
  evaluateSignalQuality(confidenceResult, filterResults, regime) {
    // Check if we meet minimum confidence threshold
    if (confidenceResult.confidence < this.signalConfig.minConfidenceThreshold) {
      return {
        valid: false,
        reason: `Low confidence: ${(confidenceResult.confidence * 100).toFixed(1)}%`
      };
    }
    
    // Check if we have enough aligned filters
    if (filterResults.passedCount < this.signalConfig.minFiltersRequired) {
      return {
        valid: false,
        reason: `Insufficient filter alignment: ${filterResults.passedCount}/${this.signalConfig.minFiltersRequired}`
      };
    }
    
    // Check for too many contradictions
    if (filterResults.contradictionCount > this.signalConfig.maxContradictions) {
      return {
        valid: false,
        reason: `Too many contradicting signals: ${filterResults.contradictionCount}`
      };
    }
    
    // Check if regime is suitable for trading
    if (regime.type === 'LOW_VOLUME' || (regime.type === 'VOLATILE' && confidenceResult.confidence < 0.75)) {
      return {
        valid: false,
        reason: `Unsuitable market regime: ${regime.type}`
      };
    }
    
    // All checks passed
    return {
      valid: true,
      reason: 'Signal meets all quality criteria'
    };
  }

  /**
   * Create final signal object
   */
  createSignal(direction, confidence, filterResults, regime, setupTag, signalQuality) {
    // If signal quality check failed, return no-trade signal
    if (!signalQuality.valid) {
      return {
        timestamp: new Date().toISOString(),
        direction: 'NONE',
        confidence: 0,
        execute: false,
        regime: regime.type,
        reasoning: `No trade: ${signalQuality.reason}`,
        setupTag: 'NO_TRADE',
        filters: filterResults.filters,
        passedFilters: filterResults.passedCount,
        totalFilters: filterResults.totalFilters,
        contradictions: filterResults.contradictionCount
      };
    }
    
    // Create detailed reasoning based on passed filters
    const passedFilters = Object.entries(filterResults.filters)
      .filter(([_, result]) => result.passed)
      .map(([name, result]) => `${name} (${result.direction}): ${result.reason}`);
    
    // Create reasoning text
    const reasoning = `${direction} signal with ${(confidence * 100).toFixed(1)}% confidence in ${regime.type} market. Setup: ${setupTag}. Key factors: ${passedFilters.slice(0, 3).join('; ')}`;
    
    return {
      timestamp: new Date().toISOString(),
      direction: direction,
      confidence: confidence,
      execute: true,
      regime: regime.type,
      reasoning: reasoning,
      setupTag: setupTag,
      filters: filterResults.filters,
      passedFilters: filterResults.passedCount,
      totalFilters: filterResults.totalFilters,
      contradictions: filterResults.contradictionCount,
      keyFactors: passedFilters
    };
  }

  /**
   * Create error signal when generation fails
   */
  createErrorSignal(errorMessage) {
    return {
      timestamp: new Date().toISOString(),
      direction: 'NONE',
      confidence: 0,
      execute: false,
      regime: 'UNKNOWN',
      reasoning: `Signal generation error: ${errorMessage}`,
      setupTag: 'ERROR',
      filters: {},
      passedFilters: 0,
      totalFilters: 0,
      contradictions: 0
    };
  }

  /**
   * Log signal for learning and adaptation
   */
  async logSignalForLearning(signal) {
    try {
      await this.tradeLogger.logSignal(signal);
      this.performance.totalSignals++;
      
      // Update regime statistics
      if (signal.regime && this.performance.signalsByRegime[signal.regime.toLowerCase()]) {
        this.performance.signalsByRegime[signal.regime.toLowerCase()].count++;
      }
      
    } catch (error) {
      this.logger.error('❌ Failed to log signal for learning:', error);
    }
  }

  /**
   * Update signal result for learning
   */
  async updateSignalResult(signalId, result) {
    try {
      await this.tradeLogger.updateSignalResult(signalId, result);
      
      // Update performance metrics
      if (result.success) {
        this.performance.accurateSignals++;
        
        // Update regime accuracy
        if (result.regime && this.performance.signalsByRegime[result.regime.toLowerCase()]) {
          this.performance.signalsByRegime[result.regime.toLowerCase()].accurate++;
        }
      }
      
      // Update filter weights based on result
      if (this.signalConfig.enableAdaptiveWeighting) {
        await this.filterWeightManager.updateWeights(result);
      }
      
      // Update average confidence
      this.performance.averageConfidence = 
        (this.performance.averageConfidence * (this.performance.totalSignals - 1) + result.confidence) / 
        this.performance.totalSignals;
      
      // Update top performing setups
      await this.updateTopPerformingSetups();
      
    } catch (error) {
      this.logger.error('❌ Failed to update signal result:', error);
    }
  }

  /**
   * Update top performing setup tags
   */
  async updateTopPerformingSetups() {
    try {
      const setupStats = await this.tradeLogger.getSetupPerformance();
      
      // Sort by win rate and minimum sample size
      const topSetups = setupStats
        .filter(setup => setup.totalTrades >= 5) // Minimum 5 trades for statistical relevance
        .sort((a, b) => b.winRate - a.winRate)
        .slice(0, 10); // Top 10
      
      this.performance.topPerformingSetups = topSetups;
      
    } catch (error) {
      this.logger.error('❌ Failed to update top performing setups:', error);
    }
  }

  /**
   * Get signal engine performance metrics
   */
  getPerformanceMetrics() {
    const accuracy = this.performance.totalSignals > 0 ? 
      this.performance.accurateSignals / this.performance.totalSignals : 0;
    
    return {
      totalSignals: this.performance.totalSignals,
      accurateSignals: this.performance.accurateSignals,
      accuracy: accuracy,
      averageConfidence: this.performance.averageConfidence,
      signalsByRegime: this.performance.signalsByRegime,
      topPerformingSetups: this.performance.topPerformingSetups
    };
  }
}

module.exports = { SignalEngine };