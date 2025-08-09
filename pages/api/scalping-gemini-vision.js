/**
 * 🔥⚡ ULTRA-REFINED SCALPING GEMINI VISION API ENDPOINT
 * 
 * Specialized endpoint for extreme precision scalping on 1m, 3m, and 5m charts
 * Focuses on latest candle precision with 70% weight on most recent price action
 * 
 * Features:
 * - Latest candle priority analysis (70% weight)
 * - Multi-timeframe micro-alignment
 * - Real-time momentum detection
 * - Instant scalping signals (BUY/SELL only, no HOLD)
 * - Next 3 candle predictions with high accuracy
 * - Ultra-fast processing optimized for scalping
 * 
 * Supported Timeframes: 1m, 3m, 5m only
 * Minimum Confidence: 75% (scalping threshold)
 */

const formidable = require('formidable');
const fs = require('fs');

// Disable body parser for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

// Import the Scalping Gemini Vision Service
const ScalpingGeminiVisionService = require('../../services/ScalpingGeminiVisionService');

// Initialize the service
let scalpingService = null;

async function initializeService() {
    if (!scalpingService) {
        console.log('🚀 Initializing Ultra-Refined Scalping Gemini Vision Service...');
        
        scalpingService = new ScalpingGeminiVisionService({
            // Scalping-optimized configuration
            temperature: 0.05,        // Lower temperature for consistency
            maxTokens: 6000,          // Optimized for scalping responses
            timeout: 60000,           // Faster timeout for scalping
            maxRetries: 2,            // Fewer retries for speed
            
            // Scalping features
            imagePreprocessing: true,
            minConfidence: 75,        // Higher minimum confidence for scalping
            allowedTimeframes: ['1m', '3m', '5m'],
            
            // Debug mode (set to false in production)
            debugMode: process.env.NODE_ENV !== 'production'
        });

        const initResult = await scalpingService.initialize();
        if (!initResult.success) {
            throw new Error(`Failed to initialize Scalping Gemini Vision Service: ${initResult.error}`);
        }
        
        console.log('✅ Ultra-Refined Scalping Gemini Vision Service initialized successfully');
    }
    
    return scalpingService;
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
            endpoint: 'scalping-gemini-vision',
            supportedTimeframes: ['1m', '3m', '5m']
        });
    }

    const startTime = Date.now();
    let tempFilePath = null;

    try {
        console.log('🎯 Ultra-Refined Scalping Gemini Vision API request received');

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
                supportedFormats: ['PNG', 'JPEG', 'JPG', 'WEBP'],
                supportedTimeframes: ['1m', '3m', '5m']
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

        console.log(`📁 Processing scalping chart: ${file.originalFilename} (${file.size} bytes, ${file.mimetype})`);

        // Read image buffer
        const imageBuffer = fs.readFileSync(tempFilePath);

        // Extract options from fields
        const options = {
            asset: fields.asset?.[0] || fields.asset || 'Unknown',
            timeframe: fields.timeframe?.[0] || fields.timeframe || '5m',
            autoCrop: fields.autoCrop !== 'false'
        };

        // Validate timeframe for scalping
        const allowedTimeframes = ['1m', '3m', '5m'];
        if (!allowedTimeframes.includes(options.timeframe)) {
            return res.status(400).json({
                success: false,
                error: `Timeframe ${options.timeframe} not supported for scalping`,
                supportedTimeframes: allowedTimeframes,
                receivedTimeframe: options.timeframe
            });
        }

        console.log('🔧 Scalping analysis options:', options);

        // Perform ultra-refined scalping analysis
        console.log(`🧠 Starting ultra-refined scalping analysis for ${options.timeframe}...`);
        const analysisResult = await service.analyzeChartImage(imageBuffer, options);

        const totalProcessingTime = Date.now() - startTime;

        if (analysisResult.success) {
            const analysis = analysisResult.analysis;
            
            console.log(`✅ Scalping analysis completed successfully`);
            console.log(`📊 Signal: ${analysis.signal} (${analysis.confidence}%)`);
            console.log(`⚡ Timeframe: ${options.timeframe}`);
            console.log(`⏱️ Processing Time: ${totalProcessingTime}ms`);

            // Prepare scalping-optimized response
            const response = {
                success: true,
                
                // Main scalping signal data
                direction: analysis.signal,
                confidence: analysis.confidence,
                timeframe: options.timeframe,
                asset: analysis.asset,
                
                // Scalping-specific metadata
                scalping_metadata: analysis.scalpingMetadata,
                
                // Latest candle analysis (70% weight)
                latest_candle_analysis: {
                    weight_percentage: 70,
                    candle_type: analysis.latestCandleAnalysis?.candleType,
                    body_size: analysis.latestCandleAnalysis?.bodySize,
                    wick_analysis: analysis.latestCandleAnalysis?.wickAnalysis,
                    momentum_direction: analysis.latestCandleAnalysis?.momentumDirection,
                    volume_assessment: analysis.latestCandleAnalysis?.volumeAssessment
                },
                
                // Indicator analysis with weights
                indicator_analysis: {
                    ema_analysis: {
                        weight_percentage: 30,
                        ema5_position: analysis.emaAnalysis?.ema5Position,
                        ema20_position: analysis.emaAnalysis?.ema20Position,
                        trend: analysis.emaAnalysis?.emaTrend,
                        slope: analysis.emaAnalysis?.emaSlope,
                        momentum: analysis.emaAnalysis?.emaMomentum
                    },
                    bollinger_analysis: {
                        weight_percentage: 20,
                        current_position: analysis.bollingerAnalysis?.currentPosition,
                        band_state: analysis.bollingerAnalysis?.bandState,
                        breakout_status: analysis.bollingerAnalysis?.breakoutStatus,
                        band_slope: analysis.bollingerAnalysis?.bandSlope
                    },
                    stochastic_analysis: {
                        weight_percentage: 10,
                        current_zone: analysis.stochasticAnalysis?.currentZone,
                        cross_status: analysis.stochasticAnalysis?.crossStatus,
                        momentum: analysis.stochasticAnalysis?.momentum
                    }
                },
                
                // Multi-timeframe alignment
                multi_timeframe_check: analysis.multiTimeframeCheck,
                
                // Next 3 candle predictions (scalping focus)
                next_candle_predictions: analysis.nextCandlePredictions?.map(pred => ({
                    candle_number: pred.candle,
                    direction: pred.direction,
                    confidence: pred.confidence,
                    reasoning: pred.reasoning
                })) || [],
                
                // Final scalping signal
                final_signal: {
                    signal: analysis.finalSignal?.signal || analysis.signal,
                    confidence: analysis.finalSignal?.confidence || analysis.confidence,
                    entry_timing: analysis.finalSignal?.entryTiming,
                    primary_factor: analysis.finalSignal?.primaryFactor,
                    risk_level: analysis.finalSignal?.riskLevel
                },
                
                // Performance metrics
                performance: {
                    total_processing_time: totalProcessingTime,
                    gemini_processing_time: analysisResult.metadata?.geminiProcessingTime || 0,
                    image_size: analysisResult.metadata?.imageSize || 0,
                    original_image_size: analysisResult.metadata?.originalImageSize || 0,
                    scalping_optimized: true,
                    latest_candle_priority: true
                },
                
                // Service statistics
                statistics: service.getScalpingStatistics(),
                
                // Metadata
                metadata: {
                    ...analysisResult.metadata,
                    api_version: '1.0.0-scalping',
                    endpoint: 'scalping-gemini-vision',
                    timestamp: new Date().toISOString(),
                    request_id: `scalp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    analysis_weights: {
                        latest_candle: '70%',
                        previous_candles: '20%',
                        historical_data: '10%'
                    },
                    indicator_weights: {
                        candle_momentum: '40%',
                        ema_trend: '30%',
                        bollinger_position: '20%',
                        stochastic_confirm: '10%'
                    }
                }
            };

            // Log successful scalping analysis
            console.log(`🎉 Ultra-Refined Scalping Analysis Response Generated:`);
            console.log(`   Direction: ${response.direction}`);
            console.log(`   Confidence: ${response.confidence}%`);
            console.log(`   Timeframe: ${response.timeframe}`);
            console.log(`   Risk Level: ${response.final_signal.risk_level}`);
            console.log(`   Entry Timing: ${response.final_signal.entry_timing}`);
            console.log(`   Processing Time: ${totalProcessingTime}ms`);

            return res.status(200).json(response);

        } else {
            console.error('❌ Scalping analysis failed:', analysisResult.error);
            
            return res.status(500).json({
                success: false,
                error: 'Ultra-refined scalping analysis failed',
                details: analysisResult.error,
                processing_time: totalProcessingTime,
                metadata: {
                    api_version: '1.0.0-scalping',
                    endpoint: 'scalping-gemini-vision',
                    timestamp: new Date().toISOString(),
                    error_type: 'analysis_failure'
                }
            });
        }

    } catch (error) {
        const totalProcessingTime = Date.now() - startTime;
        console.error('❌ Ultra-Refined Scalping Gemini Vision API error:', error);

        return res.status(500).json({
            success: false,
            error: 'Internal server error during ultra-refined scalping analysis',
            details: error.message,
            processing_time: totalProcessingTime,
            metadata: {
                api_version: '1.0.0-scalping',
                endpoint: 'scalping-gemini-vision',
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
 * Health check endpoint for the Scalping Gemini Vision Service
 */
export async function healthCheck() {
    try {
        const service = await initializeService();
        const stats = service.getScalpingStatistics();
        
        return {
            status: 'healthy',
            service: 'Ultra-Refined Scalping Gemini Vision',
            version: '1.0.0-scalping',
            features: {
                latest_candle_priority: true,
                multi_timeframe_alignment: true,
                real_time_momentum: true,
                instant_signals: true,
                no_hold_signals: true,
                ultra_fast_processing: true
            },
            supported_timeframes: ['1m', '3m', '5m'],
            analysis_weights: {
                latest_candle: '70%',
                previous_candles: '20%',
                historical_data: '10%'
            },
            indicator_weights: {
                candle_momentum: '40%',
                ema_trend: '30%',
                bollinger_position: '20%',
                stochastic_confirm: '10%'
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