/**
 * View Trading Statistics
 * 
 * This script displays comprehensive trading statistics and AI training data.
 */

const { ThreeBrainOrchestrator } = require('./src/layers/ThreeBrainOrchestrator');
const { Config } = require('./src/config/Config');

class StatisticsViewer {
  constructor() {
    this.orchestrator = null;
    this.config = null;
  }

  async start() {
    try {
      console.log('📊 Trading Statistics Viewer\n');
      
      // Load configuration
      this.config = await Config.load();
      
      // Initialize orchestrator
      this.orchestrator = new ThreeBrainOrchestrator(this.config);
      
      // Display all statistics
      await this.displayAllStatistics();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  async displayAllStatistics() {
    // Trade statistics
    await this.displayTradeStatistics();
    
    // Recent performance
    await this.displayRecentPerformance();
    
    // Successful patterns
    await this.displaySuccessfulPatterns();
    
    // Pending signals
    await this.displayPendingSignals();
  }

  async displayTradeStatistics() {
    try {
      const stats = this.orchestrator.getTradeStatistics();
      
      console.log('📈 OVERALL TRADE STATISTICS');
      console.log('═════════════════════════════════════════════════════════════');
      console.log(`Total Trades: ${stats.totalTrades}`);
      console.log(`Winning Trades: ${stats.winningTrades}`);
      console.log(`Losing Trades: ${stats.losingTrades}`);
      console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
      console.log(`Total Profit: $${stats.totalProfit.toFixed(2)}`);
      console.log(`Total Loss: $${stats.totalLoss.toFixed(2)}`);
      console.log(`Net P&L: $${stats.netPnL.toFixed(2)}`);
      console.log(`Last Updated: ${new Date(stats.lastUpdated).toLocaleString()}`);
      
      // Quality breakdown
      if (stats.qualityBreakdown && Object.keys(stats.qualityBreakdown).length > 0) {
        console.log('\n📊 PERFORMANCE BY SIGNAL QUALITY:');
        console.log('─────────────────────────────────────────────────────────────');
        
        for (const [quality, breakdown] of Object.entries(stats.qualityBreakdown)) {
          const successRate = (breakdown.successRate * 100).toFixed(1);
          const avgPnl = breakdown.avgPnl.toFixed(2);
          
          console.log(`${quality.padEnd(12)} │ ${breakdown.wins}/${breakdown.total} (${successRate}%) │ Avg P&L: $${avgPnl}`);
        }
      }
      
    } catch (error) {
      console.log('⚠️  Could not load trade statistics:', error.message);
    }
  }

  async displayRecentPerformance() {
    try {
      const recentData = await this.orchestrator.tradeLogger.getRecentPerformance();
      
      console.log('\n📅 RECENT PERFORMANCE (Last 20 Trades)');
      console.log('═════════════════════════════════════════════════════════════');
      console.log(`Recent Trades: ${recentData.recentTradeCount}`);
      console.log(`Recent Success Rate: ${(recentData.recentSuccessRate * 100).toFixed(1)}%`);
      console.log(`Recent Net P&L: $${recentData.recentNetPnL.toFixed(2)}`);
      
      if (recentData.trades && recentData.trades.length > 0) {
        console.log('\n📋 Recent Trade Details:');
        console.log('─────────────────────────────────────────────────────────────');
        
        recentData.trades.slice(-10).forEach((trade, index) => {
          const time = new Date(trade.timestamp).toLocaleString();
          const outcome = trade.outcome;
          const signal = trade.originalSignal;
          
          if (outcome.executed) {
            const result = outcome.won ? '✅ WIN' : '❌ LOSS';
            console.log(`${index + 1}. [${time}] ${result} - ${signal.signalQuality} (${signal.tradeScore}/100) - P&L: $${outcome.pnl}`);
          } else {
            console.log(`${index + 1}. [${time}] ⏭️  NOT EXECUTED - ${signal.signalQuality} (${signal.tradeScore}/100)`);
          }
        });
      }
      
    } catch (error) {
      console.log('⚠️  Could not load recent performance:', error.message);
    }
  }

  async displaySuccessfulPatterns() {
    try {
      const patterns = await this.orchestrator.getSuccessfulPatterns(10);
      
      console.log('\n🎓 SUCCESSFUL PATTERNS (For AI Training)');
      console.log('═════════════════════════════════════════════════════════════');
      
      if (patterns.length === 0) {
        console.log('No successful patterns recorded yet.');
        return;
      }
      
      patterns.slice(0, 5).forEach((pattern, index) => {
        const characteristics = pattern.signalCharacteristics;
        const success = pattern.successMetrics;
        
        console.log(`${index + 1}. Pattern ID: ${pattern.patternId}`);
        console.log(`   Signal Quality: ${characteristics.signalQuality} (Score: ${characteristics.tradeScore}/100)`);
        console.log(`   Asset: ${characteristics.asset} - Direction: ${characteristics.direction}`);
        console.log(`   Confidence: ML ${(characteristics.quantConfidence * 100).toFixed(1)}%, LLM ${(characteristics.analystConfidence * 100).toFixed(1)}%`);
        console.log(`   Confluence: ${characteristics.confluenceScore}/100, Risk: ${(characteristics.riskScore * 100).toFixed(1)}%`);
        console.log(`   Success: P&L ${success.pnl} (${success.pnlPercentage.toFixed(1)}%)`);
        console.log(`   Time: ${new Date(pattern.timestamp).toLocaleString()}`);
        console.log('');
      });
      
      console.log(`📚 Total successful patterns available for AI training: ${patterns.length}`);
      
    } catch (error) {
      console.log('⚠️  Could not load successful patterns:', error.message);
    }
  }

  async displayPendingSignals() {
    try {
      const pendingSignals = await this.orchestrator.getPendingSignals();
      
      console.log('\n📋 PENDING SIGNALS (Awaiting Trade Results)');
      console.log('═════════════════════════════════════════════════════════════');
      
      if (pendingSignals.length === 0) {
        console.log('No pending signals for manual review.');
        return;
      }
      
      pendingSignals.slice(0, 10).forEach((signal, index) => {
        const time = new Date(signal.timestamp).toLocaleString();
        const quality = signal.signalQuality;
        const score = signal.tradeScore;
        const asset = signal.tradeRecommendation?.asset || 'N/A';
        const direction = signal.tradeRecommendation?.direction || 'N/A';
        
        console.log(`${index + 1}. [${time}] ${signal.signalId}`);
        console.log(`   Quality: ${quality} (${score}/100) - ${direction} ${asset}`);
        console.log(`   Recommendation: ${signal.tradeRecommendation?.shouldTrade || 'N/A'}`);
        console.log('');
      });
      
      console.log(`📝 Use 'node log-trade-result.js' to log results for these signals.`);
      
    } catch (error) {
      console.log('⚠️  Could not load pending signals:', error.message);
    }
  }
}

// Start the statistics viewer if run directly
if (require.main === module) {
  const viewer = new StatisticsViewer();
  viewer.start();
}

module.exports = { StatisticsViewer };