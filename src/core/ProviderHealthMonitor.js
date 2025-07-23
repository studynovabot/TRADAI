/**
 * Provider Health Monitor
 * 
 * Monitors the health of all data providers and implements automatic failover
 * between healthy providers only. No fallbacks to synthetic data allowed.
 */

const { DataSourceVerifier } = require('./DataSourceVerifier');
const { strictModeConfig } = require('../config/strict-mode');

class ProviderHealthMonitor {
    constructor() {
        this.dataSourceVerifier = new DataSourceVerifier();
        this.strictMode = strictModeConfig;
        this.healthChecks = new Map();
        this.providerMetrics = new Map();
        this.monitoringInterval = null;
        this.alertThresholds = {
            responseTime: 5000, // 5 seconds
            errorRate: 0.1, // 10%
            consecutiveFailures: 3
        };
        this.initializeProviderMetrics();
    }

    /**
     * Initialize metrics tracking for all providers
     */
    initializeProviderMetrics() {
        const trustedProviders = this.dataSourceVerifier.getTrustedProviders();
        
        Object.keys(trustedProviders).forEach(providerName => {
            this.providerMetrics.set(providerName, {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                consecutiveFailures: 0,
                consecutiveSuccesses: 0,
                lastSuccessTime: null,
                lastFailureTime: null,
                status: 'unknown',
                healthScore: 0.5,
                isHealthy: false,
                alerts: []
            });
        });
    }

    /**
     * Start continuous health monitoring
     */
    startMonitoring(intervalMs = 60000) { // Default: 1 minute
        if (this.monitoringInterval) {
            this.stopMonitoring();
        }

        console.log(`🏥 Starting provider health monitoring (interval: ${intervalMs}ms)`);
        
        this.monitoringInterval = setInterval(async () => {
            await this.performHealthChecks();
        }, intervalMs);

        // Perform initial health check
        this.performHealthChecks();
    }

    /**
     * Stop health monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🏥 Provider health monitoring stopped');
        }
    }

    /**
     * Perform health checks on all providers
     */
    async performHealthChecks() {
        const trustedProviders = this.dataSourceVerifier.getTrustedProviders();
        const healthResults = [];

        console.log('🏥 Performing health checks on all providers...');

        for (const providerName of Object.keys(trustedProviders)) {
            try {
                const healthCheck = await this.checkProviderHealth(providerName);
                healthResults.push(healthCheck);
                this.updateProviderMetrics(providerName, healthCheck);
            } catch (error) {
                console.error(`🏥 Health check failed for ${providerName}:`, error.message);
                this.recordProviderFailure(providerName, error);
            }
        }

        // Update overall health status
        this.updateOverallHealthStatus(healthResults);
        
        // Check for alerts
        this.checkHealthAlerts();

        return healthResults;
    }

    /**
     * Check health of a specific provider
     */
    async checkProviderHealth(providerName) {
        const startTime = Date.now();
        const healthCheck = {
            provider: providerName,
            timestamp: startTime,
            status: 'unknown',
            responseTime: null,
            error: null,
            details: {}
        };

        try {
            // Use the DataSourceVerifier to perform the actual health check
            const verifierResult = await this.dataSourceVerifier.performHealthCheck(providerName);
            
            healthCheck.status = verifierResult.status;
            healthCheck.responseTime = verifierResult.responseTime;
            healthCheck.error = verifierResult.error;

            // Additional health metrics
            healthCheck.details = {
                isReachable: healthCheck.status !== 'unhealthy',
                responseTimeAcceptable: healthCheck.responseTime < this.alertThresholds.responseTime,
                hasErrors: !!healthCheck.error
            };

            // Store health check result
            this.healthChecks.set(`${providerName}_${startTime}`, healthCheck);

            // Clean up old health checks (keep last 100 per provider)
            this.cleanupOldHealthChecks(providerName);

            return healthCheck;

        } catch (error) {
            healthCheck.status = 'error';
            healthCheck.error = error.message;
            healthCheck.responseTime = Date.now() - startTime;
            return healthCheck;
        }
    }

    /**
     * Update provider metrics based on health check
     */
    updateProviderMetrics(providerName, healthCheck) {
        const metrics = this.providerMetrics.get(providerName);
        if (!metrics) return;

        metrics.totalRequests++;

        if (healthCheck.status === 'healthy') {
            metrics.successfulRequests++;
            metrics.consecutiveSuccesses++;
            metrics.consecutiveFailures = 0;
            metrics.lastSuccessTime = healthCheck.timestamp;
            metrics.isHealthy = true;
        } else {
            metrics.failedRequests++;
            metrics.consecutiveFailures++;
            metrics.consecutiveSuccesses = 0;
            metrics.lastFailureTime = healthCheck.timestamp;
            
            // Mark as unhealthy after threshold
            if (metrics.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
                metrics.isHealthy = false;
            }
        }

        // Update response time metrics
        if (healthCheck.responseTime !== null) {
            metrics.totalResponseTime += healthCheck.responseTime;
            metrics.averageResponseTime = metrics.totalResponseTime / metrics.totalRequests;
        }

        // Calculate health score (0-1)
        metrics.healthScore = this.calculateHealthScore(metrics);
        metrics.status = this.determineProviderStatus(metrics);

        // Record with DataSourceVerifier
        if (healthCheck.status === 'healthy') {
            this.dataSourceVerifier.recordSuccessfulRequest(providerName);
        } else {
            this.dataSourceVerifier.recordFailedRequest(providerName, healthCheck.error);
        }
    }

    /**
     * Calculate health score for a provider
     */
    calculateHealthScore(metrics) {
        if (metrics.totalRequests === 0) return 0.5;

        const successRate = metrics.successfulRequests / metrics.totalRequests;
        const responseTimeScore = metrics.averageResponseTime < this.alertThresholds.responseTime ? 1.0 : 0.5;
        const consecutiveFailuresPenalty = Math.min(metrics.consecutiveFailures * 0.1, 0.5);

        return Math.max(0, Math.min(1, successRate * 0.6 + responseTimeScore * 0.3 - consecutiveFailuresPenalty));
    }

    /**
     * Determine provider status based on metrics
     */
    determineProviderStatus(metrics) {
        if (metrics.healthScore >= 0.8) return 'healthy';
        if (metrics.healthScore >= 0.6) return 'degraded';
        if (metrics.healthScore >= 0.3) return 'unhealthy';
        return 'critical';
    }

    /**
     * Record a provider failure
     */
    recordProviderFailure(providerName, error) {
        const metrics = this.providerMetrics.get(providerName);
        if (metrics) {
            metrics.failedRequests++;
            metrics.consecutiveFailures++;
            metrics.consecutiveSuccesses = 0;
            metrics.lastFailureTime = Date.now();
            metrics.isHealthy = false;
            metrics.status = 'unhealthy';
            
            this.dataSourceVerifier.recordFailedRequest(providerName, error.message);
        }
    }

    /**
     * Get healthy providers for failover
     */
    getHealthyProviders() {
        const healthyProviders = [];
        
        for (const [providerName, metrics] of this.providerMetrics) {
            if (metrics.isHealthy && metrics.healthScore >= 0.7) {
                healthyProviders.push({
                    name: providerName,
                    healthScore: metrics.healthScore,
                    averageResponseTime: metrics.averageResponseTime,
                    consecutiveSuccesses: metrics.consecutiveSuccesses
                });
            }
        }

        // Sort by health score (best first)
        return healthyProviders.sort((a, b) => b.healthScore - a.healthScore);
    }

    /**
     * Get the best available provider for data requests
     */
    getBestProvider() {
        const healthyProviders = this.getHealthyProviders();
        
        if (healthyProviders.length === 0) {
            if (this.strictMode.isStrictModeEnabled()) {
                throw new Error('No healthy providers available and fallbacks not allowed in strict mode');
            }
            return null;
        }

        return healthyProviders[0];
    }

    /**
     * Implement automatic failover logic
     */
    async performFailover(failedProvider, operation) {
        console.log(`🔄 Performing failover from ${failedProvider}...`);
        
        // Record the failure
        this.recordProviderFailure(failedProvider, new Error('Failover triggered'));
        
        // Get alternative providers
        const healthyProviders = this.getHealthyProviders().filter(p => p.name !== failedProvider);
        
        if (healthyProviders.length === 0) {
            const error = new Error('No healthy providers available for failover');
            if (this.strictMode.isStrictModeEnabled()) {
                throw this.strictMode.createStrictModeError('Failover failed - no healthy providers available');
            }
            throw error;
        }

        // Try each healthy provider in order
        for (const provider of healthyProviders) {
            try {
                console.log(`🔄 Attempting failover to ${provider.name}...`);
                const result = await operation(provider.name);
                console.log(`✅ Failover to ${provider.name} successful`);
                return result;
            } catch (error) {
                console.log(`❌ Failover to ${provider.name} failed: ${error.message}`);
                this.recordProviderFailure(provider.name, error);
            }
        }

        throw new Error('All failover attempts failed');
    }

    /**
     * Check for health alerts
     */
    checkHealthAlerts() {
        for (const [providerName, metrics] of this.providerMetrics) {
            const alerts = [];

            // High error rate alert
            if (metrics.totalRequests > 10) {
                const errorRate = metrics.failedRequests / metrics.totalRequests;
                if (errorRate > this.alertThresholds.errorRate) {
                    alerts.push({
                        type: 'high_error_rate',
                        severity: 'warning',
                        message: `High error rate: ${(errorRate * 100).toFixed(1)}%`
                    });
                }
            }

            // Slow response time alert
            if (metrics.averageResponseTime > this.alertThresholds.responseTime) {
                alerts.push({
                    type: 'slow_response',
                    severity: 'warning',
                    message: `Slow response time: ${metrics.averageResponseTime}ms`
                });
            }

            // Consecutive failures alert
            if (metrics.consecutiveFailures >= this.alertThresholds.consecutiveFailures) {
                alerts.push({
                    type: 'consecutive_failures',
                    severity: 'critical',
                    message: `${metrics.consecutiveFailures} consecutive failures`
                });
            }

            // Provider down alert
            if (!metrics.isHealthy) {
                alerts.push({
                    type: 'provider_down',
                    severity: 'critical',
                    message: 'Provider is unhealthy'
                });
            }

            metrics.alerts = alerts;

            // Log critical alerts
            alerts.filter(alert => alert.severity === 'critical').forEach(alert => {
                console.error(`🚨 CRITICAL ALERT [${providerName}]: ${alert.message}`);
            });
        }
    }

    /**
     * Update overall health status
     */
    updateOverallHealthStatus(healthResults) {
        const totalProviders = healthResults.length;
        const healthyProviders = healthResults.filter(h => h.status === 'healthy').length;
        const degradedProviders = healthResults.filter(h => h.status === 'degraded').length;
        const unhealthyProviders = healthResults.filter(h => h.status === 'unhealthy').length;

        this.overallHealth = {
            timestamp: Date.now(),
            totalProviders,
            healthyProviders,
            degradedProviders,
            unhealthyProviders,
            healthyPercentage: (healthyProviders / totalProviders) * 100,
            status: this.determineOverallStatus(healthyProviders, totalProviders)
        };
    }

    /**
     * Determine overall system health status
     */
    determineOverallStatus(healthyCount, totalCount) {
        const healthyPercentage = (healthyCount / totalCount) * 100;
        
        if (healthyPercentage >= 80) return 'healthy';
        if (healthyPercentage >= 60) return 'degraded';
        if (healthyPercentage >= 40) return 'unhealthy';
        return 'critical';
    }

    /**
     * Clean up old health checks
     */
    cleanupOldHealthChecks(providerName) {
        const providerChecks = Array.from(this.healthChecks.entries())
            .filter(([key]) => key.startsWith(providerName))
            .sort(([a], [b]) => b.localeCompare(a)); // Sort by timestamp (newest first)

        if (providerChecks.length > 100) {
            const toDelete = providerChecks.slice(100);
            toDelete.forEach(([key]) => this.healthChecks.delete(key));
        }
    }

    /**
     * Get comprehensive health report
     */
    getHealthReport() {
        const report = {
            timestamp: Date.now(),
            overallHealth: this.overallHealth,
            providers: {},
            summary: {
                totalProviders: this.providerMetrics.size,
                healthyProviders: 0,
                degradedProviders: 0,
                unhealthyProviders: 0,
                criticalAlerts: 0,
                warningAlerts: 0
            }
        };

        // Compile provider details
        for (const [providerName, metrics] of this.providerMetrics) {
            report.providers[providerName] = {
                status: metrics.status,
                healthScore: metrics.healthScore,
                isHealthy: metrics.isHealthy,
                totalRequests: metrics.totalRequests,
                successRate: metrics.totalRequests > 0 ? 
                    (metrics.successfulRequests / metrics.totalRequests) : 0,
                averageResponseTime: metrics.averageResponseTime,
                consecutiveFailures: metrics.consecutiveFailures,
                consecutiveSuccesses: metrics.consecutiveSuccesses,
                lastSuccessTime: metrics.lastSuccessTime,
                lastFailureTime: metrics.lastFailureTime,
                alerts: metrics.alerts
            };

            // Update summary
            if (metrics.status === 'healthy') report.summary.healthyProviders++;
            else if (metrics.status === 'degraded') report.summary.degradedProviders++;
            else report.summary.unhealthyProviders++;

            // Count alerts
            metrics.alerts.forEach(alert => {
                if (alert.severity === 'critical') report.summary.criticalAlerts++;
                else if (alert.severity === 'warning') report.summary.warningAlerts++;
            });
        }

        return report;
    }
}

module.exports = { ProviderHealthMonitor };
