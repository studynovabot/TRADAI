/**
 * AI Candle Sniper - OTC Mode Handler
 * 
 * Manages OTC (Over-The-Counter) weekend trading functionality:
 * - Activates OTC data extraction on supported brokers
 * - Processes and stores OTC market data
 * - Generates AI signals for OTC assets
 * - Provides API for popup and content scripts
 */

class OTCModeHandler {
  constructor() {
    // OTC mode state
    this.isActive = false;
    this.activatedBy = null;
    this.activationTime = null;
    this.currentBroker = null;
    
    // Data storage
    this.otcData = {
      pairs: {},         // Stores candle data by pair and timeframe
      availablePairs: [], // List of available OTC pairs
      pairTimeframes: {}, // Available timeframes for each pair
      lastUpdate: null,   // Last data update timestamp
    };
    
    // Signal generation
    this.signalCache = new Map(); // Cache signals by pair and timeframe
    this.signalSettings = {
      minCandles: 30,     // Minimum candles needed for signal generation
      confidenceThreshold: 65, // Minimum confidence for valid signals
      signalExpiry: 5 * 60 * 1000, // Signal expiry time (5 minutes)
      allowedTimeframes: ['1M', '5M', '15M', '30M'] // Allowed timeframes for signals
    };
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize OTC mode handler
   */
  init() {
    console.log('Initializing OTC Mode Handler');
    
    // Load saved state
    this.loadState();
    
    // Set up message listeners
    this.setupMessageListeners();
  }
  
  /**
   * Set up message listeners for OTC mode
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Check if message is for OTC mode
      if (!message || !message.action) return false;
      
      switch (message.action) {
        case 'activateOTCMode':
          this.activateOTCMode(message.data, sender)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Keep channel open for async response
          
        case 'deactivateOTCMode':
          this.deactivateOTCMode()
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true;
          
        case 'getOTCExtractionStatus':
          sendResponse(this.getExtractionStatus());
          return false;
          
        case 'getAvailableOTCPairs':
          sendResponse(this.getAvailablePairs());
          return false;
          
        case 'getHistoricalOTCData':
          sendResponse(this.getHistoricalData(message.pair, message.timeframe));
          return false;
          
        case 'generateOTCSignal':
          this.generateOTCSignal(message.pair, message.timeframe)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true;
          
        case 'placeOTCTrade':
          this.placeOTCTrade(message.signal)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true;
      }
      
      return false;
    });
  }
  
  /**
   * Load saved OTC mode state
   */
  async loadState() {
    try {
      const data = await new Promise(resolve => {
        chrome.storage.local.get(['otcModeState', 'otcData'], result => {
          resolve(result);
        });
      });
      
      if (data.otcModeState) {
        this.isActive = data.otcModeState.isActive || false;
        this.activatedBy = data.otcModeState.activatedBy || null;
        this.activationTime = data.otcModeState.activationTime || null;
        this.currentBroker = data.otcModeState.currentBroker || null;
      }
      
      if (data.otcData) {
        this.otcData = data.otcData;
      }
      
      console.log('Loaded OTC mode state:', { isActive: this.isActive, broker: this.currentBroker });
    } catch (error) {
      console.error('Error loading OTC mode state:', error);
    }
  }
  
  /**
   * Save current OTC mode state
   */
  async saveState() {
    try {
      const state = {
        isActive: this.isActive,
        activatedBy: this.activatedBy,
        activationTime: this.activationTime,
        currentBroker: this.currentBroker
      };
      
      await new Promise(resolve => {
        chrome.storage.local.set({
          otcModeState: state,
          otcData: this.otcData
        }, resolve);
      });
      
      console.log('Saved OTC mode state');
    } catch (error) {
      console.error('Error saving OTC mode state:', error);
    }
  }
  
  /**
   * Activate OTC mode
   * @param {Object} data - Activation data
   * @param {Object} sender - Message sender
   * @returns {Promise<Object>} - Activation result
   */
  async activateOTCMode(data = {}, sender = {}) {
    console.log('Activating OTC mode with data:', data);
    
    try {
      // Check if already active
      if (this.isActive) {
        return {
          success: true,
          message: 'OTC mode already active',
          status: this.getExtractionStatus()
        };
      }
      
      // Set activation state
      this.isActive = true;
      this.activatedBy = data.requestedBy || 'unknown';
      this.activationTime = Date.now();
      
      // Detect broker from tab URL if available
      if (sender && sender.tab && sender.tab.url) {
        const url = sender.tab.url.toLowerCase();
        
        if (url.includes('pocketoption.com') || url.includes('po.trade')) {
          this.currentBroker = 'Pocket Option';
        } else if (url.includes('quotex.com') || url.includes('qxbroker.com')) {
          this.currentBroker = 'Quotex';
        }
      }
      
      // If broker not detected, use provided broker or default
      if (!this.currentBroker) {
        this.currentBroker = data.broker || 'Unknown';
      }
      
      // Save state
      await this.saveState();
      
      // Notify content scripts to start extraction
      await this.notifyContentScripts({
        action: 'START_OTC_EXTRACTION',
        data: {
          timestamp: this.activationTime,
          broker: this.currentBroker
        }
      });
      
      return {
        success: true,
        message: 'OTC mode activated',
        status: this.getExtractionStatus()
      };
    } catch (error) {
      console.error('Error activating OTC mode:', error);
      this.isActive = false;
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Deactivate OTC mode
   * @returns {Promise<Object>} - Deactivation result
   */
  async deactivateOTCMode() {
    console.log('Deactivating OTC mode');
    
    try {
      // Check if already inactive
      if (!this.isActive) {
        return {
          success: true,
          message: 'OTC mode already inactive'
        };
      }
      
      // Set deactivation state
      this.isActive = false;
      
      // Save state
      await this.saveState();
      
      // Notify content scripts to stop extraction
      await this.notifyContentScripts({
        action: 'STOP_OTC_EXTRACTION'
      });
      
      return {
        success: true,
        message: 'OTC mode deactivated'
      };
    } catch (error) {
      console.error('Error deactivating OTC mode:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Notify all content scripts
   * @param {Object} message - Message to send
   * @returns {Promise<void>}
   */
  async notifyContentScripts(message) {
    try {
      // Get all tabs
      const tabs = await new Promise(resolve => {
        chrome.tabs.query({}, resolve);
      });
      
      // Send message to all tabs
      for (const tab of tabs) {
        try {
          await new Promise(resolve => {
            chrome.tabs.sendMessage(tab.id, message, resolve);
          });
        } catch (error) {
          // Ignore errors for tabs that don't have content scripts
        }
      }
    } catch (error) {
      console.error('Error notifying content scripts:', error);
    }
  }
  
  /**
   * Get current extraction status
   * @returns {Object} - Extraction status
   */
  getExtractionStatus() {
    return {
      isExtracting: this.isActive,
      broker: this.currentBroker,
      activatedBy: this.activatedBy,
      activationTime: this.activationTime,
      lastUpdate: this.otcData.lastUpdate,
      pairCount: this.otcData.availablePairs.length
    };
  }
  
  /**
   * Get available OTC pairs
   * @returns {Object} - Available pairs
   */
  getAvailablePairs() {
    return {
      success: true,
      data: {
        pairs: this.otcData.availablePairs,
        pairTimeframes: this.otcData.pairTimeframes,
        timeframes: ['1M', '5M', '15M', '30M', '1H', '4H', '1D']
      }
    };
  }
  
  /**
   * Get historical data for a pair and timeframe
   * @param {string} pair - Asset pair
   * @param {string} timeframe - Timeframe
   * @returns {Object} - Historical data
   */
  getHistoricalData(pair, timeframe) {
    if (!pair || !timeframe) {
      return {
        success: false,
        error: 'Pair and timeframe are required'
      };
    }
    
    // Normalize pair and timeframe
    const normalizedPair = pair.toUpperCase();
    const normalizedTimeframe = timeframe.toUpperCase();
    
    // Check if data exists
    if (!this.otcData.pairs[normalizedPair] || 
        !this.otcData.pairs[normalizedPair][normalizedTimeframe]) {
      return {
        success: false,
        error: 'No data available for this pair and timeframe'
      };
    }
    
    // Get data
    const data = this.otcData.pairs[normalizedPair][normalizedTimeframe];
    
    return {
      success: true,
      data: {
        pair: normalizedPair,
        timeframe: normalizedTimeframe,
        candles: data.candles,
        lastUpdate: data.lastUpdate
      }
    };
  }
  
  /**
   * Process OTC data from content script
   * @param {Object} data - OTC data
   * @returns {Promise<void>}
   */
  async processOTCData(data) {
    try {
      if (!data || !data.asset || !data.timeframe || !data.candles || !data.candles.length) {
        console.warn('Invalid OTC data received:', data);
        return;
      }
      
      console.log(`Processing OTC data: ${data.asset} ${data.timeframe} (${data.candles.length} candles)`);
      
      // Normalize asset name and timeframe
      const normalizedAsset = data.asset.toUpperCase().replace('/', '_');
      const normalizedTimeframe = data.timeframe.toUpperCase();
      
      // Initialize pair data if not exists
      if (!this.otcData.pairs[normalizedAsset]) {
        this.otcData.pairs[normalizedAsset] = {};
      }
      
      // Initialize timeframe data if not exists
      if (!this.otcData.pairs[normalizedAsset][normalizedTimeframe]) {
        this.otcData.pairs[normalizedAsset][normalizedTimeframe] = {
          candles: [],
          lastUpdate: null
        };
      }
      
      // Get existing candles
      const existingCandles = this.otcData.pairs[normalizedAsset][normalizedTimeframe].candles;
      
      // Create a map of existing candles by timestamp
      const candleMap = new Map();
      existingCandles.forEach(candle => {
        candleMap.set(candle.timestamp, candle);
      });
      
      // Add new candles
      data.candles.forEach(candle => {
        candleMap.set(candle.timestamp, candle);
      });
      
      // Convert back to array and sort by timestamp
      const mergedCandles = Array.from(candleMap.values())
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // Limit to 1000 candles
      const limitedCandles = mergedCandles.slice(-1000);
      
      // Update pair data
      this.otcData.pairs[normalizedAsset][normalizedTimeframe] = {
        candles: limitedCandles,
        lastUpdate: Date.now()
      };
      
      // Update available pairs
      if (!this.otcData.availablePairs.includes(normalizedAsset)) {
        this.otcData.availablePairs.push(normalizedAsset);
        this.otcData.availablePairs.sort();
      }
      
      // Update pair timeframes
      if (!this.otcData.pairTimeframes[normalizedAsset]) {
        this.otcData.pairTimeframes[normalizedAsset] = [];
      }
      
      if (!this.otcData.pairTimeframes[normalizedAsset].includes(normalizedTimeframe)) {
        this.otcData.pairTimeframes[normalizedAsset].push(normalizedTimeframe);
        this.otcData.pairTimeframes[normalizedAsset].sort();
      }
      
      // Update last update time
      this.otcData.lastUpdate = Date.now();
      
      // Update broker if not set
      if (!this.currentBroker && data.broker) {
        this.currentBroker = data.broker;
      }
      
      // Save state periodically (every 5 minutes)
      if (!this.lastStateSave || (Date.now() - this.lastStateSave) > 5 * 60 * 1000) {
        await this.saveState();
        this.lastStateSave = Date.now();
      }
      
      // Invalidate signal cache for this pair and timeframe
      this.invalidateSignalCache(normalizedAsset, normalizedTimeframe);
      
    } catch (error) {
      console.error('Error processing OTC data:', error);
    }
  }
  
  /**
   * Invalidate signal cache for a pair and timeframe
   * @param {string} pair - Asset pair
   * @param {string} timeframe - Timeframe
   */
  invalidateSignalCache(pair, timeframe) {
    const cacheKey = `${pair}_${timeframe}`;
    this.signalCache.delete(cacheKey);
  }
  
  /**
   * Generate OTC signal for a pair and timeframe
   * @param {string} pair - Asset pair
   * @param {string} timeframe - Timeframe
   * @returns {Promise<Object>} - Signal result
   */
  async generateOTCSignal(pair, timeframe) {
    try {
      if (!pair || !timeframe) {
        return {
          success: false,
          error: 'Pair and timeframe are required'
        };
      }
      
      console.log(`Generating OTC signal for ${pair} ${timeframe}`);
      
      // Normalize pair and timeframe
      const normalizedPair = pair.toUpperCase();
      const normalizedTimeframe = timeframe.toUpperCase();
      
      // Check if timeframe is allowed
      if (!this.signalSettings.allowedTimeframes.includes(normalizedTimeframe)) {
        return {
          success: false,
          error: `Timeframe ${normalizedTimeframe} is not allowed for OTC signals`
        };
      }
      
      // Check if data exists
      if (!this.otcData.pairs[normalizedPair] || 
          !this.otcData.pairs[normalizedPair][normalizedTimeframe]) {
        return {
          success: false,
          error: 'No data available for this pair and timeframe'
        };
      }
      
      // Get data
      const data = this.otcData.pairs[normalizedPair][normalizedTimeframe];
      
      // Check if enough candles
      if (data.candles.length < this.signalSettings.minCandles) {
        return {
          success: false,
          error: `Not enough candles (${data.candles.length}/${this.signalSettings.minCandles})`
        };
      }
      
      // Check cache
      const cacheKey = `${normalizedPair}_${normalizedTimeframe}`;
      const cachedSignal = this.signalCache.get(cacheKey);
      
      if (cachedSignal && 
          (Date.now() - cachedSignal.timestamp) < this.signalSettings.signalExpiry) {
        console.log(`Using cached signal for ${normalizedPair} ${normalizedTimeframe}`);
        return {
          success: true,
          signal: cachedSignal
        };
      }
      
      // Generate signal
      const signal = await this.analyzeOTCData(normalizedPair, normalizedTimeframe, data.candles);
      
      // Cache signal
      this.signalCache.set(cacheKey, signal);
      
      return {
        success: true,
        signal
      };
    } catch (error) {
      console.error('Error generating OTC signal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Analyze OTC data to generate a signal
   * @param {string} pair - Asset pair
   * @param {string} timeframe - Timeframe
   * @param {Array} candles - Candle data
   * @returns {Promise<Object>} - Signal
   */
  async analyzeOTCData(pair, timeframe, candles) {
    // This is a simplified analysis for demonstration
    // In a real implementation, this would use the AI model
    
    try {
      console.log(`Analyzing ${candles.length} candles for ${pair} ${timeframe}`);
      
      // Get recent candles
      const recentCandles = candles.slice(-30);
      
      // Calculate some basic indicators
      const closes = recentCandles.map(c => c.close);
      const volumes = recentCandles.map(c => c.volume);
      
      // Simple Moving Averages
      const sma5 = this.calculateSMA(closes, 5);
      const sma10 = this.calculateSMA(closes, 10);
      const sma20 = this.calculateSMA(closes, 20);
      
      // RSI
      const rsi = this.calculateRSI(closes, 14);
      
      // MACD
      const macd = this.calculateMACD(closes, 12, 26, 9);
      
      // Determine direction
      let direction = 'NEUTRAL';
      let confidence = 50;
      let reason = '';
      
      // Trend direction
      if (sma5 > sma10 && sma10 > sma20) {
        direction = 'UP';
        confidence += 10;
        reason += 'Uptrend detected. ';
      } else if (sma5 < sma10 && sma10 < sma20) {
        direction = 'DOWN';
        confidence += 10;
        reason += 'Downtrend detected. ';
      }
      
      // RSI
      if (rsi > 70) {
        direction = 'DOWN';
        confidence += 5;
        reason += 'Overbought (RSI). ';
      } else if (rsi < 30) {
        direction = 'UP';
        confidence += 5;
        reason += 'Oversold (RSI). ';
      }
      
      // MACD
      if (macd.histogram > 0 && macd.histogram > macd.previousHistogram) {
        if (direction === 'UP') {
          confidence += 10;
        } else {
          direction = 'UP';
          confidence += 5;
        }
        reason += 'Bullish MACD. ';
      } else if (macd.histogram < 0 && macd.histogram < macd.previousHistogram) {
        if (direction === 'DOWN') {
          confidence += 10;
        } else {
          direction = 'DOWN';
          confidence += 5;
        }
        reason += 'Bearish MACD. ';
      }
      
      // Price action
      const lastCandle = recentCandles[recentCandles.length - 1];
      const prevCandle = recentCandles[recentCandles.length - 2];
      
      if (lastCandle.close > lastCandle.open && prevCandle.close > prevCandle.open) {
        if (direction === 'UP') {
          confidence += 5;
        } else if (direction === 'NEUTRAL') {
          direction = 'UP';
          confidence += 3;
        }
        reason += 'Bullish candles. ';
      } else if (lastCandle.close < lastCandle.open && prevCandle.close < prevCandle.open) {
        if (direction === 'DOWN') {
          confidence += 5;
        } else if (direction === 'NEUTRAL') {
          direction = 'DOWN';
          confidence += 3;
        }
        reason += 'Bearish candles. ';
      }
      
      // Volume confirmation
      const avgVolume = this.calculateAverage(volumes.slice(0, -1));
      if (lastCandle.volume > avgVolume * 1.5) {
        confidence += 5;
        reason += 'High volume confirmation. ';
      }
      
      // Cap confidence at 95%
      confidence = Math.min(confidence, 95);
      
      // Create signal
      const signal = {
        pair,
        timeframe,
        timestamp: Date.now(),
        direction,
        confidence,
        reason,
        price: lastCandle.close,
        expiryTime: Date.now() + this.signalSettings.signalExpiry,
        broker: this.currentBroker,
        isOTC: true,
        risk: this.calculateRiskLevel(confidence)
      };
      
      console.log('Generated OTC signal:', signal);
      
      return signal;
    } catch (error) {
      console.error('Error analyzing OTC data:', error);
      throw error;
    }
  }
  
  /**
   * Calculate Simple Moving Average
   * @param {Array} data - Price data
   * @param {number} period - Period
   * @returns {number} - SMA value
   */
  calculateSMA(data, period) {
    if (data.length < period) return null;
    
    const slice = data.slice(-period);
    const sum = slice.reduce((total, value) => total + value, 0);
    return sum / period;
  }
  
  /**
   * Calculate Relative Strength Index
   * @param {Array} data - Price data
   * @param {number} period - Period
   * @returns {number} - RSI value
   */
  calculateRSI(data, period) {
    if (data.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const difference = data[data.length - i] - data[data.length - i - 1];
      if (difference >= 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }
    
    if (losses === 0) return 100;
    
    const relativeStrength = gains / losses;
    return 100 - (100 / (1 + relativeStrength));
  }
  
  /**
   * Calculate Moving Average Convergence Divergence
   * @param {Array} data - Price data
   * @param {number} fastPeriod - Fast period
   * @param {number} slowPeriod - Slow period
   * @param {number} signalPeriod - Signal period
   * @returns {Object} - MACD values
   */
  calculateMACD(data, fastPeriod, slowPeriod, signalPeriod) {
    if (data.length < slowPeriod + signalPeriod) {
      return { macd: 0, signal: 0, histogram: 0, previousHistogram: 0 };
    }
    
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    const macdLine = fastEMA - slowEMA;
    
    // Calculate signal line (EMA of MACD line)
    const macdData = [];
    for (let i = 0; i < signalPeriod + 1; i++) {
      const index = data.length - signalPeriod - 1 + i;
      if (index >= 0) {
        const fastEMA = this.calculateEMA(data.slice(0, index + 1), fastPeriod);
        const slowEMA = this.calculateEMA(data.slice(0, index + 1), slowPeriod);
        macdData.push(fastEMA - slowEMA);
      }
    }
    
    const signalLine = this.calculateEMA(macdData, signalPeriod);
    
    // Calculate histogram
    const histogram = macdLine - signalLine;
    
    // Calculate previous histogram
    const previousMacdData = [];
    for (let i = 0; i < signalPeriod + 1; i++) {
      const index = data.length - signalPeriod - 2 + i;
      if (index >= 0) {
        const fastEMA = this.calculateEMA(data.slice(0, index + 1), fastPeriod);
        const slowEMA = this.calculateEMA(data.slice(0, index + 1), slowPeriod);
        previousMacdData.push(fastEMA - slowEMA);
      }
    }
    
    const previousSignalLine = this.calculateEMA(previousMacdData, signalPeriod);
    const previousMacdLine = this.calculateEMA(data.slice(0, -1), fastPeriod) - 
                             this.calculateEMA(data.slice(0, -1), slowPeriod);
    const previousHistogram = previousMacdLine - previousSignalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram,
      previousHistogram
    };
  }
  
  /**
   * Calculate Exponential Moving Average
   * @param {Array} data - Price data
   * @param {number} period - Period
   * @returns {number} - EMA value
   */
  calculateEMA(data, period) {
    if (data.length < period) return null;
    
    const k = 2 / (period + 1);
    
    // Start with SMA
    let ema = this.calculateSMA(data.slice(0, period), period);
    
    // Calculate EMA
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
  
  /**
   * Calculate average of array
   * @param {Array} data - Data array
   * @returns {number} - Average
   */
  calculateAverage(data) {
    if (!data.length) return 0;
    const sum = data.reduce((total, value) => total + value, 0);
    return sum / data.length;
  }
  
  /**
   * Calculate risk level based on confidence
   * @param {number} confidence - Signal confidence
   * @returns {string} - Risk level
   */
  calculateRiskLevel(confidence) {
    if (confidence >= 80) return 'LOW';
    if (confidence >= 65) return 'MEDIUM';
    return 'HIGH';
  }
  
  /**
   * Place OTC trade based on signal
   * @param {Object} signal - Signal data
   * @returns {Promise<Object>} - Trade result
   */
  async placeOTCTrade(signal) {
    try {
      if (!signal || !signal.pair || !signal.direction) {
        return {
          success: false,
          error: 'Invalid signal'
        };
      }
      
      console.log(`Placing OTC trade for ${signal.pair} ${signal.direction}`);
      
      // In a real implementation, this would send a message to the content script
      // to place the trade on the broker platform
      
      // For now, we'll just simulate a successful trade
      const trade = {
        id: `otc-${Date.now()}`,
        pair: signal.pair,
        direction: signal.direction,
        amount: 10, // Default amount
        timestamp: Date.now(),
        expiryTime: Date.now() + 60000, // 1 minute expiry
        broker: this.currentBroker,
        isOTC: true,
        status: 'PLACED'
      };
      
      // Log trade
      await this.logOTCTrade(trade);
      
      return {
        success: true,
        trade
      };
    } catch (error) {
      console.error('Error placing OTC trade:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Log OTC trade
   * @param {Object} trade - Trade data
   * @returns {Promise<void>}
   */
  async logOTCTrade(trade) {
    try {
      // Get existing trade logs
      const data = await new Promise(resolve => {
        chrome.storage.local.get(['otcTradeLogs'], result => {
          resolve(result);
        });
      });
      
      const logs = data.otcTradeLogs || [];
      
      // Add new trade
      logs.unshift(trade);
      
      // Limit to 100 trades
      const limitedLogs = logs.slice(0, 100);
      
      // Save logs
      await new Promise(resolve => {
        chrome.storage.local.set({
          otcTradeLogs: limitedLogs
        }, resolve);
      });
      
      console.log('Logged OTC trade');
    } catch (error) {
      console.error('Error logging OTC trade:', error);
    }
  }
}

// Create instance
const otcModeHandler = new OTCModeHandler();

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { OTCModeHandler, otcModeHandler };
}