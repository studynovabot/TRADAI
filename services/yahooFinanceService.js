/**
 * Yahoo Finance API Service
 * 
 * Provides historical chart data and real-time market data
 * for comprehensive forex and OTC signal analysis
 */

const axios = require('axios');

class YahooFinanceService {
    constructor() {
        this.baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
        this.baseUrlV7 = 'https://query1.finance.yahoo.com/v7/finance/quote';
        this.rateLimitDelay = 1000; // 1 second between requests
        this.lastRequestTime = 0;
    }

    /**
     * Get historical OHLCV data for a symbol
     */
    async getHistoricalData(symbol, period = '1d', interval = '5m', range = '1d') {
        try {
            await this.respectRateLimit();
            
            console.log(`📊 Fetching Yahoo Finance data for ${symbol}...`);
            
            // Convert forex pairs to Yahoo Finance format
            const yahooSymbol = this.convertToYahooSymbol(symbol);
            
            const response = await axios.get(`${this.baseUrl}/${yahooSymbol}`, {
                params: {
                    period1: this.getPeriodTimestamp(range),
                    period2: Math.floor(Date.now() / 1000),
                    interval: interval,
                    includePrePost: false,
                    events: 'div,splits'
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.data || !response.data.chart || !response.data.chart.result) {
                throw new Error('Invalid response format from Yahoo Finance');
            }

            const result = response.data.chart.result[0];
            
            if (!result.timestamp || !result.indicators || !result.indicators.quote) {
                throw new Error('No market data available for this symbol');
            }

            // Convert to standard OHLCV format
            const ohlcvData = this.convertToOHLCV(result);
            
            console.log(`✅ Fetched ${ohlcvData.length} data points for ${symbol}`);
            return ohlcvData;

        } catch (error) {
            console.error(`❌ Yahoo Finance API error for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch data from Yahoo Finance: ${error.message}`);
        }
    }

    /**
     * Get real-time quote data
     */
    async getRealTimeQuote(symbol) {
        try {
            await this.respectRateLimit();
            
            console.log(`📈 Fetching real-time quote for ${symbol}...`);
            
            const yahooSymbol = this.convertToYahooSymbol(symbol);
            
            const response = await axios.get(this.baseUrlV7, {
                params: {
                    symbols: yahooSymbol,
                    fields: 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime,regularMarketVolume'
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.data || !response.data.quoteResponse || !response.data.quoteResponse.result) {
                throw new Error('Invalid quote response format');
            }

            const quote = response.data.quoteResponse.result[0];
            
            if (!quote) {
                throw new Error('No quote data available');
            }

            const quoteData = {
                symbol: symbol,
                price: quote.regularMarketPrice,
                change: quote.regularMarketChange,
                changePercent: quote.regularMarketChangePercent,
                volume: quote.regularMarketVolume,
                timestamp: new Date(quote.regularMarketTime * 1000).toISOString(),
                source: 'yahoo_finance'
            };

            console.log(`✅ Real-time quote for ${symbol}: $${quoteData.price}`);
            return quoteData;

        } catch (error) {
            console.error(`❌ Yahoo Finance quote error for ${symbol}:`, error.message);
            throw new Error(`Failed to fetch quote from Yahoo Finance: ${error.message}`);
        }
    }

    /**
     * Get multiple timeframe data for comprehensive analysis
     */
    async getMultiTimeframeData(symbol, timeframes = ['5m', '15m', '1h']) {
        try {
            console.log(`📊 Fetching multi-timeframe data for ${symbol}...`);
            
            const data = {};
            
            for (const timeframe of timeframes) {
                try {
                    const range = this.getOptimalRange(timeframe);
                    data[timeframe] = await this.getHistoricalData(symbol, '1d', timeframe, range);
                    
                    // Add delay between requests
                    await this.sleep(this.rateLimitDelay);
                    
                } catch (error) {
                    console.warn(`⚠️ Failed to fetch ${timeframe} data for ${symbol}: ${error.message}`);
                    data[timeframe] = null;
                }
            }

            console.log(`✅ Multi-timeframe data fetched for ${symbol}`);
            return data;

        } catch (error) {
            console.error(`❌ Multi-timeframe data error for ${symbol}:`, error.message);
            throw error;
        }
    }

    /**
     * Convert symbol to Yahoo Finance format
     */
    convertToYahooSymbol(symbol) {
        // Handle forex pairs
        const forexMap = {
            'EUR/USD': 'EURUSD=X',
            'GBP/USD': 'GBPUSD=X',
            'USD/JPY': 'USDJPY=X',
            'AUD/USD': 'AUDUSD=X',
            'USD/CAD': 'USDCAD=X',
            'USD/CHF': 'USDCHF=X',
            'NZD/USD': 'NZDUSD=X',
            'EUR/GBP': 'EURGBP=X',
            'EUR/JPY': 'EURJPY=X',
            'GBP/JPY': 'GBPJPY=X',
            'USD/PKR': 'USDPKR=X',
            'USD/DZD': 'USDDZD=X'
        };

        return forexMap[symbol] || symbol;
    }

    /**
     * Convert Yahoo Finance data to standard OHLCV format
     */
    convertToOHLCV(result) {
        const timestamps = result.timestamp;
        const quote = result.indicators.quote[0];
        
        const ohlcvData = [];
        
        for (let i = 0; i < timestamps.length; i++) {
            if (quote.open[i] !== null && quote.high[i] !== null && 
                quote.low[i] !== null && quote.close[i] !== null) {
                
                ohlcvData.push({
                    timestamp: new Date(timestamps[i] * 1000).toISOString(),
                    open: parseFloat(quote.open[i]),
                    high: parseFloat(quote.high[i]),
                    low: parseFloat(quote.low[i]),
                    close: parseFloat(quote.close[i]),
                    volume: parseFloat(quote.volume[i]) || 0
                });
            }
        }
        
        return ohlcvData;
    }

    /**
     * Get period timestamp for range
     */
    getPeriodTimestamp(range) {
        const now = Math.floor(Date.now() / 1000);
        
        switch (range) {
            case '1d': return now - (24 * 60 * 60);
            case '5d': return now - (5 * 24 * 60 * 60);
            case '1mo': return now - (30 * 24 * 60 * 60);
            case '3mo': return now - (90 * 24 * 60 * 60);
            case '6mo': return now - (180 * 24 * 60 * 60);
            case '1y': return now - (365 * 24 * 60 * 60);
            default: return now - (24 * 60 * 60);
        }
    }

    /**
     * Get optimal range for timeframe
     */
    getOptimalRange(timeframe) {
        switch (timeframe) {
            case '1m':
            case '2m':
            case '5m': return '1d';
            case '15m':
            case '30m': return '5d';
            case '1h': return '1mo';
            case '1d': return '1y';
            default: return '1d';
        }
    }

    /**
     * Rate limiting
     */
    async respectRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const waitTime = this.rateLimitDelay - timeSinceLastRequest;
            await this.sleep(waitTime);
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test connection to Yahoo Finance
     */
    async testConnection() {
        try {
            await this.getRealTimeQuote('EUR/USD');
            return true;
        } catch (error) {
            console.warn('⚠️ Yahoo Finance connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Get supported symbols
     */
    getSupportedSymbols() {
        return [
            'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF',
            'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'USD/PKR', 'USD/DZD'
        ];
    }
}

module.exports = { YahooFinanceService };
