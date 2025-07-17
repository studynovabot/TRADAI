/**
 * SignalPerformanceTracker - Track and Analyze Signal Performance
 * 
 * Tracks the performance of generated signals over time to improve
 * future signal generation and provide feedback on accuracy
 */

const fs = require('fs').promises;
const path = require('path');

class SignalPerformanceTracker {
  constructor(storageFilePath = path.join(process.cwd(), 'data', 'signal_performance.json')) {
    this.storageFilePath = storageFilePath;
    this.signals = [];
    this.initialized = false;
  }

  /**
   * Initialize the tracker by loading existing data
   */
  async initialize() {
    try {
      // Ensure the directory exists
      const directory = path.dirname(this.storageFilePath);
      await fs.mkdir(directory, { recursive: true });
      
      // Try to load existing data
      try {
        const data = await fs.readFile(this.storageFilePath, 'utf8');
        this.signals = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is invalid, start with empty array
        this.signals = [];
        await this.saveData();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error(`Error initializing signal tracker: ${error.message}`);
      this.signals = [];
    }
  }

  /**
   * Save current signals data to storage
   */
  async saveData() {
    try {
      await fs.writeFile(
        this.storageFilePath,
        JSON.stringify(this.signals, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error(`Error saving signal data: ${error.message}`);
    }
  }

  /**
   * Record a new signal
   * @param {Object} signal - Signal data to record
   * @returns {String} - ID of the recorded signal
   */
  async recordSignal(signal) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const signalId = `signal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const signalRecord = {
      id: signalId,
      timestamp: Date.now(),
      signal: signal.signal,
      symbol: signal.symbol,
      confidence: signal.confidence,
      timeframe: signal.timeframe,
      trade_duration: signal.trade_duration,
      indicators: signal.indicators,
      reason: signal.reason,
      result: 'pending', // Will be updated later
      profit_loss: null,
      actual_duration: null,
      entry_price: signal.entry_price || null,
      exit_price: null
    };
    
    this.signals.push(signalRecord);
    await this.saveData();
    
    return signalId;
  }

  /**
   * Update a signal with its result
   * @param {Object} params - Update parameters
   * @param {String} params.signalId - ID of the signal to update
   * @param {String} params.result - Result of the signal (WIN/LOSS/BREAKEVEN/CANCELLED/EXPIRED)
   * @param {Number} params.profitLoss - Profit or loss percentage
   * @param {Number} params.exitPrice - Exit price
   * @param {String} params.exitTime - Exit timestamp (ISO string)
   * @param {String} params.tradeDuration - Actual trade duration
   * @param {String} params.notes - Additional notes about the trade
   * @returns {Object|Boolean} - Updated signal or false if not found
   */
  async updateSignalResult({
    signalId, 
    result, 
    profitLoss = 0, 
    exitPrice = 0, 
    exitTime = new Date().toISOString(),
    tradeDuration,
    notes
  }) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const signalIndex = this.signals.findIndex(s => s.id === signalId);
    
    if (signalIndex === -1) {
      return false;
    }
    
    // Update signal with enhanced data
    this.signals[signalIndex].result = result;
    this.signals[signalIndex].profit_loss = profitLoss;
    this.signals[signalIndex].exit_price = exitPrice;
    this.signals[signalIndex].exit_time = exitTime;
    this.signals[signalIndex].actual_duration = tradeDuration || 
      (Date.now() - this.signals[signalIndex].timestamp);
    
    // Add additional fields
    if (notes) {
      this.signals[signalIndex].notes = notes;
    }
    
    // Add update timestamp
    this.signals[signalIndex].updated_at = new Date().toISOString();
    
    await this.saveData();
    return this.signals[signalIndex];
  }

  /**
   * Get performance statistics with enhanced filtering
   * @param {Object} options - Filter options
   * @param {Number} options.period - Number of days to analyze (default: 30)
   * @param {String} options.symbol - Filter by symbol
   * @param {String} options.timeframe - Filter by timeframe
   * @param {String} options.startDate - Filter by start date (ISO string)
   * @param {String} options.endDate - Filter by end date (ISO string)
   * @param {Number} options.minConfidence - Filter by minimum confidence
   * @param {Number} options.maxConfidence - Filter by maximum confidence
   * @param {String} options.pattern - Filter by pattern type
   * @param {String} options.result - Filter by result (WIN/LOSS/etc)
   * @returns {Object} - Enhanced performance statistics
   */
  async getPerformanceStats(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Extract options with defaults
    const {
      period = 30,
      symbol,
      timeframe,
      startDate,
      endDate,
      minConfidence,
      maxConfidence,
      pattern,
      result
    } = options;
    
    // Apply time-based filtering
    let filteredSignals = [...this.signals];
    
    // Filter by time period if no specific date range is provided
    if (!startDate && !endDate) {
      const cutoffTime = Date.now() - (period * 24 * 60 * 60 * 1000);
      filteredSignals = filteredSignals.filter(s => s.timestamp >= cutoffTime);
    }
    
    // Filter by specific date range if provided
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      filteredSignals = filteredSignals.filter(s => s.timestamp >= startTimestamp);
    }
    
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime();
      filteredSignals = filteredSignals.filter(s => s.timestamp <= endTimestamp);
    }
    
    // Filter by symbol
    if (symbol) {
      filteredSignals = filteredSignals.filter(s => s.symbol === symbol);
    }
    
    // Filter by timeframe
    if (timeframe) {
      filteredSignals = filteredSignals.filter(s => 
        s.timeframe === timeframe || s.trade_duration === timeframe
      );
    }
    
    // Filter by confidence
    if (minConfidence !== undefined) {
      filteredSignals = filteredSignals.filter(s => s.confidence >= minConfidence);
    }
    
    if (maxConfidence !== undefined) {
      filteredSignals = filteredSignals.filter(s => s.confidence <= maxConfidence);
    }
    
    // Filter by pattern
    if (pattern) {
      filteredSignals = filteredSignals.filter(s => {
        const mainPattern = s.indicators?.pattern?.type || 
                           s.pattern_analysis?.main_pattern?.type;
        return mainPattern === pattern;
      });
    }
    
    // Filter by result
    if (result) {
      filteredSignals = filteredSignals.filter(s => 
        s.result && s.result.toUpperCase() === result
      );
    }
    
    // Filter out pending signals for analysis
    const completedSignals = filteredSignals.filter(s => s.result && s.result !== 'pending');
    
    if (completedSignals.length === 0) {
      return {
        totalSignals: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        breakeven: 0,
        cancelled: 0,
        averageProfit: 0,
        totalProfit: 0,
        profitFactor: 0,
        expectancy: 0,
        largestWin: 0,
        largestLoss: 0,
        averageWin: 0,
        averageLoss: 0
      };
    }
    
    // Calculate win/loss statistics
    const wins = completedSignals.filter(s => s.result.toUpperCase() === 'WIN').length;
    const losses = completedSignals.filter(s => s.result.toUpperCase() === 'LOSS').length;
    const breakeven = completedSignals.filter(s => s.result.toUpperCase() === 'BREAKEVEN').length;
    const cancelled = completedSignals.filter(s => 
      s.result.toUpperCase() === 'CANCELLED' || s.result.toUpperCase() === 'EXPIRED'
    ).length;
    
    const winRate = (wins / (wins + losses)) * 100;
    
    // Calculate profit/loss statistics
    const totalProfitLoss = completedSignals.reduce((sum, s) => sum + (s.profit_loss || 0), 0);
    const averageProfit = totalProfitLoss / completedSignals.length;
    
    // Calculate profit factor (gross profit / gross loss)
    const grossProfit = completedSignals
      .filter(s => (s.profit_loss || 0) > 0)
      .reduce((sum, s) => sum + (s.profit_loss || 0), 0);
      
    const grossLoss = Math.abs(completedSignals
      .filter(s => (s.profit_loss || 0) < 0)
      .reduce((sum, s) => sum + (s.profit_loss || 0), 0));
      
    const profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
    
    // Calculate largest win/loss and averages
    const winningTrades = completedSignals.filter(s => (s.profit_loss || 0) > 0);
    const losingTrades = completedSignals.filter(s => (s.profit_loss || 0) < 0);
    
    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(s => s.profit_loss || 0))
      : 0;
      
    const largestLoss = losingTrades.length > 0 
      ? Math.min(...losingTrades.map(s => s.profit_loss || 0))
      : 0;
      
    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, s) => sum + (s.profit_loss || 0), 0) / winningTrades.length
      : 0;
      
    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, s) => sum + (s.profit_loss || 0), 0) / losingTrades.length
      : 0;
    
    // Calculate expectancy (average R multiple)
    const expectancy = (winRate / 100 * averageWin) + ((1 - winRate / 100) * averageLoss);
    
    // Calculate confidence accuracy with enhanced ranges
    const confidenceRanges = [
      { min: 90, max: 100, label: '90-100', signals: [], wins: 0 },
      { min: 80, max: 89, label: '80-89', signals: [], wins: 0 },
      { min: 70, max: 79, label: '70-79', signals: [], wins: 0 },
      { min: 60, max: 69, label: '60-69', signals: [], wins: 0 },
      { min: 0, max: 59, label: '0-59', signals: [], wins: 0 }
    ];
    
    completedSignals.forEach(signal => {
      const confidence = signal.confidence || 0;
      const isWin = signal.result.toUpperCase() === 'WIN';
      
      for (const range of confidenceRanges) {
        if (confidence >= range.min && confidence <= range.max) {
          range.signals.push(signal);
          if (isWin) range.wins++;
          break;
        }
      }
    });
    
    const byConfidence = confidenceRanges.map(range => ({
      range: range.label,
      total: range.signals.length,
      wins: range.wins,
      winRate: range.signals.length > 0 
        ? ((range.wins / range.signals.length) * 100).toFixed(2)
        : '0.00'
    }));
    
    // Calculate by symbol
    const symbolStats = {};
    completedSignals.forEach(signal => {
      if (!symbolStats[signal.symbol]) {
        symbolStats[signal.symbol] = { 
          total: 0, 
          wins: 0, 
          losses: 0,
          profit: 0
        };
      }
      
      symbolStats[signal.symbol].total++;
      symbolStats[signal.symbol].profit += (signal.profit_loss || 0);
      
      if (signal.result.toUpperCase() === 'WIN') {
        symbolStats[signal.symbol].wins++;
      } else if (signal.result.toUpperCase() === 'LOSS') {
        symbolStats[signal.symbol].losses++;
      }
    });
    
    // Calculate by timeframe
    const timeframeStats = {};
    completedSignals.forEach(signal => {
      const tf = signal.trade_duration || signal.timeframe || 'unknown';
      
      if (!timeframeStats[tf]) {
        timeframeStats[tf] = { 
          total: 0, 
          wins: 0, 
          losses: 0,
          profit: 0
        };
      }
      
      timeframeStats[tf].total++;
      timeframeStats[tf].profit += (signal.profit_loss || 0);
      
      if (signal.result.toUpperCase() === 'WIN') {
        timeframeStats[tf].wins++;
      } else if (signal.result.toUpperCase() === 'LOSS') {
        timeframeStats[tf].losses++;
      }
    });
    
    // Calculate by pattern
    const patternStats = {};
    completedSignals.forEach(signal => {
      const patternType = signal.indicators?.pattern?.type || 
                         signal.pattern_analysis?.main_pattern?.type || 
                         'unknown';
      
      if (!patternStats[patternType]) {
        patternStats[patternType] = { 
          total: 0, 
          wins: 0, 
          losses: 0,
          profit: 0
        };
      }
      
      patternStats[patternType].total++;
      patternStats[patternType].profit += (signal.profit_loss || 0);
      
      if (signal.result.toUpperCase() === 'WIN') {
        patternStats[patternType].wins++;
      } else if (signal.result.toUpperCase() === 'LOSS') {
        patternStats[patternType].losses++;
      }
    });
    
    // Calculate by day of week
    const dayOfWeekStats = {
      0: { label: 'Sunday', total: 0, wins: 0, losses: 0 },
      1: { label: 'Monday', total: 0, wins: 0, losses: 0 },
      2: { label: 'Tuesday', total: 0, wins: 0, losses: 0 },
      3: { label: 'Wednesday', total: 0, wins: 0, losses: 0 },
      4: { label: 'Thursday', total: 0, wins: 0, losses: 0 },
      5: { label: 'Friday', total: 0, wins: 0, losses: 0 },
      6: { label: 'Saturday', total: 0, wins: 0, losses: 0 }
    };
    
    completedSignals.forEach(signal => {
      const date = new Date(signal.timestamp);
      const dayOfWeek = date.getDay();
      
      dayOfWeekStats[dayOfWeek].total++;
      
      if (signal.result.toUpperCase() === 'WIN') {
        dayOfWeekStats[dayOfWeek].wins++;
      } else if (signal.result.toUpperCase() === 'LOSS') {
        dayOfWeekStats[dayOfWeek].losses++;
      }
    });
    
    // Calculate by hour of day
    const hourOfDayStats = {};
    for (let i = 0; i < 24; i++) {
      hourOfDayStats[i] = { total: 0, wins: 0, losses: 0 };
    }
    
    completedSignals.forEach(signal => {
      const date = new Date(signal.timestamp);
      const hour = date.getHours();
      
      hourOfDayStats[hour].total++;
      
      if (signal.result.toUpperCase() === 'WIN') {
        hourOfDayStats[hour].wins++;
      } else if (signal.result.toUpperCase() === 'LOSS') {
        hourOfDayStats[hour].losses++;
      }
    });
    
    // Get recent performance trend (last 10 signals)
    const recentPerformance = completedSignals
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        symbol: s.symbol,
        result: s.result,
        profit_loss: s.profit_loss || 0,
        timestamp: s.timestamp,
        confidence: s.confidence
      }));
    
    return {
      // Overall statistics
      totalSignals: completedSignals.length,
      winRate: parseFloat(winRate.toFixed(2)),
      wins,
      losses,
      breakeven,
      cancelled,
      averageProfit: parseFloat(averageProfit.toFixed(2)),
      totalProfit: parseFloat(totalProfitLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      expectancy: parseFloat(expectancy.toFixed(2)),
      largestWin: parseFloat(largestWin.toFixed(2)),
      largestLoss: parseFloat(largestLoss.toFixed(2)),
      averageWin: parseFloat(averageWin.toFixed(2)),
      averageLoss: parseFloat(averageLoss.toFixed(2)),
      
      // Detailed statistics
      byConfidence,
      
      bySymbol: Object.entries(symbolStats).map(([symbol, stats]) => ({
        symbol,
        total: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? parseFloat(((stats.wins / stats.total) * 100).toFixed(2)) : 0,
        profit: parseFloat(stats.profit.toFixed(2))
      })),
      
      byTimeframe: Object.entries(timeframeStats).map(([timeframe, stats]) => ({
        timeframe,
        total: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? parseFloat(((stats.wins / stats.total) * 100).toFixed(2)) : 0,
        profit: parseFloat(stats.profit.toFixed(2))
      })),
      
      byPattern: Object.entries(patternStats).map(([pattern, stats]) => ({
        pattern,
        total: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? parseFloat(((stats.wins / stats.total) * 100).toFixed(2)) : 0,
        profit: parseFloat(stats.profit.toFixed(2))
      })),
      
      byDayOfWeek: Object.entries(dayOfWeekStats).map(([day, stats]) => ({
        day: parseInt(day),
        label: stats.label,
        total: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? parseFloat(((stats.wins / stats.total) * 100).toFixed(2)) : 0
      })),
      
      byHourOfDay: Object.entries(hourOfDayStats).map(([hour, stats]) => ({
        hour: parseInt(hour),
        total: stats.total,
        wins: stats.wins,
        losses: stats.losses,
        winRate: stats.total > 0 ? parseFloat(((stats.wins / stats.total) * 100).toFixed(2)) : 0
      })),
      
      recentPerformance
    };
  }

  /**
   * Get recent signals with enhanced filtering
   * @param {Object} options - Filter options
   * @param {Number} options.limit - Maximum number of signals to return
   * @param {Number} options.offset - Number of signals to skip (for pagination)
   * @param {String} options.symbol - Filter by symbol
   * @param {String} options.timeframe - Filter by timeframe
   * @param {String} options.startDate - Filter by start date (ISO string)
   * @param {String} options.endDate - Filter by end date (ISO string)
   * @param {Number} options.minConfidence - Filter by minimum confidence
   * @param {Number} options.maxConfidence - Filter by maximum confidence
   * @param {String} options.result - Filter by result (WIN/LOSS/etc)
   * @param {String} options.pattern - Filter by pattern type
   * @param {String} options.sortBy - Field to sort by (default: timestamp)
   * @param {String} options.sortOrder - Sort order (asc/desc, default: desc)
   * @returns {Array} - Filtered signals
   */
  async getRecentSignals(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Extract options with defaults
    const {
      limit = 20,
      offset = 0,
      symbol,
      timeframe,
      startDate,
      endDate,
      minConfidence,
      maxConfidence,
      result,
      pattern,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = options;
    
    // Apply filters
    let filteredSignals = [...this.signals];
    
    // Filter by symbol
    if (symbol) {
      filteredSignals = filteredSignals.filter(s => s.symbol === symbol);
    }
    
    // Filter by timeframe
    if (timeframe) {
      filteredSignals = filteredSignals.filter(s => 
        s.timeframe === timeframe || s.trade_duration === timeframe
      );
    }
    
    // Filter by date range
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      filteredSignals = filteredSignals.filter(s => s.timestamp >= startTimestamp);
    }
    
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime();
      filteredSignals = filteredSignals.filter(s => s.timestamp <= endTimestamp);
    }
    
    // Filter by confidence
    if (minConfidence !== undefined) {
      filteredSignals = filteredSignals.filter(s => s.confidence >= minConfidence);
    }
    
    if (maxConfidence !== undefined) {
      filteredSignals = filteredSignals.filter(s => s.confidence <= maxConfidence);
    }
    
    // Filter by result
    if (result) {
      filteredSignals = filteredSignals.filter(s => 
        s.result && s.result.toUpperCase() === result
      );
    }
    
    // Filter by pattern
    if (pattern) {
      filteredSignals = filteredSignals.filter(s => {
        const mainPattern = s.indicators?.pattern?.type || 
                           s.pattern_analysis?.main_pattern?.type;
        return mainPattern === pattern;
      });
    }
    
    // Sort signals
    filteredSignals.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      
      if (sortOrder.toLowerCase() === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    // Apply pagination
    return filteredSignals.slice(offset, offset + limit);
  }

  /**
   * Get total count of signals matching filter criteria
   * @param {Object} options - Filter options (same as getRecentSignals)
   * @returns {Number} - Total count of matching signals
   */
  async getSignalCount(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Extract filter options
    const {
      symbol,
      timeframe,
      startDate,
      endDate,
      minConfidence,
      maxConfidence,
      result,
      pattern
    } = options;
    
    // Apply filters
    let filteredSignals = [...this.signals];
    
    // Filter by symbol
    if (symbol) {
      filteredSignals = filteredSignals.filter(s => s.symbol === symbol);
    }
    
    // Filter by timeframe
    if (timeframe) {
      filteredSignals = filteredSignals.filter(s => 
        s.timeframe === timeframe || s.trade_duration === timeframe
      );
    }
    
    // Filter by date range
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      filteredSignals = filteredSignals.filter(s => s.timestamp >= startTimestamp);
    }
    
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime();
      filteredSignals = filteredSignals.filter(s => s.timestamp <= endTimestamp);
    }
    
    // Filter by confidence
    if (minConfidence !== undefined) {
      filteredSignals = filteredSignals.filter(s => s.confidence >= minConfidence);
    }
    
    if (maxConfidence !== undefined) {
      filteredSignals = filteredSignals.filter(s => s.confidence <= maxConfidence);
    }
    
    // Filter by result
    if (result) {
      filteredSignals = filteredSignals.filter(s => 
        s.result && s.result.toUpperCase() === result
      );
    }
    
    // Filter by pattern
    if (pattern) {
      filteredSignals = filteredSignals.filter(s => {
        const mainPattern = s.indicators?.pattern?.type || 
                           s.pattern_analysis?.main_pattern?.type;
        return mainPattern === pattern;
      });
    }
    
    return filteredSignals.length;
  }
  
  /**
   * Track signal generation for performance monitoring
   * @param {Object} signal - Signal data to track
   * @returns {String} - Generated signal ID
   */
  trackSignalGeneration(signal) {
    const signalId = `signal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`Tracking signal generation: ${signalId} for ${signal.symbol}`);
    return signalId;
  }
}

module.exports = { SignalPerformanceTracker };