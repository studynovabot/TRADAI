/**
 * Trading System Configuration
 * 
 * This module defines the configuration for the 3-layer AI trading system,
 * including API keys, model settings, and trading parameters.
 */

class TradingConfig {
  constructor() {
    // API Keys (load from environment variables)
    this.twelveDataApiKey = process.env.TWELVE_DATA_API_KEY || '';
    this.groqApiKey = process.env.GROQ_API_KEY || '';
    this.togetherApiKey = process.env.TOGETHER_API_KEY || '';
    this.fireworksApiKey = process.env.FIREWORKS_API_KEY || '';
    this.deepinfraApiKey = process.env.DEEPINFRA_API_KEY || '';
    
    // Default trading parameters
    this.currencyPair = 'EUR/USD';
    this.tradeDuration = '5M';
    this.timeframes = ['1m', '3m', '5m', '15m', '30m', '1h'];
    
    // AI model configuration
    this.aiProvider = 'groq'; // Options: 'groq', 'together', 'fireworks', 'deepinfra'
    this.quantModels = {
      xgboost: true,
      lightgbm: true,
      neuralnet: true
    };
    
    // System parameters
    this.maxDailyTrades = 50;
    this.maxConsecutiveLosses = 3;
    this.signalConfidenceThreshold = 0.7;
    this.riskThreshold = 0.6;
    this.confluenceThreshold = 50;
    
    // Logging configuration
    this.logLevel = 'info'; // Options: 'debug', 'info', 'warn', 'error'
    this.saveSignals = true;
    this.savePerformanceMetrics = true;
    
    // Feature weights
    this.featureWeights = {
      technicalIndicators: 0.3,
      candlestickPatterns: 0.2,
      volumeAnalysis: 0.2,
      marketStructure: 0.15,
      multiTimeframe: 0.15
    };
  }
  
  /**
   * Load configuration from environment variables or file
   */
  loadConfig() {
    try {
      // Load from environment variables
      this.twelveDataApiKey = process.env.TWELVE_DATA_API_KEY || this.twelveDataApiKey;
      this.groqApiKey = process.env.GROQ_API_KEY || this.groqApiKey;
      this.togetherApiKey = process.env.TOGETHER_API_KEY || this.togetherApiKey;
      this.fireworksApiKey = process.env.FIREWORKS_API_KEY || this.fireworksApiKey;
      this.deepinfraApiKey = process.env.DEEPINFRA_API_KEY || this.deepinfraApiKey;
      
      // Load other settings from environment if available
      this.currencyPair = process.env.DEFAULT_CURRENCY_PAIR || this.currencyPair;
      this.tradeDuration = process.env.DEFAULT_TRADE_DURATION || this.tradeDuration;
      this.logLevel = process.env.LOG_LEVEL || this.logLevel;
      
      return true;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return false;
    }
  }
  
  /**
   * Get configuration for a specific component
   */
  getComponentConfig(component) {
    switch (component) {
      case 'quantBrain':
        return {
          models: this.quantModels,
          timeframes: this.timeframes,
          featureWeights: this.featureWeights
        };
        
      case 'analystBrain':
        return {
          aiProvider: this.aiProvider,
          groqApiKey: this.groqApiKey,
          togetherApiKey: this.togetherApiKey,
          fireworksApiKey: this.fireworksApiKey,
          deepinfraApiKey: this.deepinfraApiKey
        };
        
      case 'reflexBrain':
        return {
          groqApiKey: this.groqApiKey,
          maxDailyTrades: this.maxDailyTrades,
          maxConsecutiveLosses: this.maxConsecutiveLosses,
          signalConfidenceThreshold: this.signalConfidenceThreshold,
          riskThreshold: this.riskThreshold,
          confluenceThreshold: this.confluenceThreshold
        };
        
      case 'marketData':
        return {
          twelveDataApiKey: this.twelveDataApiKey,
          currencyPair: this.currencyPair,
          timeframes: this.timeframes
        };
        
      default:
        return { ...this };
    }
  }
  
  /**
   * Validate configuration
   */
  validateConfig() {
    const issues = [];
    
    if (!this.twelveDataApiKey) {
      issues.push('Missing Twelve Data API key');
    }
    
    if (!this.groqApiKey && !this.togetherApiKey && !this.fireworksApiKey && !this.deepinfraApiKey) {
      issues.push('No AI provider API keys configured');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Create singleton instance
const config = new TradingConfig();
config.loadConfig();

module.exports = { TradingConfig, config };