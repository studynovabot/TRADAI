/**
 * Logger Utility - Centralized logging system
 * 
 * Provides structured logging with file rotation and console output
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

class Logger {
  static instance = null;
  static initPromise = null;

  static async getInstance(config = null) {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
      Logger.initPromise = Logger.instance.setupLogger();
      await Logger.initPromise;
    } else if (Logger.initPromise) {
      // Wait for initialization to complete if it's still in progress
      await Logger.initPromise;
    }
    return Logger.instance;
  }

  // Synchronous version for backward compatibility
  static getInstanceSync(config = null) {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
      // Start async initialization but don't wait
      Logger.initPromise = Logger.instance.setupLogger();
    }
    return Logger.instance;
  }

  constructor(config = null) {
    this.config = config || {
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: './logs/trading.log',
        maxFiles: 10,
        maxSize: '10m'
      }
    };

    this.logger = null; // Will be set by setupLogger()
    this.isInitialized = false;
  }
  
  async setupLogger() {
    try {
      // Ensure logs directory exists
      const logDir = path.dirname(this.config.logging.file);
      await fs.ensureDir(logDir);

      // Create winston logger
      this.logger = winston.createLogger({
        level: this.config.logging.level,
        format: winston.format.combine(
          winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
          }),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'ai-trading-bot' },
        transports: [
          // File transport with rotation
          new winston.transports.File({
            filename: this.config.logging.file,
            maxsize: this.parseSize(this.config.logging.maxSize),
            maxFiles: this.config.logging.maxFiles,
            tailable: true
          }),

          // Error file
          new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: this.parseSize(this.config.logging.maxSize),
            maxFiles: 5
          })
        ]
      });

      // Add console transport for development
      if (process.env.NODE_ENV !== 'production') {
        this.logger.add(new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
              format: 'HH:mm:ss'
            }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              let log = `${timestamp} [${level}] ${message}`;

              // Add metadata if present
              if (Object.keys(meta).length > 0) {
                log += ` ${JSON.stringify(meta)}`;
              }

              return log;
            })
          )
        }));
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize logger:', error);
      throw error;
    }
  }
  
  parseSize(sizeStr) {
    const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = sizeStr.toLowerCase().match(/^(\d+)([kmg]?)$/);
    
    if (!match) return 10 * 1024 * 1024; // Default 10MB
    
    const [, size, unit] = match;
    return parseInt(size) * (units[unit] || 1);
  }
  
  // Logging methods with safety checks
  debug(message, meta = {}) {
    if (!this.isInitialized || !this.logger) {
      console.debug(`[DEBUG] ${message}`, meta);
      return;
    }
    this.logger.debug(message, meta);
  }

  info(message, meta = {}) {
    if (!this.isInitialized || !this.logger) {
      console.info(`[INFO] ${message}`, meta);
      return;
    }
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    if (!this.isInitialized || !this.logger) {
      console.warn(`[WARN] ${message}`, meta);
      return;
    }
    this.logger.warn(message, meta);
  }

  error(message, error = null, meta = {}) {
    if (!this.isInitialized || !this.logger) {
      console.error(`[ERROR] ${message}`, error, meta);
      return;
    }

    if (error instanceof Error) {
      this.logger.error(message, {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        ...meta
      });
    } else {
      this.logger.error(message, { error, ...meta });
    }
  }
  
  // Trading-specific logging methods
  logTrade(tradeData) {
    this.info('💰 TRADE EXECUTED', {
      type: 'TRADE',
      ...tradeData
    });
  }
  
  logDecision(decisionData) {
    this.info('🧠 AI DECISION', {
      type: 'DECISION',
      ...decisionData
    });
  }
  
  logMarketData(marketData) {
    this.debug('📊 MARKET DATA', {
      type: 'MARKET_DATA',
      ...marketData
    });
  }
  
  logTechnicalAnalysis(analysisData) {
    this.debug('📈 TECHNICAL ANALYSIS', {
      type: 'TECHNICAL_ANALYSIS',
      ...analysisData
    });
  }
  
  logError(context, error, additionalData = {}) {
    this.error(`❌ ${context}`, error, {
      type: 'ERROR',
      context,
      ...additionalData
    });
  }
  
  // Performance logging
  logPerformance(operation, duration, success = true) {
    this.info(`⚡ PERFORMANCE: ${operation}`, {
      type: 'PERFORMANCE',
      operation,
      duration: `${duration}ms`,
      success
    });
  }
  
  // System status logging
  logSystemStatus(status, details = {}) {
    this.info(`🔧 SYSTEM STATUS: ${status}`, {
      type: 'SYSTEM_STATUS',
      status,
      ...details
    });
  }
}

module.exports = { Logger };
