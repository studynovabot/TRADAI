/**
 * Gemini Vision Analysis Service for Direct Trading Chart Analysis
 * Replaces Google Vision OCR + AI pipeline with direct Gemini Vision analysis
 * Optimized for token efficiency and multi-API key rotation
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class GeminiVisionAnalysisService {
    constructor(config = {}) {
        this.config = {
            // API Key Management
            apiKeys: config.apiKeys || [process.env.GOOGLE_VISION_API_KEY].filter(Boolean),
            currentKeyIndex: 0,
            
            // Model Configuration
            model: config.model || 'gemini-2.5-flash', // Optimized for free tier
            temperature: config.temperature || 0.1,
            maxTokens: config.maxTokens || 2000, // Reduced for efficiency
            timeout: config.timeout || 30000,
            
            // Analysis Configuration
            minConfidence: config.minConfidence || 70,
            maxConfidence: config.maxConfidence || 95,
            
            // Token Optimization
            enableTokenOptimization: config.enableTokenOptimization !== false,
            enableResponseCaching: config.enableResponseCaching !== false,
            cacheExpiryMinutes: config.cacheExpiryMinutes || 5,
            
            // Rate Limiting
            maxRequestsPerMinute: config.maxRequestsPerMinute || 15,
            maxRequestsPerDay: config.maxRequestsPerDay || 1500,
            
            ...config
        };

        // Initialize API clients for all keys
        this.clients = [];
        this.initializeClients();
        
        // Usage tracking
        this.usageStats = {
            dailyRequests: 0,
            minuteRequests: 0,
            lastResetTime: Date.now(),
            keyUsage: {},
            errors: {}
        };
        
        // Response cache
        this.responseCache = new Map();
        
        this.isInitialized = false;
    }

    /**
     * Initialize Gemini clients for all API keys
     */
    initializeClients() {
        this.clients = this.config.apiKeys.map((apiKey, index) => {
            const genAI = new GoogleGenerativeAI(apiKey);
            return {
                client: genAI,
                model: genAI.getGenerativeModel({ 
                    model: this.config.model,
                    generationConfig: {
                        temperature: this.config.temperature,
                        maxOutputTokens: this.config.maxTokens
                    }
                }),
                apiKey: apiKey,
                index: index,
                isActive: true,
                lastUsed: 0,
                requestCount: 0,
                errorCount: 0
            };
        });
        
        console.log(`🔑 Initialized ${this.clients.length} Gemini API clients`);
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            console.log('🧠 Initializing Gemini Vision Analysis Service...');
            
            if (this.clients.length === 0) {
                throw new Error('No valid API keys provided');
            }

            // Test all API connections
            const testResults = await this.testAllConnections();
            const activeClients = testResults.filter(r => r.success).length;
            
            if (activeClients === 0) {
                throw new Error('No API keys are working');
            }
            
            this.isInitialized = true;
            console.log(`✅ Gemini Vision Service initialized with ${activeClients}/${this.clients.length} working API keys`);
            
            return {
                success: true,
                message: 'Gemini Vision Analysis Service ready',
                activeKeys: activeClients,
                totalKeys: this.clients.length
            };
        } catch (error) {
            console.error('❌ Failed to initialize Gemini Vision Service:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Test all API connections
     */
    async testAllConnections() {
        const testPromises = this.clients.map(async (client, index) => {
            try {
                const result = await client.model.generateContent('Test. Reply "OK".');
                const response = await result.response;
                const text = response.text();
                
                if (text && text.includes('OK')) {
                    console.log(`✅ API Key ${index + 1} working`);
                    return { index, success: true };
                } else {
                    throw new Error('Invalid response');
                }
            } catch (error) {
                console.error(`❌ API Key ${index + 1} failed:`, error.message);
                client.isActive = false;
                return { index, success: false, error: error.message };
            }
        });
        
        return await Promise.all(testPromises);
    }

    /**
     * Get next available API client with rotation
     */
    getNextClient() {
        const activeClients = this.clients.filter(c => c.isActive);
        
        if (activeClients.length === 0) {
            throw new Error('No active API keys available');
        }
        
        // Simple round-robin rotation
        this.config.currentKeyIndex = (this.config.currentKeyIndex + 1) % activeClients.length;
        const selectedClient = activeClients[this.config.currentKeyIndex];
        
        selectedClient.lastUsed = Date.now();
        selectedClient.requestCount++;
        
        return selectedClient;
    }

    /**
     * Analyze trading chart screenshot directly with Gemini Vision
     */
    async analyzeChartScreenshot(imagePath, options = {}) {
        console.log(`📊 Analyzing chart screenshot with Gemini Vision: ${path.basename(imagePath)}`);
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        const startTime = Date.now();
        const analysisId = `gemini_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Check rate limits
            this.checkRateLimits();
            
            // Read and prepare image
            const imageBuffer = fs.readFileSync(imagePath);
            const imageBase64 = imageBuffer.toString('base64');
            const mimeType = this.getMimeType(imagePath);
            
            // Check cache first
            const cacheKey = this.generateCacheKey(imageBase64, options);
            if (this.config.enableResponseCaching) {
                const cachedResult = this.getFromCache(cacheKey);
                if (cachedResult) {
                    console.log('📋 Using cached analysis result');
                    return cachedResult;
                }
            }
            
            // Get active client
            const client = this.getNextClient();
            
            // Build optimized analysis prompt
            const analysisPrompt = this.buildOptimizedAnalysisPrompt(options);
            
            // Prepare image data for Gemini
            const imagePart = {
                inlineData: {
                    data: imageBase64,
                    mimeType: mimeType
                }
            };
            
            // Generate analysis
            console.log(`🔍 Using API Key ${client.index + 1} for analysis...`);
            const result = await client.model.generateContent([
                analysisPrompt,
                imagePart
            ]);
            
            const response = await result.response;
            const analysisContent = response.text();
            
            if (!analysisContent) {
                throw new Error('No analysis content received from Gemini');
            }

            // Parse and structure the analysis
            const structuredAnalysis = await this.parseAnalysisResponse(analysisContent, options);
            
            const processingTime = Date.now() - startTime;
            
            // Update usage stats
            this.updateUsageStats(client, result.response?.usageMetadata);
            
            const finalResult = {
                success: true,
                analysisId,
                processingTime,
                method: 'Gemini Vision Direct',
                model: this.config.model,
                apiKeyIndex: client.index + 1,
                confidence: structuredAnalysis.overallConfidence,
                analysis: structuredAnalysis,
                rawResponse: analysisContent,
                timestamp: new Date().toISOString(),
                usage: {
                    promptTokens: result.response?.usageMetadata?.promptTokenCount || 0,
                    completionTokens: result.response?.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: result.response?.usageMetadata?.totalTokenCount || 0
                }
            };
            
            // Cache the result
            if (this.config.enableResponseCaching) {
                this.addToCache(cacheKey, finalResult);
            }
            
            console.log(`✅ Gemini Vision analysis completed in ${processingTime}ms`);
            return finalResult;
            
        } catch (error) {
            console.error('❌ Gemini Vision analysis failed:', error);
            
            // Handle rate limit errors
            if (error.message.includes('quota') || error.message.includes('rate limit')) {
                await this.handleRateLimitError();
            }
            
            return {
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime,
                method: 'Gemini Vision Direct',
                analysisId
            };
        }
    }
    /**
     * Build optimized analysis prompt for token efficiency
     */
    buildOptimizedAnalysisPrompt(options = {}) {
        const timeframe = options.timeframe || '5m';
        const asset = options.asset || 'USD/BRL';

        return `Analyze this ${timeframe} trading chart for ${asset}. Provide ONLY:

1. NEXT 3 CANDLES: Predict direction (UP/DOWN/NO_TRADE) with confidence %
2. TECHNICAL ANALYSIS: Key indicators (RSI, MACD, EMA, SMA, Stochastic)
3. CANDLESTICK PATTERNS: Identify visible patterns
4. SUPPORT/RESISTANCE: Key levels from price action
5. MARKET STRUCTURE: Trend, momentum, consolidation

Format response as JSON:
{
  "predictions": [
    {"candle": 1, "direction": "UP/DOWN/NO_TRADE", "confidence": 85},
    {"candle": 2, "direction": "UP/DOWN/NO_TRADE", "confidence": 78},
    {"candle": 3, "direction": "UP/DOWN/NO_TRADE", "confidence": 72}
  ],
  "technicalAnalysis": {
    "rsi": {"value": 65, "signal": "neutral"},
    "macd": {"signal": "bullish", "strength": "moderate"},
    "ema": {"trend": "upward", "strength": "strong"},
    "stochastic": {"value": 45, "signal": "oversold"}
  },
  "candlestickPatterns": ["doji", "hammer"],
  "supportResistance": {
    "support": [1.2345, 1.2320],
    "resistance": [1.2380, 1.2400]
  },
  "marketStructure": {
    "trend": "bullish",
    "momentum": "increasing",
    "condition": "trending"
  },
  "overallConfidence": 82,
  "reasoning": "Brief technical reasoning"
}

Be precise. No explanations outside JSON.`;
    }

    /**
     * Parse analysis response and structure data
     */
    async parseAnalysisResponse(content, options = {}) {
        try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (!analysis.predictions || !Array.isArray(analysis.predictions)) {
                throw new Error('Invalid predictions format');
            }

            // Ensure confidence levels are within bounds
            analysis.predictions.forEach(pred => {
                pred.confidence = Math.max(this.config.minConfidence,
                    Math.min(this.config.maxConfidence, pred.confidence));
            });

            // Set overall confidence if not provided
            if (!analysis.overallConfidence) {
                const avgConfidence = analysis.predictions.reduce((sum, p) => sum + p.confidence, 0) / analysis.predictions.length;
                analysis.overallConfidence = Math.round(avgConfidence);
            }

            // Add metadata
            analysis.metadata = {
                timeframe: options.timeframe || '5m',
                asset: options.asset || 'USD/BRL',
                analysisTime: new Date().toISOString(),
                model: this.config.model
            };

            return analysis;

        } catch (error) {
            console.error('❌ Failed to parse analysis response:', error);

            // Return fallback structure
            return {
                predictions: [
                    { candle: 1, direction: 'NO_TRADE', confidence: this.config.minConfidence },
                    { candle: 2, direction: 'NO_TRADE', confidence: this.config.minConfidence },
                    { candle: 3, direction: 'NO_TRADE', confidence: this.config.minConfidence }
                ],
                technicalAnalysis: {},
                candlestickPatterns: [],
                supportResistance: { support: [], resistance: [] },
                marketStructure: { trend: 'uncertain', momentum: 'neutral', condition: 'consolidating' },
                overallConfidence: this.config.minConfidence,
                reasoning: 'Analysis parsing failed',
                error: error.message,
                metadata: {
                    timeframe: options.timeframe || '5m',
                    asset: options.asset || 'USD/BRL',
                    analysisTime: new Date().toISOString(),
                    model: this.config.model
                }
            };
        }
    }

    /**
     * Check rate limits
     */
    checkRateLimits() {
        const now = Date.now();
        const oneMinute = 60 * 1000;
        const oneDay = 24 * 60 * 60 * 1000;

        // Reset counters if needed
        if (now - this.usageStats.lastResetTime > oneDay) {
            this.usageStats.dailyRequests = 0;
            this.usageStats.lastResetTime = now;
        }

        if (now - this.usageStats.lastResetTime > oneMinute) {
            this.usageStats.minuteRequests = 0;
        }

        // Check limits
        if (this.usageStats.dailyRequests >= this.config.maxRequestsPerDay) {
            throw new Error('Daily request limit exceeded');
        }

        if (this.usageStats.minuteRequests >= this.config.maxRequestsPerMinute) {
            throw new Error('Per-minute request limit exceeded');
        }
    }

    /**
     * Update usage statistics
     */
    updateUsageStats(client, usageMetadata) {
        this.usageStats.dailyRequests++;
        this.usageStats.minuteRequests++;

        if (!this.usageStats.keyUsage[client.index]) {
            this.usageStats.keyUsage[client.index] = {
                requests: 0,
                tokens: 0,
                errors: 0
            };
        }

        this.usageStats.keyUsage[client.index].requests++;
        if (usageMetadata?.totalTokenCount) {
            this.usageStats.keyUsage[client.index].tokens += usageMetadata.totalTokenCount;
        }
    }

    /**
     * Handle rate limit errors
     */
    async handleRateLimitError() {
        console.log('⚠️ Rate limit hit, switching to next API key...');

        // Mark current client as temporarily inactive
        const currentClient = this.clients[this.config.currentKeyIndex];
        if (currentClient) {
            currentClient.isActive = false;
            currentClient.errorCount++;

            // Reactivate after 1 minute
            setTimeout(() => {
                currentClient.isActive = true;
                console.log(`🔄 Reactivated API Key ${currentClient.index + 1}`);
            }, 60000);
        }
    }

    /**
     * Generate cache key for response caching
     */
    generateCacheKey(imageBase64, options) {
        const crypto = require('crypto');
        const keyData = imageBase64.substring(0, 100) + JSON.stringify(options);
        return crypto.createHash('md5').update(keyData).digest('hex');
    }

    /**
     * Get cached response
     */
    getFromCache(key) {
        const cached = this.responseCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.cacheExpiryMinutes * 60 * 1000) {
            return cached.data;
        }
        this.responseCache.delete(key);
        return null;
    }

    /**
     * Add response to cache
     */
    addToCache(key, data) {
        this.responseCache.set(key, {
            data: data,
            timestamp: Date.now()
        });

        // Clean old cache entries
        if (this.responseCache.size > 100) {
            const oldestKey = this.responseCache.keys().next().value;
            this.responseCache.delete(oldestKey);
        }
    }

    /**
     * Get MIME type from file path
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.png': return 'image/png';
            case '.jpg':
            case '.jpeg': return 'image/jpeg';
            case '.gif': return 'image/gif';
            case '.webp': return 'image/webp';
            default: return 'image/png';
        }
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            service: 'Gemini Vision Analysis',
            model: this.config.model,
            isInitialized: this.isInitialized,
            activeKeys: this.clients.filter(c => c.isActive).length,
            totalKeys: this.clients.length,
            usageStats: this.usageStats,
            config: {
                maxRequestsPerDay: this.config.maxRequestsPerDay,
                maxRequestsPerMinute: this.config.maxRequestsPerMinute,
                enableTokenOptimization: this.config.enableTokenOptimization,
                enableResponseCaching: this.config.enableResponseCaching
            }
        };
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('🧹 Cleaning up Gemini Vision Analysis Service...');
        this.responseCache.clear();
        this.isInitialized = false;
    }
}

module.exports = GeminiVisionAnalysisService;
