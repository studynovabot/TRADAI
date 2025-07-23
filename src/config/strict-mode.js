/**
 * Strict Real-Data-Only Mode Configuration
 * 
 * This configuration enforces that the system only uses real market data
 * and never falls back to synthetic, mock, or demo data.
 */

class StrictModeConfig {
    constructor() {
        this.config = {
            // Core strict mode settings
            strictMode: true,
            allowFallbacks: false,
            allowSyntheticData: false,
            allowMockData: false,
            allowDemoSignals: false,
            
            // Data quality requirements
            minDataQuality: 0.75, // 75% minimum confidence (was 0.9/90%)
            maxDataAge: 5 * 60 * 1000, // 5 minutes in milliseconds
            requiredDataCompleteness: 0.95,
            
            // Error handling
            failOnNoData: true,
            failOnLowQuality: true,
            failOnStaleData: true,
            
            // API requirements
            requireLegitimateAPIs: true,
            allowedDataSources: [
                'TwelveData',
                'Finnhub', 
                'AlphaVantage',
                'Polygon',
                'Yahoo Finance'
            ],
            
            // Validation settings
            validateDataSource: true,
            validateDataFreshness: true,
            validateDataIntegrity: true,
            
            // Logging
            logDataSources: true,
            logQualityScores: true,
            logValidationResults: true
        };
    }

    /**
     * Get the current strict mode configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Check if strict mode is enabled
     */
    isStrictModeEnabled() {
        return this.config.strictMode;
    }

    /**
     * Validate if a data source is allowed
     */
    isDataSourceAllowed(source) {
        if (!this.config.validateDataSource) return true;
        return this.config.allowedDataSources.includes(source);
    }

    /**
     * Validate data quality against strict mode requirements
     */
    validateDataQuality(data, qualityScore) {
        const validations = {
            passed: true,
            errors: [],
            warnings: []
        };

        // Check if fallbacks are being used
        if (this.config.strictMode && !this.config.allowFallbacks) {
            if (data.source === 'fallback' || data.source === 'synthetic' || data.source === 'mock') {
                validations.passed = false;
                validations.errors.push(`Fallback data source not allowed: ${data.source}`);
            }
        }

        // Check data quality score
        if (qualityScore < this.config.minDataQuality) {
            if (this.config.failOnLowQuality) {
                validations.passed = false;
                validations.errors.push(`Data quality too low: ${qualityScore} < ${this.config.minDataQuality}`);
            } else {
                validations.warnings.push(`Low data quality: ${qualityScore}`);
            }
        }

        // Check data freshness
        if (data.timestamp) {
            const dataAge = Date.now() - new Date(data.timestamp).getTime();
            if (dataAge > this.config.maxDataAge) {
                if (this.config.failOnStaleData) {
                    validations.passed = false;
                    validations.errors.push(`Data too stale: ${dataAge}ms > ${this.config.maxDataAge}ms`);
                } else {
                    validations.warnings.push(`Stale data: ${dataAge}ms old`);
                }
            }
        }

        // Check data source
        if (data.source && !this.isDataSourceAllowed(data.source)) {
            validations.passed = false;
            validations.errors.push(`Data source not allowed: ${data.source}`);
        }

        return validations;
    }

    /**
     * Create error for strict mode violations
     */
    createStrictModeError(message, data = {}) {
        const error = new Error(`STRICT_MODE_VIOLATION: ${message}`);
        error.code = 'STRICT_MODE_VIOLATION';
        error.strictMode = true;
        error.data = data;
        return error;
    }

    /**
     * Log strict mode validation results
     */
    logValidation(validation, context = '') {
        if (!this.config.logValidationResults) return;

        if (validation.passed) {
            console.log(`✅ [STRICT MODE] Validation passed ${context}`);
        } else {
            console.error(`❌ [STRICT MODE] Validation failed ${context}:`, validation.errors);
        }

        if (validation.warnings.length > 0) {
            console.warn(`⚠️ [STRICT MODE] Warnings ${context}:`, validation.warnings);
        }
    }

    /**
     * Enforce strict mode for signal generation
     */
    enforceStrictSignalGeneration(signal) {
        if (!this.config.strictMode) return signal;

        // Check for demo or fallback signals
        if (signal.id && signal.id.includes('demo')) {
            throw this.createStrictModeError('Demo signals not allowed', { signalId: signal.id });
        }

        if (signal.dataSource === 'fallback' || signal.dataSource === 'synthetic' || signal.dataSource === 'mock') {
            throw this.createStrictModeError('Fallback signal sources not allowed', { 
                dataSource: signal.dataSource 
            });
        }

        // Check confidence and quality requirements
        if (signal.qualityScore && signal.qualityScore < this.config.minDataQuality) {
            throw this.createStrictModeError('Signal quality below minimum threshold', {
                qualityScore: signal.qualityScore,
                minRequired: this.config.minDataQuality
            });
        }

        return signal;
    }

    /**
     * Get strict mode status for health checks
     */
    getStatus() {
        return {
            strictMode: this.config.strictMode,
            allowFallbacks: this.config.allowFallbacks,
            allowSyntheticData: this.config.allowSyntheticData,
            allowMockData: this.config.allowMockData,
            minDataQuality: this.config.minDataQuality,
            maxDataAge: this.config.maxDataAge,
            allowedDataSources: this.config.allowedDataSources.length,
            validationEnabled: this.config.validateDataSource
        };
    }
}

// Export singleton instance
const strictModeConfig = new StrictModeConfig();

module.exports = {
    StrictModeConfig,
    strictModeConfig
};
