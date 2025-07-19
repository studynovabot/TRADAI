/**
 * OTC Signal Generator API Endpoint
 * 
 * Main API endpoint for the comprehensive OTC trading signal generator
 * Implements the complete workflow as specified in the ultra-detailed prompt
 */

// Use serverless-compatible version for Vercel deployment
const { ServerlessOTCSignalGenerator } = require('../../src/core/ServerlessOTCSignalGenerator');
const fs = require('fs-extra');
const path = require('path');

// Global signal generator instance (singleton pattern)
let globalSignalGenerator = null;
let initializationPromise = null;

// Configuration
const CONFIG = {
    // Default platform URLs
    platforms: {
        quotex: 'https://qxbroker.com/en/demo-trade',
        pocketOption: 'https://po.trade/cabinet/demo-high-low'
    },
    
    // Default settings
    defaultTimeframe: '5M',
    defaultTradeDuration: '3 minutes',
    
    // Rate limiting
    maxRequestsPerMinute: 10,
    requestCooldown: 6000, // 6 seconds between requests
    
    // Timeouts
    maxProcessingTime: 120000, // 2 minutes
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
 * Initialize the serverless signal generator
 */
async function initializeSignalGenerator() {
    try {
        console.log('🚀 Initializing Serverless OTC Signal Generator...');
        
        globalSignalGenerator = new ServerlessOTCSignalGenerator({
            minConfidence: 75,
            maxProcessingTime: CONFIG.maxProcessingTime,
            serverlessMode: true
        });

        await globalSignalGenerator.initialize();

        console.log('✅ Serverless Signal Generator initialized');
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
async function handler(req, res) {
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
        console.log(`\n🌐 === OTC SIGNAL API REQUEST ===`);
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
            currencyPair,
            timeframe = CONFIG.defaultTimeframe,
            tradeDuration = CONFIG.defaultTradeDuration,
            platform = 'quotex'
        } = req.body;

        console.log(`💱 Currency Pair: ${currencyPair}`);
        console.log(`⏱️ Timeframe: ${timeframe}`);
        console.log(`⏰ Trade Duration: ${tradeDuration}`);
        console.log(`🏢 Platform: ${platform}`);

        // Validate required parameters
        if (!currencyPair) {
            return res.status(400).json({
                error: 'Missing required parameter',
                message: 'currencyPair is required',
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
        console.log('🎯 Generating OTC signal...');
        const signal = await signalGenerator.generateSignal({
            currencyPair,
            timeframe,
            tradeDuration,
            platform
        });

        const processingTime = Date.now() - startTime;

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
            orchestrator: null
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
 * Statistics endpoint
 */
export async function getStats(req, res) {
    try {
        const stats = {
            timestamp: new Date().toISOString(),
            orchestrator: null,
            api: {
                totalRequests: requestTracker.size,
                activeClients: requestTracker.size
            }
        };

        if (globalSignalGenerator) {
            stats.signalGenerator = globalSignalGenerator.getHealthStatus();
        }

        return res.status(200).json(stats);

    } catch (error) {
        return res.status(500).json({
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Restart orchestrator endpoint
 */
export async function restart(req, res) {
    try {
        console.log('🔄 Restarting OTC Signal Orchestrator...');
        
        if (globalSignalGenerator) {
            await globalSignalGenerator.cleanup();
        }
        
        globalSignalGenerator = null;
        initializationPromise = null;
        
        await ensureSignalGeneratorInitialized();
        
        console.log('✅ Orchestrator restarted successfully');
        
        return res.status(200).json({
            success: true,
            message: 'Orchestrator restarted successfully',
            platform,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`❌ Restart failed: ${error.message}`);
        
        return res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

/**
 * Log error to file
 */
async function logError(error, req, requestId) {
    try {
        const errorLog = {
            requestId,
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name
            },
            request: {
                method: req.method,
                body: req.body,
                headers: {
                    'user-agent': req.headers['user-agent'],
                    'x-forwarded-for': req.headers['x-forwarded-for']
                }
            }
        };

        const logDir = path.join(process.cwd(), 'logs', 'api');
        await fs.ensureDir(logDir);
        
        const logFile = path.join(logDir, `errors_${new Date().toISOString().split('T')[0]}.json`);
        
        let logs = [];
        if (await fs.pathExists(logFile)) {
            logs = await fs.readJson(logFile);
        }
        
        logs.push(errorLog);
        await fs.writeJson(logFile, logs, { spaces: 2 });

    } catch (logError) {
        console.error('Failed to log error:', logError.message);
    }
}

/**
 * Cleanup on process exit
 */
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, cleaning up...');
    if (globalSignalGenerator) {
        await globalSignalGenerator.cleanup();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, cleaning up...');
    if (globalSignalGenerator) {
        await globalSignalGenerator.cleanup();
    }
    process.exit(0);
});

// Export as ES6 default for Next.js
export default handler;