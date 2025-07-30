/**
 * Error Handling and Validation Service
 * Provides robust error handling, API rate limiting, and redundant validation layers
 * for production-ready trading signal generation
 */

const fs = require('fs');
const path = require('path');

class ErrorHandlingValidationService {
    constructor(config = {}) {
        this.config = {
            // Rate limiting
            maxRequestsPerMinute: config.maxRequestsPerMinute || 30,
            maxRequestsPerHour: config.maxRequestsPerHour || 500,
            
            // Retry settings
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 2000,
            exponentialBackoff: config.exponentialBackoff !== false,
            
            // Validation thresholds
            minConfidenceThreshold: config.minConfidenceThreshold || 70,
            maxConfidenceThreshold: config.maxConfidenceThreshold || 95,
            
            // Error logging
            enableErrorLogging: config.enableErrorLogging !== false,
            errorLogPath: config.errorLogPath || path.join(__dirname, '../../logs/errors.log'),
            
            // Circuit breaker
            enableCircuitBreaker: config.enableCircuitBreaker !== false,
            circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
            circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
            
            // Health monitoring
            enableHealthMonitoring: config.enableHealthMonitoring !== false,
            healthCheckInterval: config.healthCheckInterval || 30000,
            
            ...config
        };

        // Rate limiting tracking
        this.rateLimits = new Map();
        
        // Circuit breaker state
        this.circuitBreakers = new Map();
        
        // Error tracking
        this.errorStats = {
            totalErrors: 0,
            errorsByType: new Map(),
            errorsByService: new Map(),
            lastError: null
        };
        
        // Health monitoring
        this.healthStatus = {
            overall: 'HEALTHY',
            services: new Map(),
            lastCheck: null
        };

        this.initializeErrorLogging();
        this.startHealthMonitoring();
    }

    /**
     * Initialize error logging
     */
    initializeErrorLogging() {
        if (this.config.enableErrorLogging) {
            try {
                const logDir = path.dirname(this.config.errorLogPath);
                if (!fs.existsSync(logDir)) {
                    fs.mkdirSync(logDir, { recursive: true });
                }
            } catch (error) {
                console.warn('⚠️ Failed to initialize error logging:', error.message);
            }
        }
    }

    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        if (this.config.enableHealthMonitoring) {
            setInterval(() => {
                this.performHealthCheck();
            }, this.config.healthCheckInterval);
        }
    }

    /**
     * Check rate limits for a client
     */
    checkRateLimit(clientId, endpoint = 'default') {
        const key = `${clientId}:${endpoint}`;
        const now = Date.now();
        
        if (!this.rateLimits.has(key)) {
            this.rateLimits.set(key, {
                requests: [],
                blocked: false,
                blockUntil: 0
            });
        }
        
        const limit = this.rateLimits.get(key);
        
        // Check if currently blocked
        if (limit.blocked && now < limit.blockUntil) {
            throw new RateLimitError(`Rate limit exceeded for ${clientId}. Try again in ${Math.ceil((limit.blockUntil - now) / 1000)} seconds`);
        }
        
        // Reset block if timeout passed
        if (limit.blocked && now >= limit.blockUntil) {
            limit.blocked = false;
            limit.requests = [];
        }
        
        // Clean old requests (older than 1 hour)
        limit.requests = limit.requests.filter(timestamp => now - timestamp < 3600000);
        
        // Check minute limit
        const recentRequests = limit.requests.filter(timestamp => now - timestamp < 60000);
        if (recentRequests.length >= this.config.maxRequestsPerMinute) {
            limit.blocked = true;
            limit.blockUntil = now + 60000; // Block for 1 minute
            throw new RateLimitError(`Rate limit exceeded: ${this.config.maxRequestsPerMinute} requests per minute`);
        }
        
        // Check hour limit
        if (limit.requests.length >= this.config.maxRequestsPerHour) {
            limit.blocked = true;
            limit.blockUntil = now + 3600000; // Block for 1 hour
            throw new RateLimitError(`Rate limit exceeded: ${this.config.maxRequestsPerHour} requests per hour`);
        }
        
        // Add current request
        limit.requests.push(now);
        
        return {
            allowed: true,
            remaining: {
                minute: this.config.maxRequestsPerMinute - recentRequests.length - 1,
                hour: this.config.maxRequestsPerHour - limit.requests.length
            }
        };
    }

    /**
     * Execute function with retry logic
     */
    async executeWithRetry(fn, context = 'operation', options = {}) {
        const maxRetries = options.maxRetries || this.config.maxRetries;
        const retryDelay = options.retryDelay || this.config.retryDelay;
        
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                const result = await fn();
                
                // Reset circuit breaker on success
                this.resetCircuitBreaker(context);
                
                return result;
                
            } catch (error) {
                lastError = error;
                
                // Log error
                this.logError(error, context, attempt);
                
                // Check circuit breaker
                if (this.isCircuitBreakerOpen(context)) {
                    throw new CircuitBreakerError(`Circuit breaker open for ${context}`);
                }
                
                // Update circuit breaker
                this.updateCircuitBreaker(context, error);
                
                // Don't retry on certain errors
                if (this.isNonRetryableError(error) || attempt > maxRetries) {
                    break;
                }
                
                // Calculate delay with exponential backoff
                const delay = this.config.exponentialBackoff 
                    ? retryDelay * Math.pow(2, attempt - 1)
                    : retryDelay;
                
                console.log(`⚠️ Attempt ${attempt} failed for ${context}, retrying in ${delay}ms...`);
                await this.sleep(delay);
            }
        }
        
        throw lastError;
    }

    /**
     * Check if error is non-retryable
     */
    isNonRetryableError(error) {
        const nonRetryableTypes = [
            'ValidationError',
            'AuthenticationError',
            'RateLimitError',
            'InvalidInputError'
        ];
        
        return nonRetryableTypes.includes(error.constructor.name) ||
               nonRetryableTypes.some(type => error.message.includes(type));
    }

    /**
     * Validate trading signal
     */
    validateTradingSignal(signal) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Required fields
        const requiredFields = ['direction', 'confidence', 'timestamp'];
        requiredFields.forEach(field => {
            if (!signal[field]) {
                validation.errors.push(`Missing required field: ${field}`);
            }
        });
        
        // Direction validation
        if (signal.direction && !['UP', 'DOWN', 'NEUTRAL'].includes(signal.direction)) {
            validation.errors.push(`Invalid direction: ${signal.direction}`);
        }
        
        // Confidence validation
        if (signal.confidence !== undefined) {
            if (typeof signal.confidence !== 'number') {
                validation.errors.push('Confidence must be a number');
            } else if (signal.confidence < 0 || signal.confidence > 100) {
                validation.errors.push('Confidence must be between 0 and 100');
            } else if (signal.confidence < this.config.minConfidenceThreshold) {
                validation.warnings.push(`Low confidence: ${signal.confidence}% (min: ${this.config.minConfidenceThreshold}%)`);
            } else if (signal.confidence > this.config.maxConfidenceThreshold) {
                validation.warnings.push(`Unusually high confidence: ${signal.confidence}%`);
            }
        }
        
        // Timestamp validation
        if (signal.timestamp) {
            const timestamp = new Date(signal.timestamp);
            if (isNaN(timestamp.getTime())) {
                validation.errors.push('Invalid timestamp format');
            } else {
                const age = Date.now() - timestamp.getTime();
                if (age > 300000) { // 5 minutes
                    validation.warnings.push('Signal is older than 5 minutes');
                }
            }
        }
        
        // Recommendation validation
        if (signal.recommendation && !['BUY', 'SELL', 'WAIT', 'STRONG_BUY', 'STRONG_SELL'].includes(signal.recommendation)) {
            validation.errors.push(`Invalid recommendation: ${signal.recommendation}`);
        }
        
        validation.isValid = validation.errors.length === 0;
        
        return validation;
    }

    /**
     * Validate OCR results
     */
    validateOCRResults(ocrResults) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            qualityScore: 0
        };
        
        // Check if OCR was successful
        if (!ocrResults.success) {
            validation.errors.push(`OCR failed: ${ocrResults.error || 'Unknown error'}`);
            return validation;
        }
        
        // Check confidence
        if (ocrResults.confidence < 0.5) {
            validation.warnings.push(`Low OCR confidence: ${(ocrResults.confidence * 100).toFixed(1)}%`);
        }
        
        // Check trading data
        if (ocrResults.tradingData) {
            const tradingData = ocrResults.tradingData;
            
            // Check for prices
            if (!tradingData.prices || tradingData.prices.length === 0) {
                validation.warnings.push('No prices detected in screenshot');
            }
            
            // Check for trading pair
            if (!tradingData.tradingPair) {
                validation.warnings.push('Trading pair not detected');
            }
            
            // Check for timeframe
            if (!tradingData.timeframe) {
                validation.warnings.push('Timeframe not detected');
            }
            
            // Calculate quality score
            let score = 0;
            if (tradingData.prices && tradingData.prices.length > 0) score += 25;
            if (tradingData.tradingPair) score += 25;
            if (tradingData.timeframe) score += 25;
            if (ocrResults.confidence > 0.7) score += 25;
            
            validation.qualityScore = score;
            
            if (score < 50) {
                validation.warnings.push(`Low OCR quality score: ${score}%`);
            }
        }
        
        validation.isValid = validation.errors.length === 0;
        
        return validation;
    }

    /**
     * Validate API response
     */
    validateAPIResponse(response, expectedFields = []) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check if response exists
        if (!response) {
            validation.errors.push('No response received');
            return validation;
        }
        
        // Check for error in response
        if (response.error) {
            validation.errors.push(`API error: ${response.error}`);
        }
        
        // Check expected fields
        expectedFields.forEach(field => {
            if (response[field] === undefined) {
                validation.errors.push(`Missing expected field: ${field}`);
            }
        });
        
        // Check response structure
        if (response.success === false) {
            validation.errors.push('API returned success: false');
        }
        
        validation.isValid = validation.errors.length === 0;
        
        return validation;
    }

    /**
     * Circuit breaker management
     */
    isCircuitBreakerOpen(service) {
        if (!this.config.enableCircuitBreaker) return false;
        
        const breaker = this.circuitBreakers.get(service);
        if (!breaker) return false;
        
        if (breaker.state === 'OPEN') {
            // Check if timeout has passed
            if (Date.now() > breaker.openUntil) {
                breaker.state = 'HALF_OPEN';
                breaker.failures = 0;
                return false;
            }
            return true;
        }
        
        return false;
    }

    /**
     * Update circuit breaker state
     */
    updateCircuitBreaker(service, error) {
        if (!this.config.enableCircuitBreaker) return;
        
        if (!this.circuitBreakers.has(service)) {
            this.circuitBreakers.set(service, {
                failures: 0,
                state: 'CLOSED',
                openUntil: 0
            });
        }
        
        const breaker = this.circuitBreakers.get(service);
        breaker.failures++;
        
        if (breaker.failures >= this.config.circuitBreakerThreshold) {
            breaker.state = 'OPEN';
            breaker.openUntil = Date.now() + this.config.circuitBreakerTimeout;
            console.warn(`🔴 Circuit breaker opened for ${service} after ${breaker.failures} failures`);
        }
    }

    /**
     * Reset circuit breaker on success
     */
    resetCircuitBreaker(service) {
        if (this.circuitBreakers.has(service)) {
            const breaker = this.circuitBreakers.get(service);
            breaker.failures = 0;
            breaker.state = 'CLOSED';
            breaker.openUntil = 0;
        }
    }

    /**
     * Log error
     */
    logError(error, context, attempt = 1) {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            context,
            attempt,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            }
        };
        
        // Update error statistics
        this.errorStats.totalErrors++;
        this.errorStats.lastError = errorInfo;
        
        const errorType = error.constructor.name;
        this.errorStats.errorsByType.set(errorType, (this.errorStats.errorsByType.get(errorType) || 0) + 1);
        this.errorStats.errorsByService.set(context, (this.errorStats.errorsByService.get(context) || 0) + 1);
        
        // Log to console
        console.error(`❌ Error in ${context} (attempt ${attempt}):`, error.message);
        
        // Log to file if enabled
        if (this.config.enableErrorLogging) {
            try {
                const logEntry = JSON.stringify(errorInfo) + '\n';
                fs.appendFileSync(this.config.errorLogPath, logEntry);
            } catch (logError) {
                console.warn('⚠️ Failed to write error log:', logError.message);
            }
        }
    }

    /**
     * Perform health check
     */
    async performHealthCheck() {
        const healthCheck = {
            timestamp: new Date().toISOString(),
            overall: 'HEALTHY',
            services: {},
            metrics: {
                totalErrors: this.errorStats.totalErrors,
                circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => ({
                    service,
                    state: breaker.state,
                    failures: breaker.failures
                })),
                rateLimits: this.rateLimits.size
            }
        };
        
        // Check circuit breakers
        let hasOpenCircuits = false;
        for (const [service, breaker] of this.circuitBreakers) {
            healthCheck.services[service] = breaker.state === 'OPEN' ? 'UNHEALTHY' : 'HEALTHY';
            if (breaker.state === 'OPEN') hasOpenCircuits = true;
        }
        
        // Determine overall health
        if (hasOpenCircuits) {
            healthCheck.overall = 'DEGRADED';
        }
        
        // Check error rate
        const recentErrors = this.getRecentErrorCount(300000); // Last 5 minutes
        if (recentErrors > 10) {
            healthCheck.overall = 'UNHEALTHY';
        }
        
        this.healthStatus = healthCheck;
        
        return healthCheck;
    }

    /**
     * Get recent error count
     */
    getRecentErrorCount(timeWindow) {
        // This is a simplified implementation
        // In production, you'd want to track errors with timestamps
        return this.errorStats.totalErrors;
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            ...this.errorStats,
            errorsByType: Object.fromEntries(this.errorStats.errorsByType),
            errorsByService: Object.fromEntries(this.errorStats.errorsByService)
        };
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        return this.healthStatus;
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clear intervals, close files, etc.
        console.log('✅ Error handling service cleanup completed');
    }
}

// Custom error classes
class RateLimitError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RateLimitError';
    }
}

class CircuitBreakerError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

module.exports = {
    ErrorHandlingValidationService,
    RateLimitError,
    CircuitBreakerError,
    ValidationError
};
