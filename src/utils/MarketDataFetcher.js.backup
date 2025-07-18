/**
 * MarketDataFetcher - Real-time Market Data Provider
 * 
 * Fetches market data from various sources for different timeframes
 * and prepares it for technical analysis
 */

const axios = require('axios');

class MarketDataFetcher {
  constructor(apiKey = process.env.MARKET_DATA_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.twelvedata.com';
    this.supportedTimeframes = ['5min', '15min', '30min', '1h', '4h', '1day'];
    this.mappedTimeframes = {
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '1h',
      '4h': '4h',
      '1d': '1day'
    };
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1 minute cache expiry
  }

  /**
   * Fetch market data for a specific symbol and timeframe
   * @param {String} symbol - Trading symbol (e.g., 'EUR/USD', 'BTC/USD')
   * @param {String} timeframe - Timeframe (e.g., '5m', '1h')
   * @param {Number} limit - Number of candles to fetch (default: 100)
   * @returns {Promise<Array>} - Array of OHLCV candles
   */
  async fetchMarketData(symbol, timeframe, limit = 100) {
    try {
      // Check if we have valid API key
      if (!this.apiKey) {
        return this.generateMockData(symbol, timeframe, limit);
      }
      
      // Map internal timeframe format to API format
      const apiTimeframe = this.mappedTimeframes[timeframe] || timeframe;
      
      // Check cache first
      const cacheKey = `${symbol}-${timeframe}-${limit}`;
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData && Date.now() - cachedData.timestamp < this.cacheExpiry) {
        return cachedData.data;
      }
      
      // Fetch from API
      const response = await axios.get(`${this.baseUrl}/time_series`, {
        params: {
          symbol: symbol,
          interval: apiTimeframe,
          outputsize: limit,
          apikey: this.apiKey
        }
      });
      
      if (response.data && response.data.values) {
        // Transform data to our format
        const candles = response.data.values.map(item => ({
          timestamp: new Date(item.datetime).getTime(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume || 0)
        })).reverse(); // API returns newest first, we want oldest first
        
        // Cache the result
        this.cache.set(cacheKey, {
          timestamp: Date.now(),
          data: candles
        });
        
        return candles;
      }
      
      throw new Error('Invalid response from market data API');
    } catch (error) {
      console.error(`Error fetching market data: ${error.message}`);
      // Fallback to mock data if API fails
      return this.generateMockData(symbol, timeframe, limit);
    }
  }

  /**
   * Fetch market data for multiple timeframes
   * @param {String} symbol - Trading symbol
   * @param {Array} timeframes - Array of timeframes to fetch
   * @param {Number} limit - Number of candles per timeframe
   * @returns {Promise<Object>} - Object with timeframes as keys and candle arrays as values
   */
  async fetchMultiTimeframeData(symbol, timeframes = ['5m', '15m', '30m', '1h', '4h', '1d'], limit = 100) {
    try {
      const results = {};
      
      // Fetch data for each timeframe
      const promises = timeframes.map(async (timeframe) => {
        const data = await this.fetchMarketData(symbol, timeframe, limit);
        results[timeframe] = data;
      });
      
      await Promise.all(promises);
      return results;
    } catch (error) {
      console.error(`Error fetching multi-timeframe data: ${error.message}`);
      
      // Generate mock data for all timeframes if API fails
      const mockResults = {};
      for (const timeframe of timeframes) {
        mockResults[timeframe] = this.generateMockData(symbol, timeframe, limit);
      }
      
      return mockResults;
    }
  }

  /**
   * Generate realistic mock market data when API is unavailable
   * @param {String} symbol - Trading symbol
   * @param {String} timeframe - Timeframe
   * @param {Number} limit - Number of candles
   * @returns {Array} - Array of mock OHLCV candles
   */
  generateMockData(symbol, timeframe, limit = 100) {
    console.log(`Generating mock data for ${symbol} on ${timeframe} timeframe`);
    
    // Set base price based on symbol
    let basePrice = 100;
    if (symbol.includes('BTC') || symbol.includes('bitcoin')) {
      basePrice = 50000 + Math.random() * 10000;
    } else if (symbol.includes('ETH') || symbol.includes('ethereum')) {
      basePrice = 3000 + Math.random() * 500;
    } else if (symbol.includes('EUR') || symbol.includes('GBP')) {
      basePrice = 1.1 + Math.random() * 0.2;
    }
    
    // Generate candles with realistic price movements
    const candles = [];
    let currentPrice = basePrice;
    
    // Determine pattern type based on symbol and timeframe to create more varied test data
    const patternSeed = (symbol + timeframe).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const patternType = patternSeed % 5; // 0-4 different pattern types
    
    // Base volatility adjusted by timeframe
    let volatility = 0.005;
    if (timeframe === '1h' || timeframe === '4h') {
      volatility *= 2;
    } else if (timeframe === '1d') {
      volatility *= 4;
    }
    
    // Generate candles
    const now = Date.now();
    const timeframeMinutes = this.getTimeframeMinutes(timeframe);
    
    // Create different market patterns based on patternType
    switch (patternType) {
      case 0: // Uptrend
        this.generateUptrendCandles(candles, currentPrice, volatility, limit, now, timeframeMinutes);
        break;
      case 1: // Downtrend
        this.generateDowntrendCandles(candles, currentPrice, volatility, limit, now, timeframeMinutes);
        break;
      case 2: // Consolidation then breakout
        this.generateBreakoutCandles(candles, currentPrice, volatility, limit, now, timeframeMinutes);
        break;
      case 3: // Reversal pattern
        this.generateReversalCandles(candles, currentPrice, volatility, limit, now, timeframeMinutes);
        break;
      case 4: // Choppy/sideways market
        this.generateChoppyCandles(candles, currentPrice, volatility, limit, now, timeframeMinutes);
        break;
      default:
        // Random market
        this.generateRandomCandles(candles, currentPrice, volatility, limit, now, timeframeMinutes);
    }
    
    return candles;
  }
  
  /**
   * Generate uptrend candles
   * @param {Array} candles - Array to store generated candles
   * @param {Number} basePrice - Starting price
   * @param {Number} volatility - Price volatility
   * @param {Number} limit - Number of candles to generate
   * @param {Number} now - Current timestamp
   * @param {Number} timeframeMinutes - Timeframe in minutes
   */
  generateUptrendCandles(candles, basePrice, volatility, limit, now, timeframeMinutes) {
    let currentPrice = basePrice;
    const trendStrength = 0.002 + (Math.random() * 0.003); // Consistent uptrend
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - ((limit - i - 1) * timeframeMinutes * 60 * 1000);
      
      // Uptrend with occasional pullbacks
      const isPullback = Math.random() < 0.2;
      const movement = isPullback 
        ? -(Math.random() * volatility * 0.7) 
        : (Math.random() * volatility) + trendStrength;
      
      currentPrice = currentPrice * (1 + movement);
      
      // Generate OHLC values for uptrend (more bullish candles)
      const isBullish = Math.random() < 0.7; // 70% bullish candles
      const range = currentPrice * volatility;
      
      let open, close, high, low;
      if (isBullish) {
        open = currentPrice * (1 - (Math.random() * volatility * 0.3));
        close = currentPrice;
        high = close + (Math.random() * range * 0.5);
        low = open - (Math.random() * range * 0.3);
      } else {
        close = currentPrice * (1 - (Math.random() * volatility * 0.3));
        open = currentPrice;
        high = open + (Math.random() * range * 0.3);
        low = close - (Math.random() * range * 0.5);
      }
      
      // Higher volume on trend continuation, lower on pullbacks
      const volume = Math.floor(1000 + Math.random() * 9000) * (isPullback ? 0.7 : 1.3);
      
      candles.push({ timestamp, open, high, low, close, volume });
    }
  }
  
  /**
   * Generate downtrend candles
   * @param {Array} candles - Array to store generated candles
   * @param {Number} basePrice - Starting price
   * @param {Number} volatility - Price volatility
   * @param {Number} limit - Number of candles to generate
   * @param {Number} now - Current timestamp
   * @param {Number} timeframeMinutes - Timeframe in minutes
   */
  generateDowntrendCandles(candles, basePrice, volatility, limit, now, timeframeMinutes) {
    let currentPrice = basePrice;
    const trendStrength = 0.002 + (Math.random() * 0.003); // Consistent downtrend
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - ((limit - i - 1) * timeframeMinutes * 60 * 1000);
      
      // Downtrend with occasional bounces
      const isBounce = Math.random() < 0.2;
      const movement = isBounce 
        ? (Math.random() * volatility * 0.7) 
        : -(Math.random() * volatility) - trendStrength;
      
      currentPrice = currentPrice * (1 + movement);
      
      // Generate OHLC values for downtrend (more bearish candles)
      const isBearish = Math.random() < 0.7; // 70% bearish candles
      const range = currentPrice * volatility;
      
      let open, close, high, low;
      if (isBearish) {
        open = currentPrice * (1 + (Math.random() * volatility * 0.3));
        close = currentPrice;
        high = open + (Math.random() * range * 0.3);
        low = close - (Math.random() * range * 0.5);
      } else {
        close = currentPrice * (1 + (Math.random() * volatility * 0.3));
        open = currentPrice;
        high = close + (Math.random() * range * 0.5);
        low = open - (Math.random() * range * 0.3);
      }
      
      // Higher volume on trend continuation, lower on bounces
      const volume = Math.floor(1000 + Math.random() * 9000) * (isBounce ? 0.7 : 1.3);
      
      candles.push({ timestamp, open, high, low, close, volume });
    }
  }
  
  /**
   * Generate breakout candles (consolidation followed by breakout)
   * @param {Array} candles - Array to store generated candles
   * @param {Number} basePrice - Starting price
   * @param {Number} volatility - Price volatility
   * @param {Number} limit - Number of candles to generate
   * @param {Number} now - Current timestamp
   * @param {Number} timeframeMinutes - Timeframe in minutes
   */
  generateBreakoutCandles(candles, basePrice, volatility, limit, now, timeframeMinutes) {
    let currentPrice = basePrice;
    const consolidationPeriod = Math.floor(limit * 0.7); // 70% of candles in consolidation
    const breakoutDirection = Math.random() > 0.5 ? 1 : -1; // Random breakout direction
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - ((limit - i - 1) * timeframeMinutes * 60 * 1000);
      
      let movement;
      if (i < consolidationPeriod) {
        // Consolidation phase - small random movements
        movement = (Math.random() - 0.5) * volatility * 0.5;
      } else {
        // Breakout phase - strong directional movement
        movement = (Math.random() * volatility * 2 + volatility) * breakoutDirection;
      }
      
      currentPrice = currentPrice * (1 + movement);
      
      // Generate OHLC values
      const range = currentPrice * volatility;
      const isBullish = (i < consolidationPeriod) 
        ? Math.random() > 0.5 
        : breakoutDirection > 0;
      
      let open, close, high, low;
      if (isBullish) {
        open = currentPrice * (1 - (Math.random() * volatility * 0.3));
        close = currentPrice;
        high = close + (Math.random() * range * 0.5);
        low = open - (Math.random() * range * 0.3);
      } else {
        close = currentPrice * (1 - (Math.random() * volatility * 0.3));
        open = currentPrice;
        high = open + (Math.random() * range * 0.3);
        low = close - (Math.random() * range * 0.5);
      }
      
      // Higher volume during breakout
      const volume = Math.floor(1000 + Math.random() * 9000) * 
        (i >= consolidationPeriod ? 2.5 : 0.8);
      
      candles.push({ timestamp, open, high, low, close, volume });
    }
  }
  
  /**
   * Generate reversal candles (trend followed by reversal)
   * @param {Array} candles - Array to store generated candles
   * @param {Number} basePrice - Starting price
   * @param {Number} volatility - Price volatility
   * @param {Number} limit - Number of candles to generate
   * @param {Number} now - Current timestamp
   * @param {Number} timeframeMinutes - Timeframe in minutes
   */
  generateReversalCandles(candles, basePrice, volatility, limit, now, timeframeMinutes) {
    let currentPrice = basePrice;
    const initialTrend = Math.random() > 0.5 ? 1 : -1; // Random initial trend
    const reversalPoint = Math.floor(limit * 0.7); // Reversal at 70% of candles
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - ((limit - i - 1) * timeframeMinutes * 60 * 1000);
      
      // Determine trend direction
      const trend = i < reversalPoint ? initialTrend : -initialTrend;
      
      // Calculate movement based on trend
      let movement;
      if (i === reversalPoint - 1) {
        // Create a doji or spinning top at reversal point
        movement = (Math.random() - 0.5) * volatility * 0.2;
      } else if (i === reversalPoint) {
        // Create a strong reversal candle
        movement = (Math.random() * volatility * 2 + volatility) * trend;
      } else {
        // Normal trend movement
        movement = (Math.random() * volatility + volatility * 0.5) * trend;
      }
      
      currentPrice = currentPrice * (1 + movement);
      
      // Generate OHLC values
      const range = currentPrice * volatility;
      const isBullish = trend > 0;
      
      let open, close, high, low;
      if (i === reversalPoint - 1) {
        // Doji or spinning top
        open = currentPrice * (1 - (volatility * 0.1));
        close = currentPrice * (1 + (volatility * 0.1));
        high = Math.max(open, close) + (range * 0.5);
        low = Math.min(open, close) - (range * 0.5);
      } else if (isBullish) {
        open = currentPrice * (1 - (Math.random() * volatility * 0.3));
        close = currentPrice;
        high = close + (Math.random() * range * 0.5);
        low = open - (Math.random() * range * 0.3);
      } else {
        close = currentPrice * (1 - (Math.random() * volatility * 0.3));
        open = currentPrice;
        high = open + (Math.random() * range * 0.3);
        low = close - (Math.random() * range * 0.5);
      }
      
      // Higher volume at reversal point
      const volume = Math.floor(1000 + Math.random() * 9000) * 
        (i >= reversalPoint - 1 && i <= reversalPoint + 1 ? 2.0 : 1.0);
      
      candles.push({ timestamp, open, high, low, close, volume });
    }
  }
  
  /**
   * Generate choppy/sideways market candles
   * @param {Array} candles - Array to store generated candles
   * @param {Number} basePrice - Starting price
   * @param {Number} volatility - Price volatility
   * @param {Number} limit - Number of candles to generate
   * @param {Number} now - Current timestamp
   * @param {Number} timeframeMinutes - Timeframe in minutes
   */
  generateChoppyCandles(candles, basePrice, volatility, limit, now, timeframeMinutes) {
    let currentPrice = basePrice;
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - ((limit - i - 1) * timeframeMinutes * 60 * 1000);
      
      // Random movement with no clear trend
      const movement = (Math.random() - 0.5) * volatility * 1.5;
      currentPrice = currentPrice * (1 + movement);
      
      // Generate OHLC values with varied candle types
      const range = currentPrice * volatility;
      const candleType = Math.floor(Math.random() * 4); // 0-3 different candle types
      
      let open, close, high, low;
      switch (candleType) {
        case 0: // Bullish
          open = currentPrice * (1 - (Math.random() * volatility * 0.3));
          close = currentPrice;
          high = close + (Math.random() * range * 0.5);
          low = open - (Math.random() * range * 0.3);
          break;
        case 1: // Bearish
          close = currentPrice * (1 - (Math.random() * volatility * 0.3));
          open = currentPrice;
          high = open + (Math.random() * range * 0.3);
          low = close - (Math.random() * range * 0.5);
          break;
        case 2: // Doji
          open = currentPrice * (1 - (volatility * 0.05));
          close = currentPrice * (1 + (volatility * 0.05));
          high = Math.max(open, close) + (range * 0.5);
          low = Math.min(open, close) - (range * 0.5);
          break;
        case 3: // Long-legged doji
          open = currentPrice;
          close = currentPrice * (1 + (Math.random() - 0.5) * volatility * 0.1);
          high = Math.max(open, close) + (range * 0.8);
          low = Math.min(open, close) - (range * 0.8);
          break;
      }
      
      // Random volume
      const volume = Math.floor(500 + Math.random() * 9500);
      
      candles.push({ timestamp, open, high, low, close, volume });
    }
  }
  
  /**
   * Generate random market candles
   * @param {Array} candles - Array to store generated candles
   * @param {Number} basePrice - Starting price
   * @param {Number} volatility - Price volatility
   * @param {Number} limit - Number of candles to generate
   * @param {Number} now - Current timestamp
   * @param {Number} timeframeMinutes - Timeframe in minutes
   */
  generateRandomCandles(candles, basePrice, volatility, limit, now, timeframeMinutes) {
    let currentPrice = basePrice;
    let trend = Math.random() > 0.5 ? 1 : -1; // Start with random trend
    let trendStrength = Math.random() * 0.01; // Random trend strength
    
    for (let i = 0; i < limit; i++) {
      const timestamp = now - ((limit - i - 1) * timeframeMinutes * 60 * 1000);
      
      // Occasionally change trend
      if (Math.random() < 0.1) {
        trend = -trend;
        trendStrength = Math.random() * 0.01;
      }
      
      // Calculate price movement
      const movement = (Math.random() * volatility) * trend;
      currentPrice = currentPrice * (1 + movement + trendStrength);
      
      // Generate realistic OHLC values
      const range = currentPrice * volatility;
      const open = currentPrice;
      const close = currentPrice * (1 + (Math.random() - 0.5) * volatility * 0.5);
      const high = Math.max(open, close) + (Math.random() * range);
      const low = Math.min(open, close) - (Math.random() * range);
      
      // Generate volume
      const volume = Math.floor(1000 + Math.random() * 9000);
      
      candles.push({ timestamp, open, high, low, close, volume });
    }
  }

  /**
   * Convert timeframe string to minutes
   * @param {String} timeframe - Timeframe string (e.g., '5m', '1h')
   * @returns {Number} - Minutes
   */
  getTimeframeMinutes(timeframe) {
    if (timeframe === '5m') return 5;
    if (timeframe === '15m') return 15;
    if (timeframe === '30m') return 30;
    if (timeframe === '1h') return 60;
    if (timeframe === '4h') return 240;
    if (timeframe === '1d') return 1440;
    return 5; // Default to 5 minutes
  }

  /**
   * Format candle timestamp to readable format
   * @param {Number} timestamp - Timestamp in milliseconds
   * @returns {String} - Formatted timestamp string
   */
  static formatCandleTimestamp(timestamp) {
    const date = new Date(timestamp);
    
    // Format for Indian Standard Time (UTC+5:30)
    const options = {
      timeZone: 'Asia/Kolkata',
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short'
    };
    
    return date.toLocaleString('en-IN', options);
  }
}

module.exports = { MarketDataFetcher };