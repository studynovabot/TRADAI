/**
 * OTC Signal Generator API Endpoint
 * 
 * Main API endpoint for the comprehensive OTC trading signal generator
 * Implements the complete workflow as specified in the ultra-detailed prompt
 */

// Use new serverless-compatible version for Vercel deployment
const { ServerlessOTCGenerator } = require('../../src/core/ServerlessOTCGenerator');
const { strictModeConfig } = require('../../src/config/strict-mode');

// Create a simple data quality validator for strict mode
class DataQualityValidator {
    validateSignalData(signal) {
        const errors = [];

        if (!signal.metadata || !signal.metadata.dataSource) {
            errors.push('Signal missing data source metadata');
        }

        if (!signal.confidence || signal.confidence < 75) {
            errors.push('Signal confidence below minimum threshold');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

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

        globalSignalGenerator = new ServerlessOTCGenerator({
            minConfidence: 75,
            maxProcessingTime: CONFIG.maxProcessingTime,
            strictMode: true
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
    const requestId = `API_${Date.now()}_${Buffer.from(Date.now().toString()).toString('base64').substr(0, 8)}`;

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
        const missingParams = [];
        if (!currencyPair) missingParams.push('currencyPair');
        if (!timeframe) missingParams.push('timeframe');
        if (!tradeDuration) missingParams.push('tradeDuration');

        if (missingParams.length > 0) {
            return res.status(400).json({
                error: 'Missing required parameters',
                message: `The following parameters are required: ${missingParams.join(', ')}`,
                missingParameters: missingParams,
                requestId
            });
        }

        // Validate parameter values
        const validPairs = ['USD/PKR', 'USD/DZD', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD'];
        const validTimeframes = ['1m', '3m', '5m', '15m', '30m'];
        const validDurations = ['1', '3', '5', '10', '15'];

        if (!validPairs.includes(currencyPair)) {
            return res.status(400).json({
                error: 'Invalid currency pair',
                message: `Currency pair '${currencyPair}' is not supported`,
                supportedPairs: validPairs,
                requestId
            });
        }

        if (!validTimeframes.includes(timeframe)) {
            return res.status(400).json({
                error: 'Invalid timeframe',
                message: `Timeframe '${timeframe}' is not supported`,
                supportedTimeframes: validTimeframes,
                requestId
            });
        }

        if (!validDurations.includes(tradeDuration)) {
            return res.status(400).json({
                error: 'Invalid trade duration',
                message: `Trade duration '${tradeDuration}' is not supported`,
                supportedDurations: validDurations,
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

        // Initialize strict mode components
        console.log('🔒 Initializing strict mode validation...');
        const dataValidator = new DataQualityValidator();
        console.log(`🔒 Strict Mode Status: ${strictModeConfig.isStrictModeEnabled()}`);

        // Initialize signal generator
        console.log('🔧 Ensuring signal generator is initialized...');
        const signalGenerator = await ensureSignalGeneratorInitialized();

        // Generate signal using real market data
        console.log('🎯 Generating OTC signal with real market data...');

        let signal; // Declare signal variable in proper scope
        let processingTime;

        try {
            signal = await signalGenerator.generateSignal({
                currencyPair,
                timeframe,
                tradeDuration,
                platform,
                useRealData: true // Ensure we're using real market data
            });

            processingTime = Date.now() - startTime;

            // STRICT MODE: Comprehensive signal validation
            try {
                // Validate signal quality and data sources
                const validatedSignal = strictModeConfig.enforceStrictSignalGeneration(signal);

                // Additional strict mode checks
                if (!signal.metadata || !signal.metadata.dataSource) {
                    throw strictModeConfig.createStrictModeError('Signal missing data source metadata');
                }

                if (signal.confidence < strictModeConfig.getConfig().minDataQuality * 100) {
                    throw strictModeConfig.createStrictModeError(`Signal confidence too low: ${signal.confidence}%`);
                }

                console.log('✅ Signal passed comprehensive strict mode validation');
            } catch (strictError) {
                console.log(`❌ Signal failed strict mode validation: ${strictError.message}`);
                return res.status(422).json({
                    success: false,
                    requestId,
                    processingTime,
                    error: 'STRICT_MODE_VIOLATION',
                    message: strictError.message,
                    strictMode: true,
                    currency_pair: currencyPair,
                    timeframe: timeframe,
                    trade_duration: tradeDuration,
                    timestamp: new Date().toISOString()
                });
            }

            // STRICT MODE: Reject any simulated data
            if (signal.metadata && signal.metadata.source === 'simulated') {
                const processingTime = Date.now() - startTime;
                console.log(`❌ Signal was generated using simulated data - rejecting in strict mode`);
                console.log(`🆔 Request ID: ${requestId}`);
                console.log(`⏱️ Processing Time: ${processingTime}ms`);

                return res.status(422).json({
                    success: false,
                    requestId,
                    processingTime,
                    error: 'SIMULATED_DATA_REJECTED',
                    message: 'Signal generated using simulated data. Only real market data is accepted.',
                    currency_pair: currencyPair,
                    timeframe: timeframe,
                    trade_duration: tradeDuration,
                    timestamp: new Date().toISOString(),
                    dataSource: 'simulated'
                });
            }

            // Ensure we have a valid signal response - STRICT MODE: NO FALLBACKS
            if (!signal || signal.signal === 'NO_SIGNAL' || signal.signal === 'ERROR') {
                const processingTime = Date.now() - startTime;
                console.log(`❌ Signal generator returned NO_SIGNAL or ERROR - failing gracefully`);
                console.log(`🆔 Request ID: ${requestId}`);
                console.log(`⏱️ Processing Time: ${processingTime}ms`);

                return res.status(422).json({
                    success: false,
                    requestId,
                    processingTime,
                    error: 'NO_REAL_DATA_AVAILABLE',
                    message: 'Unable to generate signal with real market data. Please try again later.',
                    currency_pair: currencyPair,
                    timeframe: timeframe,
                    trade_duration: tradeDuration,
                    timestamp: new Date().toISOString(),
                    dataSource: 'none'
                });
            }
            
            // Add data source information
            signal.dataSource = signal.metadata ? signal.metadata.source : 'unknown';
            
        } catch (error) {
            processingTime = Date.now() - startTime;
            console.error(`❌ Error generating signal: ${error.message}`);
            console.log(`🆔 Request ID: ${requestId}`);
            console.log(`⏱️ Processing Time: ${processingTime}ms`);

            // STRICT MODE: Return error instead of fallback signal
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