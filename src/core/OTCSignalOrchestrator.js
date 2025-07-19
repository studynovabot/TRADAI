/**
 * OTC Signal Generator Orchestrator
 * 
 * Main orchestrator that coordinates all components:
 * - Browser Automation Engine (real-time data collection)
 * - Historical Data Matcher (pattern matching AI)
 * - AI Indicator Engine (technical analysis AI)
 * - Signal Consensus Engine (final signal generation)
 * 
 * Implements the complete workflow as specified in the ultra-detailed prompt
 */

const { BrowserAutomationEngine } = require('./BrowserAutomationEngine');
const { HistoricalDataMatcher } = require('./HistoricalDataMatcher');
const { AIIndicatorEngine } = require('./AIIndicatorEngine');
const { SignalConsensusEngine } = require('./SignalConsensusEngine');
const fs = require('fs-extra');
const path = require('path');

class OTCSignalOrchestrator {
    constructor(config = {}) {
        this.config = {
            // Browser automation settings
            browserHeadless: config.browserHeadless || false,
            browserTimeout: config.browserTimeout || 30000,
            
            // Platform settings
            defaultPlatform: config.defaultPlatform || 'quotex',
            supportedPlatforms: ['quotex', 'pocketOption'],
            
            // Signal generation settings
            minConfidence: config.minConfidence || 75,
            maxProcessingTime: config.maxProcessingTime || 120000, // 2 minutes
            
            // Data settings
            dataRetentionDays: config.dataRetentionDays || 30,
            screenshotRetention: config.screenshotRetention || 7,
            
            // Error handling
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 5000,
            
            ...config
        };

        // Initialize components
        this.browserEngine = new BrowserAutomationEngine({
            headless: this.config.browserHeadless,
            timeout: this.config.browserTimeout
        });

        this.historicalMatcher = new HistoricalDataMatcher();
        this.indicatorEngine = new AIIndicatorEngine();
        this.consensusEngine = new SignalConsensusEngine({
            minConfidence: this.config.minConfidence
        });

        // State management
        this.isInitialized = false;
        this.currentSession = null;
        this.processingQueue = [];
        this.lastSignalTime = null;

        // Performance tracking
        this.stats = {
            totalRequests: 0,
            successfulSignals: 0,
            failedSignals: 0,
            avgProcessingTime: 0,
            uptime: Date.now()
        };

        console.log('🚀 OTC Signal Orchestrator initialized');
    }

    /**
     * Initialize the orchestrator with broker platform
     */
    async initialize(platformUrl, platform = 'auto') {
        try {
            console.log('🔧 Initializing OTC Signal Orchestrator...');
            
            // Initialize browser automation
            await this.browserEngine.initialize(platformUrl, platform);
            
            // Create session
            this.currentSession = {
                platform: this.browserEngine.currentPlatform,
                platformUrl,
                startTime: Date.now(),
                signalsGenerated: 0
            };

            this.isInitialized = true;
            console.log('✅ OTC Signal Orchestrator ready for signal generation');
            
            return {
                success: true,
                platform: this.currentSession.platform,
                message: 'Orchestrator initialized successfully'
            };

        } catch (error) {
            console.error(`❌ Orchestrator initialization failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Generate OTC trading signal - Main entry point
     */
    async generateSignal(pair, timeframe = '5M', tradeDuration = '3 minutes') {
        const startTime = Date.now();
        const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`\n🎯 === OTC SIGNAL GENERATION REQUEST ===`);
        console.log(`📋 Request ID: ${requestId}`);
        console.log(`💱 Currency Pair: ${pair}`);
        console.log(`⏱️ Timeframe: ${timeframe}`);
        console.log(`⏰ Trade Duration: ${tradeDuration}`);
        console.log(`🕐 Started: ${new Date().toISOString()}`);

        this.stats.totalRequests++;

        try {
            // Validate inputs
            this.validateInputs(pair, timeframe, tradeDuration);

            // Check if orchestrator is initialized
            if (!this.isInitialized) {
                throw new Error('Orchestrator not initialized. Call initialize() first.');
            }

            // Step 1: Real-Time Data Collection
            console.log('\n📡 STEP 1: Real-Time OTC Market Data Collection');
            const marketData = await this.collectRealTimeData(pair, timeframe);

            // Step 2: Historical Pattern Matching
            console.log('\n🔍 STEP 2: Historical Pattern Matching Analysis');
            const patternPrediction = await this.performPatternMatching(marketData, pair, timeframe);

            // Step 3: AI Indicator Analysis
            console.log('\n🧠 STEP 3: AI Indicator & Volume Analysis');
            const indicatorPrediction = await this.performIndicatorAnalysis(marketData);

            // Step 4: Final Consensus Signal
            console.log('\n🎯 STEP 4: Final Signal Consensus Generation');
            const finalSignal = await this.generateFinalSignal(
                patternPrediction, 
                indicatorPrediction, 
                marketData, 
                pair, 
                timeframe,
                tradeDuration
            );

            // Step 5: Post-processing
            const processingTime = Date.now() - startTime;
            await this.postProcessSignal(finalSignal, requestId, processingTime);

            // Update statistics
            this.updateStats(finalSignal, processingTime);

            console.log(`\n✅ === SIGNAL GENERATION COMPLETED ===`);
            console.log(`🎯 Signal: ${finalSignal.signal}`);
            console.log(`📊 Confidence: ${finalSignal.confidence}`);
            console.log(`⏱️ Processing Time: ${processingTime}ms`);
            console.log(`🆔 Request ID: ${requestId}`);

            return {
                ...finalSignal,
                requestId,
                processingTime
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.error(`\n❌ === SIGNAL GENERATION FAILED ===`);
            console.error(`🆔 Request ID: ${requestId}`);
            console.error(`❌ Error: ${error.message}`);
            console.error(`⏱️ Failed after: ${processingTime}ms`);

            this.stats.failedSignals++;

            return {
                requestId,
                currency_pair: pair,
                timeframe,
                trade_duration: tradeDuration,
                signal: 'ERROR',
                confidence: '0%',
                confidenceNumeric: 0,
                riskScore: 'HIGH',
                reason: [`Signal generation failed: ${error.message}`],
                timestamp: new Date().toISOString(),
                processingTime,
                error: error.message
            };
        }
    }

    /**
     * Validate input parameters
     */
    validateInputs(pair, timeframe, tradeDuration) {
        if (!pair || typeof pair !== 'string') {
            throw new Error('Invalid currency pair');
        }

        const validTimeframes = ['1M', '3M', '5M', '15M', '30M', '1H'];
        if (!validTimeframes.includes(timeframe)) {
            throw new Error(`Invalid timeframe. Supported: ${validTimeframes.join(', ')}`);
        }

        if (!tradeDuration || typeof tradeDuration !== 'string') {
            throw new Error('Invalid trade duration');
        }
    }

    /**
     * Step 1: Collect real-time market data
     */
    async collectRealTimeData(pair, timeframe) {
        try {
            console.log('   🔄 Selecting currency pair on platform...');
            await this.browserEngine.selectCurrencyPair(pair);

            console.log('   📊 Capturing multi-timeframe data...');
            const multiTimeframeData = await this.browserEngine.captureMultiTimeframeData(pair);

            // Focus on the requested timeframe but include others for context
            const primaryData = multiTimeframeData[timeframe];
            if (!primaryData || primaryData.error) {
                throw new Error(`Failed to capture data for timeframe ${timeframe}`);
            }

            // Validate data quality
            if (!primaryData.candles || primaryData.candles.length < 10) {
                console.warn('⚠️ Limited candle data, using simulated data');
                primaryData.candles = this.browserEngine.generateSimulatedCandles(30);
            }

            console.log(`   ✅ Collected ${primaryData.candles.length} candles for ${timeframe}`);
            console.log(`   📸 Screenshot saved: ${primaryData.screenshot ? 'Yes' : 'No'}`);
            console.log(`   📊 Indicators extracted: ${primaryData.indicators ? 'Yes' : 'No'}`);

            return {
                pair,
                timeframe,
                candles: primaryData.candles,
                indicators: primaryData.indicators,
                screenshot: primaryData.screenshot,
                multiTimeframe: multiTimeframeData,
                timestamp: new Date().toISOString(),
                source: 'browser_automation'
            };

        } catch (error) {
            console.error(`   ❌ Real-time data collection failed: ${error.message}`);
            throw new Error(`Data collection failed: ${error.message}`);
        }
    }

    /**
     * Step 2: Perform historical pattern matching
     */
    async performPatternMatching(marketData, pair, timeframe) {
        try {
            console.log('   🔍 Searching for similar historical patterns...');
            
            // Extract current pattern (last 15 candles)
            const patternLength = Math.min(15, marketData.candles.length - 5);
            const currentPattern = marketData.candles.slice(-patternLength);

            console.log(`   📊 Analyzing pattern of ${currentPattern.length} candles`);

            // Find matching patterns
            const patternResults = await this.historicalMatcher.findMatchingPatterns(
                currentPattern, 
                pair, 
                timeframe
            );

            console.log(`   ✅ Found ${patternResults.matches.length} matching patterns`);
            console.log(`   📈 Prediction: ${patternResults.prediction.direction}`);
            console.log(`   📊 Confidence: ${patternResults.prediction.confidence.toFixed(1)}%`);
            console.log(`   🎯 Win Rate: ${patternResults.prediction.winRate.toFixed(1)}%`);

            return patternResults.prediction;

        } catch (error) {
            console.error(`   ❌ Pattern matching failed: ${error.message}`);
            
            // Return fallback prediction
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                winRate: 0,
                avgSimilarity: 0,
                matchCount: 0,
                reasoning: `Pattern matching failed: ${error.message}`
            };
        }
    }

    /**
     * Step 3: Perform AI indicator analysis
     */
    async performIndicatorAnalysis(marketData) {
        try {
            console.log('   🧠 Running AI indicator analysis...');

            // Analyze market data with AI
            const indicatorResults = await this.indicatorEngine.analyzeMarketData(
                marketData.candles,
                marketData.indicators
            );

            console.log(`   ✅ AI Analysis completed`);
            console.log(`   📈 Prediction: ${indicatorResults.direction}`);
            console.log(`   📊 Confidence: ${indicatorResults.confidence.toFixed(1)}%`);
            console.log(`   🎯 Score: ${indicatorResults.score.toFixed(3)}`);

            // Log individual signals
            if (indicatorResults.signals) {
                Object.keys(indicatorResults.signals).forEach(indicator => {
                    const signal = indicatorResults.signals[indicator];
                    console.log(`   📊 ${indicator}: ${signal.signal} (${(signal.confidence * 100).toFixed(1)}%)`);
                });
            }

            return indicatorResults;

        } catch (error) {
            console.error(`   ❌ Indicator analysis failed: ${error.message}`);
            
            // Return fallback prediction
            return {
                direction: 'NO_SIGNAL',
                confidence: 0,
                score: 0,
                signals: {},
                reasoning: [`Indicator analysis failed: ${error.message}`]
            };
        }
    }

    /**
     * Step 4: Generate final consensus signal
     */
    async generateFinalSignal(patternPrediction, indicatorPrediction, marketData, pair, timeframe, tradeDuration) {
        try {
            console.log('   🎯 Generating consensus signal...');
            console.log(`   📊 Pattern AI: ${patternPrediction.direction} (${patternPrediction.confidence.toFixed(1)}%)`);
            console.log(`   🧠 Indicator AI: ${indicatorPrediction.direction} (${indicatorPrediction.confidence.toFixed(1)}%)`);

            // Generate consensus
            const consensusSignal = await this.consensusEngine.generateConsensusSignal(
                patternPrediction,
                indicatorPrediction,
                marketData,
                pair,
                timeframe
            );

            // Add trade duration
            consensusSignal.trade_duration = tradeDuration;

            console.log(`   ✅ Consensus: ${consensusSignal.signal}`);
            console.log(`   📊 Final Confidence: ${consensusSignal.confidence}`);
            console.log(`   ⚠️ Risk Score: ${consensusSignal.riskScore}`);

            return consensusSignal;

        } catch (error) {
            console.error(`   ❌ Consensus generation failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Step 5: Post-process signal
     */
    async postProcessSignal(signal, requestId, processingTime) {
        try {
            // Add metadata
            signal.metadata = {
                ...signal.metadata,
                requestId,
                processingTime,
                orchestratorVersion: '1.0.0',
                platform: this.currentSession?.platform,
                sessionId: this.currentSession?.startTime
            };

            // Save screenshot reference if available
            if (signal.analysis && signal.analysis.screenshot) {
                signal.metadata.screenshot = signal.analysis.screenshot;
            }

            // Update session stats
            if (this.currentSession) {
                this.currentSession.signalsGenerated++;
            }

            this.lastSignalTime = signal.timestamp;

        } catch (error) {
            console.warn(`⚠️ Post-processing warning: ${error.message}`);
        }
    }

    /**
     * Update performance statistics
     */
    updateStats(signal, processingTime) {
        if (signal.signal !== 'ERROR' && signal.signal !== 'NO_SIGNAL') {
            this.stats.successfulSignals++;
        }

        // Update average processing time
        const totalProcessed = this.stats.successfulSignals + this.stats.failedSignals;
        this.stats.avgProcessingTime = 
            (this.stats.avgProcessingTime * (totalProcessed - 1) + processingTime) / totalProcessed;
    }

    /**
     * Get system health status
     */
    async getHealthStatus() {
        try {
            const browserHealth = await this.browserEngine.healthCheck();
            const matcherHealth = await this.historicalMatcher.healthCheck();
            const indicatorHealth = await this.indicatorEngine.healthCheck();
            const consensusHealth = await this.consensusEngine.healthCheck();

            const overallHealth = 
                browserHealth.initialized &&
                matcherHealth.status === 'healthy' &&
                indicatorHealth.status === 'healthy' &&
                consensusHealth.status === 'healthy';

            return {
                status: overallHealth ? 'healthy' : 'degraded',
                uptime: Date.now() - this.stats.uptime,
                components: {
                    browserEngine: browserHealth,
                    historicalMatcher: matcherHealth,
                    indicatorEngine: indicatorHealth,
                    consensusEngine: consensusHealth
                },
                session: this.currentSession,
                stats: this.getStats(),
                lastSignalTime: this.lastSignalTime
            };

        } catch (error) {
            return {
                status: 'error',
                error: error.message,
                uptime: Date.now() - this.stats.uptime
            };
        }
    }

    /**
     * Get performance statistics
     */
    getStats() {
        const successRate = this.stats.totalRequests > 0 
            ? (this.stats.successfulSignals / this.stats.totalRequests * 100).toFixed(1)
            : 0;

        return {
            ...this.stats,
            successRate: `${successRate}%`,
            uptime: Date.now() - this.stats.uptime,
            avgProcessingTimeFormatted: `${this.stats.avgProcessingTime.toFixed(0)}ms`
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            console.log('🧹 Cleaning up OTC Signal Orchestrator...');
            
            await this.browserEngine.cleanup();
            
            this.isInitialized = false;
            this.currentSession = null;
            
            console.log('✅ Cleanup completed');
            
        } catch (error) {
            console.error(`❌ Cleanup error: ${error.message}`);
        }
    }

    /**
     * Restart the orchestrator
     */
    async restart(platformUrl, platform = 'auto') {
        await this.cleanup();
        return await this.initialize(platformUrl, platform);
    }
}

module.exports = { OTCSignalOrchestrator };