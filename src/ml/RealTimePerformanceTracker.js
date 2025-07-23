/**
 * Real-Time Performance Tracker
 * 
 * Monitors ML model performance in real-time, tracking accuracy, precision, 
 * recall, Sharpe ratio, and other key metrics for continuous model improvement.
 */

class RealTimePerformanceTracker {
    constructor(config = {}) {
        this.config = {
            windowSize: config.windowSize || 100,
            updateInterval: config.updateInterval || 60000, // 1 minute
            alertThresholds: {
                accuracy: config.alertThresholds?.accuracy || 0.6,
                precision: config.alertThresholds?.precision || 0.6,
                recall: config.alertThresholds?.recall || 0.6,
                sharpeRatio: config.alertThresholds?.sharpeRatio || 1.0,
                maxDrawdown: config.alertThresholds?.maxDrawdown || 0.2
            },
            ...config
        };

        this.predictions = [];
        this.outcomes = [];
        this.trades = [];
        this.metrics = {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            avgProfit: 0,
            totalTrades: 0,
            profitableTrades: 0,
            lastUpdated: Date.now()
        };

        this.alerts = [];
        this.performanceHistory = [];
        this.isTracking = false;
        this.updateTimer = null;
    }

    /**
     * Start real-time performance tracking
     */
    startTracking() {
        if (this.isTracking) {
            console.warn('Performance tracking already started');
            return;
        }

        console.log('📊 Starting real-time performance tracking...');
        this.isTracking = true;

        // Set up periodic updates
        this.updateTimer = setInterval(() => {
            this.updateMetrics();
            this.checkAlerts();
        }, this.config.updateInterval);

        console.log('✅ Performance tracking started');
    }

    /**
     * Stop performance tracking
     */
    stopTracking() {
        if (!this.isTracking) {
            return;
        }

        console.log('📊 Stopping performance tracking...');
        this.isTracking = false;

        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        console.log('✅ Performance tracking stopped');
    }

    /**
     * Record a prediction
     */
    recordPrediction(predictionId, prediction, marketData = {}) {
        const record = {
            id: predictionId,
            timestamp: Date.now(),
            direction: prediction.direction,
            confidence: prediction.confidence,
            probability: prediction.directionProbability || prediction.confidence,
            marketData: {
                symbol: marketData.symbol || 'UNKNOWN',
                timeframe: marketData.timeframe || '5m',
                price: marketData.price || 0
            },
            outcome: null,
            profit: null,
            isResolved: false
        };

        this.predictions.push(record);

        // Keep only recent predictions
        if (this.predictions.length > this.config.windowSize * 2) {
            this.predictions = this.predictions.slice(-this.config.windowSize);
        }

        console.log(`📝 Recorded prediction ${predictionId}: ${prediction.direction} (${(prediction.confidence * 100).toFixed(1)}%)`);
    }

    /**
     * Record prediction outcome
     */
    recordOutcome(predictionId, outcome, profit = 0) {
        const prediction = this.predictions.find(p => p.id === predictionId);
        
        if (!prediction) {
            console.warn(`Prediction ${predictionId} not found`);
            return;
        }

        if (prediction.isResolved) {
            console.warn(`Prediction ${predictionId} already resolved`);
            return;
        }

        // Update prediction record
        prediction.outcome = outcome; // 'win', 'loss', 'draw'
        prediction.profit = profit;
        prediction.isResolved = true;
        prediction.resolvedAt = Date.now();

        // Add to outcomes array
        this.outcomes.push({
            predictionId,
            timestamp: prediction.resolvedAt,
            direction: prediction.direction,
            confidence: prediction.confidence,
            outcome,
            profit,
            duration: prediction.resolvedAt - prediction.timestamp
        });

        // Add to trades array for financial metrics
        this.trades.push({
            timestamp: prediction.resolvedAt,
            profit,
            isWin: outcome === 'win',
            confidence: prediction.confidence
        });

        // Keep only recent outcomes
        if (this.outcomes.length > this.config.windowSize) {
            this.outcomes.shift();
        }

        if (this.trades.length > this.config.windowSize) {
            this.trades.shift();
        }

        console.log(`✅ Recorded outcome for ${predictionId}: ${outcome} (profit: ${profit})`);

        // Update metrics immediately
        this.updateMetrics();
    }

    /**
     * Update all performance metrics
     */
    updateMetrics() {
        if (this.outcomes.length === 0) {
            return;
        }

        const resolvedPredictions = this.predictions.filter(p => p.isResolved);
        
        if (resolvedPredictions.length === 0) {
            return;
        }

        // Calculate classification metrics
        this.calculateClassificationMetrics(resolvedPredictions);
        
        // Calculate financial metrics
        this.calculateFinancialMetrics();
        
        // Update timestamp
        this.metrics.lastUpdated = Date.now();

        // Store performance snapshot
        this.performanceHistory.push({
            timestamp: Date.now(),
            metrics: { ...this.metrics }
        });

        // Keep only recent history
        if (this.performanceHistory.length > 1000) {
            this.performanceHistory.shift();
        }

        console.log(`📊 Metrics updated: Accuracy=${(this.metrics.accuracy * 100).toFixed(1)}%, Sharpe=${this.metrics.sharpeRatio.toFixed(2)}`);
    }

    /**
     * Calculate classification metrics (accuracy, precision, recall, F1)
     */
    calculateClassificationMetrics(resolvedPredictions) {
        const recentPredictions = resolvedPredictions.slice(-this.config.windowSize);
        
        let truePositives = 0;
        let falsePositives = 0;
        let trueNegatives = 0;
        let falseNegatives = 0;
        let correct = 0;

        recentPredictions.forEach(pred => {
            const predicted = pred.direction === 'UP';
            const actual = pred.outcome === 'win';

            if (predicted && actual) truePositives++;
            else if (predicted && !actual) falsePositives++;
            else if (!predicted && !actual) trueNegatives++;
            else if (!predicted && actual) falseNegatives++;

            if ((predicted && actual) || (!predicted && !actual)) correct++;
        });

        const total = recentPredictions.length;
        
        // Accuracy
        this.metrics.accuracy = total > 0 ? correct / total : 0;

        // Precision
        this.metrics.precision = (truePositives + falsePositives) > 0 ? 
            truePositives / (truePositives + falsePositives) : 0;

        // Recall
        this.metrics.recall = (truePositives + falseNegatives) > 0 ? 
            truePositives / (truePositives + falseNegatives) : 0;

        // F1 Score
        this.metrics.f1Score = (this.metrics.precision + this.metrics.recall) > 0 ? 
            2 * (this.metrics.precision * this.metrics.recall) / (this.metrics.precision + this.metrics.recall) : 0;
    }

    /**
     * Calculate financial metrics (Sharpe ratio, drawdown, win rate)
     */
    calculateFinancialMetrics() {
        if (this.trades.length === 0) {
            return;
        }

        const recentTrades = this.trades.slice(-this.config.windowSize);
        
        // Basic metrics
        this.metrics.totalTrades = recentTrades.length;
        this.metrics.profitableTrades = recentTrades.filter(t => t.isWin).length;
        this.metrics.winRate = this.metrics.profitableTrades / this.metrics.totalTrades;

        // Profit metrics
        const profits = recentTrades.map(t => t.profit);
        this.metrics.avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length;
        
        // Sharpe Ratio
        this.metrics.sharpeRatio = this.calculateSharpeRatio(profits);
        
        // Maximum Drawdown
        this.metrics.maxDrawdown = this.calculateMaxDrawdown(profits);
    }

    /**
     * Calculate Sharpe ratio
     */
    calculateSharpeRatio(profits) {
        if (profits.length < 2) return 0;

        const avgReturn = profits.reduce((sum, p) => sum + p, 0) / profits.length;
        const variance = profits.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) / profits.length;
        const stdDev = Math.sqrt(variance);

        return stdDev > 0 ? avgReturn / stdDev : 0;
    }

    /**
     * Calculate maximum drawdown
     */
    calculateMaxDrawdown(profits) {
        if (profits.length === 0) return 0;

        let cumulativeProfit = 0;
        let peak = 0;
        let maxDrawdown = 0;

        profits.forEach(profit => {
            cumulativeProfit += profit;
            peak = Math.max(peak, cumulativeProfit);
            const drawdown = (peak - cumulativeProfit) / Math.max(peak, 1);
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        });

        return maxDrawdown;
    }

    /**
     * Check for performance alerts
     */
    checkAlerts() {
        const newAlerts = [];
        const thresholds = this.config.alertThresholds;

        // Accuracy alert
        if (this.metrics.accuracy < thresholds.accuracy) {
            newAlerts.push({
                type: 'low_accuracy',
                severity: 'warning',
                message: `Accuracy below threshold: ${(this.metrics.accuracy * 100).toFixed(1)}% < ${(thresholds.accuracy * 100).toFixed(1)}%`,
                value: this.metrics.accuracy,
                threshold: thresholds.accuracy
            });
        }

        // Precision alert
        if (this.metrics.precision < thresholds.precision) {
            newAlerts.push({
                type: 'low_precision',
                severity: 'warning',
                message: `Precision below threshold: ${(this.metrics.precision * 100).toFixed(1)}% < ${(thresholds.precision * 100).toFixed(1)}%`,
                value: this.metrics.precision,
                threshold: thresholds.precision
            });
        }

        // Sharpe ratio alert
        if (this.metrics.sharpeRatio < thresholds.sharpeRatio) {
            newAlerts.push({
                type: 'low_sharpe',
                severity: 'warning',
                message: `Sharpe ratio below threshold: ${this.metrics.sharpeRatio.toFixed(2)} < ${thresholds.sharpeRatio.toFixed(2)}`,
                value: this.metrics.sharpeRatio,
                threshold: thresholds.sharpeRatio
            });
        }

        // Max drawdown alert
        if (this.metrics.maxDrawdown > thresholds.maxDrawdown) {
            newAlerts.push({
                type: 'high_drawdown',
                severity: 'critical',
                message: `Maximum drawdown exceeded: ${(this.metrics.maxDrawdown * 100).toFixed(1)}% > ${(thresholds.maxDrawdown * 100).toFixed(1)}%`,
                value: this.metrics.maxDrawdown,
                threshold: thresholds.maxDrawdown
            });
        }

        // Add timestamps and store alerts
        newAlerts.forEach(alert => {
            alert.timestamp = Date.now();
            this.alerts.push(alert);
            
            // Log critical alerts
            if (alert.severity === 'critical') {
                console.error(`🚨 CRITICAL ALERT: ${alert.message}`);
            } else {
                console.warn(`⚠️ WARNING: ${alert.message}`);
            }
        });

        // Keep only recent alerts
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-100);
        }
    }

    /**
     * Get current performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get recent alerts
     */
    getAlerts(severity = null) {
        if (severity) {
            return this.alerts.filter(alert => alert.severity === severity);
        }
        return [...this.alerts];
    }

    /**
     * Get performance history
     */
    getPerformanceHistory(timeRange = 24 * 60 * 60 * 1000) { // Default: 24 hours
        const cutoff = Date.now() - timeRange;
        return this.performanceHistory.filter(entry => entry.timestamp >= cutoff);
    }

    /**
     * Get detailed performance report
     */
    getPerformanceReport() {
        const recentPredictions = this.predictions.filter(p => p.isResolved).slice(-this.config.windowSize);
        const recentTrades = this.trades.slice(-this.config.windowSize);

        return {
            summary: this.getMetrics(),
            predictions: {
                total: recentPredictions.length,
                byDirection: {
                    up: recentPredictions.filter(p => p.direction === 'UP').length,
                    down: recentPredictions.filter(p => p.direction === 'DOWN').length
                },
                byOutcome: {
                    wins: recentPredictions.filter(p => p.outcome === 'win').length,
                    losses: recentPredictions.filter(p => p.outcome === 'loss').length,
                    draws: recentPredictions.filter(p => p.outcome === 'draw').length
                }
            },
            trades: {
                total: recentTrades.length,
                profitable: recentTrades.filter(t => t.profit > 0).length,
                totalProfit: recentTrades.reduce((sum, t) => sum + t.profit, 0),
                avgProfit: recentTrades.length > 0 ? recentTrades.reduce((sum, t) => sum + t.profit, 0) / recentTrades.length : 0
            },
            alerts: {
                total: this.alerts.length,
                critical: this.alerts.filter(a => a.severity === 'critical').length,
                warnings: this.alerts.filter(a => a.severity === 'warning').length
            },
            lastUpdated: this.metrics.lastUpdated
        };
    }

    /**
     * Reset all tracking data
     */
    reset() {
        console.log('🔄 Resetting performance tracker...');
        
        this.predictions = [];
        this.outcomes = [];
        this.trades = [];
        this.alerts = [];
        this.performanceHistory = [];
        
        this.metrics = {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            avgProfit: 0,
            totalTrades: 0,
            profitableTrades: 0,
            lastUpdated: Date.now()
        };

        console.log('✅ Performance tracker reset');
    }
}

module.exports = { RealTimePerformanceTracker };
