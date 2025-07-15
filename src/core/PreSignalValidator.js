/**
 * PreSignalValidator - Rule-Based Signal Quality Filters
 * 
 * Implements pre-signal validation filters for spread checking, volatility thresholds,
 * and market liquidity validation before AI analysis to improve signal quality
 */

const { Logger } = require('../utils/Logger');

class PreSignalValidator {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Validation configuration
    this.enableValidation = config.enablePreSignalValidation !== false; // Default to true
    
    // Spread validation thresholds
    this.spreadThresholds = {
      maxSpreadPercent: config.maxSpreadPercent || 0.05, // 0.05% max spread
      maxSpreadPips: config.maxSpreadPips || 5, // 5 pips max for forex
      spreadCheckEnabled: config.spreadCheckEnabled !== false
    };
    
    // Volatility validation thresholds
    this.volatilityThresholds = {
      minVolatility: config.minVolatility || 0.01, // 0.01% minimum volatility
      maxVolatility: config.maxVolatility || 2.0, // 2.0% maximum volatility
      volatilityWindow: config.volatilityWindow || 10, // 10 candles for volatility calculation
      volatilityCheckEnabled: config.volatilityCheckEnabled !== false
    };
    
    // Liquidity validation thresholds
    this.liquidityThresholds = {
      minVolumeRatio: config.minVolumeRatio || 0.5, // 50% of average volume
      volumeWindow: config.volumeWindow || 20, // 20 candles for volume average
      minAbsoluteVolume: config.minAbsoluteVolume || 1000, // Minimum absolute volume
      liquidityCheckEnabled: config.liquidityCheckEnabled !== false
    };
    
    // Market hours validation
    this.marketHours = {
      checkMarketHours: config.checkMarketHours !== false,
      allowedSessions: config.allowedSessions || ['asian', 'london', 'newyork'],
      avoidNewsTime: config.avoidNewsTime !== false,
      newsBufferMinutes: config.newsBufferMinutes || 30
    };
    
    // Price action validation
    this.priceActionThresholds = {
      maxGapPercent: config.maxGapPercent || 0.5, // 0.5% max gap between candles
      minCandleBodyPercent: config.minCandleBodyPercent || 0.01, // 0.01% minimum candle body
      priceActionCheckEnabled: config.priceActionCheckEnabled !== false
    };
    
    // Validation history for adaptive thresholds
    this.validationHistory = {
      totalChecks: 0,
      passedChecks: 0,
      failureReasons: {},
      lastReset: new Date()
    };
    
    this.logger.info('🔍 PreSignalValidator initialized');
  }

  /**
   * Validate market conditions before signal generation
   */
  async validateMarketConditions(marketData, technicalData, currencyPair) {
    if (!this.enableValidation) {
      return {
        valid: true,
        reason: 'Validation disabled',
        score: 1.0,
        checks: {}
      };
    }
    
    if (!marketData || marketData.length < 5) {
      return {
        valid: false,
        reason: 'Insufficient market data',
        score: 0.0,
        checks: { dataAvailability: false }
      };
    }
    
    this.validationHistory.totalChecks++;
    
    const validationResults = {
      spread: await this.validateSpread(marketData, currencyPair),
      volatility: this.validateVolatility(marketData),
      liquidity: this.validateLiquidity(marketData),
      marketHours: this.validateMarketHours(currencyPair),
      priceAction: this.validatePriceAction(marketData)
    };
    
    // Calculate overall validation score
    const scores = Object.values(validationResults).map(r => r.score);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Determine if validation passes (all critical checks must pass)
    const criticalChecks = ['spread', 'volatility', 'liquidity'];
    const criticalPassed = criticalChecks.every(check => validationResults[check].valid);
    
    // Non-critical checks (warnings only)
    const warningChecks = ['marketHours', 'priceAction'];
    const warnings = warningChecks.filter(check => !validationResults[check].valid);
    
    const isValid = criticalPassed && averageScore >= 0.6;
    
    if (isValid) {
      this.validationHistory.passedChecks++;
    } else {
      // Track failure reasons
      const failedChecks = Object.entries(validationResults)
        .filter(([_, result]) => !result.valid)
        .map(([check, _]) => check);
      
      failedChecks.forEach(check => {
        this.validationHistory.failureReasons[check] = 
          (this.validationHistory.failureReasons[check] || 0) + 1;
      });
    }
    
    return {
      valid: isValid,
      reason: isValid ? 'All validations passed' : this.getFailureReason(validationResults),
      score: averageScore,
      checks: validationResults,
      warnings: warnings.length > 0 ? warnings : null,
      summary: this.formatValidationSummary(validationResults, isValid)
    };
  }

  /**
   * Validate spread conditions
   */
  async validateSpread(marketData, currencyPair) {
    if (!this.spreadThresholds.spreadCheckEnabled) {
      return { valid: true, score: 1.0, reason: 'Spread check disabled' };
    }
    
    const latestCandle = marketData[marketData.length - 1];
    
    // Calculate spread (difference between high and low as proxy)
    const spread = latestCandle.high - latestCandle.low;
    const spreadPercent = (spread / latestCandle.close) * 100;
    
    // For forex pairs, also check pip-based spread
    let pipSpread = 0;
    if (currencyPair.includes('/')) {
      // Assume 4-decimal precision for most forex pairs
      const pipValue = currencyPair.includes('JPY') ? 0.01 : 0.0001;
      pipSpread = spread / pipValue;
    }
    
    const spreadValid = spreadPercent <= this.spreadThresholds.maxSpreadPercent;
    const pipSpreadValid = pipSpread <= this.spreadThresholds.maxSpreadPips || pipSpread === 0;
    
    const isValid = spreadValid && pipSpreadValid;
    const score = isValid ? 1.0 : Math.max(0, 1 - (spreadPercent / this.spreadThresholds.maxSpreadPercent));
    
    return {
      valid: isValid,
      score: score,
      reason: isValid ? 'Spread within acceptable limits' : 
        `Spread too wide: ${spreadPercent.toFixed(3)}% (max: ${this.spreadThresholds.maxSpreadPercent}%)`,
      details: {
        spreadPercent: spreadPercent,
        pipSpread: pipSpread,
        maxSpreadPercent: this.spreadThresholds.maxSpreadPercent,
        maxPipSpread: this.spreadThresholds.maxSpreadPips
      }
    };
  }

  /**
   * Validate volatility conditions
   */
  validateVolatility(marketData) {
    if (!this.volatilityThresholds.volatilityCheckEnabled) {
      return { valid: true, score: 1.0, reason: 'Volatility check disabled' };
    }

    const window = Math.min(this.volatilityThresholds.volatilityWindow, marketData.length);
    const recentCandles = marketData.slice(-window);

    // Calculate volatility as standard deviation of price changes
    const priceChanges = [];
    for (let i = 1; i < recentCandles.length; i++) {
      const prevClose = recentCandles[i-1].close;
      const currentClose = recentCandles[i].close;

      if (prevClose && currentClose && prevClose > 0) {
        const change = (currentClose - prevClose) / prevClose;
        priceChanges.push(Math.abs(change));
      }
    }

    if (priceChanges.length === 0) {
      return { valid: false, score: 0, reason: 'No valid price changes for volatility calculation' };
    }

    const avgChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const volatility = avgChange * 100; // Convert to percentage

    // Adjust thresholds for forex pairs (typically lower volatility than stocks)
    const adjustedMinVolatility = this.volatilityThresholds.minVolatility * 0.1; // 10x more lenient for forex
    const adjustedMaxVolatility = this.volatilityThresholds.maxVolatility;

    const minValid = volatility >= adjustedMinVolatility;
    const maxValid = volatility <= adjustedMaxVolatility;
    const isValid = minValid && maxValid;

    let score = 1.0;
    if (!minValid) {
      score = volatility / adjustedMinVolatility;
    } else if (!maxValid) {
      score = Math.max(0, 1 - ((volatility - adjustedMaxVolatility) / adjustedMaxVolatility));
    }

    return {
      valid: isValid,
      score: score,
      reason: isValid ? 'Volatility within acceptable range' :
        !minValid ? `Volatility too low: ${volatility.toFixed(3)}% (min: ${adjustedMinVolatility.toFixed(3)}%)` :
        `Volatility too high: ${volatility.toFixed(3)}% (max: ${adjustedMaxVolatility}%)`,
      details: {
        currentVolatility: volatility,
        minVolatility: adjustedMinVolatility,
        maxVolatility: adjustedMaxVolatility,
        priceChanges: priceChanges.slice(0, 3) // Show first 3 for debugging
      }
    };
  }

  /**
   * Validate liquidity conditions
   */
  validateLiquidity(marketData) {
    if (!this.liquidityThresholds.liquidityCheckEnabled) {
      return { valid: true, score: 1.0, reason: 'Liquidity check disabled' };
    }

    const window = Math.min(this.liquidityThresholds.volumeWindow, marketData.length);
    const recentCandles = marketData.slice(-window);
    const latestCandle = marketData[marketData.length - 1];

    // Calculate average volume
    const avgVolume = recentCandles.reduce((sum, candle) => sum + (candle.volume || 0), 0) / window;
    const currentVolume = latestCandle.volume || 0;

    // For forex pairs, volume data is often not meaningful or available
    // Check if this appears to be a forex pair (no meaningful volume data)
    const isForexPair = avgVolume === 0 && currentVolume === 0;

    if (isForexPair) {
      return {
        valid: true,
        score: 1.0,
        reason: 'Forex pair detected - volume validation skipped',
        details: {
          currentVolume: currentVolume,
          averageVolume: avgVolume,
          isForexPair: true
        }
      };
    }

    // Check volume ratio
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 0;
    const ratioValid = volumeRatio >= this.liquidityThresholds.minVolumeRatio;

    // Check absolute volume
    const absoluteValid = currentVolume >= this.liquidityThresholds.minAbsoluteVolume;

    const isValid = ratioValid && absoluteValid;
    const score = isValid ? 1.0 : Math.max(
      volumeRatio / this.liquidityThresholds.minVolumeRatio,
      currentVolume / this.liquidityThresholds.minAbsoluteVolume
    );

    return {
      valid: isValid,
      score: Math.min(1.0, score),
      reason: isValid ? 'Liquidity conditions acceptable' :
        !ratioValid ? `Volume ratio too low: ${(volumeRatio * 100).toFixed(1)}% (min: ${(this.liquidityThresholds.minVolumeRatio * 100).toFixed(1)}%)` :
        `Absolute volume too low: ${currentVolume} (min: ${this.liquidityThresholds.minAbsoluteVolume})`,
      details: {
        currentVolume: currentVolume,
        averageVolume: avgVolume,
        volumeRatio: volumeRatio,
        minVolumeRatio: this.liquidityThresholds.minVolumeRatio,
        minAbsoluteVolume: this.liquidityThresholds.minAbsoluteVolume,
        isForexPair: false
      }
    };
  }

  /**
   * Validate market hours and session timing
   */
  validateMarketHours(currencyPair) {
    if (!this.marketHours.checkMarketHours) {
      return { valid: true, score: 1.0, reason: 'Market hours check disabled' };
    }
    
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // Define major forex sessions (UTC hours)
    const sessions = {
      asian: { start: 23, end: 8 }, // 23:00 - 08:00 UTC
      london: { start: 7, end: 16 }, // 07:00 - 16:00 UTC
      newyork: { start: 12, end: 21 } // 12:00 - 21:00 UTC
    };
    
    // Check if current time is within allowed sessions
    const activeSession = Object.entries(sessions).find(([name, session]) => {
      if (session.start > session.end) {
        // Session crosses midnight
        return utcHour >= session.start || utcHour < session.end;
      } else {
        return utcHour >= session.start && utcHour < session.end;
      }
    });
    
    const sessionValid = activeSession && this.marketHours.allowedSessions.includes(activeSession[0]);
    
    // Check for major news times (simplified - avoid top of hour during London/NY overlap)
    const isNewsTime = this.marketHours.avoidNewsTime && 
      (utcHour >= 12 && utcHour <= 16) && // London/NY overlap
      (now.getUTCMinutes() < this.marketHours.newsBufferMinutes);
    
    const isValid = sessionValid && !isNewsTime;
    const score = isValid ? 1.0 : sessionValid ? 0.7 : 0.3;
    
    return {
      valid: isValid,
      score: score,
      reason: isValid ? `Trading during ${activeSession ? activeSession[0] : 'unknown'} session` :
        !sessionValid ? 'Outside allowed trading sessions' :
        'Potential news time - avoiding trades',
      details: {
        currentSession: activeSession ? activeSession[0] : 'none',
        allowedSessions: this.marketHours.allowedSessions,
        utcHour: utcHour,
        isNewsTime: isNewsTime
      }
    };
  }

  /**
   * Validate price action quality
   */
  validatePriceAction(marketData) {
    if (!this.priceActionThresholds.priceActionCheckEnabled) {
      return { valid: true, score: 1.0, reason: 'Price action check disabled' };
    }

    const latestCandle = marketData[marketData.length - 1];
    const previousCandle = marketData[marketData.length - 2];

    if (!previousCandle) {
      return { valid: true, score: 1.0, reason: 'Insufficient data for price action check' };
    }

    // Check for gaps between candles
    const gap = Math.abs(latestCandle.open - previousCandle.close);
    const gapPercent = (gap / previousCandle.close) * 100;
    const gapValid = gapPercent <= this.priceActionThresholds.maxGapPercent;

    // Check candle body size
    const candleBody = Math.abs(latestCandle.close - latestCandle.open);
    const bodyPercent = (candleBody / latestCandle.close) * 100;

    // Adjust thresholds for forex pairs (typically smaller body percentages)
    const adjustedMinBodyPercent = this.priceActionThresholds.minCandleBodyPercent * 0.1; // 10x more lenient
    const bodyValid = bodyPercent >= adjustedMinBodyPercent;

    const isValid = gapValid && bodyValid;
    const score = isValid ? 1.0 : Math.min(
      gapValid ? 1.0 : Math.max(0, 1 - (gapPercent / this.priceActionThresholds.maxGapPercent)),
      bodyValid ? 1.0 : bodyPercent / adjustedMinBodyPercent
    );

    return {
      valid: isValid,
      score: score,
      reason: isValid ? 'Price action quality acceptable' :
        !gapValid ? `Gap too large: ${gapPercent.toFixed(3)}% (max: ${this.priceActionThresholds.maxGapPercent}%)` :
        `Candle body too small: ${bodyPercent.toFixed(3)}% (min: ${adjustedMinBodyPercent.toFixed(3)}%)`,
      details: {
        gapPercent: gapPercent,
        bodyPercent: bodyPercent,
        maxGapPercent: this.priceActionThresholds.maxGapPercent,
        minCandleBodyPercent: adjustedMinBodyPercent,
        originalMinBodyPercent: this.priceActionThresholds.minCandleBodyPercent
      }
    };
  }

  /**
   * Get failure reason from validation results
   */
  getFailureReason(validationResults) {
    const failedChecks = Object.entries(validationResults)
      .filter(([_, result]) => !result.valid)
      .map(([check, result]) => `${check}: ${result.reason}`);
    
    return failedChecks.length > 0 ? failedChecks.join('; ') : 'Unknown validation failure';
  }

  /**
   * Format validation summary for AI prompt
   */
  formatValidationSummary(validationResults, isValid) {
    const status = isValid ? '✅ PASSED' : '❌ FAILED';
    const checks = Object.entries(validationResults).map(([check, result]) => {
      const icon = result.valid ? '✅' : '❌';
      const score = (result.score * 100).toFixed(0);
      return `${icon} ${check.toUpperCase()}: ${score}% - ${result.reason}`;
    }).join('\n');
    
    return `PRE-SIGNAL VALIDATION ${status}:
${checks}

VALIDATION IMPLICATIONS:
- Signal quality filtering active
- Market conditions assessed before AI analysis
- Risk management through pre-validation
- Enhanced signal reliability through multi-factor validation`;
  }

  /**
   * Format validation status for AI prompt
   */
  formatValidationForAI(validationResult) {
    if (!validationResult) {
      return 'PRE-SIGNAL VALIDATION: Not performed';
    }
    
    return validationResult.summary;
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    const passRate = this.validationHistory.totalChecks > 0 ? 
      (this.validationHistory.passedChecks / this.validationHistory.totalChecks) * 100 : 0;
    
    return {
      enabled: this.enableValidation,
      totalChecks: this.validationHistory.totalChecks,
      passedChecks: this.validationHistory.passedChecks,
      passRate: passRate,
      failureReasons: this.validationHistory.failureReasons,
      lastReset: this.validationHistory.lastReset,
      thresholds: {
        spread: this.spreadThresholds,
        volatility: this.volatilityThresholds,
        liquidity: this.liquidityThresholds,
        marketHours: this.marketHours,
        priceAction: this.priceActionThresholds
      }
    };
  }

  /**
   * Reset validation statistics
   */
  resetValidationStats() {
    this.validationHistory = {
      totalChecks: 0,
      passedChecks: 0,
      failureReasons: {},
      lastReset: new Date()
    };
    
    this.logger.info('🔍 Validation statistics reset');
  }
}

module.exports = PreSignalValidator;
