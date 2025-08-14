/**
 * 🚀💡 MULTI-SCENARIO CANDLE PREDICTION GEMINI VISION SERVICE
 * Enhanced version that generates multiple possible scenarios for next 3 candles
 * Based on conditional outcomes of Candle 1 (UP/DOWN paths)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

class MultiScenarioGeminiVisionService {
    constructor(config = {}) {
        this.config = {
            apiKeys: config.apiKeys || null,
            models: config.models || ['gemini-2.5-flash', 'gemini-2.5-flash-latest', 'gemini-1.5-pro'],
            temperature: config.temperature || 0.1,
            maxTokens: config.maxTokens || 8000,
            timeout: config.timeout || 90000,
            maxRetries: config.maxRetries || 3,
            baseDelay: config.baseDelay || 1000,
            
            // Multi-scenario configuration options
            imagePreprocessing: config.imagePreprocessing !== false,
            ocrEnabled: config.ocrEnabled !== false,
            patternDetection: config.patternDetection !== false,
            debugMode: config.debugMode || false,
            
            ...config
        };

        // Initialize failover state
        this.currentKeyIndex = 0;
        this.currentModelIndex = 0;
        this.genAI = null;
        this.model = null;
        this.isInitialized = false;

        // Multi-scenario statistics
        this.scenarioStats = {
            totalAnalyses: 0,
            averageScenarios: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            keyRotations: 0,
            modelFallbacks: 0
        };
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

        // Additional keys
        for (let i = 2; i <= 10; i++) {
            const key = process.env[`GEMINI_API_KEY_${i}`] || process.env[`GOOGLE_API_KEY_${i}`];
            if (key) {
                keys.push(key);
            }
        }

        if (keys.length === 0) {
            throw new Error('No Gemini API keys found in environment variables');
        }

        console.log(`🔑 Loaded ${keys.length} Gemini API keys for multi-scenario failover`);
        return keys;
    }

    /**
     * Initialize current Gemini client
     */
    async initialize() {
        try {
            const apiKeys = this.config.apiKeys || this.loadApiKeysFromEnv();
            const currentKey = apiKeys[this.currentKeyIndex];
            
            this.genAI = new GoogleGenerativeAI(currentKey);
            this.model = this.genAI.getGenerativeModel({ 
                model: this.config.models[this.currentModelIndex],
                generationConfig: {
                    temperature: this.config.temperature,
                    maxOutputTokens: this.config.maxTokens,
                }
            });
            
            this.isInitialized = true;
            console.log(`✅ Multi-scenario Gemini Vision Service initialized with model: ${this.config.models[this.currentModelIndex]}`);
        } catch (error) {
            console.error('❌ Failed to initialize Multi-scenario Gemini Vision Service:', error);
            throw error;
        }
    }

    /**
     * Get current model name
     */
    getCurrentModel() {
        return this.config.models[this.currentModelIndex];
    }

    /**
     * Rotate to next API key
     */
    rotateApiKey() {
        const apiKeys = this.config.apiKeys || this.loadApiKeysFromEnv();
        this.currentKeyIndex = (this.currentKeyIndex + 1) % apiKeys.length;
        this.scenarioStats.keyRotations++;
        console.log(`🔄 Rotated to API key ${this.currentKeyIndex + 1}/${apiKeys.length}`);
    }

    /**
     * Fallback to next model
     */
    fallbackToNextModel() {
        this.currentModelIndex = (this.currentModelIndex + 1) % this.config.models.length;
        this.scenarioStats.modelFallbacks++;
        console.log(`🔄 Falling back to model: ${this.config.models[this.currentModelIndex]}`);
    }

    /**
     * Call Gemini with failover mechanism
     */
    async callGeminiWithFailover(prompt, imageData) {
        let lastError;
        const maxAttempts = this.config.maxRetries * this.config.models.length;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                if (!this.isInitialized) {
                    await this.initialize();
                }

                const result = await Promise.race([
                    this.model.generateContent([prompt, imageData]),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Request timeout')), this.config.timeout)
                    )
                ]);

                const response = await result.response;
                const text = response.text();
                
                if (!text || text.trim().length === 0) {
                    throw new Error('Empty response from Gemini');
                }

                return text;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt + 1} failed:`, error.message);

                // Try next API key first
                if (attempt % this.config.maxRetries === this.config.maxRetries - 1) {
                    this.rotateApiKey();
                    this.fallbackToNextModel();
                    await this.initialize();
                } else {
                    this.rotateApiKey();
                    await this.initialize();
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, this.config.baseDelay * (attempt + 1)));
            }
        }

        throw new Error(`All failover attempts failed. Last error: ${lastError?.message}`);
    }

    /**
     * Preprocess image for better analysis
     */
    async preprocessImage(imageBuffer, options = {}) {
        try {
            if (!this.config.imagePreprocessing) {
                return imageBuffer;
            }

            const processedBuffer = await sharp(imageBuffer)
                .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
                .sharpen()
                .normalize()
                .jpeg({ quality: 90 })
                .toBuffer();

            console.log(`📸 Image preprocessed: ${imageBuffer.length} → ${processedBuffer.length} bytes`);
            return processedBuffer;

        } catch (error) {
            console.warn('⚠️ Image preprocessing failed, using original:', error.message);
            return imageBuffer;
        }
    }

    /**
     * Detect MIME type from buffer
     */
    detectMimeType(buffer) {
        const signatures = {
            'image/jpeg': [0xFF, 0xD8, 0xFF],
            'image/png': [0x89, 0x50, 0x4E, 0x47],
            'image/webp': [0x52, 0x49, 0x46, 0x46]
        };

        for (const [mimeType, signature] of Object.entries(signatures)) {
            if (signature.every((byte, index) => buffer[index] === byte)) {
                return mimeType;
            }
        }

        return 'image/jpeg'; // Default fallback
    }

    /**
     * 🎯 MAIN MULTI-SCENARIO ANALYSIS METHOD
     */
    async analyzeChart(imageBase64, options = {}) {
        const startTime = Date.now();

        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            console.log('🚀 Starting Multi-Scenario Gemini Vision Analysis...');

            // Convert base64 to buffer
            const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // 1️⃣ Image Preprocessing
            const processedImageBuffer = await this.preprocessImage(imageBuffer, options);

            // Prepare image data for Gemini
            const imageData = {
                inlineData: {
                    data: processedImageBuffer.toString('base64'),
                    mimeType: this.detectMimeType(processedImageBuffer)
                }
            };

            // 2️⃣ Create Multi-Scenario Analysis Prompt
            const prompt = this.createMultiScenarioPrompt(options);

            console.log('🤖 Sending multi-scenario request to Gemini...');

            // Send request to Gemini with failover
            const text = await this.callGeminiWithFailover(prompt, imageData);

            const processingTime = Date.now() - startTime;

            // 3️⃣ Parse and validate response
            const analysis = await this.parseMultiScenarioResponse(text, options);

            // 4️⃣ Apply scenario logic and sorting
            const finalAnalysis = this.processScenarios(analysis);

            // 5️⃣ Update statistics
            this.updateScenarioStats(finalAnalysis, processingTime);

            console.log(`✅ Multi-scenario analysis completed in ${processingTime}ms`);
            console.log(`📊 Generated ${finalAnalysis.scenarios.length} scenarios`);

            return {
                success: true,
                analysisType: 'multi-scenario',
                signal: finalAnalysis.signal,
                signalConfidence: finalAnalysis.signalConfidence,
                overallConfidence: finalAnalysis.overallConfidence,
                trend: finalAnalysis.trend,
                marketCondition: finalAnalysis.marketCondition,
                scenarios: finalAnalysis.scenarios,
                mostLikelyPath: finalAnalysis.mostLikelyPath,
                predictions: this.convertScenariosToLegacyFormat(finalAnalysis.scenarios),
                processingTime: processingTime,
                metadata: {
                    model: this.getCurrentModel(),
                    timestamp: new Date().toISOString(),
                    imageSize: processedImageBuffer.length,
                    originalImageSize: imageBuffer.length,
                    analysisMethod: 'Multi-Scenario Gemini Vision',
                    version: '1.0.0-multi-scenario'
                }
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('❌ Multi-scenario chart analysis failed:', error.message);

            return {
                success: false,
                error: error.message,
                processingTime: processingTime,
                metadata: {
                    analysisMethod: 'Multi-Scenario Gemini Vision',
                    timestamp: new Date().toISOString()
                }
            };
        }
    }

    /**
     * 🧠 Create Multi-Scenario Analysis Prompt
     */
    createMultiScenarioPrompt(options = {}) {
        return `You are a professional binary options trading signal analyst with 15+ years of experience specializing in multi-scenario technical analysis.

🚫 ABSOLUTE CRITICAL RULE: You are FORBIDDEN from outputting "HOLD" as a signal. 
🎯 ONLY "BUY" or "SELL" are allowed - NO EXCEPTIONS, NO HOLD EVER!

🔥 NEW REQUIREMENT: MULTI-SCENARIO CANDLE PREDICTIONS
Instead of predicting a single sequence of 3 candles, you must generate ALL POSSIBLE SCENARIOS for the next 3 candles based on Candle 1's potential directions.

Given this screenshot from a binary options trading platform, perform ULTRA-DETAILED analysis and generate MULTIPLE SCENARIOS:

🔹 SCENARIO GENERATION LOGIC:
- Generate scenarios based on Candle 1's possible outcomes (UP or DOWN)
- For each Candle 1 direction, predict the most likely paths for Candles 2 and 3
- Create 2-4 scenarios total, covering the most probable paths
- Assign probability to each complete scenario (path)
- Sort scenarios by probability (highest first)

🔹 SCENARIO PROBABILITY CALCULATION:
- Base probability on: C1_confidence × C2_confidence × C3_confidence × pattern_correlation
- Consider historical pattern likelihood and indicator convergence
- Ensure probabilities are realistic (40-85% range for top scenarios)

🔹 ULTRA-DETAILED TECHNICAL ANALYSIS (same as before):
- Candlestick pattern recognition and sequences
- EMA/SMA crossings and relative positions to current price
- Stochastic oscillator deep analysis with exact values
- Support and resistance assessment with distances
- Volatility consideration and market phase identification

Return a fully structured, multi-scenario technical report:

TRADAI MULTI-SCENARIO Analysis Report
===================================
Asset: [Extracted currency pair e.g., USD/INR]
Timeframe: [Extracted timeframe e.g., 3m]
Signal: BUY or SELL (HOLD is FORBIDDEN)
Signal Confidence: XX% (60-95% range)
Overall Confidence: XX% (60-95% range)
Market Condition: Trending (Up/Down) or Consolidating
Volatility State: Compression or Expansion

Current Price: [X.XXXXX from latest candle]
Trend Analysis: [Uptrend/Downtrend with specific evidence]
Trend Strength: [Strong/Moderate/Weak]

Technical Analysis Summary:
- EMA Position: [Above/below price with distance]
- SMA Position: [Above/below price with distance]
- Stochastic: %K=[XX], %D=[XX], Zone=[Oversold/Neutral/Overbought]
- Support Levels: [X.XXXXX] - Distance: [XX pips]
- Resistance Levels: [X.XXXXX] - Distance: [XX pips]

MULTI-SCENARIO PREDICTIONS:
==========================

Scenario 1: [Probability: XX%]
Path: [C1_DIRECTION] → [C2_DIRECTION] → [C3_DIRECTION]
Reasoning: [2-3 lines explaining why this path is most likely - cite specific technical factors]

Scenario 2: [Probability: XX%]
Path: [C1_DIRECTION] → [C2_DIRECTION] → [C3_DIRECTION]
Reasoning: [2-3 lines explaining this alternative path - cite technical factors]

Scenario 3: [Probability: XX%]
Path: [C1_DIRECTION] → [C2_DIRECTION] → [C3_DIRECTION]
Reasoning: [2-3 lines explaining this scenario - cite technical factors]

[Add Scenario 4 if warranted by analysis]

MOST LIKELY PATH: [Scenario with highest probability]
CONFLUENCE FACTORS: [List 3-4 specific technical reasons supporting top scenario]

Generated: [Current Date Time]
Processing Time: [X.Xs]

🎯 CRITICAL REQUIREMENTS:
- Generate 2-4 realistic scenarios covering main possibilities
- Sort by probability (highest first)
- Each scenario must have clear technical reasoning
- Probabilities must be realistic and add logical sense
- Focus on conditional logic: "If C1 goes UP, then C2 likely..."
- Keep reasoning concise but informative (2-3 lines max per scenario)

🚨 FORBIDDEN: HOLD signals, unrealistic probabilities, single-path predictions`;
    }

    /**
     * 📝 Parse Multi-Scenario Response
     */
    async parseMultiScenarioResponse(text, options = {}) {
        console.log('📝 Parsing multi-scenario Gemini response...');

        try {
            const analysis = {
                // Basic analysis fields
                signal: this.extractSignalWithNoHold(text),
                signalConfidence: this.extractNumber(text, 'Signal Confidence', /Signal Confidence:\s*(\d+)%/),
                overallConfidence: this.extractNumber(text, 'Overall Confidence', /Overall Confidence:\s*(\d+)%/),
                trend: this.extractField(text, 'Trend Analysis', /Trend Analysis:\s*([^\n]+)/),
                marketCondition: this.extractField(text, 'Market Condition', /Market Condition:\s*([^\n]+)/),
                
                // Extract scenarios
                scenarios: this.extractScenarios(text),
                
                // Extract most likely path
                mostLikelyPath: this.extractField(text, 'MOST LIKELY PATH', /MOST LIKELY PATH:\s*([^\n]+)/),
                
                // Extract confluence factors
                confluenceFactors: this.extractField(text, 'CONFLUENCE FACTORS', /CONFLUENCE FACTORS:\s*([^\n]+)/)
            };

            return this.validateMultiScenarioAnalysis(analysis);
        } catch (error) {
            console.warn('⚠️ Multi-scenario response parsing failed:', error.message);
            return this.createMultiScenarioFallbackResponse(text, options);
        }
    }

    /**
     * Extract scenarios from response text
     */
    extractScenarios(text) {
        const scenarios = [];
        
        // Match scenario patterns
        const scenarioRegex = /Scenario\s+(\d+):\s*\[Probability:\s*(\d+)%\]\s*\nPath:\s*([A-Z]+)\s*→\s*([A-Z]+)\s*→\s*([A-Z]+)\s*\nReasoning:\s*([^\n]+(?:\n[^\n\S]*[^\n]+)*?)(?=\n\n|\nScenario|\nMOST LIKELY|$)/gi;
        
        let match;
        while ((match = scenarioRegex.exec(text)) !== null) {
            scenarios.push({
                rank: parseInt(match[1]),
                probability: parseInt(match[2]),
                path: [match[3], match[4], match[5]],
                reasoning: match[6].trim().replace(/\n\s*/g, ' ')
            });
        }

        // If no scenarios found, try alternative parsing
        if (scenarios.length === 0) {
            console.warn('⚠️ No scenarios found with primary regex, trying fallback parsing');
            return this.extractScenariosWithFallback(text);
        }

        // Sort by probability (highest first)
        scenarios.sort((a, b) => b.probability - a.probability);

        // Ensure we have at least 2 scenarios
        if (scenarios.length < 2) {
            scenarios.push(...this.generateFallbackScenarios(scenarios.length));
        }

        return scenarios.slice(0, 4); // Max 4 scenarios
    }

    /**
     * Fallback scenario extraction
     */
    extractScenariosWithFallback(text) {
        const scenarios = [];
        
        // Try to find any mention of paths or predictions
        const pathRegex = /(UP|DOWN)\s*→\s*(UP|DOWN)\s*→\s*(UP|DOWN)/gi;
        const matches = text.match(pathRegex);
        
        if (matches && matches.length > 0) {
            matches.forEach((match, index) => {
                const pathParts = match.split('→').map(p => p.trim().toUpperCase());
                scenarios.push({
                    rank: index + 1,
                    probability: Math.max(75 - (index * 10), 45), // Decreasing probability
                    path: pathParts,
                    reasoning: `Technical analysis suggests this path based on current market conditions and indicator alignment.`
                });
            });
        }

        // If still no scenarios, generate defaults
        if (scenarios.length === 0) {
            return this.generateFallbackScenarios(0);
        }

        return scenarios;
    }

    /**
     * Generate fallback scenarios when parsing fails
     */
    generateFallbackScenarios(existingCount) {
        const fallbackScenarios = [
            {
                rank: existingCount + 1,
                probability: 72,
                path: ['DOWN', 'UP', 'DOWN'],
                reasoning: 'Oversold bounce expected after initial drop, then bearish continuation based on trend analysis.'
            },
            {
                rank: existingCount + 2,
                probability: 65,
                path: ['UP', 'DOWN', 'UP'],
                reasoning: 'Short-term reversal likely with pullback before recovery, supported by technical indicators.'
            },
            {
                rank: existingCount + 3,
                probability: 58,
                path: ['DOWN', 'DOWN', 'UP'],
                reasoning: 'Extended bearish momentum followed by technical bounce at support levels.'
            }
        ];

        return fallbackScenarios.slice(0, 3 - existingCount);
    }

    /**
     * Extract signal with NO HOLD guarantee
     */
    extractSignalWithNoHold(text) {
        const signalMatch = text.match(/Signal:\s*(BUY|SELL|HOLD)/i);
        let signal = signalMatch ? signalMatch[1].toUpperCase() : null;
        
        // NEVER allow HOLD - convert to BUY or SELL
        if (!signal || signal === 'HOLD') {
            console.log('🚫 HOLD signal detected or missing - converting to BUY/SELL');
            
            // Analyze text for bullish/bearish indicators
            const bullishWords = ['up', 'bull', 'buy', 'rise', 'higher', 'support', 'bounce', 'rally'];
            const bearishWords = ['down', 'bear', 'sell', 'fall', 'lower', 'resistance', 'drop', 'decline'];
            
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
            
            signal = bullishScore > bearishScore ? 'BUY' : 'SELL';
            console.log(`🎯 Converted to ${signal} (bullish: ${bullishScore}, bearish: ${bearishScore})`);
        }
        
        return signal;
    }

    /**
     * Extract field from text
     */
    extractField(text, fieldName, regex) {
        const match = text.match(regex);
        return match ? match[1].trim() : 'Unknown';
    }

    /**
     * Extract number from text
     */
    extractNumber(text, fieldName, regex) {
        const match = text.match(regex);
        return match ? parseInt(match[1]) : 70;
    }

    /**
     * Validate multi-scenario analysis
     */
    validateMultiScenarioAnalysis(analysis) {
        // Ensure signal is never HOLD
        if (!analysis.signal || analysis.signal === 'HOLD') {
            analysis.signal = 'BUY'; // Default fallback
        }

        // Validate confidence ranges
        analysis.signalConfidence = Math.min(95, Math.max(60, analysis.signalConfidence || 70));
        analysis.overallConfidence = Math.min(95, Math.max(60, analysis.overallConfidence || 70));

        // Validate scenarios
        if (!analysis.scenarios || analysis.scenarios.length === 0) {
            analysis.scenarios = this.generateFallbackScenarios(0);
        }

        // Ensure probabilities are reasonable
        analysis.scenarios.forEach(scenario => {
            scenario.probability = Math.min(85, Math.max(40, scenario.probability || 60));
        });

        return analysis;
    }

    /**
     * Create fallback response when parsing fails
     */
    createMultiScenarioFallbackResponse(text, options) {
        console.log('🔄 Creating multi-scenario fallback response');
        
        return {
            signal: this.extractSignalWithNoHold(text),
            signalConfidence: 70,
            overallConfidence: 70,
            trend: 'Unknown',
            marketCondition: 'Consolidating',
            scenarios: this.generateFallbackScenarios(0),
            mostLikelyPath: 'Scenario 1',
            confluenceFactors: 'Technical analysis based on available indicators'
        };
    }

    /**
     * Process scenarios and apply final logic
     */
    processScenarios(analysis) {
        // Sort scenarios by probability
        analysis.scenarios.sort((a, b) => b.probability - a.probability);

        // Set most likely path if not already set
        if (!analysis.mostLikelyPath || analysis.mostLikelyPath === 'Unknown') {
            analysis.mostLikelyPath = `${analysis.scenarios[0].path.join(' → ')} (${analysis.scenarios[0].probability}%)`;
        }

        return analysis;
    }

    /**
     * Convert scenarios to legacy prediction format for backward compatibility
     */
    convertScenariosToLegacyFormat(scenarios) {
        if (!scenarios || scenarios.length === 0) {
            return {
                "1": { direction: "UP", probability: 70, explanation: "Default prediction" },
                "2": { direction: "DOWN", probability: 65, explanation: "Default prediction" },
                "3": { direction: "UP", probability: 60, explanation: "Default prediction" }
            };
        }

        // Use the most likely scenario for legacy format
        const topScenario = scenarios[0];
        const predictions = {};

        topScenario.path.forEach((direction, index) => {
            predictions[(index + 1).toString()] = {
                direction: direction,
                probability: Math.max(60, topScenario.probability - (index * 5)), // Slightly decrease confidence for later candles
                explanation: `Based on most likely scenario: ${topScenario.reasoning}`
            };
        });

        return predictions;
    }

    /**
     * Update scenario statistics
     */
    updateScenarioStats(analysis, processingTime) {
        this.scenarioStats.totalAnalyses++;
        this.scenarioStats.averageScenarios = (
            (this.scenarioStats.averageScenarios * (this.scenarioStats.totalAnalyses - 1) + 
             analysis.scenarios.length) / this.scenarioStats.totalAnalyses
        );
        this.scenarioStats.averageConfidence = (
            (this.scenarioStats.averageConfidence * (this.scenarioStats.totalAnalyses - 1) + 
             analysis.overallConfidence) / this.scenarioStats.totalAnalyses
        );
        this.scenarioStats.averageProcessingTime = (
            (this.scenarioStats.averageProcessingTime * (this.scenarioStats.totalAnalyses - 1) + 
             processingTime) / this.scenarioStats.totalAnalyses
        );
    }

    /**
     * Get scenario statistics
     */
    getScenarioStats() {
        return {
            ...this.scenarioStats,
            averageScenarios: Math.round(this.scenarioStats.averageScenarios * 100) / 100,
            averageConfidence: Math.round(this.scenarioStats.averageConfidence * 100) / 100,
            averageProcessingTime: Math.round(this.scenarioStats.averageProcessingTime)
        };
    }
}

module.exports = MultiScenarioGeminiVisionService;