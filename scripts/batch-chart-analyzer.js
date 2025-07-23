/**
 * Batch Chart Analyzer for Professional Trading Screenshot Analysis
 * Processes all screenshots in specified directory with institutional precision
 */

const fs = require('fs').promises;
const path = require('path');
const ProfessionalChartAnalyzer = require('../src/core/ProfessionalChartAnalyzer');

class BatchChartAnalyzer {
    constructor() {
        this.analyzer = new ProfessionalChartAnalyzer();
        this.supportedFormats = ['.png', '.jpg', '.jpeg', '.webp'];
        this.processedFiles = [];
        this.failedFiles = [];
        this.extractedData = [];
        this.analysisResults = [];
    }

    /**
     * Main execution method for batch processing
     */
    async executeBatchAnalysis(directoryPath) {
        console.log('🚀 PROFESSIONAL CHART ANALYZER - BATCH PROCESSING');
        console.log('=' .repeat(70));
        console.log(`📁 Target Directory: ${directoryPath}`);
        console.log(`⏰ Started: ${new Date().toISOString()}`);

        try {
            // Step 1: Validate system dependencies
            await this.validateDependencies();
            
            // Step 2: Scan directory for screenshots
            const screenshots = await this.scanDirectory(directoryPath);
            
            // Step 3: Process each screenshot with full data extraction
            await this.processAllScreenshots(screenshots);
            
            // Step 4: Generate comprehensive analysis reports
            await this.generateComprehensiveReports();
            
            // Step 5: Create consolidated multi-timeframe analysis
            await this.createConsolidatedAnalysis();
            
            console.log('\n🎉 BATCH ANALYSIS COMPLETED SUCCESSFULLY');
            return this.generateFinalSummary();
            
        } catch (error) {
            console.error('\n❌ BATCH ANALYSIS FAILED:', error.message);
            await this.generateErrorReport(error);
            throw error;
        }
    }

    /**
     * Validate all system dependencies before processing
     */
    async validateDependencies() {
        console.log('\n🔧 VALIDATING SYSTEM DEPENDENCIES...');
        
        const requiredDependencies = [
            { name: 'sharp', module: 'sharp' },
            { name: 'jimp', module: 'jimp' },
            { name: 'tesseract.js', module: 'tesseract.js' },
            { name: 'axios', module: 'axios' },
            { name: 'dotenv', module: 'dotenv' }
        ];

        const validationResults = [];

        for (const dep of requiredDependencies) {
            try {
                require(dep.module);
                console.log(`   ✅ ${dep.name} - WORKING`);
                validationResults.push({ dependency: dep.name, status: 'working' });
            } catch (error) {
                console.log(`   ❌ ${dep.name} - FAILED: ${error.message}`);
                validationResults.push({ dependency: dep.name, status: 'failed', error: error.message });
                throw new Error(`Critical dependency ${dep.name} is not working: ${error.message}`);
            }
        }

        // Test specific functionality
        console.log('\n🧪 TESTING CORE FUNCTIONALITY...');
        
        // Test Sharp image processing
        try {
            const sharp = require('sharp');
            const testBuffer = await sharp({
                create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 255, b: 255 } }
            }).png().toBuffer();
            console.log('   ✅ Sharp image processing - OPERATIONAL');
        } catch (error) {
            throw new Error(`Sharp image processing failed: ${error.message}`);
        }

        // Test Tesseract OCR
        try {
            const { createWorker } = require('tesseract.js');
            const worker = await createWorker('eng');
            await worker.terminate();
            console.log('   ✅ Tesseract OCR - OPERATIONAL');
        } catch (error) {
            throw new Error(`Tesseract OCR failed: ${error.message}`);
        }

        // Test API credentials
        require('dotenv').config();
        const groqKey = process.env.GROQ_API_KEY;
        const togetherKey = process.env.TOGETHER_API_KEY;
        
        if (!groqKey && !togetherKey) {
            console.log('   ⚠️ No AI API keys found - will use fallback analysis');
        } else {
            console.log(`   ✅ AI API credentials - ${groqKey ? 'Groq' : ''}${groqKey && togetherKey ? ' & ' : ''}${togetherKey ? 'Together' : ''} AVAILABLE`);
        }

        console.log('   ✅ ALL DEPENDENCIES VALIDATED');
    }

    /**
     * Scan directory for trading chart screenshots
     */
    async scanDirectory(directoryPath) {
        console.log('\n📁 SCANNING DIRECTORY FOR SCREENSHOTS...');
        
        try {
            // Check if directory exists
            await fs.access(directoryPath);
            console.log(`   ✅ Directory accessible: ${directoryPath}`);
            
            // Read all files in directory
            const files = await fs.readdir(directoryPath);
            console.log(`   📄 Found ${files.length} files in directory`);
            
            // Filter for supported image formats
            const screenshots = files
                .filter(file => this.supportedFormats.includes(path.extname(file).toLowerCase()))
                .map(file => ({
                    filename: file,
                    fullPath: path.join(directoryPath, file),
                    extension: path.extname(file).toLowerCase(),
                    detected: false
                }));
            
            console.log(`   📊 Detected ${screenshots.length} screenshot files:`);
            screenshots.forEach((screenshot, index) => {
                console.log(`      ${index + 1}. ${screenshot.filename} (${screenshot.extension})`);
            });
            
            if (screenshots.length === 0) {
                throw new Error('No supported screenshot files found in directory');
            }
            
            return screenshots;
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Directory not found: ${directoryPath}`);
            }
            throw new Error(`Directory scan failed: ${error.message}`);
        }
    }

    /**
     * Process all screenshots with comprehensive data extraction
     */
    async processAllScreenshots(screenshots) {
        console.log('\n📊 PROCESSING ALL SCREENSHOTS WITH FULL DATA EXTRACTION...');
        
        for (let i = 0; i < screenshots.length; i++) {
            const screenshot = screenshots[i];
            console.log(`\n📈 Processing ${i + 1}/${screenshots.length}: ${screenshot.filename}`);
            
            try {
                // Process individual screenshot
                const result = await this.processIndividualScreenshot(screenshot);
                
                if (result.success) {
                    this.processedFiles.push(screenshot.filename);
                    this.extractedData.push(result.extractedData);
                    this.analysisResults.push(result.analysis);
                    console.log(`   ✅ Successfully processed: ${screenshot.filename}`);
                } else {
                    this.failedFiles.push({ filename: screenshot.filename, error: result.error });
                    console.log(`   ❌ Failed to process: ${screenshot.filename} - ${result.error}`);
                }
                
            } catch (error) {
                this.failedFiles.push({ filename: screenshot.filename, error: error.message });
                console.log(`   ❌ Processing error: ${screenshot.filename} - ${error.message}`);
            }
        }
        
        console.log(`\n📊 PROCESSING SUMMARY:`);
        console.log(`   ✅ Successfully processed: ${this.processedFiles.length}`);
        console.log(`   ❌ Failed to process: ${this.failedFiles.length}`);
        
        if (this.processedFiles.length === 0) {
            throw new Error('No screenshots were successfully processed');
        }
    }

    /**
     * Process individual screenshot with comprehensive analysis
     */
    async processIndividualScreenshot(screenshot) {
        try {
            console.log(`   🔍 Extracting data from: ${screenshot.filename}`);
            
            // Step 1: Load and analyze image
            const fs = require('fs');
            const imageBuffer = fs.readFileSync(screenshot.fullPath);
            const imageAnalysis = await this.analyzer.imageProcessor.processChartScreenshot(imageBuffer);
            
            if (!imageAnalysis.success) {
                return { success: false, error: `Image processing failed: ${imageAnalysis.error}` };
            }
            
            console.log(`   📊 Image processed: ${imageAnalysis.metadata.width}x${imageAnalysis.metadata.height}`);
            console.log(`   💱 Currency pair detected: ${imageAnalysis.chartData.currencyPair}`);
            console.log(`   ⏱️ Timeframe detected: ${imageAnalysis.chartData.timeframe}`);
            console.log(`   💰 Price data extracted: ${imageAnalysis.chartData.priceData.allPrices.length} price levels`);
            
            // Step 2: AI-powered analysis with real APIs
            console.log(`   🧠 Performing AI analysis...`);
            const aiAnalysis = await this.analyzer.aiAnalyzer.analyzeChartWithAI(
                imageAnalysis.metadata,
                imageAnalysis.chartData
            );
            
            // Validate AI analysis quality
            if (!this.validateAIAnalysis(aiAnalysis)) {
                return { success: false, error: 'AI analysis failed validation - no authentic signals generated' };
            }
            
            console.log(`   ✅ AI analysis completed with ${aiAnalysis.metadata?.confidence || 'medium'} confidence`);
            
            // Step 3: Generate technical analysis report
            const technicalReport = this.analyzer.technicalCore.generateAnalysisReport(
                imageAnalysis.chartData,
                aiAnalysis,
                imageAnalysis.chartData.timeframe
            );
            
            // Step 4: Generate next 3 candles signals
            const nextCandleSignals = this.generateNextCandleSignals(aiAnalysis, imageAnalysis.chartData);
            
            return {
                success: true,
                extractedData: {
                    filename: screenshot.filename,
                    imageAnalysis,
                    chartData: imageAnalysis.chartData,
                    metadata: imageAnalysis.metadata
                },
                analysis: {
                    filename: screenshot.filename,
                    technicalReport,
                    aiAnalysis,
                    nextCandleSignals,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate AI analysis to ensure authentic signals
     */
    validateAIAnalysis(aiAnalysis) {
        // Check for required components
        if (!aiAnalysis.signals || !aiAnalysis.indicators || !aiAnalysis.supportResistance) {
            console.log('   ⚠️ AI analysis missing required components');
            return false;
        }
        
        // Check for authentic confidence levels
        const signals = [aiAnalysis.signals.immediate, aiAnalysis.signals.shortTerm, aiAnalysis.signals.mediumTerm];
        const hasAuthenticSignals = signals.some(signal => 
            signal && signal.confidence >= 80 && signal.entry && signal.target
        );
        
        if (!hasAuthenticSignals) {
            console.log('   ⚠️ No authentic signals with required confidence levels');
            return false;
        }
        
        // Check for fallback indicators
        if (aiAnalysis.metadata?.primarySource === 'fallback') {
            console.log('   ⚠️ Analysis using fallback data - not authentic');
            return false;
        }
        
        return true;
    }

    /**
     * Generate signals for next 3 candles
     */
    generateNextCandleSignals(aiAnalysis, chartData) {
        const timeframe = chartData.timeframe;
        const currentPrice = chartData.priceData.currentPrice;
        
        if (!currentPrice || !timeframe) {
            return { error: 'Insufficient data for next candle signals' };
        }
        
        // Calculate time intervals based on timeframe
        const timeIntervals = this.getTimeIntervals(timeframe);
        
        return {
            timeframe: timeframe,
            currentPrice: currentPrice,
            nextCandles: [
                {
                    candle: 1,
                    timeHorizon: `Next ${timeIntervals.single}`,
                    signal: aiAnalysis.signals.immediate,
                    confidence: aiAnalysis.signals.immediate?.confidence || null,
                    expectedMove: this.calculateExpectedMove(currentPrice, aiAnalysis.signals.immediate)
                },
                {
                    candle: 2,
                    timeHorizon: `Next ${timeIntervals.double}`,
                    signal: aiAnalysis.signals.shortTerm,
                    confidence: aiAnalysis.signals.shortTerm?.confidence || null,
                    expectedMove: this.calculateExpectedMove(currentPrice, aiAnalysis.signals.shortTerm)
                },
                {
                    candle: 3,
                    timeHorizon: `Next ${timeIntervals.triple}`,
                    signal: aiAnalysis.signals.mediumTerm,
                    confidence: aiAnalysis.signals.mediumTerm?.confidence || null,
                    expectedMove: this.calculateExpectedMove(currentPrice, aiAnalysis.signals.mediumTerm)
                }
            ]
        };
    }

    /**
     * Get time intervals for different timeframes
     */
    getTimeIntervals(timeframe) {
        const intervals = {
            '1m': { single: '1 minute', double: '2 minutes', triple: '3 minutes' },
            '3m': { single: '3 minutes', double: '6 minutes', triple: '9 minutes' },
            '5m': { single: '5 minutes', double: '10 minutes', triple: '15 minutes' },
            '15m': { single: '15 minutes', double: '30 minutes', triple: '45 minutes' },
            '30m': { single: '30 minutes', double: '1 hour', triple: '1.5 hours' },
            '1h': { single: '1 hour', double: '2 hours', triple: '3 hours' },
            '4h': { single: '4 hours', double: '8 hours', triple: '12 hours' },
            '1d': { single: '1 day', double: '2 days', triple: '3 days' }
        };
        
        return intervals[timeframe] || { single: 'unknown', double: 'unknown', triple: 'unknown' };
    }

    /**
     * Calculate expected price move
     */
    calculateExpectedMove(currentPrice, signal) {
        if (!signal || !signal.target || !currentPrice) {
            return null;
        }
        
        const move = ((signal.target - currentPrice) / currentPrice) * 100;
        return {
            direction: signal.direction,
            percentage: `${move > 0 ? '+' : ''}${move.toFixed(3)}%`,
            targetPrice: signal.target,
            pips: Math.abs(signal.target - currentPrice) * 10000 // For forex pairs
        };
    }

    /**
     * Generate comprehensive analysis reports for all processed screenshots
     */
    async generateComprehensiveReports() {
        console.log('\n📋 GENERATING COMPREHENSIVE ANALYSIS REPORTS...');

        // Create reports directory
        const reportsDir = 'batch-analysis-reports';
        await fs.mkdir(reportsDir, { recursive: true });

        // Generate individual reports
        for (let i = 0; i < this.analysisResults.length; i++) {
            const analysis = this.analysisResults[i];
            const extractedData = this.extractedData[i];

            console.log(`   📄 Generating report ${i + 1}/${this.analysisResults.length}: ${analysis.filename}`);

            // Create comprehensive report
            const report = this.createIndividualReport(analysis, extractedData);

            // Save JSON report
            const jsonFilename = `${reportsDir}/${analysis.filename.replace(/\.[^/.]+$/, '')}-analysis.json`;
            await fs.writeFile(jsonFilename, JSON.stringify(report, null, 2));

            // Save Markdown report
            const mdFilename = `${reportsDir}/${analysis.filename.replace(/\.[^/.]+$/, '')}-analysis.md`;
            const markdownContent = this.formatReportAsMarkdown(report);
            await fs.writeFile(mdFilename, markdownContent);

            console.log(`      ✅ JSON: ${jsonFilename}`);
            console.log(`      ✅ Markdown: ${mdFilename}`);
        }

        console.log(`   ✅ Generated ${this.analysisResults.length * 2} report files`);
    }

    /**
     * Create individual comprehensive report
     */
    createIndividualReport(analysis, extractedData) {
        const chartData = extractedData.chartData;
        const aiAnalysis = analysis.aiAnalysis;
        const technicalReport = analysis.technicalReport;

        return {
            title: `🚀 COMPREHENSIVE TECHNICAL ANALYSIS WITH INDICATORS - ${chartData.currencyPair}`,
            filename: analysis.filename,
            timestamp: analysis.timestamp,

            // Screenshot Analysis
            screenshotAnalysis: {
                title: `📊 SCREENSHOT ANALYSIS (${chartData.timeframe} timeframe) - DETAILED ANALYSIS:`,
                timeframe: chartData.timeframe,
                currencyPair: chartData.currencyPair,

                // Extracted Data Summary
                extractedData: {
                    priceData: chartData.priceData,
                    imageMetadata: extractedData.metadata,
                    ocrResults: {
                        timeframeDetected: chartData.timeframe !== 'Unknown',
                        currencyPairDetected: chartData.currencyPair !== 'Unknown',
                        priceDataExtracted: chartData.priceData.allPrices.length > 0
                    }
                },

                // Technical Indicators Analysis
                indicators: {
                    title: '🔍 INDICATORS ANALYSIS:',
                    ema5: `- **EMA 5 (Yellow):** ${technicalReport.indicators.ema5.description}`,
                    sma20: `- **SMA 20 (Red):** ${technicalReport.indicators.sma20.description}`,
                    stochastic: `- **Stochastic Oscillator:**\n  ${technicalReport.indicators.stochastic.description}`
                },

                // Candlestick Pattern Analysis
                candlestickPatterns: {
                    title: '📈 CANDLESTICK PATTERN ANALYSIS:',
                    primaryPattern: `- **Major Pattern:** ${technicalReport.candlestickPatterns.primaryPattern}`,
                    structure: `- **Current Structure:** ${technicalReport.candlestickPatterns.structure}`,
                    momentum: `- **Momentum:** ${technicalReport.candlestickPatterns.momentum}`,
                    confidence: `- **Pattern Confidence:** ${technicalReport.candlestickPatterns.confidence}%`
                },

                // Support & Resistance
                supportResistance: {
                    title: '🎯 SUPPORT & RESISTANCE:',
                    majorResistance: `- **Major Resistance:** ${technicalReport.supportResistance.majorResistance}`,
                    currentResistance: `- **Current Resistance:** ${technicalReport.supportResistance.currentResistance}`,
                    currentSupport: `- **Current Support:** ${technicalReport.supportResistance.currentSupport}`,
                    strongSupport: `- **Strong Support:** ${technicalReport.supportResistance.strongSupport}`,
                    majorSupport: `- **Major Support:** ${technicalReport.supportResistance.majorSupport}`
                }
            },

            // Next 3 Candles Signals
            nextCandleSignals: {
                title: '🚨 NEXT 3 CANDLES TRADING SIGNALS:',
                timeframe: analysis.nextCandleSignals.timeframe,
                currentPrice: analysis.nextCandleSignals.currentPrice,
                signals: analysis.nextCandleSignals.nextCandles.map(candle => ({
                    title: `#### **CANDLE ${candle.candle} SIGNAL (${candle.timeHorizon}):**`,
                    direction: candle.signal ? `**${candle.signal.direction} - ${candle.confidence}% CONFIDENCE**` : '**NO SIGNAL GENERATED**',
                    entry: candle.signal ? `- **Entry:** ${candle.signal.entry}` : '- **Entry:** N/A',
                    target: candle.signal ? `- **Target:** ${candle.signal.target}` : '- **Target:** N/A',
                    stopLoss: candle.signal ? `- **Stop Loss:** ${candle.signal.stopLoss}` : '- **Stop Loss:** N/A',
                    expectedMove: candle.expectedMove ? `- **Expected Move:** ${candle.expectedMove.percentage} (${candle.expectedMove.pips.toFixed(1)} pips)` : '- **Expected Move:** N/A',
                    riskReward: candle.signal ? `- **Risk/Reward:** ${this.calculateRiskReward(candle.signal)}` : '- **Risk/Reward:** N/A'
                }))
            },

            // AI Analysis Metadata
            aiAnalysisMetadata: {
                primarySource: aiAnalysis.metadata?.primarySource || 'unknown',
                crossValidated: aiAnalysis.metadata?.crossValidated || false,
                overallConfidence: aiAnalysis.metadata?.confidence || 'unknown',
                processingTime: analysis.timestamp
            },

            // Market Structure Assessment
            marketStructure: {
                trend: aiAnalysis.marketStructure?.trend || 'UNKNOWN',
                momentum: aiAnalysis.marketStructure?.momentum || 'UNKNOWN',
                volatility: aiAnalysis.marketStructure?.volatility || 'UNKNOWN'
            },

            // Risk Management
            riskManagement: {
                title: '⚠️ RISK MANAGEMENT:',
                recommendations: this.generateRiskManagementRecommendations(aiAnalysis),
                keyLevels: this.extractKeyLevels(aiAnalysis)
            },

            // Final Verdict
            finalVerdict: this.generateFinalVerdict(aiAnalysis, chartData)
        };
    }

    /**
     * Calculate risk/reward ratio for signal
     */
    calculateRiskReward(signal) {
        if (!signal.entry || !signal.target || !signal.stopLoss) return 'N/A';

        const profit = Math.abs(signal.target - signal.entry);
        const risk = Math.abs(signal.entry - signal.stopLoss);

        if (risk === 0) return 'N/A';

        const ratio = profit / risk;
        return `1:${ratio.toFixed(1)}`;
    }

    /**
     * Generate risk management recommendations
     */
    generateRiskManagementRecommendations(aiAnalysis) {
        const recommendations = [];

        if (aiAnalysis.signals?.shortTerm) {
            const signal = aiAnalysis.signals.shortTerm;
            recommendations.push(`- **Position Size:** Risk 1-2% of account per trade`);
            recommendations.push(`- **Stop Loss:** ${signal.stopLoss || 'Set based on support/resistance'}`);
            recommendations.push(`- **Take Profit:** ${signal.target || 'Set based on next resistance level'}`);

            if (signal.confidence >= 90) {
                recommendations.push(`- **Confidence Level:** HIGH (${signal.confidence}%) - Consider standard position size`);
            } else if (signal.confidence >= 80) {
                recommendations.push(`- **Confidence Level:** MEDIUM (${signal.confidence}%) - Consider reduced position size`);
            } else {
                recommendations.push(`- **Confidence Level:** LOW (${signal.confidence}%) - Avoid or use minimal position size`);
            }
        }

        return recommendations;
    }

    /**
     * Extract key levels from analysis
     */
    extractKeyLevels(aiAnalysis) {
        const levels = {
            support: aiAnalysis.supportResistance?.support || [],
            resistance: aiAnalysis.supportResistance?.resistance || [],
            current: aiAnalysis.supportResistance?.currentLevel || null
        };

        return {
            criticalSupport: levels.support[0] || 'TBD',
            majorResistance: levels.resistance[0] || 'TBD',
            currentLevel: levels.current || 'TBD'
        };
    }

    /**
     * Generate final verdict for individual analysis
     */
    generateFinalVerdict(aiAnalysis, chartData) {
        const signals = aiAnalysis.signals || {};
        const marketStructure = aiAnalysis.marketStructure || {};

        // Determine overall direction
        const directions = [
            signals.immediate?.direction,
            signals.shortTerm?.direction,
            signals.mediumTerm?.direction
        ].filter(d => d && d !== 'NEUTRAL');

        const bullishCount = directions.filter(d => d === 'LONG').length;
        const bearishCount = directions.filter(d => d === 'SHORT').length;

        let verdict = '';
        let movement = '';
        let confidence = 'MEDIUM';

        if (bullishCount > bearishCount) {
            verdict = 'BULLISH MOMENTUM BUILDING';
            movement = 'EXPECT UPWARD MOVEMENT';
            confidence = bullishCount >= 2 ? 'HIGH' : 'MEDIUM';
        } else if (bearishCount > bullishCount) {
            verdict = 'BEARISH PRESSURE INCREASING';
            movement = 'EXPECT DOWNWARD MOVEMENT';
            confidence = bearishCount >= 2 ? 'HIGH' : 'MEDIUM';
        } else {
            verdict = 'CONSOLIDATION PHASE';
            movement = 'EXPECT SIDEWAYS MOVEMENT';
            confidence = 'LOW';
        }

        const targetRange = this.calculateTargetRange(signals);

        return `🔥 FINAL VERDICT: ${verdict} - ${movement} TO ${targetRange} (${confidence} CONFIDENCE)`;
    }

    /**
     * Calculate target range from signals
     */
    calculateTargetRange(signals) {
        const targets = [
            signals.immediate?.target,
            signals.shortTerm?.target,
            signals.mediumTerm?.target
        ].filter(t => t && !isNaN(t));

        if (targets.length === 0) return 'TARGET ANALYSIS PENDING';

        const minTarget = Math.min(...targets);
        const maxTarget = Math.max(...targets);

        return `${minTarget.toFixed(5)}-${maxTarget.toFixed(5)}`;
    }

    /**
     * Create consolidated multi-timeframe analysis
     */
    async createConsolidatedAnalysis() {
        console.log('\n🔄 CREATING CONSOLIDATED MULTI-TIMEFRAME ANALYSIS...');

        if (this.analysisResults.length < 2) {
            console.log('   ℹ️ Insufficient data for multi-timeframe analysis (need 2+ screenshots)');
            return;
        }

        // Group by currency pair
        const currencyGroups = this.groupByCurrencyPair();

        for (const [currencyPair, analyses] of Object.entries(currencyGroups)) {
            if (analyses.length < 2) continue;

            console.log(`   📊 Creating consolidated analysis for ${currencyPair} (${analyses.length} timeframes)`);

            const consolidatedReport = this.createConsolidatedReport(currencyPair, analyses);

            // Save consolidated report
            const reportsDir = 'batch-analysis-reports';
            const jsonFilename = `${reportsDir}/${currencyPair.replace('/', '-')}-consolidated-analysis.json`;
            const mdFilename = `${reportsDir}/${currencyPair.replace('/', '-')}-consolidated-analysis.md`;

            await fs.writeFile(jsonFilename, JSON.stringify(consolidatedReport, null, 2));
            await fs.writeFile(mdFilename, this.formatConsolidatedReportAsMarkdown(consolidatedReport));

            console.log(`      ✅ Consolidated JSON: ${jsonFilename}`);
            console.log(`      ✅ Consolidated Markdown: ${mdFilename}`);
        }
    }

    /**
     * Group analyses by currency pair
     */
    groupByCurrencyPair() {
        const groups = {};

        this.analysisResults.forEach((analysis, index) => {
            const extractedData = this.extractedData[index];
            const currencyPair = extractedData.chartData.currencyPair;

            if (currencyPair && currencyPair !== 'Unknown') {
                if (!groups[currencyPair]) {
                    groups[currencyPair] = [];
                }
                groups[currencyPair].push({ analysis, extractedData });
            }
        });

        return groups;
    }

    /**
     * Create consolidated report for currency pair
     */
    createConsolidatedReport(currencyPair, analyses) {
        // Sort by timeframe
        const sortedAnalyses = analyses.sort((a, b) => {
            const timeframeOrder = { '1m': 1, '3m': 3, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 1440 };
            const aOrder = timeframeOrder[a.extractedData.chartData.timeframe] || 999;
            const bOrder = timeframeOrder[b.extractedData.chartData.timeframe] || 999;
            return aOrder - bOrder;
        });

        return {
            title: `🚀 COMPREHENSIVE MULTI-TIMEFRAME TECHNICAL ANALYSIS - ${currencyPair}`,
            currencyPair: currencyPair,
            timestamp: new Date().toISOString(),
            timeframesAnalyzed: sortedAnalyses.length,

            // Individual timeframe analyses
            timeframeAnalyses: sortedAnalyses.map((item, index) => {
                const analysis = item.analysis;
                const extractedData = item.extractedData;

                return {
                    screenshot: index + 1,
                    timeframe: extractedData.chartData.timeframe,
                    filename: analysis.filename,
                    indicators: analysis.technicalReport.indicators,
                    patterns: analysis.technicalReport.candlestickPatterns,
                    supportResistance: analysis.technicalReport.supportResistance,
                    nextCandleSignals: analysis.nextCandleSignals,
                    marketStructure: analysis.aiAnalysis.marketStructure
                };
            }),

            // Multi-timeframe confluence
            confluence: this.analyzeMultiTimeframeConfluence(sortedAnalyses),

            // Consolidated trading signals
            consolidatedSignals: this.generateConsolidatedSignals(sortedAnalyses),

            // Overall market assessment
            overallAssessment: this.generateOverallAssessment(sortedAnalyses),

            // Final consolidated verdict
            finalVerdict: this.generateConsolidatedVerdict(sortedAnalyses)
        };
    }

    /**
     * Analyze multi-timeframe confluence
     */
    analyzeMultiTimeframeConfluence(analyses) {
        const confluence = {
            title: '🎯 MULTI-TIMEFRAME CONFLUENCE ANALYSIS:',
            timeframes: analyses.map((item, index) => {
                const timeframe = item.extractedData.chartData.timeframe;
                const trend = item.analysis.aiAnalysis.marketStructure?.trend || 'UNKNOWN';
                const momentum = item.analysis.aiAnalysis.marketStructure?.momentum || 'UNKNOWN';

                return `${index + 1}. **${timeframe}:** ${trend} trend with ${momentum} momentum`;
            }),

            // Confluence strength
            confluenceStrength: this.calculateConfluenceStrength(analyses),

            // Signal alignment
            signalAlignment: this.analyzeSignalAlignment(analyses)
        };

        return confluence;
    }

    /**
     * Calculate confluence strength
     */
    calculateConfluenceStrength(analyses) {
        const trends = analyses.map(item => item.analysis.aiAnalysis.marketStructure?.trend).filter(t => t && t !== 'UNKNOWN');

        if (trends.length === 0) return 'INSUFFICIENT DATA';

        const bullishCount = trends.filter(t => t === 'BULLISH').length;
        const bearishCount = trends.filter(t => t === 'BEARISH').length;
        const neutralCount = trends.filter(t => t === 'NEUTRAL').length;

        const maxCount = Math.max(bullishCount, bearishCount, neutralCount);
        const confluencePercentage = (maxCount / trends.length) * 100;

        if (confluencePercentage >= 80) return 'VERY STRONG';
        if (confluencePercentage >= 60) return 'STRONG';
        if (confluencePercentage >= 40) return 'MODERATE';
        return 'WEAK';
    }

    /**
     * Analyze signal alignment across timeframes
     */
    analyzeSignalAlignment(analyses) {
        const signals = analyses.map(item => {
            const signals = item.analysis.aiAnalysis.signals || {};
            return {
                timeframe: item.extractedData.chartData.timeframe,
                immediate: signals.immediate?.direction,
                shortTerm: signals.shortTerm?.direction,
                mediumTerm: signals.mediumTerm?.direction
            };
        });

        return {
            immediateAlignment: this.calculateSignalAlignment(signals.map(s => s.immediate)),
            shortTermAlignment: this.calculateSignalAlignment(signals.map(s => s.shortTerm)),
            mediumTermAlignment: this.calculateSignalAlignment(signals.map(s => s.mediumTerm))
        };
    }

    /**
     * Calculate signal alignment percentage
     */
    calculateSignalAlignment(signals) {
        const validSignals = signals.filter(s => s && s !== 'NEUTRAL');
        if (validSignals.length === 0) return 'NO SIGNALS';

        const longCount = validSignals.filter(s => s === 'LONG').length;
        const shortCount = validSignals.filter(s => s === 'SHORT').length;

        const maxCount = Math.max(longCount, shortCount);
        const alignmentPercentage = (maxCount / validSignals.length) * 100;

        const direction = longCount > shortCount ? 'BULLISH' : shortCount > longCount ? 'BEARISH' : 'MIXED';

        return `${alignmentPercentage.toFixed(0)}% ${direction}`;
    }

    /**
     * Generate consolidated trading signals
     */
    generateConsolidatedSignals(analyses) {
        // Get the highest confidence signals across timeframes
        const allSignals = analyses.flatMap(item => {
            const signals = item.analysis.aiAnalysis.signals || {};
            return [signals.immediate, signals.shortTerm, signals.mediumTerm].filter(s => s && s.confidence >= 80);
        });

        if (allSignals.length === 0) {
            return {
                title: '🚨 CONSOLIDATED TRADING SIGNALS:',
                status: 'NO HIGH-CONFIDENCE SIGNALS AVAILABLE',
                recommendation: 'WAIT FOR CLEARER MARKET DIRECTION'
            };
        }

        // Find highest confidence signal
        const bestSignal = allSignals.reduce((best, current) =>
            current.confidence > best.confidence ? current : best
        );

        return {
            title: '🚨 CONSOLIDATED TRADING SIGNALS:',
            primarySignal: {
                direction: bestSignal.direction,
                confidence: `${bestSignal.confidence}% CONFIDENCE`,
                entry: bestSignal.entry,
                target: bestSignal.target,
                stopLoss: bestSignal.stopLoss,
                timeframe: 'MULTI-TIMEFRAME CONFLUENCE'
            },
            supportingSignals: allSignals.length - 1,
            riskReward: this.calculateRiskReward(bestSignal)
        };
    }

    /**
     * Generate overall market assessment
     */
    generateOverallAssessment(analyses) {
        const trends = analyses.map(item => item.analysis.aiAnalysis.marketStructure?.trend).filter(t => t);
        const momentums = analyses.map(item => item.analysis.aiAnalysis.marketStructure?.momentum).filter(m => m);

        const dominantTrend = this.findDominantValue(trends);
        const dominantMomentum = this.findDominantValue(momentums);

        return {
            dominantTrend: dominantTrend || 'UNCLEAR',
            dominantMomentum: dominantMomentum || 'UNCLEAR',
            timeframesInAgreement: this.calculateAgreementPercentage(trends),
            overallBias: this.determineOverallBias(analyses)
        };
    }

    /**
     * Find dominant value in array
     */
    findDominantValue(values) {
        if (values.length === 0) return null;

        const counts = {};
        values.forEach(value => {
            counts[value] = (counts[value] || 0) + 1;
        });

        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    /**
     * Calculate agreement percentage
     */
    calculateAgreementPercentage(values) {
        if (values.length === 0) return '0%';

        const dominant = this.findDominantValue(values);
        const agreementCount = values.filter(v => v === dominant).length;

        return `${Math.round((agreementCount / values.length) * 100)}%`;
    }

    /**
     * Determine overall bias
     */
    determineOverallBias(analyses) {
        const signals = analyses.flatMap(item => {
            const signals = item.analysis.aiAnalysis.signals || {};
            return [signals.immediate, signals.shortTerm, signals.mediumTerm]
                .filter(s => s && s.confidence >= 80)
                .map(s => s.direction);
        });

        const longCount = signals.filter(s => s === 'LONG').length;
        const shortCount = signals.filter(s => s === 'SHORT').length;

        if (longCount > shortCount) return 'BULLISH';
        if (shortCount > longCount) return 'BEARISH';
        return 'NEUTRAL';
    }

    /**
     * Generate consolidated verdict
     */
    generateConsolidatedVerdict(analyses) {
        const overallAssessment = this.generateOverallAssessment(analyses);
        const confluenceStrength = this.calculateConfluenceStrength(analyses);

        let verdict = '';
        let confidence = '';

        if (confluenceStrength === 'VERY STRONG' || confluenceStrength === 'STRONG') {
            verdict = `${overallAssessment.overallBias} MOMENTUM CONFIRMED ACROSS MULTIPLE TIMEFRAMES`;
            confidence = 'HIGH CONFIDENCE';
        } else if (confluenceStrength === 'MODERATE') {
            verdict = `${overallAssessment.overallBias} BIAS WITH MODERATE CONFLUENCE`;
            confidence = 'MEDIUM CONFIDENCE';
        } else {
            verdict = 'MIXED SIGNALS ACROSS TIMEFRAMES - EXERCISE CAUTION';
            confidence = 'LOW CONFIDENCE';
        }

        return `🔥 CONSOLIDATED VERDICT: ${verdict} (${confidence})`;
    }

    /**
     * Format individual report as markdown
     */
    formatReportAsMarkdown(report) {
        let markdown = `# ${report.title}\n\n`;
        markdown += `**Filename:** ${report.filename}\n`;
        markdown += `**Timestamp:** ${report.timestamp}\n\n`;

        // Screenshot Analysis
        markdown += `## ${report.screenshotAnalysis.title}\n\n`;

        // Extracted Data Summary
        markdown += `### 📊 EXTRACTED DATA SUMMARY:\n`;
        markdown += `- **Currency Pair:** ${report.screenshotAnalysis.currencyPair}\n`;
        markdown += `- **Timeframe:** ${report.screenshotAnalysis.timeframe}\n`;
        markdown += `- **Current Price:** ${report.screenshotAnalysis.extractedData.priceData.currentPrice || 'N/A'}\n`;
        markdown += `- **Price Range:** ${report.screenshotAnalysis.extractedData.priceData.lowPrice} - ${report.screenshotAnalysis.extractedData.priceData.highPrice}\n`;
        markdown += `- **OCR Success:** Timeframe: ${report.screenshotAnalysis.extractedData.ocrResults.timeframeDetected ? '✅' : '❌'}, Currency: ${report.screenshotAnalysis.extractedData.ocrResults.currencyPairDetected ? '✅' : '❌'}, Prices: ${report.screenshotAnalysis.extractedData.ocrResults.priceDataExtracted ? '✅' : '❌'}\n\n`;

        // Indicators
        markdown += `### ${report.screenshotAnalysis.indicators.title}\n`;
        markdown += `${report.screenshotAnalysis.indicators.ema5}\n`;
        markdown += `${report.screenshotAnalysis.indicators.sma20}\n`;
        markdown += `${report.screenshotAnalysis.indicators.stochastic}\n\n`;

        // Patterns
        markdown += `### ${report.screenshotAnalysis.candlestickPatterns.title}\n`;
        markdown += `${report.screenshotAnalysis.candlestickPatterns.primaryPattern}\n`;
        markdown += `${report.screenshotAnalysis.candlestickPatterns.structure}\n`;
        markdown += `${report.screenshotAnalysis.candlestickPatterns.momentum}\n`;
        markdown += `${report.screenshotAnalysis.candlestickPatterns.confidence}\n\n`;

        // Support/Resistance
        markdown += `### ${report.screenshotAnalysis.supportResistance.title}\n`;
        markdown += `${report.screenshotAnalysis.supportResistance.majorResistance}\n`;
        markdown += `${report.screenshotAnalysis.supportResistance.currentResistance}\n`;
        markdown += `${report.screenshotAnalysis.supportResistance.currentSupport}\n`;
        markdown += `${report.screenshotAnalysis.supportResistance.strongSupport}\n`;
        markdown += `${report.screenshotAnalysis.supportResistance.majorSupport}\n\n`;

        // Next 3 Candles Signals
        markdown += `## ${report.nextCandleSignals.title}\n\n`;
        markdown += `**Current Price:** ${report.nextCandleSignals.currentPrice}\n`;
        markdown += `**Timeframe:** ${report.nextCandleSignals.timeframe}\n\n`;

        report.nextCandleSignals.signals.forEach(signal => {
            markdown += `${signal.title}\n`;
            markdown += `${signal.direction}\n`;
            markdown += `${signal.entry}\n`;
            markdown += `${signal.target}\n`;
            markdown += `${signal.stopLoss}\n`;
            markdown += `${signal.expectedMove}\n`;
            markdown += `${signal.riskReward}\n\n`;
        });

        // Risk Management
        markdown += `### ${report.riskManagement.title}\n`;
        report.riskManagement.recommendations.forEach(rec => {
            markdown += `${rec}\n`;
        });
        markdown += `\n`;

        // AI Analysis Metadata
        markdown += `### 🧠 AI ANALYSIS METADATA:\n`;
        markdown += `- **Primary Source:** ${report.aiAnalysisMetadata.primarySource}\n`;
        markdown += `- **Cross-Validated:** ${report.aiAnalysisMetadata.crossValidated ? 'Yes' : 'No'}\n`;
        markdown += `- **Overall Confidence:** ${report.aiAnalysisMetadata.overallConfidence}\n\n`;

        // Final Verdict
        markdown += `**${report.finalVerdict}**\n`;

        return markdown;
    }

    /**
     * Format consolidated report as markdown
     */
    formatConsolidatedReportAsMarkdown(report) {
        let markdown = `# ${report.title}\n\n`;
        markdown += `**Timestamp:** ${report.timestamp}\n`;
        markdown += `**Timeframes Analyzed:** ${report.timeframesAnalyzed}\n\n`;

        // Individual timeframe analyses
        report.timeframeAnalyses.forEach((analysis, index) => {
            markdown += `## 📊 SCREENSHOT ${analysis.screenshot} (${analysis.timeframe} timeframe)\n\n`;
            markdown += `**Filename:** ${analysis.filename}\n\n`;

            // Next candle signals for this timeframe
            if (analysis.nextCandleSignals && analysis.nextCandleSignals.nextCandles) {
                markdown += `### 🚨 NEXT 3 CANDLES SIGNALS:\n`;
                analysis.nextCandleSignals.nextCandles.forEach(candle => {
                    if (candle.signal) {
                        markdown += `- **Candle ${candle.candle} (${candle.timeHorizon}):** ${candle.signal.direction} - ${candle.confidence}% confidence\n`;
                        markdown += `  - Entry: ${candle.signal.entry}, Target: ${candle.signal.target}\n`;
                        if (candle.expectedMove) {
                            markdown += `  - Expected Move: ${candle.expectedMove.percentage}\n`;
                        }
                    }
                });
                markdown += `\n`;
            }

            if (index < report.timeframeAnalyses.length - 1) {
                markdown += `---\n\n`;
            }
        });

        // Multi-timeframe confluence
        markdown += `## ${report.confluence.title}\n\n`;
        markdown += `### 📊 TIMEFRAME ANALYSIS:\n`;
        report.confluence.timeframes.forEach(tf => {
            markdown += `${tf}\n`;
        });
        markdown += `\n`;
        markdown += `**Confluence Strength:** ${report.confluence.confluenceStrength}\n\n`;

        // Signal alignment
        markdown += `### 🎯 SIGNAL ALIGNMENT:\n`;
        markdown += `- **Immediate Signals:** ${report.confluence.signalAlignment.immediateAlignment}\n`;
        markdown += `- **Short-term Signals:** ${report.confluence.signalAlignment.shortTermAlignment}\n`;
        markdown += `- **Medium-term Signals:** ${report.confluence.signalAlignment.mediumTermAlignment}\n\n`;

        // Consolidated signals
        markdown += `## ${report.consolidatedSignals.title}\n\n`;
        if (report.consolidatedSignals.primarySignal) {
            markdown += `### PRIMARY SIGNAL:\n`;
            markdown += `**${report.consolidatedSignals.primarySignal.direction} - ${report.consolidatedSignals.primarySignal.confidence}**\n`;
            markdown += `- **Entry:** ${report.consolidatedSignals.primarySignal.entry}\n`;
            markdown += `- **Target:** ${report.consolidatedSignals.primarySignal.target}\n`;
            markdown += `- **Stop Loss:** ${report.consolidatedSignals.primarySignal.stopLoss}\n`;
            markdown += `- **Risk/Reward:** ${report.consolidatedSignals.riskReward}\n`;
            markdown += `- **Supporting Signals:** ${report.consolidatedSignals.supportingSignals}\n\n`;
        } else {
            markdown += `**${report.consolidatedSignals.status}**\n`;
            markdown += `**Recommendation:** ${report.consolidatedSignals.recommendation}\n\n`;
        }

        // Overall assessment
        markdown += `### 📈 OVERALL MARKET ASSESSMENT:\n`;
        markdown += `- **Dominant Trend:** ${report.overallAssessment.dominantTrend}\n`;
        markdown += `- **Dominant Momentum:** ${report.overallAssessment.dominantMomentum}\n`;
        markdown += `- **Timeframes in Agreement:** ${report.overallAssessment.timeframesInAgreement}\n`;
        markdown += `- **Overall Bias:** ${report.overallAssessment.overallBias}\n\n`;

        // Final verdict
        markdown += `**${report.finalVerdict}**\n`;

        return markdown;
    }

    /**
     * Generate final summary of batch processing
     */
    generateFinalSummary() {
        const summary = {
            timestamp: new Date().toISOString(),
            processing: {
                totalFiles: this.processedFiles.length + this.failedFiles.length,
                successful: this.processedFiles.length,
                failed: this.failedFiles.length,
                successRate: `${Math.round((this.processedFiles.length / (this.processedFiles.length + this.failedFiles.length)) * 100)}%`
            },
            analysis: {
                screenshotsAnalyzed: this.analysisResults.length,
                authenticSignalsGenerated: this.countAuthenticSignals(),
                currencyPairsDetected: this.getUniqueCurrencyPairs(),
                timeframesDetected: this.getUniqueTimeframes()
            },
            reports: {
                individualReports: this.analysisResults.length * 2, // JSON + MD
                consolidatedReports: this.getConsolidatedReportCount()
            },
            errors: this.failedFiles
        };

        return summary;
    }

    /**
     * Count authentic signals generated
     */
    countAuthenticSignals() {
        return this.analysisResults.reduce((count, analysis) => {
            const signals = analysis.aiAnalysis.signals || {};
            const authenticSignals = [signals.immediate, signals.shortTerm, signals.mediumTerm]
                .filter(s => s && s.confidence >= 80);
            return count + authenticSignals.length;
        }, 0);
    }

    /**
     * Get unique currency pairs detected
     */
    getUniqueCurrencyPairs() {
        const pairs = this.extractedData
            .map(data => data.chartData.currencyPair)
            .filter(pair => pair && pair !== 'Unknown');
        return [...new Set(pairs)];
    }

    /**
     * Get unique timeframes detected
     */
    getUniqueTimeframes() {
        const timeframes = this.extractedData
            .map(data => data.chartData.timeframe)
            .filter(tf => tf && tf !== 'Unknown');
        return [...new Set(timeframes)];
    }

    /**
     * Get consolidated report count
     */
    getConsolidatedReportCount() {
        const currencyGroups = this.groupByCurrencyPair();
        return Object.keys(currencyGroups).filter(pair => currencyGroups[pair].length >= 2).length * 2; // JSON + MD
    }

    /**
     * Generate error report
     */
    async generateErrorReport(error) {
        const errorReport = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            processedFiles: this.processedFiles,
            failedFiles: this.failedFiles,
            partialResults: this.analysisResults.length
        };

        try {
            await fs.mkdir('batch-analysis-reports', { recursive: true });
            await fs.writeFile('batch-analysis-reports/error-report.json', JSON.stringify(errorReport, null, 2));
            console.log('📄 Error report saved: batch-analysis-reports/error-report.json');
        } catch (saveError) {
            console.error('Failed to save error report:', saveError.message);
        }
    }
}

// Execution script
async function executeBatchAnalysis() {
    const targetDirectory = "C:\\Users\\thaku\\Pictures\\trading ss";

    console.log('🚀 STARTING PROFESSIONAL CHART ANALYSIS BATCH PROCESSING');
    console.log('=' .repeat(70));

    const analyzer = new BatchChartAnalyzer();

    try {
        const summary = await analyzer.executeBatchAnalysis(targetDirectory);

        console.log('\n📊 FINAL SUMMARY:');
        console.log(`   📁 Total Files: ${summary.processing.totalFiles}`);
        console.log(`   ✅ Successful: ${summary.processing.successful}`);
        console.log(`   ❌ Failed: ${summary.processing.failed}`);
        console.log(`   📈 Success Rate: ${summary.processing.successRate}`);
        console.log(`   🚨 Authentic Signals: ${summary.analysis.authenticSignalsGenerated}`);
        console.log(`   💱 Currency Pairs: ${summary.analysis.currencyPairsDetected.join(', ')}`);
        console.log(`   ⏱️ Timeframes: ${summary.analysis.timeframesDetected.join(', ')}`);
        console.log(`   📄 Reports Generated: ${summary.reports.individualReports + summary.reports.consolidatedReports}`);

        if (summary.errors.length > 0) {
            console.log('\n⚠️ ERRORS:');
            summary.errors.forEach(error => {
                console.log(`   ❌ ${error.filename}: ${error.error}`);
            });
        }

        console.log('\n🎉 BATCH ANALYSIS COMPLETED SUCCESSFULLY!');
        console.log('📁 Check "batch-analysis-reports" directory for all generated reports');

    } catch (error) {
        console.error('\n❌ BATCH ANALYSIS FAILED:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    executeBatchAnalysis();
}

module.exports = BatchChartAnalyzer;
