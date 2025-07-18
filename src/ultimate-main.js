/**
 * Ultimate Trading Signal System - Main Entry Point
 * 
 * This is the main entry point for the enhanced 85-90% accuracy trading system
 * with multi-source data fusion and advanced AI validation
 */

const { Config } = require('./config/Config');
const { UltimateOrchestrator } = require('./layers/UltimateOrchestrator');
const { Logger } = require('./utils/Logger');

class UltimateTradingSystem {
  constructor() {
    this.orchestrator = null;
    this.logger = null;
    this.isRunning = false;
  }

  /**
   * Initialize and start the ultimate trading system
   */
  async start() {
    try {
      console.log('🚀 Starting Ultimate AI Trading Signal System...');
      console.log('🎯 Target: 85-90% Accuracy with Multi-Source Data Fusion');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      // Load configuration
      console.log('📋 Loading configuration...');
      const config = await Config.load();
      
      // Initialize logger
      this.logger = Logger.getInstanceSync();
      this.logger.info('🚀 Ultimate Trading System starting...');
      
      // Validate configuration
      this.validateConfiguration(config);
      
      // Initialize orchestrator
      console.log('🧠 Initializing Ultimate Orchestrator...');
      this.orchestrator = new UltimateOrchestrator(config);
      
      // Start the system
      console.log('⚡ Starting system components...');
      const startResult = await this.orchestrator.start();
      
      if (startResult.started) {
        this.isRunning = true;
        
        console.log('\n✅ ULTIMATE TRADING SYSTEM STARTED SUCCESSFULLY!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 System Configuration:');
        console.log(`   🎯 Target Accuracy: ${config.targetAccuracy}%`);
        console.log(`   📈 Max Daily Signals: ${config.maxDailySignals}`);
        console.log(`   ⚡ Signal Interval: ${config.signalGenerationInterval || 2} minutes`);
        console.log(`   💱 Trading Pair: ${config.currencyPair}`);
        console.log(`   🔒 Safe Zones Only: ${config.safeZonesOnly ? 'YES' : 'NO'}`);
        console.log('\n📡 Data Sources:');
        console.log(`   📊 Twelve Data: ${config.twelveDataApiKey ? '✅' : '❌'}`);
        console.log(`   📈 Finnhub: ${config.finnhubApiKey ? '✅' : '❌'}`);
        console.log(`   📉 Alpha Vantage: ${config.alphaVantageApiKey ? '✅' : '❌'}`);
        console.log(`   📊 Polygon.io: ${config.polygonApiKey ? '✅' : '❌'}`);
        console.log('\n🤖 AI Providers:');
        console.log(`   ⚡ Groq: ${config.groqApiKey ? '✅' : '❌'}`);
        console.log(`   🚀 Together AI: ${config.togetherApiKey ? '✅' : '❌'}`);
        console.log(`   🔮 OpenRouter: ${config.openrouterApiKey ? '✅' : '❌'}`);
        console.log('\n🎯 Performance Targets:');
        console.log(`   📈 Accuracy: ${config.targetAccuracy}%`);
        console.log(`   📊 Sharpe Ratio: >${config.minSharpeRatio}`);
        console.log(`   📉 Max Drawdown: <${config.maxDrawdown}%`);
        console.log(`   🎯 Min Confidence: ${config.minSignalConfidence}%`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔥 SYSTEM IS NOW GENERATING HIGH-ACCURACY SIGNALS!');
        console.log('📊 Monitor the console for real-time signal updates...\n');
        
        // Set up graceful shutdown
        this.setupGracefulShutdown();
        
        // Start monitoring
        this.startSystemMonitoring();
        
        return startResult;
      } else {
        throw new Error('Failed to start orchestrator');
      }
      
    } catch (error) {
      console.error('❌ Failed to start Ultimate Trading System:', error.message);
      this.logger?.error('❌ System startup failed:', error);
      process.exit(1);
    }
  }

  /**
   * Validate system configuration
   */
  validateConfiguration(config) {
    const errors = [];
    
    // Check required API keys
    if (!config.twelveDataApiKey && !config.finnhubApiKey) {
      errors.push('At least one market data API key is required (Twelve Data or Finnhub)');
    }
    
    if (!config.groqApiKey && !config.togetherApiKey) {
      errors.push('At least one AI provider API key is required (Groq or Together AI)');
    }
    
    // Check performance targets
    if (config.targetAccuracy < 50 || config.targetAccuracy > 100) {
      errors.push('Target accuracy must be between 50% and 100%');
    }
    
    if (config.minSignalConfidence < 50 || config.minSignalConfidence > 100) {
      errors.push('Minimum signal confidence must be between 50% and 100%');
    }
    
    if (config.maxDailySignals < 1 || config.maxDailySignals > 100) {
      errors.push('Max daily signals must be between 1 and 100');
    }
    
    if (errors.length > 0) {
      console.error('❌ Configuration Validation Errors:');
      errors.forEach(error => console.error(`   • ${error}`));
      throw new Error('Invalid configuration');
    }
    
    console.log('✅ Configuration validated successfully');
  }

  /**
   * Set up graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      await this.stop();
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.logger?.error('❌ Uncaught Exception:', error);
      await this.stop();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      this.logger?.error('❌ Unhandled Rejection:', { promise, reason });
      await this.stop();
      process.exit(1);
    });
  }

  /**
   * Start system monitoring
   */
  startSystemMonitoring() {
    // Monitor system status every 5 minutes
    setInterval(() => {
      if (this.orchestrator && this.isRunning) {
        const status = this.orchestrator.getSystemStatus();
        const performance = this.orchestrator.getSystemPerformance();
        
        console.log('\n📊 SYSTEM STATUS UPDATE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🏥 Health: ${status.systemHealth}`);
        console.log(`📈 Performance: ${status.performanceStatus}`);
        console.log(`🎯 Daily Signals: ${status.dailySignalCount}/${status.maxDailySignals}`);
        console.log(`📊 Total Signals: ${performance.totalSignals}`);
        console.log(`✅ Approved: ${performance.approvedSignals}`);
        console.log(`❌ Rejected: ${performance.rejectedSignals}`);
        console.log(`📈 Approval Rate: ${(performance.approvalRate * 100).toFixed(1)}%`);
        console.log(`🎯 Avg Confidence: ${(performance.avgConfidence * 100).toFixed(1)}%`);
        console.log(`⚡ Avg Processing: ${performance.avgProcessingTime.toFixed(0)}ms`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Check for issues
        if (status.systemHealth !== 'HEALTHY') {
          console.warn(`⚠️ System health issue detected: ${status.systemHealth}`);
        }
        
        if (performance.approvalRate < 0.1) {
          console.warn('⚠️ Low approval rate - system may be too restrictive');
        }
        
        if (performance.avgProcessingTime > 10000) {
          console.warn('⚠️ High processing time detected');
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    // Daily performance summary
    setInterval(() => {
      if (this.orchestrator && this.isRunning) {
        this.generateDailyReport();
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  }

  /**
   * Generate daily performance report
   */
  async generateDailyReport() {
    try {
      console.log('\n📊 DAILY PERFORMANCE REPORT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const performance = this.orchestrator.getSystemPerformance();
      const dailyStats = performance.dailyStats;
      
      console.log(`📅 Date: ${new Date().toDateString()}`);
      console.log(`🎯 Daily Signals: ${dailyStats.signals}`);
      console.log(`✅ Approved: ${dailyStats.approved}`);
      console.log(`📈 Daily Approval Rate: ${dailyStats.signals > 0 ? (dailyStats.approved / dailyStats.signals * 100).toFixed(1) : 0}%`);
      console.log(`💰 Daily P&L: ${dailyStats.pnl ? dailyStats.pnl.toFixed(2) : 'N/A'}`);
      console.log(`🎯 Daily Accuracy: ${dailyStats.accuracy ? (dailyStats.accuracy * 100).toFixed(1) : 'N/A'}%`);
      
      console.log('\n🧠 Brain Performance:');
      const brainPerf = performance.brainPerformance || {};
      console.log(`   📊 Data Manager: ${brainPerf.dataManager?.avgTime?.toFixed(0) || 0}ms avg, ${brainPerf.dataManager?.failures || 0} failures`);
      console.log(`   🧠 Quant Brain: ${brainPerf.quantBrain?.avgTime?.toFixed(0) || 0}ms avg, ${(brainPerf.quantBrain?.accuracy * 100 || 0).toFixed(1)}% accuracy`);
      console.log(`   🔍 Analyst Brain: ${brainPerf.analystBrain?.avgTime?.toFixed(0) || 0}ms avg, ${(brainPerf.analystBrain?.approvalRate * 100 || 0).toFixed(1)}% approval`);
      console.log(`   ⚡ Reflex Brain: ${brainPerf.reflexBrain?.avgTime?.toFixed(0) || 0}ms avg, ${(brainPerf.reflexBrain?.rejectionRate * 100 || 0).toFixed(1)}% rejection`);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
    } catch (error) {
      console.error('❌ Failed to generate daily report:', error.message);
    }
  }

  /**
   * Stop the trading system
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ System is not running');
      return;
    }
    
    try {
      console.log('🛑 Stopping Ultimate Trading System...');
      
      if (this.orchestrator) {
        const stopResult = await this.orchestrator.stop();
        
        if (stopResult.stopped) {
          console.log('✅ Ultimate Trading System stopped successfully');
          
          // Display final statistics
          if (stopResult.finalReport) {
            console.log('\n📊 FINAL PERFORMANCE REPORT');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            const report = stopResult.finalReport;
            console.log(`🎯 Total Signals: ${report.systemInfo.totalSignals}`);
            console.log(`✅ Approved: ${report.systemInfo.approvedSignals}`);
            console.log(`❌ Rejected: ${report.systemInfo.rejectedSignals}`);
            console.log(`📈 Final Accuracy: ${(report.performance.accuracy * 100).toFixed(1)}%`);
            console.log(`🎯 Avg Confidence: ${(report.performance.avgConfidence * 100).toFixed(1)}%`);
            console.log(`⚡ Avg Processing: ${report.performance.avgProcessingTime.toFixed(0)}ms`);
            console.log(`⏱️ Total Uptime: ${this.formatUptime(report.systemInfo.uptime)}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          }
        }
      }
      
      this.isRunning = false;
      
    } catch (error) {
      console.error('❌ Error stopping system:', error.message);
      this.logger?.error('❌ System shutdown error:', error);
    }
  }

  /**
   * Format uptime for display
   */
  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    if (!this.orchestrator || !this.isRunning) {
      return { running: false, status: 'STOPPED' };
    }
    
    return {
      running: this.isRunning,
      ...this.orchestrator.getSystemStatus()
    };
  }
}

// Main execution
async function main() {
  const system = new UltimateTradingSystem();
  
  try {
    await system.start();
  } catch (error) {
    console.error('❌ Failed to start system:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { UltimateTradingSystem };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}