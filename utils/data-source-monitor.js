/**
 * Data Source Monitor
 * 
 * Monitors data sources to ensure real data is being used
 * and alerts when fallbacks to synthetic data occur
 */

const fs = require('fs');
const path = require('path');

class DataSourceMonitor {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'data-source-monitor.log');
    this.alertThreshold = 3; // Alert after 3 synthetic data usages
    this.syntheticDataCount = 0;
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Log real data usage
   */
  logRealDataUsage(source, symbol, timeframe) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] REAL DATA: ${source} - ${symbol} ${timeframe}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
    
    if (process.env.LOG_DATA_SOURCE === 'true') {
      console.log(`✅ REAL DATA: ${source} - ${symbol} ${timeframe}`);
    }
  }

  /**
   * Log synthetic data usage (and alert if threshold exceeded)
   */
  logSyntheticDataUsage(source, symbol, timeframe, reason) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] SYNTHETIC DATA: ${source} - ${symbol} ${timeframe} - Reason: ${reason}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
    
    this.syntheticDataCount++;
    
    console.warn(`⚠️ SYNTHETIC DATA: ${source} - ${symbol} ${timeframe} - Reason: ${reason}`);
    
    if (this.syntheticDataCount >= this.alertThreshold) {
      this.alertSyntheticDataUsage();
    }
  }

  /**
   * Alert when too much synthetic data is being used
   */
  alertSyntheticDataUsage() {
    const alertMessage = `🚨 ALERT: ${this.syntheticDataCount} synthetic data usages detected! Check data sources immediately.`;
    
    console.error(alertMessage);
    
    // Log alert
    const timestamp = new Date().toISOString();
    const alertEntry = `[${timestamp}] ALERT: ${this.syntheticDataCount} synthetic data usages\n`;
    fs.appendFileSync(this.logFile, alertEntry);
    
    // Reset counter
    this.syntheticDataCount = 0;
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    if (!fs.existsSync(this.logFile)) {
      return { realData: 0, syntheticData: 0, alerts: 0 };
    }

    const logContent = fs.readFileSync(this.logFile, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim());
    
    const realDataCount = lines.filter(line => line.includes('REAL DATA')).length;
    const syntheticDataCount = lines.filter(line => line.includes('SYNTHETIC DATA')).length;
    const alertCount = lines.filter(line => line.includes('ALERT')).length;
    
    return {
      realData: realDataCount,
      syntheticData: syntheticDataCount,
      alerts: alertCount,
      totalEntries: lines.length
    };
  }
}

// Create singleton instance
const monitor = new DataSourceMonitor();

module.exports = { DataSourceMonitor, monitor };