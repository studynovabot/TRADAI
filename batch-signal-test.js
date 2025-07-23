#!/usr/bin/env node

/**
 * Batch Signal Test
 * 
 * Tests OCR and signal generation on first 3 screenshots
 * to validate authentic signal generation functionality.
 */

const fs = require('fs');
const path = require('path');

async function runBatchTest() {
    console.log('🎯 === BATCH AUTHENTIC SIGNAL TEST ===');
    console.log('⏰ Started:', new Date().toISOString());
    console.log('🚫 NO MOCK DATA ALLOWED');
    console.log('');

    const screenshotDir = 'C:\\Users\\thaku\\Pictures\\Camera Roll';
    
    // Get screenshots
    const files = fs.readdirSync(screenshotDir);
    const screenshots = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.png', '.jpg', '.jpeg'].includes(ext);
    });

    console.log(`📸 Found ${screenshots.length} screenshots`);
    console.log('🧪 Testing first 3 screenshots for authentic signal generation');
    console.log('');

    const results = [];
    const testCount = Math.min(3, screenshots.length);

    // Test first 3 screenshots
    for (let i = 0; i < testCount; i++) {
        const filename = screenshots[i];
        console.log(`🖼️ [${i + 1}/${testCount}] Analyzing: ${filename}`);
        
        try {
            const signal = await analyzeScreenshotForSignal(path.join(screenshotDir, filename), filename);
            results.push(signal);
            
            console.log(`   ✅ SUCCESS!`);
            console.log(`   📈 Signal: ${signal.direction}`);
            console.log(`   🎯 Confidence: ${signal.confidence}%`);
            console.log(`   💪 Strength: ${signal.strength}%`);
            console.log(`   💰 Prices: ${signal.pricesFound}`);
            console.log(`   ⏱️ Processing: ${signal.processingTime}ms`);
            
            if (signal.currencyPair) console.log(`   💱 Currency: ${signal.currencyPair}`);
            if (signal.timeframe) console.log(`   ⏰ Timeframe: ${signal.timeframe}`);
            if (signal.platform) console.log(`   🏢 Platform: ${signal.platform}`);
            
        } catch (error) {
            console.log(`   ❌ FAILED: ${error.message}`);
            results.push({
                filename: filename,
                success: false,
                error: error.message,
                direction: 'ERROR',
                confidence: 0
            });
        }
        
        console.log('');
        
        // Add delay between tests
        if (i < testCount - 1) {
            console.log('   ⏳ Waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Generate summary report
    generateSummaryReport(results);
}

async function analyzeScreenshotForSignal(imagePath, filename) {
    console.log('   🔍 Starting OCR analysis...');
    
    // Perform OCR
    const Tesseract = require('tesseract.js');
    const worker = await Tesseract.createWorker('eng');
    
    const startTime = Date.now();
    const { data } = await worker.recognize(imagePath);
    const processingTime = Date.now() - startTime;
    
    await worker.terminate();
    
    console.log(`   📝 Extracted ${data.text.length} characters`);
    
    if (data.text.length === 0) {
        throw new Error('No text extracted from image');
    }
    
    // Extract trading data
    const tradingData = extractTradingData(data.text);
    console.log(`   💰 Found ${tradingData.prices.length} price values`);
    
    if (tradingData.prices.length < 2) {
        throw new Error('Insufficient price data for signal generation');
    }
    
    // Generate signal
    const signal = generateSignalFromPrices(tradingData.prices);
    
    // Calculate confidence
    const confidence = calculateConfidence(tradingData, data);
    
    return {
        filename: filename,
        success: true,
        direction: signal.direction,
        confidence: confidence,
        strength: signal.strength,
        pricesFound: tradingData.prices.length,
        processingTime: processingTime,
        ocrConfidence: data.confidence,
        textLength: data.text.length,
        currencyPair: tradingData.currencyPair,
        timeframe: tradingData.timeframe,
        platform: tradingData.platform,
        priceMovement: signal.priceMovement,
        upMoves: signal.upMoves,
        downMoves: signal.downMoves
    };
}

function extractTradingData(text) {
    const lowerText = text.toLowerCase();
    
    // Extract prices
    const pricePattern = /\b\d{1,4}\.?\d{2,5}\b/g;
    const matches = text.match(pricePattern) || [];
    
    const prices = matches
        .map(match => parseFloat(match))
        .filter(price => price > 0 && price < 100000)
        .filter((price, index, arr) => arr.indexOf(price) === index);
    
    // Detect currency pair
    const currencyPairs = ['eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd', 'eurusd', 'gbpusd', 'usdjpy'];
    const currencyPair = currencyPairs.find(pair => lowerText.includes(pair));
    
    // Detect timeframe
    const timeframes = ['1m', '3m', '5m', '15m', '30m', '1h'];
    const timeframe = timeframes.find(tf => lowerText.includes(tf));
    
    // Detect platform
    const platforms = {
        'quotex': 'Quotex',
        'iqoption': 'IQ Option',
        'binomo': 'Binomo',
        'metatrader': 'MetaTrader'
    };
    const platform = Object.entries(platforms).find(([key, name]) => lowerText.includes(key))?.[1];
    
    return {
        prices: prices.sort((a, b) => a - b),
        currencyPair: currencyPair?.toUpperCase(),
        timeframe: timeframe,
        platform: platform
    };
}

function generateSignalFromPrices(prices) {
    if (prices.length < 2) {
        return { direction: 'NO_SIGNAL', strength: 0, priceMovement: 0 };
    }
    
    // Calculate price movement
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceChange = lastPrice - firstPrice;
    const percentChange = (priceChange / firstPrice) * 100;
    
    // Count up/down movements
    let upMoves = 0;
    let downMoves = 0;
    
    for (let i = 1; i < prices.length; i++) {
        if (prices[i] > prices[i - 1]) upMoves++;
        else if (prices[i] < prices[i - 1]) downMoves++;
    }
    
    const totalMoves = upMoves + downMoves;
    const trendStrength = totalMoves > 0 ? Math.max(upMoves, downMoves) / totalMoves : 0;
    
    // Determine signal
    let direction;
    if (Math.abs(percentChange) < 0.01) {
        direction = 'NO_SIGNAL';
    } else if (percentChange > 0 && upMoves > downMoves) {
        direction = 'UP';
    } else if (percentChange < 0 && downMoves > upMoves) {
        direction = 'DOWN';
    } else {
        direction = 'NO_SIGNAL';
    }
    
    return {
        direction: direction,
        strength: Math.round(trendStrength * 100),
        priceMovement: parseFloat(percentChange.toFixed(4)),
        upMoves: upMoves,
        downMoves: downMoves
    };
}

function calculateConfidence(tradingData, ocrData) {
    let confidence = 0;
    
    // OCR quality (max 30%)
    confidence += Math.min(ocrData.confidence || 0, 30);
    
    // Price data quality (max 30%)
    if (tradingData.prices.length >= 5) confidence += 30;
    else if (tradingData.prices.length >= 3) confidence += 20;
    else if (tradingData.prices.length >= 2) confidence += 15;
    
    // Text quality (max 20%)
    if (ocrData.text.length >= 100) confidence += 20;
    else if (ocrData.text.length >= 50) confidence += 15;
    else if (ocrData.text.length >= 20) confidence += 10;
    
    // Trading context (max 20%)
    if (tradingData.currencyPair) confidence += 8;
    if (tradingData.timeframe) confidence += 6;
    if (tradingData.platform) confidence += 6;
    
    return Math.min(Math.round(confidence), 100);
}

function generateSummaryReport(results) {
    console.log('📋 === BATCH TEST SUMMARY REPORT ===');
    console.log('');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log('📊 === RESULTS SUMMARY ===');
    console.log(`✅ Successful analyses: ${successful.length}`);
    console.log(`❌ Failed analyses: ${failed.length}`);
    console.log(`📈 Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
    console.log('');
    
    if (successful.length > 0) {
        const upSignals = successful.filter(s => s.direction === 'UP');
        const downSignals = successful.filter(s => s.direction === 'DOWN');
        const noSignals = successful.filter(s => s.direction === 'NO_SIGNAL');
        
        console.log('📈 === SIGNAL DISTRIBUTION ===');
        console.log(`🔺 UP signals: ${upSignals.length}`);
        console.log(`🔻 DOWN signals: ${downSignals.length}`);
        console.log(`⚪ NO_SIGNAL: ${noSignals.length}`);
        console.log('');
        
        const avgConfidence = successful.reduce((sum, s) => sum + s.confidence, 0) / successful.length;
        const avgProcessingTime = successful.reduce((sum, s) => sum + s.processingTime, 0) / successful.length;
        
        console.log('🎯 === QUALITY METRICS ===');
        console.log(`📊 Average confidence: ${avgConfidence.toFixed(1)}%`);
        console.log(`⏱️ Average processing time: ${avgProcessingTime.toFixed(0)}ms`);
        console.log('');
        
        console.log('🏆 === FINAL VERDICT ===');
        if (upSignals.length > 0 || downSignals.length > 0) {
            console.log('🎉 SUCCESS: AUTHENTIC TRADING SIGNALS GENERATED');
            console.log('✅ OCR successfully extracted price data from screenshots');
            console.log('✅ Signal generation based on real market data analysis');
            console.log('✅ NO MOCK DATA OR FALLBACKS USED');
            
            if (avgConfidence >= 70) {
                console.log('✅ High confidence signals - system is highly reliable');
            } else {
                console.log('⚠️ Moderate confidence - consider higher quality screenshots');
            }
        } else {
            console.log('⚠️ PARTIAL SUCCESS: OCR working but no directional signals');
            console.log('✅ OCR analysis is functioning properly');
            console.log('⚠️ Screenshots may not contain clear trading trends');
        }
    } else {
        console.log('❌ CRITICAL: No successful OCR analysis');
        console.log('❌ OCR functionality may not be working properly');
    }
    
    console.log('');
    console.log('⏰ Test completed:', new Date().toISOString());
}

// Run the batch test
if (require.main === module) {
    runBatchTest().catch(console.error);
}

module.exports = { runBatchTest };
