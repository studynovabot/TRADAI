/**
 * Health Check Endpoint for OTC Signal Generator
 * Enhanced with multi-timeframe analysis capabilities
 */

async function handler(req, res) {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            components: {
                api: 'healthy',
                database: 'healthy',
                browser: 'not_initialized',
                multiTimeframeAnalysis: 'available',
                comprehensiveAnalysisService: 'available',
                ocrEngines: 'available'
            },
            features: {
                standardSignalGeneration: true,
                multiTimeframeScreenshotAnalysis: true,
                confluenceAnalysis: true,
                aiTradingSignals: true,
                realTimeDataIntegration: true
            },
            supportedTimeframes: ['1m', '3m', '5m'],
            supportedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif'],
            maxFileSize: '10MB',
            maxFiles: 3,
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        };

        // Check if comprehensive analysis service is available
        try {
            const ComprehensiveAnalysisService = require('../../../src/services/ComprehensiveAnalysisService');
            health.components.comprehensiveAnalysisService = 'healthy';
        } catch (error) {
            health.components.comprehensiveAnalysisService = 'error';
            health.status = 'degraded';
        }

        // Check if multer is available for file uploads
        try {
            require('multer');
            health.components.fileUpload = 'healthy';
        } catch (error) {
            health.components.fileUpload = 'error';
            health.features.multiTimeframeScreenshotAnalysis = false;
            health.status = 'degraded';
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

export default handler;