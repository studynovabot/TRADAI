/**
 * AI Candle Sniper - OTC Status Monitor
 * 
 * Real-time monitoring system for OTC mode:
 * - Monitors all OTC components health
 * - Tracks performance metrics
 * - Provides real-time status updates
 * - Alerts on issues and anomalies
 */

class OTCStatusMonitor {
  constructor(config = {}) {
    this.config = {
      monitoringInterval: 5000, // 5 seconds
      healthCheckInterval: 30000, // 30 seconds
      performanceWindow: 60000, // 1 minute
      alertThresholds: {
        errorRate: 0.1, // 10% error rate
        responseTime: 5000, // 5 seconds
        memoryUsage: 100 * 1024 * 1024, // 100MB
        dataLatency: 10000 // 10 seconds
      },
      ...config
    };
    
    this.isMonitoring = false;
    this.monitoringTimer = null;
    this.healthCheckTimer = null;
    
    this.status = {
      overall: 'unknown',
      components: {
        extractor: { status: 'unknown', lastCheck: null, errors: 0 },
        validator: { status: 'unknown', lastCheck: null, errors: 0 },
        errorHandler: { status: 'unknown', lastCheck: null, errors: 0 },
        background: { status: 'unknown', lastCheck: null, errors: 0 },
        dataFlow: { status: 'unknown', lastCheck: null, errors: 0 }
      },
      metrics: {
        dataPoints: 0,
        validationRate: 0,
        errorRate: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        lastDataUpdate: null
      },
      alerts: [],
      history: []
    };
    
    this.performanceData = {
      responseTimes: [],
      errorCounts: [],
      dataUpdates: [],
      memorySnapshots: []
    };
    
    this.observers = [];
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize status monitor
   */
  init() {
    console.log('[OTC Status Monitor] Initializing...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('[OTC Status Monitor] Initialized successfully');
  }
  
  /**
   * Set up event listeners for monitoring
   */
  setupEventListeners() {
    // Listen for OTC data events
    document.addEventListener('OTC_DATA_EXTRACTED', (event) => {
      this.recordDataUpdate(event.detail);
    });
    
    document.addEventListener('CANDLE_DATA_EXTRACTED', (event) => {
      if (event.detail && event.detail.isOTC) {
        this.recordDataUpdate(event.detail);
      }
    });
    
    // Listen for error events
    window.addEventListener('error', (event) => {
      this.recordError('system', event.error);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('system', event.reason);
    });
  }
  
  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Start regular monitoring
    this.monitoringTimer = setInterval(() => {
      this.performMonitoringCheck();
    }, this.config.monitoringInterval);
    
    // Start health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    console.log('[OTC Status Monitor] Monitoring started');
    this.notifyObservers({ type: 'monitoring_started' });
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    console.log('[OTC Status Monitor] Monitoring stopped');
    this.notifyObservers({ type: 'monitoring_stopped' });
  }
  
  /**
   * Perform regular monitoring check
   */
  async performMonitoringCheck() {
    try {
      const startTime = performance.now();
      
      // Update metrics
      this.updateMetrics();
      
      // Check for alerts
      this.checkAlerts();
      
      // Clean old data
      this.cleanOldData();
      
      const endTime = performance.now();
      this.recordResponseTime(endTime - startTime);
      
      // Notify observers
      this.notifyObservers({
        type: 'monitoring_update',
        status: this.getStatus()
      });
    } catch (error) {
      console.error('[OTC Status Monitor] Error in monitoring check:', error);
      this.recordError('monitor', error);
    }
  }
  
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      console.log('[OTC Status Monitor] Performing health check...');
      
      // Check extractor component
      await this.checkExtractorHealth();
      
      // Check validator component
      await this.checkValidatorHealth();
      
      // Check error handler component
      await this.checkErrorHandlerHealth();
      
      // Check background component
      await this.checkBackgroundHealth();
      
      // Check data flow
      await this.checkDataFlowHealth();
      
      // Update overall status
      this.updateOverallStatus();
      
      // Record health check
      this.recordHealthCheck();
      
      console.log('[OTC Status Monitor] Health check completed');
      this.notifyObservers({
        type: 'health_check_completed',
        status: this.getStatus()
      });
    } catch (error) {
      console.error('[OTC Status Monitor] Error in health check:', error);
      this.recordError('monitor', error);
    }
  }
  
  /**
   * Check extractor health
   */
  async checkExtractorHealth() {
    try {
      let status = 'healthy';
      let errors = 0;
      
      // Check if extractors are available
      if (!window.PocketOptionExtractor && !window.QuotexDataExtractor && !window.OTCDataExtractor) {
        status = 'error';
        errors++;
      }
      
      // Check if any extractor is running
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
            chrome.runtime.sendMessage({ action: 'getOTCExtractionStatus' }, (result) => {
              clearTimeout(timeout);
              resolve(result);
            });
          });
          
          if (!response || !response.isExtracting) {
            status = 'warning';
          }
        } catch (error) {
          status = 'error';
          errors++;
        }
      }
      
      this.status.components.extractor = {
        status,
        lastCheck: Date.now(),
        errors
      };
    } catch (error) {
      this.status.components.extractor = {
        status: 'error',
        lastCheck: Date.now(),
        errors: 1
      };
    }
  }
  
  /**
   * Check validator health
   */
  async checkValidatorHealth() {
    try {
      let status = 'healthy';
      let errors = 0;
      
      if (window.otcDataValidator) {
        try {
          // Test validation with sample data
          const testData = {
            asset: 'TEST',
            timeframe: '5M',
            candles: [
              { timestamp: Date.now(), open: 1, high: 1, low: 1, close: 1, volume: 0 }
            ]
          };
          
          const result = window.otcDataValidator.validateOTCData(testData);
          
          if (!result || typeof result.isValid !== 'boolean') {
            status = 'error';
            errors++;
          }
        } catch (error) {
          status = 'error';
          errors++;
        }
      } else {
        status = 'warning'; // Not critical if validator is not loaded yet
      }
      
      this.status.components.validator = {
        status,
        lastCheck: Date.now(),
        errors
      };
    } catch (error) {
      this.status.components.validator = {
        status: 'error',
        lastCheck: Date.now(),
        errors: 1
      };
    }
  }
  
  /**
   * Check error handler health
   */
  async checkErrorHandlerHealth() {
    try {
      let status = 'healthy';
      let errors = 0;
      
      if (window.otcErrorHandler) {
        try {
          // Test error handling
          const stats = window.otcErrorHandler.getErrorStats();
          
          if (!stats || typeof stats.total !== 'number') {
            status = 'error';
            errors++;
          }
        } catch (error) {
          status = 'error';
          errors++;
        }
      } else {
        status = 'warning'; // Not critical if error handler is not loaded yet
      }
      
      this.status.components.errorHandler = {
        status,
        lastCheck: Date.now(),
        errors
      };
    } catch (error) {
      this.status.components.errorHandler = {
        status: 'error',
        lastCheck: Date.now(),
        errors: 1
      };
    }
  }
  
  /**
   * Check background health
   */
  async checkBackgroundHealth() {
    try {
      let status = 'healthy';
      let errors = 0;
      
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          // Test background script communication
          const response = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 3000);
            chrome.runtime.sendMessage({ action: 'ping' }, (result) => {
              clearTimeout(timeout);
              resolve(result);
            });
          });
          
          // Even if ping is not implemented, we should get some response
          // Chrome runtime error indicates background script issues
          if (chrome.runtime.lastError) {
            status = 'error';
            errors++;
          }
        } catch (error) {
          status = 'error';
          errors++;
        }
      } else {
        status = 'error';
        errors++;
      }
      
      this.status.components.background = {
        status,
        lastCheck: Date.now(),
        errors
      };
    } catch (error) {
      this.status.components.background = {
        status: 'error',
        lastCheck: Date.now(),
        errors: 1
      };
    }
  }
  
  /**
   * Check data flow health
   */
  async checkDataFlowHealth() {
    try {
      let status = 'healthy';
      let errors = 0;
      
      // Check if we've received data recently
      const now = Date.now();
      const lastUpdate = this.status.metrics.lastDataUpdate;
      
      if (!lastUpdate || (now - lastUpdate) > 60000) { // No data for 1 minute
        status = 'warning';
      }
      
      if (!lastUpdate || (now - lastUpdate) > 300000) { // No data for 5 minutes
        status = 'error';
        errors++;
      }
      
      this.status.components.dataFlow = {
        status,
        lastCheck: Date.now(),
        errors
      };
    } catch (error) {
      this.status.components.dataFlow = {
        status: 'error',
        lastCheck: Date.now(),
        errors: 1
      };
    }
  }
  
  /**
   * Update overall status based on component statuses
   */
  updateOverallStatus() {
    const components = Object.values(this.status.components);
    
    if (components.some(c => c.status === 'error')) {
      this.status.overall = 'error';
    } else if (components.some(c => c.status === 'warning')) {
      this.status.overall = 'warning';
    } else if (components.every(c => c.status === 'healthy')) {
      this.status.overall = 'healthy';
    } else {
      this.status.overall = 'unknown';
    }
  }
  
  /**
   * Update performance metrics
   */
  updateMetrics() {
    const now = Date.now();
    const windowStart = now - this.config.performanceWindow;
    
    // Filter data within performance window
    const recentResponses = this.performanceData.responseTimes.filter(r => r.timestamp > windowStart);
    const recentErrors = this.performanceData.errorCounts.filter(e => e.timestamp > windowStart);
    const recentUpdates = this.performanceData.dataUpdates.filter(u => u.timestamp > windowStart);
    
    // Calculate metrics
    this.status.metrics.dataPoints = recentUpdates.length;
    this.status.metrics.averageResponseTime = recentResponses.length > 0 
      ? recentResponses.reduce((sum, r) => sum + r.value, 0) / recentResponses.length 
      : 0;
    this.status.metrics.errorRate = recentErrors.length > 0 
      ? recentErrors.reduce((sum, e) => sum + e.value, 0) / recentErrors.length 
      : 0;
    
    // Memory usage
    if (performance.memory) {
      this.status.metrics.memoryUsage = performance.memory.usedJSHeapSize;
      this.recordMemorySnapshot(performance.memory.usedJSHeapSize);
    }
  }
  
  /**
   * Check for alerts based on thresholds
   */
  checkAlerts() {
    const alerts = [];
    const thresholds = this.config.alertThresholds;
    
    // Error rate alert
    if (this.status.metrics.errorRate > thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'warning',
        message: `High error rate: ${(this.status.metrics.errorRate * 100).toFixed(1)}%`,
        timestamp: Date.now()
      });
    }
    
    // Response time alert
    if (this.status.metrics.averageResponseTime > thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'warning',
        message: `Slow response time: ${this.status.metrics.averageResponseTime.toFixed(0)}ms`,
        timestamp: Date.now()
      });
    }
    
    // Memory usage alert
    if (this.status.metrics.memoryUsage > thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'warning',
        message: `High memory usage: ${(this.status.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        timestamp: Date.now()
      });
    }
    
    // Data latency alert
    const now = Date.now();
    if (this.status.metrics.lastDataUpdate && 
        (now - this.status.metrics.lastDataUpdate) > thresholds.dataLatency) {
      alerts.push({
        type: 'data_latency',
        severity: 'error',
        message: `No data updates for ${Math.floor((now - this.status.metrics.lastDataUpdate) / 1000)}s`,
        timestamp: Date.now()
      });
    }
    
    // Add new alerts
    alerts.forEach(alert => {
      if (!this.status.alerts.some(existing => 
          existing.type === alert.type && 
          (alert.timestamp - existing.timestamp) < 60000)) { // Don't duplicate alerts within 1 minute
        this.status.alerts.unshift(alert);
        console.warn(`[OTC Status Monitor] ALERT: ${alert.message}`);
        
        this.notifyObservers({
          type: 'alert',
          alert
        });
      }
    });
    
    // Limit alerts to 50
    this.status.alerts = this.status.alerts.slice(0, 50);
  }
  
  /**
   * Clean old performance data
   */
  cleanOldData() {
    const now = Date.now();
    const cutoff = now - (this.config.performanceWindow * 2); // Keep 2x window for history
    
    this.performanceData.responseTimes = this.performanceData.responseTimes.filter(r => r.timestamp > cutoff);
    this.performanceData.errorCounts = this.performanceData.errorCounts.filter(e => e.timestamp > cutoff);
    this.performanceData.dataUpdates = this.performanceData.dataUpdates.filter(u => u.timestamp > cutoff);
    this.performanceData.memorySnapshots = this.performanceData.memorySnapshots.filter(m => m.timestamp > cutoff);
    
    // Limit history
    this.status.history = this.status.history.slice(0, 100);
  }
  
  /**
   * Record data update
   * @param {Object} data - Data update
   */
  recordDataUpdate(data) {
    const timestamp = Date.now();
    
    this.performanceData.dataUpdates.push({
      timestamp,
      asset: data.asset,
      timeframe: data.timeframe,
      candleCount: data.candles ? data.candles.length : 0
    });
    
    this.status.metrics.lastDataUpdate = timestamp;
  }
  
  /**
   * Record error
   * @param {string} component - Component name
   * @param {Error} error - Error object
   */
  recordError(component, error) {
    const timestamp = Date.now();
    
    this.performanceData.errorCounts.push({
      timestamp,
      component,
      message: error?.message || error?.toString() || 'Unknown error'
    });
    
    // Update component error count
    if (this.status.components[component]) {
      this.status.components[component].errors++;
    }
  }
  
  /**
   * Record response time
   * @param {number} responseTime - Response time in milliseconds
   */
  recordResponseTime(responseTime) {
    this.performanceData.responseTimes.push({
      timestamp: Date.now(),
      value: responseTime
    });
  }
  
  /**
   * Record memory snapshot
   * @param {number} memoryUsage - Memory usage in bytes
   */
  recordMemorySnapshot(memoryUsage) {
    this.performanceData.memorySnapshots.push({
      timestamp: Date.now(),
      value: memoryUsage
    });
  }
  
  /**
   * Record health check
   */
  recordHealthCheck() {
    this.status.history.unshift({
      timestamp: Date.now(),
      overall: this.status.overall,
      components: { ...this.status.components }
    });
  }
  
  /**
   * Get current status
   * @returns {Object} - Current status
   */
  getStatus() {
    return {
      ...this.status,
      isMonitoring: this.isMonitoring,
      timestamp: Date.now()
    };
  }
  
  /**
   * Get performance data
   * @returns {Object} - Performance data
   */
  getPerformanceData() {
    return {
      ...this.performanceData,
      timestamp: Date.now()
    };
  }
  
  /**
   * Add observer for status updates
   * @param {Function} callback - Observer callback
   */
  addObserver(callback) {
    if (typeof callback === 'function') {
      this.observers.push(callback);
      return true;
    }
    return false;
  }
  
  /**
   * Remove observer
   * @param {Function} callback - Observer callback
   */
  removeObserver(callback) {
    const index = this.observers.indexOf(callback);
    if (index !== -1) {
      this.observers.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Notify all observers
   * @param {Object} data - Notification data
   */
  notifyObservers(data) {
    this.observers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[OTC Status Monitor] Error in observer callback:', error);
      }
    });
  }
  
  /**
   * Reset all data
   */
  reset() {
    this.status = {
      overall: 'unknown',
      components: {
        extractor: { status: 'unknown', lastCheck: null, errors: 0 },
        validator: { status: 'unknown', lastCheck: null, errors: 0 },
        errorHandler: { status: 'unknown', lastCheck: null, errors: 0 },
        background: { status: 'unknown', lastCheck: null, errors: 0 },
        dataFlow: { status: 'unknown', lastCheck: null, errors: 0 }
      },
      metrics: {
        dataPoints: 0,
        validationRate: 0,
        errorRate: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        lastDataUpdate: null
      },
      alerts: [],
      history: []
    };
    
    this.performanceData = {
      responseTimes: [],
      errorCounts: [],
      dataUpdates: [],
      memorySnapshots: []
    };
    
    console.log('[OTC Status Monitor] Data reset');
  }
}

// Create global instance
const otcStatusMonitor = new OTCStatusMonitor();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OTCStatusMonitor, otcStatusMonitor };
} else {
  window.OTCStatusMonitor = OTCStatusMonitor;
  window.otcStatusMonitor = otcStatusMonitor;
}