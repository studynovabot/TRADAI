#!/usr/bin/env node

/**
 * 🚀 TRADAI Complete Trading System Launcher
 * ==========================================
 * 
 * Production launcher for the complete AI-powered trading system
 * Handles initialization, monitoring, and graceful shutdown
 * 
 * Features:
 * - Production-ready system startup
 * - Real-time signal monitoring
 * - Performance dashboard
 * - Error handling and recovery
 * - Graceful shutdown handling
 * 
 * Usage:
 * node launch-trading-system.js [options]
 */

const { CompleteTradingSystem } = require('./complete-trading-system.js');
const fs = require('fs').promises;
const path = require('path');

class TradingSystemLauncher {
    constructor() {
        this.tradingSystem = null;
        this.isShuttingDown = false;
        this.signalCount = 0;
        this.startTime = Date.now();
        
        // Configuration
        this.config = {
            chartDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
            supportedTimeframes: ['1m', '3m', '5m'],
            minConfidenceForTrade: 70,
            autoProcessing: true,
            enableLogging: true,
            enableDashboard: true,
            dashboardInterval: 30000, // 30 seconds
            logDirectory: './logs',
            reportDirectory: './reports'
        };
    }

    /**
     * Launch the complete trading system
     */
    async launch() {
        console.log('🚀 TRADAI Complete Trading System Launcher');
        console.log('==========================================');
        console.log(`Start Time: ${new Date().toISOString()}`);
        console.log(`Chart Directory: ${this.config.chartDirectory}`);
        console.log(`Timeframes: ${this.config.supportedTimeframes.join(', ')}`);
        console.log(`Min Confidence: ${this.config.minConfidenceForTrade}%`);
        console.log(`Auto Processing: ${this.config.autoProcessing ? 'Enabled' : 'Disabled'}`);
        console.log('');

        try {
            // Initialize trading system
            this.tradingSystem = new CompleteTradingSystem(this.config);
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Set up graceful shutdown
            this.setupGracefulShutdown();
            
            // Initialize and start system
            await this.tradingSystem.initialize();
            await this.tradingSystem.start();
            
            // Start dashboard if enabled
            if (this.config.enableDashboard) {
                this.startDashboard();
            }
            
            console.log('✅ TRADAI Complete Trading System is now LIVE!');
            console.log('🎯 Monitoring for trading opportunities...');
            console.log('📊 Dashboard updates every 30 seconds');
            console.log('🛑 Press Ctrl+C to stop the system gracefully');
            console.log('');
            
            // Keep the process running
            await this.keepAlive();
            
        } catch (error) {
            console.error('❌ Failed to launch trading system:', error.message);
            console.error(error.stack);
            process.exit(1);
        }
    }

    /**
     * Set up event handlers for the trading system
     */
    setupEventHandlers() {
        // Signal generation handler
        this.tradingSystem.onSignalGenerated = (signal) => {
            this.signalCount++;
            this.displaySignal(signal);
            this.saveSignalReport(signal);
        };

        // Error handler
        this.tradingSystem.onError = (error, context) => {
            console.error(`\n❌ System Error: ${error.message}`);
            if (context) {
                console.error(`   Context: ${JSON.stringify(context)}`);
            }
            console.error(`   Time: ${new Date().toISOString()}`);
            console.log(''); // Empty line for readability
        };

        // System status handler
        this.tradingSystem.onSystemStatus = (stats) => {
            // This could be used for external monitoring systems
            // For now, we'll use the dashboard for status updates
        };
    }

    /**
     * Display trading signal in a formatted way
     */
    displaySignal(signal) {
        console.log('\n🎯 NEW TRADING SIGNAL GENERATED');
        console.log('================================');
        console.log(`📅 Time: ${new Date(signal.timestamp).toLocaleString()}`);
        console.log(`📊 Timeframe: ${signal.timeframe}`);
        console.log(`💱 Pair: ${signal.currencyPair}`);
        console.log(`💰 Price: ${signal.currentPrice}`);
        console.log('');
        
        // Signal details with color coding
        const signalEmoji = {
            'UP': '🟢',
            'DOWN': '🔴',
            'NO TRADE': '⚪'
        }[signal.signal] || '❓';
        
        console.log(`${signalEmoji} SIGNAL: ${signal.signal}`);
        console.log(`📈 CONFIDENCE: ${signal.confidence}%`);
        console.log(`⚠️ RISK: ${signal.riskLevel}`);
        console.log(`🎯 RECOMMENDATION: ${signal.recommendation.action}`);
        console.log(`✨ QUALITY: ${signal.analysisQuality}`);
        console.log('');
        
        // Reasoning (truncated)
        console.log('📝 REASONING:');
        console.log(signal.reasoning.substring(0, 300) + (signal.reasoning.length > 300 ? '...' : ''));
        console.log('');
        
        // Trading advice
        if (signal.recommendation.action !== 'NO TRADE') {
            console.log('💡 TRADING ADVICE:');
            console.log(`   ${signal.recommendation.tradingAdvice}`);
            console.log(`   Suitability: ${signal.recommendation.suitability}`);
        } else {
            console.log('⚠️ RISK WARNING:');
            console.log(`   ${signal.recommendation.riskWarning}`);
        }
        
        console.log('');
        console.log('─'.repeat(50));
        console.log('');
    }

    /**
     * Save signal report to file
     */
    async saveSignalReport(signal) {
        try {
            const reportFile = path.join(
                this.config.reportDirectory, 
                `signal-${signal.timeframe}-${Date.now()}.json`
            );
            
            await fs.writeFile(reportFile, JSON.stringify(signal, null, 2));
            
        } catch (error) {
            console.warn('⚠️ Failed to save signal report:', error.message);
        }
    }

    /**
     * Start the performance dashboard
     */
    startDashboard() {
        setInterval(() => {
            if (this.isShuttingDown) return;
            
            this.displayDashboard();
        }, this.config.dashboardInterval);
    }

    /**
     * Display performance dashboard
     */
    displayDashboard() {
        const stats = this.tradingSystem.getSystemStats();
        const uptime = Date.now() - this.startTime;
        
        console.log('\n📊 TRADAI SYSTEM DASHBOARD');
        console.log('==========================');
        console.log(`🕐 System Uptime: ${this.formatUptime(uptime)}`);
        console.log(`📈 Charts Processed: ${stats.totalChartsProcessed}`);
        console.log(`🎯 Signals Generated: ${stats.tradingSignalsGenerated}`);
        console.log(`📊 Success Rate: ${stats.successRate}`);
        console.log(`⚡ Avg Confidence: ${stats.averageConfidenceFormatted}`);
        console.log('');
        
        // Signal distribution
        console.log('📊 Signal Distribution:');
        console.log(`   🟢 UP: ${stats.signalDistribution.up}`);
        console.log(`   🔴 DOWN: ${stats.signalDistribution.down}`);
        console.log(`   ⚪ NO TRADE: ${stats.signalDistribution.noTrade}`);
        console.log('');
        
        // Timeframe statistics
        console.log('⏱️ Timeframe Performance:');
        Object.entries(stats.timeframeStats).forEach(([timeframe, tfStats]) => {
            console.log(`   ${timeframe}: ${tfStats.processed} processed, ${tfStats.signals} signals (${tfStats.avgConfidence.toFixed(1)}% avg)`);
        });
        console.log('');
        
        // System status
        console.log('🔧 System Status:');
        console.log(`   Status: ${stats.systemStatus}`);
        console.log(`   Queue Length: ${stats.queueLength}`);
        console.log(`   Processing: ${stats.isProcessing ? 'Yes' : 'No'}`);
        console.log('');
        
        // API performance
        if (stats.componentStats.aiAnalyzer && stats.componentStats.aiAnalyzer.apiManagerStats) {
            const apiStats = stats.componentStats.aiAnalyzer.apiManagerStats;
            console.log('🔑 API Performance:');
            console.log(`   Working Keys: ${apiStats.workingKeys}`);
            console.log(`   Success Rate: ${apiStats.successRate}`);
            console.log(`   Avg Response: ${apiStats.averageResponseTime}ms`);
            console.log(`   Key Rotations: ${apiStats.keyRotations}`);
        }
        
        console.log('─'.repeat(50));
        console.log('');
    }

    /**
     * Format uptime duration
     */
    formatUptime(uptimeMs) {
        const seconds = Math.floor(uptimeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Set up graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) {
                console.log('\n🚨 Force shutdown requested');
                process.exit(1);
            }

            this.isShuttingDown = true;
            console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
            
            try {
                if (this.tradingSystem) {
                    await this.tradingSystem.shutdown();
                }
                
                console.log('✅ TRADAI Trading System shutdown complete');
                console.log(`📊 Final Statistics:`);
                console.log(`   Total Runtime: ${this.formatUptime(Date.now() - this.startTime)}`);
                console.log(`   Signals Generated: ${this.signalCount}`);
                console.log(`   Charts Processed: ${this.tradingSystem ? this.tradingSystem.stats.totalChartsProcessed : 0}`);
                
                process.exit(0);
                
            } catch (error) {
                console.error('❌ Error during shutdown:', error.message);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGQUIT', () => shutdown('SIGQUIT'));
    }

    /**
     * Keep the process alive
     */
    async keepAlive() {
        return new Promise((resolve) => {
            // The process will be kept alive by the event loop
            // Shutdown handlers will resolve this promise when needed
        });
    }

    /**
     * Test mode for development
     */
    async testMode() {
        console.log('🧪 TRADAI Trading System - Test Mode');
        console.log('====================================');
        
        this.config.autoProcessing = false;
        this.config.enableDashboard = false;
        
        await this.launch();
        
        // In test mode, process one chart and exit
        const charts = await this.tradingSystem.imageProcessor.getAvailableCharts();
        
        for (const timeframe of ['1m', '3m', '5m']) {
            if (charts[timeframe] && charts[timeframe].length > 0) {
                const chart = charts[timeframe][0];
                console.log(`\n🔄 Testing with ${timeframe}/${chart.filename}...`);
                
                try {
                    await this.tradingSystem.processChart(timeframe, chart.filename);
                    break;
                } catch (error) {
                    console.warn(`⚠️ Failed to process ${timeframe}/${chart.filename}: ${error.message}`);
                }
            }
        }
        
        await this.tradingSystem.shutdown();
        console.log('\n✅ Test mode completed');
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const launcher = new TradingSystemLauncher();
    
    if (args.includes('--test')) {
        await launcher.testMode();
    } else {
        await launcher.launch();
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('💥 Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { TradingSystemLauncher };
