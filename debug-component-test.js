#!/usr/bin/env node

/**
 * Debug Component Test - Test individual components to isolate the issue
 */

console.log('🔍 Debug Component Test - Testing Individual Components...\n');

// Set environment variables (load from .env file in production)
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'your-groq-api-key';
process.env.TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'your-together-api-key';

// Create a comprehensive mock logger
const mockLogger = {
    info: (...args) => console.log('ℹ️', ...args),
    error: (...args) => console.error('❌', ...args),
    warn: (...args) => console.warn('⚠️', ...args),
    debug: (...args) => console.log('🐛', ...args),
    log: (...args) => console.log('📝', ...args),
    path: './logs/test.log'
};

const config = {
    currencyPair: 'USD/EUR',
    timeframe: '2min',
    enhancedMode: true,
    signalOnly: true,
    paperTrading: true,
    groq: {
        apiKey: process.env.GROQ_API_KEY
    },
    together: {
        apiKey: process.env.TOGETHER_API_KEY
    },
    logger: mockLogger,
    logging: {
        level: 'info',
        file: './logs/test.log',
        maxFiles: 5,
        maxSize: '10m'
    },
    webSocketPort: 8080,
    accountBalance: 1000,
    database: {
        path: './data/tradai.db'
    }
};

async function testComponents() {
    try {
        console.log('🧪 Testing TradingBot constructor...');
        const { TradingBot } = require('./src/core/TradingBot');
        
        console.log('📦 Creating TradingBot instance...');
        const bot = new TradingBot(config);
        
        console.log('✅ TradingBot created successfully');
        console.log('🔍 Enhanced mode:', bot.enhancedMode);
        console.log('🔍 Signal only:', bot.signalOnly);
        console.log('🔍 Logger type:', typeof bot.logger);
        console.log('🔍 WebSocket server:', bot.webSocketServer ? 'initialized' : 'not initialized');
        console.log('🔍 AI Analyzer:', bot.aiAnalyzer ? 'initialized' : 'not initialized');
        console.log('🔍 Technical Analyzer:', bot.technicalAnalyzer ? 'initialized' : 'not initialized');
        console.log('🔍 Trade Manager:', bot.tradeManager ? 'initialized' : 'not initialized');
        
        console.log('\n🎯 TradingBot constructor test completed successfully!');
        
    } catch (error) {
        console.error('❌ TradingBot constructor failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Try to identify which component is causing the issue
        console.log('\n🔍 Testing individual components...');
        
        try {
            console.log('📦 Testing WebSocketServer...');
            const { WebSocketServer } = require('./src/core/WebSocketServer');
            const wsServer = new WebSocketServer(config, mockLogger);
            console.log('✅ WebSocketServer created successfully');
        } catch (e) {
            console.error('❌ WebSocketServer failed:', e.message);
        }
        
        try {
            console.log('📦 Testing DualAIAnalyzer...');
            const { DualAIAnalyzer } = require('./src/core/DualAIAnalyzer');
            const aiAnalyzer = new DualAIAnalyzer(config, mockLogger);
            console.log('✅ DualAIAnalyzer created successfully');
        } catch (e) {
            console.error('❌ DualAIAnalyzer failed:', e.message);
        }
        
        try {
            console.log('📦 Testing EnhancedTechnicalAnalyzer...');
            const { EnhancedTechnicalAnalyzer } = require('./src/core/EnhancedTechnicalAnalyzer');
            const techAnalyzer = new EnhancedTechnicalAnalyzer(config, mockLogger);
            console.log('✅ EnhancedTechnicalAnalyzer created successfully');
        } catch (e) {
            console.error('❌ EnhancedTechnicalAnalyzer failed:', e.message);
        }
        
        try {
            console.log('📦 Testing TradeManager...');
            const { TradeManager } = require('./src/core/TradeManager');
            const tradeManager = new TradeManager(config, mockLogger);
            console.log('✅ TradeManager created successfully');
        } catch (e) {
            console.error('❌ TradeManager failed:', e.message);
        }
        
        try {
            console.log('📦 Testing AILearningSystem...');
            const { AILearningSystem } = require('./src/core/AILearningSystem');
            const aiLearning = new AILearningSystem(config);
            console.log('✅ AILearningSystem created successfully');
        } catch (e) {
            console.error('❌ AILearningSystem failed:', e.message);
        }
        
        try {
            console.log('📦 Testing RiskManagementSystem...');
            const { RiskManagementSystem } = require('./src/core/RiskManagementSystem');
            const riskMgmt = new RiskManagementSystem(config);
            console.log('✅ RiskManagementSystem created successfully');
        } catch (e) {
            console.error('❌ RiskManagementSystem failed:', e.message);
        }
    }
}

testComponents().catch(console.error);
