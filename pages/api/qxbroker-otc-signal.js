/**
 * QXBroker OTC Signal Generator API Endpoint
 * 
 * Specialized API endpoint for generating OTC signals using QXBroker
 * with multi-timeframe analysis, OCR, and pattern matching
 */

const { QXBrokerOTCSignalGenerator } = require('../../src/core/QXBrokerOTCSignalGenerator');
const fs = require('fs-extra');
const path = require('path');

// Global signal generator instance (singleton pattern)
let globalSignalGenerator = null;
let initializationPromise = null;

// Configuration
const CONFIG = {
    // Default settings
    defaultAsset: 'GBP/USD',
    defaultTimeframes: ['1H', '30M', '15M', '5M', '3M', '1M'],
    
    // Rate limiting
    maxRequestsPerMinute: 5,
    requestCooldown: 30000, // 30 seconds between requests
    
    // Timeouts
    maxProcessingTime: 180000, // 3 minutes
    initializationTimeout: 60000 // 1 minute
};

// Request tracking for rate limiting
const requestTracker = new Map();

/**
 * Initialize signal generator if not already initialized
 */
async function ensureSignalGeneratorInitialized() {
    if (globalSignalGenerator && globalSignalGenerator.isInitialized) {
        return globalSignalGenerator;
    }

    if (initializationPromise) {
        return await initializationPromise;
    }

    initializationPromise = initializeSignalGenerator();
    return await initializationPromise;
}

/**
 * Initialize the QXBroker OTC signal generator
 */
async function initializeSignalGenerator() {
    try {
        console.log('🚀 Initializing QXBroker OTC Signal Generator...');
        
        // Load credentials from environment variables
        const qxBrokerEmail = process.env.QXBROKER_EMAIL;
        const qxBrokerPassword = process.env.QXBROKER_PASSWORD;
        
        if (!qxBrokerEmail || !qxBrokerPassword) {
            console.warn('⚠️ QXBroker credentials not found in environment variables');
        }
        
        globalSignalGenerator = new QXBrokerOTCSignalGenerator({
            qxBrokerEmail,
            qxBrokerPassword,
            headless: process.env.NODE_ENV === 'production',
            minConfidence: 75,
            maxProcessingTime: CONFIG.maxProcessingTime
        });

        await globalSignalGenerator.initialize();

        console.log('✅ QXBroker OTC Signal Generator initialized');
        return globalSignalGenerator;

    } catch (error) {
        console.error(`❌ Signal Generator initialization failed: ${error.message}`);
        globalSignalGenerator = null;
        initializationPromise = null;
        throw error;
    }
}

/**
 * Rate limiting check
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

    // Check cooldown
    if (recentRequests.length > 0) {
        const lastRequest = Math.max(...recentRequests);
        if (now - lastRequest < CONFIG.requestCooldown) {
            return {
                allowed: false,
                cooldownRemaining: CONFIG.requestCooldown - (now - lastRequest)
            };
        }
    }

    // Add current request
    recentRequests.push(now);
    requestTracker.set(clientId, recentRequests);

    return { allowed: true };
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const startTime = Date.now();
    const requestId = `API_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
        console.log(`\n🌐 === QXBROKER OTC SIGNAL API REQUEST ===`);
        console.log(`🆔 Request ID: ${requestId}`);
        console.log(`🔗 Method: ${req.method}`);
        console.log(`🕐 Time: ${new Date().toISOString()}`);

        // Only allow POST requests for signal generation
        if (req.method !== 'POST') {
            return res.status(405).json({
                error: 'Method not allowed',
                message: 'Only POST requests are supported',
                requestId
            });
        }

        // Extract parameters
        const {
            asset = CONFIG.defaultAsset,
            timeframes = CONFIG.defaultTimeframes,
            tradeDuration = '5 minutes'
        } = req.body;

        console.log(`💱 Asset: ${asset}`);
        console.log(`⏱️ Timeframes: ${timeframes.join(', ')}`);
        console.log(`⏰ Trade Duration: ${tradeDuration}`);

        // Validate required parameters
        if (!asset) {
            return res.status(400).json({
                error: 'Missing required parameter',
                message: 'asset is required',
                requestId
            });
        }

        // Rate limiting
        const clientId = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        const rateLimitCheck = checkRateLimit(clientId);
        
        if (!rateLimitCheck.allowed) {
            console.log(`⚠️ Rate limit exceeded for client: ${clientId}`);
            
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: rateLimitCheck.resetTime 
                    ? `Too many requests. Try again after ${new Date(rateLimitCheck.resetTime).toISOString()}`
                    : `Request too soon. Wait ${Math.ceil(rateLimitCheck.cooldownRemaining / 1000)} seconds`,
                requestId,
                retryAfter: rateLimitCheck.resetTime || Date.now() + rateLimitCheck.cooldownRemaining
            });
        }

        // Initialize signal generator
        console.log('🔧 Ensuring signal generator is initialized...');
        const signalGenerator = await ensureSignalGeneratorInitialized();

        // Generate signal
        console.log('🎯 Generating QXBroker OTC signal...');
        
        const signal = await signalGenerator.generateOTCSignal(asset, {
            timeframes,
            tradeDuration
        });

        const processingTime = Date.now() - startTime;

        // Log completion
        console.log(`✅ === API REQUEST COMPLETED ===`);
        console.log(`🆔 Request ID: ${requestId}`);
        console.log(`🎯 Signal: ${signal.signal}`);
        console.log(`📊 Confidence: ${signal.confidence}`);
        console.log(`⏱️ Processing Time: ${processingTime}ms`);

        // Return successful response
        return res.status(200).json({
            success: true,
            requestId,
            processingTime,
            ...signal
        });

    } catch (error) {
        const processingTime = Date.now() - startTime;
        
        console.error(`\n❌ === API REQUEST FAILED ===`);
        console.error(`🆔 Request ID: ${requestId}`);
        console.error(`❌ Error: ${error.message}`);
        console.error(`⏱️ Failed after: ${processingTime}ms`);

        // Log error details
        await logError(error, req, requestId);

        // Return error response
        return res.status(500).json({
            success: false,
            error: 'Signal generation failed',
            message: error.message,
            requestId,
            processingTime,
            signal: 'ERROR',
            confidence: '0%',
            riskScore: 'HIGH'
        });
    }
}

/**
 * Health check endpoint
 */
export async function healthCheck(req, res) {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            signalGenerator: null
        };

        if (globalSignalGenerator) {
            health.signalGenerator = globalSignalGenerator.getHealthStatus();
        } else {
            health.status = 'initializing';
            health.signalGenerator = { status: 'not_initialized' };
        }

        return res.status(200).json(health);

    } catch (error) {
        return res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Log error details for debugging
 */
async function logError(error, req, requestId) {
    try {
        const errorLogDir = path.join(process.cwd(), 'data', 'error-logs');
        await fs.ensureDir(errorLogDir);
        
        const errorLog = {
            requestId,
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack
            },
            request: {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body
            }
        };
        
        const errorLogPath = path.join(errorLogDir, `error_${requestId}.json`);
        await fs.writeJson(errorLogPath, errorLog, { spaces: 2 });
        
        console.log(`📝 Error log saved to ${errorLogPath}`);
    } catch (logError) {
        console.error('Failed to log error:', logError);
    }
}