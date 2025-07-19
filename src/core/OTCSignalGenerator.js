/**
 * OTC Signal Generator
 * 
 * Specialized signal generator for OTC weekend trading that:
 * 1. Uses pattern matching against historical data
 * 2. Generates high-confidence signals based on pattern similarity
 * 3. Provides detailed reasoning and confidence scores
 */

const { OTCPatternMatcher } = require('./OTCPatternMatcher');
const { OTCHistoricalDataCollector } = require('../../utils/otc-historical-data');
const fs = require('fs-extra');
const path = require('path');

// Mock Logger and TechnicalIndicators for testing
class Logger {
  static getInstanceSync() {
    return new Logger();
  }
  
  info(message) { console.log(`[INFO] ${message}`); }
  warn(message) { console.log(`[WARN] ${message}`); }
  error(message) { console.log(`[ERROR] ${message}`); }
  debug(message) { console.log(`[DEBUG] ${message}`); }
}

class TechnicalIndicators {
  calculateEMA(data, period) { return data.map(() => Math.random()); }
  calculateRSI(data, period) { return data.map(() => Math.random() * 100); }
  calculateMACD(data) { 
    return {
      MACD: data.map(() => Math.random()),
      signal: data.map(() => Math.random()),
      histogram: data.map(() => Math.random())
    };
  }
  calculateBollingerBands(data, period, stdDev) {
    return {
      upper: data.map(d => d * 1.1),
      middle: [...data],
      lower: data.map(d => d * 0.9)
    };
  }
  calculateATR(highs, lows, closes, period) { return highs.map(() => Math.random()); }
  calculateStochastic(highs, lows, closes, period) { return closes.map(() => Math.random() * 100); }
}

class OTCSignalGenerator {
    constructor(config = {}) {
        this.logger = Logger.getInstanceSync();
        this.config = config;

        // Initialize components
        this.patternMatcher = new OTCPatternMatcher(config);
        this.indicators = new TechnicalIndicators();
        this.historicalData = new OTCHistoricalDataCollector({
            dataDir: path.join(process.cwd(), 'data', 'otc')
        });
        
        // System configuration
        this.systemConfig = {
            targetAccuracy: 80, // 80% target for OTC mode
            minConfidence: 75,  // Minimum confidence threshold
            maxProcessingTime: 60000, // 1 minute max
            minHistoricalMatches: 3, // Minimum number of historical matches required
            strictPatternMode: true
        };
        
        // Performance tracking
        this.performance = {
            totalSignals: 0,
            successfulSignals: 0,
            avgProcessingTime: 0,
            avgConfidence: 0,
            dataSourceStats: {
                otc: { broker: 0 },
                historical: { patterns: 0 },
                failures: 0
            }
        };
        
        // Signal history for learning
        this.signalHistory = [];
        this.maxHistorySize = 1000;
        
        this.logger.info('OTC Signal Generator initialized with pattern matching');
    }
    
    /**
     * Generate OTC trading signal based on pattern matching
     * @param {string} pair - Currency pair (e.g., 'EUR/USD')
     * @param {string} timeframe - Target timeframe (e.g., '5m')
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Complete signal with analysis
     */
    async generateSignal(pair, timeframe = '5m', options = {}) {
        const startTime = Date.now();
        const signalId = `OTC_${pair}_${timeframe}_${Date.now()}`;
        
        this.logger.info(`🚀 Starting OTC signal generation for ${pair} ${timeframe} (ID: ${signalId})`);
        
        try {
            // Phase 1: Data Collection
            this.logger.info('📡 Phase 1: Collecting OTC market data...');
            const marketData = await this.collectOTCMarketData(pair, timeframe, options);
            
            if (!marketData || !this.validateMarketData(marketData)) {
                throw new Error('Unable to collect valid OTC market data');
            }
            
            // Phase 2: Pattern Matching
            this.logger.info('🔍 Phase 2: Finding matching historical patterns...');
            const patternMatches = await this.patternMatcher.findMatchingPatterns(
                marketData,
                pair,
                this.normalizeTimeframe(timeframe)
            );
            
            // Phase 3: Signal Generation
            this.logger.info('🎯 Phase 3: Generating signal based on pattern matches...');
            const prediction = patternMatches.prediction;
            
            // Phase 4: Signal Validation & Finalization
            this.logger.info('✅ Phase 4: Validating and finalizing signal...');
            const finalSignal = await this.validateAndFinalizeSignal(
                prediction,
                patternMatches,
                marketData,
                pair,
                timeframe
            );
            
            // Phase 5: Performance Tracking
            const processingTime = Date.now() - startTime;
            this.updatePerformanceStats(finalSignal, processingTime);
            
            // Log and return final signal
            this.logger.info(`🎯 OTC Signal generated successfully in ${processingTime}ms with ${finalSignal.confidence}% confidence`);
            
            // Store signal for learning
            this.storeSignalForLearning(finalSignal, marketData, patternMatches);
            
            return finalSignal;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`❌ OTC Signal generation failed for ${pair} ${timeframe}: ${error.message}`);
            
            this.performance.totalSignals++;
            this.performance.dataSourceStats.failures++;
            
            return {
                pair,
                timeframe,
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
     * Collect OTC market data
     * @private
     */
    async collectOTCMarketData(pair, timeframe, options) {
        // In a real implementation, this would use the OTCDataExtractor
        // For now, we'll simulate the data collection
        
        this.logger.info(`Collecting OTC market data for ${pair} ${timeframe}`);
        
        // Check if we have data from options (passed from frontend)
        if (options.otcData) {
            this.logger.info('Using OTC data provided from frontend');
            
            // Store the data for future use
            await this.storeOTCData(pair, timeframe, options.otcData);
            
            return options.otcData;
        }
        
        // Try to get data from historical data collector
        const historicalData = await this.getHistoricalOTCData(pair, timeframe);
        
        if (historicalData && historicalData.candles && historicalData.candles.length > 0) {
            this.logger.info(`Using ${historicalData.candles.length} candles from historical OTC data`);
            
            // Format the data for the pattern matcher
            return this.formatHistoricalDataForPatternMatcher(historicalData, pair, timeframe);
        }
        
        // For testing/development, generate simulated OTC data
        const simulatedData = await this.generateSimulatedOTCData(pair, timeframe);
        
        // Store the simulated data for future use
        await this.storeOTCData(pair, timeframe, simulatedData);
        
        return simulatedData;
    }
    
    /**
     * Get historical OTC data
     * @private
     */
    async getHistoricalOTCData(pair, timeframe) {
        try {
            // Normalize pair name
            const normalizedPair = this.normalizePairForOTC(pair);
            const normalizedTimeframe = this.normalizeTimeframe(timeframe);
            
            // Get historical data
            const historicalData = await this.historicalData.getHistoricalData(
                normalizedPair,
                normalizedTimeframe,
                { limit: 100 } // Get last 100 candles
            );
            
            return historicalData;
        } catch (error) {
            this.logger.warn(`Error getting historical OTC data: ${error.message}`);
            return { candles: [] };
        }
    }
    
    /**
     * Store OTC data for future use
     * @private
     */
    async storeOTCData(pair, timeframe, data) {
        try {
            // Normalize pair name
            const normalizedPair = this.normalizePairForOTC(pair);
            const normalizedTimeframe = this.normalizeTimeframe(timeframe);
            
            // Extract candles from data
            let candles = [];
            
            if (data.combined && data.combined[normalizedTimeframe]) {
                candles = data.combined[normalizedTimeframe];
            } else if (data.realtime && data.realtime[normalizedTimeframe]) {
                candles = data.realtime[normalizedTimeframe];
            }
            
            if (candles.length === 0) {
                this.logger.warn('No candles found to store');
                return false;
            }
            
            // Store data
            await this.historicalData.storeData(
                normalizedPair,
                normalizedTimeframe,
                candles,
                'otc_signal_generator'
            );
            
            this.logger.info(`Stored ${candles.length} candles for ${normalizedPair} ${normalizedTimeframe}`);
            
            return true;
        } catch (error) {
            this.logger.warn(`Error storing OTC data: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Format historical data for pattern matcher
     * @private
     */
    formatHistoricalDataForPatternMatcher(historicalData, pair, timeframe) {
        const normalizedTimeframe = this.normalizeTimeframe(timeframe);
        
        return {
            pair,
            timeframe: normalizedTimeframe,
            realtime: {
                [normalizedTimeframe]: historicalData.candles
            },
            combined: {
                [normalizedTimeframe]: historicalData.candles
            },
            metadata: {
                source: 'historical_database',
                lastUpdated: historicalData.lastUpdated
            }
        };
    }
    
    /**
     * Normalize pair name for OTC data storage
     * @private
     */
    normalizePairForOTC(pair) {
        if (!pair) return 'UNKNOWN';
        
        // Remove spaces and convert to uppercase
        let normalized = pair.toString().toUpperCase().replace(/\s+/g, '');
        
        // Replace / with _ for filenames
        normalized = normalized.replace(/\//g, '_');
        
        // Ensure OTC is in the name
        if (!normalized.includes('OTC')) {
            normalized = `${normalized}_OTC`;
        }
        
        return normalized;
    }
    
    /**
     * Generate simulated OTC data for testing
     * @private
     */
    async generateSimulatedOTCData(pair, timeframe) {
        this.logger.info('Generating simulated OTC data for testing');
        
        // Try to load historical data to make simulation more realistic
        let historicalData = [];
        try {
            const dataPath = path.join(process.cwd(), 'data', 'sample', `${pair.replace('/', '_')}_${timeframe}.json`);
            if (await fs.pathExists(dataPath)) {
                historicalData = await fs.readJson(dataPath);
                this.logger.info(`Loaded ${historicalData.length} historical candles for simulation`);
            }
        } catch (error) {
            this.logger.warn(`Could not load historical data for simulation: ${error.message}`);
        }
        
        // If no historical data, generate random candles
        if (historicalData.length === 0) {
            const candles = [];
            const basePrice = pair.includes('BTC') ? 50000 : 1.1;
            let lastClose = basePrice;
            
            // Generate 100 candles
            for (let i = 0; i < 100; i++) {
                const volatility = pair.includes('BTC') ? 100 : 0.001;
                const open = lastClose;
                const close = open + (Math.random() - 0.5) * volatility;
                const high = Math.max(open, close) + Math.random() * volatility * 0.5;
                const low = Math.min(open, close) - Math.random() * volatility * 0.5;
                
                candles.push({
                    timestamp: Date.now() - (100 - i) * this.getTimeframeMinutes(timeframe) * 60 * 1000,
                    open,
                    high,
                    low,
                    close,
                    volume: Math.random() * 1000
                });
                
                lastClose = close;
            }
            
            historicalData = candles;
        }
        
        // Create market data structure
        return {
            pair,
            timeframe,
            realtime: {
                [this.normalizeTimeframe(timeframe)]: historicalData
            },
            combined: {
                [this.normalizeTimeframe(timeframe)]: historicalData
            },
            metadata: {
                source: 'simulated',
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * Validate collected market data
     * @private
     */
    validateMarketData(marketData) {
        if (!marketData) return false;
        
        // Must have at least some data
        if (!marketData.realtime && !marketData.combined) {
            this.logger.error('No OTC data available');
            return false;
        }
        
        // Check if we have data for the requested timeframe
        const timeframes = Object.keys(marketData.combined || marketData.realtime || {});
        
        if (timeframes.length === 0) {
            this.logger.error('No timeframes available in OTC data');
            return false;
        }
        
        // Check if we have enough candles
        for (const tf of timeframes) {
            const data = (marketData.combined && marketData.combined[tf]) || 
                         (marketData.realtime && marketData.realtime[tf]) || [];
            
            if (data.length < 10) {
                this.logger.warn(`Insufficient candles for ${tf}: ${data.length} (need at least 10)`);
            }
        }
        
        this.logger.info(`✅ OTC market data validation passed: ${timeframes.length} timeframes`);
        return true;
    }
    
    /**
     * Validate and finalize the trading signal
     * @private
     */
    async validateAndFinalizeSignal(prediction, patternMatches, marketData, pair, timeframe) {
        this.logger.debug('Validating and finalizing OTC signal...');
        
        const signal = {
            pair,
            timeframe,
            direction: 'NO_SIGNAL',
            confidence: 0,
            riskScore: 'HIGH',
            reason: 'Signal validation failed',
            dataSourcesUsed: {
                otc: marketData.metadata?.source || 'broker',
                historical: 'pattern database'
            },
            generatedAt: new Date().toISOString(),
            processingTime: 0,
            signalId: `OTC_${pair}_${timeframe}_${Date.now()}`,
            mode: 'OTC',
            analysis: {
                patternMatches: {
                    count: patternMatches.matches?.matchCount || 0,
                    averageSimilarity: patternMatches.matches?.averageScore || 0,
                    highestSimilarity: patternMatches.matches?.highestScore || 0
                }
            }
        };
        
        // Check if we have a valid prediction
        if (!prediction || prediction.direction === 'NO_SIGNAL') {
            signal.reason = prediction?.reason || 'No valid prediction from pattern matcher';
            return signal;
        }
        
        // Check minimum confidence threshold
        if (prediction.confidence < this.systemConfig.minConfidence) {
            signal.reason = `Confidence ${prediction.confidence}% below minimum ${this.systemConfig.minConfidence}%`;
            return signal;
        }
        
        // Check minimum historical matches
        if (patternMatches.matches.matchCount < this.systemConfig.minHistoricalMatches) {
            signal.reason = `Insufficient historical matches: ${patternMatches.matches.matchCount}/${this.systemConfig.minHistoricalMatches}`;
            return signal;
        }
        
        // All validations passed - create final signal
        signal.direction = prediction.direction;
        signal.confidence = prediction.confidence;
        signal.reason = prediction.reason;
        
        // Determine risk score based on confidence
        if (prediction.confidence >= 85) {
            signal.riskScore = 'LOW';
        } else if (prediction.confidence >= 75) {
            signal.riskScore = 'MEDIUM';
        } else {
            signal.riskScore = 'HIGH';
        }
        
        // Add pattern match details
        signal.analysis.patternDetails = {
            bullishPercentage: prediction.bullishPercentage,
            bearishPercentage: prediction.bearishPercentage,
            matchCount: prediction.matchCount
        };
        
        return signal;
    }
    
    /**
     * Update performance statistics
     * @private
     */
    updatePerformanceStats(signal, processingTime) {
        this.performance.totalSignals++;
        
        if (signal.direction !== 'NO_SIGNAL') {
            this.performance.successfulSignals++;
            this.performance.avgConfidence = 
                (this.performance.avgConfidence * (this.performance.successfulSignals - 1) + signal.confidence) / 
                this.performance.successfulSignals;
        }
        
        this.performance.avgProcessingTime = 
            (this.performance.avgProcessingTime * (this.performance.totalSignals - 1) + processingTime) / 
            this.performance.totalSignals;
        
        // Update data source stats
        this.performance.dataSourceStats.otc.broker++;
        this.performance.dataSourceStats.historical.patterns++;
    }
    
    /**
     * Store signal for learning and improvement
     * @private
     */
    storeSignalForLearning(signal, marketData, patternMatches) {
        const learningData = {
            signal,
            marketContext: {
                pair: signal.pair,
                timeframe: signal.timeframe,
                dataQuality: Object.keys(marketData.combined || {}).length,
                patternMatchCount: patternMatches.matches?.matchCount || 0
            },
            timestamp: Date.now()
        };
        
        this.signalHistory.push(learningData);
        
        // Keep only recent history
        if (this.signalHistory.length > this.maxHistorySize) {
            this.signalHistory = this.signalHistory.slice(-this.maxHistorySize);
        }
        
        // Save to file for persistence
        this.saveSignalHistory();
    }
    
    /**
     * Save signal history to file
     * @private
     */
    async saveSignalHistory() {
        try {
            const historyPath = path.join(process.cwd(), 'data', 'otc_signal_history.json');
            await fs.ensureDir(path.dirname(historyPath));
            await fs.writeJson(historyPath, {
                signals: this.signalHistory.slice(-100), // Save last 100 signals
                performance: this.performance,
                lastUpdated: new Date().toISOString()
            }, { spaces: 2 });
        } catch (error) {
            this.logger.warn(`Failed to save OTC signal history: ${error.message}`);
        }
    }
    
    /**
     * Get system performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.performance,
            successRate: this.performance.totalSignals > 0 ? 
                (this.performance.successfulSignals / this.performance.totalSignals * 100).toFixed(2) + '%' : '0%',
            avgProcessingTimeFormatted: `${(this.performance.avgProcessingTime / 1000).toFixed(1)}s`,
            systemHealth: this.performance.dataSourceStats.failures < 5 ? 'HEALTHY' : 'DEGRADED',
            mode: 'OTC'
        };
    }
    
    /**
     * Normalize timeframe format
     * @private
     */
    normalizeTimeframe(timeframe) {
        // Convert various timeframe formats to standard format
        const tf = timeframe.toUpperCase();
        
        if (tf === '1M' || tf === '1MIN' || tf === '1' || tf === '1MINUTE') return '1M';
        if (tf === '3M' || tf === '3MIN' || tf === '3' || tf === '3MINUTE') return '3M';
        if (tf === '5M' || tf === '5MIN' || tf === '5' || tf === '5MINUTE') return '5M';
        if (tf === '15M' || tf === '15MIN' || tf === '15' || tf === '15MINUTE') return '15M';
        if (tf === '30M' || tf === '30MIN' || tf === '30' || tf === '30MINUTE') return '30M';
        if (tf === '1H' || tf === '1HOUR' || tf === '60M' || tf === '60MIN') return '1H';
        
        // Default to original if no match
        return tf;
    }
    
    /**
     * Get timeframe minutes
     * @private
     */
    getTimeframeMinutes(timeframe) {
        const tf = this.normalizeTimeframe(timeframe);
        
        if (tf === '1M') return 1;
        if (tf === '3M') return 3;
        if (tf === '5M') return 5;
        if (tf === '15M') return 15;
        if (tf === '30M') return 30;
        if (tf === '1H') return 60;
        
        // Default to 5 minutes if unknown
        return 5;
    }
}

module.exports = { OTCSignalGenerator };