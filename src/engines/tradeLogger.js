/**
 * Trade Logger - Signal and Trade Result Tracking
 * 
 * This module logs signals and trade results for:
 * - Performance analysis
 * - Filter weight adaptation
 * - Setup tag performance tracking
 * - Historical pattern learning
 */

const { Logger } = require('../utils/Logger');
const fs = require('fs-extra');
const path = require('path');

class TradeLogger {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Logging configuration
    this.logConfig = {
      maxSignalHistory: 1000,
      maxTradeHistory: 500,
      signalLogFile: path.join(process.cwd(), 'data', 'logs', 'signals.json'),
      tradeLogFile: path.join(process.cwd(), 'data', 'logs', 'trades.json'),
      setupStatsFile: path.join(process.cwd(), 'data', 'logs', 'setup_stats.json'),
      autoSaveInterval: 10 // Auto-save every 10 logs
    };
    
    // Signal and trade history
    this.signalHistory = [];
    this.tradeHistory = [];
    this.setupStats = {};
    
    // Counters
    this.signalCount = 0;
    this.tradeCount = 0;
    
    // Initialize
    this.initialize();
    
    this.logger.info('📝 Trade Logger initialized');
  }

  /**
   * Initialize logger and load existing data
   */
  async initialize() {
    try {
      // Create log directories
      await fs.ensureDir(path.dirname(this.logConfig.signalLogFile));
      
      // Load existing signal history
      if (await fs.pathExists(this.logConfig.signalLogFile)) {
        this.signalHistory = await fs.readJson(this.logConfig.signalLogFile);
        this.signalCount = this.signalHistory.length;
        this.logger.info(`📊 Loaded ${this.signalCount} historical signals`);
      }
      
      // Load existing trade history
      if (await fs.pathExists(this.logConfig.tradeLogFile)) {
        this.tradeHistory = await fs.readJson(this.logConfig.tradeLogFile);
        this.tradeCount = this.tradeHistory.length;
        this.logger.info(`📊 Loaded ${this.tradeCount} historical trades`);
      }
      
      // Load existing setup stats
      if (await fs.pathExists(this.logConfig.setupStatsFile)) {
        this.setupStats = await fs.readJson(this.logConfig.setupStatsFile);
        this.logger.info(`📊 Loaded stats for ${Object.keys(this.setupStats).length} setups`);
      }
      
    } catch (error) {
      this.logger.error('❌ Error initializing trade logger:', error);
    }
  }

  /**
   * Log a new signal
   * @param {Object} signal - Signal data
   * @returns {String} Signal ID
   */
  async logSignal(signal) {
    try {
      // Generate signal ID if not provided
      if (!signal.signalId) {
        signal.signalId = this.generateSignalId();
      }
      
      // Add timestamp if not provided
      if (!signal.timestamp) {
        signal.timestamp = new Date().toISOString();
      }
      
      // Add to signal history
      this.signalHistory.unshift({
        signalId: signal.signalId,
        timestamp: signal.timestamp,
        direction: signal.direction,
        confidence: signal.confidence,
        regime: signal.regime,
        setupTag: signal.setupTag,
        filters: signal.filters,
        passedFilters: signal.passedFilters,
        contradictions: signal.contradictions,
        result: null // Will be updated later
      });
      
      // Keep history within size limit
      if (this.signalHistory.length > this.logConfig.maxSignalHistory) {
        this.signalHistory = this.signalHistory.slice(0, this.logConfig.maxSignalHistory);
      }
      
      // Increment counter and auto-save periodically
      this.signalCount++;
      if (this.signalCount % this.logConfig.autoSaveInterval === 0) {
        await this.saveSignalHistory();
      }
      
      return signal.signalId;
      
    } catch (error) {
      this.logger.error('❌ Error logging signal:', error);
      return null;
    }
  }

  /**
   * Update signal with trade result
   * @param {String} signalId - Signal ID
   * @param {Object} result - Trade result
   * @returns {Boolean} Success
   */
  async updateSignalResult(signalId, result) {
    try {
      // Find signal in history
      const signalIndex = this.signalHistory.findIndex(s => s.signalId === signalId);
      if (signalIndex === -1) {
        this.logger.warn(`⚠️ Signal ${signalId} not found in history`);
        return false;
      }
      
      // Update signal with result
      this.signalHistory[signalIndex].result = {
        success: result.success,
        pnl: result.pnl,
        entryTime: result.entryTime || new Date().toISOString(),
        exitTime: result.exitTime || new Date().toISOString(),
        notes: result.notes
      };
      
      // Log trade
      await this.logTrade(this.signalHistory[signalIndex], result);
      
      // Update setup stats
      await this.updateSetupStats(this.signalHistory[signalIndex]);
      
      // Save signal history
      await this.saveSignalHistory();
      
      return true;
      
    } catch (error) {
      this.logger.error('❌ Error updating signal result:', error);
      return false;
    }
  }

  /**
   * Log a completed trade
   * @param {Object} signal - Signal data
   * @param {Object} result - Trade result
   * @returns {Boolean} Success
   */
  async logTrade(signal, result) {
    try {
      // Create trade record
      const trade = {
        tradeId: this.generateTradeId(),
        signalId: signal.signalId,
        timestamp: new Date().toISOString(),
        direction: signal.direction,
        setupTag: signal.setupTag,
        regime: signal.regime,
        confidence: signal.confidence,
        success: result.success,
        pnl: result.pnl,
        entryTime: result.entryTime || signal.timestamp,
        exitTime: result.exitTime || new Date().toISOString(),
        filters: signal.filters,
        notes: result.notes
      };
      
      // Add to trade history
      this.tradeHistory.unshift(trade);
      
      // Keep history within size limit
      if (this.tradeHistory.length > this.logConfig.maxTradeHistory) {
        this.tradeHistory = this.tradeHistory.slice(0, this.logConfig.maxTradeHistory);
      }
      
      // Increment counter and auto-save periodically
      this.tradeCount++;
      if (this.tradeCount % this.logConfig.autoSaveInterval === 0) {
        await this.saveTradeHistory();
      }
      
      return true;
      
    } catch (error) {
      this.logger.error('❌ Error logging trade:', error);
      return false;
    }
  }

  /**
   * Update setup statistics
   * @param {Object} signal - Signal with result
   */
  async updateSetupStats(signal) {
    try {
      if (!signal.setupTag || !signal.result) return;
      
      // Initialize setup stats if not exists
      if (!this.setupStats[signal.setupTag]) {
        this.setupStats[signal.setupTag] = {
          totalTrades: 0,
          winCount: 0,
          lossCount: 0,
          winRate: 0,
          totalPnL: 0,
          avgPnL: 0,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Update stats
      const stats = this.setupStats[signal.setupTag];
      stats.totalTrades++;
      
      if (signal.result.success) {
        stats.winCount++;
      } else {
        stats.lossCount++;
      }
      
      stats.winRate = stats.totalTrades > 0 ? stats.winCount / stats.totalTrades : 0;
      stats.totalPnL += signal.result.pnl || 0;
      stats.avgPnL = stats.totalTrades > 0 ? stats.totalPnL / stats.totalTrades : 0;
      stats.lastUpdated = new Date().toISOString();
      
      // Save setup stats
      await this.saveSetupStats();
      
    } catch (error) {
      this.logger.error('❌ Error updating setup stats:', error);
    }
  }

  /**
   * Get setup performance statistics
   * @returns {Array} Setup statistics
   */
  async getSetupPerformance() {
    const stats = [];
    
    for (const [setupTag, setupStat] of Object.entries(this.setupStats)) {
      if (setupStat.totalTrades > 0) {
        stats.push({
          setupTag,
          totalTrades: setupStat.totalTrades,
          winCount: setupStat.winCount,
          lossCount: setupStat.lossCount,
          winRate: setupStat.winRate,
          totalPnL: setupStat.totalPnL,
          avgPnL: setupStat.avgPnL,
          lastUpdated: setupStat.lastUpdated
        });
      }
    }
    
    // Sort by win rate
    return stats.sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Get recent signals
   * @param {Number} limit - Maximum number of signals to return
   * @returns {Array} Recent signals
   */
  getRecentSignals(limit = 20) {
    return this.signalHistory.slice(0, limit);
  }

  /**
   * Get recent trades
   * @param {Number} limit - Maximum number of trades to return
   * @returns {Array} Recent trades
   */
  getRecentTrades(limit = 20) {
    return this.tradeHistory.slice(0, limit);
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    // Calculate overall stats
    const totalTrades = this.tradeHistory.length;
    const winningTrades = this.tradeHistory.filter(t => t.success).length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const totalPnL = this.tradeHistory.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const avgPnL = totalTrades > 0 ? totalPnL / totalTrades : 0;
    
    // Calculate stats by regime
    const regimeStats = {};
    for (const trade of this.tradeHistory) {
      const regime = trade.regime || 'UNKNOWN';
      
      if (!regimeStats[regime]) {
        regimeStats[regime] = {
          totalTrades: 0,
          winCount: 0,
          lossCount: 0,
          winRate: 0,
          totalPnL: 0,
          avgPnL: 0
        };
      }
      
      regimeStats[regime].totalTrades++;
      
      if (trade.success) {
        regimeStats[regime].winCount++;
      } else {
        regimeStats[regime].lossCount++;
      }
      
      regimeStats[regime].winRate = regimeStats[regime].totalTrades > 0 ? 
        regimeStats[regime].winCount / regimeStats[regime].totalTrades : 0;
      
      regimeStats[regime].totalPnL += trade.pnl || 0;
      regimeStats[regime].avgPnL = regimeStats[regime].totalTrades > 0 ? 
        regimeStats[regime].totalPnL / regimeStats[regime].totalTrades : 0;
    }
    
    // Calculate stats by direction
    const directionStats = {
      UP: { totalTrades: 0, winCount: 0, winRate: 0, totalPnL: 0 },
      DOWN: { totalTrades: 0, winCount: 0, winRate: 0, totalPnL: 0 }
    };
    
    for (const trade of this.tradeHistory) {
      const direction = trade.direction || 'UNKNOWN';
      if (direction !== 'UP' && direction !== 'DOWN') continue;
      
      directionStats[direction].totalTrades++;
      
      if (trade.success) {
        directionStats[direction].winCount++;
      }
      
      directionStats[direction].winRate = directionStats[direction].totalTrades > 0 ? 
        directionStats[direction].winCount / directionStats[direction].totalTrades : 0;
      
      directionStats[direction].totalPnL += trade.pnL || 0;
    }
    
    return {
      overall: {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalPnL,
        avgPnL
      },
      byRegime: regimeStats,
      byDirection: directionStats,
      topSetups: this.getTopSetups(5)
    };
  }

  /**
   * Get top performing setups
   * @param {Number} limit - Maximum number of setups to return
   * @returns {Array} Top setups
   */
  getTopSetups(limit = 5) {
    const setups = [];
    
    for (const [setupTag, stats] of Object.entries(this.setupStats)) {
      if (stats.totalTrades >= 5) { // Minimum sample size
        setups.push({
          setupTag,
          winRate: stats.winRate,
          totalTrades: stats.totalTrades,
          avgPnL: stats.avgPnL
        });
      }
    }
    
    // Sort by win rate and return top N
    return setups.sort((a, b) => b.winRate - a.winRate).slice(0, limit);
  }

  /**
   * Save signal history to file
   */
  async saveSignalHistory() {
    try {
      await fs.ensureDir(path.dirname(this.logConfig.signalLogFile));
      await fs.writeJson(this.logConfig.signalLogFile, this.signalHistory);
    } catch (error) {
      this.logger.error('❌ Error saving signal history:', error);
    }
  }

  /**
   * Save trade history to file
   */
  async saveTradeHistory() {
    try {
      await fs.ensureDir(path.dirname(this.logConfig.tradeLogFile));
      await fs.writeJson(this.logConfig.tradeLogFile, this.tradeHistory);
    } catch (error) {
      this.logger.error('❌ Error saving trade history:', error);
    }
  }

  /**
   * Save setup stats to file
   */
  async saveSetupStats() {
    try {
      await fs.ensureDir(path.dirname(this.logConfig.setupStatsFile));
      await fs.writeJson(this.logConfig.setupStatsFile, this.setupStats);
    } catch (error) {
      this.logger.error('❌ Error saving setup stats:', error);
    }
  }

  /**
   * Generate unique signal ID
   */
  generateSignalId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `SIG_${timestamp}_${random}`;
  }

  /**
   * Generate unique trade ID
   */
  generateTradeId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `TRADE_${timestamp}_${random}`;
  }
}

module.exports = { TradeLogger };