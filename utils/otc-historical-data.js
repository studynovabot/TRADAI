/**
 * OTC Historical Data Collector
 * 
 * Specialized utility for collecting and storing historical OTC market data:
 * - Stores data extracted from Pocket Option and Quotex
 * - Maintains a database of historical patterns for OTC pairs
 * - Provides APIs for retrieving historical data for pattern matching
 */

const fs = require('fs-extra');
const path = require('path');

class OTCHistoricalDataCollector {
  constructor(config = {}) {
    this.config = {
      dataDir: path.join(process.cwd(), 'data', 'otc'),
      maxHistoryPerPair: 10000, // Maximum candles to store per pair
      cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };
    
    this.dataCache = new Map();
    this.lastCleanup = Date.now();
    
    // Initialize
    this.init();
  }
  
  async init() {
    try {
      // Ensure data directory exists
      await fs.ensureDir(this.config.dataDir);
      
      // Load existing data into cache
      await this.loadExistingData();
      
      console.log(`OTC Historical Data Collector initialized with data directory: ${this.config.dataDir}`);
    } catch (error) {
      console.error('Error initializing OTC Historical Data Collector:', error);
    }
  }
  
  /**
   * Load existing data into cache
   */
  async loadExistingData() {
    try {
      const files = await fs.readdir(this.config.dataDir);
      
      // Filter for JSON files
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.config.dataDir, file);
          const data = await fs.readJson(filePath);
          
          // Extract pair and timeframe from filename
          // Format: PAIR_TIMEFRAME.json (e.g., EUR_USD_OTC_5M.json)
          const fileInfo = path.basename(file, '.json').split('_');
          const timeframe = fileInfo.pop();
          const pair = fileInfo.join('_');
          
          // Store in cache
          const key = `${pair}_${timeframe}`;
          this.dataCache.set(key, data);
          
          console.log(`Loaded ${data.candles?.length || 0} historical candles for ${pair} ${timeframe}`);
        } catch (error) {
          console.warn(`Error loading data from ${file}:`, error);
        }
      }
      
      console.log(`Loaded historical data for ${this.dataCache.size} pair/timeframe combinations`);
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  }
  
  /**
   * Store OTC market data
   * @param {string} pair - Currency pair (e.g., 'EUR_USD_OTC')
   * @param {string} timeframe - Timeframe (e.g., '5M')
   * @param {Array} candles - Array of candle data
   * @param {string} source - Data source (e.g., 'pocket_option', 'quotex')
   */
  async storeData(pair, timeframe, candles, source) {
    if (!pair || !timeframe || !candles || !Array.isArray(candles) || candles.length === 0) {
      console.warn('Invalid data provided to storeData');
      return false;
    }
    
    try {
      // Normalize pair and timeframe
      const normalizedPair = this.normalizePair(pair);
      const normalizedTimeframe = this.normalizeTimeframe(timeframe);
      
      // Create key for cache
      const key = `${normalizedPair}_${normalizedTimeframe}`;
      
      // Get existing data or create new entry
      let existingData = this.dataCache.get(key) || {
        pair: normalizedPair,
        timeframe: normalizedTimeframe,
        candles: [],
        lastUpdated: null,
        sources: {}
      };
      
      // Add source info
      if (!existingData.sources[source]) {
        existingData.sources[source] = 0;
      }
      existingData.sources[source] += candles.length;
      
      // Merge candles, avoiding duplicates
      const newCandles = this.mergeCandles(existingData.candles, candles);
      
      // Update data
      existingData.candles = newCandles;
      existingData.lastUpdated = new Date().toISOString();
      
      // Update cache
      this.dataCache.set(key, existingData);
      
      // Save to file
      await this.saveToFile(normalizedPair, normalizedTimeframe, existingData);
      
      console.log(`Stored ${candles.length} candles for ${normalizedPair} ${normalizedTimeframe} (total: ${newCandles.length})`);
      
      // Cleanup if needed
      if (Date.now() - this.lastCleanup > this.config.cleanupInterval) {
        await this.cleanup();
      }
      
      return true;
    } catch (error) {
      console.error(`Error storing data for ${pair} ${timeframe}:`, error);
      return false;
    }
  }
  
  /**
   * Merge candles, avoiding duplicates
   * @private
   */
  mergeCandles(existingCandles, newCandles) {
    // Create a map of existing candles by timestamp
    const existingMap = new Map();
    existingCandles.forEach(candle => {
      existingMap.set(candle.timestamp, candle);
    });
    
    // Add new candles if they don't exist
    newCandles.forEach(candle => {
      if (!existingMap.has(candle.timestamp)) {
        existingMap.set(candle.timestamp, candle);
      }
    });
    
    // Convert back to array and sort by timestamp
    const mergedCandles = Array.from(existingMap.values())
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Limit to max history
    if (mergedCandles.length > this.config.maxHistoryPerPair) {
      return mergedCandles.slice(-this.config.maxHistoryPerPair);
    }
    
    return mergedCandles;
  }
  
  /**
   * Save data to file
   * @private
   */
  async saveToFile(pair, timeframe, data) {
    try {
      const filename = `${pair}_${timeframe}.json`;
      const filePath = path.join(this.config.dataDir, filename);
      
      await fs.writeJson(filePath, data, { spaces: 2 });
      
      return true;
    } catch (error) {
      console.error(`Error saving data to file for ${pair} ${timeframe}:`, error);
      return false;
    }
  }
  
  /**
   * Get historical data for a pair and timeframe
   * @param {string} pair - Currency pair
   * @param {string} timeframe - Timeframe
   * @param {Object} options - Additional options
   * @returns {Object} Historical data
   */
  async getHistoricalData(pair, timeframe, options = {}) {
    const normalizedPair = this.normalizePair(pair);
    const normalizedTimeframe = this.normalizeTimeframe(timeframe);
    
    const key = `${normalizedPair}_${normalizedTimeframe}`;
    
    // Check cache first
    if (this.dataCache.has(key)) {
      const data = this.dataCache.get(key);
      
      // Apply options
      let candles = [...data.candles];
      
      // Limit to specified count
      if (options.limit && options.limit > 0) {
        candles = candles.slice(-options.limit);
      }
      
      // Filter by date range
      if (options.startTime) {
        candles = candles.filter(c => c.timestamp >= options.startTime);
      }
      
      if (options.endTime) {
        candles = candles.filter(c => c.timestamp <= options.endTime);
      }
      
      return {
        pair: normalizedPair,
        timeframe: normalizedTimeframe,
        candles,
        lastUpdated: data.lastUpdated,
        sources: data.sources
      };
    }
    
    // Not in cache, try to load from file
    try {
      const filename = `${normalizedPair}_${normalizedTimeframe}.json`;
      const filePath = path.join(this.config.dataDir, filename);
      
      if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        
        // Store in cache
        this.dataCache.set(key, data);
        
        // Apply options
        let candles = [...data.candles];
        
        // Limit to specified count
        if (options.limit && options.limit > 0) {
          candles = candles.slice(-options.limit);
        }
        
        // Filter by date range
        if (options.startTime) {
          candles = candles.filter(c => c.timestamp >= options.startTime);
        }
        
        if (options.endTime) {
          candles = candles.filter(c => c.timestamp <= options.endTime);
        }
        
        return {
          pair: normalizedPair,
          timeframe: normalizedTimeframe,
          candles,
          lastUpdated: data.lastUpdated,
          sources: data.sources
        };
      }
    } catch (error) {
      console.warn(`Error loading historical data for ${pair} ${timeframe}:`, error);
    }
    
    // No data found
    return {
      pair: normalizedPair,
      timeframe: normalizedTimeframe,
      candles: [],
      lastUpdated: null,
      sources: {}
    };
  }
  
  /**
   * Get all available pairs and timeframes
   */
  async getAvailablePairs() {
    const result = {
      pairs: [],
      timeframes: new Set(),
      pairTimeframes: {}
    };
    
    // Collect from cache
    for (const key of this.dataCache.keys()) {
      const [pair, timeframe] = key.split('_').slice(0, -1).join('_');
      
      if (!result.pairs.includes(pair)) {
        result.pairs.push(pair);
        result.pairTimeframes[pair] = [];
      }
      
      result.timeframes.add(timeframe);
      result.pairTimeframes[pair].push(timeframe);
    }
    
    // Convert timeframes set to array
    result.timeframes = Array.from(result.timeframes);
    
    return result;
  }
  
  /**
   * Cleanup old data
   * @private
   */
  async cleanup() {
    try {
      console.log('Cleaning up historical data...');
      
      // Trim each dataset to max history
      for (const [key, data] of this.dataCache.entries()) {
        if (data.candles.length > this.config.maxHistoryPerPair) {
          data.candles = data.candles.slice(-this.config.maxHistoryPerPair);
          this.dataCache.set(key, data);
          
          // Save to file
          const [pair, timeframe] = key.split('_');
          await this.saveToFile(pair, timeframe, data);
        }
      }
      
      this.lastCleanup = Date.now();
      console.log('Historical data cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  
  /**
   * Normalize pair name
   * @private
   */
  normalizePair(pair) {
    if (!pair) return 'UNKNOWN';
    
    // Remove spaces and convert to uppercase
    let normalized = pair.toString().toUpperCase().replace(/\s+/g, '');
    
    // Replace / with _ for filenames
    normalized = normalized.replace(/\//g, '_');
    
    // Ensure OTC is in the name if it's an OTC pair
    if (this.isOTCPair(pair) && !normalized.includes('OTC')) {
      normalized = `${normalized}_OTC`;
    }
    
    return normalized;
  }
  
  /**
   * Normalize timeframe
   * @private
   */
  normalizeTimeframe(timeframe) {
    if (!timeframe) return '5M';
    
    const tf = timeframe.toString().toUpperCase();
    
    if (tf === '1M' || tf === '1MIN' || tf === '1' || tf === '1MINUTE') return '1M';
    if (tf === '3M' || tf === '3MIN' || tf === '3' || tf === '3MINUTE') return '3M';
    if (tf === '5M' || tf === '5MIN' || tf === '5' || tf === '5MINUTE') return '5M';
    if (tf === '15M' || tf === '15MIN' || tf === '15' || tf === '15MINUTE') return '15M';
    if (tf === '30M' || tf === '30MIN' || tf === '30' || tf === '30MINUTE') return '30M';
    if (tf === '1H' || tf === '1HOUR' || tf === '60M' || tf === '60MIN') return '1H';
    
    // Default to original if no match
    return tf;
  }
  
  /**
   * Check if a pair is an OTC pair
   * @private
   */
  isOTCPair(pair) {
    if (!pair) return false;
    
    const pairStr = pair.toString().toLowerCase();
    
    // Common OTC indicators
    return (
      pairStr.includes('otc') ||
      pairStr.includes('weekend') ||
      pairStr.includes('synthetic') ||
      pairStr.includes('virtual') ||
      pairStr.includes('(otc)') ||
      pairStr.endsWith('-otc') ||
      pairStr.endsWith('_otc')
    );
  }
  
  /**
   * Get data for analysis
   */
  getDataForAnalysis(pair, timeframe, count = 100) {
    const key = `${pair}_${timeframe}`;
    const data = this.dataCache.get(key) || [];
    
    // Return the most recent data
    return data.slice(-count);
  }
  
  /**
   * Clear old data
   */
  async clearOldData() {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    for (const [key, data] of this.dataCache.entries()) {
      const filteredData = data.filter(candle => candle.timestamp > cutoffTime);
      this.dataCache.set(key, filteredData);
    }
    
    console.log('Old OTC data cleared');
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    let totalCandles = 0;
    const pairStats = {};
    
    for (const [key, data] of this.dataCache.entries()) {
      totalCandles += data.length;
      const [pair] = key.split('_');
      pairStats[pair] = (pairStats[pair] || 0) + data.length;
    }
    
    return {
      totalCandles,
      totalPairs: Object.keys(pairStats).length,
      pairStats,
      cacheSize: this.dataCache.size
    };
  }
}

// Export
module.exports = OTCHistoricalDataCollector;

// Browser compatibility
if (typeof window !== 'undefined') {
  // Simplified version for browser
  class BrowserOTCHistoricalData {
    constructor() {
      this.data = new Map();
    }
    
    addData(pair, timeframe, candles) {
      const key = `${pair}_${timeframe}`;
      if (!this.data.has(key)) {
        this.data.set(key, []);
      }
      
      const existing = this.data.get(key);
      existing.push(...candles);
      
      // Keep only last 1000 candles
      if (existing.length > 1000) {
        existing.splice(0, existing.length - 1000);
      }
    }
    
    getData(pair, timeframe, count = 100) {
      const key = `${pair}_${timeframe}`;
      const data = this.data.get(key) || [];
      return data.slice(-count);
    }
  }
  
  window.OTCHistoricalDataCollector = BrowserOTCHistoricalData;
}
}

module.exports = { OTCHistoricalDataCollector };