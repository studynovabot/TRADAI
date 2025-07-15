#!/usr/bin/env node

/**
 * Enhanced TRADAI System Startup Script
 * Launches the enhanced trading bot with dual AI analysis and WebSocket server
 */

const { TradingBot } = require('./src/core/TradingBot');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

class EnhancedTradaiLauncher {
    constructor() {
        this.config = {
            // Enhanced TRADAI Configuration
            enhancedMode: true,
            signalOnly: process.env.SIGNAL_ONLY === 'true' || true,
            paperTrading: process.env.PAPER_TRADING === 'true' || true,

            // Trading Configuration
            currencyPair: process.env.CURRENCY_PAIR || 'USD/EUR',
            timeframe: process.env.TIMEFRAME || '2min',

            // API Keys - Load from environment variables
            twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
            groq: {
                apiKey: process.env.GROQ_API_KEY
            },
            together: {
                apiKey: process.env.TOGETHER_API_KEY
            },
            
            // WebSocket Configuration
            webSocketPort: parseInt(process.env.WEBSOCKET_PORT) || 8080,

            // Risk Management
            accountBalance: parseFloat(process.env.ACCOUNT_BALANCE) || 1000,
            tradeAmount: parseFloat(process.env.TRADE_AMOUNT) || 10,
            maxDailyLoss: parseFloat(process.env.DAILY_LOSS_LIMIT) || 50,
            maxConsecutiveLosses: parseInt(process.env.MAX_CONSECUTIVE_LOSSES) || 3,

            // AI Configuration
            minConfidence: parseInt(process.env.MIN_CONFIDENCE) || 70,
            requireConsensus: process.env.REQUIRE_CONSENSUS === 'true' || true,
            
            // Technical Analysis
            adaptiveIndicators: true,
            patternRecognition: true,
            marketRegimeDetection: true,

            // Database Configuration
            database: {
                path: process.env.DATABASE_PATH || './data/tradai.db'
            },

            // Logging Configuration
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: './logs/tradai.log',
                maxFiles: 5,
                maxSize: '10m'
            }
        };
        
        this.bot = null;
    }

    async launch() {
        try {
            console.log('🚀 Enhanced TRADAI System Launcher');
            console.log('='.repeat(50));
            
            this.displayConfiguration();

            const isValid = await this.validateEnvironment();
            if (!isValid) {
                console.error('❌ Environment validation failed. Please check your API keys in the .env file.');
                process.exit(1);
            }

            await this.initializeBot();
            await this.startBot();
            
            this.setupGracefulShutdown();
            
            console.log('\n✅ Enhanced TRADAI system is now running!');
            console.log('📡 WebSocket server: ws://localhost:8080');
            console.log('🎯 Chrome extension can now connect for real-time signals');
            console.log('📊 Dual AI analysis: Groq + Together AI consensus');
            console.log('\nPress Ctrl+C to stop the system gracefully.\n');
            
        } catch (error) {
            console.error('❌ Failed to launch Enhanced TRADAI system:', error);
            process.exit(1);
        }
    }

    displayConfiguration() {
        console.log('📋 Configuration:');
        console.log(`   Mode: Enhanced TRADAI (${this.config.signalOnly ? 'Signal-Only' : 'Auto-Trading'})`);
        console.log(`   Currency Pair: ${this.config.currencyPair}`);
        console.log(`   Timeframe: ${this.config.timeframe}`);
        console.log(`   AI Consensus: ${this.config.requireConsensus ? 'Required' : 'Optional'}`);
        console.log(`   Min Confidence: ${this.config.minConfidence}%`);
        console.log(`   Account Balance: $${this.config.accountBalance}`);
        console.log(`   WebSocket Port: ${this.config.webSocketPort}`);
        console.log('');
    }

    async validateEnvironment() {
        console.log('🔍 Validating environment...');

        // Check TwelveData API key
        if (!this.config.twelveDataApiKey) {
            console.warn('⚠️ TwelveData API key not configured - market data collection will fail');
            return false;
        } else {
            console.log('   ✅ TwelveData API key configured');
        }

        // Check Groq API key
        if (!this.config.groq.apiKey) {
            console.warn('⚠️ Groq API key not configured - AI analysis will fail');
            return false;
        } else {
            console.log('   ✅ Groq API key configured');
        }

        // Check Together AI API key
        if (!this.config.together.apiKey) {
            console.warn('⚠️ Together AI API key not configured - dual AI consensus will fail');
            return false;
        } else {
            console.log('   ✅ Together AI API key configured');
        }
        
        // Check required directories
        const requiredDirs = ['src/core', 'signals', 'data'];
        for (const dir of requiredDirs) {
            if (!fs.existsSync(dir)) {
                console.log(`   📁 Creating directory: ${dir}`);
                fs.mkdirSync(dir, { recursive: true });
            }
        }
        
        // Check port availability
        const net = require('net');
        const isPortFree = await new Promise((resolve) => {
            const server = net.createServer();
            server.listen(this.config.webSocketPort, () => {
                server.close(() => resolve(true));
            });
            server.on('error', () => resolve(false));
        });
        
        if (!isPortFree) {
            throw new Error(`Port ${this.config.webSocketPort} is already in use`);
        }
        
        console.log('   ✅ Environment validation completed\n');
        return true;
    }

    async initializeBot() {
        console.log('🤖 Initializing Enhanced TRADAI bot...');
        
        this.bot = new TradingBot(this.config);
        
        console.log('   ✅ Bot initialized with enhanced components');
        console.log('   🧠 Dual AI Analyzer: Ready');
        console.log('   📊 Enhanced Technical Analyzer: Ready');
        console.log('   💼 Trade Manager: Ready');
        console.log('   🌐 WebSocket Server: Ready');
        console.log('');
    }

    async startBot() {
        console.log('▶️ Starting Enhanced TRADAI system...');
        
        await this.bot.start();
        
        console.log('   ✅ System started successfully');
        console.log('   📡 WebSocket server listening on port', this.config.webSocketPort);
        console.log('   🔄 Signal generation active');
        console.log('   📈 Market data collection started');
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}, shutting down Enhanced TRADAI system...`);
            
            if (this.bot) {
                await this.bot.stop();
                console.log('✅ Enhanced TRADAI system stopped gracefully');
            }
            
            process.exit(0);
        };
        
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            if (this.bot) {
                this.bot.stop().then(() => process.exit(1));
            } else {
                process.exit(1);
            }
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            if (this.bot) {
                this.bot.stop().then(() => process.exit(1));
            } else {
                process.exit(1);
            }
        });
    }
}

// Command line argument parsing
function parseArguments() {
    const args = process.argv.slice(2);
    const config = {};
    
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--currency-pair':
                config.currencyPair = args[++i];
                break;
            case '--timeframe':
                config.timeframe = args[++i];
                break;
            case '--port':
                config.webSocketPort = parseInt(args[++i]);
                break;
            case '--balance':
                config.accountBalance = parseFloat(args[++i]);
                break;
            case '--min-confidence':
                config.minConfidence = parseInt(args[++i]);
                break;
            case '--no-consensus':
                config.requireConsensus = false;
                break;
            case '--auto-trading':
                config.signalOnly = false;
                config.paperTrading = false;
                break;
            case '--paper-trading':
                config.signalOnly = false;
                config.paperTrading = true;
                break;
            case '--help':
                displayHelp();
                process.exit(0);
                break;
        }
    }
    
    return config;
}

function displayHelp() {
    console.log(`
Enhanced TRADAI System - Command Line Options:

Usage: node start-enhanced-tradai.js [options]

Options:
  --currency-pair <pair>    Currency pair to trade (default: USD/EUR)
  --timeframe <frame>       Timeframe for analysis (default: 2min)
  --port <port>            WebSocket server port (default: 8080)
  --balance <amount>       Account balance for position sizing (default: 1000)
  --min-confidence <pct>   Minimum confidence threshold (default: 70)
  --no-consensus           Don't require AI consensus (default: false)
  --auto-trading           Enable auto-trading mode (default: signal-only)
  --paper-trading          Enable paper trading mode
  --help                   Show this help message

Examples:
  node start-enhanced-tradai.js
  node start-enhanced-tradai.js --currency-pair GBP/USD --timeframe 5min
  node start-enhanced-tradai.js --port 8081 --balance 5000 --min-confidence 75
  node start-enhanced-tradai.js --paper-trading --no-consensus

Environment Variables:
  GROQ_API_KEY            Your Groq API key
  TOGETHER_API_KEY        Your Together AI API key
`);
}

// Launch the system
if (require.main === module) {
    const customConfig = parseArguments();
    const launcher = new EnhancedTradaiLauncher();
    
    // Override default config with command line arguments
    Object.assign(launcher.config, customConfig);
    
    launcher.launch().catch(console.error);
}

module.exports = { EnhancedTradaiLauncher };
