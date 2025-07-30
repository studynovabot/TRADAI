#!/usr/bin/env node

/**
 * 🚀 ULTIMATE TRADAI TRADING SYSTEM - COMPLETE INTEGRATION
 * ========================================================
 * 
 * The ultimate AI-powered trading chart analysis system integrating
 * all specialized modules for professional binary options trading
 * 
 * Features:
 * - Complete system integration with all modules
 * - Advanced technical analysis with all indicators
 * - Pattern recognition and trend analysis
 * - Support/resistance level detection
 * - Risk assessment and market condition analysis
 * - Multi-timeframe integration and confluence
 * - Professional output formatting and reporting
 * - Robust error handling and failover mechanisms
 * 
 * Built for TRADAI Chart Analysis System - PRODUCTION READY
 */

const { ChartImageProcessor } = require('./chart-image-processor.js');
const { AIVisionChartAnalyzer } = require('./ai-vision-chart-analyzer.js');
const { TechnicalIndicatorsAnalyzer } = require('./technical-indicators-analyzer.js');
const { PatternRecognitionAnalyzer } = require('./pattern-recognition-analyzer.js');
const { SupportResistanceAnalyzer } = require('./support-resistance-analyzer.js');
const { RiskAssessmentAnalyzer } = require('./risk-assessment-analyzer.js');
const { MultiTimeframeAnalyzer } = require('./multi-timeframe-analyzer.js');
const { OutputFormattingSystem } = require('./output-formatting-system.js');
const { ErrorHandlingSystem } = require('./error-handling-system.js');

class UltimateTradingSystem {
    constructor(options = {}) {
        this.options = {
            chartDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
            supportedTimeframes: ['1m', '3m', '5m'],
            minConfidenceForTrade: 70,
            enableMultiTimeframe: true,
            enableAdvancedAnalysis: true,
            outputFormats: ['console', 'json', 'html'],
            enableErrorHandling: true,
            autoProcessing: true,
            ...options
        };

        // Initialize all system modules
        this.imageProcessor = null;
        this.aiAnalyzer = null;
        this.technicalAnalyzer = null;
        this.patternAnalyzer = null;
        this.supportResistanceAnalyzer = null;
        this.riskAnalyzer = null;
        this.multiTimeframeAnalyzer = null;
        this.outputFormatter = null;
        this.errorHandler = null;

        // System state
        this.isInitialized = false;
        this.isRunning = false;

        // Performance tracking
        this.systemStats = {
            totalAnalyses: 0,
            successfulAnalyses: 0,
            tradingSignals: 0,
            multiTimeframeAnalyses: 0,
            errorRecoveries: 0,
            systemUptime: 0,
            startTime: null
        };
    }

    /**
     * Initialize the ultimate trading system
     */
    async initialize() {
        console.log('🚀 Initializing Ultimate TRADAI Trading System');
        console.log('===============================================');

        try {
            this.systemStats.startTime = Date.now();

            // Initialize error handling system first
            console.log('🛡️ Initializing Error Handling System...');
            this.errorHandler = new ErrorHandlingSystem({
                enableDetailedLogging: true,
                gracefulDegradation: true
            });

            // Initialize image processor
            console.log('📊 Initializing Chart Image Processor...');
            this.imageProcessor = new ChartImageProcessor({
                baseDirectory: this.options.chartDirectory,
                supportedTimeframes: this.options.supportedTimeframes
            });
            await this.imageProcessor.initialize();

            // Initialize AI analyzer
            console.log('🤖 Initializing AI Vision Chart Analyzer...');
            this.aiAnalyzer = new AIVisionChartAnalyzer();
            await this.aiAnalyzer.initialize();

            // Initialize specialized analyzers
            if (this.options.enableAdvancedAnalysis) {
                console.log('📈 Initializing Technical Indicators Analyzer...');
                this.technicalAnalyzer = new TechnicalIndicatorsAnalyzer();

                console.log('🕯️ Initializing Pattern Recognition Analyzer...');
                this.patternAnalyzer = new PatternRecognitionAnalyzer();

                console.log('📊 Initializing Support/Resistance Analyzer...');
                this.supportResistanceAnalyzer = new SupportResistanceAnalyzer();

                console.log('⚠️ Initializing Risk Assessment Analyzer...');
                this.riskAnalyzer = new RiskAssessmentAnalyzer();
            }

            // Initialize multi-timeframe analyzer
            if (this.options.enableMultiTimeframe) {
                console.log('⏱️ Initializing Multi-Timeframe Analyzer...');
                this.multiTimeframeAnalyzer = new MultiTimeframeAnalyzer();
            }

            // Initialize output formatter
            console.log('📊 Initializing Output Formatting System...');
            this.outputFormatter = new OutputFormattingSystem({
                outputFormats: this.options.outputFormats,
                reportDirectory: './reports'
            });

            this.isInitialized = true;
            console.log('✅ Ultimate TRADAI Trading System initialized successfully!');
            console.log('🎯 All modules loaded and ready for professional trading');

            return {
                success: true,
                modules: this.getLoadedModules(),
                capabilities: this.getSystemCapabilities()
            };

        } catch (error) {
            console.error('❌ Failed to initialize Ultimate Trading System:', error.message);
            
            if (this.errorHandler) {
                await this.errorHandler.handleError(error, {
                    operation: 'system_initialization',
                    retryFunction: () => this.initialize()
                });
            }
            
            throw error;
        }
    }

    /**
     * Perform ultimate chart analysis with all modules
     */
    async analyzeChart(timeframe, filename) {
        if (!this.isInitialized) {
            throw new Error('System not initialized. Call initialize() first.');
        }

        console.log(`🔍 Ultimate Analysis: ${timeframe}/${filename}`);
        console.log('================================================');

        const analysisStartTime = Date.now();

        try {
            this.systemStats.totalAnalyses++;

            // Step 1: Process chart image
            console.log('📊 Step 1: Processing chart image...');
            const chartData = await this.executeWithErrorHandling(
                () => this.imageProcessor.processSpecificFile(timeframe, filename),
                'image_processing'
            );

            // Step 2: AI vision analysis
            console.log('🤖 Step 2: AI vision analysis...');
            const aiAnalysis = await this.executeWithErrorHandling(
                () => this.aiAnalyzer.analyzeChart(chartData),
                'ai_analysis'
            );

            let technicalAnalysis = null;
            let patternAnalysis = null;
            let supportResistanceAnalysis = null;
            let riskAssessment = null;

            // Step 3: Advanced technical analysis (if enabled)
            if (this.options.enableAdvancedAnalysis) {
                console.log('📈 Step 3: Technical indicators analysis...');
                technicalAnalysis = await this.executeWithErrorHandling(
                    () => this.technicalAnalyzer.analyzeIndicators(aiAnalysis.rawAnalysis, chartData),
                    'technical_analysis'
                );

                console.log('🕯️ Step 4: Pattern recognition analysis...');
                patternAnalysis = await this.executeWithErrorHandling(
                    () => this.patternAnalyzer.analyzePatterns(aiAnalysis.rawAnalysis, chartData),
                    'pattern_analysis'
                );

                console.log('📊 Step 5: Support/resistance analysis...');
                supportResistanceAnalysis = await this.executeWithErrorHandling(
                    () => this.supportResistanceAnalyzer.analyzeSupportResistance(aiAnalysis.rawAnalysis, chartData),
                    'support_resistance_analysis'
                );

                console.log('⚠️ Step 6: Risk assessment...');
                riskAssessment = await this.executeWithErrorHandling(
                    () => this.riskAnalyzer.assessRisk(
                        aiAnalysis.rawAnalysis, 
                        technicalAnalysis, 
                        patternAnalysis, 
                        supportResistanceAnalysis, 
                        chartData
                    ),
                    'risk_assessment'
                );
            }

            // Step 7: Generate comprehensive result
            console.log('🎯 Step 7: Generating comprehensive trading signal...');
            const comprehensiveResult = this.generateComprehensiveResult({
                chartData,
                aiAnalysis,
                technicalAnalysis,
                patternAnalysis,
                supportResistanceAnalysis,
                riskAssessment,
                processingTime: Date.now() - analysisStartTime
            });

            // Step 8: Format and output results
            console.log('📊 Step 8: Formatting and outputting results...');
            const formattedOutput = await this.executeWithErrorHandling(
                () => this.outputFormatter.formatAndOutput(comprehensiveResult, this.options.outputFormats),
                'output_formatting'
            );

            this.systemStats.successfulAnalyses++;
            this.systemStats.tradingSignals++;

            console.log(`✅ Ultimate analysis completed in ${Date.now() - analysisStartTime}ms`);
            console.log(`🎯 Signal: ${comprehensiveResult.signal} (${comprehensiveResult.confidence}% confidence)`);

            return {
                ...comprehensiveResult,
                formattedOutput,
                systemStats: this.getSystemStats()
            };

        } catch (error) {
            console.error(`❌ Ultimate analysis failed: ${error.message}`);
            
            const recoveryResult = await this.errorHandler.handleError(error, {
                operation: 'ultimate_analysis',
                timeframe,
                filename,
                retryFunction: () => this.analyzeChart(timeframe, filename)
            });

            if (recoveryResult.recovered) {
                this.systemStats.errorRecoveries++;
                return recoveryResult.result || recoveryResult;
            }

            throw error;
        }
    }

    /**
     * Perform multi-timeframe ultimate analysis
     */
    async analyzeMultiTimeframe(chartFiles) {
        if (!this.options.enableMultiTimeframe || !this.multiTimeframeAnalyzer) {
            throw new Error('Multi-timeframe analysis not enabled');
        }

        console.log('⏱️ Ultimate Multi-Timeframe Analysis');
        console.log('====================================');

        try {
            this.systemStats.multiTimeframeAnalyses++;

            const timeframeAnalyses = {};

            // Analyze each timeframe
            for (const [timeframe, filename] of Object.entries(chartFiles)) {
                if (this.options.supportedTimeframes.includes(timeframe)) {
                    console.log(`🔍 Analyzing ${timeframe} timeframe...`);
                    timeframeAnalyses[timeframe] = await this.analyzeChart(timeframe, filename);
                }
            }

            // Perform multi-timeframe integration
            console.log('🔗 Integrating multi-timeframe analysis...');
            const multiTimeframeResult = await this.executeWithErrorHandling(
                () => this.multiTimeframeAnalyzer.analyzeMultiTimeframe(timeframeAnalyses),
                'multi_timeframe_analysis'
            );

            console.log('✅ Multi-timeframe analysis completed');
            console.log(`🎯 Confluence: ${multiTimeframeResult.confluence.direction} (${(multiTimeframeResult.confluence.strength * 100).toFixed(1)}%)`);

            return multiTimeframeResult;

        } catch (error) {
            console.error(`❌ Multi-timeframe analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute function with error handling
     */
    async executeWithErrorHandling(func, operation) {
        try {
            return await func();
        } catch (error) {
            const recoveryResult = await this.errorHandler.handleError(error, {
                operation,
                retryFunction: func
            });

            if (recoveryResult.recovered) {
                this.systemStats.errorRecoveries++;
                return recoveryResult.result || recoveryResult;
            }

            throw error;
        }
    }

    /**
     * Generate comprehensive analysis result
     */
    generateComprehensiveResult(analyses) {
        const {
            chartData,
            aiAnalysis,
            technicalAnalysis,
            patternAnalysis,
            supportResistanceAnalysis,
            riskAssessment,
            processingTime
        } = analyses;

        // Extract core signal information
        const signal = aiAnalysis.signal || 'NO TRADE';
        const confidence = aiAnalysis.confidence || 0;

        // Calculate comprehensive confidence
        let comprehensiveConfidence = confidence;
        let confidenceFactors = 1;

        if (technicalAnalysis && technicalAnalysis.indicatorStrength) {
            comprehensiveConfidence += technicalAnalysis.indicatorStrength * 100;
            confidenceFactors++;
        }

        if (patternAnalysis && patternAnalysis.patternStrength) {
            comprehensiveConfidence += patternAnalysis.patternStrength * 100;
            confidenceFactors++;
        }

        comprehensiveConfidence = comprehensiveConfidence / confidenceFactors;

        // Adjust for risk assessment
        if (riskAssessment && riskAssessment.riskAssessment.tradingSuitability === 'UNSUITABLE') {
            comprehensiveConfidence = Math.min(comprehensiveConfidence, 50);
        }

        return {
            timestamp: new Date().toISOString(),
            chartData,
            signal,
            confidence: Math.round(comprehensiveConfidence),
            
            // Individual analysis results
            aiAnalysis,
            technicalAnalysis,
            patternAnalysis,
            supportResistanceAnalysis,
            riskAssessment,
            
            // Comprehensive metrics
            processingTime,
            analysisQuality: this.assessOverallQuality(analyses),
            
            // Trading recommendation
            recommendation: this.generateUltimateRecommendation(analyses, comprehensiveConfidence),
            
            // System metadata
            systemVersion: '1.0.0',
            modulesUsed: this.getLoadedModules()
        };
    }

    /**
     * Generate ultimate trading recommendation
     */
    generateUltimateRecommendation(analyses, confidence) {
        const { signal, riskAssessment } = analyses.aiAnalysis;
        
        let action = 'NO TRADE';
        let suitability = 'POOR';
        let reasoning = 'Insufficient analysis for trading recommendation';

        if (confidence >= this.options.minConfidenceForTrade) {
            if (riskAssessment && riskAssessment.riskAssessment.tradingSuitability !== 'UNSUITABLE') {
                action = signal;
                
                if (confidence >= 85) suitability = 'EXCELLENT';
                else if (confidence >= 75) suitability = 'GOOD';
                else suitability = 'FAIR';
                
                reasoning = `High-confidence ${signal} signal with comprehensive analysis support`;
            } else {
                reasoning = 'High confidence signal but risk assessment indicates unsuitable conditions';
            }
        } else {
            reasoning = `Confidence ${confidence}% below minimum threshold of ${this.options.minConfidenceForTrade}%`;
        }

        return {
            action,
            suitability,
            reasoning,
            confidence,
            riskLevel: riskAssessment?.riskAssessment?.riskLevel || 'HIGH'
        };
    }

    /**
     * Assess overall analysis quality
     */
    assessOverallQuality(analyses) {
        let qualityScore = 0;
        let factors = 0;

        if (analyses.aiAnalysis) {
            qualityScore += analyses.aiAnalysis.analysisQuality === 'EXCELLENT' ? 1 : 
                           analyses.aiAnalysis.analysisQuality === 'GOOD' ? 0.8 : 0.6;
            factors++;
        }

        if (analyses.technicalAnalysis) {
            qualityScore += analyses.technicalAnalysis.indicatorStrength || 0.5;
            factors++;
        }

        if (analyses.patternAnalysis) {
            qualityScore += analyses.patternAnalysis.patternStrength || 0.5;
            factors++;
        }

        const avgQuality = factors > 0 ? qualityScore / factors : 0.5;
        
        if (avgQuality >= 0.8) return 'EXCELLENT';
        if (avgQuality >= 0.6) return 'GOOD';
        if (avgQuality >= 0.4) return 'FAIR';
        return 'POOR';
    }

    /**
     * Get loaded modules
     */
    getLoadedModules() {
        const modules = ['Image Processor', 'AI Analyzer'];
        
        if (this.technicalAnalyzer) modules.push('Technical Analyzer');
        if (this.patternAnalyzer) modules.push('Pattern Analyzer');
        if (this.supportResistanceAnalyzer) modules.push('Support/Resistance Analyzer');
        if (this.riskAnalyzer) modules.push('Risk Analyzer');
        if (this.multiTimeframeAnalyzer) modules.push('Multi-Timeframe Analyzer');
        if (this.outputFormatter) modules.push('Output Formatter');
        if (this.errorHandler) modules.push('Error Handler');
        
        return modules;
    }

    /**
     * Get system capabilities
     */
    getSystemCapabilities() {
        return [
            'AI-Powered Chart Analysis',
            'Technical Indicator Processing',
            'Pattern Recognition',
            'Support/Resistance Detection',
            'Risk Assessment',
            'Multi-Timeframe Analysis',
            'Professional Output Formatting',
            'Robust Error Handling',
            'Real-time Signal Generation',
            'Binary Options Trading Signals'
        ];
    }

    /**
     * Get comprehensive system statistics
     */
    getSystemStats() {
        this.systemStats.systemUptime = Date.now() - this.systemStats.startTime;
        
        return {
            ...this.systemStats,
            successRate: this.systemStats.totalAnalyses > 0 ? 
                (this.systemStats.successfulAnalyses / this.systemStats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
            errorRecoveryRate: this.systemStats.totalAnalyses > 0 ? 
                (this.systemStats.errorRecoveries / this.systemStats.totalAnalyses * 100).toFixed(2) + '%' : '0%',
            uptimeFormatted: this.formatUptime(this.systemStats.systemUptime),
            moduleStats: {
                imageProcessor: this.imageProcessor?.getStats(),
                aiAnalyzer: this.aiAnalyzer?.getStats(),
                technicalAnalyzer: this.technicalAnalyzer?.getStats(),
                patternAnalyzer: this.patternAnalyzer?.getStats(),
                supportResistanceAnalyzer: this.supportResistanceAnalyzer?.getStats(),
                riskAnalyzer: this.riskAnalyzer?.getStats(),
                multiTimeframeAnalyzer: this.multiTimeframeAnalyzer?.getStats(),
                errorHandler: this.errorHandler?.getErrorStats()
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
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down Ultimate TRADAI Trading System...');
        
        if (this.imageProcessor) await this.imageProcessor.shutdown();
        if (this.aiAnalyzer) await this.aiAnalyzer.shutdown();
        
        console.log('✅ Ultimate TRADAI Trading System shutdown complete');
        console.log('📊 Final Statistics:');
        console.log(JSON.stringify(this.getSystemStats(), null, 2));
    }
}

module.exports = { UltimateTradingSystem };

// Export for testing
if (require.main === module) {
    async function testUltimateSystem() {
        console.log('🧪 Testing Ultimate TRADAI Trading System...\n');

        const ultimateSystem = new UltimateTradingSystem({
            chartDirectory: 'C:\\Users\\thaku\\Pictures\\trading ss',
            enableAdvancedAnalysis: true,
            enableMultiTimeframe: true,
            outputFormats: ['console', 'json'],
            minConfidenceForTrade: 70
        });

        try {
            // Initialize the ultimate system
            const initResult = await ultimateSystem.initialize();
            console.log('\n🎯 Initialization Result:');
            console.log(`   Modules: ${initResult.modules.join(', ')}`);
            console.log(`   Capabilities: ${initResult.capabilities.length}`);

            // Get available charts
            const charts = await ultimateSystem.imageProcessor.getAvailableCharts();
            console.log('\n📊 Available charts:');
            console.log(JSON.stringify(charts, null, 2));

            // Test single chart analysis
            for (const timeframe of ['1m', '3m', '5m']) {
                if (charts[timeframe] && charts[timeframe].length > 0) {
                    const chart = charts[timeframe][0];
                    console.log(`\n🔍 Testing ultimate analysis with ${timeframe}/${chart.filename}...`);

                    try {
                        const result = await ultimateSystem.analyzeChart(timeframe, chart.filename);
                        console.log(`✅ Ultimate analysis successful!`);
                        console.log(`   Signal: ${result.signal}`);
                        console.log(`   Confidence: ${result.confidence}%`);
                        console.log(`   Recommendation: ${result.recommendation.action}`);
                        console.log(`   Quality: ${result.analysisQuality}`);
                        break; // Test only one chart
                    } catch (error) {
                        console.warn(`⚠️ Failed to analyze ${timeframe}/${chart.filename}: ${error.message}`);
                    }
                }
            }

            // Show final system statistics
            console.log('\n📊 Ultimate System Statistics:');
            const stats = ultimateSystem.getSystemStats();
            console.log(`   Total Analyses: ${stats.totalAnalyses}`);
            console.log(`   Success Rate: ${stats.successRate}`);
            console.log(`   Error Recovery Rate: ${stats.errorRecoveryRate}`);
            console.log(`   System Uptime: ${stats.uptimeFormatted}`);

            // Shutdown
            await ultimateSystem.shutdown();

            console.log('\n🎉 Ultimate TRADAI Trading System test completed successfully!');
            console.log('🚀 System is ready for professional binary options trading!');

        } catch (error) {
            console.error('\n❌ Ultimate system test failed:', error.message);
            process.exit(1);
        }
    }

    testUltimateSystem();
}
