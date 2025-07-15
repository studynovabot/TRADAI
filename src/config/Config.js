/**
 * Configuration Management System
 * 
 * Handles loading and validation of configuration from files and environment variables
 */

const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

class Config {
  static async load(configPath = './config/trading.json') {
    const config = {
      // Trading Configuration
      currencyPair: process.env.CURRENCY_PAIR || 'USD/INR',
      tradeAmount: parseFloat(process.env.TRADE_AMOUNT) || 10,
      minConfidence: parseFloat(process.env.MIN_CONFIDENCE) || 75,
      paperTrading: process.env.PAPER_TRADING === 'true',
      
      // Supported Currency Pairs
      supportedPairs: [
        'USD/BRL', 'USD/INR', 'USD/PKR', 'USD/MXN', 
        'USD/ARS', 'USD/EGP', 'USD/BDT', 'USD/DZD'
      ],
      
      // API Configuration
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
      groqApiKey: process.env.GROQ_API_KEY,
      togetherApiKey: process.env.TOGETHER_API_KEY,
      fireworksApiKey: process.env.FIREWORKS_API_KEY,
      deepinfraApiKey: process.env.DEEPINFRA_API_KEY,
      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      aiProvider: process.env.AI_PROVIDER || 'fireworks', // 'groq', 'together', 'fireworks', 'deepinfra'

      // AI Enhancement Configuration
      useEnsemble: process.env.USE_ENSEMBLE !== 'false', // Default to true
      ensembleSize: parseInt(process.env.ENSEMBLE_SIZE) || 5,
      consensusThreshold: parseFloat(process.env.CONSENSUS_THRESHOLD) || 0.6,

      // Dual Model Validation Configuration
      useDualModel: process.env.USE_DUAL_MODEL !== 'false', // Default to true
      dualModelAgreementThreshold: parseFloat(process.env.DUAL_MODEL_AGREEMENT) || 0.8,
      dualModelConfidenceDiff: parseInt(process.env.DUAL_MODEL_CONF_DIFF) || 20,

      // Rolling Backtest Configuration
      enableBacktest: process.env.ENABLE_BACKTEST !== 'false', // Default to true
      backtestDays: parseInt(process.env.BACKTEST_DAYS) || 7,
      backtestInterval: parseInt(process.env.BACKTEST_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours
      minAccuracyThreshold: parseFloat(process.env.MIN_ACCURACY_THRESHOLD) || 0.6,

      // News Sentiment Analysis Configuration
      enableNewsSentiment: process.env.ENABLE_NEWS_SENTIMENT !== 'false', // Default to true
      newsUpdateInterval: parseInt(process.env.NEWS_UPDATE_INTERVAL) || 30 * 60 * 1000, // 30 minutes
      maxNewsAge: parseInt(process.env.MAX_NEWS_AGE) || 24 * 60 * 60 * 1000, // 24 hours
      sentimentWeight: parseFloat(process.env.SENTIMENT_WEIGHT) || 0.2, // 20% weight

      // Session Context Analysis Configuration
      enableSessionAnalysis: process.env.ENABLE_SESSION_ANALYSIS !== 'false', // Default to true
      timezone: process.env.TIMEZONE || 'UTC',

      // Multi-Timeframe Analysis Configuration
      enableMultiTimeframe: process.env.ENABLE_MULTI_TIMEFRAME !== 'false', // Default to true
      reversalThreshold: parseFloat(process.env.REVERSAL_THRESHOLD) || 0.02, // 2% price change
      reversalLookback: parseInt(process.env.REVERSAL_LOOKBACK) || 5, // Look back 5 candles

      // Adaptive Indicators Configuration
      enableAdaptiveIndicators: process.env.ENABLE_ADAPTIVE_INDICATORS !== 'false', // Default to true
      optimizationWindow: parseInt(process.env.OPTIMIZATION_WINDOW) || 50, // Number of candles for optimization
      reoptimizationInterval: parseInt(process.env.REOPTIMIZATION_INTERVAL) || 24 * 60 * 60 * 1000, // 24 hours

      // Pre-Signal Validation Configuration
      enablePreSignalValidation: process.env.ENABLE_PRE_SIGNAL_VALIDATION !== 'false', // Default to true

      // Spread validation
      maxSpreadPercent: parseFloat(process.env.MAX_SPREAD_PERCENT) || 0.05, // 0.05% max spread
      maxSpreadPips: parseInt(process.env.MAX_SPREAD_PIPS) || 5, // 5 pips max
      spreadCheckEnabled: process.env.SPREAD_CHECK_ENABLED !== 'false',

      // Volatility validation
      minVolatility: parseFloat(process.env.MIN_VOLATILITY) || 0.01, // 0.01% minimum
      maxVolatility: parseFloat(process.env.MAX_VOLATILITY) || 2.0, // 2.0% maximum
      volatilityWindow: parseInt(process.env.VOLATILITY_WINDOW) || 10, // 10 candles
      volatilityCheckEnabled: process.env.VOLATILITY_CHECK_ENABLED !== 'false',

      // Liquidity validation
      minVolumeRatio: parseFloat(process.env.MIN_VOLUME_RATIO) || 0.5, // 50% of average
      volumeWindow: parseInt(process.env.VOLUME_WINDOW) || 20, // 20 candles
      minAbsoluteVolume: parseInt(process.env.MIN_ABSOLUTE_VOLUME) || 1000,
      liquidityCheckEnabled: process.env.LIQUIDITY_CHECK_ENABLED !== 'false',

      // Market hours validation
      checkMarketHours: process.env.CHECK_MARKET_HOURS !== 'false',
      allowedSessions: (process.env.ALLOWED_SESSIONS || 'asian,london,newyork').split(','),
      avoidNewsTime: process.env.AVOID_NEWS_TIME !== 'false',
      newsBufferMinutes: parseInt(process.env.NEWS_BUFFER_MINUTES) || 30,

      // Price action validation
      maxGapPercent: parseFloat(process.env.MAX_GAP_PERCENT) || 0.5, // 0.5% max gap
      minCandleBodyPercent: parseFloat(process.env.MIN_CANDLE_BODY_PERCENT) || 0.01, // 0.01% min body
      priceActionCheckEnabled: process.env.PRICE_ACTION_CHECK_ENABLED !== 'false',
      
      // QXBroker Configuration
      qxBrokerEmail: process.env.QXBROKER_EMAIL,
      qxBrokerPassword: process.env.QXBROKER_PASSWORD,
      qxBrokerUrl: 'https://qxbroker.com/en',
      
      // Technical Indicators Configuration
      indicators: {
        rsi: {
          period: 14
        },
        macd: {
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9
        },
        volatility: {
          period: 5
        }
      },
      
      // Trading Hours (UTC)
      tradingHours: {
        start: '00:00',
        end: '23:59',
        timezone: 'UTC'
      },
      
      // Risk Management
      maxDailyTrades: 50,
      maxConsecutiveLosses: 3,
      stopLossEnabled: true,
      
      // Selenium Configuration
      selenium: {
        headless: process.env.SELENIUM_HEADLESS !== 'false',
        timeout: 30000,
        screenshotOnError: true,
        screenshotPath: './logs/screenshots'
      },
      
      // Database Configuration
      database: {
        type: 'sqlite',
        path: './data/trading.db'
      },
      
      // Logging Configuration
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: './logs/trading.log',
        maxFiles: 10,
        maxSize: '10m'
      }
    };
    
    // Load additional config from file if exists
    try {
      if (await fs.pathExists(configPath)) {
        const fileConfig = await fs.readJson(configPath);
        Object.assign(config, fileConfig);
      }
    } catch (error) {
      console.warn(`Warning: Could not load config file ${configPath}:`, error.message);
    }
    
    // Validate configuration
    Config.validate(config);
    
    return config;
  }
  
  static validate(config) {
    const required = [
      'twelveDataApiKey',
      'qxBrokerEmail',
      'qxBrokerPassword'
    ];
    
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
    
    // Validate AI provider
    if (!config.groqApiKey && !config.togetherApiKey) {
      throw new Error('At least one AI provider API key is required (GROQ_API_KEY or TOGETHER_API_KEY)');
    }
    
    // Validate currency pair
    if (!config.supportedPairs.includes(config.currencyPair)) {
      throw new Error(`Unsupported currency pair: ${config.currencyPair}`);
    }
    
    // Validate trade amount
    if (config.tradeAmount <= 0) {
      throw new Error('Trade amount must be greater than 0');
    }
    
    // Validate confidence threshold
    if (config.minConfidence < 0 || config.minConfidence > 100) {
      throw new Error('Minimum confidence must be between 0 and 100');
    }
  }
  
  static async createDefaultConfig(configPath = './config/trading.json') {
    const defaultConfig = {
      currencyPair: 'USD/INR',
      tradeAmount: 10,
      minConfidence: 75,
      paperTrading: true,
      aiProvider: 'groq',
      maxDailyTrades: 50,
      maxConsecutiveLosses: 3,
      tradingHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'UTC'
      },
      indicators: {
        rsi: { period: 14 },
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        volatility: { period: 5 }
      }
    };
    
    await fs.ensureDir(path.dirname(configPath));
    await fs.writeJson(configPath, defaultConfig, { spaces: 2 });
    
    return defaultConfig;
  }
}

module.exports = { Config };
