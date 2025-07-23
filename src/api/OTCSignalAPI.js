/**
 * OTC Signal API Integration
 * 
 * Complete API integration for OTC binary options signal generation
 * with screenshot analysis, multi-timeframe analysis, and strict validation.
 */

const { MultiTimeframeOTCAnalyzer } = require('../core/MultiTimeframeOTCAnalyzer');
const { OTCSignalGenerationEngine } = require('../core/OTCSignalGenerationEngine');
const { SignalPerformanceTracker } = require('../core/SignalPerformanceTracker');
const { ConfidenceCalibrationSystem } = require('../core/ConfidenceCalibrationSystem');
const { strictModeConfig } = require('../config/strict-mode');

class OTCSignalAPI {
    constructor(config = {}) {
        this.config = {
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
            supportedFormats: config.supportedFormats || ['png', 'jpg', 'jpeg', 'webp'],
            rateLimitWindow: config.rateLimitWindow || 60000, // 1 minute
            maxRequestsPerWindow: config.maxRequestsPerWindow || 10,
            ...config
        };

        // Initialize core components
        this.multiTimeframeAnalyzer = new MultiTimeframeOTCAnalyzer();
        this.singleTimeframeEngine = new OTCSignalGenerationEngine();
        this.performanceTracker = new SignalPerformanceTracker();
        this.confidenceCalibration = new ConfidenceCalibrationSystem();

        // Rate limiting
        this.requestHistory = new Map();
        
        // API statistics
        this.apiStats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastRequest: null
        };

        // Start performance tracking
        this.performanceTracker.startTracking();
    }

    /**
     * Main API endpoint for OTC signal generation
     */
    async generateOTCSignal(req, res) {
        const startTime = Date.now();
        const requestId = this.generateRequestId();

        console.log(`🚀 === OTC SIGNAL API REQUEST ===`);
        console.log(`🆔 Request ID: ${requestId}`);
        console.log(`📡 IP: ${req.ip || 'unknown'}`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

        try {
            // Rate limiting check
            this.checkRateLimit(req.ip);

            // Validate request
            const validation = this.validateRequest(req);
            if (!validation.isValid) {
                return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', validation.errors.join(', '), requestId);
            }

            // Extract parameters
            const {
                imageBuffer,
                asset,
                timeframe,
                duration,
                analysisType = 'single' // 'single' or 'multi'
            } = validation.data;

            let signal;

            // Generate signal based on analysis type
            if (analysisType === 'multi') {
                console.log('🔍 Performing multi-timeframe analysis...');
                const analysis = await this.multiTimeframeAnalyzer.analyzeMultiTimeframe(imageBuffer, {
                    asset,
                    timeframe,
                    duration
                });
                signal = analysis.finalSignal;
            } else {
                console.log('🎯 Performing single timeframe analysis...');
                signal = await this.singleTimeframeEngine.generateSignalFromScreenshot(imageBuffer, {
                    asset,
                    timeframe,
                    duration
                });
            }

            // Apply confidence calibration
            const calibratedConfidence = this.confidenceCalibration.calibrateConfidence(signal.confidence / 100);
            signal.originalConfidence = signal.confidence;
            signal.confidence = Math.round(calibratedConfidence.calibrated * 100);
            signal.confidenceCalibration = calibratedConfidence;

            // Record signal for performance tracking
            this.performanceTracker.recordSignal(signal.id, signal, {
                symbol: asset,
                timeframe,
                price: signal.analysis?.imageProcessing?.currentPrice || 0
            });

            // Apply final strict mode validation
            this.validateStrictModeSignal(signal);

            const responseTime = Date.now() - startTime;
            this.updateAPIStats(responseTime, true);

            console.log(`✅ === OTC SIGNAL GENERATED SUCCESSFULLY ===`);
            console.log(`🎯 Signal: ${signal.signal}`);
            console.log(`📊 Confidence: ${signal.confidence}% (calibrated from ${signal.originalConfidence}%)`);
            console.log(`⏱️ Response Time: ${responseTime}ms`);

            return res.status(200).json({
                success: true,
                requestId,
                responseTime,
                signal,
                metadata: {
                    apiVersion: '2.0',
                    strictMode: strictModeConfig.isStrictModeEnabled(),
                    analysisType,
                    calibrated: true
                }
            });

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.updateAPIStats(responseTime, false);

            console.error(`❌ === OTC SIGNAL GENERATION FAILED ===`);
            console.error(`🆔 Request ID: ${requestId}`);
            console.error(`❌ Error: ${error.message}`);
            console.error(`⏱️ Response Time: ${responseTime}ms`);

            // Determine error type and status code
            let statusCode = 500;
            let errorType = 'INTERNAL_ERROR';

            if (error.message.includes('STRICT_MODE_VIOLATION')) {
                statusCode = 422;
                errorType = 'STRICT_MODE_VIOLATION';
            } else if (error.message.includes('validation') || error.message.includes('Invalid')) {
                statusCode = 400;
                errorType = 'VALIDATION_ERROR';
            } else if (error.message.includes('Insufficient')) {
                statusCode = 422;
                errorType = 'INSUFFICIENT_DATA';
            }

            return this.sendErrorResponse(res, statusCode, errorType, error.message, requestId, responseTime);
        }
    }

    /**
     * API endpoint for recording signal outcomes
     */
    async recordSignalOutcome(req, res) {
        const requestId = this.generateRequestId();

        try {
            const { signalId, outcome, profit = 0 } = req.body;

            if (!signalId || !outcome) {
                return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'signalId and outcome are required', requestId);
            }

            if (!['win', 'loss'].includes(outcome)) {
                return this.sendErrorResponse(res, 400, 'VALIDATION_ERROR', 'outcome must be "win" or "loss"', requestId);
            }

            // Record outcome in performance tracker
            this.performanceTracker.recordOutcome(signalId, outcome, profit);

            // Record for confidence calibration
            this.confidenceCalibration.addPrediction(signalId, 0.8, outcome === 'win' ? 1 : 0); // Placeholder confidence

            console.log(`📊 Recorded outcome for signal ${signalId}: ${outcome} (profit: ${profit})`);

            return res.status(200).json({
                success: true,
                requestId,
                message: 'Outcome recorded successfully',
                signalId,
                outcome,
                profit
            });

        } catch (error) {
            console.error(`❌ Failed to record outcome: ${error.message}`);
            return this.sendErrorResponse(res, 500, 'INTERNAL_ERROR', error.message, requestId);
        }
    }

    /**
     * API endpoint for getting performance metrics
     */
    async getPerformanceMetrics(req, res) {
        try {
            const metrics = {
                api: this.getAPIStats(),
                signalGeneration: this.multiTimeframeAnalyzer.getPerformanceMetrics(),
                performanceTracking: this.performanceTracker.getPerformanceMetrics(),
                confidenceCalibration: this.confidenceCalibration.getCalibrationQuality()
            };

            return res.status(200).json({
                success: true,
                metrics,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error(`❌ Failed to get metrics: ${error.message}`);
            return this.sendErrorResponse(res, 500, 'INTERNAL_ERROR', error.message);
        }
    }

    /**
     * Validate incoming request
     */
    validateRequest(req) {
        const validation = {
            isValid: true,
            errors: [],
            data: {}
        };

        try {
            // Check if file was uploaded
            if (!req.file && !req.body.image) {
                validation.errors.push('No image file provided');
                validation.isValid = false;
                return validation;
            }

            // Get image buffer
            let imageBuffer;
            if (req.file) {
                imageBuffer = req.file.buffer;
            } else if (req.body.image) {
                // Handle base64 image
                const base64Data = req.body.image.replace(/^data:image\/[a-z]+;base64,/, '');
                imageBuffer = Buffer.from(base64Data, 'base64');
            }

            // Validate file size
            if (imageBuffer.length > this.config.maxFileSize) {
                validation.errors.push(`File too large: ${imageBuffer.length} bytes > ${this.config.maxFileSize} bytes`);
                validation.isValid = false;
            }

            // Validate asset
            const asset = req.body.asset || req.query.asset;
            if (!asset) {
                validation.errors.push('Asset parameter is required');
                validation.isValid = false;
            }

            // Validate timeframe
            const timeframe = req.body.timeframe || req.query.timeframe || '1m';
            const validTimeframes = ['1m', '2m', '3m', '5m'];
            if (!validTimeframes.includes(timeframe)) {
                validation.errors.push(`Invalid timeframe: ${timeframe}. Must be one of: ${validTimeframes.join(', ')}`);
                validation.isValid = false;
            }

            // Validate duration
            const duration = parseInt(req.body.duration || req.query.duration || '60');
            const validDurations = [60, 120, 180, 300];
            if (!validDurations.includes(duration)) {
                validation.errors.push(`Invalid duration: ${duration}. Must be one of: ${validDurations.join(', ')}`);
                validation.isValid = false;
            }

            // Validate analysis type
            const analysisType = req.body.analysisType || req.query.analysisType || 'single';
            if (!['single', 'multi'].includes(analysisType)) {
                validation.errors.push(`Invalid analysisType: ${analysisType}. Must be 'single' or 'multi'`);
                validation.isValid = false;
            }

            validation.data = {
                imageBuffer,
                asset,
                timeframe,
                duration,
                analysisType
            };

            return validation;

        } catch (error) {
            validation.errors.push(`Request validation error: ${error.message}`);
            validation.isValid = false;
            return validation;
        }
    }

    /**
     * Check rate limiting
     */
    checkRateLimit(ip) {
        const now = Date.now();
        const windowStart = now - this.config.rateLimitWindow;

        if (!this.requestHistory.has(ip)) {
            this.requestHistory.set(ip, []);
        }

        const requests = this.requestHistory.get(ip);
        
        // Remove old requests
        const recentRequests = requests.filter(timestamp => timestamp > windowStart);
        this.requestHistory.set(ip, recentRequests);

        // Check limit
        if (recentRequests.length >= this.config.maxRequestsPerWindow) {
            throw new Error(`Rate limit exceeded: ${recentRequests.length} requests in the last ${this.config.rateLimitWindow / 1000} seconds`);
        }

        // Add current request
        recentRequests.push(now);
    }

    /**
     * Validate signal against strict mode requirements
     */
    validateStrictModeSignal(signal) {
        if (!strictModeConfig.isStrictModeEnabled()) {
            return;
        }

        // Apply strict mode validation
        const validation = strictModeConfig.enforceStrictSignalGeneration(signal);
        
        if (!validation.passed) {
            throw strictModeConfig.createStrictModeError(
                `Signal failed strict mode validation: ${validation.errors.join(', ')}`
            );
        }

        // Additional OTC-specific checks
        if (signal.confidence < 75) {
            throw strictModeConfig.createStrictModeError(
                `OTC signal confidence too low for strict mode: ${signal.confidence}% < 75%`
            );
        }

        if (signal.quality.score < 0.8) {
            throw strictModeConfig.createStrictModeError(
                `OTC signal quality too low for strict mode: ${signal.quality.score} < 0.8`
            );
        }
    }

    /**
     * Send error response
     */
    sendErrorResponse(res, statusCode, errorType, message, requestId, responseTime = 0) {
        return res.status(statusCode).json({
            success: false,
            error: {
                type: errorType,
                message,
                code: statusCode
            },
            requestId,
            responseTime,
            timestamp: new Date().toISOString(),
            strictMode: strictModeConfig.isStrictModeEnabled()
        });
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `OTC_REQ_${timestamp}_${random}`;
    }

    /**
     * Update API statistics
     */
    updateAPIStats(responseTime, success) {
        this.apiStats.totalRequests++;
        
        if (success) {
            this.apiStats.successfulRequests++;
        } else {
            this.apiStats.failedRequests++;
        }

        // Update average response time
        this.apiStats.averageResponseTime = 
            (this.apiStats.averageResponseTime * (this.apiStats.totalRequests - 1) + responseTime) / 
            this.apiStats.totalRequests;

        this.apiStats.lastRequest = Date.now();
    }

    /**
     * Get API statistics
     */
    getAPIStats() {
        return {
            ...this.apiStats,
            successRate: this.apiStats.totalRequests > 0 ? 
                this.apiStats.successfulRequests / this.apiStats.totalRequests : 0,
            uptime: Date.now() - (this.apiStats.lastRequest || Date.now())
        };
    }

    /**
     * Health check endpoint
     */
    async healthCheck(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: Date.now(),
                version: '2.0',
                strictMode: strictModeConfig.isStrictModeEnabled(),
                components: {
                    multiTimeframeAnalyzer: 'operational',
                    singleTimeframeEngine: 'operational',
                    performanceTracker: 'operational',
                    confidenceCalibration: 'operational'
                },
                stats: this.getAPIStats()
            };

            return res.status(200).json(health);

        } catch (error) {
            return res.status(503).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: Date.now()
            });
        }
    }
}

module.exports = { OTCSignalAPI };
