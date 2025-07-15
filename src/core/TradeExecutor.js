/**
 * TradeExecutor - Selenium-based QXBroker Automation
 * 
 * Handles automated trade execution on QXBroker platform
 * using Selenium WebDriver with comprehensive error handling
 */

const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs-extra');
const path = require('path');
const { Logger } = require('../utils/Logger');

class TradeExecutor {
  constructor(config) {
    this.config = config;
    this.logger = Logger.getInstanceSync();
    this.driver = null;
    this.isLoggedIn = false;
    this.lastTradeTime = 0;
    this.tradeCount = 0;
    
    // Selectors for QXBroker (these may need updates based on site changes)
    this.selectors = {
      loginEmail: 'input[type="email"], input[name="email"], #email',
      loginPassword: 'input[type="password"], input[name="password"], #password',
      loginButton: 'button[type="submit"], .login-btn, .btn-login',
      currencyPairSelect: '.asset-select, .currency-select',
      tradeAmountInput: '.amount-input, input[name="amount"]',
      callButton: '.call-btn, .up-btn, .higher-btn, [data-direction="up"]',
      putButton: '.put-btn, .down-btn, .lower-btn, [data-direction="down"]',
      timeSelect: '.time-select, .expiry-select',
      confirmButton: '.confirm-btn, .execute-btn',
      balanceDisplay: '.balance, .account-balance'
    };
    
    this.logger.info('💰 TradeExecutor initialized');
  }
  
  /**
   * Initialize Signal-Only Mode (Selenium disabled)
   */
  async initialize() {
    try {
      this.logger.info('🎯 Initializing Signal-Only Mode (Auto-trading disabled)...');

      // Signal-only mode - no Selenium initialization needed
      this.isSignalMode = true;
      this.isLoggedIn = false; // Not needed for signals

      this.logger.info('✅ Signal-Only Mode initialized - Ready to generate trade signals');

    } catch (error) {
      this.logger.logError('Signal Mode Initialization', error);
      throw error;
    }
  }
  
  /**
   * Login to QXBroker
   */
  async login() {
    try {
      this.logger.info('🔐 Logging into QXBroker...');
      
      // Navigate to QXBroker
      await this.driver.get(this.config.qxBrokerUrl);
      
      // Wait for page load
      await this.driver.sleep(3000);
      
      // Take screenshot for debugging
      await this.takeScreenshot('login_page');
      
      // Find and fill email
      const emailField = await this.findElementWithMultipleSelectors(this.selectors.loginEmail);
      await emailField.clear();
      await emailField.sendKeys(this.config.qxBrokerEmail);
      
      // Find and fill password
      const passwordField = await this.findElementWithMultipleSelectors(this.selectors.loginPassword);
      await passwordField.clear();
      await passwordField.sendKeys(this.config.qxBrokerPassword);
      
      // Click login button
      const loginButton = await this.findElementWithMultipleSelectors(this.selectors.loginButton);
      await loginButton.click();
      
      // Wait for login to complete
      await this.driver.sleep(5000);
      
      // Verify login success (check for balance or trading interface)
      try {
        await this.driver.wait(until.elementLocated(By.css(this.selectors.balanceDisplay)), 10000);
        this.isLoggedIn = true;
        this.logger.info('✅ Successfully logged into QXBroker');
        
        await this.takeScreenshot('login_success');
        
      } catch (error) {
        await this.takeScreenshot('login_failed');
        throw new Error('Login verification failed - could not find balance display');
      }
      
    } catch (error) {
      this.logger.logError('QXBroker Login', error);
      await this.takeScreenshot('login_error');
      throw error;
    }
  }
  
  /**
   * Generate Trade Signal (Signal-Only Mode)
   */
  async executeTrade(tradeParams) {
    try {
      this.logger.info('🎯 Generating Trade Signal...');

      const signalTime = new Date();
      const signalId = `SIGNAL_${Date.now()}`;

      // Generate comprehensive trade signal
      const tradeSignal = {
        signalId: signalId,
        timestamp: signalTime.toISOString(),
        currencyPair: tradeParams.currencyPair,
        direction: tradeParams.direction,
        confidence: tradeParams.confidence,
        reason: tradeParams.reason,
        amount: tradeParams.amount,
        duration: tradeParams.duration,
        technicalAnalysis: tradeParams.technicalAnalysis,
        marketConditions: tradeParams.marketConditions
      };

      // Log the comprehensive signal
      this.logger.logSignal(tradeSignal);

      // Update counters
      this.lastTradeTime = Date.now();
      this.tradeCount++;

      return {
        success: true,
        signalId: signalId,
        signal: tradeSignal,
        status: 'SIGNAL_GENERATED'
      };

    } catch (error) {
      this.logger.logError('Signal Generation', error, tradeParams);

      return {
        success: false,
        error: error.message,
        status: 'SIGNAL_FAILED'
      };
    }
  }
  
  /**
   * Select currency pair
   */
  async selectCurrencyPair(currencyPair) {
    try {
      this.logger.debug(`🎯 Selecting currency pair: ${currencyPair}`);
      
      const pairSelector = await this.findElementWithMultipleSelectors(this.selectors.currencyPairSelect);
      await pairSelector.click();
      
      // Wait for dropdown to open
      await this.driver.sleep(1000);
      
      // Find the specific currency pair option
      const pairOption = await this.driver.findElement(By.xpath(`//*[contains(text(), '${currencyPair}')]`));
      await pairOption.click();
      
      await this.driver.sleep(1000);
      
    } catch (error) {
      throw new Error(`Failed to select currency pair ${currencyPair}: ${error.message}`);
    }
  }
  
  /**
   * Set trade amount
   */
  async setTradeAmount(amount) {
    try {
      this.logger.debug(`💵 Setting trade amount: $${amount}`);
      
      const amountInput = await this.findElementWithMultipleSelectors(this.selectors.tradeAmountInput);
      await amountInput.clear();
      await amountInput.sendKeys(amount.toString());
      
      await this.driver.sleep(500);
      
    } catch (error) {
      throw new Error(`Failed to set trade amount: ${error.message}`);
    }
  }
  
  /**
   * Set trade duration
   */
  async setTradeDuration(duration) {
    try {
      this.logger.debug(`⏰ Setting trade duration: ${duration} minutes`);
      
      const timeSelector = await this.findElementWithMultipleSelectors(this.selectors.timeSelect);
      await timeSelector.click();
      
      await this.driver.sleep(1000);
      
      // Find 5-minute option
      const durationOption = await this.driver.findElement(By.xpath(`//*[contains(text(), '${duration}') and contains(text(), 'min')]`));
      await durationOption.click();
      
      await this.driver.sleep(500);
      
    } catch (error) {
      throw new Error(`Failed to set trade duration: ${error.message}`);
    }
  }
  
  /**
   * Execute trade direction (BUY/SELL)
   */
  async executeTradeDirection(direction) {
    try {
      this.logger.debug(`📈 Executing ${direction} trade`);
      
      let buttonSelector;
      if (direction === 'BUY') {
        buttonSelector = this.selectors.callButton;
      } else if (direction === 'SELL') {
        buttonSelector = this.selectors.putButton;
      } else {
        throw new Error(`Invalid trade direction: ${direction}`);
      }
      
      const tradeButton = await this.findElementWithMultipleSelectors(buttonSelector);
      await tradeButton.click();
      
      await this.driver.sleep(1000);
      
    } catch (error) {
      throw new Error(`Failed to execute ${direction} trade: ${error.message}`);
    }
  }
  
  /**
   * Confirm trade execution
   */
  async confirmTrade() {
    try {
      this.logger.debug('✅ Confirming trade...');
      
      // Look for confirmation button
      try {
        const confirmButton = await this.findElementWithMultipleSelectors(this.selectors.confirmButton);
        await confirmButton.click();
        await this.driver.sleep(2000);
      } catch (error) {
        // Some platforms auto-execute without confirmation
        this.logger.debug('No confirmation button found - trade may be auto-executed');
      }
      
      // Take screenshot of trade confirmation
      await this.takeScreenshot('trade_confirmed');
      
      // Generate trade ID (timestamp-based)
      const tradeId = `QX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        tradeId: tradeId,
        timestamp: new Date()
      };
      
    } catch (error) {
      throw new Error(`Failed to confirm trade: ${error.message}`);
    }
  }
  
  /**
   * Find element using multiple selectors
   */
  async findElementWithMultipleSelectors(selectors) {
    const selectorArray = selectors.split(', ');
    
    for (const selector of selectorArray) {
      try {
        const element = await this.driver.wait(until.elementLocated(By.css(selector.trim())), 5000);
        return element;
      } catch (error) {
        // Continue to next selector
      }
    }
    
    throw new Error(`Could not find element with any of these selectors: ${selectors}`);
  }
  
  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name) {
    if (!this.config.selenium.screenshotOnError && !name.includes('success')) {
      return;
    }
    
    try {
      const screenshot = await this.driver.takeScreenshot();
      const filename = `${name}_${Date.now()}.png`;
      const filepath = path.join(this.config.selenium.screenshotPath, filename);
      
      await fs.writeFile(filepath, screenshot, 'base64');
      this.logger.debug(`📸 Screenshot saved: ${filepath}`);
      
    } catch (error) {
      this.logger.warn('Failed to take screenshot:', error.message);
    }
  }
  
  /**
   * Get account balance
   */
  async getBalance() {
    try {
      const balanceElement = await this.findElementWithMultipleSelectors(this.selectors.balanceDisplay);
      const balanceText = await balanceElement.getText();
      
      // Extract numeric value from balance text
      const balanceMatch = balanceText.match(/[\d,]+\.?\d*/);
      const balance = balanceMatch ? parseFloat(balanceMatch[0].replace(',', '')) : 0;
      
      return balance;
      
    } catch (error) {
      this.logger.warn('Failed to get balance:', error.message);
      return 0;
    }
  }
  
  /**
   * Cleanup and close browser
   */
  async cleanup() {
    try {
      if (this.driver) {
        this.logger.info('🧹 Cleaning up Selenium WebDriver...');
        await this.driver.quit();
        this.driver = null;
        this.isLoggedIn = false;
      }
    } catch (error) {
      this.logger.warn('Error during cleanup:', error.message);
    }
  }
  
  /**
   * Get execution statistics
   */
  getStats() {
    return {
      isLoggedIn: this.isLoggedIn,
      tradeCount: this.tradeCount,
      lastTradeTime: this.lastTradeTime
    };
  }
}

module.exports = { TradeExecutor };
