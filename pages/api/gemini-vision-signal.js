/**
 * Gemini Vision Trading Signal API
 * Production endpoint for enhanced chart analysis with multi-API key rotation
 */

import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Import our enhanced services
const EnhancedChartAnalysisEngine = require('../../src/services/EnhancedChartAnalysisEngine');
const MultiTimeframeAnalysisEngine = require('../../src/services/MultiTimeframeAnalysisEngine');
const ErrorHandlingValidationService = require('../../src/services/ErrorHandlingValidationService');

// Global instances
let analysisEngine = null;
let multiTimeframeEngine = null;
let errorHandler = null;

// Disable body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

/**
 * Initialize services
 */
async function initializeServices() {
    if (!analysisEngine) {
        // Load API keys from environment
        const apiKeys = loadApiKeysFromEnv();
        
        analysisEngine = new EnhancedChartAnalysisEngine({
            apiKeys: apiKeys,
            minConfidence: 70,
            maxConfidence: 95,
            supportedTimeframes: ['1m', '3m', '5m', '15m', '30m'],
            supportedAssets: ['USD/BRL', 'USD/TRY', 'EUR/USD', 'GBP/USD', 'USD/INR'],
            enableQualityValidation: true,
            enableConfidenceCalibration: true,
            maxConcurrentRequests: 3
        });
        
        await analysisEngine.initialize();
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
            maxRequestsPerMinute: 20,
            maxRequestsPerHour: 300,
            enableCircuitBreaker: true,
            enableErrorLogging: true
        });
    }
}

/**
 * Load API keys from environment variables
 */
function loadApiKeysFromEnv() {
    const keys = [];
    
    // Primary key
    if (process.env.GOOGLE_VISION_API_KEY) {
        keys.push(process.env.GOOGLE_VISION_API_KEY);
    }
    
    // Additional keys (GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, etc.)
    for (let i = 2; i <= 10; i++) {
        const key = process.env[`GOOGLE_API_KEY_${i}`] || process.env[`GEMINI_API_KEY_${i}`];
        if (key) {
            keys.push(key);
        }
    }
    
    console.log(`🔑 Loaded ${keys.length} API keys for Gemini Vision`);
    return keys;
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        });
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`📊 Gemini Vision Signal Request: ${requestId}`);

    try {
        // Initialize services
        await initializeServices();
        
        // Parse form data
        const { files, fields } = await parseFormData(req);
        
        // Validate request
        const validation = validateRequest(files, fields);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error,
                requestId
            });
        }

        // Process the request
        const result = await errorHandler.executeWithRetry(
            () => processAnalysisRequest(files, fields, requestId),
            'gemini-vision-analysis'
        );

        // Return response
        res.status(200).json({
            success: true,
            requestId,
            timestamp: new Date().toISOString(),
            ...result
        });

    } catch (error) {
        console.error(`❌ Gemini Vision API Error [${requestId}]:`, error);
        
        res.status(500).json({
            success: false,
            error: error.message,
            requestId,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Parse multipart form data
 */
async function parseFormData(req) {
    return new Promise((resolve, reject) => {
        const form = formidable({
            uploadDir: './temp',
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                reject(err);
            } else {
                resolve({ files, fields });
            }
        });
    });
}

/**
 * Validate request parameters
 */
function validateRequest(files, fields) {
    // Check if files are provided
    if (!files || Object.keys(files).length === 0) {
        return { valid: false, error: 'No image files provided' };
    }

    // Validate file types
    for (const [key, file] of Object.entries(files)) {
        const fileArray = Array.isArray(file) ? file : [file];
        for (const f of fileArray) {
            if (!f.mimetype || !f.mimetype.startsWith('image/')) {
                return { valid: false, error: `Invalid file type: ${f.mimetype}` };
            }
        }
    }

    // Validate timeframe
    const timeframe = fields.timeframe?.[0] || fields.timeframe;
    const validTimeframes = ['1m', '3m', '5m', '15m', '30m'];
    if (timeframe && !validTimeframes.includes(timeframe)) {
        return { valid: false, error: `Invalid timeframe: ${timeframe}` };
    }

    return { valid: true };
}

/**
 * Process analysis request
 */
async function processAnalysisRequest(files, fields, requestId) {
    console.log(`🔍 Processing Gemini Vision analysis request: ${requestId}`);
    
    // Extract parameters
    const timeframe = fields.timeframe?.[0] || fields.timeframe || '5m';
    const asset = fields.asset?.[0] || fields.asset || 'USD/BRL';
    const analysisType = fields.analysisType?.[0] || fields.analysisType || 'comprehensive';
    
    const options = {
        timeframe,
        asset,
        analysisType,
        platform: 'Gemini Vision Enhanced',
        requestId
    };

    // Handle single or multiple files
    const fileArray = Array.isArray(files.image) ? files.image : [files.image || files[Object.keys(files)[0]]];
    
    if (fileArray.length === 1) {
        // Single screenshot analysis
        return await processSingleScreenshot(fileArray[0], options);
    } else {
        // Multi-timeframe analysis
        return await processMultiTimeframeAnalysis(fileArray, options);
    }
}

/**
 * Process single screenshot analysis
 */
async function processSingleScreenshot(file, options) {
    console.log(`📷 Processing single screenshot: ${file.originalFilename}`);
    
    try {
        // Analyze with enhanced engine
        const result = await analysisEngine.analyzeChart(file.filepath, options);
        
        if (!result.success) {
            throw new Error(`Analysis failed: ${result.error}`);
        }

        // Generate final trading signal
        const tradingSignal = generateTradingSignal(result, options);
        
        return {
            analysis: result,
            signal: tradingSignal,
            metadata: {
                processingMethod: 'Gemini Vision Enhanced',
                apiKeysUsed: analysisEngine.getStats().keyManager?.manager?.activeKeys || 1,
                tokenOptimization: true,
                qualityValidation: true
            }
        };
        
    } finally {
        // Clean up uploaded file
        if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
        }
    }
}

/**
 * Process multi-timeframe analysis
 */
async function processMultiTimeframeAnalysis(files, options) {
    console.log(`📊 Processing multi-timeframe analysis with ${files.length} screenshots`);
    
    const analyses = [];
    
    try {
        // Analyze each timeframe
        for (const file of files) {
            const timeframeOptions = {
                ...options,
                timeframe: extractTimeframeFromFilename(file.originalFilename) || options.timeframe
            };
            
            const result = await analysisEngine.analyzeChart(file.filepath, timeframeOptions);
            if (result.success) {
                analyses.push({
                    timeframe: timeframeOptions.timeframe,
                    analysis: result
                });
            }
        }
        
        if (analyses.length === 0) {
            throw new Error('No successful analyses from provided screenshots');
        }
        
        // Generate confluence analysis
        const confluenceResult = await multiTimeframeEngine.generateConfluenceSignal(
            analyses.map(a => ({
                timeframe: a.timeframe,
                signal: generateTradingSignal(a.analysis, options)
            })),
            options
        );
        
        return {
            multiTimeframeAnalysis: analyses,
            confluenceSignal: confluenceResult,
            metadata: {
                processingMethod: 'Gemini Vision Multi-Timeframe',
                timeframesAnalyzed: analyses.length,
                apiKeysUsed: analysisEngine.getStats().keyManager?.manager?.activeKeys || 1,
                confluenceScore: confluenceResult.confluenceScore
            }
        };
        
    } finally {
        // Clean up all uploaded files
        files.forEach(file => {
            if (fs.existsSync(file.filepath)) {
                fs.unlinkSync(file.filepath);
            }
        });
    }
}

/**
 * Generate trading signal from analysis result
 */
function generateTradingSignal(analysisResult, options) {
    if (!analysisResult.success || !analysisResult.analysis) {
        return {
            direction: 'NO_TRADE',
            confidence: 0,
            reasoning: 'Analysis failed'
        };
    }

    const analysis = analysisResult.analysis;
    const predictions = analysis.predictions || [];
    
    if (predictions.length === 0) {
        return {
            direction: 'NO_TRADE',
            confidence: 0,
            reasoning: 'No predictions available'
        };
    }

    // Use first prediction as primary signal
    const primaryPrediction = predictions[0];
    
    // Apply risk assessment
    const riskLevel = analysisResult.riskAssessment?.level || 'MEDIUM';
    let adjustedConfidence = primaryPrediction.confidence;
    
    // Reduce confidence for high-risk conditions
    if (riskLevel === 'HIGH') {
        adjustedConfidence = Math.max(60, adjustedConfidence - 10);
    } else if (riskLevel === 'VERY_HIGH') {
        adjustedConfidence = Math.max(50, adjustedConfidence - 20);
    }
    
    // Apply quality score adjustment
    const qualityScore = analysisResult.qualityScore || 70;
    if (qualityScore < 70) {
        adjustedConfidence = Math.max(50, adjustedConfidence - 15);
    }
    
    return {
        direction: primaryPrediction.direction,
        confidence: Math.round(adjustedConfidence),
        nextCandles: predictions,
        reasoning: analysis.reasoning || 'Technical analysis based signal',
        riskLevel: riskLevel,
        qualityScore: qualityScore,
        technicalAnalysis: analysis.technicalAnalysis,
        supportResistance: analysis.supportResistance,
        recommendations: analysisResult.recommendations || []
    };
}

/**
 * Extract timeframe from filename
 */
function extractTimeframeFromFilename(filename) {
    const timeframePattern = /(\d+[mh])/i;
    const match = filename.match(timeframePattern);
    return match ? match[1].toLowerCase() : null;
}
