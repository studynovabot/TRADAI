/**
 * Fix Real Data Issues Script
 * 
 * This script addresses the identified issues to ensure the system
 * uses real market data properly without falling back to synthetic data
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class RealDataIssuesFixer {
  constructor() {
    this.fixes = [];
    this.warnings = [];
    this.errors = [];
  }

  /**
   * Run all fixes to ensure real data usage
   */
  async runFixes() {
    console.log('🔧 Real Data Issues Fixer');
    console.log('=' .repeat(40));
    console.log('This script will fix identified issues to ensure');
    console.log('your system uses real market data properly.\n');

    // Fix 1: Update MarketDataFetcher to prioritize real data
    await this.fixMarketDataFetcher();
    
    // Fix 2: Update DataCollector configuration
    await this.fixDataCollectorConfig();
    
    // Fix 3: Create real-data-only configuration
    await this.createRealDataOnlyConfig();
    
    // Fix 4: Add data source monitoring
    await this.addDataSourceMonitoring();
    
    // Fix 5: Update environment configuration
    await this.updateEnvironmentConfig();
    
    // Generate summary
    this.generateFixSummary();
  }

  /**
   * Fix MarketDataFetcher to prioritize real data
   */
  async fixMarketDataFetcher() {
    console.log('🔧 Fixing MarketDataFetcher...');
    
    const fetcherPath = path.join(__dirname, 'src', 'utils', 'MarketDataFetcher.js');
    
    if (!fs.existsSync(fetcherPath)) {
      this.errors.push('MarketDataFetcher.js not found');
      return;
    }

    try {
      let fetcherCode = fs.readFileSync(fetcherPath, 'utf8');
      let modified = false;

      // Add strict real data mode
      if (!fetcherCode.includes('strictRealDataMode')) {
        const constructorMatch = fetcherCode.match(/constructor\([^)]*\)\s*{/);
        if (constructorMatch) {
          const insertPoint = fetcherCode.indexOf(constructorMatch[0]) + constructorMatch[0].length;
          const strictModeCode = `
    this.strictRealDataMode = process.env.STRICT_REAL_DATA_MODE === 'true';
    this.logDataSource = process.env.LOG_DATA_SOURCE === 'true';`;
          
          fetcherCode = fetcherCode.slice(0, insertPoint) + strictModeCode + fetcherCode.slice(insertPoint);
          modified = true;
        }
      }

      // Modify generateMockData to respect strict mode
      if (fetcherCode.includes('generateMockData') && !fetcherCode.includes('strictRealDataMode')) {
        fetcherCode = fetcherCode.replace(
          /generateMockData\([^)]*\)\s*{/,
          `generateMockData(symbol, timeframe, limit = 100) {
    if (this.strictRealDataMode) {
      throw new Error('Mock data generation disabled in strict real data mode');
    }
    
    if (this.logDataSource) {
      console.warn('⚠️ USING MOCK DATA for', symbol, timeframe);
    }`
        );
        modified = true;
      }

      // Add logging to fetchMarketData
      if (!fetcherCode.includes('logDataSource')) {
        fetcherCode = fetcherCode.replace(
          /return candles;(\s*}[\s\S]*?catch)/,
          `if (this.logDataSource) {
        console.log('✅ REAL DATA fetched for', symbol, timeframe, '- candles:', candles.length);
      }
      
      return candles;$1`
        );
        modified = true;
      }

      if (modified) {
        // Create backup
        fs.writeFileSync(fetcherPath + '.backup', fs.readFileSync(fetcherPath));
        
        // Write modified file
        fs.writeFileSync(fetcherPath, fetcherCode);
        this.fixes.push('Updated MarketDataFetcher with strict real data mode');
        console.log('   ✅ Added strict real data mode');
        console.log('   ✅ Added data source logging');
        console.log('   ✅ Created backup file');
      } else {
        this.warnings.push('MarketDataFetcher already appears to be updated');
        console.log('   ⚠️ Already appears to be updated');
      }

    } catch (error) {
      this.errors.push(`Failed to fix MarketDataFetcher: ${error.message}`);
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  /**
   * Fix DataCollector configuration
   */
  async fixDataCollectorConfig() {
    console.log('\n🔧 Fixing DataCollector configuration...');
    
    const dataCollectorPath = path.join(__dirname, 'src', 'core', 'DataCollector.js');
    
    if (!fs.existsSync(dataCollectorPath)) {
      this.warnings.push('DataCollector.js not found - may not be used');
      console.log('   ⚠️ DataCollector.js not found');
      return;
    }

    try {
      let dataCollectorCode = fs.readFileSync(dataCollectorPath, 'utf8');
      let modified = false;

      // Force real data mode in constructor
      if (!dataCollectorCode.includes('FORCE_REAL_DATA')) {
        const useMockDataLine = dataCollectorCode.match(/this\.useMockData\s*=.*?;/);
        if (useMockDataLine) {
          const replacement = `this.useMockData = process.env.FORCE_REAL_DATA === 'true' ? false : (config.useMockData || !this.apiKey);
    
    // Log data source mode
    if (process.env.LOG_DATA_SOURCE === 'true') {
      console.log(this.useMockData ? '⚠️ DataCollector: MOCK DATA MODE' : '✅ DataCollector: REAL DATA MODE');
    }`;
          
          dataCollectorCode = dataCollectorCode.replace(useMockDataLine[0], replacement);
          modified = true;
        }
      }

      // Add strict mode check to generateMockData
      if (dataCollectorCode.includes('generateMockData') && !dataCollectorCode.includes('STRICT_REAL_DATA_MODE')) {
        dataCollectorCode = dataCollectorCode.replace(
          /generateMockData\([^)]*\)\s*{/,
          `generateMockData(currencyPair, outputsize = 20) {
    if (process.env.STRICT_REAL_DATA_MODE === 'true') {
      throw new Error('Mock data generation disabled in strict real data mode');
    }
    
    if (process.env.LOG_DATA_SOURCE === 'true') {
      console.warn('⚠️ GENERATING MOCK DATA for', currencyPair);
    }`
        );
        modified = true;
      }

      if (modified) {
        // Create backup
        fs.writeFileSync(dataCollectorPath + '.backup', fs.readFileSync(dataCollectorPath));
        
        // Write modified file
        fs.writeFileSync(dataCollectorPath, dataCollectorCode);
        this.fixes.push('Updated DataCollector with real data enforcement');
        console.log('   ✅ Added real data enforcement');
        console.log('   ✅ Added data source logging');
        console.log('   ✅ Created backup file');
      } else {
        this.warnings.push('DataCollector already appears to be updated');
        console.log('   ⚠️ Already appears to be updated');
      }

    } catch (error) {
      this.errors.push(`Failed to fix DataCollector: ${error.message}`);
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  /**
   * Create real-data-only configuration
   */
  async createRealDataOnlyConfig() {
    console.log('\n🔧 Creating real-data-only configuration...');
    
    const configPath = path.join(__dirname, '.env.real-data-only');
    
    try {
      // Read current .env
      const currentEnv = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      
      // Create real-data-only version
      let realDataEnv = currentEnv;
      
      // Add or update real data settings
      const realDataSettings = `
# ===========================================
# REAL DATA ENFORCEMENT SETTINGS
# ===========================================

# Force real data mode (disable all mock data fallbacks)
STRICT_REAL_DATA_MODE=true

# Force real data in DataCollector
FORCE_REAL_DATA=true

# Log data source usage for monitoring
LOG_DATA_SOURCE=true

# Disable mock data usage
USE_MOCK_DATA=false

# Enable data source monitoring
MONITOR_DATA_SOURCES=true

# Alert on data source failures
ALERT_ON_DATA_FAILURE=true
`;

      // Remove existing real data settings if present
      realDataEnv = realDataEnv.replace(/# REAL DATA ENFORCEMENT SETTINGS[\s\S]*?(?=\n# [A-Z]|\n$|$)/g, '');
      
      // Add new settings
      realDataEnv += realDataSettings;
      
      fs.writeFileSync(configPath, realDataEnv);
      this.fixes.push('Created .env.real-data-only configuration');
      console.log('   ✅ Created .env.real-data-only');
      console.log('   ✅ Added strict real data enforcement');
      console.log('   ✅ Added data source monitoring');

    } catch (error) {
      this.errors.push(`Failed to create real-data-only config: ${error.message}`);
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  /**
   * Add data source monitoring
   */
  async addDataSourceMonitoring() {
    console.log('\n🔧 Adding data source monitoring...');
    
    const monitorPath = path.join(__dirname, 'utils', 'data-source-monitor.js');
    
    try {
      // Ensure utils directory exists
      const utilsDir = path.dirname(monitorPath);
      if (!fs.existsSync(utilsDir)) {
        fs.mkdirSync(utilsDir, { recursive: true });
      }

      const monitorCode = `/**
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
    const logEntry = \`[\${timestamp}] REAL DATA: \${source} - \${symbol} \${timeframe}\\n\`;
    
    fs.appendFileSync(this.logFile, logEntry);
    
    if (process.env.LOG_DATA_SOURCE === 'true') {
      console.log(\`✅ REAL DATA: \${source} - \${symbol} \${timeframe}\`);
    }
  }

  /**
   * Log synthetic data usage (and alert if threshold exceeded)
   */
  logSyntheticDataUsage(source, symbol, timeframe, reason) {
    const timestamp = new Date().toISOString();
    const logEntry = \`[\${timestamp}] SYNTHETIC DATA: \${source} - \${symbol} \${timeframe} - Reason: \${reason}\\n\`;
    
    fs.appendFileSync(this.logFile, logEntry);
    
    this.syntheticDataCount++;
    
    console.warn(\`⚠️ SYNTHETIC DATA: \${source} - \${symbol} \${timeframe} - Reason: \${reason}\`);
    
    if (this.syntheticDataCount >= this.alertThreshold) {
      this.alertSyntheticDataUsage();
    }
  }

  /**
   * Alert when too much synthetic data is being used
   */
  alertSyntheticDataUsage() {
    const alertMessage = \`🚨 ALERT: \${this.syntheticDataCount} synthetic data usages detected! Check data sources immediately.\`;
    
    console.error(alertMessage);
    
    // Log alert
    const timestamp = new Date().toISOString();
    const alertEntry = \`[\${timestamp}] ALERT: \${this.syntheticDataCount} synthetic data usages\\n\`;
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
    const lines = logContent.split('\\n').filter(line => line.trim());
    
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

module.exports = { DataSourceMonitor, monitor };`;

      fs.writeFileSync(monitorPath, monitorCode);
      this.fixes.push('Created data source monitoring system');
      console.log('   ✅ Created data-source-monitor.js');
      console.log('   ✅ Added real/synthetic data logging');
      console.log('   ✅ Added alert system for synthetic data usage');

    } catch (error) {
      this.errors.push(`Failed to create data source monitor: ${error.message}`);
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  /**
   * Update environment configuration
   */
  async updateEnvironmentConfig() {
    console.log('\n🔧 Updating environment configuration...');
    
    const envPath = path.join(__dirname, '.env');
    
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      let modified = false;

      // Add real data enforcement settings if not present
      const realDataSettings = [
        'STRICT_REAL_DATA_MODE=true',
        'FORCE_REAL_DATA=true',
        'LOG_DATA_SOURCE=true',
        'USE_MOCK_DATA=false',
        'MONITOR_DATA_SOURCES=true'
      ];

      for (const setting of realDataSettings) {
        const [key] = setting.split('=');
        const regex = new RegExp(`^${key}=.*$`, 'm');
        
        if (regex.test(envContent)) {
          // Update existing setting
          envContent = envContent.replace(regex, setting);
          console.log(`   ✅ Updated ${key}`);
        } else {
          // Add new setting
          envContent += `\n${setting}`;
          console.log(`   ✅ Added ${key}`);
        }
        modified = true;
      }

      if (modified) {
        // Create backup
        fs.writeFileSync(envPath + '.backup', fs.readFileSync(envPath));
        
        // Write updated file
        fs.writeFileSync(envPath, envContent);
        this.fixes.push('Updated .env with real data enforcement settings');
        console.log('   ✅ Created backup of .env');
        console.log('   ✅ Updated environment configuration');
      } else {
        this.warnings.push('Environment configuration already up to date');
        console.log('   ⚠️ Already up to date');
      }

    } catch (error) {
      this.errors.push(`Failed to update environment config: ${error.message}`);
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  /**
   * Generate fix summary
   */
  generateFixSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('🎯 REAL DATA FIXES SUMMARY');
    console.log('='.repeat(50));

    // Fixes applied
    if (this.fixes.length > 0) {
      console.log('\n✅ FIXES APPLIED:');
      for (const fix of this.fixes) {
        console.log(`   • ${fix}`);
      }
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      for (const warning of this.warnings) {
        console.log(`   • ${warning}`);
      }
    }

    // Errors
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      for (const error of this.errors) {
        console.log(`   • ${error}`);
      }
    }

    // Next steps
    console.log('\n🚀 NEXT STEPS:');
    console.log('   1. 🔄 Restart your application to apply changes');
    console.log('   2. 🧪 Run the data quality tests again:');
    console.log('      node test-currency-pairs-simple.js');
    console.log('      node test-real-vs-synthetic-data.js');
    console.log('   3. 📊 Monitor data source usage in logs');
    console.log('   4. ✅ Verify 80%+ real data confidence score');
    console.log('   5. 🚀 Proceed with live trading only after verification');

    // Configuration instructions
    console.log('\n⚙️ CONFIGURATION OPTIONS:');
    console.log('   • Use .env.real-data-only for strict real data mode');
    console.log('   • Set STRICT_REAL_DATA_MODE=true to disable all mock data');
    console.log('   • Set LOG_DATA_SOURCE=true to monitor data sources');
    console.log('   • Check logs/data-source-monitor.log for usage tracking');

    // Save summary
    this.saveSummary();
  }

  /**
   * Save fix summary to file
   */
  saveSummary() {
    const summaryPath = path.join(__dirname, 'test-results', 'real-data-fixes-summary.json');
    
    // Ensure directory exists
    const dir = path.dirname(summaryPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const summary = {
      timestamp: new Date().toISOString(),
      fixes: this.fixes,
      warnings: this.warnings,
      errors: this.errors,
      nextSteps: [
        'Restart application',
        'Run data quality tests',
        'Monitor data source usage',
        'Verify real data confidence',
        'Proceed with live trading'
      ]
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Fix summary saved to: ${summaryPath}`);
  }
}

// Run the fixes if this file is executed directly
if (require.main === module) {
  const fixer = new RealDataIssuesFixer();
  fixer.runFixes().catch(console.error);
}

module.exports = { RealDataIssuesFixer };