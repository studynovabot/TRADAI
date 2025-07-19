/**
 * AI Candle Sniper - Background Service Worker
 * Handles data processing, API calls, and AI communication
 */

// Import background modules
import './background/background-module.js';

// Main engine class
class CandleSniperEngine {
    constructor() {
        this.isAnalyzing = false;
        this.currentTabId = null;
        this.analysisInterval = null;
        this.marketData = {};
        this.aiEndpoint = null; // Will be configured for cloud AI
        
        // Enhanced components - will be initialized later
        this.aiModel = null;
        this.patternRecognition = null;
        this.disciplineEngine = null;
        this.riskManager = null;
        this.signalHistory = [];
        
        // Trade history and management
        this.tradeHistory = [];
        this.currentSignal = null;
        this.lastTradeTimestamp = 0;
        this.tradeCooldownMs = 5 * 60 * 1000; // 5 minutes default
        this.maxTradesPerDay = 5; // Default max trades per day
        this.consecutiveLosses = 0;
        this.maxConsecutiveLosses = 3; // Stop after 3 consecutive losses
        this.emergencyStopActive = false;
        
        // OTC specific properties
        this.otcMode = false;
        this.otcData = {};
        
        this.init();
    }

    async init() {
        console.log('[Candle Sniper] 🚀 Initializing enhanced background engine...');
        
        this.setupMessageListeners();
        await this.loadConfiguration();
        await this.initializeAIComponents();
        await this.initializeManagementComponents();
        this.loadSignalHistory();
        await this.loadTradeHistory();
        await this.loadTradeSettings();
        
        console.log('[Candle Sniper] ✅ Enhanced background engine ready');
    }
    
    // Add OTC-specific methods
    
    /**
     * Handle OTC mode activation
     */
    async activateOTCMode(data) {
        console.log('[Candle Sniper] 🔄 Activating OTC mode:', data);
        
        this.otcMode = true;
        
        // Notify popup
        this.sendMessageToPopup({
            type: 'OTC_MODE_ACTIVATED',
            data: {
                timestamp: Date.now(),
                ...data
            }
        });
        
        // Request OTC extraction status
        const status = await this.getOTCExtractionStatus();
        
        if (status && status.isExtracting) {
            console.log('[Candle Sniper] ✅ OTC extraction already active:', status);
        } else {
            console.log('[Candle Sniper] ⚠️ OTC extraction not active, requesting activation');
            
            // Try to activate OTC extraction in the current tab
            if (this.currentTabId) {
                try {
                    await chrome.tabs.sendMessage(this.currentTabId, {
                        action: 'startOTCExtraction'
                    });
                    console.log('[Candle Sniper] ✅ OTC extraction activation requested');
                } catch (error) {
                    console.error('[Candle Sniper] ❌ Error requesting OTC extraction:', error);
                }
            }
        }
        
        return { success: true, otcMode: true };
    }
    
    /**
     * Handle OTC mode deactivation
     */
    deactivateOTCMode() {
        console.log('[Candle Sniper] 🔄 Deactivating OTC mode');
        
        this.otcMode = false;
        
        // Notify popup
        this.sendMessageToPopup({
            type: 'OTC_MODE_DEACTIVATED',
            data: {
                timestamp: Date.now()
            }
        });
        
        // Try to deactivate OTC extraction in the current tab
        if (this.currentTabId) {
            try {
                chrome.tabs.sendMessage(this.currentTabId, {
                    action: 'stopOTCExtraction'
                });
                console.log('[Candle Sniper] ✅ OTC extraction deactivation requested');
            } catch (error) {
                console.error('[Candle Sniper] ❌ Error requesting OTC extraction deactivation:', error);
            }
        }
        
        return { success: true, otcMode: false };
    }
    
    /**
     * Get OTC extraction status
     */
    async getOTCExtractionStatus() {
        try {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getOTCStatus'
                }, (response) => {
                    resolve(response);
                });
            });
        } catch (error) {
            console.error('[Candle Sniper] ❌ Error getting OTC extraction status:', error);
            return { isExtracting: false, error: error.message };
        }
    }
    
    /**
     * Get available OTC pairs
     */
    async getAvailableOTCPairs() {
        try {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getAllOTCPairs'
                }, (response) => {
                    resolve(response);
                });
            });
        } catch (error) {
            console.error('[Candle Sniper] ❌ Error getting available OTC pairs:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get historical OTC data for a specific pair and timeframe
     */
    async getHistoricalOTCData(pair, timeframe) {
        try {
            return new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'getOTCData',
                    pair,
                    timeframe
                }, (response) => {
                    resolve(response);
                });
            });
        } catch (error) {
            console.error('[Candle Sniper] ❌ Error getting historical OTC data:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate OTC signal for a specific pair and timeframe
     */
    async generateOTCSignal(pair, timeframe) {
        console.log(`[Candle Sniper] 🔄 Generating OTC signal for ${pair} ${timeframe}`);
        
        try {
            // Get historical OTC data
            const historicalData = await this.getHistoricalOTCData(pair, timeframe);
            
            if (!historicalData.success) {
                console.error('[Candle Sniper] ❌ Error getting historical OTC data:', historicalData.error);
                return {
                    success: false,
                    error: historicalData.error || 'No historical data available'
                };
            }
            
            // Check if we have enough candles
            if (!historicalData.data || !historicalData.data.candles || historicalData.data.candles.length < 10) {
                console.error('[Candle Sniper] ❌ Not enough historical candles for analysis');
                return {
                    success: false,
                    error: 'Not enough historical candles for analysis'
                };
            }
            
            console.log(`[Candle Sniper] ✅ Got ${historicalData.data.candles.length} historical candles for ${pair} ${timeframe}`);
            
            // Prepare data for analysis
            const candles = historicalData.data.candles;
            
            // Calculate indicators
            const indicators = this.calculateIndicators(candles);
            
            // Detect patterns
            const patterns = this.patternRecognition.detectPatterns(candles, timeframe);
            
            // Prepare market data for AI
            const marketData = {
                pair,
                timeframe,
                candles,
                indicators,
                patterns,
                context: {
                    otcMode: true,
                    broker: historicalData.broker,
                    lastUpdate: historicalData.data.lastUpdate,
                    volatility: this.calculateVolatility(candles)
                }
            };
            
            // Generate prediction using AI
            const prediction = await this.aiModel.predict(marketData);
            
            // Create signal
            const signal = {
                pair,
                timeframe,
                direction: prediction.prediction,
                confidence: prediction.confidence,
                reason: prediction.reason,
                risk: prediction.risk,
                timestamp: Date.now(),
                expiryTime: Date.now() + (5 * 60 * 1000), // 5 minutes expiry
                id: `OTC_${pair}_${timeframe}_${Date.now()}`,
                otcMode: true,
                broker: historicalData.broker,
                indicators,
                patterns: patterns.length,
                candles: candles.length
            };
            
            // Store current signal
            this.currentSignal = signal;
            
            // Add to signal history
            this.signalHistory.unshift(signal);
            if (this.signalHistory.length > 100) {
                this.signalHistory = this.signalHistory.slice(0, 100);
            }
            
            // Save signal history
            this.saveSignalHistory();
            
            // Notify popup
            this.sendMessageToPopup({
                type: 'OTC_SIGNAL_GENERATED',
                data: signal
            });
            
            console.log('[Candle Sniper] ✅ OTC signal generated:', signal);
            
            return {
                success: true,
                signal
            };
            
        } catch (error) {
            console.error('[Candle Sniper] ❌ Error generating OTC signal:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Calculate indicators for candles
     */
    calculateIndicators(candles) {
        try {
            if (!candles || candles.length < 10) {
                return {};
            }
            
            // Extract close prices
            const closes = candles.map(c => c.close);
            const highs = candles.map(c => c.high);
            const lows = candles.map(c => c.low);
            
            // Calculate RSI (last value)
            const rsi = this.calculateRSI(closes, 14);
            
            // Calculate EMAs
            const ema9 = this.calculateEMA(closes, 9);
            const ema21 = this.calculateEMA(closes, 21);
            
            // Calculate MACD
            const macd = this.calculateMACD(closes);
            
            // Calculate Bollinger Bands
            const bb = this.calculateBollingerBands(closes, 20, 2);
            
            return {
                RSI: rsi[rsi.length - 1],
                EMA9: ema9[ema9.length - 1],
                EMA21: ema21[ema21.length - 1],
                MACD: macd.MACD[macd.MACD.length - 1],
                MACDSignal: macd.signal[macd.signal.length - 1],
                MACDHistogram: macd.histogram[macd.histogram.length - 1],
                BBUpper: bb.upper[bb.upper.length - 1],
                BBMiddle: bb.middle[bb.middle.length - 1],
                BBLower: bb.lower[bb.lower.length - 1],
                lastClose: closes[closes.length - 1],
                lastHigh: highs[highs.length - 1],
                lastLow: lows[lows.length - 1]
            };
        } catch (error) {
            console.error('[Candle Sniper] ❌ Error calculating indicators:', error);
            return {};
        }
    }
    
    /**
     * Calculate RSI
     */
    calculateRSI(prices, period = 14) {
        if (!prices || prices.length < period + 1) {
            return Array(prices.length).fill(50);
        }
        
        const rsi = [];
        let gains = 0;
        let losses = 0;
        
        // Calculate first average gain and loss
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change >= 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        // Calculate RSI for first period
        let rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
        
        // Calculate RSI for remaining periods
        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            let currentGain = 0;
            let currentLoss = 0;
            
            if (change >= 0) {
                currentGain = change;
            } else {
                currentLoss = -change;
            }
            
            avgGain = ((avgGain * (period - 1)) + currentGain) / period;
            avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
            
            rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
        
        // Pad beginning with 50 (neutral)
        const padding = Array(prices.length - rsi.length).fill(50);
        return [...padding, ...rsi];
    }
    
    /**
     * Calculate EMA
     */
    calculateEMA(prices, period) {
        if (!prices || prices.length < period) {
            return Array(prices.length).fill(prices[prices.length - 1]);
        }
        
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        // Start with SMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        
        ema.push(sum / period);
        
        // Calculate EMA
        for (let i = period; i < prices.length; i++) {
            ema.push((prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
        }
        
        // Pad beginning with first EMA value
        const padding = Array(prices.length - ema.length).fill(ema[0]);
        return [...padding, ...ema];
    }
    
    /**
     * Calculate MACD
     */
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        
        const macd = ema12.map((value, index) => value - ema26[index]);
        const signal = this.calculateEMA(macd, 9);
        const histogram = macd.map((value, index) => value - signal[index]);
        
        return { MACD: macd, signal, histogram };
    }
    
    /**
     * Calculate Bollinger Bands
     */
    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (!prices || prices.length < period) {
            return {
                upper: Array(prices.length).fill(prices[prices.length - 1] * 1.05),
                middle: Array(prices.length).fill(prices[prices.length - 1]),
                lower: Array(prices.length).fill(prices[prices.length - 1] * 0.95)
            };
        }
        
        const middle = [];
        const upper = [];
        const lower = [];
        
        // Calculate SMA and bands
        for (let i = period - 1; i < prices.length; i++) {
            const slice = prices.slice(i - (period - 1), i + 1);
            const sma = slice.reduce((sum, price) => sum + price, 0) / period;
            
            // Calculate standard deviation
            const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
            const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
            const sd = Math.sqrt(variance);
            
            middle.push(sma);
            upper.push(sma + (stdDev * sd));
            lower.push(sma - (stdDev * sd));
        }
        
        // Pad beginning
        const padding = Array(prices.length - middle.length).fill(null);
        return {
            upper: [...padding.map((_, i) => prices[i] * 1.05), ...upper],
            middle: [...padding.map((_, i) => prices[i]), ...middle],
            lower: [...padding.map((_, i) => prices[i] * 0.95), ...lower]
        };
    }
    
    /**
     * Calculate volatility
     */
    calculateVolatility(candles) {
        if (!candles || candles.length < 10) {
            return 'Normal';
        }
        
        // Calculate average true range
        let atr = 0;
        for (let i = 1; i < candles.length; i++) {
            const tr = Math.max(
                candles[i].high - candles[i].low,
                Math.abs(candles[i].high - candles[i-1].close),
                Math.abs(candles[i].low - candles[i-1].close)
            );
            atr += tr;
        }
        atr /= (candles.length - 1);
        
        // Calculate average price
        const avgPrice = candles.reduce((sum, c) => sum + c.close, 0) / candles.length;
        
        // Calculate volatility as percentage
        const volatilityPercent = (atr / avgPrice) * 100;
        
        if (volatilityPercent < 0.2) return 'Very Low';
        if (volatilityPercent < 0.5) return 'Low';
        if (volatilityPercent < 1.0) return 'Normal';
        if (volatilityPercent < 2.0) return 'High';
        return 'Very High';
    }
    
    // Add these methods to the existing message handler
    
    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Handle OTC-specific messages
            if (message.action === 'activateOTCMode') {
                this.activateOTCMode(message.data).then(sendResponse);
                return true;
            }
            
            if (message.action === 'deactivateOTCMode') {
                sendResponse(this.deactivateOTCMode());
                return true;
            }
            
            if (message.action === 'generateOTCSignal') {
                this.generateOTCSignal(message.pair, message.timeframe).then(sendResponse);
                return true;
            }
            
            // Handle other messages as before
            // ...
            
            return true;
        });
    }
}

// Initialize the engine
const engine = new CandleSniperEngine();

// Make it available globally
globalThis.candleSniperEngine = engine;