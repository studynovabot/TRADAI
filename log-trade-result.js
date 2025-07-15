 /**
 * Manual Trade Result Logger
 * 
 * This script allows you to log manual trade results for AI training.
 * Run this script after taking a trade based on system signals.
 */

const { ThreeBrainOrchestrator } = require('./src/layers/ThreeBrainOrchestrator');
const { Config } = require('./src/config/Config');
const readline = require('readline');

class TradeResultLogger {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.orchestrator = null;
    this.config = null;
  }

  async start() {
    try {
      console.log('📝 Manual Trade Result Logger\n');
      
      // Load configuration
      this.config = await Config.load();
      
      // Initialize orchestrator for logging
      this.orchestrator = new ThreeBrainOrchestrator(this.config);
      
      // Show pending signals
      await this.showPendingSignals();
      
      // Start logging process
      await this.logTradeResult();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  async showPendingSignals() {
    try {
      const pendingSignals = await this.orchestrator.getPendingSignals();
      
      if (pendingSignals.length === 0) {
        console.log('ℹ️  No pending signals found for manual review.');
        console.log('   Start the signal system first to generate signals.\n');
        return;
      }
      
      console.log('📋 Available Signals for Trade Logging:');
      console.log('═════════════════════════════════════════════════════════════');
      
      pendingSignals.slice(0, 10).forEach((signal, index) => {
        const time = new Date(signal.timestamp).toLocaleTimeString();
        const quality = signal.signalQuality;
        const score = signal.tradeScore;
        const asset = signal.tradeRecommendation?.asset || 'N/A';
        const direction = signal.tradeRecommendation?.direction || 'N/A';
        
        console.log(`${index + 1}. [${time}] ${signal.signalId}`);
        console.log(`   Quality: ${quality} (${score}/100) - ${direction} ${asset}`);
        console.log(`   Recommendation: ${signal.tradeRecommendation?.shouldTrade || 'N/A'}`);
        console.log('');
      });
      
    } catch (error) {
      console.log('⚠️  Could not load pending signals:', error.message);
    }
  }

  async logTradeResult() {
    try {
      // Get signal ID
      const signalId = await this.question('Enter Signal ID: ');
      
      if (!signalId) {
        console.log('❌ Signal ID is required');
        return;
      }
      
      // Check if trade was executed
      const executed = await this.question('Did you execute this trade? (y/n): ');
      
      if (executed.toLowerCase() !== 'y') {
        console.log('ℹ️  Trade not executed. No logging needed.');
        return;
      }
      
      // Get trade details
      const won = await this.question('Did the trade win? (y/n): ');
      const pnl = await this.question('Enter P&L amount (e.g., 8.50 for profit, -10.00 for loss): ');
      const amount = await this.question('Enter trade amount (e.g., 10.00): ');
      const rating = await this.question('Rate the signal quality (1-5): ');
      const notes = await this.question('Additional notes (optional): ');
      
      // Create trade outcome
      const tradeOutcome = {
        executed: true,
        won: won.toLowerCase() === 'y',
        pnl: parseFloat(pnl) || 0,
        actualAmount: parseFloat(amount) || 10,
        executionTime: new Date().toISOString(),
        expiryTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        signalQualityRating: parseInt(rating) || null,
        additionalNotes: notes || '',
        tradeDecisionReason: 'Manual trading decision based on AI signal'
      };
      
      // Log the trade result
      console.log('\n📊 Logging trade result...');
      const result = await this.orchestrator.logManualTradeResult(signalId, tradeOutcome);
      
      console.log('✅ Trade result logged successfully!');
      console.log(`   Signal ID: ${signalId}`);
      console.log(`   Result: ${tradeOutcome.won ? 'WIN' : 'LOSS'}`);
      console.log(`   P&L: ${tradeOutcome.pnl}`);
      console.log(`   This data will help improve AI model accuracy.\n`);
      
      // Show updated statistics
      await this.showTradeStatistics();
      
    } catch (error) {
      console.error('❌ Error logging trade result:', error.message);
    } finally {
      this.rl.close();
    }
  }

  async showTradeStatistics() {
    try {
      const stats = this.orchestrator.getTradeStatistics();
      
      console.log('📊 Updated Trade Statistics:');
      console.log('═════════════════════════════════════════════════════════════');
      console.log(`Total Trades: ${stats.totalTrades}`);
      console.log(`Winning Trades: ${stats.winningTrades}`);
      console.log(`Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
      console.log(`Net P&L: $${stats.netPnL.toFixed(2)}`);
      
      // Show quality breakdown
      if (stats.qualityBreakdown) {
        console.log('\n📈 Performance by Signal Quality:');
        for (const [quality, breakdown] of Object.entries(stats.qualityBreakdown)) {
          console.log(`   ${quality}: ${breakdown.wins}/${breakdown.total} (${(breakdown.successRate * 100).toFixed(1)}%)`);
        }
      }
      
    } catch (error) {
      console.log('⚠️  Could not load trade statistics:', error.message);
    }
  }

  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Start the trade result logger if run directly
if (require.main === module) {
  const logger = new TradeResultLogger();
  logger.start();
}

module.exports = { TradeResultLogger };