/**
 * Data Source Verifier
 * 
 * Verifies that all market data comes from legitimate financial APIs
 * and maintains a registry of trusted data providers.
 */

const { strictModeConfig } = require('../config/strict-mode');

class DataSourceVerifier {
    constructor() {
        this.strictMode = strictModeConfig;
        this.trustedProviders = new Map();
        this.verificationHistory = [];
        this.initializeTrustedProviders();
    }

    /**
     * Initialize trusted data providers with their configurations
     */
    initializeTrustedProviders() {
        const providers = [
            {
                name: 'TwelveData',
                baseUrl: 'https://api.twelvedata.com',
                apiKeyRequired: true,
                rateLimit: 800, // requests per minute
                reliability: 0.95,
                supportedSymbols: ['forex', 'stocks', 'crypto'],
                dataTypes: ['ohlcv', 'real-time', 'historical']
            },
            {
                name: 'Finnhub',
                baseUrl: 'https://finnhub.io/api/v1',
                apiKeyRequired: true,
                rateLimit: 60, // requests per minute
                reliability: 0.90,
                supportedSymbols: ['forex', 'stocks'],
                dataTypes: ['ohlcv', 'real-time', 'historical']
            },
            {
                name: 'AlphaVantage',
                baseUrl: 'https://www.alphavantage.co/query',
                apiKeyRequired: true,
                rateLimit: 5, // requests per minute (free tier)
                reliability: 0.85,
                supportedSymbols: ['forex', 'stocks', 'crypto'],
                dataTypes: ['ohlcv', 'historical']
            },
            {
                name: 'Polygon',
                baseUrl: 'https://api.polygon.io',
                apiKeyRequired: true,
                rateLimit: 1000, // requests per minute
                reliability: 0.90,
                supportedSymbols: ['forex', 'stocks', 'crypto'],
                dataTypes: ['ohlcv', 'real-time', 'historical']
            },
            {
                name: 'Yahoo Finance',
                baseUrl: 'https://query1.finance.yahoo.com',
                apiKeyRequired: false,
                rateLimit: 2000, // requests per minute (unofficial)
                reliability: 0.80,
                supportedSymbols: ['forex', 'stocks', 'crypto'],
                dataTypes: ['ohlcv', 'historical']
            }
        ];

        providers.forEach(provider => {
            this.trustedProviders.set(provider.name, {
                ...provider,
                status: 'unknown',
                lastHealthCheck: null,
                consecutiveFailures: 0,
                totalRequests: 0,
                successfulRequests: 0
            });
        });
    }

    /**
     * Verify if a data source is legitimate and trusted
     */
    verifyDataSource(source, data = {}) {
        const verification = {
            source,
            timestamp: Date.now(),
            isLegitimate: false,
            isTrusted: false,
            provider: null,
            confidence: 0,
            warnings: [],
            errors: []
        };

        try {
            // Check if source is in our trusted providers list
            if (this.trustedProviders.has(source)) {
                verification.provider = this.trustedProviders.get(source);
                verification.isTrusted = true;
                verification.isLegitimate = true;
                verification.confidence = verification.provider.reliability;
            } else {
                // Check for known illegitimate sources
                const illegitimateSources = ['fallback', 'synthetic', 'mock', 'demo', 'simulated'];
                if (illegitimateSources.includes(source.toLowerCase())) {
                    verification.errors.push(`Illegitimate data source: ${source}`);
                    verification.confidence = 0;
                } else {
                    verification.warnings.push(`Unknown data source: ${source}`);
                    verification.confidence = 0.3; // Low confidence for unknown sources
                }
            }

            // Additional verification based on data characteristics
            if (data.url) {
                verification.confidence *= this.verifyDataUrl(data.url, verification);
            }

            // Apply strict mode validation
            if (this.strictMode.isStrictModeEnabled()) {
                if (!verification.isTrusted) {
                    verification.errors.push('Untrusted data source not allowed in strict mode');
                }
                if (verification.confidence < 0.8) {
                    verification.errors.push('Data source confidence too low for strict mode');
                }
            }

            // Store verification history
            this.verificationHistory.push(verification);
            if (this.verificationHistory.length > 1000) {
                this.verificationHistory.shift();
            }

            return verification;

        } catch (error) {
            verification.errors.push(`Verification error: ${error.message}`);
            return verification;
        }
    }

    /**
     * Verify data URL against known legitimate endpoints
     */
    verifyDataUrl(url, verification) {
        let confidenceMultiplier = 1.0;

        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();

            // Check against trusted provider base URLs
            for (const [name, provider] of this.trustedProviders) {
                const providerUrl = new URL(provider.baseUrl);
                if (hostname === providerUrl.hostname) {
                    verification.provider = provider;
                    return 1.0; // Full confidence
                }
            }

            // Check for suspicious patterns
            const suspiciousPatterns = [
                'localhost',
                '127.0.0.1',
                'test',
                'demo',
                'mock',
                'fake',
                'simulator'
            ];

            if (suspiciousPatterns.some(pattern => hostname.includes(pattern))) {
                verification.warnings.push(`Suspicious hostname: ${hostname}`);
                confidenceMultiplier *= 0.1;
            }

            // Check for legitimate financial data domains
            const legitimateDomains = [
                'twelvedata.com',
                'finnhub.io',
                'alphavantage.co',
                'polygon.io',
                'yahoo.com',
                'finance.yahoo.com',
                'bloomberg.com',
                'reuters.com'
            ];

            if (legitimateDomains.some(domain => hostname.includes(domain))) {
                confidenceMultiplier *= 1.2; // Boost confidence
            }

        } catch (error) {
            verification.warnings.push(`Invalid URL: ${url}`);
            confidenceMultiplier *= 0.5;
        }

        return Math.min(1.0, confidenceMultiplier);
    }

    /**
     * Perform health check on a data provider
     */
    async performHealthCheck(providerName) {
        const provider = this.trustedProviders.get(providerName);
        if (!provider) {
            throw new Error(`Unknown provider: ${providerName}`);
        }

        const healthCheck = {
            provider: providerName,
            timestamp: Date.now(),
            status: 'unknown',
            responseTime: null,
            error: null
        };

        try {
            const startTime = Date.now();
            
            // Perform a simple HTTP request to check if the API is reachable
            const response = await fetch(provider.baseUrl, {
                method: 'HEAD',
                timeout: 10000 // 10 second timeout
            });

            healthCheck.responseTime = Date.now() - startTime;

            if (response.ok) {
                healthCheck.status = 'healthy';
                provider.status = 'healthy';
                provider.consecutiveFailures = 0;
            } else {
                healthCheck.status = 'degraded';
                healthCheck.error = `HTTP ${response.status}`;
                provider.status = 'degraded';
                provider.consecutiveFailures++;
            }

        } catch (error) {
            healthCheck.status = 'unhealthy';
            healthCheck.error = error.message;
            provider.status = 'unhealthy';
            provider.consecutiveFailures++;
        }

        provider.lastHealthCheck = healthCheck.timestamp;
        return healthCheck;
    }

    /**
     * Get health status of all providers
     */
    async getProvidersHealth() {
        const healthStatus = {
            timestamp: Date.now(),
            providers: {},
            summary: {
                total: this.trustedProviders.size,
                healthy: 0,
                degraded: 0,
                unhealthy: 0,
                unknown: 0
            }
        };

        for (const [name, provider] of this.trustedProviders) {
            try {
                const health = await this.performHealthCheck(name);
                healthStatus.providers[name] = {
                    ...health,
                    reliability: provider.reliability,
                    consecutiveFailures: provider.consecutiveFailures,
                    successRate: provider.totalRequests > 0 ? 
                        provider.successfulRequests / provider.totalRequests : 0
                };

                healthStatus.summary[health.status]++;
            } catch (error) {
                healthStatus.providers[name] = {
                    status: 'error',
                    error: error.message
                };
                healthStatus.summary.unhealthy++;
            }
        }

        return healthStatus;
    }

    /**
     * Record a successful data request
     */
    recordSuccessfulRequest(providerName) {
        const provider = this.trustedProviders.get(providerName);
        if (provider) {
            provider.totalRequests++;
            provider.successfulRequests++;
            provider.consecutiveFailures = 0;
        }
    }

    /**
     * Record a failed data request
     */
    recordFailedRequest(providerName, error) {
        const provider = this.trustedProviders.get(providerName);
        if (provider) {
            provider.totalRequests++;
            provider.consecutiveFailures++;
            
            // Mark as unhealthy after 3 consecutive failures
            if (provider.consecutiveFailures >= 3) {
                provider.status = 'unhealthy';
            }
        }
    }

    /**
     * Get verification statistics
     */
    getVerificationStats() {
        const stats = {
            totalVerifications: this.verificationHistory.length,
            legitimateCount: this.verificationHistory.filter(v => v.isLegitimate).length,
            trustedCount: this.verificationHistory.filter(v => v.isTrusted).length,
            averageConfidence: 0,
            sourceDistribution: {},
            commonWarnings: {},
            commonErrors: {}
        };

        if (stats.totalVerifications > 0) {
            stats.averageConfidence = this.verificationHistory.reduce((sum, v) => sum + v.confidence, 0) / stats.totalVerifications;
            stats.legitimacyRate = stats.legitimateCount / stats.totalVerifications;
            stats.trustRate = stats.trustedCount / stats.totalVerifications;

            // Calculate distributions
            this.verificationHistory.forEach(v => {
                stats.sourceDistribution[v.source] = (stats.sourceDistribution[v.source] || 0) + 1;
                
                v.warnings.forEach(warning => {
                    stats.commonWarnings[warning] = (stats.commonWarnings[warning] || 0) + 1;
                });
                
                v.errors.forEach(error => {
                    stats.commonErrors[error] = (stats.commonErrors[error] || 0) + 1;
                });
            });
        }

        return stats;
    }

    /**
     * Get list of trusted providers
     */
    getTrustedProviders() {
        const providers = {};
        for (const [name, provider] of this.trustedProviders) {
            providers[name] = {
                name: provider.name,
                reliability: provider.reliability,
                status: provider.status,
                rateLimit: provider.rateLimit,
                supportedSymbols: provider.supportedSymbols,
                dataTypes: provider.dataTypes,
                lastHealthCheck: provider.lastHealthCheck,
                successRate: provider.totalRequests > 0 ? 
                    provider.successfulRequests / provider.totalRequests : 0
            };
        }
        return providers;
    }
}

module.exports = { DataSourceVerifier };
