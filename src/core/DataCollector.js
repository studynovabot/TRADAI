/**
 * DataCollector - Twelve Data API Integration
 * 
 * Handles fetching live OHLCV data from Twelve Data API
 * with proper error handling, rate limiting, and data validation
 */

const axios = require('axios');
const moment = require('moment');
const { Logger } = require('../utils/Logger');

class DataCollector {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    this.apiKey = config.twelveDataApiKey;
    this.baseUrl = 'https://api.twelvedata.com';
    this.useMockData = config.useMockData || !this.apiKey;

    // Rate limiting (Twelve Data free tier: 800 requests/day)
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; // 1 second between requests

    // Cache for avoiding duplicate requests
    this.lastFetchedCandle = {};

    if (this.useMockData) {
      this.logger.warn('⚠️ DataCollector initialized in MOCK DATA mode - using simulated market data');
    } else {
      this.logger.info('📊 DataCollector initialized with TwelveData API');
    }
  }
  
  /**
   * Fetch the latest 1-minute candle for a currency pair
   */
  async fetchLatestCandle(currencyPair) {
    try {
      // Use mock data if API key is not available or mock mode is enabled
      if (this.useMockData) {
        const mockCandles = this.generateMockData(currencyPair, 1);
        return mockCandles[0];
      }

      // Rate limiting check
      await this.enforceRateLimit();
      
      const symbol = this.formatSymbol(currencyPair);
      const url = `${this.baseUrl}/time_series`;
      
      const params = {
        symbol: symbol,
        interval: '1min',
        outputsize: 1, // Get only the latest candle
        apikey: this.apiKey,
        format: 'JSON'
      };
      
      this.logger.debug(`📡 Fetching data for ${symbol}...`);
      
      const response = await axios.get(url, { 
        params,
        timeout: 10000 // 10 second timeout
      });
      
      this.requestCount++;
      
      if (response.data.status === 'error') {
        throw new Error(`API Error: ${response.data.message}`);
      }
      
      const candle = this.parseCandle(response.data, currencyPair);
      
      // Validate candle data
      if (!this.validateCandle(candle)) {
        throw new Error('Invalid candle data received');
      }
      
      // Check if this is a new candle (avoid duplicates)
      if (this.isDuplicateCandle(candle, currencyPair)) {
        this.logger.debug(`⏭️ Duplicate candle detected for ${currencyPair}, skipping`);
        return null;
      }
      
      // Store as last fetched
      this.lastFetchedCandle[currencyPair] = candle;
      
      this.logger.logMarketData({
        currencyPair,
        candle: {
          timestamp: candle.timestamp,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume
        }
      });
      
      return candle;
      
    } catch (error) {
      this.logger.logError('Data Collection', error, { currencyPair });

      // Fallback to mock data if API fails and we're not already using mock data
      if (!this.useMockData) {
        this.logger.warn('⚠️ API failed, falling back to mock data for latest candle');
        const mockCandles = this.generateMockData(currencyPair, 1);
        return mockCandles[0];
      }

      // Return null on error to allow system to continue
      return null;
    }
  }
  
  /**
   * Generate mock market data for testing/demo purposes
   */
  generateMockData(currencyPair, outputsize = 20) {
    const candles = [];
    const basePrice = currencyPair === 'USD/EUR' ? 0.85 : 1.0;
    let currentPrice = basePrice;
    const now = new Date();

    for (let i = outputsize - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60000)); // 1 minute intervals

      // Generate realistic OHLCV data with some volatility
      const volatility = 0.001; // 0.1% volatility
      const change = (Math.random() - 0.5) * volatility * 2;

      const open = currentPrice;
      const close = open + (open * change);
      const high = Math.max(open, close) + (Math.random() * volatility * open);
      const low = Math.min(open, close) - (Math.random() * volatility * open);
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      candles.push({
        timestamp: timestamp,
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume: volume,
        currencyPair: currencyPair
      });

      currentPrice = close;
    }

    return candles;
  }

  /**
   * Fetch historical data for backtesting or initial analysis
   */
  async fetchHistoricalData(currencyPair, outputsize = 20) {
    try {
      // Use mock data if API key is not available or mock mode is enabled
      if (this.useMockData) {
        this.logger.info(`📚 Generating ${outputsize} mock candles for ${currencyPair}...`);
        const mockCandles = this.generateMockData(currencyPair, outputsize);
        this.logger.info(`✅ Generated ${mockCandles.length} mock candles for ${currencyPair}`);
        return mockCandles;
      }

      await this.enforceRateLimit();

      const symbol = this.formatSymbol(currencyPair);
      const url = `${this.baseUrl}/time_series`;

      const params = {
        symbol: symbol,
        interval: '1min',
        outputsize: outputsize,
        apikey: this.apiKey,
        format: 'JSON'
      };

      this.logger.info(`📚 Fetching ${outputsize} historical candles for ${symbol}...`);

      const response = await axios.get(url, {
        params,
        timeout: 15000 // 15 second timeout for historical data
      });

      this.requestCount++;

      if (response.data.status === 'error') {
        throw new Error(`API Error: ${response.data.message}`);
      }

      const candles = this.parseHistoricalData(response.data, currencyPair);

      this.logger.info(`✅ Fetched ${candles.length} historical candles for ${currencyPair}`);

      return candles;

    } catch (error) {
      this.logger.logError('Historical Data Collection', error, { currencyPair, outputsize });

      // Fallback to mock data if API fails
      if (!this.useMockData) {
        this.logger.warn('⚠️ API failed, falling back to mock data');
        return this.generateMockData(currencyPair, outputsize);
      }

      throw error;
    }
  }
  
  /**
   * Format currency pair for Twelve Data API
   */
  formatSymbol(currencyPair) {
    // Twelve Data API uses slash format for forex pairs (e.g., "USD/INR")
    // Keep the original format as is
    return currencyPair;
  }
  
  /**
   * Parse single candle from API response
   */
  parseCandle(apiResponse, currencyPair) {
    const values = apiResponse.values[0];
    
    return {
      currencyPair: currencyPair,
      timestamp: new Date(values.datetime),
      open: parseFloat(values.open),
      high: parseFloat(values.high),
      low: parseFloat(values.low),
      close: parseFloat(values.close),
      volume: parseInt(values.volume) || 0
    };
  }
  
  /**
   * Parse historical data from API response
   */
  parseHistoricalData(apiResponse, currencyPair) {
    if (!apiResponse.values || !Array.isArray(apiResponse.values)) {
      throw new Error('Invalid historical data format');
    }
    
    return apiResponse.values
      .map(values => ({
        currencyPair: currencyPair,
        timestamp: new Date(values.datetime),
        open: parseFloat(values.open),
        high: parseFloat(values.high),
        low: parseFloat(values.low),
        close: parseFloat(values.close),
        volume: parseInt(values.volume) || 0
      }))
      .reverse(); // Twelve Data returns newest first, we want oldest first
  }
  
  /**
   * Validate candle data
   */
  validateCandle(candle) {
    if (!candle) return false;
    
    const required = ['timestamp', 'open', 'high', 'low', 'close'];
    
    for (const field of required) {
      if (candle[field] === undefined || candle[field] === null) {
        this.logger.warn(`⚠️ Missing required field: ${field}`);
        return false;
      }
    }
    
    // Validate OHLC relationships
    if (candle.high < candle.low) {
      this.logger.warn('⚠️ Invalid OHLC: High < Low');
      return false;
    }
    
    if (candle.high < candle.open || candle.high < candle.close) {
      this.logger.warn('⚠️ Invalid OHLC: High < Open/Close');
      return false;
    }
    
    if (candle.low > candle.open || candle.low > candle.close) {
      this.logger.warn('⚠️ Invalid OHLC: Low > Open/Close');
      return false;
    }
    
    return true;
  }
  
  /**
   * Check if candle is duplicate
   */
  isDuplicateCandle(candle, currencyPair) {
    const lastCandle = this.lastFetchedCandle[currencyPair];
    
    if (!lastCandle) return false;
    
    // Compare timestamps (same minute)
    return moment(candle.timestamp).isSame(moment(lastCandle.timestamp), 'minute');
  }
  
  /**
   * Enforce rate limiting
   */
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      this.logger.debug(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Get API usage statistics
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      dailyLimit: 800 // Free tier limit
    };
  }
  
  /**
   * Fetch signal analysis data (20 candles for comprehensive analysis)
   */
  async fetchSignalAnalysisData(currencyPair) {
    try {
      this.logger.info(`📊 Fetching signal analysis data for ${currencyPair}...`);

      // Fetch 20 candles for comprehensive analysis (minimum 14 required for technical analysis)
      const candles = await this.fetchHistoricalData(currencyPair, 20);

      if (!candles || candles.length < 14) {
        throw new Error(`Insufficient data for signal analysis: ${candles?.length || 0} candles (minimum 14 required)`);
      }

      this.logger.info(`✅ Signal analysis data ready: ${candles.length} candles`);

      return candles;

    } catch (error) {
      this.logger.logError('Signal Analysis Data Collection', error, { currencyPair });
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      this.logger.info('🔍 Testing Twelve Data API connection...');

      const testCandle = await this.fetchLatestCandle('USD/INR');

      if (testCandle) {
        this.logger.info('✅ Twelve Data API connection successful');
        return true;
      } else {
        this.logger.warn('⚠️ Twelve Data API test returned no data');
        return false;
      }

    } catch (error) {
      this.logger.logError('API Connection Test', error);
      return false;
    }
  }
}

module.exports = { DataCollector };
