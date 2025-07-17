/**
 * Filter Weight Manager - Adaptive Filter Weighting System
 * 
 * This module manages and adapts filter weights based on historical performance.
 * Filters that consistently lead to successful trades get higher weights,
 * while underperforming filters get lower weights.
 */

const { Logger } = require('../utils/Logger');
const fs = require('fs-extra');
const path = require('path');

class FilterWeightManager {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Weight management configuration
    this.weightConfig = {
      defaultWeight: 1.0,
      minWeight: 0.5,
      maxWeight: 2.0,
      learningRate: 0.05,
      successBonus: 0.1,
      failurePenalty: 0.05,
      minSampleSize: 5,
      weightDecay: 0.001,
      saveInterval: 50 // Save weights every 50 updates
    };
    
    // Filter weights storage
    this.filterWeights = {};
    this.filterStats = {};
    this.updateCount = 0;
    
    // Initialize weights
    this.initializeWeights();
    
    this.logger.info('⚖️ Filter Weight Manager initialized');
  }

  /**
   * Initialize filter weights
   */
  async initializeWeights() {
    try {
      // Load weights from file if exists
      const weightsFile = path.join(process.cwd(), 'data', 'models', 'filter_weights.json');
      
      if (await fs.pathExists(weightsFile)) {
        const savedData = await fs.readJson(weightsFile);
        this.filterWeights = savedData.weights || {};
        this.filterStats = savedData.stats || {};
        this.logger.info(`✅ Loaded filter weights for ${Object.keys(this.filterWeights).length} filters`);
      } else {
        this.logger.info('⚠️ No saved filter weights found, using defaults');
        this.filterWeights = this.getDefaultWeights();
        await this.saveWeights();
      }
    } catch (error) {
      this.logger.error('❌ Error initializing filter weights:', error);
      this.filterWeights = this.getDefaultWeights();
    }
  }

  /**
   * Get default weights for common filters
   */
  getDefaultWeights() {
    return {
      // Momentum filters
      'rsi_oversold': 1.0,
      'rsi_overbought': 1.0,
      'rsi_bullish_divergence': 1.5,
      'rsi_bearish_divergence': 1.5,
      'macd_bullish_cross': 1.2,
      'macd_bearish_cross': 1.2,
      'macd_histogram_bullish': 1.1,
      'macd_histogram_bearish': 1.1,
      
      // Trend filters
      'ema_bullish_alignment': 1.4,
      'ema_bearish_alignment': 1.4,
      'ema8_cross_above_ema21': 1.3,
      'ema8_cross_below_ema21': 1.3,
      'adx_bullish_trend': 1.2,
      'adx_bearish_trend': 1.2,
      
      // SMC filters
      'near_bullish_ob': 1.7,
      'near_bearish_ob': 1.7,
      'at_bullish_fvg': 1.6,
      'at_bearish_fvg': 1.6,
      
      // Volume filters
      'volume_spike': 1.1,
      'obv_bullish': 1.0,
      'obv_bearish': 1.0,
      'above_vwap': 1.0,
      'below_vwap': 1.0
    };
  }

  /**
   * Get current weights for a specific currency pair and regime
   * @param {String} currencyPair - Currency pair
   * @param {String} regime - Market regime
   * @returns {Object} Filter weights
   */
  async getCurrentWeights(currencyPair, regime) {
    // Get base weights
    const baseWeights = { ...this.filterWeights };
    
    // Check if we have pair-specific weights
    const pairKey = `${currencyPair}`;
    if (this.filterWeights[pairKey]) {
      // Merge pair-specific weights with base weights
      Object.assign(baseWeights, this.filterWeights[pairKey]);
    }
    
    // Check if we have regime-specific weights
    const regimeKey = `${regime}`;
    if (this.filterWeights[regimeKey]) {
      // Merge regime-specific weights with current weights
      Object.assign(baseWeights, this.filterWeights[regimeKey]);
    }
    
    // Check if we have pair+regime specific weights
    const pairRegimeKey = `${currencyPair}_${regime}`;
    if (this.filterWeights[pairRegimeKey]) {
      // Merge pair+regime specific weights with current weights
      Object.assign(baseWeights, this.filterWeights[pairRegimeKey]);
    }
    
    return baseWeights;
  }

  /**
   * Update filter weights based on trade result
   * @param {Object} result - Trade result with filters and outcome
   */
  async updateWeights(result) {
    try {
      if (!result || !result.filters) return;
      
      const success = result.success || false;
      const filters = result.filters;
      const currencyPair = result.currencyPair || 'GENERIC';
      const regime = result.regime || 'GENERIC';
      
      // Update filter stats
      for (const [filterName, filterResult] of Object.entries(filters)) {
        if (!filterResult.passed) continue;
        
        // Initialize stats for this filter if not exists
        if (!this.filterStats[filterName]) {
          this.filterStats[filterName] = {
            totalUses: 0,
            successCount: 0,
            failureCount: 0,
            successRate: 0
          };
        }
        
        // Update stats
        this.filterStats[filterName].totalUses++;
        if (success) {
          this.filterStats[filterName].successCount++;
        } else {
          this.filterStats[filterName].failureCount++;
        }
        
        // Calculate success rate
        const totalUses = this.filterStats[filterName].totalUses;
        const successCount = this.filterStats[filterName].successCount;
        this.filterStats[filterName].successRate = totalUses > 0 ? successCount / totalUses : 0;
        
        // Only update weights if we have enough samples
        if (totalUses >= this.weightConfig.minSampleSize) {
          // Get current weight
          const currentWeight = this.filterWeights[filterName] || this.weightConfig.defaultWeight;
          
          // Calculate weight adjustment
          let adjustment = 0;
          if (success) {
            adjustment = this.weightConfig.successBonus * this.weightConfig.learningRate;
          } else {
            adjustment = -this.weightConfig.failurePenalty * this.weightConfig.learningRate;
          }
          
          // Apply weight decay (regression to mean)
          const decay = (currentWeight - this.weightConfig.defaultWeight) * this.weightConfig.weightDecay;
          adjustment -= decay;
          
          // Update weight
          let newWeight = currentWeight + adjustment;
          newWeight = Math.max(this.weightConfig.minWeight, 
                     Math.min(this.weightConfig.maxWeight, newWeight));
          
          // Store updated weight
          this.filterWeights[filterName] = newWeight;
          
          // Store pair-specific weight if we have enough samples
          if (this.filterStats[filterName].totalUses >= this.weightConfig.minSampleSize * 2) {
            const pairKey = `${currencyPair}`;
            if (!this.filterWeights[pairKey]) {
              this.filterWeights[pairKey] = {};
            }
            this.filterWeights[pairKey][filterName] = newWeight;
            
            // Store regime-specific weight if we have enough samples
            if (this.filterStats[filterName].totalUses >= this.weightConfig.minSampleSize * 3) {
              const regimeKey = `${regime}`;
              if (!this.filterWeights[regimeKey]) {
                this.filterWeights[regimeKey] = {};
              }
              this.filterWeights[regimeKey][filterName] = newWeight;
              
              // Store pair+regime specific weight if we have enough samples
              if (this.filterStats[filterName].totalUses >= this.weightConfig.minSampleSize * 4) {
                const pairRegimeKey = `${currencyPair}_${regime}`;
                if (!this.filterWeights[pairRegimeKey]) {
                  this.filterWeights[pairRegimeKey] = {};
                }
                this.filterWeights[pairRegimeKey][filterName] = newWeight;
              }
            }
          }
        }
      }
      
      // Increment update count and save periodically
      this.updateCount++;
      if (this.updateCount % this.weightConfig.saveInterval === 0) {
        await this.saveWeights();
      }
      
    } catch (error) {
      this.logger.error('❌ Error updating filter weights:', error);
    }
  }

  /**
   * Save weights to file
   */
  async saveWeights() {
    try {
      const weightsFile = path.join(process.cwd(), 'data', 'models', 'filter_weights.json');
      await fs.ensureDir(path.dirname(weightsFile));
      
      const dataToSave = {
        weights: this.filterWeights,
        stats: this.filterStats,
        lastUpdate: new Date().toISOString()
      };
      
      await fs.writeJson(weightsFile, dataToSave, { spaces: 2 });
      this.logger.info('💾 Filter weights saved successfully');
      
    } catch (error) {
      this.logger.error('❌ Error saving filter weights:', error);
    }
  }

  /**
   * Get filter performance statistics
   */
  getFilterStats() {
    const stats = [];
    
    for (const [filterName, filterStat] of Object.entries(this.filterStats)) {
      if (filterStat.totalUses >= this.weightConfig.minSampleSize) {
        stats.push({
          name: filterName,
          weight: this.filterWeights[filterName] || this.weightConfig.defaultWeight,
          successRate: filterStat.successRate,
          totalUses: filterStat.totalUses,
          successCount: filterStat.successCount,
          failureCount: filterStat.failureCount
        });
      }
    }
    
    // Sort by success rate
    return stats.sort((a, b) => b.successRate - a.successRate);
  }

  /**
   * Reset weights to defaults
   */
  async resetWeights() {
    this.filterWeights = this.getDefaultWeights();
    this.filterStats = {};
    this.updateCount = 0;
    await this.saveWeights();
    this.logger.info('🔄 Filter weights reset to defaults');
  }
}

module.exports = { FilterWeightManager };