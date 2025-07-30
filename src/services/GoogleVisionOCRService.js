/**
 * Google Vision OCR Service for Trading Chart Analysis
 * Provides comprehensive OCR and image analysis using Google Cloud Vision API
 */

const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

class GoogleVisionOCRService {
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || process.env.GOOGLE_VISION_API_KEY,
            confidenceThreshold: config.confidenceThreshold || 0.7,
            enableTextDetection: config.enableTextDetection !== false,
            enableObjectDetection: config.enableObjectDetection !== false,
            enableLogoDetection: config.enableLogoDetection !== false,
            enableLabelDetection: config.enableLabelDetection !== false,
            maxResults: config.maxResults || 50,
            ...config
        };

        // Initialize Google Vision client with API key
        this.client = new vision.ImageAnnotatorClient({
            keyFilename: this.createTempKeyFile()
        });

        this.isInitialized = false;
    }

    /**
     * Create temporary key file for Google Vision authentication
     */
    createTempKeyFile() {
        if (!this.config.apiKey) {
            throw new Error('Google Vision API key is required');
        }

        // Create service account key object
        const serviceAccountKey = {
            "type": "service_account",
            "project_id": "tradai-vision",
            "private_key_id": "dummy",
            "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\n-----END PRIVATE KEY-----\n",
            "client_email": "tradai@tradai-vision.iam.gserviceaccount.com",
            "client_id": "dummy",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
        };

        // For API key authentication, we'll use a different approach
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const keyPath = path.join(tempDir, 'google-vision-key.json');
        fs.writeFileSync(keyPath, JSON.stringify(serviceAccountKey, null, 2));
        
        return keyPath;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            console.log('🔧 Initializing Google Vision OCR Service...');
            
            // Test API connection
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('✅ Google Vision OCR Service initialized successfully');
            
            return {
                success: true,
                message: 'Google Vision OCR Service ready'
            };
        } catch (error) {
            console.error('❌ Failed to initialize Google Vision OCR Service:', error);
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
            // Create a simple test image buffer (1x1 pixel)
            const testImageBuffer = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
                0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
                0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
                0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
                0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00,
                0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
            ]);

            // Use direct API call with API key for testing
            const axios = require('axios');
            const response = await axios.post(
                `https://vision.googleapis.com/v1/images:annotate?key=${this.config.apiKey}`,
                {
                    requests: [{
                        image: {
                            content: testImageBuffer.toString('base64')
                        },
                        features: [
                            { type: 'TEXT_DETECTION', maxResults: 1 }
                        ]
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.responses) {
                console.log('✅ Google Vision API connection successful');
                return true;
            } else {
                throw new Error('Invalid API response');
            }
        } catch (error) {
            console.error('❌ Google Vision API connection failed:', error.message);
            throw error;
        }
    }

    /**
     * Analyze trading chart screenshot using Google Vision API
     */
    async analyzeChartScreenshot(imageBuffer, options = {}) {
        console.log('📷 Starting Google Vision chart analysis...');
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        
        try {
            // Prepare image for analysis
            const base64Image = imageBuffer.toString('base64');
            
            // Configure analysis features
            const features = [];
            
            if (this.config.enableTextDetection) {
                features.push({ type: 'TEXT_DETECTION', maxResults: this.config.maxResults });
                features.push({ type: 'DOCUMENT_TEXT_DETECTION', maxResults: this.config.maxResults });
            }
            
            if (this.config.enableObjectDetection) {
                features.push({ type: 'OBJECT_LOCALIZATION', maxResults: this.config.maxResults });
            }
            
            if (this.config.enableLabelDetection) {
                features.push({ type: 'LABEL_DETECTION', maxResults: this.config.maxResults });
            }
            
            if (this.config.enableLogoDetection) {
                features.push({ type: 'LOGO_DETECTION', maxResults: this.config.maxResults });
            }

            // Make API call using direct HTTP request with API key
            const axios = require('axios');
            const response = await axios.post(
                `https://vision.googleapis.com/v1/images:annotate?key=${this.config.apiKey}`,
                {
                    requests: [{
                        image: {
                            content: base64Image
                        },
                        features: features,
                        imageContext: {
                            textDetectionParams: {
                                enableTextDetectionConfidenceScore: true
                            }
                        }
                    }]
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const processingTime = Date.now() - startTime;
            
            if (!response.data || !response.data.responses || !response.data.responses[0]) {
                throw new Error('Invalid API response from Google Vision');
            }

            const visionResult = response.data.responses[0];
            
            // Process and extract trading-specific data
            const analysisResult = await this.processTradingData(visionResult, options);
            
            console.log(`✅ Google Vision analysis completed in ${processingTime}ms`);
            
            return {
                success: true,
                processingTime,
                method: 'Google Vision API',
                confidence: analysisResult.overallConfidence,
                rawVisionData: visionResult,
                tradingData: analysisResult,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Google Vision analysis failed:', error);
            return {
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime,
                method: 'Google Vision API'
            };
        }
    }

    /**
     * Process Google Vision results for trading-specific data extraction
     */
    async processTradingData(visionResult, options = {}) {
        console.log('🔍 Processing trading data from Vision results...');
        
        const tradingData = {
            textDetections: [],
            prices: [],
            indicators: {},
            chartElements: [],
            tradingPair: null,
            timeframe: null,
            platform: null,
            overallConfidence: 0
        };

        // Process text detections
        if (visionResult.textAnnotations && visionResult.textAnnotations.length > 0) {
            tradingData.textDetections = visionResult.textAnnotations.map(annotation => ({
                text: annotation.description,
                confidence: annotation.confidence || 0.9,
                boundingBox: annotation.boundingPoly,
                vertices: annotation.boundingPoly ? annotation.boundingPoly.vertices : []
            }));

            // Extract full text
            const fullText = visionResult.textAnnotations[0]?.description || '';
            
            // Extract trading-specific information
            tradingData.prices = this.extractPrices(fullText);
            tradingData.tradingPair = this.extractTradingPair(fullText);
            tradingData.timeframe = this.extractTimeframe(fullText);
            tradingData.platform = this.extractPlatform(fullText);
            tradingData.indicators = this.extractIndicators(fullText);
        }

        // Process object detections
        if (visionResult.localizedObjectAnnotations) {
            tradingData.chartElements = visionResult.localizedObjectAnnotations.map(obj => ({
                name: obj.name,
                confidence: obj.score,
                boundingBox: obj.boundingPoly
            }));
        }

        // Calculate overall confidence
        const confidenceScores = [
            ...tradingData.textDetections.map(t => t.confidence),
            ...tradingData.chartElements.map(e => e.confidence)
        ];
        
        tradingData.overallConfidence = confidenceScores.length > 0 
            ? confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length 
            : 0;

        return tradingData;
    }

    /**
     * Extract price values from text
     */
    extractPrices(text) {
        const pricePatterns = [
            /\b\d+\.\d{2,5}\b/g,  // Standard decimal prices
            /\b\d{1,3}(?:,\d{3})*\.\d{2,5}\b/g,  // Prices with commas
            /\$\s*\d+\.\d{2,5}/g,  // Dollar prices
            /€\s*\d+\.\d{2,5}/g,   // Euro prices
            /£\s*\d+\.\d{2,5}/g    // Pound prices
        ];

        const prices = [];
        pricePatterns.forEach(pattern => {
            const matches = text.match(pattern) || [];
            matches.forEach(match => {
                const cleanPrice = match.replace(/[$€£,\s]/g, '');
                const numPrice = parseFloat(cleanPrice);
                if (!isNaN(numPrice) && numPrice > 0 && numPrice < 1000000) {
                    prices.push({
                        value: numPrice,
                        original: match,
                        formatted: cleanPrice
                    });
                }
            });
        });

        return prices;
    }

    /**
     * Extract trading pair from text
     */
    extractTradingPair(text) {
        const pairPatterns = [
            /([A-Z]{3})[\/\-]([A-Z]{3})/g,  // USD/EUR, USD-EUR
            /([A-Z]{3})([A-Z]{3})/g,        // USDEUR
            /(BTC|ETH|LTC|XRP|ADA)[\/\-]?(USD|EUR|BTC)/gi,  // Crypto pairs
            /(USD|EUR|GBP|JPY|CHF|CAD|AUD|NZD)[\/\-](BRL|INR|TRY|MXN)/gi  // Exotic pairs
        ];

        for (const pattern of pairPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0].toUpperCase();
            }
        }

        return null;
    }

    /**
     * Extract timeframe from text
     */
    extractTimeframe(text) {
        const timeframePatterns = [
            /\b(\d+)\s*m(?:in)?(?:ute)?s?\b/gi,  // 1m, 5min, 15 minutes
            /\b(\d+)\s*h(?:our)?s?\b/gi,         // 1h, 4 hours
            /\b(\d+)\s*d(?:ay)?s?\b/gi,          // 1d, 7 days
            /\b(\d+)\s*w(?:eek)?s?\b/gi,         // 1w, 4 weeks
            /M(\d+)/gi,                          // M1, M5, M15
            /H(\d+)/gi,                          // H1, H4
            /D(\d+)/gi                           // D1
        ];

        for (const pattern of timeframePatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                return matches[0];
            }
        }

        return null;
    }

    /**
     * Extract trading platform from text
     */
    extractPlatform(text) {
        const platforms = [
            'MetaTrader', 'MT4', 'MT5', 'TradingView', 'Quotex', 'IQ Option',
            'Binance', 'Coinbase', 'Kraken', 'Bitfinex', 'QXBroker',
            'Pocket Option', 'Olymp Trade', 'Expert Option'
        ];

        const lowerText = text.toLowerCase();
        for (const platform of platforms) {
            if (lowerText.includes(platform.toLowerCase())) {
                return platform;
            }
        }

        return null;
    }

    /**
     * Extract technical indicators from text
     */
    extractIndicators(text) {
        const indicators = {};
        
        // RSI
        const rsiMatch = text.match(/RSI[:\s]*(\d+\.?\d*)/i);
        if (rsiMatch) {
            indicators.rsi = parseFloat(rsiMatch[1]);
        }

        // MACD
        const macdMatch = text.match(/MACD[:\s]*(-?\d+\.?\d*)/i);
        if (macdMatch) {
            indicators.macd = parseFloat(macdMatch[1]);
        }

        // Moving Averages
        const emaMatch = text.match(/EMA[:\s]*(\d+\.?\d*)/i);
        if (emaMatch) {
            indicators.ema = parseFloat(emaMatch[1]);
        }

        const smaMatch = text.match(/SMA[:\s]*(\d+\.?\d*)/i);
        if (smaMatch) {
            indicators.sma = parseFloat(smaMatch[1]);
        }

        // Stochastic
        const stochMatch = text.match(/Stoch[astic]*[:\s]*(\d+\.?\d*)/i);
        if (stochMatch) {
            indicators.stochastic = parseFloat(stochMatch[1]);
        }

        return indicators;
    }

    /**
     * Cleanup temporary files
     */
    cleanup() {
        try {
            const tempDir = path.join(__dirname, '../../temp');
            const keyPath = path.join(tempDir, 'google-vision-key.json');
            
            if (fs.existsSync(keyPath)) {
                fs.unlinkSync(keyPath);
            }
        } catch (error) {
            console.warn('⚠️ Failed to cleanup temporary files:', error.message);
        }
    }
}

module.exports = GoogleVisionOCRService;
