/**
 * Market Data Manager - Twelve Data API Integration
 * 
 * This module handles real-time market data fetching from Twelve Data API
 * every 2 minutes and provides multi-timeframe OHLCV data for analysis.
 */

const axios = require('axios');
const { Logger } = require('../utils/Logger');
const fs = require('fs-extra');
const path = require('path');

class MarketDataManager {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    
    // Twelve Data API configuration
    this.apiKey = config.twelveDataApiKey;
    this.baseUrl = 'https://api.twelvedata.com';
    this.currencyPair = config.currencyPair || 'USD/INR';
    
    // Timing configuration
    this.fetchInterval = 2 * 60 * 1000; // 2 minutes
    this.updateInterval = null;
    
    // Rate limiting (Twelve Data free tier: 800 requests/day)
    this.requestCount = 0;
    this.dailyLimit = 800;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 second between requests
    
    // Data cache and storage
    this.marketData = {
      '1m': [],
      '3m': [],
      '5m': [],
      '15m': [],
      '30m': [],
      '1h': []
    };
    
    // Cache configuration
    this.maxCandlesPerTimeframe = 100;
    this.lastUpdate = {};
    
    // Error handling
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 5;
    this.isHealthy = true;
    
    this.logger.info('📊 MarketDataManager initialized');
  }

  /**
   * Start real-time data fetching every 2 minutes
   */
  startRealTimeUpdates() {
    if (this.updateInterval) {
      this.logger.warn('⚠️ Real-time updates already running');
      return;
    }

    this.logger.info(`🚀 Starting real-time updates for ${this.currencyPair} every 2 minutes`);
    
    // Initial fetch
    this.fetchAllTimeframes();
    
    // Set up interval for every 2 minutes
    this.updateInterval = setInterval(async () => {
      try {
        await this.fetchAllTimeframes();
        this.consecutiveErrors = 0;
        this.isHealthy = true;
      } catch (error) {
        this.consecutiveErrors++;
        this.logger.error(`❌ Real-time update failed (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error);
        
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          this.isHealthy = false;
          this.logger.error('🚨 Market data manager unhealthy - too many consecutive errors');
        }
      }
    }, this.fetchInterval);
    
    return { started: true, interval: this.fetchInterval };
  }

  /**
   * Stop real-time data updates
   */
  stopRealTimeUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.logger.info('⏹️ Real-time updates stopped');
    }
  }

  /**
   * Fetch data for all required timeframes
   */
  async fetchAllTimeframes() {
    const timeframes = ['1m', '5m', '15m', '30m', '1h'];
    const promises = [];
    
    for (const timeframe of timeframes) {
      // Skip if we fetched this timeframe recently (except 1m which updates most frequently)
      if (timeframe !== '1m' && this.wasRecentlyUpdated(timeframe)) {
        continue;
      }
      
      promises.push(this.fetchTimeframeData(timeframe));
    }
    
    const results = await Promise.allSettled(promises);
    
    // Process results
    let successCount = 0;
    let errorCount = 0;
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        successCount++;
      } else {
        errorCount++;
        this.logger.error('❌ Timeframe fetch failed:', result.reason);
      }
    }
    
    this.logger.info(`📊 Data update: ${successCount} success, ${errorCount} errors`);
    
    // Generate 3m data from 1m data
    this.generate3mData();
    
    return this.getLatestData();
  }

  /**
   * Fetch data for a specific timeframe
   */
  async fetchTimeframeData(timeframe, outputsize = 100) {
    try {
      // Rate limiting
      await this.enforceRateLimit();
      
      const symbol = this.formatSymbolForTwelveData(this.currencyPair);
      const interval = this.mapTimeframeToInterval(timeframe);
      
      const url = `${this.baseUrl}/time_series`;
      const params = {
        symbol: symbol,
        interval: interval,
        outputsize: outputsize,
        apikey: this.apiKey,
        format: 'JSON'
      };
      
      this.logger.debug(`📡 Fetching ${timeframe} data for ${symbol}...`);
      
      const response = await axios.get(url, { 
        params,
        timeout: 10000 // 10 second timeout
      });
      
      this.requestCount++;
      
      if (response.data.status === 'error') {
        throw new Error(`Twelve Data API Error: ${response.data.message}`);
      }
      
      if (!response.data.values) {
        throw new Error('No data received from Twelve Data API');
      }
      
      // Parse and store the data
      const candles = this.parseTimeSeriesData(response.data.values);
      this.updateMarketData(timeframe, candles);
      this.lastUpdate[timeframe] = Date.now();
      
      this.logger.debug(`✅ Updated ${timeframe}: ${candles.length} candles`);
      
      return candles;
      
    } catch (error) {
      this.logger.error(`❌ Failed to fetch ${timeframe} data:`, error);
      throw error;
    }
  }

  /**
   * Get current market data for all timeframes
   */
  getLatestData() {
    return {
      timestamp: Date.now(),
      currencyPair: this.currencyPair,
      data: { ...this.marketData },
      lastUpdate: { ...this.lastUpdate },
      requestCount: this.requestCount,
      dailyRemaining: this.dailyLimit - this.requestCount
    };
  }

  /**
   * Get data for specific timeframes
   */
  getTimeframeData(timeframes = ['1m', '3m', '5m', '15m', '30m', '1h']) {
    const result = {};
    
    for (const tf of timeframes) {
      if (this.marketData[tf] && this.marketData[tf].length > 0) {
        result[tf] = this.marketData[tf];
      }
    }
    
    return result;
  }

  /**
   * Get latest candle for a specific timeframe
   */
  getLatestCandle(timeframe = '5m') {
    const data = this.marketData[timeframe];
    return data && data.length > 0 ? data[data.length - 1] : null;
  }

  /**
   * Check if data is fresh enough for analysis
   */
  isDataFresh(maxAgeMinutes = 5) {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    
    // Check key timeframes
    const keyTimeframes = ['1m', '5m'];
    
    for (const tf of keyTimeframes) {
      const lastUpdate = this.lastUpdate[tf];
      if (!lastUpdate || (now - lastUpdate) > maxAge) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate 3-minute data from 1-minute data
   */
  generate3mData() {
    const oneMinData = this.marketData['1m'];
    if (!oneMinData || oneMinData.length < 3) return;
    
    const threeMinData = [];
    
    // Group 1m candles into 3m candles
    for (let i = 0; i < oneMinData.length; i += 3) {
      const group = oneMinData.slice(i, Math.min(i + 3, oneMinData.length));
      if (group.length === 3) {
        const threeMinCandle = this.combine1mTo3m(group);
        threeMinData.push(threeMinCandle);
      }
    }
    
    // Keep only the latest candles
    this.marketData['3m'] = threeMinData.slice(-this.maxCandlesPerTimeframe);
  }

  /**
   * Combine three 1-minute candles into one 3-minute candle
   */
  combine1mTo3m(oneMinCandles) {
    const first = oneMinCandles[0];
    const last = oneMinCandles[oneMinCandles.length - 1];
    
    return {
      timestamp: first.timestamp,
      open: first.open,
      high: Math.max(...oneMinCandles.map(c => c.high)),
      low: Math.min(...oneMinCandles.map(c => c.low)),
      close: last.close,
      volume: oneMinCandles.reduce((sum, c) => sum + c.volume, 0)
    };
  }

  /**
   * Parse time series data from Twelve Data API
   */
  parseTimeSeriesData(values) {
    if (!Array.isArray(values)) return [];
    
    return values.map(candle => {
      const open = parseFloat(candle.open);
      const high = parseFloat(candle.high);
      const low = parseFloat(candle.low);
      const close = parseFloat(candle.close);
      let volume = parseFloat(candle.volume || 0);
      
      // For forex pairs, generate synthetic volume based on price movement and range
      if (volume === 0 || volume < 1) {
        const priceRange = high - low;
        const bodySize = Math.abs(close - open);
        const volatility = priceRange / close;
        
        // Synthetic volume based on volatility and price movement
        volume = Math.max(1000, Math.round(volatility * 1000000 + bodySize * 500000));
      }
      
      return {
        timestamp: new Date(candle.datetime).getTime(),
        open,
        high,
        low,
        close,
        volume
      };
    }).sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
  }

  /**
   * Update market data cache
   */
  updateMarketData(timeframe, newCandles) {
    if (!this.marketData[timeframe]) {
      this.marketData[timeframe] = [];
    }
    
    const existing = this.marketData[timeframe];
    
    // Merge new data with existing, avoiding duplicates
    for (const newCandle of newCandles) {
      const existingIndex = existing.findIndex(c => c.timestamp === newCandle.timestamp);
      
      if (existingIndex >= 0) {
        // Update existing candle
        existing[existingIndex] = newCandle;
      } else {
        // Add new candle
        existing.push(newCandle);
      }
    }
    
    // Sort by timestamp and keep only recent candles
    existing.sort((a, b) => a.timestamp - b.timestamp);
    this.marketData[timeframe] = existing.slice(-this.maxCandlesPerTimeframe);
  }

  /**
   * Format currency pair for Twelve Data API
   */
  formatSymbolForTwelveData(currencyPair) {
    // Convert pairs like "USD/INR" to "USD/INR" (Twelve Data format)
    return currencyPair.replace('/', '/');
  }

  /**
   * Map timeframe to Twelve Data interval
   */
  mapTimeframeToInterval(timeframe) {
    const mapping = {
      '1m': '1min',
      '3m': '3min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '1h',
      '4h': '4h',
      '1d': '1day'
    };
    
    return mapping[timeframe] || '5min';
  }

  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
    
    // Check daily limit
    if (this.requestCount >= this.dailyLimit) {
      throw new Error('Daily API request limit reached');
    }
  }

  /**
   * Check if timeframe was recently updated
   */
  wasRecentlyUpdated(timeframe) {
    const lastUpdate = this.lastUpdate[timeframe];
    if (!lastUpdate) return false;
    
    const now = Date.now();
    const updateThresholds = {
      '1m': 1 * 60 * 1000,   // Update every minute
      '5m': 5 * 60 * 1000,   // Update every 5 minutes
      '15m': 15 * 60 * 1000, // Update every 15 minutes
      '30m': 30 * 60 * 1000, // Update every 30 minutes
      '1h': 60 * 60 * 1000   // Update every hour
    };
    
    const threshold = updateThresholds[timeframe] || 5 * 60 * 1000;
    return (now - lastUpdate) < threshold;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      isHealthy: this.isHealthy,
      consecutiveErrors: this.consecutiveErrors,
      requestCount: this.requestCount,
      dailyRemaining: this.dailyLimit - this.requestCount,
      lastUpdateTimes: this.lastUpdate,
      dataFreshness: this.isDataFresh(),
      activePair: this.currencyPair
    };
  }

  /**
   * Reset daily counters (call at midnight)
   */
  resetDailyCounters() {
    this.requestCount = 0;
    this.consecutiveErrors = 0;
    this.isHealthy = true;
    
    this.logger.info('🔄 Daily counters reset');
  }

  /**
   * Change currency pair
   */
  changeCurrencyPair(newPair) {
    const oldPair = this.currencyPair;
    this.currencyPair = newPair;
    
    // Clear existing data
    for (const timeframe in this.marketData) {
      this.marketData[timeframe] = [];
    }
    
    this.lastUpdate = {};
    
    this.logger.info(`🔄 Currency pair changed from ${oldPair} to ${newPair}`);
    
    // Fetch new data
    if (this.updateInterval) {
      this.fetchAllTimeframes();
    }
  }

  /**
   * Save market data to file for backup/analysis
   */
  async saveMarketDataSnapshot() {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        currencyPair: this.currencyPair,
        data: this.marketData,
        lastUpdate: this.lastUpdate,
        requestCount: this.requestCount
      };
      
      const snapshotFile = path.join(process.cwd(), 'data', 'market-snapshots', `${this.currencyPair.replace('/', '-')}_${Date.now()}.json`);
      await fs.ensureDir(path.dirname(snapshotFile));
      await fs.writeJson(snapshotFile, snapshot);
      
      this.logger.info('💾 Market data snapshot saved');
      
    } catch (error) {
      this.logger.error('❌ Failed to save market data snapshot:', error);
    }
  }

  /**
   * Load mock data for testing/development
   */
  loadMockData() {
    const mockCandles = this.generateMockCandles(100);
    
    // Distribute mock data across timeframes
    this.marketData['1m'] = mockCandles;
    this.marketData['5m'] = this.aggregateCandles(mockCandles, 5);
    this.marketData['15m'] = this.aggregateCandles(mockCandles, 15);
    this.marketData['30m'] = this.aggregateCandles(mockCandles, 30);
    this.marketData['1h'] = this.aggregateCandles(mockCandles, 60);
    
    this.generate3mData();
    
    // Set fake update times
    const now = Date.now();
    for (const timeframe in this.marketData) {
      this.lastUpdate[timeframe] = now;
    }
    
    this.logger.info('🎭 Mock data loaded for testing');
  }

  /**
   * Generate mock candle data for testing
   */
  generateMockCandles(count) {
    const candles = [];
    let price = 82.50; // Starting price for USD/INR
    const now = Date.now();
    
    for (let i = 0; i < count; i++) {
      const timestamp = now - (count - i - 1) * 60 * 1000; // 1 minute intervals
      
      const open = price;
      const change = (Math.random() - 0.5) * 0.1; // ±0.05 max change
      const high = open + Math.abs(change) + Math.random() * 0.02;
      const low = open - Math.abs(change) - Math.random() * 0.02;
      const close = open + change;
      
      candles.push({
        timestamp,
        open: parseFloat(open.toFixed(4)),
        high: parseFloat(high.toFixed(4)),
        low: parseFloat(low.toFixed(4)),
        close: parseFloat(close.toFixed(4)),
        volume: Math.floor(Math.random() * 1000) + 100
      });
      
      price = close;
    }
    
    return candles;
  }

  /**
   * Aggregate 1-minute candles into larger timeframes
   */
  aggregateCandles(oneMinCandles, minutes) {
    const aggregated = [];
    
    for (let i = 0; i < oneMinCandles.length; i += minutes) {
      const group = oneMinCandles.slice(i, Math.min(i + minutes, oneMinCandles.length));
      
      if (group.length === minutes) {
        const first = group[0];
        const last = group[group.length - 1];
        
        aggregated.push({
          timestamp: first.timestamp,
          open: first.open,
          high: Math.max(...group.map(c => c.high)),
          low: Math.min(...group.map(c => c.low)),
          close: last.close,
          volume: group.reduce((sum, c) => sum + c.volume, 0)
        });
      }
    }
    
    return aggregated;
  }
}

module.exports = { MarketDataManager };