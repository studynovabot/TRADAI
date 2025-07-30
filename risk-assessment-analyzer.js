#!/usr/bin/env node

/**
 * ⚠️ Risk Assessment & Market Condition Analysis Module
 * ====================================================
 * 
 * Intelligent risk assessment to identify non-tradable market conditions
 * Provides warnings for 'fishy' or unsuitable trading environments
 * 
 * Features:
 * - Market volatility assessment
 * - Trend reliability analysis
 * - Signal quality evaluation
 * - Risk factor identification
 * - Trading suitability scoring
 * - Market condition warnings
 * 
 * Built for TRADAI Chart Analysis System
 */

class RiskAssessmentAnalyzer {
    constructor(options = {}) {
        this.options = {
            maxVolatilityThreshold: 0.8,
            minTrendReliability: 0.6,
            minSignalQuality: 0.7,
            maxRiskScore: 0.7,
            volatilityWindow: 20,
            uncertaintyThreshold: 0.5,
            ...options
        };

        // Risk factors and weights
        this.riskFactors = {
            volatility: 0.25,
            trendReliability: 0.20,
            signalQuality: 0.20,
            marketStructure: 0.15,
            confluence: 0.10,
            timeframe: 0.10
        };

        // Analysis results storage
        this.analysisResults = {
            riskScore: 0,
            riskLevel: 'UNKNOWN',
            marketCondition: 'UNKNOWN',
            riskFactors: {},
            warnings: [],
            tradingSuitability: 'UNKNOWN',
            recommendations: []
        };

        this.stats = {
            totalAssessments: 0,
            highRiskDetections: 0,
            mediumRiskDetections: 0,
            lowRiskDetections: 0,
            tradingWarnings: 0,
            noTradeRecommendations: 0
        };
    }

    /**
     * Perform comprehensive risk assessment
     */
    async assessRisk(aiAnalysisText, technicalAnalysis, patternAnalysis, supportResistanceAnalysis, chartData) {
        console.log(`⚠️ Assessing risk for ${chartData.timeframe}/${chartData.filename}`);

        try {
            this.stats.totalAssessments++;

            // Reset analysis results
            this.resetAnalysisResults();

            // Assess individual risk factors
            await this.assessVolatilityRisk(aiAnalysisText, technicalAnalysis);
            await this.assessTrendReliabilityRisk(aiAnalysisText, patternAnalysis);
            await this.assessSignalQualityRisk(technicalAnalysis, patternAnalysis);
            await this.assessMarketStructureRisk(aiAnalysisText, supportResistanceAnalysis);
            await this.assessConfluenceRisk(technicalAnalysis, patternAnalysis);
            await this.assessTimeframeRisk(chartData.timeframe);

            // Calculate overall risk score
            const overallRiskScore = this.calculateOverallRiskScore();

            // Determine risk level and market condition
            const riskLevel = this.determineRiskLevel(overallRiskScore);
            const marketCondition = this.assessMarketCondition(aiAnalysisText);

            // Generate warnings and recommendations
            const warnings = this.generateRiskWarnings();
            const recommendations = this.generateRiskRecommendations();

            // Assess trading suitability
            const tradingSuitability = this.assessTradingSuitability(overallRiskScore, warnings);

            // Update statistics
            this.updateRiskStatistics(riskLevel, warnings, tradingSuitability);

            const result = {
                chartData,
                timestamp: new Date().toISOString(),
                riskAssessment: {
                    ...this.analysisResults,
                    riskScore: overallRiskScore,
                    riskLevel,
                    marketCondition,
                    warnings,
                    recommendations,
                    tradingSuitability
                },
                summary: this.generateRiskSummary(overallRiskScore, riskLevel, tradingSuitability)
            };

            console.log(`✅ Risk assessment completed`);
            console.log(`   Risk level: ${riskLevel}`);
            console.log(`   Risk score: ${overallRiskScore.toFixed(2)}`);
            console.log(`   Trading suitability: ${tradingSuitability}`);
            console.log(`   Warnings: ${warnings.length}`);

            return result;

        } catch (error) {
            console.error(`❌ Risk assessment failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Assess volatility risk
     */
    async assessVolatilityRisk(analysisText, technicalAnalysis) {
        let volatilityRisk = 0.3; // Base volatility risk

        // Check for volatility indicators in text
        const highVolatilityKeywords = [
            'volatile', 'volatility', 'erratic', 'choppy', 'unstable', 
            'wild swings', 'high volatility', 'extreme movements'
        ];

        const lowVolatilityKeywords = [
            'stable', 'steady', 'calm', 'low volatility', 'consolidation'
        ];

        // Analyze text for volatility mentions
        highVolatilityKeywords.forEach(keyword => {
            if (analysisText.toLowerCase().includes(keyword)) {
                volatilityRisk += 0.15;
            }
        });

        lowVolatilityKeywords.forEach(keyword => {
            if (analysisText.toLowerCase().includes(keyword)) {
                volatilityRisk -= 0.1;
            }
        });

        // Check Bollinger Bands for volatility
        if (technicalAnalysis && technicalAnalysis.volatility && technicalAnalysis.volatility.bollingerBands) {
            const bb = technicalAnalysis.volatility.bollingerBands;
            if (bb.expansion) volatilityRisk += 0.2;
            if (bb.squeeze) volatilityRisk -= 0.15;
        }

        this.analysisResults.riskFactors.volatility = Math.max(0, Math.min(1, volatilityRisk));
        return this.analysisResults.riskFactors.volatility;
    }

    /**
     * Assess trend reliability risk
     */
    async assessTrendReliabilityRisk(analysisText, patternAnalysis) {
        let trendRisk = 0.4; // Base trend risk

        // Check for trend strength indicators
        if (analysisText.toLowerCase().includes('strong trend')) {
            trendRisk -= 0.2;
        } else if (analysisText.toLowerCase().includes('weak trend')) {
            trendRisk += 0.2;
        }

        // Check for trend uncertainty
        const uncertaintyKeywords = [
            'uncertain', 'unclear', 'mixed signals', 'conflicting', 
            'indecisive', 'choppy', 'sideways'
        ];

        uncertaintyKeywords.forEach(keyword => {
            if (analysisText.toLowerCase().includes(keyword)) {
                trendRisk += 0.15;
            }
        });

        // Analyze pattern analysis for trend confirmation
        if (patternAnalysis && patternAnalysis.trendAnalysis) {
            const trend = patternAnalysis.trendAnalysis;
            if (trend.strength > 0.7) trendRisk -= 0.15;
            if (trend.strength < 0.4) trendRisk += 0.2;
        }

        this.analysisResults.riskFactors.trendReliability = Math.max(0, Math.min(1, trendRisk));
        return this.analysisResults.riskFactors.trendReliability;
    }

    /**
     * Assess signal quality risk
     */
    async assessSignalQualityRisk(technicalAnalysis, patternAnalysis) {
        let signalRisk = 0.5; // Base signal risk

        // Check technical indicator confluence
        if (technicalAnalysis && technicalAnalysis.confluence) {
            const confluence = technicalAnalysis.confluence;
            if (confluence.count >= 3) signalRisk -= 0.2;
            if (confluence.count < 2) signalRisk += 0.2;
            if (confluence.strength > 0.7) signalRisk -= 0.15;
        }

        // Check pattern confluence
        if (patternAnalysis && patternAnalysis.patternConfluence) {
            const patternConfluence = patternAnalysis.patternConfluence;
            if (patternConfluence.totalPatterns >= 2) signalRisk -= 0.1;
            if (patternConfluence.strength > 0.6) signalRisk -= 0.1;
        }

        // Check for conflicting signals
        if (technicalAnalysis && patternAnalysis) {
            const techDirection = technicalAnalysis.confluence?.direction;
            const patternDirection = patternAnalysis.patternConfluence?.direction;
            
            if (techDirection && patternDirection && techDirection !== patternDirection) {
                signalRisk += 0.3; // Conflicting signals increase risk
            }
        }

        this.analysisResults.riskFactors.signalQuality = Math.max(0, Math.min(1, signalRisk));
        return this.analysisResults.riskFactors.signalQuality;
    }

    /**
     * Assess market structure risk
     */
    async assessMarketStructureRisk(analysisText, supportResistanceAnalysis) {
        let structureRisk = 0.4; // Base structure risk

        // Check for ranging/consolidation markets
        const rangingKeywords = ['ranging', 'consolidation', 'sideways', 'choppy'];
        rangingKeywords.forEach(keyword => {
            if (analysisText.toLowerCase().includes(keyword)) {
                structureRisk += 0.2;
            }
        });

        // Check support/resistance clarity
        if (supportResistanceAnalysis) {
            const sr = supportResistanceAnalysis.supportResistance;
            const totalLevels = (sr.supportLevels?.length || 0) + (sr.resistanceLevels?.length || 0);
            
            if (totalLevels >= 4) structureRisk -= 0.1; // Clear levels reduce risk
            if (totalLevels < 2) structureRisk += 0.2; // Unclear levels increase risk
            
            // Check for recent breakouts (can increase short-term risk)
            if (sr.breakouts?.length > 0) structureRisk += 0.1;
        }

        this.analysisResults.riskFactors.marketStructure = Math.max(0, Math.min(1, structureRisk));
        return this.analysisResults.riskFactors.marketStructure;
    }

    /**
     * Assess confluence risk
     */
    async assessConfluenceRisk(technicalAnalysis, patternAnalysis) {
        let confluenceRisk = 0.6; // Base confluence risk (high when no confluence)

        let totalConfluenceSignals = 0;

        // Count technical indicator signals
        if (technicalAnalysis && technicalAnalysis.signals) {
            totalConfluenceSignals += technicalAnalysis.signals.length;
        }

        // Count pattern signals
        if (patternAnalysis && patternAnalysis.signals) {
            totalConfluenceSignals += patternAnalysis.signals.length;
        }

        // Reduce risk based on confluence
        if (totalConfluenceSignals >= 4) confluenceRisk -= 0.3;
        else if (totalConfluenceSignals >= 2) confluenceRisk -= 0.2;
        else if (totalConfluenceSignals >= 1) confluenceRisk -= 0.1;

        this.analysisResults.riskFactors.confluence = Math.max(0, Math.min(1, confluenceRisk));
        return this.analysisResults.riskFactors.confluence;
    }

    /**
     * Assess timeframe-specific risk
     */
    async assessTimeframeRisk(timeframe) {
        let timeframeRisk = 0.3; // Base timeframe risk

        // Different timeframes have different risk characteristics
        switch (timeframe) {
            case '1m':
                timeframeRisk += 0.2; // Higher risk due to noise
                break;
            case '3m':
                timeframeRisk += 0.1; // Moderate risk
                break;
            case '5m':
                timeframeRisk += 0.0; // Lower risk, more reliable
                break;
            default:
                timeframeRisk += 0.15; // Unknown timeframe
        }

        this.analysisResults.riskFactors.timeframe = Math.max(0, Math.min(1, timeframeRisk));
        return this.analysisResults.riskFactors.timeframe;
    }

    /**
     * Calculate overall risk score
     */
    calculateOverallRiskScore() {
        let overallRisk = 0;

        Object.entries(this.riskFactors).forEach(([factor, weight]) => {
            const riskValue = this.analysisResults.riskFactors[factor] || 0.5;
            overallRisk += riskValue * weight;
        });

        return Math.max(0, Math.min(1, overallRisk));
    }

    /**
     * Determine risk level from score
     */
    determineRiskLevel(riskScore) {
        if (riskScore >= 0.7) return 'HIGH';
        if (riskScore >= 0.4) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Assess overall market condition
     */
    assessMarketCondition(analysisText) {
        const trendingKeywords = ['trending', 'directional', 'momentum'];
        const rangingKeywords = ['ranging', 'consolidation', 'sideways'];
        const volatileKeywords = ['volatile', 'erratic', 'choppy'];
        const uncertainKeywords = ['uncertain', 'unclear', 'mixed'];

        if (volatileKeywords.some(k => analysisText.toLowerCase().includes(k))) {
            return 'VOLATILE';
        }
        
        if (uncertainKeywords.some(k => analysisText.toLowerCase().includes(k))) {
            return 'UNCERTAIN';
        }
        
        if (rangingKeywords.some(k => analysisText.toLowerCase().includes(k))) {
            return 'RANGING';
        }
        
        if (trendingKeywords.some(k => analysisText.toLowerCase().includes(k))) {
            return 'TRENDING';
        }

        return 'NORMAL';
    }

    /**
     * Generate risk warnings
     */
    generateRiskWarnings() {
        const warnings = [];

        // High volatility warning
        if (this.analysisResults.riskFactors.volatility > 0.7) {
            warnings.push({
                type: 'HIGH_VOLATILITY',
                severity: 'HIGH',
                message: 'Market showing high volatility - increased risk of sudden price movements',
                recommendation: 'Consider reducing position size or avoiding trades'
            });
        }

        // Poor trend reliability warning
        if (this.analysisResults.riskFactors.trendReliability > 0.6) {
            warnings.push({
                type: 'UNRELIABLE_TREND',
                severity: 'MEDIUM',
                message: 'Trend reliability is questionable - mixed or weak signals detected',
                recommendation: 'Wait for clearer trend confirmation before trading'
            });
        }

        // Low signal quality warning
        if (this.analysisResults.riskFactors.signalQuality > 0.7) {
            warnings.push({
                type: 'POOR_SIGNAL_QUALITY',
                severity: 'HIGH',
                message: 'Signal quality is poor - conflicting or weak indicators',
                recommendation: 'Avoid trading until signal quality improves'
            });
        }

        // Lack of confluence warning
        if (this.analysisResults.riskFactors.confluence > 0.6) {
            warnings.push({
                type: 'LACK_OF_CONFLUENCE',
                severity: 'MEDIUM',
                message: 'Insufficient confluence between indicators and patterns',
                recommendation: 'Wait for multiple confirming signals before trading'
            });
        }

        return warnings;
    }

    /**
     * Generate risk-based recommendations
     */
    generateRiskRecommendations() {
        const recommendations = [];
        const overallRisk = this.calculateOverallRiskScore();

        if (overallRisk > 0.7) {
            recommendations.push({
                type: 'NO_TRADE',
                priority: 'HIGH',
                action: 'Avoid trading',
                reason: 'High risk market conditions detected'
            });
        } else if (overallRisk > 0.5) {
            recommendations.push({
                type: 'REDUCED_RISK',
                priority: 'MEDIUM',
                action: 'Trade with caution',
                reason: 'Moderate risk conditions - consider smaller position sizes'
            });
        } else {
            recommendations.push({
                type: 'NORMAL_TRADING',
                priority: 'LOW',
                action: 'Normal trading conditions',
                reason: 'Risk levels are acceptable for trading'
            });
        }

        // Specific recommendations based on risk factors
        if (this.analysisResults.riskFactors.volatility > 0.6) {
            recommendations.push({
                type: 'VOLATILITY_MANAGEMENT',
                priority: 'MEDIUM',
                action: 'Use tighter stop losses',
                reason: 'High volatility detected'
            });
        }

        return recommendations;
    }

    /**
     * Assess trading suitability
     */
    assessTradingSuitability(riskScore, warnings) {
        const highSeverityWarnings = warnings.filter(w => w.severity === 'HIGH').length;
        
        if (riskScore > 0.7 || highSeverityWarnings > 0) {
            return 'UNSUITABLE';
        } else if (riskScore > 0.5 || warnings.length > 2) {
            return 'CAUTION';
        } else if (riskScore < 0.3) {
            return 'EXCELLENT';
        } else {
            return 'SUITABLE';
        }
    }

    /**
     * Update risk statistics
     */
    updateRiskStatistics(riskLevel, warnings, tradingSuitability) {
        switch (riskLevel) {
            case 'HIGH':
                this.stats.highRiskDetections++;
                break;
            case 'MEDIUM':
                this.stats.mediumRiskDetections++;
                break;
            case 'LOW':
                this.stats.lowRiskDetections++;
                break;
        }

        this.stats.tradingWarnings += warnings.length;

        if (tradingSuitability === 'UNSUITABLE') {
            this.stats.noTradeRecommendations++;
        }
    }

    /**
     * Generate risk summary
     */
    generateRiskSummary(riskScore, riskLevel, tradingSuitability) {
        return {
            overallRiskScore: riskScore,
            riskLevel: riskLevel,
            tradingSuitability: tradingSuitability,
            primaryRiskFactors: this.getPrimaryRiskFactors(),
            warningCount: this.analysisResults.warnings?.length || 0,
            recommendedAction: this.getRecommendedAction(tradingSuitability),
            riskFactorBreakdown: this.analysisResults.riskFactors
        };
    }

    /**
     * Get primary risk factors (top contributors)
     */
    getPrimaryRiskFactors() {
        const factors = Object.entries(this.analysisResults.riskFactors)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([factor, value]) => ({ factor, value: value.toFixed(2) }));

        return factors;
    }

    /**
     * Get recommended action based on suitability
     */
    getRecommendedAction(suitability) {
        const actions = {
            'EXCELLENT': 'Proceed with normal trading',
            'SUITABLE': 'Trade with standard risk management',
            'CAUTION': 'Trade with reduced position size and tight stops',
            'UNSUITABLE': 'Avoid trading - wait for better conditions'
        };

        return actions[suitability] || 'Assess conditions carefully';
    }

    /**
     * Utility methods
     */
    resetAnalysisResults() {
        this.analysisResults = {
            riskScore: 0,
            riskLevel: 'UNKNOWN',
            marketCondition: 'UNKNOWN',
            riskFactors: {},
            warnings: [],
            tradingSuitability: 'UNKNOWN',
            recommendations: []
        };
    }

    /**
     * Get analysis statistics
     */
    getStats() {
        return {
            ...this.stats,
            totalAssessments: this.stats.totalAssessments,
            riskDistribution: {
                high: this.stats.highRiskDetections,
                medium: this.stats.mediumRiskDetections,
                low: this.stats.lowRiskDetections
            },
            averageWarningsPerAssessment: this.stats.totalAssessments > 0 ? 
                (this.stats.tradingWarnings / this.stats.totalAssessments).toFixed(1) : '0',
            noTradeRate: this.stats.totalAssessments > 0 ? 
                (this.stats.noTradeRecommendations / this.stats.totalAssessments * 100).toFixed(1) + '%' : '0%'
        };
    }
}

module.exports = { RiskAssessmentAnalyzer };
