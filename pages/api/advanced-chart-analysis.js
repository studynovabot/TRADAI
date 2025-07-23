/**
 * Advanced Chart Analysis API Endpoint
 * 
 * Handles screenshot upload and returns comprehensive trading analysis
 * with high-confidence signals and detailed market assessment.
 */

import { AdvancedChartAnalysisEngine } from '../../src/core/AdvancedChartAnalysisEngine';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable default body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Initialize analysis engine
const analysisEngine = new AdvancedChartAnalysisEngine({
    minAnalysisConfidence: 75,
    minSignalConfidence: 80,
    includeDebugInfo: process.env.NODE_ENV === 'development',
    imageProcessing: {
        minWidth: 800,
        minHeight: 600,
        qualityThreshold: 0.7
    },
    computerVision: {
        patternConfidenceThreshold: 0.7,
        supportResistanceMinTouches: 3
    },
    signalGeneration: {
        minSignalConfidence: 80,
        strongSignalConfidence: 90,
        defaultRiskRewardRatio: 2.0
    }
});

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
            error: 'Method not allowed. Use POST to upload chart screenshots.'
        });
    }

    const startTime = Date.now();

    try {
        // Parse uploaded file
        const { imageBuffer, metadata } = await parseUploadedFile(req);
        
        if (!imageBuffer) {
            return res.status(400).json({
                success: false,
                error: 'No valid image file uploaded. Please upload a PNG, JPG, or WebP file.'
            });
        }

        console.log(`📷 Processing ${metadata.filename} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

        // Perform comprehensive analysis
        const analysisResult = await analysisEngine.analyzeChartScreenshot(imageBuffer, {
            filename: metadata.filename,
            originalSize: metadata.size
        });

        const processingTime = Date.now() - startTime;

        if (!analysisResult.success) {
            return res.status(500).json({
                success: false,
                error: analysisResult.error,
                processingTime
            });
        }

        // Filter signals by confidence threshold
        const highConfidenceSignals = analysisResult.signals.filter(
            signal => signal.confidence >= 80
        );

        // Prepare response
        const response = {
            success: true,
            processingTime,
            confidence: analysisResult.confidence,
            
            // Trading data extracted from screenshot
            tradingData: {
                currencyPair: analysisResult.tradingData?.currencyPair || 'Unknown',
                currentPrice: analysisResult.tradingData?.currentPrice || null,
                timeframe: analysisResult.tradingData?.timeframe || 'Unknown',
                platform: analysisResult.tradingData?.platform || 'Unknown'
            },
            
            // Market analysis
            marketAssessment: analysisResult.marketAssessment,
            
            // Trading signals
            signals: highConfidenceSignals.map(signal => ({
                id: signal.id,
                direction: signal.direction,
                type: signal.type,
                strength: signal.strength,
                confidence: Math.round(signal.confidence),
                entry: signal.entry,
                stopLoss: signal.stopLoss,
                targets: signal.targets,
                riskReward: signal.riskManagement?.riskReward || null,
                reasoning: signal.reasoning,
                timeframe: signal.timeframe,
                timestamp: signal.timestamp
            })),
            
            // Risk assessment
            riskAssessment: analysisResult.riskAssessment,
            
            // Technical analysis summary
            technicalAnalysis: {
                trend: analysisResult.marketAssessment?.trendDirection || 'unknown',
                bias: analysisResult.marketAssessment?.overallBias || 'neutral',
                volatility: analysisResult.marketAssessment?.volatility || 'unknown',
                keyLevels: analysisResult.marketAssessment?.keyLevels?.slice(0, 5) || [],
                patterns: analysisResult.marketAssessment?.majorPatterns?.slice(0, 3) || []
            },
            
            // Analysis metadata
            metadata: {
                analysisId: analysisResult.analysisId,
                totalSignalsGenerated: analysisResult.signals?.length || 0,
                highConfidenceSignals: highConfidenceSignals.length,
                imageProcessingSuccess: analysisResult.metadata?.imageProcessing || false,
                computerVisionSuccess: analysisResult.metadata?.computerVision || false,
                multiTimeframeSuccess: analysisResult.metadata?.multiTimeframe || false,
                timestamp: analysisResult.timestamp
            }
        };

        // Add debug information in development
        if (process.env.NODE_ENV === 'development' && analysisResult.debug) {
            response.debug = analysisResult.debug;
        }

        // Log successful analysis
        console.log(`✅ Analysis completed: ${response.confidence.toFixed(1)}% confidence, ${highConfidenceSignals.length} signals`);

        return res.status(200).json(response);

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error('❌ Advanced chart analysis failed:', error.message);
        
        return res.status(500).json({
            success: false,
            error: 'Internal server error during chart analysis',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            processingTime
        });
    }
}

/**
 * Parse uploaded file from request
 */
async function parseUploadedFile(req) {
    return new Promise((resolve, reject) => {
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB limit
            allowEmptyFiles: false,
            filter: ({ mimetype }) => {
                return mimetype && mimetype.includes('image');
            }
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                return reject(new Error(`File upload error: ${err.message}`));
            }

            const uploadedFile = files.image || files.screenshot || files.file;
            
            if (!uploadedFile) {
                return resolve({ imageBuffer: null, metadata: null });
            }

            try {
                // Handle both single file and array
                const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
                
                if (!file || !file.filepath) {
                    return resolve({ imageBuffer: null, metadata: null });
                }

                // Read file buffer
                const imageBuffer = await fs.promises.readFile(file.filepath);
                
                // Clean up temporary file
                try {
                    await fs.promises.unlink(file.filepath);
                } catch (cleanupError) {
                    console.warn('⚠️ Failed to cleanup temporary file:', cleanupError.message);
                }

                const metadata = {
                    filename: file.originalFilename || 'unknown.png',
                    size: file.size,
                    mimetype: file.mimetype
                };

                resolve({ imageBuffer, metadata });

            } catch (fileError) {
                reject(new Error(`File processing error: ${fileError.message}`));
            }
        });
    });
}

/**
 * Health check endpoint
 */
export async function healthCheck() {
    try {
        const stats = analysisEngine.getAnalysisStatistics();
        
        return {
            status: 'healthy',
            service: 'Advanced Chart Analysis API',
            version: '1.0.0',
            statistics: stats,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
