/**
 * Confidence Calibration System
 * 
 * Ensures that confidence scores accurately reflect actual signal success rates.
 * Implements Platt scaling and isotonic regression for confidence calibration.
 */

class ConfidenceCalibrationSystem {
    constructor(config = {}) {
        this.config = {
            calibrationWindow: config.calibrationWindow || 200,
            minSamplesForCalibration: config.minSamplesForCalibration || 50,
            confidenceBins: config.confidenceBins || 10,
            updateFrequency: config.updateFrequency || 20, // Update every 20 new samples
            ...config
        };

        this.calibrationData = [];
        this.calibrationModel = null;
        this.calibrationMetrics = {
            reliability: 0,
            resolution: 0,
            brierScore: 0,
            lastCalibration: null,
            sampleCount: 0
        };

        this.confidenceBins = this.initializeConfidenceBins();
        this.updateCounter = 0;
    }

    /**
     * Initialize confidence bins for reliability analysis
     */
    initializeConfidenceBins() {
        const bins = [];
        const binSize = 1.0 / this.config.confidenceBins;

        for (let i = 0; i < this.config.confidenceBins; i++) {
            bins.push({
                minConfidence: i * binSize,
                maxConfidence: (i + 1) * binSize,
                predictions: [],
                averageConfidence: 0,
                actualAccuracy: 0,
                count: 0
            });
        }

        return bins;
    }

    /**
     * Add a new prediction for calibration
     */
    addPrediction(predictionId, confidence, actualOutcome) {
        const calibrationPoint = {
            id: predictionId,
            timestamp: Date.now(),
            originalConfidence: confidence,
            calibratedConfidence: confidence, // Will be updated after calibration
            actualOutcome: actualOutcome, // 1 for success, 0 for failure
            isCorrect: actualOutcome === 1
        };

        this.calibrationData.push(calibrationPoint);

        // Add to appropriate confidence bin
        const binIndex = Math.min(
            Math.floor(confidence * this.config.confidenceBins),
            this.config.confidenceBins - 1
        );
        this.confidenceBins[binIndex].predictions.push(calibrationPoint);

        // Keep only recent data
        if (this.calibrationData.length > this.config.calibrationWindow) {
            const removed = this.calibrationData.shift();
            this.removeFromBin(removed);
        }

        this.updateCounter++;

        // Update calibration model periodically
        if (this.updateCounter >= this.config.updateFrequency) {
            this.updateCalibration();
            this.updateCounter = 0;
        }

        console.log(`📊 Added calibration point: confidence=${confidence.toFixed(2)}, outcome=${actualOutcome}`);
    }

    /**
     * Remove a prediction from its confidence bin
     */
    removeFromBin(prediction) {
        const binIndex = Math.min(
            Math.floor(prediction.originalConfidence * this.config.confidenceBins),
            this.config.confidenceBins - 1
        );
        
        const bin = this.confidenceBins[binIndex];
        const index = bin.predictions.findIndex(p => p.id === prediction.id);
        if (index !== -1) {
            bin.predictions.splice(index, 1);
        }
    }

    /**
     * Update calibration model and metrics
     */
    updateCalibration() {
        if (this.calibrationData.length < this.config.minSamplesForCalibration) {
            console.log(`⚠️ Insufficient data for calibration: ${this.calibrationData.length} < ${this.config.minSamplesForCalibration}`);
            return;
        }

        console.log('🔧 Updating confidence calibration...');

        // Update bin statistics
        this.updateBinStatistics();

        // Calculate calibration metrics
        this.calculateCalibrationMetrics();

        // Create calibration model using isotonic regression
        this.calibrationModel = this.createIsotonicRegressionModel();

        // Update calibrated confidences for all data points
        this.updateCalibratedConfidences();

        this.calibrationMetrics.lastCalibration = Date.now();
        this.calibrationMetrics.sampleCount = this.calibrationData.length;

        console.log(`✅ Calibration updated with ${this.calibrationData.length} samples`);
        console.log(`📊 Reliability: ${this.calibrationMetrics.reliability.toFixed(3)}, Brier Score: ${this.calibrationMetrics.brierScore.toFixed(3)}`);
    }

    /**
     * Update statistics for each confidence bin
     */
    updateBinStatistics() {
        this.confidenceBins.forEach(bin => {
            if (bin.predictions.length === 0) {
                bin.averageConfidence = (bin.minConfidence + bin.maxConfidence) / 2;
                bin.actualAccuracy = 0;
                bin.count = 0;
                return;
            }

            bin.count = bin.predictions.length;
            bin.averageConfidence = bin.predictions.reduce((sum, p) => sum + p.originalConfidence, 0) / bin.count;
            bin.actualAccuracy = bin.predictions.reduce((sum, p) => sum + (p.isCorrect ? 1 : 0), 0) / bin.count;
        });
    }

    /**
     * Calculate calibration metrics (reliability, resolution, Brier score)
     */
    calculateCalibrationMetrics() {
        const totalPredictions = this.calibrationData.length;
        const overallAccuracy = this.calibrationData.reduce((sum, p) => sum + (p.isCorrect ? 1 : 0), 0) / totalPredictions;

        let reliability = 0;
        let resolution = 0;
        let brierScore = 0;

        // Calculate reliability (calibration error)
        this.confidenceBins.forEach(bin => {
            if (bin.count > 0) {
                const weight = bin.count / totalPredictions;
                reliability += weight * Math.pow(bin.averageConfidence - bin.actualAccuracy, 2);
                resolution += weight * Math.pow(bin.actualAccuracy - overallAccuracy, 2);
            }
        });

        // Calculate Brier score
        this.calibrationData.forEach(prediction => {
            brierScore += Math.pow(prediction.originalConfidence - prediction.actualOutcome, 2);
        });
        brierScore /= totalPredictions;

        this.calibrationMetrics.reliability = reliability;
        this.calibrationMetrics.resolution = resolution;
        this.calibrationMetrics.brierScore = brierScore;
    }

    /**
     * Create isotonic regression model for calibration
     */
    createIsotonicRegressionModel() {
        // Sort data by confidence
        const sortedData = [...this.calibrationData].sort((a, b) => a.originalConfidence - b.originalConfidence);
        
        // Group into bins and calculate isotonic regression
        const model = [];
        let currentGroup = [];
        let lastConfidence = -1;

        sortedData.forEach(point => {
            if (point.originalConfidence !== lastConfidence && currentGroup.length > 0) {
                // Process current group
                const avgConfidence = currentGroup.reduce((sum, p) => sum + p.originalConfidence, 0) / currentGroup.length;
                const avgAccuracy = currentGroup.reduce((sum, p) => sum + p.actualOutcome, 0) / currentGroup.length;
                
                model.push({
                    confidence: avgConfidence,
                    calibratedConfidence: avgAccuracy,
                    sampleCount: currentGroup.length
                });

                currentGroup = [];
            }

            currentGroup.push(point);
            lastConfidence = point.originalConfidence;
        });

        // Process final group
        if (currentGroup.length > 0) {
            const avgConfidence = currentGroup.reduce((sum, p) => sum + p.originalConfidence, 0) / currentGroup.length;
            const avgAccuracy = currentGroup.reduce((sum, p) => sum + p.actualOutcome, 0) / currentGroup.length;
            
            model.push({
                confidence: avgConfidence,
                calibratedConfidence: avgAccuracy,
                sampleCount: currentGroup.length
            });
        }

        // Ensure isotonic property (non-decreasing)
        for (let i = 1; i < model.length; i++) {
            if (model[i].calibratedConfidence < model[i-1].calibratedConfidence) {
                model[i].calibratedConfidence = model[i-1].calibratedConfidence;
            }
        }

        return model;
    }

    /**
     * Update calibrated confidences for all data points
     */
    updateCalibratedConfidences() {
        if (!this.calibrationModel || this.calibrationModel.length === 0) {
            return;
        }

        this.calibrationData.forEach(prediction => {
            prediction.calibratedConfidence = this.getCalibratedConfidence(prediction.originalConfidence);
        });
    }

    /**
     * Get calibrated confidence for a given original confidence
     */
    getCalibratedConfidence(originalConfidence) {
        if (!this.calibrationModel || this.calibrationModel.length === 0) {
            return originalConfidence; // Return original if no calibration model
        }

        // Find appropriate calibration point using linear interpolation
        if (originalConfidence <= this.calibrationModel[0].confidence) {
            return this.calibrationModel[0].calibratedConfidence;
        }

        if (originalConfidence >= this.calibrationModel[this.calibrationModel.length - 1].confidence) {
            return this.calibrationModel[this.calibrationModel.length - 1].calibratedConfidence;
        }

        // Linear interpolation between two points
        for (let i = 1; i < this.calibrationModel.length; i++) {
            const prev = this.calibrationModel[i - 1];
            const curr = this.calibrationModel[i];

            if (originalConfidence >= prev.confidence && originalConfidence <= curr.confidence) {
                const ratio = (originalConfidence - prev.confidence) / (curr.confidence - prev.confidence);
                return prev.calibratedConfidence + ratio * (curr.calibratedConfidence - prev.calibratedConfidence);
            }
        }

        return originalConfidence; // Fallback
    }

    /**
     * Calibrate a new confidence score
     */
    calibrateConfidence(originalConfidence) {
        const calibratedConfidence = this.getCalibratedConfidence(originalConfidence);
        
        return {
            original: originalConfidence,
            calibrated: calibratedConfidence,
            adjustment: calibratedConfidence - originalConfidence,
            isCalibrated: this.calibrationModel !== null,
            sampleCount: this.calibrationData.length
        };
    }

    /**
     * Get calibration quality assessment
     */
    getCalibrationQuality() {
        if (this.calibrationData.length < this.config.minSamplesForCalibration) {
            return {
                quality: 'insufficient_data',
                reliability: null,
                brierScore: null,
                sampleCount: this.calibrationData.length,
                minRequired: this.config.minSamplesForCalibration
            };
        }

        let quality = 'excellent';
        if (this.calibrationMetrics.reliability > 0.05) quality = 'poor';
        else if (this.calibrationMetrics.reliability > 0.02) quality = 'fair';
        else if (this.calibrationMetrics.reliability > 0.01) quality = 'good';

        return {
            quality,
            reliability: this.calibrationMetrics.reliability,
            resolution: this.calibrationMetrics.resolution,
            brierScore: this.calibrationMetrics.brierScore,
            sampleCount: this.calibrationData.length,
            lastCalibration: this.calibrationMetrics.lastCalibration
        };
    }

    /**
     * Get confidence bin analysis
     */
    getConfidenceBinAnalysis() {
        return this.confidenceBins.map((bin, index) => ({
            binIndex: index,
            confidenceRange: `${(bin.minConfidence * 100).toFixed(0)}-${(bin.maxConfidence * 100).toFixed(0)}%`,
            averageConfidence: bin.averageConfidence,
            actualAccuracy: bin.actualAccuracy,
            count: bin.count,
            calibrationError: Math.abs(bin.averageConfidence - bin.actualAccuracy),
            isWellCalibrated: Math.abs(bin.averageConfidence - bin.actualAccuracy) < 0.05
        }));
    }

    /**
     * Get calibration model details
     */
    getCalibrationModel() {
        return {
            model: this.calibrationModel,
            metrics: this.calibrationMetrics,
            binAnalysis: this.getConfidenceBinAnalysis(),
            quality: this.getCalibrationQuality()
        };
    }

    /**
     * Export calibration data for analysis
     */
    exportCalibrationData() {
        return {
            data: this.calibrationData.map(point => ({
                confidence: point.originalConfidence,
                calibratedConfidence: point.calibratedConfidence,
                outcome: point.actualOutcome,
                timestamp: point.timestamp
            })),
            model: this.calibrationModel,
            metrics: this.calibrationMetrics,
            bins: this.getConfidenceBinAnalysis()
        };
    }

    /**
     * Reset calibration system
     */
    reset() {
        console.log('🔄 Resetting confidence calibration system...');
        
        this.calibrationData = [];
        this.calibrationModel = null;
        this.confidenceBins = this.initializeConfidenceBins();
        this.updateCounter = 0;
        
        this.calibrationMetrics = {
            reliability: 0,
            resolution: 0,
            brierScore: 0,
            lastCalibration: null,
            sampleCount: 0
        };

        console.log('✅ Confidence calibration system reset');
    }
}

module.exports = { ConfidenceCalibrationSystem };
