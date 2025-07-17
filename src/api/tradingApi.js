/**
 * Trading API - REST API for the 3-Layer AI Trading System
 * 
 * This module provides a REST API for interacting with the trading system.
 * It allows generating signals, viewing system status, and logging trade outcomes.
 */

const express = require('express');
const cors = require('cors');
const { EnhancedOrchestrator } = require('../layers/EnhancedOrchestrator');
const { config } = require('../config/TradingConfig');
const { Logger } = require('../utils/Logger');

// Initialize logger
const logger = Logger.getInstanceSync();

// Initialize orchestrator
const orchestrator = new EnhancedOrchestrator(config);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
const router = express.Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await orchestrator.performSystemHealthCheck();
    
    res.status(healthCheck.healthy ? 200 : 503).json({
      status: healthCheck.healthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      systemHealth: orchestrator.systemState.systemHealth,
      isRunning: orchestrator.systemState.isRunning,
      issues: healthCheck.issues
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Start the trading system
 */
router.post('/start', async (req, res) => {
  try {
    if (orchestrator.systemState.isRunning) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Trading system is already running' 
      });
    }
    
    const result = await orchestrator.start();
    
    res.status(result.started ? 200 : 500).json({
      status: result.started ? 'ok' : 'error',
      message: result.started ? 'Trading system started successfully' : 'Failed to start trading system',
      health: result.health,
      config: result.config
    });
  } catch (error) {
    logger.error('Failed to start trading system:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Stop the trading system
 */
router.post('/stop', async (req, res) => {
  try {
    if (!orchestrator.systemState.isRunning) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Trading system is not running' 
      });
    }
    
    const result = await orchestrator.stop();
    
    res.status(result.stopped ? 200 : 500).json({
      status: result.stopped ? 'ok' : 'error',
      message: result.stopped ? 'Trading system stopped successfully' : 'Failed to stop trading system',
      finalStats: result.finalStats
    });
  } catch (error) {
    logger.error('Failed to stop trading system:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Get system status
 */
router.get('/status', (req, res) => {
  try {
    const status = orchestrator.getSystemStats();
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      systemState: status.systemState,
      performance: status.performance,
      signalHistory: status.signalHistory,
      uptime: status.uptime
    });
  } catch (error) {
    logger.error('Failed to get system status:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Generate a signal manually
 */
router.post('/generate-signal', async (req, res) => {
  try {
    if (!orchestrator.systemState.isRunning) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Trading system is not running' 
      });
    }
    
    // Override currency pair if provided
    if (req.body.currencyPair) {
      orchestrator.config.currencyPair = req.body.currencyPair;
    }
    
    // Generate signal
    logger.info('Manually generating signal...');
    
    // Get market data
    const marketData = await orchestrator.getMarketDataForAnalysis();
    if (!marketData || !orchestrator.validateMarketData(marketData)) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Invalid or insufficient market data' 
      });
    }
    
    // Generate signal ID
    const signalId = orchestrator.generateSignalId();
    
    // Process signal
    const signalResult = await orchestrator.processSignal(signalId, marketData);
    
    // Handle signal result
    await orchestrator.handleSignalResult(signalResult);
    
    res.status(200).json({
      status: 'ok',
      message: 'Signal generated successfully',
      signal: signalResult
    });
  } catch (error) {
    logger.error('Failed to generate signal:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Get recent signals
 */
router.get('/signals', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const signals = orchestrator.signalHistory.slice(0, limit);
    
    res.status(200).json({
      status: 'ok',
      count: signals.length,
      signals
    });
  } catch (error) {
    logger.error('Failed to get signals:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Log trade outcome
 */
router.post('/log-trade', async (req, res) => {
  try {
    const { signalId, outcome, pnl, notes } = req.body;
    
    if (!signalId || !outcome) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Missing required fields: signalId, outcome' 
      });
    }
    
    // Find signal in history
    const signal = orchestrator.signalHistory.find(s => s.signalId === signalId);
    
    if (!signal) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Signal not found' 
      });
    }
    
    // Log trade outcome
    const tradeData = {
      signalId,
      currencyPair: signal.currencyPair,
      direction: signal.direction,
      outcome,
      pnl,
      entryTime: signal.timestamp,
      exitTime: new Date().toISOString(),
      signalQuality: signal.signalQuality,
      confidence: signal.confidence,
      tradeScore: signal.tradeScore,
      notes
    };
    
    const result = await orchestrator.tradeLogger.logTrade(tradeData);
    
    // Update reflex brain with outcome
    orchestrator.reflexBrain.updateTradeOutcome(signalId, outcome);
    
    res.status(result.success ? 200 : 500).json({
      status: result.success ? 'ok' : 'error',
      message: result.success ? 'Trade logged successfully' : 'Failed to log trade',
      tradeId: result.tradeId,
      error: result.error
    });
  } catch (error) {
    logger.error('Failed to log trade:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Get trade statistics
 */
router.get('/trade-stats', (req, res) => {
  try {
    const stats = orchestrator.tradeLogger.getStats();
    
    res.status(200).json({
      status: 'ok',
      stats
    });
  } catch (error) {
    logger.error('Failed to get trade stats:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

/**
 * Generate performance report
 */
router.get('/performance-report', async (req, res) => {
  try {
    const report = await orchestrator.tradeLogger.generatePerformanceReport();
    
    if (!report) {
      return res.status(500).json({ 
        status: 'error', 
        message: 'Failed to generate performance report' 
      });
    }
    
    res.status(200).json({
      status: 'ok',
      report
    });
  } catch (error) {
    logger.error('Failed to generate performance report:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Register routes
app.use('/api/v1', router);

// Error handler
app.use((err, req, res, next) => {
  logger.error('API error:', err);
  res.status(500).json({ status: 'error', error: err.message });
});

/**
 * Start API server
 */
function startServer(port = 3000) {
  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        logger.info(`🚀 Trading API server running on port ${port}`);
        resolve(server);
      });
      
      server.on('error', (error) => {
        logger.error('Failed to start API server:', error);
        reject(error);
      });
    } catch (error) {
      logger.error('Failed to start API server:', error);
      reject(error);
    }
  });
}

module.exports = { app, startServer };