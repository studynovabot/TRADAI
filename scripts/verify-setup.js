#!/usr/bin/env node

/**
 * Setup Verification Script
 * 
 * Verifies that all components are properly configured with your API keys
 */

const fs = require('fs-extra');
const { Config } = require('../src/config/Config');
const { DatabaseManager } = require('../src/utils/DatabaseManager');

async function verifySetup() {
  console.log('🔍 Verifying AI Binary Trading Bot Setup');
  console.log('========================================\n');
  
  let allGood = true;
  
  try {
    // 1. Check .env file
    console.log('1. Checking .env file...');
    if (!await fs.pathExists('./.env')) {
      console.log('❌ .env file not found');
      allGood = false;
    } else {
      console.log('✅ .env file exists');
    }
    
    // 2. Load and validate configuration
    console.log('\n2. Loading configuration...');
    const config = await Config.load('./config/trading.json');
    
    // Check API keys
    if (!config.twelveDataApiKey) {
      console.log('❌ TWELVE_DATA_API_KEY not set');
      allGood = false;
    } else {
      console.log('✅ Twelve Data API key loaded');
    }
    
    if (!config.groqApiKey && !config.togetherApiKey) {
      console.log('❌ No AI provider API key set (need GROQ_API_KEY or TOGETHER_API_KEY)');
      allGood = false;
    } else {
      if (config.groqApiKey) console.log('✅ Groq API key loaded');
      if (config.togetherApiKey) console.log('✅ Together AI API key loaded');
    }
    
    console.log(`✅ AI Provider: ${config.aiProvider}`);
    console.log(`✅ Currency Pair: ${config.currencyPair}`);
    console.log(`✅ Trade Amount: $${config.tradeAmount}`);
    console.log(`✅ Min Confidence: ${config.minConfidence}%`);
    console.log(`✅ Paper Trading: ${config.paperTrading ? 'ENABLED' : 'DISABLED'}`);
    
    // 3. Initialize database
    console.log('\n3. Initializing database...');

    // Initialize logger first
    const { Logger } = require('../src/utils/Logger');
    const logger = Logger.getInstance(config);

    // Wait a moment for logger to initialize
    await new Promise(resolve => setTimeout(resolve, 100));

    const db = new DatabaseManager(config);
    await db.initialize();
    await db.close();
    console.log('✅ Database initialized successfully');
    
    // 4. Check directories
    console.log('\n4. Checking directories...');
    const dirs = ['./logs', './logs/screenshots', './data', './config'];
    for (const dir of dirs) {
      await fs.ensureDir(dir);
      console.log(`✅ ${dir} ready`);
    }
    
    // 5. Test API connections (optional)
    console.log('\n5. Testing API connections...');
    
    try {
      const { DataCollector } = require('../src/core/DataCollector');
      const dataCollector = new DataCollector(config);
      const connectionTest = await dataCollector.testConnection();
      
      if (connectionTest) {
        console.log('✅ Twelve Data API connection successful');
      } else {
        console.log('⚠️  Twelve Data API connection failed (check your key)');
      }
    } catch (error) {
      console.log('⚠️  Twelve Data API test error:', error.message);
    }
    
    try {
      const { AIAnalyzer } = require('../src/core/AIAnalyzer');
      const aiAnalyzer = new AIAnalyzer(config);
      const aiTest = await aiAnalyzer.testConnection();
      
      if (aiTest) {
        console.log(`✅ ${config.aiProvider.toUpperCase()} AI API connection successful`);
      } else {
        console.log(`⚠️  ${config.aiProvider.toUpperCase()} AI API connection failed (check your key)`);
      }
    } catch (error) {
      console.log(`⚠️  ${config.aiProvider.toUpperCase()} AI API test error:`, error.message);
    }
    
    // Final status
    console.log('\n' + '='.repeat(50));
    if (allGood) {
      console.log('🎉 SETUP VERIFICATION PASSED!');
      console.log('\nYour bot is ready to start. Run:');
      console.log('npm start -- --paper-trading');
    } else {
      console.log('❌ SETUP VERIFICATION FAILED!');
      console.log('\nPlease fix the issues above before starting the bot.');
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Setup verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifySetup().catch(console.error);
}

module.exports = { verifySetup };
