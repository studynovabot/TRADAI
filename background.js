/**
 * AI Candle Sniper - Background Service Worker
 * Handles data processing, API calls, and AI communication
 */

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
        
        // Initialize OTC mode handler
        await this.initializeOTCMode();
        
        console.log('[Candle Sniper] ✅ Enhanced background engine ready');
    }
    
    /**
     * Initialize OTC mode components
     */
    async initializeOTCMode() {
        try {
            console.log('[Candle Sniper] Initializing OTC mode...');
            
            // Import OTC handler
            // Note: In a real extension, this would be imported at the top of the file
            // or included in the manifest.json as a background script
            
            // For now, we'll assume the OTC handler is already loaded
            // and available as a global variable
            
            // Set up OTC data listener
            this.setupOTCDataListener();
            
            console.log('[Candle Sniper] OTC mode initialized');
        } catch (error) {
            console.error('[Candle Sniper] Error initializing OTC mode:', error);
        }
    }
    
    /**
     * Set up listener for OTC data from content scripts
     */
    setupOTCDataListener() {
        // Listen for OTC data events from content scripts
        chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
            try {
                if (message && message.type === 'OTC_DATA') {
                    // Process OTC data with error handling
                    if (window.otcModeHandler) {
                        await window.otcModeHandler.processOTCData(message.data);
                        sendResponse({ success: true });
                    } else {
                        console.error('[Background] OTC mode handler not available');
                        sendResponse({ success: false, error: 'OTC mode handler not available' });
                    }
                    return true;
                }
                
                // Handle OTC offline mode
                if (message && message.action === 'OTC_OFFLINE_MODE') {
                    console.log('[Background] OTC offline mode activated:', message.data);
                    // Handle offline mode logic here
                    sendResponse({ success: true });
                    return true;
                }
                
                return false;
            } catch (error) {
                console.error('[Background] Error in OTC data listener:', error);
                
                // Use error handler if available
                if (window.otcErrorHandler) {
                    await window.otcErrorHandler.handleError(error, 'SYSTEM', {
                        context: 'otc_data_listener',
                        message: message,
                        sender: sender
                    });
                }
                
                sendResponse({ success: false, error: error.message });
                return true;
            }
        });
    }
    
    async loadTradeHistory() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.local.get(['tradeHistory'], resolve);
            });
            
            if (result.tradeHistory) {
                this.tradeHistory = result.tradeHistory;
                console.log(`[Candle Sniper] Loaded ${this.tradeHistory.length} trade records`);
                
                // Calculate consecutive losses
                this.calculateConsecutiveLosses();
            } else {
                this.tradeHistory = [];
            }
        } catch (error) {
            console.error('[Candle Sniper] Error loading trade history:', error);
            this.tradeHistory = [];
        }
    }
    
    async loadTradeSettings() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.local.get(['tradeSettings', 'candleSniperSettings'], resolve);
            });
            
            if (result.tradeSettings) {
                // Load specific trade settings
                this.tradeCooldownMs = (result.tradeSettings.tradeCooldown || 5) * 60 * 1000;
                this.maxTradesPerDay = result.tradeSettings.maxTradesPerDay || 5;
                this.maxConsecutiveLosses = result.tradeSettings.maxConsecutiveLosses || 3;
                this.emergencyStopActive = result.tradeSettings.emergencyStopActive || false;
                
                console.log('[Candle Sniper] Loaded trade settings:', {
                    cooldown: this.tradeCooldownMs / 60000 + 'min',
                    maxTrades: this.maxTradesPerDay,
                    maxLosses: this.maxConsecutiveLosses,
                    emergencyStop: this.emergencyStopActive
                });
            } else if (result.candleSniperSettings) {
                // Try to load from general settings
                this.tradeCooldownMs = (result.candleSniperSettings.tradeCooldown || 5) * 60 * 1000;
                this.maxTradesPerDay = result.candleSniperSettings.maxTradesPerDay || 5;
                this.emergencyStopActive = result.candleSniperSettings.emergencyStopActive || false;
            }
        } catch (error) {
            console.error('[Candle Sniper] Error loading trade settings:', error);
            // Keep defaults
        }
    }

    async initializeManagementComponents() {
        try {
            console.log('[Candle Sniper] 🔧 Initializing management components...');
            
            // Initialize discipline engine
            this.disciplineEngine = new DisciplineEngine();
            console.log('[Candle Sniper] ✅ Discipline engine initialized');
            
            // Initialize risk manager
            this.riskManager = new RiskManager();
            console.log('[Candle Sniper] ✅ Risk manager initialized');
            
        } catch (error) {
            console.error('[Candle Sniper] Management components error:', error);
            // Create minimal fallbacks
            this.disciplineEngine = { canShowSignal: () => true, recordSignalShown: () => {}, getDisciplineStats: () => ({}) };
            this.riskManager = { calculatePositionSize: () => ({ amount: 2, riskPercent: 2 }), getRiskStats: () => ({}) };
        }
    }

    async initializeAIComponents() {
        try {
            console.log('[Candle Sniper] 🧠 Initializing AI components...');
            
            // In service worker, we use importScripts for loading
            try {
                // Try to load AI integration script
                importScripts(chrome.runtime.getURL('ai-integration.js'));
                console.log('[Candle Sniper] ✅ AI integration loaded');
                
                if (typeof AITradingModel !== 'undefined') {
                    this.aiModel = new AITradingModel();
                    console.log('[Candle Sniper] ✅ AI model initialized');
                }
            } catch (e) {
                console.log('[Candle Sniper] ⚠️ AI integration not available, using fallback');
                this.aiModel = this.createFallbackAI();
            }
            
            try {
                // Try to load pattern recognition
                importScripts(chrome.runtime.getURL('utils/advanced-patterns.js'));
                console.log('[Candle Sniper] ✅ Pattern recognition loaded');
                
                if (typeof AdvancedPatternRecognition !== 'undefined') {
                    this.patternRecognition = new AdvancedPatternRecognition();
                    console.log('[Candle Sniper] ✅ Pattern recognition initialized');
                }
            } catch (e) {
                console.log('[Candle Sniper] ⚠️ Pattern recognition not available, using fallback');
                this.patternRecognition = this.createFallbackPatterns();
            }
            
            console.log('[Candle Sniper] 🧠 AI components initialization complete');
            
        } catch (error) {
            console.error('[Candle Sniper] AI initialization failed:', error);
            // Create fallback systems
            this.aiModel = this.createFallbackAI();
            this.patternRecognition = this.createFallbackPatterns();
        }
    }

    createFallbackAI() {
        console.log('[Candle Sniper] 🔧 Creating fallback AI system');
        
        return {
            predict: async (marketData) => {
                try {
                    console.log('[Candle Sniper] 🎯 Generating fallback prediction');
                    
                    const indicators = marketData.indicators || {};
                    let direction = 'NEUTRAL';
                    let confidence = 60;
                    let reasons = [];
                    
                    // Simple RSI logic
                    if (indicators.RSI) {
                        if (indicators.RSI < 30) {
                            direction = 'UP';
                            confidence += 15;
                            reasons.push('RSI oversold');
                        } else if (indicators.RSI > 70) {
                            direction = 'DOWN';
                            confidence += 15;
                            reasons.push('RSI overbought');
                        }
                    }
                    
                    // Simple EMA logic
                    if (indicators.EMA9 && indicators.EMA21) {
                        if (indicators.EMA9 > indicators.EMA21 * 1.001) {
                            if (direction === 'NEUTRAL') direction = 'UP';
                            confidence += 10;
                            reasons.push('EMA bullish');
                        } else if (indicators.EMA9 < indicators.EMA21 * 0.999) {
                            if (direction === 'NEUTRAL') direction = 'DOWN';
                            confidence += 10;
                            reasons.push('EMA bearish');
                        }
                    }
                    
                    // Pattern influence
                    const patterns = marketData.patterns || [];
                    const bullishPatterns = patterns.filter(p => p.type === 'bullish').length;
                    const bearishPatterns = patterns.filter(p => p.type === 'bearish').length;
                    
                    if (bullishPatterns > bearishPatterns) {
                        if (direction === 'NEUTRAL') direction = 'UP';
                        confidence += bullishPatterns * 5;
                        reasons.push(`${bullishPatterns} bullish patterns`);
                    } else if (bearishPatterns > bullishPatterns) {
                        if (direction === 'NEUTRAL') direction = 'DOWN';
                        confidence += bearishPatterns * 5;
                        reasons.push(`${bearishPatterns} bearish patterns`);
                    }
                    
                    confidence = Math.min(85, Math.max(50, confidence));
                    
                    return {
                        prediction: direction,
                        confidence: Math.round(confidence),
                        reason: reasons.slice(0, 3).join(' + ') || 'Technical analysis',
                        risk: confidence > 75 ? 'Low' : confidence > 65 ? 'Medium' : 'High',
                        volatility: marketData.context?.volatility || 'Normal',
                        timestamp: Date.now(),
                        model_version: 'fallback_v1.0',
                        fallback_mode: true
                    };
                    
                } catch (error) {
                    console.error('[Candle Sniper] Fallback AI error:', error);
                    return {
                        prediction: 'NEUTRAL',
                        confidence: 50,
                        reason: 'Analysis unavailable',
                        risk: 'High',
                        volatility: 'Normal',
                        timestamp: Date.now(),
                        model_version: 'emergency_v1.0',
                        emergency_mode: true
                    };
                }
            }
        };
    }

    createFallbackPatterns() {
        console.log('[Candle Sniper] 🔧 Creating fallback pattern recognition');
        
        return {
            detectPatterns: (candles, timeframe = '5M') => {
                try {
                    if (!candles || candles.length < 2) return [];
                    
                    const patterns = [];
                    const current = candles[candles.length - 1];
                    const previous = candles.length > 1 ? candles[candles.length - 2] : null;
                    
                    // Simple Doji detection
                    const bodySize = Math.abs(current.close - current.open);
                    const range = current.high - current.low;
                    
                    if (bodySize <= (range * 0.1) && range > 0) {
                        patterns.push({
                            name: 'Doji',
                            type: 'reversal',
                            strength: 'medium',
                            timeframe: timeframe,
                            reliability: 65
                        });
                    }
                    
                    // Simple Bullish/Bearish Engulfing
                    if (previous) {
                        const prevBearish = previous.close < previous.open;
                        const currBullish = current.close > current.open;
                        const engulfs = current.open < previous.close && current.close > previous.open;
                        
                        if (prevBearish && currBullish && engulfs) {
                            patterns.push({
                                name: 'Bullish Engulfing',
                                type: 'bullish',
                                strength: 'strong',
                                timeframe: timeframe,
                                reliability: 75
                            });
                        }
                        
                        const prevBullish = previous.close > previous.open;
                        const currBearish = current.close < current.open;
                        const engulfsBear = current.open > previous.close && current.close < previous.open;
                        
                        if (prevBullish && currBearish && engulfsBear) {
                            patterns.push({
                                name: 'Bearish Engulfing',
                                type: 'bearish',
                                strength: 'strong',
                                timeframe: timeframe,
                                reliability: 75
                            });
                        }
                    }
                    
                    return patterns;
                    
                } catch (error) {
                    console.error('[Candle Sniper] Fallback pattern error:', error);
                    return [];
                }
            }
        };
    }

    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch(message.type) {
                case 'START_ANALYSIS':
                    this.startAnalysis(message.data);
                    sendResponse({ success: true });
                    break;
                
                case 'STOP_ANALYSIS':
                    this.stopAnalysis();
                    sendResponse({ success: true });
                    break;
                
                case 'CANDLE_DATA':
                    this.processLocalCandleData(message.data);
                    break;
                
                case 'STRUCTURED_MARKET_DATA':
                    this.processStructuredMarketData(message.data);
                    break;
                
                case 'ASSET_DETECTED':
                    this.handleAssetDetection(message.data);
                    break;
                
                case 'PLATFORM_DETECTED':
                    this.handlePlatformDetection(message.data);
                    break;
                
                case 'DEBUG_INFO':
                    this.handleDebugInfo(message.data);
                    break;
                
                case 'CONTENT_SCRIPT_LOADED':
                    this.handleContentScriptLoaded(message.data);
                    break;
                
                case 'POPUP_OPENED':
                    this.handlePopupOpened();
                    break;
                
                case 'REAL_CANDLE_DATA':
                    this.handleRealCandleData(message.data);
                    break;
                
                case 'REAL_SIGNAL_GENERATED':
                    this.handleRealSignal(message.data);
                    break;
                    
                // Trade-related messages
                case 'TRADE_EXECUTED':
                    this.handleTradeExecuted(message.data);
                    sendResponse({ success: true });
                    break;
                    
                case 'TRADE_RESULT':
                    this.handleTradeResult(message.data);
                    sendResponse({ success: true });
                    break;
                    
                case 'GET_TRADE_HISTORY':
                    sendResponse({ history: this.tradeHistory });
                    break;
                    
                case 'GET_TRADE_STATS':
                    sendResponse({ stats: this.getTradeStats() });
                    break;
                    
                case 'GET_CURRENT_SIGNAL':
                    sendResponse({ signal: this.currentSignal });
                    break;
                    
                case 'CLEAR_TRADE_HISTORY':
                    this.clearTradeHistory();
                    sendResponse({ success: true });
                    break;
                    
                case 'EXPORT_TRADE_HISTORY':
                    sendResponse({ csv: this.exportTradeHistoryToCsv() });
                    break;
                    
                case 'UPDATE_RISK_SETTINGS':
                    this.updateRiskSettings(message.data);
                    sendResponse({ success: true });
                    break;
                    
                case 'EMERGENCY_STOP':
                    this.activateEmergencyStop(message.data);
                    sendResponse({ success: true });
                    break;
                    
                case 'RESET_EMERGENCY_STOP':
                    this.resetEmergencyStop();
                    sendResponse({ success: true });
                    break;
                    
                case 'CAN_AUTO_TRADE':
                    sendResponse({ 
                        canTrade: this.canAutoTrade(),
                        reason: this.getAutoTradeBlockReason()
                    });
                    break;
                    
                // OTC Mode messages
                case 'activateOTCMode':
                    this.handleActivateOTCMode(message.data, sender, sendResponse);
                    return true; // Keep channel open for async response
                    
                case 'deactivateOTCMode':
                    this.handleDeactivateOTCMode(sender, sendResponse);
                    return true; // Keep channel open for async response
                    
                case 'getOTCExtractionStatus':
                    this.handleGetOTCStatus(sendResponse);
                    return true; // Keep channel open for async response
                    
                case 'getAvailableOTCPairs':
                    this.handleGetAvailableOTCPairs(sendResponse);
                    return true; // Keep channel open for async response
                    
                case 'getOTCHistoricalData':
                    this.handleGetOTCHistoricalData(message.data, sendResponse);
                    return true; // Keep channel open for async response
                    
                case 'generateOTCSignal':
                    this.handleGenerateOTCSignal(message.data, sendResponse);
                    return true; // Keep channel open for async response
                    
                case 'placeOTCTrade':
                    this.handlePlaceOTCTrade(message.data, sender, sendResponse);
                    return true; // Keep channel open for async response
                    
                case 'getOTCTradeHistory':
                    this.handleGetOTCTradeHistory(sendResponse);
                    return true; // Keep channel open for async response
            }
            
            // Return true to indicate we'll respond asynchronously
            return true;
        });
    }

    loadConfiguration() {
        // Load AI endpoint configuration
        chrome.storage.local.get(['aiConfig'], (result) => {
            this.aiEndpoint = result.aiConfig?.endpoint || 'http://localhost:8000'; // Default local FastAPI
            console.log('[Candle Sniper] AI endpoint configured:', this.aiEndpoint);
        });
    }

    // Safe message sending helpers
    sendMessageToTab(tabId, message, callback = null) {
        if (!tabId) {
            console.log('[Candle Sniper] ⚠️ No tab ID provided for message');
            if (callback) callback(null);
            return;
        }

        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                console.log(`[Candle Sniper] ⚠️ Tab message failed: ${chrome.runtime.lastError.message}`);
                if (callback) callback(null);
                return;
            }
            
            if (callback) callback(response);
        });
    }

    sendMessageToPopup(message) {
        chrome.runtime.sendMessage(message).catch(error => {
            // Popup might not be open, this is normal
            console.log('[Candle Sniper] 📭 Popup not listening (normal)');
        });
    }

    async startAnalysis(data) {
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        this.currentTabId = data.tabId;
        
        console.log('[Candle Sniper] Starting analysis for tab:', data.tabId);

        // Start monitoring content script
        this.sendMessageToTab(data.tabId, { type: 'START_MONITORING' });

        // Start periodic analysis
        this.analysisInterval = setInterval(() => {
            this.performAnalysis();
        }, 30000); // Analyze every 30 seconds

        // Initial analysis
        setTimeout(() => this.performAnalysis(), 5000);
    }

    stopAnalysis() {
        this.isAnalyzing = false;
        
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }

        if (this.currentTabId) {
            this.sendMessageToTab(this.currentTabId, { type: 'STOP_MONITORING' });
        }

        console.log('[Candle Sniper] Analysis stopped');
    }

    async performAnalysis() {
        if (!this.isAnalyzing || !this.currentTabId) return;

        try {
            console.log('[Candle Sniper] Performing market analysis...');

            // Step 1: Gather market data
            const marketData = await this.gatherMarketData();
            
            if (!marketData || !marketData.asset) {
                console.log('[Candle Sniper] No valid market data available');
                return;
            }

            // Step 2: Fetch multi-timeframe data
            const candleData = await this.fetchMultiTimeframeData(marketData.asset);

            // Step 3: Calculate technical indicators
            const indicators = this.calculateIndicators(candleData);

            // Step 4: Detect patterns
            const patterns = this.detectPatterns(candleData);

            // Step 5: Prepare AI input
            const aiInput = this.prepareAIInput({
                asset: marketData.asset,
                candleData,
                indicators,
                patterns
            });

            // Step 6: Get AI prediction
            const prediction = await this.getAIPrediction(aiInput);

            if (prediction && this.validatePrediction(prediction)) {
                // Step 7: Send signal to popup
                this.sendSignalToPopup(prediction);
                
                // Step 8: Update market data display
                this.sendMarketDataToPopup({
                    indicators,
                    patterns,
                    timeframes: candleData
                });
            }

        } catch (error) {
            console.error('[Candle Sniper] Analysis error:', error);
            this.sendErrorToPopup(error.message);
        }
    }

    async gatherMarketData() {
        return new Promise((resolve) => {
            if (!this.currentTabId) {
                resolve(null);
                return;
            }

            this.sendMessageToTab(this.currentTabId, { type: 'DETECT_ASSET' }, (response) => {
                resolve(response);
            });
        });
    }

    async fetchMultiTimeframeData(asset) {
        // This function fetches OHLCV data for multiple timeframes
        const timeframes = ['1H', '30M', '15M', '5M', '3M', '1M'];
        const data = {};

        console.log('[Candle Sniper] Fetching multi-timeframe data for:', asset);

        for (const timeframe of timeframes) {
            try {
                const candleData = await this.fetchCandleData(asset, timeframe);
                data[timeframe] = candleData;
            } catch (error) {
                console.error(`[Candle Sniper] Failed to fetch ${timeframe} data:`, error);
                // Use mock data for development
                data[timeframe] = this.generateMockCandleData(timeframe);
            }
        }

        return data;
    }

    async fetchCandleData(asset, timeframe) {
        // Convert asset name to API format
        const symbol = this.convertAssetToSymbol(asset);
        
        // Try multiple data sources
        const dataSources = [
            () => this.fetchFromBinance(symbol, timeframe),
            () => this.fetchFromTwelveData(symbol, timeframe),
            () => this.fetchFromYahoo(symbol, timeframe)
        ];

        for (const fetchFunction of dataSources) {
            try {
                const data = await fetchFunction();
                if (data && data.length > 0) {
                    return data;
                }
            } catch (error) {
                console.log('[Candle Sniper] Data source failed, trying next...');
            }
        }

        // Fallback to mock data
        return this.generateMockCandleData(timeframe);
    }

    async fetchFromBinance(symbol, timeframe) {
        const interval = this.convertTimeframeToInterval(timeframe);
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Binance API error');
        
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

    async fetchFromTwelveData(symbol, timeframe) {
        // Implement TwelveData API integration
        // Requires API key - placeholder implementation
        throw new Error('TwelveData not configured');
    }

    async fetchFromYahoo(symbol, timeframe) {
        // Implement Yahoo Finance integration
        // Placeholder implementation
        throw new Error('Yahoo Finance not configured');
    }

    generateMockCandleData(timeframe) {
        const count = 100;
        const candles = [];
        let basePrice = 1.20000;
        
        for (let i = 0; i < count; i++) {
            const change = (Math.random() - 0.5) * 0.001;
            const open = basePrice;
            const close = basePrice + change;
            const high = Math.max(open, close) + Math.random() * 0.0005;
            const low = Math.min(open, close) - Math.random() * 0.0005;
            
            candles.push({
                timestamp: Date.now() - (count - i) * this.getTimeframeMilliseconds(timeframe),
                open: open,
                high: high,
                low: low,
                close: close,
                volume: Math.random() * 1000 + 500
            });
            
            basePrice = close;
        }
        
        return candles;
    }

    calculateIndicators(candleData) {
        const indicators = {};
        
        // Use 5M timeframe as primary for indicators
        const primaryData = candleData['5M'] || candleData['1M'] || [];
        
        if (primaryData.length < 20) {
            return {}; // Not enough data
        }

        try {
            indicators.RSI = this.calculateRSI(primaryData, 14);
            indicators.EMA9 = this.calculateEMA(primaryData, 9);
            indicators.EMA21 = this.calculateEMA(primaryData, 21);
            indicators.EMA50 = this.calculateEMA(primaryData, 50);
            indicators.MACD = this.calculateMACD(primaryData);
            indicators.BollingerBands = this.calculateBollingerBands(primaryData, 20, 2);
            indicators.Volume = primaryData[primaryData.length - 1]?.volume || 0;
        } catch (error) {
            console.error('[Candle Sniper] Indicator calculation error:', error);
        }

        return indicators;
    }

    calculateRSI(data, period = 14) {
        if (data.length < period + 1) return null;
        
        const changes = [];
        for (let i = 1; i < data.length; i++) {
            changes.push(data[i].close - data[i-1].close);
        }
        
        let gains = 0, losses = 0;
        for (let i = 0; i < period; i++) {
            if (changes[i] > 0) gains += changes[i];
            else losses += Math.abs(changes[i]);
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        for (let i = period; i < changes.length; i++) {
            const change = changes[i];
            avgGain = ((avgGain * (period - 1)) + (change > 0 ? change : 0)) / period;
            avgLoss = ((avgLoss * (period - 1)) + (change < 0 ? Math.abs(change) : 0)) / period;
        }
        
        if (avgLoss === 0) return 100;
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateEMA(data, period) {
        if (data.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
        
        for (let i = period; i < data.length; i++) {
            ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateMACD(data, fast = 12, slow = 26, signal = 9) {
        const emaFast = this.calculateEMA(data, fast);
        const emaSlow = this.calculateEMA(data, slow);
        
        if (!emaFast || !emaSlow) return null;
        
        const macdLine = emaFast - emaSlow;
        
        // For simplicity, returning just the MACD line
        // Full implementation would calculate signal line and histogram
        return macdLine;
    }

    calculateBollingerBands(data, period = 20, stdDev = 2) {
        if (data.length < period) return null;
        
        const prices = data.slice(-period).map(candle => candle.close);
        const sma = prices.reduce((sum, price) => sum + price, 0) / period;
        
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    detectPatterns(candleData) {
        const patterns = [];
        const recentCandles = candleData['5M']?.slice(-10) || [];
        
        if (recentCandles.length < 3) return patterns;

        try {
            // Bullish Engulfing
            if (this.isBullishEngulfing(recentCandles)) {
                patterns.push({ name: 'Bullish Engulfing', strength: 'Strong', type: 'bullish' });
            }
            
            // Bearish Engulfing
            if (this.isBearishEngulfing(recentCandles)) {
                patterns.push({ name: 'Bearish Engulfing', strength: 'Strong', type: 'bearish' });
            }
            
            // Doji
            if (this.isDoji(recentCandles[recentCandles.length - 1])) {
                patterns.push({ name: 'Doji', strength: 'Medium', type: 'neutral' });
            }
            
            // Pin Bar / Hammer
            if (this.isPinBar(recentCandles[recentCandles.length - 1])) {
                patterns.push({ name: 'Pin Bar', strength: 'Medium', type: 'reversal' });
            }
        } catch (error) {
            console.error('[Candle Sniper] Pattern detection error:', error);
        }

        return patterns;
    }

    isBullishEngulfing(candles) {
        if (candles.length < 2) return false;
        
        const prev = candles[candles.length - 2];
        const curr = candles[candles.length - 1];
        
        // Previous candle is bearish, current is bullish
        // Current candle engulfs previous
        return prev.close < prev.open && 
               curr.close > curr.open && 
               curr.open < prev.close && 
               curr.close > prev.open;
    }

    isBearishEngulfing(candles) {
        if (candles.length < 2) return false;
        
        const prev = candles[candles.length - 2];
        const curr = candles[candles.length - 1];
        
        // Previous candle is bullish, current is bearish
        // Current candle engulfs previous
        return prev.close > prev.open && 
               curr.close < curr.open && 
               curr.open > prev.close && 
               curr.close < prev.open;
    }

    isDoji(candle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const totalSize = candle.high - candle.low;
        
        // Body is less than 10% of total candle size
        return bodySize / totalSize < 0.1;
    }

    isPinBar(candle) {
        const bodySize = Math.abs(candle.close - candle.open);
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const totalSize = candle.high - candle.low;
        
        // Long wick (>60% of candle) with small body
        return (upperWick > totalSize * 0.6 || lowerWick > totalSize * 0.6) && 
               bodySize < totalSize * 0.3;
    }

    prepareAIInput(data) {
        return {
            symbol: data.asset,
            timestamp: Date.now(),
            timeframes: data.candleData,
            indicators: data.indicators,
            patterns: data.patterns,
            metadata: {
                platform: 'binary_options',
                prediction_type: '5min_expiry',
                analysis_version: '1.0'
            }
        };
    }

    async getAIPrediction(aiInput) {
        try {
            // Option 1: Cloud AI (FastAPI backend)
            if (this.aiEndpoint && this.aiEndpoint !== 'local') {
                return await this.callCloudAI(aiInput);
            }
            
            // Option 2: Local AI (browser-based)
            return await this.callLocalAI(aiInput);
            
        } catch (error) {
            console.error('[Candle Sniper] AI prediction error:', error);
            // Fallback to rule-based prediction
            return this.getRuleBasedPrediction(aiInput);
        }
    }

    async callCloudAI(aiInput) {
        const response = await fetch(`${this.aiEndpoint}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(aiInput)
        });

        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }

        return await response.json();
    }

    async callLocalAI(aiInput) {
        // Placeholder for TensorFlow.js implementation
        // Would load and run a trained model in the browser
        throw new Error('Local AI not implemented yet');
    }

    getRuleBasedPrediction(aiInput) {
        // Fallback rule-based prediction system
        const indicators = aiInput.indicators;
        const patterns = aiInput.patterns;
        
        let bullishSignals = 0;
        let bearishSignals = 0;
        let confidence = 50;
        let reasons = [];

        // RSI analysis
        if (indicators.RSI) {
            if (indicators.RSI < 30) {
                bullishSignals += 2;
                reasons.push('RSI oversold');
            } else if (indicators.RSI > 70) {
                bearishSignals += 2;
                reasons.push('RSI overbought');
            }
        }

        // EMA analysis
        if (indicators.EMA9 && indicators.EMA21) {
            if (indicators.EMA9 > indicators.EMA21) {
                bullishSignals += 1;
                reasons.push('EMA9 > EMA21');
            } else {
                bearishSignals += 1;
                reasons.push('EMA9 < EMA21');
            }
        }

        // Pattern analysis
        patterns.forEach(pattern => {
            if (pattern.type === 'bullish') {
                bullishSignals += 2;
                reasons.push(pattern.name);
            } else if (pattern.type === 'bearish') {
                bearishSignals += 2;
                reasons.push(pattern.name);
            }
        });

        // Determine prediction
        const prediction = bullishSignals > bearishSignals ? 'UP' : 'DOWN';
        const signalStrength = Math.abs(bullishSignals - bearishSignals);
        confidence = Math.min(95, 55 + (signalStrength * 8));

        return {
            prediction,
            confidence: Math.round(confidence),
            reason: reasons.join(', ') || 'Mixed signals',
            volatility: 'Normal',
            risk: confidence > 75 ? 'Low' : confidence > 60 ? 'Medium' : 'High',
            timestamp: Date.now()
        };
    }

    validatePrediction(prediction) {
        // Validation filters
        if (!prediction || !prediction.prediction) return false;
        if (prediction.confidence < 55) return false; // Minimum confidence
        if (!['UP', 'DOWN'].includes(prediction.prediction)) return false;
        
        return true;
    }

    sendSignalToPopup(prediction) {
        this.sendMessageToPopup({
            type: 'ANALYSIS_RESULT',
            data: prediction
        });
    }

    sendMarketDataToPopup(marketData) {
        this.sendMessageToPopup({
            type: 'MARKET_DATA',
            data: marketData
        });
    }

    sendErrorToPopup(error) {
        this.sendMessageToPopup({
            type: 'ERROR',
            data: error
        });
    }

    handleAssetDetection(data) {
        console.log(`[Candle Sniper] 🎯 Asset detected: ${data.asset} on ${data.platform}`);
        
        // Store current asset info
        this.marketData.currentAsset = data.asset;
        this.marketData.currentPlatform = data.platform;
        this.marketData.lastDetection = Date.now();
        
        // Notify popup
        this.sendMessageToPopup({
            type: 'ASSET_DETECTED',
            data: data
        });
    }

    handlePlatformDetection(data) {
        console.log(`[Candle Sniper] 🏢 Platform detected: ${data.platform} (${data.hostname})`);
        
        this.marketData.platform = data.platform;
        this.marketData.platformSupported = data.supported;
        
        // Notify popup about platform status
        this.sendMessageToPopup({
            type: 'PLATFORM_DETECTED', 
            data: data
        });
    }

    handleDebugInfo(data) {
        console.log('[Candle Sniper] 🔍 Debug info received:', data);
        
        // Log potential selectors for troubleshooting
        if (data.availableSelectors && data.availableSelectors.length > 0) {
            console.log('[Candle Sniper] 📋 Potential asset selectors found:');
            data.availableSelectors.forEach(selector => {
                console.log(`  - ${selector.selector}: "${selector.text}"`);
            });
        } else {
            console.log('[Candle Sniper] ⚠️ No asset selectors found on page');
        }
        
        // Send debug info to popup if it's listening
        this.sendMessageToPopup({
            type: 'DEBUG_INFO',
            data: data
        });
    }

    handleContentScriptLoaded(data) {
        console.log(`[Candle Sniper] 📡 Content script loaded on ${data.platform} (${data.hostname})`);
        
        // Store the loaded status
        this.marketData.contentScriptStatus = {
            loaded: true,
            platform: data.platform,
            hostname: data.hostname,
            loadTime: data.timestamp
        };
    }

    handlePopupOpened() {
        // Send current status when popup opens
        if (this.isAnalyzing) {
            this.sendMessageToPopup({
                type: 'STATUS_UPDATE',
                data: { analyzing: true }
            });
        }
        
        // Send current signal if available
        if (this.currentSignal) {
            this.sendMessageToPopup({
                type: 'REAL_SIGNAL_GENERATED',
                data: this.currentSignal
            });
        }
        
        // Send auto-trade status
        this.sendMessageToPopup({
            type: 'AUTO_TRADE_STATUS',
            data: {
                isEnabled: this.settings?.autoTradeEnabled || false,
                emergencyStopActive: this.emergencyStopActive,
                cooldownRemaining: Math.max(0, this.lastTradeTimestamp + this.tradeCooldownMs - Date.now())
            }
        });
    }
    
    handleRealSignal(data) {
        console.log('[Candle Sniper] 🔔 Real signal received:', data);
        
        // Store the signal
        this.storeSignalInHistory(data);
        
        // Store as current signal
        this.currentSignal = data;
        
        // Forward to popup if open
        this.sendMessageToPopup({
            type: 'REAL_SIGNAL_GENERATED',
            data: data
        });
        
        // Check if auto-trading is enabled
        if (this.settings?.autoTradeEnabled && !this.emergencyStopActive) {
            this.processAutoTrade(data);
        }
    }
    
    storeSignalInHistory(signal) {
        // Create signal record with timestamp
        const signalRecord = {
            ...signal,
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now()
        };
        
        // Add to history
        this.signalHistory.unshift(signalRecord);
        
        // Keep only last 100 signals
        if (this.signalHistory.length > 100) {
            this.signalHistory = this.signalHistory.slice(0, 100);
        }
        
        // Save to storage
        chrome.storage.local.set({ signalHistory: this.signalHistory });
        
        return signalRecord;
    }
    
    loadSignalHistory() {
        chrome.storage.local.get(['signalHistory'], (result) => {
            if (result.signalHistory) {
                this.signalHistory = result.signalHistory;
                console.log(`[Candle Sniper] Loaded ${this.signalHistory.length} signal records`);
            }
        });
    }
    
    processAutoTrade(signal) {
        // Check if we can auto-trade
        if (!this.canAutoTrade()) {
            console.log(`[Candle Sniper] 🚫 Auto-trade blocked: ${this.getAutoTradeBlockReason()}`);
            return;
        }
        
        // Check signal confidence
        if (signal.confidence < 85) {
            console.log(`[Candle Sniper] 🚫 Signal confidence too low for auto-trade: ${signal.confidence}%`);
            return;
        }
        
        // Get current tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                console.log('[Candle Sniper] 🚫 No active tab for auto-trade');
                return;
            }
            
            const tabId = tabs[0].id;
            
            // Calculate trade amount (2-3% of balance)
            const tradeAmount = 2; // Default $2 if balance not available
            
            // Send auto-trade command to content script
            this.sendMessageToTab(tabId, {
                type: 'EXECUTE_AUTO_TRADE',
                data: {
                    direction: signal.direction,
                    amount: tradeAmount,
                    expiry: 5, // Default 5 minutes
                    confidence: signal.confidence,
                    reason: signal.reason,
                    signal_id: signal.id,
                    timestamp: Date.now()
                }
            });
            
            console.log(`[Candle Sniper] 🤖 Auto-trade sent: ${signal.direction.toUpperCase()} $${tradeAmount}`);
        });
    }

    processLocalCandleData(data) {
        // Process candle data extracted from the platform
        console.log('[Candle Sniper] Received local candle data:', data);
        
        // Store local data for analysis
        this.marketData[data.asset] = {
            candles: data.candles,
            timestamp: data.timestamp,
            platform: data.platform
        };
    }
    
    handleTradeExecuted(data) {
        console.log('[Candle Sniper] 💰 Trade executed:', data);
        
        // Create trade record
        const tradeRecord = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            timestamp: Date.now(),
            direction: data.direction,
            amount: data.amount,
            asset: data.asset,
            timeframe: data.timeframe || '5M',
            confidence: data.confidence || 85,
            reason: data.reason || [],
            platform: data.platform || 'unknown',
            result: 'pending',
            expiry: data.expiry || 5,
            signal_id: data.signal_id || null
        };
        
        // Add to trade history
        this.tradeHistory.unshift(tradeRecord);
        this.saveTradeHistory();
        
        // Update last trade timestamp
        this.lastTradeTimestamp = Date.now();
        
        // Forward to popup if open
        this.sendMessageToPopup({
            type: 'TRADE_EXECUTED',
            data: tradeRecord
        });
        
        return tradeRecord;
    }
    
    handleTradeResult(data) {
        console.log('[Candle Sniper] 📊 Trade result:', data);
        
        // Find the trade in history
        const tradeIndex = this.tradeHistory.findIndex(trade => 
            trade.id === data.id || 
            (trade.timestamp === data.timestamp && trade.direction === data.direction)
        );
        
        if (tradeIndex !== -1) {
            // Update trade record
            this.tradeHistory[tradeIndex] = {
                ...this.tradeHistory[tradeIndex],
                result: data.result,
                profit: data.profit || null,
                resultTimestamp: Date.now()
            };
            
            // Save updated history
            this.saveTradeHistory();
            
            // Update consecutive losses
            this.calculateConsecutiveLosses();
            
            // Forward to popup if open
            this.sendMessageToPopup({
                type: 'TRADE_RESULT',
                data: this.tradeHistory[tradeIndex]
            });
            
            return this.tradeHistory[tradeIndex];
        }
        
        return null;
    }
    
    saveTradeHistory() {
        // Keep only the last 1000 trades
        if (this.tradeHistory.length > 1000) {
            this.tradeHistory = this.tradeHistory.slice(0, 1000);
        }
        
        // Save to storage
        chrome.storage.local.set({ tradeHistory: this.tradeHistory });
    }
    
    clearTradeHistory() {
        this.tradeHistory = [];
        chrome.storage.local.set({ tradeHistory: [] });
        console.log('[Candle Sniper] Trade history cleared');
    }
    
    calculateConsecutiveLosses() {
        // Get completed trades
        const completedTrades = this.tradeHistory.filter(trade => 
            trade.result === 'win' || trade.result === 'loss'
        );
        
        // Sort by timestamp (newest first)
        completedTrades.sort((a, b) => b.timestamp - a.timestamp);
        
        // Count consecutive losses
        let losses = 0;
        for (const trade of completedTrades) {
            if (trade.result === 'loss') {
                losses++;
            } else {
                break;
            }
        }
        
        this.consecutiveLosses = losses;
        console.log(`[Candle Sniper] Consecutive losses: ${this.consecutiveLosses}`);
        
        // Check if we need to activate emergency stop
        if (this.consecutiveLosses >= this.maxConsecutiveLosses && !this.emergencyStopActive) {
            this.activateEmergencyStop({ 
                reason: `${this.consecutiveLosses} consecutive losses reached` 
            });
        }
    }
    
    getTradeStats() {
        // Get today's date at midnight
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Filter trades for today
        const todayTrades = this.tradeHistory.filter(trade => 
            trade.timestamp >= today.getTime()
        );
        
        // Count completed trades
        const completedTrades = this.tradeHistory.filter(trade => 
            trade.result === 'win' || trade.result === 'loss'
        );
        
        const winTrades = completedTrades.filter(trade => trade.result === 'win');
        
        // Calculate win rate
        const winRate = completedTrades.length > 0 ? 
            winTrades.length / completedTrades.length : 0;
        
        // Calculate cooldown remaining
        const cooldownRemaining = Math.max(0, 
            this.lastTradeTimestamp + this.tradeCooldownMs - Date.now()
        );
        
        return {
            totalTrades: this.tradeHistory.length,
            todayCount: todayTrades.length,
            winCount: winTrades.length,
            lossCount: completedTrades.length - winTrades.length,
            winRate: winRate,
            consecutiveLosses: this.consecutiveLosses,
            cooldownRemaining: cooldownRemaining,
            emergencyStopActive: this.emergencyStopActive,
            maxTradesPerDay: this.maxTradesPerDay,
            maxConsecutiveLosses: this.maxConsecutiveLosses
        };
    }
    
    exportTradeHistoryToCsv() {
        if (this.tradeHistory.length === 0) {
            return '';
        }
        
        // Create CSV header
        const headers = [
            'Date', 'Time', 'Asset', 'Direction', 'Timeframe', 
            'Amount', 'Result', 'Profit', 'Confidence', 'Reason'
        ];
        
        let csvContent = headers.join(',') + '\n';
        
        // Add each trade as a row
        this.tradeHistory.forEach(trade => {
            const date = new Date(trade.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            
            let reason = trade.reason || '';
            if (Array.isArray(reason)) {
                reason = reason.join('; ');
            }
            // Escape quotes in reason
            reason = reason.replace(/"/g, '""');
            
            const row = [
                dateStr,
                timeStr,
                trade.asset || '',
                trade.direction.toUpperCase(),
                trade.timeframe || '',
                trade.amount ? trade.amount.toFixed(2) : '',
                trade.result ? trade.result.toUpperCase() : 'PENDING',
                trade.profit ? trade.profit.toFixed(2) : '',
                trade.confidence || '',
                `"${reason}"`
            ];
            
            csvContent += row.join(',') + '\n';
        });
        
        return csvContent;
    }
    
    updateRiskSettings(settings) {
        console.log('[Candle Sniper] Updating risk settings:', settings);
        
        if (settings.tradeCooldown !== undefined) {
            this.tradeCooldownMs = settings.tradeCooldown * 60 * 1000;
        }
        
        if (settings.maxTradesPerDay !== undefined) {
            this.maxTradesPerDay = settings.maxTradesPerDay;
        }
        
        if (settings.maxConsecutiveLosses !== undefined) {
            this.maxConsecutiveLosses = settings.maxConsecutiveLosses;
        }
        
        // Save settings
        chrome.storage.local.set({ 
            tradeSettings: {
                tradeCooldown: this.tradeCooldownMs / 60000,
                maxTradesPerDay: this.maxTradesPerDay,
                maxConsecutiveLosses: this.maxConsecutiveLosses,
                emergencyStopActive: this.emergencyStopActive
            }
        });
    }
    
    activateEmergencyStop(data = {}) {
        this.emergencyStopActive = true;
        
        // Save setting
        chrome.storage.local.set({ 
            tradeSettings: {
                tradeCooldown: this.tradeCooldownMs / 60000,
                maxTradesPerDay: this.maxTradesPerDay,
                maxConsecutiveLosses: this.maxConsecutiveLosses,
                emergencyStopActive: true
            }
        });
        
        // Notify popup
        this.sendMessageToPopup({
            type: 'EMERGENCY_STOP_ACTIVATED',
            data: {
                timestamp: Date.now(),
                reason: data.reason || 'Manual emergency stop'
            }
        });
        
        console.log('[Candle Sniper] 🛑 EMERGENCY STOP ACTIVATED:', data.reason || 'Manual stop');
    }
    
    resetEmergencyStop() {
        this.emergencyStopActive = false;
        
        // Save setting
        chrome.storage.local.set({ 
            tradeSettings: {
                tradeCooldown: this.tradeCooldownMs / 60000,
                maxTradesPerDay: this.maxTradesPerDay,
                maxConsecutiveLosses: this.maxConsecutiveLosses,
                emergencyStopActive: false
            }
        });
        
        // Notify popup
        this.sendMessageToPopup({
            type: 'AUTO_TRADE_STATUS',
            data: {
                emergencyStopActive: false,
                timestamp: Date.now()
            }
        });
        
        console.log('[Candle Sniper] ✅ Emergency stop reset');
    }
    
    canAutoTrade() {
        // Check emergency stop
        if (this.emergencyStopActive) {
            return false;
        }
        
        // Check cooldown
        const cooldownRemaining = Math.max(0, 
            this.lastTradeTimestamp + this.tradeCooldownMs - Date.now()
        );
        if (cooldownRemaining > 0) {
            return false;
        }
        
        // Check max trades per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTrades = this.tradeHistory.filter(trade => 
            trade.timestamp >= today.getTime()
        );
        if (todayTrades.length >= this.maxTradesPerDay) {
            return false;
        }
        
        // Check consecutive losses
        if (this.consecutiveLosses >= this.maxConsecutiveLosses) {
            return false;
        }
        
        return true;
    }
    
    getAutoTradeBlockReason() {
        // Check emergency stop
        if (this.emergencyStopActive) {
            return 'Emergency stop is active';
        }
        
        // Check cooldown
        const cooldownRemaining = Math.max(0, 
            this.lastTradeTimestamp + this.tradeCooldownMs - Date.now()
        );
        if (cooldownRemaining > 0) {
            const minutes = Math.floor(cooldownRemaining / 60000);
            const seconds = Math.floor((cooldownRemaining % 60000) / 1000);
            return `Cooldown period: ${minutes}m ${seconds}s remaining`;
        }
        
        // Check max trades per day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTrades = this.tradeHistory.filter(trade => 
            trade.timestamp >= today.getTime()
        );
        if (todayTrades.length >= this.maxTradesPerDay) {
            return `Maximum trades per day (${this.maxTradesPerDay}) reached`;
        }
        
        // Check consecutive losses
        if (this.consecutiveLosses >= this.maxConsecutiveLosses) {
            return `${this.consecutiveLosses} consecutive losses reached`;
        }
        
        return null;
    }

    async processStructuredMarketData(structuredData) {
        console.log(`[Candle Sniper] 🧠 Processing live data for ${structuredData.symbol}`);
        console.log(`[Candle Sniper] 📊 Data quality: ${structuredData.dataQuality}`);
        
        try {
            // Immediately calculate indicators and patterns from structured data
            const indicators = await this.calculateIndicatorsFromStructured(structuredData);
            const patterns = await this.detectPatternsFromStructured(structuredData);
            
            // Prepare AI input with structured data
            const aiInput = {
                symbol: structuredData.symbol,
                platform: structuredData.platform,
                timestamp: structuredData.timestamp,
                dataQuality: structuredData.dataQuality,
                structure: structuredData.structure,
                indicators,
                patterns
            };
            
            console.log(`[Candle Sniper] 🎯 AI Input prepared with ${Object.keys(indicators).length} indicators and ${patterns.length} patterns`);
            
            // Get AI prediction
            const prediction = await this.getAIPredictionFromStructured(aiInput);
            
            if (prediction && this.validatePrediction(prediction)) {
                console.log(`[Candle Sniper] ✅ Signal generated: ${prediction.prediction} (${prediction.confidence}%)`);
                
                // Send to popup immediately
                this.sendSignalToPopup({
                    ...prediction,
                    asset: structuredData.symbol,
                    platform: structuredData.platform
                });
                
                // Send market analysis data
                this.sendMarketDataToPopup({
                    indicators,
                    patterns,
                    timeframes: structuredData.structure,
                    dataQuality: structuredData.dataQuality
                });
                
                // Log the signal
                this.logSignal(structuredData.symbol, prediction);
            } else {
                console.log('[Candle Sniper] ⚠️ Signal filtered out - insufficient confidence or invalid');
            }
            
        } catch (error) {
            console.error('[Candle Sniper] 💥 Structured data processing error:', error);
            this.sendErrorToPopup(`Analysis failed: ${error.message}`);
        }
    }

    async calculateIndicatorsFromStructured(structuredData) {
        const indicators = {};
        
        try {
            // Use 5M timeframe as primary for indicators
            const primaryTimeframe = structuredData.structure['5M'] || 
                                   structuredData.structure['3M'] || 
                                   structuredData.structure['1M'];
            
            if (!primaryTimeframe || !primaryTimeframe.candles || primaryTimeframe.candles.length < 20) {
                console.log('[Candle Sniper] Insufficient candle data for indicators');
                return this.getBasicIndicators(structuredData);
            }
            
            const candles = primaryTimeframe.candles;
            
            // Calculate comprehensive indicators
            indicators.RSI = this.calculateRSI(candles, 14);
            indicators.EMA9 = this.calculateEMA(candles, 9);
            indicators.EMA21 = this.calculateEMA(candles, 21);
            indicators.EMA50 = this.calculateEMA(candles, 50);
            indicators.MACD = this.calculateMACD(candles);
            indicators.BollingerBands = this.calculateBollingerBands(candles, 20, 2);
            indicators.Volume = candles[candles.length - 1]?.volume || 0;
            indicators.ATR = this.calculateATR(candles, 14);
            
            // Multi-timeframe trend analysis
            indicators.trends = {};
            for (const [timeframe, data] of Object.entries(structuredData.structure)) {
                if (data.trend) {
                    indicators.trends[timeframe] = data.trend;
                }
            }
            
            console.log(`[Candle Sniper] ✅ ${Object.keys(indicators).length} indicators calculated`);
            
        } catch (error) {
            console.error('[Candle Sniper] Indicator calculation error:', error);
            indicators = this.getBasicIndicators(structuredData);
        }
        
        return indicators;
    }

    async detectPatternsFromStructured(structuredData) {
        const patterns = [];
        
        try {
            // Analyze patterns in multiple timeframes
            for (const [timeframe, data] of Object.entries(structuredData.structure)) {
                if (data.candles && data.candles.length >= 3) {
                    const timeframePatterns = this.detectTimeframePatterns(data.candles, timeframe);
                    patterns.push(...timeframePatterns);
                }
            }
            
            console.log(`[Candle Sniper] 📈 ${patterns.length} patterns detected across timeframes`);
            
        } catch (error) {
            console.error('[Candle Sniper] Pattern detection error:', error);
        }
        
        return patterns;
    }

    async getAIPredictionFromStructured(aiInput) {
        try {
            // First try AI endpoint if configured
            if (this.aiEndpoint && this.aiEndpoint !== 'http://localhost:8000') {
                return await this.callAIEndpoint(aiInput);
            }
            
            // Fallback to enhanced rule-based system
            return this.getEnhancedRuleBasedPrediction(aiInput);
            
        } catch (error) {
            console.log('[Candle Sniper] AI prediction failed, using rule-based fallback:', error.message);
            return this.getEnhancedRuleBasedPrediction(aiInput);
        }
    }

    async callAIEndpoint(aiInput) {
        const response = await fetch(`${this.aiEndpoint}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(aiInput)
        });
        
        if (!response.ok) {
            throw new Error(`AI API error: ${response.status}`);
        }
        
        return await response.json();
    }

    getEnhancedRuleBasedPrediction(aiInput) {
        const indicators = aiInput.indicators;
        const patterns = aiInput.patterns;
        const trends = indicators.trends || {};
        
        let bullishSignals = 0;
        let bearishSignals = 0;
        let confidence = 50;
        let reasons = [];
        let riskLevel = 'Medium';
        
        // Multi-timeframe trend confluence
        const bullishTrends = Object.values(trends).filter(t => t === 'bullish').length;
        const bearishTrends = Object.values(trends).filter(t => t === 'bearish').length;
        
        if (bullishTrends > bearishTrends) {
            bullishSignals += bullishTrends;
            reasons.push(`${bullishTrends} timeframes bullish`);
        } else if (bearishTrends > bullishTrends) {
            bearishSignals += bearishTrends;
            reasons.push(`${bearishTrends} timeframes bearish`);
        }
        
        // Enhanced RSI analysis
        if (indicators.RSI) {
            if (indicators.RSI < 25) {
                bullishSignals += 3;
                reasons.push('RSI extremely oversold');
            } else if (indicators.RSI < 35) {
                bullishSignals += 2;
                reasons.push('RSI oversold');
            } else if (indicators.RSI > 75) {
                bearishSignals += 3;
                reasons.push('RSI extremely overbought');
            } else if (indicators.RSI > 65) {
                bearishSignals += 2;
                reasons.push('RSI overbought');
            }
        }
        
        // EMA confluence
        if (indicators.EMA9 && indicators.EMA21 && indicators.EMA50) {
            if (indicators.EMA9 > indicators.EMA21 && indicators.EMA21 > indicators.EMA50) {
                bullishSignals += 3;
                reasons.push('Strong EMA alignment (bullish)');
            } else if (indicators.EMA9 < indicators.EMA21 && indicators.EMA21 < indicators.EMA50) {
                bearishSignals += 3;
                reasons.push('Strong EMA alignment (bearish)');
            } else if (indicators.EMA9 > indicators.EMA21) {
                bullishSignals += 1;
                reasons.push('EMA9 > EMA21');
            } else {
                bearishSignals += 1;
                reasons.push('EMA9 < EMA21');
            }
        }
        
        // MACD analysis
        if (indicators.MACD) {
            if (indicators.MACD > 0) {
                bullishSignals += 1;
                reasons.push('MACD bullish');
            } else {
                bearishSignals += 1;
                reasons.push('MACD bearish');
            }
        }
        
        // Pattern analysis with timeframe weighting
        patterns.forEach(pattern => {
            let weight = 1;
            if (pattern.timeframe === '5M' || pattern.timeframe === '15M') weight = 2;
            if (pattern.timeframe === '1H') weight = 3;
            
            if (pattern.type === 'bullish') {
                bullishSignals += weight;
                reasons.push(`${pattern.name} (${pattern.timeframe})`);
            } else if (pattern.type === 'bearish') {
                bearishSignals += weight;
                reasons.push(`${pattern.name} (${pattern.timeframe})`);
            }
        });
        
        // Determine prediction with enhanced logic
        const signalDifference = Math.abs(bullishSignals - bearishSignals);
        const totalSignals = bullishSignals + bearishSignals;
        
        if (totalSignals < 3) {
            // Not enough signals
            return null;
        }
        
        const prediction = bullishSignals > bearishSignals ? 'UP' : 'DOWN';
        
        // Enhanced confidence calculation
        if (signalDifference >= 5) {
            confidence = Math.min(95, 75 + (signalDifference * 2));
            riskLevel = 'Low';
        } else if (signalDifference >= 3) {
            confidence = Math.min(85, 65 + (signalDifference * 3));
            riskLevel = 'Medium';
        } else {
            confidence = Math.min(75, 55 + (signalDifference * 5));
            riskLevel = 'High';
        }
        
        // Data quality adjustment
        const qualityBonus = {
            'excellent': 5,
            'good': 2,
            'fair': 0,
            'poor': -10
        };
        confidence += qualityBonus[aiInput.dataQuality] || 0;
        confidence = Math.max(30, Math.min(95, confidence));
        
        return {
            prediction,
            confidence: Math.round(confidence),
            reason: reasons.slice(0, 3).join(' + ') || 'Mixed signals',
            volatility: aiInput.structure['5M']?.volatility || 'Normal',
            risk: riskLevel,
            timestamp: Date.now(),
            signalStrength: signalDifference,
            dataQuality: aiInput.dataQuality
        };
    }

    getBasicIndicators(structuredData) {
        // Fallback basic indicators when calculation fails
        const indicators = {};
        
        for (const [timeframe, data] of Object.entries(structuredData.structure)) {
            if (data.lastPrice) {
                indicators.lastPrice = data.lastPrice;
                break;
            }
        }
        
        return indicators;
    }

    detectTimeframePatterns(candles, timeframe) {
        const patterns = [];
        
        if (candles.length < 3) return patterns;
        
        try {
            const recent = candles.slice(-3);
            const [prev2, prev1, current] = recent;
            
            // Bullish Engulfing
            if (this.isBullishEngulfingPattern(prev1, current)) {
                patterns.push({ 
                    name: 'Bullish Engulfing', 
                    strength: 'Strong', 
                    type: 'bullish',
                    timeframe: timeframe
                });
            }
            
            // Bearish Engulfing
            if (this.isBearishEngulfingPattern(prev1, current)) {
                patterns.push({ 
                    name: 'Bearish Engulfing', 
                    strength: 'Strong', 
                    type: 'bearish',
                    timeframe: timeframe
                });
            }
            
            // Hammer/Pin Bar
            if (this.isHammerPattern(current)) {
                patterns.push({ 
                    name: 'Hammer', 
                    strength: 'Medium', 
                    type: 'bullish',
                    timeframe: timeframe
                });
            }
            
            // Shooting Star
            if (this.isShootingStarPattern(current)) {
                patterns.push({ 
                    name: 'Shooting Star', 
                    strength: 'Medium', 
                    type: 'bearish',
                    timeframe: timeframe
                });
            }
            
        } catch (error) {
            console.log(`[Candle Sniper] Pattern detection error for ${timeframe}:`, error);
        }
        
        return patterns;
    }

    calculateATR(candles, period = 14) {
        if (candles.length < period + 1) return null;
        
        const trueRanges = [];
        for (let i = 1; i < candles.length; i++) {
            const high = candles[i].high;
            const low = candles[i].low;
            const prevClose = candles[i-1].close;
            
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }
        
        // Simple moving average of true ranges
        const recentTR = trueRanges.slice(-period);
        return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
    }

    logSignal(asset, prediction) {
        const signalLog = {
            id: Date.now(),
            timestamp: Date.now(),
            asset: asset,
            prediction: prediction.prediction,
            confidence: prediction.confidence,
            reason: prediction.reason,
            risk: prediction.risk || 'Medium',
            confluence: prediction.confluence || null,
            timeframe_agreement: prediction.timeframe_agreement || null,
            model_version: prediction.model_version || 'v1.0'
        };
        
        // Add to history
        this.signalHistory.unshift(signalLog);
        
        // Keep only last 100 signals
        if (this.signalHistory.length > 100) {
            this.signalHistory = this.signalHistory.slice(0, 100);
        }
        
        // Store in chrome storage for popup to access
        chrome.storage.local.set({ 
            signalLogs: this.signalHistory.slice(0, 50) // Popup only needs recent 50
        });
        
        console.log('[Candle Sniper] 📝 Signal logged:', signalLog);
    }

    loadSignalHistory() {
        chrome.storage.local.get(['signalHistory'], (result) => {
            this.signalHistory = result.signalHistory || [];
            console.log(`[Candle Sniper] 📚 Loaded ${this.signalHistory.length} historical signals`);
        });
    }

    saveSignalHistory() {
        chrome.storage.local.set({ 
            signalHistory: this.signalHistory 
        });
    }
}

/**
 * Discipline Engine - Enforces trading discipline and prevents overtrading
 */
class DisciplineEngine {
    constructor() {
        this.sessionTrades = 0;
        this.maxSessionTrades = 5;
        this.dailyTrades = 0;
        this.maxDailyTrades = 10;
        this.lossStreak = 0;
        this.maxLossStreak = 2;
        this.pausedUntil = null;
        this.lastSignalTime = null;
        this.minSignalInterval = 60000; // 1 minute minimum between signals
        
        this.loadDisciplineData();
    }

    canShowSignal(prediction) {
        const now = Date.now();
        
        // Check if in pause period
        if (this.pausedUntil && now < this.pausedUntil) {
            console.log('[Discipline] 🚫 In pause period, signal blocked');
            return false;
        }
        
        // Check session limits
        if (this.sessionTrades >= this.maxSessionTrades) {
            console.log('[Discipline] 🚫 Session limit reached, signal blocked');
            return false;
        }
        
        // Check daily limits
        if (this.dailyTrades >= this.maxDailyTrades) {
            console.log('[Discipline] 🚫 Daily limit reached, signal blocked');
            return false;
        }
        
        // Check minimum interval between signals
        if (this.lastSignalTime && (now - this.lastSignalTime) < this.minSignalInterval) {
            console.log('[Discipline] 🚫 Too soon after last signal, blocked');
            return false;
        }
        
        // Check loss streak pause
        if (this.lossStreak >= this.maxLossStreak) {
            this.pausedUntil = now + (30 * 60 * 1000); // 30 minute pause
            console.log('[Discipline] 🚫 Loss streak pause activated');
            this.saveDisciplineData();
            return false;
        }
        
        return true;
    }

    recordSignalShown() {
        this.sessionTrades++;
        this.dailyTrades++;
        this.lastSignalTime = Date.now();
        
        console.log(`[Discipline] 📊 Signal recorded: Session ${this.sessionTrades}/${this.maxSessionTrades}, Daily ${this.dailyTrades}/${this.maxDailyTrades}`);
        
        this.saveDisciplineData();
    }

    recordTradeResult(result) {
        if (result === 'WIN') {
            this.lossStreak = 0;
            console.log('[Discipline] ✅ Win recorded, loss streak reset');
        } else if (result === 'LOSS') {
            this.lossStreak++;
            console.log(`[Discipline] ❌ Loss recorded, streak: ${this.lossStreak}/${this.maxLossStreak}`);
        }
        
        this.saveDisciplineData();
    }

    getCoachingMessage() {
        const now = Date.now();
        
        if (this.pausedUntil && now < this.pausedUntil) {
            const remainingMinutes = Math.ceil((this.pausedUntil - now) / 60000);
            return `🧘 Take a break - ${remainingMinutes} minutes remaining`;
        }
        
        if (this.sessionTrades >= this.maxSessionTrades - 1) {
            return '⚠️ Approaching session limit - Quality over quantity';
        }
        
        if (this.lossStreak >= 1) {
            return '🧠 After loss: Stay calm, stick to strategy';
        }
        
        const messages = [
            '🎯 Stay disciplined - Wait for quality setups',
            '🧠 Patience is your edge in trading',
            '⚖️ Risk management is everything',
            '📊 Trust the process, not emotions',
            '🕰️ Perfect timing beats perfect analysis'
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    }

    resetSession() {
        this.sessionTrades = 0;
        this.lastSignalTime = null;
        console.log('[Discipline] 🔄 Session reset');
        this.saveDisciplineData();
    }

    resetDaily() {
        this.dailyTrades = 0;
        this.lossStreak = 0;
        this.pausedUntil = null;
        this.resetSession();
        console.log('[Discipline] 🌅 Daily reset');
        this.saveDisciplineData();
    }

    getDisciplineStats() {
        return {
            sessionTrades: this.sessionTrades,
            maxSessionTrades: this.maxSessionTrades,
            dailyTrades: this.dailyTrades,
            maxDailyTrades: this.maxDailyTrades,
            lossStreak: this.lossStreak,
            maxLossStreak: this.maxLossStreak,
            pausedUntil: this.pausedUntil,
            lastSignalTime: this.lastSignalTime,
            coachingMessage: this.getCoachingMessage()
        };
    }

    loadDisciplineData() {
        chrome.storage.local.get(['disciplineData'], (result) => {
            if (result.disciplineData) {
                const data = result.disciplineData;
                this.sessionTrades = data.sessionTrades || 0;
                this.dailyTrades = data.dailyTrades || 0;
                this.lossStreak = data.lossStreak || 0;
                this.pausedUntil = data.pausedUntil || null;
                this.lastSignalTime = data.lastSignalTime || null;
                
                // Check if it's a new day
                const lastSaveDate = data.lastSaveDate || 0;
                const today = new Date().toDateString();
                const lastSave = new Date(lastSaveDate).toDateString();
                
                if (today !== lastSave) {
                    this.resetDaily();
                }
            }
        });
    }

    saveDisciplineData() {
        const data = {
            sessionTrades: this.sessionTrades,
            dailyTrades: this.dailyTrades,
            lossStreak: this.lossStreak,
            pausedUntil: this.pausedUntil,
            lastSignalTime: this.lastSignalTime,
            lastSaveDate: Date.now()
        };
        
        chrome.storage.local.set({ disciplineData: data });
    }
}

/**
 * Risk Manager - Calculates position sizes and manages risk
 */
class RiskManager {
    constructor() {
        this.accountBalance = 100;
        this.baseRiskPercent = 2.0;
        this.currentRiskPercent = 2.0;
        this.maxRiskPercent = 5.0;
        this.minRiskPercent = 0.5;
        this.consecutiveLosses = 0;
        this.consecutiveWins = 0;
        
        this.loadRiskData();
    }

    calculatePositionSize(confidence, volatility = 'normal') {
        let riskPercent = this.baseRiskPercent;
        
        // Adjust for confidence
        if (confidence >= 85) {
            riskPercent *= 1.2; // Increase for high confidence
        } else if (confidence < 70) {
            riskPercent *= 0.8; // Decrease for low confidence
        }
        
        // Adjust for volatility
        if (volatility === 'high') {
            riskPercent *= 0.7; // Reduce for high volatility
        } else if (volatility === 'low') {
            riskPercent *= 0.9; // Slightly reduce for low volatility
        }
        
        // Adjust for consecutive results
        if (this.consecutiveLosses >= 2) {
            riskPercent *= 0.5; // Halve after consecutive losses
        } else if (this.consecutiveWins >= 3) {
            riskPercent *= 0.8; // Reduce after winning streak (lock profits)
        }
        
        // Apply limits
        riskPercent = Math.max(this.minRiskPercent, Math.min(this.maxRiskPercent, riskPercent));
        
        const positionSize = (this.accountBalance * riskPercent) / 100;
        
        return {
            amount: Math.round(positionSize * 100) / 100, // Round to 2 decimals
            riskPercent: Math.round(riskPercent * 100) / 100,
            reasoning: this.getRiskReasoning(confidence, volatility)
        };
    }

    getRiskReasoning(confidence, volatility) {
        const reasons = [];
        
        if (confidence >= 85) {
            reasons.push('High confidence signal');
        } else if (confidence < 70) {
            reasons.push('Lower confidence - reduced risk');
        }
        
        if (volatility === 'high') {
            reasons.push('High volatility - protective sizing');
        }
        
        if (this.consecutiveLosses >= 2) {
            reasons.push('After losses - conservative approach');
        } else if (this.consecutiveWins >= 3) {
            reasons.push('After wins - profit protection');
        } else {
            reasons.push('Standard risk management');
        }
        
        return reasons.join(' • ');
    }

    recordTradeResult(result, amount = 0) {
        if (result === 'WIN') {
            this.consecutiveLosses = 0;
            this.consecutiveWins++;
            this.accountBalance += amount * 0.8; // Assume 80% payout
        } else if (result === 'LOSS') {
            this.consecutiveWins = 0;
            this.consecutiveLosses++;
            this.accountBalance -= amount;
        }
        
        console.log(`[Risk Manager] 💰 Balance: $${this.accountBalance.toFixed(2)}, Wins: ${this.consecutiveWins}, Losses: ${this.consecutiveLosses}`);
        
        this.saveRiskData();
    }

    updateAccountBalance(newBalance) {
        this.accountBalance = Math.max(10, newBalance); // Minimum $10
        this.saveRiskData();
        console.log(`[Risk Manager] 💼 Account balance updated: $${this.accountBalance.toFixed(2)}`);
    }

    getRiskStats() {
        return {
            accountBalance: this.accountBalance,
            baseRiskPercent: this.baseRiskPercent,
            currentRiskPercent: this.currentRiskPercent,
            consecutiveLosses: this.consecutiveLosses,
            consecutiveWins: this.consecutiveWins,
            maxRiskPercent: this.maxRiskPercent,
            minRiskPercent: this.minRiskPercent
        };
    }

    loadRiskData() {
        chrome.storage.local.get(['riskData'], (result) => {
            if (result.riskData) {
                const data = result.riskData;
                this.accountBalance = data.accountBalance || 100;
                this.baseRiskPercent = data.baseRiskPercent || 2.0;
                this.consecutiveLosses = data.consecutiveLosses || 0;
                this.consecutiveWins = data.consecutiveWins || 0;
            }
        });
    }

    saveRiskData() {
        const data = {
            accountBalance: this.accountBalance,
            baseRiskPercent: this.baseRiskPercent,
            consecutiveLosses: this.consecutiveLosses,
            consecutiveWins: this.consecutiveWins,
            lastSaveDate: Date.now()
        };
        
        chrome.storage.local.set({ riskData: data });
    }

    // Utility methods
    convertAssetToSymbol(asset) {
        // Convert platform asset names to API symbols
        const conversions = {
            'EUR/USD': 'EURUSD',
            'GBP/USD': 'GBPUSD',
            'USD/JPY': 'USDJPY',
            'AUD/USD': 'AUDUSD',
            'EUR/JPY': 'EURJPY'
        };
        
        return conversions[asset] || asset.replace('/', '');
    }

    convertTimeframeToInterval(timeframe) {
        const intervals = {
            '1M': '1m',
            '3M': '3m',
            '5M': '5m',
            '15M': '15m',
            '30M': '30m',
            '1H': '1h'
        };
        
        return intervals[timeframe] || '5m';
    }

    getTimeframeMilliseconds(timeframe) {
        const milliseconds = {
            '1M': 60000,
            '3M': 180000,
            '5M': 300000,
            '15M': 900000,
            '30M': 1800000,
            '1H': 3600000
        };
        
        return milliseconds[timeframe] || 300000;
    }
    /**
     * ========================================
     * REAL DOM-BASED DATA PROCESSING METHODS
     * ========================================
     */

    handleRealCandleData(data) {
        console.log(`[Candle Sniper] 📊 Processing REAL candle data: ${data.candles.length} candles from ${data.method}`);
        
        try {
            // Store the real data with enhanced metadata
            this.marketData.realData = {
                timeframe: data.timeframe,
                candles: data.candles,
                source: data.source,
                method: data.method,
                timestamp: data.timestamp,
                dataQuality: this.assessRealDataQuality(data.candles)
            };
            
            // Send update to popup if open
            this.sendMessageToPopup({
                type: 'REAL_DATA_UPDATE', 
                data: {
                    timeframe: data.timeframe,
                    candleCount: data.candles.length,
                    method: data.method,
                    dataQuality: this.marketData.realData.dataQuality,
                    lastPrice: data.candles.length > 0 ? data.candles[data.candles.length - 1].close : null
                }
            });
            
            console.log(`[Candle Sniper] ✅ Real data stored - Quality: ${this.marketData.realData.dataQuality}`);
            
        } catch (error) {
            console.error('[Candle Sniper] Real candle data processing error:', error);
        }
    }

    async handleRealSignal(signalData) {
        console.log(`[Candle Sniper] 🎯 REAL SIGNAL RECEIVED: ${signalData.direction} (${signalData.confidence}%)`);
        
        try {
            // Validate signal meets our standards
            if (!this.validateRealSignal(signalData)) {
                console.log('[Candle Sniper] ❌ Real signal failed validation');
                return;
            }
            
            // Check discipline constraints
            if (!this.disciplineEngine.canShowSignal(signalData)) {
                console.log('[Candle Sniper] 🚫 Real signal blocked by discipline engine');
                return;
            }
            
            // Enhanced signal with additional metadata
            const enhancedSignal = {
                ...signalData,
                
                // System verification
                verified: true,
                source_verified: true,
                real_data: true,
                
                // Timing information
                generated_at: Date.now(),
                entry_window: this.calculateOptimalEntryWindow(signalData),
                
                // Risk management
                risk_assessment: this.assessSignalRisk(signalData),
                position_size: this.calculatePositionSize(signalData),
                
                // Quality metrics  
                data_freshness: this.calculateDataFreshness(),
                platform_sync: true,
                
                // Trading context
                market_session: this.getMarketSession(),
                volatility_environment: signalData.volatility || 'normal'
            };
            
            // Log the real signal
            this.logRealSignal(enhancedSignal);
            
            // Record with discipline engine
            this.disciplineEngine.recordSignalShown();
            
            // Send to popup with highest priority
            this.sendMessageToPopup({
                type: 'ANALYSIS_RESULT',
                data: enhancedSignal,
                priority: 'high'
            });
            
            console.log(`[Candle Sniper] ✅ REAL SIGNAL DELIVERED: ${enhancedSignal.direction} - Confidence: ${enhancedSignal.confidence}%`);
            
        } catch (error) {
            console.error('[Candle Sniper] Real signal handling error:', error);
        }
    }

    validateRealSignal(signal) {
        // Strict validation for real signals
        
        // Basic structure check
        if (!signal || !signal.direction || !signal.confidence) {
            console.log('[Validation] Missing basic signal data');
            return false;
        }
        
        // Direction must be UP or DOWN
        if (!['UP', 'DOWN'].includes(signal.direction)) {
            console.log('[Validation] Invalid signal direction');
            return false;
        }
        
        // Confidence must be reasonable
        if (signal.confidence < 60 || signal.confidence > 95) {
            console.log(`[Validation] Confidence out of range: ${signal.confidence}%`);
            return false;
        }
        
        // Must have technical details
        if (!signal.technical_details) {
            console.log('[Validation] Missing technical details');
            return false;
        }
        
        // Must be from real DOM data
        if (signal.source !== 'real_dom_data') {
            console.log('[Validation] Not from real DOM data');
            return false;
        }
        
        // Check data freshness (within last 2 minutes)
        const maxAge = 2 * 60 * 1000; // 2 minutes
        if (Date.now() - signal.extraction_time > maxAge) {
            console.log('[Validation] Data too old');
            return false;
        }
        
        return true;
    }

    assessRealDataQuality(candles) {
        if (!candles || !Array.isArray(candles)) return 'poor';
        
        const count = candles.length;
        let qualityScore = 0;
        
        // Quantity score
        if (count >= 50) qualityScore += 40;
        else if (count >= 30) qualityScore += 30;
        else if (count >= 20) qualityScore += 20;
        else qualityScore += 10;
        
        // Data completeness score
        const completeCandles = candles.filter(c => 
            c && c.open && c.high && c.low && c.close && c.timestamp
        ).length;
        
        const completenessRatio = count > 0 ? completeCandles / count : 0;
        qualityScore += completenessRatio * 30;
        
        // Data consistency score
        let consistencyScore = 0;
        for (let i = 1; i < candles.length; i++) {
            const current = candles[i];
            const previous = candles[i - 1];
            
            // Check OHLC relationships are valid
            if (current.high >= Math.max(current.open, current.close) &&
                current.low <= Math.min(current.open, current.close) &&
                current.timestamp > previous.timestamp) {
                consistencyScore++;
            }
        }
        
        const consistencyRatio = candles.length > 1 ? consistencyScore / (candles.length - 1) : 1;
        qualityScore += consistencyRatio * 30;
        
        // Map score to quality rating
        if (qualityScore >= 85) return 'excellent';
        if (qualityScore >= 70) return 'good';
        if (qualityScore >= 50) return 'fair';
        return 'poor';
    }

    calculateOptimalEntryWindow(signal) {
        const now = new Date();
        const currentMinute = now.getMinutes();
        const currentSecond = now.getSeconds();
        
        // For binary options, find next suitable entry time
        let minutesToAdd = 0;
        let targetSecond = 0;
        
        // If we're in the first 30 seconds, we can enter at :30
        // If we're after :30, enter at next minute :00
        if (currentSecond < 25) {
            targetSecond = 30;
        } else {
            minutesToAdd = 1;
            targetSecond = 0;
        }
        
        const entryTime = new Date(now.getTime());
        entryTime.setMinutes(currentMinute + minutesToAdd);
        entryTime.setSeconds(targetSecond);
        entryTime.setMilliseconds(0);
        
        const expireTime = new Date(entryTime.getTime() + (5 * 60 * 1000)); // 5 minutes expiry
        const secondsUntilEntry = Math.floor((entryTime.getTime() - now.getTime()) / 1000);
        
        return {
            optimal_entry: entryTime.toLocaleTimeString(),
            seconds_until_entry: secondsUntilEntry,
            expiry_time: expireTime.toLocaleTimeString(),
            window_type: 'optimized_binary_entry',
            recommendation: `Enter at ${entryTime.toLocaleTimeString()} for 5-minute expiry`
        };
    }

    assessSignalRisk(signal) {
        let riskScore = 50; // Base neutral risk
        const factors = [];
        
        // Confidence-based risk
        if (signal.confidence >= 80) {
            riskScore -= 20;
            factors.push('High confidence reduces risk');
        } else if (signal.confidence < 65) {
            riskScore += 15;
            factors.push('Lower confidence increases risk');
        }
        
        // Volatility risk
        if (signal.volatility === 'high') {
            riskScore += 25;
            factors.push('High volatility increases risk');
        } else if (signal.volatility === 'low') {
            riskScore += 10;
            factors.push('Low volatility (potential false signals)');
        }
        
        // Data quality risk
        if (signal.data_quality === 'poor') {
            riskScore += 20;
            factors.push('Poor data quality');
        } else if (signal.data_quality === 'excellent') {
            riskScore -= 10;
            factors.push('Excellent data quality');
        }
        
        // Normalize risk score
        riskScore = Math.max(0, Math.min(100, riskScore));
        
        let riskLevel = 'Medium';
        if (riskScore <= 30) riskLevel = 'Low';
        else if (riskScore >= 70) riskLevel = 'High';
        
        return {
            level: riskLevel,
            score: riskScore,
            factors: factors
        };
    }

    calculatePositionSize(signal) {
        const baseAmount = 10; // Base $10 position
        let multiplier = 1;
        
        // Adjust based on confidence
        if (signal.confidence >= 85) multiplier = 1.5;
        else if (signal.confidence >= 75) multiplier = 1.2;
        else if (signal.confidence < 65) multiplier = 0.7;
        
        // Adjust based on risk
        const riskAssessment = this.assessSignalRisk(signal);
        if (riskAssessment.level === 'High') multiplier *= 0.6;
        else if (riskAssessment.level === 'Low') multiplier *= 1.3;
        
        const recommendedAmount = Math.round(baseAmount * multiplier);
        
        return {
            recommended: Math.min(recommendedAmount, baseAmount * 2), // Max 2x base
            base: baseAmount,
            multiplier: Math.round(multiplier * 100) / 100
        };
    }

    calculateDataFreshness() {
        if (!this.marketData.realData) return 0;
        
        const age = Date.now() - this.marketData.realData.timestamp;
        const maxFreshAge = 60000; // 1 minute
        
        return Math.max(0, Math.min(100, 100 - (age / maxFreshAge * 100)));
    }

    getMarketSession() {
        const now = new Date();
        const hour = now.getUTCHours();
        
        // Major forex sessions (UTC)
        if (hour >= 0 && hour < 9) return 'Sydney/Tokyo'; 
        if (hour >= 8 && hour < 16) return 'London';
        if (hour >= 13 && hour < 22) return 'New York';
        return 'Off-hours';
    }

    logRealSignal(signal) {
        const signalLog = {
            id: Date.now(),
            timestamp: Date.now(),
            type: 'REAL_SIGNAL',
            
            // Core signal data
            direction: signal.direction,
            confidence: signal.confidence,
            asset: signal.asset,
            platform: signal.platform,
            reason: signal.reason,
            
            // Verification flags
            verified: signal.verified,
            source_verified: signal.source_verified,
            real_data: signal.real_data,
            
            // Risk data
            risk_assessment: signal.risk_assessment,
            position_size: signal.position_size,
            
            // Technical details
            technical_details: signal.technical_details,
            extraction_method: signal.extraction_method,
            data_quality: signal.data_quality,
            
            // Timing
            entry_window: signal.entry_window,
            market_session: signal.market_session
        };
        
        // Add to signal history
        this.signalHistory.unshift(signalLog);
        
        // Keep only last 100 signals
        if (this.signalHistory.length > 100) {
            this.signalHistory = this.signalHistory.slice(0, 100);
        }
        
        // Store in chrome storage
        chrome.storage.local.set({ 
            signalLogs: this.signalHistory.slice(0, 50),
            lastRealSignal: signalLog
        });
        
        console.log('[Candle Sniper] 📝 REAL signal logged with full verification');
    }
    
    // ==================== OTC MODE HANDLERS ====================
    
    /**
     * Handle OTC mode activation
     */
    async handleActivateOTCMode(data, sender, sendResponse) {
        try {
            console.log('[Background] Activating OTC mode...');
            
            // Initialize OTC mode handler if not already done
            if (!window.otcModeHandler) {
                await this.initializeOTCMode();
            }
            
            if (window.otcModeHandler) {
                const result = await window.otcModeHandler.activateOTCMode(data);
                
                // If activation successful, inject content script
                if (result.success && sender.tab?.id) {
                    await this.injectOTCContentScript(sender.tab.id);
                }
                
                sendResponse(result);
            } else {
                sendResponse({ 
                    success: false, 
                    error: 'OTC mode handler not available' 
                });
            }
        } catch (error) {
            console.error('[Background] Error activating OTC mode:', error);
            
            // Use error handler if available
            if (window.otcErrorHandler) {
                await window.otcErrorHandler.handleError(error, 'SYSTEM', {
                    context: 'activate_otc_mode',
                    data: data
                });
            }
            
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }
    
    /**
     * Handle OTC mode deactivation
     */
    async handleDeactivateOTCMode(sender, sendResponse) {
        try {
            console.log('[Background] Deactivating OTC mode...');
            
            if (window.otcModeHandler) {
                const result = await window.otcModeHandler.deactivateOTCMode();
                sendResponse(result);
            } else {
                sendResponse({ 
                    success: false, 
                    error: 'OTC mode handler not available' 
                });
            }
        } catch (error) {
            console.error('[Background] Error deactivating OTC mode:', error);
            
            // Use error handler if available
            if (window.otcErrorHandler) {
                await window.otcErrorHandler.handleError(error, 'SYSTEM', {
                    context: 'deactivate_otc_mode'
                });
            }
            
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }
    
    /**
     * Handle get OTC status
     */
    async handleGetOTCStatus(sendResponse) {
        try {
            if (window.otcModeHandler) {
                const status = await window.otcModeHandler.getStatus();
                sendResponse(status);
            } else {
                sendResponse({
                    isExtracting: false,
                    broker: 'Unknown',
                    lastUpdate: null,
                    error: 'OTC mode handler not available'
                });
            }
        } catch (error) {
            console.error('[Background] Error getting OTC status:', error);
            sendResponse({
                isExtracting: false,
                broker: 'Unknown',
                lastUpdate: null,
                error: error.message
            });
        }
    }
    
    /**
     * Handle get available OTC pairs
     */
    async handleGetAvailableOTCPairs(sendResponse) {
        try {
            if (window.otcModeHandler) {
                const pairs = await window.otcModeHandler.getAvailablePairs();
                sendResponse({
                    success: true,
                    pairs: pairs || []
                });
            } else {
                sendResponse({
                    success: false,
                    pairs: [],
                    error: 'OTC mode handler not available'
                });
            }
        } catch (error) {
            console.error('[Background] Error getting available OTC pairs:', error);
            sendResponse({
                success: false,
                pairs: [],
                error: error.message
            });
        }
    }
    
    /**
     * Handle get OTC historical data
     */
    async handleGetOTCHistoricalData(data, sendResponse) {
        try {
            if (window.otcModeHandler) {
                const historicalData = await window.otcModeHandler.getHistoricalData(
                    data.pair, 
                    data.timeframe, 
                    data.limit
                );
                sendResponse({
                    success: true,
                    data: historicalData
                });
            } else {
                sendResponse({
                    success: false,
                    data: null,
                    error: 'OTC mode handler not available'
                });
            }
        } catch (error) {
            console.error('[Background] Error getting OTC historical data:', error);
            sendResponse({
                success: false,
                data: null,
                error: error.message
            });
        }
    }
    
    /**
     * Handle generate OTC signal
     */
    async handleGenerateOTCSignal(data, sendResponse) {
        try {
            if (window.otcModeHandler) {
                const signal = await window.otcModeHandler.generateSignal(
                    data.pair, 
                    data.timeframe
                );
                sendResponse({
                    success: true,
                    signal: signal
                });
            } else {
                sendResponse({
                    success: false,
                    signal: null,
                    error: 'OTC mode handler not available'
                });
            }
        } catch (error) {
            console.error('[Background] Error generating OTC signal:', error);
            sendResponse({
                success: false,
                signal: null,
                error: error.message
            });
        }
    }
    
    /**
     * Handle place OTC trade
     */
    async handlePlaceOTCTrade(data, sender, sendResponse) {
        try {
            if (!sender.tab?.id) {
                sendResponse({
                    success: false,
                    error: 'No active tab for trade execution'
                });
                return;
            }
            
            // Send trade request to content script
            chrome.tabs.sendMessage(sender.tab.id, {
                action: 'PLACE_OTC_TRADE',
                data: data
            }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({
                        success: false,
                        error: chrome.runtime.lastError.message
                    });
                } else {
                    // Log trade if successful
                    if (response && response.success) {
                        this.logOTCTrade(response.trade);
                    }
                    sendResponse(response);
                }
            });
        } catch (error) {
            console.error('[Background] Error placing OTC trade:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }
    
    /**
     * Handle get OTC trade history
     */
    async handleGetOTCTradeHistory(sendResponse) {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['otcTradeHistory'], (data) => {
                    resolve(data.otcTradeHistory || []);
                });
            });
            
            sendResponse({
                success: true,
                trades: result
            });
        } catch (error) {
            console.error('[Background] Error getting OTC trade history:', error);
            sendResponse({
                success: false,
                trades: [],
                error: error.message
            });
        }
    }
    
    /**
     * Inject OTC content script into tab
     */
    async injectOTCContentScript(tabId) {
        try {
            console.log('[Background] Injecting OTC content script into tab:', tabId);
            
            // Check if content script is already injected
            const response = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tabId, { action: 'PING' }, resolve);
            });
            
            if (response && response.success) {
                console.log('[Background] OTC content script already active');
                return;
            }
            
            // Inject content script
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['otc-content.js']
            });
            
            console.log('[Background] OTC content script injected successfully');
        } catch (error) {
            console.error('[Background] Error injecting OTC content script:', error);
            
            // Use error handler if available
            if (window.otcErrorHandler) {
                await window.otcErrorHandler.handleError(error, 'SYSTEM', {
                    context: 'inject_otc_content_script',
                    tabId: tabId
                });
            }
        }
    }
    
    /**
     * Log OTC trade
     */
    async logOTCTrade(trade) {
        try {
            const tradeLog = {
                ...trade,
                id: `otc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                type: 'OTC'
            };
            
            // Get existing trade history
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['otcTradeHistory'], resolve);
            });
            
            const tradeHistory = result.otcTradeHistory || [];
            tradeHistory.unshift(tradeLog);
            
            // Keep only last 100 trades
            const limitedHistory = tradeHistory.slice(0, 100);
            
            // Save to storage
            await new Promise((resolve) => {
                chrome.storage.local.set({ otcTradeHistory: limitedHistory }, resolve);
            });
            
            console.log('[Background] OTC trade logged:', tradeLog);
        } catch (error) {
            console.error('[Background] Error logging OTC trade:', error);
        }
    }
}

// Initialize background engine
const candleSniperEngine = new CandleSniperEngine();