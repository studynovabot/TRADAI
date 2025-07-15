#!/usr/bin/env node

/**
 * AI Binary Trading Bot - Main Entry Point
 * 
 * This is the main orchestrator for the AI-powered binary options trading system.
 * It coordinates data collection, AI analysis, and trade execution.
 */

const yargs = require('yargs');
const { TradingBot } = require('./core/TradingBot');
const { Logger } = require('./utils/Logger');
const { Config } = require('./config/Config');

// Parse command line arguments
const argv = yargs
  .option('paper-trading', {
    alias: 'p',
    type: 'boolean',
    description: 'Run in paper trading mode (no real trades)',
    default: false
  })
  .option('signal-only', {
    alias: 's',
    type: 'boolean',
    description: 'Run in signal-only mode (AI signals for manual execution)',
    default: false
  })
  .option('currency-pair', {
    alias: 'c',
    type: 'string',
    description: 'Currency pair to trade (e.g., USD/INR)',
    default: 'USD/INR'
  })
  .option('config', {
    type: 'string',
    description: 'Path to config file',
    default: './config/trading.json'
  })
  .help()
  .argv;

async function main() {
  try {
    // Load configuration first
    const config = await Config.load(argv.config);
    config.paperTrading = argv.paperTrading;
    config.signalOnly = argv.signalOnly;
    config.currencyPair = argv.currencyPair;

    // Validate mode configuration
    if (config.signalOnly && config.paperTrading) {
      console.warn('⚠️  Both --signal-only and --paper-trading specified. Signal-only mode takes precedence.');
      config.paperTrading = false;
    }

    // Initialize logger with config and wait for it to be ready
    const logger = await Logger.getInstance(config);
    logger.info('🚀 Starting AI Binary Trading Bot...');

    // Log trading mode
    let tradingMode = 'LIVE';
    if (config.signalOnly) {
      tradingMode = 'SIGNAL-ONLY';
    } else if (config.paperTrading) {
      tradingMode = 'PAPER';
    }

    logger.info(`📊 Trading Mode: ${tradingMode}`);
    logger.info(`💱 Currency Pair: ${config.currencyPair}`);

    if (config.signalOnly) {
      logger.info('🎯 Signal-only mode: AI will generate trading signals for manual execution');
      logger.info('📝 No trades will be executed automatically - signals are for analysis only');
    }

    // Initialize and start trading bot
    const bot = new TradingBot(config);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('🛑 Received shutdown signal...');
      await bot.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('🛑 Received termination signal...');
      await bot.shutdown();
      process.exit(0);
    });

    // Start the bot
    await bot.start();
    
  } catch (error) {
    console.error('❌ Fatal error starting trading bot:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = { main };
