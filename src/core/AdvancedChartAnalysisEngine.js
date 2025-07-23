/**
 * Advanced Chart Analysis Engine
 * 
 * Main orchestrator that combines all analysis components to provide
 * comprehensive trading chart analysis from screenshots.
 */

const { AdvancedImageProcessor } = require('./AdvancedImageProcessor');
const { TradingDataExtractor } = require('./TradingDataExtractor');
const { ComputerVisionEngine } = require('./ComputerVisionEngine');
const { AdvancedMultiTimeframeAnalyzer } = require('./AdvancedMultiTimeframeAnalyzer');
const { AdvancedSignalGenerator } = require('./AdvancedSignalGenerator');

class AdvancedChartAnalysisEngine {
    constructor(config = {}) {
        this.config = {
            // Overall confidence thresholds
            minAnalysisConfidence: config.minAnalysisConfidence || 75,
            minSignalConfidence: config.minSignalConfidence || 80,
            
            // Component configurations
            imageProcessing: config.imageProcessing || {},
            computerVision: config.computerVision || {},
            multiTimeframe: config.multiTimeframe || {},
            signalGeneration: config.signalGeneration || {},
            
            // Performance settings
            enableParallelProcessing: config.enableParallelProcessing !== false,
            maxProcessingTime: config.maxProcessingTime || 30000, // 30 seconds
            
            // Output settings
            includeDebugInfo: config.includeDebugInfo || false,
            saveIntermediateResults: config.saveIntermediateResults || false,
            
            ...config
        };
        
        // Initialize components
        this.imageProcessor = new AdvancedImageProcessor(this.config.imageProcessing);
        this.dataExtractor = new TradingDataExtractor();
        this.visionEngine = new ComputerVisionEngine(this.config.computerVision);
        this.multiTimeframeAnalyzer = new AdvancedMultiTimeframeAnalyzer(this.config.multiTimeframe);
        this.signalGenerator = new AdvancedSignalGenerator(this.config.signalGeneration);
        
        this.analysisHistory = [];
    }

    /**
     * Main analysis method - processes screenshot and returns comprehensive analysis
     */
    async analyzeChartScreenshot(imageBuffer, options = {}) {
        console.log('🚀 Starting comprehensive chart analysis...');
        
        const startTime = Date.now();
        const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Step 1: Process image and extract text
            console.log('📷 Step 1: Image processing and OCR...');
            const imageProcessingResult = await this.imageProcessor.processChartScreenshot(imageBuffer, options);
            
            if (!imageProcessingResult.success) {
                throw new Error(`Image processing failed: ${imageProcessingResult.error}`);
            }
            
            // Step 2: Computer vision analysis
            console.log('👁️ Step 2: Computer vision analysis...');
            const visionResult = await this.visionEngine.extractChartData(
                imageProcessingResult.preprocessing.buffer || imageBuffer,
                imageProcessingResult.regions
            );
            
            if (!visionResult.success) {
                console.warn('⚠️ Computer vision analysis failed, continuing with OCR data only');
            }
            
            // Step 3: Multi-timeframe analysis
            console.log('🔄 Step 3: Multi-timeframe analysis...');
            const analysisData = {
                tradingData: imageProcessingResult.tradingData,
                chartData: visionResult.success ? visionResult : null,
                textExtractions: imageProcessingResult.textExtractions,
                imageMetadata: imageProcessingResult.imageMetadata
            };
            
            const multiTimeframeResult = await this.multiTimeframeAnalyzer.analyzeMultipleTimeframes(analysisData);
            
            // Step 4: Generate trading signals
            console.log('🎯 Step 4: Signal generation...');
            const signalResult = await this.signalGenerator.generateSignals(analysisData);
            
            // Step 5: Compile final analysis
            const processingTime = Date.now() - startTime;
            const overallConfidence = this.calculateOverallConfidence(
                imageProcessingResult,
                visionResult,
                multiTimeframeResult,
                signalResult
            );
            
            const finalResult = {
                analysisId,
                success: true,
                processingTime,
                confidence: overallConfidence,
                
                // Core analysis results
                tradingData: imageProcessingResult.tradingData,
                chartAnalysis: visionResult.success ? visionResult : null,
                multiTimeframeAnalysis: multiTimeframeResult.success ? multiTimeframeResult : null,
                signals: signalResult.success ? signalResult.signals : [],
                
                // Market assessment
                marketAssessment: this.generateMarketAssessment(analysisData, multiTimeframeResult, signalResult),
                
                // Risk assessment
                riskAssessment: this.generateRiskAssessment(signalResult.signals),
                
                // Metadata
                metadata: {
                    imageProcessing: imageProcessingResult.success,
                    computerVision: visionResult.success,
                    multiTimeframe: multiTimeframeResult.success,
                    signalGeneration: signalResult.success,
                    totalSignals: signalResult.success ? signalResult.signals.length : 0,
                    highConfidenceSignals: signalResult.success ? 
                        signalResult.signals.filter(s => s.confidence >= this.config.minSignalConfidence).length : 0
                },
                
                timestamp: new Date().toISOString()
            };
            
            // Include debug information if requested
            if (this.config.includeDebugInfo) {
                finalResult.debug = {
                    imageProcessing: imageProcessingResult,
                    computerVision: visionResult,
                    multiTimeframe: multiTimeframeResult,
                    signalGeneration: signalResult
                };
            }
            
            // Store in history
            this.analysisHistory.push({
                analysisId,
                timestamp: finalResult.timestamp,
                processingTime,
                confidence: overallConfidence,
                signalCount: finalResult.signals.length,
                success: true
            });
            
            console.log(`✅ Analysis completed in ${processingTime}ms with ${overallConfidence.toFixed(1)}% confidence`);
            console.log(`📊 Generated ${finalResult.signals.length} signals (${finalResult.metadata.highConfidenceSignals} high-confidence)`);
            
            return finalResult;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            
            console.error('❌ Chart analysis failed:', error.message);
            
            const errorResult = {
                analysisId,
                success: false,
                error: error.message,
                processingTime,
                confidence: 0,
                signals: [],
                timestamp: new Date().toISOString()
            };
            
            // Store error in history
            this.analysisHistory.push({
                analysisId,
                timestamp: errorResult.timestamp,
                processingTime,
                success: false,
                error: error.message
            });
            
            return errorResult;
        }
    }

    /**
     * Generate market assessment summary
     */
    generateMarketAssessment(analysisData, multiTimeframeResult, signalResult) {
        const assessment = {
            overallBias: 'neutral',
            trendDirection: 'unknown',
            volatility: 'unknown',
            keyLevels: [],
            majorPatterns: [],
            confidence: 0
        };
        
        try {
            // Determine overall bias from signals
            if (signalResult.success && signalResult.signals.length > 0) {
                const bullishSignals = signalResult.signals.filter(s => s.direction === 'UP').length;
                const bearishSignals = signalResult.signals.filter(s => s.direction === 'DOWN').length;
                
                if (bullishSignals > bearishSignals) {
                    assessment.overallBias = 'bullish';
                } else if (bearishSignals > bullishSignals) {
                    assessment.overallBias = 'bearish';
                }
            }
            
            // Extract trend direction
            if (multiTimeframeResult.success && multiTimeframeResult.marketStructure) {
                assessment.trendDirection = multiTimeframeResult.marketStructure.trend.direction;
                assessment.volatility = multiTimeframeResult.marketStructure.volatility.level;
            }
            
            // Extract key levels
            if (analysisData.chartData && analysisData.chartData.supportResistance) {
                assessment.keyLevels = [
                    ...analysisData.chartData.supportResistance.support.slice(0, 3),
                    ...analysisData.chartData.supportResistance.resistance.slice(0, 3)
                ].sort((a, b) => b.confidence - a.confidence);
            }
            
            // Extract major patterns
            if (analysisData.chartData && analysisData.chartData.patterns) {
                assessment.majorPatterns = analysisData.chartData.patterns
                    .filter(p => p.confidence >= 80)
                    .slice(0, 5);
            }
            
            // Calculate assessment confidence
            assessment.confidence = this.calculateAssessmentConfidence(assessment, analysisData);
            
        } catch (error) {
            console.error('❌ Market assessment generation failed:', error.message);
        }
        
        return assessment;
    }

    /**
     * Generate risk assessment
     */
    generateRiskAssessment(signals) {
        const assessment = {
            overallRisk: 'medium',
            recommendedPositionSize: 0.01, // 1% default
            maxSimultaneousSignals: 3,
            riskFactors: [],
            opportunities: []
        };
        
        try {
            if (signals.length === 0) {
                assessment.overallRisk = 'high';
                assessment.riskFactors.push('No high-confidence signals detected');
                return assessment;
            }
            
            // Analyze signal quality
            const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
            const highConfidenceSignals = signals.filter(s => s.confidence >= 85).length;
            
            if (avgConfidence >= 85 && highConfidenceSignals >= 2) {
                assessment.overallRisk = 'low';
                assessment.recommendedPositionSize = 0.02; // 2%
                assessment.opportunities.push('Multiple high-confidence signals available');
            } else if (avgConfidence >= 75) {
                assessment.overallRisk = 'medium';
                assessment.recommendedPositionSize = 0.015; // 1.5%
            } else {
                assessment.overallRisk = 'high';
                assessment.recommendedPositionSize = 0.005; // 0.5%
                assessment.riskFactors.push('Lower confidence signals detected');
            }
            
            // Check for conflicting signals
            const bullishSignals = signals.filter(s => s.direction === 'UP').length;
            const bearishSignals = signals.filter(s => s.direction === 'DOWN').length;
            
            if (Math.abs(bullishSignals - bearishSignals) <= 1 && signals.length > 2) {
                assessment.riskFactors.push('Conflicting signal directions detected');
                assessment.overallRisk = 'high';
            }
            
        } catch (error) {
            console.error('❌ Risk assessment generation failed:', error.message);
            assessment.overallRisk = 'high';
            assessment.riskFactors.push('Risk assessment calculation failed');
        }
        
        return assessment;
    }

    /**
     * Calculate overall analysis confidence
     */
    calculateOverallConfidence(imageResult, visionResult, multiTimeframeResult, signalResult) {
        let totalConfidence = 0;
        let weights = 0;
        
        // Image processing confidence (20% weight)
        if (imageResult.success) {
            totalConfidence += imageResult.confidence * 0.2;
            weights += 0.2;
        }
        
        // Computer vision confidence (30% weight)
        if (visionResult.success) {
            totalConfidence += visionResult.confidence * 0.3;
            weights += 0.3;
        }
        
        // Multi-timeframe analysis confidence (25% weight)
        if (multiTimeframeResult.success) {
            totalConfidence += multiTimeframeResult.confidence * 0.25;
            weights += 0.25;
        }
        
        // Signal generation confidence (25% weight)
        if (signalResult.success && signalResult.signals.length > 0) {
            const avgSignalConfidence = signalResult.signals.reduce((sum, s) => sum + s.confidence, 0) / signalResult.signals.length;
            totalConfidence += avgSignalConfidence * 0.25;
            weights += 0.25;
        }
        
        return weights > 0 ? totalConfidence / weights : 0;
    }

    /**
     * Calculate assessment confidence
     */
    calculateAssessmentConfidence(assessment, analysisData) {
        let confidence = 50; // Base confidence
        
        if (assessment.overallBias !== 'neutral') confidence += 15;
        if (assessment.trendDirection !== 'unknown') confidence += 15;
        if (assessment.keyLevels.length > 0) confidence += 10;
        if (assessment.majorPatterns.length > 0) confidence += 10;
        
        return Math.min(confidence, 95);
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up analysis engine resources...');
        
        try {
            await this.imageProcessor.cleanup();
            console.log('✅ Analysis engine cleanup completed');
        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
        }
    }

    /**
     * Get analysis statistics
     */
    getAnalysisStatistics() {
        const successful = this.analysisHistory.filter(a => a.success);
        const failed = this.analysisHistory.filter(a => !a.success);
        
        return {
            totalAnalyses: this.analysisHistory.length,
            successful: successful.length,
            failed: failed.length,
            successRate: this.analysisHistory.length > 0 ? (successful.length / this.analysisHistory.length) * 100 : 0,
            averageProcessingTime: successful.length > 0 ? 
                successful.reduce((sum, a) => sum + a.processingTime, 0) / successful.length : 0,
            averageConfidence: successful.length > 0 ? 
                successful.reduce((sum, a) => sum + a.confidence, 0) / successful.length : 0,
            averageSignalCount: successful.length > 0 ? 
                successful.reduce((sum, a) => sum + (a.signalCount || 0), 0) / successful.length : 0
        };
    }
}

module.exports = { AdvancedChartAnalysisEngine };
