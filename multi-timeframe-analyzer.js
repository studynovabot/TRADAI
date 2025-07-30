#!/usr/bin/env node

/**
 * ⏱️ Multi-Timeframe Integration System
 * ====================================
 * 
 * Advanced multi-timeframe analysis with cross-timeframe confirmation
 * Supports 1m, 3m, and 5m timeframe analysis with confluence detection
 * 
 * Features:
 * - Cross-timeframe signal confirmation
 * - Timeframe hierarchy analysis
 * - Confluence detection across timeframes
 * - Trend alignment verification
 * - Multi-timeframe risk assessment
 * - Synchronized analysis coordination
 * 
 * Built for TRADAI Chart Analysis System
 */

class MultiTimeframeAnalyzer {
    constructor(options = {}) {
        this.options = {
            supportedTimeframes: ['1m', '3m', '5m'],
            timeframeWeights: {
                '1m': 0.2,  // Lower weight due to noise
                '3m': 0.3,  // Medium weight
                '5m': 0.5   // Higher weight for reliability
            },
            confluenceThreshold: 0.7,
            alignmentThreshold: 0.6,
            maxTimeframeDifference: 300000, // 5 minutes in milliseconds
            ...options
        };

        // Timeframe hierarchy (higher timeframes have more influence)
        this.timeframeHierarchy = ['5m', '3m', '1m'];

        // Analysis storage for each timeframe
        this.timeframeAnalyses = {
            '1m': null,
            '3m': null,
            '5m': null
        };

        // Multi-timeframe results
        this.multiTimeframeResults = {
            confluence: {},
            alignment: {},
            signals: [],
            recommendation: {},
            riskAssessment: {}
        };

        this.stats = {
            totalMultiTimeframeAnalyses: 0,
            confluenceDetections: 0,
            alignmentConfirmations: 0,
            crossTimeframeSignals: 0,
            timeframeConflicts: 0
        };
    }

    /**
     * Perform multi-timeframe analysis
     */
    async analyzeMultiTimeframe(timeframeAnalyses) {
        console.log('⏱️ Performing multi-timeframe analysis...');

        try {
            this.stats.totalMultiTimeframeAnalyses++;

            // Store individual timeframe analyses
            this.timeframeAnalyses = { ...timeframeAnalyses };

            // Reset multi-timeframe results
            this.resetMultiTimeframeResults();

            // Validate timeframe data
            const validTimeframes = this.validateTimeframeData();

            if (validTimeframes.length < 2) {
                throw new Error('Insufficient timeframe data for multi-timeframe analysis');
            }

            // Perform cross-timeframe confluence analysis
            await this.performCrossTimeframeConfluence(validTimeframes);

            // Analyze timeframe alignment
            await this.analyzeTimeframeAlignment(validTimeframes);

            // Generate multi-timeframe signals
            const signals = await this.generateMultiTimeframeSignals(validTimeframes);

            // Create unified recommendation
            const recommendation = await this.createUnifiedRecommendation(validTimeframes);

            // Assess multi-timeframe risk
            const riskAssessment = await this.assessMultiTimeframeRisk(validTimeframes);

            const result = {
                timestamp: new Date().toISOString(),
                timeframes: validTimeframes,
                confluence: this.multiTimeframeResults.confluence,
                alignment: this.multiTimeframeResults.alignment,
                signals,
                recommendation,
                riskAssessment,
                summary: this.generateMultiTimeframeSummary()
            };

            console.log(`✅ Multi-timeframe analysis completed`);
            console.log(`   Timeframes analyzed: ${validTimeframes.join(', ')}`);
            console.log(`   Confluence strength: ${this.multiTimeframeResults.confluence.strength?.toFixed(2) || 'N/A'}`);
            console.log(`   Alignment score: ${this.multiTimeframeResults.alignment.score?.toFixed(2) || 'N/A'}`);

            return result;

        } catch (error) {
            console.error(`❌ Multi-timeframe analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate timeframe data availability and quality
     */
    validateTimeframeData() {
        const validTimeframes = [];

        for (const timeframe of this.options.supportedTimeframes) {
            const analysis = this.timeframeAnalyses[timeframe];
            
            if (analysis && this.isAnalysisValid(analysis)) {
                validTimeframes.push(timeframe);
            }
        }

        return validTimeframes;
    }

    /**
     * Check if individual timeframe analysis is valid
     */
    isAnalysisValid(analysis) {
        // Check if analysis has required components
        return analysis && 
               analysis.signals && 
               analysis.signals.length > 0 &&
               analysis.timestamp &&
               (Date.now() - new Date(analysis.timestamp).getTime()) < this.options.maxTimeframeDifference;
    }

    /**
     * Perform cross-timeframe confluence analysis
     */
    async performCrossTimeframeConfluence(validTimeframes) {
        const confluenceData = {
            bullishSignals: {},
            bearishSignals: {},
            neutralSignals: {},
            totalSignals: 0,
            strength: 0,
            direction: 'NEUTRAL'
        };

        // Collect signals from each timeframe
        validTimeframes.forEach(timeframe => {
            const analysis = this.timeframeAnalyses[timeframe];
            const weight = this.options.timeframeWeights[timeframe] || 0.33;

            confluenceData.bullishSignals[timeframe] = 0;
            confluenceData.bearishSignals[timeframe] = 0;
            confluenceData.neutralSignals[timeframe] = 0;

            if (analysis.signals) {
                analysis.signals.forEach(signal => {
                    confluenceData.totalSignals++;
                    
                    if (signal.signal === 'BULLISH' || signal.signal === 'UP') {
                        confluenceData.bullishSignals[timeframe] += weight;
                    } else if (signal.signal === 'BEARISH' || signal.signal === 'DOWN') {
                        confluenceData.bearishSignals[timeframe] += weight;
                    } else {
                        confluenceData.neutralSignals[timeframe] += weight;
                    }
                });
            }
        });

        // Calculate overall confluence
        const totalBullish = Object.values(confluenceData.bullishSignals).reduce((sum, val) => sum + val, 0);
        const totalBearish = Object.values(confluenceData.bearishSignals).reduce((sum, val) => sum + val, 0);
        const totalNeutral = Object.values(confluenceData.neutralSignals).reduce((sum, val) => sum + val, 0);

        const maxSignal = Math.max(totalBullish, totalBearish, totalNeutral);
        confluenceData.strength = maxSignal / (totalBullish + totalBearish + totalNeutral);

        if (maxSignal === totalBullish) {
            confluenceData.direction = 'BULLISH';
        } else if (maxSignal === totalBearish) {
            confluenceData.direction = 'BEARISH';
        }

        this.multiTimeframeResults.confluence = confluenceData;

        if (confluenceData.strength >= this.options.confluenceThreshold) {
            this.stats.confluenceDetections++;
        }

        return confluenceData;
    }

    /**
     * Analyze timeframe alignment
     */
    async analyzeTimeframeAlignment(validTimeframes) {
        const alignmentData = {
            trendAlignment: {},
            signalAlignment: {},
            score: 0,
            conflicts: [],
            consensus: 'NONE'
        };

        // Analyze trend alignment across timeframes
        const trends = {};
        validTimeframes.forEach(timeframe => {
            const analysis = this.timeframeAnalyses[timeframe];
            if (analysis.trendAnalysis && analysis.trendAnalysis.direction) {
                trends[timeframe] = analysis.trendAnalysis.direction;
            }
        });

        // Calculate trend alignment score
        const trendValues = Object.values(trends);
        const uniqueTrends = [...new Set(trendValues)];
        
        if (uniqueTrends.length === 1 && uniqueTrends[0] !== 'UNKNOWN') {
            alignmentData.trendAlignment.score = 1.0;
            alignmentData.trendAlignment.direction = uniqueTrends[0];
        } else {
            const trendCounts = {};
            trendValues.forEach(trend => {
                trendCounts[trend] = (trendCounts[trend] || 0) + 1;
            });
            
            const maxCount = Math.max(...Object.values(trendCounts));
            alignmentData.trendAlignment.score = maxCount / trendValues.length;
            alignmentData.trendAlignment.direction = Object.keys(trendCounts)
                .find(trend => trendCounts[trend] === maxCount);
        }

        // Analyze signal alignment
        const signalDirections = {};
        validTimeframes.forEach(timeframe => {
            const analysis = this.timeframeAnalyses[timeframe];
            if (analysis.signals && analysis.signals.length > 0) {
                // Get the strongest signal from this timeframe
                const strongestSignal = analysis.signals.reduce((prev, current) => 
                    (current.confidence > prev.confidence) ? current : prev
                );
                signalDirections[timeframe] = strongestSignal.signal;
            }
        });

        // Calculate signal alignment score
        const signalValues = Object.values(signalDirections);
        const uniqueSignals = [...new Set(signalValues)];
        
        if (uniqueSignals.length === 1) {
            alignmentData.signalAlignment.score = 1.0;
            alignmentData.signalAlignment.direction = uniqueSignals[0];
        } else {
            const signalCounts = {};
            signalValues.forEach(signal => {
                signalCounts[signal] = (signalCounts[signal] || 0) + 1;
            });
            
            const maxCount = Math.max(...Object.values(signalCounts));
            alignmentData.signalAlignment.score = maxCount / signalValues.length;
            alignmentData.signalAlignment.direction = Object.keys(signalCounts)
                .find(signal => signalCounts[signal] === maxCount);
        }

        // Calculate overall alignment score
        alignmentData.score = (alignmentData.trendAlignment.score + alignmentData.signalAlignment.score) / 2;

        // Detect conflicts
        if (alignmentData.trendAlignment.direction !== alignmentData.signalAlignment.direction) {
            alignmentData.conflicts.push({
                type: 'TREND_SIGNAL_CONFLICT',
                description: `Trend direction (${alignmentData.trendAlignment.direction}) conflicts with signal direction (${alignmentData.signalAlignment.direction})`
            });
            this.stats.timeframeConflicts++;
        }

        // Determine consensus
        if (alignmentData.score >= this.options.alignmentThreshold) {
            alignmentData.consensus = alignmentData.signalAlignment.direction;
            this.stats.alignmentConfirmations++;
        }

        this.multiTimeframeResults.alignment = alignmentData;
        return alignmentData;
    }

    /**
     * Generate multi-timeframe signals
     */
    async generateMultiTimeframeSignals(validTimeframes) {
        const signals = [];

        // Confluence-based signal
        const confluence = this.multiTimeframeResults.confluence;
        if (confluence.strength >= this.options.confluenceThreshold) {
            signals.push({
                type: 'MULTI_TIMEFRAME_CONFLUENCE',
                signal: confluence.direction,
                confidence: confluence.strength,
                timeframes: validTimeframes,
                weight: 0.9
            });
            this.stats.crossTimeframeSignals++;
        }

        // Alignment-based signal
        const alignment = this.multiTimeframeResults.alignment;
        if (alignment.score >= this.options.alignmentThreshold) {
            signals.push({
                type: 'TIMEFRAME_ALIGNMENT',
                signal: alignment.consensus,
                confidence: alignment.score,
                timeframes: validTimeframes,
                weight: 0.8
            });
        }

        // Higher timeframe confirmation signal
        const higherTimeframeSignal = this.getHigherTimeframeSignal(validTimeframes);
        if (higherTimeframeSignal) {
            signals.push({
                type: 'HIGHER_TIMEFRAME_CONFIRMATION',
                signal: higherTimeframeSignal.signal,
                confidence: higherTimeframeSignal.confidence,
                timeframe: higherTimeframeSignal.timeframe,
                weight: 0.7
            });
        }

        return signals;
    }

    /**
     * Get signal from highest available timeframe
     */
    getHigherTimeframeSignal(validTimeframes) {
        for (const timeframe of this.timeframeHierarchy) {
            if (validTimeframes.includes(timeframe)) {
                const analysis = this.timeframeAnalyses[timeframe];
                if (analysis.signals && analysis.signals.length > 0) {
                    const strongestSignal = analysis.signals.reduce((prev, current) => 
                        (current.confidence > prev.confidence) ? current : prev
                    );
                    
                    return {
                        signal: strongestSignal.signal,
                        confidence: strongestSignal.confidence,
                        timeframe: timeframe
                    };
                }
            }
        }
        return null;
    }

    /**
     * Create unified recommendation
     */
    async createUnifiedRecommendation(validTimeframes) {
        const recommendation = {
            action: 'NO TRADE',
            confidence: 0,
            reasoning: '',
            timeframeSupport: {},
            riskLevel: 'HIGH'
        };

        const confluence = this.multiTimeframeResults.confluence;
        const alignment = this.multiTimeframeResults.alignment;

        // Calculate unified confidence
        let unifiedConfidence = 0;
        let supportingFactors = 0;

        if (confluence.strength >= this.options.confluenceThreshold) {
            unifiedConfidence += confluence.strength * 0.4;
            supportingFactors++;
        }

        if (alignment.score >= this.options.alignmentThreshold) {
            unifiedConfidence += alignment.score * 0.4;
            supportingFactors++;
        }

        // Add higher timeframe weight
        const higherTimeframeSignal = this.getHigherTimeframeSignal(validTimeframes);
        if (higherTimeframeSignal && higherTimeframeSignal.confidence > 0.7) {
            unifiedConfidence += higherTimeframeSignal.confidence * 0.2;
            supportingFactors++;
        }

        recommendation.confidence = Math.min(unifiedConfidence, 1.0);

        // Determine action based on confluence and alignment
        if (confluence.direction === alignment.consensus && 
            confluence.strength >= this.options.confluenceThreshold &&
            alignment.score >= this.options.alignmentThreshold) {
            
            recommendation.action = confluence.direction === 'BULLISH' ? 'BUY' : 'SELL';
            recommendation.riskLevel = supportingFactors >= 2 ? 'LOW' : 'MEDIUM';
            recommendation.reasoning = `Strong multi-timeframe ${confluence.direction.toLowerCase()} confluence with ${(confluence.strength * 100).toFixed(1)}% strength and ${(alignment.score * 100).toFixed(1)}% alignment`;
        } else if (supportingFactors >= 1) {
            recommendation.action = 'CAUTION';
            recommendation.riskLevel = 'MEDIUM';
            recommendation.reasoning = 'Partial multi-timeframe agreement - trade with caution';
        } else {
            recommendation.reasoning = 'Insufficient multi-timeframe confluence for trading';
        }

        // Add timeframe support details
        validTimeframes.forEach(timeframe => {
            const analysis = this.timeframeAnalyses[timeframe];
            recommendation.timeframeSupport[timeframe] = {
                signals: analysis.signals?.length || 0,
                trend: analysis.trendAnalysis?.direction || 'UNKNOWN',
                confidence: analysis.confidence || 0
            };
        });

        return recommendation;
    }

    /**
     * Assess multi-timeframe risk
     */
    async assessMultiTimeframeRisk(validTimeframes) {
        const riskAssessment = {
            overallRisk: 0.5,
            timeframeRisks: {},
            conflictRisk: 0,
            alignmentRisk: 0,
            recommendation: 'MODERATE_RISK'
        };

        // Calculate risk for each timeframe
        validTimeframes.forEach(timeframe => {
            const analysis = this.timeframeAnalyses[timeframe];
            const weight = this.options.timeframeWeights[timeframe];
            
            let timeframeRisk = 0.5; // Base risk
            
            if (analysis.riskAssessment) {
                timeframeRisk = analysis.riskAssessment.riskScore || 0.5;
            }
            
            riskAssessment.timeframeRisks[timeframe] = timeframeRisk;
            riskAssessment.overallRisk += timeframeRisk * weight;
        });

        // Normalize overall risk
        riskAssessment.overallRisk = riskAssessment.overallRisk / validTimeframes.length;

        // Add conflict risk
        const alignment = this.multiTimeframeResults.alignment;
        riskAssessment.conflictRisk = 1 - alignment.score;
        riskAssessment.alignmentRisk = alignment.conflicts.length * 0.2;

        // Adjust overall risk based on conflicts
        riskAssessment.overallRisk += riskAssessment.conflictRisk * 0.2;
        riskAssessment.overallRisk += riskAssessment.alignmentRisk;
        riskAssessment.overallRisk = Math.min(riskAssessment.overallRisk, 1.0);

        // Determine risk recommendation
        if (riskAssessment.overallRisk > 0.7) {
            riskAssessment.recommendation = 'HIGH_RISK';
        } else if (riskAssessment.overallRisk > 0.4) {
            riskAssessment.recommendation = 'MODERATE_RISK';
        } else {
            riskAssessment.recommendation = 'LOW_RISK';
        }

        return riskAssessment;
    }

    /**
     * Generate multi-timeframe summary
     */
    generateMultiTimeframeSummary() {
        const confluence = this.multiTimeframeResults.confluence;
        const alignment = this.multiTimeframeResults.alignment;

        return {
            timeframesAnalyzed: Object.keys(this.timeframeAnalyses).filter(tf => this.timeframeAnalyses[tf]),
            confluenceStrength: confluence.strength,
            confluenceDirection: confluence.direction,
            alignmentScore: alignment.score,
            alignmentConsensus: alignment.consensus,
            conflicts: alignment.conflicts.length,
            overallRecommendation: this.multiTimeframeResults.recommendation?.action || 'UNKNOWN'
        };
    }

    /**
     * Utility methods
     */
    resetMultiTimeframeResults() {
        this.multiTimeframeResults = {
            confluence: {},
            alignment: {},
            signals: [],
            recommendation: {},
            riskAssessment: {}
        };
    }

    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            ...this.stats,
            confluenceRate: this.stats.totalMultiTimeframeAnalyses > 0 ? 
                (this.stats.confluenceDetections / this.stats.totalMultiTimeframeAnalyses * 100).toFixed(1) + '%' : '0%',
            alignmentRate: this.stats.totalMultiTimeframeAnalyses > 0 ? 
                (this.stats.alignmentConfirmations / this.stats.totalMultiTimeframeAnalyses * 100).toFixed(1) + '%' : '0%',
            conflictRate: this.stats.totalMultiTimeframeAnalyses > 0 ? 
                (this.stats.timeframeConflicts / this.stats.totalMultiTimeframeAnalyses * 100).toFixed(1) + '%' : '0%'
        };
    }
}

module.exports = { MultiTimeframeAnalyzer };
