/**
 * Data Quality Validator
 * 
 * Validates market data quality according to strict mode requirements.
 * Ensures only high-quality, real market data is used for signal generation.
 */

const { strictModeConfig } = require('../config/strict-mode');

class DataQualityValidator {
    constructor() {
        this.strictMode = strictModeConfig;
        this.validationHistory = [];
        this.qualityThresholds = {
            excellent: 0.95,
            good: 0.85,
            acceptable: 0.75,
            poor: 0.65
        };
    }

    /**
     * Validate market data quality
     * Returns a quality score between 0 and 1
     */
    validateMarketData(data, source = 'unknown') {
        const validation = {
            data,
            source,
            timestamp: Date.now(),
            qualityScore: 0,
            passed: false,
            metrics: {},
            errors: [],
            warnings: []
        };

        try {
            // Calculate individual quality metrics
            validation.metrics.freshness = this.calculateFreshnessScore(data);
            validation.metrics.completeness = this.calculateCompletenessScore(data);
            validation.metrics.accuracy = this.calculateAccuracyScore(data);
            validation.metrics.consistency = this.calculateConsistencyScore(data);
            validation.metrics.sourceReliability = this.calculateSourceReliabilityScore(source);

            // Calculate overall quality score (weighted average)
            validation.qualityScore = this.calculateOverallQualityScore(validation.metrics);

            // Apply strict mode validation
            const strictValidation = this.strictMode.validateDataQuality(data, validation.qualityScore);
            validation.errors = strictValidation.errors;
            validation.warnings = strictValidation.warnings;
            validation.passed = strictValidation.passed;

            // Log validation results
            this.strictMode.logValidation(validation, `for ${source}`);

            // Store validation history
            this.validationHistory.push(validation);

            // Keep only last 100 validations
            if (this.validationHistory.length > 100) {
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
     * Calculate data freshness score (0-1)
     */
    calculateFreshnessScore(data) {
        if (!data.timestamp) return 0.5; // Unknown timestamp

        const dataAge = Date.now() - new Date(data.timestamp).getTime();
        const maxAge = this.strictMode.getConfig().maxDataAge;

        if (dataAge <= 0) return 1.0; // Future timestamp (perfect)
        if (dataAge >= maxAge * 2) return 0.0; // Too old

        // Linear decay from 1.0 to 0.0 over maxAge * 2
        return Math.max(0, 1.0 - (dataAge / (maxAge * 2)));
    }

    /**
     * Calculate data completeness score (0-1)
     */
    calculateCompletenessScore(data) {
        const requiredFields = ['open', 'high', 'low', 'close', 'volume', 'timestamp'];
        const optionalFields = ['symbol', 'interval', 'source'];
        
        let score = 0;
        let totalWeight = 0;

        // Check required fields (weight: 1.0 each)
        requiredFields.forEach(field => {
            totalWeight += 1.0;
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                score += 1.0;
            }
        });

        // Check optional fields (weight: 0.2 each)
        optionalFields.forEach(field => {
            totalWeight += 0.2;
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                score += 0.2;
            }
        });

        return totalWeight > 0 ? score / totalWeight : 0;
    }

    /**
     * Calculate data accuracy score (0-1)
     */
    calculateAccuracyScore(data) {
        let score = 1.0;
        const penalties = [];

        // Check OHLC relationships
        if (data.high < data.low) {
            score -= 0.5;
            penalties.push('High < Low');
        }

        if (data.high < data.open || data.high < data.close) {
            score -= 0.3;
            penalties.push('High < Open/Close');
        }

        if (data.low > data.open || data.low > data.close) {
            score -= 0.3;
            penalties.push('Low > Open/Close');
        }

        // Check for reasonable price ranges
        if (data.open && data.close) {
            const priceChange = Math.abs(data.close - data.open) / data.open;
            if (priceChange > 0.1) { // 10% change in one candle is suspicious
                score -= 0.2;
                penalties.push('Extreme price change');
            }
        }

        // Check volume
        if (data.volume !== undefined && data.volume < 0) {
            score -= 0.2;
            penalties.push('Negative volume');
        }

        return Math.max(0, score);
    }

    /**
     * Calculate data consistency score (0-1)
     */
    calculateConsistencyScore(data) {
        // For single data point, check internal consistency
        let score = 1.0;

        // Check if all price values are reasonable
        const prices = [data.open, data.high, data.low, data.close].filter(p => p !== undefined);
        if (prices.length > 0) {
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const maxDeviation = Math.max(...prices.map(p => Math.abs(p - avgPrice) / avgPrice));
            
            if (maxDeviation > 0.05) { // 5% deviation from average
                score -= 0.2;
            }
        }

        // Check timestamp consistency
        if (data.timestamp) {
            const timestamp = new Date(data.timestamp).getTime();
            const now = Date.now();
            
            if (timestamp > now + 60000) { // More than 1 minute in future
                score -= 0.3;
            }
        }

        return Math.max(0, score);
    }

    /**
     * Calculate source reliability score (0-1)
     */
    calculateSourceReliabilityScore(source) {
        const reliabilityScores = {
            'TwelveData': 0.95,
            'Finnhub': 0.90,
            'AlphaVantage': 0.85,
            'Polygon': 0.90,
            'Yahoo Finance': 0.80,
            'unknown': 0.50,
            'fallback': 0.0,
            'synthetic': 0.0,
            'mock': 0.0,
            'demo': 0.0
        };

        return reliabilityScores[source] || 0.30;
    }

    /**
     * Calculate overall quality score using weighted average
     */
    calculateOverallQualityScore(metrics) {
        const weights = {
            freshness: 0.25,
            completeness: 0.25,
            accuracy: 0.25,
            consistency: 0.15,
            sourceReliability: 0.10
        };

        let totalScore = 0;
        let totalWeight = 0;

        Object.entries(weights).forEach(([metric, weight]) => {
            if (metrics[metric] !== undefined) {
                totalScore += metrics[metric] * weight;
                totalWeight += weight;
            }
        });

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    /**
     * Get quality level description
     */
    getQualityLevel(score) {
        if (score >= this.qualityThresholds.excellent) return 'excellent';
        if (score >= this.qualityThresholds.good) return 'good';
        if (score >= this.qualityThresholds.acceptable) return 'acceptable';
        if (score >= this.qualityThresholds.poor) return 'poor';
        return 'unacceptable';
    }

    /**
     * Validate multiple data points (time series)
     */
    validateTimeSeries(dataArray, source = 'unknown') {
        const validations = dataArray.map(data => this.validateMarketData(data, source));
        
        const overallValidation = {
            source,
            timestamp: Date.now(),
            count: validations.length,
            passed: validations.every(v => v.passed),
            averageQuality: validations.reduce((sum, v) => sum + v.qualityScore, 0) / validations.length,
            errors: validations.flatMap(v => v.errors),
            warnings: validations.flatMap(v => v.warnings),
            validations
        };

        return overallValidation;
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
            qualityDistribution: {},
            commonErrors: {},
            sourceStats: {}
        };

        stats.passRate = stats.passedValidations / stats.totalValidations;

        // Calculate quality distribution
        this.validationHistory.forEach(v => {
            const level = this.getQualityLevel(v.qualityScore);
            stats.qualityDistribution[level] = (stats.qualityDistribution[level] || 0) + 1;
        });

        // Calculate common errors
        this.validationHistory.forEach(v => {
            v.errors.forEach(error => {
                stats.commonErrors[error] = (stats.commonErrors[error] || 0) + 1;
            });
        });

        // Calculate source statistics
        this.validationHistory.forEach(v => {
            if (!stats.sourceStats[v.source]) {
                stats.sourceStats[v.source] = { count: 0, averageQuality: 0, passRate: 0 };
            }
            stats.sourceStats[v.source].count++;
            stats.sourceStats[v.source].averageQuality += v.qualityScore;
            if (v.passed) stats.sourceStats[v.source].passRate++;
        });

        // Finalize source statistics
        Object.keys(stats.sourceStats).forEach(source => {
            const sourceData = stats.sourceStats[source];
            sourceData.averageQuality /= sourceData.count;
            sourceData.passRate /= sourceData.count;
        });

        return stats;
    }
}

module.exports = { DataQualityValidator };
