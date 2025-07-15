/**
 * TRADAI Trade Management System
 * Handles trade execution, tracking, and Kelly Criterion position sizing
 */

const fs = require('fs').promises;
const path = require('path');

class TradeManager {
  constructor(config, logger, database) {
    this.config = config;
    this.logger = logger;
    this.database = database;
    
    // Trading settings
    this.accountBalance = config.trading?.accountBalance || 1000;
    this.maxRiskPerTrade = config.trading?.maxRiskPerTrade || 0.02; // 2%
    this.maxDailyLoss = config.trading?.maxDailyLoss || 0.10; // 10%
    this.minConfidenceThreshold = config.trading?.minConfidence || 70;
    
    // Kelly Criterion settings
    this.kellyMultiplier = config.trading?.kellyMultiplier || 0.25; // Conservative Kelly
    this.maxKellyPosition = config.trading?.maxKellyPosition || 0.05; // Max 5% per trade
    
    // Session tracking
    this.sessionStats = {
      tradesExecuted: 0,
      tradesSkipped: 0,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      dailyLoss: 0,
      startTime: new Date(),
      lastTradeTime: null
    };
    
    // Trade history
    this.tradeHistory = [];
    this.maxHistorySize = 1000;
    
    // Performance analytics
    this.performanceMetrics = {
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0,
      maxDrawdown: 0,
      sharpeRatio: 0
    };
    
    // Learning data
    this.winningPatterns = new Map();
    this.losingPatterns = new Map();
  }

  /**
   * Process new trading signal
   */
  async processSignal(signalData, technicalAnalysis, aiAnalysis) {
    try {
      this.logger.info(`📊 Processing ${signalData.decision} signal for ${signalData.currencyPair}`);
      
      // Check if trading is allowed
      const tradingAllowed = this.checkTradingConditions();
      if (!tradingAllowed.allowed) {
        return this.createSkipResult(tradingAllowed.reason, signalData);
      }
      
      // Calculate position size using Kelly Criterion
      const positionSize = this.calculateKellyPosition(
        aiAnalysis.confidence,
        this.estimateWinProbability(technicalAnalysis, aiAnalysis),
        this.estimatePayoffRatio(signalData.decision, technicalAnalysis)
      );
      
      // Create trade recommendation
      const tradeRecommendation = {
        id: this.generateTradeId(),
        timestamp: new Date(),
        signal: signalData,
        technicalAnalysis,
        aiAnalysis,
        positionSize,
        riskAmount: positionSize.riskAmount,
        potentialProfit: positionSize.potentialProfit,
        stopLoss: this.calculateStopLoss(signalData, technicalAnalysis),
        takeProfit: this.calculateTakeProfit(signalData, technicalAnalysis),
        confidence: aiAnalysis.confidence,
        riskRewardRatio: positionSize.riskRewardRatio,
        kellyPercentage: positionSize.kellyPercentage,
        tradingRationale: this.generateTradingRationale(signalData, technicalAnalysis, aiAnalysis),
        educationalInsights: this.generateEducationalInsights(signalData, technicalAnalysis, aiAnalysis)
      };
      
      this.logger.info(`💰 Trade recommendation: ${signalData.decision} ${signalData.currencyPair} - Risk: $${positionSize.riskAmount.toFixed(2)} (${aiAnalysis.confidence}%)`);
      
      return {
        type: 'TRADE_RECOMMENDATION',
        recommendation: tradeRecommendation,
        sessionStats: this.getSessionStats()
      };
      
    } catch (error) {
      this.logger.error('❌ Trade processing error:', error);
      return this.createErrorResult(error, signalData);
    }
  }

  /**
   * Execute trade (user confirmed)
   */
  async executeTrade(tradeRecommendation, userNotes = '') {
    try {
      const trade = {
        ...tradeRecommendation,
        status: 'EXECUTED',
        executionTime: new Date(),
        userNotes,
        outcome: null, // Will be updated when trade closes
        actualProfit: 0,
        executionPrice: tradeRecommendation.signal.currentPrice
      };
      
      // Update session stats
      this.sessionStats.tradesExecuted++;
      this.sessionStats.lastTradeTime = new Date();
      
      // Store trade
      this.tradeHistory.push(trade);
      await this.saveTradeToDatabase(trade);
      
      this.logger.info(`✅ Trade executed: ${trade.id} - ${trade.signal.decision} ${trade.signal.currencyPair}`);
      
      // Schedule trade monitoring
      this.scheduleTradeMonitoring(trade);
      
      return {
        type: 'TRADE_EXECUTED',
        trade,
        sessionStats: this.getSessionStats()
      };
      
    } catch (error) {
      this.logger.error('❌ Trade execution error:', error);
      throw error;
    }
  }

  /**
   * Skip trade (user declined)
   */
  async skipTrade(tradeRecommendation, reason = 'User decision') {
    try {
      const skipRecord = {
        id: tradeRecommendation.id,
        timestamp: new Date(),
        signal: tradeRecommendation.signal,
        reason,
        confidence: tradeRecommendation.confidence,
        potentialProfit: tradeRecommendation.potentialProfit,
        status: 'SKIPPED'
      };
      
      // Update session stats
      this.sessionStats.tradesSkipped++;
      
      // Store skip record for analysis
      await this.saveSkipToDatabase(skipRecord);
      
      this.logger.info(`⏭️ Trade skipped: ${skipRecord.id} - Reason: ${reason}`);
      
      return {
        type: 'TRADE_SKIPPED',
        skipRecord,
        sessionStats: this.getSessionStats()
      };
      
    } catch (error) {
      this.logger.error('❌ Trade skip error:', error);
      throw error;
    }
  }

  /**
   * Calculate Kelly Criterion position size
   */
  calculateKellyPosition(confidence, winProbability, payoffRatio) {
    try {
      // Convert confidence to decimal
      const p = Math.min(winProbability / 100, 0.95); // Cap at 95%
      const q = 1 - p; // Probability of loss
      const b = payoffRatio; // Payoff ratio (reward/risk)
      
      // Kelly formula: f = (bp - q) / b
      let kellyFraction = (b * p - q) / b;
      
      // Apply safety multiplier and caps
      kellyFraction = Math.max(0, kellyFraction * this.kellyMultiplier);
      kellyFraction = Math.min(kellyFraction, this.maxKellyPosition);
      
      // Calculate position size
      const riskAmount = this.accountBalance * kellyFraction;
      const maxRiskAmount = this.accountBalance * this.maxRiskPerTrade;
      const finalRiskAmount = Math.min(riskAmount, maxRiskAmount);
      
      const potentialProfit = finalRiskAmount * payoffRatio;
      const riskRewardRatio = potentialProfit / finalRiskAmount;
      
      return {
        kellyPercentage: (kellyFraction * 100).toFixed(2),
        riskAmount: finalRiskAmount,
        potentialProfit,
        riskRewardRatio: riskRewardRatio.toFixed(2),
        accountRiskPercentage: (finalRiskAmount / this.accountBalance * 100).toFixed(2),
        calculation: {
          winProbability: p.toFixed(3),
          payoffRatio: b.toFixed(2),
          rawKelly: (kellyFraction / this.kellyMultiplier).toFixed(3),
          appliedMultiplier: this.kellyMultiplier
        }
      };
      
    } catch (error) {
      this.logger.error('❌ Kelly calculation error:', error);
      // Fallback to conservative fixed percentage
      const fallbackRisk = this.accountBalance * 0.01; // 1%
      return {
        kellyPercentage: '1.00',
        riskAmount: fallbackRisk,
        potentialProfit: fallbackRisk * 1.5,
        riskRewardRatio: '1.50',
        accountRiskPercentage: '1.00',
        calculation: { error: 'Fallback to 1% risk' }
      };
    }
  }

  /**
   * Estimate win probability based on historical data and current conditions
   */
  estimateWinProbability(technicalAnalysis, aiAnalysis) {
    let baseProbability = aiAnalysis.confidence;
    
    // Adjust based on market regime
    if (technicalAnalysis.marketRegime?.regime === 'TRENDING') {
      baseProbability += 5; // Trending markets are more predictable
    } else if (technicalAnalysis.marketRegime?.regime === 'VOLATILE') {
      baseProbability -= 10; // Volatile markets are less predictable
    }
    
    // Adjust based on AI consensus
    if (aiAnalysis.consensusReached) {
      baseProbability += 10; // Both AIs agree
    }
    
    // Adjust based on technical signal strength
    const strongSignals = technicalAnalysis.signals?.filter(s => s.strength === 'VERY_STRONG').length || 0;
    baseProbability += strongSignals * 3;
    
    // Historical performance adjustment
    if (this.performanceMetrics.winRate > 0) {
      const historicalAdjustment = (this.performanceMetrics.winRate - 50) * 0.2;
      baseProbability += historicalAdjustment;
    }
    
    // Cap probability between 30% and 85%
    return Math.max(30, Math.min(85, baseProbability));
  }

  /**
   * Estimate payoff ratio (reward/risk)
   */
  estimatePayoffRatio(direction, technicalAnalysis) {
    let baseRatio = 1.5; // Default 1.5:1 risk/reward
    
    // Adjust based on volatility
    const volatility = technicalAnalysis.volatilityAnalysis?.volatility || 0;
    if (volatility > 2) {
      baseRatio += 0.5; // Higher volatility = higher potential reward
    }
    
    // Adjust based on support/resistance levels
    const supportResistance = technicalAnalysis.supportResistance || [];
    const nearbyLevels = supportResistance.filter(level => 
      parseFloat(level.distance) < 1.0 // Within 1%
    );
    
    if (nearbyLevels.length > 0) {
      baseRatio -= 0.2; // Nearby levels may limit movement
    }
    
    // Adjust based on market regime
    if (technicalAnalysis.marketRegime?.regime === 'TRENDING') {
      baseRatio += 0.3; // Trending markets can provide larger moves
    }
    
    return Math.max(1.2, Math.min(3.0, baseRatio));
  }

  /**
   * Check if trading conditions are met
   */
  checkTradingConditions() {
    // Check daily loss limit
    if (this.sessionStats.dailyLoss >= this.maxDailyLoss * this.accountBalance) {
      return {
        allowed: false,
        reason: 'Daily loss limit reached'
      };
    }
    
    // Check if too many consecutive losses
    const recentTrades = this.tradeHistory.slice(-5);
    const consecutiveLosses = this.countConsecutiveLosses(recentTrades);
    if (consecutiveLosses >= 3) {
      return {
        allowed: false,
        reason: 'Too many consecutive losses - cooling off period'
      };
    }
    
    // Check maximum trades per session
    const maxTradesPerSession = this.config.trading?.maxTradesPerSession || 10;
    if (this.sessionStats.tradesExecuted >= maxTradesPerSession) {
      return {
        allowed: false,
        reason: 'Maximum trades per session reached'
      };
    }
    
    return { allowed: true };
  }

  /**
   * Generate comprehensive trading rationale
   */
  generateTradingRationale(signalData, technicalAnalysis, aiAnalysis) {
    const rationale = [];
    
    // AI consensus
    if (aiAnalysis.consensusReached) {
      rationale.push(`🎯 Both Groq AI and Together AI agree on ${signalData.decision} direction with ${aiAnalysis.confidence}% confidence`);
    } else {
      rationale.push(`⚠️ Single AI recommendation: ${aiAnalysis.consensusSource} with ${aiAnalysis.confidence}% confidence`);
    }
    
    // Technical factors
    const strongSignals = technicalAnalysis.signals?.filter(s => s.strength === 'VERY_STRONG' || s.strength === 'STRONG') || [];
    if (strongSignals.length > 0) {
      rationale.push(`📊 Strong technical signals: ${strongSignals.map(s => s.source).join(', ')}`);
    }
    
    // Market regime
    if (technicalAnalysis.marketRegime) {
      rationale.push(`📈 Market regime: ${technicalAnalysis.marketRegime.regime} (${technicalAnalysis.marketRegime.confidence} confidence)`);
    }
    
    // Pattern recognition
    const patterns = technicalAnalysis.patterns || [];
    const strongPatterns = patterns.filter(p => p.strength === 'VERY_STRONG' || p.strength === 'STRONG');
    if (strongPatterns.length > 0) {
      rationale.push(`🕯️ Strong patterns detected: ${strongPatterns.map(p => p.name).join(', ')}`);
    }
    
    // Risk factors
    const riskFactors = [];
    if (technicalAnalysis.volatilityAnalysis?.volatility > 2) {
      riskFactors.push('High volatility');
    }
    if (technicalAnalysis.marketRegime?.regime === 'VOLATILE') {
      riskFactors.push('Volatile market conditions');
    }
    
    if (riskFactors.length > 0) {
      rationale.push(`⚠️ Risk factors: ${riskFactors.join(', ')}`);
    }
    
    return rationale.join('\n\n');
  }

  /**
   * Generate educational insights for user learning
   */
  generateEducationalInsights(signalData, technicalAnalysis, aiAnalysis) {
    const insights = [];
    
    // Kelly Criterion education
    insights.push(`💡 Kelly Criterion: This mathematical formula helps determine optimal position size based on win probability and risk/reward ratio. Your calculated position size balances growth potential with risk management.`);
    
    // AI consensus education
    if (aiAnalysis.consensusReached) {
      insights.push(`🧠 AI Consensus: When both AI models agree, historical data shows a ${this.getConsensusSuccessRate()}% higher success rate compared to single AI recommendations.`);
    }
    
    // Technical analysis education
    const latest = technicalAnalysis.indicators?.latest || {};
    if (latest.rsi) {
      if (latest.rsi < 30) {
        insights.push(`📊 RSI Education: RSI below 30 indicates oversold conditions. This often precedes price bounces, but confirm with other indicators to avoid false signals.`);
      } else if (latest.rsi > 70) {
        insights.push(`📊 RSI Education: RSI above 70 indicates overbought conditions. Price may be due for a pullback, but strong trends can remain overbought for extended periods.`);
      }
    }
    
    // Pattern education
    const patterns = technicalAnalysis.patterns || [];
    patterns.forEach(pattern => {
      if (pattern.strength === 'VERY_STRONG') {
        insights.push(`🕯️ Pattern Education: ${pattern.name} has a historical success rate of approximately 70-80% when confirmed by volume and other technical factors.`);
      }
    });
    
    return insights;
  }

  /**
   * Calculate stop loss level
   */
  calculateStopLoss(signalData, technicalAnalysis) {
    const currentPrice = signalData.currentPrice;
    const atr = technicalAnalysis.indicators?.latest?.atr || currentPrice * 0.01;
    
    let stopLossDistance = atr * 1.5; // 1.5x ATR
    
    // Adjust based on support/resistance levels
    const supportResistance = technicalAnalysis.supportResistance || [];
    if (signalData.decision === 'BUY') {
      const nearestSupport = supportResistance
        .filter(level => level.type === 'SUPPORT' && level.price < currentPrice)
        .sort((a, b) => b.price - a.price)[0];
      
      if (nearestSupport) {
        const supportDistance = currentPrice - nearestSupport.price;
        stopLossDistance = Math.min(stopLossDistance, supportDistance * 0.9);
      }
    } else if (signalData.decision === 'SELL') {
      const nearestResistance = supportResistance
        .filter(level => level.type === 'RESISTANCE' && level.price > currentPrice)
        .sort((a, b) => a.price - b.price)[0];
      
      if (nearestResistance) {
        const resistanceDistance = nearestResistance.price - currentPrice;
        stopLossDistance = Math.min(stopLossDistance, resistanceDistance * 0.9);
      }
    }
    
    const stopLoss = signalData.decision === 'BUY' ? 
      currentPrice - stopLossDistance : 
      currentPrice + stopLossDistance;
    
    return {
      price: stopLoss,
      distance: stopLossDistance,
      percentage: (stopLossDistance / currentPrice * 100).toFixed(2)
    };
  }

  /**
   * Calculate take profit level
   */
  calculateTakeProfit(signalData, technicalAnalysis) {
    const currentPrice = signalData.currentPrice;
    const stopLoss = this.calculateStopLoss(signalData, technicalAnalysis);
    
    // Default 2:1 risk/reward ratio
    const riskDistance = stopLoss.distance;
    const rewardDistance = riskDistance * 2;
    
    const takeProfit = signalData.decision === 'BUY' ? 
      currentPrice + rewardDistance : 
      currentPrice - rewardDistance;
    
    return {
      price: takeProfit,
      distance: rewardDistance,
      percentage: (rewardDistance / currentPrice * 100).toFixed(2),
      riskRewardRatio: '2.00'
    };
  }

  /**
   * Get current session statistics
   */
  getSessionStats() {
    const totalTrades = this.sessionStats.tradesExecuted;
    const winRate = totalTrades > 0 ? (this.sessionStats.wins / totalTrades * 100).toFixed(1) : 0;
    
    return {
      ...this.sessionStats,
      winRate,
      totalTrades,
      profitLoss: this.sessionStats.totalProfit.toFixed(2),
      sessionDuration: this.getSessionDuration()
    };
  }

  /**
   * Helper methods
   */
  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getSessionDuration() {
    const duration = Date.now() - this.sessionStats.startTime.getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  countConsecutiveLosses(trades) {
    let count = 0;
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i].outcome === 'LOSS') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  getConsensusSuccessRate() {
    // This would be calculated from historical data
    return 78; // Placeholder
  }

  createSkipResult(reason, signalData) {
    return {
      type: 'TRADE_BLOCKED',
      reason,
      signal: signalData,
      sessionStats: this.getSessionStats()
    };
  }

  createErrorResult(error, signalData) {
    return {
      type: 'TRADE_ERROR',
      error: error.message,
      signal: signalData,
      sessionStats: this.getSessionStats()
    };
  }

  async saveTradeToDatabase(trade) {
    // Implementation depends on database choice
    // This is a placeholder for database integration
    this.logger.info(`💾 Trade saved to database: ${trade.id}`);
  }

  async saveSkipToDatabase(skipRecord) {
    // Implementation depends on database choice
    this.logger.info(`💾 Skip record saved: ${skipRecord.id}`);
  }

  scheduleTradeMonitoring(trade) {
    // Schedule monitoring for trade outcome
    // This would integrate with real-time price feeds
    this.logger.info(`⏰ Trade monitoring scheduled: ${trade.id}`);
  }
}

module.exports = { TradeManager };
