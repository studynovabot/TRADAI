#!/usr/bin/env node

/**
 * 📊 Output Formatting & Reporting System
 * =======================================
 * 
 * Comprehensive output system with clear directional signals, reasoning,
 * confidence percentages, and technical analysis summaries
 * 
 * Features:
 * - Professional trading signal formatting
 * - Detailed technical analysis reports
 * - Multi-format output support (JSON, Console, HTML)
 * - Real-time signal streaming
 * - Historical signal tracking
 * - Performance analytics reporting
 * 
 * Built for TRADAI Chart Analysis System
 */

const fs = require('fs').promises;
const path = require('path');

class OutputFormattingSystem {
    constructor(options = {}) {
        this.options = {
            outputFormats: ['console', 'json', 'html'],
            reportDirectory: './reports',
            signalHistory: true,
            maxHistoryEntries: 1000,
            includeDetailedAnalysis: true,
            timestampFormat: 'ISO',
            ...options
        };

        // Signal history storage
        this.signalHistory = [];
        this.performanceMetrics = {
            totalSignals: 0,
            upSignals: 0,
            downSignals: 0,
            noTradeSignals: 0,
            averageConfidence: 0,
            averageProcessingTime: 0
        };

        // Output templates
        this.templates = {
            console: this.getConsoleTemplate(),
            json: this.getJsonTemplate(),
            html: this.getHtmlTemplate()
        };
    }

    /**
     * Format and output trading signal
     */
    async formatAndOutput(analysisResult, outputFormats = null) {
        const formats = outputFormats || this.options.outputFormats;
        const formattedOutputs = {};

        try {
            // Create comprehensive signal object
            const signal = await this.createComprehensiveSignal(analysisResult);

            // Store in history if enabled
            if (this.options.signalHistory) {
                await this.addToHistory(signal);
            }

            // Update performance metrics
            this.updatePerformanceMetrics(signal);

            // Generate output in each requested format
            for (const format of formats) {
                switch (format) {
                    case 'console':
                        formattedOutputs.console = await this.formatConsoleOutput(signal);
                        this.displayConsoleOutput(formattedOutputs.console);
                        break;
                    case 'json':
                        formattedOutputs.json = await this.formatJsonOutput(signal);
                        await this.saveJsonOutput(formattedOutputs.json, signal);
                        break;
                    case 'html':
                        formattedOutputs.html = await this.formatHtmlOutput(signal);
                        await this.saveHtmlOutput(formattedOutputs.html, signal);
                        break;
                }
            }

            return {
                signal,
                outputs: formattedOutputs,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Output formatting failed:', error.message);
            throw error;
        }
    }

    /**
     * Create comprehensive signal object
     */
    async createComprehensiveSignal(analysisResult) {
        const signal = {
            // Core signal information
            timestamp: new Date().toISOString(),
            signalId: this.generateSignalId(),
            
            // Chart information
            chart: {
                timeframe: analysisResult.chartData?.timeframe || 'UNKNOWN',
                filename: analysisResult.chartData?.filename || 'UNKNOWN',
                currencyPair: this.extractCurrencyPair(analysisResult),
                currentPrice: this.extractCurrentPrice(analysisResult)
            },

            // Trading signal
            signal: {
                direction: this.extractSignalDirection(analysisResult),
                confidence: this.extractConfidence(analysisResult),
                strength: this.calculateSignalStrength(analysisResult),
                quality: this.assessSignalQuality(analysisResult)
            },

            // Technical analysis summary
            technicalAnalysis: this.formatTechnicalAnalysis(analysisResult),

            // Pattern analysis summary
            patternAnalysis: this.formatPatternAnalysis(analysisResult),

            // Support/Resistance analysis
            supportResistance: this.formatSupportResistance(analysisResult),

            // Risk assessment
            riskAssessment: this.formatRiskAssessment(analysisResult),

            // Multi-timeframe analysis (if available)
            multiTimeframe: this.formatMultiTimeframe(analysisResult),

            // Trading recommendation
            recommendation: this.createTradingRecommendation(analysisResult),

            // Detailed reasoning
            reasoning: this.generateDetailedReasoning(analysisResult),

            // Metadata
            metadata: {
                processingTime: analysisResult.processingTime || 0,
                analysisQuality: analysisResult.analysisQuality || 'UNKNOWN',
                systemVersion: '1.0.0',
                apiKeyUsed: this.maskApiKey(analysisResult.apiKey)
            }
        };

        return signal;
    }

    /**
     * Format console output
     */
    async formatConsoleOutput(signal) {
        const output = [];

        // Header
        output.push('');
        output.push('🎯 TRADAI TRADING SIGNAL');
        output.push('========================');
        output.push(`📅 Time: ${new Date(signal.timestamp).toLocaleString()}`);
        output.push(`📊 Chart: ${signal.chart.timeframe} ${signal.chart.currencyPair}`);
        output.push(`💰 Price: ${signal.chart.currentPrice || 'N/A'}`);
        output.push('');

        // Signal
        const signalEmoji = {
            'UP': '🟢',
            'DOWN': '🔴',
            'NO TRADE': '⚪'
        }[signal.signal.direction] || '❓';

        output.push(`${signalEmoji} SIGNAL: ${signal.signal.direction}`);
        output.push(`📈 CONFIDENCE: ${signal.signal.confidence}%`);
        output.push(`⚡ STRENGTH: ${signal.signal.strength.toFixed(2)}`);
        output.push(`✨ QUALITY: ${signal.signal.quality}`);
        output.push('');

        // Recommendation
        output.push('💡 RECOMMENDATION:');
        output.push(`   Action: ${signal.recommendation.action}`);
        output.push(`   Suitability: ${signal.recommendation.suitability}`);
        output.push(`   Risk Level: ${signal.recommendation.riskLevel}`);
        output.push('');

        // Technical Summary
        if (signal.technicalAnalysis.summary) {
            output.push('📊 TECHNICAL ANALYSIS:');
            output.push(`   Indicators: ${signal.technicalAnalysis.summary.indicatorsDetected}`);
            output.push(`   Confluence: ${signal.technicalAnalysis.summary.confluenceDirection}`);
            output.push(`   Trend: ${signal.technicalAnalysis.summary.trendDirection || 'UNKNOWN'}`);
            output.push('');
        }

        // Pattern Summary
        if (signal.patternAnalysis.summary) {
            output.push('🕯️ PATTERN ANALYSIS:');
            output.push(`   Candlestick Patterns: ${signal.patternAnalysis.summary.candlestickPatterns}`);
            output.push(`   Chart Patterns: ${signal.patternAnalysis.summary.chartPatterns}`);
            output.push(`   Pattern Confluence: ${signal.patternAnalysis.summary.confluenceDirection}`);
            output.push('');
        }

        // Support/Resistance
        if (signal.supportResistance.summary) {
            output.push('📈 SUPPORT/RESISTANCE:');
            output.push(`   Support Levels: ${signal.supportResistance.summary.supportLevels}`);
            output.push(`   Resistance Levels: ${signal.supportResistance.summary.resistanceLevels}`);
            output.push(`   Current Position: ${signal.supportResistance.summary.currentPosition}`);
            output.push('');
        }

        // Risk Assessment
        output.push('⚠️ RISK ASSESSMENT:');
        output.push(`   Risk Level: ${signal.riskAssessment.riskLevel}`);
        output.push(`   Trading Suitability: ${signal.riskAssessment.tradingSuitability}`);
        output.push(`   Warnings: ${signal.riskAssessment.warnings?.length || 0}`);
        output.push('');

        // Reasoning
        output.push('📝 REASONING:');
        const reasoning = signal.reasoning.substring(0, 300);
        output.push(`   ${reasoning}${reasoning.length < signal.reasoning.length ? '...' : ''}`);
        output.push('');

        // Footer
        output.push('─'.repeat(50));
        output.push('');

        return output.join('\n');
    }

    /**
     * Format JSON output
     */
    async formatJsonOutput(signal) {
        return {
            tradaiSignal: {
                version: '1.0.0',
                timestamp: signal.timestamp,
                signalId: signal.signalId,
                chart: signal.chart,
                signal: signal.signal,
                recommendation: signal.recommendation,
                analysis: {
                    technical: signal.technicalAnalysis,
                    patterns: signal.patternAnalysis,
                    supportResistance: signal.supportResistance,
                    risk: signal.riskAssessment,
                    multiTimeframe: signal.multiTimeframe
                },
                reasoning: signal.reasoning,
                metadata: signal.metadata
            }
        };
    }

    /**
     * Format HTML output
     */
    async formatHtmlOutput(signal) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TRADAI Signal Report - ${signal.signalId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .signal-box { background: ${this.getSignalColor(signal.signal.direction)}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .section { margin: 20px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #e9ecef; border-radius: 5px; }
        .warning { background: #fff3cd; border-left-color: #ffc107; }
        .success { background: #d4edda; border-left-color: #28a745; }
        .danger { background: #f8d7da; border-left-color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 TRADAI Trading Signal</h1>
            <p><strong>Signal ID:</strong> ${signal.signalId}</p>
            <p><strong>Generated:</strong> ${new Date(signal.timestamp).toLocaleString()}</p>
        </div>

        <div class="signal-box">
            <h2>${this.getSignalEmoji(signal.signal.direction)} ${signal.signal.direction}</h2>
            <p><strong>Confidence:</strong> ${signal.signal.confidence}% | <strong>Strength:</strong> ${signal.signal.strength.toFixed(2)}</p>
        </div>

        <div class="section">
            <h3>📊 Chart Information</h3>
            <div class="metric"><strong>Timeframe:</strong> ${signal.chart.timeframe}</div>
            <div class="metric"><strong>Pair:</strong> ${signal.chart.currencyPair}</div>
            <div class="metric"><strong>Price:</strong> ${signal.chart.currentPrice || 'N/A'}</div>
        </div>

        <div class="section ${this.getRecommendationClass(signal.recommendation.action)}">
            <h3>💡 Trading Recommendation</h3>
            <p><strong>Action:</strong> ${signal.recommendation.action}</p>
            <p><strong>Suitability:</strong> ${signal.recommendation.suitability}</p>
            <p><strong>Risk Level:</strong> ${signal.recommendation.riskLevel}</p>
        </div>

        <div class="section">
            <h3>📈 Technical Analysis Summary</h3>
            ${this.formatTechnicalSummaryHtml(signal.technicalAnalysis)}
        </div>

        <div class="section">
            <h3>📝 Detailed Reasoning</h3>
            <p>${signal.reasoning}</p>
        </div>

        <div class="section">
            <h3>⚠️ Risk Assessment</h3>
            <p><strong>Risk Level:</strong> ${signal.riskAssessment.riskLevel}</p>
            <p><strong>Trading Suitability:</strong> ${signal.riskAssessment.tradingSuitability}</p>
            ${signal.riskAssessment.warnings?.length > 0 ? 
                `<p><strong>Warnings:</strong> ${signal.riskAssessment.warnings.length}</p>` : ''}
        </div>

        <div class="section">
            <h3>🔧 System Information</h3>
            <div class="metric"><strong>Processing Time:</strong> ${signal.metadata.processingTime}ms</div>
            <div class="metric"><strong>Analysis Quality:</strong> ${signal.metadata.analysisQuality}</div>
            <div class="metric"><strong>System Version:</strong> ${signal.metadata.systemVersion}</div>
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * Display console output
     */
    displayConsoleOutput(output) {
        console.log(output);
    }

    /**
     * Save JSON output to file
     */
    async saveJsonOutput(jsonOutput, signal) {
        try {
            const filename = `signal-${signal.chart.timeframe}-${signal.signalId}.json`;
            const filepath = path.join(this.options.reportDirectory, filename);
            
            await fs.mkdir(this.options.reportDirectory, { recursive: true });
            await fs.writeFile(filepath, JSON.stringify(jsonOutput, null, 2));
            
            console.log(`📄 JSON report saved: ${filepath}`);
        } catch (error) {
            console.warn('⚠️ Failed to save JSON output:', error.message);
        }
    }

    /**
     * Save HTML output to file
     */
    async saveHtmlOutput(htmlOutput, signal) {
        try {
            const filename = `signal-${signal.chart.timeframe}-${signal.signalId}.html`;
            const filepath = path.join(this.options.reportDirectory, filename);
            
            await fs.mkdir(this.options.reportDirectory, { recursive: true });
            await fs.writeFile(filepath, htmlOutput);
            
            console.log(`📄 HTML report saved: ${filepath}`);
        } catch (error) {
            console.warn('⚠️ Failed to save HTML output:', error.message);
        }
    }

    /**
     * Add signal to history
     */
    async addToHistory(signal) {
        this.signalHistory.unshift(signal);
        
        // Maintain history size limit
        if (this.signalHistory.length > this.options.maxHistoryEntries) {
            this.signalHistory = this.signalHistory.slice(0, this.options.maxHistoryEntries);
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(signal) {
        this.performanceMetrics.totalSignals++;
        
        switch (signal.signal.direction) {
            case 'UP':
                this.performanceMetrics.upSignals++;
                break;
            case 'DOWN':
                this.performanceMetrics.downSignals++;
                break;
            case 'NO TRADE':
                this.performanceMetrics.noTradeSignals++;
                break;
        }

        // Update average confidence
        const totalSignals = this.performanceMetrics.totalSignals;
        this.performanceMetrics.averageConfidence = 
            ((this.performanceMetrics.averageConfidence * (totalSignals - 1)) + signal.signal.confidence) / totalSignals;

        // Update average processing time
        this.performanceMetrics.averageProcessingTime = 
            ((this.performanceMetrics.averageProcessingTime * (totalSignals - 1)) + signal.metadata.processingTime) / totalSignals;
    }

    /**
     * Utility methods for signal extraction and formatting
     */
    generateSignalId() {
        return `TRADAI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    extractCurrencyPair(analysisResult) {
        return analysisResult.chartInfo?.currencyPair || 
               analysisResult.analysis?.chartInfo?.currencyPair || 
               'UNKNOWN';
    }

    extractCurrentPrice(analysisResult) {
        return analysisResult.chartInfo?.currentPrice || 
               analysisResult.analysis?.chartInfo?.currentPrice || 
               null;
    }

    extractSignalDirection(analysisResult) {
        return analysisResult.signal || 
               analysisResult.recommendation?.signal || 
               'NO TRADE';
    }

    extractConfidence(analysisResult) {
        return analysisResult.confidence || 
               analysisResult.recommendation?.confidence || 
               0;
    }

    calculateSignalStrength(analysisResult) {
        // Combine various strength indicators
        let strength = 0.5; // Base strength

        if (analysisResult.indicatorStrength) strength += analysisResult.indicatorStrength * 0.3;
        if (analysisResult.patternStrength) strength += analysisResult.patternStrength * 0.3;
        if (analysisResult.levelStrength) strength += analysisResult.levelStrength * 0.2;
        if (analysisResult.confluence?.strength) strength += analysisResult.confluence.strength * 0.2;

        return Math.min(strength, 1.0);
    }

    assessSignalQuality(analysisResult) {
        const confidence = this.extractConfidence(analysisResult);
        const strength = this.calculateSignalStrength(analysisResult);
        
        const qualityScore = (confidence / 100 + strength) / 2;
        
        if (qualityScore >= 0.8) return 'EXCELLENT';
        if (qualityScore >= 0.6) return 'GOOD';
        if (qualityScore >= 0.4) return 'FAIR';
        return 'POOR';
    }

    formatTechnicalAnalysis(analysisResult) {
        return {
            summary: analysisResult.technicalAnalysis?.summary || null,
            indicators: analysisResult.technicalAnalysis?.indicators || {},
            confluence: analysisResult.technicalAnalysis?.confluence || {}
        };
    }

    formatPatternAnalysis(analysisResult) {
        return {
            summary: analysisResult.patternAnalysis?.summary || null,
            patterns: analysisResult.patternAnalysis?.patterns || {},
            confluence: analysisResult.patternAnalysis?.confluence || {}
        };
    }

    formatSupportResistance(analysisResult) {
        return {
            summary: analysisResult.supportResistance?.summary || null,
            levels: analysisResult.supportResistance?.supportResistance || {}
        };
    }

    formatRiskAssessment(analysisResult) {
        return {
            riskLevel: analysisResult.riskAssessment?.riskLevel || 'UNKNOWN',
            tradingSuitability: analysisResult.riskAssessment?.tradingSuitability || 'UNKNOWN',
            warnings: analysisResult.riskAssessment?.warnings || []
        };
    }

    formatMultiTimeframe(analysisResult) {
        return analysisResult.multiTimeframe || null;
    }

    createTradingRecommendation(analysisResult) {
        return {
            action: analysisResult.recommendation?.action || 'NO TRADE',
            suitability: analysisResult.recommendation?.suitability || 'UNKNOWN',
            riskLevel: analysisResult.riskAssessment?.riskLevel || 'HIGH',
            reasoning: analysisResult.recommendation?.tradingAdvice || 'No specific advice available'
        };
    }

    generateDetailedReasoning(analysisResult) {
        return analysisResult.reasoning || 
               analysisResult.recommendation?.reasoning || 
               'No detailed reasoning available';
    }

    maskApiKey(apiKey) {
        if (!apiKey) return 'UNKNOWN';
        return apiKey.substring(0, 10) + '...';
    }

    getSignalColor(direction) {
        const colors = {
            'UP': '#28a745',
            'DOWN': '#dc3545',
            'NO TRADE': '#6c757d'
        };
        return colors[direction] || '#6c757d';
    }

    getSignalEmoji(direction) {
        const emojis = {
            'UP': '🟢',
            'DOWN': '🔴',
            'NO TRADE': '⚪'
        };
        return emojis[direction] || '❓';
    }

    getRecommendationClass(action) {
        if (action === 'BUY' || action === 'UP') return 'success';
        if (action === 'SELL' || action === 'DOWN') return 'danger';
        return 'warning';
    }

    formatTechnicalSummaryHtml(technicalAnalysis) {
        if (!technicalAnalysis.summary) return '<p>No technical analysis available</p>';
        
        const summary = technicalAnalysis.summary;
        return `
            <div class="metric"><strong>Indicators Detected:</strong> ${summary.indicatorsDetected || 0}</div>
            <div class="metric"><strong>Confluence Direction:</strong> ${summary.confluenceDirection || 'UNKNOWN'}</div>
            <div class="metric"><strong>Trend Direction:</strong> ${summary.trendDirection || 'UNKNOWN'}</div>
            <div class="metric"><strong>Overall Strength:</strong> ${summary.overallStrength?.toFixed(2) || 'N/A'}</div>
        `;
    }

    /**
     * Get template methods
     */
    getConsoleTemplate() {
        return 'console_template';
    }

    getJsonTemplate() {
        return 'json_template';
    }

    getHtmlTemplate() {
        return 'html_template';
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            signalDistribution: {
                up: this.performanceMetrics.upSignals,
                down: this.performanceMetrics.downSignals,
                noTrade: this.performanceMetrics.noTradeSignals
            },
            historySize: this.signalHistory.length
        };
    }

    /**
     * Get signal history
     */
    getSignalHistory(limit = 10) {
        return this.signalHistory.slice(0, limit);
    }
}

module.exports = { OutputFormattingSystem };
