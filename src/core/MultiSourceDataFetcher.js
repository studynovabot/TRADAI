/**
 * Multi-Source Data Fetcher
 * 
 * Fetches market data from multiple sources for redundancy and accuracy:
 * - Alpha Vantage (primary for recent data)
 * - Twelve Data (secondary for real-time data)
 * - Yahoo Finance (tertiary for historical context)
 * 
 * Provides data validation, caching, and fallback mechanisms
 */

const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;

class MultiSourceDataFetcher {
  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.twelveDataKey = process.env.TWELVE_DATA_API_KEY;
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30 seconds for ultra-fast signals
    
    // Data source priorities
    this.dataSources = [
      { name: 'alphaVantage', priority: 1, available: !!this.alphaVantageKey },
      { name: 'twelveData', priority: 2, available: !!this.twelveDataKey },
      { name: 'yahooFinance', priority: 3, available: true }
    ];
    
    // Rate limiting
    this.rateLimits = {
      alphaVantage: { calls: 0, resetTime: 0, maxCalls: 5 }, // 5 calls per minute
      twelveData: { calls: 0, resetTime: 0, maxCalls: 8 }, // 8 calls per minute
      yahooFinance: { calls: 0, resetTime: 0, maxCalls: 100 } // More lenient
    };
  }

  /**
   * Fetch market data with multi-source redundancy
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Timeframe (1M, 2M, 5M, etc.)
   * @param {number} limit - Number of candles to fetch
   * @returns {Promise<Array>} - Array of OHLCV candles
   */
  async fetchMarketData(symbol, timeframe = '1M', limit = 100) {
    const cacheKey = `${symbol}-${timeframe}-${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log(`📋 Using cached data for ${symbol} ${timeframe}`);
      return cached.data;
    }

    console.log(`🔄 Fetching ${symbol} data for ${timeframe} from multiple sources`);
    
    // Try each data source in priority order
    const availableSources = this.dataSources
      .filter(source => source.available)
      .sort((a, b) => a.priority - b.priority);

    let data = null;
    let sourceUsed = null;
    
    for (const source of availableSources) {
      if (this.isRateLimited(source.name)) {
        console.log(`⏳ Rate limited for ${source.name}, skipping`);
        continue;
      }
      
      try {
        console.log(`🎯 Trying ${source.name} for ${symbol}`);
        
        switch (source.name) {
          case 'alphaVantage':
            data = await this.fetchFromAlphaVantage(symbol, timeframe, limit);
            break;
          case 'twelveData':
            data = await this.fetchFromTwelveData(symbol, timeframe, limit);
            break;
          case 'yahooFinance':
            data = await this.fetchFromYahooFinance(symbol, timeframe, limit);
            break;
        }
        
        if (data && data.length > 0) {
          sourceUsed = source.name;
          this.updateRateLimit(source.name);
          console.log(`✅ Successfully fetched ${data.length} candles from ${source.name}`);
          break;
        }
        
      } catch (error) {
        console.error(`❌ Error fetching from ${source.name}:`, error.message);
        this.updateRateLimit(source.name);
        continue;
      }
    }
    
    // If all sources fail, generate demo data
    if (!data || data.length === 0) {
      console.log(`🔄 All sources failed, generating demo data for ${symbol}`);
      data = this.generateDemoData(symbol, timeframe, limit);
      sourceUsed = 'demo';
    }
    
    // Validate and clean data
    const validatedData = this.validateAndCleanData(data);
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: validatedData,
      timestamp: Date.now(),
      source: sourceUsed
    });
    
    console.log(`📊 Final dataset: ${validatedData.length} candles from ${sourceUsed}`);
    return validatedData;
  }

  /**
   * Fetch data from Alpha Vantage
   */
  async fetchFromAlphaVantage(symbol, timeframe, limit) {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const interval = this.convertTimeframeToAlphaVantage(timeframe);
    const isForex = this.isForexSymbol(symbol);
    
    let url, params;
    
    if (isForex) {
      const fromSymbol = symbol.substring(0, 3);
      const toSymbol = symbol.substring(3, 6);
      
      params = {
        function: 'FX_INTRADAY',
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        interval: interval,
        outputsize: 'compact',
        apikey: this.alphaVantageKey
      };
    } else {
      params = {
        function: 'TIME_SERIES_INTRADAY',
        symbol: symbol,
        interval: interval,
        outputsize: 'compact',
        apikey: this.alphaVantageKey
      };
    }

    const response = await axios.get('https://www.alphavantage.co/query', {
      params: params,
      timeout: 15000
    });

    if (response.data['Error Message']) {
      throw new Error(response.data['Error Message']);
    }

    if (response.data['Note']) {
      throw new Error('API call frequency limit reached');
    }

    const timeSeriesKey = isForex ? 
      `Time Series FX (${interval})` : 
      `Time Series (${interval})`;
    
    const timeSeries = response.data[timeSeriesKey];
    if (!timeSeries) {
      throw new Error('No time series data returned');
    }

    // Convert to standard format
    const data = Object.entries(timeSeries).map(([timestamp, values]) => ({
      timestamp: new Date(timestamp).getTime(),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: isForex ? 0 : parseInt(values['5. volume'] || '0')
    }));

    return data.sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
  }

  /**
   * Fetch data from Twelve Data
   */
  async fetchFromTwelveData(symbol, timeframe, limit) {
    if (!this.twelveDataKey) {
      throw new Error('Twelve Data API key not configured');
    }

    const interval = this.convertTimeframeToTwelveData(timeframe);
    
    const response = await axios.get('https://api.twelvedata.com/time_series', {
      params: {
        symbol: symbol,
        interval: interval,
        outputsize: limit,
        apikey: this.twelveDataKey,
        format: 'json'
      },
      timeout: 15000
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    if (!response.data.values || response.data.values.length === 0) {
      throw new Error('No data returned from Twelve Data');
    }

    // Convert to standard format
    const data = response.data.values.map(item => ({
      timestamp: new Date(item.datetime).getTime(),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume) || 0
    }));

    return data.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Fetch data from Yahoo Finance
   */
  async fetchFromYahooFinance(symbol, timeframe, limit) {
    const yahooSymbol = this.convertToYahooSymbol(symbol);
    const interval = this.convertTimeframeToYahoo(timeframe);
    
    // Calculate period based on timeframe and limit
    const timeframeMinutes = this.getTimeframeMinutes(timeframe);
    const periodMs = limit * timeframeMinutes * 60 * 1000;
    const period1 = new Date(Date.now() - periodMs);
    const period2 = new Date();

    const result = await yahooFinance.chart(yahooSymbol, {
      period1: period1.toISOString(),
      period2: period2.toISOString(),
      interval: interval
    });

    if (!result.quotes || result.quotes.length === 0) {
      throw new Error('No data from Yahoo Finance');
    }

    // Convert to standard format
    const data = result.quotes.map(quote => ({
      timestamp: quote.date.getTime(),
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      volume: quote.volume || 0
    }));

    return data.sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
  }

  /**
   * Validate and clean market data
   */
  validateAndCleanData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.filter(candle => {
      // Basic validation
      if (!candle || typeof candle !== 'object') return false;
      
      // Check required fields
      const requiredFields = ['timestamp', 'open', 'high', 'low', 'close'];
      if (!requiredFields.every(field => candle[field] !== undefined && candle[field] !== null)) {
        return false;
      }
      
      // Check numeric values
      const numericFields = ['open', 'high', 'low', 'close', 'volume'];
      if (!numericFields.every(field => {
        const value = candle[field];
        return value === undefined || value === null || (!isNaN(value) && isFinite(value) && value >= 0);
      })) {
        return false;
      }
      
      // Check OHLC logic
      if (candle.high < candle.low || 
          candle.high < candle.open || 
          candle.high < candle.close ||
          candle.low > candle.open || 
          candle.low > candle.close) {
        return false;
      }
      
      return true;
    }).map(candle => ({
      ...candle,
      volume: candle.volume || 0 // Ensure volume is always a number
    }));
  }

  /**
   * Generate demo data as fallback
   */
  generateDemoData(symbol, timeframe, limit) {
    console.log(`🎲 Generating demo data for ${symbol} ${timeframe}`);
    
    const data = [];
    const now = Date.now();
    const timeframeMs = this.getTimeframeMinutes(timeframe) * 60 * 1000;
    
    // Base price based on symbol type
    let basePrice = this.getBasePriceForSymbol(symbol);
    const volatility = this.getVolatilityForSymbol(symbol);
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * timeframeMs);
      
      // Generate realistic price movement
      const change = (Math.random() - 0.5) * volatility;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.3;
      const low = Math.min(open, close) - Math.random() * volatility * 0.3;
      const volume = this.generateVolumeForSymbol(symbol);
      
      data.push({
        timestamp,
        open: parseFloat(open.toFixed(this.getPrecisionForSymbol(symbol))),
        high: parseFloat(high.toFixed(this.getPrecisionForSymbol(symbol))),
        low: parseFloat(low.toFixed(this.getPrecisionForSymbol(symbol))),
        close: parseFloat(close.toFixed(this.getPrecisionForSymbol(symbol))),
        volume: Math.round(volume)
      });
      
      basePrice = close;
    }
    
    return data;
  }

  /**
   * Rate limiting helpers
   */
  isRateLimited(source) {
    const limit = this.rateLimits[source];
    if (!limit) return false;
    
    const now = Date.now();
    
    // Reset counter if minute has passed
    if (now - limit.resetTime > 60000) {
      limit.calls = 0;
      limit.resetTime = now;
    }
    
    return limit.calls >= limit.maxCalls;
  }

  updateRateLimit(source) {
    const limit = this.rateLimits[source];
    if (limit) {
      limit.calls++;
      if (limit.resetTime === 0) {
        limit.resetTime = Date.now();
      }
    }
  }

  /**
   * Timeframe conversion helpers
   */
  convertTimeframeToAlphaVantage(timeframe) {
    const mapping = {
      '1M': '1min',
      '2M': '1min', // Will need to aggregate
      '5M': '5min',
      '15M': '15min',
      '30M': '30min',
      '1H': '60min'
    };
    return mapping[timeframe] || '1min';
  }

  convertTimeframeToTwelveData(timeframe) {
    const mapping = {
      '1M': '1min',
      '2M': '2min',
      '5M': '5min',
      '15M': '15min',
      '30M': '30min',
      '1H': '1h'
    };
    return mapping[timeframe] || '1min';
  }

  convertTimeframeToYahoo(timeframe) {
    const mapping = {
      '1M': '1m',
      '2M': '2m',
      '5M': '5m',
      '15M': '15m',
      '30M': '30m',
      '1H': '1h'
    };
    return mapping[timeframe] || '1m';
  }

  getTimeframeMinutes(timeframe) {
    const mapping = {
      '1M': 1,
      '2M': 2,
      '5M': 5,
      '15M': 15,
      '30M': 30,
      '1H': 60
    };
    return mapping[timeframe] || 1;
  }

  /**
   * Symbol helpers
   */
  isForexSymbol(symbol) {
    const forexPairs = [
      'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
      'EURJPY', 'GBPJPY', 'EURGBP', 'AUDJPY', 'EURAUD', 'EURCHF', 'AUDNZD'
    ];
    return forexPairs.includes(symbol.toUpperCase());
  }

  convertToYahooSymbol(symbol) {
    if (this.isForexSymbol(symbol)) {
      return `${symbol}=X`;
    }
    return symbol;
  }

  getBasePriceForSymbol(symbol) {
    const symbolUpper = symbol.toUpperCase();
    
    if (this.isForexSymbol(symbolUpper)) {
      const forexPrices = {
        'EURUSD': 1.0500,
        'GBPUSD': 1.2500,
        'USDJPY': 150.00,
        'USDCHF': 0.9000,
        'AUDUSD': 0.6500
      };
      return forexPrices[symbolUpper] || 1.0000;
    }
    
    // Stock symbols
    if (symbolUpper.includes('BTC') || symbolUpper.includes('BITCOIN')) {
      return 45000;
    }
    
    return 150.00; // Default stock price
  }

  getVolatilityForSymbol(symbol) {
    const symbolUpper = symbol.toUpperCase();
    
    if (this.isForexSymbol(symbolUpper)) {
      return 0.001; // 0.1% for forex
    }
    
    if (symbolUpper.includes('BTC') || symbolUpper.includes('CRYPTO')) {
      return 0.03; // 3% for crypto
    }
    
    return 0.02; // 2% for stocks
  }

  generateVolumeForSymbol(symbol) {
    const symbolUpper = symbol.toUpperCase();
    
    if (this.isForexSymbol(symbolUpper)) {
      return 0; // Forex doesn't have volume
    }
    
    if (symbolUpper.includes('BTC') || symbolUpper.includes('CRYPTO')) {
      return Math.random() * 100 + 50;
    }
    
    return Math.random() * 1000000 + 500000; // Stock volume
  }

  getPrecisionForSymbol(symbol) {
    const symbolUpper = symbol.toUpperCase();
    
    if (this.isForexSymbol(symbolUpper)) {
      return 5; // 5 decimal places for forex
    }
    
    return 2; // 2 decimal places for stocks/crypto
  }

  /**
   * Get health status of all data sources
   */
  async getDataSourceHealth() {
    const health = {};
    
    for (const source of this.dataSources) {
      if (!source.available) {
        health[source.name] = { status: 'unavailable', reason: 'API key not configured' };
        continue;
      }
      
      if (this.isRateLimited(source.name)) {
        health[source.name] = { status: 'rate_limited', reason: 'Rate limit exceeded' };
        continue;
      }
      
      try {
        // Test with a simple request
        await this.testDataSource(source.name);
        health[source.name] = { status: 'healthy', reason: 'API responding normally' };
      } catch (error) {
        health[source.name] = { status: 'error', reason: error.message };
      }
    }
    
    return health;
  }

  async testDataSource(sourceName) {
    switch (sourceName) {
      case 'alphaVantage':
        return this.fetchFromAlphaVantage('EURUSD', '1M', 5);
      case 'twelveData':
        return this.fetchFromTwelveData('EURUSD', '1M', 5);
      case 'yahooFinance':
        return this.fetchFromYahooFinance('EURUSD', '1M', 5);
      default:
        throw new Error('Unknown data source');
    }
  }
}

module.exports = { MultiSourceDataFetcher };