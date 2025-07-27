/**
 * Process Real Trading Screenshots - Step by Step Analysis
 */

const fs = require('fs').promises;
const path = require('path');
const ComprehensiveAnalysisService = require('./src/services/ComprehensiveAnalysisService');

async function processRealScreenshots() {
    console.log('🚀 Real Trading Screenshot Analysis System');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const directories = {
        '1m': 'C:\\Users\\thaku\\Pictures\\trading ss\\1m',
        '3m': 'C:\\Users\\thaku\\Pictures\\trading ss\\3m',
        '5m': 'C:\\Users\\thaku\\Pictures\\trading ss\\5m'
    };
    
    const results = {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        signals: [],
        detectedPairs: new Set()
    };
    
    let analysisService = null;
    
    try {
        // Initialize analysis service
        console.log('🔧 Initializing analysis service...');
        analysisService = new ComprehensiveAnalysisService();
        await analysisService.initialize();
        console.log('✅ Analysis service ready\n');
        
        // Process each timeframe
        for (const [timeframe, directory] of Object.entries(directories)) {
            console.log(`📊 Processing ${timeframe} timeframe screenshots...`);
            console.log(`📁 Directory: ${directory}\n`);
            
            try {
                const files = await fs.readdir(directory);
                const imageFiles = files.filter(file => 
                    /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(file)
                );
                
                for (const filename of imageFiles) {
                    const fullPath = path.join(directory, filename);
                    console.log(`📸 Analyzing: ${filename} (${timeframe})`);
                    
                    try {
                        const startTime = Date.now();
                        
                        // Perform analysis with timeout
                        const analysisPromise = analysisService.analyzeScreenshot(fullPath, null);
                        const timeoutPromise = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Analysis timeout after 90 seconds')), 90000);
                        });
                        
                        const analysis = await Promise.race([analysisPromise, timeoutPromise]);
                        const processingTime = Date.now() - startTime;
                        
                        // Extract results
                        const detectedPair = extractTradingPair(analysis);
                        const signal = {
                            filename,
                            timeframe,
                            detectedPair,
                            direction: analysis.tradingSignal?.direction || 'NEUTRAL',
                            confidence: analysis.tradingSignal?.confidence || 50,
                            strength: analysis.tradingSignal?.strength || 'WEAK',
                            processingTime,
                            pricesExtracted: analysis.phases?.multiEngineOCR?.pricesExtracted || 0,
                            indicatorsFound: analysis.phases?.multiEngineOCR?.indicatorsFound || 0,
                            ocrConfidence: analysis.quality?.ocrConfidence || 0,
                            overallReliability: analysis.quality?.overallReliability || 0,
                            success: true
                        };
                        
                        results.signals.push(signal);
                        results.successful++;
                        
                        if (detectedPair) {
                            results.detectedPairs.add(detectedPair);
                        }
                        
                        console.log(`   ✅ SUCCESS: ${signal.direction} (${signal.confidence.toFixed(1)}%)`);
                        console.log(`   💱 Detected: ${detectedPair || 'Unknown pair'}`);
                        console.log(`   📊 Data: ${signal.pricesExtracted} prices, ${signal.indicatorsFound} indicators`);
                        console.log(`   ⏱️ Time: ${(processingTime/1000).toFixed(1)}s\n`);
                        
                    } catch (error) {
                        console.log(`   ❌ FAILED: ${error.message}\n`);
                        
                        results.signals.push({
                            filename,
                            timeframe,
                            error: error.message,
                            success: false
                        });
                        results.failed++;
                    }
                    
                    results.totalProcessed++;
                }
                
            } catch (error) {
                console.log(`❌ Error reading ${timeframe} directory: ${error.message}\n`);
            }
        }
        
        // Generate multi-timeframe analysis for matching pairs
        console.log('\n🔄 Multi-Timeframe Confluence Analysis');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const groupedByPair = groupSignalsByPair(results.signals);
        
        for (const [pair, timeframes] of Object.entries(groupedByPair)) {
            const has1m = timeframes['1m'].length > 0;
            const has3m = timeframes['3m'].length > 0;
            const has5m = timeframes['5m'].length > 0;
            
            if (has1m && has3m && has5m) {
                console.log(`\n💱 ${pair} - Complete timeframe set found`);
                
                try {
                    const screenshotPaths = [
                        path.join(directories['1m'], timeframes['1m'][0].filename),
                        path.join(directories['3m'], timeframes['3m'][0].filename),
                        path.join(directories['5m'], timeframes['5m'][0].filename)
                    ];
                    
                    console.log(`   📸 Screenshots: ${screenshotPaths.map(p => path.basename(p)).join(', ')}`);
                    
                    const confluenceResult = await analysisService.analyzeMultipleScreenshots(
                        screenshotPaths,
                        pair
                    );
                    
                    if (confluenceResult.error) {
                        console.log(`   ❌ Confluence failed: ${confluenceResult.error}`);
                    } else {
                        console.log(`   ✅ CONFLUENCE ANALYSIS COMPLETE:`);
                        console.log(`      🎯 Final Signal: ${confluenceResult.finalRecommendation?.direction || 'NEUTRAL'}`);
                        console.log(`      📊 Confidence: ${confluenceResult.finalRecommendation?.confidence || 0}%`);
                        console.log(`      🔄 Confluence Score: ${confluenceResult.confluenceAnalysis?.score?.toFixed(1) || 0}%`);
                        console.log(`      💡 Action: ${confluenceResult.finalRecommendation?.action || 'WAIT'}`);
                        console.log(`      ⚠️ Risk: ${confluenceResult.finalRecommendation?.riskLevel || 'HIGH'}`);
                        
                        if (confluenceResult.finalRecommendation?.reasoning) {
                            console.log(`      💭 Reasoning:`);
                            confluenceResult.finalRecommendation.reasoning.forEach(reason => {
                                console.log(`         • ${reason}`);
                            });
                        }
                    }
                    
                } catch (error) {
                    console.log(`   ❌ Confluence error: ${error.message}`);
                }
            } else {
                console.log(`\n⚠️ ${pair} - Incomplete set: 1m(${has1m ? '✓' : '✗'}) 3m(${has3m ? '✓' : '✗'}) 5m(${has5m ? '✓' : '✗'})`);
            }
        }
        
        // Final summary
        console.log('\n\n📊 FINAL ANALYSIS SUMMARY');
        console.log('═'.repeat(60));
        console.log(`Total Screenshots Processed: ${results.totalProcessed}`);
        console.log(`Successful Analyses: ${results.successful}`);
        console.log(`Failed Analyses: ${results.failed}`);
        console.log(`Success Rate: ${((results.successful / results.totalProcessed) * 100).toFixed(1)}%`);
        console.log(`\nDetected Trading Pairs: ${Array.from(results.detectedPairs).join(', ')}`);
        
        console.log('\n🎯 INDIVIDUAL TRADING SIGNALS:');
        results.signals.filter(s => s.success).forEach(signal => {
            console.log(`   ${signal.filename} (${signal.timeframe}): ${signal.direction} ${signal.confidence.toFixed(1)}% - ${signal.detectedPair || 'Unknown'}`);
        });
        
    } catch (error) {
        console.error('\n❌ CRITICAL ERROR:', error.message);
        console.error(error.stack);
    } finally {
        if (analysisService) {
            await analysisService.cleanup();
        }
    }
}

function extractTradingPair(analysis) {
    if (analysis.phases?.multiEngineOCR?.tradingPairsFound?.length > 0) {
        return analysis.phases.multiEngineOCR.tradingPairsFound[0].pair;
    }
    return null;
}

function groupSignalsByPair(signals) {
    const grouped = {};
    
    signals.filter(s => s.success && s.detectedPair).forEach(signal => {
        const pair = signal.detectedPair;
        if (!grouped[pair]) {
            grouped[pair] = { '1m': [], '3m': [], '5m': [] };
        }
        grouped[pair][signal.timeframe].push(signal);
    });
    
    return grouped;
}

// Run the analysis
processRealScreenshots();
