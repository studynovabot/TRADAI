/**
 * AI Candle Sniper - OTC Data Validator
 * 
 * Comprehensive validation system for OTC data:
 * - Validates candle data integrity
 * - Checks for data anomalies
 * - Ensures data quality for AI analysis
 * - Provides data cleaning and normalization
 */

class OTCDataValidator {
  constructor(config = {}) {
    this.config = {
      // Price validation
      maxPriceChange: 0.1, // 10% max price change between candles
      minPrice: 0.00001,   // Minimum valid price
      maxPrice: 1000000,   // Maximum valid price
      
      // Volume validation
      minVolume: 0,        // Minimum valid volume
      maxVolume: 1000000000, // Maximum valid volume
      
      // Timestamp validation
      maxTimestampGap: 5 * 60 * 1000, // 5 minutes max gap
      minTimestampGap: 1000,          // 1 second min gap
      
      // Candle validation
      minCandleCount: 5,   // Minimum candles for analysis
      maxCandleCount: 1000, // Maximum candles to process
      
      // Data quality
      maxInvalidRatio: 0.1, // Max 10% invalid candles allowed
      
      ...config
    };
    
    this.validationStats = {
      totalValidated: 0,
      totalInvalid: 0,
      invalidReasons: {},
      lastValidation: null
    };
  }
  
  /**
   * Validate complete OTC data package
   * @param {Object} data - OTC data package
   * @returns {Object} - Validation result
   */
  validateOTCData(data) {
    try {
      const result = {
        isValid: false,
        errors: [],
        warnings: [],
        cleanedData: null,
        stats: {
          originalCount: 0,
          validCount: 0,
          invalidCount: 0,
          cleanedCount: 0
        }
      };
      
      // Basic structure validation
      const structureValidation = this.validateDataStructure(data);
      if (!structureValidation.isValid) {
        result.errors.push(...structureValidation.errors);
        return result;
      }
      
      // Asset validation
      const assetValidation = this.validateAsset(data.asset);
      if (!assetValidation.isValid) {
        result.errors.push(...assetValidation.errors);
        result.warnings.push(...assetValidation.warnings);
      }
      
      // Timeframe validation
      const timeframeValidation = this.validateTimeframe(data.timeframe);
      if (!timeframeValidation.isValid) {
        result.errors.push(...timeframeValidation.errors);
        result.warnings.push(...timeframeValidation.warnings);
      }
      
      // Candles validation
      const candlesValidation = this.validateCandles(data.candles);
      result.stats.originalCount = data.candles.length;
      result.stats.validCount = candlesValidation.validCandles.length;
      result.stats.invalidCount = candlesValidation.invalidCandles.length;
      
      if (!candlesValidation.isValid) {
        result.errors.push(...candlesValidation.errors);
      }
      
      result.warnings.push(...candlesValidation.warnings);
      
      // Check if we have enough valid data
      const validRatio = result.stats.validCount / result.stats.originalCount;
      if (validRatio < (1 - this.config.maxInvalidRatio)) {
        result.errors.push(`Too many invalid candles: ${(1 - validRatio) * 100}% invalid`);
      }
      
      // If validation passed, create cleaned data
      if (result.errors.length === 0 && candlesValidation.validCandles.length >= this.config.minCandleCount) {
        result.isValid = true;
        result.cleanedData = {
          asset: data.asset.toUpperCase().trim(),
          timeframe: data.timeframe.toUpperCase().trim(),
          candles: this.cleanCandles(candlesValidation.validCandles),
          timestamp: data.timestamp || Date.now(),
          broker: data.broker || 'Unknown',
          isOTC: data.isOTC !== false // Default to true
        };
        result.stats.cleanedCount = result.cleanedData.candles.length;
      }
      
      // Update validation stats
      this.updateValidationStats(result);
      
      return result;
    } catch (error) {
      console.error('[OTC Data Validator] Error validating OTC data:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        cleanedData: null,
        stats: { originalCount: 0, validCount: 0, invalidCount: 0, cleanedCount: 0 }
      };
    }
  }
  
  /**
   * Validate data structure
   * @param {Object} data - Data to validate
   * @returns {Object} - Validation result
   */
  validateDataStructure(data) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    if (!data || typeof data !== 'object') {
      result.isValid = false;
      result.errors.push('Data must be an object');
      return result;
    }
    
    if (!data.asset) {
      result.isValid = false;
      result.errors.push('Asset is required');
    }
    
    if (!data.timeframe) {
      result.isValid = false;
      result.errors.push('Timeframe is required');
    }
    
    if (!data.candles) {
      result.isValid = false;
      result.errors.push('Candles are required');
    }
    
    if (!Array.isArray(data.candles)) {
      result.isValid = false;
      result.errors.push('Candles must be an array');
    }
    
    return result;
  }
  
  /**
   * Validate asset name
   * @param {string} asset - Asset name
   * @returns {Object} - Validation result
   */
  validateAsset(asset) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    if (typeof asset !== 'string') {
      result.isValid = false;
      result.errors.push('Asset must be a string');
      return result;
    }
    
    const trimmedAsset = asset.trim();
    
    if (trimmedAsset.length === 0) {
      result.isValid = false;
      result.errors.push('Asset cannot be empty');
      return result;
    }
    
    if (trimmedAsset.length < 2) {
      result.warnings.push('Asset name is very short');
    }
    
    if (trimmedAsset.length > 20) {
      result.warnings.push('Asset name is very long');
    }
    
    // Check for valid characters (letters, numbers, slash, underscore, dash)
    if (!/^[A-Za-z0-9/_-]+$/.test(trimmedAsset)) {
      result.warnings.push('Asset name contains unusual characters');
    }
    
    return result;
  }
  
  /**
   * Validate timeframe
   * @param {string} timeframe - Timeframe
   * @returns {Object} - Validation result
   */
  validateTimeframe(timeframe) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    if (typeof timeframe !== 'string') {
      result.isValid = false;
      result.errors.push('Timeframe must be a string');
      return result;
    }
    
    const trimmedTimeframe = timeframe.trim().toUpperCase();
    
    if (trimmedTimeframe.length === 0) {
      result.isValid = false;
      result.errors.push('Timeframe cannot be empty');
      return result;
    }
    
    // Valid timeframes
    const validTimeframes = ['1M', '5M', '15M', '30M', '1H', '4H', '1D', '1W'];
    
    if (!validTimeframes.includes(trimmedTimeframe)) {
      result.warnings.push(`Unusual timeframe: ${trimmedTimeframe}`);
    }
    
    return result;
  }
  
  /**
   * Validate candles array
   * @param {Array} candles - Candles array
   * @returns {Object} - Validation result
   */
  validateCandles(candles) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      validCandles: [],
      invalidCandles: []
    };
    
    if (!Array.isArray(candles)) {
      result.isValid = false;
      result.errors.push('Candles must be an array');
      return result;
    }
    
    if (candles.length === 0) {
      result.isValid = false;
      result.errors.push('Candles array cannot be empty');
      return result;
    }
    
    if (candles.length < this.config.minCandleCount) {
      result.isValid = false;
      result.errors.push(`Not enough candles: ${candles.length} < ${this.config.minCandleCount}`);
      return result;
    }
    
    if (candles.length > this.config.maxCandleCount) {
      result.warnings.push(`Too many candles, will be truncated: ${candles.length} > ${this.config.maxCandleCount}`);
    }
    
    // Validate each candle
    let previousTimestamp = null;
    let previousClose = null;
    
    for (let i = 0; i < Math.min(candles.length, this.config.maxCandleCount); i++) {
      const candle = candles[i];
      const candleValidation = this.validateSingleCandle(candle, i, previousTimestamp, previousClose);
      
      if (candleValidation.isValid) {
        result.validCandles.push(candle);
        previousTimestamp = candle.timestamp;
        previousClose = candle.close;
      } else {
        result.invalidCandles.push({
          index: i,
          candle: candle,
          errors: candleValidation.errors
        });
        
        // Track invalid reasons
        candleValidation.errors.forEach(error => {
          if (!this.validationStats.invalidReasons[error]) {
            this.validationStats.invalidReasons[error] = 0;
          }
          this.validationStats.invalidReasons[error]++;
        });
      }
    }
    
    // Check if we have enough valid candles
    if (result.validCandles.length < this.config.minCandleCount) {
      result.isValid = false;
      result.errors.push(`Not enough valid candles: ${result.validCandles.length} < ${this.config.minCandleCount}`);
    }
    
    // Sort valid candles by timestamp
    result.validCandles.sort((a, b) => a.timestamp - b.timestamp);
    
    return result;
  }
  
  /**
   * Validate single candle
   * @param {Object} candle - Single candle
   * @param {number} index - Candle index
   * @param {number} previousTimestamp - Previous candle timestamp
   * @param {number} previousClose - Previous candle close price
   * @returns {Object} - Validation result
   */
  validateSingleCandle(candle, index, previousTimestamp, previousClose) {
    const result = { isValid: true, errors: [] };
    
    // Check if candle is an object
    if (!candle || typeof candle !== 'object') {
      result.isValid = false;
      result.errors.push('Candle must be an object');
      return result;
    }
    
    // Required fields
    const requiredFields = ['timestamp', 'open', 'high', 'low', 'close'];
    for (const field of requiredFields) {
      if (candle[field] === undefined || candle[field] === null) {
        result.isValid = false;
        result.errors.push(`Missing ${field}`);
      } else if (typeof candle[field] !== 'number') {
        result.isValid = false;
        result.errors.push(`${field} must be a number`);
      } else if (!isFinite(candle[field])) {
        result.isValid = false;
        result.errors.push(`${field} must be finite`);
      }
    }
    
    // If basic validation failed, return early
    if (!result.isValid) {
      return result;
    }
    
    // Timestamp validation
    if (candle.timestamp <= 0) {
      result.isValid = false;
      result.errors.push('Invalid timestamp');
    }
    
    if (previousTimestamp !== null) {
      const timeDiff = candle.timestamp - previousTimestamp;
      if (timeDiff <= 0) {
        result.isValid = false;
        result.errors.push('Timestamp not increasing');
      } else if (timeDiff < this.config.minTimestampGap) {
        result.isValid = false;
        result.errors.push('Timestamp gap too small');
      } else if (timeDiff > this.config.maxTimestampGap) {
        result.isValid = false;
        result.errors.push('Timestamp gap too large');
      }
    }
    
    // Price validation
    const prices = [candle.open, candle.high, candle.low, candle.close];
    for (const price of prices) {
      if (price < this.config.minPrice || price > this.config.maxPrice) {
        result.isValid = false;
        result.errors.push('Price out of valid range');
        break;
      }
    }
    
    // OHLC relationship validation
    if (candle.high < Math.max(candle.open, candle.close)) {
      result.isValid = false;
      result.errors.push('High price too low');
    }
    
    if (candle.low > Math.min(candle.open, candle.close)) {
      result.isValid = false;
      result.errors.push('Low price too high');
    }
    
    if (candle.high < candle.low) {
      result.isValid = false;
      result.errors.push('High price less than low price');
    }
    
    // Price change validation (if we have previous close)
    if (previousClose !== null) {
      const priceChange = Math.abs(candle.open - previousClose) / previousClose;
      if (priceChange > this.config.maxPriceChange) {
        result.isValid = false;
        result.errors.push('Price change too large');
      }
    }
    
    // Volume validation (if present)
    if (candle.volume !== undefined) {
      if (typeof candle.volume !== 'number' || !isFinite(candle.volume)) {
        result.isValid = false;
        result.errors.push('Invalid volume');
      } else if (candle.volume < this.config.minVolume || candle.volume > this.config.maxVolume) {
        result.isValid = false;
        result.errors.push('Volume out of valid range');
      }
    }
    
    return result;
  }
  
  /**
   * Clean and normalize candles
   * @param {Array} candles - Valid candles
   * @returns {Array} - Cleaned candles
   */
  cleanCandles(candles) {
    return candles.map(candle => ({
      timestamp: Math.floor(candle.timestamp),
      open: this.roundPrice(candle.open),
      high: this.roundPrice(candle.high),
      low: this.roundPrice(candle.low),
      close: this.roundPrice(candle.close),
      volume: candle.volume !== undefined ? Math.floor(candle.volume) : 0
    }));
  }
  
  /**
   * Round price to appropriate precision
   * @param {number} price - Price to round
   * @returns {number} - Rounded price
   */
  roundPrice(price) {
    // Determine appropriate decimal places based on price magnitude
    if (price >= 1000) {
      return Math.round(price * 100) / 100; // 2 decimal places
    } else if (price >= 1) {
      return Math.round(price * 10000) / 10000; // 4 decimal places
    } else if (price >= 0.01) {
      return Math.round(price * 100000) / 100000; // 5 decimal places
    } else {
      return Math.round(price * 10000000) / 10000000; // 7 decimal places
    }
  }
  
  /**
   * Update validation statistics
   * @param {Object} result - Validation result
   */
  updateValidationStats(result) {
    this.validationStats.totalValidated++;
    if (!result.isValid) {
      this.validationStats.totalInvalid++;
    }
    this.validationStats.lastValidation = Date.now();
  }
  
  /**
   * Get validation statistics
   * @returns {Object} - Validation statistics
   */
  getValidationStats() {
    return {
      ...this.validationStats,
      successRate: this.validationStats.totalValidated > 0 
        ? (this.validationStats.totalValidated - this.validationStats.totalInvalid) / this.validationStats.totalValidated 
        : 0
    };
  }
  
  /**
   * Reset validation statistics
   */
  resetValidationStats() {
    this.validationStats = {
      totalValidated: 0,
      totalInvalid: 0,
      invalidReasons: {},
      lastValidation: null
    };
  }
  
  /**
   * Validate real-time candle update
   * @param {Object} newCandle - New candle data
   * @param {Array} existingCandles - Existing candles
   * @returns {Object} - Validation result
   */
  validateRealtimeUpdate(newCandle, existingCandles = []) {
    const result = { isValid: true, errors: [], warnings: [] };
    
    // Basic candle validation
    const lastCandle = existingCandles.length > 0 ? existingCandles[existingCandles.length - 1] : null;
    const candleValidation = this.validateSingleCandle(
      newCandle, 
      existingCandles.length, 
      lastCandle?.timestamp || null, 
      lastCandle?.close || null
    );
    
    if (!candleValidation.isValid) {
      result.isValid = false;
      result.errors.push(...candleValidation.errors);
    }
    
    // Check for duplicate timestamps
    if (existingCandles.some(candle => candle.timestamp === newCandle.timestamp)) {
      result.warnings.push('Duplicate timestamp detected');
    }
    
    return result;
  }
}

// Create global instance
const otcDataValidator = new OTCDataValidator();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OTCDataValidator, otcDataValidator };
} else {
  window.OTCDataValidator = OTCDataValidator;
  window.otcDataValidator = otcDataValidator;
}

// Additional validation methods
OTCDataValidator.prototype.sanitizeData = function(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  return {
    timestamp: parseInt(data.timestamp) || Date.now(),
    open: parseFloat(data.open) || 0,
    high: parseFloat(data.high) || 0,
    low: parseFloat(data.low) || 0,
    close: parseFloat(data.close) || 0,
    volume: parseFloat(data.volume) || 0,
    pair: String(data.pair || 'UNKNOWN'),
    timeframe: String(data.timeframe || '5M')
  };
};

OTCDataValidator.prototype.checkDataIntegrity = function(dataArray) {
  if (!Array.isArray(dataArray)) {
    return { valid: false, error: 'Data is not an array' };
  }
  
  if (dataArray.length === 0) {
    return { valid: false, error: 'Data array is empty' };
  }
  
  let validCount = 0;
  let invalidCount = 0;
  
  for (const item of dataArray) {
    const validation = this.validateOTCData(item);
    if (validation.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  }
  
  const validRatio = validCount / (validCount + invalidCount);
  
  return {
    valid: validRatio >= (1 - this.config.maxInvalidRatio),
    validCount,
    invalidCount,
    validRatio,
    totalItems: dataArray.length
  };
};
  window.OTCDataValidator = OTCDataValidator;
  window.otcDataValidator = otcDataValidator;
}