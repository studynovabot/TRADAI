/**
 * Trade Logger - Manual Trade Result Logging System
 * 
 * This module handles logging of manual trade results to improve the AI model.
 * It stores successful trade patterns for training data enhancement.
 */

const { Logger } = require('../utils/Logger');
const fs = require('fs-extra');
const path = require('path');

class TradeLogger {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // File paths for different types of logs
    this.filePaths = {
      allTrades: path.join(process.cwd(), 'data', 'manual_trades', 'all_trades.json'),
      successfulTrades: path.join(process.cwd(), 'data', 'manual_trades', 'successful_trades.json'),
      failedTrades: path.join(process.cwd(), 'data', 'manual_trades', 'failed_trades.json'),
      trainingData: path.join(process.cwd(), 'data', 'training', 'successful_patterns.json'),
      statistics: path.join(process.cwd(), 'data', 'manual_trades', 'statistics.json')
    };
    
    // Ensure directories exist
    this.ensureDirectoriesExist();
    
    // Load existing statistics
    this.statistics = this.loadStatistics();
    
    this.logger.info('📝 TradeLogger initialized');
  }

  async ensureDirectoriesExist() {
    for (const filePath of Object.values(this.filePaths)) {
      await fs.ensureDir(path.dirname(filePath));
    }
  }

  /**
   * Log a manual trade result
   */
  async logTradeResult(signalId, signalData, tradeOutcome) {
    try {
      const tradeLog = {
        signalId,
        timestamp: new Date().toISOString(),
        
        // Original signal data
        originalSignal: {
          signalQuality: signalData.signalQuality,
          tradeScore: signalData.tradeScore,
          reasoning: signalData.reasoning,
          confidence: signalData.confidence,
          tradeRecommendation: signalData.tradeRecommendation
        },
        
        // Trade outcome
        outcome: {
          executed: tradeOutcome.executed,
          won: tradeOutcome.won,
          pnl: tradeOutcome.pnl,
          actualAmount: tradeOutcome.actualAmount,
          executionTime: tradeOutcome.executionTime,
          expiryTime: tradeOutcome.expiryTime,
          exitReason: tradeOutcome.exitReason || (tradeOutcome.won ? 'IN_THE_MONEY' : 'OUT_OF_THE_MONEY')
        },
        
        // User feedback
        userFeedback: {
          tradeDecisionReason: tradeOutcome.tradeDecisionReason || 'Manual decision',
          signalQualityRating: tradeOutcome.signalQualityRating || null, // 1-5 rating
          wouldTradeAgain: tradeOutcome.wouldTradeAgain || null,
          additionalNotes: tradeOutcome.additionalNotes || ''
        },
        
        // System context
        systemContext: {
          currencyPair: signalData.tradeRecommendation?.asset || this.config.currencyPair,
          marketConditions: this.extractMarketConditions(signalData),
          technicalFactors: this.extractTechnicalFactors(signalData)
        }
      };
      
      // Save to all trades log
      await this.saveTradeLog(tradeLog);
      
      // Update statistics
      this.updateStatistics(tradeLog);
      
      // If successful, save for training data
      if (tradeOutcome.executed && tradeOutcome.won) {
        await this.saveSuccessfulPattern(tradeLog);
      }
      
      this.logger.info(`📝 Trade logged: ${signalId} - ${tradeOutcome.won ? 'WIN' : 'LOSS'} (PnL: ${tradeOutcome.pnl})`);
      
      return {
        success: true,
        tradeId: signalId,
        loggedAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to log trade result:', error);
      throw error;
    }
  }

  /**
   * Save trade log to appropriate files
   */
  async saveTradeLog(tradeLog) {
    // Save to all trades
    await this.appendToJsonFile(this.filePaths.allTrades, tradeLog);
    
    // Save to specific outcome file
    if (tradeLog.outcome.executed) {
      const targetFile = tradeLog.outcome.won ? 
        this.filePaths.successfulTrades : 
        this.filePaths.failedTrades;
      
      await this.appendToJsonFile(targetFile, tradeLog);
    }
  }

  /**
   * Save successful pattern for AI training
   */
  async saveSuccessfulPattern(tradeLog) {
    try {
      const pattern = {
        patternId: `PATTERN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: tradeLog.timestamp,
        
        // Signal characteristics that led to success
        signalCharacteristics: {
          signalQuality: tradeLog.originalSignal.signalQuality,
          tradeScore: tradeLog.originalSignal.tradeScore,
          confidence: tradeLog.originalSignal.confidence,
          
          // Technical indicators
          quantConfidence: tradeLog.originalSignal.tradeRecommendation?.quantConfidence,
          analystConfidence: tradeLog.originalSignal.tradeRecommendation?.analystConfidence,
          confluenceScore: tradeLog.originalSignal.tradeRecommendation?.confluenceScore,
          riskScore: tradeLog.originalSignal.tradeRecommendation?.riskScore,
          
          // Market context
          asset: tradeLog.systemContext.currencyPair,
          direction: tradeLog.originalSignal.tradeRecommendation?.direction,
          marketConditions: tradeLog.systemContext.marketConditions,
          technicalFactors: tradeLog.systemContext.technicalFactors
        },
        
        // Success metrics
        successMetrics: {
          pnl: tradeLog.outcome.pnl,
          pnlPercentage: this.calculatePnlPercentage(tradeLog.outcome.pnl, tradeLog.outcome.actualAmount),
          executionSpeed: this.calculateExecutionSpeed(tradeLog),
          userRating: tradeLog.userFeedback.signalQualityRating
        },
        
        // LLM training prompt components
        trainingData: {
          analysisPrompt: this.generateTrainingPrompt(tradeLog),
          expectedResponse: this.generateExpectedResponse(tradeLog),
          keyLearnings: this.extractKeyLearnings(tradeLog)
        }
      };
      
      await this.appendToJsonFile(this.filePaths.trainingData, pattern);
      
      this.logger.info(`🎓 Successful pattern saved for AI training: ${pattern.patternId}`);
      
    } catch (error) {
      this.logger.error('❌ Failed to save successful pattern:', error);
    }
  }

  /**
   * Generate training prompt from successful trade
   */
  generateTrainingPrompt(tradeLog) {
    const signal = tradeLog.originalSignal;
    const recommendation = signal.tradeRecommendation;
    
    return `BINARY OPTIONS SIGNAL ANALYSIS

Asset: ${recommendation.asset}
Direction: ${recommendation.direction}
Market Context: ${JSON.stringify(tradeLog.systemContext.marketConditions)}
Technical Factors: ${JSON.stringify(tradeLog.systemContext.technicalFactors)}

ML Confidence: ${(recommendation.quantConfidence * 100).toFixed(1)}%
LLM Confidence: ${(recommendation.analystConfidence * 100).toFixed(1)}%
Confluence Score: ${recommendation.confluenceScore}/100
Risk Score: ${(recommendation.riskScore * 100).toFixed(1)}%

Signal Strengths: ${recommendation.signalStrengths?.join(', ') || 'Not specified'}
Risk Factors: ${recommendation.riskFactors?.join(', ') || 'None identified'}

TASK: Analyze this signal and provide quality assessment.`;
  }

  /**
   * Generate expected response from successful trade
   */
  generateExpectedResponse(tradeLog) {
    const signal = tradeLog.originalSignal;
    const outcome = tradeLog.outcome;
    
    return `QUALITY: ${signal.signalQuality}
CONFIDENCE: ${Math.round(signal.confidence * 100)}
TRADE_SCORE: ${signal.tradeScore}
REASON: This signal demonstrated ${signal.signalQuality.toLowerCase()} quality with strong technical confluence. The trade resulted in ${outcome.won ? 'profit' : 'loss'} of ${Math.abs(outcome.pnl)} with actual PnL of ${outcome.pnl}. Key success factors: ${signal.tradeRecommendation?.signalStrengths?.slice(0, 3).join(', ') || 'technical alignment'}.`;
  }

  /**
   * Extract key learnings from successful trade
   */
  extractKeyLearnings(tradeLog) {
    const learnings = [];
    
    // Signal quality learnings
    if (tradeLog.originalSignal.signalQuality === 'EXCELLENT' && tradeLog.outcome.won) {
      learnings.push('EXCELLENT quality signals show high success probability');
    }
    
    if (tradeLog.originalSignal.tradeScore > 80 && tradeLog.outcome.won) {
      learnings.push('Trade scores above 80 correlate with successful outcomes');
    }
    
    // Technical learnings
    const strengths = tradeLog.originalSignal.tradeRecommendation?.signalStrengths || [];
    if (strengths.includes('Volume spike confirmation') && tradeLog.outcome.won) {
      learnings.push('Volume spike confirmation improves success probability');
    }
    
    if (strengths.includes('Strong trend alignment') && tradeLog.outcome.won) {
      learnings.push('Multi-timeframe trend alignment is a strong success indicator');
    }
    
    // Confluence learnings
    const confluenceScore = tradeLog.originalSignal.tradeRecommendation?.confluenceScore || 0;
    if (confluenceScore > 70 && tradeLog.outcome.won) {
      learnings.push('High confluence scores (>70) strongly indicate successful trades');
    }
    
    // Risk learnings
    const riskScore = tradeLog.originalSignal.tradeRecommendation?.riskScore || 0.5;
    if (riskScore < 0.3 && tradeLog.outcome.won) {
      learnings.push('Low risk environments (<30%) favor successful outcomes');
    }
    
    return learnings.length > 0 ? learnings : ['Standard technical analysis principles apply'];
  }

  /**
   * Extract market conditions from signal data
   */
  extractMarketConditions(signalData) {
    const recommendation = signalData.tradeRecommendation;
    
    return {
      volatility: recommendation?.riskScore > 0.6 ? 'HIGH' : recommendation?.riskScore > 0.3 ? 'MEDIUM' : 'LOW',
      trend: this.determineTrendCondition(recommendation),
      volume: this.determineVolumeCondition(recommendation),
      timeOfDay: this.getTimeOfDayCategory(),
      confluence: recommendation?.confluenceScore > 70 ? 'STRONG' : recommendation?.confluenceScore > 50 ? 'MODERATE' : 'WEAK'
    };
  }

  /**
   * Extract technical factors from signal data
   */
  extractTechnicalFactors(signalData) {
    const recommendation = signalData.tradeRecommendation;
    const strengths = recommendation?.signalStrengths || [];
    const risks = recommendation?.riskFactors || [];
    
    return {
      primaryStrengths: strengths.slice(0, 3),
      primaryRisks: risks.slice(0, 3),
      trendAlignment: strengths.includes('Strong trend alignment'),
      volumeConfirmation: strengths.includes('Volume spike confirmation'),
      macdBullish: strengths.includes('MACD bullish signal'),
      lowRiskEnvironment: strengths.includes('Low risk environment')
    };
  }

  /**
   * Update trade statistics
   */
  updateStatistics(tradeLog) {
    if (tradeLog.outcome.executed) {
      this.statistics.totalTrades++;
      
      if (tradeLog.outcome.won) {
        this.statistics.winningTrades++;
        this.statistics.totalProfit += tradeLog.outcome.pnl;
      } else {
        this.statistics.losingTrades++;
        this.statistics.totalLoss += Math.abs(tradeLog.outcome.pnl);
      }
      
      // Update by signal quality
      const quality = tradeLog.originalSignal.signalQuality;
      if (!this.statistics.byQuality[quality]) {
        this.statistics.byQuality[quality] = { total: 0, wins: 0, totalPnl: 0 };
      }
      
      this.statistics.byQuality[quality].total++;
      if (tradeLog.outcome.won) {
        this.statistics.byQuality[quality].wins++;
      }
      this.statistics.byQuality[quality].totalPnl += tradeLog.outcome.pnl;
      
      // Update success rate
      this.statistics.successRate = this.statistics.totalTrades > 0 ? 
        this.statistics.winningTrades / this.statistics.totalTrades : 0;
      
      // Update net PnL
      this.statistics.netPnL = this.statistics.totalProfit - this.statistics.totalLoss;
      
      this.statistics.lastUpdated = new Date().toISOString();
    }
    
    // Save updated statistics
    this.saveStatistics();
  }

  /**
   * Get trade statistics
   */
  getStatistics() {
    return {
      ...this.statistics,
      qualityBreakdown: this.calculateQualityBreakdown(),
      recentPerformance: this.getRecentPerformance()
    };
  }

  /**
   * Calculate quality-based performance breakdown
   */
  calculateQualityBreakdown() {
    const breakdown = {};
    
    for (const [quality, stats] of Object.entries(this.statistics.byQuality)) {
      breakdown[quality] = {
        ...stats,
        successRate: stats.total > 0 ? stats.wins / stats.total : 0,
        avgPnl: stats.total > 0 ? stats.totalPnl / stats.total : 0
      };
    }
    
    return breakdown;
  }

  /**
   * Get recent performance (last 20 trades)
   */
  async getRecentPerformance() {
    try {
      if (!await fs.pathExists(this.filePaths.allTrades)) {
        return { trades: [], recentSuccessRate: 0 };
      }
      
      const allTrades = await fs.readJson(this.filePaths.allTrades);
      const recentTrades = allTrades.slice(-20);
      const executedTrades = recentTrades.filter(t => t.outcome.executed);
      const recentWins = executedTrades.filter(t => t.outcome.won).length;
      
      return {
        trades: recentTrades,
        recentSuccessRate: executedTrades.length > 0 ? recentWins / executedTrades.length : 0,
        recentTradeCount: executedTrades.length,
        recentNetPnL: executedTrades.reduce((sum, t) => sum + t.outcome.pnl, 0)
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to get recent performance:', error);
      return { trades: [], recentSuccessRate: 0 };
    }
  }

  /**
   * Get successful patterns for AI improvement
   */
  async getSuccessfulPatterns(limit = 50) {
    try {
      if (!await fs.pathExists(this.filePaths.trainingData)) {
        return [];
      }
      
      const patterns = await fs.readJson(this.filePaths.trainingData);
      return patterns.slice(-limit); // Return most recent patterns
      
    } catch (error) {
      this.logger.error('❌ Failed to get successful patterns:', error);
      return [];
    }
  }

  // Helper methods

  determineTrendCondition(recommendation) {
    const strengths = recommendation?.signalStrengths || [];
    if (strengths.includes('Strong trend alignment')) return 'STRONG';
    if (strengths.includes('MACD bullish signal')) return 'BULLISH';
    return 'NEUTRAL';
  }

  determineVolumeCondition(recommendation) {
    const strengths = recommendation?.signalStrengths || [];
    if (strengths.includes('Volume spike confirmation')) return 'HIGH';
    if (strengths.includes('volume')) return 'ELEVATED';
    return 'NORMAL';
  }

  getTimeOfDayCategory() {
    const hour = new Date().getUTCHours();
    if (hour >= 8 && hour <= 16) return 'LONDON_NY';
    if (hour >= 0 && hour <= 8) return 'ASIA_PACIFIC';
    return 'OFF_HOURS';
  }

  calculatePnlPercentage(pnl, amount) {
    return amount > 0 ? (pnl / amount) * 100 : 0;
  }

  calculateExecutionSpeed(tradeLog) {
    const signalTime = new Date(tradeLog.timestamp);
    const executionTime = new Date(tradeLog.outcome.executionTime);
    return Math.max(0, executionTime - signalTime) / 1000; // seconds
  }

  async appendToJsonFile(filePath, data) {
    let existingData = [];
    
    if (await fs.pathExists(filePath)) {
      existingData = await fs.readJson(filePath);
    }
    
    existingData.push(data);
    
    // Keep only last 1000 records to prevent files from growing too large
    if (existingData.length > 1000) {
      existingData = existingData.slice(-1000);
    }
    
    await fs.writeJson(filePath, existingData);
  }

  loadStatistics() {
    try {
      if (fs.pathExistsSync(this.filePaths.statistics)) {
        return fs.readJsonSync(this.filePaths.statistics);
      }
    } catch (error) {
      this.logger.warn('⚠️ Failed to load statistics, using defaults');
    }
    
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      successRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netPnL: 0,
      byQuality: {},
      lastUpdated: new Date().toISOString()
    };
  }

  saveStatistics() {
    try {
      fs.writeJsonSync(this.filePaths.statistics, this.statistics);
    } catch (error) {
      this.logger.error('❌ Failed to save statistics:', error);
    }
  }
}

module.exports = { TradeLogger };