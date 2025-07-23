/**
 * Enhanced OTC Signal Generator
 * 
 * This module extends the OTCSignalGenerator with improved real-time data collection
 * and signal generation capabilities, ensuring reliable and accurate OTC trading signals.
 * 
 * Features:
 * - Multi-source data collection (browser automation, APIs, historical data)
 * - Real-time market data extraction via OCR and image processing
 * - Multi-timeframe analysis for improved accuracy
 * - Advanced pattern matching and technical analysis
 * - Strict data quality controls and validation
 */

const { OTCSignalGenerator } = require('./OTCSignalGenerator');
const { BrowserAutomation } = require('../automation/BrowserAutomation');
const { ChartDataExtractor } = require('../automation/ChartDataExtractor');
const { NextCandlePredictor } = require('./NextCandlePredictor');
const { createLogger } = require('../utils/logger-wrapper');
const fs = require('fs-extra');
const path = require('path');

class EnhancedOTCSignalGenerator extends OTCSignalGenerator {
    constructor(config = {}) {
        super(config);
        
        this.logger = createLogger('EnhancedOTCSignalGenerator');
        
        // Enhanced configuration with defaults
        this.config = {
            ...this.config,
            strictRealDataMode: process.env.STRICT_REAL_DATA_MODE === 'true' || false,
            forceRealData: process.env.FORCE_REAL_DATA === 'true' || false,
            enableMultiTimeframe: process.env.ENABLE_MULTI_TIMEFRAME === 'true' || true,
            minDataSources: parseInt(process.env.MIN_DATA_SOURCES || '2', 10),
            maxDataCollectionRetries: parseInt(process.env.MAX_DATA_COLLECTION_RETRIES || '3', 10),
            dataCollectionTimeout: parseInt(process.env.DATA_COLLECTION_TIMEOUT || '60000', 10),
            ...config
        };
        
        // Initialize browser automation and chart data extractor
        this.browserAutomation = new BrowserAutomation({
            headless: process.env.BROWSER_HEADLESS !== 'false',
            screenshotsDir: path.join(process.cwd(), 'data', 'screenshots', 'otc')
        });
        
        this.chartDataExtractor = new ChartDataExtractor({
            tempDir: path.join(process.cwd(), 'data', 'temp')
        });
        
        // Initialize next candle predictor
        this.nextCandlePredictor = new NextCandlePredictor({
            modelWeights: {
                momentum: 0.25,
                pattern: 0.25,
                indicator: 0.30,
                volatility: 0.20
            },
            minConfidenceThreshold: parseInt(process.env.MIN_PREDICTION_CONFIDENCE || '70', 10)
        });
        
        this.logger.info('Enhanced OTC Signal Generator initialized');
    }
    
    /**
     * Generate signal for OTC trading with enhanced real data collection
     * 
     * This method implements a sophisticated data collection strategy that prioritizes
     * real market data from multiple sources, with fallbacks to ensure reliable signal generation.
     * 
     * Data sources (in order of preference):
     * 1. Real-time browser automation (screen capture from broker platforms)
     * 2. Recent historical real data from database
     * 3. External financial APIs (Yahoo Finance, Alpha Vantage, Twelve Data)
     * 4. Any available historical data
     * 5. Simulated data (only as last resort and if not in strict mode)
     * 
     * @param {string|Object} pairOrOptions - Currency pair (e.g., 'EUR/USD') or options object
     * @param {string} [timeframe='5m'] - Target timeframe (e.g., '5m')
     * @param {Object} [options={}] - Additional options
     * @returns {Promise<Object>} - Complete signal with analysis
     */
    async generateSignal(pairOrOptions, timeframe = '5m', options = {}) {
        const startTime = Date.now();
        
        // Handle different parameter formats
        let pair, actualTimeframe, actualOptions;
        
        if (typeof pairOrOptions === 'object' && pairOrOptions !== null) {
            // New format: options object with pair/currencyPair property
            actualOptions = pairOrOptions;
            pair = pairOrOptions.pair || pairOrOptions.currencyPair;
            actualTimeframe = pairOrOptions.timeframe || timeframe;
        } else {
            // Old format: separate parameters
            pair = pairOrOptions;
            actualTimeframe = timeframe;
            actualOptions = options;
        }
        
        // Extract additional options with environment variable fallbacks
        const { 
            useRealData = this.config.forceRealData || false,
            forceBrowserAutomation = process.env.FORCE_BROWSER_AUTOMATION === 'true' || false,
            maxRetries = this.config.maxDataCollectionRetries,
            multiTimeframeAnalysis = this.config.enableMultiTimeframe,
            minConfidence = parseInt(process.env.MIN_SIGNAL_CONFIDENCE || '75', 10),
            platform = process.env.BROKER_PLATFORM || 'quotex',
            tradeDuration = actualOptions.tradeDuration || '3 minutes'
        } = actualOptions;
        
        if (!pair) {
            throw new Error('Currency pair is required');
        }
        
        const signalId = `OTC_${pair}_${actualTimeframe}_${Date.now()}`;
        this.logger.info(`🚀 Starting enhanced OTC signal generation for ${pair} ${actualTimeframe} (ID: ${signalId})`);
        
        try {
            // Phase 1: Data Collection
            this.logger.info('📡 Phase 1: Collecting OTC market data...');
            
            let marketData;
            let dataSource = 'unknown';
            let dataCollectionMethod = 'unknown';
            let retryCount = 0;
            let dataCollectionSuccess = false;
            
            // Data collection strategy based on configuration
            const strictRealDataMode = this.config.strictRealDataMode;
            
            // In strict real data mode, we only use browser automation or real external APIs
            if (strictRealDataMode) {
                this.logger.info('🔒 Operating in STRICT REAL DATA MODE - Only using real market data');
            }
            
            // Try different data collection methods in order of preference
            while (!dataCollectionSuccess && retryCount < maxRetries) {
                try {
                    retryCount++;
                    
                    // Strategy 1: Browser Automation (if forced or in strict mode)
                    if (forceBrowserAutomation || strictRealDataMode || retryCount === 1) {
                        try {
                            this.logger.info(`🤖 Attempt ${retryCount}: Using browser automation to collect real OTC data...`);
                            marketData = await this.collectRealOTCData(pair, actualTimeframe, {
                                platform,
                                multiTimeframeAnalysis,
                                maxRetries: 2 // Nested retries
                            });
                            
                            if (this.validateMarketData(marketData)) {
                                dataCollectionSuccess = true;
                                dataSource = 'browser-automation';
                                dataCollectionMethod = 'browser-automation';
                                this.logger.info('✅ Successfully collected real OTC data via browser automation');
                                break;
                            }
                        } catch (automationError) {
                            this.logger.error(`❌ Browser automation failed: ${automationError.message}`);
                            if (strictRealDataMode && retryCount >= maxRetries) {
                                throw new Error(`Failed to collect real OTC data in strict mode: ${automationError.message}`);
                            }
                        }
                    }
                    
                    // Strategy 2: Recent Historical Real Data
                    if (!dataCollectionSuccess && useRealData) {
                        try {
                            this.logger.info(`📊 Attempt ${retryCount}: Checking for recent real historical data...`);
                            const historicalData = await this.getHistoricalOTCData(pair, actualTimeframe);
                            
                            if (historicalData && historicalData.candles && 
                                historicalData.candles.length > 0 && 
                                historicalData.metadata && 
                                historicalData.metadata.source !== 'simulated') {
                                
                                // Check if data is recent enough (last 24 hours)
                                const isRecent = this.isDataRecent(historicalData, 24 * 60 * 60 * 1000);
                                
                                if (isRecent) {
                                    this.logger.info(`📊 Using recent real historical data from ${historicalData.metadata.source}`);
                                    marketData = this.formatHistoricalDataForPatternMatcher(historicalData, pair, actualTimeframe);
                                    dataCollectionSuccess = true;
                                    dataSource = historicalData.metadata.source;
                                    dataCollectionMethod = 'historical-database';
                                    break;
                                } else {
                                    this.logger.info('⚠️ Historical data found but it\'s not recent enough');
                                }
                            }
                        } catch (historicalError) {
                            this.logger.warn(`⚠️ Historical data check failed: ${historicalError.message}`);
                        }
                    }
                    
                    // Strategy 3: External Financial APIs
                    if (!dataCollectionSuccess) {
                        try {
                            this.logger.info(`📡 Attempt ${retryCount}: Fetching data from external financial APIs...`);
                            const externalData = await this.fetchExternalFinancialData(pair, actualTimeframe);
                            
                            if (externalData && externalData.candles && externalData.candles.length > 0) {
                                this.logger.info(`✅ Successfully fetched data from ${externalData.metadata.source}`);
                                marketData = externalData;
                                dataCollectionSuccess = true;
                                dataSource = externalData.metadata.source;
                                dataCollectionMethod = 'external-api';
                                
                                // Store for future use
                                await this.storeOTCData(pair, actualTimeframe, externalData);
                                break;
                            }
                        } catch (externalError) {
                            this.logger.warn(`⚠️ External API fetch failed: ${externalError.message}`);
                        }
                    }
                    
                    // Strategy 4: Any Historical Data (if not in strict mode)
                    if (!dataCollectionSuccess && !strictRealDataMode) {
                        try {
                            this.logger.info(`📚 Attempt ${retryCount}: Using any available historical data...`);
                            const historicalData = await this.getHistoricalOTCData(pair, actualTimeframe);
                            
                            if (historicalData && historicalData.candles && historicalData.candles.length > 0) {
                                this.logger.info(`📊 Using historical data (source: ${historicalData.metadata?.source || 'unknown'})`);
                                marketData = this.formatHistoricalDataForPatternMatcher(historicalData, pair, actualTimeframe);
                                dataCollectionSuccess = true;
                                dataSource = historicalData.metadata?.source || 'historical-database';
                                dataCollectionMethod = 'historical-database';
                                break;
                            }
                        } catch (anyHistoricalError) {
                            this.logger.warn(`⚠️ Historical data retrieval failed: ${anyHistoricalError.message}`);
                        }
                    }
                    
                    // If we reach here, all strategies failed for this attempt
                    if (retryCount < maxRetries) {
                        const waitTime = Math.min(10000, 1000 * Math.pow(2, retryCount));
                        this.logger.info(`⏳ Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                } catch (attemptError) {
                    this.logger.error(`❌ Data collection attempt ${retryCount} failed: ${attemptError.message}`);
                    
                    if (retryCount >= maxRetries) {
                        throw new Error(`All data collection attempts failed: ${attemptError.message}`);
                    }
                }
            }
            
            // STRICT MODE: No fallback to simulated data
            if (!dataCollectionSuccess) {
                throw new Error('Failed to collect real market data. No simulated data allowed in strict mode.');
            }
            
            // Validate market data
            if (!marketData || !this.validateMarketData(marketData)) {
                throw new Error('Unable to collect valid OTC market data');
            }
            
            // Phase 2: Multi-Timeframe Analysis (if enabled)
            if (multiTimeframeAnalysis && marketData.allTimeframes) {
                this.logger.info('📊 Phase 2: Performing multi-timeframe analysis...');
                marketData = await this.performMultiTimeframeAnalysis(marketData, pair);
            } else {
                this.logger.info('🔍 Phase 2: Finding matching historical patterns...');
                const patternMatches = await this.patternMatcher.findMatchingPatterns(
                    marketData,
                    pair,
                    this.normalizeTimeframe(actualTimeframe)
                );
                
                // Add pattern matches to market data
                marketData.patternMatches = patternMatches;
            }
            
            // Phase 3: Technical Indicator Analysis
            this.logger.info('📈 Phase 3: Analyzing technical indicators...');
            const indicatorAnalysis = await this.analyzeIndicators(marketData);
            
            // Phase 4: Signal Generation
            this.logger.info('🎯 Phase 4: Generating signal based on analysis...');
            const prediction = this.generatePrediction(marketData, indicatorAnalysis);
            
            // Phase 5: Signal Validation & Finalization
            this.logger.info('✅ Phase 5: Validating and finalizing signal...');
            const finalSignal = await this.validateAndFinalizeSignal(
                prediction,
                marketData.patternMatches || {},
                marketData,
                pair,
                actualTimeframe,
                {
                    indicatorAnalysis,
                    tradeDuration,
                    minConfidence
                }
            );
            
            // Phase 6: Next Candle Prediction
            this.logger.info('🔮 Phase 6: Predicting next candle...');
            let nextCandlePrediction = null;
            
            try {
                nextCandlePrediction = await this.predictNextCandle(marketData, {
                    includeProbabilityDistribution: true,
                    includeConfidenceIntervals: true,
                    detailedAnalysis: true
                });
                
                this.logger.info(`🔮 Next candle prediction: ${nextCandlePrediction.direction} with ${nextCandlePrediction.confidence}% confidence`);
            } catch (predictionError) {
                this.logger.warn(`⚠️ Next candle prediction failed: ${predictionError.message}`);
            }
            
            // Phase 7: Performance Tracking
            const processingTime = Date.now() - startTime;
            this.updatePerformanceStats(finalSignal, processingTime);
            
            // Add metadata about data source
            finalSignal.metadata = {
                ...finalSignal.metadata || {},
                source: dataSource,
                dataCollectionMethod,
                timestamp: Date.now(),
                processingTime,
                signalId
            };
            
            // Add next candle prediction to signal
            if (nextCandlePrediction) {
                finalSignal.nextCandle = {
                    prediction: nextCandlePrediction.direction,
                    confidence: nextCandlePrediction.confidence,
                    expectedMove: nextCandlePrediction.expectedMove,
                    details: {
                        open: nextCandlePrediction.nextCandle.open,
                        high: nextCandlePrediction.nextCandle.high,
                        low: nextCandlePrediction.nextCandle.low,
                        close: nextCandlePrediction.nextCandle.close
                    },
                    analysis: nextCandlePrediction.analysis?.text || null,
                    probabilityDistribution: nextCandlePrediction.probabilityDistribution || null
                };
            }
            
            // Log and return final signal
            this.logger.info(`🎯 Enhanced OTC Signal generated successfully in ${processingTime}ms with ${finalSignal.confidence}% confidence`);
            this.logger.info(`📊 Data source: ${dataSource}`);
            
            // Store signal for learning
            this.storeSignalForLearning(finalSignal, marketData, marketData.patternMatches || {});
            
            return finalSignal;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`❌ Enhanced OTC Signal generation failed for ${pair} ${actualTimeframe}: ${error.message}`);
            
            this.performance.totalSignals++;
            this.performance.dataSourceStats.failures++;
            
            return {
                pair,
                timeframe: actualTimeframe,
                direction: 'NO_SIGNAL',
                confidence: 0,
                riskScore: 'HIGH',
                reason: `OTC Signal generation failed: ${error.message}`,
                dataSourcesUsed: {
                    otc: 'FAILED',
                    historical: 'FAILED'
                },
                generatedAt: new Date().toISOString(),
                processingTime,
                error: error.message,
                signalId,
                mode: 'OTC'
            };
        }
    }
    
    /**
     * Check if data is recent enough
     * @param {Object} data - Historical data
     * @param {number} maxAge - Maximum age in milliseconds
     * @returns {boolean} - True if data is recent
     */
    isDataRecent(data, maxAge) {
        if (!data || !data.metadata || !data.metadata.timestamp) {
            return false;
        }
        
        const dataTimestamp = data.metadata.timestamp;
        const now = Date.now();
        
        return (now - dataTimestamp) < maxAge;
    }
    
    /**
     * Generate simulated market data
     * @param {string} pair - Currency pair
     * @param {string} timeframe - Timeframe
     * @returns {Promise<Object>} - Simulated market data
     */
    async generateSimulatedMarketData(pair, timeframe) {
        this.logger.info(`Generating simulated market data for ${pair} ${timeframe}`);
        
        // Generate simulated candles
        const candles = [];
        const normalizedTimeframe = this.normalizeTimeframe(timeframe);
        const timeframeMinutes = this.getTimeframeMinutes(normalizedTimeframe);
        const now = Date.now();
        
        // Generate base price based on currency pair
        let basePrice = 1.0550; // Default for EUR/USD
        
        if (pair.includes('GBP')) {
            basePrice = 1.2750;
        } else if (pair.includes('JPY')) {
            basePrice = 150.50;
        }
        
        // Generate 100 candles
        for (let i = 0; i < 100; i++) {
            const timestamp = now - (100 - i) * timeframeMinutes * 60 * 1000;
            
            // Generate random price movement
            const priceChange = (Math.random() - 0.5) * 0.0020;
            const open = basePrice + (Math.random() - 0.5) * 0.0050;
            const close = open + priceChange;
            const high = Math.max(open, close) + Math.random() * 0.0010;
            const low = Math.min(open, close) - Math.random() * 0.0010;
            
            // Update base price for next candle
            basePrice = close;
            
            candles.push({
                timestamp,
                open,
                high,
                low,
                close,
                volume: Math.floor(Math.random() * 100) + 50
            });
        }
        
        // Create market data structure
        return {
            pair,
            timeframe: normalizedTimeframe,
            candles,
            realtime: {
                [normalizedTimeframe]: candles
            },
            combined: {
                [normalizedTimeframe]: candles
            },
            metadata: {
                source: 'simulated',
                timestamp: now
            }
        };
    }
    
    /**
     * Perform multi-timeframe analysis
     * @param {Object} marketData - Market data with multiple timeframes
     * @param {string} pair - Currency pair
     * @returns {Promise<Object>} - Enhanced market data with multi-timeframe analysis
     */
    async performMultiTimeframeAnalysis(marketData, pair) {
        this.logger.info('Performing multi-timeframe analysis...');
        
        const allTimeframes = marketData.allTimeframes || {};
        const timeframes = Object.keys(allTimeframes);
        
        if (timeframes.length <= 1) {
            this.logger.warn('Not enough timeframes for multi-timeframe analysis');
            
            // Fallback to single timeframe analysis
            const patternMatches = await this.patternMatcher.findMatchingPatterns(
                marketData,
                pair,
                this.normalizeTimeframe(marketData.timeframe)
            );
            
            marketData.patternMatches = patternMatches;
            return marketData;
        }
        
        // Analyze each timeframe
        const timeframeAnalyses = {};
        
        for (const tf of timeframes) {
            try {
                this.logger.info(`Analyzing timeframe ${tf}...`);
                
                // Create single timeframe data
                const tfData = {
                    pair,
                    timeframe: tf,
                    candles: allTimeframes[tf].candles,
                    realtime: {
                        [tf]: allTimeframes[tf].candles
                    },
                    combined: {
                        [tf]: allTimeframes[tf].candles
                    },
                    indicators: allTimeframes[tf].indicators || {},
                    metadata: marketData.metadata
                };
                
                // Find pattern matches for this timeframe
                const patternMatches = await this.patternMatcher.findMatchingPatterns(
                    tfData,
                    pair,
                    this.normalizeTimeframe(tf)
                );
                
                // Store analysis
                timeframeAnalyses[tf] = {
                    patternMatches,
                    indicators: allTimeframes[tf].indicators || {},
                    prediction: patternMatches.prediction || {}
                };
            } catch (error) {
                this.logger.warn(`Error analyzing timeframe ${tf}: ${error.message}`);
            }
        }
        
        // Combine analyses into a consensus
        const consensus = this.generateMultiTimeframeConsensus(timeframeAnalyses);
        
        // Add analyses to market data
        marketData.timeframeAnalyses = timeframeAnalyses;
        marketData.consensus = consensus;
        marketData.patternMatches = consensus.patternMatches;
        
        return marketData;
    }
    
    /**
     * Generate consensus from multi-timeframe analyses
     * @param {Object} timeframeAnalyses - Analyses for each timeframe
     * @returns {Object} - Consensus analysis
     */
    generateMultiTimeframeConsensus(timeframeAnalyses) {
        this.logger.info('Generating multi-timeframe consensus...');
        
        const timeframes = Object.keys(timeframeAnalyses);
        
        if (timeframes.length === 0) {
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                reasoning: ['No timeframe analyses available']
            };
        }
        
        // Count signals by direction
        const directionCounts = {
            'UP': 0,
            'DOWN': 0,
            'NO_SIGNAL': 0
        };
        
        // Track confidence by direction
        const directionConfidences = {
            'UP': [],
            'DOWN': [],
            'NO_SIGNAL': []
        };
        
        // Track reasoning
        const reasoning = [];
        
        // Analyze each timeframe
        for (const tf of timeframes) {
            const analysis = timeframeAnalyses[tf];
            
            if (!analysis || !analysis.prediction) {
                continue;
            }
            
            const direction = analysis.prediction.direction || 'NO_SIGNAL';
            const confidence = analysis.prediction.confidence || 0;
            
            directionCounts[direction]++;
            directionConfidences[direction].push(confidence);
            
            reasoning.push(`${tf}: ${direction} (${confidence}% confidence)`);
        }
        
        // Determine consensus direction
        let consensusDirection = 'NO_SIGNAL';
        let consensusConfidence = 0;
        
        if (directionCounts['UP'] > directionCounts['DOWN']) {
            consensusDirection = 'UP';
            consensusConfidence = this.calculateAverageConfidence(directionConfidences['UP']);
        } else if (directionCounts['DOWN'] > directionCounts['UP']) {
            consensusDirection = 'DOWN';
            consensusConfidence = this.calculateAverageConfidence(directionConfidences['DOWN']);
        } else if (directionCounts['UP'] > 0) {
            // Tie between UP and DOWN, use the one with higher average confidence
            const upConfidence = this.calculateAverageConfidence(directionConfidences['UP']);
            const downConfidence = this.calculateAverageConfidence(directionConfidences['DOWN']);
            
            if (upConfidence > downConfidence) {
                consensusDirection = 'UP';
                consensusConfidence = upConfidence;
            } else {
                consensusDirection = 'DOWN';
                consensusConfidence = downConfidence;
            }
        }
        
        // Add consensus reasoning
        reasoning.push(`Consensus: ${consensusDirection} (${consensusConfidence}% confidence)`);
        reasoning.push(`UP signals: ${directionCounts['UP']}, DOWN signals: ${directionCounts['DOWN']}`);
        
        // Create consensus object
        return {
            direction: consensusDirection,
            confidence: consensusConfidence,
            reasoning,
            directionCounts,
            timeframes: timeframes.length,
            patternMatches: {
                prediction: {
                    direction: consensusDirection,
                    confidence: consensusConfidence
                },
                reasoning
            }
        };
    }
    
    /**
     * Calculate average confidence
     * @param {Array<number>} confidences - Array of confidence values
     * @returns {number} - Average confidence
     */
    calculateAverageConfidence(confidences) {
        if (!confidences || confidences.length === 0) {
            return 0;
        }
        
        const sum = confidences.reduce((total, confidence) => total + confidence, 0);
        return Math.round(sum / confidences.length);
    }
    
    /**
     * Analyze technical indicators
     * @param {Object} marketData - Market data
     * @returns {Promise<Object>} - Indicator analysis
     */
    async analyzeIndicators(marketData) {
        try {
            this.logger.info('Analyzing technical indicators...');
            
            const candles = marketData.candles || [];
            
            if (candles.length < 10) {
                this.logger.warn('Not enough candles for indicator analysis');
                return {
                    signals: {},
                    overall: {
                        direction: 'NO_SIGNAL',
                        confidence: 0
                    }
                };
            }
            
            // Extract indicator data if available
            const indicators = marketData.indicators || {};
            
            // Calculate indicators if not available
            if (Object.keys(indicators).length === 0) {
                this.logger.info('No indicators found in market data, calculating...');
                
                // Calculate RSI
                const rsi = this.calculateRSI(candles, 14);
                indicators.rsi = rsi;
                
                // Calculate MACD
                const macd = this.calculateMACD(candles);
                indicators.macd = macd;
                
                // Calculate Bollinger Bands
                const bollinger = this.calculateBollingerBands(candles, 20, 2);
                indicators.bollinger = bollinger;
            }
            
            // Analyze indicators
            const rsiSignal = this.analyzeRSI(indicators.rsi);
            const macdSignal = this.analyzeMACD(indicators.macd);
            const bollingerSignal = this.analyzeBollingerBands(indicators.bollinger, candles);
            
            // Combine signals
            const signals = {
                rsi: rsiSignal,
                macd: macdSignal,
                bollinger: bollingerSignal
            };
            
            // Generate overall signal
            const overall = this.combineIndicatorSignals(signals);
            
            return {
                signals,
                overall
            };
        } catch (error) {
            this.logger.error(`Error analyzing indicators: ${error.message}`);
            return {
                signals: {},
                overall: {
                    direction: 'NO_SIGNAL',
                    confidence: 0,
                    error: error.message
                }
            };
        }
    }
    
    /**
     * Calculate RSI
     * @param {Array} candles - Candlestick data
     * @param {number} period - RSI period
     * @returns {Array} - RSI values
     */
    calculateRSI(candles, period = 14) {
        if (candles.length < period + 1) {
            return [];
        }
        
        const closes = candles.map(candle => candle.close);
        const rsi = [];
        
        // Calculate price changes
        const changes = [];
        for (let i = 1; i < closes.length; i++) {
            changes.push(closes[i] - closes[i - 1]);
        }
        
        // Calculate RSI
        for (let i = period; i < changes.length + 1; i++) {
            const periodChanges = changes.slice(i - period, i);
            
            // Calculate gains and losses
            const gains = periodChanges.filter(change => change > 0);
            const losses = periodChanges.filter(change => change < 0).map(change => Math.abs(change));
            
            // Calculate average gain and loss
            const avgGain = gains.length > 0 ? gains.reduce((sum, gain) => sum + gain, 0) / period : 0;
            const avgLoss = losses.length > 0 ? losses.reduce((sum, loss) => sum + loss, 0) / period : 0;
            
            // Calculate RS and RSI
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
     * Calculate MACD
     * @param {Array} candles - Candlestick data
     * @returns {Object} - MACD values
     */
    calculateMACD(candles) {
        if (candles.length < 26) {
            return { macd: [], signal: [], histogram: [] };
        }
        
        const closes = candles.map(candle => candle.close);
        
        // Calculate EMAs
        const ema12 = this.calculateEMA(closes, 12);
        const ema26 = this.calculateEMA(closes, 26);
        
        // Calculate MACD line
        const macdLine = [];
        for (let i = 0; i < ema12.length && i < ema26.length; i++) {
            macdLine.push(ema12[i] - ema26[i]);
        }
        
        // Calculate signal line (9-day EMA of MACD line)
        const signalLine = this.calculateEMA(macdLine, 9);
        
        // Calculate histogram
        const histogram = [];
        for (let i = 0; i < macdLine.length && i < signalLine.length; i++) {
            histogram.push(macdLine[i] - signalLine[i]);
        }
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram
        };
    }
    
    /**
     * Calculate EMA
     * @param {Array} data - Price data
     * @param {number} period - EMA period
     * @returns {Array} - EMA values
     */
    calculateEMA(data, period) {
        if (data.length < period) {
            return [];
        }
        
        const k = 2 / (period + 1);
        const ema = [];
        
        // Initialize EMA with SMA
        let sma = 0;
        for (let i = 0; i < period; i++) {
            sma += data[i];
        }
        sma /= period;
        ema.push(sma);
        
        // Calculate EMA
        for (let i = period; i < data.length; i++) {
            ema.push(data[i] * k + ema[ema.length - 1] * (1 - k));
        }
        
        return ema;
    }
    
    /**
     * Calculate Bollinger Bands
     * @param {Array} candles - Candlestick data
     * @param {number} period - Bollinger Bands period
     * @param {number} stdDev - Standard deviation multiplier
     * @returns {Object} - Bollinger Bands values
     */
    calculateBollingerBands(candles, period = 20, stdDev = 2) {
        if (candles.length < period) {
            return { upper: [], middle: [], lower: [] };
        }
        
        const closes = candles.map(candle => candle.close);
        const upper = [];
        const middle = [];
        const lower = [];
        
        // Calculate Bollinger Bands
        for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            
            // Calculate SMA
            const sma = slice.reduce((sum, price) => sum + price, 0) / period;
            
            // Calculate standard deviation
            const squaredDiffs = slice.map(price => Math.pow(price - sma, 2));
            const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
            const sd = Math.sqrt(variance);
            
            // Calculate bands
            middle.push(sma);
            upper.push(sma + stdDev * sd);
            lower.push(sma - stdDev * sd);
        }
        
        return {
            upper,
            middle,
            lower
        };
    }
    
    /**
     * Analyze RSI
     * @param {Array} rsi - RSI values
     * @returns {Object} - RSI signal
     */
    analyzeRSI(rsi) {
        if (!rsi || rsi.length === 0) {
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                value: null
            };
        }
        
        const currentRSI = rsi[rsi.length - 1];
        let direction = 'NO_SIGNAL';
        let confidence = 0;
        
        // Oversold condition (RSI < 30)
        if (currentRSI < 30) {
            direction = 'UP';
            confidence = 70 + (30 - currentRSI); // Higher confidence the more oversold
        }
        // Overbought condition (RSI > 70)
        else if (currentRSI > 70) {
            direction = 'DOWN';
            confidence = 70 + (currentRSI - 70); // Higher confidence the more overbought
        }
        // Neutral zone with slight bias
        else {
            if (currentRSI < 45) {
                direction = 'UP';
                confidence = 50 + (45 - currentRSI);
            } else if (currentRSI > 55) {
                direction = 'DOWN';
                confidence = 50 + (currentRSI - 55);
            } else {
                direction = 'NO_SIGNAL';
                confidence = 0;
            }
        }
        
        // Cap confidence at 95
        confidence = Math.min(95, confidence);
        
        return {
            direction,
            confidence,
            value: currentRSI
        };
    }
    
    /**
     * Analyze MACD
     * @param {Object} macd - MACD values
     * @returns {Object} - MACD signal
     */
    analyzeMACD(macd) {
        if (!macd || !macd.macd || !macd.signal || !macd.histogram || 
            macd.macd.length === 0 || macd.signal.length === 0 || macd.histogram.length === 0) {
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                value: null
            };
        }
        
        const currentMACD = macd.macd[macd.macd.length - 1];
        const currentSignal = macd.signal[macd.signal.length - 1];
        const currentHistogram = macd.histogram[macd.histogram.length - 1];
        const previousHistogram = macd.histogram.length > 1 ? macd.histogram[macd.histogram.length - 2] : 0;
        
        let direction = 'NO_SIGNAL';
        let confidence = 0;
        
        // MACD line crosses above signal line (bullish)
        if (currentMACD > currentSignal && currentHistogram > 0 && previousHistogram <= 0) {
            direction = 'UP';
            confidence = 80;
        }
        // MACD line crosses below signal line (bearish)
        else if (currentMACD < currentSignal && currentHistogram < 0 && previousHistogram >= 0) {
            direction = 'DOWN';
            confidence = 80;
        }
        // MACD line above signal line (bullish)
        else if (currentMACD > currentSignal) {
            direction = 'UP';
            confidence = 60 + Math.min(20, Math.abs(currentHistogram) * 100);
        }
        // MACD line below signal line (bearish)
        else if (currentMACD < currentSignal) {
            direction = 'DOWN';
            confidence = 60 + Math.min(20, Math.abs(currentHistogram) * 100);
        }
        
        // Cap confidence at 95
        confidence = Math.min(95, confidence);
        
        return {
            direction,
            confidence,
            value: {
                macd: currentMACD,
                signal: currentSignal,
                histogram: currentHistogram
            }
        };
    }
    
    /**
     * Analyze Bollinger Bands
     * @param {Object} bollinger - Bollinger Bands values
     * @param {Array} candles - Candlestick data
     * @returns {Object} - Bollinger Bands signal
     */
    analyzeBollingerBands(bollinger, candles) {
        if (!bollinger || !bollinger.upper || !bollinger.middle || !bollinger.lower || 
            bollinger.upper.length === 0 || bollinger.middle.length === 0 || bollinger.lower.length === 0 ||
            !candles || candles.length === 0) {
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                value: null
            };
        }
        
        const currentUpper = bollinger.upper[bollinger.upper.length - 1];
        const currentMiddle = bollinger.middle[bollinger.middle.length - 1];
        const currentLower = bollinger.lower[bollinger.lower.length - 1];
        const currentClose = candles[candles.length - 1].close;
        
        let direction = 'NO_SIGNAL';
        let confidence = 0;
        
        // Price near or below lower band (potential buy)
        if (currentClose <= currentLower * 1.01) {
            direction = 'UP';
            confidence = 70 + Math.min(25, (currentLower - currentClose) / currentLower * 1000);
        }
        // Price near or above upper band (potential sell)
        else if (currentClose >= currentUpper * 0.99) {
            direction = 'DOWN';
            confidence = 70 + Math.min(25, (currentClose - currentUpper) / currentUpper * 1000);
        }
        // Price closer to upper band than middle band
        else if (currentClose > currentMiddle && currentClose < currentUpper) {
            direction = 'DOWN';
            confidence = 50 + (currentClose - currentMiddle) / (currentUpper - currentMiddle) * 20;
        }
        // Price closer to lower band than middle band
        else if (currentClose < currentMiddle && currentClose > currentLower) {
            direction = 'UP';
            confidence = 50 + (currentMiddle - currentClose) / (currentMiddle - currentLower) * 20;
        }
        
        // Cap confidence at 95
        confidence = Math.min(95, confidence);
        
        return {
            direction,
            confidence,
            value: {
                upper: currentUpper,
                middle: currentMiddle,
                lower: currentLower,
                price: currentClose
            }
        };
    }
    
    /**
     * Combine indicator signals
     * @param {Object} signals - Indicator signals
     * @returns {Object} - Combined signal
     */
    combineIndicatorSignals(signals) {
        const directions = {
            'UP': 0,
            'DOWN': 0,
            'NO_SIGNAL': 0
        };
        
        const confidences = {
            'UP': [],
            'DOWN': [],
            'NO_SIGNAL': []
        };
        
        // Count signals by direction and track confidences
        for (const indicator in signals) {
            const signal = signals[indicator];
            
            if (signal && signal.direction) {
                directions[signal.direction]++;
                confidences[signal.direction].push(signal.confidence);
            }
        }
        
        // Determine overall direction
        let overallDirection = 'NO_SIGNAL';
        let overallConfidence = 0;
        
        if (directions['UP'] > directions['DOWN']) {
            overallDirection = 'UP';
            overallConfidence = this.calculateAverageConfidence(confidences['UP']);
        } else if (directions['DOWN'] > directions['UP']) {
            overallDirection = 'DOWN';
            overallConfidence = this.calculateAverageConfidence(confidences['DOWN']);
        } else if (directions['UP'] > 0) {
            // Tie between UP and DOWN, use the one with higher average confidence
            const upConfidence = this.calculateAverageConfidence(confidences['UP']);
            const downConfidence = this.calculateAverageConfidence(confidences['DOWN']);
            
            if (upConfidence > downConfidence) {
                overallDirection = 'UP';
                overallConfidence = upConfidence;
            } else {
                overallDirection = 'DOWN';
                overallConfidence = downConfidence;
            }
        }
        
        return {
            direction: overallDirection,
            confidence: overallConfidence,
            counts: directions
        };
    }
    
    /**
     * Generate prediction based on market data and indicator analysis
     * @param {Object} marketData - Market data
     * @param {Object} indicatorAnalysis - Indicator analysis
     * @returns {Object} - Prediction
     */
    generatePrediction(marketData, indicatorAnalysis) {
        this.logger.info('Generating prediction...');
        
        // Get pattern prediction if available
        const patternPrediction = marketData.patternMatches?.prediction || 
                                 marketData.consensus?.direction ? {
                                     direction: marketData.consensus.direction,
                                     confidence: marketData.consensus.confidence
                                 } : null;
        
        // Get indicator prediction
        const indicatorPrediction = indicatorAnalysis?.overall || null;
        
        // If we have both predictions, combine them
        if (patternPrediction && indicatorPrediction && 
            patternPrediction.direction !== 'NO_SIGNAL' && 
            indicatorPrediction.direction !== 'NO_SIGNAL') {
            
            // If directions agree, boost confidence
            if (patternPrediction.direction === indicatorPrediction.direction) {
                const combinedConfidence = Math.min(95, 
                    (patternPrediction.confidence + indicatorPrediction.confidence) / 2 + 10);
                
                return {
                    direction: patternPrediction.direction,
                    confidence: combinedConfidence,
                    agreement: 'full',
                    reasoning: [
                        `Pattern analysis: ${patternPrediction.direction} (${patternPrediction.confidence}%)`,
                        `Indicator analysis: ${indicatorPrediction.direction} (${indicatorPrediction.confidence}%)`,
                        `Full agreement between pattern and indicator analysis`
                    ]
                };
            } 
            // If directions disagree, use the one with higher confidence
            else {
                const usePattern = patternPrediction.confidence >= indicatorPrediction.confidence;
                const selectedPrediction = usePattern ? patternPrediction : indicatorPrediction;
                
                // Reduce confidence due to disagreement
                const reducedConfidence = Math.max(50, selectedPrediction.confidence - 15);
                
                return {
                    direction: selectedPrediction.direction,
                    confidence: reducedConfidence,
                    agreement: 'conflict',
                    reasoning: [
                        `Pattern analysis: ${patternPrediction.direction} (${patternPrediction.confidence}%)`,
                        `Indicator analysis: ${indicatorPrediction.direction} (${indicatorPrediction.confidence}%)`,
                        `Conflict between pattern and indicator analysis`,
                        `Using ${usePattern ? 'pattern' : 'indicator'} analysis due to higher confidence`
                    ]
                };
            }
        }
        // If we only have pattern prediction
        else if (patternPrediction && patternPrediction.direction !== 'NO_SIGNAL') {
            return {
                direction: patternPrediction.direction,
                confidence: patternPrediction.confidence,
                agreement: 'pattern-only',
                reasoning: [
                    `Pattern analysis: ${patternPrediction.direction} (${patternPrediction.confidence}%)`,
                    `No valid indicator analysis available`
                ]
            };
        }
        // If we only have indicator prediction
        else if (indicatorPrediction && indicatorPrediction.direction !== 'NO_SIGNAL') {
            return {
                direction: indicatorPrediction.direction,
                confidence: indicatorPrediction.confidence,
                agreement: 'indicator-only',
                reasoning: [
                    `Indicator analysis: ${indicatorPrediction.direction} (${indicatorPrediction.confidence}%)`,
                    `No valid pattern analysis available`
                ]
            };
        }
        // No valid predictions
        else {
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                agreement: 'none',
                reasoning: [
                    `No valid pattern or indicator analysis available`
                ]
            };
        }
    }
    
    /**
     * Validate and finalize signal
     * @param {Object} prediction - Prediction
     * @param {Object} patternMatches - Pattern matches
     * @param {Object} marketData - Market data
     * @param {string} pair - Currency pair
     * @param {string} timeframe - Timeframe
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Final signal
     */
    async validateAndFinalizeSignal(prediction, patternMatches, marketData, pair, timeframe, options = {}) {
        this.logger.info('Validating and finalizing signal...');
        
        const {
            indicatorAnalysis,
            tradeDuration,
            minConfidence = 75
        } = options;
        
        // Default signal
        let finalSignal = {
            pair,
            timeframe,
            direction: 'NO_SIGNAL',
            confidence: 0,
            riskScore: 'HIGH',
            reason: 'Insufficient confidence',
            dataSourcesUsed: {
                otc: marketData.metadata?.source || 'unknown',
                historical: patternMatches.source || 'unknown'
            },
            generatedAt: new Date().toISOString(),
            tradeDuration: tradeDuration || '3 minutes'
        };
        
        // Check if prediction meets minimum confidence
        if (prediction && prediction.direction !== 'NO_SIGNAL' && prediction.confidence >= minConfidence) {
            finalSignal = {
                ...finalSignal,
                direction: prediction.direction,
                confidence: prediction.confidence,
                riskScore: this.calculateRiskScore(prediction.confidence),
                reason: `${prediction.direction} signal with ${prediction.confidence}% confidence`,
                reasoning: prediction.reasoning || []
            };
        } else if (prediction && prediction.direction !== 'NO_SIGNAL') {
            finalSignal = {
                ...finalSignal,
                direction: 'NO_SIGNAL',
                confidence: prediction.confidence,
                riskScore: 'HIGH',
                reason: `Insufficient confidence (${prediction.confidence}% < ${minConfidence}%)`,
                reasoning: prediction.reasoning || []
            };
        }
        
        // Add additional metadata
        finalSignal.metadata = {
            ...finalSignal.metadata,
            patternMatchCount: patternMatches.matches?.length || 0,
            indicatorCount: indicatorAnalysis ? Object.keys(indicatorAnalysis.signals || {}).length : 0,
            predictionAgreement: prediction?.agreement || 'none',
            dataSource: marketData.metadata?.source || 'unknown',
            timestamp: Date.now()
        };
        
        return finalSignal;
    }
    
    /**
     * Calculate risk score based on confidence
     * @param {number} confidence - Signal confidence
     * @returns {string} - Risk score
     */
    calculateRiskScore(confidence) {
        if (confidence >= 90) {
            return 'VERY_LOW';
        } else if (confidence >= 80) {
            return 'LOW';
        } else if (confidence >= 70) {
            return 'MEDIUM';
        } else if (confidence >= 60) {
            return 'HIGH';
        } else {
            return 'VERY_HIGH';
        }
    }
    
    /**
     * Predict the next candle with high accuracy
     * @param {Object} marketData - Market data with candles and indicators
     * @param {Object} options - Prediction options
     * @returns {Promise<Object>} - Next candle prediction
     */
    async predictNextCandle(marketData, options = {}) {
        try {
            this.logger.info('Predicting next candle with high accuracy...');
            
            const {
                includeProbabilityDistribution = true,
                includeConfidenceIntervals = true,
                detailedAnalysis = true
            } = options;
            
            // Validate market data
            if (!this.validateMarketData(marketData)) {
                throw new Error('Invalid market data for next candle prediction');
            }
            
            // Use the NextCandlePredictor to predict the next candle
            const prediction = await this.nextCandlePredictor.predictNextCandle(marketData, {
                pair: marketData.pair,
                timeframe: marketData.timeframe,
                includeProbabilityDistribution,
                includeConfidenceIntervals,
                detailedAnalysis
            });
            
            // Add signal information to prediction
            if (marketData.patternMatches && marketData.patternMatches.prediction) {
                prediction.signal = {
                    direction: marketData.patternMatches.prediction.direction,
                    confidence: marketData.patternMatches.prediction.confidence,
                    reasoning: marketData.patternMatches.reasoning || []
                };
            }
            
            // Add metadata
            prediction.metadata = {
                ...prediction.metadata || {},
                source: marketData.metadata?.source || 'unknown',
                dataCollectionMethod: marketData.metadata?.dataCollectionMethod || 'unknown',
                timestamp: Date.now(),
                generatedBy: 'EnhancedOTCSignalGenerator'
            };
            
            this.logger.info(`Next candle prediction: ${prediction.direction} with ${prediction.confidence}% confidence`);
            return prediction;
        } catch (error) {
            this.logger.error(`Failed to predict next candle: ${error.message}`);
            throw error;
        }
    }
}

module.exports = { EnhancedOTCSignalGenerator };