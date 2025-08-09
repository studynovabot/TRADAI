/**
 * 🔍 DETERMINISTIC ANALYSIS LOGGER & MONITORING
 * 
 * Comprehensive logging and monitoring system for deterministic analysis.
 * Tracks performance, accuracy, and debugging information.
 */

const fs = require('fs');
const path = require('path');

class DeterministicLogger {
    constructor(config = {}) {
        this.config = {
            logLevel: config.logLevel || 'info', // debug, info, warn, error
            logToFile: config.logToFile !== false,
            logToConsole: config.logToConsole !== false,
            logDirectory: config.logDirectory || path.join(process.cwd(), 'logs'),
            maxLogFiles: config.maxLogFiles || 10,
            maxLogSizeBytes: config.maxLogSizeBytes || 10 * 1024 * 1024, // 10MB
            enablePerformanceTracking: config.enablePerformanceTracking !== false,
            enableAccuracyTracking: config.enableAccuracyTracking !== false,
            ...config
        };

        // Ensure log directory exists
        this.ensureLogDirectory();

        // Initialize log files
        this.currentLogFile = this.getCurrentLogFile();
        this.performanceLogFile = path.join(this.config.logDirectory, 'performance.log');
        this.accuracyLogFile = path.join(this.config.logDirectory, 'accuracy.log');
        this.debugLogFile = path.join(this.config.logDirectory, 'debug.log');

        // Performance tracking
        this.performanceMetrics = {
            totalRequests: 0,
            totalLatency: 0,
            averageLatency: 0,
            minLatency: Infinity,
            maxLatency: 0,
            latencyDistribution: {
                '0-1000ms': 0,
                '1000-3000ms': 0,
                '3000-5000ms': 0,
                '5000ms+': 0
            },
            signalDistribution: {
                BUY: 0,
                SELL: 0,
                HOLD: 0
            },
            confidenceDistribution: {
                'high (80-100)': 0,
                'medium (60-79)': 0,
                'low (0-59)': 0
            },
            errorCounts: {
                apiErrors: 0,
                parseErrors: 0,
                validationErrors: 0,
                timeoutErrors: 0
            }
        };

        // Accuracy tracking
        this.accuracyMetrics = {
            totalPredictions: 0,
            correctPredictions: 0,
            accuracy: 0,
            byTimeframe: {},
            byConfidenceLevel: {},
            bySignalType: {}
        };

        console.log(`🔍 Deterministic Logger initialized with level: ${this.config.logLevel}`);
    }

    /**
     * Ensure log directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.config.logDirectory)) {
            fs.mkdirSync(this.config.logDirectory, { recursive: true });
            console.log(`📁 Created log directory: ${this.config.logDirectory}`);
        }
    }

    /**
     * Get current log file path
     */
    getCurrentLogFile() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.config.logDirectory, `deterministic-${date}.log`);
    }

    /**
     * Rotate log files if needed
     */
    rotateLogsIfNeeded() {
        try {
            if (fs.existsSync(this.currentLogFile)) {
                const stats = fs.statSync(this.currentLogFile);
                if (stats.size > this.config.maxLogSizeBytes) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const rotatedFile = this.currentLogFile.replace('.log', `-${timestamp}.log`);
                    fs.renameSync(this.currentLogFile, rotatedFile);
                    console.log(`🔄 Rotated log file: ${rotatedFile}`);
                }
            }

            // Clean up old log files
            this.cleanupOldLogs();
        } catch (error) {
            console.error('⚠️ Log rotation failed:', error.message);
        }
    }

    /**
     * Clean up old log files
     */
    cleanupOldLogs() {
        try {
            const files = fs.readdirSync(this.config.logDirectory)
                .filter(file => file.startsWith('deterministic-') && file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.config.logDirectory, file),
                    mtime: fs.statSync(path.join(this.config.logDirectory, file)).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);

            if (files.length > this.config.maxLogFiles) {
                const filesToDelete = files.slice(this.config.maxLogFiles);
                for (const file of filesToDelete) {
                    fs.unlinkSync(file.path);
                    console.log(`🗑️ Deleted old log file: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('⚠️ Log cleanup failed:', error.message);
        }
    }

    /**
     * Write log entry
     */
    writeLog(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            data,
            pid: process.pid
        };

        const logLine = JSON.stringify(logEntry) + '\n';

        // Console logging
        if (this.config.logToConsole) {
            const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
            switch (level) {
                case 'error':
                    console.error(consoleMessage, data || '');
                    break;
                case 'warn':
                    console.warn(consoleMessage, data || '');
                    break;
                case 'debug':
                    console.debug(consoleMessage, data || '');
                    break;
                default:
                    console.log(consoleMessage, data || '');
            }
        }

        // File logging
        if (this.config.logToFile) {
            try {
                this.rotateLogsIfNeeded();
                fs.appendFileSync(this.currentLogFile, logLine);
            } catch (error) {
                console.error('⚠️ Failed to write to log file:', error.message);
            }
        }
    }

    /**
     * Log levels
     */
    debug(message, data = null) {
        if (this.shouldLog('debug')) {
            this.writeLog('debug', message, data);
        }
    }

    info(message, data = null) {
        if (this.shouldLog('info')) {
            this.writeLog('info', message, data);
        }
    }

    warn(message, data = null) {
        if (this.shouldLog('warn')) {
            this.writeLog('warn', message, data);
        }
    }

    error(message, data = null) {
        if (this.shouldLog('error')) {
            this.writeLog('error', message, data);
        }
    }

    /**
     * Check if should log at level
     */
    shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.config.logLevel];
    }

    /**
     * Log analysis request start
     */
    logAnalysisStart(requestId, metadata) {
        this.info('Analysis request started', {
            requestId,
            metadata,
            startTime: Date.now()
        });
    }

    /**
     * Log analysis completion
     */
    logAnalysisComplete(requestId, result, latency) {
        const logData = {
            requestId,
            signal: result.signal,
            confidence: result.confidence,
            latency,
            success: true
        };

        this.info('Analysis request completed', logData);

        // Update performance metrics
        if (this.config.enablePerformanceTracking) {
            this.updatePerformanceMetrics(result, latency);
        }

        // Write to performance log
        this.writePerformanceLog(logData);
    }

    /**
     * Log analysis error
     */
    logAnalysisError(requestId, error, latency) {
        const logData = {
            requestId,
            error: error.message,
            latency,
            success: false
        };

        this.error('Analysis request failed', logData);

        // Update error metrics
        this.updateErrorMetrics(error);

        // Write to performance log
        this.writePerformanceLog(logData);
    }

    /**
     * Log OCR extraction
     */
    logOCRExtraction(requestId, ocrData, confidence) {
        this.debug('OCR extraction completed', {
            requestId,
            ocrData,
            confidence
        });
    }

    /**
     * Log timestamp validation
     */
    logTimestampValidation(requestId, timestamps, validation) {
        this.debug('Timestamp validation', {
            requestId,
            timestamps,
            validation
        });
    }

    /**
     * Log sanity check results
     */
    logSanityChecks(requestId, originalAnalysis, finalAnalysis, checks) {
        this.debug('Sanity checks applied', {
            requestId,
            originalSignal: originalAnalysis.signal,
            originalConfidence: originalAnalysis.confidence,
            finalSignal: finalAnalysis.signal,
            finalConfidence: finalAnalysis.confidence,
            checks
        });
    }

    /**
     * Log model failover
     */
    logModelFailover(requestId, fromModel, toModel, reason) {
        this.warn('Model failover occurred', {
            requestId,
            fromModel,
            toModel,
            reason
        });
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(result, latency) {
        const metrics = this.performanceMetrics;
        
        metrics.totalRequests++;
        metrics.totalLatency += latency;
        metrics.averageLatency = metrics.totalLatency / metrics.totalRequests;
        metrics.minLatency = Math.min(metrics.minLatency, latency);
        metrics.maxLatency = Math.max(metrics.maxLatency, latency);

        // Latency distribution
        if (latency < 1000) {
            metrics.latencyDistribution['0-1000ms']++;
        } else if (latency < 3000) {
            metrics.latencyDistribution['1000-3000ms']++;
        } else if (latency < 5000) {
            metrics.latencyDistribution['3000-5000ms']++;
        } else {
            metrics.latencyDistribution['5000ms+']++;
        }

        // Signal distribution
        metrics.signalDistribution[result.signal]++;

        // Confidence distribution
        if (result.confidence >= 80) {
            metrics.confidenceDistribution['high (80-100)']++;
        } else if (result.confidence >= 60) {
            metrics.confidenceDistribution['medium (60-79)']++;
        } else {
            metrics.confidenceDistribution['low (0-59)']++;
        }
    }

    /**
     * Update error metrics
     */
    updateErrorMetrics(error) {
        const metrics = this.performanceMetrics.errorCounts;
        
        if (error.message.includes('API')) {
            metrics.apiErrors++;
        } else if (error.message.includes('parse') || error.message.includes('JSON')) {
            metrics.parseErrors++;
        } else if (error.message.includes('validation')) {
            metrics.validationErrors++;
        } else if (error.message.includes('timeout')) {
            metrics.timeoutErrors++;
        }
    }

    /**
     * Write performance log entry
     */
    writePerformanceLog(data) {
        if (!this.config.enablePerformanceTracking) return;

        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                ...data
            };
            
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.performanceLogFile, logLine);
        } catch (error) {
            console.error('⚠️ Failed to write performance log:', error.message);
        }
    }

    /**
     * Log prediction accuracy (for backtesting)
     */
    logPredictionAccuracy(requestId, prediction, actual, timeframe) {
        if (!this.config.enableAccuracyTracking) return;

        const correct = prediction.signal === actual.signal;
        const accuracyData = {
            requestId,
            prediction,
            actual,
            correct,
            timeframe,
            timestamp: new Date().toISOString()
        };

        this.info('Prediction accuracy logged', accuracyData);

        // Update accuracy metrics
        this.updateAccuracyMetrics(accuracyData);

        // Write to accuracy log
        try {
            const logLine = JSON.stringify(accuracyData) + '\n';
            fs.appendFileSync(this.accuracyLogFile, logLine);
        } catch (error) {
            console.error('⚠️ Failed to write accuracy log:', error.message);
        }
    }

    /**
     * Update accuracy metrics
     */
    updateAccuracyMetrics(accuracyData) {
        const metrics = this.accuracyMetrics;
        
        metrics.totalPredictions++;
        if (accuracyData.correct) {
            metrics.correctPredictions++;
        }
        
        metrics.accuracy = (metrics.correctPredictions / metrics.totalPredictions) * 100;

        // By timeframe
        if (!metrics.byTimeframe[accuracyData.timeframe]) {
            metrics.byTimeframe[accuracyData.timeframe] = { total: 0, correct: 0, accuracy: 0 };
        }
        metrics.byTimeframe[accuracyData.timeframe].total++;
        if (accuracyData.correct) {
            metrics.byTimeframe[accuracyData.timeframe].correct++;
        }
        metrics.byTimeframe[accuracyData.timeframe].accuracy = 
            (metrics.byTimeframe[accuracyData.timeframe].correct / metrics.byTimeframe[accuracyData.timeframe].total) * 100;

        // By confidence level
        const confidenceLevel = accuracyData.prediction.confidence >= 80 ? 'high' : 
                               accuracyData.prediction.confidence >= 60 ? 'medium' : 'low';
        if (!metrics.byConfidenceLevel[confidenceLevel]) {
            metrics.byConfidenceLevel[confidenceLevel] = { total: 0, correct: 0, accuracy: 0 };
        }
        metrics.byConfidenceLevel[confidenceLevel].total++;
        if (accuracyData.correct) {
            metrics.byConfidenceLevel[confidenceLevel].correct++;
        }
        metrics.byConfidenceLevel[confidenceLevel].accuracy = 
            (metrics.byConfidenceLevel[confidenceLevel].correct / metrics.byConfidenceLevel[confidenceLevel].total) * 100;

        // By signal type
        const signalType = accuracyData.prediction.signal;
        if (!metrics.bySignalType[signalType]) {
            metrics.bySignalType[signalType] = { total: 0, correct: 0, accuracy: 0 };
        }
        metrics.bySignalType[signalType].total++;
        if (accuracyData.correct) {
            metrics.bySignalType[signalType].correct++;
        }
        metrics.bySignalType[signalType].accuracy = 
            (metrics.bySignalType[signalType].correct / metrics.bySignalType[signalType].total) * 100;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            uptime: Date.now() - (this.startTime || Date.now()),
            logDirectory: this.config.logDirectory,
            currentLogFile: this.currentLogFile
        };
    }

    /**
     * Get accuracy metrics
     */
    getAccuracyMetrics() {
        return { ...this.accuracyMetrics };
    }

    /**
     * Generate performance report
     */
    generatePerformanceReport() {
        const metrics = this.getPerformanceMetrics();
        const accuracy = this.getAccuracyMetrics();
        
        const report = {
            timestamp: new Date().toISOString(),
            performance: metrics,
            accuracy: accuracy,
            summary: {
                totalRequests: metrics.totalRequests,
                averageLatency: Math.round(metrics.averageLatency),
                overallAccuracy: Math.round(accuracy.accuracy * 100) / 100,
                errorRate: ((metrics.errorCounts.apiErrors + metrics.errorCounts.parseErrors + 
                           metrics.errorCounts.validationErrors + metrics.errorCounts.timeoutErrors) / 
                           metrics.totalRequests * 100).toFixed(2)
            }
        };

        return report;
    }

    /**
     * Save performance report to file
     */
    savePerformanceReport() {
        const report = this.generatePerformanceReport();
        const reportFile = path.join(this.config.logDirectory, `performance-report-${Date.now()}.json`);
        
        try {
            fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
            console.log(`📊 Performance report saved: ${reportFile}`);
            return reportFile;
        } catch (error) {
            console.error('⚠️ Failed to save performance report:', error.message);
            return null;
        }
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.performanceMetrics = {
            totalRequests: 0,
            totalLatency: 0,
            averageLatency: 0,
            minLatency: Infinity,
            maxLatency: 0,
            latencyDistribution: {
                '0-1000ms': 0,
                '1000-3000ms': 0,
                '3000-5000ms': 0,
                '5000ms+': 0
            },
            signalDistribution: {
                BUY: 0,
                SELL: 0,
                HOLD: 0
            },
            confidenceDistribution: {
                'high (80-100)': 0,
                'medium (60-79)': 0,
                'low (0-59)': 0
            },
            errorCounts: {
                apiErrors: 0,
                parseErrors: 0,
                validationErrors: 0,
                timeoutErrors: 0
            }
        };

        this.accuracyMetrics = {
            totalPredictions: 0,
            correctPredictions: 0,
            accuracy: 0,
            byTimeframe: {},
            byConfidenceLevel: {},
            bySignalType: {}
        };

        this.info('Metrics reset');
    }
}

module.exports = DeterministicLogger;