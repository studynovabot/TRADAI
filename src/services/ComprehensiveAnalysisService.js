/**
 * Comprehensive Analysis Service
 * 
 * This service orchestrates the complete OCR-to-AI analysis pipeline
 * with maximum dependency integration for real money trading decisions.
 */

const ComprehensiveOCRAIAnalyzer = require('../analysis/ComprehensiveOCRAIAnalyzer');
const AITradingAnalysisEngine = require('../analysis/AITradingAnalysisEngine');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

class ComprehensiveAnalysisService {
    constructor() {
        this.ocrAnalyzer = null;
        this.aiEngine = null;
        this.isInitialized = false;
        this.analysisHistory = [];
    }

    /**
     * Initialize the comprehensive analysis service
     */
    async initialize() {
        console.log('🚀 Initializing Comprehensive Trading Analysis Service');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        try {
            // Initialize OCR-AI analyzer
            this.ocrAnalyzer = new ComprehensiveOCRAIAnalyzer();
            await this.ocrAnalyzer.initialize();
            
            // Initialize AI trading engine
            this.aiEngine = new AITradingAnalysisEngine();
            
            this.isInitialized = true;
            console.log('✅ Comprehensive Analysis Service ready for real money trading\n');
            
        } catch (error) {
            console.error('❌ Service initialization failed:', error.message);
            throw error;
        }
    }

    /**
     * Perform comprehensive analysis on a single screenshot
     */
    async analyzeScreenshot(screenshotPath, tradingPair = 'USD/INR') {
        if (!this.isInitialized) {
            throw new Error('Service not initialized. Call initialize() first.');
        }
        
        const analysisId = uuidv4();
        const startTime = Date.now();
        
        console.log(`📊 Starting Comprehensive Analysis (ID: ${analysisId})`);
        console.log(`📂 Screenshot: ${path.basename(screenshotPath)}`);
        console.log(`💱 Trading Pair: ${tradingPair}`);
        console.log(`⏱️ Maximum Processing Time: 60 seconds\n`);
        
        const result = {
            analysisId,
            tradingPair,
            screenshot: path.basename(screenshotPath),
            timestamp: moment().toISOString(),
            processingTime: 0,
            
            // Analysis phases
            phases: {
                imagePreprocessing: {},
                multiEngineOCR: {},
                computerVision: {},
                aiAnalysis: {}
            },
            
            // Final results
            tradingSignal: {
                direction: 'NEUTRAL',
                confidence: 50,
                strength: 'WEAK'
            },
            
            riskManagement: {},
            confluence: {},
            
            // Quality metrics
            quality: {
                ocrConfidence: 0,
                visionConfidence: 0,
                aiConfidence: 0,
                overallReliability: 0
            }
        };
        
        try {
            // Phase 1: Image Preprocessing (15s allocation)
            console.log('🔧 Phase 1: Advanced Image Preprocessing');
            const imageBuffer = await fs.readFile(screenshotPath);
            const sharp = require('sharp');
            const metadata = await sharp(imageBuffer).metadata();
            
            const enhancedImages = await this.ocrAnalyzer.preprocessImage(imageBuffer, metadata);
            result.phases.imagePreprocessing = {
                completed: true,
                processingTime: enhancedImages.processingTime,
                originalSize: `${metadata.width}x${metadata.height}`,
                enhancedSize: `Enhanced with multiple filters`
            };
            
            // Phase 2: Multi-Engine OCR Extraction (20s allocation)
            console.log('🔍 Phase 2: Multi-Engine OCR Extraction');
            const ocrResults = await this.ocrAnalyzer.performMultiEngineOCR(enhancedImages, metadata);
            result.phases.multiEngineOCR = {
                completed: true,
                processingTime: ocrResults.processingTime || 0,
                enginesUsed: ocrResults.engines.length,
                pricesExtracted: ocrResults.extractedData.prices.length,
                indicatorsFound: ocrResults.extractedData.indicators.length,
                confidence: ocrResults.confidence.overall
            };
            result.quality.ocrConfidence = ocrResults.confidence.overall;
            
            // Phase 3: Computer Vision Analysis (20s allocation)
            console.log('👁️ Phase 3: Computer Vision Pattern Analysis');
            const visionResults = await this.ocrAnalyzer.performComputerVisionAnalysis(enhancedImages, metadata);
            result.phases.computerVision = {
                completed: true,
                processingTime: visionResults.processingTime,
                patternsDetected: visionResults.candlestickPatterns.length,
                trendLinesFound: visionResults.trendLines.length,
                colorSentiment: visionResults.colorAnalysis.sentiment,
                confidence: visionResults.confidence
            };
            result.quality.visionConfidence = visionResults.confidence;
            
            // Phase 4: AI Trading Analysis (15s allocation)
            console.log('🤖 Phase 4: AI-Powered Trading Analysis');
            const aiAnalysis = await this.aiEngine.performAIAnalysis(ocrResults, tradingPair);
            result.phases.aiAnalysis = {
                completed: true,
                processingTime: aiAnalysis.processingTime,
                signalGenerated: aiAnalysis.signals.direction,
                confidence: aiAnalysis.signals.confidence,
                confluenceAligned: aiAnalysis.confluence.aligned
            };
            result.quality.aiConfidence = aiAnalysis.signals.confidence;
            
            // Compile final results
            result.tradingSignal = {
                direction: aiAnalysis.signals.direction,
                confidence: aiAnalysis.signals.confidence,
                strength: aiAnalysis.signals.strength,
                reasoning: aiAnalysis.signals.reasoning,
                nextCandles: aiAnalysis.signals.nextCandles,
                entryConditions: aiAnalysis.signals.entryConditions
            };
            
            result.riskManagement = aiAnalysis.riskManagement;
            result.confluence = aiAnalysis.confluence;
            
            // Calculate overall reliability
            result.quality.overallReliability = this.calculateOverallReliability(result.quality);
            
            result.processingTime = Date.now() - startTime;
            
            // Store in history
            this.analysisHistory.push(result);
            
            console.log('\n✅ Comprehensive Analysis Completed Successfully!');
            console.log(`⏱️ Total Processing Time: ${result.processingTime}ms (${(result.processingTime/1000).toFixed(1)}s)`);
            console.log(`🎯 Trading Signal: ${result.tradingSignal.direction} (${result.tradingSignal.confidence.toFixed(1)}%)`);
            console.log(`💪 Signal Strength: ${result.tradingSignal.strength}`);
            console.log(`📊 Overall Reliability: ${result.quality.overallReliability.toFixed(1)}%`);
            console.log(`🔄 Confluence: ${result.confluence.aligned ? 'ALIGNED' : 'MIXED'}\n`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Comprehensive analysis failed:', error.message);
            result.processingTime = Date.now() - startTime;
            result.error = error.message;
            return result;
        }
    }

    /**
     * Analyze multiple screenshots for multi-timeframe confluence
     */
    async analyzeMultipleScreenshots(screenshotPaths, tradingPair = 'USD/INR') {
        console.log('🔄 Multi-Timeframe Confluence Analysis');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const multiAnalysis = {
            tradingPair,
            timestamp: moment().toISOString(),
            screenshots: screenshotPaths.length,
            individualAnalyses: [],
            confluenceAnalysis: {},
            finalRecommendation: {},
            processingTime: 0
        };
        
        const startTime = Date.now();
        
        try {
            // Analyze each screenshot
            for (let i = 0; i < screenshotPaths.length; i++) {
                console.log(`📈 Analyzing screenshot ${i + 1}/${screenshotPaths.length}: ${path.basename(screenshotPaths[i])}`);
                
                const analysis = await this.analyzeScreenshot(screenshotPaths[i], tradingPair);
                multiAnalysis.individualAnalyses.push(analysis);
                
                console.log(`✅ Screenshot ${i + 1} completed: ${analysis.tradingSignal.direction} (${analysis.tradingSignal.confidence.toFixed(1)}%)\n`);
            }
            
            // Perform confluence analysis
            console.log('🔄 Calculating Multi-Timeframe Confluence...');
            multiAnalysis.confluenceAnalysis = this.calculateMultiTimeframeConfluence(multiAnalysis.individualAnalyses);
            
            // Generate final recommendation
            multiAnalysis.finalRecommendation = this.generateFinalRecommendation(multiAnalysis);
            
            multiAnalysis.processingTime = Date.now() - startTime;
            
            console.log('✅ Multi-Timeframe Analysis Completed!');
            console.log(`⏱️ Total Processing Time: ${(multiAnalysis.processingTime/1000).toFixed(1)}s`);
            console.log(`🎯 Final Signal: ${multiAnalysis.finalRecommendation.direction}`);
            console.log(`📊 Confluence Score: ${multiAnalysis.confluenceAnalysis.score.toFixed(1)}%`);
            console.log(`💡 Recommendation: ${multiAnalysis.finalRecommendation.action}\n`);
            
            return multiAnalysis;
            
        } catch (error) {
            console.error('❌ Multi-timeframe analysis failed:', error.message);
            multiAnalysis.processingTime = Date.now() - startTime;
            multiAnalysis.error = error.message;
            return multiAnalysis;
        }
    }

    /**
     * Calculate overall reliability score
     */
    calculateOverallReliability(quality) {
        const weights = {
            ocr: 0.3,
            vision: 0.3,
            ai: 0.4
        };
        
        return (quality.ocrConfidence * weights.ocr) +
               (quality.visionConfidence * weights.vision) +
               (quality.aiConfidence * weights.ai);
    }

    /**
     * Calculate multi-timeframe confluence
     */
    calculateMultiTimeframeConfluence(analyses) {
        const confluence = {
            score: 0,
            aligned: false,
            signals: {
                up: 0,
                down: 0,
                neutral: 0
            },
            averageConfidence: 0,
            strongestSignal: null
        };
        
        if (analyses.length === 0) return confluence;
        
        // Count signals by direction
        analyses.forEach(analysis => {
            const signal = analysis.tradingSignal.direction.toLowerCase();
            if (signal === 'up') confluence.signals.up++;
            else if (signal === 'down') confluence.signals.down++;
            else confluence.signals.neutral++;
        });
        
        // Calculate average confidence
        confluence.averageConfidence = analyses.reduce((sum, a) => sum + a.tradingSignal.confidence, 0) / analyses.length;
        
        // Determine strongest signal
        const totalSignals = analyses.length;
        const upRatio = confluence.signals.up / totalSignals;
        const downRatio = confluence.signals.down / totalSignals;
        
        if (upRatio >= 0.6) {
            confluence.strongestSignal = 'UP';
            confluence.score = upRatio * confluence.averageConfidence;
        } else if (downRatio >= 0.6) {
            confluence.strongestSignal = 'DOWN';
            confluence.score = downRatio * confluence.averageConfidence;
        } else {
            confluence.strongestSignal = 'NEUTRAL';
            confluence.score = 50;
        }
        
        confluence.aligned = confluence.score > 70;
        
        return confluence;
    }

    /**
     * Generate final trading recommendation
     */
    generateFinalRecommendation(multiAnalysis) {
        const recommendation = {
            direction: 'NEUTRAL',
            action: 'WAIT',
            confidence: 50,
            reasoning: [],
            riskLevel: 'HIGH'
        };
        
        const confluence = multiAnalysis.confluenceAnalysis;
        
        if (confluence.aligned && confluence.score > 80) {
            recommendation.direction = confluence.strongestSignal;
            recommendation.action = `STRONG ${confluence.strongestSignal}`;
            recommendation.confidence = confluence.score;
            recommendation.riskLevel = 'LOW';
            recommendation.reasoning.push(`Strong confluence across ${multiAnalysis.screenshots} timeframes`);
            recommendation.reasoning.push(`High confidence signals (${confluence.averageConfidence.toFixed(1)}% average)`);
        } else if (confluence.score > 65) {
            recommendation.direction = confluence.strongestSignal;
            recommendation.action = `MODERATE ${confluence.strongestSignal}`;
            recommendation.confidence = confluence.score;
            recommendation.riskLevel = 'MEDIUM';
            recommendation.reasoning.push(`Moderate confluence detected`);
            recommendation.reasoning.push(`Consider smaller position size`);
        } else {
            recommendation.action = 'WAIT';
            recommendation.riskLevel = 'HIGH';
            recommendation.reasoning.push('Mixed signals across timeframes');
            recommendation.reasoning.push('Wait for clearer directional bias');
        }
        
        return recommendation;
    }

    /**
     * Get analysis history
     */
    getAnalysisHistory() {
        return this.analysisHistory;
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('🧹 Cleaning up Comprehensive Analysis Service...');
        
        if (this.ocrAnalyzer) {
            await this.ocrAnalyzer.cleanup();
        }
        
        this.isInitialized = false;
        console.log('✅ Comprehensive Analysis Service cleaned up');
    }
}

module.exports = ComprehensiveAnalysisService;
