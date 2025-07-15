/**
 * 3-Layer AI Trading System - Main Entry Point
 * 
 * This script starts the complete 3-layer AI trading system with:
 * - Real-time Twelve Data API integration (every 2 minutes)
 * - Quant Brain (ML predictions)
 * - Analyst Brain (LLM validation)
 * - Reflex Brain (execution decisions)
 * - 5-minute binary options signals
 */

const { ThreeBrainOrchestrator } = require('./src/layers/ThreeBrainOrchestrator');
const { Config } = require('./src/config/Config');
const { Logger } = require('./src/utils/Logger');

class ThreeBrainTradingSystem {
  constructor() {
    this.orchestrator = null;
    this.logger = null;
    this.config = null;
    this.isRunning = false;
  }

  async start() {
    try {
      console.log('🚀 Starting 3-Layer AI Trading System...\n');
      
      // Load configuration
      this.config = await Config.load();
      
      // Initialize logger
      this.logger = Logger.getInstanceSync();
      
      // Display system information
      this.displaySystemInfo();
      
      // Validate configuration
      this.validateConfiguration();
      
      // Initialize orchestrator
      this.orchestrator = new ThreeBrainOrchestrator(this.config);
      
      // Start the system
      const result = await this.orchestrator.start();
      
      this.isRunning = true;
      
      // Display startup success
      this.displayStartupSuccess(result);
      
      // Set up graceful shutdown
      this.setupGracefulShutdown();
      
      // Start monitoring loop
      this.startSystemMonitoring();
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to start trading system:', error.message);
      this.logger?.error('System startup failed:', error);
      process.exit(1);
    }
  }

  displaySystemInfo() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  3-LAYER AI TRADING SYSTEM                  ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  🧠 Layer 1: Quant Brain (ML Predictions)                   ║');
    console.log('║  🧠 Layer 2: Analyst Brain (LLM Validation)                 ║');
    console.log('║  ⚡ Layer 3: Reflex Brain (Execution Decisions)             ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  📊 Currency Pair: ${this.config.currencyPair.padEnd(43)} ║`);
    console.log(`║  ⏰ Signal Interval: Every 2 minutes                        ║`);
    console.log(`║  🎯 Trade Duration: 5-minute binary options                 ║`);
    console.log(`║  💰 Trade Amount: $${this.config.tradeAmount.toString().padEnd(39)} ║`);
    console.log(`║  📈 Data Source: Twelve Data API                            ║`);
    console.log(`║  🤖 AI Provider: ${(this.config.aiProvider || 'groq').toUpperCase().padEnd(40)} ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
  }

  validateConfiguration() {
    const issues = [];
    
    // Check API keys
    if (!this.config.twelveDataApiKey) {
      issues.push('❌ TWELVE_DATA_API_KEY not configured - will use mock data');
    } else {
      console.log('✅ Twelve Data API key configured');
    }
    
    if (!this.config.groqApiKey && !this.config.togetherApiKey) {
      issues.push('❌ No AI provider API keys found (GROQ_API_KEY or TOGETHER_API_KEY)');
    } else {
      if (this.config.groqApiKey) console.log('✅ Groq API key configured');
      if (this.config.togetherApiKey) console.log('✅ Together AI API key configured');
    }
    
    // Check trading configuration
    if (this.config.minConfidence < 50) {
      issues.push('⚠️  Minimum confidence is very low - consider increasing');
    }
    
    if (this.config.tradeAmount > 100) {
      issues.push('⚠️  Trade amount is high - ensure you understand the risks');
    }
    
    // Display issues
    if (issues.length > 0) {
      console.log('\n🔍 Configuration Issues:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    } else {
      console.log('✅ Configuration validation passed\n');
    }
    
    // Fatal errors
    if (!this.config.groqApiKey && !this.config.togetherApiKey) {
      throw new Error('At least one AI provider API key is required');
    }
  }

  displayStartupSuccess(result) {
    console.log('✅ 3-Layer AI Trading System Started Successfully!\n');
    
    console.log('📊 System Status:');
    console.log(`   • Health: ${result.health.healthy ? '🟢 HEALTHY' : '🟡 DEGRADED'}`);
    console.log(`   • Market Data: ${result.health.components.marketData === 'HEALTHY' ? '🟢' : '🟡'} ${result.health.components.marketData}`);
    console.log(`   • Quant Brain: ${result.health.components.quantBrain === 'HEALTHY' ? '🟢' : '🟡'} ${result.health.components.quantBrain}`);
    console.log(`   • Analyst Brain: ${result.health.components.analystBrain === 'HEALTHY' ? '🟢' : '🟡'} ${result.health.components.analystBrain}`);
    console.log(`   • Reflex Brain: ${result.health.components.reflexBrain === 'HEALTHY' ? '🟢' : '🟡'} ${result.health.components.reflexBrain}\n`);
    
    console.log('🔄 Active Processes:');
    console.log('   • 📡 Market data fetching every 2 minutes');
    console.log('   • 🎯 Signal generation every 2 minutes');
    console.log('   • 🧠 AI analysis for each signal');
    console.log('   • ⚡ Real-time execution decisions\n');
    
    console.log('📋 What happens next:');
    console.log('   1. System fetches live market data from Twelve Data API');
    console.log('   2. Quant Brain analyzes technical indicators and patterns');
    console.log('   3. Analyst Brain validates using LLM technical confluence');
    console.log('   4. Reflex Brain evaluates signal quality and generates recommendation');
    console.log('   5. Signals are displayed with detailed analysis for manual trading');
    console.log('   6. You can log trade results to improve AI model accuracy\n');
    
    console.log('🎯 SIGNAL-ONLY MODE: System generates signals for manual trading');
    console.log('📝 Manual trade logging available for AI training');
    console.log('');
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal} - Shutting down gracefully...`);
      
      if (this.orchestrator && this.isRunning) {
        try {
          await this.orchestrator.stop();
          console.log('✅ System shutdown completed');
        } catch (error) {
          console.error('❌ Error during shutdown:', error.message);
        }
      }
      
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.logger?.error('Uncaught Exception:', error);
      if (this.orchestrator) {
        this.orchestrator.emergencyShutdown(`Uncaught Exception: ${error.message}`);
      }
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.logger?.error('Unhandled Rejection:', { promise, reason });
    });
  }

  startSystemMonitoring() {
    // Display system stats every 5 minutes
    setInterval(() => {
      if (this.orchestrator && this.isRunning) {
        this.displaySystemStats();
      }
    }, 5 * 60 * 1000);
    
    // Display initial stats after 30 seconds
    setTimeout(() => {
      if (this.orchestrator && this.isRunning) {
        this.displaySystemStats();
      }
    }, 30000);
  }

  displaySystemStats() {
    try {
      const stats = this.orchestrator.getSystemStats();
      
      console.log('\n📊 System Statistics:');
      console.log('═══════════════════════════════════════════════════════════════');
      
      // System overview
      console.log(`🟢 System Health: ${stats.system.health}`);
      console.log(`⏱️  Uptime: ${this.formatUptime(stats.system.uptime)}`);
      console.log(`🎯 Current Signal: ${stats.system.currentSignal || 'None'}`);
      
      // Performance metrics
      console.log(`\n📈 Signal Generation Performance:`);
      console.log(`   • Total Signals: ${stats.performance.signalGeneration.totalSignals}`);
      console.log(`   • Signals Today: ${stats.performance.signalGeneration.signalsToday}`);
      console.log(`   • Avg Processing Time: ${stats.performance.signalGeneration.averageProcessingTime.toFixed(0)}ms`);
      
      // Manual trading performance
      console.log(`\n💰 Manual Trading Performance:`);
      console.log(`   • Manual Trades: ${stats.performance.manualTrades.totalTrades}`);
      console.log(`   • Successful Trades: ${stats.performance.manualTrades.successfulTrades}`);
      console.log(`   • Success Rate: ${(stats.performance.manualTrades.successRate * 100).toFixed(1)}%`);
      console.log(`   • Net P&L: $${stats.performance.manualTrades.netPnL.toFixed(2)}`);
      
      // Brain performance
      console.log(`\n🧠 Brain Performance:`);
      console.log(`   • Quant Brain: ${stats.performance.brainPerformance.quant.predictions} predictions, ${stats.performance.brainPerformance.quant.failures} failures`);
      console.log(`   • Analyst Brain: ${stats.performance.brainPerformance.analyst.validations} validations, ${stats.performance.brainPerformance.analyst.failures} failures`);
      console.log(`   • Reflex Brain: ${stats.performance.brainPerformance.reflex.decisions} decisions, ${stats.performance.brainPerformance.reflex.failures} failures`);
      
      // Market data status
      console.log(`\n📊 Market Data:`);
      console.log(`   • Health: ${stats.marketData.isHealthy ? '🟢 HEALTHY' : '🟡 DEGRADED'}`);
      console.log(`   • Requests Today: ${stats.marketData.requestCount}/${stats.marketData.dailyRemaining + stats.marketData.requestCount}`);
      console.log(`   • Data Freshness: ${stats.marketData.dataFreshness ? '🟢 FRESH' : '🟡 STALE'}`);
      console.log(`   • Consecutive Errors: ${stats.marketData.consecutiveErrors}`);
      
      // Recent signals
      if (stats.recentSignals && stats.recentSignals.length > 0) {
        console.log(`\n📋 Recent Signals (Last 5):`);
        stats.recentSignals.slice(0, 5).forEach((signal, index) => {
          const quality = signal.signalQuality || 'UNKNOWN';
          const score = signal.tradeScore || 0;
          const time = new Date(signal.timestamp).toLocaleTimeString();
          const asset = signal.tradeRecommendation?.asset || 'N/A';
          const direction = signal.tradeRecommendation?.direction || 'N/A';
          console.log(`   ${index + 1}. [${time}] ${quality} (${score}/100) - ${direction} ${asset}`);
        });
      }
      
      console.log('═══════════════════════════════════════════════════════════════\n');
      
    } catch (error) {
      console.error('❌ Error displaying system stats:', error.message);
    }
  }

  formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // API methods for external control
  
  async getSystemStatus() {
    if (!this.orchestrator) return { error: 'System not initialized' };
    return this.orchestrator.getSystemStats();
  }

  async changeCurrencyPair(newPair) {
    if (!this.orchestrator) return { error: 'System not initialized' };
    this.orchestrator.changeCurrencyPair(newPair);
    return { success: true, newPair };
  }

  async enableAutoTrading(enabled = true) {
    if (!this.orchestrator) return { error: 'System not initialized' };
    this.orchestrator.setAutoTrading(enabled);
    return { success: true, autoTrading: enabled };
  }

  async updateTradeResult(signalId, won, pnl) {
    if (!this.orchestrator) return { error: 'System not initialized' };
    const result = await this.orchestrator.updateTradeResult(signalId, won, pnl);
    return { success: true, signalId, result: won ? 'WIN' : 'LOSS', pnl };
  }

  async logManualTradeResult(signalId, tradeOutcome) {
    if (!this.orchestrator) return { error: 'System not initialized' };
    return await this.orchestrator.logManualTradeResult(signalId, tradeOutcome);
  }

  async getTradeStatistics() {
    if (!this.orchestrator) return { error: 'System not initialized' };
    return this.orchestrator.getTradeStatistics();
  }

  async getPendingSignals() {
    if (!this.orchestrator) return { error: 'System not initialized' };
    return await this.orchestrator.getPendingSignals();
  }

  async getSuccessfulPatterns(limit = 50) {
    if (!this.orchestrator) return { error: 'System not initialized' };
    return await this.orchestrator.getSuccessfulPatterns(limit);
  }

  async emergencyStop(reason = 'Manual emergency stop') {
    if (!this.orchestrator) return { error: 'System not initialized' };
    return await this.orchestrator.emergencyShutdown(reason);
  }
}

// Start the system if run directly
if (require.main === module) {
  const tradingSystem = new ThreeBrainTradingSystem();
  
  tradingSystem.start().then(() => {
    console.log('🎉 3-Layer AI Trading System is now running!');
    console.log('📱 Press Ctrl+C to stop the system gracefully\n');
    
    // Keep the process alive
    process.stdin.resume();
    
    // Display manual trading instructions
    console.log('\n📝 MANUAL TRADING INSTRUCTIONS:');
    console.log('1. Watch for signals displayed in the console');
    console.log('2. Use the signal quality and recommendation to make trading decisions');
    console.log('3. If you take a trade, you can log the result for AI training');
    console.log('4. Run: node -e "require(\'./start-three-brain-system\').logTradeResult()" to log results');
    console.log('5. View statistics with: node -e "require(\'./start-three-brain-system\').showStats()"');
    
  }).catch(error => {
    console.error('💥 Failed to start trading system:', error);
    process.exit(1);
  });
}

module.exports = { ThreeBrainTradingSystem };