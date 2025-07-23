/**
 * Multi-Timeframe OTC Analyzer
 * 
 * Analyzes OTC binary options across multiple timeframes (1m, 2m, 3m, 5m)
 * to provide comprehensive signal validation and confluence analysis.
 */

const { OTCSignalGenerationEngine } = require('./OTCSignalGenerationEngine');
const { MultiTimeframeConfluenceAnalyzer } = require('./MultiTimeframeConfluenceAnalyzer');

class MultiTimeframeOTCAnalyzer {
    constructor(config = {}) {
        this.config = {
            timeframes: config.timeframes || ['1m', '2m', '3m', '5m'],
            minConfluence: config.minConfluence || 0.75,
            minTimeframeAgreement: config.minTimeframeAgreement || 0.6,
            maxAnalysisTime: config.maxAnalysisTime || 45000, // 45 seconds
            ...config
        };

        this.signalEngine = new OTCSignalGenerationEngine();
        this.confluenceAnalyzer = new MultiTimeframeConfluenceAnalyzer({
            timeframes: this.config.timeframes,
            minConfluence: this.config.minConfluence
        });

        this.analysisHistory = [];
        this.performanceMetrics = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            averageConfluence: 0,
            averageProcessingTime: 0
        };
    }

    /**
     * Perform comprehensive multi-timeframe analysis
     */
    async analyzeMultiTimeframe(imageBuffer, options = {}) {
        const startTime = Date.now();
        const analysisId = this.generateAnalysisId();

        console.log(`🔍 === STARTING MULTI-TIMEFRAME OTC ANALYSIS ===`);
        console.log(`🆔 Analysis ID: ${analysisId}`);
        console.log(`📊 Asset: ${options.asset || 'UNKNOWN'}`);
        console.log(`⏰ Timeframes: ${this.config.timeframes.join(', ')}`);

        const analysis = {
            id: analysisId,
            timestamp: startTime,
            asset: options.asset,
            timeframeAnalysis: {},
            confluence: null,
            finalSignal: null,
            processingTime: 0,
            success: false
        };

        try {
            // Step 1: Analyze each timeframe
            console.log('📊 Step 1: Analyzing individual timeframes...');
            for (const timeframe of this.config.timeframes) {
                console.log(`  🔍 Analyzing ${timeframe} timeframe...`);
                
                try {
                    const timeframeOptions = { ...options, timeframe };
                    const signal = await this.signalEngine.generateSignalFromScreenshot(
                        imageBuffer, 
                        timeframeOptions
                    );

                    analysis.timeframeAnalysis[timeframe] = {
                        success: true,
                        signal: signal.signal,
                        confidence: signal.confidence,
                        quality: signal.quality,
                        analysis: signal.analysis,
                        risk: signal.risk,
                        processingTime: signal.metadata.processingTime
                    };

                    console.log(`    ✅ ${timeframe}: ${signal.signal} (${signal.confidence}%)`);

                } catch (error) {
                    console.warn(`    ❌ ${timeframe} analysis failed: ${error.message}`);
                    analysis.timeframeAnalysis[timeframe] = {
                        success: false,
                        error: error.message
                    };
                }
            }

            // Step 2: Calculate confluence
            console.log('⚖️ Step 2: Calculating timeframe confluence...');
            analysis.confluence = this.calculateTimeframeConfluence(analysis.timeframeAnalysis);

            // Step 3: Generate final consensus signal
            console.log('🎯 Step 3: Generating consensus signal...');
            analysis.finalSignal = this.generateConsensusSignal(
                analysis.timeframeAnalysis,
                analysis.confluence,
                options
            );

            analysis.processingTime = Date.now() - startTime;
            analysis.success = true;

            this.updatePerformanceMetrics(analysis, true);

            console.log(`✅ === MULTI-TIMEFRAME ANALYSIS COMPLETED ===`);
            console.log(`🎯 Consensus Signal: ${analysis.finalSignal.signal}`);
            console.log(`📊 Confluence: ${(analysis.confluence.score * 100).toFixed(1)}%`);
            console.log(`⏱️ Total Processing Time: ${analysis.processingTime}ms`);

            // Store analysis history
            this.analysisHistory.push(analysis);
            if (this.analysisHistory.length > 50) {
                this.analysisHistory.shift();
            }

            return analysis;

        } catch (error) {
            analysis.processingTime = Date.now() - startTime;
            analysis.error = error.message;
            this.updatePerformanceMetrics(analysis, false);

            console.error(`❌ === MULTI-TIMEFRAME ANALYSIS FAILED ===`);
            console.error(`🆔 Analysis ID: ${analysisId}`);
            console.error(`❌ Error: ${error.message}`);

            throw error;
        }
    }

    /**
     * Calculate confluence between timeframes
     */
    calculateTimeframeConfluence(timeframeAnalysis) {
        const successfulAnalyses = Object.entries(timeframeAnalysis)
            .filter(([tf, analysis]) => analysis.success);

        if (successfulAnalyses.length === 0) {
            throw new Error('No successful timeframe analyses to calculate confluence');
        }

        const confluence = {
            totalTimeframes: Object.keys(timeframeAnalysis).length,
            successfulTimeframes: successfulAnalyses.length,
            signals: {},
            agreement: 0,
            score: 0,
            strength: 'weak'
        };

        // Count signal directions
        let callCount = 0;
        let putCount = 0;
        let totalConfidence = 0;
        let weightedCallScore = 0;
        let weightedPutScore = 0;
        let totalWeight = 0;

        successfulAnalyses.forEach(([timeframe, analysis]) => {
            confluence.signals[timeframe] = {
                signal: analysis.signal,
                confidence: analysis.confidence,
                quality: analysis.quality.score
            };

            // Weight by confidence and quality
            const weight = (analysis.confidence / 100) * analysis.quality.score;
            totalWeight += weight;
            totalConfidence += analysis.confidence;

            if (analysis.signal === 'CALL') {
                callCount++;
                weightedCallScore += weight;
            } else if (analysis.signal === 'PUT') {
                putCount++;
                weightedPutScore += weight;
            }
        });

        // Calculate agreement metrics
        confluence.agreement = Math.max(callCount, putCount) / successfulAnalyses.length;
        confluence.averageConfidence = totalConfidence / successfulAnalyses.length;

        // Calculate weighted confluence score
        if (totalWeight > 0) {
            const maxWeightedScore = Math.max(weightedCallScore, weightedPutScore);
            confluence.score = maxWeightedScore / totalWeight;
        }

        // Determine confluence strength
        if (confluence.score >= 0.8 && confluence.agreement >= 0.8) {
            confluence.strength = 'very_strong';
        } else if (confluence.score >= 0.7 && confluence.agreement >= 0.7) {
            confluence.strength = 'strong';
        } else if (confluence.score >= 0.6 && confluence.agreement >= 0.6) {
            confluence.strength = 'moderate';
        } else {
            confluence.strength = 'weak';
        }

        // Determine dominant signal
        confluence.dominantSignal = weightedCallScore > weightedPutScore ? 'CALL' : 'PUT';
        confluence.signalStrength = Math.abs(weightedCallScore - weightedPutScore) / totalWeight;

        return confluence;
    }

    /**
     * Generate consensus signal from multi-timeframe analysis
     */
    generateConsensusSignal(timeframeAnalysis, confluence, options) {
        // Validate confluence requirements
        if (confluence.score < this.config.minConfluence) {
            throw new Error(`Confluence too low: ${confluence.score.toFixed(2)} < ${this.config.minConfluence}`);
        }

        if (confluence.agreement < this.config.minTimeframeAgreement) {
            throw new Error(`Timeframe agreement too low: ${confluence.agreement.toFixed(2)} < ${this.config.minTimeframeAgreement}`);
        }

        const consensusSignal = {
            id: this.generateSignalId(),
            signal: confluence.dominantSignal,
            confidence: Math.round(confluence.score * 100),
            
            // Asset and timing
            asset: options.asset || 'UNKNOWN',
            timeframe: 'MULTI',
            duration: options.duration || 60,
            
            // Multi-timeframe analysis
            multiTimeframeAnalysis: {
                totalTimeframes: confluence.totalTimeframes,
                successfulTimeframes: confluence.successfulTimeframes,
                agreement: confluence.agreement,
                confluenceScore: confluence.score,
                confluenceStrength: confluence.strength,
                timeframeSignals: confluence.signals
            },
            
            // Quality assessment
            quality: {
                score: confluence.score,
                grade: this.calculateQualityGrade(confluence.score),
                strength: confluence.strength
            },
            
            // Risk assessment
            risk: this.assessMultiTimeframeRisk(confluence, timeframeAnalysis),
            
            // Reasoning
            reasoning: this.generateMultiTimeframeReasoning(confluence, timeframeAnalysis),
            
            // Recommendations
            recommendations: this.generateMultiTimeframeRecommendations(confluence),
            
            // Metadata
            metadata: {
                generatedAt: Date.now(),
                analysisType: 'multi_timeframe',
                version: '2.0',
                strictMode: true
            }
        };

        return consensusSignal;
    }

    /**
     * Assess risk for multi-timeframe signal
     */
    assessMultiTimeframeRisk(confluence, timeframeAnalysis) {
        let riskScore = 0;
        const factors = [];

        // Confluence-based risk
        if (confluence.score < 0.8) {
            riskScore += 20;
            factors.push('Moderate confluence between timeframes');
        }

        if (confluence.agreement < 0.7) {
            riskScore += 25;
            factors.push('Limited agreement between timeframes');
        }

        // Failed timeframe analysis risk
        const failedTimeframes = confluence.totalTimeframes - confluence.successfulTimeframes;
        if (failedTimeframes > 0) {
            riskScore += failedTimeframes * 10;
            factors.push(`${failedTimeframes} timeframe(s) failed analysis`);
        }

        // Quality-based risk
        const successfulAnalyses = Object.values(timeframeAnalysis).filter(a => a.success);
        const avgQuality = successfulAnalyses.reduce((sum, a) => sum + a.quality.score, 0) / successfulAnalyses.length;
        
        if (avgQuality < 0.8) {
            riskScore += 15;
            factors.push('Below average signal quality');
        }

        // Confidence spread risk
        const confidences = successfulAnalyses.map(a => a.confidence);
        const confidenceSpread = Math.max(...confidences) - Math.min(...confidences);
        
        if (confidenceSpread > 30) {
            riskScore += 20;
            factors.push('High confidence spread between timeframes');
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
     * Generate reasoning for multi-timeframe signal
     */
    generateMultiTimeframeReasoning(confluence, timeframeAnalysis) {
        const reasons = [];

        // Confluence reasoning
        reasons.push(`${confluence.successfulTimeframes}/${confluence.totalTimeframes} timeframes analyzed successfully`);
        reasons.push(`${(confluence.agreement * 100).toFixed(1)}% agreement on ${confluence.dominantSignal} direction`);
        reasons.push(`${confluence.strength} confluence with ${(confluence.score * 100).toFixed(1)}% score`);

        // Individual timeframe highlights
        const successfulAnalyses = Object.entries(timeframeAnalysis)
            .filter(([tf, analysis]) => analysis.success)
            .sort((a, b) => b[1].confidence - a[1].confidence);

        if (successfulAnalyses.length > 0) {
            const strongest = successfulAnalyses[0];
            reasons.push(`Strongest signal from ${strongest[0]} timeframe (${strongest[1].confidence}% confidence)`);
        }

        return reasons.join('. ');
    }

    /**
     * Generate recommendations for multi-timeframe signal
     */
    generateMultiTimeframeRecommendations(confluence) {
        const recommendations = [];

        // Confluence-based recommendations
        if (confluence.strength === 'very_strong') {
            recommendations.push('Very strong multi-timeframe confluence - high confidence trade');
        } else if (confluence.strength === 'strong') {
            recommendations.push('Strong multi-timeframe confluence - good trade opportunity');
        } else if (confluence.strength === 'moderate') {
            recommendations.push('Moderate confluence - consider reduced position size');
        }

        // Agreement-based recommendations
        if (confluence.agreement >= 0.8) {
            recommendations.push('High timeframe agreement supports signal reliability');
        } else if (confluence.agreement >= 0.6) {
            recommendations.push('Moderate timeframe agreement - monitor closely');
        }

        // Success rate recommendations
        const successRate = confluence.successfulTimeframes / confluence.totalTimeframes;
        if (successRate < 0.75) {
            recommendations.push('Some timeframes failed analysis - exercise caution');
        }

        return recommendations;
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
        return 'D';
    }

    /**
     * Generate unique analysis ID
     */
    generateAnalysisId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `MTF_${timestamp}_${random}`;
    }

    /**
     * Generate unique signal ID
     */
    generateSignalId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `MTF_SIGNAL_${timestamp}_${random}`;
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(analysis, success) {
        this.performanceMetrics.totalAnalyses++;
        
        if (success) {
            this.performanceMetrics.successfulAnalyses++;
            
            if (analysis.confluence) {
                this.performanceMetrics.averageConfluence = 
                    (this.performanceMetrics.averageConfluence * (this.performanceMetrics.successfulAnalyses - 1) + 
                     analysis.confluence.score) / this.performanceMetrics.successfulAnalyses;
            }
        }

        this.performanceMetrics.averageProcessingTime = 
            (this.performanceMetrics.averageProcessingTime * (this.performanceMetrics.totalAnalyses - 1) + 
             analysis.processingTime) / this.performanceMetrics.totalAnalyses;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalAnalyses > 0 ? 
                this.performanceMetrics.successfulAnalyses / this.performanceMetrics.totalAnalyses : 0,
            signalEngineMetrics: this.signalEngine.getPerformanceMetrics()
        };
    }

    /**
     * Get analysis history
     */
    getAnalysisHistory(limit = 20) {
        return this.analysisHistory.slice(-limit);
    }

    /**
     * Store signal outcome for all timeframes
     */
    storeMultiTimeframeOutcome(analysisId, outcome, profit = 0) {
        const analysis = this.analysisHistory.find(a => a.id === analysisId);
        if (analysis && analysis.finalSignal) {
            // Store outcome for the consensus signal
            this.signalEngine.storeSignalOutcome(analysis.finalSignal.id, outcome, profit);
            
            console.log(`📚 Stored multi-timeframe outcome for analysis ${analysisId}: ${outcome} (profit: ${profit})`);
        }
    }
}

module.exports = { MultiTimeframeOTCAnalyzer };
