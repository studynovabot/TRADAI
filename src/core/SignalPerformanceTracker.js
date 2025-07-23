/**
 * Signal Performance Tracker
 * 
 * Tracks real-time signal performance and adjusts model parameters dynamically
 * based on actual trading outcomes and accuracy metrics.
 */

const { RealTimePerformanceTracker } = require('../ml/RealTimePerformanceTracker');
const { strictModeConfig } = require('../config/strict-mode');

class SignalPerformanceTracker {
    constructor(config = {}) {
        this.config = {
            trackingWindow: config.trackingWindow || 100,
            adjustmentThreshold: config.adjustmentThreshold || 0.1,
            minSignalsForAdjustment: config.minSignalsForAdjustment || 20,
            maxAdjustmentFactor: config.maxAdjustmentFactor || 0.2,
            ...config
        };

        this.performanceTracker = new RealTimePerformanceTracker({
            windowSize: this.config.trackingWindow,
            updateInterval: 30000, // 30 seconds
            alertThresholds: {
                accuracy: 0.7,
                precision: 0.7,
                recall: 0.7,
                sharpeRatio: 1.0
            }
        });

        this.modelAdjustments = new Map();
        this.signalHistory = [];
        this.performanceMetrics = {
            totalSignals: 0,
            accurateSignals: 0,
            currentAccuracy: 0,
            averageConfidence: 0,
            calibrationError: 0
        };

        this.isTracking = false;
    }

    /**
     * Start performance tracking
     */
    startTracking() {
        if (this.isTracking) {
            console.warn('Signal performance tracking already started');
            return;
        }

        console.log('📊 Starting signal performance tracking...');
        this.performanceTracker.startTracking();
        this.isTracking = true;
        console.log('✅ Signal performance tracking started');
    }

    /**
     * Stop performance tracking
     */
    stopTracking() {
        if (!this.isTracking) {
            return;
        }

        console.log('📊 Stopping signal performance tracking...');
        this.performanceTracker.stopTracking();
        this.isTracking = false;
        console.log('✅ Signal performance tracking stopped');
    }

    /**
     * Record a new signal for tracking
     */
    recordSignal(signalId, signal, marketData = {}) {
        if (!this.isTracking) {
            console.warn('Performance tracking not started');
            return;
        }

        // Record with the underlying performance tracker
        this.performanceTracker.recordPrediction(signalId, signal, marketData);

        // Store in our signal history
        const signalRecord = {
            id: signalId,
            timestamp: Date.now(),
            direction: signal.direction,
            confidence: signal.confidence,
            qualityScore: signal.qualityScore || 0,
            marketData: {
                symbol: marketData.symbol || 'UNKNOWN',
                timeframe: marketData.timeframe || '5m',
                price: marketData.price || 0,
                volatility: marketData.volatility || 0
            },
            outcome: null,
            profit: null,
            isResolved: false,
            modelVersion: signal.metadata?.modelVersion || 'unknown'
        };

        this.signalHistory.push(signalRecord);

        // Keep only recent signals
        if (this.signalHistory.length > this.config.trackingWindow * 2) {
            this.signalHistory = this.signalHistory.slice(-this.config.trackingWindow);
        }

        console.log(`📝 Recorded signal ${signalId} for performance tracking`);
    }

    /**
     * Record signal outcome and trigger adjustments if needed
     */
    recordOutcome(signalId, outcome, profit = 0) {
        if (!this.isTracking) {
            console.warn('Performance tracking not started');
            return;
        }

        // Record with the underlying performance tracker
        this.performanceTracker.recordOutcome(signalId, outcome, profit);

        // Update our signal history
        const signalRecord = this.signalHistory.find(s => s.id === signalId);
        if (signalRecord) {
            signalRecord.outcome = outcome;
            signalRecord.profit = profit;
            signalRecord.isResolved = true;
            signalRecord.resolvedAt = Date.now();
        }

        // Update performance metrics
        this.updatePerformanceMetrics();

        // Check if model adjustments are needed
        this.checkForModelAdjustments();

        console.log(`✅ Recorded outcome for signal ${signalId}: ${outcome} (profit: ${profit})`);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const resolvedSignals = this.signalHistory.filter(s => s.isResolved);
        
        if (resolvedSignals.length === 0) {
            return;
        }

        this.performanceMetrics.totalSignals = resolvedSignals.length;
        this.performanceMetrics.accurateSignals = resolvedSignals.filter(s => s.outcome === 'win').length;
        this.performanceMetrics.currentAccuracy = this.performanceMetrics.accurateSignals / this.performanceMetrics.totalSignals;
        this.performanceMetrics.averageConfidence = resolvedSignals.reduce((sum, s) => sum + s.confidence, 0) / resolvedSignals.length;

        // Calculate calibration error (difference between predicted confidence and actual accuracy)
        this.performanceMetrics.calibrationError = Math.abs(
            this.performanceMetrics.averageConfidence / 100 - this.performanceMetrics.currentAccuracy
        );
    }

    /**
     * Check if model adjustments are needed based on performance
     */
    checkForModelAdjustments() {
        const resolvedSignals = this.signalHistory.filter(s => s.isResolved);
        
        if (resolvedSignals.length < this.config.minSignalsForAdjustment) {
            return; // Not enough data for adjustments
        }

        const recentSignals = resolvedSignals.slice(-this.config.minSignalsForAdjustment);
        const recentAccuracy = recentSignals.filter(s => s.outcome === 'win').length / recentSignals.length;
        const targetAccuracy = 0.75; // Target 75% accuracy

        const accuracyDifference = targetAccuracy - recentAccuracy;

        if (Math.abs(accuracyDifference) > this.config.adjustmentThreshold) {
            this.suggestModelAdjustments(accuracyDifference, recentSignals);
        }
    }

    /**
     * Suggest model adjustments based on performance analysis
     */
    suggestModelAdjustments(accuracyDifference, recentSignals) {
        const adjustments = {
            timestamp: Date.now(),
            accuracyDifference,
            sampleSize: recentSignals.length,
            suggestions: []
        };

        if (accuracyDifference > 0) {
            // Accuracy is below target - need to be more conservative
            adjustments.suggestions.push({
                type: 'confidence_threshold',
                action: 'increase',
                value: Math.min(this.config.maxAdjustmentFactor, accuracyDifference * 0.5),
                reason: 'Low accuracy detected - increase confidence threshold'
            });

            adjustments.suggestions.push({
                type: 'quality_threshold',
                action: 'increase',
                value: Math.min(0.05, accuracyDifference * 0.1),
                reason: 'Low accuracy detected - increase quality requirements'
            });
        } else {
            // Accuracy is above target - can be more aggressive
            adjustments.suggestions.push({
                type: 'confidence_threshold',
                action: 'decrease',
                value: Math.min(this.config.maxAdjustmentFactor, Math.abs(accuracyDifference) * 0.3),
                reason: 'High accuracy detected - can lower confidence threshold'
            });
        }

        // Analyze by timeframe and symbol
        const timeframePerformance = this.analyzePerformanceByTimeframe(recentSignals);
        const symbolPerformance = this.analyzePerformanceBySymbol(recentSignals);

        if (timeframePerformance.worst.accuracy < 0.6) {
            adjustments.suggestions.push({
                type: 'timeframe_filter',
                action: 'restrict',
                value: timeframePerformance.worst.timeframe,
                reason: `Poor performance on ${timeframePerformance.worst.timeframe} timeframe`
            });
        }

        if (symbolPerformance.worst.accuracy < 0.6) {
            adjustments.suggestions.push({
                type: 'symbol_filter',
                action: 'restrict',
                value: symbolPerformance.worst.symbol,
                reason: `Poor performance on ${symbolPerformance.worst.symbol}`
            });
        }

        // Store adjustments
        this.modelAdjustments.set(Date.now(), adjustments);

        // Log suggestions
        console.log('🔧 Model adjustment suggestions generated:');
        adjustments.suggestions.forEach(suggestion => {
            console.log(`  - ${suggestion.type}: ${suggestion.action} by ${suggestion.value} (${suggestion.reason})`);
        });

        return adjustments;
    }

    /**
     * Analyze performance by timeframe
     */
    analyzePerformanceByTimeframe(signals) {
        const timeframeStats = {};

        signals.forEach(signal => {
            const tf = signal.marketData.timeframe;
            if (!timeframeStats[tf]) {
                timeframeStats[tf] = { total: 0, wins: 0, accuracy: 0 };
            }
            timeframeStats[tf].total++;
            if (signal.outcome === 'win') {
                timeframeStats[tf].wins++;
            }
        });

        // Calculate accuracies
        Object.keys(timeframeStats).forEach(tf => {
            timeframeStats[tf].accuracy = timeframeStats[tf].wins / timeframeStats[tf].total;
        });

        // Find best and worst performing timeframes
        const timeframes = Object.keys(timeframeStats);
        const best = timeframes.reduce((best, tf) => 
            timeframeStats[tf].accuracy > timeframeStats[best].accuracy ? tf : best
        );
        const worst = timeframes.reduce((worst, tf) => 
            timeframeStats[tf].accuracy < timeframeStats[worst].accuracy ? tf : worst
        );

        return {
            stats: timeframeStats,
            best: { timeframe: best, accuracy: timeframeStats[best].accuracy },
            worst: { timeframe: worst, accuracy: timeframeStats[worst].accuracy }
        };
    }

    /**
     * Analyze performance by symbol
     */
    analyzePerformanceBySymbol(signals) {
        const symbolStats = {};

        signals.forEach(signal => {
            const symbol = signal.marketData.symbol;
            if (!symbolStats[symbol]) {
                symbolStats[symbol] = { total: 0, wins: 0, accuracy: 0 };
            }
            symbolStats[symbol].total++;
            if (signal.outcome === 'win') {
                symbolStats[symbol].wins++;
            }
        });

        // Calculate accuracies
        Object.keys(symbolStats).forEach(symbol => {
            symbolStats[symbol].accuracy = symbolStats[symbol].wins / symbolStats[symbol].total;
        });

        // Find best and worst performing symbols
        const symbols = Object.keys(symbolStats);
        const best = symbols.reduce((best, symbol) => 
            symbolStats[symbol].accuracy > symbolStats[best].accuracy ? symbol : best
        );
        const worst = symbols.reduce((worst, symbol) => 
            symbolStats[symbol].accuracy < symbolStats[worst].accuracy ? symbol : worst
        );

        return {
            stats: symbolStats,
            best: { symbol: best, accuracy: symbolStats[best].accuracy },
            worst: { symbol: worst, accuracy: symbolStats[worst].accuracy }
        };
    }

    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            underlyingMetrics: this.performanceTracker.getMetrics(),
            lastUpdated: Date.now()
        };
    }

    /**
     * Get model adjustment suggestions
     */
    getModelAdjustments(limit = 10) {
        const adjustments = Array.from(this.modelAdjustments.entries())
            .sort((a, b) => b[0] - a[0]) // Sort by timestamp (newest first)
            .slice(0, limit)
            .map(([timestamp, adjustment]) => ({ timestamp, ...adjustment }));

        return adjustments;
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const baseReport = this.performanceTracker.getPerformanceReport();
        const resolvedSignals = this.signalHistory.filter(s => s.isResolved);

        return {
            ...baseReport,
            signalTracking: {
                totalTracked: this.signalHistory.length,
                resolved: resolvedSignals.length,
                pending: this.signalHistory.length - resolvedSignals.length,
                currentAccuracy: this.performanceMetrics.currentAccuracy,
                averageConfidence: this.performanceMetrics.averageConfidence,
                calibrationError: this.performanceMetrics.calibrationError
            },
            adjustments: {
                total: this.modelAdjustments.size,
                recent: this.getModelAdjustments(5)
            },
            performance: {
                byTimeframe: resolvedSignals.length > 0 ? this.analyzePerformanceByTimeframe(resolvedSignals) : null,
                bySymbol: resolvedSignals.length > 0 ? this.analyzePerformanceBySymbol(resolvedSignals) : null
            }
        };
    }

    /**
     * Reset tracking data
     */
    reset() {
        console.log('🔄 Resetting signal performance tracker...');
        
        this.performanceTracker.reset();
        this.signalHistory = [];
        this.modelAdjustments.clear();
        
        this.performanceMetrics = {
            totalSignals: 0,
            accurateSignals: 0,
            currentAccuracy: 0,
            averageConfidence: 0,
            calibrationError: 0
        };

        console.log('✅ Signal performance tracker reset');
    }
}

module.exports = { SignalPerformanceTracker };
