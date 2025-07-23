// Twelve Data API Service
import axios from 'axios';

export class TwelveDataService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.TWELVE_DATA_API_KEY || '';
    this.baseUrl = 'https://api.twelvedata.com';
  }

  async getOHLCV(symbol: string, timeframe: string, outputsize: number = 100) {
    try {
      console.log(`📊 Fetching ${symbol} data for ${timeframe} timeframe`);

      // Validate API key exists
      if (!this.apiKey || this.apiKey === 'your_twelve_data_api_key_here') {
        throw new Error('TwelveData API key not configured or using placeholder value');
      }

      // Convert timeframe to Twelve Data format
      const interval = this.convertTimeframe(timeframe);

      console.log(`🔗 Making API call to TwelveData: ${symbol}, ${interval}, ${outputsize} candles`);
      const startTime = Date.now();

      const response = await axios.get(`${this.baseUrl}/time_series`, {
        params: {
          symbol: symbol,
          interval: interval,
          outputsize: outputsize,
          apikey: this.apiKey,
          format: 'json'
        },
        timeout: 15000 // Increased timeout for real API calls
      });

      const apiCallTime = Date.now() - startTime;
      console.log(`⏱️ TwelveData API call completed in ${apiCallTime}ms`);

      // Validate API response
      if (response.data.status === 'error') {
        throw new Error(`TwelveData API error: ${response.data.message || 'Unknown error'}`);
      }

      if (!response.data.values || response.data.values.length === 0) {
        throw new Error(`No market data returned from TwelveData API for ${symbol}`);
      }

      // Validate data quality - ensure we have real market data
      const firstCandle = response.data.values[0];
      if (!firstCandle.open || !firstCandle.high || !firstCandle.low || !firstCandle.close) {
        throw new Error('Invalid market data structure received from TwelveData API');
      }

      // Convert to standard format
      const ohlcvData = response.data.values.map((item: any) => ({
        timestamp: item.datetime,
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume) || 0
      }));

      // Sort by timestamp (oldest first)
      ohlcvData.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Log data source validation
      console.log(`✅ Fetched ${ohlcvData.length} REAL candles for ${symbol} from TwelveData API`);
      console.log(`📊 Latest candle: ${ohlcvData[ohlcvData.length - 1].timestamp} - Close: ${ohlcvData[ohlcvData.length - 1].close}`);

      return ohlcvData;

    } catch (error) {
      console.error('❌ Twelve Data API error:', error);

      // STRICT MODE: No fallback to mock data - throw error to force real data usage
      if (process.env.STRICT_REAL_DATA_MODE === 'true' || process.env.USE_MOCK_DATA === 'false') {
        throw new Error(`Real market data unavailable for ${symbol}: ${error.message}. No mock data allowed in strict mode.`);
      }

      // Legacy fallback (should not be reached in production)
      console.warn('⚠️ WARNING: Falling back to demo data - this should not happen in production!');
      return this.getDemoData(symbol, timeframe, outputsize);
    }
  }

  private convertTimeframe(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      '1M': '1min',
      '3M': '3min',
      '5M': '5min',
      '15M': '15min',
      '30M': '30min',
      '1H': '1h',
      '4H': '4h',
      '1D': '1day'
    };
    
    return mapping[timeframe] || '5min';
  }

  private getDemoData(symbol: string, timeframe: string, outputsize: number) {
    console.log(`📊 Using demo data for ${symbol} (API unavailable)`);
    
    const data = [];
    const now = new Date();
    const timeframeMins = this.getTimeframeMinutes(timeframe);
    
    // Generate demo OHLCV data
    let basePrice = 1.0500; // Example EUR/USD price
    
    for (let i = outputsize - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * timeframeMins * 60000);
      
      // Generate realistic price movement
      const volatility = 0.001; // 0.1% volatility
      const change = (Math.random() - 0.5) * volatility;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.random() * 1000000 + 500000;
      
      data.push({
        timestamp: timestamp.toISOString(),
        open: parseFloat(open.toFixed(5)),
        high: parseFloat(high.toFixed(5)),
        low: parseFloat(low.toFixed(5)),
        close: parseFloat(close.toFixed(5)),
        volume: Math.round(volume)
      });
      
      basePrice = close;
    }
    
    return data;
  }

  private getTimeframeMinutes(timeframe: string): number {
    const mapping: { [key: string]: number } = {
      '1M': 1,
      '3M': 3,
      '5M': 5,
      '15M': 15,
      '30M': 30,
      '1H': 60,
      '4H': 240,
      '1D': 1440
    };
    
    return mapping[timeframe] || 5;
  }

  async getSymbolInfo(symbol: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/symbol_search`, {
        params: {
          symbol: symbol,
          apikey: this.apiKey
        },
        timeout: 5000
      });

      return response.data.data || [];
    } catch (error) {
      console.error('❌ Symbol info error:', error);
      return [];
    }
  }
}