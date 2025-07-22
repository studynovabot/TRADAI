/**
 * Logger Wrapper - Selects the appropriate logger based on the environment
 */

// Check if we're in Vercel environment
const isVercel = process.env.VERCEL === '1';

let loggerModule;

try {
  // Use the simplified logger for Vercel
  if (isVercel) {
    loggerModule = require('./vercel-logger');
    console.log('Using Vercel-compatible logger');
  } else {
    // Use the full-featured logger for other environments
    loggerModule = require('./logger');
  }
} catch (error) {
  console.error('Error loading logger module:', error);
  // Fallback to a very basic logger
  loggerModule = {
    createLogger: (moduleName) => ({
      debug: (message) => console.debug(`[${moduleName}] ${message}`),
      info: (message) => console.log(`[${moduleName}] ${message}`),
      warn: (message) => console.warn(`[${moduleName}] ${message}`),
      error: (message, error) => console.error(`[${moduleName}] ${message}`, error),
      logTrade: (data) => console.log(`[${moduleName}] TRADE:`, data),
      logDecision: (data) => console.log(`[${moduleName}] DECISION:`, data),
      logMarketData: (data) => console.log(`[${moduleName}] MARKET DATA:`, data),
      logTechnicalAnalysis: (data) => console.log(`[${moduleName}] ANALYSIS:`, data),
      logError: (context, error) => console.error(`[${moduleName}] ERROR ${context}:`, error),
      logPerformance: (op, duration) => console.log(`[${moduleName}] PERFORMANCE ${op}:`, duration),
      logSystemStatus: (status) => console.log(`[${moduleName}] SYSTEM STATUS:`, status)
    })
  };
}

module.exports = loggerModule;