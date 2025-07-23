/**
 * Signal Quality Validator
 * 
 * Validates trading signals based on data quality, confluence strength,
 * market conditions, and other quality factors before signal generation.
 */

const { strictModeConfig } = require('../config/strict-mode');
const { DataQualityValidator } = require('./DataQualityValidator');
const { DataFreshnessValidator } = require('./DataFreshnessValidator');

class SignalQualityValidator {
    constructor(config = {}) {
        this.config = {
            minQualityScore: config.minQualityScore || 0.8,
            minConfluence: config.minConfluence || 0.75,
            minConfidence: config.minConfidence || 0.7,
            minDataQuality: config.minDataQuality || 0.9,
            maxDataAge: config.maxDataAge || 5 * 60 * 1000, // 5 minutes
            requireMultiTimeframe: config.requireMultiTimeframe || true,
            minTimeframeAgreement: config.minTimeframeAgreement || 0.6,
            ...config
        };

        this.strictMode = strictModeConfig;
        this.dataQualityValidator = new DataQualityValidator();
        this.dataFreshnessValidator = new DataFreshnessValidator();
        this.validationHistory = [];
        
        this.qualityWeights = {
            dataQuality: 0.25,
            confluence: 0.25,
            confidence: 0.20,
            marketConditions: 0.15,
            timeframeAgreement: 0.15
        };
    }

    /**
     * Validate signal quality comprehensively
     */
    validateSignal(signal, marketData, timeframeAnalysis = {}) {
        const validation = {
            signal,
            timestamp: Date.now(),
            passed: false,
            qualityScore: 0,
            components: {},
            errors: [],
            warnings: [],
            recommendations: []
        };

        try {
            // 1. Validate data quality
            validation.components.dataQuality = this.validateDataQuality(marketData, signal.dataSource);
            
            // 2. Validate confluence
            validation.components.confluence = this.validateConfluence(signal, timeframeAnalysis);
            
            // 3. Validate confidence
            validation.components.confidence = this.validateConfidence(signal);
            
            // 4. Validate market conditions
            validation.components.marketConditions = this.validateMarketConditions(marketData);
            
            // 5. Validate timeframe agreement
            validation.components.timeframeAgreement = this.validateTimeframeAgreement(timeframeAnalysis);

            // Calculate overall quality score
            validation.qualityScore = this.calculateOverallQualityScore(validation.components);

            // Apply strict mode validation
            if (this.strictMode.isStrictModeEnabled()) {
                this.applyStrictModeValidation(validation);
            }

            // Determine if signal passes validation
            validation.passed = this.determineValidationResult(validation);

            // Generate recommendations
            validation.recommendations = this.generateRecommendations(validation);

            // Store validation history
            this.validationHistory.push(validation);
            if (this.validationHistory.length > 1000) {
                this.validationHistory.shift();
            }

            return validation;

        } catch (error) {
            validation.errors.push(`Validation error: ${error.message}`);
            validation.passed = false;
            return validation;
        }
    }

    /**
     * Validate data quality
     */
    validateDataQuality(marketData, dataSource) {
        const component = {
            score: 0,
            passed: false,
            details: {},
            errors: [],
            warnings: []
        };

        try {
            // Validate data quality using DataQualityValidator
            const dataValidation = this.dataQualityValidator.validateMarketData(marketData, dataSource);
            component.score = dataValidation.qualityScore;
            component.details.qualityBreakdown = dataValidation.metrics;
            component.details.dataSource = dataSource;

            // Validate data freshness
            const freshnessValidation = this.dataFreshnessValidator.validateFreshness(
                marketData, 
                marketData.timeframe || '5m', 
                dataSource
            );
            component.details.freshness = freshnessValidation;

            // Check if data quality meets requirements
            if (component.score < this.config.minDataQuality) {
                component.errors.push(`Data quality too low: ${component.score.toFixed(2)} < ${this.config.minDataQuality}`);
            }

            if (!freshnessValidation.isFresh) {
                component.errors.push(`Data not fresh: ${freshnessValidation.ageHuman}`);
            }

            component.passed = component.errors.length === 0;

        } catch (error) {
            component.errors.push(`Data quality validation failed: ${error.message}`);
        }

        return component;
    }

    /**
     * Validate confluence across different analysis methods
     */
    validateConfluence(signal, timeframeAnalysis) {
        const component = {
            score: 0,
            passed: false,
            details: {},
            errors: [],
            warnings: []
        };

        try {
            const confluenceFactors = [];

            // Technical indicator confluence
            if (signal.technicalAnalysis) {
                const techConfluence = this.calculateTechnicalConfluence(signal.technicalAnalysis);
                confluenceFactors.push({ type: 'technical', score: techConfluence });
                component.details.technical = techConfluence;
            }

            // Pattern confluence
            if (signal.patternAnalysis) {
                const patternConfluence = this.calculatePatternConfluence(signal.patternAnalysis);
                confluenceFactors.push({ type: 'pattern', score: patternConfluence });
                component.details.pattern = patternConfluence;
            }

            // Volume confluence
            if (signal.volumeAnalysis) {
                const volumeConfluence = this.calculateVolumeConfluence(signal.volumeAnalysis);
                confluenceFactors.push({ type: 'volume', score: volumeConfluence });
                component.details.volume = volumeConfluence;
            }

            // Timeframe confluence
            if (Object.keys(timeframeAnalysis).length > 0) {
                const timeframeConfluence = this.calculateTimeframeConfluence(timeframeAnalysis, signal.direction);
                confluenceFactors.push({ type: 'timeframe', score: timeframeConfluence });
                component.details.timeframe = timeframeConfluence;
            }

            // Calculate overall confluence score
            if (confluenceFactors.length > 0) {
                component.score = confluenceFactors.reduce((sum, factor) => sum + factor.score, 0) / confluenceFactors.length;
            }

            component.details.factors = confluenceFactors;

            // Check confluence requirements
            if (component.score < this.config.minConfluence) {
                component.errors.push(`Confluence too low: ${component.score.toFixed(2)} < ${this.config.minConfluence}`);
            }

            if (confluenceFactors.length < 2) {
                component.warnings.push('Insufficient confluence factors for robust validation');
            }

            component.passed = component.errors.length === 0;

        } catch (error) {
            component.errors.push(`Confluence validation failed: ${error.message}`);
        }

        return component;
    }

    /**
     * Validate signal confidence
     */
    validateConfidence(signal) {
        const component = {
            score: 0,
            passed: false,
            details: {},
            errors: [],
            warnings: []
        };

        try {
            component.score = signal.confidence || 0;
            component.details.rawConfidence = signal.confidence;
            component.details.confidenceSource = signal.confidenceSource || 'unknown';

            // Check confidence calibration
            if (signal.confidenceCalibration) {
                component.details.calibration = signal.confidenceCalibration;
                component.score *= signal.confidenceCalibration.accuracy || 1;
            }

            // Apply confidence adjustments based on market conditions
            if (signal.marketVolatility) {
                const volatilityAdjustment = this.calculateVolatilityAdjustment(signal.marketVolatility);
                component.score *= volatilityAdjustment;
                component.details.volatilityAdjustment = volatilityAdjustment;
            }

            // Check confidence requirements
            if (component.score < this.config.minConfidence) {
                component.errors.push(`Confidence too low: ${component.score.toFixed(2)} < ${this.config.minConfidence}`);
            }

            if (signal.confidence && signal.confidence > 0.95) {
                component.warnings.push('Extremely high confidence may indicate overfitting');
            }

            component.passed = component.errors.length === 0;

        } catch (error) {
            component.errors.push(`Confidence validation failed: ${error.message}`);
        }

        return component;
    }

    /**
     * Validate market conditions
     */
    validateMarketConditions(marketData) {
        const component = {
            score: 0.5, // Default neutral score
            passed: true,
            details: {},
            errors: [],
            warnings: []
        };

        try {
            // Check market volatility
            if (marketData.volatility !== undefined) {
                component.details.volatility = marketData.volatility;
                
                if (marketData.volatility > 0.05) { // 5% volatility threshold
                    component.warnings.push('High market volatility detected');
                    component.score *= 0.8; // Reduce score for high volatility
                }
            }

            // Check market liquidity (volume)
            if (marketData.volume !== undefined && marketData.avgVolume !== undefined) {
                const volumeRatio = marketData.volume / marketData.avgVolume;
                component.details.volumeRatio = volumeRatio;
                
                if (volumeRatio < 0.5) {
                    component.warnings.push('Low market liquidity detected');
                    component.score *= 0.9;
                } else if (volumeRatio > 2.0) {
                    component.details.highVolume = true;
                    component.score *= 1.1; // Boost score for high volume
                }
            }

            // Check market session
            if (marketData.marketSession) {
                component.details.marketSession = marketData.marketSession;
                
                if (marketData.marketSession === 'closed' || marketData.marketSession === 'pre-market') {
                    component.warnings.push('Trading during off-market hours');
                    component.score *= 0.7;
                }
            }

            // Check for major news events
            if (marketData.newsEvents && marketData.newsEvents.length > 0) {
                component.details.newsEvents = marketData.newsEvents.length;
                component.warnings.push(`${marketData.newsEvents.length} news events detected`);
                component.score *= 0.85; // Reduce score during news events
            }

            component.score = Math.max(0, Math.min(1, component.score));

        } catch (error) {
            component.errors.push(`Market conditions validation failed: ${error.message}`);
            component.passed = false;
        }

        return component;
    }

    /**
     * Validate timeframe agreement
     */
    validateTimeframeAgreement(timeframeAnalysis) {
        const component = {
            score: 0,
            passed: false,
            details: {},
            errors: [],
            warnings: []
        };

        try {
            const timeframes = Object.keys(timeframeAnalysis);
            
            if (timeframes.length === 0) {
                if (this.config.requireMultiTimeframe) {
                    component.errors.push('Multi-timeframe analysis required but not provided');
                }
                return component;
            }

            component.details.timeframes = timeframes;
            component.details.analysis = timeframeAnalysis;

            // Calculate agreement score
            component.score = this.calculateTimeframeConfluence(timeframeAnalysis);

            // Check agreement requirements
            if (component.score < this.config.minTimeframeAgreement) {
                component.errors.push(`Timeframe agreement too low: ${component.score.toFixed(2)} < ${this.config.minTimeframeAgreement}`);
            }

            if (timeframes.length < 3) {
                component.warnings.push('Limited timeframe analysis - consider adding more timeframes');
            }

            component.passed = component.errors.length === 0;

        } catch (error) {
            component.errors.push(`Timeframe agreement validation failed: ${error.message}`);
        }

        return component;
    }

    /**
     * Calculate technical indicator confluence
     */
    calculateTechnicalConfluence(technicalAnalysis) {
        const indicators = Object.keys(technicalAnalysis);
        if (indicators.length === 0) return 0;

        let bullishCount = 0;
        let bearishCount = 0;

        indicators.forEach(indicator => {
            const analysis = technicalAnalysis[indicator];
            if (analysis.signal === 'bullish' || analysis.signal === 'buy') {
                bullishCount++;
            } else if (analysis.signal === 'bearish' || analysis.signal === 'sell') {
                bearishCount++;
            }
        });

        const totalSignals = bullishCount + bearishCount;
        if (totalSignals === 0) return 0;

        return Math.max(bullishCount, bearishCount) / totalSignals;
    }

    /**
     * Calculate pattern confluence
     */
    calculatePatternConfluence(patternAnalysis) {
        if (!patternAnalysis.patterns || patternAnalysis.patterns.length === 0) return 0;

        const patterns = patternAnalysis.patterns;
        const avgConfidence = patterns.reduce((sum, pattern) => sum + (pattern.confidence || 0), 0) / patterns.length;
        
        return avgConfidence;
    }

    /**
     * Calculate volume confluence
     */
    calculateVolumeConfluence(volumeAnalysis) {
        let score = 0.5; // Default neutral

        if (volumeAnalysis.trend === 'increasing') score += 0.3;
        if (volumeAnalysis.spike) score += 0.2;
        if (volumeAnalysis.ratio > 1.5) score += 0.2;

        return Math.min(1, score);
    }

    /**
     * Calculate timeframe confluence
     */
    calculateTimeframeConfluence(timeframeAnalysis, expectedDirection = null) {
        const timeframes = Object.keys(timeframeAnalysis);
        if (timeframes.length === 0) return 0;

        let agreements = 0;
        let total = 0;

        timeframes.forEach(tf => {
            const analysis = timeframeAnalysis[tf];
            if (analysis.direction) {
                total++;
                if (!expectedDirection || analysis.direction === expectedDirection) {
                    agreements++;
                }
            }
        });

        return total > 0 ? agreements / total : 0;
    }

    /**
     * Calculate volatility adjustment for confidence
     */
    calculateVolatilityAdjustment(volatility) {
        // Reduce confidence during high volatility periods
        if (volatility > 0.05) return 0.8;
        if (volatility > 0.03) return 0.9;
        if (volatility < 0.01) return 1.1; // Boost confidence in low volatility
        return 1.0;
    }

    /**
     * Calculate overall quality score
     */
    calculateOverallQualityScore(components) {
        let totalScore = 0;
        let totalWeight = 0;

        Object.entries(this.qualityWeights).forEach(([component, weight]) => {
            if (components[component] && typeof components[component].score === 'number') {
                totalScore += components[component].score * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    /**
     * Apply strict mode validation
     */
    applyStrictModeValidation(validation) {
        const strictValidation = this.strictMode.validateDataQuality(
            validation.signal, 
            validation.qualityScore
        );

        validation.errors.push(...strictValidation.errors);
        validation.warnings.push(...strictValidation.warnings);

        if (!strictValidation.passed) {
            validation.passed = false;
        }
    }

    /**
     * Determine final validation result
     */
    determineValidationResult(validation) {
        // Must pass if no errors
        if (validation.errors.length > 0) return false;

        // Must meet minimum quality score
        if (validation.qualityScore < this.config.minQualityScore) return false;

        // All critical components must pass
        const criticalComponents = ['dataQuality', 'confluence', 'confidence'];
        for (const component of criticalComponents) {
            if (validation.components[component] && !validation.components[component].passed) {
                return false;
            }
        }

        return true;
    }

    /**
     * Generate recommendations for signal improvement
     */
    generateRecommendations(validation) {
        const recommendations = [];

        // Data quality recommendations
        if (validation.components.dataQuality && validation.components.dataQuality.score < 0.9) {
            recommendations.push('Improve data quality by using more reliable data sources');
        }

        // Confluence recommendations
        if (validation.components.confluence && validation.components.confluence.score < 0.7) {
            recommendations.push('Increase signal confluence by adding more analysis methods');
        }

        // Confidence recommendations
        if (validation.components.confidence && validation.components.confidence.score < 0.7) {
            recommendations.push('Improve signal confidence through better model calibration');
        }

        // Timeframe recommendations
        if (validation.components.timeframeAgreement && validation.components.timeframeAgreement.score < 0.6) {
            recommendations.push('Analyze additional timeframes for better agreement');
        }

        return recommendations;
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        if (this.validationHistory.length === 0) {
            return { message: 'No validations performed yet' };
        }

        const stats = {
            totalValidations: this.validationHistory.length,
            passedValidations: this.validationHistory.filter(v => v.passed).length,
            averageQuality: this.validationHistory.reduce((sum, v) => sum + v.qualityScore, 0) / this.validationHistory.length,
            componentStats: {},
            commonErrors: {},
            commonWarnings: {}
        };

        stats.passRate = stats.passedValidations / stats.totalValidations;

        // Calculate component statistics
        Object.keys(this.qualityWeights).forEach(component => {
            const componentValidations = this.validationHistory
                .filter(v => v.components[component])
                .map(v => v.components[component]);

            if (componentValidations.length > 0) {
                stats.componentStats[component] = {
                    averageScore: componentValidations.reduce((sum, c) => sum + c.score, 0) / componentValidations.length,
                    passRate: componentValidations.filter(c => c.passed).length / componentValidations.length
                };
            }
        });

        // Calculate common errors and warnings
        this.validationHistory.forEach(v => {
            v.errors.forEach(error => {
                stats.commonErrors[error] = (stats.commonErrors[error] || 0) + 1;
            });
            v.warnings.forEach(warning => {
                stats.commonWarnings[warning] = (stats.commonWarnings[warning] || 0) + 1;
            });
        });

        return stats;
    }
}

    /**
     * Validate signal against historical performance
     */
    validateHistoricalPerformance(signal, historicalData) {
        const validation = {
            score: 0.5,
            passed: true,
            details: {},
            warnings: []
        };

        try {
            if (historicalData && historicalData.similarSignals) {
                const similar = historicalData.similarSignals;
                validation.details.similarSignalsCount = similar.length;

                if (similar.length > 0) {
                    const avgAccuracy = similar.reduce((sum, s) => sum + (s.accuracy || 0), 0) / similar.length;
                    validation.score = avgAccuracy;
                    validation.details.historicalAccuracy = avgAccuracy;

                    if (avgAccuracy < 0.6) {
                        validation.warnings.push(`Low historical accuracy for similar signals: ${(avgAccuracy * 100).toFixed(1)}%`);
                    }
                }
            }
        } catch (error) {
            validation.warnings.push(`Historical validation failed: ${error.message}`);
        }

        return validation;
    }

    /**
     * Get quality validation summary
     */
    getQualitySummary(validation) {
        return {
            passed: validation.passed,
            qualityScore: validation.qualityScore,
            grade: this.getQualityGrade(validation.qualityScore),
            criticalIssues: validation.errors.length,
            warnings: validation.warnings.length,
            recommendations: validation.recommendations.length,
            components: Object.keys(validation.components).reduce((summary, key) => {
                summary[key] = {
                    score: validation.components[key].score,
                    passed: validation.components[key].passed
                };
                return summary;
            }, {})
        };
    }

    /**
     * Get quality grade based on score
     */
    getQualityGrade(score) {
        if (score >= 0.9) return 'A';
        if (score >= 0.8) return 'B';
        if (score >= 0.7) return 'C';
        if (score >= 0.6) return 'D';
        return 'F';
    }
}

module.exports = { SignalQualityValidator };
