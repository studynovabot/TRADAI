#!/usr/bin/env node

/**
 * 🛡️ Error Handling & Failover Mechanisms
 * =======================================
 * 
 * Robust error handling, API failover mechanisms, and edge case management
 * for production reliability and zero-error operation
 * 
 * Features:
 * - Comprehensive error classification and handling
 * - Automatic recovery mechanisms
 * - Circuit breaker patterns
 * - Retry logic with exponential backoff
 * - Graceful degradation strategies
 * - Error logging and monitoring
 * 
 * Built for TRADAI Chart Analysis System
 */

const fs = require('fs').promises;
const path = require('path');

class ErrorHandlingSystem {
    constructor(options = {}) {
        this.options = {
            maxRetries: 3,
            baseRetryDelay: 1000,
            maxRetryDelay: 30000,
            circuitBreakerThreshold: 5,
            circuitBreakerTimeout: 60000,
            errorLogPath: './logs/errors.log',
            enableDetailedLogging: true,
            gracefulDegradation: true,
            ...options
        };

        // Error classification
        this.errorTypes = {
            API_ERROR: 'API_ERROR',
            NETWORK_ERROR: 'NETWORK_ERROR',
            PROCESSING_ERROR: 'PROCESSING_ERROR',
            VALIDATION_ERROR: 'VALIDATION_ERROR',
            SYSTEM_ERROR: 'SYSTEM_ERROR',
            TIMEOUT_ERROR: 'TIMEOUT_ERROR',
            QUOTA_ERROR: 'QUOTA_ERROR',
            AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR'
        };

        // Circuit breaker state
        this.circuitBreakers = new Map();

        // Error statistics
        this.errorStats = {
            totalErrors: 0,
            errorsByType: {},
            recoveredErrors: 0,
            unrecoverableErrors: 0,
            circuitBreakerTrips: 0
        };

        // Recovery strategies
        this.recoveryStrategies = new Map();
        this.initializeRecoveryStrategies();
    }

    /**
     * Initialize recovery strategies for different error types
     */
    initializeRecoveryStrategies() {
        this.recoveryStrategies.set(this.errorTypes.API_ERROR, this.handleApiError.bind(this));
        this.recoveryStrategies.set(this.errorTypes.NETWORK_ERROR, this.handleNetworkError.bind(this));
        this.recoveryStrategies.set(this.errorTypes.PROCESSING_ERROR, this.handleProcessingError.bind(this));
        this.recoveryStrategies.set(this.errorTypes.VALIDATION_ERROR, this.handleValidationError.bind(this));
        this.recoveryStrategies.set(this.errorTypes.SYSTEM_ERROR, this.handleSystemError.bind(this));
        this.recoveryStrategies.set(this.errorTypes.TIMEOUT_ERROR, this.handleTimeoutError.bind(this));
        this.recoveryStrategies.set(this.errorTypes.QUOTA_ERROR, this.handleQuotaError.bind(this));
        this.recoveryStrategies.set(this.errorTypes.AUTHENTICATION_ERROR, this.handleAuthenticationError.bind(this));
    }

    /**
     * Main error handling entry point
     */
    async handleError(error, context = {}) {
        try {
            // Classify the error
            const errorType = this.classifyError(error);
            
            // Log the error
            await this.logError(error, errorType, context);
            
            // Update statistics
            this.updateErrorStats(errorType);
            
            // Check circuit breaker
            if (this.shouldTripCircuitBreaker(context.operation)) {
                return await this.handleCircuitBreakerTrip(context.operation, error);
            }
            
            // Attempt recovery
            const recoveryResult = await this.attemptRecovery(error, errorType, context);
            
            if (recoveryResult.recovered) {
                this.errorStats.recoveredErrors++;
                console.log(`✅ Error recovered: ${errorType}`);
                return recoveryResult;
            } else {
                this.errorStats.unrecoverableErrors++;
                console.error(`❌ Unrecoverable error: ${errorType}`);
                
                // Apply graceful degradation if enabled
                if (this.options.gracefulDegradation) {
                    return await this.applyGracefulDegradation(error, errorType, context);
                }
                
                throw error;
            }
            
        } catch (handlingError) {
            console.error('💥 Error in error handling system:', handlingError.message);
            throw error; // Re-throw original error
        }
    }

    /**
     * Classify error type based on error characteristics
     */
    classifyError(error) {
        const message = error.message.toLowerCase();
        const code = error.code;
        const status = error.status || error.statusCode;

        // API-related errors
        if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('forbidden')) {
            return this.errorTypes.AUTHENTICATION_ERROR;
        }
        
        if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
            return this.errorTypes.QUOTA_ERROR;
        }
        
        if (status >= 400 && status < 500) {
            return this.errorTypes.API_ERROR;
        }
        
        if (status >= 500 || message.includes('server error')) {
            return this.errorTypes.API_ERROR;
        }

        // Network-related errors
        if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || 
            message.includes('network') || message.includes('connection')) {
            return this.errorTypes.NETWORK_ERROR;
        }

        // Timeout errors
        if (code === 'TIMEOUT' || message.includes('timeout')) {
            return this.errorTypes.TIMEOUT_ERROR;
        }

        // Validation errors
        if (message.includes('validation') || message.includes('invalid') || 
            message.includes('required') || message.includes('format')) {
            return this.errorTypes.VALIDATION_ERROR;
        }

        // Processing errors
        if (message.includes('processing') || message.includes('analysis') || 
            message.includes('parsing') || message.includes('format')) {
            return this.errorTypes.PROCESSING_ERROR;
        }

        // Default to system error
        return this.errorTypes.SYSTEM_ERROR;
    }

    /**
     * Attempt error recovery based on error type
     */
    async attemptRecovery(error, errorType, context) {
        const strategy = this.recoveryStrategies.get(errorType);
        
        if (!strategy) {
            return { recovered: false, reason: 'No recovery strategy available' };
        }

        try {
            return await strategy(error, context);
        } catch (recoveryError) {
            console.error(`Recovery strategy failed for ${errorType}:`, recoveryError.message);
            return { recovered: false, reason: 'Recovery strategy failed', error: recoveryError };
        }
    }

    /**
     * API Error Recovery Strategy
     */
    async handleApiError(error, context) {
        const retryCount = context.retryCount || 0;
        
        if (retryCount >= this.options.maxRetries) {
            return { recovered: false, reason: 'Max retries exceeded' };
        }

        // Calculate retry delay with exponential backoff
        const delay = Math.min(
            this.options.baseRetryDelay * Math.pow(2, retryCount),
            this.options.maxRetryDelay
        );

        console.log(`🔄 Retrying API call in ${delay}ms (attempt ${retryCount + 1}/${this.options.maxRetries})`);
        
        await this.sleep(delay);
        
        try {
            // Attempt to retry the operation
            if (context.retryFunction) {
                const result = await context.retryFunction();
                return { recovered: true, result, retryCount: retryCount + 1 };
            }
        } catch (retryError) {
            // Recursive retry with incremented count
            return await this.handleApiError(retryError, { 
                ...context, 
                retryCount: retryCount + 1 
            });
        }

        return { recovered: false, reason: 'No retry function provided' };
    }

    /**
     * Network Error Recovery Strategy
     */
    async handleNetworkError(error, context) {
        console.log('🌐 Handling network error...');
        
        // For network errors, try with longer delays
        const retryCount = context.retryCount || 0;
        
        if (retryCount >= this.options.maxRetries) {
            return { recovered: false, reason: 'Network connectivity issues persist' };
        }

        const delay = Math.min(
            this.options.baseRetryDelay * Math.pow(3, retryCount), // Longer backoff for network issues
            this.options.maxRetryDelay
        );

        console.log(`🔄 Retrying network operation in ${delay}ms`);
        await this.sleep(delay);

        try {
            if (context.retryFunction) {
                const result = await context.retryFunction();
                return { recovered: true, result, retryCount: retryCount + 1 };
            }
        } catch (retryError) {
            return await this.handleNetworkError(retryError, { 
                ...context, 
                retryCount: retryCount + 1 
            });
        }

        return { recovered: false, reason: 'No retry function provided' };
    }

    /**
     * Processing Error Recovery Strategy
     */
    async handleProcessingError(error, context) {
        console.log('⚙️ Handling processing error...');
        
        // For processing errors, try alternative processing methods
        if (context.alternativeProcessor) {
            try {
                const result = await context.alternativeProcessor();
                return { recovered: true, result, method: 'alternative_processor' };
            } catch (altError) {
                console.warn('Alternative processor also failed:', altError.message);
            }
        }

        // Try with simplified processing
        if (context.simplifiedProcessor) {
            try {
                const result = await context.simplifiedProcessor();
                return { recovered: true, result, method: 'simplified_processor' };
            } catch (simpError) {
                console.warn('Simplified processor also failed:', simpError.message);
            }
        }

        return { recovered: false, reason: 'No alternative processing methods available' };
    }

    /**
     * Validation Error Recovery Strategy
     */
    async handleValidationError(error, context) {
        console.log('✅ Handling validation error...');
        
        // For validation errors, try data sanitization
        if (context.sanitizeAndRetry) {
            try {
                const result = await context.sanitizeAndRetry();
                return { recovered: true, result, method: 'data_sanitization' };
            } catch (sanitizeError) {
                console.warn('Data sanitization failed:', sanitizeError.message);
            }
        }

        // Try with default values
        if (context.useDefaults) {
            try {
                const result = await context.useDefaults();
                return { recovered: true, result, method: 'default_values' };
            } catch (defaultError) {
                console.warn('Default values approach failed:', defaultError.message);
            }
        }

        return { recovered: false, reason: 'Data validation cannot be resolved' };
    }

    /**
     * System Error Recovery Strategy
     */
    async handleSystemError(error, context) {
        console.log('🖥️ Handling system error...');
        
        // For system errors, try resource cleanup and retry
        if (context.cleanupAndRetry) {
            try {
                await context.cleanupAndRetry();
                return { recovered: true, method: 'cleanup_and_retry' };
            } catch (cleanupError) {
                console.warn('Cleanup and retry failed:', cleanupError.message);
            }
        }

        return { recovered: false, reason: 'System error requires manual intervention' };
    }

    /**
     * Timeout Error Recovery Strategy
     */
    async handleTimeoutError(error, context) {
        console.log('⏰ Handling timeout error...');
        
        // For timeout errors, try with increased timeout
        if (context.retryWithLongerTimeout) {
            try {
                const result = await context.retryWithLongerTimeout();
                return { recovered: true, result, method: 'longer_timeout' };
            } catch (timeoutError) {
                console.warn('Longer timeout also failed:', timeoutError.message);
            }
        }

        return { recovered: false, reason: 'Operation consistently timing out' };
    }

    /**
     * Quota Error Recovery Strategy
     */
    async handleQuotaError(error, context) {
        console.log('📊 Handling quota error...');
        
        // For quota errors, try alternative API key
        if (context.switchApiKey) {
            try {
                const result = await context.switchApiKey();
                return { recovered: true, result, method: 'api_key_switch' };
            } catch (switchError) {
                console.warn('API key switch failed:', switchError.message);
            }
        }

        // Wait for quota reset
        if (context.waitForQuotaReset) {
            const waitTime = context.quotaResetTime || 60000; // Default 1 minute
            console.log(`⏳ Waiting ${waitTime}ms for quota reset...`);
            await this.sleep(waitTime);
            
            try {
                const result = await context.retryFunction();
                return { recovered: true, result, method: 'quota_wait' };
            } catch (quotaError) {
                console.warn('Quota retry failed:', quotaError.message);
            }
        }

        return { recovered: false, reason: 'Quota exceeded and no alternatives available' };
    }

    /**
     * Authentication Error Recovery Strategy
     */
    async handleAuthenticationError(error, context) {
        console.log('🔐 Handling authentication error...');
        
        // For auth errors, try refreshing credentials
        if (context.refreshCredentials) {
            try {
                await context.refreshCredentials();
                const result = await context.retryFunction();
                return { recovered: true, result, method: 'credential_refresh' };
            } catch (authError) {
                console.warn('Credential refresh failed:', authError.message);
            }
        }

        // Try alternative API key
        if (context.switchApiKey) {
            try {
                const result = await context.switchApiKey();
                return { recovered: true, result, method: 'api_key_switch' };
            } catch (switchError) {
                console.warn('API key switch failed:', switchError.message);
            }
        }

        return { recovered: false, reason: 'Authentication cannot be resolved' };
    }

    /**
     * Circuit breaker management
     */
    shouldTripCircuitBreaker(operation) {
        if (!operation) return false;
        
        const breaker = this.circuitBreakers.get(operation) || { failures: 0, lastFailure: null, state: 'CLOSED' };
        
        if (breaker.state === 'OPEN') {
            const timeSinceLastFailure = Date.now() - breaker.lastFailure;
            if (timeSinceLastFailure > this.options.circuitBreakerTimeout) {
                breaker.state = 'HALF_OPEN';
                this.circuitBreakers.set(operation, breaker);
                return false;
            }
            return true;
        }
        
        breaker.failures++;
        breaker.lastFailure = Date.now();
        
        if (breaker.failures >= this.options.circuitBreakerThreshold) {
            breaker.state = 'OPEN';
            this.errorStats.circuitBreakerTrips++;
            console.warn(`🚨 Circuit breaker OPEN for operation: ${operation}`);
        }
        
        this.circuitBreakers.set(operation, breaker);
        return breaker.state === 'OPEN';
    }

    /**
     * Handle circuit breaker trip
     */
    async handleCircuitBreakerTrip(operation, error) {
        console.warn(`⚡ Circuit breaker tripped for ${operation}`);
        
        return {
            recovered: false,
            reason: 'Circuit breaker is open',
            circuitBreakerTripped: true,
            operation,
            error: error.message
        };
    }

    /**
     * Apply graceful degradation
     */
    async applyGracefulDegradation(error, errorType, context) {
        console.log('🔄 Applying graceful degradation...');
        
        const degradedResult = {
            recovered: true,
            degraded: true,
            errorType,
            originalError: error.message,
            fallbackData: null
        };

        // Provide fallback based on context
        switch (context.operation) {
            case 'chart_analysis':
                degradedResult.fallbackData = this.getChartAnalysisFallback();
                break;
            case 'signal_generation':
                degradedResult.fallbackData = this.getSignalGenerationFallback();
                break;
            case 'technical_analysis':
                degradedResult.fallbackData = this.getTechnicalAnalysisFallback();
                break;
            default:
                degradedResult.fallbackData = this.getGenericFallback();
        }

        return degradedResult;
    }

    /**
     * Fallback data generators
     */
    getChartAnalysisFallback() {
        return {
            signal: 'NO TRADE',
            confidence: 0,
            reasoning: 'Chart analysis unavailable due to system error - trading not recommended',
            riskLevel: 'HIGH',
            recommendation: 'WAIT'
        };
    }

    getSignalGenerationFallback() {
        return {
            signal: 'NO TRADE',
            confidence: 0,
            reasoning: 'Signal generation system unavailable - avoid trading',
            riskAssessment: 'HIGH_RISK'
        };
    }

    getTechnicalAnalysisFallback() {
        return {
            indicators: {},
            patterns: {},
            trend: 'UNKNOWN',
            recommendation: 'NO TRADE'
        };
    }

    getGenericFallback() {
        return {
            status: 'DEGRADED',
            message: 'Service temporarily unavailable',
            recommendation: 'Retry later'
        };
    }

    /**
     * Error logging
     */
    async logError(error, errorType, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            errorType,
            message: error.message,
            stack: error.stack,
            context,
            operation: context.operation || 'unknown'
        };

        if (this.options.enableDetailedLogging) {
            try {
                const logDir = path.dirname(this.options.errorLogPath);
                await fs.mkdir(logDir, { recursive: true });
                
                const logLine = JSON.stringify(logEntry) + '\n';
                await fs.appendFile(this.options.errorLogPath, logLine);
            } catch (logError) {
                console.error('Failed to write error log:', logError.message);
            }
        }

        // Console logging
        console.error(`🚨 ${errorType}: ${error.message}`);
        if (context.operation) {
            console.error(`   Operation: ${context.operation}`);
        }
    }

    /**
     * Update error statistics
     */
    updateErrorStats(errorType) {
        this.errorStats.totalErrors++;
        this.errorStats.errorsByType[errorType] = (this.errorStats.errorsByType[errorType] || 0) + 1;
    }

    /**
     * Reset circuit breaker for operation
     */
    resetCircuitBreaker(operation) {
        this.circuitBreakers.delete(operation);
        console.log(`🔄 Circuit breaker reset for operation: ${operation}`);
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            ...this.errorStats,
            circuitBreakers: Object.fromEntries(this.circuitBreakers),
            errorRate: this.errorStats.totalErrors > 0 ? 
                (this.errorStats.unrecoverableErrors / this.errorStats.totalErrors * 100).toFixed(2) + '%' : '0%',
            recoveryRate: this.errorStats.totalErrors > 0 ? 
                (this.errorStats.recoveredErrors / this.errorStats.totalErrors * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Utility method for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = { ErrorHandlingSystem };
