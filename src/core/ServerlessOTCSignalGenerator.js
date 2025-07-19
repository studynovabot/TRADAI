/**
 * Serverless OTC Signal Generator
 * 
 * Optimized version for Vercel deployment that bypasses browser automation
 * and uses alternative data sources for signal generation
 */

const { HistoricalDataMatcher } = require('./HistoricalDataMatcher');
const { AIIndicatorEngine } = require('./AIIndicatorEngine');
const { SignalConsensusEngine } = require('./SignalConsensusEngine');

class ServerlessOTCSignalGenerator {
    constructor(config = {}) {
        this.config = {
            minConfidence: config.minConfidence || 75,
            maxProcessingTime: config.maxProcessingTime || 60000, // 1 minute for serverless
            fallbackToHistoricalOnly: true,
            serverlessMode: true,
            ...config
        };

        // Initialize components (without browser automation)
        this.historicalMatcher = new HistoricalDataMatcher({
            serverlessMode: true,
            maxDataPoints: 500 // Limit for serverless memory
        });
        
        this.aiIndicatorEngine = new AIIndicatorEngine({
            serverlessMode: true,
            quickMode: true // Faster processing for serverless
        });
        
        this.consensusEngine = new SignalConsensusEngine({
            serverlessMode: true,
            conservativeMode: true // More conservative in serverless
        });

        this.isInitialized = false;
        this.lastSignalTime = 0;
        this.signalCooldown = 30000; // 30 seconds between signals
    }

    /**
     * Initialize the serverless signal generator
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Serverless OTC Signal Generator...');
            
            const startTime = Date.now();
            
            // Initialize components in parallel
            await Promise.all([
                this.historicalMatcher.initialize(),
                this.aiIndicatorEngine.initialize(),
                this.consensusEngine.initialize()
            ]);
            
            this.isInitialized = true;
            const initTime = Date.now() - startTime;
            
            console.log(`✅ Serverless OTC Signal Generator initialized in ${initTime}ms`);
            
            return {
                success: true,
                initializationTime: initTime,
                mode: 'serverless',
                components: {
                    historicalMatcher: 'initialized',
                    aiIndicatorEngine: 'initialized',
                    consensusEngine: 'initialized',
                    browserEngine: 'disabled_serverless'
                }
            };
            
        } catch (error) {
            console.error('❌ Failed to initialize serverless signal generator:', error);
            throw new Error(`Initialization failed: ${error.message}`);
        }
    }

    /**
     * Generate trading signal using serverless-optimized approach
     */
    async generateSignal(params) {
        try {
            console.log('🎯 Generating signal in serverless mode...');
            
            // Validate rate limiting
            const now = Date.now();
            if (now - this.lastSignalTime < this.signalCooldown) {
                const waitTime = Math.ceil((this.signalCooldown - (now - this.lastSignalTime)) / 1000);
                return {
                    success: false,
                    signal: 'NO_SIGNAL',
                    confidence: 0,
                    riskScore: 'HIGH',
                    error: 'RATE_LIMITED',
                    message: `Please wait ${waitTime} seconds before generating another signal`,
                    processingTime: 1
                };
            }

            this.lastSignalTime = now;
            const startTime = Date.now();
            
            // Validate parameters
            const validation = this.validateParameters(params);
            if (!validation.valid) {
                return {
                    success: false,
                    signal: 'ERROR',
                    confidence: 0,
                    riskScore: 'HIGH',
                    error: 'INVALID_PARAMETERS',
                    message: validation.message,
                    processingTime: Date.now() - startTime
                };
            }

            // Ensure initialization
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Extract currency pair for data fetching
            const symbol = this.extractSymbol(params.currencyPair);
            
            // Step 1: Get historical data (Yahoo Finance)
            console.log('📊 Fetching historical data...');
            const historicalData = await this.historicalMatcher.getHistoricalData(symbol, {
                period: '5d', // Last 5 days
                interval: params.timeframe || '5m'
            });

            if (!historicalData || historicalData.length < 50) {
                return {
                    success: false,
                    signal: 'NO_SIGNAL',
                    confidence: 0,
                    riskScore: 'HIGH',
                    error: 'INSUFFICIENT_DATA',
                    message: 'Not enough historical data available for analysis',
                    processingTime: Date.now() - startTime
                };
            }

            // Step 2: Pattern analysis
            console.log('🔍 Analyzing patterns...');
            const patternAnalysis = await this.historicalMatcher.analyzePatterns(historicalData, {
                timeframe: params.timeframe,
                lookback: 100
            });

            // Step 3: Technical indicator analysis
            console.log('📈 Calculating indicators...');
            const indicatorAnalysis = await this.aiIndicatorEngine.analyzeIndicators(historicalData, {
                timeframe: params.timeframe,
                quickMode: true
            });

            // Step 4: Generate consensus signal
            console.log('🤖 Generating consensus...');
            const consensusResult = await this.consensusEngine.generateConsensus({
                patternAnalysis,
                indicatorAnalysis,
                marketData: {
                    symbol: symbol,
                    timeframe: params.timeframe,
                    platform: params.platform,
                    currentPrice: historicalData[historicalData.length - 1]?.close
                }
            });

            const processingTime = Date.now() - startTime;

            // Apply serverless safety filters
            const finalSignal = this.applyServerlessSafetyFilters(consensusResult, processingTime);

            console.log(`✅ Signal generated in ${processingTime}ms: ${finalSignal.signal} (${finalSignal.confidence}%)`);

            return {
                success: true,
                signal: finalSignal.signal,
                confidence: finalSignal.confidence,
                riskScore: finalSignal.riskScore,
                reasoning: finalSignal.reasoning,
                analysis: {
                    patternAnalysis: {
                        confidence: patternAnalysis.confidence,
                        direction: patternAnalysis.direction,
                        patterns: patternAnalysis.patterns?.slice(0, 3) // Limit for response size
                    },
                    indicatorAnalysis: {
                        confidence: indicatorAnalysis.confidence,
                        direction: indicatorAnalysis.direction,
                        indicators: indicatorAnalysis.summary
                    }
                },
                metadata: {
                    processingTime,
                    dataPoints: historicalData.length,
                    mode: 'serverless',
                    timestamp: new Date().toISOString(),
                    symbol: symbol,
                    platform: params.platform
                }
            };

        } catch (error) {
            console.error('❌ Signal generation failed:', error);
            
            return {
                success: false,
                signal: 'ERROR',
                confidence: 0,
                riskScore: 'HIGH',
                error: 'GENERATION_FAILED',
                message: 'Signal generation encountered an error in serverless environment',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined,
                processingTime: Date.now() - (this.lastSignalTime || Date.now())
            };
        }
    }

    /**
     * Validate input parameters
     */
    validateParameters(params) {
        if (!params) {
            return { valid: false, message: 'Parameters are required' };
        }

        if (!params.currencyPair) {
            return { valid: false, message: 'currencyPair is required' };
        }

        if (!params.timeframe) {
            return { valid: false, message: 'timeframe is required' };
        }

        if (!params.tradeDuration) {
            return { valid: false, message: 'tradeDuration is required' };
        }

        if (!params.platform) {
            return { valid: false, message: 'platform is required' };
        }

        // Validate currency pair format
        const validPairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'USD/CHF'];
        const basePair = params.currencyPair.replace(' OTC', '');
        
        if (!validPairs.includes(basePair)) {
            return { valid: false, message: `Unsupported currency pair: ${params.currencyPair}` };
        }

        return { valid: true };
    }

    /**
     * Extract symbol for data fetching
     */
    extractSymbol(currencyPair) {
        // Convert "EUR/USD OTC" to "EURUSD=X" for Yahoo Finance
        const basePair = currencyPair.replace(' OTC', '');
        const symbol = basePair.replace('/', '') + '=X';
        return symbol;
    }

    /**
     * Apply serverless-specific safety filters
     */
    applyServerlessSafetyFilters(consensusResult, processingTime) {
        // Conservative approach for serverless
        let adjustedConfidence = consensusResult.confidence;
        let adjustedSignal = consensusResult.signal;
        let riskScore = consensusResult.riskScore || 'MEDIUM';

        // Reduce confidence in serverless mode (more conservative)
        adjustedConfidence = Math.max(0, adjustedConfidence - 10);

        // If confidence is below threshold, return NO_SIGNAL
        if (adjustedConfidence < this.config.minConfidence) {
            adjustedSignal = 'NO_SIGNAL';
            adjustedConfidence = 0;
            riskScore = 'HIGH';
        }

        // If processing took too long, reduce confidence
        if (processingTime > 30000) { // 30 seconds
            adjustedConfidence = Math.max(0, adjustedConfidence - 20);
            riskScore = 'HIGH';
        }

        // Add serverless-specific reasoning
        const reasoning = [
            ...(consensusResult.reasoning || []),
            'Analysis performed in serverless environment',
            'Conservative confidence adjustment applied',
            `Processing completed in ${processingTime}ms`
        ];

        return {
            signal: adjustedSignal,
            confidence: adjustedConfidence,
            riskScore: riskScore,
            reasoning: reasoning.slice(0, 5) // Limit reasoning items
        };
    }

    /**
     * Get system health status
     */
    getHealthStatus() {
        return {
            status: 'healthy',
            mode: 'serverless',
            initialized: this.isInitialized,
            components: {
                historicalMatcher: this.historicalMatcher ? 'healthy' : 'not_initialized',
                aiIndicatorEngine: this.aiIndicatorEngine ? 'healthy' : 'not_initialized',
                consensusEngine: this.consensusEngine ? 'healthy' : 'not_initialized',
                browserEngine: 'disabled_serverless'
            },
            lastSignalTime: this.lastSignalTime,
            cooldownRemaining: Math.max(0, this.signalCooldown - (Date.now() - this.lastSignalTime))
        };
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            console.log('🧹 Cleaning up serverless signal generator...');
            
            // Cleanup components
            if (this.historicalMatcher && this.historicalMatcher.cleanup) {
                await this.historicalMatcher.cleanup();
            }
            
            if (this.aiIndicatorEngine && this.aiIndicatorEngine.cleanup) {
                await this.aiIndicatorEngine.cleanup();
            }
            
            if (this.consensusEngine && this.consensusEngine.cleanup) {
                await this.consensusEngine.cleanup();
            }
            
            this.isInitialized = false;
            console.log('✅ Serverless signal generator cleaned up');
            
        } catch (error) {
            console.error('⚠️ Error during cleanup:', error);
        }
    }
}

module.exports = { ServerlessOTCSignalGenerator };