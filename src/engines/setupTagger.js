/**
 * Setup Tagger - Signal Pattern Classification
 * 
 * This module creates descriptive tags for trading setups based on
 * the combination of technical filters that triggered the signal.
 */

const { Logger } = require('../utils/Logger');

class SetupTagger {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Setup categories and their priority
    this.setupCategories = {
      momentum: {
        priority: 3,
        filters: ['rsi', 'macd', 'stoch'],
        tags: {
          'rsi_oversold': 'RSI Oversold',
          'rsi_overbought': 'RSI Overbought',
          'rsi_bullish_divergence': 'RSI Bullish Divergence',
          'rsi_bearish_divergence': 'RSI Bearish Divergence',
          'macd_bullish_cross': 'MACD Bullish Cross',
          'macd_bearish_cross': 'MACD Bearish Cross',
          'macd_histogram_bullish': 'MACD Histogram Bullish',
          'macd_histogram_bearish': 'MACD Histogram Bearish'
        }
      },
      trend: {
        priority: 2,
        filters: ['ema', 'adx', 'supertrend'],
        tags: {
          'ema_bullish_alignment': 'EMA Bullish Alignment',
          'ema_bearish_alignment': 'EMA Bearish Alignment',
          'ema8_cross_above_ema21': 'EMA8 Cross Above EMA21',
          'ema8_cross_below_ema21': 'EMA8 Cross Below EMA21',
          'adx_bullish_trend': 'ADX Bullish Trend',
          'adx_bearish_trend': 'ADX Bearish Trend'
        }
      },
      smc: {
        priority: 1,
        filters: ['ob', 'fvg', 'liquidity'],
        tags: {
          'near_bullish_ob': 'Bullish Order Block',
          'near_bearish_ob': 'Bearish Order Block',
          'at_bullish_fvg': 'Bullish Fair Value Gap',
          'at_bearish_fvg': 'Bearish Fair Value Gap'
        }
      },
      pattern: {
        priority: 4,
        filters: ['engulfing', 'doji', 'pattern'],
        tags: {
          'bullish_engulfing': 'Bullish Engulfing',
          'bearish_engulfing': 'Bearish Engulfing',
          'doji_reversal': 'Doji Reversal',
          'pin_bar': 'Pin Bar'
        }
      },
      volume: {
        priority: 5,
        filters: ['volume', 'obv', 'vwap'],
        tags: {
          'volume_spike': 'Volume Spike',
          'obv_bullish': 'OBV Bullish',
          'obv_bearish': 'OBV Bearish',
          'above_vwap': 'Above VWAP',
          'below_vwap': 'Below VWAP'
        }
      }
    };
    
    // Predefined setup combinations
    this.setupCombinations = {
      'RSI Divergence + Order Block': {
        requires: ['rsi_bullish_divergence', 'near_bullish_ob'],
        name: 'RSI Divergence at Order Block'
      },
      'MACD Cross + EMA Alignment': {
        requires: ['macd_bullish_cross', 'ema_bullish_alignment'],
        name: 'MACD Cross with EMA Alignment'
      },
      'Double Confirmation Reversal': {
        requires: ['rsi_oversold', 'macd_histogram_bullish'],
        name: 'Double Confirmation Reversal'
      },
      'Triple Screen Bullish': {
        requires: ['ema_bullish_alignment', 'macd_bullish_cross', 'volume_spike'],
        name: 'Triple Screen Bullish'
      },
      'SMC Premium Entry': {
        requires: ['near_bullish_ob', 'at_bullish_fvg'],
        name: 'SMC Premium Entry'
      }
    };
    
    this.logger.info('🏷️ Setup Tagger initialized');
  }

  /**
   * Generate setup tag based on filter results
   * @param {Object} filterResults - Results from confluence filters
   * @param {Object} regime - Detected market regime
   * @returns {String} Setup tag
   */
  generateSetupTag(filterResults, regime) {
    try {
      // Extract passed filters
      const passedFilters = this.extractPassedFilters(filterResults.filters);
      
      // Determine signal direction
      const direction = this.determineSignalDirection(passedFilters);
      if (direction === 'NONE') return 'NO_SIGNAL';
      
      // Check for predefined combinations first
      const combinationTag = this.checkForPredefinedCombinations(passedFilters);
      if (combinationTag) {
        return `${direction === 'UP' ? 'BULLISH' : 'BEARISH'} ${combinationTag}`;
      }
      
      // Generate custom tag based on passed filters
      return this.generateCustomTag(passedFilters, direction, regime);
      
    } catch (error) {
      this.logger.error('❌ Error generating setup tag:', error);
      return 'GENERIC_SIGNAL';
    }
  }

  /**
   * Extract passed filters from filter results
   */
  extractPassedFilters(filters) {
    const passed = [];
    
    for (const [name, result] of Object.entries(filters)) {
      if (result.passed) {
        passed.push({
          name,
          direction: result.direction,
          weight: result.weight || 1.0
        });
      }
    }
    
    return passed;
  }

  /**
   * Determine signal direction based on majority of passed filters
   */
  determineSignalDirection(passedFilters) {
    let upCount = 0;
    let downCount = 0;
    
    for (const filter of passedFilters) {
      if (filter.direction === 'UP') {
        upCount++;
      } else if (filter.direction === 'DOWN') {
        downCount++;
      }
    }
    
    // If there's a tie, return NONE
    if (upCount === downCount) return 'NONE';
    
    return upCount > downCount ? 'UP' : 'DOWN';
  }

  /**
   * Check if passed filters match any predefined combinations
   */
  checkForPredefinedCombinations(passedFilters) {
    const filterNames = passedFilters.map(filter => filter.name);
    
    for (const [key, combination] of Object.entries(this.setupCombinations)) {
      // Check if all required filters are present
      const allRequired = combination.requires.every(required => {
        // Check if any filter name contains the required string
        return filterNames.some(name => name.includes(required));
      });
      
      if (allRequired) {
        return combination.name;
      }
    }
    
    return null;
  }

  /**
   * Generate custom tag based on passed filters
   */
  generateCustomTag(passedFilters, direction, regime) {
    // Group filters by category
    const categorizedFilters = {};
    
    for (const filter of passedFilters) {
      // Only include filters that match the overall direction
      if (filter.direction !== direction) continue;
      
      // Determine filter category
      let category = 'other';
      for (const [cat, config] of Object.entries(this.setupCategories)) {
        if (config.filters.some(f => filter.name.includes(f))) {
          category = cat;
          break;
        }
      }
      
      if (!categorizedFilters[category]) {
        categorizedFilters[category] = [];
      }
      
      categorizedFilters[category].push(filter);
    }
    
    // Sort categories by priority
    const sortedCategories = Object.keys(categorizedFilters).sort((a, b) => {
      const priorityA = this.setupCategories[a]?.priority || 99;
      const priorityB = this.setupCategories[b]?.priority || 99;
      return priorityA - priorityB;
    });
    
    // Take top 2-3 categories
    const topCategories = sortedCategories.slice(0, 3);
    
    // Build tag components
    const tagComponents = [];
    
    for (const category of topCategories) {
      const filters = categorizedFilters[category];
      if (!filters || filters.length === 0) continue;
      
      // Get the highest weighted filter in this category
      const topFilter = filters.reduce((prev, current) => 
        (current.weight > prev.weight) ? current : prev
      );
      
      // Get readable tag for this filter
      const filterTag = this.getReadableFilterTag(topFilter.name);
      if (filterTag) {
        tagComponents.push(filterTag);
      }
    }
    
    // Add regime context if available
    let regimePrefix = '';
    if (regime && regime.type) {
      switch (regime.type) {
        case 'TRENDING':
          regimePrefix = direction === 'UP' ? 'Trend Following' : 'Counter-Trend';
          break;
        case 'RANGING':
          regimePrefix = 'Range';
          break;
        case 'VOLATILE':
          regimePrefix = 'Volatility';
          break;
      }
    }
    
    // Combine components
    const directionPrefix = direction === 'UP' ? 'BULLISH' : 'BEARISH';
    
    if (tagComponents.length === 0) {
      return `${directionPrefix} SIGNAL`;
    }
    
    if (regimePrefix) {
      return `${directionPrefix} ${regimePrefix} ${tagComponents.join(' + ')}`;
    }
    
    return `${directionPrefix} ${tagComponents.join(' + ')}`;
  }

  /**
   * Get readable tag for a filter name
   */
  getReadableFilterTag(filterName) {
    // Extract timeframe if present
    const timeframeMatch = filterName.match(/^(\d+[mh])_/);
    const timeframe = timeframeMatch ? timeframeMatch[1] : '';
    
    // Check all categories for matching tags
    for (const category of Object.values(this.setupCategories)) {
      for (const [pattern, tag] of Object.entries(category.tags)) {
        if (filterName.includes(pattern)) {
          return timeframe ? `${tag} (${timeframe})` : tag;
        }
      }
    }
    
    // Generic fallback
    return filterName.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
}

module.exports = { SetupTagger };