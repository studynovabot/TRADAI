/**
 * Real Trading Screenshot Analysis System
 * 
 * Processes actual trading chart screenshots from specified directories
 * and generates authentic multi-timeframe trading signals for real money trading.
 */

const fs = require('fs').promises;
const path = require('path');
const ComprehensiveAnalysisService = require('./src/services/ComprehensiveAnalysisService');

class RealScreenshotAnalyzer {
    constructor() {
        this.analysisService = null;
        this.results = {
            totalScreenshots: 0,
            processedScreenshots: 0,
            failedScreenshots: 0,
            tradingSignals: [],
            multiTimeframeSignals: [],
            detectedPairs: new Set(),
            processingErrors: [],
            startTime: Date.now()
        };
        
        // Screenshot directories
        this.directories = {
            '1m': 'C:\\Users\\thaku\\Pictures\\trading ss\\1m',
            '3m': 'C:\\Users\\thaku\\Pictures\\trading ss\\3m',
            '5m': 'C:\\Users\\thaku\\Pictures\\trading ss\\5m'
        };
    }

    /**
     * Initialize the analysis service
     */
    async initialize() {
        console.log('🚀 Initializing Real Trading Screenshot Analysis System');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        try {
            this.analysisService = new ComprehensiveAnalysisService();
            await this.analysisService.initialize();
            console.log('✅ Analysis service initialized and ready for real money trading\n');
        } catch (error) {
            console.error('❌ Failed to initialize analysis service:', error.message);
            throw error;
        }
    }

    /**
     * Scan directories and collect all screenshot files
     */
    async scanDirectories() {
        console.log('📂 Scanning screenshot directories...');
        const screenshots = { '1m': [], '3m': [], '5m': [] };
        
        for (const [timeframe, directory] of Object.entries(this.directories)) {
            try {
                console.log(`   📁 Scanning ${timeframe} directory: ${directory}`);
                
                // Check if directory exists
                await fs.access(directory);
                
                const files = await fs.readdir(directory);
                const imageFiles = files.filter(file => 
                    /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(file)
                );
                
                screenshots[timeframe] = imageFiles.map(file => ({
                    filename: file,
                    fullPath: path.join(directory, file),
                    timeframe: timeframe
                }));
                
                console.log(`   ✅ Found ${imageFiles.length} screenshots in ${timeframe} directory`);
                this.results.totalScreenshots += imageFiles.length;
                
            } catch (error) {
                console.error(`   ❌ Error accessing ${timeframe} directory: ${error.message}`);
                this.results.processingErrors.push({
                    type: 'directory_access',
                    timeframe: timeframe,
                    directory: directory,
                    error: error.message
                });
            }
        }
        
        console.log(`\n📊 Total screenshots found: ${this.results.totalScreenshots}`);
        return screenshots;
    }

    /**
     * Process individual screenshot
     */
    async processScreenshot(screenshot) {
        const startTime = Date.now();
        console.log(`\n📸 Processing: ${screenshot.filename} (${screenshot.timeframe})`);
        
        try {
            // Perform comprehensive analysis
            const analysis = await this.analysisService.analyzeScreenshot(
                screenshot.fullPath,
                null // Auto-detect trading pair
            );
            
            const processingTime = Date.now() - startTime;
            
            // Extract key information
            const result = {
                filename: screenshot.filename,
                timeframe: screenshot.timeframe,
                fullPath: screenshot.fullPath,
                processingTime: processingTime,
                
                // Auto-detected information
                detectedPair: this.extractDetectedPair(analysis),
                
                // Trading signal
                signal: {
                    direction: analysis.tradingSignal?.direction || 'NEUTRAL',
                    confidence: analysis.tradingSignal?.confidence || 50,
                    strength: analysis.tradingSignal?.strength || 'WEAK',
                    reasoning: analysis.tradingSignal?.reasoning || []
                },
                
                // Technical analysis
                technicalAnalysis: {
                    pricesExtracted: analysis.phases?.multiEngineOCR?.pricesExtracted || 0,
                    indicatorsFound: analysis.phases?.multiEngineOCR?.indicatorsFound || 0,
                    ocrConfidence: analysis.quality?.ocrConfidence || 0,
                    visionConfidence: analysis.quality?.visionConfidence || 0,
                    overallReliability: analysis.quality?.overallReliability || 0
                },
                
                // Risk management
                riskManagement: analysis.riskManagement || {},
                
                // Full analysis for detailed review
                fullAnalysis: analysis,
                
                success: !analysis.error,
                error: analysis.error || null
            };
            
            // Log results
            if (result.success) {
                console.log(`   ✅ SUCCESS: ${result.signal.direction} signal (${result.signal.confidence.toFixed(1)}%)`);
                console.log(`   💱 Detected pair: ${result.detectedPair || 'Unknown'}`);
                console.log(`   📊 Prices: ${result.technicalAnalysis.pricesExtracted}, Indicators: ${result.technicalAnalysis.indicatorsFound}`);
                console.log(`   ⏱️ Processing time: ${processingTime}ms`);
                
                if (result.detectedPair) {
                    this.results.detectedPairs.add(result.detectedPair);
                }
                
                this.results.processedScreenshots++;
            } else {
                console.log(`   ❌ FAILED: ${result.error}`);
                this.results.failedScreenshots++;
            }
            
            this.results.tradingSignals.push(result);
            return result;
            
        } catch (error) {
            const processingTime = Date.now() - startTime;
            console.log(`   ❌ PROCESSING ERROR: ${error.message}`);
            
            const errorResult = {
                filename: screenshot.filename,
                timeframe: screenshot.timeframe,
                fullPath: screenshot.fullPath,
                processingTime: processingTime,
                success: false,
                error: error.message,
                signal: { direction: 'ERROR', confidence: 0, strength: 'NONE' }
            };
            
            this.results.failedScreenshots++;
            this.results.tradingSignals.push(errorResult);
            this.results.processingErrors.push({
                type: 'screenshot_processing',
                screenshot: screenshot.filename,
                error: error.message
            });
            
            return errorResult;
        }
    }

    /**
     * Extract detected trading pair from analysis
     */
    extractDetectedPair(analysis) {
        // Check multiple sources for trading pair
        if (analysis.phases?.multiEngineOCR?.tradingPairsFound?.length > 0) {
            return analysis.phases.multiEngineOCR.tradingPairsFound[0].pair;
        }
        
        if (analysis.tradingPair && analysis.tradingPair !== 'AUTO_DETECT') {
            return analysis.tradingPair;
        }
        
        return null;
    }

    /**
     * Group screenshots by trading pair for multi-timeframe analysis
     */
    groupScreenshotsByPair() {
        console.log('\n🔄 Grouping screenshots by trading pair for confluence analysis...');
        
        const groupedByPair = {};
        
        // Group successful analyses by detected trading pair
        this.results.tradingSignals
            .filter(signal => signal.success && signal.detectedPair)
            .forEach(signal => {
                const pair = signal.detectedPair;
                if (!groupedByPair[pair]) {
                    groupedByPair[pair] = { '1m': [], '3m': [], '5m': [] };
                }
                groupedByPair[pair][signal.timeframe].push(signal);
            });
        
        // Log grouping results
        for (const [pair, timeframes] of Object.entries(groupedByPair)) {
            const counts = {
                '1m': timeframes['1m'].length,
                '3m': timeframes['3m'].length,
                '5m': timeframes['5m'].length
            };
            console.log(`   💱 ${pair}: 1m(${counts['1m']}) 3m(${counts['3m']}) 5m(${counts['5m']})`);
        }
        
        return groupedByPair;
    }

    /**
     * Perform multi-timeframe confluence analysis
     */
    async performMultiTimeframeAnalysis(groupedScreenshots) {
        console.log('\n🎯 Performing Multi-Timeframe Confluence Analysis...');
        console.log('═══════════════════════════════════════════════════════════════');
        
        for (const [pair, timeframes] of Object.entries(groupedScreenshots)) {
            // Check if we have screenshots for all three timeframes
            const hasAllTimeframes = timeframes['1m'].length > 0 && 
                                   timeframes['3m'].length > 0 && 
                                   timeframes['5m'].length > 0;
            
            if (hasAllTimeframes) {
                console.log(`\n💱 Analyzing ${pair} confluence...`);
                
                // Take the first screenshot from each timeframe for confluence analysis
                const screenshotPaths = [
                    timeframes['1m'][0].fullPath,
                    timeframes['3m'][0].fullPath,
                    timeframes['5m'][0].fullPath
                ];
                
                try {
                    const confluenceResult = await this.analysisService.analyzeMultipleScreenshots(
                        screenshotPaths,
                        pair
                    );
                    
                    const confluenceSignal = {
                        tradingPair: pair,
                        screenshots: screenshotPaths.map(p => path.basename(p)),
                        finalRecommendation: confluenceResult.finalRecommendation,
                        confluenceAnalysis: confluenceResult.confluenceAnalysis,
                        individualAnalyses: confluenceResult.individualAnalyses,
                        processingTime: confluenceResult.processingTime,
                        autoDetectedPair: confluenceResult.autoDetectedPair,
                        success: !confluenceResult.error,
                        error: confluenceResult.error
                    };
                    
                    this.results.multiTimeframeSignals.push(confluenceSignal);
                    
                    if (confluenceSignal.success) {
                        console.log(`   ✅ Confluence Analysis Complete`);
                        console.log(`   🎯 Final Signal: ${confluenceResult.finalRecommendation?.direction || 'NEUTRAL'}`);
                        console.log(`   📊 Confidence: ${confluenceResult.finalRecommendation?.confidence || 0}%`);
                        console.log(`   🔄 Confluence Score: ${confluenceResult.confluenceAnalysis?.score?.toFixed(1) || 0}%`);
                        console.log(`   💡 Action: ${confluenceResult.finalRecommendation?.action || 'WAIT'}`);
                    } else {
                        console.log(`   ❌ Confluence Analysis Failed: ${confluenceSignal.error}`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ Confluence Analysis Error: ${error.message}`);
                    this.results.processingErrors.push({
                        type: 'confluence_analysis',
                        pair: pair,
                        error: error.message
                    });
                }
            } else {
                console.log(`\n⚠️ ${pair}: Incomplete timeframe set - skipping confluence analysis`);
                console.log(`   Available: 1m(${timeframes['1m'].length}) 3m(${timeframes['3m'].length}) 5m(${timeframes['5m'].length})`);
            }
        }
    }

    /**
     * Generate comprehensive analysis report
     */
    generateReport() {
        const totalTime = Date.now() - this.results.startTime;
        
        console.log('\n\n📊 COMPREHENSIVE TRADING ANALYSIS REPORT');
        console.log('═'.repeat(80));
        
        // Processing Statistics
        console.log('\n📈 PROCESSING STATISTICS:');
        console.log(`   Total Screenshots: ${this.results.totalScreenshots}`);
        console.log(`   Successfully Processed: ${this.results.processedScreenshots}`);
        console.log(`   Failed: ${this.results.failedScreenshots}`);
        console.log(`   Success Rate: ${((this.results.processedScreenshots / this.results.totalScreenshots) * 100).toFixed(1)}%`);
        console.log(`   Total Processing Time: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`   Average Time per Screenshot: ${(totalTime / this.results.totalScreenshots / 1000).toFixed(1)}s`);
        
        // Detected Trading Pairs
        console.log('\n💱 DETECTED TRADING PAIRS:');
        if (this.results.detectedPairs.size > 0) {
            Array.from(this.results.detectedPairs).forEach(pair => {
                const pairSignals = this.results.tradingSignals.filter(s => s.detectedPair === pair && s.success);
                console.log(`   ${pair}: ${pairSignals.length} screenshots`);
            });
        } else {
            console.log('   No trading pairs detected');
        }
        
        // Individual Trading Signals
        console.log('\n🎯 INDIVIDUAL TRADING SIGNALS:');
        const successfulSignals = this.results.tradingSignals.filter(s => s.success);
        
        if (successfulSignals.length > 0) {
            successfulSignals.forEach(signal => {
                console.log(`\n   📸 ${signal.filename} (${signal.timeframe})`);
                console.log(`      💱 Pair: ${signal.detectedPair || 'Unknown'}`);
                console.log(`      🎯 Signal: ${signal.signal.direction} (${signal.signal.confidence.toFixed(1)}%)`);
                console.log(`      💪 Strength: ${signal.signal.strength}`);
                console.log(`      📊 Reliability: ${signal.technicalAnalysis.overallReliability.toFixed(1)}%`);
                console.log(`      💰 Prices: ${signal.technicalAnalysis.pricesExtracted}, Indicators: ${signal.technicalAnalysis.indicatorsFound}`);
            });
        } else {
            console.log('   No successful trading signals generated');
        }
        
        // Multi-Timeframe Confluence Signals
        console.log('\n🔄 MULTI-TIMEFRAME CONFLUENCE SIGNALS:');
        if (this.results.multiTimeframeSignals.length > 0) {
            this.results.multiTimeframeSignals.forEach(confluence => {
                if (confluence.success) {
                    console.log(`\n   💱 ${confluence.tradingPair} CONFLUENCE ANALYSIS:`);
                    console.log(`      🎯 Final Signal: ${confluence.finalRecommendation?.direction || 'NEUTRAL'}`);
                    console.log(`      📊 Confidence: ${confluence.finalRecommendation?.confidence || 0}%`);
                    console.log(`      🔄 Confluence Score: ${confluence.confluenceAnalysis?.score?.toFixed(1) || 0}%`);
                    console.log(`      💡 Recommendation: ${confluence.finalRecommendation?.action || 'WAIT'}`);
                    console.log(`      ⚠️ Risk Level: ${confluence.finalRecommendation?.riskLevel || 'HIGH'}`);
                    console.log(`      📸 Screenshots: ${confluence.screenshots.join(', ')}`);
                    
                    if (confluence.finalRecommendation?.reasoning) {
                        console.log(`      💭 Reasoning:`);
                        confluence.finalRecommendation.reasoning.forEach(reason => {
                            console.log(`         • ${reason}`);
                        });
                    }
                }
            });
        } else {
            console.log('   No multi-timeframe confluence signals generated');
        }
        
        // Processing Errors
        if (this.results.processingErrors.length > 0) {
            console.log('\n❌ PROCESSING ERRORS:');
            this.results.processingErrors.forEach(error => {
                console.log(`   ${error.type}: ${error.error}`);
            });
        }
        
        console.log('\n═'.repeat(80));
        console.log('📊 ANALYSIS COMPLETE - Ready for Trading Decisions');
        console.log('═'.repeat(80));
    }

    /**
     * Main analysis execution
     */
    async run() {
        try {
            await this.initialize();
            
            // Scan directories for screenshots
            const screenshots = await this.scanDirectories();
            
            if (this.results.totalScreenshots === 0) {
                console.log('❌ No screenshots found in specified directories');
                return;
            }
            
            // Process all screenshots individually
            console.log('\n🔄 Processing Individual Screenshots...');
            console.log('═'.repeat(60));
            
            for (const timeframe of ['1m', '3m', '5m']) {
                if (screenshots[timeframe].length > 0) {
                    console.log(`\n📊 Processing ${timeframe} timeframe screenshots...`);
                    
                    for (const screenshot of screenshots[timeframe]) {
                        await this.processScreenshot(screenshot);
                    }
                }
            }
            
            // Group by trading pair and perform confluence analysis
            const groupedScreenshots = this.groupScreenshotsByPair();
            await this.performMultiTimeframeAnalysis(groupedScreenshots);
            
            // Generate final report
            this.generateReport();
            
        } catch (error) {
            console.error('\n❌ CRITICAL ERROR:', error.message);
            console.error(error.stack);
        } finally {
            // Cleanup
            if (this.analysisService) {
                await this.analysisService.cleanup();
            }
        }
    }
}

// Execute the analysis
async function main() {
    const analyzer = new RealScreenshotAnalyzer();
    await analyzer.run();
}

// Run the analysis
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
