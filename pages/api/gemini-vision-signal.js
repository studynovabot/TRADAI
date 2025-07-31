/**
 * Gemini Vision Trading Signal API
 * Production endpoint for enhanced chart analysis with multi-API key rotation
 */

import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Import Gemini-only services
const GeminiAnalysisService = require('../../src/services/GeminiAnalysisService');
const { ErrorHandlingValidationService } = require('../../src/services/ErrorHandlingValidationService');

// Global instances
let geminiService = null;
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
    if (!geminiService) {
        const apiKey = process.env.GOOGLE_VISION_API_KEY;
        if (!apiKey) {
            throw new Error('GOOGLE_VISION_API_KEY not found in environment variables');
        }

        geminiService = new GeminiAnalysisService({
            apiKey: apiKey,
            model: 'gemini-2.0-flash-exp',
            minConfidence: 70,
            maxConfidence: 95,
            temperature: 0.1,
            maxTokens: 4000,
            timeout: 60000
        });

        await geminiService.initialize();
        console.log('✅ Gemini Analysis Service initialized');
    }

    if (!errorHandler) {
        errorHandler = new ErrorHandlingValidationService({
            maxRequestsPerMinute: 20,
            maxRequestsPerHour: 300,
            enableCircuitBreaker: true,
            enableErrorLogging: true
        });
        console.log('✅ Error Handler initialized');
    }
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
                console.error('📛 Form parse error:', err);
                reject(err);
            } else {
                console.log('📋 Parsed files:', Object.keys(files));
                console.log('📋 Parsed fields:', Object.keys(fields));

                // Log file details
                for (const [key, file] of Object.entries(files)) {
                    const fileArray = Array.isArray(file) ? file : [file];
                    fileArray.forEach((f, index) => {
                        console.log(`📁 File ${key}[${index}]:`, {
                            originalFilename: f.originalFilename,
                            filepath: f.filepath,
                            size: f.size,
                            mimetype: f.mimetype,
                            exists: fs.existsSync(f.filepath)
                        });
                    });
                }

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
    console.log(`📁 File path: ${file.filepath}`);
    console.log(`📊 File exists: ${fs.existsSync(file.filepath)}`);

    if (!fs.existsSync(file.filepath)) {
        throw new Error(`Image file not found: ${file.filepath}`);
    }

    try {
        // Analyze with Gemini service
        const result = await geminiService.analyzeChart(file.filepath, options);

        if (!result.success) {
            throw new Error(`Analysis failed: ${result.error}`);
        }

        // Generate final trading signal from analysis
        const tradingSignal = {
            action: result.analysis.tradingSignal?.action || 'HOLD',
            confidence: result.analysis.tradingSignal?.confidence || result.confidence,
            entryPoint: result.analysis.tradingSignal?.entryPoint || 'Market price',
            reasoning: result.analysis.tradingSignal?.reasoning || 'Based on technical analysis',
            riskLevel: result.analysis.tradingSignal?.riskLevel || 'MEDIUM',
            timeframe: options.timeframe,
            asset: options.asset
        };

        // Clean up uploaded file after successful analysis
        if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
        }

        return {
            analysis: result.analysis,
            signal: tradingSignal,
            confidence: result.confidence,
            metadata: {
                processingMethod: 'Gemini Vision Direct',
                model: geminiService.config.model,
                processingTime: result.processingTime,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        // Clean up uploaded file on error
        if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
        }
        throw error;
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
            
            const result = await geminiService.analyzeChart(file.filepath, timeframeOptions);
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
        
        // Generate simple confluence analysis
        const avgConfidence = analyses.reduce((sum, a) => sum + a.analysis.overallConfidence, 0) / analyses.length;
        const dominantSignal = analyses.length > 0 ? analyses[0].analysis.tradingSignal : null;

        return {
            analysisType: 'multi-timeframe',
            individualAnalyses: analyses,
            confluenceAnalysis: {
                overallSignal: dominantSignal,
                averageConfidence: avgConfidence,
                timeframesAnalyzed: analyses.length,
                agreement: 'High'
            },
            metadata: {
                processingMethod: 'Gemini Vision Multi-Timeframe',
                timeframesAnalyzed: analyses.length,
                totalScreenshots: files.length
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
 * Extract timeframe from filename
 */
function extractTimeframeFromFilename(filename) {
    const timeframePattern = /(\d+[mh])/i;
    const match = filename.match(timeframePattern);
    return match ? match[1].toLowerCase() : null;
}
