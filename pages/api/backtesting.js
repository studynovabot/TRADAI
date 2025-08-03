/**
 * Backtesting API Endpoint
 * Manages backtesting data, performance metrics, and accuracy tracking
 */

const BacktestingService = require('../../services/BacktestingService');

// Initialize backtesting service
let backtestingService = null;

function getBacktestingService() {
    if (!backtestingService) {
        backtestingService = new BacktestingService({
            maxHistorySize: 10000,
            confidenceBuckets: [60, 70, 80, 90],
            evaluationPeriods: ['1h', '4h', '1d', '1w']
        });
    }
    return backtestingService;
}

export default async function handler(req, res) {
    try {
        console.log('=== BACKTESTING API CALLED ===');
        console.log('Method:', req.method);
        console.log('Query:', req.query);

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Handle preflight OPTIONS request
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const service = getBacktestingService();
        const { action } = req.query;

        switch (req.method) {
            case 'GET':
                return handleGetRequest(req, res, service, action);
            case 'POST':
                return handlePostRequest(req, res, service, action);
            case 'PUT':
                return handlePutRequest(req, res, service, action);
            case 'DELETE':
                return handleDeleteRequest(req, res, service, action);
            default:
                return res.status(405).json({
                    success: false,
                    error: 'Method not allowed'
                });
        }

    } catch (error) {
        console.error('❌ Backtesting API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Backtesting API error',
            details: error.message
        });
    }
}

/**
 * Handle GET requests
 */
async function handleGetRequest(req, res, service, action) {
    switch (action) {
        case 'report':
            // Get performance report
            const report = service.getPerformanceReport();
            return res.status(200).json({
                success: true,
                report: report,
                timestamp: new Date().toISOString()
            });

        case 'metrics':
            // Get current metrics
            const metrics = service.calculatePerformanceMetrics();
            return res.status(200).json({
                success: true,
                metrics: metrics,
                timestamp: new Date().toISOString()
            });

        case 'export':
            // Export backtesting data
            const format = req.query.format || 'json';
            const exportData = service.exportData(format);
            
            const contentType = format === 'csv' ? 'text/csv' : 'application/json';
            const filename = `backtesting-data-${new Date().toISOString().split('T')[0]}.${format}`;
            
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            return res.status(200).send(exportData);

        case 'predictions':
            // Get recent predictions
            const limit = parseInt(req.query.limit) || 100;
            const predictions = service.predictions.slice(-limit);
            
            return res.status(200).json({
                success: true,
                predictions: predictions,
                total: service.predictions.length,
                timestamp: new Date().toISOString()
            });

        case 'status':
            // Get service status
            return res.status(200).json({
                success: true,
                status: {
                    totalPredictions: service.predictions.length,
                    evaluatedPredictions: service.predictions.filter(p => p.status === 'evaluated').length,
                    pendingPredictions: service.predictions.filter(p => p.status === 'pending').length,
                    overallAccuracy: service.performanceMetrics.overall.accuracy,
                    lastUpdated: new Date().toISOString()
                }
            });

        default:
            return res.status(400).json({
                success: false,
                error: 'Invalid action for GET request',
                availableActions: ['report', 'metrics', 'export', 'predictions', 'status']
            });
    }
}

/**
 * Handle POST requests
 */
async function handlePostRequest(req, res, service, action) {
    switch (action) {
        case 'store-prediction':
            // Store a new prediction
            const { analysis, metadata } = req.body;
            
            if (!analysis) {
                return res.status(400).json({
                    success: false,
                    error: 'Analysis data is required'
                });
            }

            const predictionId = service.storePrediction(analysis, metadata || {});
            
            return res.status(200).json({
                success: true,
                predictionId: predictionId,
                message: 'Prediction stored for backtesting',
                timestamp: new Date().toISOString()
            });

        case 'record-result':
            // Record actual market result
            const { predictionId: resultPredictionId, actualData } = req.body;
            
            if (!resultPredictionId || !actualData) {
                return res.status(400).json({
                    success: false,
                    error: 'Prediction ID and actual data are required'
                });
            }

            const success = service.recordActualResult(resultPredictionId, actualData);
            
            if (success) {
                return res.status(200).json({
                    success: true,
                    message: 'Actual result recorded successfully',
                    timestamp: new Date().toISOString()
                });
            } else {
                return res.status(404).json({
                    success: false,
                    error: 'Prediction not found'
                });
            }

        case 'batch-results':
            // Record multiple actual results
            const { results } = req.body;
            
            if (!Array.isArray(results)) {
                return res.status(400).json({
                    success: false,
                    error: 'Results must be an array'
                });
            }

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const result of results) {
                try {
                    const success = service.recordActualResult(result.predictionId, result.actualData);
                    if (success) {
                        successCount++;
                    } else {
                        errorCount++;
                        errors.push(`Prediction ${result.predictionId} not found`);
                    }
                } catch (error) {
                    errorCount++;
                    errors.push(`Error processing ${result.predictionId}: ${error.message}`);
                }
            }

            return res.status(200).json({
                success: true,
                processed: results.length,
                successful: successCount,
                errors: errorCount,
                errorDetails: errors,
                timestamp: new Date().toISOString()
            });

        default:
            return res.status(400).json({
                success: false,
                error: 'Invalid action for POST request',
                availableActions: ['store-prediction', 'record-result', 'batch-results']
            });
    }
}

/**
 * Handle PUT requests
 */
async function handlePutRequest(req, res, service, action) {
    switch (action) {
        case 'recalculate':
            // Recalculate performance metrics
            const metrics = service.calculatePerformanceMetrics();
            
            return res.status(200).json({
                success: true,
                message: 'Performance metrics recalculated',
                metrics: metrics,
                timestamp: new Date().toISOString()
            });

        case 'update-config':
            // Update service configuration
            const { config } = req.body;
            
            if (!config) {
                return res.status(400).json({
                    success: false,
                    error: 'Configuration data is required'
                });
            }

            // Update configuration (this would require service restart in production)
            Object.assign(service.config, config);
            
            return res.status(200).json({
                success: true,
                message: 'Configuration updated',
                newConfig: service.config,
                timestamp: new Date().toISOString()
            });

        default:
            return res.status(400).json({
                success: false,
                error: 'Invalid action for PUT request',
                availableActions: ['recalculate', 'update-config']
            });
    }
}

/**
 * Handle DELETE requests
 */
async function handleDeleteRequest(req, res, service, action) {
    switch (action) {
        case 'cleanup':
            // Cleanup old data
            const daysToKeep = parseInt(req.query.days) || 30;
            service.cleanup(daysToKeep);
            
            return res.status(200).json({
                success: true,
                message: `Cleaned up data older than ${daysToKeep} days`,
                timestamp: new Date().toISOString()
            });

        case 'reset':
            // Reset all backtesting data (use with caution)
            const confirmReset = req.query.confirm === 'true';
            
            if (!confirmReset) {
                return res.status(400).json({
                    success: false,
                    error: 'Reset requires confirmation. Add ?confirm=true to the request.',
                    warning: 'This will delete all backtesting data permanently!'
                });
            }

            service.predictions = [];
            service.actualResults = [];
            service.performanceMetrics = {
                overall: { accuracy: 0, totalPredictions: 0, correctPredictions: 0 },
                byConfidence: {},
                byTimeframe: {},
                byAsset: {},
                recentPerformance: []
            };

            service.savePredictions();
            service.saveResults();
            service.saveMetrics();
            
            return res.status(200).json({
                success: true,
                message: 'All backtesting data has been reset',
                warning: 'This action cannot be undone',
                timestamp: new Date().toISOString()
            });

        default:
            return res.status(400).json({
                success: false,
                error: 'Invalid action for DELETE request',
                availableActions: ['cleanup', 'reset']
            });
    }
}