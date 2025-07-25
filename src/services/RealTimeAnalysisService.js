/**
 * Real-Time Analysis Service
 * 
 * Main service for analyzing trading screenshots with enhanced OCR and computer vision
 * Provides comprehensive multi-timeframe analysis with actual data extraction
 */

const fs = require('fs').promises;
const path = require('path');
const EnhancedRealTimeAnalyzer = require('../analysis/EnhancedRealTimeAnalyzer');

class RealTimeAnalysisService {
    constructor() {
        this.analyzer = new EnhancedRealTimeAnalyzer();
        this.isInitialized = false;
        this.analysisHistory = [];
    }

    /**
     * Initialize the analysis service
     */
    async initialize() {
        console.log('🚀 Initializing Real-Time Analysis Service...');
        
        try {
            await this.analyzer.initialize();
            this.isInitialized = true;
            console.log('✅ Real-Time Analysis Service ready');
        } catch (error) {
            console.error('❌ Failed to initialize analysis service:', error);
            throw error;
        }
    }

    /**
     * Analyze screenshots from the specified directory
     */
    async analyzeScreenshotsFromDirectory(directoryPath) {
        console.log(`\n📂 Analyzing screenshots from: ${directoryPath}`);
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Check if directory exists
            const stats = await fs.stat(directoryPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path is not a directory: ${directoryPath}`);
            }

            // Get all image files from directory
            const files = await fs.readdir(directoryPath);
            const imageFiles = files.filter(file => 
                /\.(jpg|jpeg|png|bmp|gif)$/i.test(file)
            ).map(file => path.join(directoryPath, file));

            if (imageFiles.length === 0) {
                throw new Error(`No image files found in directory: ${directoryPath}`);
            }

            console.log(`📊 Found ${imageFiles.length} image files to analyze`);
            imageFiles.forEach((file, index) => {
                console.log(`   ${index + 1}. ${path.basename(file)}`);
            });

            // Analyze all screenshots
            const result = await this.analyzer.analyzeMultiTimeframe(imageFiles);
            
            // Store in history
            this.analysisHistory.push({
                timestamp: Date.now(),
                directoryPath: directoryPath,
                result: result
            });

            // Generate comprehensive report
            const report = this.generateComprehensiveReport(result);
            
            console.log('\n✅ Analysis completed successfully!');
            
            return {
                success: true,
                result: result,
                report: report,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Analyze specific screenshot files
     */
    async analyzeSpecificScreenshots(screenshotPaths) {
        console.log(`\n📊 Analyzing ${screenshotPaths.length} specific screenshots`);
        
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Validate all files exist
            for (const filePath of screenshotPaths) {
                const stats = await fs.stat(filePath);
                if (!stats.isFile()) {
                    throw new Error(`File not found: ${filePath}`);
                }
            }

            // Analyze screenshots
            const result = await this.analyzer.analyzeMultiTimeframe(screenshotPaths);
            
            // Store in history
            this.analysisHistory.push({
                timestamp: Date.now(),
                screenshotPaths: screenshotPaths,
                result: result
            });

            // Generate comprehensive report
            const report = this.generateComprehensiveReport(result);
            
            console.log('\n✅ Analysis completed successfully!');
            
            return {
                success: true,
                result: result,
                report: report,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            return {
                success: false,
                error: error.message,
                timestamp: Date.now()
            };
        }
    }

    /**
     * Generate comprehensive analysis report
     */
    generateComprehensiveReport(analysisResult) {
        const { individualAnalyses, confluenceAnalysis } = analysisResult;
        
        let report = '';
        
        // Header
        report += '═══════════════════════════════════════════════════════════════\n';
        report += '                    COMPREHENSIVE TRADING ANALYSIS\n';
        report += '═══════════════════════════════════════════════════════════════\n\n';
        
        // Executive Summary
        report += '📊 EXECUTIVE SUMMARY\n';
        report += '─────────────────────────────────────────────────────────────\n';
        
        if (confluenceAnalysis.confluenceSignal !== 'NEUTRAL' && confluenceAnalysis.confluenceSignal !== 'INSUFFICIENT_DATA') {
            report += `🎯 SIGNAL: ${confluenceAnalysis.confluenceSignal}\n`;
            report += `📈 CONFIDENCE: ${(confluenceAnalysis.confidence * 100).toFixed(1)}%\n`;
            report += `🔄 CONFLUENCE: ${confluenceAnalysis.timeframeBreakdown.callSignals + confluenceAnalysis.timeframeBreakdown.putSignals} timeframes aligned\n`;
            report += `💡 RECOMMENDATION: ${confluenceAnalysis.recommendation}\n\n`;
        } else {
            report += `🎯 SIGNAL: NO CLEAR DIRECTION\n`;
            report += `📈 CONFIDENCE: ${(confluenceAnalysis.confidence * 100).toFixed(1)}%\n`;
            report += `💡 RECOMMENDATION: ${confluenceAnalysis.recommendation}\n\n`;
        }
        
        // Individual Timeframe Analysis
        report += '📋 INDIVIDUAL TIMEFRAME ANALYSIS\n';
        report += '─────────────────────────────────────────────────────────────\n';
        
        individualAnalyses.forEach((analysis, index) => {
            if (analysis.error) {
                report += `❌ Analysis ${index + 1}: ERROR - ${analysis.error}\n\n`;
                return;
            }
            
            report += `📊 TIMEFRAME: ${analysis.timeframe || 'Unknown'}\n`;
            report += `💰 CURRENT PRICE: ${analysis.currentPrice || 'Not detected'}\n`;
            report += `💱 TRADING PAIR: ${analysis.tradingPair || 'Not detected'}\n`;
            report += `⏱️ PROCESSING TIME: ${analysis.processingTime}ms\n`;
            report += `📈 OVERALL CONFIDENCE: ${(analysis.confidence * 100).toFixed(1)}%\n\n`;
            
            // Trend Analysis
            if (analysis.trend) {
                report += `   🔄 TREND ANALYSIS:\n`;
                report += `      Direction: ${analysis.trend.direction.toUpperCase()}\n`;
                report += `      Signal: ${analysis.trend.signal}\n`;
                report += `      Confidence: ${(analysis.trend.confidence * 100).toFixed(1)}%\n`;
                report += `      Description: ${analysis.trend.description}\n\n`;
            }
            
            // Candlestick Patterns
            if (analysis.candlesticks && analysis.candlesticks.patterns.length > 0) {
                report += `   🕯️ CANDLESTICK PATTERNS:\n`;
                analysis.candlesticks.patterns.forEach(pattern => {
                    report += `      ${pattern.type.toUpperCase()}: ${pattern.description} (${(pattern.confidence * 100).toFixed(1)}%)\n`;
                });
                report += '\n';
            }
            
            // Technical Indicators
            if (analysis.indicators) {
                report += `   📊 TECHNICAL INDICATORS:\n`;
                if (analysis.indicators.stochastic) {
                    const stoch = analysis.indicators.stochastic;
                    report += `      Stochastic: K=${stoch.k.toFixed(1)}, D=${stoch.d.toFixed(1)} (${stoch.signal})\n`;
                }
                if (analysis.indicators.movingAverages) {
                    const ma = analysis.indicators.movingAverages;
                    if (ma.ema) report += `      EMA: ${ma.ema.toFixed(2)}\n`;
                    if (ma.sma) report += `      SMA: ${ma.sma.toFixed(2)}\n`;
                }
                report += '\n';
            }
            
            // Trading Signals
            if (analysis.signals && analysis.signals.length > 0) {
                report += `   🎯 TRADING SIGNALS:\n`;
                analysis.signals.forEach(signal => {
                    report += `      ${signal.direction}: ${(signal.confidence * 100).toFixed(1)}% confidence\n`;
                    report += `      Reasoning: ${signal.reasoning}\n`;
                    report += `      Entry: ${signal.entryRecommendation}\n`;
                    
                    if (signal.nextCandles) {
                        report += `      Next 3 Candles:\n`;
                        signal.nextCandles.forEach(candle => {
                            report += `         Candle ${candle.candle}: ${candle.prediction} (${candle.confidence}%)\n`;
                        });
                    }
                    report += '\n';
                });
            }
            
            report += '─────────────────────────────────────────────────────────────\n';
        });
        
        // Multi-Timeframe Confluence
        report += '\n🔄 MULTI-TIMEFRAME CONFLUENCE ANALYSIS\n';
        report += '─────────────────────────────────────────────────────────────\n';
        report += `Signal: ${confluenceAnalysis.confluenceSignal}\n`;
        report += `Confidence: ${(confluenceAnalysis.confidence * 100).toFixed(1)}%\n`;
        report += `Description: ${confluenceAnalysis.description}\n`;
        report += `Recommendation: ${confluenceAnalysis.recommendation}\n\n`;
        
        if (confluenceAnalysis.detailedAnalysis && confluenceAnalysis.detailedAnalysis.length > 0) {
            report += 'Detailed Breakdown:\n';
            confluenceAnalysis.detailedAnalysis.forEach(signal => {
                report += `   ${signal.timeframe}: ${signal.direction} (${(signal.confidence * 100).toFixed(1)}%)\n`;
            });
        }
        
        // Risk Factors
        report += '\n⚠️ RISK FACTORS & CONSIDERATIONS\n';
        report += '─────────────────────────────────────────────────────────────\n';
        report += '• This analysis is based on screenshot data and OCR extraction\n';
        report += '• Market conditions can change rapidly\n';
        report += '• Always use proper risk management\n';
        report += '• Consider multiple confirmations before entering trades\n';
        report += '• Past performance does not guarantee future results\n\n';
        
        // Footer
        report += '═══════════════════════════════════════════════════════════════\n';
        report += `Analysis completed at: ${new Date().toISOString()}\n`;
        report += 'Generated by Enhanced Real-Time Trading Analyzer\n';
        report += '═══════════════════════════════════════════════════════════════\n';
        
        return report;
    }

    /**
     * Get analysis history
     */
    getAnalysisHistory() {
        return this.analysisHistory;
    }

    /**
     * Clear analysis history
     */
    clearHistory() {
        this.analysisHistory = [];
        console.log('🧹 Analysis history cleared');
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.analyzer) {
            await this.analyzer.cleanup();
        }
        this.isInitialized = false;
        console.log('🧹 Real-Time Analysis Service cleaned up');
    }
}

module.exports = RealTimeAnalysisService;
