/**
 * Backtesting Service for Trading Signal Accuracy Evaluation
 * Tracks prediction accuracy, confidence calibration, and performance metrics
 */

const fs = require('fs');
const path = require('path');

class BacktestingService {
    constructor(config = {}) {
        this.config = {
            dataStoragePath: config.dataStoragePath || path.join(process.cwd(), 'backtesting-data'),
            maxHistorySize: config.maxHistorySize || 10000,
            confidenceBuckets: config.confidenceBuckets || [60, 70, 80, 90, 95],
            evaluationPeriods: config.evaluationPeriods || ['1h', '4h', '1d', '1w'],
            ...config
        };

        this.predictions = [];
        this.actualResults = [];
        this.performanceMetrics = {
            overall: { accuracy: 0, totalPredictions: 0, correctPredictions: 0 },
            byConfidence: {},
            byTimeframe: {},
            byAsset: {},
            recentPerformance: []
        };

        this.ensureDataDirectory();
        this.loadHistoricalData();
    }

    /**
     * Ensure data directory exists
     */
    ensureDataDirectory() {
        if (!fs.existsSync(this.config.dataStoragePath)) {
            fs.mkdirSync(this.config.dataStoragePath, { recursive: true });
            console.log(`📁 Created backtesting data directory: ${this.config.dataStoragePath}`);
        }
    }

    /**
     * Load historical backtesting data
     */
    loadHistoricalData() {
        try {
            const predictionsPath = path.join(this.config.dataStoragePath, 'predictions.json');
            const resultsPath = path.join(this.config.dataStoragePath, 'results.json');
            const metricsPath = path.join(this.config.dataStoragePath, 'metrics.json');

            if (fs.existsSync(predictionsPath)) {
                this.predictions = JSON.parse(fs.readFileSync(predictionsPath, 'utf8'));
                console.log(`📊 Loaded ${this.predictions.length} historical predictions`);
            }

            if (fs.existsSync(resultsPath)) {
                this.actualResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
                console.log(`📈 Loaded ${this.actualResults.length} actual results`);
            }

            if (fs.existsSync(metricsPath)) {
                this.performanceMetrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
                console.log('📊 Loaded performance metrics');
            }

            // Recalculate metrics to ensure consistency
            this.calculatePerformanceMetrics();

        } catch (error) {
            console.warn('⚠️ Failed to load historical backtesting data:', error.message);
            this.performanceMetrics = {
                overall: { accuracy: 0, totalPredictions: 0, correctPredictions: 0 },
                byConfidence: {},
                byTimeframe: {},
                byAsset: {},
                recentPerformance: []
            };
        }
    }

    /**
     * Store a new prediction for backtesting
     */
    storePrediction(analysis, metadata = {}) {
        const prediction = {
            id: this.generatePredictionId(),
            timestamp: new Date().toISOString(),
            asset: analysis.detectedAsset || metadata.asset || 'Unknown',
            timeframe: analysis.detectedTimeframe || metadata.timeframe || '5m',
            
            // Prediction details
            predictions: analysis.nextCandlePredictions || [],
            tradingSignal: analysis.tradingSignal || {},
            overallConfidence: analysis.overallConfidence || 0,
            
            // Technical analysis details
            technicalIndicators: analysis.technicalIndicatorVerification || {},
            multiFactorConfirmation: analysis.multiFactorConfirmation || {},
            contradictionAnalysis: analysis.contradictionAnalysis || {},
            
            // Metadata
            metadata: {
                ...metadata,
                model: metadata.model || 'Enhanced Gemini Vision',
                imageSize: metadata.imageSize || 0,
                processingTime: metadata.processingTime || 0
            },
            
            // Status
            status: 'pending', // pending, evaluated, expired
            evaluatedAt: null,
            actualResults: null
        };

        this.predictions.push(prediction);

        // Keep only recent predictions to manage memory
        if (this.predictions.length > this.config.maxHistorySize) {
            this.predictions = this.predictions.slice(-this.config.maxHistorySize);
        }

        this.savePredictions();
        console.log(`📊 Stored prediction ${prediction.id} for backtesting`);

        return prediction.id;
    }

    /**
     * Record actual market results for evaluation
     */
    recordActualResult(predictionId, actualData) {
        const prediction = this.predictions.find(p => p.id === predictionId);
        if (!prediction) {
            console.warn(`⚠️ Prediction ${predictionId} not found for result recording`);
            return false;
        }

        const actualResult = {
            predictionId: predictionId,
            timestamp: new Date().toISOString(),
            asset: actualData.asset,
            timeframe: actualData.timeframe,
            
            // Actual market data
            candleResults: actualData.candleResults || [], // Array of {candle: 1, actualDirection: 'UP/DOWN', price: number}
            finalPrice: actualData.finalPrice || 0,
            priceChange: actualData.priceChange || 0,
            priceChangePercent: actualData.priceChangePercent || 0,
            
            // Evaluation results
            accuracy: this.calculatePredictionAccuracy(prediction, actualData),
            correctPredictions: 0,
            totalPredictions: 0
        };

        // Calculate detailed accuracy
        const accuracyDetails = this.evaluatePredictionAccuracy(prediction, actualData);
        actualResult.correctPredictions = accuracyDetails.correctPredictions;
        actualResult.totalPredictions = accuracyDetails.totalPredictions;
        actualResult.candleAccuracies = accuracyDetails.candleAccuracies;

        // Update prediction status
        prediction.status = 'evaluated';
        prediction.evaluatedAt = actualResult.timestamp;
        prediction.actualResults = actualResult;

        this.actualResults.push(actualResult);
        this.savePredictions();
        this.saveResults();

        // Recalculate performance metrics
        this.calculatePerformanceMetrics();

        console.log(`✅ Recorded actual result for prediction ${predictionId}: ${actualResult.accuracy.toFixed(2)}% accuracy`);
        return true;
    }

    /**
     * Calculate prediction accuracy against actual results
     */
    calculatePredictionAccuracy(prediction, actualData) {
        if (!prediction.predictions || !actualData.candleResults) {
            return 0;
        }

        let correctPredictions = 0;
        let totalPredictions = 0;

        for (const candlePrediction of prediction.predictions) {
            const actualCandle = actualData.candleResults.find(c => c.candle === candlePrediction.candle);
            if (actualCandle) {
                totalPredictions++;
                if (candlePrediction.direction === actualCandle.actualDirection) {
                    correctPredictions++;
                }
            }
        }

        return totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    }

    /**
     * Evaluate prediction accuracy with detailed breakdown
     */
    evaluatePredictionAccuracy(prediction, actualData) {
        const candleAccuracies = [];
        let correctPredictions = 0;
        let totalPredictions = 0;

        if (prediction.predictions && actualData.candleResults) {
            for (const candlePrediction of prediction.predictions) {
                const actualCandle = actualData.candleResults.find(c => c.candle === candlePrediction.candle);
                if (actualCandle) {
                    totalPredictions++;
                    const isCorrect = candlePrediction.direction === actualCandle.actualDirection;
                    if (isCorrect) {
                        correctPredictions++;
                    }

                    candleAccuracies.push({
                        candle: candlePrediction.candle,
                        predicted: candlePrediction.direction,
                        actual: actualCandle.actualDirection,
                        correct: isCorrect,
                        confidence: candlePrediction.confidence,
                        reasoning: candlePrediction.reasoning
                    });
                }
            }
        }

        return {
            correctPredictions,
            totalPredictions,
            candleAccuracies
        };
    }

    /**
     * Calculate comprehensive performance metrics
     */
    calculatePerformanceMetrics() {
        console.log('📊 Calculating performance metrics...');

        // Reset metrics
        this.performanceMetrics = {
            overall: { accuracy: 0, totalPredictions: 0, correctPredictions: 0 },
            byConfidence: {},
            byTimeframe: {},
            byAsset: {},
            recentPerformance: []
        };

        const evaluatedPredictions = this.predictions.filter(p => p.status === 'evaluated');
        
        if (evaluatedPredictions.length === 0) {
            console.log('📊 No evaluated predictions found');
            return this.performanceMetrics;
        }

        let totalCorrect = 0;
        let totalPredictions = 0;

        // Calculate overall metrics
        for (const prediction of evaluatedPredictions) {
            if (prediction.actualResults) {
                totalCorrect += prediction.actualResults.correctPredictions;
                totalPredictions += prediction.actualResults.totalPredictions;
            }
        }

        this.performanceMetrics.overall = {
            accuracy: totalPredictions > 0 ? (totalCorrect / totalPredictions) * 100 : 0,
            totalPredictions,
            correctPredictions: totalCorrect,
            evaluatedSignals: evaluatedPredictions.length
        };

        // Calculate metrics by confidence buckets
        for (const bucket of this.config.confidenceBuckets) {
            const bucketPredictions = evaluatedPredictions.filter(p => 
                p.overallConfidence >= bucket && p.overallConfidence < bucket + 10
            );

            let bucketCorrect = 0;
            let bucketTotal = 0;

            for (const prediction of bucketPredictions) {
                if (prediction.actualResults) {
                    bucketCorrect += prediction.actualResults.correctPredictions;
                    bucketTotal += prediction.actualResults.totalPredictions;
                }
            }

            this.performanceMetrics.byConfidence[`${bucket}-${bucket + 9}`] = {
                accuracy: bucketTotal > 0 ? (bucketCorrect / bucketTotal) * 100 : 0,
                totalPredictions: bucketTotal,
                correctPredictions: bucketCorrect,
                signalCount: bucketPredictions.length
            };
        }

        // Calculate metrics by timeframe
        const timeframes = [...new Set(evaluatedPredictions.map(p => p.timeframe))];
        for (const timeframe of timeframes) {
            const timeframePredictions = evaluatedPredictions.filter(p => p.timeframe === timeframe);
            
            let timeframeCorrect = 0;
            let timeframeTotal = 0;

            for (const prediction of timeframePredictions) {
                if (prediction.actualResults) {
                    timeframeCorrect += prediction.actualResults.correctPredictions;
                    timeframeTotal += prediction.actualResults.totalPredictions;
                }
            }

            this.performanceMetrics.byTimeframe[timeframe] = {
                accuracy: timeframeTotal > 0 ? (timeframeCorrect / timeframeTotal) * 100 : 0,
                totalPredictions: timeframeTotal,
                correctPredictions: timeframeCorrect,
                signalCount: timeframePredictions.length
            };
        }

        // Calculate metrics by asset
        const assets = [...new Set(evaluatedPredictions.map(p => p.asset))];
        for (const asset of assets) {
            const assetPredictions = evaluatedPredictions.filter(p => p.asset === asset);
            
            let assetCorrect = 0;
            let assetTotal = 0;

            for (const prediction of assetPredictions) {
                if (prediction.actualResults) {
                    assetCorrect += prediction.actualResults.correctPredictions;
                    assetTotal += prediction.actualResults.totalPredictions;
                }
            }

            this.performanceMetrics.byAsset[asset] = {
                accuracy: assetTotal > 0 ? (assetCorrect / assetTotal) * 100 : 0,
                totalPredictions: assetTotal,
                correctPredictions: assetCorrect,
                signalCount: assetPredictions.length
            };
        }

        // Calculate recent performance (last 100 predictions)
        const recentPredictions = evaluatedPredictions.slice(-100);
        this.performanceMetrics.recentPerformance = this.calculateRecentPerformanceTrend(recentPredictions);

        this.saveMetrics();
        console.log(`📊 Performance metrics calculated: ${this.performanceMetrics.overall.accuracy.toFixed(2)}% overall accuracy`);

        return this.performanceMetrics;
    }

    /**
     * Calculate recent performance trend
     */
    calculateRecentPerformanceTrend(recentPredictions) {
        const trend = [];
        const windowSize = 10; // Calculate accuracy for every 10 predictions

        for (let i = windowSize; i <= recentPredictions.length; i += windowSize) {
            const window = recentPredictions.slice(i - windowSize, i);
            
            let windowCorrect = 0;
            let windowTotal = 0;

            for (const prediction of window) {
                if (prediction.actualResults) {
                    windowCorrect += prediction.actualResults.correctPredictions;
                    windowTotal += prediction.actualResults.totalPredictions;
                }
            }

            trend.push({
                window: Math.floor(i / windowSize),
                accuracy: windowTotal > 0 ? (windowCorrect / windowTotal) * 100 : 0,
                totalPredictions: windowTotal,
                correctPredictions: windowCorrect,
                timestamp: window[window.length - 1]?.timestamp
            });
        }

        return trend;
    }

    /**
     * Get performance report
     */
    getPerformanceReport() {
        const report = {
            summary: {
                ...this.performanceMetrics.overall,
                lastUpdated: new Date().toISOString(),
                dataPoints: this.predictions.length,
                evaluatedSignals: this.predictions.filter(p => p.status === 'evaluated').length,
                pendingSignals: this.predictions.filter(p => p.status === 'pending').length
            },
            
            confidenceCalibration: this.performanceMetrics.byConfidence,
            timeframePerformance: this.performanceMetrics.byTimeframe,
            assetPerformance: this.performanceMetrics.byAsset,
            recentTrend: this.performanceMetrics.recentPerformance,
            
            insights: this.generatePerformanceInsights(),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * Generate performance insights
     */
    generatePerformanceInsights() {
        const insights = [];
        const overall = this.performanceMetrics.overall;

        // Overall performance insights
        if (overall.accuracy >= 80) {
            insights.push('Excellent overall prediction accuracy');
        } else if (overall.accuracy >= 70) {
            insights.push('Good overall prediction accuracy');
        } else if (overall.accuracy >= 60) {
            insights.push('Moderate prediction accuracy - room for improvement');
        } else {
            insights.push('Low prediction accuracy - significant improvements needed');
        }

        // Confidence calibration insights
        const confidenceBuckets = this.performanceMetrics.byConfidence;
        const highConfidenceBuckets = Object.entries(confidenceBuckets)
            .filter(([range, data]) => range.startsWith('80') || range.startsWith('90'))
            .map(([range, data]) => data.accuracy);

        if (highConfidenceBuckets.length > 0) {
            const avgHighConfAccuracy = highConfidenceBuckets.reduce((a, b) => a + b, 0) / highConfidenceBuckets.length;
            if (avgHighConfAccuracy >= 85) {
                insights.push('High-confidence predictions are well-calibrated');
            } else {
                insights.push('High-confidence predictions may be overconfident');
            }
        }

        // Timeframe insights
        const timeframePerf = this.performanceMetrics.byTimeframe;
        const bestTimeframe = Object.entries(timeframePerf)
            .sort(([,a], [,b]) => b.accuracy - a.accuracy)[0];
        
        if (bestTimeframe) {
            insights.push(`Best performance on ${bestTimeframe[0]} timeframe (${bestTimeframe[1].accuracy.toFixed(1)}%)`);
        }

        // Recent trend insights
        const recentTrend = this.performanceMetrics.recentPerformance;
        if (recentTrend.length >= 3) {
            const recent = recentTrend.slice(-3);
            const isImproving = recent[2].accuracy > recent[0].accuracy;
            const trend = isImproving ? 'improving' : 'declining';
            insights.push(`Recent performance trend is ${trend}`);
        }

        return insights;
    }

    /**
     * Generate recommendations based on performance
     */
    generateRecommendations() {
        const recommendations = [];
        const overall = this.performanceMetrics.overall;

        if (overall.accuracy < 60) {
            recommendations.push('Consider adjusting confidence thresholds');
            recommendations.push('Review and improve technical analysis prompts');
            recommendations.push('Implement stricter multi-factor confirmation');
        } else if (overall.accuracy < 70) {
            recommendations.push('Fine-tune contradiction handling logic');
            recommendations.push('Consider asset-specific analysis adjustments');
        }

        // Confidence-based recommendations
        const lowConfBuckets = Object.entries(this.performanceMetrics.byConfidence)
            .filter(([range, data]) => data.accuracy < 60);

        if (lowConfBuckets.length > 0) {
            recommendations.push('Avoid trading signals below 70% confidence');
        }

        // Asset-specific recommendations
        const assetPerf = this.performanceMetrics.byAsset;
        const poorAssets = Object.entries(assetPerf)
            .filter(([asset, data]) => data.accuracy < 50);

        if (poorAssets.length > 0) {
            recommendations.push(`Consider avoiding these assets: ${poorAssets.map(([asset]) => asset).join(', ')}`);
        }

        return recommendations;
    }

    /**
     * Generate unique prediction ID
     */
    generatePredictionId() {
        return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save predictions to disk
     */
    savePredictions() {
        try {
            const predictionsPath = path.join(this.config.dataStoragePath, 'predictions.json');
            fs.writeFileSync(predictionsPath, JSON.stringify(this.predictions, null, 2));
        } catch (error) {
            console.error('❌ Failed to save predictions:', error.message);
        }
    }

    /**
     * Save results to disk
     */
    saveResults() {
        try {
            const resultsPath = path.join(this.config.dataStoragePath, 'results.json');
            fs.writeFileSync(resultsPath, JSON.stringify(this.actualResults, null, 2));
        } catch (error) {
            console.error('❌ Failed to save results:', error.message);
        }
    }

    /**
     * Save metrics to disk
     */
    saveMetrics() {
        try {
            const metricsPath = path.join(this.config.dataStoragePath, 'metrics.json');
            fs.writeFileSync(metricsPath, JSON.stringify(this.performanceMetrics, null, 2));
        } catch (error) {
            console.error('❌ Failed to save metrics:', error.message);
        }
    }

    /**
     * Export backtesting data for analysis
     */
    exportData(format = 'json') {
        const exportData = {
            predictions: this.predictions,
            results: this.actualResults,
            metrics: this.performanceMetrics,
            exportedAt: new Date().toISOString(),
            config: this.config
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(exportData);
        }

        return exportData;
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        const csvLines = [];
        
        // Header
        csvLines.push('Timestamp,Asset,Timeframe,Confidence,Predicted,Actual,Correct,Accuracy');

        // Data rows
        for (const prediction of data.predictions) {
            if (prediction.status === 'evaluated' && prediction.actualResults) {
                for (const candleAccuracy of prediction.actualResults.candleAccuracies || []) {
                    csvLines.push([
                        prediction.timestamp,
                        prediction.asset,
                        prediction.timeframe,
                        candleAccuracy.confidence,
                        candleAccuracy.predicted,
                        candleAccuracy.actual,
                        candleAccuracy.correct,
                        prediction.actualResults.accuracy
                    ].join(','));
                }
            }
        }

        return csvLines.join('\n');
    }

    /**
     * Cleanup old data
     */
    cleanup(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const initialPredictionCount = this.predictions.length;
        const initialResultCount = this.actualResults.length;

        // Remove old predictions
        this.predictions = this.predictions.filter(p => 
            new Date(p.timestamp) > cutoffDate
        );

        // Remove old results
        this.actualResults = this.actualResults.filter(r => 
            new Date(r.timestamp) > cutoffDate
        );

        const removedPredictions = initialPredictionCount - this.predictions.length;
        const removedResults = initialResultCount - this.actualResults.length;

        if (removedPredictions > 0 || removedResults > 0) {
            this.savePredictions();
            this.saveResults();
            this.calculatePerformanceMetrics();
            
            console.log(`🧹 Cleaned up ${removedPredictions} old predictions and ${removedResults} old results`);
        }
    }
}

module.exports = BacktestingService;