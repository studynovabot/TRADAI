/**
 * Performance Monitoring and Optimization Service
 * Monitors daily usage limits, prediction accuracy, API key health, and system performance
 */

const fs = require('fs');
const path = require('path');

class PerformanceMonitoringService {
    constructor(config = {}) {
        this.config = {
            // Monitoring Configuration
            enableDailyUsageTracking: config.enableDailyUsageTracking !== false,
            enableAccuracyTracking: config.enableAccuracyTracking !== false,
            enableApiKeyHealthMonitoring: config.enableApiKeyHealthMonitoring !== false,
            enablePerformanceMetrics: config.enablePerformanceMetrics !== false,
            
            // Limits and Thresholds
            dailyRequestLimit: config.dailyRequestLimit || 1500,
            dailyTokenLimit: config.dailyTokenLimit || 50000,
            accuracyWarningThreshold: config.accuracyWarningThreshold || 70,
            performanceWarningThreshold: config.performanceWarningThreshold || 45000, // 45 seconds
            
            // Storage Configuration
            dataStoragePath: config.dataStoragePath || './data/monitoring',
            retentionDays: config.retentionDays || 30,
            enablePersistence: config.enablePersistence !== false,
            
            // Alert Configuration
            enableAlerts: config.enableAlerts !== false,
            alertThresholds: {
                dailyUsage: 0.9, // 90% of daily limit
                accuracy: 0.7, // Below 70% accuracy
                performance: 45000, // Above 45 seconds
                apiKeyFailures: 3 // 3 consecutive failures
            },
            
            ...config
        };

        // Monitoring State
        this.metrics = {
            daily: {
                date: new Date().toISOString().split('T')[0],
                requests: 0,
                tokens: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                predictions: [],
                accuracyData: []
            },
            apiKeys: new Map(),
            performance: {
                totalRequests: 0,
                totalSuccessful: 0,
                totalFailed: 0,
                averageAccuracy: 0,
                averageProcessingTime: 0,
                uptime: Date.now()
            },
            alerts: []
        };

        // Initialize storage
        this.initializeStorage();
        
        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Initialize storage directory
     */
    initializeStorage() {
        if (this.config.enablePersistence) {
            if (!fs.existsSync(this.config.dataStoragePath)) {
                fs.mkdirSync(this.config.dataStoragePath, { recursive: true });
            }
            
            // Load existing data
            this.loadPersistedData();
        }
    }

    /**
     * Start monitoring processes
     */
    startMonitoring() {
        console.log('📊 Starting Performance Monitoring Service...');
        
        // Daily reset timer
        this.setupDailyReset();
        
        // Periodic data persistence
        if (this.config.enablePersistence) {
            this.setupDataPersistence();
        }
        
        // Cleanup old data
        this.setupDataCleanup();
        
        console.log('✅ Performance Monitoring Service started');
    }

    /**
     * Record a new analysis request
     */
    recordAnalysisRequest(requestData) {
        const {
            success,
            processingTime,
            tokenUsage,
            confidence,
            predictions,
            apiKeyIndex,
            error
        } = requestData;

        // Update daily metrics
        this.updateDailyMetrics(requestData);
        
        // Update API key metrics
        if (apiKeyIndex !== undefined) {
            this.updateApiKeyMetrics(apiKeyIndex, requestData);
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(requestData);
        
        // Check for alerts
        this.checkAlerts();
        
        // Log significant events
        this.logEvent('analysis_request', {
            success,
            processingTime,
            confidence,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Update daily metrics
     */
    updateDailyMetrics(requestData) {
        const today = new Date().toISOString().split('T')[0];
        
        // Reset if new day
        if (this.metrics.daily.date !== today) {
            this.resetDailyMetrics(today);
        }
        
        this.metrics.daily.requests++;
        
        if (requestData.success) {
            this.metrics.daily.successfulRequests++;
            
            if (requestData.confidence) {
                this.metrics.daily.predictions.push({
                    confidence: requestData.confidence,
                    timestamp: Date.now(),
                    predictions: requestData.predictions
                });
            }
        } else {
            this.metrics.daily.failedRequests++;
        }
        
        if (requestData.processingTime) {
            this.metrics.daily.totalProcessingTime += requestData.processingTime;
            this.metrics.daily.averageProcessingTime = 
                this.metrics.daily.totalProcessingTime / this.metrics.daily.requests;
        }
        
        if (requestData.tokenUsage) {
            this.metrics.daily.tokens += requestData.tokenUsage.totalTokens || 0;
        }
    }

    /**
     * Update API key specific metrics
     */
    updateApiKeyMetrics(apiKeyIndex, requestData) {
        if (!this.metrics.apiKeys.has(apiKeyIndex)) {
            this.metrics.apiKeys.set(apiKeyIndex, {
                index: apiKeyIndex,
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                consecutiveFailures: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                totalTokens: 0,
                lastUsed: null,
                healthStatus: 'healthy',
                errors: []
            });
        }
        
        const keyMetrics = this.metrics.apiKeys.get(apiKeyIndex);
        keyMetrics.totalRequests++;
        keyMetrics.lastUsed = new Date().toISOString();
        
        if (requestData.success) {
            keyMetrics.successfulRequests++;
            keyMetrics.consecutiveFailures = 0;
            keyMetrics.healthStatus = 'healthy';
        } else {
            keyMetrics.failedRequests++;
            keyMetrics.consecutiveFailures++;
            
            if (keyMetrics.consecutiveFailures >= this.config.alertThresholds.apiKeyFailures) {
                keyMetrics.healthStatus = 'unhealthy';
                this.addAlert('api_key_unhealthy', `API Key ${apiKeyIndex} has ${keyMetrics.consecutiveFailures} consecutive failures`);
            }
            
            if (requestData.error) {
                keyMetrics.errors.push({
                    error: requestData.error,
                    timestamp: new Date().toISOString()
                });
                
                // Keep only last 10 errors
                if (keyMetrics.errors.length > 10) {
                    keyMetrics.errors = keyMetrics.errors.slice(-10);
                }
            }
        }
        
        if (requestData.processingTime) {
            keyMetrics.totalProcessingTime += requestData.processingTime;
            keyMetrics.averageProcessingTime = keyMetrics.totalProcessingTime / keyMetrics.totalRequests;
        }
        
        if (requestData.tokenUsage) {
            keyMetrics.totalTokens += requestData.tokenUsage.totalTokens || 0;
        }
    }

    /**
     * Update overall performance metrics
     */
    updatePerformanceMetrics(requestData) {
        this.metrics.performance.totalRequests++;
        
        if (requestData.success) {
            this.metrics.performance.totalSuccessful++;
            
            if (requestData.confidence) {
                const currentAccuracy = this.metrics.performance.averageAccuracy;
                const totalSuccessful = this.metrics.performance.totalSuccessful;
                this.metrics.performance.averageAccuracy = 
                    ((currentAccuracy * (totalSuccessful - 1)) + requestData.confidence) / totalSuccessful;
            }
        } else {
            this.metrics.performance.totalFailed++;
        }
        
        if (requestData.processingTime) {
            const currentAvgTime = this.metrics.performance.averageProcessingTime;
            const totalRequests = this.metrics.performance.totalRequests;
            this.metrics.performance.averageProcessingTime = 
                ((currentAvgTime * (totalRequests - 1)) + requestData.processingTime) / totalRequests;
        }
    }

    /**
     * Record prediction accuracy feedback
     */
    recordPredictionAccuracy(predictionId, actualOutcome, confidence) {
        if (!this.config.enableAccuracyTracking) return;
        
        const accuracyData = {
            predictionId,
            actualOutcome, // 'UP', 'DOWN', 'NO_TRADE'
            predictedOutcome: null, // Will be filled from stored prediction
            confidence,
            timestamp: new Date().toISOString(),
            correct: false
        };
        
        // Find the original prediction
        const prediction = this.findPrediction(predictionId);
        if (prediction) {
            accuracyData.predictedOutcome = prediction.direction;
            accuracyData.correct = prediction.direction === actualOutcome;
        }
        
        this.metrics.daily.accuracyData.push(accuracyData);
        
        // Calculate current accuracy rate
        const recentAccuracy = this.calculateRecentAccuracy();
        if (recentAccuracy < this.config.alertThresholds.accuracy * 100) {
            this.addAlert('low_accuracy', `Prediction accuracy dropped to ${recentAccuracy.toFixed(1)}%`);
        }
        
        this.logEvent('accuracy_feedback', accuracyData);
    }

    /**
     * Check for various alert conditions
     */
    checkAlerts() {
        // Daily usage alerts
        if (this.config.enableDailyUsageTracking) {
            const requestUsage = this.metrics.daily.requests / this.config.dailyRequestLimit;
            const tokenUsage = this.metrics.daily.tokens / this.config.dailyTokenLimit;
            
            if (requestUsage > this.config.alertThresholds.dailyUsage) {
                this.addAlert('high_request_usage', `Daily request usage at ${(requestUsage * 100).toFixed(1)}%`);
            }
            
            if (tokenUsage > this.config.alertThresholds.dailyUsage) {
                this.addAlert('high_token_usage', `Daily token usage at ${(tokenUsage * 100).toFixed(1)}%`);
            }
        }
        
        // Performance alerts
        if (this.metrics.daily.averageProcessingTime > this.config.alertThresholds.performance) {
            this.addAlert('slow_performance', `Average processing time: ${this.metrics.daily.averageProcessingTime}ms`);
        }
        
        // Accuracy alerts
        const recentAccuracy = this.calculateRecentAccuracy();
        if (recentAccuracy > 0 && recentAccuracy < this.config.alertThresholds.accuracy * 100) {
            this.addAlert('low_accuracy', `Recent accuracy: ${recentAccuracy.toFixed(1)}%`);
        }
    }

    /**
     * Add alert to the system
     */
    addAlert(type, message) {
        const alert = {
            type,
            message,
            timestamp: new Date().toISOString(),
            severity: this.getAlertSeverity(type)
        };
        
        this.metrics.alerts.push(alert);
        
        // Keep only last 100 alerts
        if (this.metrics.alerts.length > 100) {
            this.metrics.alerts = this.metrics.alerts.slice(-100);
        }
        
        console.warn(`⚠️ ALERT [${type}]: ${message}`);
        
        this.logEvent('alert', alert);
    }

    /**
     * Get alert severity level
     */
    getAlertSeverity(type) {
        const severityMap = {
            'high_request_usage': 'warning',
            'high_token_usage': 'warning',
            'slow_performance': 'warning',
            'low_accuracy': 'critical',
            'api_key_unhealthy': 'critical',
            'system_error': 'critical'
        };
        
        return severityMap[type] || 'info';
    }

    /**
     * Calculate recent accuracy rate
     */
    calculateRecentAccuracy() {
        const accuracyData = this.metrics.daily.accuracyData;
        if (accuracyData.length === 0) return 0;
        
        const correct = accuracyData.filter(d => d.correct).length;
        return (correct / accuracyData.length) * 100;
    }

    /**
     * Find prediction by ID
     */
    findPrediction(predictionId) {
        // This would need to be implemented based on how predictions are stored
        // For now, return null
        return null;
    }

    /**
     * Reset daily metrics for new day
     */
    resetDailyMetrics(newDate) {
        // Save previous day's data
        if (this.config.enablePersistence) {
            this.saveDailyData(this.metrics.daily);
        }
        
        this.metrics.daily = {
            date: newDate,
            requests: 0,
            tokens: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            predictions: [],
            accuracyData: []
        };
        
        console.log(`📅 Daily metrics reset for ${newDate}`);
    }

    /**
     * Get comprehensive monitoring statistics
     */
    getMonitoringStats() {
        const uptime = Date.now() - this.metrics.performance.uptime;
        const successRate = this.metrics.performance.totalRequests > 0 ? 
            (this.metrics.performance.totalSuccessful / this.metrics.performance.totalRequests * 100) : 0;
        
        return {
            daily: {
                ...this.metrics.daily,
                successRate: this.metrics.daily.requests > 0 ? 
                    (this.metrics.daily.successfulRequests / this.metrics.daily.requests * 100) : 0,
                requestUsagePercentage: (this.metrics.daily.requests / this.config.dailyRequestLimit * 100),
                tokenUsagePercentage: (this.metrics.daily.tokens / this.config.dailyTokenLimit * 100),
                recentAccuracy: this.calculateRecentAccuracy()
            },
            apiKeys: Array.from(this.metrics.apiKeys.values()).map(key => ({
                ...key,
                successRate: key.totalRequests > 0 ? (key.successfulRequests / key.totalRequests * 100) : 0
            })),
            performance: {
                ...this.metrics.performance,
                successRate: successRate.toFixed(2) + '%',
                uptimeHours: (uptime / (1000 * 60 * 60)).toFixed(2)
            },
            alerts: {
                total: this.metrics.alerts.length,
                recent: this.metrics.alerts.slice(-10),
                critical: this.metrics.alerts.filter(a => a.severity === 'critical').length,
                warnings: this.metrics.alerts.filter(a => a.severity === 'warning').length
            },
            system: {
                monitoring: {
                    dailyUsageTracking: this.config.enableDailyUsageTracking,
                    accuracyTracking: this.config.enableAccuracyTracking,
                    apiKeyHealthMonitoring: this.config.enableApiKeyHealthMonitoring,
                    performanceMetrics: this.config.enablePerformanceMetrics
                },
                limits: {
                    dailyRequests: this.config.dailyRequestLimit,
                    dailyTokens: this.config.dailyTokenLimit
                }
            }
        };
    }
    /**
     * Setup daily reset timer
     */
    setupDailyReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        setTimeout(() => {
            this.resetDailyMetrics(new Date().toISOString().split('T')[0]);

            // Set up recurring daily reset
            setInterval(() => {
                this.resetDailyMetrics(new Date().toISOString().split('T')[0]);
            }, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }

    /**
     * Setup periodic data persistence
     */
    setupDataPersistence() {
        // Save data every 5 minutes
        setInterval(() => {
            this.persistCurrentData();
        }, 5 * 60 * 1000);
    }

    /**
     * Setup data cleanup for old files
     */
    setupDataCleanup() {
        // Clean up old data every day
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000);
    }

    /**
     * Persist current monitoring data
     */
    persistCurrentData() {
        if (!this.config.enablePersistence) return;

        try {
            const dataPath = path.join(this.config.dataStoragePath, 'current-metrics.json');
            fs.writeFileSync(dataPath, JSON.stringify({
                daily: this.metrics.daily,
                performance: this.metrics.performance,
                apiKeys: Array.from(this.metrics.apiKeys.entries()),
                alerts: this.metrics.alerts.slice(-50), // Keep last 50 alerts
                timestamp: new Date().toISOString()
            }, null, 2));
        } catch (error) {
            console.error('❌ Failed to persist monitoring data:', error.message);
        }
    }

    /**
     * Load persisted monitoring data
     */
    loadPersistedData() {
        try {
            const dataPath = path.join(this.config.dataStoragePath, 'current-metrics.json');
            if (fs.existsSync(dataPath)) {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

                // Restore data if it's from today
                const today = new Date().toISOString().split('T')[0];
                if (data.daily && data.daily.date === today) {
                    this.metrics.daily = data.daily;
                }

                if (data.performance) {
                    this.metrics.performance = { ...this.metrics.performance, ...data.performance };
                }

                if (data.apiKeys) {
                    this.metrics.apiKeys = new Map(data.apiKeys);
                }

                if (data.alerts) {
                    this.metrics.alerts = data.alerts;
                }

                console.log('📊 Loaded persisted monitoring data');
            }
        } catch (error) {
            console.error('❌ Failed to load persisted data:', error.message);
        }
    }

    /**
     * Save daily data to historical storage
     */
    saveDailyData(dailyData) {
        try {
            const fileName = `daily-${dailyData.date}.json`;
            const filePath = path.join(this.config.dataStoragePath, 'daily', fileName);

            // Ensure daily directory exists
            const dailyDir = path.dirname(filePath);
            if (!fs.existsSync(dailyDir)) {
                fs.mkdirSync(dailyDir, { recursive: true });
            }

            fs.writeFileSync(filePath, JSON.stringify(dailyData, null, 2));
            console.log(`💾 Saved daily data for ${dailyData.date}`);
        } catch (error) {
            console.error('❌ Failed to save daily data:', error.message);
        }
    }

    /**
     * Clean up old data files
     */
    cleanupOldData() {
        try {
            const dailyDir = path.join(this.config.dataStoragePath, 'daily');
            if (!fs.existsSync(dailyDir)) return;

            const files = fs.readdirSync(dailyDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

            let deletedCount = 0;
            for (const file of files) {
                if (file.startsWith('daily-') && file.endsWith('.json')) {
                    const dateStr = file.replace('daily-', '').replace('.json', '');
                    const fileDate = new Date(dateStr);

                    if (fileDate < cutoffDate) {
                        fs.unlinkSync(path.join(dailyDir, file));
                        deletedCount++;
                    }
                }
            }

            if (deletedCount > 0) {
                console.log(`🧹 Cleaned up ${deletedCount} old data files`);
            }
        } catch (error) {
            console.error('❌ Failed to cleanup old data:', error.message);
        }
    }

    /**
     * Log monitoring events
     */
    logEvent(eventType, eventData) {
        const logEntry = {
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString()
        };

        // In a production system, this would go to a proper logging system
        if (process.env.NODE_ENV === 'development') {
            console.log(`📝 [${eventType}]`, eventData);
        }
    }

    /**
     * Get health status of the system
     */
    getHealthStatus() {
        const stats = this.getMonitoringStats();
        const health = {
            status: 'healthy',
            issues: [],
            score: 100
        };

        // Check daily usage
        if (stats.daily.requestUsagePercentage > 90) {
            health.issues.push('High daily request usage');
            health.score -= 20;
        }

        if (stats.daily.tokenUsagePercentage > 90) {
            health.issues.push('High daily token usage');
            health.score -= 20;
        }

        // Check performance
        if (stats.daily.averageProcessingTime > this.config.performanceWarningThreshold) {
            health.issues.push('Slow processing performance');
            health.score -= 15;
        }

        // Check accuracy
        if (stats.daily.recentAccuracy > 0 && stats.daily.recentAccuracy < this.config.accuracyWarningThreshold) {
            health.issues.push('Low prediction accuracy');
            health.score -= 25;
        }

        // Check API key health
        const unhealthyKeys = stats.apiKeys.filter(key => key.healthStatus === 'unhealthy').length;
        if (unhealthyKeys > 0) {
            health.issues.push(`${unhealthyKeys} unhealthy API keys`);
            health.score -= (unhealthyKeys * 10);
        }

        // Check critical alerts
        if (stats.alerts.critical > 0) {
            health.issues.push(`${stats.alerts.critical} critical alerts`);
            health.score -= (stats.alerts.critical * 15);
        }

        // Determine overall status
        if (health.score >= 80) {
            health.status = 'healthy';
        } else if (health.score >= 60) {
            health.status = 'warning';
        } else {
            health.status = 'critical';
        }

        return health;
    }

    /**
     * Generate monitoring report
     */
    generateReport(format = 'json') {
        const stats = this.getMonitoringStats();
        const health = this.getHealthStatus();

        const report = {
            timestamp: new Date().toISOString(),
            health,
            stats,
            summary: {
                totalRequests: stats.performance.totalRequests,
                successRate: stats.performance.successRate,
                averageAccuracy: stats.daily.recentAccuracy.toFixed(1) + '%',
                averageProcessingTime: Math.round(stats.daily.averageProcessingTime) + 'ms',
                dailyUsage: {
                    requests: `${stats.daily.requests}/${this.config.dailyRequestLimit}`,
                    tokens: `${stats.daily.tokens}/${this.config.dailyTokenLimit}`
                },
                apiKeysStatus: {
                    total: stats.apiKeys.length,
                    healthy: stats.apiKeys.filter(k => k.healthStatus === 'healthy').length,
                    unhealthy: stats.apiKeys.filter(k => k.healthStatus === 'unhealthy').length
                }
            }
        };

        if (format === 'text') {
            return this.formatReportAsText(report);
        }

        return report;
    }

    /**
     * Format report as human-readable text
     */
    formatReportAsText(report) {
        const lines = [
            '📊 GEMINI VISION SYSTEM MONITORING REPORT',
            '=' .repeat(50),
            `Generated: ${report.timestamp}`,
            '',
            `🏥 SYSTEM HEALTH: ${report.health.status.toUpperCase()} (Score: ${report.health.score}/100)`,
            report.health.issues.length > 0 ? `Issues: ${report.health.issues.join(', ')}` : 'No issues detected',
            '',
            '📈 PERFORMANCE SUMMARY:',
            `  Total Requests: ${report.summary.totalRequests}`,
            `  Success Rate: ${report.summary.successRate}`,
            `  Average Accuracy: ${report.summary.averageAccuracy}`,
            `  Average Processing Time: ${report.summary.averageProcessingTime}`,
            '',
            '📊 DAILY USAGE:',
            `  Requests: ${report.summary.dailyUsage.requests}`,
            `  Tokens: ${report.summary.dailyUsage.tokens}`,
            '',
            '🔑 API KEYS STATUS:',
            `  Total: ${report.summary.apiKeysStatus.total}`,
            `  Healthy: ${report.summary.apiKeysStatus.healthy}`,
            `  Unhealthy: ${report.summary.apiKeysStatus.unhealthy}`,
            '',
            '⚠️ RECENT ALERTS:',
            ...report.stats.alerts.recent.map(alert =>
                `  [${alert.severity.toUpperCase()}] ${alert.message} (${alert.timestamp})`
            ),
            '',
            '=' .repeat(50)
        ];

        return lines.join('\n');
    }

    /**
     * Reset all monitoring data
     */
    resetAllData() {
        this.metrics = {
            daily: {
                date: new Date().toISOString().split('T')[0],
                requests: 0,
                tokens: 0,
                successfulRequests: 0,
                failedRequests: 0,
                totalProcessingTime: 0,
                averageProcessingTime: 0,
                predictions: [],
                accuracyData: []
            },
            apiKeys: new Map(),
            performance: {
                totalRequests: 0,
                totalSuccessful: 0,
                totalFailed: 0,
                averageAccuracy: 0,
                averageProcessingTime: 0,
                uptime: Date.now()
            },
            alerts: []
        };

        console.log('🔄 All monitoring data reset');
    }

    /**
     * Cleanup and stop monitoring
     */
    cleanup() {
        // Save final data
        if (this.config.enablePersistence) {
            this.persistCurrentData();
            this.saveDailyData(this.metrics.daily);
        }

        console.log('🧹 Performance Monitoring Service cleaned up');
    }
}

module.exports = PerformanceMonitoringService;
