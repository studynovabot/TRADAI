/**
 * 🚀💡 ENHANCED ULTIMATE GEMINI VISION API ENDPOINT
 * 
 * This endpoint provides advanced trade signal analysis using the Enhanced Ultimate Gemini Vision Service
 * which combines Gemini AI analysis with the Advanced Analysis Layer.
 * 
 * Features:
 * - Advanced candle pattern recognition
 * - Price action intelligence
 * - Trend strength & reversal probability analysis
 * - Signal confidence scoring (0-100%)
 * - Bot trap avoidance
 * - Human-like reasoning
 * - Learning memory system
 * - Signal classification (Reversal/Continuation)
 * 
 * Uses ONLY 3 indicators: 2 EMAs, Stochastic Oscillator, and Bollinger Bands
 */

import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Import the Enhanced Ultimate Gemini Vision Service
const EnhancedUltimateGeminiVisionService = require('../../services/EnhancedUltimateGeminiVisionService');

// Initialize the service
let enhancedService = null;

async function initializeService() {
    if (!enhancedService) {
        console.log('🚀 Initializing Enhanced Ultimate Gemini Vision Service...');
        
        enhancedService = new EnhancedUltimateGeminiVisionService({
            // Configuration options
            temperature: 0.1,
            maxTokens: 8000,
            timeout: 90000,
            maxRetries: 3,
            
            // Enhanced features
            imagePreprocessing: true,
            ocrEnabled: true,
            patternDetection: true,
            advancedAnalysis: true,
            learningEnabled: true,
            minSignalScore: 70,
            
            // Debug mode (set to false in production)
            debugMode: process.env.NODE_ENV !== 'production'
        });

        const initResult = await enhancedService.initialize();
        if (!initResult.success) {
            throw new Error(`Failed to initialize Enhanced Ultimate Gemini Vision Service: ${initResult.error}`);
        }
        
        console.log('✅ Enhanced Ultimate Gemini Vision Service initialized successfully');
    }
    
    return enhancedService;
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST to upload chart image.',
            supportedMethods: ['POST'],
            endpoint: 'enhanced-ultimate-gemini-vision'
        });
    }

    const startTime = Date.now();
    let tempFilePath = null;

    try {
        console.log('🎯 Enhanced Ultimate Gemini Vision API request received');

        // Initialize service
        const service = await initializeService();

        // Parse form data
        const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB limit
            keepExtensions: true,
            multiples: false
        });

        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve([fields, files]);
            });
        });

        // Get the uploaded file
        const imageFile = files.image || files.file || files.chart;
        if (!imageFile) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided. Please upload a chart image.',
                expectedFields: ['image', 'file', 'chart'],
                maxFileSize: '10MB',
                supportedFormats: ['PNG', 'JPEG', 'JPG', 'WEBP']
            });
        }

        // Handle both single file and array
        const file = Array.isArray(imageFile) ? imageFile[0] : imageFile;
        tempFilePath = file.filepath;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: `Unsupported file type: ${file.mimetype}`,
                supportedTypes: allowedTypes,
                receivedType: file.mimetype
            });
        }

        console.log(`📁 Processing image: ${file.originalFilename} (${file.size} bytes, ${file.mimetype})`);

        // Read image buffer
        const imageBuffer = fs.readFileSync(tempFilePath);

        // Extract options from fields
        const options = {
            asset: fields.asset?.[0] || fields.asset || 'Unknown',
            timeframe: fields.timeframe?.[0] || fields.timeframe || '5m',
            autoCrop: fields.autoCrop !== 'false',
            enhancedAnalysis: fields.enhancedAnalysis !== 'false',
            learningEnabled: fields.learningEnabled !== 'false'
        };

        console.log('🔧 Analysis options:', options);

        // Perform enhanced ultimate analysis
        console.log('🧠 Starting enhanced ultimate chart analysis...');
        const analysisResult = await service.analyzeChartImage(imageBuffer, options);

        const totalProcessingTime = Date.now() - startTime;

        if (analysisResult.success) {
            const analysis = analysisResult.analysis;
            
            // Validate signal score threshold
            const signalScore = analysis.advancedAnalysis?.signal_score || analysis.signalConfidence;
            const meetsThreshold = signalScore >= service.config.minSignalScore;

            console.log(`✅ Enhanced ultimate analysis completed successfully`);
            console.log(`📊 Signal: ${analysis.signal} ${analysis.signalType || 'N/A'}`);
            console.log(`🎯 Confidence: ${analysis.overallConfidence}%`);
            console.log(`📈 Signal Score: ${signalScore}%`);
            console.log(`⏱️ Processing Time: ${totalProcessingTime}ms`);

            // Prepare response in the requested format
            const response = {
                success: true,
                
                // Main signal data in requested format
                direction: analysis.signal,
                signal_type: analysis.signalType || analysis.advancedAnalysis?.signal_type || 'Continuation',
                signal_score: signalScore,
                entry_window: analysis.advancedAnalysis?.entry_window || 'last_10s_of_candle',
                reasoning: analysis.enhancedReasoning || analysis.advancedAnalysis?.reasoning || 'Enhanced technical analysis completed',
                bot_trap_risk: analysis.advancedAnalysis?.bot_trap_risk || false,
                trade_confidence: analysis.advancedAnalysis?.trade_confidence || (signalScore >= 85 ? 'High' : signalScore >= 75 ? 'Medium' : 'Low'),
                
                // Signal validation
                meets_threshold: meetsThreshold,
                threshold_used: service.config.minSignalScore,
                
                // Detailed analysis breakdown
                analysis_breakdown: {
                    // Gemini analysis
                    gemini_analysis: {
                        asset: analysis.asset,
                        timeframe: analysis.timeframe,
                        market_condition: analysis.marketCondition,
                        volatility_state: analysis.volatilityState,
                        current_price: analysis.currentPrice,
                        trend_analysis: analysis.trendAnalysis,
                        trend_strength: analysis.trendStrength,
                        
                        // Enhanced Gemini analysis components
                        candlestick_analysis: analysis.enhancedCandlestickAnalysis,
                        bollinger_bands_analysis: analysis.bollingerBandsAnalysis,
                        ema_analysis: analysis.enhancedEMAAnalysis,
                        stochastic_analysis: analysis.enhancedStochasticAnalysis,
                        price_action_intelligence: analysis.priceActionIntelligence,
                        signal_confluence_analysis: analysis.signalConfluenceAnalysis,
                        risk_assessment: analysis.riskAssessment,
                        final_summary: analysis.finalSummary
                    },
                    
                    // Advanced analysis layer
                    advanced_analysis: analysis.advancedAnalysis || null,
                    
                    // Candle predictions
                    next_candle_predictions: analysis.nextCandlePredictions || []
                },
                
                // Performance metrics
                performance: {
                    total_processing_time: totalProcessingTime,
                    gemini_processing_time: analysisResult.metadata?.geminiProcessingTime || 0,
                    advanced_analysis_enabled: service.config.advancedAnalysis,
                    learning_enabled: service.config.learningEnabled,
                    confidence: analysisResult.confidence,
                    image_size: analysisResult.metadata?.imageSize || 0,
                    original_image_size: analysisResult.metadata?.originalImageSize || 0
                },
                
                // Service statistics
                statistics: service.getEnhancedStatistics(),
                
                // Metadata
                metadata: {
                    ...analysisResult.metadata,
                    api_version: '2.0.0-enhanced-ultimate',
                    endpoint: 'enhanced-ultimate-gemini-vision',
                    timestamp: new Date().toISOString(),
                    request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }
            };

            // Log successful analysis
            console.log(`🎉 Enhanced Ultimate Analysis Response Generated:`);
            console.log(`   Direction: ${response.direction}`);
            console.log(`   Signal Type: ${response.signal_type}`);
            console.log(`   Signal Score: ${response.signal_score}%`);
            console.log(`   Trade Confidence: ${response.trade_confidence}`);
            console.log(`   Bot Trap Risk: ${response.bot_trap_risk}`);
            console.log(`   Meets Threshold: ${response.meets_threshold}`);

            return res.status(200).json(response);

        } else {
            console.error('❌ Enhanced ultimate analysis failed:', analysisResult.error);
            
            return res.status(500).json({
                success: false,
                error: 'Enhanced ultimate analysis failed',
                details: analysisResult.error,
                processing_time: totalProcessingTime,
                metadata: {
                    api_version: '2.0.0-enhanced-ultimate',
                    endpoint: 'enhanced-ultimate-gemini-vision',
                    timestamp: new Date().toISOString(),
                    error_type: 'analysis_failure'
                }
            });
        }

    } catch (error) {
        const totalProcessingTime = Date.now() - startTime;
        console.error('❌ Enhanced Ultimate Gemini Vision API error:', error);

        return res.status(500).json({
            success: false,
            error: 'Internal server error during enhanced ultimate analysis',
            details: error.message,
            processing_time: totalProcessingTime,
            metadata: {
                api_version: '2.0.0-enhanced-ultimate',
                endpoint: 'enhanced-ultimate-gemini-vision',
                timestamp: new Date().toISOString(),
                error_type: 'server_error'
            }
        });

    } finally {
        // Clean up temporary file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
                console.log('🗑️ Temporary file cleaned up');
            } catch (cleanupError) {
                console.warn('⚠️ Failed to clean up temporary file:', cleanupError.message);
            }
        }
    }
}

/**
 * Health check endpoint for the Enhanced Ultimate Gemini Vision Service
 */
export async function healthCheck() {
    try {
        const service = await initializeService();
        const stats = service.getEnhancedStatistics();
        
        return {
            status: 'healthy',
            service: 'Enhanced Ultimate Gemini Vision',
            version: '2.0.0-enhanced-ultimate',
            features: {
                advanced_analysis: true,
                pattern_recognition: true,
                price_action_intelligence: true,
                bot_trap_avoidance: true,
                learning_memory: true,
                signal_classification: true
            },
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