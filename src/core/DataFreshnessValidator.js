/**
 * Data Freshness Validator
 * 
 * Validates the freshness of market data and rejects stale data
 * based on configurable thresholds for different timeframes.
 */

const { strictModeConfig } = require('../config/strict-mode');

class DataFreshnessValidator {
    constructor() {
        this.strictMode = strictModeConfig;
        this.freshnessThresholds = new Map();
        this.validationHistory = [];
        this.initializeFreshnessThresholds();
    }

    /**
     * Initialize freshness thresholds for different timeframes
     */
    initializeFreshnessThresholds() {
        // Thresholds in milliseconds - how old data can be before it's considered stale
        const thresholds = [
            { timeframe: '1m', maxAge: 2 * 60 * 1000 },      // 2 minutes for 1m data
            { timeframe: '2m', maxAge: 4 * 60 * 1000 },      // 4 minutes for 2m data
            { timeframe: '3m', maxAge: 6 * 60 * 1000 },      // 6 minutes for 3m data
            { timeframe: '5m', maxAge: 10 * 60 * 1000 },     // 10 minutes for 5m data
            { timeframe: '15m', maxAge: 30 * 60 * 1000 },    // 30 minutes for 15m data
            { timeframe: '30m', maxAge: 60 * 60 * 1000 },    // 1 hour for 30m data
            { timeframe: '1h', maxAge: 2 * 60 * 60 * 1000 }, // 2 hours for 1h data
            { timeframe: '4h', maxAge: 8 * 60 * 60 * 1000 }, // 8 hours for 4h data
            { timeframe: '1d', maxAge: 2 * 24 * 60 * 60 * 1000 }, // 2 days for 1d data
        ];

        thresholds.forEach(({ timeframe, maxAge }) => {
            this.freshnessThresholds.set(timeframe, {
                maxAge,
                warningAge: maxAge * 0.7, // Warning at 70% of max age
                criticalAge: maxAge * 0.9  // Critical at 90% of max age
            });
        });
    }

    /**
     * Validate data freshness
     */
    validateFreshness(data, timeframe = '5m', source = 'unknown') {
        const validation = {
            data,
            timeframe,
            source,
            timestamp: Date.now(),
            isFresh: false,
            freshnessScore: 0,
            ageMs: null,
            ageHuman: null,
            status: 'unknown',
            warnings: [],
            errors: []
        };

        try {
            // Get data timestamp
            const dataTimestamp = this.extractTimestamp(data);
            if (!dataTimestamp) {
                validation.errors.push('No timestamp found in data');
                validation.status = 'error';
                return validation;
            }

            // Calculate data age
            validation.ageMs = Date.now() - dataTimestamp;
            validation.ageHuman = this.formatAge(validation.ageMs);

            // Get freshness threshold for timeframe
            const threshold = this.freshnessThresholds.get(timeframe) || 
                            this.freshnessThresholds.get('5m'); // Default to 5m

            // Calculate freshness score (1.0 = perfectly fresh, 0.0 = completely stale)
            validation.freshnessScore = this.calculateFreshnessScore(validation.ageMs, threshold);

            // Determine status
            if (validation.ageMs < 0) {
                validation.status = 'future';
                validation.warnings.push('Data timestamp is in the future');
                validation.freshnessScore = 1.0; // Future data is technically "fresh"
            } else if (validation.ageMs <= threshold.warningAge) {
                validation.status = 'fresh';
                validation.isFresh = true;
            } else if (validation.ageMs <= threshold.criticalAge) {
                validation.status = 'warning';
                validation.warnings.push(`Data is getting stale (${validation.ageHuman})`);
                validation.isFresh = true; // Still acceptable but with warning
            } else if (validation.ageMs <= threshold.maxAge) {
                validation.status = 'critical';
                validation.warnings.push(`Data is critically stale (${validation.ageHuman})`);
                validation.isFresh = false;
            } else {
                validation.status = 'stale';
                validation.errors.push(`Data is too stale (${validation.ageHuman})`);
                validation.isFresh = false;
            }

            // Apply strict mode validation
            if (this.strictMode.isStrictModeEnabled()) {
                const strictValidation = this.applyStrictModeValidation(validation, threshold);
                validation.errors.push(...strictValidation.errors);
                validation.warnings.push(...strictValidation.warnings);
                if (!strictValidation.passed) {
                    validation.isFresh = false;
                }
            }

            // Store validation history
            this.validationHistory.push(validation);
            if (this.validationHistory.length > 1000) {
                this.validationHistory.shift();
            }

            return validation;

        } catch (error) {
            validation.errors.push(`Freshness validation error: ${error.message}`);
            validation.status = 'error';
            return validation;
        }
    }

    /**
     * Extract timestamp from data object
     */
    extractTimestamp(data) {
        // Try different timestamp field names
        const timestampFields = ['timestamp', 'time', 'datetime', 'date', 'created_at', 'updated_at'];
        
        for (const field of timestampFields) {
            if (data[field]) {
                const timestamp = new Date(data[field]).getTime();
                if (!isNaN(timestamp)) {
                    return timestamp;
                }
            }
        }

        // If no explicit timestamp, try to infer from other fields
        if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
            const lastCandle = data.candles[data.candles.length - 1];
            return this.extractTimestamp(lastCandle);
        }

        return null;
    }

    /**
     * Calculate freshness score based on age and threshold
     */
    calculateFreshnessScore(ageMs, threshold) {
        if (ageMs <= 0) return 1.0; // Future or current data
        if (ageMs >= threshold.maxAge) return 0.0; // Too stale

        // Linear decay from 1.0 to 0.0 over the max age period
        return Math.max(0, 1.0 - (ageMs / threshold.maxAge));
    }

    /**
     * Apply strict mode validation rules
     */
    applyStrictModeValidation(validation, threshold) {
        const strictValidation = {
            passed: true,
            errors: [],
            warnings: []
        };

        const config = this.strictMode.getConfig();

        // Strict mode has tighter freshness requirements
        if (config.failOnStaleData) {
            if (validation.ageMs > config.maxDataAge) {
                strictValidation.passed = false;
                strictValidation.errors.push(
                    `Data exceeds strict mode age limit: ${validation.ageHuman} > ${this.formatAge(config.maxDataAge)}`
                );
            }
        }

        // Require higher freshness score in strict mode
        if (validation.freshnessScore < 0.8) {
            strictValidation.warnings.push(
                `Freshness score below strict mode preference: ${validation.freshnessScore.toFixed(2)}`
            );
        }

        if (validation.freshnessScore < 0.5) {
            strictValidation.passed = false;
            strictValidation.errors.push(
                `Freshness score too low for strict mode: ${validation.freshnessScore.toFixed(2)}`
            );
        }

        return strictValidation;
    }

    /**
     * Format age in human-readable format
     */
    formatAge(ageMs) {
        if (ageMs < 0) return 'future';
        if (ageMs < 1000) return `${ageMs}ms`;
        if (ageMs < 60000) return `${Math.round(ageMs / 1000)}s`;
        if (ageMs < 3600000) return `${Math.round(ageMs / 60000)}m`;
        if (ageMs < 86400000) return `${Math.round(ageMs / 3600000)}h`;
        return `${Math.round(ageMs / 86400000)}d`;
    }

    /**
     * Validate multiple data points for freshness
     */
    validateTimeSeriesFreshness(dataArray, timeframe = '5m', source = 'unknown') {
        const validations = dataArray.map(data => this.validateFreshness(data, timeframe, source));
        
        const overallValidation = {
            timeframe,
            source,
            timestamp: Date.now(),
            count: validations.length,
            freshCount: validations.filter(v => v.isFresh).length,
            averageFreshness: validations.reduce((sum, v) => sum + v.freshnessScore, 0) / validations.length,
            oldestAge: Math.max(...validations.map(v => v.ageMs || 0)),
            newestAge: Math.min(...validations.map(v => v.ageMs || Infinity)),
            allFresh: validations.every(v => v.isFresh),
            errors: validations.flatMap(v => v.errors),
            warnings: validations.flatMap(v => v.warnings),
            validations
        };

        overallValidation.freshnessRate = overallValidation.freshCount / overallValidation.count;
        overallValidation.oldestAgeHuman = this.formatAge(overallValidation.oldestAge);
        overallValidation.newestAgeHuman = this.formatAge(overallValidation.newestAge);

        return overallValidation;
    }

    /**
     * Get freshness statistics
     */
    getFreshnessStats() {
        if (this.validationHistory.length === 0) {
            return { message: 'No freshness validations performed yet' };
        }

        const stats = {
            totalValidations: this.validationHistory.length,
            freshValidations: this.validationHistory.filter(v => v.isFresh).length,
            averageFreshness: this.validationHistory.reduce((sum, v) => sum + v.freshnessScore, 0) / this.validationHistory.length,
            statusDistribution: {},
            timeframeStats: {},
            sourceStats: {}
        };

        stats.freshnessRate = stats.freshValidations / stats.totalValidations;

        // Calculate status distribution
        this.validationHistory.forEach(v => {
            stats.statusDistribution[v.status] = (stats.statusDistribution[v.status] || 0) + 1;
        });

        // Calculate timeframe statistics
        this.validationHistory.forEach(v => {
            if (!stats.timeframeStats[v.timeframe]) {
                stats.timeframeStats[v.timeframe] = {
                    count: 0,
                    freshCount: 0,
                    averageFreshness: 0
                };
            }
            stats.timeframeStats[v.timeframe].count++;
            stats.timeframeStats[v.timeframe].averageFreshness += v.freshnessScore;
            if (v.isFresh) stats.timeframeStats[v.timeframe].freshCount++;
        });

        // Finalize timeframe statistics
        Object.keys(stats.timeframeStats).forEach(timeframe => {
            const tfStats = stats.timeframeStats[timeframe];
            tfStats.averageFreshness /= tfStats.count;
            tfStats.freshnessRate = tfStats.freshCount / tfStats.count;
        });

        // Calculate source statistics
        this.validationHistory.forEach(v => {
            if (!stats.sourceStats[v.source]) {
                stats.sourceStats[v.source] = {
                    count: 0,
                    freshCount: 0,
                    averageFreshness: 0
                };
            }
            stats.sourceStats[v.source].count++;
            stats.sourceStats[v.source].averageFreshness += v.freshnessScore;
            if (v.isFresh) stats.sourceStats[v.source].freshCount++;
        });

        // Finalize source statistics
        Object.keys(stats.sourceStats).forEach(source => {
            const sourceStats = stats.sourceStats[source];
            sourceStats.averageFreshness /= sourceStats.count;
            sourceStats.freshnessRate = sourceStats.freshCount / sourceStats.count;
        });

        return stats;
    }

    /**
     * Get freshness thresholds for all timeframes
     */
    getFreshnessThresholds() {
        const thresholds = {};
        for (const [timeframe, threshold] of this.freshnessThresholds) {
            thresholds[timeframe] = {
                maxAge: threshold.maxAge,
                maxAgeHuman: this.formatAge(threshold.maxAge),
                warningAge: threshold.warningAge,
                warningAgeHuman: this.formatAge(threshold.warningAge),
                criticalAge: threshold.criticalAge,
                criticalAgeHuman: this.formatAge(threshold.criticalAge)
            };
        }
        return thresholds;
    }

    /**
     * Update freshness threshold for a specific timeframe
     */
    updateFreshnessThreshold(timeframe, maxAge) {
        this.freshnessThresholds.set(timeframe, {
            maxAge,
            warningAge: maxAge * 0.7,
            criticalAge: maxAge * 0.9
        });
    }
}

module.exports = { DataFreshnessValidator };
