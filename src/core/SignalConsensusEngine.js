/**
 * Final Signal Consensus Engine for OTC Trading Signal Generator
 * 
 * Combines predictions from:
 * - Pattern-Match AI (Historical Data Matcher)
 * - Indicator AI (AI Indicator Engine)
 * - Implements strict filtering and consensus logic
 * - Generates final trade signals with detailed reasoning
 */

const fs = require('fs-extra');
const path = require('path');

class SignalConsensusEngine {
    constructor(config = {}) {
        this.config = {
            minConfidence: 75, // Minimum confidence threshold
            consensusRequired: true, // Both AIs must agree
            maxConflictTolerance: 10, // Max difference in confidence for agreement
            signalTimeout: 300000, // 5 minutes signal validity
            logDirectory: path.join(process.cwd(), 'data', 'signals'),
            ...config
        };

        // Signal quality filters
        this.qualityFilters = {
            minPatternSimilarity: 70,
            minHistoricalMatches: 3,
            minIndicatorAlignment: 3,
            maxRiskScore: 'MEDIUM',
            requiredDataSources: ['pattern', 'indicator']
        };

        // Performance tracking
        this.performance = {
            totalSignals: 0,
            consensusSignals: 0,
            conflictSignals: 0,
            noSignals: 0,
            avgConfidence: 0,
            lastSignalTime: null
        };

        this.signalHistory = [];
        this.maxHistorySize = 1000;

        console.log('🎯 Signal Consensus Engine initialized');
        this.isInitialized = false;
    }

    /**
     * Initialize the Signal Consensus Engine
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Signal Consensus Engine...');
            
            // Ensure log directory exists
            await this.ensureLogDirectory();
            
            // Initialize consensus algorithms
            this.consensusAlgorithms = {
                weighted: this.weightedConsensus.bind(this),
                majority: this.majorityConsensus.bind(this),
                conservative: this.conservativeConsensus.bind(this)
            };
            
            // Load historical performance if available
            await this.loadHistoricalPerformance();
            
            this.isInitialized = true;
            console.log('✅ Signal Consensus Engine initialized successfully');
            
            return { success: true, component: 'SignalConsensusEngine' };
            
        } catch (error) {
            console.error('❌ Failed to initialize Signal Consensus Engine:', error);
            throw new Error(`SignalConsensusEngine initialization failed: ${error.message}`);
        }
    }

    /**
     * Load historical performance data
     */
    async loadHistoricalPerformance() {
        try {
            const performanceFile = path.join(this.config.logDirectory, 'performance.json');
            if (await fs.pathExists(performanceFile)) {
                const data = await fs.readJson(performanceFile);
                this.performance = { ...this.performance, ...data };
                console.log('✅ Loaded historical performance data');
            }
        } catch (error) {
            console.log('⚠️ Could not load historical performance:', error.message);
        }
    }

    /**
     * Ensure log directory exists
     */
    async ensureLogDirectory() {
        await fs.ensureDir(this.config.logDirectory);
    }

    /**
     * Generate consensus (wrapper for generateConsensusSignal)
     */
    async generateConsensus(analysisData) {
        try {
            const { patternAnalysis, indicatorAnalysis, marketData } = analysisData;
            
            // Extract required parameters
            const pair = marketData?.symbol || 'EURUSD=X';
            const timeframe = marketData?.timeframe || '5m';
            
            // Call the main consensus method
            return await this.generateConsensusSignal(
                patternAnalysis, 
                indicatorAnalysis, 
                marketData, 
                pair, 
                timeframe
            );
            
        } catch (error) {
            console.error('❌ Generate consensus failed:', error);
            return {
                signal: 'ERROR',
                confidence: 0,
                riskScore: 'HIGH',
                reasoning: [`Consensus generation failed: ${error.message}`]
            };
        }
    }

    /**
     * Generate final consensus signal
     */
    async generateConsensusSignal(patternPrediction, indicatorPrediction, marketData, pair, timeframe) {
        try {
            console.log('🎯 Generating consensus signal...');
            
            const signalId = `CONSENSUS_${pair}_${timeframe}_${Date.now()}`;
            const timestamp = new Date().toISOString();

            // Validate inputs
            const validation = this.validateInputs(patternPrediction, indicatorPrediction, marketData);
            if (!validation.valid) {
                return this.createNoSignal(signalId, pair, timeframe, validation.reason);
            }

            // Apply quality filters
            const qualityCheck = this.applyQualityFilters(patternPrediction, indicatorPrediction);
            if (!qualityCheck.passed) {
                return this.createNoSignal(signalId, pair, timeframe, qualityCheck.reason);
            }

            // Check for consensus
            const consensus = this.checkConsensus(patternPrediction, indicatorPrediction);
            if (!consensus.hasConsensus) {
                this.performance.conflictSignals++;
                return this.createNoSignal(signalId, pair, timeframe, consensus.reason);
            }

            // Calculate final confidence
            const finalConfidence = this.calculateFinalConfidence(patternPrediction, indicatorPrediction, consensus);
            
            // Apply confidence threshold
            if (finalConfidence < this.config.minConfidence) {
                return this.createNoSignal(signalId, pair, timeframe, 
                    `Confidence ${finalConfidence.toFixed(1)}% below threshold ${this.config.minConfidence}%`);
            }

            // Generate final signal
            const finalSignal = this.createFinalSignal({
                signalId,
                pair,
                timeframe,
                direction: consensus.direction,
                confidence: finalConfidence,
                patternPrediction,
                indicatorPrediction,
                consensus,
                marketData,
                timestamp
            });

            // Log and track performance
            await this.logSignal(finalSignal);
            this.updatePerformanceStats(finalSignal);

            console.log(`✅ Consensus signal generated: ${finalSignal.direction} with ${finalSignal.confidence}% confidence`);
            return finalSignal;

        } catch (error) {
            console.error(`❌ Consensus signal generation failed: ${error.message}`);
            return this.createErrorSignal(pair, timeframe, error.message);
        }
    }

    /**
     * Validate input predictions
     */
    validateInputs(patternPrediction, indicatorPrediction, marketData) {
        const errors = [];

        // Check pattern prediction
        if (!patternPrediction) {
            errors.push('Missing pattern prediction');
        } else if (!patternPrediction.direction || patternPrediction.confidence === undefined) {
            errors.push('Invalid pattern prediction format');
        }

        // Check indicator prediction
        if (!indicatorPrediction) {
            errors.push('Missing indicator prediction');
        } else if (!indicatorPrediction.direction || indicatorPrediction.confidence === undefined) {
            errors.push('Invalid indicator prediction format');
        }

        // Check market data
        if (!marketData || !marketData.candles || marketData.candles.length === 0) {
            errors.push('Missing or invalid market data');
        }

        return {
            valid: errors.length === 0,
            reason: errors.join(', ')
        };
    }

    /**
     * Apply quality filters
     */
    applyQualityFilters(patternPrediction, indicatorPrediction) {
        const failures = [];

        // Pattern quality checks
        if (patternPrediction.avgSimilarity < this.qualityFilters.minPatternSimilarity) {
            failures.push(`Pattern similarity ${patternPrediction.avgSimilarity}% below minimum ${this.qualityFilters.minPatternSimilarity}%`);
        }

        if (patternPrediction.matchCount < this.qualityFilters.minHistoricalMatches) {
            failures.push(`Only ${patternPrediction.matchCount} historical matches, minimum ${this.qualityFilters.minHistoricalMatches} required`);
        }

        // Indicator quality checks
        if (indicatorPrediction.signals) {
            const alignedSignals = Object.values(indicatorPrediction.signals)
                .filter(s => s.signal === indicatorPrediction.direction.toLowerCase()).length;
            
            if (alignedSignals < this.qualityFilters.minIndicatorAlignment) {
                failures.push(`Only ${alignedSignals} indicators aligned, minimum ${this.qualityFilters.minIndicatorAlignment} required`);
            }
        }

        return {
            passed: failures.length === 0,
            reason: failures.join(', ')
        };
    }

    /**
     * Check for consensus between predictions
     */
    checkConsensus(patternPrediction, indicatorPrediction) {
        // Normalize directions
        const patternDir = this.normalizeDirection(patternPrediction.direction);
        const indicatorDir = this.normalizeDirection(indicatorPrediction.direction);

        // If we're in conservative mode, require stricter consensus
        if (this.config.conservativeMode) {
            // Modified approach: If one AI has a strong signal, use it even if the other is NO_SIGNAL
            if (patternDir === 'NO_SIGNAL' && indicatorDir !== 'NO_SIGNAL' && indicatorPrediction.confidence >= 70) {
                return {
                    hasConsensus: true,
                    direction: indicatorDir,
                    confidenceDiff: 0,
                    reason: `Using strong indicator signal (${indicatorPrediction.confidence}%) despite no pattern signal`
                };
            }
            
            if (indicatorDir === 'NO_SIGNAL' && patternDir !== 'NO_SIGNAL' && patternPrediction.confidence >= 70) {
                return {
                    hasConsensus: true,
                    direction: patternDir,
                    confidenceDiff: 0,
                    reason: `Using strong pattern signal (${patternPrediction.confidence}%) despite no indicator signal`
                };
            }
            
            // If both are NO_SIGNAL, we can't generate a consensus
            if (patternDir === 'NO_SIGNAL' && indicatorDir === 'NO_SIGNAL') {
                return {
                    hasConsensus: false,
                    reason: 'Both AIs returned NO_SIGNAL',
                    direction: 'NO_SIGNAL'
                };
            }
            
            // If directions conflict, use the one with higher confidence
            if (patternDir !== indicatorDir && patternDir !== 'NO_SIGNAL' && indicatorDir !== 'NO_SIGNAL') {
                const patternConf = patternPrediction.confidence || 0;
                const indicatorConf = indicatorPrediction.confidence || 0;
                
                if (patternConf >= indicatorConf + 20) {
                    // Pattern is significantly more confident
                    return {
                        hasConsensus: true,
                        direction: patternDir,
                        confidenceDiff: patternConf - indicatorConf,
                        reason: `Using pattern signal (${patternConf}%) which is significantly more confident than indicator (${indicatorConf}%)`
                    };
                } else if (indicatorConf >= patternConf + 20) {
                    // Indicator is significantly more confident
                    return {
                        hasConsensus: true,
                        direction: indicatorDir,
                        confidenceDiff: indicatorConf - patternConf,
                        reason: `Using indicator signal (${indicatorConf}%) which is significantly more confident than pattern (${patternConf}%)`
                    };
                }
                
                // If confidence difference is not significant, prefer pattern analysis for OTC
                return {
                    hasConsensus: true,
                    direction: patternDir,
                    confidenceDiff: Math.abs(patternConf - indicatorConf),
                    reason: `Using pattern signal (${patternConf}%) over indicator (${indicatorConf}%) for OTC trading`
                };
            }
        } else {
            // In non-conservative mode, be even more lenient
            // If either has a signal, use it
            if (patternDir !== 'NO_SIGNAL') {
                return {
                    hasConsensus: true,
                    direction: patternDir,
                    confidenceDiff: 0,
                    reason: `Using pattern signal: ${patternDir}`
                };
            }
            
            if (indicatorDir !== 'NO_SIGNAL') {
                return {
                    hasConsensus: true,
                    direction: indicatorDir,
                    confidenceDiff: 0,
                    reason: `Using indicator signal: ${indicatorDir}`
                };
            }
            
            // If both are NO_SIGNAL, we can't generate a consensus
            return {
                hasConsensus: false,
                reason: 'Both AIs returned NO_SIGNAL',
                direction: 'NO_SIGNAL'
            };
        }

        // If we get here, both signals agree
        return {
            hasConsensus: true,
            direction: patternDir,
            confidenceDiff: Math.abs(patternPrediction.confidence - indicatorPrediction.confidence),
            reason: `Both AIs agree on ${patternDir} direction`
        };
    }

    /**
     * Normalize direction values
     */
    normalizeDirection(direction) {
        if (!direction) return 'NO_SIGNAL';
        
        const dir = direction.toString().toUpperCase();
        
        if (['BUY', 'UP', 'CALL', 'BULLISH'].includes(dir)) return 'BUY';
        if (['SELL', 'DOWN', 'PUT', 'BEARISH'].includes(dir)) return 'SELL';
        
        return 'NO_SIGNAL';
    }

    /**
     * Calculate final confidence score
     */
    calculateFinalConfidence(patternPrediction, indicatorPrediction, consensus) {
        // Base confidence from both predictions
        const patternConfidence = patternPrediction.confidence || 0;
        const indicatorConfidence = indicatorPrediction.confidence || 0;

        // Weighted average (pattern matching gets higher weight for OTC)
        const weightedConfidence = (patternConfidence * 0.6) + (indicatorConfidence * 0.4);

        // Consensus bonus
        let consensusBonus = 0;
        if (consensus.hasConsensus) {
            // Bonus for agreement, penalty for large confidence difference
            consensusBonus = 5 - (consensus.confidenceDiff / 2);
        }

        // Quality bonuses
        let qualityBonus = 0;
        
        // Pattern quality bonus
        if (patternPrediction.avgSimilarity > 85) qualityBonus += 3;
        if (patternPrediction.matchCount > 5) qualityBonus += 2;
        if (patternPrediction.winRate > 80) qualityBonus += 3;

        // Indicator quality bonus
        if (indicatorPrediction.signals) {
            const strongSignals = Object.values(indicatorPrediction.signals)
                .filter(s => s.strength > 0.7).length;
            qualityBonus += strongSignals;
        }

        // Calculate final confidence
        const finalConfidence = Math.min(
            weightedConfidence + consensusBonus + qualityBonus,
            95 // Cap at 95%
        );

        return Math.max(finalConfidence, 0);
    }

    /**
     * Create final signal object
     */
    createFinalSignal(params) {
        const {
            signalId, pair, timeframe, direction, confidence,
            patternPrediction, indicatorPrediction, consensus,
            marketData, timestamp
        } = params;

        // Generate comprehensive reasoning
        const reasoning = this.generateReasoning(patternPrediction, indicatorPrediction, consensus);

        // Calculate risk score
        const riskScore = this.calculateRiskScore(confidence, patternPrediction, indicatorPrediction);

        // Determine trade duration based on timeframe
        const tradeDuration = this.calculateTradeDuration(timeframe);

        return {
            signalId,
            currency_pair: pair,
            timeframe,
            trade_duration: tradeDuration,
            signal: direction,
            confidence: `${confidence.toFixed(1)}%`,
            confidenceNumeric: confidence,
            riskScore,
            reason: reasoning,
            timestamp,
            
            // Detailed analysis
            analysis: {
                pattern: {
                    direction: patternPrediction.direction,
                    confidence: patternPrediction.confidence,
                    similarity: patternPrediction.avgSimilarity,
                    matches: patternPrediction.matchCount,
                    winRate: patternPrediction.winRate,
                    reasoning: patternPrediction.reasoning
                },
                indicator: {
                    direction: indicatorPrediction.direction,
                    confidence: indicatorPrediction.confidence,
                    score: indicatorPrediction.score,
                    signals: indicatorPrediction.signals,
                    reasoning: indicatorPrediction.reasoning
                },
                consensus: {
                    agreement: consensus.hasConsensus,
                    confidenceDiff: consensus.confidenceDiff,
                    reason: consensus.reason
                }
            },

            // Market context
            marketContext: {
                currentPrice: marketData.candles[marketData.candles.length - 1].close,
                priceChange24h: this.calculatePriceChange(marketData.candles),
                volatility: this.calculateVolatility(marketData.candles),
                volume: marketData.candles[marketData.candles.length - 1].volume
            },

            // Metadata
            metadata: {
                generatedBy: 'SignalConsensusEngine',
                version: '1.0.0',
                processingTime: Date.now() - new Date(timestamp).getTime(),
                dataQuality: this.assessDataQuality(marketData),
                validUntil: new Date(Date.now() + this.config.signalTimeout).toISOString()
            }
        };
    }

    /**
     * Generate comprehensive reasoning
     */
    generateReasoning(patternPrediction, indicatorPrediction, consensus) {
        const reasons = [];

        // Pattern analysis
        if (patternPrediction.reasoning) {
            reasons.push(`Pattern: ${patternPrediction.reasoning}`);
        }

        // Indicator analysis
        if (indicatorPrediction.reasoning && indicatorPrediction.reasoning.length > 0) {
            const topReasons = indicatorPrediction.reasoning.slice(0, 3);
            reasons.push(`Indicators: ${topReasons.join('; ')}`);
        }

        // Consensus
        reasons.push(`Consensus: ${consensus.reason}`);

        return reasons;
    }

    /**
     * Calculate risk score
     */
    calculateRiskScore(confidence, patternPrediction, indicatorPrediction) {
        if (confidence >= 85) return 'LOW';
        if (confidence >= 75) return 'MEDIUM';
        return 'HIGH';
    }

    /**
     * Calculate trade duration
     */
    calculateTradeDuration(timeframe) {
        const durationMap = {
            '1M': '1 minute',
            '3M': '3 minutes',
            '5M': '5 minutes',
            '15M': '15 minutes',
            '30M': '30 minutes',
            '1H': '1 hour'
        };
        
        return durationMap[timeframe] || '5 minutes';
    }

    /**
     * Calculate price change
     */
    calculatePriceChange(candles) {
        if (candles.length < 2) return 0;
        
        const current = candles[candles.length - 1].close;
        const previous = candles[0].close;
        
        return ((current - previous) / previous) * 100;
    }

    /**
     * Calculate volatility
     */
    calculateVolatility(candles) {
        if (candles.length < 10) return 0;
        
        const returns = [];
        for (let i = 1; i < candles.length; i++) {
            const ret = (candles[i].close - candles[i-1].close) / candles[i-1].close;
            returns.push(ret);
        }
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance) * 100; // Convert to percentage
    }

    /**
     * Assess data quality
     */
    assessDataQuality(marketData) {
        let score = 100;
        
        if (!marketData.candles || marketData.candles.length < 20) score -= 30;
        if (!marketData.indicators) score -= 20;
        if (marketData.source === 'simulated') score -= 40;
        
        if (score >= 80) return 'HIGH';
        if (score >= 60) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Create no signal response
     */
    createNoSignal(signalId, pair, timeframe, reason) {
        this.performance.noSignals++;
        
        return {
            signalId,
            currency_pair: pair,
            timeframe,
            trade_duration: this.calculateTradeDuration(timeframe),
            signal: 'NO_SIGNAL',
            confidence: '0%',
            confidenceNumeric: 0,
            riskScore: 'HIGH',
            reason: [`No trade signal: ${reason}`],
            timestamp: new Date().toISOString(),
            metadata: {
                generatedBy: 'SignalConsensusEngine',
                version: '1.0.0',
                noSignalReason: reason
            }
        };
    }

    /**
     * Create error signal response
     */
    createErrorSignal(pair, timeframe, error) {
        return {
            signalId: `ERROR_${Date.now()}`,
            currency_pair: pair,
            timeframe,
            signal: 'ERROR',
            confidence: '0%',
            confidenceNumeric: 0,
            riskScore: 'HIGH',
            reason: [`Signal generation error: ${error}`],
            timestamp: new Date().toISOString(),
            error: error
        };
    }

    /**
     * Weighted consensus algorithm
     */
    weightedConsensus(patternPrediction, indicatorPrediction) {
        const patternWeight = 0.6; // Pattern matching gets higher weight
        const indicatorWeight = 0.4;
        
        const patternConf = patternPrediction.confidence || 0;
        const indicatorConf = indicatorPrediction.confidence || 0;
        
        const weightedConfidence = (patternConf * patternWeight) + (indicatorConf * indicatorWeight);
        
        // Determine direction based on higher confidence
        let direction = 'NO_SIGNAL';
        if (patternConf > indicatorConf && patternPrediction.direction !== 'NO_SIGNAL') {
            direction = patternPrediction.direction;
        } else if (indicatorConf > patternConf && indicatorPrediction.direction !== 'NO_SIGNAL') {
            direction = indicatorPrediction.direction;
        } else if (patternPrediction.direction === indicatorPrediction.direction) {
            direction = patternPrediction.direction;
        }
        
        return {
            signal: direction,
            confidence: Math.round(weightedConfidence),
            method: 'weighted'
        };
    }

    /**
     * Majority consensus algorithm
     */
    majorityConsensus(patternPrediction, indicatorPrediction) {
        const predictions = [patternPrediction, indicatorPrediction];
        const directions = predictions.map(p => p.direction).filter(d => d !== 'NO_SIGNAL');
        
        if (directions.length === 0) {
            return { signal: 'NO_SIGNAL', confidence: 0, method: 'majority' };
        }
        
        // Count occurrences
        const counts = {};
        directions.forEach(dir => {
            counts[dir] = (counts[dir] || 0) + 1;
        });
        
        // Find majority
        const maxCount = Math.max(...Object.values(counts));
        const majorityDirection = Object.keys(counts).find(key => counts[key] === maxCount);
        
        // Calculate average confidence for majority direction
        const majorityPredictions = predictions.filter(p => p.direction === majorityDirection);
        const avgConfidence = majorityPredictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / majorityPredictions.length;
        
        return {
            signal: majorityDirection,
            confidence: Math.round(avgConfidence),
            method: 'majority'
        };
    }

    /**
     * Conservative consensus algorithm
     */
    conservativeConsensus(patternPrediction, indicatorPrediction) {
        // Only signal if both agree and both have high confidence
        const minRequiredConfidence = 70;
        
        const patternConf = patternPrediction.confidence || 0;
        const indicatorConf = indicatorPrediction.confidence || 0;
        const patternDir = patternPrediction.direction;
        const indicatorDir = indicatorPrediction.direction;
        
        // Both must agree on direction
        if (patternDir !== indicatorDir || patternDir === 'NO_SIGNAL') {
            return { signal: 'NO_SIGNAL', confidence: 0, method: 'conservative' };
        }
        
        // Both must have sufficient confidence
        if (patternConf < minRequiredConfidence || indicatorConf < minRequiredConfidence) {
            return { signal: 'NO_SIGNAL', confidence: 0, method: 'conservative' };
        }
        
        // Take the lower confidence (more conservative)
        const conservativeConfidence = Math.min(patternConf, indicatorConf);
        
        return {
            signal: patternDir,
            confidence: Math.round(conservativeConfidence),
            method: 'conservative'
        };
    }

    /**
     * Log signal to file system
     */
    async logSignal(signal) {
        try {
            const logFile = path.join(
                this.config.logDirectory,
                `signals_${new Date().toISOString().split('T')[0]}.json`
            );

            let logs = [];
            if (await fs.pathExists(logFile)) {
                logs = await fs.readJson(logFile);
            }

            logs.push({
                ...signal,
                loggedAt: new Date().toISOString()
            });

            await fs.writeJson(logFile, logs, { spaces: 2 });

            // Also store in history
            this.signalHistory.push(signal);
            if (this.signalHistory.length > this.maxHistorySize) {
                this.signalHistory = this.signalHistory.slice(-this.maxHistorySize);
            }

        } catch (error) {
            console.error(`❌ Failed to log signal: ${error.message}`);
        }
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats(signal) {
        this.performance.totalSignals++;
        this.performance.lastSignalTime = signal.timestamp;

        if (signal.signal !== 'NO_SIGNAL' && signal.signal !== 'ERROR') {
            this.performance.consensusSignals++;
            
            // Update average confidence
            const totalConfidenceSignals = this.performance.consensusSignals;
            const currentAvg = this.performance.avgConfidence;
            this.performance.avgConfidence = 
                (currentAvg * (totalConfidenceSignals - 1) + signal.confidenceNumeric) / totalConfidenceSignals;
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        const total = this.performance.totalSignals;
        
        return {
            totalSignals: total,
            consensusSignals: this.performance.consensusSignals,
            conflictSignals: this.performance.conflictSignals,
            noSignals: this.performance.noSignals,
            consensusRate: total > 0 ? (this.performance.consensusSignals / total * 100).toFixed(1) : 0,
            avgConfidence: this.performance.avgConfidence.toFixed(1),
            lastSignalTime: this.performance.lastSignalTime,
            signalHistory: this.signalHistory.length
        };
    }

    /**
     * Get recent signals
     */
    getRecentSignals(limit = 10) {
        return this.signalHistory.slice(-limit).reverse();
    }

    /**
     * Health check
     */
    async healthCheck() {
        return {
            status: 'healthy',
            config: this.config,
            performance: this.getPerformanceStats(),
            logDirectory: await fs.pathExists(this.config.logDirectory)
        };
    }
}

module.exports = { SignalConsensusEngine };