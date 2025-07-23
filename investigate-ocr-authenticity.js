#!/usr/bin/env node

/**
 * OCR Authenticity Investigation
 * 
 * Investigates whether OCR is actually working or generating mock signals.
 * Tests for suspicious patterns that indicate fake analysis.
 */

const fs = require('fs');
const path = require('path');

async function investigateOCRAuthenticity() {
    console.log('🔍 === OCR AUTHENTICITY INVESTIGATION ===');
    console.log('⏰ Started:', new Date().toISOString());
    console.log('🚨 INVESTIGATING SUSPICIOUS 100% CONFIDENCE SIGNALS');
    console.log('');

    const screenshotDir = 'C:\\Users\\thaku\\Pictures\\Camera Roll';
    
    // Get screenshots
    const files = fs.readdirSync(screenshotDir);
    const screenshots = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg'].includes(ext) && !file.includes('_processed');
    });

    console.log(`📸 Found ${screenshots.length} screenshots`);
    console.log('🧪 Testing for OCR authenticity indicators');
    console.log('');

    const results = [];

    // Test first 3 screenshots with detailed analysis
    for (let i = 0; i < Math.min(3, screenshots.length); i++) {
        const filename = screenshots[i];
        console.log(`🖼️ [${i + 1}/3] Investigating: ${filename}`);
        
        try {
            const analysis = await investigateScreenshot(path.join(screenshotDir, filename), filename);
            results.push(analysis);
            
            console.log(`   📊 OCR Confidence: ${analysis.ocrConfidence.toFixed(1)}%`);
            console.log(`   📝 Text Length: ${analysis.textLength} characters`);
            console.log(`   💰 Prices Found: ${analysis.pricesFound}`);
            console.log(`   ⏱️ Processing Time: ${analysis.processingTime}ms`);
            console.log(`   🎯 Signal Confidence: ${analysis.signalConfidence}%`);
            console.log(`   📈 Signal: ${analysis.direction}`);
            
            // Check for suspicious patterns
            const suspiciousFlags = checkSuspiciousPatterns(analysis);
            if (suspiciousFlags.length > 0) {
                console.log(`   🚨 SUSPICIOUS PATTERNS DETECTED:`);
                suspiciousFlags.forEach(flag => console.log(`      • ${flag}`));
            } else {
                console.log(`   ✅ No obvious suspicious patterns detected`);
            }
            
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            results.push({
                filename: filename,
                success: false,
                error: error.message
            });
        }
        
        console.log('');
        
        // Add delay
        if (i < Math.min(3, screenshots.length) - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Generate investigation report
    generateInvestigationReport(results);
}

async function investigateScreenshot(imagePath, filename) {
    console.log('   🔍 Starting detailed OCR investigation...');
    
    const Tesseract = require('tesseract.js');
    const worker = await Tesseract.createWorker('eng');
    
    const startTime = Date.now();
    const { data } = await worker.recognize(imagePath);
    const processingTime = Date.now() - startTime;
    
    await worker.terminate();
    
    // Extract detailed OCR information
    const extractedText = data.text;
    const ocrConfidence = data.confidence;
    
    console.log(`   📝 Raw OCR Text Sample: "${extractedText.substring(0, 100)}${extractedText.length > 100 ? '...' : ''}"`);
    
    // Analyze extracted text for trading patterns
    const tradingAnalysis = analyzeTextForTradingPatterns(extractedText);
    
    // Extract prices with detailed analysis
    const priceAnalysis = extractAndAnalyzePrices(extractedText);
    
    // Generate signal with detailed reasoning
    const signalAnalysis = generateDetailedSignal(priceAnalysis.prices);
    
    return {
        filename: filename,
        success: true,
        ocrConfidence: ocrConfidence,
        textLength: extractedText.length,
        rawText: extractedText,
        processingTime: processingTime,
        pricesFound: priceAnalysis.prices.length,
        pricePatterns: priceAnalysis.patterns,
        tradingIndicators: tradingAnalysis,
        direction: signalAnalysis.direction,
        signalConfidence: signalAnalysis.confidence,
        signalReasoning: signalAnalysis.reasoning,
        priceMovement: signalAnalysis.priceMovement,
        suspiciousFactors: []
    };
}

function analyzeTextForTradingPatterns(text) {
    const lowerText = text.toLowerCase();
    
    const patterns = {
        currencyPairs: [],
        timeframes: [],
        platforms: [],
        tradingTerms: [],
        numbers: []
    };
    
    // Check for currency pairs
    const currencyPairs = ['eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'eurusd', 'gbpusd'];
    currencyPairs.forEach(pair => {
        if (lowerText.includes(pair)) {
            patterns.currencyPairs.push(pair);
        }
    });
    
    // Check for timeframes
    const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d'];
    timeframes.forEach(tf => {
        if (lowerText.includes(tf)) {
            patterns.timeframes.push(tf);
        }
    });
    
    // Check for platform names
    const platforms = ['quotex', 'iqoption', 'binomo', 'metatrader', 'tradingview'];
    platforms.forEach(platform => {
        if (lowerText.includes(platform)) {
            patterns.platforms.push(platform);
        }
    });
    
    // Check for trading terms
    const tradingTerms = ['call', 'put', 'buy', 'sell', 'signal', 'trade', 'profit', 'loss'];
    tradingTerms.forEach(term => {
        if (lowerText.includes(term)) {
            patterns.tradingTerms.push(term);
        }
    });
    
    // Extract all numbers
    const numberPattern = /\d+\.?\d*/g;
    const numbers = text.match(numberPattern) || [];
    patterns.numbers = numbers.slice(0, 20); // Limit to first 20 numbers
    
    return patterns;
}

function extractAndAnalyzePrices(text) {
    // Extract potential price patterns
    const pricePattern = /\b\d{1,4}\.?\d{2,5}\b/g;
    const matches = text.match(pricePattern) || [];
    
    const prices = matches
        .map(match => parseFloat(match))
        .filter(price => price > 0 && price < 100000)
        .filter((price, index, arr) => arr.indexOf(price) === index);
    
    // Analyze price patterns
    const patterns = {
        totalMatches: matches.length,
        uniquePrices: prices.length,
        priceRange: prices.length > 0 ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            spread: Math.max(...prices) - Math.min(...prices)
        } : null,
        duplicateCount: matches.length - prices.length
    };
    
    return {
        prices: prices.sort((a, b) => a - b),
        patterns: patterns
    };
}

function generateDetailedSignal(prices) {
    if (prices.length < 2) {
        return {
            direction: 'NO_SIGNAL',
            confidence: 0,
            reasoning: 'Insufficient price data for analysis',
            priceMovement: 0
        };
    }
    
    // Calculate detailed price movement
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceChange = lastPrice - firstPrice;
    const percentChange = (priceChange / firstPrice) * 100;
    
    // Count movements
    let upMoves = 0;
    let downMoves = 0;
    let noMoves = 0;
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) upMoves++;
        else if (prices[i] < prices[i - 1]) downMoves++;
        else noMoves++;
    }
    
    const totalMoves = upMoves + downMoves;
    const trendStrength = totalMoves > 0 ? Math.max(upMoves, downMoves) / totalMoves : 0;
    
    // Determine direction with detailed reasoning
    let direction, confidence, reasoning;
    
    if (Math.abs(percentChange) < 0.01) {
        direction = 'NO_SIGNAL';
        confidence = 20;
        reasoning = `Price movement too small (${percentChange.toFixed(4)}%)`;
    } else if (percentChange > 0 && upMoves > downMoves) {
        direction = 'UP';
        confidence = Math.min(95, 30 + (trendStrength * 50) + Math.min(Math.abs(percentChange) * 10, 20));
        reasoning = `Bullish trend: ${upMoves} up moves vs ${downMoves} down moves, ${percentChange.toFixed(4)}% change`;
    } else if (percentChange < 0 && downMoves > upMoves) {
        direction = 'DOWN';
        confidence = Math.min(95, 30 + (trendStrength * 50) + Math.min(Math.abs(percentChange) * 10, 20));
        reasoning = `Bearish trend: ${downMoves} down moves vs ${upMoves} up moves, ${percentChange.toFixed(4)}% change`;
    } else {
        direction = 'NO_SIGNAL';
        confidence = 25;
        reasoning = `Conflicting signals: ${upMoves} up vs ${downMoves} down, ${percentChange.toFixed(4)}% change`;
    }
    
    return {
        direction: direction,
        confidence: Math.round(confidence),
        reasoning: reasoning,
        priceMovement: parseFloat(percentChange.toFixed(4)),
        upMoves: upMoves,
        downMoves: downMoves,
        trendStrength: Math.round(trendStrength * 100)
    };
}

function checkSuspiciousPatterns(analysis) {
    const flags = [];
    
    // Check for suspiciously high confidence
    if (analysis.signalConfidence >= 95) {
        flags.push(`Suspiciously high signal confidence (${analysis.signalConfidence}%)`);
    }
    
    // Check for perfect OCR confidence
    if (analysis.ocrConfidence >= 99) {
        flags.push(`Suspiciously high OCR confidence (${analysis.ocrConfidence.toFixed(1)}%)`);
    }
    
    // Check for too fast processing
    if (analysis.processingTime < 1000) {
        flags.push(`Suspiciously fast processing (${analysis.processingTime}ms - real OCR should take 1-5 seconds)`);
    }
    
    // Check for too little text
    if (analysis.textLength < 50) {
        flags.push(`Suspiciously little text extracted (${analysis.textLength} characters)`);
    }
    
    // Check for too many identical prices
    if (analysis.pricePatterns && analysis.pricePatterns.duplicateCount > analysis.pricePatterns.uniquePrices) {
        flags.push(`Too many duplicate prices (${analysis.pricePatterns.duplicateCount} duplicates vs ${analysis.pricePatterns.uniquePrices} unique)`);
    }
    
    // Check for unrealistic price ranges
    if (analysis.pricePatterns && analysis.pricePatterns.priceRange) {
        const range = analysis.pricePatterns.priceRange;
        if (range.spread < 0.001) {
            flags.push(`Unrealistically small price spread (${range.spread})`);
        }
    }
    
    return flags;
}

function generateInvestigationReport(results) {
    console.log('🔍 === OCR AUTHENTICITY INVESTIGATION REPORT ===');
    console.log('');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('📊 === INVESTIGATION SUMMARY ===');
    console.log(`🧪 Screenshots investigated: ${results.length}`);
    console.log(`✅ Successful analyses: ${successful.length}`);
    console.log(`❌ Failed analyses: ${failed.length}`);
    console.log('');
    
    if (successful.length > 0) {
        // Analyze patterns across all results
        const avgOCRConfidence = successful.reduce((sum, r) => sum + r.ocrConfidence, 0) / successful.length;
        const avgSignalConfidence = successful.reduce((sum, r) => sum + r.signalConfidence, 0) / successful.length;
        const avgProcessingTime = successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length;
        
        console.log('📈 === PATTERN ANALYSIS ===');
        console.log(`📊 Average OCR confidence: ${avgOCRConfidence.toFixed(1)}%`);
        console.log(`🎯 Average signal confidence: ${avgSignalConfidence.toFixed(1)}%`);
        console.log(`⏱️ Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
        console.log('');
        
        // Check for suspicious patterns across all results
        let totalSuspiciousFlags = 0;
        console.log('🚨 === SUSPICIOUS PATTERN ANALYSIS ===');
        
        successful.forEach((result, index) => {
            const flags = checkSuspiciousPatterns(result);
            if (flags.length > 0) {
                console.log(`📸 ${result.filename}:`);
                flags.forEach(flag => console.log(`   🚨 ${flag}`));
                totalSuspiciousFlags += flags.length;
            }
        });
        
        if (totalSuspiciousFlags === 0) {
            console.log('✅ No suspicious patterns detected across all screenshots');
        } else {
            console.log(`⚠️ Total suspicious flags: ${totalSuspiciousFlags}`);
        }
        console.log('');
        
        // Detailed analysis for each screenshot
        console.log('📝 === DETAILED ANALYSIS ===');
        successful.forEach((result, index) => {
            console.log(`${index + 1}. ${result.filename}`);
            console.log(`   📊 OCR: ${result.ocrConfidence.toFixed(1)}% confidence, ${result.textLength} chars, ${result.processingTime}ms`);
            console.log(`   💰 Prices: ${result.pricesFound} found`);
            console.log(`   📈 Signal: ${result.direction} (${result.signalConfidence}% confidence)`);
            console.log(`   🧠 Reasoning: ${result.signalReasoning}`);
            
            if (result.tradingIndicators.platforms.length > 0) {
                console.log(`   🏢 Platforms detected: ${result.tradingIndicators.platforms.join(', ')}`);
            }
            if (result.tradingIndicators.currencyPairs.length > 0) {
                console.log(`   💱 Currency pairs: ${result.tradingIndicators.currencyPairs.join(', ')}`);
            }
            
            console.log('');
        });
    }
    
    // Final verdict
    console.log('🏆 === FINAL AUTHENTICITY VERDICT ===');
    
    if (successful.length === 0) {
        console.log('❌ CRITICAL: No successful OCR analysis - cannot determine authenticity');
    } else {
        const highConfidenceCount = successful.filter(r => r.signalConfidence >= 90).length;
        const fastProcessingCount = successful.filter(r => r.processingTime < 1000).length;
        const perfectOCRCount = successful.filter(r => r.ocrConfidence >= 99).length;
        
        console.log(`🔍 Analysis of ${successful.length} screenshots:`);
        console.log(`   📊 High confidence signals (90%+): ${highConfidenceCount}/${successful.length}`);
        console.log(`   ⚡ Fast processing (<1s): ${fastProcessingCount}/${successful.length}`);
        console.log(`   🎯 Perfect OCR confidence (99%+): ${perfectOCRCount}/${successful.length}`);
        console.log('');
        
        if (highConfidenceCount === successful.length && avgProcessingTime < 2000) {
            console.log('🚨 HIGHLY SUSPICIOUS: All signals have very high confidence with fast processing');
            console.log('❌ LIKELY MOCK DATA: Real OCR analysis should have more variation and longer processing times');
            console.log('⚠️ RECOMMENDATION: OCR functionality may not be working properly');
        } else if (highConfidenceCount > successful.length * 0.8) {
            console.log('⚠️ SUSPICIOUS: Most signals have very high confidence');
            console.log('🔍 NEEDS INVESTIGATION: May indicate mock data or overly optimistic confidence calculation');
        } else {
            console.log('✅ APPEARS AUTHENTIC: Reasonable confidence variation and processing times');
            console.log('✅ OCR functionality appears to be working properly');
        }
    }
    
    console.log('');
    console.log('⏰ Investigation completed:', new Date().toISOString());
}

// Run the investigation
if (require.main === module) {
    investigateOCRAuthenticity().catch(console.error);
}

module.exports = { investigateOCRAuthenticity };
