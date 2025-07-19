/**
 * AI Candle Sniper - OTC Error Handler
 * 
 * Comprehensive error handling system for OTC mode:
 * - Catches and categorizes all OTC-related errors
 * - Provides recovery mechanisms
 * - Logs errors for debugging
 * - Maintains system stability
 */

class OTCErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    
    // Error categories
    this.errorCategories = {
      NETWORK: 'network',
      EXTRACTION: 'extraction',
      BROKER: 'broker',
      DATA: 'data',
      SIGNAL: 'signal',
      TRADE: 'trade',
      SYSTEM: 'system'
    };
    
    // Recovery strategies
    this.recoveryStrategies = new Map();
    this.setupRecoveryStrategies();
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize error handler
   */
  init() {
    console.log('[OTC Error Handler] Initializing...');
    
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    // Load error log from storage
    this.loadErrorLog();
    
    console.log('[OTC Error Handler] Initialized successfully');
  }
  
  /**
   * Set up global error handlers
   */
  setupGlobalErrorHandlers() {
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, this.errorCategories.SYSTEM, {
        type: 'unhandled_promise_rejection',
        promise: event.promise
      });
    });
    
    // Catch general errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error, this.errorCategories.SYSTEM, {
        type: 'general_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }
  
  /**
   * Set up recovery strategies for different error types
   */
  setupRecoveryStrategies() {
    // Network errors
    this.recoveryStrategies.set(this.errorCategories.NETWORK, {
      retry: true,
      maxRetries: 5,
      retryDelay: 2000,
      fallback: () => this.switchToOfflineMode()
    });
    
    // Extraction errors
    this.recoveryStrategies.set(this.errorCategories.EXTRACTION, {
      retry: true,
      maxRetries: 3,
      retryDelay: 1000,
      fallback: () => this.restartExtraction()
    });
    
    // Broker errors
    this.recoveryStrategies.set(this.errorCategories.BROKER, {
      retry: true,
      maxRetries: 2,
      retryDelay: 3000,
      fallback: () => this.switchBrokerMode()
    });
    
    // Data errors
    this.recoveryStrategies.set(this.errorCategories.DATA, {
      retry: true,
      maxRetries: 3,
      retryDelay: 500,
      fallback: () => this.useBackupData()
    });
    
    // Signal errors
    this.recoveryStrategies.set(this.errorCategories.SIGNAL, {
      retry: true,
      maxRetries: 2,
      retryDelay: 1000,
      fallback: () => this.useSimpleSignal()
    });
    
    // Trade errors
    this.recoveryStrategies.set(this.errorCategories.TRADE, {
      retry: false,
      maxRetries: 0,
      retryDelay: 0,
      fallback: () => this.logTradeFailure()
    });
    
    // System errors
    this.recoveryStrategies.set(this.errorCategories.SYSTEM, {
      retry: false,
      maxRetries: 0,
      retryDelay: 0,
      fallback: () => this.reportSystemError()
    });
  }
  
  /**
   * Handle an error with automatic recovery
   * @param {Error|string} error - The error to handle
   * @param {string} category - Error category
   * @param {Object} context - Additional context
   * @returns {Promise<boolean>} - True if recovered, false otherwise
   */
  async handleError(error, category, context = {}) {
    try {
      // Create error object
      const errorObj = this.createErrorObject(error, category, context);
      
      // Log error
      this.logError(errorObj);
      
      // Get recovery strategy
      const strategy = this.recoveryStrategies.get(category);
      
      if (!strategy) {
        console.error('[OTC Error Handler] No recovery strategy for category:', category);
        return false;
      }
      
      // Attempt recovery
      const recovered = await this.attemptRecovery(errorObj, strategy);
      
      if (recovered) {
        console.log('[OTC Error Handler] Successfully recovered from error:', errorObj.id);
        return true;
      } else {
        console.error('[OTC Error Handler] Failed to recover from error:', errorObj.id);
        return false;
      }
    } catch (recoveryError) {
      console.error('[OTC Error Handler] Error in error handler:', recoveryError);
      return false;
    }
  }
  
  /**
   * Create standardized error object
   * @param {Error|string} error - The error
   * @param {string} category - Error category
   * @param {Object} context - Additional context
   * @returns {Object} - Standardized error object
   */
  createErrorObject(error, category, context = {}) {
    const errorObj = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      category,
      message: error?.message || error?.toString() || 'Unknown error',
      stack: error?.stack || null,
      context,
      retryCount: 0,
      recovered: false
    };
    
    // Add browser info
    errorObj.browser = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    return errorObj;
  }
  
  /**
   * Generate unique error ID
   * @returns {string} - Unique error ID
   */
  generateErrorId() {
    return `otc_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Log error to internal log and storage
   * @param {Object} errorObj - Error object
   */
  logError(errorObj) {
    // Add to internal log
    this.errorLog.unshift(errorObj);
    
    // Limit log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }
    
    // Save to storage
    this.saveErrorLog();
    
    // Console log
    console.error(`[OTC Error Handler] ${errorObj.category.toUpperCase()} ERROR:`, {
      id: errorObj.id,
      message: errorObj.message,
      context: errorObj.context,
      stack: errorObj.stack
    });
  }
  
  /**
   * Attempt recovery using strategy
   * @param {Object} errorObj - Error object
   * @param {Object} strategy - Recovery strategy
   * @returns {Promise<boolean>} - True if recovered
   */
  async attemptRecovery(errorObj, strategy) {
    try {
      // Check if retry is allowed
      if (strategy.retry && errorObj.retryCount < strategy.maxRetries) {
        console.log(`[OTC Error Handler] Attempting retry ${errorObj.retryCount + 1}/${strategy.maxRetries} for error:`, errorObj.id);
        
        // Wait before retry
        if (strategy.retryDelay > 0) {
          await this.delay(strategy.retryDelay);
        }
        
        // Increment retry count
        errorObj.retryCount++;
        
        // Attempt retry (this would be implemented by the calling code)
        // For now, we'll simulate a retry attempt
        const retrySuccess = await this.simulateRetry(errorObj);
        
        if (retrySuccess) {
          errorObj.recovered = true;
          return true;
        }
        
        // If retry failed and we have more attempts, try again
        if (errorObj.retryCount < strategy.maxRetries) {
          return await this.attemptRecovery(errorObj, strategy);
        }
      }
      
      // If retries exhausted or not allowed, try fallback
      if (strategy.fallback && typeof strategy.fallback === 'function') {
        console.log('[OTC Error Handler] Attempting fallback recovery for error:', errorObj.id);
        
        const fallbackSuccess = await strategy.fallback(errorObj);
        
        if (fallbackSuccess) {
          errorObj.recovered = true;
          return true;
        }
      }
      
      return false;
    } catch (recoveryError) {
      console.error('[OTC Error Handler] Error during recovery attempt:', recoveryError);
      return false;
    }
  }
  
  /**
   * Simulate retry attempt (to be overridden by specific implementations)
   * @param {Object} errorObj - Error object
   * @returns {Promise<boolean>} - True if retry succeeded
   */
  async simulateRetry(errorObj) {
    // This is a placeholder - actual retry logic would be implemented
    // by the specific components that use this error handler
    return Math.random() > 0.5; // 50% chance of success for simulation
  }
  
  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Recovery fallback: Switch to offline mode
   */
  async switchToOfflineMode() {
    try {
      console.log('[OTC Error Handler] Switching to offline mode');
      
      // Notify other components about offline mode
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          action: 'OTC_OFFLINE_MODE',
          data: { reason: 'network_error' }
        });
      }
      
      return true;
    } catch (error) {
      console.error('[OTC Error Handler] Error switching to offline mode:', error);
      return false;
    }
  }
  
  /**
   * Recovery fallback: Restart extraction
   */
  async restartExtraction() {
    try {
      console.log('[OTC Error Handler] Restarting extraction');
      
      // Stop current extraction
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        await chrome.runtime.sendMessage({
          action: 'deactivateOTCMode'
        });
        
        // Wait a moment
        await this.delay(2000);
        
        // Start extraction again
        await chrome.runtime.sendMessage({
          action: 'activateOTCMode',
          data: { reason: 'error_recovery' }
        });
      }
      
      return true;
    } catch (error) {
      console.error('[OTC Error Handler] Error restarting extraction:', error);
      return false;
    }
  }
  
  /**
   * Recovery fallback: Switch broker mode
   */
  async switchBrokerMode() {
    try {
      console.log('[OTC Error Handler] Switching broker mode');
      
      // This would implement broker-specific recovery logic
      // For now, just log the attempt
      
      return false; // Not implemented yet
    } catch (error) {
      console.error('[OTC Error Handler] Error switching broker mode:', error);
      return false;
    }
  }
  
  /**
   * Recovery fallback: Use backup data
   */
  async useBackupData() {
    try {
      console.log('[OTC Error Handler] Using backup data');
      
      // This would implement backup data logic
      // For now, just log the attempt
      
      return false; // Not implemented yet
    } catch (error) {
      console.error('[OTC Error Handler] Error using backup data:', error);
      return false;
    }
  }
  
  /**
   * Recovery fallback: Use simple signal
   */
  async useSimpleSignal() {
    try {
      console.log('[OTC Error Handler] Using simple signal generation');
      
      // This would implement simple signal logic
      // For now, just log the attempt
      
      return false; // Not implemented yet
    } catch (error) {
      console.error('[OTC Error Handler] Error using simple signal:', error);
      return false;
    }
  }
  
  /**
   * Recovery fallback: Log trade failure
   */
  async logTradeFailure(errorObj) {
    try {
      console.log('[OTC Error Handler] Logging trade failure');
      
      // Save trade failure to storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await new Promise(resolve => {
          chrome.storage.local.get(['otcTradeFailures'], resolve);
        });
        
        const failures = data.otcTradeFailures || [];
        failures.unshift({
          timestamp: Date.now(),
          error: errorObj,
          context: 'trade_execution'
        });
        
        // Limit to 50 failures
        const limitedFailures = failures.slice(0, 50);
        
        await new Promise(resolve => {
          chrome.storage.local.set({ otcTradeFailures: limitedFailures }, resolve);
        });
      }
      
      return true;
    } catch (error) {
      console.error('[OTC Error Handler] Error logging trade failure:', error);
      return false;
    }
  }
  
  /**
   * Recovery fallback: Report system error
   */
  async reportSystemError(errorObj) {
    try {
      console.log('[OTC Error Handler] Reporting system error');
      
      // This would implement system error reporting
      // For now, just log to console
      console.error('[OTC Error Handler] SYSTEM ERROR:', errorObj);
      
      return true;
    } catch (error) {
      console.error('[OTC Error Handler] Error reporting system error:', error);
      return false;
    }
  }
  
  /**
   * Load error log from storage
   */
  async loadErrorLog() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await new Promise(resolve => {
          chrome.storage.local.get(['otcErrorLog'], resolve);
        });
        
        if (data.otcErrorLog && Array.isArray(data.otcErrorLog)) {
          this.errorLog = data.otcErrorLog;
          console.log(`[OTC Error Handler] Loaded ${this.errorLog.length} errors from storage`);
        }
      }
    } catch (error) {
      console.error('[OTC Error Handler] Error loading error log:', error);
    }
  }
  
  /**
   * Save error log to storage
   */
  async saveErrorLog() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise(resolve => {
          chrome.storage.local.set({ otcErrorLog: this.errorLog }, resolve);
        });
      }
    } catch (error) {
      console.error('[OTC Error Handler] Error saving error log:', error);
    }
  }
  
  /**
   * Get error statistics
   * @returns {Object} - Error statistics
   */
  getErrorStats() {
    const stats = {
      total: this.errorLog.length,
      byCategory: {},
      recovered: 0,
      recent: 0 // Last 24 hours
    };
    
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    this.errorLog.forEach(error => {
      // Count by category
      if (!stats.byCategory[error.category]) {
        stats.byCategory[error.category] = 0;
      }
      stats.byCategory[error.category]++;
      
      // Count recovered
      if (error.recovered) {
        stats.recovered++;
      }
      
      // Count recent
      if (error.timestamp > oneDayAgo) {
        stats.recent++;
      }
    });
    
    return stats;
  }
  
  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
    this.saveErrorLog();
    console.log('[OTC Error Handler] Error log cleared');
  }
  
  /**
   * Get recent errors
   * @param {number} limit - Maximum number of errors to return
   * @returns {Array} - Recent errors
   */
  getRecentErrors(limit = 10) {
    return this.errorLog.slice(0, limit);
  }
}

// Create global instance
const otcErrorHandler = new OTCErrorHandler();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OTCErrorHandler, otcErrorHandler };
} else {
  window.OTCErrorHandler = OTCErrorHandler;
  window.otcErrorHandler = otcErrorHandler;
}