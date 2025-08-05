/**
 * 🏥 Health Check Endpoint
 * Add this to your main server file to enable health checks
 */

/**
 * Health check endpoint handler
 * Add this to your Express app or server
 */
function createHealthCheckEndpoint(app) {
    // Basic health check
    app.get('/health', (req, res) => {
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version,
            environment: process.env.NODE_ENV || 'development'
        };

        res.status(200).json(healthStatus);
    });

    // Enhanced health check with service status
    app.get('/health/detailed', async (req, res) => {
        try {
            const detailedHealth = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                version: process.version,
                environment: process.env.NODE_ENV || 'development',
                services: await checkServices(),
                features: checkFeatures()
            };

            res.status(200).json(detailedHealth);
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    });

    // API readiness check
    app.get('/ready', async (req, res) => {
        try {
            const readinessCheck = await performReadinessCheck();
            
            if (readinessCheck.ready) {
                res.status(200).json(readinessCheck);
            } else {
                res.status(503).json(readinessCheck);
            }
        } catch (error) {
            res.status(503).json({
                ready: false,
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    });
}

/**
 * Check service dependencies
 */
async function checkServices() {
    const services = {};

    // Check Gemini API
    try {
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY;
        services.gemini = {
            status: geminiKey ? 'configured' : 'missing_key',
            hasKey: !!geminiKey
        };
    } catch (error) {
        services.gemini = {
            status: 'error',
            error: error.message
        };
    }

    // Check database (if applicable)
    try {
        const dbPath = process.env.DATABASE_PATH;
        services.database = {
            status: dbPath ? 'configured' : 'not_configured',
            path: dbPath
        };
    } catch (error) {
        services.database = {
            status: 'error',
            error: error.message
        };
    }

    return services;
}

/**
 * Check available features
 */
function checkFeatures() {
    return {
        ultimateGeminiVision: true,
        enhancedAnalysis: true,
        stochasticTiming: true,
        candlestickAnalysis: true,
        movingAveragesAnalysis: true,
        supportResistanceAnalysis: true,
        volatilityAnalysis: true,
        nextCandlePredictions: true
    };
}

/**
 * Perform comprehensive readiness check
 */
async function performReadinessCheck() {
    const checks = [];
    let allReady = true;

    // Check environment variables
    const requiredEnvVars = ['GEMINI_API_KEY'];
    for (const envVar of requiredEnvVars) {
        const exists = !!process.env[envVar];
        checks.push({
            name: `env_${envVar}`,
            status: exists ? 'ready' : 'not_ready',
            required: true
        });
        if (!exists) allReady = false;
    }

    // Check services
    try {
        const services = await checkServices();
        for (const [serviceName, serviceStatus] of Object.entries(services)) {
            const ready = serviceStatus.status === 'configured' || serviceStatus.status === 'healthy';
            checks.push({
                name: `service_${serviceName}`,
                status: ready ? 'ready' : 'not_ready',
                required: serviceName === 'gemini'
            });
            if (!ready && serviceName === 'gemini') allReady = false;
        }
    } catch (error) {
        checks.push({
            name: 'services_check',
            status: 'error',
            error: error.message,
            required: true
        });
        allReady = false;
    }

    return {
        ready: allReady,
        timestamp: new Date().toISOString(),
        checks: checks,
        summary: {
            total: checks.length,
            ready: checks.filter(c => c.status === 'ready').length,
            notReady: checks.filter(c => c.status === 'not_ready').length,
            errors: checks.filter(c => c.status === 'error').length
        }
    };
}

/**
 * Express middleware version
 */
function healthCheckMiddleware() {
    return (req, res, next) => {
        if (req.path === '/health') {
            const healthStatus = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            };
            return res.status(200).json(healthStatus);
        }
        next();
    };
}

module.exports = {
    createHealthCheckEndpoint,
    healthCheckMiddleware,
    checkServices,
    checkFeatures,
    performReadinessCheck
};

/**
 * Usage Instructions:
 * 
 * 1. In your main server file (app.js, server.js, etc.), add:
 * 
 * const { createHealthCheckEndpoint } = require('./health-check-endpoint');
 * createHealthCheckEndpoint(app);
 * 
 * 2. Or use as middleware:
 * 
 * const { healthCheckMiddleware } = require('./health-check-endpoint');
 * app.use(healthCheckMiddleware());
 * 
 * 3. Available endpoints:
 * - GET /health - Basic health check
 * - GET /health/detailed - Detailed health with services
 * - GET /ready - Readiness check for deployment
 */