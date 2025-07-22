/**
 * Simplified Logger for Vercel deployment
 * 
 * This is a lightweight version of the logger that doesn't depend on file system
 * operations or external libraries, making it suitable for serverless environments.
 */

class Logger {
  static instance = null;

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  constructor() {
    this.isVercel = process.env.VERCEL === '1';
    this.logger = {
      info: (message, meta = {}) => console.log(`[INFO] ${message}`, meta),
      error: (message, meta = {}) => console.error(`[ERROR] ${message}`, meta),
      warn: (message, meta = {}) => console.warn(`[WARN] ${message}`, meta),
      debug: (message, meta = {}) => console.debug(`[DEBUG] ${message}`, meta)
    };
    this.isInitialized = true;
  }

  // Logging methods
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, error = null, meta = {}) {
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

/**
 * Create a logger instance with a specific module name
 * @param {string} moduleName - Name of the module using the logger
 * @returns {Object} - Logger instance
 */
function createLogger(moduleName) {
  const logger = Logger.getInstance();
  
  // Return a wrapper that adds the module name to all logs
  return {
    debug: (message, meta = {}) => logger.debug(`[${moduleName}] ${message}`, meta),
    info: (message, meta = {}) => logger.info(`[${moduleName}] ${message}`, meta),
    warn: (message, meta = {}) => logger.warn(`[${moduleName}] ${message}`, meta),
    error: (message, error = null, meta = {}) => logger.error(`[${moduleName}] ${message}`, error, meta),
    logTrade: (tradeData) => logger.logTrade({ module: moduleName, ...tradeData }),
    logDecision: (decisionData) => logger.logDecision({ module: moduleName, ...decisionData }),
    logMarketData: (marketData) => logger.logMarketData({ module: moduleName, ...marketData }),
    logTechnicalAnalysis: (analysisData) => logger.logTechnicalAnalysis({ module: moduleName, ...analysisData }),
    logError: (context, error, additionalData = {}) => logger.logError(context, error, { module: moduleName, ...additionalData }),
    logPerformance: (operation, duration, success = true) => logger.logPerformance(operation, duration, success),
    logSystemStatus: (status, details = {}) => logger.logSystemStatus(status, { module: moduleName, ...details })
  };
}

module.exports = { Logger, createLogger };