#!/usr/bin/env node

/**
 * AI Binary Trading Bot - One-Click Installer
 * 
 * This script provides a complete installation and setup process:
 * - Installs dependencies
 * - Runs setup wizard
 * - Tests system components
 * - Provides quick start instructions
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class Installer {
  constructor() {
    this.steps = [
      'checkNodeVersion',
      'installDependencies', 
      'runSetupWizard',
      'testSystem',
      'showQuickStart'
    ];
    this.currentStep = 0;
  }
  
  async run() {
    console.log('🚀 AI Binary Trading Bot - One-Click Installer');
    console.log('==============================================\n');
    
    console.log('This installer will:');
    console.log('✅ Check system requirements');
    console.log('✅ Install all dependencies');
    console.log('✅ Run setup wizard for configuration');
    console.log('✅ Test all system components');
    console.log('✅ Provide quick start instructions\n');
    
    try {
      for (const step of this.steps) {
        await this[step]();
        this.currentStep++;
      }
      
      console.log('\n🎉 Installation completed successfully!');
      console.log('Your AI Binary Trading Bot is ready to use.\n');
      
    } catch (error) {
      console.error(`\n❌ Installation failed at step ${this.currentStep + 1}:`, error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Ensure you have Node.js 18+ installed');
      console.log('2. Check your internet connection');
      console.log('3. Run with administrator/sudo privileges if needed');
      console.log('4. Check the README_AI_TRADING_BOT.md for manual setup');
      process.exit(1);
    }
  }
  
  async checkNodeVersion() {
    console.log('🔍 Step 1: Checking Node.js version...');
    
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}. Please upgrade Node.js.`);
    }
    
    console.log(`✅ Node.js version: ${nodeVersion} (compatible)\n`);
  }
  
  async installDependencies() {
    console.log('📦 Step 2: Installing dependencies...');
    console.log('This may take a few minutes...\n');
    
    try {
      // Check if package.json exists
      if (!await fs.pathExists('./package.json')) {
        throw new Error('package.json not found. Please ensure you are in the correct directory.');
      }
      
      // Install dependencies
      console.log('Installing Node.js packages...');
      execSync('npm install', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Dependencies installed successfully\n');
      
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }
  
  async runSetupWizard() {
    console.log('⚙️ Step 3: Running setup wizard...');
    console.log('Please follow the prompts to configure your trading bot.\n');
    
    try {
      // Check if setup script exists
      if (!await fs.pathExists('./scripts/setup.js')) {
        throw new Error('Setup script not found');
      }
      
      // Run setup wizard
      execSync('node scripts/setup.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ Setup wizard completed\n');
      
    } catch (error) {
      throw new Error(`Setup wizard failed: ${error.message}`);
    }
  }
  
  async testSystem() {
    console.log('🧪 Step 4: Testing system components...');
    console.log('Running comprehensive system tests...\n');
    
    try {
      // Check if test script exists
      if (!await fs.pathExists('./scripts/test-system.js')) {
        console.log('⚠️ Test script not found, skipping system tests');
        return;
      }
      
      // Run system tests
      execSync('node scripts/test-system.js', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      console.log('\n✅ System tests completed\n');
      
    } catch (error) {
      console.log(`⚠️ System tests encountered issues: ${error.message}`);
      console.log('You can still proceed, but please review the test results.\n');
    }
  }
  
  async showQuickStart() {
    console.log('🎯 Step 5: Quick Start Instructions');
    console.log('==================================\n');
    
    console.log('Your AI Binary Trading Bot is now installed and configured!\n');
    
    console.log('📋 QUICK START COMMANDS:');
    console.log('------------------------');
    console.log('# Start in paper trading mode (RECOMMENDED FIRST)');
    console.log('npm start -- --paper-trading\n');
    
    console.log('# Start with specific currency pair');
    console.log('npm start -- --currency-pair USD/INR --paper-trading\n');
    
    console.log('# View real-time logs');
    console.log('tail -f logs/trading.log\n');
    
    console.log('# Run system tests anytime');
    console.log('node scripts/test-system.js\n');
    
    console.log('📊 MONITORING:');
    console.log('---------------');
    console.log('• Logs: ./logs/trading.log');
    console.log('• Screenshots: ./logs/screenshots/');
    console.log('• Database: ./data/trading.db');
    console.log('• Configuration: ./config/trading.json\n');
    
    console.log('⚠️ IMPORTANT SAFETY NOTES:');
    console.log('---------------------------');
    console.log('1. 🧪 ALWAYS start with paper trading first');
    console.log('2. 📊 Monitor performance for at least 1-2 weeks');
    console.log('3. 💰 Start with small amounts when going live');
    console.log('4. 📈 Target 60%+ win rate for profitability');
    console.log('5. 🛑 Set stop-loss limits and respect them\n');
    
    console.log('🔧 CONFIGURATION FILES:');
    console.log('------------------------');
    console.log('• .env - API keys and credentials');
    console.log('• config/trading.json - Trading parameters');
    console.log('• Both files can be edited to adjust settings\n');
    
    console.log('📚 NEXT STEPS:');
    console.log('---------------');
    console.log('1. Review your configuration in .env and config/trading.json');
    console.log('2. Start paper trading: npm start -- --paper-trading');
    console.log('3. Monitor logs and performance metrics');
    console.log('4. Adjust parameters based on results');
    console.log('5. When satisfied with paper trading, switch to live mode\n');
    
    console.log('🆘 SUPPORT:');
    console.log('------------');
    console.log('• Read README_AI_TRADING_BOT.md for detailed documentation');
    console.log('• Check logs/error.log for error details');
    console.log('• Ensure all API keys are valid and have sufficient quotas');
    console.log('• Test individual components if issues arise\n');
    
    console.log('🎉 Happy Trading! Remember: Trade responsibly and never risk more than you can afford to lose.');
  }
}

// ASCII Art Banner
function showBanner() {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║        🤖 AI BINARY TRADING BOT INSTALLER 🤖             ║
  ║                                                           ║
  ║     Professional-grade AI-powered trading automation      ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

// Run installer if called directly
if (require.main === module) {
  showBanner();
  const installer = new Installer();
  installer.run().catch(console.error);
}

module.exports = { Installer };
