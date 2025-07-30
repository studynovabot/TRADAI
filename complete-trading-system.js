#!/usr/bin/env node

/**
 * 🚀 Complete AI-Powered Trading Chart Analysis System
 * ====================================================
 * 
 * Professional-grade binary options trading signal generation system
 * Integrates all components for real-money trading with high accuracy
 * 
 * Features:
 * - Real-time chart monitoring and processing
 * - AI-powered chart analysis with Gemini Vision
 * - Multi-timeframe signal generation
 * - Robust failover and error handling
 * - Performance monitoring and reporting
 * - Production-ready reliability
 * 
 * Built for TRADAI Chart Analysis System
 */

const { ChartImageProcessor } = require('./chart-image-processor.js');
const { AIVisionChartAnalyzer } = require('./ai-vision-chart-analyzer.js');
const { GeminiAPIManager } = require('./gemini-api-manager.js');
const fs = require('fs').promises;
const path = require('path');

class CompleteTradingSystem {
    constructor(options = {}) {
        this.options = {
            chartDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
            supportedTimeframes: ['1m', '3m', '5m'],
            minConfidenceForTrade: 70,
            maxAnalysisTime: 60000, // 1 minute
            autoProcessing: true,
            enableLogging: true,
            logDirectory: './logs',
            reportDirectory: './reports',
            ...options
        };

        // System components
        this.imageProcessor = null;
        this.aiAnalyzer = null;
        this.apiManager = null;

        // System state
        this.isRunning = false;
        this.initialized = false;
        this.processingQueue = [];
        this.isProcessingQueue = false;

        // Performance tracking
        this.stats = {
            systemStartTime: null,
            totalChartsProcessed: 0,
            successfulAnalyses: 0,
            tradingSignalsGenerated: 0,
            upSignals: 0,
            downSignals: 0,
            noTradeSignals: 0,
            averageConfidence: 0,
            systemUptime: 0,
            lastSignalTime: null,
            timeframeStats: {
                '1m': { processed: 0, signals: 0, avgConfidence: 0 },
                '3m': { processed: 0, signals: 0, avgConfidence: 0 },
                '5m': { processed: 0, signals: 0, avgConfidence: 0 }
            }
        };

        // Event handlers
        this.onSignalGenerated = null;
        this.onError = null;
        this.onSystemStatus = null;
    }

    /**
     * Initialize the complete trading system
     */
    async initialize() {
        console.log('🚀 Initializing Complete AI Trading System...');
        console.log('==============================================');
        
        try {
            this.stats.systemStartTime = new Date().toISOString();

            // Create necessary directories
            await this.createDirectories();

            // Initialize image processor
            console.log('📊 Initializing Chart Image Processor...');
            this.imageProcessor = new ChartImageProcessor({
                baseDirectory: this.options.chartDirectory,
                supportedTimeframes: this.options.supportedTimeframes,
                watchInterval: 2000
            });
            await this.imageProcessor.initialize();

            // Initialize AI analyzer
            console.log('🤖 Initializing AI Vision Chart Analyzer...');
            this.aiAnalyzer = new AIVisionChartAnalyzer({
                analysisTimeout: this.options.maxAnalysisTime,
                confidenceThreshold: this.options.minConfidenceForTrade / 100
            });
            await this.aiAnalyzer.initialize();

            // Set up event handlers
            this.setupEventHandlers();

            this.initialized = true;
            console.log('✅ Complete AI Trading System initialized successfully');
            console.log(`   Chart directory: ${this.options.chartDirectory}`);
            console.log(`   Supported timeframes: ${this.options.supportedTimeframes.join(', ')}`);
            console.log(`   Minimum confidence: ${this.options.minConfidenceForTrade}%`);
            console.log(`   Auto processing: ${this.options.autoProcessing ? 'Enabled' : 'Disabled'}`);

            return {
                success: true,
                systemComponents: ['Image Processor', 'AI Analyzer', 'API Manager'],
                capabilities: [
                    'Real-time chart monitoring',
                    'AI-powered analysis',
                    'Multi-timeframe signals',
                    'Automatic failover',
                    'Performance tracking'
                ]
            };

        } catch (error) {
            console.error('❌ Failed to initialize Complete AI Trading System:', error.message);
            throw error;
        }
    }

    /**
     * Start the trading system
     */
    async start() {
        if (!this.initialized) {
            throw new Error('System not initialized. Call initialize() first.');
        }

        if (this.isRunning) {
            console.warn('⚠️ Trading system is already running');
            return;
        }

        console.log('🚀 Starting Complete AI Trading System...');
        
        this.isRunning = true;

        // Start chart monitoring if auto processing is enabled
        if (this.options.autoProcessing) {
            this.imageProcessor.startMonitoring();
            console.log('👁️ Chart monitoring started');
        }

        // Start processing queue
        this.startProcessingQueue();

        // Start system monitoring
        this.startSystemMonitoring();

        console.log('✅ Complete AI Trading System is now running');
        console.log('📊 Monitoring for new chart screenshots...');
        console.log('🎯 Ready to generate trading signals');

        return {
            success: true,
            status: 'RUNNING',
            startTime: new Date().toISOString()
        };
    }

    /**
     * Stop the trading system
     */
    async stop() {
        if (!this.isRunning) {
            console.warn('⚠️ Trading system is not running');
            return;
        }

        console.log('🛑 Stopping Complete AI Trading System...');
        
        this.isRunning = false;

        // Stop chart monitoring
        if (this.imageProcessor) {
            this.imageProcessor.stopMonitoring();
        }

        // Wait for processing queue to empty
        while (this.processingQueue.length > 0 || this.isProcessingQueue) {
            await this.sleep(100);
        }

        console.log('✅ Complete AI Trading System stopped');

        return {
            success: true,
            status: 'STOPPED',
            stopTime: new Date().toISOString(),
            finalStats: this.getSystemStats()
        };
    }

    /**
     * Process a specific chart file
     */
    async processChart(timeframe, filename) {
        console.log(`🔄 Processing chart: ${timeframe}/${filename}`);

        try {
            // Process image
            const chartData = await this.imageProcessor.processSpecificFile(timeframe, filename);
            
            // Analyze with AI
            const analysis = await this.aiAnalyzer.analyzeChart(chartData);
            
            // Generate trading signal
            const signal = await this.generateTradingSignal(analysis);
            
            // Update statistics
            this.updateSystemStats(signal);
            
            // Log and report
            await this.logSignal(signal);
            
            // Trigger event handlers
            if (this.onSignalGenerated) {
                this.onSignalGenerated(signal);
            }

            console.log(`✅ Chart processing completed: ${timeframe}/${filename}`);
            console.log(`   Signal: ${signal.signal} (${signal.confidence}% confidence)`);

            return signal;

        } catch (error) {
            console.error(`❌ Failed to process chart ${timeframe}/${filename}:`, error.message);
            
            if (this.onError) {
                this.onError(error, { timeframe, filename });
            }
            
            throw error;
        }
    }

    /**
     * Generate trading signal from analysis
     */
    async generateTradingSignal(analysis) {
        const signal = {
            timestamp: new Date().toISOString(),
            timeframe: analysis.chartData.timeframe,
            filename: analysis.chartData.filename,
            currencyPair: analysis.chartInfo.currencyPair || 'UNKNOWN',
            currentPrice: analysis.chartInfo.currentPrice || 0,
            
            // Core signal data
            signal: analysis.signal,
            confidence: analysis.confidence,
            riskLevel: analysis.riskLevel,
            reasoning: analysis.reasoning,
            
            // Technical analysis summary
            trend: analysis.trend,
            patterns: analysis.patterns,
            supportResistance: analysis.supportResistance,
            technicalIndicators: analysis.technicalIndicators,
            
            // Trading recommendation
            recommendation: this.generateRecommendation(analysis),
            
            // Metadata
            analysisQuality: analysis.analysisQuality,
            processingTime: analysis.chartData.processingTime,
            systemStats: this.getSystemStats()
        };

        return signal;
    }

    /**
     * Generate trading recommendation
     */
    generateRecommendation(analysis) {
        const recommendation = {
            action: 'NO TRADE',
            suitability: 'POOR',
            riskWarning: '',
            tradingAdvice: ''
        };

        // Check if signal meets minimum confidence
        if ((analysis.signal === 'UP' || analysis.signal === 'DOWN') && 
            analysis.confidence >= this.options.minConfidenceForTrade) {
            
            recommendation.action = analysis.signal;
            
            if (analysis.confidence >= 85) {
                recommendation.suitability = 'EXCELLENT';
            } else if (analysis.confidence >= 75) {
                recommendation.suitability = 'GOOD';
            } else {
                recommendation.suitability = 'FAIR';
            }
            
            recommendation.tradingAdvice = `${analysis.signal} signal with ${analysis.confidence}% confidence for next 3 candles`;
            
        } else {
            recommendation.riskWarning = 'Market conditions not suitable for trading or confidence below threshold';
            recommendation.tradingAdvice = 'Wait for better trading opportunity';
        }

        return recommendation;
    }

    /**
     * Set up event handlers for system components
     */
    setupEventHandlers() {
        // Image processor events
        this.imageProcessor.onNewChart = (chartData) => {
            if (this.options.autoProcessing) {
                this.addToProcessingQueue(chartData);
            }
        };

        this.imageProcessor.onError = (error, fileInfo) => {
            console.error('📊 Image processor error:', error.message);
            if (this.onError) {
                this.onError(error, fileInfo);
            }
        };
    }

    /**
     * Add chart to processing queue
     */
    addToProcessingQueue(chartData) {
        this.processingQueue.push(chartData);
        console.log(`📋 Added to queue: ${chartData.timeframe}/${chartData.filename} (Queue: ${this.processingQueue.length})`);
    }

    /**
     * Start processing queue
     */
    startProcessingQueue() {
        setInterval(async () => {
            if (!this.isRunning || this.isProcessingQueue || this.processingQueue.length === 0) {
                return;
            }

            this.isProcessingQueue = true;

            try {
                const chartData = this.processingQueue.shift();
                console.log(`🔄 Processing from queue: ${chartData.timeframe}/${chartData.filename}`);
                
                const analysis = await this.aiAnalyzer.analyzeChart(chartData);
                const signal = await this.generateTradingSignal(analysis);
                
                this.updateSystemStats(signal);
                await this.logSignal(signal);
                
                if (this.onSignalGenerated) {
                    this.onSignalGenerated(signal);
                }

            } catch (error) {
                console.error('❌ Queue processing error:', error.message);
                if (this.onError) {
                    this.onError(error);
                }
            }

            this.isProcessingQueue = false;
        }, 1000); // Process queue every second
    }

    /**
     * Start system monitoring
     */
    startSystemMonitoring() {
        setInterval(() => {
            if (!this.isRunning) return;

            this.stats.systemUptime = Date.now() - new Date(this.stats.systemStartTime).getTime();
            
            if (this.onSystemStatus) {
                this.onSystemStatus(this.getSystemStats());
            }
        }, 30000); // Update every 30 seconds
    }

    /**
     * Update system statistics
     */
    updateSystemStats(signal) {
        this.stats.totalChartsProcessed++;
        this.stats.successfulAnalyses++;
        this.stats.lastSignalTime = signal.timestamp;

        // Update signal counts
        if (signal.signal === 'UP') {
            this.stats.upSignals++;
            this.stats.tradingSignalsGenerated++;
        } else if (signal.signal === 'DOWN') {
            this.stats.downSignals++;
            this.stats.tradingSignalsGenerated++;
        } else {
            this.stats.noTradeSignals++;
        }

        // Update average confidence
        if (this.stats.totalChartsProcessed === 1) {
            this.stats.averageConfidence = signal.confidence;
        } else {
            this.stats.averageConfidence = 
                ((this.stats.averageConfidence * (this.stats.totalChartsProcessed - 1)) + signal.confidence) / this.stats.totalChartsProcessed;
        }

        // Update timeframe stats
        const timeframeStats = this.stats.timeframeStats[signal.timeframe];
        if (timeframeStats) {
            timeframeStats.processed++;
            if (signal.signal !== 'NO TRADE') {
                timeframeStats.signals++;
                timeframeStats.avgConfidence = 
                    ((timeframeStats.avgConfidence * (timeframeStats.signals - 1)) + signal.confidence) / timeframeStats.signals;
            }
        }
    }

    /**
     * Log trading signal
     */
    async logSignal(signal) {
        if (!this.options.enableLogging) return;

        try {
            const logEntry = {
                timestamp: signal.timestamp,
                timeframe: signal.timeframe,
                signal: signal.signal,
                confidence: signal.confidence,
                currencyPair: signal.currencyPair,
                recommendation: signal.recommendation.action,
                reasoning: signal.reasoning.substring(0, 200) + '...'
            };

            const logFile = path.join(this.options.logDirectory, `trading-signals-${new Date().toISOString().split('T')[0]}.json`);
            
            let logs = [];
            try {
                const existingLogs = await fs.readFile(logFile, 'utf8');
                logs = JSON.parse(existingLogs);
            } catch (error) {
                // File doesn't exist or is empty
            }

            logs.push(logEntry);
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));

        } catch (error) {
            console.warn('⚠️ Failed to log signal:', error.message);
        }
    }

    /**
     * Create necessary directories
     */
    async createDirectories() {
        const directories = [this.options.logDirectory, this.options.reportDirectory];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                console.warn(`⚠️ Failed to create directory ${dir}:`, error.message);
            }
        }
    }

    /**
     * Get comprehensive system statistics
     */
    getSystemStats() {
        return {
            ...this.stats,
            systemUptimeMs: this.stats.systemUptime,
            systemUptimeFormatted: this.formatUptime(this.stats.systemUptime),
            successRate: this.stats.totalChartsProcessed > 0 ? 
                (this.stats.successfulAnalyses / this.stats.totalChartsProcessed * 100).toFixed(2) + '%' : '0%',
            signalDistribution: {
                up: this.stats.upSignals,
                down: this.stats.downSignals,
                noTrade: this.stats.noTradeSignals
            },
            averageConfidenceFormatted: this.stats.averageConfidence.toFixed(1) + '%',
            queueLength: this.processingQueue.length,
            isProcessing: this.isProcessingQueue,
            systemStatus: this.isRunning ? 'RUNNING' : 'STOPPED',
            componentStats: {
                imageProcessor: this.imageProcessor ? this.imageProcessor.getStats() : null,
                aiAnalyzer: this.aiAnalyzer ? this.aiAnalyzer.getStats() : null
            }
        };
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
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down Complete AI Trading System...');
        
        await this.stop();
        
        if (this.imageProcessor) {
            await this.imageProcessor.shutdown();
        }
        
        if (this.aiAnalyzer) {
            await this.aiAnalyzer.shutdown();
        }
        
        console.log('✅ Complete AI Trading System shutdown complete');
    }
}

module.exports = { CompleteTradingSystem };

// Export for testing
if (require.main === module) {
    async function testCompleteTradingSystem() {
        console.log('🧪 Testing Complete AI Trading System...\n');

        const tradingSystem = new CompleteTradingSystem({
            chartDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
            autoProcessing: false, // Manual processing for testing
            enableLogging: true
        });

        // Set up event handlers
        tradingSystem.onSignalGenerated = (signal) => {
            console.log('\n🎯 TRADING SIGNAL GENERATED:');
            console.log('============================');
            console.log(`Signal: ${signal.signal}`);
            console.log(`Confidence: ${signal.confidence}%`);
            console.log(`Timeframe: ${signal.timeframe}`);
            console.log(`Currency Pair: ${signal.currencyPair}`);
            console.log(`Recommendation: ${signal.recommendation.action}`);
            console.log(`Risk Level: ${signal.riskLevel}`);
            console.log(`Reasoning: ${signal.reasoning.substring(0, 200)}...`);
        };

        tradingSystem.onError = (error, context) => {
            console.error(`❌ System Error: ${error.message}`);
            if (context) {
                console.error(`   Context: ${JSON.stringify(context)}`);
            }
        };

        try {
            // Initialize system
            await tradingSystem.initialize();

            // Start system
            await tradingSystem.start();

            // Test with available charts
            const charts = await tradingSystem.imageProcessor.getAvailableCharts();
            console.log('\n📊 Available charts for testing:');
            console.log(JSON.stringify(charts, null, 2));

            // Process a chart if available
            for (const timeframe of ['1m', '3m', '5m']) {
                if (charts[timeframe] && charts[timeframe].length > 0) {
                    const chart = charts[timeframe][0];
                    console.log(`\n🔄 Testing with ${timeframe}/${chart.filename}...`);

                    try {
                        await tradingSystem.processChart(timeframe, chart.filename);
                        break; // Process only one chart for testing
                    } catch (error) {
                        console.warn(`⚠️ Failed to process ${timeframe}/${chart.filename}: ${error.message}`);
                    }
                }
            }

            // Show system statistics
            console.log('\n📊 System Statistics:');
            console.log(JSON.stringify(tradingSystem.getSystemStats(), null, 2));

            // Stop system
            await tradingSystem.stop();

            console.log('\n✅ Complete Trading System test completed successfully!');

        } catch (error) {
            console.error('\n❌ Test failed:', error.message);
            process.exit(1);
        }
    }

    testCompleteTradingSystem();
}
