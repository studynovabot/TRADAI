/**
 * API Server - Entry point for the Trading API
 * 
 * This file starts the Trading API server.
 */

require('dotenv').config();
const { startServer } = require('./tradingApi');
const { Logger } = require('../utils/Logger');

// Initialize logger
const logger = Logger.getInstanceSync();

// Get port from environment or use default
const port = process.env.API_PORT || 3000;

// Start server
async function main() {
  try {
    logger.info('Starting Trading API server...');
    
    const server = await startServer(port);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down API server...');
      server.close(() => {
        logger.info('API server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down API server...');
      server.close(() => {
        logger.info('API server closed');
        process.exit(0);
      });
    });
    
    logger.info(`Trading API server running at http://localhost:${port}/api/v1`);
    logger.info('Available endpoints:');
    logger.info('- GET  /api/v1/health');
    logger.info('- GET  /api/v1/status');
    logger.info('- GET  /api/v1/signals');
    logger.info('- GET  /api/v1/trade-stats');
    logger.info('- GET  /api/v1/performance-report');
    logger.info('- POST /api/v1/start');
    logger.info('- POST /api/v1/stop');
    logger.info('- POST /api/v1/generate-signal');
    logger.info('- POST /api/v1/log-trade');
    
  } catch (error) {
    logger.error('Failed to start API server:', error);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  logger.error('Unhandled error in main:', error);
  process.exit(1);
});