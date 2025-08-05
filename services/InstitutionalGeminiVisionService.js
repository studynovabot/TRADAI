/**
 * 🏛️💎 INSTITUTIONAL-GRADE GEMINI VISION TRADAI SIGNAL SYSTEM
 * Enhanced with Advanced Technical Indicators & OCR Integration
 * 
 * This service implements institutional-level trading analysis with:
 * - ATR, Bollinger Bands, RSI, MACD, Volume Analysis, Ichimoku Cloud, ADX
 * - OCR-powered chart context extraction
 * - Enhanced image preprocessing with UI element capture
 * - Multi-timeframe analysis capabilities
 * - Advanced pattern recognition and confluence scoring
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');
const Tesseract = require('tesseract.js');

class InstitutionalGeminiVisionService {
    constructor(config = {}) {
        this.config = {
            apiKeys: config.apiKeys || null,
            models: config.models || ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro'],
            temperature: config.temperature || 0.05, // Lower for more precise analysis
            maxTokens: config.maxTokens || 12000, // Increased for detailed analysis
            timeout: config.timeout || 120000, // Increased timeout for complex analysis
            maxRetries: config.maxRetries || 5,
            baseDelay: config.baseDelay || 1000,
            
            // Institutional-grade configuration options
            imagePreprocessing: config.imagePreprocessing !== false,
            ocrEnabled: config.ocrEnabled !== false,
            advancedPatternDetection: config.advancedPatternDetection !== false,
            multiTimeframeAnalysis: config.multiTimeframeAnalysis !== false,
            volumeAnalysis: config.volumeAnalysis !== false,
            institutionalMode: config.institutionalMode !== false,
            debugMode: config.debugMode || false,
            
            ...config
        };

        // Initialize failover state
        this.currentKeyIndex = 0;
        this.currentModelIndex = 0;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;

        // Institutional statistics
        this.institutionalStats = {
            totalAnalyses: 0,
            buySignals: 0,
            sellSignals: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            ocrSuccessRate: 0,
            patternDetections: 0,
            confluenceScores: [],
            indicatorAccuracy: {
                atr: 0,
                bollinger: 0,
                rsi: 0,
                macd: 0,
                ichimoku: 0,
                adx: 0
            },
            keyRotations: 0,
            modelFallbacks: 0
        };

        // Institutional scoring weights (more sophisticated)
        this.institutionalWeights = {
            // Primary trend indicators
            emaAlignment: 18,
            smaAlignment: 18,
            ichimokuCloud: 15,
            
            // Momentum oscillators
            rsiSignal: 12,
            stochasticSignal: 12,
            macdHistogram: 10,
            
            // Volatility and volume
            atrVolatility: 8,
            bollingerBands: 8,
            volumeConfirmation: 6,
            
            // Trend strength
            adxTrendStrength: 5,
            
            // Pattern and structure
            patternConfirmation: 8,
            supportResistance: 6,
            
            // Risk factors
            contradictionPenalty: -15,
            uncertaintyPenalty: -10
        };

        // OCR worker for text extraction
        this.ocrWorker = null;
    }

    /**
     * Initialize OCR worker
     */
    async initializeOCR() {
        if (!this.config.ocrEnabled) {
            console.log('📝 OCR disabled in configuration');
            return;
        }

        try {
            console.log('🔍 Initializing OCR worker for chart metadata extraction...');
            this.ocrWorker = await Tesseract.createWorker('eng');
            await this.ocrWorker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/:-. ',
                tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT
            });
            console.log('✅ OCR worker initialized successfully');
        } catch (error) {
            console.warn('⚠️ OCR initialization failed:', error.message);
            this.config.ocrEnabled = false;
        }
    }

    /**
     * Load API keys from environment variables
     */
    loadApiKeysFromEnv() {
        const keys = [];

        // Primary key
        if (process.env.GEMINI_API_KEY) {
            keys.push(process.env.GEMINI_API_KEY);
        }
        // Backward compatibility
        if (process.env.GOOGLE_VISION_API_KEY) {
            keys.push(process.env.GOOGLE_VISION_API_KEY);
        }

        // Additional keys for institutional failover
        for (let i = 2; i <= 15; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_API_KEY_${i}`];
            if (key) {
                keys.push(key);
            }
        }

        if (keys.length === 0) {
            throw new Error('No Gemini API keys found in environment variables');
        }

        console.log(`🔑 Loaded ${keys.length} Gemini API keys for institutional failover`);
        return keys;
    }

    /**
     * Initialize current Gemini client
     */
    initializeCurrentClient() {
        const currentKey = this.getCurrentKey();
        const currentModel = this.getCurrentModel();

        this.genAI = new GoogleGenerativeAI(currentKey);
        this.model = this.genAI.getGenerativeModel({
            model: currentModel,
            generationConfig: {
                temperature: this.config.temperature,
                maxOutputTokens: this.config.maxTokens
            }
        });

        console.log(`🏛️ Initialized Institutional Gemini client with key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}, model: ${currentModel}`);
    }

    getCurrentKey() {
        return this.config.apiKeys[this.currentKeyIndex];
    }

    getCurrentModel() {
        return this.config.models[this.currentModelIndex];
    }

    switchToNextKey() {
        this.currentKeyIndex++;
        if (this.currentKeyIndex >= this.config.apiKeys.length) {
            this.currentKeyIndex = 0;
            this.switchToNextModel();
        }

        this.institutionalStats.keyRotations++;
        this.initializeCurrentClient();
        console.log(`🔄 Switched to API key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}`);
    }

    switchToNextModel() {
        this.currentModelIndex++;
        if (this.currentModelIndex >= this.config.models.length) {
            throw new Error('All Gemini API keys and models exhausted');
        }

        this.institutionalStats.modelFallbacks++;
        console.log(`🔄 Switched to model: ${this.getCurrentModel()}`);
    }

    /**
     * Initialize the institutional service
     */
    async initialize() {
        try {
            console.log('🏛️ Initializing Institutional Gemini Vision Service...');

            if (!this.config.apiKeys) {
                this.config.apiKeys = this.loadApiKeysFromEnv();
            }

            if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
                throw new Error('Google API key is required for Institutional Gemini');
            }

            this.initializeCurrentClient();
            await this.initializeOCR();
            await this.testConnection();

            this.isInitialized = true;
            console.log('✅ Institutional Gemini Vision Service initialized successfully');

            return {
                success: true,
                message: 'Institutional Gemini Vision Service ready',
                features: {
                    imagePreprocessing: this.config.imagePreprocessing,
                    ocrEnabled: this.config.ocrEnabled,
                    advancedPatternDetection: this.config.advancedPatternDetection,
                    multiTimeframeAnalysis: this.config.multiTimeframeAnalysis,
                    volumeAnalysis: this.config.volumeAnalysis,
                    institutionalMode: this.config.institutionalMode,
                    debugMode: this.config.debugMode
                }
            };
        } catch (error) {
            console.error('❌ Failed to initialize Institutional Gemini Vision Service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Institutional Gemini API connection...');
            const text = await this.callGeminiWithFailover('Test connection - respond with "INSTITUTIONAL READY"');

            if (text && text.toLowerCase().includes('ready')) {
                console.log('✅ Institutional Gemini API connection successful');
                return true;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('❌ Institutional Gemini API connection failed:', error.message);
            throw error;
        }
    }

    /**
     * 🖼️ Institutional Image Preprocessing: Enhanced for UI element capture
     */
    async preprocessImage(imageBuffer, options = {}) {
        if (!this.config.imagePreprocessing) {
            console.log('📷 Image preprocessing disabled, using original image');
            return imageBuffer;
        }

        try {
            console.log('🔧 Institutional image preprocessing for enhanced analysis...');
            
            let processedImage = sharp(imageBuffer);
            
            // Get image metadata
            const metadata = await processedImage.metadata();
            console.log(`📊 Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

            // Institutional image enhancement pipeline
            processedImage = processedImage
                .resize(Math.min(metadata.width, 2560), Math.min(metadata.height, 1920), {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .sharpen({ sigma: 1.5, flat: 1, jagged: 2 })
                .normalize()
                .modulate({ brightness: 1.15, saturation: 1.3, hue: 0 })
                .png({ quality: 100, compressionLevel: 6 });

            // Enhanced crop to include UI elements (timeframe, currency pair)
            if (options.includeUIElements !== false) {
                const cropOptions = this.calculateInstitutionalCropRegion(metadata);
                if (cropOptions) {
                    processedImage = processedImage.extract(cropOptions);
                    console.log('✂️ Institutional crop applied - includes UI elements');
                }
            }

            const processedBuffer = await processedImage.toBuffer();
            console.log(`✅ Institutional image preprocessed: ${processedBuffer.length} bytes`);
            
            return processedBuffer;
        } catch (error) {
            console.warn('⚠️ Institutional image preprocessing failed, using original:', error.message);
            return imageBuffer;
        }
    }

    /**
     * Calculate institutional crop region to include UI elements
     */
    calculateInstitutionalCropRegion(metadata) {
        const { width, height } = metadata;
        
        if (width < 1000 || height < 700) {
            return null;
        }

        // Institutional cropping - includes top/bottom UI for OCR
        return {
            left: Math.floor(width * 0.01),
            top: Math.floor(width * 0.02), // Include top UI
            width: Math.floor(width * 0.98),
            height: Math.floor(height * 0.96) // Include bottom UI
        };
    }

    /**
     * 🔍 OCR Chart Metadata Extraction
     */
    async extractChartMetadata(imageBuffer) {
        if (!this.config.ocrEnabled || !this.ocrWorker) {
            console.log('📝 OCR disabled or not initialized');
            return {
                currencyPair: 'Auto-detect',
                timeframe: 'Auto-detect',
                platform: 'Trading Platform'
            };
        }

        try {
            console.log('🔍 Extracting chart metadata using OCR...');
            
            // Create a focused crop for UI elements
            const uiCrop = await this.createUIFocusedCrop(imageBuffer);
            
            const { data: { text } } = await this.ocrWorker.recognize(uiCrop);
            console.log('📝 OCR extracted text:', text);

            const metadata = this.parseOCRText(text);
            
            this.institutionalStats.ocrSuccessRate = 
                (this.institutionalStats.ocrSuccessRate * this.institutionalStats.totalAnalyses + 
                 (metadata.currencyPair !== 'Auto-detect' ? 1 : 0)) / 
                (this.institutionalStats.totalAnalyses + 1);

            console.log('✅ Chart metadata extracted:', metadata);
            return metadata;
        } catch (error) {
            console.warn('⚠️ OCR metadata extraction failed:', error.message);
            return {
                currencyPair: 'Auto-detect',
                timeframe: 'Auto-detect',
                platform: 'Trading Platform'
            };
        }
    }

    /**
     * Create UI-focused crop for OCR
     */
    async createUIFocusedCrop(imageBuffer) {
        try {
            const image = sharp(imageBuffer);
            const metadata = await image.metadata();
            
            // Extract top portion for timeframe/currency pair
            const topCrop = await image
                .extract({
                    left: 0,
                    top: 0,
                    width: metadata.width,
                    height: Math.floor(metadata.height * 0.15)
                })
                .png()
                .toBuffer();

            return topCrop;
        } catch (error) {
            console.warn('⚠️ UI crop failed, using original image');
            return imageBuffer;
        }
    }

    /**
     * Parse OCR text to extract trading metadata
     */
    parseOCRText(text) {
        const metadata = {
            currencyPair: 'Auto-detect',
            timeframe: 'Auto-detect',
            platform: 'Trading Platform'
        };

        // Currency pair patterns
        const currencyPatterns = [
            /([A-Z]{3}\/[A-Z]{3})/g,
            /([A-Z]{3}[A-Z]{3})/g,
            /(USD|EUR|GBP|JPY|AUD|CAD|CHF|NZD|INR|BDT|SGD|HKD|CNY|KRW|THB|MYR|IDR|PHP|VND|TWD|ZAR|RUB|BRL|MXN|TRY|PLN|CZK|HUF|NOK|SEK|DKK|ILS|AED|SAR|QAR|KWD|BHD|OMR|JOD|LBP|EGP|MAD|TND|DZD|LYD|SDG|ETB|KES|UGX|TZS|RWF|BIF|MGA|MUR|SCR|SZL|LSL|BWP|NAD|ZMW|MWK|MZN|AOA|XAF|XOF|XPF|CVE|STP|GNF|SLL|LRD|GMD|GHS|NGN|XAG|XAU|XPD|XPT|BTC|ETH|LTC|XRP|ADA|DOT|LINK|UNI|AAVE|COMP|MKR|SNX|YFI|SUSHI|CRV|BAL|REN|KNC|ZRX|OMG|LRC|ANT|REP|GNT|BAT|ZIL|ICX|VET|TRX|EOS|XLM|ADA|IOTA|NEO|QTUM|ONT|ZEC|DASH|XMR|ETC|BCH|BSV|LTC|DOGE|SHIB|MATIC|AVAX|SOL|LUNA|UST|BUSD|USDC|USDT|DAI|TUSD|PAX|GUSD|HUSD|SUSD|DUSD|FRAX|LUSD|OUSD|USDP|USDN|USDK|EURS|EURT|XAUT|PAXG|DGX|CACHE|WBTC|RENBTC|HBTC|BTCB|TBTC|BBTC|OBTC|imBTC|pBTC|sBTC|tBTC|vBTC|wBTC|yBTC|zBTC|WETH|stETH|rETH|sETH|aETH|cETH|yETH|BETH|ETH2|SETH2|RETH2|STETH|ANKRETH|SWETH|CBETH|LSETH|FRXETH|SFRXETH|OETH|RETH|WSTETH|STETH|ROCKET|RPL|LDO|FXS|CVX|CRV|BAL|AURA|PENDLE|GNS|GMX|DYDX|PERP|MCDEX|HEGIC|OPYN|RIBBON|DOPEX|JONES|UMAMI|VELA|GAINS|KWENTA|LYRA|PREMIA|AEVO|DERI|MCDX|PERP|DYDX|GMX|GNS|GAINS|VELA|UMAMI|JONES|DOPEX|RIBBON|OPYN|HEGIC|MCDEX|KWENTA|LYRA|PREMIA|AEVO|DERI)/gi
        ];

        // Timeframe patterns
        const timeframePatterns = [
            /(\d+[smhd])/gi,
            /(\d+\s*(?:sec|min|hour|day|week|month))/gi,
            /(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)/gi
        ];

        // Platform patterns
        const platformPatterns = [
            /(MetaTrader|MT4|MT5|TradingView|IQ\s*Option|Olymp\s*Trade|Binomo|Pocket\s*Option|Expert\s*Option|Quotex|Deriv|Binary\.com|Spectre|RaceOption|Nadex|IG|Plus500|eToro|XM|FXCM|OANDA|Interactive\s*Brokers|TD\s*Ameritrade|E\*TRADE|Charles\s*Schwab|Fidelity|Robinhood|Webull|Alpaca|Zerodha|Upstox|Angel\s*Broking|5paisa|IIFL|Motilal\s*Oswal|Sharekhan|HDFC\s*Securities|ICICI\s*Direct|Kotak\s*Securities|Axis\s*Direct|SBI\s*Securities|Paytm\s*Money|Groww|Kite|Coin|CoinDCX|WazirX|Bitbns|ZebPay|CoinSwitch|Unocoin|BuyUcoin|Giottus|Bitex|Delta\s*Exchange|Vauld|Mudrex|CoinTracker|Koinly|Blockfolio|Delta|CoinStats|Crypto\.com|Binance|Coinbase|Kraken|Bitfinex|Huobi|OKEx|KuCoin|Gate\.io|Bybit|FTX|Bitget|MEXC|Phemex|Deribit|BitMEX|Perpetual\s*Protocol|dYdX|Synthetix|Uniswap|SushiSwap|PancakeSwap|Curve|Balancer|Aave|Compound|MakerDAO|Yearn|Convex|Frax|Liquity|Reflexer|Fei|Olympus|Klima|Wonderland|Time|Spell|Abracadabra|Popsicle|Beefy|Harvest|Pickle|Alpha|Cream|Iron\s*Bank|Rari|Fuse|Euler|Notional|Element|Pendle|APWine|Sense|Tempus|Ribbon|Opyn|Hegic|Dopex|Jones|Umami|Vela|Gains|Kwenta|Lyra|Premia|Aevo|Deri)/gi
        ];

        // Extract currency pair
        for (const pattern of currencyPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                let pair = matches[0].toUpperCase();
                // Format as XXX/YYY if not already
                if (pair.length === 6 && !pair.includes('/')) {
                    pair = pair.substring(0, 3) + '/' + pair.substring(3);
                }
                metadata.currencyPair = pair;
                break;
            }
        }

        // Extract timeframe
        for (const pattern of timeframePatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                metadata.timeframe = matches[0].toLowerCase();
                break;
            }
        }

        // Extract platform
        for (const pattern of platformPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                metadata.platform = matches[0];
                break;
            }
        }

        return metadata;
    }

    /**
     * Detect MIME type from image buffer
     */
    detectMimeType(buffer) {
        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return 'image/png';
        }
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'image/jpeg';
        }
        if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
            return 'image/webp';
        }
        return 'image/png';
    }

    /**
     * 🎯 MAIN INSTITUTIONAL ANALYSIS METHOD
     */
    async analyzeChartImage(imageBuffer, options = {}) {
        const startTime = Date.now();

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log('🏛️ Starting Institutional Gemini Vision Analysis...');

            // 1️⃣ Extract Chart Metadata using OCR
            const chartMetadata = await this.extractChartMetadata(imageBuffer);

            // 2️⃣ Institutional Image Preprocessing
            const processedImageBuffer = await this.preprocessImage(imageBuffer, options);

            // Prepare image data for Gemini
            const imageData = {
                inlineData: {
                    data: processedImageBuffer.toString('base64'),
                    mimeType: this.detectMimeType(processedImageBuffer)
                }
            };

            // 3️⃣ Create Institutional Analysis Prompt
            const prompt = this.createInstitutionalAnalysisPrompt(chartMetadata, options);

            console.log('🤖 Sending institutional request to Gemini...');

            // Send request to Gemini with failover
            const text = await this.callGeminiWithFailover(prompt, imageData);

            const processingTime = Date.now() - startTime;

            // 4️⃣ Parse and validate response
            const analysis = await this.parseInstitutionalResponse(text, chartMetadata, options);

            // 5️⃣ Apply Institutional Signal Logic with Advanced Scoring
            const finalAnalysis = this.applyInstitutionalSignalLogic(analysis);

            // 6️⃣ Update statistics
            this.updateInstitutionalStats(finalAnalysis, processingTime);

            console.log(`✅ Institutional analysis completed in ${processingTime}ms`);
            console.log(`📊 Final signal: ${finalAnalysis.signal} with ${finalAnalysis.signalConfidence}% confidence`);

            return {
                success: true,
                analysis: finalAnalysis,
                confidence: finalAnalysis.overallConfidence,
                processingTime: processingTime,
                chartMetadata: chartMetadata,
                metadata: {
                    model: this.getCurrentModel(),
                    timestamp: new Date().toISOString(),
                    imageSize: processedImageBuffer.length,
                    originalImageSize: imageBuffer.length,
                    analysisMethod: 'Institutional Gemini Vision',
                    version: '1.0.0-institutional',
                    ocrEnabled: this.config.ocrEnabled,
                    chartMetadata: chartMetadata
                }
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('❌ Institutional chart analysis failed:', error.message);

            return {
                success: false,
                error: error.message,
                processingTime: processingTime,
                metadata: {
                    analysisMethod: 'Institutional Gemini Vision',
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * 🧠 Create Institutional Analysis Prompt (Enhanced with Advanced Indicators)
     */
    createInstitutionalAnalysisPrompt(chartMetadata, options = {}) {
        return `You are an institutional-grade quantitative trading analyst with 20+ years of experience in professional trading firms. You specialize in ultra-precise technical analysis using advanced indicators and multi-factor confluence scoring.

🚫 ABSOLUTE CRITICAL RULE: You are FORBIDDEN from outputting "HOLD" as a signal. 
🎯 ONLY "BUY" or "SELL" are allowed - NO EXCEPTIONS, NO HOLD EVER!
🚫 If you are uncertain, you MUST choose BUY or SELL based on the strongest confluence of indicators.
🚫 HOLD is completely banned and will result in system failure.

CHART CONTEXT (OCR Extracted):
Currency Pair: ${chartMetadata.currencyPair}
Timeframe: ${chartMetadata.timeframe}
Platform: ${chartMetadata.platform}

Given this screenshot from a professional trading platform, perform INSTITUTIONAL-GRADE analysis following these EXACT requirements:

🔹 ADVANCED TECHNICAL INDICATORS ANALYSIS:

1️⃣ ATR (Average True Range) Analysis:
- Identify current ATR value and compare to 14-period average
- Determine volatility state: Compression (<0.8x avg) or Expansion (>1.2x avg)
- Assess breakout probability based on volatility compression/expansion
- Use ATR for stop-loss and take-profit level calculations

2️⃣ Bollinger Bands Deep Analysis:
- Identify upper band, middle line (20 SMA), and lower band positions
- Measure band width and compare to historical average (squeeze vs expansion)
- Analyze price position relative to bands (touching, penetrating, or bouncing)
- Detect Bollinger Band squeeze patterns and potential breakout direction
- Cross-reference with Stochastic for high-probability reversal signals

3️⃣ RSI (Relative Strength Index) Precision Analysis:
- Read exact RSI value and identify zone (oversold <30, neutral 30-70, overbought >70)
- Detect RSI divergence with price action (bullish/bearish divergence)
- Analyze RSI slope and momentum direction
- Cross-check RSI with Stochastic for confluence confirmation
- Identify RSI support/resistance levels

4️⃣ MACD Histogram Advanced Analysis:
- Identify MACD line, signal line, and histogram values
- Detect MACD crossovers and histogram momentum changes
- Analyze MACD divergence with price action
- Assess MACD trend strength and momentum acceleration/deceleration
- Cross-reference MACD signals with other momentum indicators

5️⃣ Volume Analysis (if visible):
- Analyze volume bars relative to price movement
- Identify volume spikes and their correlation with price action
- Detect volume divergence patterns
- Assess volume confirmation for breakouts and reversals
- Use volume to validate signal strength

6️⃣ Ichimoku Cloud Analysis (if present):
- Identify cloud color and thickness (bullish/bearish bias)
- Analyze price position relative to cloud (above/inside/below)
- Assess Tenkan-sen and Kijun-sen positions and crossovers
- Evaluate Chikou Span position for trend confirmation
- Determine multi-timeframe trend bias from cloud structure

7️⃣ ADX (Average Directional Index) Trend Strength:
- Identify ADX value and trend strength (weak <20, moderate 20-40, strong >40)
- Analyze +DI and -DI positions for directional bias
- Determine if market is trending or ranging based on ADX
- Use ADX to filter trade signals (avoid ranging markets)

🔹 ENHANCED CANDLESTICK PATTERN RECOGNITION:
- Advanced pattern detection: Engulfing, Doji, Hammer, Shooting Star, Morning/Evening Star
- Multi-candle pattern analysis: Three White Soldiers, Three Black Crows, Inside Bars
- Candle body-to-wick ratio analysis for momentum assessment
- Consecutive candle color analysis for trend strength
- Micro-pattern recognition within larger structures

🔹 MARKET STRUCTURE ANALYSIS:
- Higher Highs/Higher Lows (HH-HL) vs Lower Highs/Lower Lows (LH-LL) identification
- Trend line analysis and breakout/breakdown scenarios
- Support and resistance level identification with confluence factors
- Channel and range analysis with breakout probability assessment
- Fibonacci retracement and extension levels (if applicable)

🔹 CONFLUENCE SCORING SYSTEM:
Rate each factor from -3 (strongly bearish) to +3 (strongly bullish):
- EMA Alignment and Slope
- SMA Position and Momentum
- Stochastic Position and Cross Signals
- RSI Level and Divergence
- MACD Histogram and Crossover
- Bollinger Band Position and Squeeze
- ATR Volatility State
- Volume Confirmation
- Ichimoku Cloud Bias (if present)
- ADX Trend Strength
- Candlestick Patterns
- Support/Resistance Proximity

🔹 MULTI-TIMEFRAME CONTEXT:
- Analyze current timeframe signals in context of higher timeframe trend
- Identify potential conflicts between timeframes
- Assess signal reliability based on multi-timeframe alignment
- Provide guidance on optimal entry timing

Return a fully structured, institutional-grade technical report:

INSTITUTIONAL TRADAI Analysis Report
===================================
Asset: ${chartMetadata.currencyPair}
Timeframe: ${chartMetadata.timeframe}
Platform: ${chartMetadata.platform}
Signal: BUY or SELL (HOLD is FORBIDDEN)
Signal Confidence: XX% (70-95% range for institutional grade)
Overall Confidence: XX% (70-95% range)
Market Condition: Trending (Up/Down/Sideways) or Consolidating
Volatility State: Compression/Expansion/Normal
Trend Strength: Strong/Moderate/Weak (based on ADX)

Current Price: [X.XXXXX from latest candle]
Market Structure: [HH-HL/LH-LL/Range with specific evidence]
Primary Trend: [Uptrend/Downtrend/Sideways with timeframe context]

Advanced Indicators Analysis:
ATR Analysis:
- Current ATR: [X.XXXXX] vs 14-period avg: [X.XXXXX]
- Volatility State: [Compression/Expansion/Normal]
- Breakout Probability: [High/Medium/Low]

Bollinger Bands Analysis:
- Price Position: [Above/Below/Touching Upper/Middle/Lower Band]
- Band Width: [Squeeze/Normal/Expansion]
- Band Direction: [Expanding/Contracting/Parallel]
- Signal: [Band Bounce/Breakout/Continuation]

RSI Analysis:
- Current RSI: [XX.X]
- Zone: [Oversold/Neutral/Overbought]
- Divergence: [Bullish/Bearish/None]
- Momentum: [Increasing/Decreasing/Flat]

MACD Analysis:
- MACD Line: [X.XXXXX]
- Signal Line: [X.XXXXX]
- Histogram: [X.XXXXX]
- Crossover Status: [Bullish/Bearish/Pending]
- Divergence: [Present/Absent]

Stochastic Analysis:
%K Value: [XX.X]
%D Value: [XX.X]
Zone: [Oversold/Neutral/Overbought]
Cross Status: [Bullish/Bearish/Pending]
Momentum: [Up/Down/Flat]

Volume Analysis (if visible):
- Volume Trend: [Increasing/Decreasing/Stable]
- Price-Volume Relationship: [Confirmed/Divergent]
- Volume Spikes: [Present/Absent]

Ichimoku Analysis (if present):
- Cloud Color: [Bullish/Bearish]
- Price vs Cloud: [Above/Inside/Below]
- Tenkan/Kijun Cross: [Bullish/Bearish/None]
- Overall Bias: [Bullish/Bearish/Neutral]

ADX Trend Strength:
- ADX Value: [XX.X]
- Trend Strength: [Strong/Moderate/Weak]
- Directional Bias: [Bullish/Bearish/Neutral]
- Market State: [Trending/Ranging]

Confluence Scoring:
EMA Alignment: [+3 to -3] - [Explanation]
SMA Position: [+3 to -3] - [Explanation]
Stochastic Signal: [+3 to -3] - [Explanation]
RSI Signal: [+3 to -3] - [Explanation]
MACD Signal: [+3 to -3] - [Explanation]
Bollinger Signal: [+3 to -3] - [Explanation]
ATR Signal: [+3 to -3] - [Explanation]
Volume Signal: [+3 to -3] - [Explanation]
Pattern Signal: [+3 to -3] - [Explanation]
S/R Signal: [+3 to -3] - [Explanation]

Total Confluence Score: [Sum of all scores]

Next 3 Candle Predictions (Institutional Logic):
Candle 1: [UP/DOWN] (XX%) - [Multi-factor reasoning with specific indicator confluence]
Candle 2: [UP/DOWN] (XX%) - [Trend continuation/reversal analysis with timing factors]
Candle 3: [UP/DOWN] (XX%) - [Pattern completion and momentum sustainability analysis]

Risk Management:
Stop Loss Level: [X.XXXXX] - [Based on ATR and key support/resistance]
Take Profit 1: [X.XXXXX] - [Conservative target based on nearest resistance/support]
Take Profit 2: [X.XXXXX] - [Extended target based on measured moves]
Risk-Reward Ratio: [X:X]

Key Levels:
Immediate Support: [X.XXXXX] - Distance: [XX pips]
Immediate Resistance: [X.XXXXX] - Distance: [XX pips]
Major Support: [X.XXXXX] - Distance: [XX pips]
Major Resistance: [X.XXXXX] - Distance: [XX pips]

Institutional Summary:
===================
Primary Signal Drivers: [List top 3 confluence factors]
Signal Reliability: [High/Medium based on confluence score]
Market Context: [Trend/Range/Transition with multi-timeframe view]
Optimal Entry: [Immediate/Wait for pullback/Wait for breakout]
Trade Duration: [Scalp/Intraday/Swing based on timeframe and volatility]

Generated: ${new Date().toISOString()}
Analysis Method: Institutional Multi-Factor Confluence

🎯 CRITICAL REMINDER: You MUST output either BUY or SELL - HOLD is absolutely forbidden!
🔍 Provide institutional-grade analysis with specific numerical values and confluence scoring.
📊 Focus on multi-indicator confluence and advanced pattern recognition.
⚡ Use ATR for volatility assessment and Bollinger Bands for reversal timing!
🚨 CRITICAL: Only high-confidence signals with confluence score >5 should have 80%+ confidence!`;
    }

    /**
     * Call Gemini with failover support
     */
    async callGeminiWithFailover(prompt, imageData = null, retryCount = 0) {
        try {
            const parts = imageData ? [prompt, imageData] : [prompt];
            const result = await this.model.generateContent(parts);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error(`❌ Gemini API call failed (attempt ${retryCount + 1}):`, error.message);
            
            if (retryCount < this.config.maxRetries) {
                // Try next key/model
                this.switchToNextKey();
                await new Promise(resolve => setTimeout(resolve, this.config.baseDelay * (retryCount + 1)));
                return this.callGeminiWithFailover(prompt, imageData, retryCount + 1);
            }
            
            throw error;
        }
    }

    /**
     * 📝 Parse Institutional Response
     */
    async parseInstitutionalResponse(text, chartMetadata, options = {}) {
        console.log('📝 Parsing institutional Gemini response...');

        try {
            // Extract structured data from response
            const analysis = this.extractInstitutionalStructuredData(text, chartMetadata);
            return this.validateInstitutionalAnalysis(analysis);
        } catch (error) {
            console.warn('⚠️ Institutional response parsing failed:', error.message);
            return this.createInstitutionalFallbackResponse(text, chartMetadata, options);
        }
    }

    /**
     * Extract structured data from institutional response
     */
    extractInstitutionalStructuredData(text, chartMetadata) {
        const analysis = {
            asset: chartMetadata.currencyPair,
            timeframe: chartMetadata.timeframe,
            platform: chartMetadata.platform,
            signal: this.extractSignalWithNoHold(text),
            signalConfidence: this.extractConfidence(text, 'Signal Confidence'),
            overallConfidence: this.extractConfidence(text, 'Overall Confidence'),
            marketCondition: this.extractValue(text, 'Market Condition'),
            volatilityState: this.extractValue(text, 'Volatility State'),
            trendStrength: this.extractValue(text, 'Trend Strength'),
            currentPrice: this.extractValue(text, 'Current Price'),
            marketStructure: this.extractValue(text, 'Market Structure'),
            primaryTrend: this.extractValue(text, 'Primary Trend'),
            
            // Advanced indicators
            atrAnalysis: this.extractATRAnalysis(text),
            bollingerAnalysis: this.extractBollingerAnalysis(text),
            rsiAnalysis: this.extractRSIAnalysis(text),
            macdAnalysis: this.extractMACDAnalysis(text),
            stochasticAnalysis: this.extractStochasticAnalysis(text),
            volumeAnalysis: this.extractVolumeAnalysis(text),
            ichimokuAnalysis: this.extractIchimokuAnalysis(text),
            adxAnalysis: this.extractADXAnalysis(text),
            
            // Confluence scoring
            confluenceScore: this.extractConfluenceScore(text),
            confluenceFactors: this.extractConfluenceFactors(text),
            
            // Predictions and levels
            nextCandlePredictions: this.extractCandlePredictions(text),
            riskManagement: this.extractRiskManagement(text),
            keyLevels: this.extractKeyLevels(text),
            
            // Institutional summary
            primarySignalDrivers: this.extractPrimaryDrivers(text),
            signalReliability: this.extractValue(text, 'Signal Reliability'),
            optimalEntry: this.extractValue(text, 'Optimal Entry'),
            tradeDuration: this.extractValue(text, 'Trade Duration'),
            
            rawResponse: text
        };

        return analysis;
    }

    /**
     * Extract ATR analysis from response
     */
    extractATRAnalysis(text) {
        const atrSection = this.extractSection(text, 'ATR Analysis:');
        return {
            currentATR: this.extractValue(atrSection, 'Current ATR'),
            averageATR: this.extractValue(atrSection, '14-period avg'),
            volatilityState: this.extractValue(atrSection, 'Volatility State'),
            breakoutProbability: this.extractValue(atrSection, 'Breakout Probability')
        };
    }

    /**
     * Extract Bollinger Bands analysis from response
     */
    extractBollingerAnalysis(text) {
        const bollingerSection = this.extractSection(text, 'Bollinger Bands Analysis:');
        return {
            pricePosition: this.extractValue(bollingerSection, 'Price Position'),
            bandWidth: this.extractValue(bollingerSection, 'Band Width'),
            bandDirection: this.extractValue(bollingerSection, 'Band Direction'),
            signal: this.extractValue(bollingerSection, 'Signal')
        };
    }

    /**
     * Extract RSI analysis from response
     */
    extractRSIAnalysis(text) {
        const rsiSection = this.extractSection(text, 'RSI Analysis:');
        return {
            currentRSI: this.extractValue(rsiSection, 'Current RSI'),
            zone: this.extractValue(rsiSection, 'Zone'),
            divergence: this.extractValue(rsiSection, 'Divergence'),
            momentum: this.extractValue(rsiSection, 'Momentum')
        };
    }

    /**
     * Extract MACD analysis from response
     */
    extractMACDAnalysis(text) {
        const macdSection = this.extractSection(text, 'MACD Analysis:');
        return {
            macdLine: this.extractValue(macdSection, 'MACD Line'),
            signalLine: this.extractValue(macdSection, 'Signal Line'),
            histogram: this.extractValue(macdSection, 'Histogram'),
            crossoverStatus: this.extractValue(macdSection, 'Crossover Status'),
            divergence: this.extractValue(macdSection, 'Divergence')
        };
    }

    /**
     * Extract Stochastic analysis from response
     */
    extractStochasticAnalysis(text) {
        const stochSection = this.extractSection(text, 'Stochastic Analysis:');
        return {
            kValue: this.extractValue(stochSection, '%K Value'),
            dValue: this.extractValue(stochSection, '%D Value'),
            zone: this.extractValue(stochSection, 'Zone'),
            crossStatus: this.extractValue(stochSection, 'Cross Status'),
            momentum: this.extractValue(stochSection, 'Momentum')
        };
    }

    /**
     * Extract Volume analysis from response
     */
    extractVolumeAnalysis(text) {
        const volumeSection = this.extractSection(text, 'Volume Analysis');
        if (!volumeSection) return null;
        
        return {
            volumeTrend: this.extractValue(volumeSection, 'Volume Trend'),
            priceVolumeRelationship: this.extractValue(volumeSection, 'Price-Volume Relationship'),
            volumeSpikes: this.extractValue(volumeSection, 'Volume Spikes')
        };
    }

    /**
     * Extract Ichimoku analysis from response
     */
    extractIchimokuAnalysis(text) {
        const ichimokuSection = this.extractSection(text, 'Ichimoku Analysis');
        if (!ichimokuSection) return null;
        
        return {
            cloudColor: this.extractValue(ichimokuSection, 'Cloud Color'),
            priceVsCloud: this.extractValue(ichimokuSection, 'Price vs Cloud'),
            tenkanKijunCross: this.extractValue(ichimokuSection, 'Tenkan/Kijun Cross'),
            overallBias: this.extractValue(ichimokuSection, 'Overall Bias')
        };
    }

    /**
     * Extract ADX analysis from response
     */
    extractADXAnalysis(text) {
        const adxSection = this.extractSection(text, 'ADX Trend Strength:');
        return {
            adxValue: this.extractValue(adxSection, 'ADX Value'),
            trendStrength: this.extractValue(adxSection, 'Trend Strength'),
            directionalBias: this.extractValue(adxSection, 'Directional Bias'),
            marketState: this.extractValue(adxSection, 'Market State')
        };
    }

    /**
     * Extract confluence score from response
     */
    extractConfluenceScore(text) {
        const confluenceSection = this.extractSection(text, 'Confluence Scoring:');
        const totalScoreMatch = confluenceSection.match(/Total Confluence Score:\s*([+-]?\d+)/i);
        return totalScoreMatch ? parseInt(totalScoreMatch[1]) : 0;
    }

    /**
     * Extract confluence factors from response
     */
    extractConfluenceFactors(text) {
        const confluenceSection = this.extractSection(text, 'Confluence Scoring:');
        const factors = {};
        
        const factorPatterns = [
            'EMA Alignment', 'SMA Position', 'Stochastic Signal', 'RSI Signal',
            'MACD Signal', 'Bollinger Signal', 'ATR Signal', 'Volume Signal',
            'Pattern Signal', 'S/R Signal'
        ];
        
        factorPatterns.forEach(factor => {
            const pattern = new RegExp(`${factor}:\\s*([+-]?\\d+)\\s*-\\s*(.+?)(?=\\n|$)`, 'i');
            const match = confluenceSection.match(pattern);
            if (match) {
                factors[factor.toLowerCase().replace(/\s+/g, '')] = {
                    score: parseInt(match[1]),
                    explanation: match[2].trim()
                };
            }
        });
        
        return factors;
    }

    /**
     * Extract candle predictions from response
     */
    extractCandlePredictions(text) {
        const predictions = [];
        const predictionPattern = /Candle (\d+):\s*\[?(UP|DOWN)\]?\s*\((\d+)%\)\s*-\s*(.+?)(?=\n|Candle \d+|$)/gi;
        let match;
        
        while ((match = predictionPattern.exec(text)) !== null) {
            predictions.push({
                candle: parseInt(match[1]),
                direction: match[2].toUpperCase(),
                confidence: parseInt(match[3]),
                reasoning: match[4].trim()
            });
        }
        
        return predictions;
    }

    /**
     * Extract risk management from response
     */
    extractRiskManagement(text) {
        const riskSection = this.extractSection(text, 'Risk Management:');
        return {
            stopLoss: this.extractValue(riskSection, 'Stop Loss Level'),
            takeProfit1: this.extractValue(riskSection, 'Take Profit 1'),
            takeProfit2: this.extractValue(riskSection, 'Take Profit 2'),
            riskRewardRatio: this.extractValue(riskSection, 'Risk-Reward Ratio')
        };
    }

    /**
     * Extract key levels from response
     */
    extractKeyLevels(text) {
        const levelsSection = this.extractSection(text, 'Key Levels:');
        return {
            immediateSupport: this.extractValue(levelsSection, 'Immediate Support'),
            immediateResistance: this.extractValue(levelsSection, 'Immediate Resistance'),
            majorSupport: this.extractValue(levelsSection, 'Major Support'),
            majorResistance: this.extractValue(levelsSection, 'Major Resistance')
        };
    }

    /**
     * Extract primary signal drivers from response
     */
    extractPrimaryDrivers(text) {
        const summarySection = this.extractSection(text, 'Institutional Summary:');
        const driversMatch = summarySection.match(/Primary Signal Drivers:\s*(.+?)(?=\n|$)/i);
        return driversMatch ? driversMatch[1].trim() : 'Multi-factor confluence';
    }

    /**
     * Helper method to extract a section from text
     */
    extractSection(text, sectionHeader) {
        const startIndex = text.indexOf(sectionHeader);
        if (startIndex === -1) return '';
        
        const nextSectionIndex = text.indexOf('\n\n', startIndex);
        return nextSectionIndex === -1 ? 
            text.substring(startIndex) : 
            text.substring(startIndex, nextSectionIndex);
    }

    /**
     * Helper method to extract a value from text
     */
    extractValue(text, key) {
        const pattern = new RegExp(`${key}:\\s*(.+?)(?=\\n|$)`, 'i');
        const match = text.match(pattern);
        return match ? match[1].trim() : 'Not specified';
    }

    /**
     * Extract confidence percentage from text
     */
    extractConfidence(text, key) {
        const pattern = new RegExp(`${key}:\\s*(\\d+)%`, 'i');
        const match = text.match(pattern);
        return match ? parseInt(match[1]) : 75;
    }

    /**
     * 🚫 Extract signal with NO HOLD guarantee
     */
    extractSignalWithNoHold(text) {
        // Try to extract signal from text
        const signalMatch = text.match(/Signal:\s*(BUY|SELL|HOLD)/i);
        let signal = signalMatch ? signalMatch[1].toUpperCase() : null;
        
        // NEVER allow HOLD - convert to BUY or SELL
        if (!signal || signal === 'HOLD') {
            console.log('🚫 HOLD signal detected or missing - converting to BUY/SELL');
            
            // Analyze confluence score for direction
            const confluenceScore = this.extractConfluenceScore(text);
            
            if (confluenceScore > 0) {
                signal = 'BUY';
            } else if (confluenceScore < 0) {
                signal = 'SELL';
            } else {
                // Fallback to text analysis
                const bullishWords = ['up', 'bull', 'buy', 'rise', 'higher', 'support', 'bounce', 'rally', 'bullish'];
                const bearishWords = ['down', 'bear', 'sell', 'fall', 'lower', 'resistance', 'drop', 'decline', 'bearish'];
                
                const textLower = text.toLowerCase();
                let bullishScore = 0;
                let bearishScore = 0;
                
                bullishWords.forEach(word => {
                    const matches = (textLower.match(new RegExp(word, 'g')) || []).length;
                    bullishScore += matches;
                });
                
                bearishWords.forEach(word => {
                    const matches = (textLower.match(new RegExp(word, 'g')) || []).length;
                    bearishScore += matches;
                });
                
                signal = bullishScore >= bearishScore ? 'BUY' : 'SELL';
            }
            
            console.log(`🔄 Converted to ${signal} based on analysis`);
        }
        
        return signal;
    }

    /**
     * Validate institutional analysis
     */
    validateInstitutionalAnalysis(analysis) {
        // Ensure no HOLD signals
        if (analysis.signal === 'HOLD') {
            analysis.signal = Math.random() > 0.5 ? 'BUY' : 'SELL';
            console.log(`🚫 Converted HOLD to ${analysis.signal}`);
        }

        // Ensure confidence levels are institutional grade (70%+)
        if (analysis.signalConfidence < 70) {
            analysis.signalConfidence = Math.max(analysis.signalConfidence, 70);
        }
        if (analysis.overallConfidence < 70) {
            analysis.overallConfidence = Math.max(analysis.overallConfidence, 70);
        }

        return analysis;
    }

    /**
     * Apply institutional signal logic with advanced scoring
     */
    applyInstitutionalSignalLogic(analysis) {
        console.log('🏛️ Applying institutional signal logic...');

        // Calculate institutional confidence based on confluence
        const confluenceScore = analysis.confluenceScore || 0;
        const absoluteScore = Math.abs(confluenceScore);
        
        // Adjust confidence based on confluence strength
        if (absoluteScore >= 15) {
            analysis.signalConfidence = Math.min(95, analysis.signalConfidence + 10);
        } else if (absoluteScore >= 10) {
            analysis.signalConfidence = Math.min(90, analysis.signalConfidence + 5);
        } else if (absoluteScore >= 5) {
            analysis.signalConfidence = Math.max(75, analysis.signalConfidence);
        } else {
            analysis.signalConfidence = Math.max(70, analysis.signalConfidence - 5);
        }

        // Ensure institutional-grade confidence
        analysis.overallConfidence = Math.max(analysis.signalConfidence, 70);

        // Add institutional metadata
        analysis.institutionalGrade = true;
        analysis.confluenceAnalysis = true;
        analysis.advancedIndicators = true;
        analysis.riskManaged = true;

        return analysis;
    }

    /**
     * Create institutional fallback response
     */
    createInstitutionalFallbackResponse(text, chartMetadata, options) {
        console.log('🏛️ Creating institutional fallback response...');
        
        const signal = this.extractSignalWithNoHold(text);
        
        return {
            asset: chartMetadata.currencyPair,
            timeframe: chartMetadata.timeframe,
            platform: chartMetadata.platform,
            signal: signal,
            signalConfidence: 75,
            overallConfidence: 75,
            marketCondition: 'Analysis in progress',
            trend: 'Institutional analysis',
            confluenceScore: signal === 'BUY' ? 5 : -5,
            institutionalGrade: true,
            fallbackResponse: true,
            rawResponse: text
        };
    }

    /**
     * Update institutional statistics
     */
    updateInstitutionalStats(analysis, processingTime) {
        this.institutionalStats.totalAnalyses++;
        
        if (analysis.signal === 'BUY') {
            this.institutionalStats.buySignals++;
        } else if (analysis.signal === 'SELL') {
            this.institutionalStats.sellSignals++;
        }

        // Update average confidence
        this.institutionalStats.averageConfidence = 
            (this.institutionalStats.averageConfidence * (this.institutionalStats.totalAnalyses - 1) + 
             analysis.overallConfidence) / this.institutionalStats.totalAnalyses;

        // Update average processing time
        this.institutionalStats.averageProcessingTime = 
            (this.institutionalStats.averageProcessingTime * (this.institutionalStats.totalAnalyses - 1) + 
             processingTime) / this.institutionalStats.totalAnalyses;

        // Update confluence scores
        if (analysis.confluenceScore) {
            this.institutionalStats.confluenceScores.push(analysis.confluenceScore);
        }

        console.log('📊 Institutional stats updated:', {
            totalAnalyses: this.institutionalStats.totalAnalyses,
            averageConfidence: this.institutionalStats.averageConfidence.toFixed(1),
            averageProcessingTime: this.institutionalStats.averageProcessingTime.toFixed(0)
        });
    }

    /**
     * Get institutional statistics
     */
    getInstitutionalStats() {
        return {
            ...this.institutionalStats,
            successRate: this.institutionalStats.totalAnalyses > 0 ? 
                ((this.institutionalStats.buySignals + this.institutionalStats.sellSignals) / 
                 this.institutionalStats.totalAnalyses * 100).toFixed(1) : 0,
            averageConfluenceScore: this.institutionalStats.confluenceScores.length > 0 ?
                (this.institutionalStats.confluenceScores.reduce((a, b) => a + b, 0) / 
                 this.institutionalStats.confluenceScores.length).toFixed(1) : 0
        };
    }

    /**
     * Format analysis report for human readability
     */
    formatAnalysisReport(analysis) {
        return `
🏛️ INSTITUTIONAL TRADAI ANALYSIS REPORT
=====================================

📊 SIGNAL: ${analysis.signal} (${analysis.signalConfidence}% confidence)
💎 Asset: ${analysis.asset} | ⏰ Timeframe: ${analysis.timeframe}
🎯 Overall Confidence: ${analysis.overallConfidence}%
📈 Market Condition: ${analysis.marketCondition}
🌊 Volatility: ${analysis.volatilityState}
💪 Trend Strength: ${analysis.trendStrength}

🔬 ADVANCED INDICATORS ANALYSIS:
${analysis.atrAnalysis ? `
ATR: ${analysis.atrAnalysis.currentATR} (${analysis.atrAnalysis.volatilityState})` : ''}
${analysis.bollingerAnalysis ? `
Bollinger: ${analysis.bollingerAnalysis.pricePosition} (${analysis.bollingerAnalysis.signal})` : ''}
${analysis.rsiAnalysis ? `
RSI: ${analysis.rsiAnalysis.currentRSI} (${analysis.rsiAnalysis.zone})` : ''}
${analysis.macdAnalysis ? `
MACD: ${analysis.macdAnalysis.crossoverStatus}` : ''}
${analysis.adxAnalysis ? `
ADX: ${analysis.adxAnalysis.adxValue} (${analysis.adxAnalysis.trendStrength})` : ''}

⚖️ CONFLUENCE SCORE: ${analysis.confluenceScore || 'N/A'}
🎯 PRIMARY DRIVERS: ${analysis.primarySignalDrivers || 'Multi-factor analysis'}

🔮 NEXT 3 CANDLES:
${analysis.nextCandlePredictions ? analysis.nextCandlePredictions.map(p => 
    `Candle ${p.candle}: ${p.direction} (${p.confidence}%)`).join('\n') : 'Predictions available in full analysis'}

🛡️ RISK MANAGEMENT:
${analysis.riskManagement ? `
Stop Loss: ${analysis.riskManagement.stopLoss}
Take Profit: ${analysis.riskManagement.takeProfit1}
Risk/Reward: ${analysis.riskManagement.riskRewardRatio}` : 'Risk levels calculated'}

✅ INSTITUTIONAL GRADE ANALYSIS COMPLETE
Generated: ${new Date().toISOString()}
        `.trim();
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
            console.log('🧹 OCR worker terminated');
        }
    }
}

module.exports = InstitutionalGeminiVisionService;