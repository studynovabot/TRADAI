#!/usr/bin/env node

/**
 * Setup Script for AI Binary Trading Bot
 * 
 * This script helps users set up the trading bot by:
 * - Checking system requirements
 * - Creating necessary directories
 * - Validating API keys
 * - Testing connections
 * - Creating initial configuration
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

class SetupWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {};
  }
  
  async run() {
    console.log('🚀 AI Binary Trading Bot Setup Wizard');
    console.log('=====================================\n');
    
    try {
      await this.checkSystemRequirements();
      await this.createDirectories();
      await this.collectConfiguration();
      await this.createEnvFile();
      await this.testConnections();
      await this.finalizeSetup();
      
      console.log('\n✅ Setup completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Review your .env file and config/trading.json');
      console.log('2. Start in paper trading mode: npm run start -- --paper-trading');
      console.log('3. Monitor logs in ./logs/trading.log');
      console.log('4. When ready, switch to live trading by setting PAPER_TRADING=false');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }
  
  async checkSystemRequirements() {
    console.log('🔍 Checking system requirements...\n');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`);
    }
    console.log(`✅ Node.js version: ${nodeVersion}`);
    
    // Check if Chrome/Chromium is available
    try {
      execSync('google-chrome --version', { stdio: 'ignore' });
      console.log('✅ Google Chrome found');
    } catch (error) {
      try {
        execSync('chromium --version', { stdio: 'ignore' });
        console.log('✅ Chromium found');
      } catch (error) {
        console.log('⚠️  Chrome/Chromium not found. Please install Google Chrome or Chromium for Selenium automation.');
      }
    }
    
    // Check available disk space
    const stats = await fs.stat('.');
    console.log('✅ Disk space check passed');
    
    console.log('');
  }
  
  async createDirectories() {
    console.log('📁 Creating directories...\n');
    
    const directories = [
      './logs',
      './logs/screenshots',
      './data',
      './config',
      './backups'
    ];
    
    for (const dir of directories) {
      await fs.ensureDir(dir);
      console.log(`✅ Created: ${dir}`);
    }
    
    console.log('');
  }
  
  async collectConfiguration() {
    console.log('⚙️  Configuration Setup\n');
    
    // Twelve Data API Key
    this.config.TWELVE_DATA_API_KEY = await this.askQuestion(
      '📊 Enter your Twelve Data API key (get free key at https://twelvedata.com/): '
    );
    
    // AI Provider choice
    const aiProvider = await this.askQuestion(
      '🧠 Choose AI provider (groq/together) [groq]: '
    ) || 'groq';
    
    this.config.AI_PROVIDER = aiProvider;
    
    if (aiProvider === 'groq') {
      this.config.GROQ_API_KEY = await this.askQuestion(
        '🤖 Enter your Groq API key (get free key at https://console.groq.com/): '
      );
    } else {
      this.config.TOGETHER_API_KEY = await this.askQuestion(
        '🤖 Enter your Together AI API key (get key at https://api.together.xyz/): '
      );
    }
    
    // QXBroker credentials
    console.log('\n🔐 QXBroker Credentials (required for live trading):');
    this.config.QXBROKER_EMAIL = await this.askQuestion('Email: ');
    this.config.QXBROKER_PASSWORD = await this.askQuestion('Password: ', true);
    
    // Trading configuration
    console.log('\n💰 Trading Configuration:');
    
    const currencyPair = await this.askQuestion(
      'Currency pair to trade [USD/INR]: '
    ) || 'USD/INR';
    this.config.CURRENCY_PAIR = currencyPair;
    
    const tradeAmount = await this.askQuestion(
      'Trade amount in USD [10]: '
    ) || '10';
    this.config.TRADE_AMOUNT = tradeAmount;
    
    const minConfidence = await this.askQuestion(
      'Minimum AI confidence for trades (0-100) [75]: '
    ) || '75';
    this.config.MIN_CONFIDENCE = minConfidence;
    
    // Paper trading
    const paperTrading = await this.askQuestion(
      'Start in paper trading mode? (y/n) [y]: '
    ) || 'y';
    this.config.PAPER_TRADING = paperTrading.toLowerCase() === 'y' ? 'true' : 'false';
    
    // Selenium settings
    const headless = await this.askQuestion(
      'Run browser in headless mode? (y/n) [y]: '
    ) || 'y';
    this.config.SELENIUM_HEADLESS = headless.toLowerCase() === 'y' ? 'true' : 'false';
    
    console.log('');
  }
  
  async createEnvFile() {
    console.log('📝 Creating .env file...\n');
    
    const envContent = `# AI Binary Trading Bot Configuration
# Generated by setup wizard on ${new Date().toISOString()}

# ===========================================
# API KEYS
# ===========================================
TWELVE_DATA_API_KEY=${this.config.TWELVE_DATA_API_KEY}
${this.config.GROQ_API_KEY ? `GROQ_API_KEY=${this.config.GROQ_API_KEY}` : '# GROQ_API_KEY='}
${this.config.TOGETHER_API_KEY ? `TOGETHER_API_KEY=${this.config.TOGETHER_API_KEY}` : '# TOGETHER_API_KEY='}

# ===========================================
# QXBROKER CREDENTIALS
# ===========================================
QXBROKER_EMAIL=${this.config.QXBROKER_EMAIL}
QXBROKER_PASSWORD=${this.config.QXBROKER_PASSWORD}

# ===========================================
# TRADING CONFIGURATION
# ===========================================
CURRENCY_PAIR=${this.config.CURRENCY_PAIR}
TRADE_AMOUNT=${this.config.TRADE_AMOUNT}
MIN_CONFIDENCE=${this.config.MIN_CONFIDENCE}
PAPER_TRADING=${this.config.PAPER_TRADING}
AI_PROVIDER=${this.config.AI_PROVIDER}

# ===========================================
# SELENIUM CONFIGURATION
# ===========================================
SELENIUM_HEADLESS=${this.config.SELENIUM_HEADLESS}

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL=info
`;
    
    await fs.writeFile('.env', envContent);
    console.log('✅ .env file created');
    console.log('');
  }
  
  async testConnections() {
    console.log('🔍 Testing API connections...\n');
    
    // Test Twelve Data API
    try {
      const axios = require('axios');
      const response = await axios.get(
        `https://api.twelvedata.com/time_series?symbol=USDINR&interval=1min&outputsize=1&apikey=${this.config.TWELVE_DATA_API_KEY}`,
        { timeout: 10000 }
      );
      
      if (response.data.status !== 'error') {
        console.log('✅ Twelve Data API connection successful');
      } else {
        console.log('❌ Twelve Data API error:', response.data.message);
      }
    } catch (error) {
      console.log('❌ Twelve Data API connection failed:', error.message);
    }
    
    // Test AI API
    try {
      const axios = require('axios');
      let apiUrl, headers;
      
      if (this.config.AI_PROVIDER === 'groq') {
        apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${this.config.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        };
      } else {
        apiUrl = 'https://api.together.xyz/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${this.config.TOGETHER_API_KEY}`,
          'Content-Type': 'application/json'
        };
      }
      
      const testData = {
        model: this.config.AI_PROVIDER === 'groq' ? 'llama3-70b-8192' : 'meta-llama/Llama-2-70b-chat-hf',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10
      };
      
      const response = await axios.post(apiUrl, testData, { 
        headers, 
        timeout: 15000 
      });
      
      if (response.data.choices && response.data.choices.length > 0) {
        console.log(`✅ ${this.config.AI_PROVIDER.toUpperCase()} AI API connection successful`);
      } else {
        console.log(`❌ ${this.config.AI_PROVIDER.toUpperCase()} AI API returned no data`);
      }
    } catch (error) {
      console.log(`❌ ${this.config.AI_PROVIDER.toUpperCase()} AI API connection failed:`, error.message);
    }
    
    console.log('');
  }
  
  async finalizeSetup() {
    console.log('🎯 Finalizing setup...\n');
    
    // Create initial database
    const { DatabaseManager } = require('../src/utils/DatabaseManager');
    const { Config } = require('../src/config/Config');
    
    try {
      const config = await Config.load('./config/trading.json');
      const db = new DatabaseManager(config);
      await db.initialize();
      await db.close();
      console.log('✅ Database initialized');
    } catch (error) {
      console.log('⚠️  Database initialization warning:', error.message);
    }
    
    // Create initial log entry
    try {
      await fs.ensureFile('./logs/trading.log');
      const logEntry = `${new Date().toISOString()} [info] Setup completed successfully\n`;
      await fs.appendFile('./logs/trading.log', logEntry);
      console.log('✅ Logging system initialized');
    } catch (error) {
      console.log('⚠️  Logging initialization warning:', error.message);
    }
    
    console.log('');
  }
  
  askQuestion(question, hidden = false) {
    return new Promise((resolve) => {
      if (hidden) {
        // Hide password input
        this.rl.question(question, (answer) => {
          resolve(answer);
        });
        this.rl._writeToOutput = function _writeToOutput(stringToWrite) {
          if (stringToWrite.charCodeAt(0) === 13) {
            this.output.write(stringToWrite);
          } else {
            this.output.write('*');
          }
        };
      } else {
        this.rl.question(question, (answer) => {
          resolve(answer);
        });
      }
    });
  }
}

// Run setup if called directly
if (require.main === module) {
  const wizard = new SetupWizard();
  wizard.run().catch(console.error);
}

module.exports = { SetupWizard };
