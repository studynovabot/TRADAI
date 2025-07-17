/**
 * TRADAI - 3-Layer AI Trading System
 * 
 * Main entry point for the trading system.
 * This file initializes and starts the enhanced orchestrator.
 */

require('dotenv').config();
const { EnhancedOrchestrator } = require('./layers/EnhancedOrchestrator');
const { config } = require('./config/TradingConfig');
const { Logger } = require('./utils/Logger');

// Initialize logger
const logger = Logger.getInstanceSync();

// Main function
async function main() {
  try {
    logger.info('🚀 Starting TRADAI 3-Layer AI Trading System...');
    
    // Load configuration
    config.loadConfig();
    
    // Validate configuration
    const configValidation = config.validateConfig();
    if (!configValidation.valid) {
      logger.error(`❌ Configuration validation failed: ${configValidation.issues.join(', ')}`);
      process.exit(1);
    }
    
    // Initialize orchestrator
    const orchestrator = new EnhancedOrchestrator(config);
    
    // Start the system
    const startResult = await orchestrator.start();
    
    if (startResult.started) {
      logger.info('✅ TRADAI system started successfully');
      logger.info(`📊 System health: ${startResult.health.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      
      if (!startResult.health.healthy) {
        logger.warn(`⚠️ Health issues: ${startResult.health.issues.join(', ')}`);
      }
      
      // Register shutdown handlers
      process.on('SIGINT', async () => {
        logger.info('👋 Received SIGINT, shutting down...');
        await orchestrator.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        logger.info('👋 Received SIGTERM, shutting down...');
        await orchestrator.stop();
        process.exit(0);
      });
      
      // Log startup message
      logger.info('🤖 TRADAI is now running in signal-only mode');
      logger.info('📈 Generating signals every 2 minutes');
      logger.info('Press Ctrl+C to stop');
    } else {
      logger.error('❌ Failed to start TRADAI system');
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  logger.error('❌ Unhandled error in main:', error);
  process.exit(1);
});