/**
 * Professional Chart Analyzer
 * Main engine that combines image processing, AI analysis, and technical analysis
 */

const AdvancedImageProcessor = require('./AdvancedImageProcessor');
const AIPatternRecognition = require('./AIPatternRecognition');
const TechnicalAnalysisCore = require('./TechnicalAnalysisCore');
const WebOTCSignalGenerator = require('./WebOTCSignalGenerator');
const fs = require('fs').promises;

class ProfessionalChartAnalyzer {
    constructor() {
        this.imageProcessor = new AdvancedImageProcessor();
        this.aiAnalyzer = new AIPatternRecognition();
        this.technicalCore = new TechnicalAnalysisCore();
        this.otcGenerator = new WebOTCSignalGenerator();
        this.analysisHistory = [];
    }

    /**
     * Analyze multiple chart screenshots for OTC binary options
     */
    async analyzeForOTC(screenshots) {
        console.log('🎯 Starting OTC Binary Options Analysis...');
        return await this.otcGenerator.generateOTCSignals(screenshots);
    }

    /**
     * Analyze multiple chart screenshots for comprehensive multi-timeframe analysis
     */
    async analyzeMultipleCharts(screenshots) {
        console.log('🚀 Starting professional multi-timeframe chart analysis...');
        
        try {
            const analysisResults = [];
            
            // Process each screenshot
            for (let i = 0; i < screenshots.length; i++) {
                const screenshot = screenshots[i];
                console.log(`📊 Processing screenshot ${i + 1}/${screenshots.length}...`);
                
                const result = await this.analyzeSingleChart(screenshot.path, screenshot.timeframe);
                analysisResults.push(result);
            }
            
            // Generate comprehensive multi-timeframe report
            const comprehensiveReport = await this.generateComprehensiveReport(analysisResults);
            
            // Save analysis to history
            this.analysisHistory.push({
                timestamp: new Date().toISOString(),
                screenshots: screenshots.length,
                results: analysisResults,
                comprehensiveReport
            });
            
            console.log('✅ Multi-timeframe analysis completed');
            return comprehensiveReport;
            
        } catch (error) {
            console.error('❌ Multi-timeframe analysis failed:', error.message);
            throw error;
        }
    }

    /**
     * Analyze single chart screenshot
     */
    async analyzeSingleChart(imagePath, timeframe) {
        console.log(`📈 Analyzing ${timeframe} chart: ${imagePath}`);
        
        try {
            // Step 1: Process image and extract chart components
            const imageAnalysis = await this.imageProcessor.processChartScreenshot(imagePath);
            
            if (!imageAnalysis.success) {
                throw new Error(`Image processing failed: ${imageAnalysis.error}`);
            }
            
            // Step 2: AI-powered pattern recognition
            const aiAnalysis = await this.aiAnalyzer.analyzeChartWithAI(
                imageAnalysis.metadata,
                imageAnalysis.chartData
            );
            
            // Step 3: Generate technical analysis report
            const technicalReport = this.technicalCore.generateAnalysisReport(
                imageAnalysis.chartData,
                aiAnalysis,
                timeframe
            );
            
            return {
                timeframe,
                imagePath,
                success: true,
                imageAnalysis,
                aiAnalysis,
                technicalReport,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Analysis failed for ${timeframe}:`, error.message);
            return {
                timeframe,
                imagePath,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Generate comprehensive multi-timeframe report
     */
    async generateComprehensiveReport(analysisResults) {
        console.log('📋 Generating comprehensive technical analysis report...');
        
        const successfulAnalyses = analysisResults.filter(result => result.success);
        
        if (successfulAnalyses.length === 0) {
            throw new Error('No successful analyses to generate report');
        }
        
        // Extract currency pair from first successful analysis
        const currencyPair = successfulAnalyses[0].technicalReport.currencyPair || 'UNKNOWN';
        
        // Generate report sections
        const report = {
            title: `🚀 COMPREHENSIVE TECHNICAL ANALYSIS WITH INDICATORS - ${currencyPair}`,
            timestamp: new Date().toISOString(),
            screenshotAnalyses: this.formatScreenshotAnalyses(successfulAnalyses),
            multiTimeframeConfluence: this.generateMultiTimeframeConfluence(successfulAnalyses),
            tradingSignals: this.generateTradingSignals(successfulAnalyses),
            keyLevels: this.generateKeyLevels(successfulAnalyses),
            riskManagement: this.generateRiskManagement(successfulAnalyses),
            finalVerdict: this.generateFinalVerdict(successfulAnalyses)
        };
        
        console.log('✅ Comprehensive report generated');
        return report;
    }

    /**
     * Format individual screenshot analyses
     */
    formatScreenshotAnalyses(analyses) {
        return analyses.map((analysis, index) => {
            const report = analysis.technicalReport;
            
            return {
                title: `📊 SCREENSHOT ${index + 1} (${analysis.timeframe} timeframe) - DETAILED ANALYSIS:`,
                timeframe: analysis.timeframe,
                indicators: {
                    title: '🔍 INDICATORS ANALYSIS:',
                    ema5: `- **EMA 5 (Yellow):** ${report.indicators.ema5.description}`,
                    sma20: `- **SMA 20 (Red):** ${report.indicators.sma20.description}`,
                    stochastic: `- **Stochastic Oscillator:**\n  ${report.indicators.stochastic.description}`
                },
                candlestickPatterns: {
                    title: '📈 CANDLESTICK PATTERN ANALYSIS:',
                    primaryPattern: `- **Major Pattern:** ${report.candlestickPatterns.primaryPattern}`,
                    structure: `- **Current Structure:** ${report.candlestickPatterns.structure}`,
                    momentum: `- **Momentum:** ${report.candlestickPatterns.momentum}`
                },
                supportResistance: {
                    title: '🎯 SUPPORT & RESISTANCE:',
                    majorResistance: `- **Major Resistance:** ${report.supportResistance.majorResistance}`,
                    currentResistance: `- **Current Resistance:** ${report.supportResistance.currentResistance}`,
                    currentSupport: `- **Current Support:** ${report.supportResistance.currentSupport}`,
                    strongSupport: `- **Strong Support:** ${report.supportResistance.strongSupport}`,
                    majorSupport: `- **Major Support:** ${report.supportResistance.majorSupport}`
                }
            };
        });
    }

    /**
     * Generate multi-timeframe confluence analysis
     */
    generateMultiTimeframeConfluence(analyses) {
        const marketStructures = analyses.map(analysis => ({
            timeframe: analysis.timeframe,
            trend: analysis.technicalReport.marketStructure?.trend || 'NEUTRAL',
            momentum: analysis.technicalReport.marketStructure?.momentum || 'MODERATE',
            signals: analysis.technicalReport.signals
        }));

        return {
            title: '🎯 MULTI-TIMEFRAME CONFLUENCE & SIGNALS:',
            marketStructure: {
                title: '📊 MARKET STRUCTURE:',
                timeframes: marketStructures.map((structure, index) => 
                    `${index + 1}. **${structure.timeframe}:** ${this.getStructureDescription(structure)}`
                )
            }
        };
    }

    /**
     * Get structure description for timeframe
     */
    getStructureDescription(structure) {
        const trendDescriptions = {
            'BULLISH': 'Bullish momentum confirmed',
            'BEARISH': 'Bearish pressure building',
            'NEUTRAL': 'Consolidation phase'
        };

        return trendDescriptions[structure.trend] || 'Analysis in progress';
    }

    /**
     * Generate trading signals section
     */
    generateTradingSignals(analyses) {
        // Get the most recent/reliable signals
        const primaryAnalysis = analyses[0]; // Assuming first is most recent
        const signals = primaryAnalysis.technicalReport.signals;

        return {
            title: '🚨 TRADING SIGNALS:',
            immediate: this.formatSignalForReport(signals.immediate, 'IMMEDIATE SIGNAL'),
            shortTerm: this.formatSignalForReport(signals.shortTerm, 'SHORT-TERM SIGNAL'),
            mediumTerm: this.formatSignalForReport(signals.mediumTerm, 'MEDIUM-TERM SIGNAL')
        };
    }

    /**
     * Format signal for report
     */
    formatSignalForReport(signal, type) {
        if (!signal) return null;

        return {
            title: `#### **${type} (${signal.timeHorizon}):**`,
            direction: `**${signal.direction} - ${signal.confidence}**`,
            entry: `- **Entry:** ${signal.entry}`,
            target: `- **Target:** ${signal.target}`,
            reason: `- **Reason:** Technical confluence and pattern confirmation`
        };
    }

    /**
     * Generate key levels to watch
     */
    generateKeyLevels(analyses) {
        const allLevels = analyses.flatMap(analysis => [
            ...analysis.technicalReport.supportResistance.levels.support,
            ...analysis.technicalReport.supportResistance.levels.resistance
        ]).filter(level => level && level !== 'N/A');

        const uniqueLevels = [...new Set(allLevels)].sort((a, b) => parseFloat(b) - parseFloat(a));

        return {
            title: '🎯 KEY LEVELS TO WATCH:',
            criticalSupport: `- **Critical Support:** ${uniqueLevels[uniqueLevels.length - 1] || 'TBD'}`,
            breakoutLevel: `- **Breakout Level:** ${uniqueLevels[Math.floor(uniqueLevels.length / 2)] || 'TBD'}`,
            majorTarget: `- **Major Target:** ${uniqueLevels[0] || 'TBD'}`
        };
    }

    /**
     * Generate risk management parameters
     */
    generateRiskManagement(analyses) {
        const primarySignal = analyses[0]?.technicalReport.signals.shortTerm;
        
        return {
            title: '⚠️ RISK MANAGEMENT:',
            stopLoss: `- **Stop Loss:** ${primarySignal?.stopLoss || 'TBD'}`,
            takeProfit: `- **Take Profit:** ${primarySignal?.target || 'TBD'}`,
            riskReward: `- **Risk/Reward:** ${primarySignal?.riskReward || '1:2'} ratio minimum`
        };
    }

    /**
     * Generate final verdict
     */
    generateFinalVerdict(analyses) {
        const primaryAnalysis = analyses[0];
        return this.technicalCore.generateFinalVerdict(primaryAnalysis.technicalReport);
    }

    /**
     * Format report as markdown string
     */
    formatReportAsMarkdown(report) {
        let markdown = `# ${report.title}\n\n`;
        
        // Add individual screenshot analyses
        report.screenshotAnalyses.forEach((analysis, index) => {
            markdown += `## ${analysis.title}\n\n`;
            
            markdown += `### ${analysis.indicators.title}\n`;
            markdown += `${analysis.indicators.ema5}\n`;
            markdown += `${analysis.indicators.sma20}\n`;
            markdown += `${analysis.indicators.stochastic}\n\n`;
            
            markdown += `### ${analysis.candlestickPatterns.title}\n`;
            markdown += `${analysis.candlestickPatterns.primaryPattern}\n`;
            markdown += `${analysis.candlestickPatterns.structure}\n`;
            markdown += `${analysis.candlestickPatterns.momentum}\n\n`;
            
            markdown += `### ${analysis.supportResistance.title}\n`;
            markdown += `${analysis.supportResistance.majorResistance}\n`;
            markdown += `${analysis.supportResistance.currentResistance}\n`;
            markdown += `${analysis.supportResistance.currentSupport}\n`;
            markdown += `${analysis.supportResistance.strongSupport}\n`;
            markdown += `${analysis.supportResistance.majorSupport}\n\n`;
            
            if (index < report.screenshotAnalyses.length - 1) {
                markdown += '---\n\n';
            }
        });
        
        // Add multi-timeframe confluence
        markdown += `## ${report.multiTimeframeConfluence.title}\n\n`;
        markdown += `### ${report.multiTimeframeConfluence.marketStructure.title}\n`;
        report.multiTimeframeConfluence.marketStructure.timeframes.forEach(tf => {
            markdown += `${tf}\n`;
        });
        markdown += '\n';
        
        // Add trading signals
        markdown += `### ${report.tradingSignals.title}\n\n`;
        [report.tradingSignals.immediate, report.tradingSignals.shortTerm, report.tradingSignals.mediumTerm]
            .filter(signal => signal)
            .forEach(signal => {
                markdown += `${signal.title}\n`;
                markdown += `${signal.direction}\n`;
                markdown += `${signal.entry}\n`;
                markdown += `${signal.target}\n`;
                markdown += `${signal.reason}\n\n`;
            });
        
        // Add key levels
        markdown += `### ${report.keyLevels.title}\n`;
        markdown += `${report.keyLevels.criticalSupport}\n`;
        markdown += `${report.keyLevels.breakoutLevel}\n`;
        markdown += `${report.keyLevels.majorTarget}\n\n`;
        
        // Add risk management
        markdown += `### ${report.riskManagement.title}\n`;
        markdown += `${report.riskManagement.stopLoss}\n`;
        markdown += `${report.riskManagement.takeProfit}\n`;
        markdown += `${report.riskManagement.riskReward}\n\n`;
        
        // Add final verdict
        markdown += `**${report.finalVerdict}**\n`;
        
        return markdown;
    }

    /**
     * Save analysis report
     */
    async saveAnalysisReport(report, format = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `analysis-report-${timestamp}.${format}`;
        const filepath = `logs/${filename}`;
        
        try {
            await fs.mkdir('logs', { recursive: true });
            
            if (format === 'json') {
                await fs.writeFile(filepath, JSON.stringify(report, null, 2));
            } else if (format === 'md') {
                const markdown = this.formatReportAsMarkdown(report);
                await fs.writeFile(filepath, markdown);
            }
            
            console.log(`📄 Analysis report saved: ${filepath}`);
            return filepath;
            
        } catch (error) {
            console.error('❌ Failed to save report:', error.message);
            throw error;
        }
    }
}

module.exports = ProfessionalChartAnalyzer;
