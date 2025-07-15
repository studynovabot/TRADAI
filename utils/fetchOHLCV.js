/**
 * AI Candle Sniper - OHLCV Data Fetcher
 * Professional multi-source data aggregation
 */

class OHLCVFetcher {
    constructor() {
        this.dataSources = {
            binance: {
                baseUrl: 'https://api.binance.com/api/v3',
                rateLimit: 1200, // requests per minute
                weight: 1
            },
            twelvedata: {
                baseUrl: 'https://api.twelvedata.com/v1',
                apiKey: null, // Set via configuration
                rateLimit: 800
            },
            yahoo: {
                baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
                rateLimit: 2000
            },
            alpha: {
                baseUrl: 'https://www.alphavantage.co/query',
                apiKey: null,
                rateLimit: 500
            }
        };
        
        this.cache = new Map();
        this.requestCounts = new Map();
        this.lastRequestTime = new Map();
    }

    /**
     * Fetch multi-timeframe OHLCV data for a symbol
     * @param {string} symbol - Trading symbol (e.g., 'EURUSD', 'BTCUSDT')
     * @param {Array} timeframes - Array of timeframes ['1M', '5M', '15M', '30M', '1H', '4H', '1D']
     * @param {number} limit - Number of candles to fetch (default: 100)
     * @returns {Object} Multi-timeframe data
     */
    async fetchMultiTimeframe(symbol, timeframes = ['1M', '5M', '15M', '30M', '1H'], limit = 100) {
        const results = {};
        const errors = [];

        for (const timeframe of timeframes) {
            try {
                console.log(`[OHLCV] Fetching ${symbol} ${timeframe} data...`);
                results[timeframe] = await this.fetchTimeframeData(symbol, timeframe, limit);
            } catch (error) {
                console.error(`[OHLCV] Failed to fetch ${symbol} ${timeframe}:`, error.message);
                errors.push({ timeframe, error: error.message });
                
                // Use cached data if available
                const cacheKey = `${symbol}_${timeframe}`;
                if (this.cache.has(cacheKey)) {
                    results[timeframe] = this.cache.get(cacheKey);
                    console.log(`[OHLCV] Using cached data for ${symbol} ${timeframe}`);
                }
            }
        }

        return {
            symbol,
            data: results,
            errors: errors.length > 0 ? errors : null,
            timestamp: Date.now()
        };
    }

    /**
     * Fetch OHLCV data for a specific timeframe
     * @param {string} symbol - Trading symbol
     * @param {string} timeframe - Timeframe (1M, 5M, 15M, etc.)
     * @param {number} limit - Number of candles
     * @returns {Array} Array of OHLCV candles
     */
    async fetchTimeframeData(symbol, timeframe, limit = 100) {
        const cacheKey = `${symbol}_${timeframe}`;
        
        // Check cache first (5-minute cache for active trading)
        if (this.isCacheValid(cacheKey, 5 * 60 * 1000)) {
            return this.cache.get(cacheKey);
        }

        // Try data sources in order of preference
        const dataSources = ['binance', 'twelvedata', 'yahoo', 'alpha'];
        let lastError = null;

        for (const source of dataSources) {
            try {
                if (!this.canMakeRequest(source)) {
                    console.log(`[OHLCV] Rate limit reached for ${source}, trying next...`);
                    continue;
                }

                const data = await this.fetchFromSource(source, symbol, timeframe, limit);
                
                if (data && data.length > 0) {
                    // Cache the data
                    this.cache.set(cacheKey, data);
                    this.updateRequestCount(source);
                    
                    console.log(`[OHLCV] Successfully fetched ${data.length} candles from ${source}`);
                    return data;
                }
            } catch (error) {
                lastError = error;
                console.log(`[OHLCV] ${source} failed: ${error.message}`);
            }
        }

        // If all sources fail, try to return stale cache data
        if (this.cache.has(cacheKey)) {
            console.log(`[OHLCV] Returning stale cache data for ${symbol} ${timeframe}`);
            return this.cache.get(cacheKey);
        }

        throw new Error(`Failed to fetch data from all sources. Last error: ${lastError?.message}`);
    }

    /**
     * Fetch data from a specific source
     * @param {string} source - Data source name
     * @param {string} symbol - Trading symbol
     * @param {string} timeframe - Timeframe
     * @param {number} limit - Number of candles
     * @returns {Array} OHLCV data
     */
    async fetchFromSource(source, symbol, timeframe, limit) {
        switch (source) {
            case 'binance':
                return await this.fetchFromBinance(symbol, timeframe, limit);
            case 'twelvedata':
                return await this.fetchFromTwelveData(symbol, timeframe, limit);
            case 'yahoo':
                return await this.fetchFromYahoo(symbol, timeframe, limit);
            case 'alpha':
                return await this.fetchFromAlphaVantage(symbol, timeframe, limit);
            default:
                throw new Error(`Unknown data source: ${source}`);
        }
    }

    /**
     * Fetch from Binance API (Crypto pairs)
     */
    async fetchFromBinance(symbol, timeframe, limit) {
        const interval = this.convertToBinanceInterval(timeframe);
        const binanceSymbol = this.convertToBinanceSymbol(symbol);
        
        const url = `${this.dataSources.binance.baseUrl}/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return data.map(candle => ({
            timestamp: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));
    }

    /**
     * Fetch from TwelveData API (Forex, Stocks, Crypto)
     */
    async fetchFromTwelveData(symbol, timeframe, limit) {
        if (!this.dataSources.twelvedata.apiKey) {
            throw new Error('TwelveData API key not configured');
        }

        const interval = this.convertToTwelveDataInterval(timeframe);
        const url = `${this.dataSources.twelvedata.baseUrl}/time_series` +
                   `?symbol=${symbol}&interval=${interval}&outputsize=${limit}` +
                   `&apikey=${this.dataSources.twelvedata.apiKey}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`TwelveData API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
            throw new Error(`TwelveData error: ${data.message}`);
        }
        
        if (!data.values) {
            throw new Error('No data returned from TwelveData');
        }
        
        return data.values.map(candle => ({
            timestamp: new Date(candle.datetime).getTime(),
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume || 0)
        }));
    }

    /**
     * Fetch from Yahoo Finance API
     */
    async fetchFromYahoo(symbol, timeframe, limit) {
        const yahooSymbol = this.convertToYahooSymbol(symbol);
        const interval = this.convertToYahooInterval(timeframe);
        
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (limit * this.getIntervalSeconds(timeframe));
        
        const url = `${this.dataSources.yahoo.baseUrl}/${yahooSymbol}` +
                   `?interval=${interval}&period1=${startTime}&period2=${endTime}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.chart.error) {
            throw new Error(`Yahoo Finance error: ${data.chart.error.description}`);
        }
        
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        return timestamps.map((timestamp, index) => ({
            timestamp: timestamp * 1000,
            open: quotes.open[index],
            high: quotes.high[index],
            low: quotes.low[index],
            close: quotes.close[index],
            volume: quotes.volume[index] || 0
        }));
    }

    /**
     * Fetch from Alpha Vantage API
     */
    async fetchFromAlphaVantage(symbol, timeframe, limit) {
        if (!this.dataSources.alpha.apiKey) {
            throw new Error('Alpha Vantage API key not configured');
        }

        const func = this.getAlphaVantageFunction(timeframe);
        const interval = this.convertToAlphaVantageInterval(timeframe);
        
        let url = `${this.dataSources.alpha.baseUrl}?function=${func}&symbol=${symbol}&apikey=${this.dataSources.alpha.apiKey}`;
        
        if (interval) {
            url += `&interval=${interval}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Alpha Vantage API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data['Error Message']) {
            throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
        }
        
        // Extract time series data
        const timeSeriesKey = Object.keys(data).find(key => key.startsWith('Time Series'));
        if (!timeSeriesKey) {
            throw new Error('No time series data found in Alpha Vantage response');
        }
        
        const timeSeries = data[timeSeriesKey];
        
        return Object.entries(timeSeries)
            .slice(0, limit)
            .map(([timestamp, values]) => ({
                timestamp: new Date(timestamp).getTime(),
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                close: parseFloat(values['4. close']),
                volume: parseFloat(values['5. volume'] || 0)
            }));
    }

    // Symbol conversion methods
    convertToBinanceSymbol(symbol) {
        const conversions = {
            'EURUSD': 'EURUSDT', // Binance doesn't have EURUSD directly
            'GBPUSD': 'GBPUSDT',
            'USDJPY': 'USDTJPY',
            'BTCUSD': 'BTCUSDT',
            'ETHUSD': 'ETHUSDT'
        };
        
        return conversions[symbol] || symbol;
    }

    convertToYahooSymbol(symbol) {
        const conversions = {
            'EURUSD': 'EURUSD=X',
            'GBPUSD': 'GBPUSD=X',
            'USDJPY': 'USDJPY=X',
            'BTCUSD': 'BTC-USD',
            'ETHUSD': 'ETH-USD'
        };
        
        return conversions[symbol] || symbol;
    }

    // Interval conversion methods
    convertToBinanceInterval(timeframe) {
        const intervals = {
            '1M': '1m',
            '3M': '3m',
            '5M': '5m',
            '15M': '15m',
            '30M': '30m',
            '1H': '1h',
            '2H': '2h',
            '4H': '4h',
            '6H': '6h',
            '8H': '8h',
            '12H': '12h',
            '1D': '1d',
            '3D': '3d',
            '1W': '1w',
            '1M': '1M'
        };
        
        return intervals[timeframe] || '5m';
    }

    convertToTwelveDataInterval(timeframe) {
        const intervals = {
            '1M': '1min',
            '5M': '5min',
            '15M': '15min',
            '30M': '30min',
            '1H': '1h',
            '4H': '4h',
            '1D': '1day',
            '1W': '1week',
            '1M': '1month'
        };
        
        return intervals[timeframe] || '5min';
    }

    convertToYahooInterval(timeframe) {
        const intervals = {
            '1M': '1m',
            '2M': '2m',
            '5M': '5m',
            '15M': '15m',
            '30M': '30m',
            '1H': '1h',
            '1D': '1d',
            '5D': '5d',
            '1W': '1wk',
            '1M': '1mo',
            '3M': '3mo'
        };
        
        return intervals[timeframe] || '5m';
    }

    convertToAlphaVantageInterval(timeframe) {
        const intervals = {
            '1M': '1min',
            '5M': '5min',
            '15M': '15min',
            '30M': '30min',
            '1H': '60min'
        };
        
        return intervals[timeframe] || '5min';
    }

    getAlphaVantageFunction(timeframe) {
        if (['1M', '5M', '15M', '30M', '1H'].includes(timeframe)) {
            return 'TIME_SERIES_INTRADAY';
        } else if (timeframe === '1D') {
            return 'TIME_SERIES_DAILY';
        } else if (timeframe === '1W') {
            return 'TIME_SERIES_WEEKLY';
        } else if (timeframe === '1M') {
            return 'TIME_SERIES_MONTHLY';
        }
        
        return 'TIME_SERIES_INTRADAY';
    }

    getIntervalSeconds(timeframe) {
        const seconds = {
            '1M': 60,
            '3M': 180,
            '5M': 300,
            '15M': 900,
            '30M': 1800,
            '1H': 3600,
            '2H': 7200,
            '4H': 14400,
            '1D': 86400,
            '1W': 604800
        };
        
        return seconds[timeframe] || 300;
    }

    // Rate limiting and caching
    canMakeRequest(source) {
        const now = Date.now();
        const lastRequest = this.lastRequestTime.get(source) || 0;
        const rateLimit = this.dataSources[source].rateLimit;
        const requestCount = this.requestCounts.get(source) || 0;
        
        // Reset counter every minute
        if (now - lastRequest > 60000) {
            this.requestCounts.set(source, 0);
        }
        
        return requestCount < rateLimit;
    }

    updateRequestCount(source) {
        const current = this.requestCounts.get(source) || 0;
        this.requestCounts.set(source, current + 1);
        this.lastRequestTime.set(source, Date.now());
    }

    isCacheValid(cacheKey, maxAge) {
        const cached = this.cache.get(cacheKey);
        if (!cached || !cached.timestamp) return false;
        
        return Date.now() - cached.timestamp < maxAge;
    }

    // Configuration methods
    setApiKey(source, apiKey) {
        if (this.dataSources[source]) {
            this.dataSources[source].apiKey = apiKey;
        }
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OHLCVFetcher;
} else {
    window.OHLCVFetcher = OHLCVFetcher;
}