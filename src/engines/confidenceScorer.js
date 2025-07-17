/**
 * Confidence Scorer - Dynamic Signal Confidence Calculation
 * 
 * This module calculates signal confidence based on:
 * - Number and quality of passed filters
 * - Filter weights (adaptive)
 * - Market regime compatibility
 * - Historical performance of similar setups
 */

const { Logger } = require('../utils/Logger');

class ConfidenceScorer {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Confidence calculation configuration
    this.confidenceConfig = {
      baseConfidence: 0.5,        // Starting confidence level
      minConfidence: 0.3,         // Minimum confidence floor
      maxConfidence: 0.95,        // Maximum confidence ceiling
      filterPassMultiplier: 0.05, // Each passed filter adds this * weight
      contradictionPenalty: 0.1,  // Penalty for each contradiction
      regimeBonus: {              // Bonus for regime-appropriate filters
        TRENDING: 0.1,
        RANGING: 0.1,
        VOLATILE: 0.05,
        LOW_VOLUME: 0.0
      },
      categoryWeights: {          // Weight multipliers by filter category
        momentum: 1.0,
        trend: 1.0,
        volume: 0.8,
        structure: 1.2,
        volatility: 0.7,
        smc: 1.5,
        pattern: 0.9
      }
    };
    
    this.logger.info('🎯 Confidence Scorer initialized');
  }

  /**
   * Calculate confidence score based on filter results
   * @param {Object} filterResults - Results from confluence filters
   * @param {Object} regime - Detected market regime
   * @returns {Object} Confidence result with direction and score
   */
  calculateConfidence(filterResults, regime) {
    try {
      // Extract passed filters
      const passedFilters = this.extractPassedFilters(filterResults.filters);
      
      // Determine signal direction based on majority of passed filters
      const direction = this.determineSignalDirection(passedFilters);
      
      // Calculate base confidence
      let confidence = this.confidenceConfig.baseConfidence;
      
      // Add confidence for each passed filter based on weight
      for (const filter of passedFilters) {
        // Skip filters that contradict the main direction
        if (filter.direction !== direction) continue;
        
        // Get filter category and apply category weight
        const category = this.getFilterCategory(filter.name);
        const categoryMultiplier = this.confidenceConfig.categoryWeights[category] || 1.0;
        
        // Apply filter weight to confidence
        confidence += this.confidenceConfig.filterPassMultiplier * filter.weight * categoryMultiplier;
      }
      
      // Apply contradiction penalty
      const contradictions = filterResults.contradictionCount || 0;
      confidence -= contradictions * this.confidenceConfig.contradictionPenalty;
      
      // Apply regime-specific bonus if filters align with regime
      if (regime && regime.type) {
        const regimeBonus = this.confidenceConfig.regimeBonus[regime.type] || 0;
        const regimeCompatibility = this.calculateRegimeCompatibility(passedFilters, regime.type);
        confidence += regimeBonus * regimeCompatibility;
      }
      
      // Apply confidence limits
      confidence = Math.max(this.confidenceConfig.minConfidence, 
                  Math.min(this.confidenceConfig.maxConfidence, confidence));
      
      // Adjust confidence based on regime confidence
      if (regime && regime.confidence) {
        confidence *= (0.7 + (regime.confidence * 0.3));
      }
      
      return {
        direction,
        confidence,
        passedFilters: passedFilters.length,
        contradictions,
        regimeCompatibility: regime ? this.calculateRegimeCompatibility(passedFilters, regime.type) : 0
      };
      
    } catch (error) {
      this.logger.error('❌ Error calculating confidence:', error);
      return {
        direction: 'NONE',
        confidence: 0.3,
        passedFilters: 0,
        contradictions: 0,
        regimeCompatibility: 0,
        error: true
      };
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
          weight: result.weight || 1.0,
          reason: result.reason
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
   * Get filter category from filter name
   */
  getFilterCategory(filterName) {
    if (filterName.includes('rsi') || filterName.includes('macd') || filterName.includes('stoch')) {
      return 'momentum';
    }
    
    if (filterName.includes('ema') || filterName.includes('adx') || filterName.includes('supertrend')) {
      return 'trend';
    }
    
    if (filterName.includes('volume') || filterName.includes('obv') || filterName.includes('vwap')) {
      return 'volume';
    }
    
    if (filterName.includes('support') || filterName.includes('resistance') || filterName.includes('pivot')) {
      return 'structure';
    }
    
    if (filterName.includes('atr') || filterName.includes('bb_') || filterName.includes('volatility')) {
      return 'volatility';
    }
    
    if (filterName.includes('ob') || filterName.includes('fvg') || filterName.includes('liquidity')) {
      return 'smc';
    }
    
    if (filterName.includes('pattern') || filterName.includes('engulfing') || filterName.includes('doji')) {
      return 'pattern';
    }
    
    return 'other';
  }

  /**
   * Calculate compatibility of filters with market regime
   */
  calculateRegimeCompatibility(passedFilters, regimeType) {
    let compatibleCount = 0;
    let totalCount = passedFilters.length;
    
    if (totalCount === 0) return 0;
    
    for (const filter of passedFilters) {
      const category = this.getFilterCategory(filter.name);
      
      // Check if filter category is compatible with regime
      switch (regimeType) {
        case 'TRENDING':
          if (category === 'trend' || category === 'momentum' || category === 'smc') {
            compatibleCount++;
          }
          break;
          
        case 'RANGING':
          if (category === 'structure' || category === 'momentum' || category === 'pattern') {
            compatibleCount++;
          }
          break;
          
        case 'VOLATILE':
          if (category === 'volatility' || category === 'volume' || category === 'smc') {
            compatibleCount++;
          }
          break;
          
        case 'LOW_VOLUME':
          if (category === 'structure' || category === 'pattern') {
            compatibleCount++;
          }
          break;
      }
    }
    
    return compatibleCount / totalCount;
  }
}

module.exports = { ConfidenceScorer };