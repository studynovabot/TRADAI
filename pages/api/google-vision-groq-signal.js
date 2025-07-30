/**
 * Google Vision + Groq AI Trading Signal API Endpoint
 * Comprehensive OCR-to-AI pipeline for trading chart analysis and signal generation
 */

const GoogleVisionGroqPipeline = require('../../src/services/GoogleVisionGroqPipeline');
const MultiTimeframeAnalysisEngine = require('../../src/services/MultiTimeframeAnalysisEngine');
const { ErrorHandlingValidationService, RateLimitError, ValidationError } = require('../../src/services/ErrorHandlingValidationService');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
    dest: path.join(process.cwd(), 'temp/uploads'),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Maximum 5 files for multi-timeframe analysis
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Initialize services
let pipeline = null;
let multiTimeframeEngine = null;
let errorHandler = null;

/**
 * Initialize services
 */
async function initializeServices() {
    if (!pipeline) {
        pipeline = new GoogleVisionGroqPipeline({
            googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY,
            groqApiKey: process.env.GROQ_API_KEY,
            processingTimeout: 60000,
            minConfidence: 70,
            enableRedundantValidation: true,
            enableImagePreprocessing: true
        });
        
        await pipeline.initialize();
    }
    
    if (!multiTimeframeEngine) {
        multiTimeframeEngine = new MultiTimeframeAnalysisEngine({
            primaryTimeframes: ['1m', '3m', '5m'],
            minConfluenceScore: 75,
            requiredAgreement: 2,
            otcMinConfidence: 80
        });
    }
    
    if (!errorHandler) {
        errorHandler = new ErrorHandlingValidationService({
            maxRequestsPerMinute: 30,
            maxRequestsPerHour: 500,
            enableCircuitBreaker: true,
            enableErrorLogging: true
        });
    }
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.'
        });
    }
    
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        // Initialize services
        await initializeServices();
        
        // Rate limiting
        const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const rateLimitCheck = errorHandler.checkRateLimit(clientId, 'google-vision-groq-signal');
        
        console.log(`🚀 Google Vision + Groq AI Signal Request - ID: ${requestId}`);
        console.log(`📡 Client: ${clientId}`);
        console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
        
        // Handle file upload
        await new Promise((resolve, reject) => {
            upload.array('screenshots', 5)(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Validate request
        const validation = validateRequest(req);
        if (!validation.isValid) {
            throw new ValidationError(validation.errors.join(', '));
        }
        
        // Process based on analysis type
        let result;
        if (req.body.analysisType === 'multi-timeframe' && req.files && req.files.length > 1) {
            result = await processMultiTimeframeAnalysis(req, requestId);
        } else {
            result = await processSingleScreenshot(req, requestId);
        }
        
        // Cleanup uploaded files
        cleanupUploadedFiles(req.files);
        
        const processingTime = Date.now() - startTime;
        
        // Return success response
        return res.status(200).json({
            success: true,
            requestId,
            processingTime,
            timestamp: new Date().toISOString(),
            rateLimits: rateLimitCheck.remaining,
            ...result
        });
        
    } catch (error) {
        console.error(`❌ Request ${requestId} failed:`, error.message);
        
        // Cleanup uploaded files on error
        if (req.files) {
            cleanupUploadedFiles(req.files);
        }
        
        // Handle specific error types
        let statusCode = 500;
        let errorType = 'INTERNAL_ERROR';
        
        if (error instanceof RateLimitError) {
            statusCode = 429;
            errorType = 'RATE_LIMIT_EXCEEDED';
        } else if (error instanceof ValidationError) {
            statusCode = 400;
            errorType = 'VALIDATION_ERROR';
        }
        
        return res.status(statusCode).json({
            success: false,
            requestId,
            error: error.message,
            errorType,
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Validate request data
 */
function validateRequest(req) {
    const validation = {
        isValid: true,
        errors: []
    };
    
    // Check for files
    if (!req.files || req.files.length === 0) {
        validation.errors.push('No screenshot files provided');
    }
    
    // Validate analysis type
    const analysisType = req.body.analysisType || 'single';
    if (!['single', 'multi-timeframe'].includes(analysisType)) {
        validation.errors.push('Invalid analysis type. Use "single" or "multi-timeframe"');
    }
    
    // For multi-timeframe, require at least 2 files
    if (analysisType === 'multi-timeframe' && req.files && req.files.length < 2) {
        validation.errors.push('Multi-timeframe analysis requires at least 2 screenshots');
    }
    
    // Validate asset if provided
    if (req.body.asset) {
        const validAssets = ['USD/BRL', 'USD/EUR', 'USD/GBP', 'USD/JPY', 'EUR/GBP', 'GBP/JPY'];
        if (!validAssets.includes(req.body.asset.toUpperCase())) {
            validation.errors.push(`Unsupported asset: ${req.body.asset}`);
        }
    }
    
    // Validate timeframes if provided
    if (req.body.timeframes) {
        try {
            const timeframes = JSON.parse(req.body.timeframes);
            const validTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h'];
            
            if (!Array.isArray(timeframes)) {
                validation.errors.push('Timeframes must be an array');
            } else {
                const invalidTimeframes = timeframes.filter(tf => !validTimeframes.includes(tf));
                if (invalidTimeframes.length > 0) {
                    validation.errors.push(`Invalid timeframes: ${invalidTimeframes.join(', ')}`);
                }
            }
        } catch (error) {
            validation.errors.push('Invalid timeframes JSON format');
        }
    }
    
    validation.isValid = validation.errors.length === 0;
    
    return validation;
}

/**
 * Process single screenshot analysis
 */
async function processSingleScreenshot(req, requestId) {
    console.log(`📷 Processing single screenshot analysis - ${requestId}`);
    
    const file = req.files[0];
    const options = {
        timeframe: req.body.timeframe || '5m',
        asset: req.body.asset || 'USD/BRL',
        platform: req.body.platform || 'Unknown',
        analysisType: 'comprehensive'
    };
    
    // Process screenshot through pipeline
    const result = await errorHandler.executeWithRetry(
        () => pipeline.processScreenshot(file.path, options),
        'single-screenshot-analysis'
    );
    
    if (!result.success) {
        throw new Error(`Screenshot processing failed: ${result.error}`);
    }
    
    // Validate signal quality
    const signalValidation = errorHandler.validateTradingSignal(result.tradingSignal);
    const ocrValidation = errorHandler.validateOCRResults(result.ocrResults);
    
    return {
        analysisType: 'single',
        screenshot: {
            filename: file.originalname,
            size: file.size,
            processingTime: result.processingTime
        },
        ocrResults: {
            method: result.ocrResults.method,
            confidence: result.ocrResults.confidence,
            tradingData: result.ocrResults.tradingData,
            validation: ocrValidation
        },
        aiAnalysis: {
            method: result.aiAnalysis.method,
            confidence: result.aiAnalysis.confidence,
            analysis: result.aiAnalysis.analysis
        },
        tradingSignal: {
            ...result.tradingSignal,
            validation: signalValidation
        },
        quality: result.quality,
        recommendations: generateSingleScreenshotRecommendations(result)
    };
}

/**
 * Process multi-timeframe analysis
 */
async function processMultiTimeframeAnalysis(req, requestId) {
    console.log(`📊 Processing multi-timeframe analysis - ${requestId} (${req.files.length} screenshots)`);
    
    const timeframes = req.body.timeframes ? JSON.parse(req.body.timeframes) : ['1m', '3m', '5m'];
    const asset = req.body.asset || 'USD/BRL';
    
    // Map files to timeframes
    const screenshots = req.files.map((file, index) => ({
        path: file.path,
        timeframe: timeframes[index] || `${index + 1}m`,
        asset: asset,
        filename: file.originalname
    }));
    
    // Process through multi-timeframe pipeline
    const pipelineResult = await errorHandler.executeWithRetry(
        () => pipeline.processMultiTimeframeScreenshots(screenshots, { asset }),
        'multi-timeframe-analysis'
    );
    
    if (!pipelineResult.success) {
        throw new Error(`Multi-timeframe processing failed: ${pipelineResult.error}`);
    }
    
    // Perform confluence analysis
    const confluenceResult = await errorHandler.executeWithRetry(
        () => multiTimeframeEngine.analyzeMultiTimeframe(
            pipelineResult.individualResults.map(r => ({
                timeframe: r.timeframe,
                result: r.result
            })),
            { asset, analysisType: 'comprehensive' }
        ),
        'confluence-analysis'
    );
    
    if (!confluenceResult.success) {
        throw new Error(`Confluence analysis failed: ${confluenceResult.error}`);
    }
    
    return {
        analysisType: 'multi-timeframe',
        screenshots: screenshots.map(s => ({
            timeframe: s.timeframe,
            filename: s.filename
        })),
        pipelineResults: {
            batchId: pipelineResult.batchId,
            processingTime: pipelineResult.processingTime,
            timeframes: pipelineResult.timeframes,
            confluenceAnalysis: pipelineResult.confluenceAnalysis,
            multiTimeframeSignal: pipelineResult.multiTimeframeSignal
        },
        enhancedConfluence: {
            analysisId: confluenceResult.analysis.analysisId,
            confluence: confluenceResult.analysis.confluence,
            signals: confluenceResult.analysis.signals,
            recommendations: confluenceResult.analysis.recommendations
        },
        finalSignal: generateFinalMultiTimeframeSignal(pipelineResult, confluenceResult),
        quality: assessMultiTimeframeQuality(pipelineResult, confluenceResult)
    };
}

/**
 * Generate recommendations for single screenshot analysis
 */
function generateSingleScreenshotRecommendations(result) {
    const recommendations = [];
    
    if (result.tradingSignal.confidence >= 85) {
        recommendations.push(`High confidence ${result.tradingSignal.direction} signal - Consider executing trade`);
    } else if (result.tradingSignal.confidence >= 75) {
        recommendations.push(`Moderate confidence signal - Monitor closely before execution`);
    } else {
        recommendations.push('Low confidence signal - Wait for better setup');
    }
    
    if (result.quality.overallQuality.level === 'LOW') {
        recommendations.push('Consider retaking screenshot with better quality');
    }
    
    if (result.ocrResults.tradingData.prices.length === 0) {
        recommendations.push('No prices detected - Ensure chart contains visible price data');
    }
    
    return recommendations;
}

/**
 * Generate final multi-timeframe signal
 */
function generateFinalMultiTimeframeSignal(pipelineResult, confluenceResult) {
    const pipelineSignal = pipelineResult.multiTimeframeSignal;
    const confluenceSignal = confluenceResult.analysis.signals.primary;
    
    // Combine both analyses for final signal
    const finalConfidence = Math.min(95, (pipelineSignal.confidence + confluenceSignal.confidence) / 2);
    
    return {
        direction: confluenceSignal.direction,
        confidence: finalConfidence,
        recommendation: confluenceSignal.recommendation,
        riskLevel: confluenceSignal.riskLevel,
        timeframeAgreement: pipelineSignal.timeframeAgreement,
        confluenceScore: confluenceResult.analysis.confluence.overallScore,
        reasoning: `Multi-timeframe confluence analysis: ${pipelineSignal.timeframeAgreement}/${pipelineResult.timeframes.length} timeframes agree with ${finalConfidence.toFixed(1)}% confidence`,
        validUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        signals: {
            scalping: confluenceResult.analysis.signals.scalping,
            swing: confluenceResult.analysis.signals.swing,
            otc: confluenceResult.analysis.signals.otc
        }
    };
}

/**
 * Assess multi-timeframe quality
 */
function assessMultiTimeframeQuality(pipelineResult, confluenceResult) {
    let score = 0;
    
    // Pipeline quality (50%)
    if (pipelineResult.multiTimeframeSignal.confidence >= 80) score += 50;
    else if (pipelineResult.multiTimeframeSignal.confidence >= 70) score += 35;
    else score += 20;
    
    // Confluence quality (50%)
    if (confluenceResult.analysis.confluence.overallScore >= 80) score += 50;
    else if (confluenceResult.analysis.confluence.overallScore >= 70) score += 35;
    else score += 20;
    
    return {
        score: score,
        level: score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
        pipelineQuality: pipelineResult.multiTimeframeSignal.confidence,
        confluenceQuality: confluenceResult.analysis.confluence.overallScore
    };
}

/**
 * Cleanup uploaded files
 */
function cleanupUploadedFiles(files) {
    if (!files) return;
    
    files.forEach(file => {
        try {
            if (fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to cleanup file ${file.path}:`, error.message);
        }
    });
}

/**
 * Health check endpoint
 */
export async function healthCheck() {
    try {
        await initializeServices();
        
        const pipelineStats = pipeline.getProcessingStats();
        const healthStatus = errorHandler.getHealthStatus();
        
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                pipeline: 'operational',
                multiTimeframe: 'operational',
                errorHandler: 'operational'
            },
            stats: {
                pipeline: pipelineStats,
                health: healthStatus
            }
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Configure Next.js API route
export const config = {
    api: {
        bodyParser: false, // Disable default body parser for multer
        responseLimit: false
    }
};
