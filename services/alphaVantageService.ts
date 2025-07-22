// Alpha Vantage API Service
import axios from 'axios';

export class AlphaVantageService {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheExpiry: number;

  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
    this.baseUrl = 'https://www.alphavantage.co/query';
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1 minute cache
  }

  /**
   * Get intraday forex data
   */
  async getForexIntraday(fromSymbol: string, toSymbol: string, interval: string = '1min', outputsize: string = 'compact') {
    try {
      console.log(`📊 Fetching ${fromSymbol}/${toSymbol} forex data from Alpha Vantage`);
      
      const cacheKey = `forex-${fromSymbol}-${toSymbol}-${interval}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📋 Using cached Alpha Vantage data');
        return cached.data;
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'FX_INTRADAY',
          from_symbol: fromSymbol,
          to_symbol: toSymbol,
          interval: interval,
          outputsize: outputsize,
          apikey: this.apiKey
        },
        timeout: 15000
      });

      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }

      if (response.data['Note']) {
        throw new Error('API call frequency limit reached');
      }

      const timeSeries = response.data[`Time Series FX (${interval})`];
      if (!timeSeries) {
        throw new Error('No forex data returned from Alpha Vantage');
      }

      // Convert to standard format
      const ohlcvData = Object.entries(timeSeries).map(([timestamp, data]: [string, any]) => ({
        timestamp: timestamp,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: 0 // Forex doesn't have volume in Alpha Vantage
      }));

      // Sort by timestamp (oldest first)
      ohlcvData.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Cache the result
      this.cache.set(cacheKey, {
        data: ohlcvData,
        timestamp: Date.now()
      });

      console.log(`✅ Fetched ${ohlcvData.length} forex candles from Alpha Vantage`);
      return ohlcvData;

    } catch (error) {
      console.error('❌ Alpha Vantage forex API error:', error);
      
      // Return demo data if API fails
      return this.getDemoForexData(fromSymbol, toSymbol, interval);
    }
  }

  /**
   * Get intraday stock data
   */
  async getStockIntraday(symbol: string, interval: string = '1min', outputsize: string = 'compact') {
    try {
      console.log(`📊 Fetching ${symbol} stock data from Alpha Vantage`);
      
      const cacheKey = `stock-${symbol}-${interval}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📋 Using cached Alpha Vantage stock data');
        return cached.data;
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: symbol,
          interval: interval,
          outputsize: outputsize,
          apikey: this.apiKey
        },
        timeout: 15000
      });

      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }

      if (response.data['Note']) {
        throw new Error('API call frequency limit reached');
      }

      const timeSeries = response.data[`Time Series (${interval})`];
      if (!timeSeries) {
        throw new Error('No stock data returned from Alpha Vantage');
      }

      // Convert to standard format
      const ohlcvData = Object.entries(timeSeries).map(([timestamp, data]: [string, any]) => ({
        timestamp: timestamp,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume'])
      }));

      // Sort by timestamp (oldest first)
      ohlcvData.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Cache the result
      this.cache.set(cacheKey, {
        data: ohlcvData,
        timestamp: Date.now()
      });

      console.log(`✅ Fetched ${ohlcvData.length} stock candles from Alpha Vantage`);
      return ohlcvData;

    } catch (error) {
      console.error('❌ Alpha Vantage stock API error:', error);
      
      // Return demo data if API fails
      return this.getDemoStockData(symbol, interval);
    }
  }

  /**
   * Get crypto intraday data
   */
  async getCryptoIntraday(symbol: string, market: string = 'USD', interval: string = '1min') {
    try {
      console.log(`📊 Fetching ${symbol}/${market} crypto data from Alpha Vantage`);
      
      const cacheKey = `crypto-${symbol}-${market}-${interval}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📋 Using cached Alpha Vantage crypto data');
        return cached.data;
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'CRYPTO_INTRADAY',
          symbol: symbol,
          market: market,
          interval: interval,
          apikey: this.apiKey
        },
        timeout: 15000
      });

      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }

      if (response.data['Note']) {
        throw new Error('API call frequency limit reached');
      }

      const timeSeries = response.data[`Time Series Crypto (${interval})`];
      if (!timeSeries) {
        throw new Error('No crypto data returned from Alpha Vantage');
      }

      // Convert to standard format
      const ohlcvData = Object.entries(timeSeries).map(([timestamp, data]: [string, any]) => ({
        timestamp: timestamp,
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseFloat(data['5. volume'])
      }));

      // Sort by timestamp (oldest first)
      ohlcvData.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Cache the result
      this.cache.set(cacheKey, {
        data: ohlcvData,
        timestamp: Date.now()
      });

      console.log(`✅ Fetched ${ohlcvData.length} crypto candles from Alpha Vantage`);
      return ohlcvData;

    } catch (error) {
      console.error('❌ Alpha Vantage crypto API error:', error);
      
      // Return demo data if API fails
      return this.getDemoCryptoData(symbol, market, interval);
    }
  }

  /**
   * Get technical indicators from Alpha Vantage
   */
  async getTechnicalIndicator(symbol: string, indicator: string, interval: string = '1min', params: any = {}) {
    try {
      console.log(`📊 Fetching ${indicator} for ${symbol} from Alpha Vantage`);
      
      const response = await axios.get(this.baseUrl, {
        params: {
          function: indicator,
          symbol: symbol,
          interval: interval,
          apikey: this.apiKey,
          ...params
        },
        timeout: 15000
      });

      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }

      if (response.data['Note']) {
        throw new Error('API call frequency limit reached');
      }

      return response.data;

    } catch (error) {
      console.error(`❌ Alpha Vantage ${indicator} API error:`, error);
      throw error;
    }
  }

  /**
   * Get market sentiment data
   */
  async getMarketSentiment(tickers?: string[]) {
    try {
      console.log('📊 Fetching market sentiment from Alpha Vantage');
      
      const params: any = {
        function: 'NEWS_SENTIMENT',
        apikey: this.apiKey
      };

      if (tickers && tickers.length > 0) {
        params.tickers = tickers.join(',');
      }

      const response = await axios.get(this.baseUrl, {
        params: params,
        timeout: 20000
      });

      if (response.data['Error Message']) {
        throw new Error(response.data['Error Message']);
      }

      return response.data;

    } catch (error) {
      console.error('❌ Alpha Vantage sentiment API error:', error);
      throw error;
    }
  }

  /**
   * Convert timeframe to Alpha Vantage format
   */
  private convertTimeframe(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      '1M': '1min',
      '5M': '5min',
      '15M': '15min',
      '30M': '30min',
      '1H': '60min'
    };
    
    return mapping[timeframe] || '1min';
  }

  /**
   * Generate demo forex data
   */
  private getDemoForexData(fromSymbol: string, toSymbol: string, interval: string) {
    console.log(`📊 Using demo forex data for ${fromSymbol}/${toSymbol} (Alpha Vantage unavailable)`);
    
    const data = [];
    const now = new Date();
    const intervalMins = this.getIntervalMinutes(interval);
    
    // Generate demo OHLCV data
    let basePrice = 1.0500; // Example EUR/USD price
    
    for (let i = 100; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMins * 60000);
      
      // Generate realistic price movement
      const volatility = 0.001; // 0.1% volatility
      const change = (Math.random() - 0.5) * volatility;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      
      data.push({
        timestamp: timestamp.toISOString(),
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume: 0 // Forex doesn't have volume
      });
      
      basePrice = close;
    }
    
    return data;
  }

  /**
   * Generate demo stock data
   */
  private getDemoStockData(symbol: string, interval: string) {
    console.log(`📊 Using demo stock data for ${symbol} (Alpha Vantage unavailable)`);
    
    const data = [];
    const now = new Date();
    const intervalMins = this.getIntervalMinutes(interval);
    
    // Generate demo OHLCV data
    let basePrice = 150.00; // Example stock price
    
    for (let i = 100; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMins * 60000);
      
      // Generate realistic price movement
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.random() * 1000000 + 500000;
      
      data.push({
        timestamp: timestamp.toISOString(),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: Math.round(volume)
      });
      
      basePrice = close;
    }
    
    return data;
  }

  /**
   * Generate demo crypto data
   */
  private getDemoCryptoData(symbol: string, market: string, interval: string) {
    console.log(`📊 Using demo crypto data for ${symbol}/${market} (Alpha Vantage unavailable)`);
    
    const data = [];
    const now = new Date();
    const intervalMins = this.getIntervalMinutes(interval);
    
    // Generate demo OHLCV data
    let basePrice = 45000; // Example BTC price
    
    for (let i = 100; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMins * 60000);
      
      // Generate realistic price movement
      const volatility = 0.03; // 3% volatility
      const change = (Math.random() - 0.5) * volatility;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.random() * 100 + 50;
      
      data.push({
        timestamp: timestamp.toISOString(),
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: parseFloat(volume.toFixed(4))
      });
      
      basePrice = close;
    }
    
    return data;
  }

  /**
   * Get interval in minutes
   */
  private getIntervalMinutes(interval: string): number {
    const mapping: { [key: string]: number } = {
      '1min': 1,
      '5min': 5,
      '15min': 15,
      '30min': 30,
      '60min': 60
    };
    
    return mapping[interval] || 1;
  }

  /**
   * Check API key validity
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: 'AAPL',
          interval: '1min',
          outputsize: 'compact',
          apikey: this.apiKey
        },
        timeout: 10000
      });

      return !response.data['Error Message'] && !response.data['Note'];
    } catch (error) {
      return false;
    }
  }
}