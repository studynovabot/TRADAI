/**
 * Serverless OTC Signal Generator
 *
 * Production-ready version using REAL market data APIs
 * NO SYNTHETIC DATA - ALL SIGNALS FROM AUTHENTIC MARKET SOURCES
 */

const axios = require('axios');

class ServerlessOTCGenerator {
    constructor(config = {}) {
        this.config = {
            minConfidence: config.minConfidence || 75,
            maxProcessingTime: config.maxProcessingTime || 30000,
            strictMode: true,
            ...config
        };

        // Real market data API configuration
        this.apiKey = process.env.TWELVE_DATA_API_KEY || '';
        this.baseUrl = 'https://api.twelvedata.com';

        this.isInitialized = false;
        this.lastSignalTime = 0;
        this.signalCooldown = 5000; // 5 seconds between signals

        // Cache for market data (short-term to avoid repeated API calls)
        this.dataCache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Serverless OTC Generator...');
            this.isInitialized = true;
            console.log('✅ Serverless OTC Generator initialized');

            return {
                success: true,
                mode: 'serverless',
                strictMode: this.config.strictMode,
                dataSource: 'real'
            };

        } catch (error) {
            console.error('❌ Failed to initialize serverless OTC generator:', error);
            throw new Error(`Initialization failed: ${error.message}`);
        }
    }

    async generateSignal(params) {
        try {
            const startTime = Date.now();
            console.log('🎯 Generating OTC signal...');

            // Validate rate limiting
            const now = Date.now();
            if (now - this.lastSignalTime < this.signalCooldown) {
                const waitTime = Math.ceil((this.signalCooldown - (now - this.lastSignalTime)) / 1000);
                return {
                    success: false,
                    signal: 'NO_SIGNAL',
                    confidence: 0,
                    error: 'RATE_LIMITED',
                    message: `Please wait ${waitTime} seconds before generating another signal`,
                    processingTime: Date.now() - startTime
                };
            }

            // Extract parameters
            const {
                currencyPair = 'USD/EUR',
                timeframe = '5m',
                tradeDuration = '3',
                platform = 'quotex'
            } = params;

            console.log(`📊 Analyzing ${currencyPair} on ${timeframe} timeframe for ${tradeDuration}min trade`);

            // Generate signal using REAL technical analysis
            const signal = await this.generateTechnicalSignal(currencyPair, timeframe, tradeDuration);

            // Enhance metadata with additional fields (don't override existing metadata)
            if (signal.metadata) {
                signal.metadata = {
                    ...signal.metadata, // Preserve existing metadata from generator
                    currencyPair,
                    timeframe,
                    tradeDuration,
                    platform
                };
            }

            signal.processingTime = Date.now() - startTime;
            this.lastSignalTime = now;

            console.log(`✅ Generated ${signal.signal} signal with ${signal.confidence}% confidence`);
            return signal;

        } catch (error) {
            console.error('❌ Error generating OTC signal:', error);
            return {
                success: false,
                signal: 'ERROR',
                confidence: 0,
                error: 'GENERATION_ERROR',
                message: error.message,
                processingTime: Date.now() - startTime,
                metadata: {
                    dataSource: 'real',
                    strictMode: true,
                    error: true
                }
            };
        }
    }

    async generateTechnicalSignal(currencyPair, timeframe, tradeDuration) {
        console.log('🔍 Performing REAL technical analysis with market data...');

        try {
            // Fetch REAL market data from API
            const marketData = await this.fetchRealMarketData(currencyPair, timeframe);

            if (!marketData || marketData.length < 20) {
                throw new Error(`Insufficient real market data for ${currencyPair}`);
            }

            // Calculate REAL technical indicators from market data
            const technicalIndicators = this.calculateRealTechnicalIndicators(marketData);

            // Perform authentic technical analysis
            const analysis = this.performRealTechnicalAnalysis(technicalIndicators, marketData);

            // Generate signal based on real analysis
            return this.generateSignalFromRealAnalysis(analysis, currencyPair, timeframe, tradeDuration, technicalIndicators);

        } catch (error) {
            console.error('❌ Real technical analysis failed:', error);

            // In strict mode, we NEVER fall back to synthetic data
            if (this.config.strictMode) {
                return {
                    success: false,
                    signal: 'NO_SIGNAL',
                    confidence: 0,
                    error: 'REAL_DATA_UNAVAILABLE',
                    message: `Real market data unavailable for ${currencyPair}: ${error.message}`,
                    analysis: 'Unable to perform analysis without real market data',
                    qualityGrade: 'F',
                    riskScore: 'HIGH',
                    technicalIndicators: null,
                    strictMode: true,
                    dataSource: 'none'
                };
            }

            throw error;
        }
    }

    /**
     * Fetch REAL market data from TwelveData API
     */
    async fetchRealMarketData(currencyPair, timeframe) {
        console.log(`📡 Fetching REAL market data for ${currencyPair} ${timeframe}...`);

        // Check cache first
        const cacheKey = `${currencyPair}_${timeframe}`;
        const cached = this.dataCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            console.log('📊 Using cached real market data');
            return cached.data;
        }

        try {
            // Convert timeframe to TwelveData format
            const interval = this.convertTimeframe(timeframe);

            // Convert currency pair to TwelveData format
            const symbol = this.convertCurrencyPair(currencyPair);

            const response = await axios.get(`${this.baseUrl}/time_series`, {
                params: {
                    symbol: symbol,
                    interval: interval,
                    outputsize: 50,
                    apikey: this.apiKey,
                    format: 'json'
                },
                timeout: 10000
            });

            if (response.data.status === 'error') {
                throw new Error(`TwelveData API Error: ${response.data.message}`);
            }

            if (!response.data.values || !Array.isArray(response.data.values)) {
                throw new Error('Invalid data format from TwelveData API');
            }

            // Convert to standard OHLCV format
            const marketData = response.data.values.map(item => ({
                timestamp: new Date(item.datetime).getTime(),
                open: parseFloat(item.open),
                high: parseFloat(item.high),
                low: parseFloat(item.low),
                close: parseFloat(item.close),
                volume: parseFloat(item.volume) || 1000
            })).reverse(); // Reverse to get chronological order

            // Cache the data
            this.dataCache.set(cacheKey, {
                data: marketData,
                timestamp: Date.now()
            });

            console.log(`✅ Fetched ${marketData.length} real candles for ${currencyPair}`);
            return marketData;

        } catch (error) {
            console.error(`❌ Failed to fetch real market data: ${error.message}`);
            throw new Error(`Real market data fetch failed: ${error.message}`);
        }
    }

    /**
     * Calculate REAL technical indicators from market data
     */
    calculateRealTechnicalIndicators(marketData) {
        console.log('📊 Calculating REAL technical indicators...');

        const closes = marketData.map(candle => candle.close);
        const highs = marketData.map(candle => candle.high);
        const lows = marketData.map(candle => candle.low);
        const volumes = marketData.map(candle => candle.volume);

        // Calculate REAL RSI
        const rsi = this.calculateRSI(closes, 14);
        const currentRSI = rsi[rsi.length - 1] || 50;

        // Calculate REAL MACD
        const macd = this.calculateMACD(closes);
        const currentMACD = macd[macd.length - 1] || { macd: 0, signal: 0, histogram: 0 };

        // Calculate REAL moving averages
        const sma20 = this.calculateSMA(closes, 20);
        const sma50 = this.calculateSMA(closes, 50);
        const currentSMA20 = sma20[sma20.length - 1] || closes[closes.length - 1];
        const currentSMA50 = sma50[sma50.length - 1] || closes[closes.length - 1];

        // Calculate REAL Bollinger Bands
        const bb = this.calculateBollingerBands(closes, 20, 2);
        const currentBB = bb[bb.length - 1] || { upper: 0, middle: 0, lower: 0 };

        // Determine REAL trend from price action
        const currentPrice = closes[closes.length - 1];
        const previousPrice = closes[closes.length - 2];
        const priceChange = currentPrice - previousPrice;

        let trend = 'neutral';
        if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50) {
            trend = 'bullish';
        } else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50) {
            trend = 'bearish';
        }

        // Calculate REAL volatility
        const volatility = this.calculateVolatility(closes);

        return {
            rsi: currentRSI,
            macd: currentMACD,
            sma20: currentSMA20,
            sma50: currentSMA50,
            bollingerBands: currentBB,
            trend: trend,
            volatility: volatility,
            currentPrice: currentPrice,
            priceChange: priceChange,
            volume: volumes[volumes.length - 1],
            dataSource: 'real_market_data',
            timestamp: Date.now()
        };
    }

    /**
     * Perform REAL technical analysis using calculated indicators
     */
    performRealTechnicalAnalysis(indicators, marketData) {
        console.log('🔍 Performing REAL technical analysis...');

        const analysis = {
            signals: [],
            strength: 0,
            confidence: 0,
            reasons: []
        };

        // RSI Analysis (REAL)
        if (indicators.rsi < 30) {
            analysis.signals.push({ type: 'bullish', strength: 2, reason: `RSI(${indicators.rsi.toFixed(1)}) oversold` });
        } else if (indicators.rsi > 70) {
            analysis.signals.push({ type: 'bearish', strength: 2, reason: `RSI(${indicators.rsi.toFixed(1)}) overbought` });
        }

        // MACD Analysis (REAL)
        if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
            analysis.signals.push({ type: 'bullish', strength: 1.5, reason: 'MACD bullish crossover' });
        } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
            analysis.signals.push({ type: 'bearish', strength: 1.5, reason: 'MACD bearish crossover' });
        }

        // Moving Average Analysis (REAL)
        if (indicators.currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50) {
            analysis.signals.push({ type: 'bullish', strength: 1, reason: 'Price above MA20 > MA50' });
        } else if (indicators.currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50) {
            analysis.signals.push({ type: 'bearish', strength: 1, reason: 'Price below MA20 < MA50' });
        }

        // Bollinger Bands Analysis (REAL)
        if (indicators.currentPrice <= indicators.bollingerBands.lower) {
            analysis.signals.push({ type: 'bullish', strength: 1.5, reason: 'Price at lower Bollinger Band' });
        } else if (indicators.currentPrice >= indicators.bollingerBands.upper) {
            analysis.signals.push({ type: 'bearish', strength: 1.5, reason: 'Price at upper Bollinger Band' });
        }

        // Price Action Analysis (REAL)
        if (indicators.priceChange > 0) {
            analysis.signals.push({ type: 'bullish', strength: 0.5, reason: 'Positive price momentum' });
        } else if (indicators.priceChange < 0) {
            analysis.signals.push({ type: 'bearish', strength: 0.5, reason: 'Negative price momentum' });
        }

        // Calculate total signal strength
        const bullishStrength = analysis.signals
            .filter(s => s.type === 'bullish')
            .reduce((sum, s) => sum + s.strength, 0);

        const bearishStrength = analysis.signals
            .filter(s => s.type === 'bearish')
            .reduce((sum, s) => sum + s.strength, 0);

        analysis.bullishStrength = bullishStrength;
        analysis.bearishStrength = bearishStrength;
        analysis.totalStrength = bullishStrength + bearishStrength;
        analysis.reasons = analysis.signals.map(s => s.reason);

        console.log(`📊 Real analysis: Bullish=${bullishStrength}, Bearish=${bearishStrength}`);

        return analysis;
    }

    /**
     * Generate signal from REAL technical analysis
     */
    generateSignalFromRealAnalysis(analysis, currencyPair, timeframe, tradeDuration, indicators) {
        console.log('🎯 Generating signal from REAL analysis...');

        let signal = 'NO_SIGNAL';
        let confidence = 0;

        // Determine signal direction based on REAL analysis
        if (analysis.bullishStrength > analysis.bearishStrength && analysis.totalStrength >= 2) {
            signal = 'CALL';
            confidence = Math.min(95, 60 + (analysis.bullishStrength / analysis.totalStrength) * 35);
        } else if (analysis.bearishStrength > analysis.bullishStrength && analysis.totalStrength >= 2) {
            signal = 'PUT';
            confidence = Math.min(95, 60 + (analysis.bearishStrength / analysis.totalStrength) * 35);
        }

        // Apply strict mode validation
        const originalConfidence = confidence;
        if (this.config.strictMode && originalConfidence < this.config.minConfidence) {
            signal = 'NO_SIGNAL';
            confidence = 0;
            analysis.reasons.push(`Strict mode: confidence ${originalConfidence.toFixed(1)}% below ${this.config.minConfidence}%`);
        }

        // Add timestamp variation to ensure uniqueness
        const timestamp = Date.now();
        const uniqueId = `${currencyPair}_${timeframe}_${timestamp}`;

        return {
            success: signal !== 'NO_SIGNAL',
            signal,
            confidence: Math.round(confidence),
            direction: signal,
            analysis: analysis.reasons.join(' + ') || 'Real technical analysis completed',
            qualityGrade: this.calculateQualityGrade(confidence, analysis.totalStrength),
            riskScore: this.calculateRiskScore(confidence),
            technicalIndicators: {
                rsi: indicators?.rsi,
                macd: indicators?.macd,
                trend: indicators?.trend,
                volatility: indicators?.volatility,
                dataSource: 'real_market_data'
            },
            strictMode: this.config.strictMode,
            metadata: {
                dataSource: 'real',
                strictMode: this.config.strictMode,
                analysisMethod: 'real_technical_indicators',
                uniqueId: uniqueId,
                timestamp: new Date().toISOString(),
                bullishStrength: analysis.bullishStrength,
                bearishStrength: analysis.bearishStrength,
                totalStrength: analysis.totalStrength
            }
        };
    }

    /**
     * Calculate REAL RSI from price data
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return [50]; // Default if insufficient data

        const rsi = [];
        const gains = [];
        const losses = [];

        // Calculate initial gains and losses
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }

        // Calculate RSI
        for (let i = period - 1; i < gains.length; i++) {
            const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
        }

        return rsi;
    }

    /**
     * Calculate REAL MACD from price data
     */
    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) return [{ macd: 0, signal: 0, histogram: 0 }];

        const ema12 = this.calculateEMA(prices, fastPeriod);
        const ema26 = this.calculateEMA(prices, slowPeriod);

        const macdLine = [];
        for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
            macdLine.push(ema12[i] - ema26[i]);
        }

        const signalLine = this.calculateEMA(macdLine, signalPeriod);

        const histogram = [];
        for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
            histogram.push({
                macd: macdLine[i],
                signal: signalLine[i],
                histogram: macdLine[i] - signalLine[i]
            });
        }

        return histogram;
    }

    /**
     * Calculate REAL EMA (Exponential Moving Average)
     */
    calculateEMA(prices, period) {
        if (prices.length < period) return prices.slice();

        const ema = [];
        const multiplier = 2 / (period + 1);

        // Start with SMA for first value
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        ema.push(sum / period);

        // Calculate EMA for remaining values
        for (let i = period; i < prices.length; i++) {
            ema.push((prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier)));
        }

        return ema;
    }

    /**
     * Calculate REAL SMA (Simple Moving Average)
     */
    calculateSMA(prices, period) {
        if (prices.length < period) return prices.slice();

        const sma = [];
        for (let i = period - 1; i < prices.length; i++) {
            const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            sma.push(sum / period);
        }

        return sma;
    }

    /**
     * Calculate REAL Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(prices, period);
        const bands = [];

        for (let i = 0; i < sma.length; i++) {
            const dataSlice = prices.slice(i, i + period);
            const mean = sma[i];
            const variance = dataSlice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);

            bands.push({
                upper: mean + (standardDeviation * stdDev),
                middle: mean,
                lower: mean - (standardDeviation * stdDev)
            });
        }

        return bands;
    }

    /**
     * Calculate REAL volatility
     */
    calculateVolatility(prices, period = 20) {
        if (prices.length < period) return 0;

        const returns = [];
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
        }

        const recentReturns = returns.slice(-period);
        const mean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
        const variance = recentReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / recentReturns.length;

        return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
    }

    /**
     * Convert timeframe to TwelveData format
     */
    convertTimeframe(timeframe) {
        const mapping = {
            '1m': '1min',
            '3m': '3min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '1h',
            '4h': '4h',
            '1d': '1day'
        };

        return mapping[timeframe.toLowerCase()] || '5min';
    }

    /**
     * Convert currency pair to TwelveData format
     */
    convertCurrencyPair(pair) {
        // Handle OTC pairs
        const otcMapping = {
            'USD/PKR': 'USD/PKR',
            'USD/DZD': 'USD/DZD',
            'EUR/USD': 'EUR/USD',
            'GBP/USD': 'GBP/USD',
            'USD/JPY': 'USD/JPY',
            'AUD/USD': 'AUD/USD'
        };

        return otcMapping[pair] || pair;
    }

    calculateQualityGrade(confidence, signalStrength) {
        if (confidence >= 90 && signalStrength >= 3) return 'A+';
        if (confidence >= 85 && signalStrength >= 2.5) return 'A';
        if (confidence >= 80 && signalStrength >= 2) return 'B+';
        if (confidence >= 75 && signalStrength >= 1.5) return 'B';
        return 'C';
    }

    calculateRiskScore(confidence) {
        if (confidence >= 85) return 'LOW';
        if (confidence >= 75) return 'MEDIUM';
        return 'HIGH';
    }
}

module.exports = { ServerlessOTCGenerator };
