/**
 * Production Market Data Fetcher - Real-Time Multi-Provider System
 * 
 * Implements a robust, production-ready market data acquisition system with:
 * - Multi-provider failover (Twelve Data, Finnhub, Alpha Vantage, Polygon)
 * - Real-time OHLCV data with strict validation
 * - Yahoo Finance integration for historical analysis
 * - Zero mock data fallback - system fails gracefully if no real data available
 * - Comprehensive logging and monitoring
 */

const axios = require('axios');
const yfinance = require('yahoo-finance2').default;
const { Logger } = require('./Logger');

class ProductionMarketDataFetcher {
  constructor(config = {}) {
    this.logger = Logger.getInstanceSync();
    this.config = config;
    
    // API Configuration with priority order
    this.apiProviders = {
      twelveData: {
        name: 'Twelve Data',
        priority: 1,
        baseUrl: 'https://api.twelvedata.com',
        apiKey: process.env.TWELVE_DATA_API_KEY || config.twelveDataApiKey,
        rateLimit: 800, // requests per minute
        timeout: 10000,
        active: true,
        failures: 0,
        maxFailures: 3
      },
      finnhub: {
        name: 'Finnhub',
        priority: 2,
        baseUrl: 'https://finnhub.io/api/v1',
        apiKey: process.env.FINNHUB_API_KEY || config.finnhubApiKey || 'd1t566pr01qh0t04t32gd1t566pr01qh0t04t330',
        rateLimit: 300,
        timeout: 8000,
        active: true,
        failures: 0,
        maxFailures: 3
      },
      alphaVantage: {
        name: 'Alpha Vantage',
        priority: 3,
        baseUrl: 'https://www.alphavantage.co/query',
        apiKey: process.env.ALPHA_VANTAGE_API_KEY || config.alphaVantageApiKey || 'B5V6LID8ZMLCB8I',
        rateLimit: 75, // 5 requests per minute
        timeout: 12000,
        active: true,
        failures: 0,
        maxFailures: 3
      },
      polygon: {
        name: 'Polygon.io',
        priority: 4,
        baseUrl: 'https://api.polygon.io',
        apiKey: process.env.POLYGON_API_KEY || config.polygonApiKey || 'fjT4pb2VnomVKkkPay5dpXhMq3qtsLZp',
        rateLimit: 1000,
        timeout: 10000,
        active: true,
        failures: 0,
        maxFailures: 3
      }
    };
    
    // Yahoo Finance for historical data only
    this.yahooFinance = {
      name: 'Yahoo Finance',
      active: true,
      useForHistorical: true,
      useForRealTime: false // Never use for real-time signals
    };
    
    // System configuration
    this.strictRealDataMode = process.env.STRICT_REAL_DATA_MODE !== 'false';
    this.logDataSource = process.env.LOG_DATA_SOURCE !== 'false';
    this.enableMockFallback = false; // NEVER use mock data in production
    
    // Timeframe mappings for different providers
    this.timeframeMappings = {
      twelveData: {
        '1m': '1min', '3m': '3min', '5m': '5min', '15m': '15min',
        '30m': '30min', '1h': '1h', '4h': '4h', '1d': '1day'
      },
      finnhub: {
        '1m': '1', '3m': '3', '5m': '5', '15m': '15',
        '30m': '30', '1h': '60', '4h': '240', '1d': 'D'
      },
      alphaVantage: {
        '1m': '1min', '5m': '5min', '15m': '15min', '30m': '30min',
        '1h': '60min', '4h': '4hour', '1d': 'daily'
      },
      polygon: {
        '1m': '1', '3m': '3', '5m': '5', '15m': '15',
        '30m': '30', '1h': '60', '4h': '240', '1d': '1440'
      }
    };
    
    // Cache system
    this.cache = new Map();
    this.cacheExpiry = {
      '1m': 30000,   // 30 seconds
      '3m': 60000,   // 1 minute
      '5m': 120000,  // 2 minutes
      '15m': 300000, // 5 minutes
      '30m': 600000, // 10 minutes
      '1h': 1800000, // 30 minutes
      '4h': 3600000, // 1 hour
      '1d': 7200000  // 2 hours
    };
    
    // Performance tracking
    this.performance = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      providerStats: {},
      lastHealthCheck: 0
    };
    
    // Initialize provider stats
    Object.keys(this.apiProviders).forEach(provider => {
      this.performance.providerStats[provider] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0,
        lastUsed: 0,
        isHealthy: true
      };
    });
    
    this.logger.info('Production Market Data Fetcher initialized with strict real-data mode');
  }
  
  /**
   * Fetch real-time market data with automatic failover
   * @param {string} symbol - Trading symbol (e.g., 'EUR/USD', 'BTC/USD')
   * @param {string} timeframe - Timeframe (e.g., '5m', '1h')
   * @param {number} limit - Number of candles to fetch
   * @returns {Promise<Array>} - Array of OHLCV candles or null if no real data available
   */
  async fetchRealTimeData(symbol, timeframe, limit = 100) {
    const startTime = Date.now();
    this.performance.totalRequests++;
    
    // Validate inputs
    if (!symbol || !timeframe) {
      this.logger.error('Invalid symbol or timeframe provided');
      return null;
    }
    
    // Check cache first
    const cacheKey = `${symbol}-${timeframe}-${limit}`;
    const cachedData = this.getCachedData(cacheKey, timeframe);
    if (cachedData) {
      this.logger.debug(`Using cached data for ${symbol} ${timeframe}`);
      return cachedData;
    }
    
    // Get sorted providers by priority and health
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      this.logger.error('No healthy API providers available');
      this.performance.failedRequests++;
      return null;
    }
    
    // Try each provider in order
    for (const providerKey of availableProviders) {
      const provider = this.apiProviders[providerKey];
      
      try {
        this.logger.debug(`Attempting to fetch data from ${provider.name} for ${symbol} ${timeframe}`);
        
        const data = await this.fetchFromProvider(providerKey, symbol, timeframe, limit);
        
        if (this.validateMarketData(data, symbol, timeframe)) {
          // Success - cache the data and update stats
          this.cacheData(cacheKey, data, timeframe);
          this.updateProviderStats(providerKey, true, Date.now() - startTime);
          this.performance.successfulRequests++;
          
          if (this.logDataSource) {
            this.logger.info(`Successfully fetched ${data.length} candles from ${provider.name} for ${symbol} ${timeframe}`);
          }
          
          return data;
        } else {
          throw new Error('Data validation failed');
        }
        
      } catch (error) {
        this.logger.warn(`${provider.name} failed for ${symbol} ${timeframe}: ${error.message}`);
        this.updateProviderStats(providerKey, false, Date.now() - startTime);
        this.handleProviderFailure(providerKey);
        continue;
      }
    }
    
    // All providers failed
    this.logger.error(`All API providers failed for ${symbol} ${timeframe}`);
    this.performance.failedRequests++;
    
    // In strict mode, return null instead of mock data
    if (this.strictRealDataMode) {
      this.logger.error('STRICT_REAL_DATA_MODE: No real data available, returning null');
      return null;
    }
    
    return null;
  }
  
  /**
   * Fetch historical data from Yahoo Finance for backtesting and trend analysis
   * @param {string} symbol - Yahoo Finance symbol (e.g., 'EURUSD=X', 'BTC-USD')
   * @param {string} period - Period ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
   * @param {string} interval - Interval ('1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo')
   * @returns {Promise<Array>} - Array of historical OHLCV candles
   */
  async fetchHistoricalData(symbol, period = '1mo', interval = '1d') {
    try {
      this.logger.debug(`Fetching historical data from Yahoo Finance: ${symbol} ${period} ${interval}`);
      
      // Convert symbol to Yahoo Finance format if needed
      const yahooSymbol = this.convertToYahooSymbol(symbol);
      
      const result = await yfinance.historical(yahooSymbol, {
        period1: this.getPeriodStartDate(period),
        interval: interval
      });
      
      if (!result || result.length === 0) {
        throw new Error('No historical data returned from Yahoo Finance');
      }
      
      // Convert to our standard format
      const candles = result.map(item => ({
        timestamp: new Date(item.date).getTime(),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume || 0)
      }));
      
      this.logger.info(`Successfully fetched ${candles.length} historical candles from Yahoo Finance for ${symbol}`);
      return candles;
      
    } catch (error) {
      this.logger.error(`Yahoo Finance historical data fetch failed for ${symbol}: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Fetch multi-timeframe data with failover
   * @param {string} symbol - Trading symbol
   * @param {Array} timeframes - Array of timeframes
   * @param {number} limit - Number of candles per timeframe
   * @returns {Promise<Object>} - Object with timeframes as keys and candle arrays as values
   */
  async fetchMultiTimeframeData(symbol, timeframes = ['5m', '15m', '30m', '1h', '4h'], limit = 100) {
    const results = {};
    const promises = [];
    
    for (const timeframe of timeframes) {
      promises.push(
        this.fetchRealTimeData(symbol, timeframe, limit)
          .then(data => {
            results[timeframe] = data;
          })
          .catch(error => {
            this.logger.error(`Multi-timeframe fetch failed for ${symbol} ${timeframe}: ${error.message}`);
            results[timeframe] = null;
          })
      );
    }
    
    await Promise.all(promises);
    
    // Check if we have at least some real data
    const validTimeframes = Object.keys(results).filter(tf => results[tf] !== null);
    
    if (validTimeframes.length === 0) {
      this.logger.error(`No real data available for any timeframe for ${symbol}`);
      return null;
    }
    
    if (validTimeframes.length < timeframes.length) {
      this.logger.warn(`Only ${validTimeframes.length}/${timeframes.length} timeframes have real data for ${symbol}`);
    }
    
    return results;
  }
  
  /**
   * Fetch data from specific provider
   * @private
   */
  async fetchFromProvider(providerKey, symbol, timeframe, limit) {
    const provider = this.apiProviders[providerKey];
    
    switch (providerKey) {
      case 'twelveData':
        return await this.fetchFromTwelveData(symbol, timeframe, limit);
      case 'finnhub':
        return await this.fetchFromFinnhub(symbol, timeframe, limit);
      case 'alphaVantage':
        return await this.fetchFromAlphaVantage(symbol, timeframe, limit);
      case 'polygon':
        return await this.fetchFromPolygon(symbol, timeframe, limit);
      default:
        throw new Error(`Unknown provider: ${providerKey}`);
    }
  }
  
  /**
   * Fetch from Twelve Data API
   * @private
   */
  async fetchFromTwelveData(symbol, timeframe, limit) {
    const provider = this.apiProviders.twelveData;
    const apiTimeframe = this.timeframeMappings.twelveData[timeframe];
    
    if (!apiTimeframe) {
      throw new Error(`Unsupported timeframe ${timeframe} for Twelve Data`);
    }
    
    const response = await axios.get(`${provider.baseUrl}/time_series`, {
      params: {
        symbol: symbol,
        interval: apiTimeframe,
        outputsize: limit,
        apikey: provider.apiKey
      },
      timeout: provider.timeout
    });
    
    if (!response.data || !response.data.values) {
      throw new Error('Invalid response from Twelve Data API');
    }
    
    return response.data.values.map(item => ({
      timestamp: new Date(item.datetime).getTime(),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume || 0)
    })).reverse();
  }
  
  /**
   * Fetch from Finnhub API
   * @private
   */
  async fetchFromFinnhub(symbol, timeframe, limit) {
    const provider = this.apiProviders.finnhub;
    const resolution = this.timeframeMappings.finnhub[timeframe];
    
    if (!resolution) {
      throw new Error(`Unsupported timeframe ${timeframe} for Finnhub`);
    }
    
    // Convert symbol to Finnhub format
    const finnhubSymbol = this.convertToFinnhubSymbol(symbol);
    
    const to = Math.floor(Date.now() / 1000);
    const from = to - (this.getTimeframeSeconds(timeframe) * limit);
    
    const response = await axios.get(`${provider.baseUrl}/stock/candle`, {
      params: {
        symbol: finnhubSymbol,
        resolution: resolution,
        from: from,
        to: to,
        token: provider.apiKey
      },
      timeout: provider.timeout
    });
    
    if (!response.data || response.data.s !== 'ok' || !response.data.c) {
      throw new Error('Invalid response from Finnhub API');
    }
    
    const candles = [];
    for (let i = 0; i < response.data.c.length; i++) {
      candles.push({
        timestamp: response.data.t[i] * 1000,
        open: parseFloat(response.data.o[i]),
        high: parseFloat(response.data.h[i]),
        low: parseFloat(response.data.l[i]),
        close: parseFloat(response.data.c[i]),
        volume: parseFloat(response.data.v[i] || 0)
      });
    }
    
    return candles;
  }
  
  /**
   * Fetch from Alpha Vantage API
   * @private
   */
  async fetchFromAlphaVantage(symbol, timeframe, limit) {
    const provider = this.apiProviders.alphaVantage;
    const interval = this.timeframeMappings.alphaVantage[timeframe];
    
    if (!interval) {
      throw new Error(`Unsupported timeframe ${timeframe} for Alpha Vantage`);
    }
    
    let functionName;
    if (timeframe === '1d') {
      functionName = 'TIME_SERIES_DAILY';
    } else {
      functionName = 'TIME_SERIES_INTRADAY';
    }
    
    const params = {
      function: functionName,
      symbol: symbol,
      apikey: provider.apiKey,
      outputsize: 'compact'
    };
    
    if (functionName === 'TIME_SERIES_INTRADAY') {
      params.interval = interval;
    }
    
    const response = await axios.get(provider.baseUrl, {
      params: params,
      timeout: provider.timeout
    });
    
    if (!response.data) {
      throw new Error('Invalid response from Alpha Vantage API');
    }
    
    // Find the time series data key
    const timeSeriesKey = Object.keys(response.data).find(key => 
      key.includes('Time Series')
    );
    
    if (!timeSeriesKey || !response.data[timeSeriesKey]) {
      throw new Error('No time series data in Alpha Vantage response');
    }
    
    const timeSeriesData = response.data[timeSeriesKey];
    const candles = [];
    
    Object.keys(timeSeriesData).slice(0, limit).forEach(timestamp => {
      const data = timeSeriesData[timestamp];
      candles.push({
        timestamp: new Date(timestamp).getTime(),
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseFloat(data['5. volume'] || 0)
      });
    });
    
    return candles.reverse();
  }
  
  /**
   * Fetch from Polygon.io API
   * @private
   */
  async fetchFromPolygon(symbol, timeframe, limit) {
    const provider = this.apiProviders.polygon;
    const multiplier = this.timeframeMappings.polygon[timeframe];
    
    if (!multiplier) {
      throw new Error(`Unsupported timeframe ${timeframe} for Polygon`);
    }
    
    // Convert symbol to Polygon format
    const polygonSymbol = this.convertToPolygonSymbol(symbol);
    
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - (this.getTimeframeSeconds(timeframe) * limit * 1000))
      .toISOString().split('T')[0];
    
    let timespan = 'minute';
    if (timeframe === '1d') timespan = 'day';
    else if (timeframe === '1h' || timeframe === '4h') timespan = 'hour';
    
    const response = await axios.get(
      `${provider.baseUrl}/v2/aggs/ticker/${polygonSymbol}/range/${multiplier}/${timespan}/${from}/${to}`,
      {
        params: {
          apikey: provider.apiKey,
          limit: limit
        },
        timeout: provider.timeout
      }
    );
    
    if (!response.data || !response.data.results) {
      throw new Error('Invalid response from Polygon API');
    }
    
    return response.data.results.map(item => ({
      timestamp: item.t,
      open: parseFloat(item.o),
      high: parseFloat(item.h),
      low: parseFloat(item.l),
      close: parseFloat(item.c),
      volume: parseFloat(item.v || 0)
    }));
  }
  
  /**
   * Validate market data quality and freshness
   * @private
   */
  validateMarketData(data, symbol, timeframe) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return false;
    }
    
    // Check data structure
    const requiredFields = ['timestamp', 'open', 'high', 'low', 'close'];
    const isValidStructure = data.every(candle => 
      requiredFields.every(field => 
        candle.hasOwnProperty(field) && 
        typeof candle[field] === 'number' && 
        !isNaN(candle[field])
      )
    );
    
    if (!isValidStructure) {
      this.logger.warn(`Invalid data structure for ${symbol} ${timeframe}`);
      return false;
    }
    
    // Check data freshness (last candle should be recent)
    const lastCandle = data[data.length - 1];
    const now = Date.now();
    const maxAge = this.getMaxDataAge(timeframe);
    
    if (now - lastCandle.timestamp > maxAge) {
      this.logger.warn(`Data too old for ${symbol} ${timeframe}: ${new Date(lastCandle.timestamp)}`);
      return false;
    }
    
    // Check for reasonable OHLC relationships
    const hasValidOHLC = data.every(candle => 
      candle.high >= candle.low &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.low <= candle.open &&
      candle.low <= candle.close
    );
    
    if (!hasValidOHLC) {
      this.logger.warn(`Invalid OHLC relationships for ${symbol} ${timeframe}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get available providers sorted by priority and health
   * @private
   */
  getAvailableProviders() {
    return Object.keys(this.apiProviders)
      .filter(key => {
        const provider = this.apiProviders[key];
        return provider.active && 
               provider.apiKey && 
               provider.failures < provider.maxFailures;
      })
      .sort((a, b) => {
        const providerA = this.apiProviders[a];
        const providerB = this.apiProviders[b];
        return providerA.priority - providerB.priority;
      });
  }
  
  /**
   * Handle provider failure and implement circuit breaker
   * @private
   */
  handleProviderFailure(providerKey) {
    const provider = this.apiProviders[providerKey];
    provider.failures++;
    
    if (provider.failures >= provider.maxFailures) {
      provider.active = false;
      this.logger.warn(`Provider ${provider.name} deactivated due to repeated failures`);
      
      // Reactivate after cooldown period
      setTimeout(() => {
        provider.active = true;
        provider.failures = 0;
        this.logger.info(`Provider ${provider.name} reactivated after cooldown`);
      }, 300000); // 5 minutes cooldown
    }
  }
  
  /**
   * Update provider performance statistics
   * @private
   */
  updateProviderStats(providerKey, success, responseTime) {
    const stats = this.performance.providerStats[providerKey];
    stats.requests++;
    stats.lastUsed = Date.now();
    
    if (success) {
      stats.successes++;
      this.apiProviders[providerKey].failures = 0; // Reset failure count on success
    } else {
      stats.failures++;
    }
    
    // Update average response time
    stats.avgResponseTime = (stats.avgResponseTime * (stats.requests - 1) + responseTime) / stats.requests;
    
    // Update health status
    stats.isHealthy = (stats.successes / stats.requests) > 0.7; // 70% success rate threshold
  }
  
  /**
   * Cache management
   * @private
   */
  getCachedData(cacheKey, timeframe) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    
    const expiry = this.cacheExpiry[timeframe] || 60000;
    if (Date.now() - cached.timestamp > expiry) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.data;
  }
  
  cacheData(cacheKey, data, timeframe) {
    this.cache.set(cacheKey, {
      timestamp: Date.now(),
      data: data
    });
    
    // Cleanup old cache entries
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Symbol conversion utilities
   * @private
   */
  convertToYahooSymbol(symbol) {
    const conversions = {
      'EUR/USD': 'EURUSD=X',
      'GBP/USD': 'GBPUSD=X',
      'USD/JPY': 'USDJPY=X',
      'BTC/USD': 'BTC-USD',
      'ETH/USD': 'ETH-USD'
    };
    return conversions[symbol] || symbol;
  }
  
  convertToFinnhubSymbol(symbol) {
    // Finnhub uses different formats for different asset types
    if (symbol.includes('/')) {
      return symbol.replace('/', '');
    }
    return symbol;
  }
  
  convertToPolygonSymbol(symbol) {
    // Polygon uses different formats
    if (symbol.includes('/')) {
      return 'C:' + symbol.replace('/', '');
    }
    return symbol;
  }
  
  /**
   * Time utilities
   * @private
   */
  getTimeframeSeconds(timeframe) {
    const mappings = {
      '1m': 60,
      '3m': 180,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400
    };
    return mappings[timeframe] || 300;
  }
  
  getMaxDataAge(timeframe) {
    // Maximum acceptable age for data based on timeframe
    const mappings = {
      '1m': 2 * 60 * 1000,      // 2 minutes
      '3m': 5 * 60 * 1000,      // 5 minutes
      '5m': 10 * 60 * 1000,     // 10 minutes
      '15m': 30 * 60 * 1000,    // 30 minutes
      '30m': 60 * 60 * 1000,    // 1 hour
      '1h': 2 * 60 * 60 * 1000, // 2 hours
      '4h': 8 * 60 * 60 * 1000, // 8 hours
      '1d': 24 * 60 * 60 * 1000 // 24 hours
    };
    return mappings[timeframe] || 10 * 60 * 1000;
  }
  
  /**
   * System health check
   */
  async performHealthCheck() {
    this.logger.info('Performing system health check...');
    
    const healthResults = {
      timestamp: Date.now(),
      overallHealth: 'HEALTHY',
      providers: {},
      recommendations: []
    };
    
    // Test each provider with a simple request
    for (const [providerKey, provider] of Object.entries(this.apiProviders)) {
      try {
        const testData = await this.fetchFromProvider(providerKey, 'EUR/USD', '5m', 5);
        healthResults.providers[providerKey] = {
          status: 'HEALTHY',
          responseTime: Date.now() - healthResults.timestamp,
          dataQuality: this.validateMarketData(testData, 'EUR/USD', '5m') ? 'GOOD' : 'POOR'
        };
      } catch (error) {
        healthResults.providers[providerKey] = {
          status: 'UNHEALTHY',
          error: error.message
        };
        healthResults.recommendations.push(`Check ${provider.name} API key and connectivity`);
      }
    }
    
    // Determine overall health
    const healthyProviders = Object.values(healthResults.providers)
      .filter(p => p.status === 'HEALTHY').length;
    
    if (healthyProviders === 0) {
      healthResults.overallHealth = 'CRITICAL';
      healthResults.recommendations.push('No healthy data providers available - system cannot generate signals');
    } else if (healthyProviders < 2) {
      healthResults.overallHealth = 'WARNING';
      healthResults.recommendations.push('Only one healthy provider - consider fixing backup providers');
    }
    
    this.performance.lastHealthCheck = Date.now();
    this.logger.info(`Health check completed: ${healthResults.overallHealth}`);
    
    return healthResults;
  }
  
  /**
   * Get system performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performance,
      cacheSize: this.cache.size,
      activeProviders: this.getAvailableProviders().length,
      systemUptime: Date.now() - (this.performance.lastHealthCheck || Date.now())
    };
  }
  
  /**
   * Check if real data is available for signal generation
   */
  async isRealDataAvailable(symbol, timeframes = ['5m', '15m', '1h']) {
    try {
      const testResults = await Promise.all(
        timeframes.map(tf => this.fetchRealTimeData(symbol, tf, 5))
      );
      
      const availableCount = testResults.filter(data => data !== null).length;
      const isAvailable = availableCount >= Math.ceil(timeframes.length / 2); // At least half should be available
      
      this.logger.debug(`Real data availability for ${symbol}: ${availableCount}/${timeframes.length} timeframes`);
      return isAvailable;
    } catch (error) {
      this.logger.error(`Error checking data availability: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Convert period string to start date for Yahoo Finance
   * @private
   */
  getPeriodStartDate(period) {
    const now = new Date();
    const startDate = new Date(now);
    
    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 1);
        break;
      case '5d':
        startDate.setDate(now.getDate() - 5);
        break;
      case '1mo':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3mo':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6mo':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case '2y':
        startDate.setFullYear(now.getFullYear() - 2);
        break;
      case '5y':
        startDate.setFullYear(now.getFullYear() - 5);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1); // Default to 1 month
    }
    
    return startDate;
  }
}

module.exports = { ProductionMarketDataFetcher };