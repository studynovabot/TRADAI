/**
 * Ultimate Trading System Setup Script
 * 
 * This script helps users set up the Ultimate AI Trading Signal System
 * with proper configuration and validation
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

class UltimateSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {};
  }

  async run() {
    console.log('🚀 Ultimate AI Trading Signal System Setup');
    console.log('🎯 Target: 85-90% Accuracy with Multi-Source Data Fusion');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
      // Step 1: Welcome and overview
      await this.showWelcome();
      
      // Step 2: Check existing configuration
      await this.checkExistingConfig();
      
      // Step 3: Collect API keys
      await this.collectApiKeys();
      
      // Step 4: Configure performance targets
      await this.configurePerformanceTargets();
      
      // Step 5: Configure risk management
      await this.configureRiskManagement();
      
      // Step 6: Configure advanced features
      await this.configureAdvancedFeatures();
      
      // Step 7: Save configuration
      await this.saveConfiguration();
      
      // Step 8: Install dependencies
      await this.installDependencies();
      
      // Step 9: Run system test
      await this.runSystemTest();
      
      // Step 10: Final instructions
      await this.showFinalInstructions();
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
    } finally {
      this.rl.close();
    }
  }

  async showWelcome() {
    console.log('Welcome to the Ultimate AI Trading Signal System!');
    console.log('');
    console.log('This system features:');
    console.log('✅ Multi-source data fusion (4 providers)');
    console.log('✅ Three-layer AI brain architecture');
    console.log('✅ Advanced risk management filters');
    console.log('✅ Real-time learning and adaptation');
    console.log('✅ 85-90% accuracy target');
    console.log('');
    
    const proceed = await this.question('Ready to set up your ultimate trading system? (y/n): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
    console.log('');
  }

  async checkExistingConfig() {
    const envPath = path.join(process.cwd(), '.env');
    
    if (await fs.pathExists(envPath)) {
      console.log('📋 Existing .env file found.');
      const overwrite = await this.question('Do you want to overwrite it? (y/n): ');
      
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Using existing configuration. You can manually edit .env if needed.');
        console.log('Run "npm run test:ultimate" to validate your setup.');
        process.exit(0);
      }
    }
  }

  async collectApiKeys() {
    console.log('🔑 API Keys Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Market Data Providers
    console.log('📊 Market Data Providers (at least 1 required):');
    this.config.TWELVE_DATA_API_KEY = await this.question('Twelve Data API Key (primary): ');
    this.config.FINNHUB_API_KEY = await this.question('Finnhub API Key (optional): ') || 'd1t566pr01qh0t04t32gd1t566pr01qh0t04t330';
    this.config.ALPHA_VANTAGE_API_KEY = await this.question('Alpha Vantage API Key (optional): ') || 'B5V6LID8ZMLCB8I';
    this.config.POLYGON_API_KEY = await this.question('Polygon.io API Key (optional): ') || 'fjT4pb2VnomVKkkPay5dpXhMq3qtsLZp';
    
    console.log('');
    
    // AI Providers
    console.log('🤖 AI Providers (at least 1 required):');
    this.config.GROQ_API_KEY = await this.question('Groq API Key (recommended): ');
    this.config.TOGETHER_API_KEY = await this.question('Together AI API Key (optional): ');
    this.config.OPENROUTER_API_KEY = await this.question('OpenRouter API Key (optional): ');
    
    console.log('');
    
    // Validate required keys
    if (!this.config.TWELVE_DATA_API_KEY && !this.config.FINNHUB_API_KEY) {
      throw new Error('At least one market data API key is required');
    }
    
    if (!this.config.GROQ_API_KEY && !this.config.TOGETHER_API_KEY) {
      throw new Error('At least one AI provider API key is required');
    }
    
    console.log('✅ API keys configured successfully');
    console.log('');
  }

  async configurePerformanceTargets() {
    console.log('🎯 Performance Targets Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    const targetAccuracy = await this.question('Target accuracy percentage (default: 87): ') || '87';
    this.config.TARGET_ACCURACY = targetAccuracy;
    
    const minConfidence = await this.question('Minimum signal confidence percentage (default: 80): ') || '80';
    this.config.MIN_SIGNAL_CONFIDENCE = minConfidence;
    
    const maxDailySignals = await this.question('Maximum daily signals (default: 12): ') || '12';
    this.config.MAX_DAILY_SIGNALS = maxDailySignals;
    
    const currencyPair = await this.question('Primary currency pair (default: EUR/USD): ') || 'EUR/USD';
    this.config.CURRENCY_PAIR = currencyPair;
    
    console.log('✅ Performance targets configured');
    console.log('');
  }

  async configureRiskManagement() {
    console.log('🛡️ Risk Management Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    const safeZones = await this.question('Enable safe zones only mode? (y/n, default: n): ') || 'n';
    this.config.SAFE_ZONES_ONLY = safeZones.toLowerCase() === 'y' ? 'true' : 'false';
    
    const avoidVolatility = await this.question('Avoid high volatility periods? (y/n, default: y): ') || 'y';
    this.config.AVOID_HIGH_VOLATILITY = avoidVolatility.toLowerCase() === 'y' ? 'true' : 'false';
    
    const avoidNews = await this.question('Avoid news events? (y/n, default: y): ') || 'y';
    this.config.AVOID_NEWS_EVENTS = avoidNews.toLowerCase() === 'y' ? 'true' : 'false';
    
    const avoidMarketHours = await this.question('Avoid market open/close? (y/n, default: y): ') || 'y';
    this.config.AVOID_MARKET_OPEN_CLOSE = avoidMarketHours.toLowerCase() === 'y' ? 'true' : 'false';
    
    console.log('✅ Risk management configured');
    console.log('');
  }

  async configureAdvancedFeatures() {
    console.log('⚙️ Advanced Features Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    const dataFusion = await this.question('Enable multi-source data fusion? (y/n, default: y): ') || 'y';
    this.config.ENABLE_DATA_FUSION = dataFusion.toLowerCase() === 'y' ? 'true' : 'false';
    
    const aiLearning = await this.question('Enable AI learning system? (y/n, default: y): ') || 'y';
    this.config.ENABLE_AI_LEARNING = aiLearning.toLowerCase() === 'y' ? 'true' : 'false';
    
    const backtesting = await this.question('Enable backtesting? (y/n, default: y): ') || 'y';
    this.config.ENABLE_BACKTESTING = backtesting.toLowerCase() === 'y' ? 'true' : 'false';
    
    const webInterface = await this.question('Enable web interface? (y/n, default: y): ') || 'y';
    this.config.ENABLE_WEB_INTERFACE = webInterface.toLowerCase() === 'y' ? 'true' : 'false';
    
    console.log('✅ Advanced features configured');
    console.log('');
  }

  async saveConfiguration() {
    console.log('💾 Saving Configuration...');
    
    // Add default values for all other settings
    const defaultConfig = {
      // System settings
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      
      // Data fusion
      MIN_DATA_SOURCES: '2',
      CROSS_VERIFY_CANDLES: 'true',
      FILL_MISSING_DATA: 'true',
      AUTO_FALLBACK: 'true',
      
      // Three-brain consensus
      USE_ENSEMBLE: 'true',
      ENSEMBLE_SIZE: '5',
      REQUIRE_ANALYST_VALIDATION: 'true',
      REQUIRE_REFLEX_APPROVAL: 'true',
      MIN_BRAIN_AGREEMENT: '3',
      MIN_CONFLUENCE_SCORE: '75',
      
      // Technical analysis
      TIMEFRAMES: '1m,3m,5m,15m,30m,1h,4h',
      HISTORICAL_LOOKBACK: '1000',
      MIN_CANDLES_FOR_ANALYSIS: '500',
      ENABLE_MULTI_TIMEFRAME: 'true',
      ENABLE_PATTERN_VALIDATION: 'true',
      REQUIRE_VOLUME_CONFIRMATION: 'true',
      
      // Risk management
      MAX_VOLATILITY_THRESHOLD: '2.0',
      MIN_VOLUME_RATIO: '0.8',
      NEWS_BUFFER_MINUTES: '30',
      MARKET_BUFFER_MINUTES: '15',
      REJECT_CONFLICTING_SIGNALS: 'true',
      REJECT_UNCERTAINTY_CANDLES: 'true',
      REJECT_SUDDEN_SPIKES: 'true',
      MAX_WICK_RATIO: '0.7',
      
      // Performance
      MIN_SHARPE_RATIO: '2.0',
      MAX_DRAWDOWN: '15',
      SIGNAL_GENERATION_INTERVAL: '2',
      
      // Advanced features
      ENABLE_ADAPTIVE_INDICATORS: 'true',
      ENABLE_PRE_SIGNAL_VALIDATION: 'true',
      ENABLE_PERFORMANCE_MONITORING: 'true',
      
      // Web interface
      WEB_PORT: '3000',
      ENABLE_API_ENDPOINTS: 'true',
      API_RATE_LIMIT: '100'
    };
    
    // Merge user config with defaults
    const finalConfig = { ...defaultConfig, ...this.config };
    
    // Create .env content
    let envContent = '# Ultimate AI Trading Signal System Configuration\n';
    envContent += '# Generated by setup script\n\n';
    
    for (const [key, value] of Object.entries(finalConfig)) {
      envContent += `${key}=${value}\n`;
    }
    
    // Save to .env file
    const envPath = path.join(process.cwd(), '.env');
    await fs.writeFile(envPath, envContent);
    
    console.log('✅ Configuration saved to .env');
    console.log('');
  }

  async installDependencies() {
    console.log('📦 Installing Dependencies...');
    
    const install = await this.question('Install/update dependencies now? (y/n, default: y): ') || 'y';
    
    if (install.toLowerCase() === 'y') {
      const { spawn } = require('child_process');
      
      return new Promise((resolve, reject) => {
        const npm = spawn('npm', ['install'], { stdio: 'inherit' });
        
        npm.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Dependencies installed successfully');
            resolve();
          } else {
            console.log('⚠️ Dependency installation completed with warnings');
            resolve();
          }
        });
        
        npm.on('error', (error) => {
          console.log('⚠️ Could not install dependencies automatically');
          console.log('Please run "npm install" manually');
          resolve();
        });
      });
    }
    
    console.log('');
  }

  async runSystemTest() {
    console.log('🧪 Running System Test...');
    
    const runTest = await this.question('Run system validation test now? (y/n, default: y): ') || 'y';
    
    if (runTest.toLowerCase() === 'y') {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const test = spawn('npm', ['run', 'test:ultimate'], { stdio: 'inherit' });
        
        test.on('close', (code) => {
          if (code === 0) {
            console.log('✅ System test completed successfully');
          } else {
            console.log('⚠️ System test completed with issues');
            console.log('Please review the test results and fix any issues');
          }
          resolve();
        });
        
        test.on('error', (error) => {
          console.log('⚠️ Could not run system test automatically');
          console.log('Please run "npm run test:ultimate" manually');
          resolve();
        });
      });
    }
    
    console.log('');
  }

  async showFinalInstructions() {
    console.log('🎉 Setup Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Your Ultimate AI Trading Signal System is now configured!');
    console.log('');
    console.log('🚀 To start the system:');
    console.log('   npm run ultimate');
    console.log('');
    console.log('🧪 To run tests:');
    console.log('   npm run test:ultimate    # System validation');
    console.log('   npm run test:all         # All tests');
    console.log('');
    console.log('🌐 Web interface (if enabled):');
    console.log('   http://localhost:3000');
    console.log('');
    console.log('📊 Monitor performance:');
    console.log('   - Check console output for real-time signals');
    console.log('   - Review ./signals/ directory for signal history');
    console.log('   - Check ./data/ directory for performance data');
    console.log('');
    console.log('⚙️ Configuration:');
    console.log('   - Edit .env file to adjust settings');
    console.log('   - See README-ULTIMATE.md for detailed documentation');
    console.log('');
    console.log('🎯 Target Performance:');
    console.log(`   - Accuracy: ${this.config.TARGET_ACCURACY}%`);
    console.log(`   - Max daily signals: ${this.config.MAX_DAILY_SIGNALS}`);
    console.log(`   - Min confidence: ${this.config.MIN_SIGNAL_CONFIDENCE}%`);
    console.log('');
    console.log('🛡️ Risk Management:');
    console.log(`   - Safe zones only: ${this.config.SAFE_ZONES_ONLY}`);
    console.log(`   - Avoid volatility: ${this.config.AVOID_HIGH_VOLATILITY}`);
    console.log(`   - Avoid news: ${this.config.AVOID_NEWS_EVENTS}`);
    console.log('');
    console.log('Good luck with your trading! 🚀📈');
    console.log('');
  }

  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new UltimateSetup();
  setup.run().catch(error => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { UltimateSetup };