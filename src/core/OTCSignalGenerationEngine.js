/**
 * OTC Signal Generation Engine
 * 
 * Complete CALL/PUT signal generation system for OTC binary options
 * combining screenshot analysis, pattern recognition, and historical matching.
 */

const { ImageProcessingPipeline } = require('./ImageProcessingPipeline');
const { PatternRecognitionSystem } = require('./PatternRecognitionSystem');
const { OTCHistoricalMatcher } = require('./OTCHistoricalMatcher');
const { SignalQualityValidator } = require('./SignalQualityValidator');
const { strictModeConfig } = require('../config/strict-mode');

class OTCSignalGenerationEngine {
    constructor(config = {}) {
        this.config = {
            minConfidence: config.minConfidence || 0.75,
            maxProcessingTime: config.maxProcessingTime || 30000, // 30 seconds
            supportedTimeframes: config.supportedTimeframes || ['1m', '2m', '3m', '5m'],
            supportedDurations: config.supportedDurations || [60, 120, 180, 300], // seconds
            ...config
        };

        // Initialize core components
        this.imageProcessor = new ImageProcessingPipeline();
        this.patternRecognizer = new PatternRecognitionSystem();
        this.historicalMatcher = new OTCHistoricalMatcher();
        this.qualityValidator = new SignalQualityValidator();

        this.generationHistory = [];
        this.performanceMetrics = {
            totalSignals: 0,
            successfulSignals: 0,
            averageConfidence: 0,
            averageProcessingTime: 0,
            lastGenerated: null
        };
    }

    /**
     * Generate OTC signal from screenshot
     */
    async generateSignalFromScreenshot(imageBuffer, options = {}) {
        const startTime = Date.now();
        const signalId = this.generateSignalId();
        
        console.log(`🎯 === STARTING OTC SIGNAL GENERATION ===`);
        console.log(`🆔 Signal ID: ${signalId}`);
        console.log(`📊 Asset: ${options.asset || 'UNKNOWN'}`);
        console.log(`⏰ Timeframe: ${options.timeframe || '1m'}`);
        console.log(`⏱️ Duration: ${options.duration || 60}s`);

        const generation = {
            id: signalId,
            timestamp: startTime,
            options,
            steps: {},
            result: null,
            error: null,
            processingTime: 0
        };

        try {
            // Step 1: Process screenshot
            console.log('📸 Step 1: Processing screenshot...');
            generation.steps.imageProcessing = await this.imageProcessor.processImage(
                imageBuffer, 
                `signal_${signalId}.png`
            );

            if (!generation.steps.imageProcessing.success) {
                throw new Error(`Image processing failed: ${generation.steps.imageProcessing.error}`);
            }

            // Step 2: Recognize patterns
            console.log('🔍 Step 2: Recognizing patterns...');
            generation.steps.patternRecognition = await this.patternRecognizer.recognizePatterns(
                generation.steps.imageProcessing.chartDetection,
                generation.steps.imageProcessing.elements,
                generation.steps.imageProcessing.marketData.ohlcvData
            );

            // Step 3: Match against historical data
            console.log('📚 Step 3: Matching historical patterns...');
            generation.steps.historicalMatching = await this.historicalMatcher.generateOTCPrediction(
                generation.steps.imageProcessing.marketData.ohlcvData,
                options.asset || 'UNKNOWN',
                options.timeframe || '1m',
                options.duration || 60
            );

            // Step 4: Combine signals and validate quality
            console.log('⚖️ Step 4: Combining signals and validating quality...');
            const combinedSignal = this.combineSignalSources(generation.steps);
            
            generation.steps.qualityValidation = await this.qualityValidator.validateSignal(
                combinedSignal,
                generation.steps.imageProcessing.marketData,
                { screenshot: generation.steps.patternRecognition }
            );

            // Step 5: Generate final signal
            console.log('🎯 Step 5: Generating final signal...');
            generation.result = this.generateFinalSignal(
                combinedSignal,
                generation.steps,
                options
            );

            // Apply strict mode validation
            if (strictModeConfig.isStrictModeEnabled()) {
                this.validateStrictMode(generation.result);
            }

            generation.processingTime = Date.now() - startTime;
            this.updatePerformanceMetrics(generation, true);

            console.log(`✅ === OTC SIGNAL GENERATION COMPLETED ===`);
            console.log(`🎯 Signal: ${generation.result.signal}`);
            console.log(`📊 Confidence: ${(generation.result.confidence * 100).toFixed(1)}%`);
            console.log(`⏱️ Processing Time: ${generation.processingTime}ms`);

            // Store generation history
            this.generationHistory.push(generation);
            if (this.generationHistory.length > 100) {
                this.generationHistory.shift();
            }

            return generation.result;

        } catch (error) {
            generation.error = error.message;
            generation.processingTime = Date.now() - startTime;
            this.updatePerformanceMetrics(generation, false);

            console.error(`❌ === OTC SIGNAL GENERATION FAILED ===`);
            console.error(`🆔 Signal ID: ${signalId}`);
            console.error(`❌ Error: ${error.message}`);
            console.error(`⏱️ Processing Time: ${generation.processingTime}ms`);

            throw error;
        }
    }

    /**
     * Combine signals from different sources
     */
    combineSignalSources(steps) {
        const signals = [];
        let totalWeight = 0;

        // Pattern recognition signals
        if (steps.patternRecognition && steps.patternRecognition.signals.length > 0) {
            steps.patternRecognition.signals.forEach(signal => {
                signals.push({
                    source: 'pattern_recognition',
                    direction: signal.direction,
                    confidence: signal.confidence,
                    weight: 0.4,
                    reasoning: signal.reasoning
                });
                totalWeight += 0.4;
            });
        }

        // Historical matching signals
        if (steps.historicalMatching && steps.historicalMatching.signal !== 'NO_SIGNAL') {
            signals.push({
                source: 'historical_matching',
                direction: steps.historicalMatching.signal,
                confidence: steps.historicalMatching.confidence,
                weight: 0.6,
                reasoning: steps.historicalMatching.reasoning
            });
            totalWeight += 0.6;
        }

        if (signals.length === 0) {
            throw new Error('No valid signals generated from any source');
        }

        // Calculate weighted consensus
        let callScore = 0;
        let putScore = 0;

        signals.forEach(signal => {
            const weightedConfidence = signal.confidence * signal.weight;
            if (signal.direction === 'CALL') {
                callScore += weightedConfidence;
            } else if (signal.direction === 'PUT') {
                putScore += weightedConfidence;
            }
        });

        const finalDirection = callScore > putScore ? 'CALL' : 'PUT';
        const finalConfidence = Math.max(callScore, putScore) / totalWeight;

        return {
            signal: finalDirection,
            confidence: finalConfidence,
            sources: signals,
            consensus: {
                callScore: callScore / totalWeight,
                putScore: putScore / totalWeight,
                agreement: Math.abs(callScore - putScore) / totalWeight
            }
        };
    }

    /**
     * Generate final signal with all metadata
     */
    generateFinalSignal(combinedSignal, steps, options) {
        const signal = {
            // Core signal data
            id: steps.id || this.generateSignalId(),
            signal: combinedSignal.signal,
            confidence: Math.round(combinedSignal.confidence * 100),
            
            // Trading parameters
            asset: options.asset || 'UNKNOWN',
            timeframe: options.timeframe || '1m',
            duration: options.duration || 60,
            
            // Analysis details
            analysis: {
                imageProcessing: {
                    confidence: steps.imageProcessing.metadata.confidence,
                    candleCount: steps.imageProcessing.marketData.metadata.candleCount,
                    currentPrice: steps.imageProcessing.marketData.currentPrice
                },
                patternRecognition: {
                    confidence: steps.patternRecognition.confidence,
                    patternsFound: {
                        candlestick: steps.patternRecognition.patterns.candlestick.length,
                        chart: steps.patternRecognition.patterns.chart.length,
                        indicator: steps.patternRecognition.patterns.indicator.length
                    }
                },
                historicalMatching: {
                    confidence: steps.historicalMatching.confidence,
                    matches: steps.historicalMatching.analysis.historicalMatches,
                    similarity: steps.historicalMatching.analysis.averageSimilarity
                }
            },
            
            // Quality metrics
            quality: {
                score: steps.qualityValidation.qualityScore,
                grade: this.calculateQualityGrade(steps.qualityValidation.qualityScore),
                passed: steps.qualityValidation.passed
            },
            
            // Signal reasoning
            reasoning: this.generateSignalReasoning(combinedSignal, steps),
            
            // Metadata
            metadata: {
                generatedAt: Date.now(),
                processingTime: Date.now() - steps.timestamp,
                strictMode: strictModeConfig.isStrictModeEnabled(),
                version: '2.0',
                dataSource: 'screenshot_analysis'
            },
            
            // Risk assessment
            risk: this.assessSignalRisk(combinedSignal, steps),
            
            // Recommendations
            recommendations: this.generateRecommendations(combinedSignal, steps)
        };

        return signal;
    }

    /**
     * Generate comprehensive signal reasoning
     */
    generateSignalReasoning(combinedSignal, steps) {
        const reasons = [];

        // Pattern recognition reasoning
        if (steps.patternRecognition.patterns.candlestick.length > 0) {
            const topPattern = steps.patternRecognition.patterns.candlestick[0];
            reasons.push(`${topPattern.name} candlestick pattern detected (${(topPattern.confidence * 100).toFixed(1)}% confidence)`);
        }

        if (steps.patternRecognition.patterns.chart.length > 0) {
            const topChart = steps.patternRecognition.patterns.chart[0];
            reasons.push(`${topChart.name} chart pattern identified (${(topChart.confidence * 100).toFixed(1)}% confidence)`);
        }

        // Historical matching reasoning
        if (steps.historicalMatching.signal !== 'NO_SIGNAL') {
            reasons.push(`Historical analysis: ${steps.historicalMatching.reasoning}`);
            reasons.push(`Based on ${steps.historicalMatching.analysis.historicalMatches} similar patterns`);
        }

        // Consensus reasoning
        const agreement = combinedSignal.consensus.agreement;
        if (agreement > 0.8) {
            reasons.push('Strong consensus between analysis methods');
        } else if (agreement > 0.6) {
            reasons.push('Moderate consensus between analysis methods');
        } else {
            reasons.push('Limited consensus - proceed with caution');
        }

        return reasons.join('. ');
    }

    /**
     * Assess signal risk level
     */
    assessSignalRisk(combinedSignal, steps) {
        let riskScore = 0;
        const factors = [];

        // Confidence-based risk
        if (combinedSignal.confidence < 0.7) {
            riskScore += 30;
            factors.push('Low confidence signal');
        } else if (combinedSignal.confidence < 0.8) {
            riskScore += 15;
            factors.push('Moderate confidence signal');
        }

        // Consensus-based risk
        if (combinedSignal.consensus.agreement < 0.6) {
            riskScore += 25;
            factors.push('Low consensus between methods');
        }

        // Data quality risk
        if (steps.imageProcessing.metadata.confidence < 0.8) {
            riskScore += 20;
            factors.push('Image processing quality concerns');
        }

        // Historical data risk
        if (steps.historicalMatching.analysis.historicalMatches < 20) {
            riskScore += 15;
            factors.push('Limited historical data');
        }

        let riskLevel = 'LOW';
        if (riskScore > 50) riskLevel = 'HIGH';
        else if (riskScore > 25) riskLevel = 'MEDIUM';

        return {
            level: riskLevel,
            score: Math.min(100, riskScore),
            factors
        };
    }

    /**
     * Generate trading recommendations
     */
    generateRecommendations(combinedSignal, steps) {
        const recommendations = [];

        // Confidence-based recommendations
        if (combinedSignal.confidence > 0.9) {
            recommendations.push('High confidence signal - consider standard position size');
        } else if (combinedSignal.confidence > 0.8) {
            recommendations.push('Good confidence signal - consider reduced position size');
        } else {
            recommendations.push('Lower confidence signal - consider minimal position size or skip');
        }

        // Risk-based recommendations
        const riskAssessment = this.assessSignalRisk(combinedSignal, steps);
        if (riskAssessment.level === 'HIGH') {
            recommendations.push('High risk detected - consider avoiding this trade');
        } else if (riskAssessment.level === 'MEDIUM') {
            recommendations.push('Medium risk - use proper risk management');
        }

        // Market condition recommendations
        if (steps.patternRecognition.patterns.indicator.length > 0) {
            recommendations.push('Technical indicators detected - confirm with additional analysis');
        }

        return recommendations;
    }

    /**
     * Validate strict mode requirements
     */
    validateStrictMode(signal) {
        const strictValidation = strictModeConfig.enforceStrictSignalGeneration(signal);
        
        if (!strictValidation.passed) {
            throw strictModeConfig.createStrictModeError(
                `Signal failed strict mode validation: ${strictValidation.errors.join(', ')}`
            );
        }

        // Additional OTC-specific strict mode checks
        if (signal.confidence < 75) {
            throw strictModeConfig.createStrictModeError(
                `OTC signal confidence too low for strict mode: ${signal.confidence}% < 75%`
            );
        }

        if (!signal.metadata.dataSource || signal.metadata.dataSource === 'fallback') {
            throw strictModeConfig.createStrictModeError(
                'OTC signal must be generated from real screenshot analysis'
            );
        }
    }

    /**
     * Calculate quality grade
     */
    calculateQualityGrade(score) {
        if (score >= 0.9) return 'A+';
        if (score >= 0.85) return 'A';
        if (score >= 0.8) return 'B+';
        if (score >= 0.75) return 'B';
        if (score >= 0.7) return 'C+';
        if (score >= 0.65) return 'C';
        if (score >= 0.6) return 'D';
        return 'F';
    }

    /**
     * Generate unique signal ID
     */
    generateSignalId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `OTC_${timestamp}_${random}`;
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(generation, success) {
        this.performanceMetrics.totalSignals++;
        
        if (success) {
            this.performanceMetrics.successfulSignals++;
            
            // Update average confidence
            const confidence = generation.result.confidence / 100;
            this.performanceMetrics.averageConfidence = 
                (this.performanceMetrics.averageConfidence * (this.performanceMetrics.successfulSignals - 1) + confidence) / 
                this.performanceMetrics.successfulSignals;
        }

        // Update average processing time
        this.performanceMetrics.averageProcessingTime = 
            (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalSignals - 1) + generation.processingTime) / 
            this.performanceMetrics.totalSignals;

        this.performanceMetrics.lastGenerated = Date.now();
    }

    /**
     * Get engine performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalSignals > 0 ? 
                this.performanceMetrics.successfulSignals / this.performanceMetrics.totalSignals : 0,
            componentMetrics: {
                imageProcessing: this.imageProcessor.getProcessingStats(),
                patternRecognition: this.patternRecognizer.getRecognitionStats(),
                historicalMatching: this.historicalMatcher.getPerformanceMetrics()
            }
        };
    }

    /**
     * Get generation history
     */
    getGenerationHistory(limit = 50) {
        return this.generationHistory.slice(-limit);
    }

    /**
     * Store historical outcome for learning
     */
    storeSignalOutcome(signalId, outcome, profit = 0) {
        const generation = this.generationHistory.find(g => g.id === signalId);
        if (generation && generation.result) {
            // Store in historical matcher for future learning
            this.historicalMatcher.storeHistoricalPattern(
                generation.steps.imageProcessing.marketData.ohlcvData,
                outcome === 'win' ? `${generation.result.signal}_WIN` : `${generation.result.signal}_LOSS`,
                {
                    symbol: generation.result.asset,
                    timeframe: generation.result.timeframe,
                    tradeDuration: generation.result.duration,
                    confidence: generation.result.confidence,
                    profit
                }
            );

            console.log(`📚 Stored outcome for signal ${signalId}: ${outcome} (profit: ${profit})`);
        }
    }
}

module.exports = { OTCSignalGenerationEngine };
