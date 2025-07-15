#!/usr/bin/env node

/**
 * Simple Import Test - Test if all enhanced components can be imported
 */

console.log('🧪 Testing Enhanced TRADAI Component Imports...\n');

try {
    console.log('📦 Testing WebSocketServer import...');
    const { WebSocketServer } = require('./src/core/WebSocketServer');
    console.log('✅ WebSocketServer imported successfully');
    
    console.log('📦 Testing DualAIAnalyzer import...');
    const { DualAIAnalyzer } = require('./src/core/DualAIAnalyzer');
    console.log('✅ DualAIAnalyzer imported successfully');
    
    console.log('📦 Testing EnhancedTechnicalAnalyzer import...');
    const { EnhancedTechnicalAnalyzer } = require('./src/core/EnhancedTechnicalAnalyzer');
    console.log('✅ EnhancedTechnicalAnalyzer imported successfully');
    
    console.log('📦 Testing TradeManager import...');
    const { TradeManager } = require('./src/core/TradeManager');
    console.log('✅ TradeManager imported successfully');
    
    console.log('📦 Testing AILearningSystem import...');
    const { AILearningSystem } = require('./src/core/AILearningSystem');
    console.log('✅ AILearningSystem imported successfully');
    
    console.log('📦 Testing RiskManagementSystem import...');
    const { RiskManagementSystem } = require('./src/core/RiskManagementSystem');
    console.log('✅ RiskManagementSystem imported successfully');
    
    console.log('\n🎉 All enhanced components imported successfully!');
    
    // Test basic instantiation with minimal config
    console.log('\n🔧 Testing basic component instantiation...');
    
    const mockLogger = {
        info: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.log
    };
    
    const basicConfig = {
        groq: { apiKey: 'test-key' },
        together: { apiKey: 'test-key' },
        logger: mockLogger
    };
    
    try {
        const wsServer = new WebSocketServer(basicConfig, mockLogger);
        console.log('✅ WebSocketServer instantiated');
    } catch (e) {
        console.log('⚠️ WebSocketServer instantiation:', e.message);
    }
    
    try {
        const aiAnalyzer = new DualAIAnalyzer(basicConfig, mockLogger);
        console.log('✅ DualAIAnalyzer instantiated');
    } catch (e) {
        console.log('⚠️ DualAIAnalyzer instantiation:', e.message);
    }
    
    try {
        const techAnalyzer = new EnhancedTechnicalAnalyzer(basicConfig, mockLogger);
        console.log('✅ EnhancedTechnicalAnalyzer instantiated');
    } catch (e) {
        console.log('⚠️ EnhancedTechnicalAnalyzer instantiation:', e.message);
    }
    
    try {
        const tradeManager = new TradeManager(basicConfig, mockLogger);
        console.log('✅ TradeManager instantiated');
    } catch (e) {
        console.log('⚠️ TradeManager instantiation:', e.message);
    }
    
    try {
        const aiLearning = new AILearningSystem(basicConfig);
        console.log('✅ AILearningSystem instantiated');
    } catch (e) {
        console.log('⚠️ AILearningSystem instantiation:', e.message);
    }
    
    try {
        const riskMgmt = new RiskManagementSystem(basicConfig);
        console.log('✅ RiskManagementSystem instantiated');
    } catch (e) {
        console.log('⚠️ RiskManagementSystem instantiation:', e.message);
    }
    
    console.log('\n🎯 Import and instantiation test completed!');
    
} catch (error) {
    console.error('❌ Import test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
