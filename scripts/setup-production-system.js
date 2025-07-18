/**
 * Production System Setup Script
 * 
 * Automated setup and configuration for the production AI trading signal generator
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

class ProductionSystemSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {
      apiKeys: {},
      systemSettings: {},
      tradingSettings: {}
    };
  }
  
  /**
   * Main setup process
   */
  async runSetup() {
    console.log('\n🚀 TRADAI Production System Setup');
    console.log('=====================================\n');
    
    try {
      // Welcome and overview
      await this.showWelcome();
      
      // Check existing configuration
      await this.checkExistingConfig();
      
      // API Keys setup
      await this.setupApiKeys();
      
      // System configuration
      await this.setupSystemSettings();
      
      // Trading configuration
      await this.setupTradingSettings();
      
      // Generate .env file
      await this.generateEnvFile();
      
      // Create necessary directories
      await this.createDirectories();
      
      // Run system test
      await this.runSystemTest();
      
      // Show completion message
      await this.showCompletion();
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
  
  /**
   * Show welcome message and system overview
   */
  async showWelcome() {
    console.log('Welcome to the Production AI Trading Signal Generator setup!');
    console.log('\nThis system provides:');
    console.log('• 🧠 3-Brain AI Architecture (Quant, Analyst, Reflex)');
    console.log('• 📡 Multi-Provider Data Integration (Twelve Data, Finnhub, Alpha Vantage, Polygon)');
    console.log('• 📊 Historical Context from Yahoo Finance');
    console.log('• 🎯 Target Accuracy: 85-90%');
    console.log('• ⏱️ Deep Analysis: 2-3 minutes per signal');
    console.log('• 🔒 Production-Ready: No mock data fallback\n');
    
    const proceed = await this.askQuestion('Do you want to proceed with the setup? (y/n): ');
    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
  }
  
  /**
   * Check for existing configuration
   */
  async checkExistingConfig() {
    const envPath = path.join(process.cwd(), '.env');
    
    if (await fs.pathExists(envPath)) {
      console.log('\n⚠️ Existing .env file found.');
      const overwrite = await this.askQuestion('Do you want to overwrite it? (y/n): ');
      
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelled. Please backup your existing .env file first.');
        process.exit(0);
      }
    }
  }
  
  /**
   * Setup API keys
   */
  async setupApiKeys() {
    console.log('\n📋 API Keys Configuration');
    console.log('==========================\n');
    
    console.log('The system uses multiple data providers for maximum reliability:');
    console.log('• Primary: Twelve Data (real-time forex/crypto)');
    console.log('• Backup: Finnhub, Alpha Vantage, Polygon.io');
    console.log('• Historical: Yahoo Finance (automatic)\n');
    
    // Twelve Data (Primary)
    console.log('1. Twelve Data API Key (Primary Real-Time Provider)');
    console.log('   Get your free key at: https://twelvedata.com/');
    this.config.apiKeys.twelveData = await this.askQuestion('   Enter Twelve Data API key (or press Enter to skip): ');
    
    // Finnhub (Backup)
    console.log('\n2. Finnhub API Key (Backup Provider)');
    console.log('   Get your free key at: https://finnhub.io/');
    const finnhubKey = await this.askQuestion('   Enter Finnhub API key (or press Enter for default): ');
    this.config.apiKeys.finnhub = finnhubKey || 'd1t566pr01qh0t04t32gd1t566pr01qh0t04t330';
    
    // Alpha Vantage (Backup)
    console.log('\n3. Alpha Vantage API Key (Backup Provider)');
    console.log('   Get your free key at: https://www.alphavantage.co/');
    const alphaKey = await this.askQuestion('   Enter Alpha Vantage API key (or press Enter for default): ');
    this.config.apiKeys.alphaVantage = alphaKey || 'B5V6LID8ZMLCB8I';
    
    // Polygon (Backup)
    console.log('\n4. Polygon.io API Key (Backup Provider)');
    console.log('   Get your free key at: https://polygon.io/');
    const polygonKey = await this.askQuestion('   Enter Polygon API key (or press Enter for default): ');
    this.config.apiKeys.polygon = polygonKey || 'fjT4pb2VnomVKkkPay5dpXhMq3qtsLZp';
    
    // AI Providers
    console.log('\n5. AI Provider API Keys (for 3-Brain Architecture)');
    console.log('   Groq API Key (Reflex Brain - fast inference)');
    console.log('   Get your free key at: https://console.groq.com/');
    this.config.apiKeys.groq = await this.askQuestion('   Enter Groq API key: ');
    
    console.log('\n   Together AI API Key (Analyst Brain - reasoning)');
    console.log('   Get your key at: https://api.together.xyz/');
    this.config.apiKeys.together = await this.askQuestion('   Enter Together AI API key: ');
    
    console.log('\n   OpenAI API Key (Optional - enhanced analysis)');
    console.log('   Get your key at: https://platform.openai.com/');
    this.config.apiKeys.openai = await this.askQuestion('   Enter OpenAI API key (optional): ');
  }
  
  /**
   * Setup system settings
   */
  async setupSystemSettings() {
    console.log('\n⚙️ System Configuration');
    console.log('========================\n');
    
    // Target accuracy
    const accuracy = await this.askQuestion('Target accuracy percentage (85-90, default: 87): ');
    this.config.systemSettings.targetAccuracy = accuracy || '87';
    
    // Minimum confidence
    const confidence = await this.askQuestion('Minimum signal confidence threshold (70-90, default: 80): ');
    this.config.systemSettings.minConfidence = confidence || '80';
    
    // Max daily signals
    const maxSignals = await this.askQuestion('Maximum daily signals (5-20, default: 12): ');
    this.config.systemSettings.maxDailySignals = maxSignals || '12';
    
    // Processing mode
    console.log('\nProcessing modes:');
    console.log('1. PRODUCTION (strict real data only)');
    console.log('2. DEVELOPMENT (allows fallbacks for testing)');
    const mode = await this.askQuestion('Select mode (1 or 2, default: 1): ');
    this.config.systemSettings.mode = mode === '2' ? 'development' : 'production';
    
    // Enable learning
    const learning = await this.askQuestion('Enable AI learning and adaptation? (y/n, default: y): ');
    this.config.systemSettings.enableLearning = learning.toLowerCase() !== 'n';
  }
  
  /**
   * Setup trading settings
   */
  async setupTradingSettings() {
    console.log('\n💰 Trading Configuration');
    console.log('=========================\n');
    
    // Default pair
    console.log('Supported currency pairs:');
    console.log('EUR/USD, GBP/USD, USD/JPY, USD/CHF, AUD/USD, USD/CAD');
    console.log('NZD/USD, EUR/GBP, EUR/JPY, GBP/JPY, BTC/USD, ETH/USD');
    const pair = await this.askQuestion('Default currency pair (default: EUR/USD): ');
    this.config.tradingSettings.defaultPair = pair || 'EUR/USD';
    
    // Default timeframe
    console.log('\nSupported timeframes: 1m, 3m, 5m, 15m, 30m, 1h');
    const timeframe = await this.askQuestion('Default timeframe (default: 5m): ');
    this.config.tradingSettings.defaultTimeframe = timeframe || '5m';
    
    // Paper trading
    const paperTrading = await this.askQuestion('Enable paper trading mode? (y/n, default: y): ');
    this.config.tradingSettings.paperTrading = paperTrading.toLowerCase() !== 'n';
    
    // Trade amount
    if (this.config.tradingSettings.paperTrading) {
      const amount = await this.askQuestion('Paper trading amount in USD (default: 10): ');
      this.config.tradingSettings.tradeAmount = amount || '10';
    }
  }
  
  /**
   * Generate .env file
   */
  async generateEnvFile() {
    console.log('\n📝 Generating configuration file...');
    
    const envContent = `# Production AI Trading Signal Generator Configuration
# Generated on ${new Date().toISOString()}

# ===========================================
# MARKET DATA API KEYS (MULTI-PROVIDER SETUP)
# ===========================================

# Primary Real-Time Data Provider
TWELVE_DATA_API_KEY=${this.config.apiKeys.twelveData || 'your_twelve_data_api_key_here'}

# Backup Real-Time Data Providers (Failover Chain)
FINNHUB_API_KEY=${this.config.apiKeys.finnhub}
ALPHA_VANTAGE_API_KEY=${this.config.apiKeys.alphaVantage}
POLYGON_API_KEY=${this.config.apiKeys.polygon}

# ===========================================
# AI PROVIDER API KEYS (3-BRAIN ARCHITECTURE)
# ===========================================

# Groq API Key (for Reflex Brain - fast inference)
GROQ_API_KEY=${this.config.apiKeys.groq || 'your_groq_api_key_here'}

# Together AI API Key (for Analyst Brain - reasoning)
TOGETHER_API_KEY=${this.config.apiKeys.together || 'your_together_api_key_here'}

# OpenAI API Key (optional - for enhanced analysis)
OPENAI_API_KEY=${this.config.apiKeys.openai || 'your_openai_api_key_here'}

# ===========================================
# PRODUCTION SYSTEM CONFIGURATION
# ===========================================

# System Mode (PRODUCTION/DEVELOPMENT)
NODE_ENV=${this.config.systemSettings.mode}

# Strict Real Data Mode (never use mock data)
STRICT_REAL_DATA_MODE=${this.config.systemSettings.mode === 'production' ? 'true' : 'false'}

# Log data sources used for transparency
LOG_DATA_SOURCE=true

# Target accuracy percentage (85-90% range)
TARGET_ACCURACY=${this.config.systemSettings.targetAccuracy}

# Minimum signal confidence threshold (0-100)
MIN_SIGNAL_CONFIDENCE=${this.config.systemSettings.minConfidence}

# Maximum daily signals to prevent overtrading
MAX_DAILY_SIGNALS=${this.config.systemSettings.maxDailySignals}

# Enable AI learning and adaptation
ENABLE_AI_LEARNING=${this.config.systemSettings.enableLearning}

# Require consensus from all 3 brains
REQUIRE_CONSENSUS=true

# ===========================================
# TRADING CONFIGURATION
# ===========================================

# Default currency pair for testing
DEFAULT_CURRENCY_PAIR=${this.config.tradingSettings.defaultPair}

# Default timeframe for analysis
DEFAULT_TIMEFRAME=${this.config.tradingSettings.defaultTimeframe}

# Paper trading mode (true/false, default: true for safety)
PAPER_TRADING=${this.config.tradingSettings.paperTrading}

# Trade amount in USD (for paper trading)
TRADE_AMOUNT=${this.config.tradingSettings.tradeAmount || '10'}

# ===========================================
# LOGGING CONFIGURATION
# ===========================================

# Log level (debug, info, warn, error, default: info)
LOG_LEVEL=info

# ===========================================
# ADVANCED SETTINGS (OPTIONAL)
# ===========================================

# Maximum processing time per signal (milliseconds)
MAX_PROCESSING_TIME=180000

# Cache expiry time (milliseconds)
CACHE_EXPIRY=60000

# Health check interval (milliseconds)
HEALTH_CHECK_INTERVAL=300000
`;
    
    const envPath = path.join(process.cwd(), '.env');
    await fs.writeFile(envPath, envContent);
    
    console.log('✅ Configuration file (.env) created successfully!');
  }
  
  /**
   * Create necessary directories
   */
  async createDirectories() {
    console.log('\n📁 Creating necessary directories...');
    
    const directories = [
      'data',
      'data/signals',
      'data/models',
      'data/results',
      'data/backtest',
      'test-results',
      'logs'
    ];
    
    for (const dir of directories) {
      const dirPath = path.join(process.cwd(), dir);
      await fs.ensureDir(dirPath);
      console.log(`✅ Created: ${dir}/`);
    }
  }
  
  /**
   * Run system test
   */
  async runSystemTest() {
    console.log('\n🧪 System Test');
    console.log('===============\n');
    
    const runTest = await this.askQuestion('Run system test to verify configuration? (y/n, default: y): ');
    
    if (runTest.toLowerCase() !== 'n') {
      console.log('\nRunning production system test...');
      console.log('This may take a few minutes...\n');
      
      try {
        const { ProductionSystemTest } = require('../tests/productionSystemTest');
        const test = new ProductionSystemTest();
        const results = await test.runAllTests();
        
        console.log(`\n✅ System test completed: ${results.passedTests}/${results.totalTests} tests passed`);
        
        if (results.failedTests > 0) {
          console.log('⚠️ Some tests failed. Check the test report for details.');
        }
        
      } catch (error) {
        console.log(`❌ System test failed: ${error.message}`);
        console.log('You can run the test manually later with: npm run test:production');
      }
    }
  }
  
  /**
   * Show completion message
   */
  async showCompletion() {
    console.log('\n🎉 Setup Complete!');
    console.log('==================\n');
    
    console.log('Your production AI trading signal generator is now configured!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open http://localhost:3000/production in your browser');
    console.log('3. Generate your first ultra-accurate signal!');
    console.log('\nAdditional commands:');
    console.log('• Test system: npm run test:production');
    console.log('• Check health: npm run health-check');
    console.log('• View logs: tail -f logs/system.log');
    console.log('\n📚 Documentation: README.md');
    console.log('🐛 Issues: Check test-results/ directory');
    console.log('\n🚀 Happy trading with AI-powered signals!');
  }
  
  /**
   * Helper method to ask questions
   */
  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new ProductionSystemSetup();
  setup.runSetup().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { ProductionSystemSetup };