/**
 * AI Trading Model Integration
 * Handles communication with FastAPI backend and local inference
 */

class AITradingModel {
    constructor() {
        this.apiEndpoint = 'http://localhost:8000'; // Default FastAPI endpoint
        this.localAIModel = null; // TensorFlow.js model
        this.aiSignalEngine = null; // AI Signal Engine
        this.isConnected = false;
        this.modelVersion = null;
        this.confidence = 0;
        this.useLocalAI = true; // Prefer local AI over API
        
        this.init();
    }

    async init() {
        console.log('[AI Model] Initializing trading AI...');
        
        try {
            // Initialize local TensorFlow.js AI model first
            await this.initializeLocalAI();
            
            // Initialize AI Signal Engine
            await this.initializeSignalEngine();
            
            // Try to connect to API endpoint (fallback)
            await this.checkConnection();
            
            // Load configuration
            await this.loadConfiguration();
            
            console.log('[AI Model] ✅ AI Trading Model ready');
            
        } catch (error) {
            console.error('[AI Model] Initialization failed:', error);
            await this.createEmergencyFallback();
        }
    }

    async initializeLocalAI() {
        console.log('[AI Model] 🧠 Initializing local TensorFlow.js model...');
        
        try {
            // Load TensorFlow AI model
            if (typeof TensorFlowAIModel !== 'undefined') {
                this.localAIModel = new TensorFlowAIModel();
                await this.localAIModel.init();
                console.log('[AI Model] ✅ Local TensorFlow.js model ready');
            } else {
                // Dynamically load the model
                await this.loadTensorFlowAIModel();
            }
        } catch (error) {
            console.warn('[AI Model] ⚠️ Local AI model initialization failed:', error);
        }
    }

    async loadTensorFlowAIModel() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('utils/tensorflow-ai-model.js');
            
            script.onload = async () => {
                try {
                    this.localAIModel = new TensorFlowAIModel();
                    await this.localAIModel.init();
                    console.log('[AI Model] ✅ TensorFlow.js model loaded dynamically');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            script.onerror = () => reject(new Error('Failed to load TensorFlow AI model'));
            document.head.appendChild(script);
        });
    }

    async initializeSignalEngine() {
        console.log('[AI Model] 🎯 Initializing AI Signal Engine...');
        
        try {
            if (typeof AISignalEngine !== 'undefined') {
                this.aiSignalEngine = new AISignalEngine();
                await this.aiSignalEngine.init();
                console.log('[AI Model] ✅ AI Signal Engine ready');
            } else {
                // Dynamically load the signal engine
                await this.loadAISignalEngine();
            }
        } catch (error) {
            console.warn('[AI Model] ⚠️ AI Signal Engine initialization failed:', error);
        }
    }

    async loadAISignalEngine() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('utils/ai-signal-engine.js');
            
            script.onload = async () => {
                try {
                    this.aiSignalEngine = new AISignalEngine();
                    await this.aiSignalEngine.init();
                    console.log('[AI Model] ✅ AI Signal Engine loaded dynamically');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            script.onerror = () => reject(new Error('Failed to load AI Signal Engine'));
            document.head.appendChild(script);
        });
    }

    convertSignalToPrediction(signal) {
        return {
            prediction: signal.direction.toUpperCase(),
            confidence: signal.confidence,
            reason: signal.ai_prediction?.explanation || signal.confluence?.factors || ['AI Signal Engine analysis'],
            risk: signal.risk?.risk || 'medium',
            volatility: signal.technical_analysis?.volatility || 'normal',
            timestamp: signal.timestamp,
            model_version: 'ai-signal-engine-v1.0',
            features_used: ['multi-timeframe', 'tensorflow-js', 'technical-indicators', 'pattern-recognition'],
            signal_strength: signal.signal_strength || 'medium',
            confluence_score: signal.confluence?.percentage || 0,
            entry_timing: signal.entry_timing,
            position_size: signal.position_size,
            data_quality: signal.data_quality
        };
    }

    async createEmergencyFallback() {
        console.log('[AI Model] 🆘 Creating emergency fallback system');
        
        // Create minimal fallback objects
        this.localAIModel = {
            isModelLoaded: true,
            predict: (marketData) => this.generateEmergencyPrediction(marketData)
        };
        
        this.aiSignalEngine = {
            isInitialized: true,
            generateSignal: (marketData) => null // Will fall back to local model
        };
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.apiEndpoint}/health`, {
                method: 'GET',
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.isConnected = true;
                this.modelVersion = data.model_version || 'v1.0.0';
                console.log(`[AI Model] 🧠 Connected to AI backend (${this.modelVersion})`);
            }
        } catch (error) {
            this.isConnected = false;
            console.log('[AI Model] ⚠️ API not available, using local fallback');
        }
    }

    async loadConfiguration() {
        try {
            chrome.storage.local.get(['aiConfig'], (result) => {
                if (result.aiConfig) {
                    this.apiEndpoint = result.aiConfig.endpoint || this.apiEndpoint;
                    this.confidence = result.aiConfig.minConfidence || 75;
                }
            });
        } catch (error) {
            console.log('[AI Model] Using default configuration');
        }
    }

    async predict(marketData) {
        console.log('[AI Model] 🎯 Generating AI-powered prediction...');
        
        try {
            // Use AI Signal Engine for comprehensive analysis
            if (this.aiSignalEngine && this.aiSignalEngine.isInitialized) {
                console.log('[AI Model] Using AI Signal Engine for prediction');
                const signal = await this.aiSignalEngine.generateSignal(marketData);
                
                if (signal) {
                    return this.convertSignalToPrediction(signal);
                }
            }
            
            // Fallback to local TensorFlow.js model
            if (this.localAIModel && this.localAIModel.isModelLoaded) {
                console.log('[AI Model] Using local TensorFlow.js model');
                const prediction = await this.localAIModel.predict(marketData);
                
                if (prediction) {
                    return this.enhancePrediction(prediction, marketData);
                }
            }
            
            // Fallback to API if available
            if (this.isConnected) {
                console.log('[AI Model] Using API fallback');
                const aiInput = this.prepareInput(marketData);
                const prediction = await this.callAPI(aiInput);
                return this.enhancePrediction(prediction, marketData);
            }
            
            // Ultimate fallback
            console.warn('[AI Model] Using emergency fallback prediction');
            return this.generateEmergencyPrediction(marketData);
            
        } catch (error) {
            console.error('[AI Model] 💥 Prediction failed:', error);
            return this.generateEmergencyPrediction(marketData);
        }
    }

    prepareInput(marketData) {
        const input = {
            // Asset information
            symbol: marketData.symbol || 'EURUSD',
            platform: marketData.platform || 'generic',
            timestamp: marketData.timestamp || Date.now(),
            
            // Multi-timeframe structure
            timeframes: {},
            
            // Technical indicators
            indicators: marketData.indicators || {},
            
            // Detected patterns
            patterns: marketData.patterns || [],
            
            // Market context
            context: {
                dataQuality: marketData.dataQuality || 'fair',
                volatility: this.extractVolatility(marketData),
                trend: this.extractTrend(marketData),
                volume: this.extractVolume(marketData)
            }
        };

        // Process multi-timeframe data
        if (marketData.structure) {
            for (const [timeframe, data] of Object.entries(marketData.structure)) {
                input.timeframes[timeframe] = {
                    candles: this.prepareCandleData(data.candles || []),
                    indicators: this.calculateTimeframeIndicators(data.candles || []),
                    trend: data.trend || 'neutral',
                    volatility: data.volatility || 'normal',
                    lastPrice: data.lastPrice || 0
                };
            }
        }

        return input;
    }

    prepareCandleData(candles) {
        return candles.slice(-24).map(candle => ({
            timestamp: candle.timestamp,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume || 0)
        }));
    }

    calculateTimeframeIndicators(candles) {
        if (!candles || candles.length < 14) return {};

        try {
            return {
                rsi: this.calculateRSI(candles, 14),
                ema9: this.calculateEMA(candles, 9),
                ema21: this.calculateEMA(candles, 21),
                macd: this.calculateMACD(candles),
                atr: this.calculateATR(candles, 14),
                bb: this.calculateBollingerBands(candles, 20, 2)
            };
        } catch (error) {
            console.log('[AI Model] Indicator calculation error:', error);
            return {};
        }
    }

    async callAPI(input) {
        const response = await fetch(`${this.apiEndpoint}/predict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer your-api-key', // Add if needed
            },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return this.validateAPIResponse(result);
    }

    validateAPIResponse(response) {
        // Ensure response has required fields
        const prediction = {
            prediction: response.prediction || response.direction || 'NEUTRAL',
            confidence: Math.max(0, Math.min(100, response.confidence || 50)),
            reason: response.reason || response.explanation || 'AI analysis',
            risk: response.risk || 'Medium',
            volatility: response.volatility || 'Normal',
            timestamp: response.timestamp || Date.now(),
            model_version: response.model_version || this.modelVersion,
            features_used: response.features_used || [],
            signal_strength: response.signal_strength || 'medium'
        };

        // Normalize prediction values
        if (['UP', 'CALL', 'BUY', '1', 1].includes(prediction.prediction)) {
            prediction.prediction = 'UP';
        } else if (['DOWN', 'PUT', 'SELL', '0', 0].includes(prediction.prediction)) {
            prediction.prediction = 'DOWN';
        } else {
            prediction.prediction = 'NEUTRAL';
        }

        return prediction;
    }

    enhancePrediction(prediction, marketData) {
        const enhanced = { ...prediction };

        // Add confluence analysis
        enhanced.confluence = this.analyzeConfluence(marketData);
        
        // Add timeframe agreement
        enhanced.timeframe_agreement = this.getTimeframeAgreement(marketData);
        
        // Adjust confidence based on market conditions
        enhanced.confidence = this.adjustConfidenceForMarket(enhanced.confidence, marketData);
        
        // Add entry timing
        enhanced.entry_timing = this.calculateEntryTiming(marketData);
        
        // Add risk assessment
        enhanced.risk_score = this.calculateRiskScore(marketData);
        
        return enhanced;
    }

    analyzeConfluence(marketData) {
        let confluenceScore = 0;
        let factors = [];

        // Indicator confluence
        const indicators = marketData.indicators || {};
        
        if (indicators.RSI) {
            if (indicators.RSI < 30 || indicators.RSI > 70) {
                confluenceScore += 1;
                factors.push(`RSI ${indicators.RSI < 30 ? 'oversold' : 'overbought'}`);
            }
        }

        if (indicators.EMA9 && indicators.EMA21) {
            if (indicators.EMA9 > indicators.EMA21) {
                confluenceScore += 1;
                factors.push('EMA bullish alignment');
            } else if (indicators.EMA9 < indicators.EMA21) {
                confluenceScore += 1;
                factors.push('EMA bearish alignment');
            }
        }

        if (indicators.MACD) {
            if (Math.abs(indicators.MACD) > 0.0001) {
                confluenceScore += 1;
                factors.push(`MACD ${indicators.MACD > 0 ? 'bullish' : 'bearish'}`);
            }
        }

        // Pattern confluence
        const patterns = marketData.patterns || [];
        const strongPatterns = patterns.filter(p => p.strength === 'strong' || p.strength === 'very_strong');
        
        if (strongPatterns.length > 0) {
            confluenceScore += strongPatterns.length;
            factors.push(...strongPatterns.map(p => p.name));
        }

        // Multi-timeframe confluence
        if (marketData.structure) {
            const timeframeTrends = Object.values(marketData.structure)
                .map(data => data.trend)
                .filter(trend => trend && trend !== 'neutral');
            
            const bullishTrends = timeframeTrends.filter(t => t === 'bullish').length;
            const bearishTrends = timeframeTrends.filter(t => t === 'bearish').length;
            
            if (bullishTrends >= 3 || bearishTrends >= 3) {
                confluenceScore += 2;
                factors.push(`${Math.max(bullishTrends, bearishTrends)} timeframes aligned`);
            }
        }

        return {
            score: confluenceScore,
            max_score: 8,
            percentage: Math.min(100, (confluenceScore / 8) * 100),
            factors: factors
        };
    }

    getTimeframeAgreement(marketData) {
        if (!marketData.structure) return { agreement: 0, details: [] };

        const timeframes = ['1H', '30M', '15M', '5M'];
        const trends = {};
        
        timeframes.forEach(tf => {
            if (marketData.structure[tf] && marketData.structure[tf].trend) {
                trends[tf] = marketData.structure[tf].trend;
            }
        });

        const trendValues = Object.values(trends);
        const bullishCount = trendValues.filter(t => t === 'bullish').length;
        const bearishCount = trendValues.filter(t => t === 'bearish').length;
        const totalCount = trendValues.length;

        let agreement = 0;
        let direction = 'mixed';

        if (bullishCount > bearishCount) {
            agreement = (bullishCount / totalCount) * 100;
            direction = 'bullish';
        } else if (bearishCount > bullishCount) {
            agreement = (bearishCount / totalCount) * 100;
            direction = 'bearish';
        } else {
            agreement = 0;
            direction = 'mixed';
        }

        return {
            agreement: Math.round(agreement),
            direction: direction,
            timeframes: trends,
            details: Object.entries(trends).map(([tf, trend]) => `${tf}: ${trend}`)
        };
    }

    adjustConfidenceForMarket(baseConfidence, marketData) {
        let adjustedConfidence = baseConfidence;

        // Data quality adjustment
        const qualityAdjustment = {
            'excellent': 10,
            'good': 5,
            'fair': 0,
            'poor': -15
        };
        
        adjustedConfidence += qualityAdjustment[marketData.dataQuality] || 0;

        // Volatility adjustment
        const volatility = this.extractVolatility(marketData);
        if (volatility === 'high') {
            adjustedConfidence -= 10; // High volatility reduces confidence
        } else if (volatility === 'low') {
            adjustedConfidence -= 5; // Low volatility also reduces confidence
        }

        // Pattern strength adjustment
        const patterns = marketData.patterns || [];
        const veryStrongPatterns = patterns.filter(p => p.strength === 'very_strong').length;
        adjustedConfidence += veryStrongPatterns * 5;

        // Confluence adjustment
        const confluence = this.analyzeConfluence(marketData);
        if (confluence.percentage > 70) {
            adjustedConfidence += 10;
        } else if (confluence.percentage < 30) {
            adjustedConfidence -= 10;
        }

        return Math.max(0, Math.min(100, Math.round(adjustedConfidence)));
    }

    calculateEntryTiming(marketData) {
        // Analyze best entry timing based on current conditions
        const currentTimeframe = this.getCurrentPrimaryTimeframe(marketData);
        const nextCandleTime = this.getNextCandleTime(currentTimeframe);
        
        return {
            timeframe: currentTimeframe,
            next_candle: nextCandleTime,
            recommendation: `Enter on next ${currentTimeframe} candle`,
            urgency: this.calculateUrgency(marketData)
        };
    }

    calculateRiskScore(marketData) {
        let riskScore = 50; // Base risk

        // Volatility risk
        const volatility = this.extractVolatility(marketData);
        if (volatility === 'high') riskScore += 20;
        if (volatility === 'low') riskScore += 10;

        // Trend strength risk
        const trends = this.getTimeframeAgreement(marketData);
        if (trends.agreement < 60) riskScore += 15;

        // Pattern reliability risk
        const patterns = marketData.patterns || [];
        const reliablePatterns = patterns.filter(p => (p.reliability || 0) > 70).length;
        if (reliablePatterns === 0) riskScore += 10;

        // Data quality risk
        if (marketData.dataQuality === 'poor') riskScore += 25;
        if (marketData.dataQuality === 'fair') riskScore += 10;

        const finalRisk = Math.max(0, Math.min(100, riskScore));
        
        return {
            score: finalRisk,
            level: finalRisk > 70 ? 'High' : finalRisk > 40 ? 'Medium' : 'Low',
            factors: this.getRiskFactors(marketData)
        };
    }

    generateEmergencyPrediction(marketData) {
        console.log('[AI Model] 🚨 Using emergency prediction mode');
        
        // Ultra-simple rule-based prediction
        const indicators = marketData.indicators || {};
        let direction = 'NEUTRAL';
        let confidence = 50;
        let reason = 'Emergency analysis';

        // Simple RSI logic
        if (indicators.RSI) {
            if (indicators.RSI < 25) {
                direction = 'UP';
                confidence = 65;
                reason = 'RSI extremely oversold';
            } else if (indicators.RSI > 75) {
                direction = 'DOWN';
                confidence = 65;
                reason = 'RSI extremely overbought';
            }
        }

        // Simple EMA logic
        if (indicators.EMA9 && indicators.EMA21) {
            if (indicators.EMA9 > indicators.EMA21 * 1.001) {
                direction = direction === 'NEUTRAL' ? 'UP' : direction;
                confidence += 10;
                reason += ' + EMA bullish';
            } else if (indicators.EMA9 < indicators.EMA21 * 0.999) {
                direction = direction === 'NEUTRAL' ? 'DOWN' : direction;
                confidence += 10;
                reason += ' + EMA bearish';
            }
        }

        return {
            prediction: direction,
            confidence: Math.min(75, confidence), // Cap emergency predictions
            reason: reason,
            risk: 'High',
            volatility: 'Unknown',
            timestamp: Date.now(),
            model_version: 'emergency_v1.0',
            emergency_mode: true
        };
    }

    // Helper methods for indicator calculations
    calculateRSI(candles, period = 14) {
        if (candles.length < period + 1) return null;
        
        let gains = 0, losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = candles[i].close - candles[i-1].close;
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        for (let i = period + 1; i < candles.length; i++) {
            const change = candles[i].close - candles[i-1].close;
            avgGain = ((avgGain * (period - 1)) + (change > 0 ? change : 0)) / period;
            avgLoss = ((avgLoss * (period - 1)) + (change < 0 ? Math.abs(change) : 0)) / period;
        }
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateEMA(candles, period) {
        if (candles.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;
        
        for (let i = period; i < candles.length; i++) {
            ema = (candles[i].close * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateMACD(candles, fast = 12, slow = 26) {
        const emaFast = this.calculateEMA(candles, fast);
        const emaSlow = this.calculateEMA(candles, slow);
        
        if (!emaFast || !emaSlow) return null;
        return emaFast - emaSlow;
    }

    calculateATR(candles, period = 14) {
        if (candles.length < period + 1) return null;
        
        const trueRanges = [];
        for (let i = 1; i < candles.length; i++) {
            const tr = Math.max(
                candles[i].high - candles[i].low,
                Math.abs(candles[i].high - candles[i-1].close),
                Math.abs(candles[i].low - candles[i-1].close)
            );
            trueRanges.push(tr);
        }
        
        return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
    }

    calculateBollingerBands(candles, period = 20, stdDev = 2) {
        if (candles.length < period) return null;
        
        const prices = candles.slice(-period).map(c => c.close);
        const sma = prices.reduce((sum, price) => sum + price, 0) / period;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    // Helper extraction methods
    extractVolatility(marketData) {
        if (marketData.context && marketData.context.volatility) {
            return marketData.context.volatility;
        }
        
        // Try to extract from structure
        if (marketData.structure) {
            const volatilities = Object.values(marketData.structure)
                .map(data => data.volatility)
                .filter(Boolean);
            
            if (volatilities.length > 0) {
                return volatilities[0]; // Use first available
            }
        }
        
        return 'normal';
    }

    extractTrend(marketData) {
        if (marketData.context && marketData.context.trend) {
            return marketData.context.trend;
        }
        
        // Analyze multi-timeframe trends
        if (marketData.structure) {
            const trends = Object.values(marketData.structure)
                .map(data => data.trend)
                .filter(Boolean);
            
            const bullish = trends.filter(t => t === 'bullish').length;
            const bearish = trends.filter(t => t === 'bearish').length;
            
            if (bullish > bearish) return 'bullish';
            if (bearish > bullish) return 'bearish';
        }
        
        return 'neutral';
    }

    extractVolume(marketData) {
        if (marketData.context && marketData.context.volume) {
            return marketData.context.volume;
        }
        
        return 'normal';
    }

    getCurrentPrimaryTimeframe(marketData) {
        // Determine best timeframe for entry
        if (marketData.structure) {
            if (marketData.structure['5M']) return '5M';
            if (marketData.structure['3M']) return '3M';
            if (marketData.structure['1M']) return '1M';
        }
        return '5M';
    }

    getNextCandleTime(timeframe) {
        const now = new Date();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        const timeframeMinutes = {
            '1M': 1,
            '3M': 3,
            '5M': 5,
            '15M': 15,
            '30M': 30,
            '1H': 60
        };
        
        const tfMin = timeframeMinutes[timeframe] || 5;
        const nextCandleMinutes = Math.ceil((minutes + 1) / tfMin) * tfMin;
        const timeToNext = (nextCandleMinutes - minutes) * 60 - seconds;
        
        return Math.max(0, timeToNext);
    }

    calculateUrgency(marketData) {
        // Calculate how urgent the signal is
        const patterns = marketData.patterns || [];
        const strongPatterns = patterns.filter(p => p.strength === 'very_strong' || p.strength === 'strong');
        const confluence = this.analyzeConfluence(marketData);
        
        if (strongPatterns.length > 0 && confluence.percentage > 70) {
            return 'high';
        } else if (confluence.percentage > 50) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    getRiskFactors(marketData) {
        const factors = [];
        
        if (this.extractVolatility(marketData) === 'high') {
            factors.push('High market volatility');
        }
        
        if (marketData.dataQuality === 'poor') {
            factors.push('Poor data quality');
        }
        
        const trends = this.getTimeframeAgreement(marketData);
        if (trends.agreement < 60) {
            factors.push('Mixed timeframe signals');
        }
        
        const patterns = marketData.patterns || [];
        if (patterns.length === 0) {
            factors.push('No strong patterns detected');
        }
        
        return factors;
    }
}

/**
 * Local Inference Engine - Fallback when API is not available
 */
class LocalInferenceEngine {
    constructor() {
        this.version = 'local_v1.0';
    }

    async predict(input) {
        console.log('[Local AI] 🧠 Running local inference...');
        
        // Advanced rule-based prediction with scoring
        const score = this.calculateScore(input);
        const prediction = this.scoreToPrediction(score);
        
        return {
            prediction: prediction.direction,
            confidence: prediction.confidence,
            reason: prediction.reason,
            risk: prediction.risk,
            volatility: input.context.volatility || 'Normal',
            timestamp: Date.now(),
            model_version: this.version,
            score_details: score
        };
    }

    calculateScore(input) {
        let bullishScore = 0;
        let bearishScore = 0;
        let reasons = [];

        // Indicator analysis
        const indicators = input.indicators || {};
        
        // RSI scoring
        if (indicators.RSI) {
            if (indicators.RSI < 25) {
                bullishScore += 3;
                reasons.push('RSI extremely oversold');
            } else if (indicators.RSI < 35) {
                bullishScore += 2;
                reasons.push('RSI oversold');
            } else if (indicators.RSI > 75) {
                bearishScore += 3;
                reasons.push('RSI extremely overbought');
            } else if (indicators.RSI > 65) {
                bearishScore += 2;
                reasons.push('RSI overbought');
            }
        }

        // EMA scoring
        if (indicators.EMA9 && indicators.EMA21) {
            if (indicators.EMA9 > indicators.EMA21 * 1.002) {
                bullishScore += 2;
                reasons.push('Strong EMA bullish alignment');
            } else if (indicators.EMA9 > indicators.EMA21) {
                bullishScore += 1;
                reasons.push('EMA bullish');
            } else if (indicators.EMA9 < indicators.EMA21 * 0.998) {
                bearishScore += 2;
                reasons.push('Strong EMA bearish alignment');
            } else if (indicators.EMA9 < indicators.EMA21) {
                bearishScore += 1;
                reasons.push('EMA bearish');
            }
        }

        // MACD scoring
        if (indicators.MACD) {
            if (indicators.MACD > 0.0001) {
                bullishScore += 1;
                reasons.push('MACD bullish');
            } else if (indicators.MACD < -0.0001) {
                bearishScore += 1;
                reasons.push('MACD bearish');
            }
        }

        // Pattern scoring
        const patterns = input.patterns || [];
        patterns.forEach(pattern => {
            const weight = pattern.strength === 'very_strong' ? 3 : 
                          pattern.strength === 'strong' ? 2 : 1;
            
            if (pattern.type === 'bullish') {
                bullishScore += weight;
                reasons.push(`${pattern.name} pattern`);
            } else if (pattern.type === 'bearish') {
                bearishScore += weight;
                reasons.push(`${pattern.name} pattern`);
            }
        });

        // Multi-timeframe scoring
        Object.entries(input.timeframes || {}).forEach(([tf, data]) => {
            const weight = tf === '1H' ? 3 : tf === '30M' ? 2 : 1;
            
            if (data.trend === 'bullish') {
                bullishScore += weight;
                reasons.push(`${tf} bullish trend`);
            } else if (data.trend === 'bearish') {
                bearishScore += weight;
                reasons.push(`${tf} bearish trend`);
            }
        });

        return {
            bullish: bullishScore,
            bearish: bearishScore,
            total: bullishScore + bearishScore,
            difference: Math.abs(bullishScore - bearishScore),
            reasons: reasons.slice(0, 5) // Limit reasons
        };
    }

    scoreToPrediction(score) {
        if (score.total < 3) {
            return {
                direction: 'NEUTRAL',
                confidence: 45,
                reason: 'Insufficient confluence',
                risk: 'High'
            };
        }

        const direction = score.bullish > score.bearish ? 'UP' : 'DOWN';
        const dominantScore = Math.max(score.bullish, score.bearish);
        
        // Calculate confidence based on score strength and difference
        let confidence = 50 + (score.difference * 5) + (dominantScore * 2);
        confidence = Math.max(55, Math.min(85, confidence)); // Cap for local inference
        
        const risk = confidence > 75 ? 'Low' : confidence > 65 ? 'Medium' : 'High';
        
        return {
            direction,
            confidence: Math.round(confidence),
            reason: score.reasons.slice(0, 3).join(' + '),
            risk
        };
    }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AITradingModel, LocalInferenceEngine };
} else if (typeof window !== 'undefined') {
    window.AITradingModel = AITradingModel;
    window.LocalInferenceEngine = LocalInferenceEngine;
} else {
    // Service worker environment - make globally available
    self.AITradingModel = AITradingModel;
    self.LocalInferenceEngine = LocalInferenceEngine;
}