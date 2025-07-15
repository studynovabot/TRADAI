/**
 * AI-Powered Signal Generation Engine
 * Integrates TensorFlow.js model with multi-timeframe analysis
 * Generates high-confidence trading signals with strict validation
 */

class AISignalEngine {
    constructor() {
        this.aiModel = null;
        this.realTimeAnalyzer = null;
        this.isInitialized = false;
        this.signalHistory = [];
        this.lastSignalTime = 0;
        this.minSignalInterval = 60000; // 1 minute minimum between signals
        this.confidenceThreshold = 85;
        this.maxSignalsPerHour = 5;
        this.maxSignalsPerDay = 15;
        
        // Multi-timeframe weights for confluence
        this.timeframeWeights = {
            '1H': 0.40,   // Highest weight for trend
            '30M': 0.25,  // Medium-high for momentum
            '15M': 0.20,  // Medium for confirmation
            '5M': 0.10,   // Lower for entry timing
            '1M': 0.05    // Lowest for micro-structure
        };
        
        // Risk management settings
        this.riskSettings = {
            maxConsecutiveLosses: 2,
            cooldownAfterLoss: 3600000, // 1 hour
            dailyLossLimit: 3,
            emergencyStop: false
        };
        
        this.init();
    }

    async init() {
        console.log('[AI Signal Engine] 🚀 Initializing AI-powered signal engine...');
        
        try {
            // Initialize TensorFlow.js AI model
            if (typeof TensorFlowAIModel !== 'undefined') {
                this.aiModel = new TensorFlowAIModel();
                await this.aiModel.init();
            } else {
                console.warn('[AI Signal Engine] TensorFlow AI model not available, loading...');
                await this.loadAIModel();
            }
            
            // Initialize real-time analyzer
            if (typeof RealTimeAnalyzer !== 'undefined') {
                this.realTimeAnalyzer = new RealTimeAnalyzer();
                await this.realTimeAnalyzer.init();
            } else {
                console.warn('[AI Signal Engine] Real-time analyzer not available');
                this.realTimeAnalyzer = this.createFallbackAnalyzer();
            }
            
            // Load signal history from storage
            await this.loadSignalHistory();
            
            // Load risk settings
            await this.loadRiskSettings();
            
            this.isInitialized = true;
            console.log('[AI Signal Engine] ✅ AI signal engine ready');
            
        } catch (error) {
            console.error('[AI Signal Engine] 💥 Initialization failed:', error);
            this.createEmergencyFallback();
        }
    }

    async loadAIModel() {
        // Dynamically load the TensorFlow AI model
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('utils/tensorflow-ai-model.js');
        
        return new Promise((resolve, reject) => {
            script.onload = async () => {
                this.aiModel = new TensorFlowAIModel();
                await this.aiModel.init();
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async generateSignal(marketData) {
        if (!this.isInitialized) {
            console.warn('[AI Signal Engine] Engine not initialized');
            return null;
        }

        if (this.riskSettings.emergencyStop) {
            console.warn('[AI Signal Engine] 🛑 Emergency stop active');
            return null;
        }

        try {
            console.log('[AI Signal Engine] 🧠 Generating AI-powered signal...');
            
            // Check rate limiting
            if (!this.canGenerateSignal()) {
                console.log('[AI Signal Engine] ⏰ Rate limit active, skipping signal generation');
                return null;
            }
            
            // Validate market data
            if (!this.validateMarketData(marketData)) {
                console.warn('[AI Signal Engine] ❌ Invalid market data');
                return null;
            }
            
            // Step 1: Multi-timeframe technical analysis
            const technicalAnalysis = await this.performTechnicalAnalysis(marketData);
            
            // Step 2: AI prediction
            const aiPrediction = await this.getAIPrediction(marketData);
            
            // Step 3: Confluence analysis
            const confluenceScore = this.calculateConfluence(technicalAnalysis, aiPrediction);
            
            // Step 4: Risk assessment
            const riskAssessment = this.assessRisk(marketData, technicalAnalysis);
            
            // Step 5: Generate final signal
            const signal = this.synthesizeSignal(
                technicalAnalysis, 
                aiPrediction, 
                confluenceScore, 
                riskAssessment,
                marketData
            );
            
            // Step 6: Validate signal quality
            if (signal && this.validateSignal(signal)) {
                // Record signal
                this.recordSignal(signal);
                
                console.log(`[AI Signal Engine] ✅ High-quality signal generated: ${signal.direction} (${signal.confidence}%)`);
                return signal;
            } else {
                console.log('[AI Signal Engine] ⚪ No valid signal generated');
                return null;
            }
            
        } catch (error) {
            console.error('[AI Signal Engine] 💥 Signal generation failed:', error);
            return null;
        }
    }

    async performTechnicalAnalysis(marketData) {
        console.log('[AI Signal Engine] 📊 Performing multi-timeframe technical analysis...');
        
        const analysis = {
            timeframes: {},
            overallTrend: 'neutral',
            momentum: 'neutral',
            volatility: 'normal',
            patterns: [],
            indicators: {}
        };
        
        try {
            // Analyze each timeframe
            for (const [timeframe, data] of Object.entries(marketData.timeframes || {})) {
                if (data && data.candles && data.candles.length >= 20) {
                    const tfAnalysis = await this.analyzeTimeframe(timeframe, data);
                    analysis.timeframes[timeframe] = tfAnalysis;
                }
            }
            
            // Determine overall trend from higher timeframes
            analysis.overallTrend = this.determineOverallTrend(analysis.timeframes);
            
            // Calculate momentum
            analysis.momentum = this.calculateMomentum(analysis.timeframes);
            
            // Assess volatility
            analysis.volatility = this.assessVolatility(marketData);
            
            // Detect patterns
            analysis.patterns = await this.detectPatterns(marketData);
            
            // Aggregate indicators
            analysis.indicators = this.aggregateIndicators(analysis.timeframes);
            
            console.log('[AI Signal Engine] ✅ Technical analysis completed');
            return analysis;
            
        } catch (error) {
            console.error('[AI Signal Engine] Technical analysis failed:', error);
            return analysis; // Return partial analysis
        }
    }

    async analyzeTimeframe(timeframe, data) {
        const candles = data.candles || [];
        if (candles.length < 20) return null;
        
        const analysis = {
            trend: 'neutral',
            strength: 0,
            indicators: {},
            patterns: [],
            support: null,
            resistance: null
        };
        
        try {
            // Calculate indicators using real-time analyzer
            if (this.realTimeAnalyzer && this.realTimeAnalyzer.indicators) {
                const indicators = this.realTimeAnalyzer.indicators;
                
                analysis.indicators = {
                    RSI: indicators.calculateRSI(candles, 14),
                    EMA9: indicators.calculateEMA(candles, 9),
                    EMA21: indicators.calculateEMA(candles, 21),
                    EMA50: indicators.calculateEMA(candles, 50),
                    MACD: indicators.calculateMACD(candles),
                    ATR: indicators.calculateATR(candles, 14)
                };
            }
            
            // Determine trend
            if (analysis.indicators.EMA9 && analysis.indicators.EMA21) {
                if (analysis.indicators.EMA9 > analysis.indicators.EMA21) {
                    analysis.trend = 'bullish';
                    analysis.strength = Math.min(100, 
                        ((analysis.indicators.EMA9 - analysis.indicators.EMA21) / analysis.indicators.EMA21) * 10000
                    );
                } else {
                    analysis.trend = 'bearish';
                    analysis.strength = Math.min(100, 
                        ((analysis.indicators.EMA21 - analysis.indicators.EMA9) / analysis.indicators.EMA9) * 10000
                    );
                }
            }
            
            // Find support/resistance
            const prices = candles.map(c => c.close);
            analysis.support = this.findSupport(prices);
            analysis.resistance = this.findResistance(prices);
            
            // Detect patterns for this timeframe
            if (this.realTimeAnalyzer && this.realTimeAnalyzer.patterns) {
                analysis.patterns = this.realTimeAnalyzer.patterns.detectPatterns(candles, timeframe);
            }
            
        } catch (error) {
            console.error(`[AI Signal Engine] Timeframe analysis failed for ${timeframe}:`, error);
        }
        
        return analysis;
    }

    async getAIPrediction(marketData) {
        console.log('[AI Signal Engine] 🤖 Getting AI prediction...');
        
        if (!this.aiModel || !this.aiModel.isModelLoaded) {
            console.warn('[AI Signal Engine] AI model not available');
            return this.createFallbackPrediction(marketData);
        }
        
        try {
            // Format market data to match the expected input format for TensorFlow.js model
            const formattedData = this.formatDataForTensorFlow(marketData);
            
            // Get prediction from TensorFlow.js model
            const prediction = await this.aiModel.predict(formattedData);
            
            // Check if prediction meets confidence threshold
            if (prediction && prediction.confidence < this.confidenceThreshold) {
                console.log(`[AI Signal Engine] ⚠️ AI prediction confidence (${prediction.confidence}%) below threshold (${this.confidenceThreshold}%)`);
                return null;
            }
            
            // Enhance prediction with additional context
            if (prediction) {
                prediction.source = 'tensorflow-js';
                prediction.model_confidence = prediction.confidence;
                prediction.features_analyzed = this.countAnalyzedFeatures(marketData);
                prediction.inference_time_ms = prediction.inference_time || 0;
                prediction.model_version = prediction.model_version || 'tfjs-local-v1.0';
                
                // Log successful prediction
                console.log(`[AI Signal Engine] ✅ AI prediction: ${prediction.direction.toUpperCase()} with ${prediction.confidence}% confidence`);
                console.log(`[AI Signal Engine] ⏱️ Inference time: ${prediction.inference_time_ms}ms`);
            }
            
            return prediction;
            
        } catch (error) {
            console.error('[AI Signal Engine] AI prediction failed:', error);
            return this.createFallbackPrediction(marketData);
        }
    }
    
    formatDataForTensorFlow(marketData) {
        // Convert market data to the format expected by TensorFlow.js model
        const formattedData = {
            asset: marketData.symbol || 'unknown',
            timeframe: marketData.currentTimeframe || '5m',
            ohlcv: [],
            indicators: {},
            patterns: {},
            market_conditions: {
                volatility: 'medium',
                trend_direction: 'neutral',
                consolidation: false
            }
        };
        
        try {
            // Format OHLCV data
            if (marketData.timeframes) {
                const primaryTimeframe = this.getPrimaryTimeframe(marketData);
                const candles = marketData.timeframes[primaryTimeframe]?.candles || [];
                
                // Convert candles to the expected format [timestamp, open, high, low, close, volume]
                formattedData.ohlcv = candles.map(candle => [
                    candle.timestamp || Date.now(),
                    candle.open,
                    candle.high,
                    candle.low,
                    candle.close,
                    candle.volume || 0
                ]);
            }
            
            // Format indicators
            if (marketData.indicators) {
                const primaryTimeframe = this.getPrimaryTimeframe(marketData);
                formattedData.indicators = marketData.indicators[primaryTimeframe] || {};
            }
            
            // Format patterns
            if (marketData.patterns && Array.isArray(marketData.patterns)) {
                // Convert array of patterns to object format
                marketData.patterns.forEach(pattern => {
                    formattedData.patterns[pattern.name.toLowerCase()] = true;
                });
            }
            
            // Format market conditions
            if (marketData.marketConditions) {
                formattedData.market_conditions = {
                    volatility: marketData.marketConditions.volatility || 'medium',
                    trend_direction: marketData.marketConditions.trend || 'neutral',
                    consolidation: marketData.marketConditions.consolidation || false
                };
            }
            
            // Add multi-timeframe data if available
            if (Object.keys(marketData.timeframes || {}).length > 1) {
                formattedData.mtf_data = {};
                
                Object.entries(marketData.timeframes || {}).forEach(([tf, data]) => {
                    if (data && data.trend) {
                        formattedData.mtf_data[tf] = {
                            trend: data.trend,
                            strength: data.strength || 0.5
                        };
                    }
                });
            }
            
            return formattedData;
            
        } catch (error) {
            console.error('[AI Signal Engine] Error formatting data for TensorFlow:', error);
            return formattedData; // Return partial data
        }
    }
    
    getPrimaryTimeframe(marketData) {
        // Determine the primary timeframe for analysis
        const availableTimeframes = Object.keys(marketData.timeframes || {});
        
        // Prefer 5M, then 1M, then others
        if (availableTimeframes.includes('5M')) return '5M';
        if (availableTimeframes.includes('1M')) return '1M';
        if (availableTimeframes.includes('15M')) return '15M';
        
        return availableTimeframes[0] || '5M';
    }

    calculateConfluence(technicalAnalysis, aiPrediction) {
        console.log('[AI Signal Engine] 🔗 Calculating signal confluence...');
        
        let confluenceScore = 0;
        const factors = [];
        
        try {
            // AI prediction weight (40%)
            if (aiPrediction && aiPrediction.confidence > 70) {
                confluenceScore += (aiPrediction.confidence / 100) * 0.4;
                factors.push(`AI: ${aiPrediction.confidence}%`);
            }
            
            // Multi-timeframe trend alignment (30%)
            const trendAlignment = this.calculateTrendAlignment(technicalAnalysis.timeframes);
            confluenceScore += trendAlignment * 0.3;
            if (trendAlignment > 0.5) {
                factors.push(`Trend alignment: ${Math.round(trendAlignment * 100)}%`);
            }
            
            // Indicator confluence (20%)
            const indicatorScore = this.calculateIndicatorConfluence(technicalAnalysis.indicators);
            confluenceScore += indicatorScore * 0.2;
            if (indicatorScore > 0.5) {
                factors.push(`Indicators: ${Math.round(indicatorScore * 100)}%`);
            }
            
            // Pattern strength (10%)
            const patternScore = this.calculatePatternStrength(technicalAnalysis.patterns);
            confluenceScore += patternScore * 0.1;
            if (patternScore > 0.5) {
                factors.push(`Patterns: ${Math.round(patternScore * 100)}%`);
            }
            
        } catch (error) {
            console.error('[AI Signal Engine] Confluence calculation failed:', error);
        }
        
        return {
            score: Math.min(1.0, confluenceScore),
            percentage: Math.round(Math.min(100, confluenceScore * 100)),
            factors: factors
        };
    }

    synthesizeSignal(technicalAnalysis, aiPrediction, confluenceScore, riskAssessment, marketData) {
        console.log('[AI Signal Engine] 🎯 Synthesizing final signal...');
        
        if (!aiPrediction || confluenceScore.percentage < this.confidenceThreshold) {
            return null;
        }
        
        // Determine direction (AI prediction takes precedence)
        let direction = aiPrediction.direction;
        
        // Adjust confidence based on confluence
        let finalConfidence = Math.min(100, 
            (aiPrediction.confidence * 0.6) + (confluenceScore.percentage * 0.4)
        );
        
        // Apply risk adjustments
        if (riskAssessment.risk === 'high') {
            finalConfidence *= 0.8; // Reduce confidence for high-risk signals
        } else if (riskAssessment.risk === 'very_high') {
            return null; // Reject very high-risk signals
        }
        
        // Final confidence check
        if (finalConfidence < this.confidenceThreshold) {
            return null;
        }
        
        // Create comprehensive signal
        const signal = {
            // Core signal data
            direction: direction,
            confidence: Math.round(finalConfidence * 100) / 100,
            
            // AI analysis
            ai_prediction: {
                direction: aiPrediction.direction,
                confidence: aiPrediction.confidence,
                explanation: aiPrediction.explanation || [],
                inference_time: aiPrediction.inference_time || 0
            },
            
            // Technical analysis
            technical_analysis: {
                overall_trend: technicalAnalysis.overallTrend,
                momentum: technicalAnalysis.momentum,
                volatility: technicalAnalysis.volatility,
                timeframe_alignment: this.calculateTrendAlignment(technicalAnalysis.timeframes)
            },
            
            // Confluence data
            confluence: confluenceScore,
            
            // Risk assessment
            risk: riskAssessment,
            
            // Signal metadata
            timestamp: Date.now(),
            asset: marketData.asset || 'Unknown',
            timeframe: this.getPrimaryTimeframe(marketData),
            platform: marketData.platform || 'generic',
            
            // Execution recommendations
            entry_timing: this.calculateEntryTiming(marketData),
            position_size: this.calculatePositionSize(riskAssessment),
            
            // Quality metrics
            signal_strength: this.determineSignalStrength(finalConfidence, confluenceScore),
            data_quality: this.assessDataQuality(marketData)
        };
        
        return signal;
    }

    validateSignal(signal) {
        if (!signal) return false;
        
        // Basic validation
        if (!signal.direction || !signal.confidence) return false;
        if (signal.confidence < this.confidenceThreshold) return false;
        
        // Risk validation
        if (signal.risk && signal.risk.risk === 'very_high') return false;
        
        // Rate limiting validation
        if (!this.canGenerateSignal()) return false;
        
        // Historical performance validation
        if (this.getRecentSignalPerformance() < 0.4) { // Less than 40% win rate
            console.warn('[AI Signal Engine] Recent performance below threshold');
            return false;
        }
        
        return true;
    }

    // Helper methods
    canGenerateSignal() {
        const now = Date.now();
        
        // Check minimum interval
        if (now - this.lastSignalTime < this.minSignalInterval) {
            return false;
        }
        
        // Check hourly limit
        const hourAgo = now - 3600000;
        const recentSignals = this.signalHistory.filter(s => s.timestamp > hourAgo);
        if (recentSignals.length >= this.maxSignalsPerHour) {
            return false;
        }
        
        // Check daily limit
        const dayAgo = now - 86400000;
        const todaySignals = this.signalHistory.filter(s => s.timestamp > dayAgo);
        if (todaySignals.length >= this.maxSignalsPerDay) {
            return false;
        }
        
        return true;
    }

    recordSignal(signal) {
        this.signalHistory.push({
            ...signal,
            id: this.generateSignalId(),
            recorded_at: Date.now()
        });
        
        // Keep only last 100 signals
        if (this.signalHistory.length > 100) {
            this.signalHistory = this.signalHistory.slice(-100);
        }
        
        this.lastSignalTime = Date.now();
        
        // Save to storage
        this.saveSignalHistory();
    }

    // Additional helper methods would go here...
    validateMarketData(marketData) {
        if (!marketData || typeof marketData !== 'object') return false;
        if (!marketData.timeframes || Object.keys(marketData.timeframes).length === 0) return false;
        
        // Check if we have at least one timeframe with sufficient data
        for (const [tf, data] of Object.entries(marketData.timeframes)) {
            if (data && data.candles && data.candles.length >= 20) {
                return true;
            }
        }
        
        return false;
    }

    determineOverallTrend(timeframes) {
        const trends = Object.entries(timeframes)
            .filter(([tf, data]) => data && data.trend)
            .map(([tf, data]) => ({
                timeframe: tf,
                trend: data.trend,
                weight: this.timeframeWeights[tf] || 0.1
            }));
        
        let bullishWeight = 0;
        let bearishWeight = 0;
        
        trends.forEach(({ trend, weight }) => {
            if (trend === 'bullish') bullishWeight += weight;
            else if (trend === 'bearish') bearishWeight += weight;
        });
        
        if (bullishWeight > bearishWeight * 1.5) return 'bullish';
        if (bearishWeight > bullishWeight * 1.5) return 'bearish';
        return 'neutral';
    }

    calculateMomentum(timeframes) {
        // Simplified momentum calculation
        const momentumScores = Object.entries(timeframes)
            .filter(([tf, data]) => data && data.indicators && data.indicators.RSI)
            .map(([tf, data]) => data.indicators.RSI);
        
        if (momentumScores.length === 0) return 'neutral';
        
        const avgRSI = momentumScores.reduce((sum, rsi) => sum + rsi, 0) / momentumScores.length;
        
        if (avgRSI > 60) return 'bullish';
        if (avgRSI < 40) return 'bearish';
        return 'neutral';
    }

    assessVolatility(marketData) {
        // Simple volatility assessment based on ATR
        const primaryTf = this.getPrimaryTimeframe(marketData);
        const indicators = marketData.indicators?.[primaryTf];
        
        if (indicators && indicators.ATR) {
            const atr = indicators.ATR;
            if (atr > 0.002) return 'high';
            if (atr < 0.0005) return 'low';
        }
        
        return 'normal';
    }

    async detectPatterns(marketData) {
        const patterns = [];
        
        try {
            for (const [timeframe, data] of Object.entries(marketData.timeframes || {})) {
                if (data && data.candles && this.realTimeAnalyzer && this.realTimeAnalyzer.patterns) {
                    const tfPatterns = this.realTimeAnalyzer.patterns.detectPatterns(data.candles, timeframe);
                    patterns.push(...tfPatterns);
                }
            }
        } catch (error) {
            console.error('[AI Signal Engine] Pattern detection failed:', error);
        }
        
        return patterns;
    }

    aggregateIndicators(timeframes) {
        const aggregated = {};
        
        // Aggregate RSI values
        const rsiValues = Object.values(timeframes)
            .filter(tf => tf && tf.indicators && tf.indicators.RSI)
            .map(tf => tf.indicators.RSI);
        
        if (rsiValues.length > 0) {
            aggregated.RSI = rsiValues.reduce((sum, rsi) => sum + rsi, 0) / rsiValues.length;
        }
        
        // Add more indicator aggregations as needed...
        
        return aggregated;
    }

    calculateTrendAlignment(timeframes) {
        const trends = Object.values(timeframes)
            .filter(tf => tf && tf.trend)
            .map(tf => tf.trend);
        
        if (trends.length === 0) return 0;
        
        const bullishCount = trends.filter(t => t === 'bullish').length;
        const bearishCount = trends.filter(t => t === 'bearish').length;
        
        return Math.max(bullishCount, bearishCount) / trends.length;
    }

    calculateIndicatorConfluence(indicators) {
        let score = 0;
        let count = 0;
        
        if (indicators.RSI) {
            if (indicators.RSI > 70 || indicators.RSI < 30) {
                score += 1;
            }
            count++;
        }
        
        // Add more indicator checks...
        
        return count > 0 ? score / count : 0;
    }

    calculatePatternStrength(patterns) {
        if (!patterns || patterns.length === 0) return 0;
        
        const strongPatterns = patterns.filter(p => p.strength === 'strong' || p.strength === 'very_strong');
        return strongPatterns.length / Math.max(1, patterns.length);
    }

    assessRisk(marketData, technicalAnalysis) {
        let riskScore = 0;
        const factors = [];
        
        // Volatility risk
        if (technicalAnalysis.volatility === 'high') {
            riskScore += 2;
            factors.push('High volatility');
        } else if (technicalAnalysis.volatility === 'very_high') {
            riskScore += 3;
            factors.push('Very high volatility');
        }
        
        // Trend uncertainty
        if (technicalAnalysis.overallTrend === 'neutral') {
            riskScore += 1;
            factors.push('Unclear trend direction');
        }
        
        // Data quality
        const dataQuality = this.assessDataQuality(marketData);
        if (dataQuality === 'poor') {
            riskScore += 2;
            factors.push('Poor data quality');
        }
        
        let riskLevel = 'low';
        if (riskScore >= 4) riskLevel = 'very_high';
        else if (riskScore >= 3) riskLevel = 'high';
        else if (riskScore >= 2) riskLevel = 'medium';
        
        return {
            risk: riskLevel,
            score: riskScore,
            factors: factors
        };
    }

    assessDataQuality(marketData) {
        let qualityScore = 100;
        
        // Check timeframe coverage
        const timeframes = Object.keys(marketData.timeframes || {});
        if (timeframes.length < 3) qualityScore -= 20;
        
        // Check data completeness
        for (const [tf, data] of Object.entries(marketData.timeframes || {})) {
            if (!data || !data.candles || data.candles.length < 20) {
                qualityScore -= 15;
            }
        }
        
        // Check indicator availability
        if (!marketData.indicators || Object.keys(marketData.indicators).length < 2) {
            qualityScore -= 10;
        }
        
        if (qualityScore >= 80) return 'excellent';
        if (qualityScore >= 60) return 'good';
        if (qualityScore >= 40) return 'fair';
        return 'poor';
    }

    getPrimaryTimeframe(marketData) {
        const available = Object.keys(marketData.timeframes || {});
        if (available.includes('5M')) return '5M';
        if (available.includes('1M')) return '1M';
        if (available.includes('15M')) return '15M';
        return available[0] || '5M';
    }

    calculateEntryTiming(marketData) {
        const primaryTf = this.getPrimaryTimeframe(marketData);
        return {
            timeframe: primaryTf,
            recommendation: `Enter on next ${primaryTf} candle`,
            urgency: 'medium'
        };
    }

    calculatePositionSize(riskAssessment) {
        let baseSize = 2; // 2% of account
        
        if (riskAssessment.risk === 'high') baseSize *= 0.5;
        else if (riskAssessment.risk === 'very_high') baseSize *= 0.25;
        else if (riskAssessment.risk === 'low') baseSize *= 1.2;
        
        return Math.max(0.5, Math.min(3, baseSize));
    }

    determineSignalStrength(confidence, confluenceScore) {
        const combinedScore = (confidence + confluenceScore.percentage) / 2;
        
        if (combinedScore >= 90) return 'very_strong';
        if (combinedScore >= 80) return 'strong';
        if (combinedScore >= 70) return 'medium';
        return 'weak';
    }

    getRecentSignalPerformance() {
        // Simplified performance calculation
        const recentSignals = this.signalHistory.slice(-10);
        if (recentSignals.length === 0) return 0.5; // Neutral if no history
        
        const wins = recentSignals.filter(s => s.result === 'win').length;
        return wins / recentSignals.length;
    }

    generateSignalId() {
        return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async loadSignalHistory() {
        try {
            const result = await chrome.storage.local.get(['signalHistory']);
            if (result.signalHistory) {
                this.signalHistory = result.signalHistory;
            }
        } catch (error) {
            console.error('[AI Signal Engine] Failed to load signal history:', error);
        }
    }

    async saveSignalHistory() {
        try {
            await chrome.storage.local.set({ signalHistory: this.signalHistory });
        } catch (error) {
            console.error('[AI Signal Engine] Failed to save signal history:', error);
        }
    }

    async loadRiskSettings() {
        try {
            const result = await chrome.storage.local.get(['riskSettings']);
            if (result.riskSettings) {
                this.riskSettings = { ...this.riskSettings, ...result.riskSettings };
            }
        } catch (error) {
            console.error('[AI Signal Engine] Failed to load risk settings:', error);
        }
    }

    createFallbackPrediction(marketData) {
        return {
            direction: Math.random() > 0.5 ? 'up' : 'down',
            confidence: 60 + Math.random() * 15,
            explanation: ['Fallback prediction'],
            source: 'fallback'
        };
    }

    createFallbackAnalyzer() {
        return {
            indicators: {
                calculateRSI: () => 50,
                calculateEMA: () => 1.0,
                calculateMACD: () => ({ macd: 0 }),
                calculateATR: () => 0.001
            },
            patterns: {
                detectPatterns: () => []
            }
        };
    }

    createEmergencyFallback() {
        console.log('[AI Signal Engine] 🆘 Creating emergency fallback');
        this.isInitialized = true;
        this.aiModel = { predict: () => this.createFallbackPrediction() };
        this.realTimeAnalyzer = this.createFallbackAnalyzer();
    }

    // Public API methods
    getEngineStatus() {
        return {
            initialized: this.isInitialized,
            aiModelLoaded: this.aiModel && this.aiModel.isModelLoaded,
            signalCount: this.signalHistory.length,
            lastSignalTime: this.lastSignalTime,
            emergencyStop: this.riskSettings.emergencyStop
        };
    }

    setEmergencyStop(enabled) {
        this.riskSettings.emergencyStop = enabled;
        console.log(`[AI Signal Engine] Emergency stop ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    getSignalHistory(limit = 10) {
        return this.signalHistory.slice(-limit);
    }

    clearSignalHistory() {
        this.signalHistory = [];
        this.saveSignalHistory();
        console.log('[AI Signal Engine] Signal history cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AISignalEngine;
} else if (typeof window !== 'undefined') {
    window.AISignalEngine = AISignalEngine;
}