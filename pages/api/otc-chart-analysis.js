/**
 * OTC Chart Screenshot Analysis API Endpoint
 * 
 * Handles chart screenshot uploads and generates trading signals
 * based on visual pattern recognition and technical analysis
 */

const { ChartScreenshotAnalyzer } = require('../../src/core/ChartScreenshotAnalyzer');
const { strictModeConfig } = require('../../src/config/strict-mode');

// Rate limiting
const requestTracker = new Map();

// Configuration
const CONFIG = {
    maxRequestsPerMinute: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['jpg', 'jpeg', 'png', 'bmp'],
    requiredFields: ['currencyPair', 'timeframe', 'tradeDuration']
};

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ 
            error: 'Method not allowed',
            message: 'Only POST requests are supported'
        });
        return;
    }

    const startTime = Date.now();
    const requestId = `CHART_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`\n🖼️ === CHART SCREENSHOT ANALYSIS REQUEST ===`);
    console.log(`🆔 Request ID: ${requestId}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    try {
        // Rate limiting check
        const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const rateLimitCheck = checkRateLimit(clientId);
        
        if (!rateLimitCheck.allowed) {
            console.log(`❌ Rate limit exceeded for client: ${clientId}`);
            
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'Too many chart analysis requests. Please wait before submitting another chart.',
                requestId,
                retryAfter: rateLimitCheck.resetTime || Date.now() + 60000
            });
        }

        // Extract request data
        const { 
            currencyPair, 
            timeframe, 
            tradeDuration, 
            imageData,
            platform = 'quotex'
        } = req.body;

        console.log(`📊 Chart Analysis Request:`);
        console.log(`   Currency Pair: ${currencyPair}`);
        console.log(`   Timeframe: ${timeframe}`);
        console.log(`   Trade Duration: ${tradeDuration} minutes`);
        console.log(`   Platform: ${platform}`);
        console.log(`   Has Image Data: ${!!imageData}`);

        // Validate required fields
        const missingFields = CONFIG.requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_REQUIRED_FIELDS',
                message: `Missing required fields: ${missingFields.join(', ')}`,
                requiredFields: CONFIG.requiredFields,
                requestId,
                processingTime: Date.now() - startTime
            });
        }

        // Validate currency pair
        const validPairs = ['USD/PKR', 'USD/DZD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
        if (!validPairs.includes(currencyPair)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_CURRENCY_PAIR',
                message: `Unsupported currency pair: ${currencyPair}`,
                supportedPairs: validPairs,
                requestId,
                processingTime: Date.now() - startTime
            });
        }

        // Validate timeframe
        const validTimeframes = ['1m', '3m', '5m', '15m', '30m'];
        if (!validTimeframes.includes(timeframe)) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_TIMEFRAME',
                message: `Unsupported timeframe: ${timeframe}`,
                supportedTimeframes: validTimeframes,
                requestId,
                processingTime: Date.now() - startTime
            });
        }

        // Validate image data is provided
        if (!imageData) {
            return res.status(400).json({
                success: false,
                error: 'MISSING_IMAGE_DATA',
                message: 'No chart screenshot provided. Please upload a screenshot of your broker trading platform.',
                requestId,
                processingTime: Date.now() - startTime,
                guidance: {
                    required: 'Screenshot from broker platform (QXBroker, Quotex, PocketOption, etc.)',
                    mustShow: ['Price charts with candlesticks', 'Currency pair name', 'Timeframe indicator'],
                    formats: ['PNG', 'JPEG', 'BMP'],
                    maxSize: '10MB'
                }
            });
        }

        // Validate image data format
        if (typeof imageData !== 'string' || !imageData.includes('base64')) {
            return res.status(400).json({
                success: false,
                error: 'INVALID_IMAGE_FORMAT',
                message: 'Invalid image data format. Please upload a valid image file.',
                requestId,
                processingTime: Date.now() - startTime
            });
        }

        // Initialize chart analyzer
        console.log('🔧 Initializing chart screenshot analyzer...');
        const analyzer = new ChartScreenshotAnalyzer({
            minConfidence: 75,
            maxFileSize: CONFIG.maxFileSize
        });

        // Analyze chart screenshot
        console.log('🖼️ Starting chart screenshot analysis...');
        const analysisResult = await analyzer.analyzeChartScreenshot(imageData, {
            currencyPair,
            timeframe,
            tradeDuration,
            platform,
            startTime
        });

        const processingTime = Date.now() - startTime;

        // Check if analysis was successful
        if (!analysisResult.success) {
            console.log(`❌ Chart analysis failed: ${analysisResult.message}`);
            
            return res.status(422).json({
                success: false,
                error: analysisResult.error || 'ANALYSIS_FAILED',
                message: analysisResult.message || 'Chart screenshot analysis failed',
                requestId,
                processingTime,
                strictMode: true
            });
        }

        // Validate strict mode compliance
        if (strictModeConfig.enabled && analysisResult.confidence < strictModeConfig.getConfig().minDataQuality * 100) {
            console.log(`❌ Signal failed strict mode validation: confidence ${analysisResult.confidence}% below threshold`);
            
            return res.status(422).json({
                success: false,
                requestId,
                processingTime,
                error: 'STRICT_MODE_VIOLATION',
                message: `STRICT_MODE_VIOLATION: Signal confidence ${analysisResult.confidence}% below minimum ${strictModeConfig.getConfig().minDataQuality * 100}%`,
                strictMode: true,
                currencyPair,
                timeframe,
                tradeDuration
            });
        }

        // Build successful response
        const response = {
            success: true,
            signal: analysisResult.signal,
            direction: analysisResult.signal,
            confidence: analysisResult.confidence,
            qualityGrade: analysisResult.qualityGrade,
            analysis: analysisResult.analysis,
            technicalIndicators: analysisResult.technicalIndicators,
            chartFeatures: analysisResult.chartFeatures,
            currencyPair,
            timeframe,
            tradeDuration,
            platform,
            requestId,
            processingTime,
            timestamp: new Date().toISOString(),
            strictMode: true,
            dataSource: 'screenshot_analysis',
            metadata: analysisResult.metadata
        };

        // Add risk assessment
        if (analysisResult.riskScore) {
            response.riskScore = analysisResult.riskScore;
        }

        console.log(`✅ Chart analysis completed successfully`);
        console.log(`🎯 Signal: ${analysisResult.signal}`);
        console.log(`📊 Confidence: ${analysisResult.confidence}%`);
        console.log(`⭐ Quality: ${analysisResult.qualityGrade}`);
        console.log(`⏱️ Processing Time: ${processingTime}ms`);

        // Update rate limiting
        updateRateLimit(clientId);

        res.status(200).json(response);

    } catch (error) {
        const processingTime = Date.now() - startTime;

        console.error(`\n❌ === CHART ANALYSIS REQUEST FAILED ===`);
        console.error(`🆔 Request ID: ${requestId}`);
        console.error(`❌ Error: ${error.message}`);
        console.error(`⏱️ Failed after: ${processingTime}ms`);

        // Provide specific error messages based on error type
        let errorCode = 'INTERNAL_SERVER_ERROR';
        let statusCode = 500;
        let userMessage = 'Chart screenshot analysis failed due to internal error';

        if (error.message.includes('No image data provided')) {
            errorCode = 'MISSING_IMAGE_DATA';
            statusCode = 400;
            userMessage = 'No chart screenshot provided. Please upload a screenshot of your broker trading platform showing price charts.';
        } else if (error.message.includes('Invalid image format')) {
            errorCode = 'INVALID_IMAGE_FORMAT';
            statusCode = 400;
            userMessage = 'Invalid image format. Please upload a PNG, JPEG, or BMP screenshot of your broker platform.';
        } else if (error.message.includes('Image file too large')) {
            errorCode = 'IMAGE_TOO_LARGE';
            statusCode = 400;
            userMessage = 'Image file is too large. Please upload a screenshot smaller than 10MB.';
        } else if (error.message.includes('does not appear to contain a valid broker')) {
            errorCode = 'INVALID_BROKER_SCREENSHOT';
            statusCode = 422;
            userMessage = 'Screenshot does not appear to be from a valid broker trading platform. Please upload a screenshot from QXBroker, Quotex, PocketOption, or similar platform showing price charts with candlesticks.';
        } else if (error.message.includes('Screenshot analysis failed')) {
            errorCode = 'SCREENSHOT_ANALYSIS_FAILED';
            statusCode = 422;
            userMessage = 'Unable to analyze the provided screenshot. Please ensure the image is clear and shows a broker trading platform with visible price charts and candlesticks.';
        } else if (error.message.includes('Real screenshot analysis failed')) {
            errorCode = 'OCR_ANALYSIS_FAILED';
            statusCode = 422;
            userMessage = 'Failed to extract market data from screenshot. Please ensure the screenshot clearly shows price charts with visible numbers and candlesticks from a broker platform.';
        }

        res.status(statusCode).json({
            success: false,
            error: errorCode,
            message: userMessage,
            technicalDetails: error.message,
            requestId,
            processingTime,
            timestamp: new Date().toISOString(),
            guidance: {
                validScreenshots: [
                    'Screenshots from QXBroker, Quotex, PocketOption, IQ Option',
                    'Must show price charts with candlesticks',
                    'Currency pair should be visible (e.g., USD/EUR, GBP/USD)',
                    'Chart timeframe should be visible (e.g., 1m, 5m, 15m)',
                    'Image should be clear and not blurry'
                ],
                supportedFormats: ['PNG', 'JPEG', 'BMP'],
                maxFileSize: '10MB'
            }
        });
    }
}

/**
 * Rate limiting functions
 */
function checkRateLimit(clientId) {
    const now = Date.now();
    const clientRequests = requestTracker.get(clientId) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = clientRequests.filter(time => now - time < 60000);
    
    if (recentRequests.length >= CONFIG.maxRequestsPerMinute) {
        return {
            allowed: false,
            resetTime: Math.min(...recentRequests) + 60000
        };
    }
    
    return { allowed: true };
}

function updateRateLimit(clientId) {
    const now = Date.now();
    const clientRequests = requestTracker.get(clientId) || [];
    
    // Add current request and clean old ones
    clientRequests.push(now);
    const recentRequests = clientRequests.filter(time => now - time < 60000);
    
    requestTracker.set(clientId, recentRequests);
}

// Export configuration for testing
export { CONFIG };
