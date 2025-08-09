/**
 * 🎯 DETERMINISTIC GEMINI ANALYSIS API ENDPOINT (BASE64)
 * 
 * Ultra-refined endpoint for deterministic trading signal analysis using base64 image data.
 * Analyzes the most recent CLOSED candle with structured JSON output.
 * 
 * Features:
 * - Accepts base64 encoded images in JSON payload
 * - Closed candle rule enforcement
 * - Deterministic structured outputs (temperature 0.0-0.2)
 * - Timestamp validation and alignment
 * - Reduced false signals for 1m/3m/5m scalping
 * - Performance monitoring and logging
 */

import { NextApiRequest, NextApiResponse } from 'next';

const DeterministicGeminiVisionService = require('../../services/DeterministicGeminiVisionService');

// Initialize service instance
let deterministicService = null;

async function initializeService() {
    if (!deterministicService) {
        console.log('🎯 Initializing Deterministic Gemini Vision Service (Base64)...');
        
        deterministicService = new DeterministicGeminiVisionService({
            // Deterministic configuration
            temperature: 0.1,
            maxTokens: 512,
            timeout: 30000,
            maxRetries: 3,
            
            // Performance thresholds
            latencyThresholdMs: 3000,
            confidenceReductionOnLatency: 30,
            
            // Scalping configuration
            scalingTimeframes: ['1m', '3m', '5m'],
            minConfidenceForScalping: 75,
            
            // Image processing
            imagePreprocessing: true,
            standardWidth: 1280,
            
            // Debug mode
            debugMode: process.env.NODE_ENV !== 'production'
        });

        const initResult = await deterministicService.initialize();
        if (!initResult.success) {
            throw new Error(`Failed to initialize service: ${initResult.error}`);
        }
        
        console.log('✅ Deterministic Gemini Vision Service (Base64) initialized');
    }
    
    return deterministicService;
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
            error: 'Method not allowed. Use POST with JSON payload containing base64 image.',
            supportedMethods: ['POST'],
            endpoint: 'analyze-base64'
        });
    }

    const startTime = Date.now();

    try {
        console.log('🎯 Deterministic analysis request received (Base64)');

        // Initialize service
        const service = await initializeService();

        // Parse JSON payload
        const { image, metadata } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'No base64 image provided in request body.',
                expectedFormat: {
                    image: 'base64 string (with or without data:image/... prefix)',
                    metadata: {
                        pair: 'USD/XXX',
                        timeframe: '1m',
                        screenshot_timestamp_iso: 'ISO8601 string',
                        platform_time_to_close_secs: 'number (optional)',
                        indicator_color_map: 'object (optional)'
                    }
                }
            });
        }

        if (!metadata) {
            return res.status(400).json({
                success: false,
                error: 'No metadata provided in request body.',
                requiredMetadata: {
                    pair: 'Trading pair (e.g., USD/EUR)',
                    timeframe: 'Chart timeframe (e.g., 1m, 3m, 5m)',
                    screenshot_timestamp_iso: 'ISO8601 timestamp when screenshot was taken',
                    platform_time_to_close_secs: 'Optional: seconds until candle close',
                    indicator_color_map: 'Optional: color mapping for indicators'
                }
            });
        }

        // Clean and validate base64 image
        let base64Data = image;
        if (base64Data.startsWith('data:image/')) {
            base64Data = base64Data.split(',')[1];
        }

        let imageBuffer;
        try {
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid base64 image data.',
                details: error.message
            });
        }

        // Validate image buffer
        if (imageBuffer.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Empty image buffer after base64 decoding.'
            });
        }

        console.log(`📁 Processing base64 image: ${imageBuffer.length} bytes`);

        // Prepare metadata with defaults
        const analysisMetadata = {
            pair: metadata.pair || 'USD/XXX',
            timeframe: metadata.timeframe || '1m',
            screenshot_timestamp_iso: metadata.screenshot_timestamp_iso || new Date().toISOString(),
            platform_time_to_close_secs: metadata.platform_time_to_close_secs,
            indicator_color_map: metadata.indicator_color_map || null
        };

        // Convert platform_time_to_close_secs to number if provided
        if (analysisMetadata.platform_time_to_close_secs !== undefined) {
            analysisMetadata.platform_time_to_close_secs = parseFloat(analysisMetadata.platform_time_to_close_secs);
        }

        console.log('🔧 Analysis metadata:', analysisMetadata);

        // Perform deterministic analysis
        console.log('🧠 Starting deterministic chart analysis...');
        const analysisResult = await service.analyzeChartImage(imageBuffer, analysisMetadata);

        const totalProcessingTime = Date.now() - startTime;

        if (analysisResult.success) {
            const analysis = analysisResult.analysis;
            
            console.log(`✅ Deterministic analysis completed successfully`);
            console.log(`📊 Signal: ${analysis.signal}`);
            console.log(`🎯 Confidence: ${analysis.confidence}%`);
            console.log(`⏱️ Processing Time: ${totalProcessingTime}ms`);

            // Return the exact schema as specified
            const response = {
                pair: analysis.pair,
                timeframe: analysis.timeframe,
                analyzed_candle_timestamp: analysis.analyzed_candle_timestamp,
                screenshot_timestamp: analysis.screenshot_timestamp,
                pipeline_latency_ms: analysis.pipeline_latency_ms,
                ohlc: analysis.ohlc || {
                    open: 0,
                    high: 0,
                    low: 0,
                    close: 0
                },
                indicators: analysis.indicators || {
                    EMA5: 0,
                    EMA20: 0,
                    Bollinger_mid: 0,
                    Bollinger_upper: 0,
                    Bollinger_lower: 0,
                    Stochastic_K: 0,
                    Stochastic_D: 0
                },
                signal: analysis.signal,
                confidence: analysis.confidence,
                factor_scores: analysis.factor_scores || [
                    {factor: "EMA_crossover", score: 0, explanation: "Unable to determine"},
                    {factor: "Bollinger_position", score: 0, explanation: "Unable to determine"},
                    {factor: "Stochastic", score: 0, explanation: "Unable to determine"},
                    {factor: "Candle_body_wick", score: 0, explanation: "Unable to determine"},
                    {factor: "Volume_or_activity", score: 0, explanation: "Unable to determine"}
                ],
                next_3_candles: analysis.next_3_candles || [
                    {candle_index: 1, direction: "NEUTRAL", probability: 50, reason: "Insufficient data"},
                    {candle_index: 2, direction: "NEUTRAL", probability: 50, reason: "Insufficient data"},
                    {candle_index: 3, direction: "NEUTRAL", probability: 50, reason: "Insufficient data"}
                ],
                support_levels: analysis.support_levels || [],
                resistance_levels: analysis.resistance_levels || [],
                raw_ocr: analysis.raw_ocr || {
                    time_axis_reading: "",
                    numeric_price_reading: ""
                },
                notes: analysis.notes || ""
            };

            // Log performance metrics
            const metrics = service.getPerformanceMetrics();
            console.log(`📊 Performance Metrics:`, {
                totalRequests: metrics.totalRequests,
                averageLatency: Math.round(metrics.averageLatency),
                latencyExceeded: metrics.latencyExceededCount,
                signalDistribution: metrics.signalCounts
            });

            return res.status(200).json(response);

        } else {
            console.error('❌ Deterministic analysis failed:', analysisResult.error);
            
            // Return error response in the same schema format
            return res.status(500).json({
                pair: analysisMetadata.pair,
                timeframe: analysisMetadata.timeframe,
                analyzed_candle_timestamp: analysisMetadata.screenshot_timestamp_iso,
                screenshot_timestamp: analysisMetadata.screenshot_timestamp_iso,
                pipeline_latency_ms: totalProcessingTime,
                ohlc: { open: 0, high: 0, low: 0, close: 0 },
                indicators: {
                    EMA5: 0, EMA20: 0, Bollinger_mid: 0,
                    Bollinger_upper: 0, Bollinger_lower: 0,
                    Stochastic_K: 0, Stochastic_D: 0
                },
                signal: "HOLD",
                confidence: 0,
                factor_scores: [
                    {factor: "EMA_crossover", score: 0, explanation: "Analysis failed"},
                    {factor: "Bollinger_position", score: 0, explanation: "Analysis failed"},
                    {factor: "Stochastic", score: 0, explanation: "Analysis failed"},
                    {factor: "Candle_body_wick", score: 0, explanation: "Analysis failed"},
                    {factor: "Volume_or_activity", score: 0, explanation: "Analysis failed"}
                ],
                next_3_candles: [
                    {candle_index: 1, direction: "NEUTRAL", probability: 50, reason: "Analysis failed"},
                    {candle_index: 2, direction: "NEUTRAL", probability: 50, reason: "Analysis failed"},
                    {candle_index: 3, direction: "NEUTRAL", probability: 50, reason: "Analysis failed"}
                ],
                support_levels: [],
                resistance_levels: [],
                raw_ocr: { time_axis_reading: "", numeric_price_reading: "" },
                notes: `Analysis failed: ${analysisResult.error}`
            });
        }

    } catch (error) {
        const totalProcessingTime = Date.now() - startTime;
        console.error('❌ Deterministic Analysis API error (Base64):', error);

        return res.status(500).json({
            pair: "USD/XXX",
            timeframe: "1m",
            analyzed_candle_timestamp: new Date().toISOString(),
            screenshot_timestamp: new Date().toISOString(),
            pipeline_latency_ms: totalProcessingTime,
            ohlc: { open: 0, high: 0, low: 0, close: 0 },
            indicators: {
                EMA5: 0, EMA20: 0, Bollinger_mid: 0,
                Bollinger_upper: 0, Bollinger_lower: 0,
                Stochastic_K: 0, Stochastic_D: 0
            },
            signal: "HOLD",
            confidence: 0,
            factor_scores: [
                {factor: "EMA_crossover", score: 0, explanation: "Server error"},
                {factor: "Bollinger_position", score: 0, explanation: "Server error"},
                {factor: "Stochastic", score: 0, explanation: "Server error"},
                {factor: "Candle_body_wick", score: 0, explanation: "Server error"},
                {factor: "Volume_or_activity", score: 0, explanation: "Server error"}
            ],
            next_3_candles: [
                {candle_index: 1, direction: "NEUTRAL", probability: 50, reason: "Server error"},
                {candle_index: 2, direction: "NEUTRAL", probability: 50, reason: "Server error"},
                {candle_index: 3, direction: "NEUTRAL", probability: 50, reason: "Server error"}
            ],
            support_levels: [],
            resistance_levels: [],
            raw_ocr: { time_axis_reading: "", numeric_price_reading: "" },
            notes: `Server error: ${error.message}`
        });
    }
}

/**
 * Health check for the deterministic service (Base64)
 */
export async function healthCheck() {
    try {
        const service = await initializeService();
        const metrics = service.getPerformanceMetrics();
        
        return {
            status: 'healthy',
            service: 'Deterministic Gemini Vision (Base64)',
            version: '1.0.0-deterministic-base64',
            features: {
                base64_input: true,
                closed_candle_rule: true,
                deterministic_output: true,
                timestamp_validation: true,
                scalping_optimized: true,
                performance_monitoring: true
            },
            performance_metrics: metrics,
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